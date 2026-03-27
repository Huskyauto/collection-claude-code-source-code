import { replitOpenai } from "./providers";

export interface ReflectionResult {
  shouldRefine: boolean;
  scores: {
    accuracy: number;
    completeness: number;
    relevance: number;
    tone: number;
    overall: number;
  };
  critique: string;
  refinedResponse?: string;
}

const REFLECTION_PROMPT = `You are a quality evaluator for an AI assistant's response. Evaluate the response on these criteria, scoring each from 1-10:

1. **Accuracy** — Is the information correct? Are claims supported?
2. **Completeness** — Does it fully address the user's question? Missing anything important?
3. **Relevance** — Does it stay on topic? Is everything included actually relevant?
4. **Tone** — Is it appropriate, professional, and matching the conversation context?

Respond in this exact JSON format:
{
  "accuracy": <1-10>,
  "completeness": <1-10>,
  "relevance": <1-10>,
  "tone": <1-10>,
  "overall": <1-10>,
  "critique": "<brief 1-2 sentence critique explaining any issues>",
  "shouldRefine": <true if overall < 7 or any individual score < 5>
}`;

const REFINEMENT_PROMPT = `You are refining an AI assistant's response based on quality feedback. 

The original response had these issues:
{{critique}}

Scores: accuracy={{accuracy}}, completeness={{completeness}}, relevance={{relevance}}, tone={{tone}}

Rewrite the response to address the identified issues. Keep what was good, fix what was lacking. Return ONLY the improved response text, nothing else.`;

export async function reflectOnResponse(
  userMessage: string,
  assistantResponse: string,
  personaName?: string,
): Promise<ReflectionResult> {
  if (assistantResponse.length < 20) {
    return {
      shouldRefine: false,
      scores: { accuracy: 8, completeness: 8, relevance: 8, tone: 8, overall: 8 },
      critique: "Response too short for meaningful reflection.",
    };
  }

  try {
    const truncatedUser = userMessage.slice(0, 500);
    const truncatedResponse = assistantResponse.slice(0, 2000);

    const evalResp = await replitOpenai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: REFLECTION_PROMPT },
        {
          role: "user",
          content: `User's message: "${truncatedUser}"\n\nAssistant's response: "${truncatedResponse}"\n\n${personaName ? `Persona: ${personaName}` : ""}`,
        },
      ],
      max_completion_tokens: 300,
    });

    const evalText = evalResp.choices?.[0]?.message?.content?.trim() || "";
    const jsonMatch = evalText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        shouldRefine: false,
        scores: { accuracy: 7, completeness: 7, relevance: 7, tone: 7, overall: 7 },
        critique: "Could not parse reflection evaluation.",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const scores = {
      accuracy: Math.min(10, Math.max(1, parsed.accuracy || 7)),
      completeness: Math.min(10, Math.max(1, parsed.completeness || 7)),
      relevance: Math.min(10, Math.max(1, parsed.relevance || 7)),
      tone: Math.min(10, Math.max(1, parsed.tone || 7)),
      overall: Math.min(10, Math.max(1, parsed.overall || 7)),
    };

    const shouldRefine = parsed.shouldRefine === true || scores.overall < 7 || Object.values(scores).some(s => s < 5);

    return {
      shouldRefine,
      scores,
      critique: parsed.critique || "No specific issues found.",
    };
  } catch (err: any) {
    console.log(`[self-reflection] Evaluation error: ${err.message}`);
    return {
      shouldRefine: false,
      scores: { accuracy: 7, completeness: 7, relevance: 7, tone: 7, overall: 7 },
      critique: "Reflection skipped due to error.",
    };
  }
}

export async function refineResponse(
  userMessage: string,
  originalResponse: string,
  reflection: ReflectionResult,
  model: string,
): Promise<string> {
  try {
    const prompt = REFINEMENT_PROMPT
      .replace("{{critique}}", reflection.critique)
      .replace("{{accuracy}}", String(reflection.scores.accuracy))
      .replace("{{completeness}}", String(reflection.scores.completeness))
      .replace("{{relevance}}", String(reflection.scores.relevance))
      .replace("{{tone}}", String(reflection.scores.tone));

    const resp = await replitOpenai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Original user question: "${userMessage.slice(0, 500)}"\n\nOriginal response to refine:\n${originalResponse.slice(0, 3000)}` },
      ],
      max_completion_tokens: 16384,
    });

    return resp.choices?.[0]?.message?.content?.trim() || originalResponse;
  } catch (err: any) {
    console.log(`[self-reflection] Refinement error: ${err.message}`);
    return originalResponse;
  }
}
