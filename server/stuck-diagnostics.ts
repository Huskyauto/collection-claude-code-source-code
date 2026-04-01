import { storage } from "./storage";

const CIRCULAR_LOOP_THRESHOLD = 3;
const PARAM_SIMILARITY_THRESHOLD = 0.8;
const STALLED_DELEGATION_MS = 3 * 60 * 1000;
const HUNG_BROWSER_SESSION_MS = 5 * 60 * 1000;
const CHIEF_OF_STAFF_PERSONA_ID = 6;

export interface StuckPattern {
  type: "circular_tool_loop" | "hung_process" | "stalled_delegation";
  detectedAt: number;
  description: string;
  durationMs: number;
  probableCause: string;
  remediation: string;
  metadata: Record<string, any>;
}

export interface DiagnosticReport {
  timestamp: number;
  patterns: StuckPattern[];
  activeTasks: { taskId: number; taskName: string; personaName: string | null; runningMs: number }[];
  stalledDelegations: { conversationId: number; lastEventAge: string; agentName: string }[];
  hungProcesses: { type: string; idleSeconds: number; tenantId: number }[];
  toolLoopWarnings: { conversationId: number; toolName: string; repeatCount: number }[];
}

interface ToolCallEntry {
  toolName: string;
  argsKey: string;
  timestamp: number;
}

const conversationToolCalls = new Map<number, ToolCallEntry[]>();
const TOOL_CALL_HISTORY_SIZE = 20;
const TOOL_CALL_TTL_MS = 10 * 60 * 1000;

const detectedPatterns: StuckPattern[] = [];
const MAX_PATTERNS = 50;

export function recordToolCallForStuckDetection(
  conversationId: number,
  toolName: string,
  args: Record<string, any>
): StuckPattern | null {
  const entries = conversationToolCalls.get(conversationId) || [];
  const argsKey = normalizeArgs(args);
  entries.push({ toolName, argsKey, timestamp: Date.now() });
  if (entries.length > TOOL_CALL_HISTORY_SIZE) entries.shift();
  conversationToolCalls.set(conversationId, entries);

  const recentSame = entries.filter(
    (e) => e.toolName === toolName && Date.now() - e.timestamp < 60_000
  );

  if (recentSame.length >= CIRCULAR_LOOP_THRESHOLD) {
    const similarCount = recentSame.filter(
      (e) => computeSimilarity(e.argsKey, argsKey) >= PARAM_SIMILARITY_THRESHOLD
    ).length;

    if (similarCount >= CIRCULAR_LOOP_THRESHOLD) {
      const pattern: StuckPattern = {
        type: "circular_tool_loop",
        detectedAt: Date.now(),
        description: `Tool "${toolName}" called ${similarCount} times with >80% similar params in conversation ${conversationId}`,
        durationMs: Date.now() - recentSame[0].timestamp,
        probableCause: `Agent stuck in loop calling "${toolName}" repeatedly with near-identical arguments`,
        remediation: "Injected system message to break loop and try different approach",
        metadata: { conversationId, toolName, repeatCount: similarCount },
      };
      addPattern(pattern);
      return pattern;
    }
  }

  return null;
}

export async function detectStalledDelegations(): Promise<StuckPattern[]> {
  const patterns: StuckPattern[] = [];
  try {
    const { activeTaskTracker } = await import("./heartbeat");
    const now = Date.now();

    for (const [taskId, info] of activeTaskTracker) {
      const taskType = (info as any).taskType || info.taskName || "";
      if (taskType.includes("delegation") || taskType.includes("sub_delegation") || info.taskName?.includes("delegation")) {
        const elapsed = now - info.startedAt;
        if (elapsed > STALLED_DELEGATION_MS) {
          const pattern: StuckPattern = {
            type: "stalled_delegation",
            detectedAt: now,
            description: `Delegation "${info.taskName}" (persona: ${info.personaName || "unknown"}) running for ${Math.round(elapsed / 60000)}min with no completion`,
            durationMs: elapsed,
            probableCause: "Delegation task stalled — agent may be waiting indefinitely or encountered silent failure",
            remediation: "Flagged for watchdog cleanup; task will be killed if it exceeds stuck threshold",
            metadata: { taskId, taskName: info.taskName, personaName: info.personaName, elapsedMs: elapsed },
          };
          patterns.push(pattern);
          addPattern(pattern);
        }
      }
    }
  } catch (err: any) {
    console.error("[stuck-diagnostics] Stalled delegation check failed:", err.message);
  }
  return patterns;
}

export async function detectHungProcesses(): Promise<StuckPattern[]> {
  const patterns: StuckPattern[] = [];
  try {
    const { getActiveSessions } = await import("./browser-tool");
    const sessions = getActiveSessions();
    const now = Date.now();

    for (const session of sessions) {
      const idleMs = (now - session.lastActivity);
      if (idleMs > HUNG_BROWSER_SESSION_MS) {
        const pattern: StuckPattern = {
          type: "hung_process",
          detectedAt: now,
          description: `Browser session (tenant ${session.tenantId}, profile "${session.profile}") idle for ${Math.round(idleMs / 60000)}min`,
          durationMs: idleMs,
          probableCause: "Browser session was opened but never closed — possible zombie process or abandoned navigation",
          remediation: "Flagged for cleanup by session garbage collector",
          metadata: {
            tenantId: session.tenantId,
            profile: session.profile,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            actionCount: session.actionCount,
            idleSeconds: session.idleSeconds,
          },
        };
        patterns.push(pattern);
        addPattern(pattern);
      }
    }
  } catch (err: any) {
    console.error("[stuck-diagnostics] Hung process check failed:", err.message);
  }
  return patterns;
}

export async function runFullDiagnostics(): Promise<DiagnosticReport> {
  const now = Date.now();
  const patterns: StuckPattern[] = [];

  const [stalledPatterns, hungPatterns] = await Promise.all([
    detectStalledDelegations(),
    detectHungProcesses(),
  ]);
  patterns.push(...stalledPatterns, ...hungPatterns);

  const activeTasks: DiagnosticReport["activeTasks"] = [];
  try {
    const { activeTaskTracker } = await import("./heartbeat");
    for (const [taskId, info] of activeTaskTracker) {
      activeTasks.push({
        taskId,
        taskName: info.taskName,
        personaName: info.personaName || null,
        runningMs: now - info.startedAt,
      });
    }
  } catch {}

  const stalledDelegations: DiagnosticReport["stalledDelegations"] = stalledPatterns.map((p) => ({
    conversationId: p.metadata.taskId || 0,
    lastEventAge: `${Math.round((p.metadata.elapsedMs || 0) / 60000)}min`,
    agentName: p.metadata.personaName || "unknown",
  }));

  const hungProcesses: DiagnosticReport["hungProcesses"] = hungPatterns.map((p) => ({
    type: "browser_session",
    idleSeconds: p.metadata.idleSeconds || 0,
    tenantId: p.metadata.tenantId || 0,
  }));

  const toolLoopWarnings: DiagnosticReport["toolLoopWarnings"] = [];
  for (const [convId, entries] of conversationToolCalls) {
    const toolCounts = new Map<string, number>();
    const recent = entries.filter((e) => now - e.timestamp < 60_000);
    for (const e of recent) {
      toolCounts.set(e.toolName, (toolCounts.get(e.toolName) || 0) + 1);
    }
    for (const [toolName, count] of toolCounts) {
      if (count >= 2) {
        toolLoopWarnings.push({ conversationId: convId, toolName, repeatCount: count });
      }
    }
  }

  return {
    timestamp: now,
    patterns,
    activeTasks,
    stalledDelegations,
    hungProcesses,
    toolLoopWarnings,
  };
}

export function getRecentPatterns(since?: number): StuckPattern[] {
  if (since) return detectedPatterns.filter((p) => p.detectedAt > since);
  return [...detectedPatterns];
}

export async function postDiagnosticReport(patterns: StuckPattern[]): Promise<void> {
  if (patterns.length === 0) return;

  const lines = patterns.map((p) => {
    return `**${p.type}** — ${p.description}\n  Cause: ${p.probableCause}\n  Action: ${p.remediation}`;
  });

  try {
    const { postMessage } = await import("./agent-channels");
    await postMessage({
      tenantId: 1,
      channelName: "operations",
      fromPersonaId: CHIEF_OF_STAFF_PERSONA_ID,
      content: `🔍 **Stuck Detection Report** (${patterns.length} pattern${patterns.length > 1 ? "s" : ""} found)\n\n${lines.join("\n\n")}\n\n_Detected at ${new Date().toLocaleTimeString()}_`,
      messageType: "system",
    });
  } catch {}

  for (const p of patterns) {
    try {
      await storage.createHeartbeatLog({
        taskId: 0,
        taskName: `stuck_detection:${p.type}`,
        status: "error",
        input: JSON.stringify(p.metadata).slice(0, 500),
        output: `${p.description} | Cause: ${p.probableCause} | Action: ${p.remediation}`,
        model: null,
        personaId: CHIEF_OF_STAFF_PERSONA_ID,
        personaName: "Chief of Staff",
        delegatedTasks: null,
        durationMs: p.durationMs,
      }).catch(() => {});
    } catch {}
  }
}

export function cleanupStaleToolCallHistory(): void {
  const cutoff = Date.now() - TOOL_CALL_TTL_MS;
  for (const [convId, entries] of conversationToolCalls) {
    const filtered = entries.filter((e) => e.timestamp > cutoff);
    if (filtered.length === 0) conversationToolCalls.delete(convId);
    else conversationToolCalls.set(convId, filtered);
  }
}

setInterval(cleanupStaleToolCallHistory, 60_000);

function normalizeArgs(args: Record<string, any>): string {
  const cleaned = { ...args };
  delete cleaned._tenantId;
  delete cleaned._conversationId;
  delete cleaned._depth;
  delete cleaned._currentDepth;
  delete cleaned._sourceSessionKey;
  delete cleaned._sourcePersonaName;
  delete cleaned._personaId;
  delete cleaned.returnBase64;
  const keys = Object.keys(cleaned).sort();
  return keys.map((k) => `${k}:${JSON.stringify(cleaned[k])}`).join("|");
}

function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;
  const tokensA = new Set(a.split("|"));
  const tokensB = new Set(b.split("|"));
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function addPattern(pattern: StuckPattern): void {
  detectedPatterns.push(pattern);
  if (detectedPatterns.length > MAX_PATTERNS) {
    detectedPatterns.splice(0, detectedPatterns.length - MAX_PATTERNS);
  }
}

