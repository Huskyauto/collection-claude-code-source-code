import { AgentMailClient } from "agentmail";
import { db } from "./db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const PRIMARY_INBOX = "visionclaw@agentmail.to";

let client: AgentMailClient | null = null;

function getClient(): AgentMailClient {
  if (!client) {
    if (!AGENTMAIL_API_KEY) {
      throw new Error("AGENTMAIL_API_KEY not configured");
    }
    client = new AgentMailClient({ apiKey: AGENTMAIL_API_KEY });
  }
  return client;
}

export function isEmailConfigured(): boolean {
  return !!AGENTMAIL_API_KEY;
}

export async function listInboxes() {
  const c = getClient();
  const result = await c.inboxes.list();
  return result.inboxes || [];
}

export async function getOrCreatePrimaryInbox() {
  const c = getClient();
  const inboxes = await listInboxes();
  const existing = inboxes.find((i: any) => i.email === PRIMARY_INBOX || i.inboxId === PRIMARY_INBOX || i.inbox_id === PRIMARY_INBOX);
  if (existing) return existing;

  try {
    const inbox = await c.inboxes.create({
      username: "visionclaw",
      displayName: "VisionClaw AI",
      clientId: "visionclaw-primary-inbox",
    });
    return inbox;
  } catch (err: any) {
    if (err.message?.includes("AlreadyExists") || err.status === 403) {
      const retryInboxes = await listInboxes();
      const found = retryInboxes.find((i: any) => i.email === PRIMARY_INBOX || i.inboxId === PRIMARY_INBOX || i.inbox_id === PRIMARY_INBOX || (i as any).username === "visionclaw");
      if (found) return found;
    }
    throw err;
  }
}

function sanitizeUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || "user";
}

export async function getOrCreateTenantInbox(tenantId: number): Promise<{ inboxId: string; email: string }> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) throw new Error("Tenant not found");

  if (tenant.agentmailInboxId && tenant.agentmailEmail) {
    return { inboxId: tenant.agentmailInboxId, email: tenant.agentmailEmail };
  }

  if (tenantId === 1) {
    const primaryInbox = await getOrCreatePrimaryInbox();
    const inboxId = (primaryInbox as any).inboxId || (primaryInbox as any).inbox_id;
    const email = (primaryInbox as any).email || inboxId || PRIMARY_INBOX;
    await db.update(tenants).set({ agentmailInboxId: inboxId, agentmailEmail: email }).where(eq(tenants.id, tenantId));
    return { inboxId, email };
  }

  const c = getClient();
  const baseName = sanitizeUsername(tenant.name);
  const uniqueSuffix = tenantId.toString();
  const username = `${baseName}${uniqueSuffix}`;
  const clientId = `vc-tenant-${tenantId}`;

  try {
    const inbox = await c.inboxes.create({
      username,
      displayName: `${tenant.name} - VisionClaw`,
      clientId,
    });
    const inboxId = (inbox as any).inboxId || (inbox as any).inbox_id;
    const email = (inbox as any).email || `${username}@agentmail.to`;
    await db.update(tenants).set({ agentmailInboxId: inboxId, agentmailEmail: email }).where(eq(tenants.id, tenantId));
    return { inboxId, email };
  } catch (err: any) {
    if (err.message?.includes("AlreadyExists") || err.status === 403) {
      const allInboxes = await listInboxes();
      const found = allInboxes.find((i: any) =>
        (i as any).clientId === clientId || (i as any).client_id === clientId ||
        (i as any).email === `${username}@agentmail.to`
      );
      if (found) {
        const inboxId = (found as any).inboxId || (found as any).inbox_id;
        const email = (found as any).email || `${username}@agentmail.to`;
        await db.update(tenants).set({ agentmailInboxId: inboxId, agentmailEmail: email }).where(eq(tenants.id, tenantId));
        return { inboxId, email };
      }
    }
    throw err;
  }
}

export async function listMessages(inboxId: string, limit = 20, pageToken?: string) {
  const c = getClient();
  const params: any = { limit };
  if (pageToken) params.pageToken = pageToken;
  const result = await c.inboxes.messages.list(inboxId, params);
  return result;
}

export async function getMessage(inboxId: string, messageId: string) {
  const c = getClient();
  const msg = await c.inboxes.messages.get(inboxId, messageId);
  return msg;
}

export async function sendEmail(params: {
  inboxId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}) {
  const c = getClient();
  const sendParams: any = {
    to: params.to,
    subject: params.subject,
    text: params.text,
  };
  if (params.html) sendParams.html = params.html;
  if (params.cc) sendParams.cc = params.cc;
  if (params.bcc) sendParams.bcc = params.bcc;
  if (params.replyTo) sendParams.replyTo = params.replyTo;

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await c.inboxes.messages.send(params.inboxId, sendParams);
      return result;
    } catch (err: any) {
      const isRetryable = !err.status || err.status >= 500 || err.status === 429;
      if (attempt < MAX_RETRIES && isRetryable) {
        console.warn(`[email] Send attempt ${attempt}/${MAX_RETRIES} failed (${err.message}), retrying in ${RETRY_DELAY}ms...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
      } else {
        throw err;
      }
    }
  }
}

export async function replyToEmail(params: {
  inboxId: string;
  messageId: string;
  text: string;
  html?: string;
}) {
  const c = getClient();
  const replyParams: any = {
    text: params.text,
  };
  if (params.html) replyParams.html = params.html;

  const result = await c.inboxes.messages.reply(params.inboxId, params.messageId, replyParams);
  return result;
}

export { PRIMARY_INBOX };
