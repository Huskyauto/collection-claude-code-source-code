# VisionClaw — Agentic AI Corporation Platform

## Overview
VisionClaw is an agentic AI platform designed as a fully autonomous AI corporation, featuring 14 specialized AI personas. It operates under rules-driven autonomous governance based on NIST, OWASP, and Singapore IMDA standards, implementing the Claude Opus 4.6 Agentic Spec. The platform aims to provide a complete corporate team experience through AI, with agents handling tasks autonomously and escalating only mission-critical issues to human owners. It is built for multi-tenancy, cost-effectiveness, and robust security.

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
- Cost-conscious ($600+ spent on AI calls). Minimize unnecessary AI token usage. Claude Runner bridge active for $0 per-token Anthropic routing when Max plan authenticated. Cost-aware auto-routing always prefers free models (Replit OpenAI, Gemini Integration, Claude Runner) before cheap (OpenRouter) before paid (xAI, Perplexity). All 36 models tagged with costClass (free/cheap/paid). Self-healing port management on both Express (5000) and Claude Runner (7779) — auto-kills stale processes and retries.
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
- **UI/UX:** Command Center Dashboard, grouped sidebar, auto-named conversations, 3-step onboarding, usage dashboard, legal pages, cookie consent, error boundary, dark mode, code splitting, scroll-to-bottom button, stop generating button, regenerate last response, keyboard shortcuts.

**Backend:**
- **Stack:** Express.js, TypeScript, Drizzle ORM, Zod, Helmet.
- **Features:** Real-time AI responses via SSE, robust authentication (Replit Auth, Email + Password, Admin PIN), DB-backed sessions, timing-safe cryptography, password policy, email verification, and strict multi-tenant data isolation.

**Core Features:**
- **AI Agent System:** A 14-persona agent team with an LLM-powered CEO Orchestrator, Semantic Tool Router, Self-Improvement Engine, Adaptive Execution & Self-Healing, and Auto Model Router.
- **Smart Model Auto-Selection:** Task Complexity Classifier, Multimodal-Aware Routing, Auto-Thinking Mode, Persona Cost Tier Integration, and a Model Capabilities Registry.
- **Autonomous Operations:** Heartbeat Engine, Scheduled Tasks, Corporation Report Export (PDF to Google Drive), Human-in-the-Loop (HITL) Confirmation Gate, and Felix Approval Gate.
- **Agentic Infrastructure:** Persistent Agent Desks, Internal Channels, Event Bus, Agentic Tools, Autonomy Rules, Outcome Tracking, and Watchlist Monitoring.
- **Process Governor:** A 40-rule governance engine across 7 categories, supported by 25 condition evaluators, an emergency Kill Switch, and a Governance Frameworks Knowledge Base.
- **Quarterly Intelligence System:** Governance Research Scanner and Model Registry Refresh.
- **Nightly Autoresearch System:** Inspired by Karpathy's autoresearch — 5 autonomous nightly research programs (AI Model Intelligence, Tools & Techniques Scanner, Competitive Platform Analysis, Agent Architecture Research, Security & Safety Intelligence) run at 2 AM Central via research schedule. Each program spawns 8-15 experiments per session using the keep/discard loop. Results stored in research_experiments with executive summaries. Heartbeat checks `research_schedules` every tick. **Self-injection pipeline**: KEEP'd findings (score ≥6) auto-inject into `agent_knowledge` for the relevant persona (14-day TTL, 30d for security). High-score findings (≥8) also generate **code proposals** (`code_proposals` table) — concrete TypeScript diffs validated against the live codebase, queued for human review before application. Model Intelligence findings additionally queue `model_registry_updates` for admin approval. API: `GET/PATCH /api/research/code-proposals`.
- **Deep Research:** Defines Research Programs, Autonomous Sessions, Research Scheduling, and AI-generated Session Summaries with Dev-to-Prod Auto-Sync.
- **Agentic Intelligence Engines:** Decision-Making, Predictive Analytics, and Process Optimization engines.
- **Intelligence & Memory:** Hierarchical Memory Graph, Three-Tier Semantic Memory, BM25/Vector/Hybrid Document Search, Zero-Loss Compaction, Per-Tenant Memory Backup, and `pgvector` for native PostgreSQL vector similarity.
- **Data Protection System:** Comprehensive data safety layer including soft-delete for conversations, message save verification, compaction safety gate, Google Drive backup per tenant, and admin endpoints.
- **Platform Capabilities Briefing:** Auto-injected system prompt for personas enumerating configured API keys, OAuth subscriptions, server capabilities, connected services, available tools, and AI models.
- **Finance Market Intelligence Tools:** 4 tools for real-time news, OHLCV stock data, stock search, and market overview, mapped to Cassandra and Radar.
- **89+ AI Tools:** Comprehensive toolset for communication, research, documents, code execution, virtual browsing, web scraping, agentic operations, Google Workspace, and system management, including `generate_dashboard` for Live Canvas.
- **23 Active Skills:** 8 business operations skills (Document & Delivery Pipeline, Research & Competitive Intelligence, Project Management, Financial Analysis, Content Marketing, Legal & Compliance, Sales & Client Relations, Business Operations & Strategy) + 15 platform skills, all injected into agent system prompts via `## ACTIVE SKILLS` block.
- **Project Brain System:** Auto-maintained `.md` knowledge file per project, injected into project conversations.
- **Project Continuity System:** Auto-transcript system saves full timestamped markdown transcripts. Auto-asset capture detects deliverables and saves them. Prior conversation transcripts and messages are injected for continuity.
- **Auto-Project Detection:** Automatically creates a project when user signals intent to build something.
- **Corporate Operations Scaffolding System:** 65 governance-wired operation scaffolds across 12 departments, 6 cross-department workflows, task classification engine, operation-aware tool routing, with inline governance rules (trust checks, never-auto actions, express lane awareness, autonomy levels, blocker escalation).
- **Felix Auto-Orchestration:** For complex multi-step requests, Felix uses the `orchestrate` tool to decompose tasks into a DAG, assigns specialist personas, and executes steps via child conversations.
- **Execution Supervisor:** Monitors and controls agent tool execution quality via Circuit Breaker, Output Validation, Hallucination Detection, and Execution Budget Warnings. Provides Fallback Suggestions.
- **Agency Expansion Framework (6 Tiers):** Full Earned Autonomy system including Evaluators, Trust Score Engine, Proactive Initiative Engine, Express Lanes, Environmental Awareness, and Collective Intelligence.
- **Autonomous Self-Tuning Engine:** Runs every 24h, collects 7-day performance metrics, computes parameter adjustments, and applies changes within safe bounds. Includes a bootstrap mode for new tenants and dynamic express lane caps based on trust scores.
- **Per-Tool Rate Limiter:** Sliding-window rate limiting per tenant per tool to prevent runaway agent loops.
- **Agentic Design Patterns:** Includes Parallel Tool Execution, Critique Agent / Self-Correction Loop, Chain of Debates, Tree-of-Thought Reasoning, Proactive Resource Prediction, and Adaptive Model Downgrade.
- **OpenClaw-Inspired Features:** MCP Client Support, Webhook Triggers, Channel Routing, Skills Marketplace, Live Canvas, Personality Files, Firecrawl Search, Per-Agent Reasoning Config, and Smart Error Classification.
- **Communication & Marketing:** Social Marketing skills, AgentMail, WhatsApp, Discord Bot, and Telegram Bot Integration.
- **Browser & Web:** Tenant-scoped Virtual Browser with Puppeteer, screenshots, form filling, Credential Vault, vision-enabled capabilities, and Live Browser Preview.
- **Payments & Billing:** Stripe and Coinbase integration for subscriptions, crypto payments, usage metering, and BYOK tier system.
- **File & Storage:** Secure Tenant File Storage (Replit Object Storage), File Manager UI, Google Drive Integration, and PDF Toolkit.
- **Security & System:** Provider Key Proxy, Helmet CSP, DB-persisted Password Reset Tokens, Health Monitor, soft Account Deletion, Admin Authorization, and IronClaw-inspired SafetyLayer.
- **Stability Watchdog:** Autonomous infrastructure-level watchdog for auto-remediation of stuck tasks, flaky tasks, heartbeat restarts, memory pressure, stale data cleanup, and pool health monitoring.
- **Frontend Pages:** Over 25 pages for dashboards, chat, agent management, settings, reports, and user-specific functionalities.
- **Database:** PostgreSQL with Drizzle ORM, featuring 33+ tables.
- **Claude Runner Bridge:** Local OpenAI-compatible bridge that routes Anthropic model requests through Claude Code CLI for $0 per-token cost with Max plan authentication, falling back to standard API if unavailable.

## External Dependencies
- **AI Providers:** OpenAI, Anthropic, Google Gemini, xAI, Perplexity, OpenRouter (DeepSeek, MiniMax, Qwen, Llama, Kimi), Claude Runner (CLI bridge, optional).
- **Payments:** Stripe (Connect, BYOK), Coinbase (CDP SDK, Commerce API).
- **Services:** ElevenLabs (STT only), Google Drive, Firecrawl (web scraping, crawling, site mapping), Jina AI (Reader).
- **Storage:** Replit Object Storage, PostgreSQL.
- **Communications:** AgentMail, WhatsApp Web (Baileys), Discord Bot.
- **Geolocation:** ip-api.com.
- **Weather:** Open-Meteo API.