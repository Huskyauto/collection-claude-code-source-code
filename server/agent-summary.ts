import OpenAI from "openai";
import { emitDelegationEvent } from "./delegation-events";

const replit = new OpenAI();

const activeSummarizers = new Map<number, ReturnType<typeof setInterval>>();

async function generateStatusSummary(agentName: string, taskName: string, recentContext: string): Promise<string | null> {
  try {
    const resp = await replit.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `Generate a 3-5 word present-tense status summary for what agent "${agentName}" is currently doing on task "${taskName}".

Rules:
- Present tense only (e.g., "Analyzing market data")
- 3-5 words maximum
- Name the specific action, not vague descriptions
- No past tense ("Analyzed" is wrong, "Analyzing" is right)
- No vague language ("Working on it" is wrong, "Drafting proposal intro" is right)
- No punctuation at the end
- Capitalize first word only

Respond with ONLY the status summary, nothing else.`,
        },
        {
          role: "user",
          content: `Recent activity:\n${recentContext.slice(0, 500)}`,
        },
      ],
      max_completion_tokens: 30,
    });

    const summary = resp.choices[0]?.message?.content?.trim();
    if (!summary || summary.length > 60 || summary.length < 5) return null;
    return summary;
  } catch {
    return null;
  }
}

export function startDelegationSummarizer(
  conversationId: number,
  tenantId: number,
  agentName: string,
  taskName: string,
  depth: number,
  intervalMs: number = 20000,
): void {
  stopDelegationSummarizer(conversationId);

  let recentActivity: string[] = [];

  const { subscribeToDelegation } = require("./delegation-events");
  const unsub = subscribeToDelegation(conversationId, (event: { type: string; message: string; metadata?: Record<string, unknown> }) => {
    if (event.metadata?.isSummary) return;
    recentActivity.push(`[${event.type}] ${event.message}`);
    if (recentActivity.length > 10) recentActivity = recentActivity.slice(-10);
  });

  const timer = setInterval(async () => {
    if (recentActivity.length === 0) {
      recentActivity.push(`Working on: ${taskName}`);
    }

    const context = recentActivity.join("\n");
    const summary = await generateStatusSummary(agentName, taskName, context);

    if (summary) {
      emitDelegationEvent({
        conversationId,
        tenantId,
        type: "progress",
        agentName,
        depth,
        message: summary,
        metadata: { isSummary: true },
      });
    }
  }, intervalMs);

  const cleanup = { timer, unsub };
  activeSummarizers.set(conversationId, timer);
  (activeSummarizers as any)[`unsub_${conversationId}`] = unsub;
}

export function stopDelegationSummarizer(conversationId: number): void {
  const existing = activeSummarizers.get(conversationId);
  if (existing) {
    clearInterval(existing);
    activeSummarizers.delete(conversationId);
  }
  const unsub = (activeSummarizers as any)[`unsub_${conversationId}`];
  if (unsub) {
    unsub();
    delete (activeSummarizers as any)[`unsub_${conversationId}`];
  }
}
