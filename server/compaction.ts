import { replitOpenai } from "./providers";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { sql } from "drizzle-orm";

const COMPACTION_RATIO = 0.4;
const MIN_MESSAGES_BEFORE_COMPACT = 20;
const TARGET_AFTER_COMPACT = 12;
const SUMMARY_MAX_TOKENS = 1200;

const ARCHIVE_DIR = path.resolve(process.cwd(), "compaction-archives");

const COMPACTION_PROMPT = `You are a conversation compaction engine. Summarize the older portion of a conversation into a concise but COMPLETE context summary. ZERO information loss is the goal — if in doubt, include it.

MUST PRESERVE (non-negotiable):
- Active tasks and their current status (in-progress, blocked, pending)
- Batch operation progress (e.g., "5/17 items completed")
- The last thing the user requested and what was being done about it
- Decisions made and their rationale
- TODOs, open questions, and constraints
- Any commitments or follow-ups promised
- User preferences, corrections, or instructions about how they want things done
- Names, numbers, dates, and specific data points mentioned by the user
- Any facts the user shared about themselves, their business, or their projects
- Error messages or issues encountered and their resolutions

MUST NOT PRESERVE:
- Old file URLs, Google Drive links, or download links from completed deliveries — these become stale. The agent must create fresh files for new requests, never reuse old links.
- Verbose tool call JSON outputs — summarize the outcome instead.
- Repetitive back-and-forth that can be condensed (e.g., "user asked X, agent clarified, user confirmed" → "user confirmed X")

PRIORITIZE completeness over brevity. It is better to have a longer summary that preserves all facts than a short one that loses information. Use bullet points for clarity.

Output the summary directly — no preamble like "Here is the summary".`;

export interface CompactionResult {
  compacted: boolean;
  summary?: string;
  removedCount?: number;
  keptCount?: number;
  archivePath?: string;
}

export function shouldCompact(messageCount: number): boolean {
  return messageCount > MIN_MESSAGES_BEFORE_COMPACT;
}

export function splitForCompaction(messages: { role: string; content: string }[]): {
  toSummarize: { role: string; content: string }[];
  toKeep: { role: string; content: string }[];
} {
  if (messages.length <= MIN_MESSAGES_BEFORE_COMPACT) {
    return { toSummarize: [], toKeep: messages };
  }

  const keepCount = TARGET_AFTER_COMPACT;
  const splitIdx = messages.length - keepCount;

  return {
    toSummarize: messages.slice(0, splitIdx),
    toKeep: messages.slice(splitIdx),
  };
}

function extractText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part.text || "";
        if (part?.type === "image_url") return "[image]";
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return String(content || "");
}

export async function archiveMessages(
  conversationId: number | string,
  messages: { role: string; content: string }[],
  allMessages: { role: string; content: string }[]
): Promise<string> {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `conv-${conversationId}_${timestamp}.md`;
  const archivePath = path.join(ARCHIVE_DIR, filename);

  const lines: string[] = [
    `# Compaction Archive`,
    `- Conversation: ${conversationId}`,
    `- Archived at: ${new Date().toISOString()}`,
    `- Total messages in conversation: ${allMessages.length}`,
    `- Messages archived (compacted away): ${messages.length}`,
    `- Messages kept (recent): ${allMessages.length - messages.length}`,
    ``,
    `---`,
    ``,
    `## Full Transcript of Compacted Messages`,
    ``,
  ];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const text = extractText(m.content);
    lines.push(`### Message ${i + 1} [${m.role.toUpperCase()}]`);
    lines.push(``);
    lines.push(text);
    lines.push(``);
  }

  const fullContent = lines.join("\n");
  fs.writeFileSync(archivePath, fullContent, "utf-8");
  console.log(`[compaction] Archived ${messages.length} messages to ${archivePath}`);

  try {
    const convId = typeof conversationId === "string" ? parseInt(conversationId) || 0 : conversationId;
    await db.execute(
      sql`INSERT INTO compaction_archives (conversation_id, message_count, total_messages, content) VALUES (${convId}, ${messages.length}, ${allMessages.length}, ${fullContent})`
    );
    console.log(`[compaction] Saved archive to database for conversation ${conversationId}`);
  } catch (dbErr: any) {
    console.error(`[compaction] DB archive save failed: ${dbErr.message}`);
    throw new Error(`Archive save failed — compaction blocked to protect data: ${dbErr.message}`);
  }

  return archivePath;
}

export async function extractAndSaveMemories(
  messages: { role: string; content: string }[],
  conversationId: number | string,
  tenantId?: number
): Promise<number> {
  try {
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return 0;

    const userContent = userMessages
      .map(m => extractText(m.content).slice(0, 500))
      .join("\n");

    const resp = await replitOpenai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `Extract important facts, preferences, and personal information from these user messages. Return a JSON array of objects: [{"fact": "...", "category": "preference|fact|biography|relationship|milestone|status"}]. Only include genuinely important information worth remembering long-term. Return [] if nothing notable. Return ONLY the JSON array.`,
        },
        {
          role: "user",
          content: `Extract memorable facts from these user messages (conversation ${conversationId}):\n\n${userContent.slice(0, 4000)}`,
        },
      ],
      max_completion_tokens: 500,
    });

    const rawOutput = resp.choices[0]?.message?.content?.trim() || "[]";
    let facts: any[] = [];
    try {
      const cleaned = rawOutput.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      facts = JSON.parse(cleaned);
    } catch { return 0; }

    if (!Array.isArray(facts) || facts.length === 0) return 0;

    let saved = 0;
    for (const f of facts.slice(0, 5)) {
      if (!f.fact || f.fact.length < 5) continue;
      try {
        await db.execute(sql`
          INSERT INTO memory_entries (fact, category, source, status, tenant_id)
          VALUES (${f.fact}, ${f.category || "fact"}, ${"compaction-extract"}, 'active', ${tenantId || 1})
        `);
        saved++;
      } catch {}
    }
    if (saved > 0) {
      console.log(`[compaction] Extracted ${saved} memories from conversation ${conversationId} before compaction`);
    }
    return saved;
  } catch (err: any) {
    console.warn(`[compaction] Memory extraction failed (non-critical): ${err.message}`);
    return 0;
  }
}

export async function compactMessages(
  messages: { role: string; content: string }[],
  conversationId?: number | string,
  tenantId?: number
): Promise<CompactionResult> {
  if (!shouldCompact(messages.length)) {
    return { compacted: false };
  }

  const { toSummarize, toKeep } = splitForCompaction(messages);

  if (toSummarize.length === 0) {
    return { compacted: false };
  }

  await extractAndSaveMemories(toSummarize, conversationId || "unknown", tenantId).catch(() => {});

  let archivePath: string;
  try {
    archivePath = await archiveMessages(
      conversationId || "unknown",
      toSummarize,
      messages
    );
  } catch (archiveErr: any) {
    console.error(`[compaction] SAFETY GATE: Archive failed, aborting compaction to protect messages:`, archiveErr.message);
    return { compacted: false };
  }

  const transcript = toSummarize
    .map((m) => {
      const text = extractText(m.content);
      return `${m.role.toUpperCase()}: ${text.slice(0, 800)}`;
    })
    .join("\n\n");

  try {
    const resp = await replitOpenai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: COMPACTION_PROMPT },
        {
          role: "user",
          content: `Summarize this conversation history (${toSummarize.length} messages). Preserve ALL facts, preferences, and user-shared information — zero memory loss:\n\n${transcript.slice(0, 10000)}`,
        },
      ],
      max_completion_tokens: SUMMARY_MAX_TOKENS,
    });

    const summary = resp.choices[0]?.message?.content?.trim();
    if (!summary) {
      return { compacted: false, archivePath };
    }

    return {
      compacted: true,
      summary,
      removedCount: toSummarize.length,
      keptCount: toKeep.length,
      archivePath,
    };
  } catch (err) {
    console.error("[compaction] Failed to compact:", err);
    return { compacted: false, archivePath };
  }
}

export function buildCompactedMessages(
  summary: string,
  recentMessages: { role: string; content: string }[]
): { role: string; content: string }[] {
  const compactionMarker = {
    role: "system" as const,
    content: `[CONVERSATION HISTORY SUMMARY]\nThe following is a summary of the earlier part of this conversation:\n\n${summary}\n\n[END SUMMARY — The full pre-compaction messages are preserved. Use the recall_context tool with this conversation's ID to retrieve the complete original messages if you need details not in this summary. Recent messages follow below.]`,
  };

  return [compactionMarker, ...recentMessages];
}

export async function recallCompactionArchive(params: {
  conversationId: number;
  tenantId?: number;
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; archives?: any[]; error?: string }> {
  try {
    const maxResults = params.limit || 3;
    let rows: any[];

    if (params.query) {
      const searchTerm = `%${params.query}%`;
      rows = await db.execute(
        sql`SELECT ca.id, ca.conversation_id, ca.archived_at, ca.message_count, ca.total_messages, ca.content, ca.summary
            FROM compaction_archives ca
            INNER JOIN conversations c ON c.id = ca.conversation_id
            WHERE ca.conversation_id = ${params.conversationId}
              AND (${params.tenantId || 0} = 0 OR c.tenant_id = ${params.tenantId})
              AND ca.content ILIKE ${searchTerm}
            ORDER BY ca.archived_at DESC
            LIMIT ${maxResults}`
      ) as any;
    } else {
      rows = await db.execute(
        sql`SELECT ca.id, ca.conversation_id, ca.archived_at, ca.message_count, ca.total_messages, ca.content, ca.summary
            FROM compaction_archives ca
            INNER JOIN conversations c ON c.id = ca.conversation_id
            WHERE ca.conversation_id = ${params.conversationId}
              AND (${params.tenantId || 0} = 0 OR c.tenant_id = ${params.tenantId})
            ORDER BY ca.archived_at DESC
            LIMIT ${maxResults}`
      ) as any;
    }

    const archives = (rows.rows || rows || []).map((r: any) => ({
      id: r.id,
      conversationId: r.conversation_id,
      archivedAt: r.archived_at,
      messageCount: r.message_count,
      totalMessages: r.total_messages,
      content: r.content?.length > 12000 ? r.content.slice(0, 12000) + "\n...(truncated, use query param to search for specific content)" : r.content,
    }));

    return {
      success: true,
      archives,
    };
  } catch (err: any) {
    const localArchives: string[] = [];
    try {
      if (fs.existsSync(ARCHIVE_DIR)) {
        const files = fs.readdirSync(ARCHIVE_DIR)
          .filter(f => f.startsWith(`conv-${params.conversationId}_`))
          .sort()
          .reverse()
          .slice(0, params.limit || 3);
        for (const file of files) {
          let content = fs.readFileSync(path.join(ARCHIVE_DIR, file), "utf-8");
          if (params.query) {
            if (!content.toLowerCase().includes(params.query.toLowerCase())) continue;
          }
          if (content.length > 12000) content = content.slice(0, 12000) + "\n...(truncated)";
          localArchives.push(content);
        }
      }
    } catch {}

    if (localArchives.length > 0) {
      return {
        success: true,
        archives: localArchives.map((c, i) => ({ id: i, content: c })),
      };
    }

    return { success: false, error: err.message };
  }
}
