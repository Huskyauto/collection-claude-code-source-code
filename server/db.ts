import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000,
  statement_timeout: 30000,
  allowExitOnIdle: true,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

export const db = drizzle(pool, { schema });
export { pool };

export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export function isPoolHealthy(): boolean {
  return pool.waitingCount < 10;
}

export async function testPoolConnection(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
