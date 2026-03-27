type ToolDefinition = { type: "function"; function: { name: string; description: string; parameters: any } };

const PERSONA_TOOL_POLICIES: Record<string, { allowed: string[]; blocked: string[] }> = {
  "marketing": {
    allowed: ["memory", "knowledge", "notes", "web", "marketing", "media", "charts", "files", "ai"],
    blocked: ["exec", "shell_exec", "google_workspace", "whatsapp", "deliver_product"],
  },
  "sales": {
    allowed: ["memory", "knowledge", "notes", "web", "email", "marketing", "charts", "files", "delivery", "pdf", "workspace", "ai"],
    blocked: ["exec", "shell_exec"],
  },
  "developer": {
    allowed: ["memory", "knowledge", "notes", "web", "code", "system", "ai", "files", "tools", "experiments"],
    blocked: ["send_email", "whatsapp", "deliver_product", "draft_social_post"],
  },
  "finance": {
    allowed: ["memory", "knowledge", "notes", "workspace", "pdf", "charts", "email", "files", "ai", "web", "finance"],
    blocked: ["exec", "shell_exec", "draft_social_post", "marketing_experiment"],
  },
  "researcher": {
    allowed: ["memory", "knowledge", "notes", "web", "charts", "files", "ai", "diff"],
    blocked: ["exec", "shell_exec", "send_email", "whatsapp", "deliver_product", "draft_social_post"],
  },
  "content": {
    allowed: ["memory", "knowledge", "notes", "web", "marketing", "media", "files", "pdf", "charts", "ai"],
    blocked: ["exec", "shell_exec", "google_workspace", "whatsapp"],
  },
};

export function getPersonaBlockedTools(personaRole: string): Set<string> {
  const role = personaRole.toLowerCase();
  for (const [key, policy] of Object.entries(PERSONA_TOOL_POLICIES)) {
    if (role.includes(key)) {
      return new Set(policy.blocked);
    }
  }
  return new Set();
}

const TOOL_CATEGORIES: Record<string, string[]> = {
  memory: ["search_memory", "create_memory", "update_memory", "recall_context"],
  knowledge: ["search_knowledge", "create_knowledge", "doc_search"],
  notes: ["get_daily_notes", "write_daily_note"],
  conversations: ["list_conversations"],
  web: ["web_fetch", "web_search", "browser", "deep_research"],
  email: ["send_email", "check_inbox"],
  sessions: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "subagents"],
  pdf: ["analyze_pdf", "create_pdf", "fill_pdf", "edit_pdf", "list_pdf_fields"],
  files: ["list_uploads", "google_drive"],
  workspace: ["google_workspace"],
  whatsapp: ["whatsapp"],
  delivery: ["deliver_product", "delivery_status"],
  marketing: ["draft_social_post", "manage_content_calendar", "marketing_analytics", "marketing_experiment", "generate_social_image", "compose_social_post", "publish_social_post", "manage_social_accounts"],
  media: ["generate_audio", "create_slideshow_video", "youtube_upload", "youtube_search", "youtube_analytics"],
  code: ["exec", "execute_code", "project"],
  system: ["test_api_keys", "check_system_status", "list_models"],
  charts: ["generate_chart"],
  ai: ["delegate_task", "llm_task", "plan_and_execute", "lobster", "orchestrate"],
  tools: ["create_tool", "list_custom_tools", "delete_custom_tool", "manage_skills"],
  experiments: ["log_experiment", "get_experiments", "run_self_improvement"],
  diff: ["show_diff"],
  finance: ["finance_news", "finance_stock_price", "finance_stock_search", "finance_market_overview"],
};

const ALWAYS_INCLUDE = new Set(["search_memory", "create_memory", "recall_context", "orchestrate", "delegate_task", "project"]);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  memory: ["remember", "recall", "memory", "memories", "forget", "store", "save this", "what do you know about"],
  knowledge: ["knowledge", "document", "docs", "documentation", "search docs", "find in docs", "doc collection"],
  notes: ["note", "notes", "daily", "journal", "log", "diary", "today"],
  conversations: ["conversation", "conversations", "chat history", "previous chat"],
  web: ["search", "google", "browse", "website", "url", "http", "fetch", "look up", "find online", "research", "web"],
  email: ["email", "mail", "inbox", "send message", "compose", "outreach", "newsletter"],
  sessions: ["session", "agent", "spawn", "delegate", "multi-agent", "sub-agent"],
  pdf: ["pdf", "document", "form", "fill out", "template"],
  files: ["file", "upload", "download", "drive", "google drive", "backup", "storage"],
  workspace: ["calendar", "contacts", "sheets", "spreadsheet", "google docs", "gmail", "workspace", "schedule", "meeting", "appointment"],
  whatsapp: ["whatsapp", "wa", "text message", "messaging"],
  delivery: ["deliver", "delivery", "product", "send product", "digital product"],
  marketing: ["marketing", "social media", "tweet", "post", "content", "calendar", "campaign", "brand", "engagement", "twitter", "linkedin", "tiktok", "instagram", "image", "visual", "graphic", "publish", "compose", "create post", "generate image"],
  media: ["video", "audio", "narration", "voiceover", "tts", "text to speech", "voice over", "slideshow", "youtube", "ffmpeg", "mp4", "mp3", "record", "produce video", "create video", "make video", "assemble video", "generate audio", "thumbnail", "upload video"],
  code: ["code", "execute", "run", "script", "programming", "python", "javascript", "shell", "terminal", "command"],
  system: ["status", "health", "api key", "keys", "models", "providers", "system"],
  charts: ["chart", "graph", "plot", "visualize", "visualization", "data viz", "bar chart", "pie chart"],
  ai: ["delegate", "plan", "task", "workflow", "multi-step", "complex task", "lobster", "orchestrate", "corporation", "ceo", "coordinate", "multiple steps", "end to end"],
  tools: ["tool", "skill", "custom tool", "create tool", "manage skills"],
  experiments: ["experiment", "improve", "self-improve", "evolve", "optimize", "a/b test"],
  diff: ["diff", "compare", "difference", "changes"],
  finance: ["stock", "stock price", "ticker", "market", "A-share", "Hong Kong stock", "finance news", "market news", "financial news", "market overview", "indices", "trading", "OHLCV", "candlestick", "market data", "stock data", "stock search", "Moutai", "Tencent", "market pulse", "market briefing"],
};

function extractUserMessage(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") {
      if (typeof m.content === "string") return m.content.toLowerCase();
      if (Array.isArray(m.content)) {
        const textPart = m.content.find((p: any) => p.type === "text");
        if (textPart) return textPart.text.toLowerCase();
      }
    }
  }
  return "";
}

function scoreCategories(userMessage: string): Map<string, number> {
  const scores = new Map<string, number>();
  const msg = userMessage.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        score += kw.includes(" ") ? 3 : 2;
      }
    }
    if (score > 0) scores.set(category, score);
  }

  return scores;
}

let lastClassificationCache: { msg: string; categories: string[]; ts: number } | null = null;

function getOperationForceCategories(userMsg: string): string[] {
  try {
    if (lastClassificationCache && lastClassificationCache.msg === userMsg && Date.now() - lastClassificationCache.ts < 5000) {
      return lastClassificationCache.categories;
    }

    const { classifyRequest } = require("./scaffolding");
    const result = classifyRequest(userMsg);
    if (!result.operation || result.confidence < 0.2) {
      lastClassificationCache = { msg: userMsg, categories: [], ts: Date.now() };
      return [];
    }

    const toolChain = result.operation.toolChain;
    const forced = new Set<string>();
    for (const toolName of toolChain) {
      for (const [cat, tools] of Object.entries(TOOL_CATEGORIES)) {
        if (tools.includes(toolName)) {
          forced.add(cat);
        }
      }
    }
    const categories = [...forced];
    lastClassificationCache = { msg: userMsg, categories, ts: Date.now() };
    if (categories.length > 0) {
      console.log(`[tool-router-scaffold] Operation ${result.operation.operationId} → force categories: ${categories.join(",")}`);
    }
    return categories;
  } catch {
    return [];
  }
}

export function routeTools(
  allTools: ToolDefinition[],
  messages: any[],
  opts?: { maxTools?: number; forceCategories?: string[] }
): { tools: ToolDefinition[]; matchedCategories: string[]; totalAvailable: number } {
  const maxTools = opts?.maxTools ?? 25;
  const userMsg = extractUserMessage(messages);
  const totalAvailable = allTools.length;

  if (!userMsg || userMsg.length < 3) {
    return { tools: allTools, matchedCategories: ["all"], totalAvailable };
  }

  const categoryScores = scoreCategories(userMsg);

  if (opts?.forceCategories) {
    for (const fc of opts.forceCategories) {
      categoryScores.set(fc, 100);
    }
  }

  const opForce = getOperationForceCategories(userMsg);
  for (const fc of opForce) {
    if (!categoryScores.has(fc)) {
      categoryScores.set(fc, 50);
    }
  }

  if (categoryScores.size === 0) {
    return { tools: allTools, matchedCategories: ["all"], totalAvailable };
  }

  const sortedCategories = [...categoryScores.entries()]
    .sort((a, b) => b[1] - a[1]);

  const selectedToolNames = new Set<string>(ALWAYS_INCLUDE);
  const matchedCategories: string[] = [];

  for (const [category] of sortedCategories) {
    const categoryTools = TOOL_CATEGORIES[category] || [];
    matchedCategories.push(category);
    for (const toolName of categoryTools) {
      selectedToolNames.add(toolName);
    }

    if (selectedToolNames.size >= maxTools) break;
  }

  if (selectedToolNames.size < 8) {
    const relatedMap: Record<string, string[]> = {
      memory: ["knowledge", "notes"],
      knowledge: ["memory"],
      email: ["workspace"],
      marketing: ["web", "charts"],
      web: ["code"],
      pdf: ["files"],
      workspace: ["email", "files"],
      sessions: ["ai"],
      ai: ["sessions", "code"],
      code: ["ai"],
    };
    for (const cat of matchedCategories) {
      const related = relatedMap[cat] || [];
      for (const rc of related) {
        const rcTools = TOOL_CATEGORIES[rc] || [];
        for (const t of rcTools) selectedToolNames.add(t);
      }
    }
  }

  const filtered = allTools.filter(t => selectedToolNames.has(t.function.name));

  if (filtered.length < 5) {
    return { tools: allTools, matchedCategories: ["all"], totalAvailable };
  }

  console.log(`[tool-router] "${userMsg.slice(0, 60)}..." → ${matchedCategories.join(",")} (${filtered.length}/${totalAvailable} tools)`);

  return { tools: filtered, matchedCategories, totalAvailable };
}
