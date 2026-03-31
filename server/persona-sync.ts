import { db } from "./db";
import { sql } from "drizzle-orm";
import { getAllToolDefinitions } from "./tools";

interface PersonaRow {
  id: number;
  name: string;
  tools_doc: string;
  agents_doc: string;
}

interface ToolDef {
  type: string;
  function: { name: string; description: string };
}

interface SkillRow {
  id: number;
  name: string;
  category: string;
  enabled: boolean;
  persona_id: number | null;
}

interface CustomToolRow {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

const PERSONA_TOOL_FOCUS: Record<number, string[]> = {
  1: ["memory", "knowledge", "web", "files", "email", "code", "pdf", "project", "browser"],
  2: ["project", "delegate_task", "orchestrate", "memory", "plan_and_execute", "send_email"],
  3: ["execute_code", "exec", "project", "web", "browser", "memory", "check_system_status", "test_api_keys", "create_pdf"],
  4: ["draft_social_post", "compose_social_post", "publish_social_post", "manage_content_calendar", "marketing_analytics", "marketing_experiment", "generate_social_image", "web_search", "google_drive", "project", "memory"],
  5: ["manage_skills", "create_tool", "list_custom_tools", "delete_custom_tool", "run_self_improvement", "log_experiment", "get_experiments", "check_system_status", "execute_code", "memory", "knowledge"],
  6: ["check_system_status", "test_api_keys", "list_models", "memory", "google_drive", "list_uploads", "project", "send_email", "check_inbox", "web_fetch", "write_daily_note", "get_daily_notes"],
  7: ["web_search", "web_fetch", "memory", "knowledge", "google_drive", "create_pdf", "project", "draft_social_post"],
  8: ["web_search", "memory", "knowledge", "create_pdf", "project"],
  9: ["web_search", "web_fetch", "browser", "deep_research", "memory", "knowledge", "google_drive", "generate_chart", "project", "create_pdf", "analyze_pdf"],
  10: ["deep_research", "web_search", "web_fetch", "browser", "generate_audio", "create_slideshow_video", "generate_social_image", "google_drive", "memory", "knowledge", "create_pdf", "analyze_pdf"],
  11: ["send_email", "check_inbox", "draft_social_post", "compose_social_post", "publish_social_post", "web_search", "web_fetch", "browser", "generate_social_image", "memory", "google_drive", "create_pdf", "generate_chart"],
  12: ["generate_chart", "execute_code", "web_search", "web_fetch", "memory", "knowledge", "google_drive", "create_pdf", "project"],
  13: ["execute_code", "generate_chart", "web_search", "web_fetch", "memory", "google_drive", "create_pdf", "project"],
  14: ["analyze_pdf", "web_search", "web_fetch", "memory", "knowledge", "google_drive", "create_pdf", "project"],
};

const PERSONA_DELEGATION_MAP: Record<number, Record<string, string>> = {
  1: { "Writing/content": "Scribe (7)", "Engineering/code": "Forge (3)", "Research": "Radar (9) or Neptune (10)", "System health": "Chief of Staff (6)", "Marketing": "Teagan (4)", "Revenue/sales": "Apollo (11)", "Data/analytics": "Atlas (12)", "Finance": "Cassandra (13)", "Legal": "Luna (14)" },
  2: { "System health, infrastructure, scheduling": "Chief of Staff (6)", "ALL writing — scripts, blog posts, copy, emails": "Scribe (7)", "Quality review, proofreading, fact-checking": "Proof (8)", "Research, market intelligence": "Radar (9)", "Deep research, academic analysis, multimedia": "Neptune (10)", "Sales, pipeline, revenue, outreach": "Apollo (11)", "Data, metrics, dashboards, reporting": "Atlas (12)", "Finance, budget, forecast": "Cassandra (13)", "Legal, contracts, compliance": "Luna (14)", "Content strategy, social media": "Teagan (4)", "Engineering, code, infrastructure": "Forge (3)" },
  3: { "Writing docs/copy": "Scribe (7)", "Research": "Radar (9)", "Design/visuals": "Apollo (11)" },
  4: { "Long-form content": "Scribe (7)", "Brand/design assets": "Apollo (11)", "Competitive research": "Radar (9)", "Review before publishing": "Proof (8)" },
  5: { "Technical implementation": "Forge (3)" },
  6: { "Content creation": "Scribe (7)", "Engineering": "Forge (3)", "Research": "Radar (9)", "Sales/revenue": "Apollo (11)" },
  7: { "Review/proofread": "Proof (8)", "Research inputs": "Radar (9)", "Visual assets": "Apollo (11)" },
  8: { "Content revision": "Scribe (7)", "Fact-checking research": "Radar (9)" },
  9: { "Strategic decisions": "Felix (2)", "Content strategy": "Teagan (4)", "Competitive positioning": "Apollo (11)", "Financial planning": "Cassandra (13)", "Deep multi-round research": "Neptune (10)" },
  10: { "Scripts for narration": "Scribe (7)", "Design/branding assets": "Apollo (11)", "Research inputs": "Radar (9)", "Executive review": "Felix (2)" },
  11: { "Proposal copy": "Scribe (7)", "Pricing strategy": "Cassandra (13)", "Proposal review": "Proof (8)", "Technical demos": "Forge (3)" },
  12: { "Strategic decisions": "Felix (2)", "Financial analysis": "Cassandra (13)", "Marketing performance": "Teagan (4)", "Sales metrics": "Apollo (11)" },
  13: { "Data and metrics": "Atlas (12)", "Revenue/pipeline data": "Apollo (11)", "Strategic financial decisions": "Felix (2)" },
  14: { "Strategic compliance": "Felix (2)", "Financial compliance": "Cassandra (13)", "Contract review": "Apollo (11)" },
};

function categorizeTools(tools: ToolDef[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  for (const t of tools) {
    const name = t.function.name;
    let cat = "General";
    if (name.match(/memory|recall_context/)) cat = "Memory";
    else if (name.match(/knowledge/)) cat = "Knowledge";
    else if (name.match(/web_search|web_fetch|firecrawl/)) cat = "Web & Research";
    else if (name.match(/browser/)) cat = "Browser";
    else if (name.match(/deep_research/)) cat = "Deep Research";
    else if (name.match(/email|inbox/)) cat = "Communication";
    else if (name.match(/google_drive|list_uploads|deliver|delivery/)) cat = "Files & Storage";
    else if (name.match(/pdf/)) cat = "PDF";
    else if (name.match(/execute_code|exec|show_diff/)) cat = "Code & Execution";
    else if (name.match(/social|marketing|content_calendar/)) cat = "Marketing";
    else if (name.match(/chart/)) cat = "Visualization";
    else if (name.match(/project/)) cat = "Project Management";
    else if (name.match(/delegate|orchestrate|plan_and_execute|sessions|subagent/)) cat = "Orchestration";
    else if (name.match(/check_system|test_api|list_models/)) cat = "System";
    else if (name.match(/skill/)) cat = "Skills";
    else if (name.match(/custom_tool|create_tool|delete_custom_tool|list_custom_tools/)) cat = "Tool Learning";
    else if (name.match(/self_improvement|experiment/)) cat = "Self-Improvement";
    else if (name.match(/daily_note/)) cat = "Daily Notes";
    else if (name.match(/audio|video|slideshow|image/)) cat = "Media";
    else if (name.match(/lobster/)) cat = "Workflows";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(name);
  }
  return categories;
}

function buildToolsDoc(personaId: number, personaName: string, allTools: ToolDef[], customTools: CustomToolRow[], enabledSkills: SkillRow[]): string {
  const focusKeywords = PERSONA_TOOL_FOCUS[personaId] || PERSONA_TOOL_FOCUS[1];
  const toolMap = new Map(allTools.map(t => [t.function.name, t.function.description]));
  const categories = categorizeTools(allTools);

  const primaryTools: string[] = [];
  const secondaryTools: string[] = [];

  for (const t of allTools) {
    const name = t.function.name;
    const isPrimary = focusKeywords.some(kw => name.includes(kw));
    if (isPrimary) primaryTools.push(name);
    else secondaryTools.push(name);
  }

  let doc = `PRIMARY TOOLS:\n`;
  const grouped: Record<string, string[]> = {};
  for (const name of primaryTools) {
    for (const [cat, names] of Object.entries(categories)) {
      if (names.includes(name)) {
        if (!grouped[cat]) grouped[cat] = [];
        if (!grouped[cat].includes(name)) grouped[cat].push(name);
      }
    }
  }
  for (const [cat, names] of Object.entries(grouped)) {
    doc += `- ${cat}: ${names.join(", ")}\n`;
  }

  if (customTools.length > 0) {
    doc += `\nCUSTOM TOOLS (${customTools.length}):\n`;
    for (const ct of customTools) {
      doc += `- ${ct.name}: ${ct.description.substring(0, 80)}\n`;
    }
  }

  if (enabledSkills.length > 0) {
    const personaSkills = enabledSkills.filter(s => s.persona_id === personaId || s.persona_id === null);
    if (personaSkills.length > 0) {
      doc += `\nACTIVE SKILLS (${personaSkills.length}):\n`;
      for (const s of personaSkills) {
        doc += `- ${s.name}${s.persona_id ? " (yours)" : ""}\n`;
      }
    }
  }

  doc += `\nALL AVAILABLE TOOLS (${allTools.length} total):\n`;
  for (const [cat, names] of Object.entries(categories)) {
    doc += `- ${cat}: ${names.join(", ")}\n`;
  }

  doc += `\nUse tools proactively — don't just describe what you could do. Always prefer action over explanation.`;

  return doc;
}

function buildAgentsDoc(personaId: number, personas: PersonaRow[]): string {
  const delegationMap = PERSONA_DELEGATION_MAP[personaId] || PERSONA_DELEGATION_MAP[1];
  const personaNames = new Map(personas.map(p => [p.id, p.name]));

  let doc = "";

  if (personaId === 2) {
    doc += "YOUR TEAM — DELEGATE AND GET RESULTS:\n";
  } else {
    doc += "When tasks fall outside your domain, delegate or suggest:\n";
  }

  for (const [task, target] of Object.entries(delegationMap)) {
    doc += `- ${task} → ${target}\n`;
  }

  const mentioned = new Set(Object.values(delegationMap).map(v => v.match(/\((\d+)\)/)?.[1]).filter(Boolean));
  const unmentioned = personas.filter(p => p.id !== personaId && !mentioned.has(String(p.id)));
  if (unmentioned.length > 0) {
    doc += `\nOther specialists: ${unmentioned.map(p => `${p.name} (${p.id})`).join(", ")}`;
  }

  return doc;
}

export interface SyncResult {
  synced: number;
  personas: string[];
  toolCount: number;
  customToolCount: number;
  skillCount: number;
  timestamp: string;
}

export async function syncPersonaDocs(targetPersonaId?: number): Promise<SyncResult> {
  console.log(`[persona-sync] Starting sync${targetPersonaId ? ` for persona ${targetPersonaId}` : " for all personas"}...`);

  const allTools = await getAllToolDefinitions() as ToolDef[];

  const customToolsResult = await db.execute(sql`SELECT id, name, description, is_active FROM custom_tools WHERE is_active = true`);
  const customTools = customToolsResult.rows as unknown as CustomToolRow[];

  const skillsResult = await db.execute(sql`SELECT id, name, category, enabled, persona_id FROM skills WHERE enabled = true`);
  const enabledSkills = skillsResult.rows as unknown as SkillRow[];

  const personasQuery = targetPersonaId
    ? sql`SELECT id, name, tools_doc, agents_doc FROM personas WHERE id = ${targetPersonaId}`
    : sql`SELECT id, name, tools_doc, agents_doc FROM personas WHERE id <= 14 ORDER BY id`;
  const personasResult = await db.execute(personasQuery);
  const personas = personasResult.rows as unknown as PersonaRow[];

  const allPersonasResult = await db.execute(sql`SELECT id, name, tools_doc, agents_doc FROM personas WHERE id <= 14 ORDER BY id`);
  const allPersonas = allPersonasResult.rows as unknown as PersonaRow[];

  const synced: string[] = [];

  for (const persona of personas) {
    const newToolsDoc = buildToolsDoc(persona.id, persona.name, allTools, customTools, enabledSkills);
    const newAgentsDoc = buildAgentsDoc(persona.id, allPersonas);

    await db.execute(sql`
      UPDATE personas SET tools_doc = ${newToolsDoc}, agents_doc = ${newAgentsDoc} WHERE id = ${persona.id}
    `);

    synced.push(persona.name);
    console.log(`[persona-sync] Updated ${persona.name} (${persona.id}): tools_doc=${newToolsDoc.length} chars, agents_doc=${newAgentsDoc.length} chars`);
  }

  const result: SyncResult = {
    synced: synced.length,
    personas: synced,
    toolCount: allTools.length,
    customToolCount: customTools.length,
    skillCount: enabledSkills.length,
    timestamp: new Date().toISOString(),
  };

  console.log(`[persona-sync] Complete: ${synced.length} personas synced, ${allTools.length} tools, ${customTools.length} custom, ${enabledSkills.length} skills`);
  return result;
}

export async function getSyncStatus(): Promise<{
  toolCount: number;
  customToolCount: number;
  skillCount: number;
  personas: { id: number; name: string; toolsDocLength: number; agentsDocLength: number }[];
}> {
  const allTools = await getAllToolDefinitions() as ToolDef[];
  const customResult = await db.execute(sql`SELECT count(*) as cnt FROM custom_tools WHERE is_active = true`);
  const skillResult = await db.execute(sql`SELECT count(*) as cnt FROM skills WHERE enabled = true`);
  const personasResult = await db.execute(sql`SELECT id, name, length(tools_doc) as tdl, length(agents_doc) as adl FROM personas WHERE id <= 14 ORDER BY id`);

  return {
    toolCount: allTools.length,
    customToolCount: Number((customResult.rows[0] as any).cnt),
    skillCount: Number((skillResult.rows[0] as any).cnt),
    personas: (personasResult.rows as any[]).map(p => ({
      id: p.id,
      name: p.name,
      toolsDocLength: Number(p.tdl),
      agentsDocLength: Number(p.adl),
    })),
  };
}
