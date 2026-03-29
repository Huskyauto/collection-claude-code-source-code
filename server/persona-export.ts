import { db } from "./db";
import { sql } from "drizzle-orm";

export interface ExportedPersona {
  format: "visionclaw-agent-v1";
  exportedAt: string;
  agent: {
    name: string;
    role: string;
    model: string;
    temperature: number;
    autonomyLevel: string;
    identity: {
      soul: string;
      operatingLoop: string;
      toolPreferences: string;
      heartbeatInstructions: string;
    };
    trustProfile: {
      categories: Record<string, number>;
      overallLevel: string;
    };
    skills: Array<{ name: string; description: string; enabled: boolean }>;
    tools: string[];
    governanceRules: Array<{ name: string; category: string; severity: string; description: string }>;
    expressLanes: Array<{ from: string; to: string }>;
    knowledgeTopics: string[];
  };
}

export async function exportPersona(personaId: number, tenantId: number): Promise<ExportedPersona | null> {
  const personaResult = await db.execute(sql`SELECT * FROM personas WHERE id = ${personaId}`);
  const persona = ((personaResult as any).rows || personaResult)[0];
  if (!persona) return null;

  const [trustResult, skillsResult, rulesResult, knowledgeResult] = await Promise.all([
    db.execute(sql`SELECT category, score FROM trust_scores WHERE persona_id = ${personaId} AND tenant_id = ${tenantId}`),
    db.execute(sql`SELECT name, description, enabled FROM skills WHERE persona_id = ${personaId} OR persona_id IS NULL ORDER BY enabled DESC, name`),
    db.execute(sql`SELECT name, category, severity, description FROM governance_rules WHERE is_active = true ORDER BY category, id`),
    db.execute(sql`SELECT DISTINCT category FROM agent_knowledge WHERE persona_id = ${personaId} AND tenant_id = ${tenantId}`),
  ]);

  const trustRows = (trustResult as any).rows || trustResult;
  const trustCategories: Record<string, number> = {};
  for (const row of trustRows) trustCategories[row.category] = Number(row.score);

  const avgTrust = trustRows.length > 0
    ? Math.round(trustRows.reduce((s: number, r: any) => s + Number(r.score), 0) / trustRows.length)
    : 50;

  const autonomyLevel = avgTrust >= 80 ? "trusted" : avgTrust >= 60 ? "autonomous" : avgTrust >= 40 ? "assisted" : avgTrust >= 20 ? "supervised" : "restricted";

  const skillRows = (skillsResult as any).rows || skillsResult;
  const ruleRows = (rulesResult as any).rows || rulesResult;
  const knowledgeRows = (knowledgeResult as any).rows || knowledgeResult;

  const blockedToolsResult = await db.execute(sql`
    SELECT tool_name FROM persona_tool_blocks WHERE persona_id = ${personaId}
  `).catch(() => ({ rows: [] }));
  const blockedTools = new Set(((blockedToolsResult as any).rows || []).map((r: any) => r.tool_name));

  const allToolsResult = await db.execute(sql`
    SELECT DISTINCT unnest(mapped_tools) as tool FROM persona_tool_mappings WHERE persona_id = ${personaId}
  `).catch(() => ({ rows: [] }));
  const mappedTools = ((allToolsResult as any).rows || []).map((r: any) => r.tool).filter((t: string) => !blockedTools.has(t));

  const lanes: Array<{ from: string; to: string }> = [];
  try {
    const { EXPRESS_LANES } = await import("./express-lanes");
    for (const lane of EXPRESS_LANES) {
      if (lane.fromPersonaId === personaId) {
        const toResult = await db.execute(sql`SELECT name FROM personas WHERE id = ${lane.toPersonaId}`);
        const toName = ((toResult as any).rows || toResult)[0]?.name || `Persona #${lane.toPersonaId}`;
        lanes.push({ from: persona.name, to: toName });
      }
    }
  } catch {}

  return {
    format: "visionclaw-agent-v1",
    exportedAt: new Date().toISOString(),
    agent: {
      name: persona.name || "Unknown",
      role: persona.role || "",
      model: persona.model || "auto",
      temperature: persona.temperature ?? 0.7,
      autonomyLevel,
      identity: {
        soul: persona.soul || "",
        operatingLoop: persona.operating_loop || "",
        toolPreferences: persona.tool_preferences || "",
        heartbeatInstructions: persona.heartbeat_instructions || "",
      },
      trustProfile: {
        categories: trustCategories,
        overallLevel: autonomyLevel,
      },
      skills: skillRows.map((s: any) => ({
        name: s.name,
        description: s.description || "",
        enabled: s.enabled,
      })),
      tools: mappedTools.length > 0 ? mappedTools : ["All tools (default routing)"],
      governanceRules: ruleRows.map((r: any) => ({
        name: r.name,
        category: r.category,
        severity: r.severity,
        description: r.description || "",
      })),
      expressLanes: lanes,
      knowledgeTopics: knowledgeRows.map((r: any) => r.category).filter(Boolean),
    },
  };
}

export function exportToMarkdown(exported: ExportedPersona): string {
  const a = exported.agent;
  let md = `# Agent Definition: ${a.name}\n\n`;
  md += `> Exported from VisionClaw Agent Platform on ${exported.exportedAt}\n\n`;
  md += `## Identity\n\n`;
  md += `- **Name:** ${a.name}\n`;
  md += `- **Role:** ${a.role}\n`;
  md += `- **Model:** ${a.model}\n`;
  md += `- **Temperature:** ${a.temperature}\n`;
  md += `- **Autonomy Level:** ${a.autonomyLevel}\n\n`;

  if (a.identity.soul) {
    md += `## SOUL\n\n${a.identity.soul}\n\n`;
  }
  if (a.identity.operatingLoop) {
    md += `## Operating Loop\n\n${a.identity.operatingLoop}\n\n`;
  }

  md += `## Trust Profile\n\n`;
  md += `| Category | Score |\n|---|---|\n`;
  for (const [cat, score] of Object.entries(a.trustProfile.categories)) {
    md += `| ${cat} | ${score} |\n`;
  }
  md += `\n**Overall Level:** ${a.trustProfile.overallLevel}\n\n`;

  md += `## Skills (${a.skills.filter(s => s.enabled).length} active)\n\n`;
  for (const skill of a.skills.filter(s => s.enabled)) {
    md += `- **${skill.name}**: ${skill.description}\n`;
  }

  md += `\n## Tools\n\n`;
  for (const tool of a.tools) {
    md += `- ${tool}\n`;
  }

  if (a.expressLanes.length > 0) {
    md += `\n## Express Lanes\n\n`;
    for (const lane of a.expressLanes) {
      md += `- ${lane.from} → ${lane.to}\n`;
    }
  }

  md += `\n## Governance Rules (${a.governanceRules.length})\n\n`;
  const byCategory: Record<string, typeof a.governanceRules> = {};
  for (const rule of a.governanceRules) {
    if (!byCategory[rule.category]) byCategory[rule.category] = [];
    byCategory[rule.category].push(rule);
  }
  for (const [cat, rules] of Object.entries(byCategory)) {
    md += `### ${cat}\n`;
    for (const rule of rules) {
      md += `- **${rule.name}** (${rule.severity}): ${rule.description}\n`;
    }
    md += `\n`;
  }

  if (a.knowledgeTopics.length > 0) {
    md += `## Knowledge Domains\n\n`;
    for (const topic of a.knowledgeTopics) {
      md += `- ${topic}\n`;
    }
  }

  md += `\n---\n*Format: ${exported.format} | AI Buddy LLC*\n`;
  return md;
}
