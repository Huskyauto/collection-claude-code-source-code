import OpenAI from "openai";
import { storage } from "./storage";
import { getSubscriptionAccessToken } from "./oauth-subscriptions";
import { decryptApiKey } from "./crypto";
import { isClaudeRunnerAvailable, getClaudeRunnerBaseUrl } from "./claude-runner";

export const replitOpenai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  tier: "fast" | "balanced" | "powerful" | "reasoning";
  description: string;
  capabilities?: ("vision" | "audio" | "image_gen" | "video" | "code" | "tools")[];
}

export const MODEL_REGISTRY: ModelInfo[] = [
  { id: "auto", label: "Auto Select", provider: "replit", tier: "balanced", description: "Intelligently routes to the best model for each task" },
  { id: "gpt-5.4", label: "GPT-5.4", provider: "replit", tier: "powerful", description: "Latest flagship - most capable OpenAI model", capabilities: ["vision", "audio", "code", "tools"] },
  { id: "gpt-5-mini", label: "GPT-5 Mini", provider: "replit", tier: "balanced", description: "Fast and cost-effective", capabilities: ["vision", "code", "tools"] },
  { id: "o4-mini", label: "o4 Mini", provider: "replit", tier: "reasoning", description: "Reasoning/thinking model", capabilities: ["code", "tools"] },

  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", tier: "powerful", description: "Coding & instruction following", capabilities: ["vision", "code", "tools"] },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai", tier: "balanced", description: "Balanced speed and intelligence", capabilities: ["vision", "code", "tools"] },
  { id: "o4-mini-openai", label: "o4 Mini (OpenAI)", provider: "openai", tier: "reasoning", description: "OpenAI reasoning model", capabilities: ["code", "tools"] },

  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Latest)", provider: "anthropic", tier: "powerful", description: "Latest Sonnet - best balanced model", capabilities: ["vision", "code", "tools"] },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4 (Latest)", provider: "anthropic", tier: "powerful", description: "Latest Opus - most capable reasoning and coding", capabilities: ["vision", "code", "tools"] },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic", tier: "powerful", description: "Extended thinking, hybrid reasoning", capabilities: ["vision", "code", "tools"] },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "anthropic", tier: "powerful", description: "Deep complex reasoning and coding", capabilities: ["vision", "code", "tools"] },

  { id: "grok-4", label: "Grok 4", provider: "xai", tier: "powerful", description: "Latest xAI flagship - frontier reasoning and tool use", capabilities: ["vision", "code", "tools"] },
  { id: "grok-3", label: "Grok 3", provider: "xai", tier: "powerful", description: "xAI flagship model", capabilities: ["vision", "code", "tools"] },
  { id: "grok-3-mini", label: "Grok 3 Mini", provider: "xai", tier: "fast", description: "Fast xAI model for quick tasks and testing", capabilities: ["code", "tools"] },

  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", provider: "google", tier: "powerful", description: "Most powerful - agentic workflows, multimodal, complex reasoning", capabilities: ["vision", "audio", "video", "code", "tools"] },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "google", tier: "powerful", description: "Powerful agentic model and vibe-coding", capabilities: ["vision", "audio", "video", "code", "tools"] },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "google", tier: "balanced", description: "Hybrid reasoning, good for daily use and high-volume", capabilities: ["vision", "audio", "video", "code", "tools"] },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google", tier: "balanced", description: "Fast and capable, great cost-to-quality ratio", capabilities: ["vision", "audio", "code", "tools"] },

  { id: "sonar-pro", label: "Sonar Pro", provider: "perplexity", tier: "powerful", description: "Deep web research with citations" },
  { id: "sonar", label: "Sonar", provider: "perplexity", tier: "balanced", description: "Fast web search with citations" },
  { id: "sonar-reasoning-pro", label: "Sonar Reasoning Pro", provider: "perplexity", tier: "reasoning", description: "Multi-step research with reasoning" },
  { id: "sonar-deep-research", label: "Sonar Deep Research", provider: "perplexity", tier: "powerful", description: "Exhaustive multi-source research" },

  { id: "minimax/minimax-m2.7", label: "MiniMax M2.7", provider: "openrouter", tier: "powerful", description: "Latest MiniMax model - enhanced reasoning & agentic performance", capabilities: ["tools"] },
  { id: "moonshotai/kimi-k2.5", label: "Kimi K2.5", provider: "openrouter", tier: "powerful", description: "1T params MoE, 262K context, 1500 parallel tools - $0.45/M in", capabilities: ["tools"] },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", provider: "openrouter", tier: "reasoning", description: "Deep reasoning model - top math/code benchmarks", capabilities: ["code"] },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2", provider: "openrouter", tier: "balanced", description: "Ultra-cheap, ~90% GPT-5.4 perf - $0.27/M in, $0.41/M out", capabilities: ["code", "tools"] },
  { id: "qwen/qwen3.5-plus-02-15", label: "Qwen 3.5 Plus", provider: "openrouter", tier: "balanced", description: "Multimodal, 1M context - $0.26/M in, $2.08/M out", capabilities: ["vision", "code", "tools"] },
  { id: "qwen/qwen2.5-vl-72b-instruct", label: "Qwen 2.5 VL 72B", provider: "openrouter", tier: "balanced", description: "Top open-source vision model - $0.20/M in, $0.40/M out", capabilities: ["vision", "code", "tools"] },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (OR)", provider: "openrouter", tier: "powerful", description: "Google's latest frontier model via OpenRouter", capabilities: ["vision", "audio", "video", "code", "tools"] },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "openrouter", tier: "powerful", description: "Meta's open-source flagship - vision + tools", capabilities: ["vision", "code", "tools"] },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", provider: "openrouter", tier: "balanced", description: "Meta vision model, 109B MoE, 512K context - $0.15/M in, $0.40/M out", capabilities: ["vision", "code", "tools"] },
  { id: "mistralai/mistral-large-2512", label: "Mistral Large 3", provider: "openrouter", tier: "powerful", description: "Apache 2.0, 41B active (675B total), 262K context", capabilities: ["code", "tools"] },
];

export function isModelMultimodal(modelId: string): boolean {
  const model = MODEL_REGISTRY.find(m => m.id === modelId);
  return !!(model?.capabilities?.includes("vision"));
}

export function getMultimodalModelsForTier(tier: "fast" | "balanced" | "powerful" | "reasoning"): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.tier === tier && m.capabilities?.includes("vision"));
}

export const PROVIDER_CONFIG: Record<string, { name: string; baseUrl: string; description: string }> = {
  replit: { name: "Replit AI (Built-in)", baseUrl: "", description: "Built-in - GPT-5.4, GPT-5.1, no API key needed" },
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1", description: "GPT-4o, GPT-4.1, o4-mini" },
  anthropic: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", description: "Claude Opus 4.6, Sonnet 4.6, Haiku 4.5" },
  xai: { name: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", description: "Grok 4, Grok 3, Grok 3 Mini" },
  google: { name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", description: "Gemini 3.1 Pro, 3 Pro, 3 Flash, 2.5 Pro - cheapest & fastest" },
  perplexity: { name: "Perplexity", baseUrl: "https://api.perplexity.ai", description: "Web research - Sonar, Sonar Pro, Deep Research" },
  openrouter: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", description: "Kimi K2.5, MiniMax, DeepSeek, Qwen, Llama & more - one key, many models" },
};

const INTEGRATION_ENV: Record<string, { apiKeyEnv: string; baseUrlEnv: string }> = {
  anthropic: { apiKeyEnv: "AI_INTEGRATIONS_ANTHROPIC_API_KEY", baseUrlEnv: "AI_INTEGRATIONS_ANTHROPIC_BASE_URL" },
  google: { apiKeyEnv: "AI_INTEGRATIONS_GEMINI_API_KEY", baseUrlEnv: "AI_INTEGRATIONS_GEMINI_BASE_URL" },
};

function getIntegrationClient(provider: string): OpenAI | null {
  const env = INTEGRATION_ENV[provider];
  if (!env) return null;
  const apiKey = process.env[env.apiKeyEnv];
  const baseURL = process.env[env.baseUrlEnv];
  if (!apiKey || !baseURL) return null;
  const cacheKey = `integration-${provider}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, new OpenAI({ apiKey, baseURL }));
  }
  return clientCache.get(cacheKey)!;
}

export function hasIntegrationFallback(provider: string): boolean {
  const env = INTEGRATION_ENV[provider];
  if (!env) return false;
  return !!(process.env[env.apiKeyEnv] && process.env[env.baseUrlEnv]);
}

const clientCache = new Map<string, OpenAI>();

function getReplit(): OpenAI {
  if (!clientCache.has("replit")) {
    clientCache.set("replit", new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    }));
  }
  return clientCache.get("replit")!;
}

const SUBSCRIPTION_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
};

function getSubscriptionClient(provider: string, token: string): OpenAI {
  const cacheKey = `sub-${provider}-${token.slice(-8)}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, new OpenAI({
      apiKey: token,
      baseURL: SUBSCRIPTION_BASE_URLS[provider] || PROVIDER_CONFIG[provider]?.baseUrl,
    }));
  }
  return clientCache.get(cacheKey)!;
}

const subscriptionFailureCache = new Map<string, { failedAt: number; isRateLimit: boolean }>();
const SUBSCRIPTION_AUTH_FAILURE_TTL = 600_000;
const SUBSCRIPTION_RATE_LIMIT_TTL = 120_000;

export function markSubscriptionFailed(provider: string, tenantId: number, statusCode?: number) {
  const isRateLimit = statusCode === 429;
  subscriptionFailureCache.set(`${provider}-${tenantId}`, { failedAt: Date.now(), isRateLimit });
  console.log(`[providers] Subscription ${provider} blocked for tenant ${tenantId} (${isRateLimit ? "rate limit — 2min" : "auth failure — 10min"})`);
}

const providerHealthCache = new Map<string, { failedAt: number; reason: string; attempts: number }>();
const PROVIDER_HEALTH_TTL = 300_000;
const PROVIDER_HEALTH_MAX_ATTEMPTS = 3;

export function markProviderUnhealthy(provider: string, reason: string) {
  const existing = providerHealthCache.get(provider);
  const attempts = (existing?.attempts || 0) + 1;
  providerHealthCache.set(provider, { failedAt: Date.now(), reason, attempts });
  console.warn(`[providers] Marked ${provider} unhealthy (attempt ${attempts}): ${reason.slice(0, 80)}`);
}

export function isProviderHealthy(provider: string): boolean {
  const entry = providerHealthCache.get(provider);
  if (!entry) return true;
  if (Date.now() - entry.failedAt > PROVIDER_HEALTH_TTL) {
    providerHealthCache.delete(provider);
    return true;
  }
  return entry.attempts < PROVIDER_HEALTH_MAX_ATTEMPTS;
}

export function getUnhealthyProviders(): Set<string> {
  const unhealthy = new Set<string>();
  for (const [provider, entry] of providerHealthCache.entries()) {
    if (Date.now() - entry.failedAt <= PROVIDER_HEALTH_TTL && entry.attempts >= PROVIDER_HEALTH_MAX_ATTEMPTS) {
      unhealthy.add(provider);
    }
  }
  return unhealthy;
}

export function resetProviderHealth(provider: string) {
  providerHealthCache.delete(provider);
}

async function trySubscriptionAuth(provider: string, tenantId: number | undefined): Promise<OpenAI | null> {
  if (!tenantId) return null;
  if (!SUBSCRIPTION_BASE_URLS[provider]) return null;

  const failKey = `${provider}-${tenantId}`;
  const failEntry = subscriptionFailureCache.get(failKey);
  if (failEntry) {
    const ttl = failEntry.isRateLimit ? SUBSCRIPTION_RATE_LIMIT_TTL : SUBSCRIPTION_AUTH_FAILURE_TTL;
    if (Date.now() - failEntry.failedAt < ttl) {
      return null;
    }
    subscriptionFailureCache.delete(failKey);
  }

  try {
    const token = await getSubscriptionAccessToken(provider, tenantId);
    if (token) {
      console.log(`[providers] Using ${provider} subscription OAuth token for tenant ${tenantId}`);
      return getSubscriptionClient(provider, token);
    }
  } catch (err: any) {
    console.warn(`[providers] Subscription auth check failed for ${provider}:`, err.message);
  }
  return null;
}

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "gpt-4o-mini": "gpt-5-mini",
  "gpt-4o": "gpt-5.4",
  "gpt-4": "gpt-4.1",
  "gpt-4-turbo": "gpt-4.1",
  "claude-3-opus": "claude-opus-4-20250514",
  "claude-3-sonnet": "claude-sonnet-4-20250514",
  "claude-3-haiku": "gpt-5-mini",
  "gemini-pro": "gemini-3-flash-preview",
  "gemini-1.5-pro": "gemini-3-flash-preview",
};

export async function getClientForModel(modelId: string, tenantId?: number): Promise<{ client: OpenAI; actualModelId: string }> {
  if (LEGACY_MODEL_ALIASES[modelId]) {
    console.log(`[providers] Legacy model alias: "${modelId}" → "${LEGACY_MODEL_ALIASES[modelId]}"`);
    modelId = LEGACY_MODEL_ALIASES[modelId];
  }
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);

  if (!model || model.provider === "replit") {
    const mapped = mapReplitToOpenAI(modelId);
    if (mapped) {
      const subClient = await trySubscriptionAuth("openai", tenantId);
      if (subClient) return { client: subClient, actualModelId: mapped };
    }

    const tenantKey = tenantId ? await storage.getTenantProviderKey(tenantId, "openai") : null;
    if (tenantKey?.api_key) {
      const mapped2 = mapReplitToOpenAI(modelId);
      if (mapped2) {
        return { client: getUserClient("openai", decryptApiKey(tenantKey.api_key)), actualModelId: mapped2 };
      }
    }
    const openaiUserKey = await storage.getProviderKey("openai");
    if (openaiUserKey && openaiUserKey.enabled && openaiUserKey.apiKey) {
      const mapped2 = mapReplitToOpenAI(modelId);
      if (mapped2) {
        return { client: getUserClient("openai", decryptApiKey(openaiUserKey.apiKey)), actualModelId: mapped2 };
      }
    }
    const mappedFinal = mapReplitToOpenAI(modelId);
    return { client: getReplit(), actualModelId: mappedFinal || modelId };
  }

  let actualModelId = modelId;
  if (modelId === "o4-mini-openai") actualModelId = "o4-mini";

  if (model.provider === "anthropic" && isClaudeRunnerAvailable()) {
    const cacheKey = "claude-runner-bridge";
    if (!clientCache.has(cacheKey)) {
      clientCache.set(cacheKey, new OpenAI({
        apiKey: "claude-runner-local",
        baseURL: getClaudeRunnerBaseUrl(),
      }));
    }
    console.log(`[providers] Routing ${modelId} through Claude Runner bridge (Max plan, $0 per-token cost)`);
    return { client: clientCache.get(cacheKey)!, actualModelId };
  }

  const subClient = await trySubscriptionAuth(model.provider, tenantId);
  if (subClient) return { client: subClient, actualModelId };

  const tenantKey = tenantId ? await storage.getTenantProviderKey(tenantId, model.provider) : null;
  if (tenantKey?.api_key) {
    return { client: getUserClient(model.provider, decryptApiKey(tenantKey.api_key)), actualModelId };
  }

  const ENV_KEY_FALLBACK: Record<string, string> = {
    openrouter: "OPENROUTER_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    xai: "XAI_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
  };
  const PROVIDER_KEY_PREFIXES: Record<string, string> = {
    openrouter: "sk-or-",
    openai: "sk-",
    anthropic: "sk-ant-",
  };

  const providerKey = await storage.getProviderKey(model.provider);
  const rawDbKey = providerKey?.enabled && providerKey?.apiKey ? providerKey.apiKey : null;
  const dbKey = rawDbKey ? decryptApiKey(rawDbKey) : null;

  const expectedPrefix = PROVIDER_KEY_PREFIXES[model.provider];
  const dbKeyValid = dbKey && (!expectedPrefix || dbKey.startsWith(expectedPrefix));

  if (dbKeyValid && dbKey) {
    return { client: getUserClient(model.provider, dbKey), actualModelId };
  }

  if (dbKey && !dbKeyValid) {
    console.warn(`[providers] DB key for ${model.provider} has invalid prefix (len=${dbKey.length}, prefix=${dbKey.slice(0, 6)}), skipping`);
  }

  const envVarName = ENV_KEY_FALLBACK[model.provider];
  const envKey = envVarName ? process.env[envVarName] : undefined;
  if (envKey && envKey.length > 5) {
    const envKeyValid = !expectedPrefix || envKey.startsWith(expectedPrefix);
    if (envKeyValid) {
      console.log(`[providers] No valid DB key for ${model.provider}, using env var ${envVarName} as bootstrap`);
      return { client: getUserClient(model.provider, envKey), actualModelId };
    }
  }

  const fallbackClient = getIntegrationClient(model.provider);
  if (fallbackClient) {
    return { client: fallbackClient, actualModelId };
  }

  throw new Error(`No API key configured for ${PROVIDER_CONFIG[model.provider]?.name || model.provider}. Add it in Settings > API Keys.`);
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  const prefix = key.slice(0, Math.min(key.indexOf("-") + 1 || 3, 6));
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

function mapReplitToOpenAI(modelId: string): string | null {
  const map: Record<string, string> = {
    "gpt-5.4": "gpt-4.1",
    "gpt-5-mini": "gpt-4.1-mini",
    "o4-mini": "o4-mini",
  };
  return map[modelId] || null;
}

function getUserClient(provider: string, apiKey: string): OpenAI {
  const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, (ch) => {
    const c = ch.charCodeAt(0);
    if (c === 0x2014 || c === 0x2013) return "-";
    return "";
  });
  const cacheKey = `${provider}-${cleanKey.slice(-8)}`;
  if (!clientCache.has(cacheKey)) {
    const baseUrl = PROVIDER_CONFIG[provider].baseUrl;
    const opts: any = { apiKey: cleanKey, baseURL: baseUrl };
    if (provider === "openrouter") {
      opts.defaultHeaders = {
        "HTTP-Referer": "https://visionclaw.replit.app",
        "X-Title": "VisionClaw Agent",
      };
    }
    clientCache.set(cacheKey, new OpenAI(opts));
  }
  return clientCache.get(cacheKey)!;
}

export function clearClientCache() {
  clientCache.delete("replit");
  for (const key of clientCache.keys()) {
    if (key !== "replit") clientCache.delete(key);
  }
}

setInterval(() => {
  const platformKeys = new Set(["replit", "openai", "anthropic", "google", "xai", "openrouter", "perplexity"]);
  let pruned = 0;
  for (const key of clientCache.keys()) {
    if (!platformKeys.has(key)) {
      clientCache.delete(key);
      pruned++;
    }
  }
  if (pruned > 0) console.log(`[providers] Pruned ${pruned} cached tenant clients`);
}, 60 * 60 * 1000);

export async function getModelForTierAsync(tier: "fast" | "balanced" | "powerful" | "reasoning", tenantId?: number): Promise<string> {
  const keys = await storage.getProviderKeys();
  const enabled = new Set(keys.filter((k) => k.enabled && k.apiKey).map((k) => k.provider));

  const subscriptionProviders = new Set<string>();
  if (tenantId) {
    for (const provider of Object.keys(SUBSCRIPTION_BASE_URLS)) {
      try {
        const token = await getSubscriptionAccessToken(provider, tenantId);
        if (token) subscriptionProviders.add(provider);
      } catch {}
    }
  }

  const tierModels: Record<string, { provider: string; model: string }[]> = {
    fast: [
      { provider: "google", model: "gemini-2.5-flash" },
      { provider: "openrouter", model: "deepseek/deepseek-v3.2" },
      { provider: "openrouter", model: "meta-llama/llama-4-scout" },
      { provider: "google", model: "gemini-3-flash-preview" },
      { provider: "openai", model: "gpt-4.1-mini" },
      { provider: "replit", model: "gpt-5-mini" },
    ],
    balanced: [
      { provider: "google", model: "gemini-2.5-flash" },
      { provider: "openrouter", model: "deepseek/deepseek-v3.2" },
      { provider: "openrouter", model: "meta-llama/llama-4-scout" },
      { provider: "google", model: "gemini-3-flash-preview" },
      { provider: "openai", model: "gpt-4.1-mini" },
      { provider: "replit", model: "gpt-5-mini" },
    ],
    powerful: [
      { provider: "anthropic", model: "claude-opus-4-6" },
      { provider: "anthropic", model: "claude-opus-4-20250514" },
      { provider: "openrouter", model: "meta-llama/llama-4-maverick" },
      { provider: "openrouter", model: "google/gemini-3-flash-preview" },
      { provider: "openrouter", model: "minimax/minimax-m2.7" },
      { provider: "google", model: "gemini-3.1-pro-preview" },
      { provider: "google", model: "gemini-3-pro-preview" },
      { provider: "openai", model: "gpt-4.1" },
      { provider: "anthropic", model: "claude-sonnet-4-20250514" },
      { provider: "xai", model: "grok-4" },
      { provider: "replit", model: "gpt-5.4" },
    ],
    reasoning: [
      { provider: "openrouter", model: "deepseek/deepseek-r1" },
      { provider: "openai", model: "o4-mini-openai" },
      { provider: "replit", model: "o4-mini" },
    ],
  };

  const candidates = tierModels[tier] || tierModels.balanced;

  for (const c of candidates) {
    if (subscriptionProviders.has(c.provider)) return c.model;
  }

  for (const c of candidates) {
    if (enabled.has(c.provider)) return c.model;
    if (hasIntegrationFallback(c.provider)) return c.model;
  }
  for (const c of candidates) {
    if (c.provider === "replit") return c.model;
  }
  return candidates[candidates.length - 1].model;
}

export function getModelForTier(tier: "fast" | "balanced" | "powerful" | "reasoning"): string {
  const tierMap: Record<string, string> = {
    fast: "gemini-2.5-flash",
    balanced: "gemini-2.5-flash",
    powerful: "gpt-5.4",
    reasoning: "o4-mini",
  };
  return tierMap[tier] || "gemini-2.5-flash";
}

const MODEL_MAX_OUTPUT: Record<string, number> = {
  "claude-sonnet-4-20250514": 16384,
  "claude-opus-4-20250514": 16384,
  "claude-sonnet-4-6": 65536,
  "claude-opus-4-6": 65536,
  "gpt-5.4": 32768,
  "gpt-5-mini": 32768,
  "gpt-4.1": 32768,
  "gpt-4.1-mini": 32768,
  "o4-mini": 65536,
  "o4-mini-openai": 65536,
  "grok-4": 32768,
  "grok-3": 32768,
  "grok-3-mini": 16384,
  "gemini-3-flash-preview": 65536,
  "gemini-3-pro-preview": 65536,
  "gemini-3.1-pro-preview": 65536,
  "gemini-2.5-flash": 65536,
  "deepseek/deepseek-r1": 32768,
  "deepseek/deepseek-v3.2": 16384,
  "minimax/minimax-m2.7": 32768,
  "moonshotai/kimi-k2.5": 32768,
  "qwen/qwen3.5-plus-02-15": 32768,
  "meta-llama/llama-4-maverick": 16384,
  "meta-llama/llama-4-scout": 16384,
  "qwen/qwen2.5-vl-72b-instruct": 16384,
  "mistralai/mistral-large-2512": 32768,
  "google/gemini-3-flash-preview": 65536,
  "sonar": 16384,
  "sonar-pro": 16384,
  "sonar-reasoning-pro": 16384,
  "sonar-deep-research": 16384,
};

export function getMaxOutputTokens(modelId: string): number {
  return MODEL_MAX_OUTPUT[modelId] || 16384;
}

export const TIER_COST_ESTIMATES: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  fast: { inputPer1M: 0.10, outputPer1M: 0.40 },
  balanced: { inputPer1M: 0.40, outputPer1M: 1.60 },
  powerful: { inputPer1M: 3.00, outputPer1M: 12.00 },
  reasoning: { inputPer1M: 1.10, outputPer1M: 4.40 },
};

export async function getAvailableModels(): Promise<ModelInfo[]> {
  const keys = await storage.getProviderKeys();
  const enabledProviders = new Set(keys.filter((k) => k.enabled).map((k) => k.provider));
  enabledProviders.add("replit");
  for (const provider of Object.keys(INTEGRATION_ENV)) {
    if (hasIntegrationFallback(provider)) {
      enabledProviders.add(provider);
    }
  }
  return MODEL_REGISTRY.filter((m) => enabledProviders.has(m.provider));
}

export async function getAvailableModelsForTenant(tenantId: number, isAdmin: boolean): Promise<ModelInfo[]> {
  const keys = await storage.getProviderKeys();
  const userKeyProviders = new Set(keys.filter((k) => k.enabled).map((k) => k.provider));

  const enabledProviders = new Set<string>();

  if (isAdmin) {
    for (const p of userKeyProviders) enabledProviders.add(p);
    enabledProviders.add("replit");
    for (const provider of Object.keys(INTEGRATION_ENV)) {
      if (hasIntegrationFallback(provider)) {
        enabledProviders.add(provider);
      }
    }
  } else {
    enabledProviders.add("openrouter");
    for (const provider of userKeyProviders) {
      enabledProviders.add(provider);
    }
  }

  for (const provider of Object.keys(SUBSCRIPTION_BASE_URLS)) {
    try {
      const token = await getSubscriptionAccessToken(provider, tenantId);
      if (token) enabledProviders.add(provider);
    } catch {}
  }

  const models = MODEL_REGISTRY.filter((m) => enabledProviders.has(m.provider));
  if (!models.find(m => m.id === "auto")) {
    const auto = MODEL_REGISTRY.find(m => m.id === "auto");
    if (auto) models.unshift(auto);
  }
  return models;
}

let lastModelFreshnessCheck = 0;
const MODEL_FRESHNESS_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export const TEST_MODEL_IDS: Record<string, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-20250514",
  xai: "grok-3-mini",
  google: "gemini-2.5-flash",
  perplexity: "sonar",
  openrouter: "deepseek/deepseek-v3.2",
};

export function getTestModelForProvider(provider: string): string {
  return TEST_MODEL_IDS[provider] || "gemini-2.5-flash";
}

export async function checkModelFreshness(): Promise<{ stale: string[]; checked: number; lastChecked: string }> {
  const stale: string[] = [];
  const now = Date.now();
  lastModelFreshnessCheck = now;

  const providerEndpoints: Record<string, () => Promise<string[]>> = {
    openrouter: async () => {
      try {
        const resp = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { "HTTP-Referer": "https://visionclawagent.com" },
        });
        if (!resp.ok) return [];
        const data = await resp.json() as any;
        return (data.data || []).map((m: any) => m.id);
      } catch { return []; }
    },
  };

  for (const [provider, fetchFn] of Object.entries(providerEndpoints)) {
    try {
      const liveModels = await fetchFn();
      if (liveModels.length === 0) continue;

      const ourModels = MODEL_REGISTRY.filter(m => m.provider === provider);
      for (const ours of ourModels) {
        const modelSlug = ours.id;
        if (!liveModels.includes(modelSlug)) {
          stale.push(`${ours.label} (${ours.id}) — may be deprecated or renamed`);
        }
      }

      const testModel = TEST_MODEL_IDS[provider];
      if (testModel && !liveModels.includes(testModel)) {
        stale.push(`TEST MODEL: ${provider} test model "${testModel}" not found in live API — needs update`);
      }
    } catch {}
  }

  for (const [provider, testModel] of Object.entries(TEST_MODEL_IDS)) {
    if (provider === "replit") continue;
    const inRegistry = MODEL_REGISTRY.some(m => m.id === testModel);
    if (!inRegistry) {
      stale.push(`TEST MODEL: ${provider} test model "${testModel}" not in MODEL_REGISTRY — may be outdated`);
    }
  }

  console.log(`[model-freshness] Checked ${MODEL_REGISTRY.length} models, ${stale.length} potentially stale`);
  if (stale.length > 0) {
    for (const s of stale) {
      console.warn(`[model-freshness] ${s}`);
    }
  }
  return {
    stale,
    checked: MODEL_REGISTRY.length,
    lastChecked: new Date(now).toISOString(),
  };
}

export function isModelFreshnessCheckDue(): boolean {
  return (Date.now() - lastModelFreshnessCheck) > MODEL_FRESHNESS_INTERVAL_MS;
}
