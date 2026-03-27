import { getAllToolDefinitions } from "./tools";

interface ToolRef {
  name: string;
  what: string;
  params: string;
  example?: string;
}

const TOOL_CATEGORIES: Record<string, { label: string; tools: string[] }> = {
  system: {
    label: "SYSTEM & DIAGNOSTICS",
    tools: ["test_api_keys", "check_system_status", "list_models"],
  },
  memory: {
    label: "MEMORY & KNOWLEDGE",
    tools: ["search_memory", "create_memory", "update_memory", "recall_context", "search_knowledge", "create_knowledge"],
  },
  notes: {
    label: "DAILY NOTES & LOGS",
    tools: ["write_daily_note", "get_daily_notes", "list_conversations"],
  },
  web: {
    label: "WEB RESEARCH",
    tools: ["web_search", "web_fetch", "firecrawl_search", "firecrawl_scrape", "firecrawl_crawl", "firecrawl_map", "deep_research"],
  },
  scrapedData: {
    label: "SCRAPED DATA MANAGEMENT",
    tools: ["scraped_pages_query", "scraped_page_read", "scraped_pages_delete"],
  },
  files: {
    label: "FILES & GOOGLE DRIVE",
    tools: ["google_drive", "list_uploads"],
  },
  email: {
    label: "EMAIL",
    tools: ["send_email", "check_inbox"],
  },
  pdf: {
    label: "PDF OPERATIONS",
    tools: ["create_pdf", "analyze_pdf", "fill_pdf", "edit_pdf", "list_pdf_fields"],
  },
  media: {
    label: "MEDIA PRODUCTION",
    tools: ["produce_video", "generate_audio", "create_slideshow_video", "generate_social_image"],
  },
  social: {
    label: "SOCIAL MEDIA & MARKETING",
    tools: ["draft_social_post", "compose_social_post", "publish_social_post", "manage_social_accounts", "manage_content_calendar", "marketing_analytics", "marketing_experiment"],
  },
  delegation: {
    label: "DELEGATION & ORCHESTRATION",
    tools: ["delegate_task", "orchestrate", "estimate_cost"],
  },
  sessions: {
    label: "AGENT SESSIONS",
    tools: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "subagents"],
  },
  project: {
    label: "PROJECT MANAGEMENT",
    tools: ["project"],
  },
  data: {
    label: "DATA & VISUALIZATION",
    tools: ["generate_chart", "generate_dashboard", "execute_code"],
  },
  reasoning: {
    label: "REASONING & QUALITY",
    tools: ["critique_response", "debate", "tree_of_thought"],
  },
  desk: {
    label: "AGENT DESK & CHANNELS",
    tools: ["manage_desk", "post_to_channel", "read_channels", "emit_event"],
  },
  tracking: {
    label: "TRACKING & MONITORING",
    tools: ["track_outcome", "manage_watchlist"],
  },
  skills: {
    label: "SKILLS & SELF-IMPROVEMENT",
    tools: ["manage_skills", "create_tool", "list_custom_tools", "delete_custom_tool", "run_self_improvement", "log_experiment", "get_experiments"],
  },
  delivery: {
    label: "CLIENT DELIVERY",
    tools: ["deliver_product"],
  },
};

const TOOL_EXAMPLES: Record<string, string> = {
  delegate_task: `delegate_task({ targetAgent: "Neptune", taskName: "Generate narration audio", prompt: "Use generate_audio with the script text: [script]. Use provider 'elevenlabs', filename 'narration'. Save to Drive.", schedule: "once" })`,
  produce_video: `produce_video({ script: "Your narration text here...", pdf_path: "uploads/slides.pdf", title: "My Video", email_to: "user@example.com", project_id: 14 })`,
  generate_audio: `generate_audio({ text: "Your narration text here...", provider: "elevenlabs", filename: "narration", project_id: 14 })`,
  create_slideshow_video: `create_slideshow_video({ pdf_path: "uploads/slides.pdf", audio_path: "project-assets/narration.mp3", output_filename: "final_video", project_id: 14 })`,
  orchestrate: `orchestrate({ objective: "Research AI trends, write a blog post, and draft a LinkedIn announcement" })`,
  create_pdf: `create_pdf({ title: "Proposal", sections: [{ heading: "Overview", body: "..." }, { heading: "Pricing", body: "..." }], outputPath: "proposal.pdf" })`,
  project: `project({ action: "add_file", project_id: 14, file_name: "narration.mp3", file_url: "https://drive.google.com/...", file_type: "audio" })`,
  send_email: `send_email({ to: "client@example.com", subject: "Your deliverable", text: "Here is your file: [Drive link]" })`,
  generate_chart: `generate_chart({ type: "bar", title: "Revenue by Month", data: [{ month: "Jan", revenue: 5000 }, { month: "Feb", revenue: 7200 }], xKey: "month", yKey: "revenue" })`,
  compose_social_post: `compose_social_post({ platform: "linkedin", topic: "AI automation", style: "thought-leadership", image_style: "professional", campaign: "Q1 Launch" })`,
  search_memory: `search_memory({ query: "brand voice guidelines" })`,
  create_memory: `create_memory({ fact: "Client prefers formal tone in all communications", category: "preference" })`,
  web_search: `web_search({ query: "latest AI agent frameworks 2026" })`,
  analyze_pdf: `analyze_pdf({ pdf: "https://example.com/contract.pdf", prompt: "Summarize key terms and flag any risks" })`,
  deep_research: `deep_research({ query: "competitive landscape for AI agent platforms", depth: "comprehensive" })`,
  manage_desk: `manage_desk({ action: "update_task", taskId: "video-production", progressNote: "Audio generated, assembling video next" })`,
};

let cachedReference: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function buildToolsReference(): Promise<string> {
  if (cachedReference && Date.now() - cacheTime < CACHE_TTL) {
    return cachedReference;
  }

  const allTools = await getAllToolDefinitions();
  const toolMap = new Map<string, any>();
  for (const t of allTools) {
    toolMap.set(t.function.name, t.function);
  }

  const lines: string[] = [];
  lines.push("# TOOLS REFERENCE MANUAL");
  lines.push(`${allTools.length} tools available. Use them — don't describe what you could do.\n`);

  for (const [catKey, cat] of Object.entries(TOOL_CATEGORIES)) {
    const catTools = cat.tools.filter(name => toolMap.has(name));
    if (catTools.length === 0) continue;

    lines.push(`## ${cat.label}`);

    for (const name of catTools) {
      const def = toolMap.get(name)!;
      const props = def.parameters?.properties || {};
      const required = def.parameters?.required || [];
      const desc = (def.description || "").split(/[.\n]/)[0].trim().slice(0, 100);

      const paramParts: string[] = [];
      for (const [pName, pDef] of Object.entries(props) as [string, any][]) {
        const isReq = required.includes(pName);
        paramParts.push(`${pName}${isReq ? "*" : ""}`);
      }

      const paramStr = paramParts.length > 0 ? ` (${paramParts.join(", ")})` : "";
      const exampleStr = TOOL_EXAMPLES[name] ? `\n  Ex: \`${TOOL_EXAMPLES[name]}\`` : "";
      lines.push(`- **${name}**${paramStr} — ${desc}${exampleStr}`);
    }
    lines.push("");
  }

  lines.push("## KEY RULES");
  lines.push("- * = required parameter");
  lines.push("- All files MUST go to Google Drive via the tool's built-in upload. Never give users local file paths.");
  lines.push("- delegate_task with schedule='once' executes INLINE and returns the specialist's result immediately.");
  lines.push("- generate_audio supports providers: 'elevenlabs' (quality) or 'openai' (speed). Has automatic fallback.");
  lines.push("- create_slideshow_video accepts pdf_path (auto-converts PDF pages to images) OR slides array. Always pass pdf_path when you have a PDF deck.");
  lines.push("- project add_file registers deliverables. Always register files you produce.");
  lines.push("- Use compose_social_post (not draft_social_post) when you want text + image together.");

  cachedReference = lines.join("\n");
  cacheTime = Date.now();
  return cachedReference;
}

export async function getToolsReferenceForPersona(personaId: number): Promise<string> {
  const full = await buildToolsReference();

  const PERSONA_TOOL_FOCUS: Record<number, string> = {
    2: "Focus: delegate_task, orchestrate, project, estimate_cost. You dispatch work — you rarely use specialist tools directly.",
    3: "Focus: execute_code, web_search, web_fetch, project, google_drive, create_pdf. Build and ship.",
    4: "Focus: compose_social_post, manage_content_calendar, marketing_analytics, marketing_experiment, generate_social_image.",
    6: "Focus: test_api_keys, check_system_status, list_models, manage_desk, write_daily_note. Monitor and report.",
    7: "Focus: create_pdf, google_drive, project, search_memory, web_search, generate_audio. Write and deliver.",
    8: "Focus: search_memory, web_search, web_fetch, search_knowledge. Review and verify.",
    9: "Focus: web_search, web_fetch, deep_research, firecrawl_search, firecrawl_scrape, firecrawl_crawl, firecrawl_map, scraped_pages_query, scraped_page_read, create_pdf, generate_chart, search_knowledge. Research, scrape, and analyze.",
    10: "Focus: generate_audio, create_slideshow_video, deep_research, google_drive, project, generate_social_image. Produce media and research.",
    11: "Focus: send_email, compose_social_post, create_pdf, generate_chart, generate_social_image, project. Drive revenue.",
    12: "Focus: generate_chart, generate_dashboard, execute_code, web_search, create_pdf. Analyze and visualize.",
    13: "Focus: execute_code, generate_chart, web_search, create_pdf, project. Model and forecast.",
    14: "Focus: analyze_pdf, web_search, web_fetch, create_pdf, search_knowledge. Review and advise.",
  };

  const focus = PERSONA_TOOL_FOCUS[personaId];
  if (focus) {
    return full + "\n\n" + focus;
  }
  return full;
}
