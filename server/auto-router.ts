import { getClientForModel, getUnhealthyProviders } from "./providers";
import { MODEL_REGISTRY, getAvailableModels, type ModelInfo } from "./providers";

export interface RouteDecision {
  modelId: string;
  label: string;
  reason: string;
  category: string;
  confidence: number;
}

const TASK_CATEGORIES: Record<string, { models: string[]; description: string }> = {
  "simple-chat": {
    models: [
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gpt-4.1-mini",
      "z-ai/glm-5-turbo",
      "gpt-5-mini",
    ],
    description: "Greetings, small talk, simple Q&A, yes/no, quick facts",
  },
  "general": {
    models: [
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gpt-4.1-mini",
      "z-ai/glm-5-turbo",
      "qwen/qwen3.5-plus-02-15",
    ],
    description: "General questions, summaries, explanations, light writing",
  },
  "writing": {
    models: [
      "gemini-3-flash-preview",
      "gpt-4.1",
      "z-ai/glm-5-turbo",
      "qwen/qwen3.5-plus-02-15",
      "minimax/minimax-m2.7",
      "claude-sonnet-4-20250514",
    ],
    description: "Creative writing, essays, emails, long-form content, editing",
  },
  "coding": {
    models: [
      "gemini-3.1-pro-preview",
      "gpt-4.1",
      "claude-opus-4-6",
      "claude-opus-4-20250514",
      "z-ai/glm-5",
      "z-ai/glm-4.7",
    ],
    description: "Code generation, debugging, refactoring, technical architecture",
  },
  "reasoning": {
    models: [
      "gpt-5.4",
      "gemini-3.1-pro-preview",
      "deepseek/deepseek-r1",
      "qwen/qwen3.5-plus-02-15",
      "o4-mini-openai",
      "o4-mini",
    ],
    description: "Math, logic, puzzles, multi-step analysis, complex problem solving",
  },
  "research": {
    models: [
      "sonar",
      "sonar-pro",
      "sonar-reasoning-pro",
      "sonar-deep-research",
      "gemini-3-flash-preview",
      "gpt-4.1",
    ],
    description: "Web research, fact-checking, current events, deep investigation",
  },
  "vision": {
    models: [
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "z-ai/glm-4.5v",
      "qwen/qwen3.5-plus-02-15",
      "gpt-5.4",
    ],
    description: "Image analysis, visual understanding, OCR, describe images",
  },
  "agentic": {
    models: [
      "gemini-3-flash-preview",
      "gpt-4.1",
      "gpt-4.1-mini",
      "z-ai/glm-5-turbo",
      "minimax/minimax-m2.7",
      "gpt-5.4",
    ],
    description: "Multi-step tasks, tool use, delegation, workflow orchestration, video/media production",
  },
  "translation": {
    models: [
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gpt-4.1-mini",
      "qwen/qwen3.5-plus-02-15",
      "z-ai/glm-5-turbo",
    ],
    description: "Language translation, multilingual content",
  },
  "data-analysis": {
    models: [
      "gemini-3.1-pro-preview",
      "gpt-4.1",
      "deepseek/deepseek-r1",
      "z-ai/glm-5-turbo",
      "qwen/qwen3.5-plus-02-15",
    ],
    description: "Data analysis, spreadsheets, statistics, charts, structured data",
  },
};

const CLASSIFICATION_PROMPT = `You are a task classifier for an AI routing system. Analyze the user's message and determine the best task category.

Categories:
${Object.entries(TASK_CATEGORIES).map(([k, v]) => `- "${k}": ${v.description}`).join("\n")}

Also estimate the complexity:
- "low": Simple, quick response needed (1-2 sentences)
- "medium": Moderate detail needed (paragraph-level)
- "high": Complex, detailed, multi-step response needed

Respond with ONLY valid JSON, no other text:
{"category":"<category>","complexity":"low|medium|high","reason":"<brief 5-10 word reason>"}`;

function hasAttachments(message: string): boolean {
  return /<!-- attachments:/.test(message);
}

function hasImageAttachments(message: string): boolean {
  return /<!-- attachments:.*"type"\s*:\s*"image\//.test(message);
}

function looksLikeCode(message: string): boolean {
  return /```[\s\S]*```/.test(message) ||
    /(function|const|let|var|import|export|class|def |if\s*\(|for\s*\(|while\s*\()/.test(message) ||
    /(fix|debug|refactor|implement|code|program|script|API|endpoint|function|bug)/i.test(message);
}

function looksLikeResearch(message: string): boolean {
  return /(search|research|find out|look up|what is the latest|current events|news about|fact.?check)/i.test(message);
}

function looksLikeReasoning(message: string): boolean {
  return /(solve|calculate|prove|analyze|compare|evaluate|explain why|step by step|reasoning|logic|math|equation)/i.test(message);
}

const SIMPLE_GREETINGS = /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice|good|great|bye|goodbye|gm|gn|lol|haha|yes|no|sure|nah|yep|nope|hmm|wow|damn|bruh)\s*[!.?]*$/i;

function looksLikeSimple(message: string): boolean {
  const stripped = message.replace(/<!-- attachments:[\s\S]*?-->\n?/, "").trim();
  return SIMPLE_GREETINGS.test(stripped);
}

function looksLikeAgentic(message: string): boolean {
  return /(video|youtube|produce|create.*video|make.*video|slide|audio|narrat|tts|mp4|upload.*drive|send.*email.*link|delegate|orchestrat)/i.test(message);
}

function quickClassify(message: string): { category: string; complexity: string } | null {
  if (hasImageAttachments(message)) return { category: "vision", complexity: "medium" };
  if (looksLikeAgentic(message)) return { category: "agentic", complexity: "high" };
  if (looksLikeResearch(message)) return { category: "research", complexity: "medium" };

  const codeScore = looksLikeCode(message) ? 1 : 0;
  const reasonScore = looksLikeReasoning(message) ? 1 : 0;

  if (codeScore && !reasonScore) return { category: "coding", complexity: "medium" };
  if (reasonScore && !codeScore) return { category: "reasoning", complexity: "medium" };

  if (looksLikeSimple(message)) return { category: "simple-chat", complexity: "low" };

  return null;
}

async function llmClassify(message: string): Promise<{ category: string; complexity: string; reason: string }> {
  try {
    const truncated = message.length > 500 ? message.slice(0, 500) + "..." : message;

    const classifierModels = [
      "z-ai/glm-5-turbo",
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gpt-4.1-mini",
      "gpt-5-mini",
    ];

    let client;
    let modelId = "gemini-2.5-flash";

    const available = await getAvailableModels();
    const availableIds = new Set(available.map(m => m.id));
    const unhealthy = getUnhealthyProviders();

    for (const cm of classifierModels) {
      if (!availableIds.has(cm)) continue;
      const cmProvider = MODEL_REGISTRY.find(m => m.id === cm)?.provider;
      if (cmProvider && unhealthy.has(cmProvider)) continue;
      try {
        const result = await getClientForModel(cm);
        client = result.client;
        modelId = result.actualModelId;
        break;
      } catch {}
    }

    if (!client) {
      for (const cm of classifierModels) {
        if (!availableIds.has(cm)) continue;
        try {
          const result = await getClientForModel(cm);
          client = result.client;
          modelId = result.actualModelId;
          break;
        } catch {}
      }
    }

    if (!client) {
      const result = await getClientForModel("gemini-2.5-flash");
      client = result.client;
      modelId = result.actualModelId;
    }

    const resp = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: truncated },
      ],
      max_completion_tokens: 100,
    });

    const text = resp.choices?.[0]?.message?.content?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (TASK_CATEGORIES[parsed.category]) {
        return {
          category: parsed.category,
          complexity: parsed.complexity || "medium",
          reason: parsed.reason || "Classified by AI",
        };
      }
    }
  } catch (err) {
    console.error("[auto-router] LLM classification failed:", err);
  }
  return { category: "general", complexity: "medium", reason: "Default fallback" };
}

const META_MODEL_IDS = new Set(["auto"]);

const PREMIUM_MODELS = new Set([
  "gpt-5.4", "gpt-4.1",
  "claude-sonnet-4-20250514", "claude-opus-4-20250514",
  "claude-sonnet-4-6", "claude-opus-4-6",
  "grok-4", "grok-3",
  "o4-mini", "o4-mini-openai",
  "gemini-3.1-pro-preview", "gemini-3-pro-preview",
  "minimax/minimax-m2.7", "mistralai/mistral-large-2512",
]);

function pickBestAvailable(preferredModels: string[], available: ModelInfo[], complexity: string): ModelInfo | null {
  const concrete = available.filter(m => !META_MODEL_IDS.has(m.id));

  if (complexity === "low" || complexity === "medium") {
    const budgetFirst = preferredModels.filter(id => !PREMIUM_MODELS.has(id));
    const premium = preferredModels.filter(id => PREMIUM_MODELS.has(id));
    const ordered = complexity === "low" ? budgetFirst : [...budgetFirst, ...premium];

    for (const modelId of ordered) {
      const found = concrete.find(m => m.id === modelId);
      if (found) return found;
    }
  }

  for (const modelId of preferredModels) {
    const found = concrete.find(m => m.id === modelId);
    if (found) return found;
  }

  if (complexity === "low") {
    const fast = concrete.find(m => m.tier === "fast");
    if (fast) return fast;
  }
  if (complexity === "high") {
    const powerful = concrete.find(m => m.tier === "powerful");
    if (powerful) return powerful;
  }

  return concrete.find(m => m.tier === "balanced") || concrete[0] || null;
}

const TIER_RANK: Record<string, number> = { fast: 0, balanced: 1, powerful: 2, reasoning: 3 };

interface RoundHistory {
  round: number;
  tier: string;
  category: string;
  complexity: string;
  toolsUsed: string[];
}

const conversationRoundHistory = new Map<number, { history: RoundHistory[]; lastUpdatedAt: number }>();
const ROUND_HISTORY_TTL = 600_000;
const roundHistoryCleanup = setInterval(() => {
  const cutoff = Date.now() - ROUND_HISTORY_TTL;
  for (const [key, entry] of conversationRoundHistory) {
    if (entry.lastUpdatedAt < cutoff) conversationRoundHistory.delete(key);
  }
}, 120_000);
if (roundHistoryCleanup.unref) roundHistoryCleanup.unref();

function analyzeToolCallComplexity(toolsUsed: string[]): "low" | "medium" | "high" {
  if (toolsUsed.length === 0) return "low";

  const heavyTools = ["deep_research", "orchestrate", "debate", "plan_and_execute", "tree_of_thought", "delegate_task"];
  const mediumTools = ["web_search", "web_fetch", "browser", "execute_code", "llm_task", "critique_response"];

  const hasHeavy = toolsUsed.some(t => heavyTools.includes(t));
  const hasMedium = toolsUsed.some(t => mediumTools.includes(t));

  if (hasHeavy) return "high";
  if (hasMedium || toolsUsed.length >= 3) return "medium";
  return "low";
}

export function assessRoundComplexity(
  userMessage: string,
  roundIndex: number,
  previousModel: string,
  conversationId?: number,
  toolsUsedThisRound?: string[]
): {
  shouldDowngrade: boolean;
  shouldUpgrade: boolean;
  suggestedTier: "fast" | "balanced" | "powerful" | "reasoning";
  reason: string;
} {
  const currentModel = MODEL_REGISTRY.find(m => m.id === previousModel);
  const currentTier = currentModel?.tier || "balanced";

  const quick = quickClassify(userMessage);
  const category = quick?.category || "general";
  const complexity = quick?.complexity || "medium";

  const toolComplexity = toolsUsedThisRound ? analyzeToolCallComplexity(toolsUsedThisRound) : "low";

  if (conversationId) {
    const entry = conversationRoundHistory.get(conversationId) || { history: [], lastUpdatedAt: Date.now() };
    entry.history.push({
      round: roundIndex,
      tier: currentTier,
      category,
      complexity,
      toolsUsed: toolsUsedThisRound || [],
    });
    if (entry.history.length > 20) entry.history.shift();
    entry.lastUpdatedAt = Date.now();
    conversationRoundHistory.set(conversationId, entry);
  }

  let targetTier: "fast" | "balanced" | "powerful" | "reasoning";

  if (complexity === "low" && toolComplexity === "low" && (category === "simple-chat" || category === "general")) {
    targetTier = "fast";
  } else if (complexity === "low" && toolComplexity === "low") {
    targetTier = "balanced";
  } else if (complexity === "medium" || toolComplexity === "medium") {
    targetTier = "balanced";
  } else {
    targetTier = "powerful";
  }

  if (category === "reasoning") {
    targetTier = complexity === "low" ? "balanced" : "reasoning";
  }
  if (category === "coding" && complexity === "high") {
    targetTier = "powerful";
  }
  if (toolComplexity === "high") {
    targetTier = targetTier === "fast" ? "balanced" : targetTier;
  }

  if (conversationId) {
    const entry = conversationRoundHistory.get(conversationId);
    if (entry) {
      const recentHeavy = entry.history.slice(-3).filter(h =>
        h.toolsUsed.some(t => ["deep_research", "orchestrate", "plan_and_execute"].includes(t))
      ).length;
      if (recentHeavy >= 2 && targetTier === "fast") {
        targetTier = "balanced";
      }
    }
  }

  const targetRank = TIER_RANK[targetTier] ?? 1;
  const currentRank = TIER_RANK[currentTier] ?? 1;

  if (roundIndex === 0) {
    return { shouldDowngrade: false, shouldUpgrade: false, suggestedTier: currentTier as any, reason: "First round — no change" };
  }

  if (targetRank < currentRank && (currentRank - targetRank >= 1)) {
    return {
      shouldDowngrade: true,
      shouldUpgrade: false,
      suggestedTier: targetTier,
      reason: `Round ${roundIndex}: "${category}" (${complexity}, tools: ${toolComplexity}) needs only ${targetTier} tier, currently on ${currentTier}`,
    };
  }

  if (targetRank > currentRank) {
    return {
      shouldUpgrade: true,
      shouldDowngrade: false,
      suggestedTier: targetTier,
      reason: `Round ${roundIndex}: "${category}" (${complexity}, tools: ${toolComplexity}) needs ${targetTier} tier, upgrading from ${currentTier}`,
    };
  }

  return { shouldDowngrade: false, shouldUpgrade: false, suggestedTier: currentTier as any, reason: "Tier is appropriate" };
}

export function getConversationRoundHistory(conversationId: number): RoundHistory[] {
  return conversationRoundHistory.get(conversationId)?.history || [];
}

export function clearConversationRoundHistory(conversationId: number): void {
  conversationRoundHistory.delete(conversationId);
}

export function getModelForTier(tier: "fast" | "balanced" | "powerful" | "reasoning", availableModels: ModelInfo[]): ModelInfo | null {
  const concrete = availableModels.filter(m => !META_MODEL_IDS.has(m.id));
  return concrete.find(m => m.tier === tier) || null;
}

export async function autoRouteModel(userMessage: string): Promise<RouteDecision> {
  const allAvailable = await getAvailableModels();
  const unhealthy = getUnhealthyProviders();
  const available = unhealthy.size > 0
    ? allAvailable.filter(m => !unhealthy.has(m.provider))
    : allAvailable;
  if (available.length === 0) available.push(...allAvailable);

  const quick = quickClassify(userMessage);
  let category: string;
  let complexity: string;
  let reason: string;

  if (quick) {
    category = quick.category;
    complexity = quick.complexity;
    reason = `Pattern match: ${category}`;
  } else {
    const result = await llmClassify(userMessage);
    category = result.category;
    complexity = result.complexity;
    reason = result.reason;
  }

  if (complexity === "high" && category === "coding") {
    const preferred = TASK_CATEGORIES[category].models;
    const premiumCoding = preferred.filter(id =>
      id.includes("opus") || id.includes("gpt-5")
    );
    const rest = preferred.filter(id => !premiumCoding.includes(id));
    const chosen = pickBestAvailable(
      [...premiumCoding, ...rest],
      available,
      complexity
    );
    if (chosen) {
      return {
        modelId: chosen.id,
        label: chosen.label,
        reason: `High complexity coding → premium model: ${reason}`,
        category,
        confidence: 0.95,
      };
    }
  }

  if (complexity === "high" && category === "agentic") {
    const preferred = TASK_CATEGORIES[category].models;
    const chosen = pickBestAvailable(preferred, available, complexity);
    if (chosen) {
      return {
        modelId: chosen.id,
        label: chosen.label,
        reason: `High complexity ${category}: ${reason}`,
        category,
        confidence: 0.85,
      };
    }
  }

  const preferredModels = TASK_CATEGORIES[category]?.models || TASK_CATEGORIES["general"].models;
  const chosen = pickBestAvailable(preferredModels, available, complexity);

  if (!chosen) {
    return {
      modelId: "z-ai/glm-5-turbo",
      label: "DeepSeek V3.2",
      reason: "No preferred models available, using budget default",
      category: "general",
      confidence: 0.5,
    };
  }

  return {
    modelId: chosen.id,
    label: chosen.label,
    reason,
    category,
    confidence: quick ? 0.9 : 0.8,
  };
}
