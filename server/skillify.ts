import { db } from "./db";
import { messages, conversations, skills } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { getClientForModel } from "./providers";
import { storage } from "./storage";

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface DelegationStep {
  targetAgent: string;
  taskName: string;
}

interface ConversationAnalysis {
  toolCalls: ToolCall[];
  delegations: DelegationStep[];
  userCorrections: string[];
  totalMessages: number;
  personaName: string;
  conversationTitle: string;
}

interface SkillDefinition {
  name: string;
  description: string;
  steps: string[];
  requiredTools: string[];
  requiredPersonas: string[];
  successCriteria: string[];
  promptContent: string;
}

const TOOL_CALL_PATTERN = /Tool:\s*(\w+)\s*\[/g;
const TOOL_JSON_PATTERN = /"name"\s*:\s*"(\w+)"/g;

function extractToolCalls(content: string): ToolCall[] {
  const tools: ToolCall[] = [];
  const seen = new Set<string>();

  const patterns = [
    /\btool[_\s]*call[s]?.*?["']?(\w+)["']?/gi,
    /calling\s+(?:tool\s+)?["']?(\w+)["']?/gi,
    /\bTool:\s*(\w+)/g,
    /"name"\s*:\s*"(\w+)"/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      if (!seen.has(name) && name.length > 2 && !["the", "and", "for", "tool", "this", "that"].includes(name.toLowerCase())) {
        seen.add(name);
        tools.push({ name, args: {} });
      }
    }
  }

  return tools;
}

function extractDelegations(content: string): DelegationStep[] {
  const delegations: DelegationStep[] = [];
  const delegatePattern = /delegate.*?(?:to|→)\s*(\w+).*?(?:task|:)\s*["']?([^"'\n]+)/gi;
  let match;
  while ((match = delegatePattern.exec(content)) !== null) {
    delegations.push({ targetAgent: match[1], taskName: match[2].trim() });
  }
  return delegations;
}

function extractUserCorrections(msgs: { role: string; content: string }[]): string[] {
  const corrections: string[] = [];
  const correctionPatterns = [
    /\b(no|wrong|incorrect|fix|change|instead|actually|not what|redo|try again|different)\b/i,
  ];

  for (const m of msgs) {
    if (m.role === "user" && correctionPatterns.some(p => p.test(m.content))) {
      corrections.push(m.content.slice(0, 200));
    }
  }

  return corrections;
}

async function analyzeConversation(conversationId: number): Promise<ConversationAnalysis> {
  const conv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv.length) throw new Error(`Conversation ${conversationId} not found`);

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const allToolCalls: ToolCall[] = [];
  const allDelegations: DelegationStep[] = [];

  for (const m of msgs) {
    if (m.role === "assistant") {
      allToolCalls.push(...extractToolCalls(m.content));

      const delegateMatches = m.content.match(/delegate_task/gi);
      if (delegateMatches) {
        allDelegations.push(...extractDelegations(m.content));
      }
    }
  }

  const userCorrections = extractUserCorrections(msgs.map(m => ({ role: m.role, content: m.content })));

  let personaName = "VisionClaw";
  if (conv[0].personaId) {
    try {
      const { sql } = await import("drizzle-orm");
      const persona = await db.execute(
        sql`SELECT name FROM personas WHERE id = ${conv[0].personaId}`
      );
      if ((persona.rows as any[])[0]?.name) {
        personaName = (persona.rows as any[])[0].name;
      }
    } catch {}
  }

  return {
    toolCalls: allToolCalls,
    delegations: allDelegations,
    userCorrections,
    totalMessages: msgs.length,
    personaName,
    conversationTitle: conv[0].title,
  };
}

const SKILLIFY_PROMPT = `You are a skill extraction engine for an AI agent platform. Analyze the conversation summary below and produce a reusable skill definition.

A skill is a set of instructions that teaches an AI agent how to reliably complete a specific type of task. It includes:
- A clear name and description
- Step-by-step instructions
- Which tools to use and when
- Which specialist agents to delegate to
- Success criteria

Rules:
- Steps should be concrete and actionable, not vague
- Include error handling guidance ("if X fails, try Y")
- Reference specific tool names the agent should use
- If user corrections were made, incorporate the corrected approach
- Success criteria should be measurable or verifiable
- The promptContent should be the full instruction set, written as if speaking to the agent

Respond with ONLY valid JSON:
{
  "name": "skill_name_here",
  "description": "One-line description",
  "steps": ["Step 1: ...", "Step 2: ..."],
  "requiredTools": ["tool_name_1", "tool_name_2"],
  "requiredPersonas": ["Persona Name"],
  "successCriteria": ["Criterion 1", "Criterion 2"],
  "promptContent": "Full instruction text for the agent..."
}`;

export async function skillifyConversation(
  conversationId: number,
  suggestedName?: string,
  personaId?: number | null,
): Promise<{ skill?: { id: number; name: string; description: string }; error?: string }> {
  try {
    const analysis = await analyzeConversation(conversationId);

    if (analysis.totalMessages < 4) {
      return { error: "Conversation is too short to extract a meaningful skill. Need at least 4 messages." };
    }

    const uniqueTools = [...new Set(analysis.toolCalls.map(t => t.name))];
    const uniquePersonas = [...new Set(analysis.delegations.map(d => d.targetAgent))];

    const summaryForLLM = `Conversation: "${analysis.conversationTitle}"
Lead Agent: ${analysis.personaName}
Total messages: ${analysis.totalMessages}
Tools used (${uniqueTools.length}): ${uniqueTools.join(", ") || "none detected"}
Delegations (${analysis.delegations.length}): ${analysis.delegations.map(d => `${d.targetAgent}: ${d.taskName}`).join("; ") || "none"}
User corrections (${analysis.userCorrections.length}): ${analysis.userCorrections.join(" | ") || "none"}
${suggestedName ? `Suggested skill name: "${suggestedName}"` : ""}

Recent conversation excerpt (last messages):`;

    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    const excerpt = msgs.reverse().map(m =>
      `[${m.role}]: ${m.content.slice(0, 300)}`
    ).join("\n");

    const { client, actualModelId } = await getClientForModel("gpt-4.1-mini");

    const resp = await client.chat.completions.create({
      model: actualModelId,
      messages: [
        { role: "system", content: SKILLIFY_PROMPT },
        { role: "user", content: `${summaryForLLM}\n${excerpt}` },
      ],
      max_completion_tokens: 2000,
    });

    const text = resp.choices?.[0]?.message?.content?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: "Could not parse skill definition from LLM response" };
    }

    const skillDef: SkillDefinition = JSON.parse(jsonMatch[0]);

    if (!skillDef.name || !skillDef.description || !skillDef.promptContent) {
      return { error: "LLM produced incomplete skill definition (missing name, description, or promptContent)" };
    }

    const skillName = suggestedName || skillDef.name;

    const stepsSection = skillDef.steps?.length
      ? `\n\nSTEPS:\n${skillDef.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : "";
    const toolsSection = skillDef.requiredTools?.length
      ? `\n\nREQUIRED TOOLS: ${skillDef.requiredTools.join(", ")}`
      : "";
    const personasSection = skillDef.requiredPersonas?.length
      ? `\n\nDELEGATE TO: ${skillDef.requiredPersonas.join(", ")}`
      : "";
    const criteriaSection = skillDef.successCriteria?.length
      ? `\n\nSUCCESS CRITERIA:\n${skillDef.successCriteria.map(c => `- ${c}`).join("\n")}`
      : "";

    const fullPromptContent = `${skillDef.promptContent}${stepsSection}${toolsSection}${personasSection}${criteriaSection}`;

    const created = await storage.createSkill({
      name: skillName,
      description: skillDef.description,
      promptContent: fullPromptContent,
      category: "learned",
      icon: "GraduationCap",
      enabled: true,
      personaId: personaId ?? null,
    });

    import("./persona-sync").then(m => m.syncPersonaDocs()).catch(e =>
      console.error("[skillify] Persona sync after skill creation failed:", e.message)
    );

    console.log(`[skillify] Created skill "${skillName}" (ID ${created.id}) from conversation ${conversationId}`);

    return {
      skill: {
        id: created.id,
        name: created.name,
        description: created.description,
      },
    };
  } catch (err: any) {
    console.error(`[skillify] Failed:`, err.message);
    return { error: `Skill extraction failed: ${err.message}` };
  }
}

export function shouldSuggestSkillify(toolCount: number, personaCount: number): boolean {
  return toolCount >= 3 && personaCount >= 2;
}
