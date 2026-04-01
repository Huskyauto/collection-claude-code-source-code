import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { generateEmbedding, storeEmbeddingVec, cosineSimilarity } from "./embeddings";
import { executeWithFailover, classifyError } from "./model-failover";
import { getAvailableModels, getModelForTierAsync } from "./providers";

export interface DreamConsolidationResult {
  reviewed: number;
  merged: number;
  archived: number;
  promoted: number;
  created: number;
  errors: number;
  summary: string;
  durationMs: number;
}

interface DreamAction {
  type: "merge" | "archive" | "promote" | "create_summary";
  ids?: number[];
  id?: number;
  fact?: string;
  category?: string;
  reason?: string;
}

const DREAM_PROMPT = `You are the DreamTask Memory Consolidation Engine. Your job is to review and reorganize memory entries like a brain consolidating memories during sleep.

REVIEW THESE MEMORIES AND RETURN A JSON OBJECT with an "actions" array. Each action is one of:

1. **merge** — Two or more memories say the same thing differently. Combine into one.
   { "type": "merge", "ids": [id1, id2, ...], "fact": "merged fact text", "category": "best category", "reason": "why merged" }

2. **archive** — Memory is outdated, superseded, or no longer relevant.
   { "type": "archive", "id": memoryId, "reason": "why archiving" }

3. **promote** — Memory from "conversation" source is important enough to be permanent knowledge.
   { "type": "promote", "id": memoryId, "category": "appropriate category", "reason": "why promoting" }

4. **create_summary** — Multiple related memories should have a connecting summary.
   { "type": "create_summary", "ids": [related ids], "fact": "summary connecting these memories", "category": "meta", "reason": "why this summary helps" }

RULES:
- Be conservative. Only merge when memories are clearly redundant (>80% overlap in meaning).
- Never archive memories that have been accessed frequently (accessCount > 5) unless truly outdated.
- Promote memories that contain reusable preferences, patterns, or decisions.
- Create summaries only when 3+ memories form a coherent topic cluster.
- Return at most 10 actions per run to avoid over-consolidation.
- If memories are already clean and well-organized, return { "actions": [] }.

Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.`;

async function getRecentSessionSummaries(tenantId: number, sessionCount: number): Promise<string> {
  try {
    const convRows = await db.execute(sql`
      SELECT id, title, updated_at FROM conversations 
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT ${sessionCount}
    `);
    const convs = (convRows as any).rows || convRows;
    if (!convs || convs.length === 0) return "No recent sessions found.";

    const summaries: string[] = [];
    for (const conv of convs) {
      const msgRows = await db.execute(sql`
        SELECT role, content FROM messages 
        WHERE conversation_id = ${conv.id}
        ORDER BY created_at DESC
        LIMIT 6
      `);
      const msgs = (msgRows as any).rows || msgRows;
      if (!msgs || msgs.length === 0) continue;

      const topicHints = msgs
        .filter((m: any) => m.role === "user" && m.content)
        .map((m: any) => m.content.slice(0, 150))
        .slice(0, 2);

      summaries.push(`Session "${conv.title || "Untitled"}" (${conv.updated_at}): Topics — ${topicHints.join("; ") || "no user messages"}`);
    }
    return summaries.join("\n") || "No session content available.";
  } catch (err: any) {
    console.warn("[dream] Failed to get session summaries:", err.message);
    return "Could not retrieve recent sessions.";
  }
}

function findDuplicateCandidates(
  memories: Array<{ id: number; fact: string; embedding: any }>
): Array<[number, number, number]> {
  const pairs: Array<[number, number, number]> = [];
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const a = memories[i];
      const b = memories[j];
      if (a.embedding && b.embedding) {
        const embA = typeof a.embedding === "string" ? JSON.parse(a.embedding) : a.embedding;
        const embB = typeof b.embedding === "string" ? JSON.parse(b.embedding) : b.embedding;
        if (Array.isArray(embA) && Array.isArray(embB) && embA.length === embB.length) {
          const sim = cosineSimilarity(embA, embB);
          if (sim > 0.85) {
            pairs.push([a.id, b.id, Math.round(sim * 1000) / 1000]);
          }
        }
      }
    }
  }
  return pairs.sort((a, b) => b[2] - a[2]).slice(0, 20);
}

export async function runDreamConsolidation(tenantId: number = 1, sessionCount: number = 5): Promise<DreamConsolidationResult> {
  const start = Date.now();
  const result: DreamConsolidationResult = {
    reviewed: 0, merged: 0, archived: 0, promoted: 0, created: 0, errors: 0,
    summary: "", durationMs: 0,
  };

  try {
    console.log(`[dream] Starting consolidation for tenant ${tenantId}...`);

    const memResult = await storage.getMemoryEntries(undefined, 200, 0, tenantId);
    const activeMemories = memResult.data.filter(m => m.status === "active");
    result.reviewed = activeMemories.length;

    if (activeMemories.length < 3) {
      result.summary = `Too few active memories (${activeMemories.length}) to consolidate.`;
      result.durationMs = Date.now() - start;
      console.log(`[dream] ${result.summary}`);
      return result;
    }

    const sessionSummaries = await getRecentSessionSummaries(tenantId, sessionCount);

    const embeddedMemories = activeMemories.map(m => ({
      id: m.id, fact: m.fact, embedding: m.embedding,
    }));
    const duplicatePairs = findDuplicateCandidates(embeddedMemories);

    const memoryList = activeMemories.slice(0, 50).map(m =>
      `[ID:${m.id}] [${m.category}] ${m.fact} (source: ${m.source}, accessed: ${m.accessCount}x, created: ${m.createdAt})`
    ).join("\n");

    const duplicateHint = duplicatePairs.length > 0
      ? `\n\nHIGH-SIMILARITY PAIRS (embedding cosine > 0.85):\n${duplicatePairs.map(([a, b, s]) => `  IDs ${a} & ${b}: similarity ${s}`).join("\n")}`
      : "";

    const userPrompt = `TENANT ${tenantId} — ${activeMemories.length} active memories, ${memResult.total} total.

RECENT SESSIONS:
${sessionSummaries}

ACTIVE MEMORIES:
${memoryList}${duplicateHint}

Analyze these memories and return consolidation actions as JSON.`;

    const model = await getModelForTierAsync("fast", tenantId);
    const availableModels = await getAvailableModels();

    const { result: resp } = await executeWithFailover(
      model,
      availableModels,
      async (client: any, actualModelId: string) => {
        return client.chat.completions.create({
          model: actualModelId,
          messages: [
            { role: "system", content: DREAM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: 4096,
          temperature: 0.3,
        });
      },
      tenantId,
    );

    const output = resp.choices[0]?.message?.content || "";
    if (!output) {
      result.summary = "LLM returned empty response.";
      result.durationMs = Date.now() - start;
      return result;
    }

    let jsonStr = output;
    const fenceMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let parsed: { actions: DreamAction[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn("[dream] Failed to parse LLM output as JSON, trying to extract actions...");
      const actionMatch = jsonStr.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      if (actionMatch) {
        parsed = JSON.parse(actionMatch[0]);
      } else {
        result.summary = "Could not parse consolidation response.";
        result.errors++;
        result.durationMs = Date.now() - start;
        return result;
      }
    }

    if (!Array.isArray(parsed.actions)) {
      result.summary = "No actions array in response.";
      result.durationMs = Date.now() - start;
      return result;
    }

    const actions = parsed.actions.slice(0, 10);
    console.log(`[dream] Processing ${actions.length} consolidation actions...`);

    for (const action of actions) {
      try {
        switch (action.type) {
          case "merge": {
            if (!Array.isArray(action.ids) || action.ids.length < 2 || !action.fact) break;
            for (const id of action.ids) {
              await storage.updateMemoryEntry(id, { status: "archived" });
            }
            const merged = await storage.createMemoryEntry({
              fact: action.fact,
              category: action.category || "general",
              source: "dream_consolidation",
              status: "active",
              personaId: null,
              tenantId,
            } as any);
            const emb = await generateEmbedding(merged.fact);
            if (emb) {
              await storage.updateMemoryEmbedding(merged.id, emb);
              try { await storeEmbeddingVec("memory_entries", merged.id, emb); } catch {}
            }
            result.merged++;
            console.log(`[dream] Merged IDs [${action.ids.join(",")}] → ID ${merged.id}: ${action.reason || ""}`);
            break;
          }
          case "archive": {
            if (typeof action.id !== "number") break;
            await storage.updateMemoryEntry(action.id, { status: "archived" });
            result.archived++;
            console.log(`[dream] Archived ID ${action.id}: ${action.reason || ""}`);
            break;
          }
          case "promote": {
            if (typeof action.id !== "number") break;
            const updates: Record<string, any> = { source: "promoted" };
            if (action.category) updates.category = action.category;
            await storage.updateMemoryEntry(action.id, updates);
            result.promoted++;
            console.log(`[dream] Promoted ID ${action.id}: ${action.reason || ""}`);
            break;
          }
          case "create_summary": {
            if (!action.fact) break;
            const summary = await storage.createMemoryEntry({
              fact: action.fact,
              category: action.category || "meta",
              source: "dream_consolidation",
              status: "active",
              personaId: null,
              tenantId,
            } as any);
            const summaryEmb = await generateEmbedding(summary.fact);
            if (summaryEmb) {
              await storage.updateMemoryEmbedding(summary.id, summaryEmb);
              try { await storeEmbeddingVec("memory_entries", summary.id, summaryEmb); } catch {}
            }
            result.created++;
            console.log(`[dream] Created summary ID ${summary.id}: ${action.reason || ""}`);
            break;
          }
          default:
            console.warn(`[dream] Unknown action type: ${(action as any).type}`);
        }
      } catch (actionErr: any) {
        result.errors++;
        console.error(`[dream] Action failed (${action.type}):`, actionErr.message);
      }
    }

    const parts: string[] = [];
    if (result.merged > 0) parts.push(`${result.merged} merged`);
    if (result.archived > 0) parts.push(`${result.archived} archived`);
    if (result.promoted > 0) parts.push(`${result.promoted} promoted`);
    if (result.created > 0) parts.push(`${result.created} summaries created`);
    if (result.errors > 0) parts.push(`${result.errors} errors`);
    result.summary = parts.length > 0
      ? `Reviewed ${result.reviewed} memories: ${parts.join(", ")}.`
      : `Reviewed ${result.reviewed} memories: no changes needed.`;

  } catch (err: any) {
    result.errors++;
    result.summary = `Dream consolidation failed: ${err.message}`;
    console.error(`[dream] Fatal error:`, err.message);
  }

  result.durationMs = Date.now() - start;
  console.log(`[dream] Complete (${result.durationMs}ms): ${result.summary}`);
  return result;
}
