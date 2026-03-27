import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { uploadToDrive } from "./google-drive";
import fs from "fs";

export async function generateComprehensiveFeaturePDF(): Promise<{
  success: boolean;
  driveUrl?: string;
  error?: string;
}> {
  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `VisionClaw-Complete-Feature-Report-${dateStr}.pdf`;
  const localPath = `/tmp/${fileName}`;

  try {
    const doc = await PDFDocument.create();
    doc.setTitle("VisionClaw Agent - Complete Feature Report");
    doc.setAuthor("AI Buddy LLC");
    doc.setCreator("VisionClaw Agent Platform");
    doc.setProducer("AI Buddy LLC, Illinois");

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await doc.embedFont(StandardFonts.Courier);

    const PAGE_W = 612;
    const PAGE_H = 792;
    const MARGIN = 50;
    const MAX_X = PAGE_W - MARGIN;
    const LINE_H = 14;
    const SECTION_GAP = 10;

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function newPage() {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }

    function checkSpace(needed: number) {
      if (y - needed < MARGIN) newPage();
    }

    function drawTitle(text: string, size: number = 20) {
      checkSpace(size + 10);
      page.drawText(text, { x: MARGIN, y, size, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
      y -= size + 8;
    }

    function drawHeading(text: string) {
      checkSpace(30);
      y -= SECTION_GAP;
      page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: MAX_X, y: y + 4 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
      y -= 4;
      page.drawText(text, { x: MARGIN, y, size: 13, font: fontBold, color: rgb(0.15, 0.15, 0.5) });
      y -= 18;
    }

    function drawSubheading(text: string) {
      checkSpace(22);
      y -= 4;
      page.drawText(text, { x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
    }

    function drawText(text: string, indent: number = 0) {
      const maxWidth = MAX_X - MARGIN - indent;
      const words = text.split(" ");
      let line = "";
      for (const word of words) {
        const testLine = line ? line + " " + word : word;
        const width = font.widthOfTextAtSize(testLine, 10);
        if (width > maxWidth && line) {
          checkSpace(LINE_H);
          page.drawText(line, { x: MARGIN + indent, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
          y -= LINE_H;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        checkSpace(LINE_H);
        page.drawText(line, { x: MARGIN + indent, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
        y -= LINE_H;
      }
    }

    function drawBullet(text: string, indent: number = 10) {
      checkSpace(LINE_H);
      page.drawText("\u2022", { x: MARGIN + indent, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      drawText(text, indent + 12);
    }

    function drawTableRow(cols: string[], widths: number[], bold: boolean = false) {
      checkSpace(LINE_H);
      let x = MARGIN;
      const f = bold ? fontBold : font;
      for (let i = 0; i < cols.length; i++) {
        const txt = cols[i].slice(0, Math.floor(widths[i] / 5.5));
        page.drawText(txt, { x, y, size: 9, font: f, color: rgb(0.1, 0.1, 0.1) });
        x += widths[i];
      }
      y -= LINE_H;
    }

    // === COVER PAGE ===
    y = PAGE_H - 150;
    page.drawText("VISIONCLAW AGENT", { x: MARGIN, y, size: 28, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
    y -= 36;
    page.drawText("Complete Feature Report", { x: MARGIN, y, size: 20, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    y -= 30;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MAX_X, y }, thickness: 2, color: rgb(0.1, 0.1, 0.4) });
    y -= 40;
    page.drawText("Agentic AI Corporation Platform", { x: MARGIN, y, size: 16, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 24;
    page.drawText("Built by AI Buddy LLC, Illinois", { x: MARGIN, y, size: 14, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 60;

    const metrics = [
      ["AI Personas", "14 specialized roles"],
      ["AI Providers", "8 connected"],
      ["AI Tools", "59+ capabilities"],
      ["Governance Rules", "30 rules across 6 categories"],
      ["Frontend Pages", "25+"],
      ["Database Tables", "29+"],
      ["Design Patterns", "6 book-inspired patterns"],
      ["Comm Channels", "AgentMail, WhatsApp, Discord, Telegram"],
      ["YouTube", "OAuth channel management (upload, analytics, comments)"],
      ["ElevenLabs", "Creator plan (110K chars/month, 23 voices)"],
    ];
    drawSubheading("Key Metrics");
    for (const [label, value] of metrics) {
      drawTableRow([label, value], [160, 350]);
    }

    y -= 40;
    page.drawText(`Generated: ${new Date().toISOString()}`, { x: MARGIN, y, size: 9, font: fontMono, color: rgb(0.5, 0.5, 0.5) });

    // === SECTION 1: ARCHITECTURE ===
    newPage();
    drawTitle("Section 1: System Architecture");

    drawSubheading("Frontend Stack");
    const feItems = [
      "React 18 with Vite build system",
      "shadcn/ui component library with TailwindCSS",
      "Wouter for client-side routing, TanStack Query v5",
      "Command Center Dashboard with grouped sidebar",
      "Auto-named conversations, 3-step onboarding flow",
      "Usage dashboard, legal pages, cookie consent, error boundary",
      "Dark mode with localStorage persistence, code splitting",
      "Over 25 frontend pages",
    ];
    for (const item of feItems) drawBullet(item);

    drawSubheading("Backend Stack");
    const beItems = [
      "Express.js with TypeScript, Drizzle ORM, Zod, Helmet",
      "Real-time AI responses via Server-Sent Events (SSE)",
      "Multi-auth: Replit Auth (OAuth), Email/Password, Admin PIN (HMAC-SHA256)",
      "DB-backed sessions, timing-safe cryptography, email verification",
      "Strict multi-tenant data isolation across all queries",
    ];
    for (const item of beItems) drawBullet(item);

    drawSubheading("Database");
    const dbItems = [
      "PostgreSQL with Drizzle ORM, 29+ tables",
      "pgvector for native vector similarity search with HNSW indexes",
      "Automated schema management with safe migration patterns",
      "Production-only pgvector initialization (avoids migration conflicts)",
    ];
    for (const item of dbItems) drawBullet(item);

    // === SECTION 2: AI PERSONAS ===
    drawHeading("Section 2: AI Personas (14 Total)");
    const personas = [
      ["1", "VisionClaw", "CEO & Primary Agent - orchestrates all operations"],
      ["2", "Felix", "Operations Manager - task approval, delegation oversight"],
      ["3", "Forge", "Full-Stack Developer - code generation, debugging, architecture"],
      ["4", "Teagan", "Customer Success - engagement, onboarding, support"],
      ["5", "Blueprint", "Project Manager - planning, milestones, documentation"],
      ["6", "Chief of Staff", "Infrastructure & Stability - watchdog, monitoring"],
      ["7", "Scribe", "Content Writer - copywriting, documentation, marketing"],
      ["8", "Proof", "QA & Testing - quality assurance, validation, compliance"],
      ["9", "Radar", "Market Research - competitive analysis, trend monitoring"],
      ["10", "Neptune", "Data Analyst - data processing, insights, visualization"],
      ["11", "Apollo", "Creative Director - branding, design concepts, visual identity"],
      ["12", "Atlas", "Strategy Consultant - business strategy, growth planning"],
      ["13", "Cassandra", "Risk Analyst - risk assessment, security auditing, forecasting"],
      ["14", "Luna", "HR & People - team culture, process optimization, training"],
    ];
    drawTableRow(["ID", "Name", "Role"], [25, 100, 390], true);
    for (const p of personas) drawTableRow(p, [25, 100, 390]);

    y -= 8;
    drawText("Each persona features unique brand voice, expert rules, operating loops, per-agent reasoning config, and Personality Files (SOUL.md, STYLE.md, USER.md, RULES.md, CONTEXT.md).");

    // === SECTION 3: AI PROVIDERS ===
    drawHeading("Section 3: AI Providers (8 Connected)");
    const providers = [
      ["OpenAI", "GPT-5.4, GPT-4.1, GPT-4.1 Mini, GPT-5 Mini, o4-mini"],
      ["Anthropic", "Claude Opus 4.6, Claude Opus 4, Claude Sonnet 4"],
      ["Google Gemini", "Gemini 3.1 Pro, Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Flash"],
      ["xAI", "Grok 4, Grok 3"],
      ["OpenRouter", "DeepSeek R1/V3.2, Llama 4, Qwen 3.5, Kimi K2.5, MiniMax M2.7"],
      ["Perplexity", "Sonar Pro, Sonar Deep Research"],
      ["DeepSeek", "DeepSeek V3.2, DeepSeek R1"],
      ["Meta", "Llama 4 Maverick, Llama 4 Scout"],
    ];
    drawTableRow(["Provider", "Models"], [110, 400], true);
    for (const p of providers) drawTableRow(p, [110, 400]);

    y -= 8;
    drawSubheading("Subscription-First Routing (BYOS)");
    const byosItems = [
      "OAuth subscription tokens (ChatGPT Plus, Google Gemini) used as PRIMARY inference source",
      "OpenAI OAuth with PKCE - code-paste flow with STS token exchange",
      "Google OAuth with PKCE - redirect flow with generative-language scope",
      "Tiered failover TTLs: 429 rate limit = 2-min cooldown, 401/403 auth = 10-min cooldown",
      "Automatic API key fallback when subscription quota exhausted",
      "YouTube OAuth - Web Application flow with PKCE for YouTube Data API v3",
      "Drive connector stored as 'google-workspace' (separate from Gemini 'google')",
      "Token refresh loop every 45 minutes for all active subscriptions (OpenAI, Google, YouTube)",
    ];
    for (const item of byosItems) drawBullet(item);

    y -= 4;
    drawSubheading("Smart Model Auto-Selection");
    const autoSelect = [
      "Task Complexity Classifier - analyzes query complexity before routing",
      "High-complexity coding auto-routes to Claude Opus 4.6 (premium-first)",
      "Low/medium complexity uses budget models (DeepSeek, Gemini Flash) - cost-optimized",
      "Multimodal-Aware Routing - detects images/files, routes to vision models",
      "Auto-Thinking Mode - enables extended thinking for complex queries",
      "Persona Cost Tier Integration - respects per-persona cost budgets",
      "Adaptive Model Upgrade/Downgrade - per-round complexity assessment in tool loops",
      "Failover Cascade: subscription > API keys > Replit built-in",
    ];
    for (const item of autoSelect) drawBullet(item);

    // === SECTION 4: AUTONOMOUS OPERATIONS ===
    drawHeading("Section 4: Autonomous Operations");
    drawSubheading("Heartbeat Engine");
    drawBullet("Background task scheduler (active: 60s, idle: 5m cycles)");
    drawBullet("Processes delegations, scheduled tasks, health checks");
    drawBullet("Automatic restart on failure via health monitor");

    drawSubheading("Felix Approval Gate");
    drawBullet("All delegation tasks created with enabled=false, approval_status='pending'");
    drawBullet("Tasks must be approved via UI or API before execution");
    drawBullet("Prevents runaway autonomous actions");

    drawSubheading("Human-in-the-Loop (HITL)");
    drawBullet("Confirmation gate for high-risk actions");
    drawBullet("Actions classified by risk level (low/medium/high/critical)");
    drawBullet("Timeout-based escalation for pending approvals");

    // === SECTION 5: AGENTIC INFRASTRUCTURE ===
    drawHeading("Section 5: Agentic Infrastructure");
    drawSubheading("Agent Desks & Channels");
    drawBullet("Persistent workspace per persona with desk state, notes, priority queue");
    drawBullet("Cross-persona communication via named channels");
    drawBullet("Publish/subscribe Event Bus with event log and retention");

    drawSubheading("Autonomy Rules");
    drawBullet("Four levels: full_auto, notify_after, approve_before, blocked");
    drawBullet("Per-tenant configurable, audit log for all decisions");

    drawSubheading("Outcome Tracking & Watchlist");
    drawBullet("Pattern recognition on action results, success/failure tracking");
    drawBullet("Proactive alerting on watched metrics with configurable thresholds");

    // === SECTION 6: PROCESS GOVERNOR ===
    drawHeading("Section 6: Process Governor");
    drawBullet("30-rule governance engine across 6 categories");
    drawBullet("16 condition evaluators for rule matching");
    drawBullet("Emergency Kill Switch for immediate shutdown");
    drawBullet("Governance Frameworks: NIST, OWASP, Singapore IMDA");
    drawBullet("Automated Framework Review (quarterly)");
    drawBullet("Tiered escalation with multi-channel notification and audit trail");

    // === SECTION 7: INTELLIGENCE & MEMORY ===
    drawHeading("Section 7: Intelligence & Memory");
    drawSubheading("Three-Tier Semantic Memory");
    drawBullet("Facts - user preferences, learned information, contextual data");
    drawBullet("Notes - daily observations, interaction summaries");
    drawBullet("Vector Knowledge Base - semantic search across agent knowledge");

    drawSubheading("Document Search");
    drawBullet("BM25 text search, vector similarity via pgvector, hybrid search");
    drawBullet("HNSW indexes for fast approximate nearest neighbor queries");

    drawSubheading("Zero-Loss Compaction");
    drawBullet("Archives FULL transcript to compaction_archives table before summarizing");
    drawBullet("Local file backup as secondary archive");
    drawBullet("SAFETY GATE: compaction aborts if archive save fails");

    // === SECTION 8: DATA PROTECTION ===
    drawHeading("Section 8: Data Protection System");
    drawSubheading("Soft-Delete for Conversations");
    drawBullet("Deleted conversations marked with deleted_at timestamp");
    drawBullet("30-day recovery window before permanent deletion");
    drawBullet("Viewable at /api/conversations/trash, recoverable via POST /api/conversations/:id/recover");

    drawSubheading("Message Save Verification");
    drawBullet("User message must persist to database before AI responds");
    drawBullet("If DB write fails, request rejected with clear error");

    drawSubheading("Google Drive Backup");
    drawBullet("Per-tenant backup to organized Drive folders");
    drawBullet("Includes conversations (with archives), memories, knowledge, projects");
    drawBullet("Admin endpoints for full tenant backup and expired purge");

    // === SECTION 9: DESIGN PATTERNS ===
    drawHeading("Section 9: Agentic Design Patterns (Book-Inspired)");
    const patterns = [
      ["1. Parallel Tool Execution", "Read-only tools run concurrently via Promise.all, mutating tools sequential"],
      ["2. Critique Agent / Self-Correction", "Auto-evaluates on accuracy, completeness, relevance, clarity; refines below threshold"],
      ["3. Chain of Debates", "Convenes 3-6 specialist personas, synthesizes recommendation with consensus level"],
      ["4. Tree-of-Thought Reasoning", "Generates 2-5 reasoning branches, scores each, selects or synthesizes best"],
      ["5. Proactive Resource Prediction", "Estimates token usage, API costs, execution time, risk level before execution"],
      ["6. Adaptive Model Downgrade", "Per-round complexity check, downgrades to cheaper tier when simple"],
    ];
    for (const [name, desc] of patterns) {
      drawSubheading(name);
      drawText(desc, 10);
    }

    // === SECTION 10: TOOLS ===
    drawHeading("Section 10: 59+ AI Tools");
    const toolCategories = [
      ["Communication", "Email (AgentMail), WhatsApp, Discord, Telegram, channel messaging"],
      ["Research", "Web search, Firecrawl extraction, Jina AI reader, deep research sessions"],
      ["Documents", "PDF generation, Google Drive upload, file management, data export"],
      ["Code", "Code execution, debugging, architecture review"],
      ["Virtual Browsing", "Browserless cloud browser, screenshots, form filling, vision-enabled"],
      ["Agentic", "Desk management, event emission, delegation, watchlist, autonomy rules"],
      ["Google Workspace", "Drive file management, document creation"],
      ["System", "Health monitoring, usage tracking, model routing, dashboard generation"],
    ];
    drawTableRow(["Category", "Tools"], [110, 400], true);
    for (const tc of toolCategories) drawTableRow(tc, [110, 400]);

    // === SECTION 11: OPENCLAW FEATURES ===
    drawHeading("Section 11: OpenClaw-Inspired Features");
    const openclawItems = [
      "MCP Client Support - Model Context Protocol integration",
      "Webhook Triggers - external event webhooks with retry logic",
      "Channel Routing - rule-based message routing between personas",
      "Skills Marketplace - installable skill packages with versioning",
      "Live Canvas - rendered HTML components from agent responses in sandboxed iframes",
      "Personality Files - per-tenant SOUL/STYLE/USER/RULES/CONTEXT customization",
      "Firecrawl Search - web search returning clean LLM-ready markdown",
      "Per-Agent Reasoning Config - custom model, thinking level, token limits per persona",
      "Smart Error Classification - transient vs permanent failure detection",
    ];
    for (const item of openclawItems) drawBullet(item);

    // === SECTION 12: COMMUNICATION ===
    drawHeading("Section 12: Communication & Marketing");
    drawBullet("AgentMail - visionclaw@agentmail.to, send/receive emails with attachments");
    drawBullet("WhatsApp Integration - Baileys library, QR pairing, approval whitelist");
    drawBullet("Discord Bot - Discord.js, server messaging, command processing");
    drawBullet("Telegram Bot - grammy framework, pairing/approval, admin-only management");
    drawBullet("Social Marketing - content generation, multi-platform adaptation");

    // === SECTION 13: BROWSER & WEB ===
    drawHeading("Section 13: Virtual Browser & Web");
    drawBullet("Puppeteer-core with Browserless cloud-based headless Chrome API");
    drawBullet("Agent tools: browse_web (navigate + screenshot), browser_action (click, type, scroll, JS)");
    drawBullet("Multi-page workflows - navigate, interact with forms, extract data across pages");
    drawBullet("Vision-enabled: screenshots passed as base64 to vision-capable LLMs (GPT-4o, Claude 3.5)");
    drawBullet("SSRF protection - DNS-based URL validation blocks internal/private IP navigation");
    drawBullet("Tenant isolation - isolated browser contexts and cookie storage per tenant");
    drawBullet("Credential Vault with encrypted login storage per tenant");

    // === SECTION 13B: YOUTUBE INTEGRATION ===
    drawHeading("Section 13B: YouTube Integration");
    drawBullet("YouTube OAuth - Web application flow with PKCE for YouTube Data API v3");
    drawBullet("Channel management - upload videos, read analytics, manage comments, view subscribers");
    drawBullet("Token auto-refresh via OAUTH_PROVIDERS config (45-min refresh loop)");
    drawBullet("Scopes: youtube, youtube.upload, youtube.readonly, youtubepartner");
    drawBullet("Stored as provider='youtube' in oauth_subscriptions table");
    drawBullet("Status endpoint returns channel name, subscriber count, video count");

    // === SECTION 14: CHAT UX ===
    drawHeading("Section 14: Chat User Experience");
    drawSubheading("Streaming & Control");
    drawBullet("Smart Auto-Scroll - only scrolls when user is near bottom; respects scroll position during streaming");
    drawBullet("Scroll-to-Bottom button - floating pill button visible during streaming and idle states");
    drawBullet("Stop Generating - one-click abort of AI response mid-stream with clean state reset");
    drawBullet("Regenerate Response - retry last response with preserved file/image attachments");

    drawSubheading("Keyboard Shortcuts");
    drawBullet("Ctrl/Cmd+N - create new chat from any page");
    drawBullet("Escape - stop generation (streaming) or clear input (idle)");
    drawBullet("Shift+Enter - newline in message input");
    drawBullet("Shortcut hints displayed below input area");

    drawSubheading("Rich Content");
    drawBullet("Inline charts (Bar, Line, Pie, Area) rendered from AI responses via Recharts");
    drawBullet("Live Canvas - sandboxed HTML rendering from agent responses");
    drawBullet("Markdown with syntax-highlighted code blocks and copy buttons");
    drawBullet("Thinking/Reasoning blocks - toggleable AI reasoning traces");
    drawBullet("Tool Call display - live execution status with expandable details");
    drawBullet("Orchestration Plan Cards - visual progress for multi-step CEO Orchestrator plans");

    drawSubheading("Voice & Multi-Modal");
    drawBullet("Speech-to-text voice recording with live transcript preview");
    drawBullet("Text-to-speech playback on any assistant message (Google TTS)");
    drawBullet("Talk Mode - continuous hands-free voice conversation");
    drawBullet("Camera capture for mobile/desktop image input");
    drawBullet("Multi-modal input: drag-and-drop files, image paste, camera capture");
    drawBullet("Model badge showing auto-selected AI model per response");
    drawBullet("ObjectURL memory management - preview URLs properly revoked to prevent leaks");

    drawSubheading("ElevenLabs Voice AI");
    drawBullet("Creator plan - 110,000 characters/month, 23 premium voices");
    drawBullet("Text-to-Speech via eleven_flash_v2_5 model");
    drawBullet("Speech-to-Text via scribe_v1 model for audio transcription");
    drawBullet("Configurable per-tenant via TTS config settings");

    // === SECTION 14B: PLATFORM CAPABILITIES BRIEFING ===
    drawHeading("Section 14B: Platform Capabilities Briefing");
    drawBullet("Auto-injected into every persona's system prompt via buildPlatformCapabilities()");
    drawBullet("Enumerates all configured API keys and OAuth subscriptions");
    drawBullet("Lists server capabilities: FFmpeg, pgvector, Node.js, Object Storage, Chromium");
    drawBullet("Shows connected services: Google Drive, AgentMail, YouTube, Telegram, Discord");
    drawBullet("Categorizes all 59+ tools with descriptions");
    drawBullet("Lists all available AI models grouped by provider");
    drawBullet("5-minute cache to avoid regeneration overhead");
    drawBullet("Prevents personas from asking users to set up already-configured services");

    // === SECTION 15: PAYMENTS ===
    drawHeading("Section 15: Payments & Billing");
    drawBullet("Stripe - subscriptions, Connect, BYOK tier, webhook handling");
    drawBullet("Coinbase - CDP SDK, Commerce API, crypto payments, multi-currency");
    drawBullet("Usage Metering - per-tenant message, conversation, tool call tracking");

    // === SECTION 16: FILE & STORAGE ===
    drawHeading("Section 16: File & Storage");
    drawBullet("Secure Tenant File Storage via Replit Object Storage");
    drawBullet("File Manager UI with upload, download, delete, preview");
    drawBullet("Google Drive Integration - organized folders, shareable links");
    drawBullet("PDF Toolkit - generation, report export, templates");

    // === SECTION 17: STABILITY ===
    drawHeading("Section 17: Stability & Monitoring");
    drawSubheading("Stability Watchdog (Chief of Staff)");
    drawBullet("Runs every 10 minutes with zero AI credit cost");
    drawBullet("Auto-kills stuck tasks (8min), auto-disables flaky tasks (4 errors/2h)");
    drawBullet("Heartbeat restart, memory pressure management, stale data cleanup");
    drawBullet("Pool health monitoring, reports to operations channel");

    drawSubheading("Health Monitor");
    drawBullet("6-check health system every 5 minutes");
    drawBullet("DB connectivity, API availability, memory, heartbeat, watchdog status");

    // === SECTION 18: SECURITY ===
    drawHeading("Section 18: Security");
    drawBullet("IronClaw-inspired SafetyLayer - 17 secret patterns, PolicyEngine, injection protection");
    drawBullet("Helmet CSP headers for content security");
    drawBullet("Provider Key Proxy for centralized API key management");
    drawBullet("Multi-auth: Replit Auth, Email/Password, Admin PIN (HMAC-SHA256 with salt)");
    drawBullet("Timing-safe cryptography, DB-persisted password reset tokens");
    drawBullet("Multi-tenant data isolation on all queries");
    drawBullet("Soft account deletion with recovery");

    // === SECTION 19: DATABASE ===
    drawHeading("Section 19: Database Schema (29+ Tables)");
    const tableGroups = [
      ["Core", "tenants, conversations, messages, personas"],
      ["Intelligence", "memory_entries, agent_knowledge, daily_notes, compaction_archives"],
      ["Projects", "projects, project_notes, project_files"],
      ["Heartbeat", "heartbeat_tasks, heartbeat_logs"],
      ["Agentic", "agent_desks, agent_channels, channel_messages, channel_subscriptions"],
      ["Events", "event_log, event_subscriptions"],
      ["Governance", "governance_rules, governance_actions, governance_frameworks"],
      ["Autonomy", "autonomy_rules, autonomy_log"],
      ["Analytics", "action_outcomes, outcome_patterns, watchlist_items, watchlist_alerts"],
      ["System", "skills, custom_tools, experiments, provider_keys, tenant_provider_keys"],
      ["Config", "mcp_servers, model_registry_updates, personality_files, oauth_subscriptions"],
      ["Payments", "stripe_customers, stripe_subscriptions, stripe_products, stripe_prices"],
    ];
    drawTableRow(["Category", "Tables"], [90, 420], true);
    for (const tg of tableGroups) drawTableRow(tg, [90, 420]);

    // === FOOTER ===
    y -= 30;
    checkSpace(60);
    page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: MAX_X, y: y + 10 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    y -= 10;
    page.drawText("PREPARED BY: VisionClaw Agent Platform", { x: MARGIN, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
    page.drawText("COMPANY: AI Buddy LLC, Illinois", { x: MARGIN, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
    page.drawText(`DATE: ${new Date().toISOString()}`, { x: MARGIN, y, size: 9, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
    page.drawText("Copyright AI Buddy LLC. All Rights Reserved.", { x: MARGIN, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });

    const pdfBytes = await doc.save();
    fs.writeFileSync(localPath, pdfBytes);
    console.log(`[pdf] Generated ${fileName} (${pdfBytes.length} bytes, ${doc.getPageCount()} pages)`);

    const result = await uploadToDrive({
      filePath: localPath,
      fileName,
      mimeType: "application/pdf",
      description: `Comprehensive feature report for VisionClaw Agent platform - ${dateStr}`,
      folderLabel: "VisionClaw-Reports",
      share: true,
    });

    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

    if (result.success) {
      return { success: true, driveUrl: result.shareableLink };
    }
    return { success: false, error: result.error };
  } catch (err: any) {
    console.error("[pdf] Generation failed:", err.message);
    return { success: false, error: err.message };
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generate-feature-pdf.ts");
if (isMain) {
  generateComprehensiveFeaturePDF().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}
