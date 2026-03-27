# VisionClaw — Agentic AI Corporation Platform

## Overview
VisionClaw is an agentic AI platform designed as a fully autonomous AI corporation, featuring 14 specialized AI personas that form a complete corporate team. It operates under rules-driven autonomous governance based on NIST, OWASP, and Singapore IMDA standards, implementing the Claude Opus 4.6 Agentic Spec. Agents handle tasks autonomously, escalating only mission-critical issues to human owners. The platform is built for multi-tenancy, cost-effectiveness, and robust security, aiming to provide a complete corporate team experience through AI.

## User Preferences
- **NEVER modify `shared/schema.ts`** without explicit owner approval. Use direct SQL (`psql $DATABASE_URL`) for new tables.
- **NEVER push `.replit` to GitHub** — it may contain API keys in `[userenv.shared]`. It is untracked from git as of March 2026.
- **NEVER use `sql.raw()` with user input** — use parameterized `${value}::type` syntax for all dynamic SQL.
- **DB migrations**: Use `psql $DATABASE_URL` direct ALTER TABLE commands, NOT drizzle-kit push.
- **DB result access**: `db.execute()` returns `{ rows: [...] }` — always use `(result as any).rows || result` pattern.
- **Tags column is `text[]` NOT jsonb`** — use `${tagArray}::text[]` parameterized syntax.
- **Ask before** major architectural changes, new external dependencies, or large refactors.
- **GitHub push**: Always use `bash /tmp/push-gh.sh` which runs a secret scanner (10+ patterns), verifies `.replit`/`browser-config.json` are untracked, then pushes. Script auto-created on app startup by `server/index.ts`. Both `routes.ts` (manual backup) and `heartbeat.ts` (auto-backup) use it. If secrets detected, push is BLOCKED.
- **Git-excluded files** (tracked before March 2026, now untracked): `.replit`, `data/browser-config.json`, `attached_assets/`, `uploads/`, `project-assets/`, `data/lobster-workflows/`.
- Cost-conscious ($600+ spent on AI calls). Minimize unnecessary AI token usage.
- **HARD RULE**: ALL files/images/screenshots go to Google Drive via `uploadAndShare()`. Local URLs banned.
- **ALWAYS update BOTH env var AND `provider_keys` DB TABLE when rotating API keys**.
- **heartbeat log status**: Uses `"error"` not `"failed"` — status checks must use `!== "success"` not `=== "failed"`.
- **Sidebar infinite query key**: Use `["/api/conversations", "infinite"]` — avoids cache shape conflict with home page.
- **Persona IDs**: VisionClaw=1, Felix=2, Forge=3, Teagan=4, Blueprint=5, Chief of Staff=6, Scribe=7, Proof=8, Radar=9, Neptune=10, Apollo=11, Atlas=12, Cassandra=13, Luna=14.
- **Model tier priority (no nano/garbage models)**: Fast=Gemini 2.5 Flash/DeepSeek V3.2, Balanced=Gemini Flash/GPT-4.1 Mini, Powerful=Claude Opus 4.6 → Llama 4 Maverick → Gemini Pro, Reasoning=DeepSeek R1/o4-mini. High-complexity coding auto-routes to Claude Opus 4.6. Failover cascade: subscription (2min cooldown for 429, 10min for auth) → API keys → Replit built-in.
- **Subscription-First Routing (BYOS)**: OAuth tokens from OpenAI ChatGPT Plus and Google Gemini used as PRIMARY inference. Google OAuth via redirect with PKCE (`generative-language` scope stored as provider='google'). OpenAI via code-paste with STS exchange. Drive connector stored as provider='google-workspace' (separate from Gemini). `markSubscriptionFailed(provider, tenantId, statusCode)` with tiered TTLs.
- **Admin PIN**: HMAC-SHA256 with salt "visionclaw-pin-v1". Default 0429. Admin = tenant_id 1.
- **ElevenLabs TTS**: Creator plan active (110K chars/month, 23 voices). Google TTS also available. `continuous=false` is correct.
- **YouTube OAuth**: provider='youtube' in oauth_subscriptions. Uses YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET (Web Application type, not Desktop). Redirect URI: `/api/youtube/callback`. Token auto-refreshed via OAUTH_PROVIDERS config.

## System Architecture
VisionClaw employs a modern web architecture with a single-port frontend and API.

**Frontend:**
- **Stack:** React 18, Vite, shadcn/ui, TailwindCSS, Wouter, TanStack Query v5.
- **UI/UX:** Command Center Dashboard, grouped sidebar, auto-named conversations, 3-step onboarding, usage dashboard, legal pages, cookie consent, error boundary, dark mode, code splitting, scroll-to-bottom button, stop generating button, regenerate last response, keyboard shortcuts (Ctrl/Cmd+N new chat, Esc stop/clear).

**Backend:**
- **Stack:** Express.js, TypeScript, Drizzle ORM, Zod, Helmet.
- **Features:** Real-time AI responses via SSE, robust authentication (Replit Auth, Email + Password, Admin PIN), DB-backed sessions, timing-safe cryptography, password policy, email verification, and strict multi-tenant data isolation.

**Core Features:**
- **AI Agent System:** A 14-persona agent team with unique roles, an LLM-powered CEO Orchestrator, Semantic Tool Router, Self-Improvement Engine, Adaptive Execution & Self-Healing, and Auto Model Router.
- **Smart Model Auto-Selection:** Task Complexity Classifier, Multimodal-Aware Routing, Auto-Thinking Mode, Persona Cost Tier Integration, and a Model Capabilities Registry.
- **Autonomous Operations:** Heartbeat Engine, user-friendly Scheduled Tasks, Corporation Report Export (PDF to Google Drive), Human-in-the-Loop (HITL) Confirmation Gate, and Felix Approval Gate for delegated tasks.
- **Agentic Infrastructure:** Persistent Agent Desks, Internal Channels, Event Bus, Agentic Tools, Autonomy Rules, Outcome Tracking, and Watchlist Monitoring.
- **Process Governor:** A 40-rule governance engine across 7 categories (including agency_expansion), supported by 25 condition evaluators, an emergency Kill Switch, and a Governance Frameworks Knowledge Base (NIST, OWASP, Singapore IMDA).
- **Quarterly Intelligence System:** Governance Research Scanner and Model Registry Refresh.
- **Deep Research:** Defines Research Programs, Autonomous Sessions, Research Scheduling, and AI-generated Session Summaries with Dev-to-Prod Auto-Sync.
- **Agentic Intelligence Engines:** Decision-Making, Predictive Analytics, and Process Optimization engines.
- **Intelligence & Memory:** Hierarchical Memory Graph, Three-Tier Semantic Memory (Facts, Notes, Vector KB), BM25/Vector/Hybrid Document Search, Zero-Loss Compaction, Per-Tenant Memory Backup, and `pgvector` for native PostgreSQL vector similarity.
- **Data Protection System:** Comprehensive data safety layer including soft-delete for conversations, message save verification, compaction safety gate, Google Drive backup per tenant, and admin endpoints for backup and purging.
- **Platform Capabilities Briefing:** Auto-injected system prompt for personas enumerating configured API keys, OAuth subscriptions, server capabilities, connected services, available tools, and AI models.
- **83+ AI Tools:** Comprehensive toolset for communication, research, documents, code execution, virtual browsing, web scraping (FireCrawl scrape/crawl/map with database storage), agentic operations, Google Workspace, and system management, including `generate_dashboard` for Live Canvas.
- **Project Brain System:** Auto-maintained `.md` knowledge file per project stored in `project-brains/`, tracking overview, status, assets, decisions, facts, session log, and next steps. Injected into project conversations.
- **Project Continuity System:** Auto-transcript system saves full timestamped markdown transcripts to `project-transcripts/`. Auto-asset capture detects deliverables and saves them to `project-assets/`. Prior conversation transcripts and messages are injected for continuity.
- **Auto-Project Detection:** Automatically creates a project when user signals intent to build something, linking the conversation and directing the agent.
- **Corporate Operations Scaffolding System:** 65 structured operation scaffolds across 12 departments, 6 cross-department workflows, task classification engine, and operation-aware tool routing. Scaffolds inject step sequences, tool chains, deliverables, and quality gates into agent prompts during delegation. Files: `server/scaffolding.ts` (engine), integrated into `chat-engine.ts` (Felix prompt), `heartbeat.ts` (delegation), `ceo-orchestrator.ts` (planning), `tool-router.ts` (tool selection).
- **Felix Auto-Orchestration:** For complex multi-step requests, Felix uses the `orchestrate` tool to decompose tasks into a DAG, assigns specialist personas, and executes steps via child conversations with real-time progress updates. The Task Classification Engine in Felix's prompt provides department routing and operation scaffolds for precise delegation.
- **Execution Supervisor:** Monitors and controls agent tool execution quality via Circuit Breaker, Output Validation, Hallucination Detection, and Execution Budget Warnings. Provides Fallback Suggestions for tool failures.
- **Agency Expansion Framework (6 Tiers):** Full Earned Autonomy system. Tier 1: 9 Evaluators (daily_spend, pii_exposure, agent_spend_ratio, failover_rate, purpose_drift, auth_failures, desk_queue, content_pipeline, tool_boundary_violations). Tier 2: Trust Score Engine (9 categories, 40 scores across 13 personas, hysteresis logic, never-auto actions, critical events lock agents). Tier 3: Proactive Initiative Engine (PAB budgets, 32 triggers across 9 personas, outcome quality tracking). Tier 4: Express Lanes (12 approved agent-to-agent direct lanes, trust≥60 eligibility, 10/day cap, auto-suspend on 3 failures). Tier 5: Environmental Awareness (8 scan schedules, NOISE→CRITICAL classification, signal routing matrix). Tier 6: Collective Intelligence (5 decision protocols: direct delegation, specialist+critique, chain of debates, tree of thought, full council). Files: `server/trust-engine.ts`, `server/evaluators.ts`, `server/express-lanes.ts`, `server/proactive-engine.ts`, `server/environmental-awareness.ts`, `server/collective-intelligence.ts`. DB tables: `trust_scores`, `proactive_actions`, `express_lane_usage`, `evaluator_snapshots`. API routes: `/api/agency/*`. Context auto-injected into persona system prompts.
- **Autonomous Self-Tuning Engine:** `server/auto-tuner.ts` — runs every 24h, collects 7-day performance metrics (task success/failure rates, trust score distribution, evaluator warnings/criticals, express lane usage, proactive action outcomes), computes parameter adjustments with confidence scores, and applies changes within safe bounds. Tunable: trust score deltas, evaluator warning/critical thresholds, express lane daily caps, CI protocol limits, PAB budgets. All adjustments clamped to hardcoded safe min/max ranges. Manual override and reset-to-defaults available via `/api/agency/auto-tuner/*` endpoints. **Bootstrap mode** activates for new tenants (5-19 tasks/7d) — uses tighter safety bounds, caps confidence at 0.55, limits to 2 changes per cycle. Normal mode requires 20+ tasks/7d. Snapshots persisted to `evaluator_snapshots` table for audit trail.
- **Per-Tool Rate Limiter:** `server/tool-rate-limiter.ts` — sliding-window rate limiting per tenant per tool. Expensive tools (deep_research, produce_video, browser, etc.) have strict per-minute/per-hour/per-day caps. Default tools get generous limits. In-memory cache with periodic cleanup. Wired into chat-engine tool execution pipeline — blocked calls return actionable error messages. Prevents runaway agent loops from burning API budget.
- **Dynamic Express Lane Caps:** Express lane daily caps now scale with trust scores. Average trust of both agents in a lane determines a multiplier: trust ≥90 → 2x cap, ≥80 → 1.5x, ≥70 → 1.2x, <65 → 0.8x. High-trust agent pairs get more throughput; low-trust pairs get reduced capacity. Minimum floor of 3 per day.
- **Agentic Design Patterns:** Includes Parallel Tool Execution, Critique Agent / Self-Correction Loop, Chain of Debates, Tree-of-Thought Reasoning, Proactive Resource Prediction, and Adaptive Model Downgrade.
- **OpenClaw-Inspired Features:** MCP Client Support, Webhook Triggers, Channel Routing, Skills Marketplace, Live Canvas (renders `html-canvas` blocks), Personality Files (per-tenant SOUL.md/STYLE.md/USER.md/RULES.md/CONTEXT.md customization), Firecrawl Search, Per-Agent Reasoning Config, and Smart Error Classification.
- **Communication & Marketing:** Social Marketing skills, AgentMail, WhatsApp, Discord Bot, and Telegram Bot Integration.
- **Browser & Web:** Tenant-scoped Virtual Browser with Puppeteer, screenshots, form filling, Credential Vault, vision-enabled capabilities (screenshots passed to vision-capable LLMs), and Live Browser Preview (floating panel streams real-time screenshots and status during agent browsing).
- **Payments & Billing:** Stripe and Coinbase integration for subscriptions, crypto payments, usage metering, and BYOK tier system.
- **File & Storage:** Secure Tenant File Storage (Replit Object Storage), File Manager UI, Google Drive Integration (auto-sync uploads to `User Vault/<tenant>` Drive folders), and PDF Toolkit.
- **Security & System:** Provider Key Proxy, Helmet CSP, DB-persisted Password Reset Tokens, Health Monitor, soft Account Deletion, Admin Authorization, and IronClaw-inspired SafetyLayer (LeakDetector, PolicyEngine, injection protection).
- **Stability Watchdog:** Autonomous infrastructure-level watchdog managed by Chief of Staff for auto-remediation of stuck tasks, flaky tasks, heartbeat restarts, memory pressure, stale data cleanup, and pool health monitoring.
- **Frontend Pages:** Over 25 pages for dashboards, chat, agent management, settings, reports, and user-specific functionalities.
- **Database:** PostgreSQL with Drizzle ORM, featuring 33+ tables.

## External Dependencies
- **AI Providers:** OpenAI, Anthropic, Google Gemini, xAI, Perplexity, OpenRouter (DeepSeek, MiniMax, Qwen, Llama, Kimi).
- **Payments:** Stripe (Connect, BYOK), Coinbase (CDP SDK, Commerce API).
- **Services:** ElevenLabs (STT only), Google Drive, Firecrawl (web scraping, crawling, site mapping + DB storage in `scraped_pages` table), Jina AI (Reader).
- **Storage:** Replit Object Storage, PostgreSQL.
- **Communications:** AgentMail, WhatsApp Web (Baileys), Discord Bot.
- **Geolocation:** ip-api.com.
- **Weather:** Open-Meteo API.