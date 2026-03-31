# VisionClaw — Agentic AI Corporation Platform

## Overview
VisionClaw is an agentic AI platform designed as a fully autonomous AI corporation, built by AI Buddy LLC (Illinois). It features 14 specialized AI personas operating as a complete corporate team. The platform runs under rules-driven autonomous governance based on NIST, OWASP, and Singapore IMDA standards, implementing the Claude Opus 4.6 Agentic Spec. Agents handle tasks autonomously and escalate only mission-critical issues to human owners. Built for multi-tenancy, cost-effectiveness, and robust security.

**Platform Stats (March 2026):**
- 130+ server-side TypeScript files (~89,000 lines)
- 38+ frontend pages
- 66 database tables
- 96 built-in AI tools + custom tool support (includes sync_personas)
- 23 active skills
- 14 AI personas
- 36+ models across 8+ providers
- 40 governance rules
- 11 research programs
- 7 research schedules
- 13 heartbeat tasks

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
- **Model tier priority (OAuth-first)**: Fast=Gemini 3 Flash → Gemini 2.5 Flash → GPT-4.1 Mini, Balanced=Gemini 3 Flash → GPT-4.1 → Sonnet 4, Powerful=Gemini 3.1 Pro → GPT-4.1 → Opus 4.6 → Sonnet 4.6, Reasoning=Gemini 3.1 Pro → o4-mini → Opus 4.6. OAuth subscription and Claude Runner always checked first. OpenRouter models are last-resort fallbacks only. Auto-route logging with 60s dedup.
- **Subscription-First Routing (BYOS)**: OAuth tokens from OpenAI ChatGPT Plus and Google Gemini used as PRIMARY inference. Google OAuth via redirect with PKCE (`generative-language` scope stored as provider='google'). OpenAI via code-paste with STS exchange. Drive connector stored as provider='google-workspace' (separate from Gemini). `markSubscriptionFailed(provider, tenantId, statusCode)` with tiered TTLs.
- **Admin PIN**: HMAC-SHA256 with salt "visionclaw-pin-v1". Set via `ADMIN_PIN` env var. Admin = tenant_id 1.
- **ElevenLabs TTS**: Creator plan active (110K chars/month, 23 voices). Google TTS also available. `continuous=false` is correct.
- **YouTube OAuth**: provider='youtube' in oauth_subscriptions. Uses YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET (Web Application type, not Desktop). Redirect URI: `/api/youtube/callback`. Token auto-refreshed via OAUTH_PROVIDERS config.
- **Research model validation**: On startup, `fixResearchProgramModels()` auto-corrects any program with an unknown model. `startResearchSession()` validates before session creation. Duplicate-session protection prevents double runs.
- **Embedding cache**: 30s TTL, max 50 entries — prevents duplicate embedding API calls within same request.
- **Cross-persona knowledge**: Vector search pulls relevant research findings from ANY domain, not just the assigned persona. 2000-char budget with persona-specific entries ranked first.

## System Architecture
VisionClaw employs a modern web architecture with a single-port frontend and API.

**Frontend:**
- **Stack:** React 18, Vite, shadcn/ui, TailwindCSS, Wouter, TanStack Query v5, Framer Motion.
- **UI/UX:** Command Center Dashboard, grouped sidebar, auto-named conversations, 3-step onboarding, usage dashboard, legal pages, cookie consent, error boundary, dark mode, code splitting, scroll-to-bottom button, stop generating button, regenerate last response, keyboard shortcuts.

**Backend:**
- **Stack:** Express.js, TypeScript, Drizzle ORM, Zod, Helmet.
- **Features:** Real-time AI responses via SSE, robust authentication (Replit Auth, Email + Password, Admin PIN), DB-backed sessions, timing-safe cryptography, password policy, email verification, and strict multi-tenant data isolation.

**Core Features:**
- **AI Agent System:** A 14-persona agent team with an LLM-powered CEO Orchestrator, Semantic Tool Router, Self-Improvement Engine, Adaptive Execution & Self-Healing, and Auto Model Router with OAuth-first priority.
- **Smart Model Auto-Selection:** Task Complexity Classifier, Multimodal-Aware Routing, Auto-Thinking Mode, Persona Cost Tier Integration, Model Capabilities Registry, and `[auto-route]` logging with 60s dedup.
- **Autonomous Operations:** Heartbeat Engine (13 tasks), Scheduled Tasks, Corporation Report Export (PDF to Google Drive), Human-in-the-Loop (HITL) Confirmation Gate, and Felix Approval Gate.
- **Agentic Infrastructure:** Persistent Agent Desks, Internal Channels, Event Bus, 92 Agentic Tools, Autonomy Rules, Outcome Tracking, and Watchlist Monitoring.
- **Process Governor:** A 40-rule governance engine across 7 categories, supported by 25 condition evaluators, an emergency Kill Switch, and a Governance Frameworks Knowledge Base.
- **Quarterly Intelligence System:** Governance Research Scanner and Model Registry Refresh.
- **Nightly Autoresearch System:** Inspired by Karpathy's autoresearch — 11 autonomous research programs (5 nightly + 6 AI Buddy business) run via 7 research schedules. Each program spawns 5-15 experiments per session using the keep/discard loop. Results stored in research_experiments with executive summaries. Heartbeat checks `research_schedules` every tick. **Self-injection pipeline**: KEEP'd findings (score ≥6) auto-inject into `agent_knowledge` for the relevant persona with vector embeddings (14-day TTL, 30d for security). High-score findings (≥8) also generate **code proposals** (`code_proposals` table). Model Intelligence findings queue `model_registry_updates`. Startup model validation auto-corrects unknown models. Duplicate-session protection prevents double runs. API: `GET/PATCH /api/research/code-proposals`.
- **Auto-Deposit Intelligence Loop:** Research findings automatically route to the correct project folder AND knowledge base with vector embeddings. Programs 2-7 (AI Buddy business) → AI Buddy Health project (#13). Programs 8-12 (nightly platform) → VisionClaw Agent Platform project (#17). Each kept finding gets its own knowledge entry with immediate embedding generation for semantic search. The system gets smarter with every completed research session.
- **Adaptive Research Backpressure:** Self-healing throttle system that detects DB connection timeouts and automatically adjusts. Level 1 (1-2 timeouts): 2x slower experiments. Level 2 (3-5 timeouts): 3x slower + reschedule all timers. Level 3 (6+ timeouts): pause ALL research for 5 minutes, then resume at 2x. Auto-recovers to normal speed after sustained DB health. Max 2 concurrent sessions enforced. Sequential execution for nightly run-all schedules. The research engine never overwhelms the database — it senses pressure and backs off on its own.
- **Weekly AI Buddy Research Schedule:** 6 AI Buddy business programs run every Sunday at midnight CT, staggered 15 minutes apart to avoid provider overload: Emotional Eating (12:00), Content Marketing (12:15), Competitive Intel (12:30), Revenue Strategy (12:45), Companion Messages (1:00), Legal Framework (1:15). Nightly platform programs continue running at 2 AM daily.
- **Vector Knowledge Library:** pgvector-powered cross-persona knowledge retrieval. Research findings get text-embedding-3-small vectors at injection time. `buildSystemPrompt` uses semantic similarity to pull relevant findings from ANY persona's research. 2000-char knowledge budget. 30s embedding cache prevents duplicate API calls.
- **Deep Research:** Defines Research Programs, Autonomous Sessions, Research Scheduling, and AI-generated Session Summaries with Dev-to-Prod Auto-Sync.
- **Agentic Intelligence Engines:** Decision-Making, Predictive Analytics, and Process Optimization engines.
- **Intelligence & Memory:** Hierarchical Memory Graph, Three-Tier Semantic Memory, BM25/Vector/Hybrid Document Search, Zero-Loss Compaction, Per-Tenant Memory Backup, and `pgvector` for native PostgreSQL vector similarity.
- **Data Protection System:** Comprehensive data safety layer including soft-delete for conversations, message save verification, compaction safety gate, Google Drive backup per tenant, and admin endpoints.
- **Platform Capabilities Briefing:** Auto-injected system prompt for personas enumerating configured API keys, OAuth subscriptions, server capabilities, connected services, available tools, and AI models.
- **Finance Market Intelligence Tools:** 4 tools for real-time news, OHLCV stock data, stock search, and market overview, mapped to Cassandra and Radar.
- **95 AI Tools:** Comprehensive toolset for communication, research, documents, code execution, virtual browsing, web scraping, agentic operations, Google Workspace, and system management, including `generate_dashboard` for Live Canvas, `strategic_interview` for Socratic requirement gathering, `export_persona` for portable agent definitions, `render_diagram` for Mermaid-to-image diagram generation, `vibevoice_transcribe` for Microsoft VibeVoice ASR speech-to-text, `create_slides` for PowerPoint generation via 2slides API, and `trend_research` for multi-source trend analysis (Reddit, HN, Polymarket, X — inspired by /last30days).
- **23 Active Skills:** 8 business operations skills (Document & Delivery Pipeline, Research & Competitive Intelligence, Project Management, Financial Analysis, Content Marketing, Legal & Compliance, Sales & Client Relations, Business Operations & Strategy) + 15 platform skills, all injected into agent system prompts via `## ACTIVE SKILLS` block.
- **Project Brain System:** Auto-maintained `.md` knowledge file per project, injected into project conversations.
- **Project Continuity System:** Auto-transcript system saves full timestamped markdown transcripts. Auto-asset capture detects deliverables and saves them. Prior conversation transcripts and messages are injected for continuity.
- **Auto-Project Detection:** Automatically creates a project when user signals intent to build something.
- **Corporate Operations Scaffolding System:** 65 governance-wired operation scaffolds across 12 departments, 6 cross-department workflows, task classification engine, operation-aware tool routing, with inline governance rules (trust checks, never-auto actions, express lane awareness, autonomy levels, blocker escalation).
- **Felix Auto-Orchestration:** For complex multi-step requests, Felix uses the `orchestrate` tool to decompose tasks into a DAG, assigns specialist personas, and executes steps via child conversations.
- **Multi-Layer Delegation:** Delegation depth is configurable up to 5 levels deep (MAX_DELEGATION_DEPTH in chat-engine.ts). Depth flows through delegate_task → delegateTaskFromChat → processMessage → child calls. Tool restrictions scale by depth: depth 2+ blocks spawn/subagents, depth 3+ blocks orchestrate, depth 5 blocks all delegation. Specialists at depth ≤4 can sub-delegate; depth 4+ agents are told to complete work directly. Trust/expansion context injected at depth ≤1.
- **Execution Supervisor:** Monitors and controls agent tool execution quality via Circuit Breaker, Output Validation, Hallucination Detection, and Execution Budget Warnings. Provides Fallback Suggestions.
- **Agency Expansion Framework (6 Tiers):** Full Earned Autonomy system including Evaluators (9 types), Trust Score Engine (9 categories), Proactive Initiative Engine (PAB budgets), Express Lanes (12 approved lanes), Environmental Awareness (8 scan types), and Collective Intelligence (4 protocols).
- **Autonomous Self-Tuning Engine:** Runs every 24h, collects 7-day performance metrics, computes parameter adjustments, and applies changes within safe bounds. Includes a bootstrap mode for new tenants and dynamic express lane caps based on trust scores.
- **Per-Tool Rate Limiter:** Sliding-window rate limiting per tenant per tool to prevent runaway agent loops.
- **Agentic Design Patterns:** Includes Parallel Tool Execution, Critique Agent / Self-Correction Loop, Chain of Debates, Tree-of-Thought Reasoning, Proactive Resource Prediction, and Adaptive Model Downgrade.
- **Instinct Learning System:** Agents automatically extract reusable execution patterns from successful multi-tool tasks. Patterns stored as instincts in memory with confidence scores; after 3+ successful observations above 70% confidence, instincts "graduate" to permanent knowledge entries. Graduated patterns are injected into system prompts so agents get progressively better at recurring task types. Inspired by everything-claude-code's continuous learning system.
- **Auto-QA Pipeline (De-Sloppify):** After successful delegation, Proof (persona 8) automatically reviews output quality asynchronously. Scores on completeness, accuracy, clarity, and professionalism (1-10 scale). Results visible in the live delegation event feed with color-coded verdict badges. Non-blocking — runs fire-and-forget so delegation returns are never delayed.
- **Per-Task Cost Tracking:** Every agent interaction emits real-time cost data (USD, token counts, duration, model breakdown) through the delegation event system. Cost badges display in the live delegation feed. Uses the existing LiveCostTracker from resource-predictor.ts integrated with delegation events.
- **OpenClaw-Inspired Features:** MCP Client Support, Webhook Triggers, Channel Routing, Skills Marketplace, Live Canvas, Personality Files, Firecrawl Search, Per-Agent Reasoning Config, and Smart Error Classification.
- **Communication & Marketing:** Social Marketing skills, AgentMail, WhatsApp, Discord Bot, and Telegram Bot Integration.
- **Browser & Web:** Tenant-scoped Virtual Browser with Puppeteer, screenshots, form filling, Credential Vault, vision-enabled capabilities, and Live Browser Preview.
- **Payments & Billing:** Stripe and Coinbase integration for subscriptions, crypto payments, usage metering, and BYOK tier system.
- **File & Storage:** Secure Tenant File Storage (Replit Object Storage), File Manager UI, Google Drive Integration, and PDF Toolkit.
- **Security & System:** Provider Key Proxy, Helmet CSP, DB-persisted Password Reset Tokens, Health Monitor, soft Account Deletion, Admin Authorization, and IronClaw-inspired SafetyLayer.
- **Stability Watchdog:** Autonomous infrastructure-level watchdog for auto-remediation of stuck tasks, flaky tasks, heartbeat restarts, memory pressure, stale data cleanup, and pool health monitoring.
- **Frontend Pages:** 38 pages for dashboards, chat, agent management, settings, reports, and user-specific functionalities.
- **Database:** PostgreSQL with Drizzle ORM, featuring 66 tables.
- **Claude Runner Bridge:** Local OpenAI-compatible bridge that routes Anthropic model requests through Claude Code CLI for $0 per-token cost with Max plan authentication, falling back to standard API if unavailable.

### Presentation & Visualization Features
- **Mermaid Diagram Rendering (`render_diagram`):** Generates flowcharts, architecture maps, sequence diagrams, state diagrams, class diagrams, Gantt charts, org charts, and any Mermaid-supported diagram type as PNG images via the mermaid.ink API. Supports configurable themes (default, dark, forest, neutral) and custom background colors. Rendered images auto-upload to Google Drive with shareable links. Agents can create professional technical diagrams entirely through conversation.
- **Live Delegation Event Feed:** Real-time Server-Sent Events (SSE) system that streams agent activity as it happens. Built on an in-memory EventEmitter with tenant-isolated event routing, 5-minute TTL auto-cleanup, and per-conversation subscription support. Events include agent starts, tool calls, sub-delegations, completions, and errors — all with human-readable descriptions. Frontend overlay component displays animated activity bubbles with color-coded agent icons, depth indicators, and timestamps. Fully tenant-isolated — users only see their own agents' activity.
- **Voice Narration for Agent Activity:** Built-in browser-native speech synthesis narration that speaks agent activity aloud in plain English as it happens. Uses Chrome's high-quality voices (completely free, no API calls, no usage limits). Narration queue prevents overlapping speech. Toggle on/off from the activity panel. Generates natural sentences like "Felix is bringing in Radar to help with this" and "Radar is searching the web" — no technical jargon, no markdown formatting, no hashtags.
- **Microsoft VibeVoice ASR Integration:** VibeVoice ASR (`vibevoice_transcribe`) — 60-minute single-pass speech-to-text with speaker diarization (who/when/what), 50+ languages, custom hotwords, via HF Inference API with Gradio fallback. API endpoints: `/api/vibevoice/info`, `/api/vibevoice/transcribe`. Note: VibeVoice TTS was removed (Microsoft pulled the model from public access in Sept 2025).
- **Chart Generation (`generate_chart`):** Bar, line, pie, and area charts rendered inline in chat using Recharts. Agents provide data and the frontend renders interactive, responsive visualizations.
- **Interactive Dashboards (`generate_dashboard`):** Full HTML/CSS/JS dashboards rendered in a live canvas inside chat messages. Supports KPI displays, data tables, status boards, and custom visualizations with built-in utility classes.
- **AI Image Generation (`generate_social_image`):** Creates images via AI generation APIs and auto-uploads to Google Drive. Used for social media content, presentation visuals, and creative assets.
- **Video Production (`produce_video`):** End-to-end video creation with TTS narration (OpenAI TTS primary). Slide generation and MP4 compilation. Completed videos auto-upload to Google Drive with shareable links.
- **Audio Generation (`generate_audio`):** Text-to-speech generation defaulting to OpenAI TTS (high quality, reliable). ElevenLabs available as alternative provider.
- **Multi-Provider TTS System:** Three-tier TTS with automatic failover — OpenAI TTS (PRIMARY, onyx voice default), ElevenLabs (backup), Google Translate TTS (edge fallback). Browser-native speech synthesis also available for zero-cost client-side narration.
- **PowerPoint Slide Generation (`create_slides`):** Professional .pptx presentations via 2slides API. Theme search, AI content generation, auto-upload to Google Drive with shareable links.

## External Dependencies
- **AI Providers:** OpenAI (OAuth + direct), Anthropic (Claude Runner bridge + direct), Google Gemini (OAuth + integration), xAI, Perplexity, OpenRouter (DeepSeek, MiniMax, Qwen, Llama, Kimi, Z.ai GLM, Nemotron, Mistral), Claude Runner (CLI bridge, optional).
- **Payments:** Stripe (Connect, BYOK), Coinbase (CDP SDK, Commerce API).
- **Services:** ElevenLabs (TTS + STT), Google Drive, Firecrawl (web scraping, crawling, site mapping), Jina AI (Reader), mermaid.ink (diagram rendering).
- **Storage:** Replit Object Storage, PostgreSQL with pgvector.
- **Communications:** AgentMail, WhatsApp Web (Baileys), Discord Bot, Telegram Bot.
- **Geolocation:** ip-api.com.
- **Weather:** Open-Meteo API.

## Key Files
- `server/chat-engine.ts` — Core message processing, model routing, tool execution loop, delegation event emission
- `server/tools.ts` — 96 tool definitions and executeTool dispatcher
- `server/heartbeat.ts` — Heartbeat engine, delegation execution, scheduled tasks
- `server/ceo-orchestrator.ts` — Felix's multi-step task decomposition engine
- `server/delegation-events.ts` — Real-time delegation event emitter with tenant isolation
- `server/deep-interview.ts` — Socratic interview engine with pendingDimensionId tracking
- `server/persona-export.ts` — Portable persona definition export
- `server/voice.ts` — Multi-provider TTS/STT with automatic failover
- `server/tts-config.ts` — TTS provider configuration (ElevenLabs, OpenAI, Google)
- `server/google-drive.ts` — Google Drive upload, sharing, and folder management
- `server/routes.ts` — All API endpoints including SSE delegation event streaming
- `shared/schema.ts` — Drizzle ORM schema for all 66 tables
- `client/src/pages/chat.tsx` — Main chat interface with delegation live feed
- `server/persona-sync.ts` — Persona documentation sync engine (tools_doc, agents_doc) with mutex and admin-only scope
- `server/instinct-learning.ts` — Pattern extraction from successful multi-tool tasks, instinct graduation to knowledge
- `server/auto-qa.ts` — Automatic quality review of delegated outputs via Proof persona
- `client/src/components/delegation-live.tsx` — Agent activity overlay with voice narration, cost badges, QA verdicts

## Post-Demo Backlog (Circle Back After April 14)
- **BillionMail** (https://github.com/Billionmail/BillionMail) — Open-source self-hosted mail server + email marketing platform. AGPLv3. Unlimited sending, open/click analytics, subscriber management, built-in webmail (RoundCube). Requires separate Linux VPS with Docker + domain DNS (SPF/DKIM/DMARC). Could replace AgentMail for tenant email campaigns, newsletters, drip sequences. Agents could drive campaigns via API. No per-email fees.
