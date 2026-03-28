import { db } from "./db";
import { sql } from "drizzle-orm";
import { executeWithFailover } from "./model-failover";
import { getAvailableModels } from "./providers";
import { storage } from "./storage";

const NIGHTLY_PROGRAM_NAMES = new Set([
  "Nightly AI Model & Provider Intelligence",
  "Nightly AI Tools & Techniques Scanner",
  "Nightly Competitive Platform Analysis",
  "Nightly Agent Architecture Research",
  "Nightly Security & Safety Intelligence",
]);

const RESEARCH_COST_MODELS = [
  "z-ai/glm-5-turbo",
  "gemini-2.5-flash",
  "gpt-4.1-mini",
  "gemini-3-flash-preview",
];

const EXPERIMENT_INTERVAL_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 5;
const SESSION_STAGGER_MS = 15_000;

interface ActiveSession {
  sessionId: number;
  programId: number;
  tenantId: number;
  model: string;
  maxExperiments: number;
  experimentCount: number;
  keptCount: number;
  discardedCount: number;
  crashedCount: number;
  consecutiveFailures: number;
  objective: string;
  constraints: string;
  metrics: string;
  explorationStrategy: string;
  personaName: string | null;
  previousResults: Array<{ hypothesis: string; status: string; metric_value: string | null; result: string | null }>;
  timer: ReturnType<typeof setInterval> | null;
  experimentInFlight: boolean;
}

const activeSessions = new Map<number, ActiveSession>();

export function getActiveSessions(): Map<number, ActiveSession> {
  return activeSessions;
}

export async function startResearchSession(params: {
  programId: number;
  tenantId: number;
}): Promise<{ sessionId: number; error?: string }> {
  const { programId, tenantId } = params;

  const progResult = await db.execute(sql`SELECT * FROM research_programs WHERE id = ${programId} AND tenant_id = ${tenantId}`);
  const programs = (progResult as any).rows || progResult;
  const program = Array.isArray(programs) ? programs[0] : programs;
  if (!program) return { sessionId: 0, error: "Research program not found" };

  let personaName: string | null = null;
  if (program.persona_id) {
    const pResult = await db.execute(sql`SELECT name FROM personas WHERE id = ${program.persona_id}`);
    const pRows = (pResult as any).rows || pResult;
    personaName = pRows[0]?.name || null;
  }

  const sessResult = await db.execute(sql`
    INSERT INTO research_sessions (tenant_id, program_id, status, model)
    VALUES (${tenantId}, ${programId}, 'running', ${program.model || RESEARCH_COST_MODELS[0]})
    RETURNING id
  `);
  const sessRows = (sessResult as any).rows || sessResult;
  const sessionId = sessRows[0]?.id;

  const session: ActiveSession = {
    sessionId,
    programId,
    tenantId,
    model: program.model || RESEARCH_COST_MODELS[0],
    maxExperiments: program.max_experiments_per_session || 20,
    experimentCount: 0,
    keptCount: 0,
    discardedCount: 0,
    crashedCount: 0,
    consecutiveFailures: 0,
    objective: program.objective,
    constraints: program.constraints || "",
    metrics: program.metrics || "",
    explorationStrategy: program.exploration_strategy || "balanced",
    personaName,
    previousResults: [],
    timer: null,
    experimentInFlight: false,
  };

  activeSessions.set(sessionId, session);

  db.execute(sql`DELETE FROM agent_knowledge WHERE source = 'autoresearch' AND expires_at < NOW()`).catch(() => {});

  const staggerDelay = (activeSessions.size - 1) * SESSION_STAGGER_MS;
  console.log(`[research] Session #${sessionId} started for program "${program.name}" (model: ${session.model})${staggerDelay > 0 ? `, stagger delay: ${staggerDelay / 1000}s` : ""}`);

  setTimeout(() => {
    if (!activeSessions.has(sessionId)) return;
    runExperiment(session).catch(err => {
      console.error(`[research] First experiment failed:`, err.message);
    });

    session.timer = setInterval(() => {
      if (session.experimentCount >= session.maxExperiments) {
        endSession(sessionId, "completed").catch(console.error);
        return;
      }
      if (session.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        endSession(sessionId, "stopped_failures").catch(console.error);
        return;
      }
      runExperiment(session).catch(err => {
        console.error(`[research] Experiment error:`, err.message);
      });
    }, EXPERIMENT_INTERVAL_MS);
  }, staggerDelay);

  return { sessionId };
}

export async function stopResearchSession(sessionId: number): Promise<void> {
  await endSession(sessionId, "stopped_manually");
}

async function endSession(sessionId: number, reason: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  if (session.timer) clearInterval(session.timer);
  activeSessions.delete(sessionId);

  let summary = "";
  try {
    const availableModels = await getAvailableModels();
    const { result: resp } = await executeWithFailover(
      session.model, availableModels,
      async (client: any, modelId: string) => {
        return client.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: "You are a research analyst. Summarize the overnight research session results concisely in markdown. Focus on key findings, actionable insights, and what was kept vs discarded." },
            { role: "user", content: `Research session completed. Objective: ${session.objective}\n\nResults (${session.experimentCount} experiments, ${session.keptCount} kept, ${session.discardedCount} discarded, ${session.crashedCount} crashed):\n\n${session.previousResults.map((r, i) => `${i + 1}. [${r.status.toUpperCase()}] ${r.hypothesis}${r.metric_value ? ` (score: ${r.metric_value})` : ""}${r.result ? `\n   Finding: ${r.result.substring(0, 200)}` : ""}`).join("\n")}\n\nGenerate a concise executive summary of findings, patterns, and recommended next steps.` },
          ],
          max_completion_tokens: 1500,
        });
      },
      session.tenantId
    );
    summary = resp.choices[0]?.message?.content || "";
  } catch (err: any) {
    summary = `Session ended (${reason}). ${session.keptCount} kept, ${session.discardedCount} discarded, ${session.crashedCount} crashed.`;
  }

  await db.execute(sql`
    UPDATE research_sessions SET
      status = ${reason},
      ended_at = NOW(),
      total_experiments = ${session.experimentCount},
      experiments_kept = ${session.keptCount},
      experiments_discarded = ${session.discardedCount},
      experiments_crashed = ${session.crashedCount},
      summary = ${summary}
    WHERE id = ${sessionId}
  `);

  console.log(`[research] Session #${sessionId} ended: ${reason} (${session.experimentCount} experiments, ${session.keptCount} kept)`);
}

async function runExperiment(session: ActiveSession): Promise<void> {
  if (session.experimentCount >= session.maxExperiments) return;
  if (session.experimentInFlight) return;
  session.experimentInFlight = true;

  const start = Date.now();
  session.experimentCount++;

  const strategyInstruction = {
    conservative: "Make small, incremental changes. Test one variable at a time. Prefer well-established approaches.",
    balanced: "Mix incremental improvements with occasional bold ideas. If 3+ experiments show a pattern, try combining insights.",
    aggressive: "Be bold and creative. Try unconventional approaches. Combine multiple changes at once. Think outside the box.",
  }[session.explorationStrategy] || "Mix incremental improvements with occasional bold ideas.";

  const previousContext = session.previousResults.length > 0
    ? `\n\nPrevious experiments in this session:\n${session.previousResults.map((r, i) => `${i + 1}. [${r.status}] ${r.hypothesis}${r.metric_value ? ` → score: ${r.metric_value}` : ""}${r.result ? ` → ${r.result.substring(0, 150)}` : ""}`).join("\n")}`
    : "\n\nThis is the first experiment in this session. Start with a strong foundational approach.";

  const prompt = `You are an autonomous research agent conducting experiment #${session.experimentCount} of ${session.maxExperiments}.

RESEARCH OBJECTIVE: ${session.objective}

CONSTRAINTS: ${session.constraints || "None specified"}

EVALUATION METRICS: ${session.metrics || "Quality and relevance of findings"}

STRATEGY: ${strategyInstruction}
${session.personaName ? `\nYou are operating as ${session.personaName}.` : ""}
${previousContext}

INSTRUCTIONS:
1. Generate a clear HYPOTHESIS for this experiment
2. Execute the research/analysis
3. Evaluate your own result against the metrics
4. Self-score your result on a scale of 1-10

Respond in this exact format:
HYPOTHESIS: [Your hypothesis for this experiment]
APPROACH: [Brief description of your approach]
RESULT: [Your actual findings/output]
METRIC: [Which metric you're evaluating]
SCORE: [1-10 self-assessment score]
VERDICT: [KEEP if score >= 6, DISCARD if score < 6]
INSIGHT: [One key insight that could inform the next experiment]`;

  let hypothesis = `Experiment #${session.experimentCount}`;
  let approach = "";
  let result = "";
  let metric = "";
  let metricValue = "";
  let status = "crash";

  const expResult = await db.execute(sql`
    INSERT INTO research_experiments (session_id, tenant_id, program_id, hypothesis, status, model)
    VALUES (${session.sessionId}, ${session.tenantId}, ${session.programId}, ${hypothesis}, 'running', ${session.model})
    RETURNING id
  `);
  const expRows = (expResult as any).rows || expResult;
  const experimentId = expRows[0]?.id;

  try {
    const availableModels = await getAvailableModels();
    const { result: resp, usedModel } = await executeWithFailover(
      session.model, availableModels,
      async (client: any, modelId: string) => {
        return client.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: "You are a meticulous autonomous research agent. Follow the output format exactly. Be thorough but concise." },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 2000,
        });
      },
      session.tenantId
    );

    const content = resp.choices[0]?.message?.content || "";
    const tokens = (resp.usage?.total_tokens) || 0;

    const hypoMatch = content.match(/HYPOTHESIS:\s*(.+?)(?=\n(?:APPROACH|RESULT|METRIC|SCORE|VERDICT|INSIGHT):|\n\n|$)/s);
    const approachMatch = content.match(/APPROACH:\s*(.+?)(?=\n(?:RESULT|METRIC|SCORE|VERDICT|INSIGHT):|\n\n|$)/s);
    const resultMatch = content.match(/RESULT:\s*(.+?)(?=\n(?:METRIC|SCORE|VERDICT|INSIGHT):|\n\n|$)/s);
    const metricMatch = content.match(/METRIC:\s*(.+?)(?=\n(?:SCORE|VERDICT|INSIGHT):|\n\n|$)/s);
    const scoreMatch = content.match(/SCORE:\s*(\d+)/);
    const verdictMatch = content.match(/VERDICT:\s*(KEEP|DISCARD)/i);

    hypothesis = hypoMatch?.[1]?.trim() || hypothesis;
    approach = approachMatch?.[1]?.trim() || "";
    result = resultMatch?.[1]?.trim() || content.substring(0, 500);
    metric = metricMatch?.[1]?.trim() || "quality";
    const score = parseInt(scoreMatch?.[1] || "0");
    metricValue = String(score);
    const verdict = verdictMatch?.[1]?.toUpperCase() || (score >= 6 ? "KEEP" : "DISCARD");

    if (verdict === "KEEP") {
      status = "keep";
      session.keptCount++;
      session.consecutiveFailures = 0;

      injectKeepedFinding(session, hypothesis, result, approach, score).catch(err => {
        console.warn(`[research] Injection failed for exp #${session.experimentCount}: ${err.message}`);
      });
    } else {
      status = "discard";
      session.discardedCount++;
      session.consecutiveFailures++;
    }

    const durationMs = Date.now() - start;

    await db.execute(sql`
      UPDATE research_experiments SET
        hypothesis = ${hypothesis},
        approach = ${approach},
        result = ${result},
        metric = ${metric},
        metric_value = ${metricValue},
        status = ${status},
        tokens_used = ${tokens},
        duration_ms = ${durationMs},
        model = ${usedModel}
      WHERE id = ${experimentId}
    `);

    session.previousResults.push({ hypothesis, status, metric_value: metricValue, result });

    console.log(`[research] Session #${session.sessionId} Exp #${session.experimentCount}: [${status.toUpperCase()}] ${hypothesis.substring(0, 80)} (score: ${metricValue})`);

  } catch (err: any) {
    const isTransient = err.message?.includes("401") || err.message?.includes("429") || err.message?.includes("rate") || err.message?.includes("Missing Authentication");
    if (isTransient && session.consecutiveFailures < MAX_CONSECUTIVE_FAILURES - 1) {
      const backoff = (session.consecutiveFailures + 1) * 10_000;
      console.warn(`[research] Session #${session.sessionId} Exp #${session.experimentCount}: transient error, retrying in ${backoff / 1000}s — ${err.message}`);
      session.crashedCount++;
      session.consecutiveFailures++;
      await db.execute(sql`
        UPDATE research_experiments SET
          hypothesis = ${hypothesis},
          result = ${`Transient error (will retry): ${err.message}`},
          status = 'crash',
          duration_ms = ${Date.now() - start}
        WHERE id = ${experimentId}
      `);
      await new Promise(resolve => setTimeout(resolve, backoff));
    } else {
      status = "crash";
      session.crashedCount++;
      session.consecutiveFailures++;

      await db.execute(sql`
        UPDATE research_experiments SET
          hypothesis = ${hypothesis},
          result = ${`Error: ${err.message}`},
          status = 'crash',
          duration_ms = ${Date.now() - start}
        WHERE id = ${experimentId}
      `);

      console.error(`[research] Session #${session.sessionId} Exp #${session.experimentCount}: CRASH — ${err.message}`);
    }
  }

  session.experimentInFlight = false;

  await db.execute(sql`
    UPDATE research_sessions SET
      total_experiments = ${session.experimentCount},
      experiments_kept = ${session.keptCount},
      experiments_discarded = ${session.discardedCount},
      experiments_crashed = ${session.crashedCount}
    WHERE id = ${session.sessionId}
  `);
}

export async function getResearchSessionStatus(sessionId: number) {
  const session = activeSessions.get(sessionId);
  if (session) {
    return {
      sessionId,
      status: "running",
      experimentCount: session.experimentCount,
      keptCount: session.keptCount,
      discardedCount: session.discardedCount,
      crashedCount: session.crashedCount,
      maxExperiments: session.maxExperiments,
      model: session.model,
      objective: session.objective,
    };
  }
  const result = await db.execute(sql`SELECT * FROM research_sessions WHERE id = ${sessionId}`);
  const rows = (result as any).rows || result;
  return rows[0] || null;
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}

const PROGRAM_PERSONA_MAP: Record<string, { personaSlug: string; category: string }> = {
  "Nightly AI Model & Provider Intelligence": { personaSlug: "Radar", category: "model_intelligence" },
  "Nightly AI Tools & Techniques Scanner": { personaSlug: "Blueprint", category: "technique" },
  "Nightly Competitive Platform Analysis": { personaSlug: "Radar", category: "competitive_intel" },
  "Nightly Agent Architecture Research": { personaSlug: "Forge", category: "architecture" },
  "Nightly Security & Safety Intelligence": { personaSlug: "Luna", category: "security" },
};

async function resolvePersonaId(personaSlug: string, tenantId: number): Promise<number | null> {
  const result = await db.execute(sql`SELECT id FROM personas WHERE name = ${personaSlug} AND tenant_id = ${tenantId} LIMIT 1`);
  const rows = (result as any).rows || result;
  if (rows[0]?.id) return rows[0].id;
  const fallback = await db.execute(sql`SELECT id FROM personas WHERE name = ${personaSlug} LIMIT 1`);
  const fbRows = (fallback as any).rows || fallback;
  return fbRows[0]?.id || null;
}

async function injectKeepedFinding(
  session: ActiveSession,
  hypothesis: string,
  result: string,
  approach: string,
  score: number,
): Promise<void> {
  const progResult = await db.execute(sql`SELECT name FROM research_programs WHERE id = ${session.programId}`);
  const progRows = (progResult as any).rows || progResult;
  const programName = progRows[0]?.name || "";

  if (!NIGHTLY_PROGRAM_NAMES.has(programName)) return;

  const mapping = PROGRAM_PERSONA_MAP[programName];
  if (!mapping) return;

  const personaId = await resolvePersonaId(mapping.personaSlug, session.tenantId);

  const knowledgeTitle = `[Auto-Research] ${hypothesis.substring(0, 120)}`;
  const knowledgeContent = [
    `**Finding (score ${score}/10):** ${hypothesis}`,
    approach ? `**Approach:** ${approach}` : "",
    `**Result:** ${result}`,
    `*Source: ${programName}, Session #${session.sessionId}, ${new Date().toISOString().split("T")[0]}*`,
  ].filter(Boolean).join("\n\n");

  const priority = score >= 9 ? 5 : score >= 7 ? 4 : 3;

  const ttlDays = mapping.category === "security" ? 30 : 14;
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();

  await db.execute(sql`
    INSERT INTO agent_knowledge (title, content, category, priority, persona_id, tenant_id, source, expires_at)
    VALUES (
      ${knowledgeTitle},
      ${knowledgeContent},
      ${mapping.category},
      ${priority},
      ${personaId},
      ${session.tenantId},
      ${"autoresearch"},
      ${expiresAt}::timestamp
    )
  `);

  if (programName === "Nightly AI Model & Provider Intelligence" && score >= 8) {
    const modelMatch = result.match(/model[_\s]?id[:\s]*["`']?([a-zA-Z0-9\-_./]+)["`']?/i);
    const providerMatch = result.match(/provider[:\s]*["`']?([a-zA-Z0-9\-_]+)["`']?/i);
    if (modelMatch) {
      await db.execute(sql`
        INSERT INTO model_registry_updates (update_type, model_id, model_data, status)
        VALUES (
          'add',
          ${modelMatch[1]},
          ${JSON.stringify({ source: "autoresearch", hypothesis, result, score, provider: providerMatch?.[1] || "unknown" })}::jsonb,
          'pending'
        )
      `).catch(() => {});
    }
  }

  console.log(`[research] Injected KEEP finding → agent_knowledge (persona=${mapping.personaSlug}/${personaId}, cat=${mapping.category}, priority=${priority}, ttl=${ttlDays}d)`);

  if (score >= 8) {
    generateCodeProposal(session, programName, hypothesis, result, approach, score, mapping, personaId).catch(err => {
      console.warn(`[research] Code proposal generation skipped: ${err.message}`);
    });
  }
}

const CODE_PROPOSAL_TARGETS: Record<string, string[]> = {
  "Nightly AI Model & Provider Intelligence": ["server/providers.ts", "server/model-failover.ts"],
  "Nightly AI Tools & Techniques Scanner": ["server/tools.ts", "server/chat-engine.ts"],
  "Nightly Competitive Platform Analysis": ["server/tools.ts", "server/chat-engine.ts"],
  "Nightly Agent Architecture Research": ["server/chat-engine.ts", "server/trust-engine.ts", "server/research-engine.ts"],
  "Nightly Security & Safety Intelligence": ["server/routes.ts", "server/process-governor.ts"],
};

const ALLOWED_PROPOSAL_FILES = new Set(
  Object.values(CODE_PROPOSAL_TARGETS).flat()
);

async function generateCodeProposal(
  session: ActiveSession,
  programName: string,
  hypothesis: string,
  result: string,
  approach: string,
  score: number,
  mapping: { personaSlug: string; category: string },
  personaId: number | null,
): Promise<void> {
  const targetFiles = CODE_PROPOSAL_TARGETS[programName] || [];
  if (targetFiles.length === 0) return;

  const fs = await import("fs/promises");
  const fileSnippets: string[] = [];
  for (const f of targetFiles) {
    try {
      const content = await fs.readFile(f, "utf-8");
      const lines = content.split("\n");
      fileSnippets.push(`--- ${f} (${lines.length} lines) ---\n${lines.slice(0, 60).join("\n")}\n... (truncated)`);
    } catch { /* file might not exist */ }
  }

  if (fileSnippets.length === 0) return;

  const availableModels = await getAvailableModels();
  const { result: resp } = await executeWithFailover(
    session.model, availableModels,
    async (client: any, modelId: string) => {
      return client.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: "system",
            content: `You are a senior TypeScript engineer working on VisionClaw, a multi-agent AI platform built with Express + React + Drizzle ORM + PostgreSQL.

Your job: Given a research finding, determine IF it warrants a code change, and if so, produce a concrete code proposal.

RULES:
- Only propose changes if the finding has a CLEAR, SPECIFIC implementation path
- Output MUST be valid TypeScript that fits the existing codebase patterns
- Show the exact file, the code to find (old), and the replacement (new)
- Include a 1-paragraph rationale explaining why this change improves the platform
- If the finding is informational only (no code change needed), respond with just: NO_CODE_CHANGE
- Never propose changes to shared/schema.ts or package.json
- Keep changes surgical — small, focused diffs only
- Prefer adding to existing files over creating new files

FORMAT (if proposing a change):
TITLE: <short descriptive title>
FILE: <target file path>
DESCRIPTION: <what this change does in 2-3 sentences>
RATIONALE: <why this matters for VisionClaw>
OLD_CODE:
\`\`\`typescript
<exact existing code to replace>
\`\`\`
NEW_CODE:
\`\`\`typescript
<replacement code>
\`\`\`
RISK: LOW|MEDIUM|HIGH`,
          },
          {
            role: "user",
            content: `RESEARCH FINDING (score ${score}/10):
Hypothesis: ${hypothesis}
Approach: ${approach}
Result: ${result}

RELEVANT SOURCE FILES:
${fileSnippets.join("\n\n")}

Based on this finding, should we modify the VisionClaw codebase? If yes, produce a concrete code proposal. If the finding is purely informational, respond NO_CODE_CHANGE.`,
          },
        ],
        max_completion_tokens: 2000,
      });
    },
    session.tenantId,
  );

  const output = resp.choices[0]?.message?.content || "";

  if (output.includes("NO_CODE_CHANGE") || !output.includes("OLD_CODE")) {
    return;
  }

  const titleMatch = output.match(/TITLE:\s*(.+)/);
  const fileMatch = output.match(/FILE:\s*(.+)/);
  const descMatch = output.match(/DESCRIPTION:\s*([\s\S]*?)(?=RATIONALE:)/);
  const rationaleMatch = output.match(/RATIONALE:\s*([\s\S]*?)(?=OLD_CODE:)/);
  const riskMatch = output.match(/RISK:\s*(LOW|MEDIUM|HIGH)/i);

  const oldCodeMatch = output.match(/OLD_CODE:\s*```(?:typescript)?\n([\s\S]*?)```/);
  const newCodeMatch = output.match(/NEW_CODE:\s*```(?:typescript)?\n([\s\S]*?)```/);

  if (!titleMatch || !fileMatch || !oldCodeMatch || !newCodeMatch) {
    return;
  }

  const proposedFile = fileMatch[1].trim();
  const path = await import("path");
  const normalizedFile = path.normalize(proposedFile).replace(/^\.\//, "");
  if (!ALLOWED_PROPOSAL_FILES.has(normalizedFile) || normalizedFile.includes("..") || path.isAbsolute(normalizedFile)) {
    console.warn(`[research] Code proposal rejected: "${normalizedFile}" not in allowlist`);
    return;
  }

  const oldCode = oldCodeMatch[1].trimEnd();
  const newCode = newCodeMatch[1].trimEnd();

  let validationResult: { valid: boolean; error?: string; fileExists: boolean; oldCodeFound: boolean } = {
    valid: false,
    fileExists: false,
    oldCodeFound: false,
  };

  try {
    const fileContent = await fs.readFile(normalizedFile, "utf-8");
    validationResult.fileExists = true;

    const oldCodeNormalized = oldCode.replace(/\s+/g, " ").trim();
    const fileContentNormalized = fileContent.replace(/\s+/g, " ");
    validationResult.oldCodeFound = fileContentNormalized.includes(oldCodeNormalized);

    if (validationResult.oldCodeFound) {
      validationResult.valid = true;
    } else {
      validationResult.error = "OLD_CODE block not found in target file (code may have changed)";
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      validationResult.error = `Target file ${normalizedFile} does not exist`;
    } else {
      validationResult.error = `Validation error: ${err.message}`;
    }
  }

  const codeDiff = `--- ${normalizedFile}\n+++ ${normalizedFile} (proposed)\n\n- OLD CODE:\n${oldCode}\n\n+ NEW CODE:\n${newCode}`;

  await db.execute(sql`
    INSERT INTO code_proposals (tenant_id, persona_id, title, description, target_file, code_diff, rationale, source, source_session_id, validation_result, status)
    VALUES (
      ${session.tenantId},
      ${personaId},
      ${titleMatch[1].trim()},
      ${descMatch?.[1]?.trim() || "Auto-generated from research finding"},
      ${normalizedFile},
      ${codeDiff},
      ${rationaleMatch?.[1]?.trim() || hypothesis},
      ${"autoresearch"},
      ${session.sessionId},
      ${JSON.stringify(validationResult)}::jsonb,
      ${validationResult.valid ? "ready" : "needs_review"}
    )
  `);

  const statusLabel = validationResult.valid ? "READY" : "NEEDS REVIEW";
  const risk = riskMatch?.[1]?.toUpperCase() || "UNKNOWN";
  console.log(`[research] Code proposal created: "${titleMatch[1].trim()}" → ${normalizedFile} [${statusLabel}, risk: ${risk}]`);
}
