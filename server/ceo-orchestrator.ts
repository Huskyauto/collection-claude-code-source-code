import { processMessage } from "./chat-engine";
import { getClientForModel } from "./providers";

export interface OrchestrationStep {
  taskId: number;
  description: string;
  assignedPersona: string;
  dependsOn: number[];
  requiredSkillType: string;
  status: "pending" | "running" | "complete" | "failed" | "awaiting_approval";
  result?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface OrchestrationPlan {
  id: string;
  objective: string;
  steps: OrchestrationStep[];
  status: "planning" | "executing" | "complete" | "failed" | "paused";
  createdAt: number;
  completedAt?: number;
  conversationId: number;
  tenantId: number;
  warRoom: Record<number, string>;
  callerDepth: number;
}

const activePlans = new Map<string, OrchestrationPlan>();

const PERSONA_SKILLS: Record<string, string[]> = {
  "Forge": ["coding", "engineering", "debugging", "architecture", "technical", "build", "fix", "deploy", "script", "api", "database", "server", "code", "backend", "frontend", "devops", "infrastructure", "test", "refactor", "migration"],
  "Teagan": ["content strategy", "content plan", "editorial calendar", "marketing content", "blog strategy", "social media strategy", "newsletter strategy", "brand messaging", "content brief", "marketing", "social media", "campaign", "seo", "brand"],
  "Scribe": ["writing", "content", "blog", "social media", "copy", "newsletter", "article", "post", "draft", "compose", "creative writing", "storytelling", "narrative", "long-form", "email copy", "press release", "documentation", "presentation", "deck", "slides", "pitch", "proposal", "one-pager", "brochure", "case study", "white paper"],
  "Proof": ["review", "edit", "proofread", "quality", "fact-check", "verify content", "polish", "grammar", "tone check", "brand compliance"],
  "Radar": ["research", "analysis", "intelligence", "market", "competitive", "trends", "scan", "investigate", "survey", "news", "industry", "competitor"],
  "Neptune": ["deep research", "academic", "comprehensive", "study", "report", "white paper", "thorough", "literature review", "deep dive", "exhaustive analysis", "multimedia", "audio", "video"],
  "Apollo": ["sales", "pipeline", "revenue", "leads", "outreach", "crm", "deals", "prospects", "pricing", "conversion", "upsell", "customer acquisition", "proposal", "client", "pitch"],
  "Atlas": ["metrics", "analytics", "data", "kpi", "dashboard", "reporting", "numbers", "statistics", "scorecard", "benchmark", "trend analysis", "performance", "visualization", "charts"],
  "Cassandra": ["finance", "budget", "forecast", "financial", "p&l", "revenue analysis", "cash flow", "pricing model", "tax", "accounting", "expense", "margin", "runway", "burn rate"],
  "Luna": ["legal", "contract", "compliance", "terms", "privacy", "nda", "trademark", "license", "regulation", "gdpr", "ip", "intellectual property", "agreement"],
  "Felix": ["strategy", "executive", "vision", "roadmap", "okr", "partnership", "crisis", "decision", "goal setting", "quarterly planning", "annual plan"],
  "Chief of Staff": ["operations", "routing", "coordination", "standup", "status", "schedule", "organize", "delegate", "prioritize", "daily brief", "health check", "incident", "system"],
  "Agent Blueprint": ["multi-agent", "orchestration", "agent coordination", "parallel tasks", "system health", "process enforcement", "agent monitoring"],
  "VisionClaw": ["general", "assistant", "help", "question", "explain", "summarize", "brainstorm", "plan", "advice"],
};

function matchPersona(skillType: string): string {
  const normalized = skillType.toLowerCase();
  let bestMatch = "VisionClaw";
  let bestScore = 0;

  for (const [persona, keywords] of Object.entries(PERSONA_SKILLS)) {
    let score = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        score += kw.includes(" ") ? 3 : 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = persona;
    }
  }

  return bestMatch;
}

export async function generateExecutionPlan(
  objective: string,
  conversationId: number,
  tenantId: number,
  modelId?: string,
  callerDepth?: number
): Promise<OrchestrationPlan> {
  const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  let crossWorkflowHint = "";
  try {
    const { classifyRequest, CROSS_DEPARTMENT_WORKFLOWS, DEPARTMENTS, formatCrossWorkflowForPrompt } = await import("./scaffolding");
    const classification = classifyRequest(objective);
    if (classification.crossDepartment) {
      crossWorkflowHint = `\nPRE-DEFINED WORKFLOW DETECTED: ${classification.crossDepartment.workflowId} — ${classification.crossDepartment.name}
Use this orchestration pattern as a guide:\n${formatCrossWorkflowForPrompt(classification.crossDepartment)}\nAdapt the steps to the specific objective but follow the agent assignments and parallel/sequential structure.`;
      console.log(`[ceo-orchestrator] Cross-dept workflow matched: ${classification.crossDepartment.workflowId}`);
    }
  } catch {}

  const plannerPrompt = `You are the CEO Orchestrator of VisionClaw, a fully autonomous AI corporation.
Your ONLY job is to break complex objectives into a sequential execution plan. You do NOT do the work yourself.

Break this objective into discrete, actionable sub-tasks. Each task should be assigned to the right department.

Available departments and their specialists:
- Executive & Strategic Planning (Felix): strategy, vision, roadmap, OKRs, partnerships, crisis mgmt
- Engineering (Forge): coding, debugging, API work, database, scripts, deployment, infrastructure, testing
- Content & Creative (Scribe): blog posts, articles, newsletters, copywriting, long-form writing, press releases
- Marketing & Growth (Teagan): social media, campaigns, brand strategy, SEO, content calendar
- Sales & Revenue (Apollo): lead generation, outreach, proposals, pricing, pipeline, client delivery
- Finance & Accounting (Cassandra): budgets, forecasts, P&L, pricing models, cash flow, tax prep
- Legal & Compliance (Luna): contracts, ToS, privacy policy, NDA, compliance, IP
- Operations (Chief of Staff): scheduling, coordination, status updates, system health, incident response
- Research & Intelligence (Radar): market research, competitive analysis, trend reports, due diligence
- Deep Research (Neptune): academic-grade research, comprehensive studies, white papers, multimedia
- Data & Analytics (Atlas): metrics, KPIs, dashboards, data analysis, reporting, visualization
- Content Review (Proof): editing, proofreading, fact-checking, quality assurance, brand compliance
- HR & Culture (Felix/Scribe): job descriptions, onboarding, policy docs, hiring
- Customer Success (Chief of Staff): help docs, customer comms, feedback analysis

CRITICAL RULES:
1. Each task must be specific and actionable — not vague
2. Include dependencies when a task needs output from a previous task
3. Tasks that can run in parallel should NOT depend on each other
4. Keep it to 2-6 tasks maximum. Don't over-decompose simple requests.
5. If the objective is simple (single task), return just 1 task.
${crossWorkflowHint}
Objective: ${objective}

Respond with ONLY a valid JSON array, no markdown, no explanation:
[
  {"task_id": 1, "description": "...", "required_skill_type": "Research", "depends_on": []},
  {"task_id": 2, "description": "...", "required_skill_type": "Writing", "depends_on": [1]}
]`;

  const model = modelId || "gemini-2.5-flash";
  let client: any;
  let actualModel: string;
  try {
    const result = await getClientForModel(model, tenantId);
    client = result.client;
    actualModel = result.actualModelId;
  } catch {
    const result = await getClientForModel("gemini-2.5-flash", tenantId);
    client = result.client;
    actualModel = result.actualModelId;
  }

  const response = await client.chat.completions.create({
    model: actualModel,
    messages: [{ role: "user", content: plannerPrompt }],
    max_completion_tokens: 1000,
    temperature: 0.3,
  });

  const rawContent = response.choices?.[0]?.message?.content || "[]";

  let steps: OrchestrationStep[] = [];
  try {
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      steps = parsed.map((t: any) => ({
        taskId: t.task_id,
        description: t.description,
        assignedPersona: matchPersona(t.required_skill_type || "general"),
        dependsOn: t.depends_on || [],
        requiredSkillType: t.required_skill_type || "General",
        status: "pending" as const,
      }));
    }
  } catch (e) {
    steps = [{
      taskId: 1,
      description: objective,
      assignedPersona: "VisionClaw",
      dependsOn: [],
      requiredSkillType: "General",
      status: "pending",
    }];
  }

  if (steps.length === 0) {
    steps = [{
      taskId: 1,
      description: objective,
      assignedPersona: "VisionClaw",
      dependsOn: [],
      requiredSkillType: "General",
      status: "pending",
    }];
  }

  const plan: OrchestrationPlan = {
    id: planId,
    objective,
    steps,
    status: "planning",
    createdAt: Date.now(),
    conversationId,
    tenantId,
    warRoom: {},
    callerDepth: callerDepth ?? 0,
  };

  activePlans.set(planId, plan);
  console.log(`[ceo] Plan ${planId} created: ${steps.length} steps for "${objective.slice(0, 60)}..."`);

  return plan;
}

export async function executePlan(
  plan: OrchestrationPlan,
  onProgress?: (plan: OrchestrationPlan, step: OrchestrationStep, event: string) => void
): Promise<OrchestrationPlan> {
  plan.status = "executing";
  onProgress?.(plan, plan.steps[0], "plan_started");

  const storage = (await import("./storage")).storage;
  const { db } = await import("./db");
  const { personas: personasTable } = await import("@shared/schema");
  const cachedPersonas = await db.select().from(personasTable);

  const MAX_ROUNDS = 20;
  let round = 0;

  while (round < MAX_ROUNDS) {
    round++;

    const runnableSteps = plan.steps.filter(s =>
      s.status === "pending" &&
      s.dependsOn.every(dep => {
        const depStep = plan.steps.find(ds => ds.taskId === dep);
        return depStep?.status === "complete";
      })
    );

    if (runnableSteps.length === 0) {
      const hasPending = plan.steps.some(s => s.status === "pending" || s.status === "running");
      if (!hasPending) break;

      const hasRunning = plan.steps.some(s => s.status === "running");
      if (!hasRunning) {
        plan.status = "failed";
        console.log(`[ceo] Plan ${plan.id} stuck: pending steps with unmet dependencies`);
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const executeStep = async (step: OrchestrationStep) => {
      step.status = "running";
      step.startedAt = Date.now();
      onProgress?.(plan, step, "step_started");

      console.log(`[ceo] Step ${step.taskId}: "${step.description.slice(0, 60)}" → ${step.assignedPersona}`);

      let contextFromDeps = "";
      for (const depId of step.dependsOn) {
        const depResult = plan.warRoom[depId];
        if (depResult) {
          contextFromDeps += `\n\n--- Output from Step ${depId} ---\n${depResult.slice(0, 2000)}`;
        }
      }

      let scaffoldBlock = "";
      try {
        const { getScaffoldForDelegation, formatScaffoldForPrompt } = await import("./scaffolding");
        const match = cachedPersonas.find(p => p.name === step.assignedPersona);
        const scaffold = getScaffoldForDelegation(step.description, match?.id || 0);
        if (scaffold) scaffoldBlock = formatScaffoldForPrompt(scaffold);
      } catch {}

      const taskPrompt = `You are ${step.assignedPersona}, executing a specific task as part of a CEO-orchestrated plan.

PLAN OBJECTIVE: ${plan.objective}
YOUR TASK (Step ${step.taskId}): ${step.description}
ASSIGNED SPECIALIST: ${step.assignedPersona} (${step.requiredSkillType})
${contextFromDeps ? `\nCONTEXT FROM PREVIOUS STEPS:${contextFromDeps}` : ""}
${scaffoldBlock ? `\n${scaffoldBlock}` : ""}
INSTRUCTIONS:
- Focus ONLY on your assigned task. Do not attempt other steps in the plan.
- Use your tools proactively — search, research, verify, create. Do not guess when you can look up.
- Be thorough but concise. Produce actionable output the next step can build on.
- If you create content, make it production-ready, not a rough sketch.
- Output your results directly — no pleasantries, no meta-commentary, no summaries of what you were asked to do.`;

      try {
        const targetPersona = cachedPersonas.find(p => p.name === step.assignedPersona) || cachedPersonas.find(p => p.name === "VisionClaw");

        const childConv = await storage.createConversation({
          title: `[CEO] Step ${step.taskId}: ${step.description.slice(0, 50)}`,
          model: "auto",
          personaId: targetPersona?.id || null,
          tenantId: plan.tenantId,
        });

        const stepDepth = (plan.callerDepth || 0) + 1;
        const result = await processMessage(
          childConv.id,
          taskPrompt,
          { enableTools: true, depth: stepDepth }
        );

        const resultText = result?.response || JSON.stringify(result);

        step.result = resultText.slice(0, 4000);
        step.status = "complete";
        step.completedAt = Date.now();
        plan.warRoom[step.taskId] = step.result;

        console.log(`[ceo] Step ${step.taskId} complete (${((step.completedAt - step.startedAt!) / 1000).toFixed(1)}s)`);
        onProgress?.(plan, step, "step_complete");

      } catch (err: any) {
        step.status = "failed";
        step.error = err.message || "Unknown error";
        step.completedAt = Date.now();
        console.error(`[ceo] Step ${step.taskId} failed:`, err.message);
        onProgress?.(plan, step, "step_failed");
      }
    };

    const MAX_PARALLEL = 3;
    if (runnableSteps.length > 1) {
      console.log(`[ceo] Running ${runnableSteps.length} steps in parallel (max ${MAX_PARALLEL})`);
      const batches: OrchestrationStep[][] = [];
      for (let i = 0; i < runnableSteps.length; i += MAX_PARALLEL) {
        batches.push(runnableSteps.slice(i, i + MAX_PARALLEL));
      }
      for (const batch of batches) {
        await Promise.allSettled(batch.map(step => executeStep(step)));
      }
    } else {
      for (const step of runnableSteps) {
        await executeStep(step);
      }
    }
  }

  const allComplete = plan.steps.every(s => s.status === "complete");
  const anyFailed = plan.steps.some(s => s.status === "failed");
  const anyPending = plan.steps.some(s => s.status === "pending");
  plan.status = allComplete ? "complete" : anyFailed ? "failed" : anyPending ? "failed" : "complete";
  plan.completedAt = Date.now();

  onProgress?.(plan, plan.steps[plan.steps.length - 1], "plan_complete");
  console.log(`[ceo] Plan ${plan.id} finished: ${plan.status} (${plan.steps.filter(s => s.status === "complete").length}/${plan.steps.length} steps)`);

  return plan;
}

export function synthesizeResults(plan: OrchestrationPlan): string {
  const parts: string[] = [];
  parts.push(`## Execution Complete\n**Objective:** ${plan.objective}\n`);

  const totalTime = plan.completedAt ? ((plan.completedAt - plan.createdAt) / 1000).toFixed(1) : "?";
  parts.push(`**Status:** ${plan.status} | **Steps:** ${plan.steps.length} | **Time:** ${totalTime}s\n`);

  for (const step of plan.steps) {
    const icon = step.status === "complete" ? "✅" : step.status === "failed" ? "❌" : "⏳";
    const persona = step.assignedPersona;
    const time = step.startedAt && step.completedAt ? `${((step.completedAt - step.startedAt) / 1000).toFixed(1)}s` : "";
    parts.push(`### ${icon} Step ${step.taskId}: ${step.description}`);
    parts.push(`*Assigned to: ${persona} | ${time}*\n`);

    if (step.result) {
      parts.push(step.result);
    }
    if (step.error) {
      parts.push(`**Error:** ${step.error}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

export function getActivePlan(planId: string): OrchestrationPlan | undefined {
  return activePlans.get(planId);
}

export function getActivePlansForConversation(conversationId: number): OrchestrationPlan[] {
  const plans: OrchestrationPlan[] = [];
  for (const plan of activePlans.values()) {
    if (plan.conversationId === conversationId) plans.push(plan);
  }
  return plans;
}

export function getAllActivePlans(): OrchestrationPlan[] {
  return [...activePlans.values()].filter(p => p.status === "executing" || p.status === "planning");
}

export function isComplexRequest(message: string): boolean {
  const indicators = [
    /\band\b.*\bthen\b/i,
    /\bfirst\b.*\bthen\b/i,
    /\bresearch\b.*\b(write|draft|create|build)\b/i,
    /\b(write|draft|create)\b.*\b(send|publish|post|email)\b/i,
    /\b(analyze|research)\b.*\b(summarize|report)\b/i,
    /\bmulti.?step/i,
    /\bplan\b.*\bexecute\b/i,
    /step.?by.?step/i,
    /\bworkflow\b/i,
  ];

  let score = 0;
  for (const pattern of indicators) {
    if (pattern.test(message)) score++;
  }

  const deliverables = [
    /\b(create|build|make|generate|prepare|put together|draft|design)\b.*\b(presentation|deck|pitch|slideshow|slides|proposal|report|white\s?paper|one[- ]?pager|brochure|brief|newsletter|press release|case study)\b/i,
    /\b(presentation|deck|pitch|proposal|report|white\s?paper)\b.*\b(for|about|on|covering)\b/i,
  ];
  for (const pattern of deliverables) {
    if (pattern.test(message)) { score += 3; break; }
  }

  const conjunctions = (message.match(/\b(and then|then|after that|next|finally|also|additionally)\b/gi) || []).length;
  score += Math.min(conjunctions, 3);

  const verbs = (message.match(/\b(research|write|draft|send|create|build|analyze|review|edit|post|publish|deploy|fix|test|check|find|search|email|schedule|present|design|prepare|compile|assemble)\b/gi) || []);
  const uniqueVerbs = new Set(verbs.map(v => v.toLowerCase()));
  if (uniqueVerbs.size >= 3) score += 2;

  return score >= 3;
}
