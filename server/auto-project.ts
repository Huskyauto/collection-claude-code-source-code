import { db } from "./db";
import { sql } from "drizzle-orm";

const PROJECT_SIGNAL_PATTERNS = [
  /\b(?:build|create|develop|design|make|set up|launch|start)\s+(?:a|an|the|my|our)?\s*(?:website|app|application|platform|tool|system|dashboard|landing page|api|service|bot|agent|brand|business|channel|campaign|newsletter|course|product|store|shop|portfolio)/i,
  /\b(?:write|draft|create|produce)\s+(?:a|an|the|my|our)?\s*(?:script|slide deck|presentation|proposal|pitch deck|business plan|marketing plan|content calendar|strategy|report|white paper|blog series)/i,
  /\b(?:research|analyze|investigate)\s+(?:and\s+)?(?:then\s+)?(?:write|create|build|produce|draft|develop)/i,
  /\b(?:help me|i need|i want|let's|we need to|can you)\s+(?:build|create|develop|design|launch|start|plan|set up)\b/i,
  /\b(?:youtube\s+channel|social media\s+(?:campaign|strategy)|email\s+(?:campaign|sequence)|content\s+strategy|brand\s+identity)/i,
  /\b(?:first|step\s+1|phase\s+1|let's start|getting started)\b.*\b(?:build|create|develop|design|launch)/i,
  /\b(?:project|roadmap|sprint|milestone|deliverable|timeline|deadline)\b/i,
  /\b(?:client|customer)\s+(?:wants|needs|asked for|requesting)/i,
];

const EXCLUDE_PATTERNS = [
  /\b(?:what is|who is|explain|tell me about|how does|define|what's the difference)\b/i,
  /\b(?:joke|fun fact|weather|time|date|hello|hi|hey|thanks|thank you)\b/i,
  /\b(?:fix|debug|error|bug|broken|not working|issue with)\b/i,
];

function shouldAutoCreateProject(userMessage: string, messageCount: number): boolean {
  if (messageCount > 6) return false;

  for (const pat of EXCLUDE_PATTERNS) {
    if (pat.test(userMessage)) return false;
  }

  let signalScore = 0;
  for (const pat of PROJECT_SIGNAL_PATTERNS) {
    if (pat.test(userMessage)) signalScore++;
  }

  const actionVerbs = (userMessage.match(/\b(build|create|develop|design|launch|write|draft|produce|research|analyze|deploy|plan|set up|implement|execute)\b/gi) || []);
  const uniqueActions = new Set(actionVerbs.map(v => v.toLowerCase()));
  if (uniqueActions.size >= 2) signalScore++;

  const conjunctions = (userMessage.match(/\b(and then|then|after that|next|finally|also|additionally|step \d)\b/gi) || []).length;
  if (conjunctions >= 2) signalScore++;

  return signalScore >= 2;
}

function extractProjectName(userMessage: string): string {
  const namePatterns = [
    /(?:build|create|develop|design|launch|start|set up)\s+(?:a|an|the|my|our)?\s*(.{5,40}?)(?:\.|,|!|\?|$|\band\b|\bthen\b|\bfor\b|\bthat\b|\bwhich\b)/i,
    /(?:youtube\s+channel|social media|email campaign|content strategy|brand identity)(?:\s+(?:for|about|called|named))?\s*(.{3,30})?/i,
    /(?:project|campaign)\s+(?:for|about|called|named)\s+["']?(.{3,40})["']?/i,
  ];

  for (const pat of namePatterns) {
    const m = userMessage.match(pat);
    if (m?.[1]) {
      const name = m[1].trim().replace(/[.!?,;]$/, "").trim();
      if (name.length >= 3 && name.length <= 50) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  const words = userMessage.split(/\s+/).slice(0, 8).join(" ");
  return words.length > 40 ? words.slice(0, 40) + "..." : words;
}

export async function checkAndAutoCreateProject(
  conversationId: number,
  tenantId: number,
  userMessage: string
): Promise<{ created: boolean; projectId?: number; projectName?: string; directive?: string } | null> {
  try {
    const convRes = await db.execute(sql`
      SELECT project_id, title FROM conversations WHERE id = ${conversationId}
    `);
    const convRows = (convRes as any).rows || convRes;
    const conv = convRows?.[0];
    if (!conv) return null;

    if (conv.project_id) return null;

    const linkRes = await db.execute(sql`
      SELECT project_id FROM project_conversations WHERE conversation_id = ${conversationId} LIMIT 1
    `);
    const linkRows = (linkRes as any).rows || linkRes;
    if (linkRows?.[0]?.project_id) return null;

    const msgCountRes = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ${conversationId}
    `);
    const msgRows = (msgCountRes as any).rows || msgCountRes;
    const messageCount = parseInt(msgRows?.[0]?.cnt || "0", 10);

    if (!shouldAutoCreateProject(userMessage, messageCount)) return null;

    const projectName = extractProjectName(userMessage);

    const insertRes = await db.execute(sql`
      INSERT INTO projects (name, description, status, tenant_id, created_at, updated_at)
      VALUES (${projectName}, ${userMessage.slice(0, 200)}, 'active', ${tenantId}, NOW(), NOW())
      RETURNING id
    `);
    const insertRows = (insertRes as any).rows || insertRes;
    const projectId = insertRows?.[0]?.id;
    if (!projectId) return null;

    await db.execute(sql`
      UPDATE conversations SET project_id = ${projectId} WHERE id = ${conversationId}
    `);

    await db.execute(sql`
      INSERT INTO project_conversations (project_id, conversation_id) VALUES (${projectId}, ${conversationId})
      ON CONFLICT DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO project_notes (project_id, note, author)
      VALUES (${projectId}, ${"Project auto-created from conversation #" + conversationId + ". Initial request: " + userMessage.slice(0, 300)}, 'system')
    `);

    console.log(`[auto-project] Created project #${projectId}: "${projectName}" from conv #${conversationId}`);

    const directive = `\n\nSYSTEM NOTIFICATION — PROJECT AUTO-CREATED:
A project has been automatically created for this work:
- **Project #${projectId}: "${projectName}"**
- This conversation is now linked to it.

IMPORTANT INSTRUCTIONS FOR THE USER:
1. Tell the user that a project has been created for their work: "${projectName}" (Project #${projectId})
2. Tell them that all files, notes, and progress will be tracked automatically in this project
3. Tell them that for any FUTURE conversations about this same work, they should go to the Projects section and start a new conversation FROM the project — this ensures continuity across sessions
4. Tell them: "I'll remember everything we do here. When you come back later, just open Project #${projectId} and start a new chat — I'll pick up right where we left off."
5. Continue with their request normally after this notification.`;

    return { created: true, projectId, projectName, directive };
  } catch (err: any) {
    console.error(`[auto-project] Error:`, err.message);
    return null;
  }
}
