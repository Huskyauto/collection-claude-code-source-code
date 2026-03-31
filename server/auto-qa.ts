import OpenAI from "openai";

interface QAResult {
  verdict: "approved" | "needs-revision" | "flagged";
  score: number;
  issues: string[];
  strengths: string[];
  summary: string;
}

const replit = new OpenAI();

async function runAutoQA(
  agentName: string,
  taskName: string,
  output: string,
  tenantId: number,
  conversationId?: number
): Promise<QAResult | null> {
  const truncatedOutput = output.slice(0, 3000);

  try {
    const resp = await replit.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are Proof, the quality assurance specialist. Review the output from agent "${agentName}" for task "${taskName}".

Evaluate on these criteria:
1. Completeness — does the output address the full task?
2. Accuracy — are facts, data, and claims correct?
3. Clarity — is it well-structured and easy to understand?
4. Professionalism — tone, formatting, and presentation quality

Respond with ONLY valid JSON:
{
  "verdict": "approved" | "needs-revision" | "flagged",
  "score": 1-10,
  "issues": ["issue1", "issue2"],
  "strengths": ["strength1"],
  "summary": "One sentence review"
}`,
        },
        {
          role: "user",
          content: `Task: ${taskName}\nAgent: ${agentName}\n\nOutput to review:\n${truncatedOutput}`,
        },
      ],
      max_completion_tokens: 300,
    });

    const raw = resp.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as QAResult;

    if (!["approved", "needs-revision", "flagged"].includes(parsed.verdict)) {
      parsed.verdict = parsed.score >= 7 ? "approved" : parsed.score >= 4 ? "needs-revision" : "flagged";
    }

    try {
      const { emitDelegationEvent } = await import("./delegation-events");
      const verdictLabel = parsed.verdict === "approved" ? "approved" : parsed.verdict === "needs-revision" ? "needs revision" : "flagged for review";
      emitDelegationEvent({
        conversationId: conversationId ?? 0,
        tenantId,
        type: "progress",
        agentName: "Proof",
        agentRole: "Quality Assurance",
        depth: 0,
        message: `Auto-QA review of ${agentName}'s output: ${verdictLabel} (${parsed.score}/10). ${parsed.summary}`,
        metadata: { qaResult: parsed, reviewedAgent: agentName, taskName },
      });
    } catch {}

    return parsed;
  } catch (err: any) {
    console.warn(`[auto-qa] Review failed: ${err.message}`);
    return null;
  }
}

function runAutoQAAsync(
  agentName: string,
  taskName: string,
  output: string,
  tenantId: number,
  conversationId?: number
): void {
  runAutoQA(agentName, taskName, output, tenantId, conversationId)
    .then(result => {
      if (result) {
        console.log(`[auto-qa] ${agentName} output reviewed: ${result.verdict} (${result.score}/10)`);
      }
    })
    .catch(err => console.warn(`[auto-qa] Async review failed: ${err.message}`));
}

export { runAutoQA, runAutoQAAsync, QAResult };
