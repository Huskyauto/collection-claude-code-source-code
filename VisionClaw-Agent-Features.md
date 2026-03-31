# VisionClaw Agent — Complete Feature Highlights

**A Self-Actualizing Multi-Tenant Agentic AI Corporation Platform**

~41,000 lines of TypeScript | 170+ files | 22 page components | 190+ API endpoints | 49+ agentic tools | 33 database tables

---

## Platform Overview

- Full-stack monolith: React 18 + Express.js + PostgreSQL, single-port deployment (port 5000)
- Multi-tenant SaaS — users sign up, get their own isolated workspace, build their own AI projects
- 14-persona AI agent team with autonomous background tasks
- 6+ AI provider integrations with intelligent routing
- Real-time streaming via Server-Sent Events (SSE)
- Dark/light theme with full mobile PWA support
- Installable as a Progressive Web App on any device

---

## Authentication & User Management

- Three sign-up methods: Replit Social Login (Google/Apple/GitHub via OpenID Connect), Email + Password, Admin PIN
- PBKDF2-SHA512 password hashing (100,000 iterations) with timing-safe comparison
- HMAC-SHA256 PIN hashing with timing-safe comparison
- Database-backed sessions (survive server restarts)
- 7-day session tokens stored in localStorage
- Auto-provisioning: new users automatically get a tenant record on first login
- Account linking prevents duplicate accounts for Replit social login users
- Auth-aware file serving with query parameter token support

---

## Multi-Tenant Isolation

- Every piece of data scoped by `tenant_id` — conversations, memories, knowledge, heartbeat tasks, marketing data, experiments, browser sessions, email inboxes
- IDOR-protected routes verify ownership on all CRUD operations
- Plan tiers: Trial (5 conversations), Starter, Pro, Enterprise with per-plan feature gating
- Trial limits with upgrade prompts and banners
- Admin vs user separation — admin has full access, non-admin tenants see filtered sidebar
- Per-tenant email inboxes auto-provisioned via AgentMail
- Per-tenant browser contexts with separate cookies/storage
- Per-tenant API key management (BYOK)

---

## AI Chat Engine

- Unlimited concurrent conversations, each with its own model and persona
- Real-time token streaming via SSE — tokens appear as generated
- Markdown rendering with syntax highlighting, LaTeX math, and code blocks
- "Think then Act" reasoning mode — step-by-step thoughts in collapsible blocks
- Conversation management — create, rename, delete, search
- Auto-titling based on first message
- Abort generation mid-stream with cancel button
- Multi-round tool loops — AI chains up to 5 tool calls per turn
- Copy to clipboard, view raw content
- Smart Context Injection — time-of-day greeting, recent conversations, remembered user facts
- Context window auto-compaction — conversations over 20 messages are summarized
- Conversation truncation at 95% context usage (preserves system prompt + recent history)

---

## Multi-Provider AI Routing

- **OpenAI**: GPT-5.4, GPT-5.1, GPT-5, GPT-5-Mini, GPT-5-Nano, GPT-4o, o4-mini
- **Anthropic**: Claude Opus 4.6, Claude Sonnet 4.6, Claude Sonnet 4
- **Google**: Gemini 3 Flash Preview, Gemini 2.5 Pro
- **xAI**: Grok 4.1, Grok-3, Grok-3-mini
- **Perplexity**: Sonar, Sonar Pro, Sonar Deep Research, Sonar Reasoning Pro
- **OpenRouter**: DeepSeek V3.2, DeepSeek R1, GLM-5, GLM-4.5, Kimi K2.5, MiniMax M2.5, Qwen 3.5, Llama 4, Mistral, and more
- Dynamic model discovery from each provider's API
- Cost tier badges per model (Free, Low, Medium, High, Premium)
- Per-conversation model selection — switch models mid-conversation
- Automatic failover if a provider is unavailable (with tool-support recomputation)
- Provider API key management UI with connection testing

---

## Intelligent Auto-Select Router

- Classifies each message across 10 task categories: simple-chat, coding, reasoning, research, vision, agentic, writing, translation, data-analysis, general
- Fast heuristic classification via pattern matching (< 1ms)
- LLM fallback when heuristics are inconclusive
- Only routes to models the user has configured and available
- Route decisions streamed as SSE events, stored in message metadata
- Amber badges in UI showing the routed model name
- Activate by selecting "Auto Select" in the model dropdown

---

## Intelligent Model Cost Router (Heartbeat)

- Automatically assigns cheapest appropriate model to autonomous tasks
- **Fast tier ($)**: Radar, Atlas, Scribe, Chief of Staff → gpt-5-nano
- **Balanced tier ($$)**: Apollo, Forge, Proof → gpt-5-mini
- **Powerful tier ($$$)**: VisionClaw, Felix, Neptune → conversation model
- User-created tasks keep their explicit model selection
- Heartbeat logs record the effective (routed) model for cost analytics

---

## 12-Persona Agent System

- **VisionClaw** — Personal Assistant (default conversational agent)
- **Felix** — CEO (revenue growth, high-leverage execution)
- **Forge** — Staff Engineer (code quality, reliability)
- **Teagan** — Content Marketing (strategy and copy)
- **Chief of Staff** — Operations Director (task routing, chain of command)
- **Scribe** — Content Creator (blog posts, social media, emails)
- **Proof** — Content Reviewer (quality gate, approves/revises Scribe's output)
- **Radar** — Intelligence Analyst (daily scans, trend detection)
- **Neptune** — Deep Research (activated on Radar escalation)
- **Apollo** — Revenue & Pipeline (sales tracking, deal progression)
- **Atlas** — Metrics & Reporting (ROI tracking, cost analysis)
- **Agent Blueprint** — Multi-Agent Operator (orchestration and coordination)

### Persona Features
- 8 document fields per persona: Soul, Identity, Memory Doc, Operating Loop, Heartbeat Doc, Tools Doc, Agents Doc, Brand Voice Doc
- Quick-switch dropdown in chat header
- Chain of command enforcement (Neptune only via Radar, no direct CEO access)
- Content two-gate rule (Scribe drafts, Proof must review)
- Full CRUD for custom personas
- Paid users can rename personas (tenant-scoped, original preserved)

---

## 46+ Agentic Tools

### System Tools
- `test_api_keys` — test all configured provider API keys for connectivity and latency
- `check_system_status` — system health: uptime, counts, memory stats, heartbeat status
- `list_models` — list all available models across all providers

### Memory & Knowledge Tools
- `search_memory` — search long-term memory for stored facts
- `create_memory` — store a new fact in long-term memory
- `update_memory` — update or archive an existing memory entry
- `search_knowledge` — search the permanent knowledge base
- `create_knowledge` — add a new entry to the knowledge base
- `recall_context` — retrieve contextual information from memory

### Daily Notes
- `get_daily_notes` — retrieve activity logs for a date or last 7 days
- `write_daily_note` — log events, decisions, or lessons to today's notes

### Communication Tools
- `send_email` — send email via AgentMail (tenant-scoped inbox)
- `check_inbox` — check the AgentMail inbox for new messages
- `list_conversations` — list recent conversations with metadata

### Web & Research Tools
- `web_fetch` — fetch clean text from a URL (via Jina AI reader)
- `web_search` — search the web via Wikipedia, Perplexity, and Jina AI
- `deep_research` — multi-stage pipeline: web search → URL fetching → LLM synthesis into structured reports with sources and confidence scoring

### Browser Tool (18 actions)
- `navigate` — navigate to a URL with SSRF protection
- `screenshot` — capture page screenshot (optional base64 inline)
- `content` — extract page text content
- `click` — click elements by CSS selector
- `type` — type text into form fields
- `evaluate` — run JavaScript on the page
- `smart_browse` — all-in-one: navigate + screenshot + extract text + collect links
- `form_fill` — fill multiple form fields at once with CSS selector mapping
- `open_tab` — open a new tab with URL
- `close_tab` — close a tab by index
- `focus_tab` — switch to a tab by index
- `tabs` — list all open tabs
- `snapshot` — accessibility tree snapshot of page structure
- `wait` — wait for a selector or timeout
- `select` — select dropdown option
- `pdf` — generate PDF of current page
- `health` — check browser connection health
- `close_session` — close the browser session

### PDF Tools
- `analyze_pdf` — extract and analyze text from PDF files
- `create_pdf` — create new PDF documents
- `fill_pdf` — fill PDF form fields
- `edit_pdf` — edit existing PDFs
- `list_pdf_fields` — list fillable fields in a PDF

### Code & Execution Tools
- `execute_code` — run JavaScript in hardened VM sandbox (5s timeout, no network/filesystem)
- `exec` — sandboxed shell command execution
- `show_diff` — generate unified diffs between text content
- `llm_task` — run a focused LLM sub-task with custom prompt

### Planning & Orchestration Tools
- `plan_and_execute` — decompose complex goals into ordered steps with dependency tracking and parallel execution
- `delegate_task` — delegate a task to another persona via the heartbeat system
- `sessions_spawn` — spawn a sub-agent for autonomous task execution
- `sessions_list` — list active agent sessions
- `sessions_history` — retrieve message history from a session
- `sessions_send` — send a message to an active session
- `subagents` — manage sub-agent lifecycle

### Workflow Tools
- `lobster` — manage multi-step Lobster workflows with approval gates

### Visualization
- `generate_chart` — create inline interactive charts (bar, line, pie, area) in chat

### File & Storage Tools
- `list_uploads` — list uploaded files
- `google_drive` — Google Drive operations
- `deliver_product` — digital product delivery (Drive + email)
- `delivery_status` — check delivery status
- `project` — project management (create, search, add files)

### Self-Improvement Tools
- `create_tool` — create new custom tools from natural language descriptions
- `list_custom_tools` — list all custom tools
- `delete_custom_tool` — delete a custom tool
- `log_experiment` — log a self-improvement experiment
- `get_experiments` — retrieve experiment history
- `run_self_improvement` — launch autonomous self-improvement cycle

### Marketing Tools
- `draft_social_post` — draft social media posts (X, LinkedIn, TikTok, Instagram)
- `manage_content_calendar` — content calendar with scheduling and campaigns
- `marketing_analytics` — marketing performance analytics
- `marketing_experiment` — A/B marketing experiment tracking

### Skills Management
- `manage_skills` — create, toggle, and manage 50+ agent skills

---

## Tool Intelligence Features

- **Multi-round tool loops** — chains multiple tool calls in sequence (up to 5 rounds per turn)
- **Self-healing tool loop** — failed tool calls get error analysis hints injected back to the model (up to 2 retries)
- **Tool loop detection** — hash-based tracking prevents infinite loops (generic repeat, ping-pong, poll-no-progress, circuit breaker)
- **Mutation tracking** — classifies every tool call by risk level (read-only, write, destructive)
- **Tool execution timeouts** — 60s default, 120s for slow tools (browser, deep_research, web_fetch)
- **Failover with tool-support recomputation** — provider failure mid-stream triggers cascade to next available model
- **Tool results rendered inline** with collapsible detail sections in chat

---

## Self-Healing & Adaptive Planning

- **Self-Healing Tool Loop**: error detection → structured recovery hints → retry tracking (max 2) → SSE events → UI indicators → graceful degradation
- **Adaptive Re-Planning**: failed task planner steps trigger dynamic restructuring → only affected steps modified → alternative approaches → max 2 re-plans → step ID continuity → progress events

---

## Agent Self-Reflection

- 4-axis evaluation: accuracy, completeness, relevance, tone (1-10 each)
- Automatic refinement if overall score < 7 or any axis < 5
- Fast evaluation via GPT-5-Nano (< 500ms)
- Refinement via GPT-5-Mini with specific critique
- Max 2 reflection rounds
- SSE streaming with mirror indicator in UI
- Skips for short responses (< 50 chars) and thinking mode

---

## Tool Learning System (Runtime Custom Tools)

- Natural language tool creation — describe what it should do, system generates implementation
- LLM-generated implementations with sandboxed execution
- Persistent registry in database (survives restarts)
- Dynamic loading into tool definitions at runtime
- Validation on create with try-and-revert testing (3 LLM-written test cases)
- Auto-fix on failure (up to 2 attempts), revert on exhaustion
- Every creation attempt logged as an experiment
- Auto-prefixed names (`custom_`) to distinguish from built-in tools

---

## Autonomous Self-Improvement Engine

- Hypothesis generation based on recent reflection scores
- A/B experiment execution (baseline vs experimental response)
- Self-reflection evaluation on both responses
- Head-to-head LLM judge comparison for marginal differences
- Automatic keep/revert (score gain >= 0.5 kept, regressions reverted)
- Heartbeat integration — schedulable via cron
- Categories: prompt_optimization, response_quality, tool_usage, persona_tuning
- Max 3 experiments per cycle
- Stagnation detection: auto-skip after 6+ consecutive failures
- Evolution strategies: balanced, innovate, harden, repair-only
- Signal extraction from server logs (error patterns, tool failures, rate limits)

---

## Sub-Agent System

- Depth-controlled spawning (main → sub-agent → sub-sub-agent, max depth 2)
- Structured Analyze→Execute→Verify→Report task prompts
- Full tool access (except spawning at max depth)
- Results reported back to main agent for verification
- Max 8 concurrent sub-agents, max 5 per parent

---

## Semantic Three-Tier Memory

- **Durable Facts** — 8 categories: identity, preference, relationship, goal, context, skill, milestone, status
- **Daily Notes** — date-scoped logs with events, decisions, lessons, and tomorrow's plan
- **Knowledge Base** — permanent reference library with title, content, category, priority (1-5)
- LLM-powered fact extraction with confidence scoring on every conversation turn
- Contradiction detection — auto-supersedes outdated memories
- Deduplication via cosine similarity + LLM classification
- Semantic search via OpenAI text-embedding-3-small with keyword fallback
- MMR Diversity Re-Ranking (Maximal Marginal Relevance)
- Recency tiers: Hot (< 7 days), Warm (7-30 days), Cold (> 30 days) with temporal decay
- Memory Health Monitoring endpoint
- Automated memory snapshots to Google Drive (every 12h, 60-snapshot retention)
- Token budget controls for system prompt injection
- Persona-scoped memories
- Full CRUD management on the Memory page

---

## Autonomous Heartbeat Engine

- Cron-based scheduling with 60-second tick loop
- 10+ supported task types: routine, daily_planning, reflection, memory_consolidation, knowledge, model_scout, delegation, content, content_review, cloud_backup, self_improvement
- Intelligent cost routing per persona tier
- One-click task templates for 6 agents
- Self-task creation and cross-agent delegation
- Dead-letter protection (auto-disable after 5 consecutive failures)
- Exception-safe mutex with try/finally
- Maintenance cycles every 10 ticks (archive expired memories, prune old logs)
- Activity-based skip to avoid redundant runs
- Guardrails: max 10 active delegation tasks, max 60 AI calls/hour, max 5 tasks/tick
- 2-hour delegation expiry

---

## Remote Browser Control (Virtual Browser)

- Per-tenant `BrowserContext` isolation via Chrome DevTools Protocol
- Multi-profile support: Browserless, Browserbase, self-hosted Chrome
- Auto-configure from `BROWSERLESS_API_KEY` environment secret
- 18 browser actions including smart_browse, form_fill, close_session
- Screenshots stored per-tenant, auto-pruned after 24h, authenticated URL serving
- Optional base64 inline screenshots for chat context
- Chat integration — browser screenshots render inline with clickable expand
- SSRF hardening: IPv4 normalization (integer/octal/hex/abbreviated), IPv6-mapped, DNS fail-closed, cloud metadata blocking, scheme restrictions (http/https only)
- Rate limiting: max 3 concurrent sessions/tenant, max 30 actions/min/tenant
- Idle session auto-close after 5 minutes
- WebSocket health probe for Browserless endpoints
- All authenticated users have access (config remains admin-only)

---

## Voice Conversations

- Text-to-Speech via ElevenLabs with configurable voice, model, stability, and similarity boost
- Microsoft Edge TTS as free fallback
- Speech-to-Text via browser Web Speech API
- Voice Wake and Talk Mode — hands-free continuous voice conversation
- Auto mode toggles in Settings
- Configurable max text length and timeout

---

## Email Integration (AgentMail)

- Per-tenant auto-provisioned `@agentmail.to` inbox
- Compose, reply, and auto-refresh
- Agent tools: `send_email` and `check_inbox`
- Tenant-scoped routes filter by requesting tenant's inbox
- Admin retains primary `visionclaw@agentmail.to` inbox
- Full email page UI at `/email`

---

## Web Search & Content Extraction

- Perplexity Sonar integration (AI-summarized deep web search)
- Jina AI reader (clean text extraction from URLs)
- Wikipedia search (factual lookups)
- Firecrawl integration (advanced web page extraction and crawling)
- SSRF protection on all web fetching
- Configurable search provider and model

---

## Lobster Workflow Engine

- YAML-based multi-step workflow definitions
- Step-by-step execution with approval gates for user review
- Security hardening: path traversal protection, token validation, exec-tool routing
- Settings UI with workflow list, create/delete, and pending approval count

---

## Stripe Payments

- Product catalog with one-time or subscription pricing
- 3 subscription tiers: Starter ($29/mo), Pro ($99/mo), Enterprise ($299/mo)
- Stripe Checkout for seamless payment
- Transaction history with status tracking
- Webhook-driven sync

### Dual Tenant Payment Modes
- **Managed (Stripe Connect)** — $99 setup fee, 3% platform commission, Express Connect onboarding
- **BYOK (Bring Your Own Key)** — $29 setup fee, no ongoing fee, tenant's own Stripe keys (AES-256-GCM encrypted)
- Setup fee enforced server-side
- Tenant-scoped Stripe client routes payments through correct account
- Trial-plan tenants blocked from either mode

---

## Coinbase Crypto Payments

- Dual-mode: CDP wallet-based payments + Commerce checkout
- CDP Wallet: create EVM wallets, list accounts, check token balances (Base, Ethereum)
- Commerce: create charges, list transactions, webhook-verified confirmation
- Live status monitoring with detailed error reporting
- Wallet management in Settings UI with balance display (60s polling)
- HMAC-SHA256 webhook verification

---

## Three-Tier Automated Backup

- **Tier 1: Google Drive Full Backup** (daily at 3 AM) — all 17 database tables exported as JSON, 30-backup retention, sensitive data auto-redacted
- **Tier 2: Memory Snapshots** (every 12 hours) — active + superseded memories, 60-snapshot retention, includes change history
- **Tier 3: GitHub Code Push** (after daily backup) — auto-commit and force-push to GitHub
- Manual triggers: POST /api/backup/full, POST /api/backup/cloud, POST /api/memory/backup
- Backup status endpoint with schedule, logs, and data counts

---

## Analytics Dashboard

- Messages per day (area chart)
- Model usage breakdown (pie chart)
- Hourly activity patterns (bar chart)
- Tool usage rankings (bar chart)
- KPI cards: total conversations, messages, period summaries
- All computed via SQL GROUP BY for performance

---

## Social Marketing Suite

- `draft_social_post` — platform-optimized drafting (X, LinkedIn, TikTok, Instagram)
- `manage_content_calendar` — scheduling, campaign grouping, lifecycle management
- `marketing_analytics` — performance analytics
- `marketing_experiment` — A/B experiment tracking with automatic winner detection
- Brand voice configured per tenant
- All data tenant-scoped

---

## Public Chat & Embeddable Widget

- Shareable link: `/public-chat/:token` — standalone dark-themed chat with SSE streaming
- Embeddable widget: one-line `<script>` tag adds floating chat bubble to any website
- Settings toggle with unique 16-character token generation
- Scope isolation: public conversations tagged separately
- Rate limiting: 30 req/min general, 10 msg/min streaming
- Safety: max 2,000 char messages, max 3 tool rounds, only safe tools
- Cost control: always uses DeepSeek V3.2 via OpenRouter
- Anti-hijacking: 7-rule security constraint block in system prompt

---

## Vanity Slug URLs

- Clean branded URLs: `/c/my-company` instead of random tokens
- Settings UI with live preview
- Validation: 3-40 chars, lowercase alphanumeric + hyphens
- Reserved word blocking (api, admin, login, settings, etc.)
- Global uniqueness with database constraint
- Dual access: both vanity URL and original token URL work
- Paid-only feature

---

## Provider Key Proxy / Masking System

- Two-tier architecture: Platform keys (master) + Tenant BYOK keys (optional per-user)
- Resolution order: Tenant BYOK → Platform master → Replit integration → Error
- Key masking: API never returns full values (`sk-...xxxx` format)
- Health tracking: last_verified_at, consecutive_failures, last_error
- AES-256-GCM encryption for stored keys
- Chat engine resolves keys per-tenant automatically

---

## LLM Cost Tiering

- Admin: all 46 models across 7 providers
- Non-admin: 16 OpenRouter models by default (including Auto Select)
- BYOK: add own API keys to unlock premium providers
- Server-side enforcement: unauthorized models silently downgraded
- UI filtering: model dropdown only shows authorized models

---

## Conversation Templates

- 10 pre-built templates as clickable cards on dashboard
- Weekly Business Review, Code Review, Email Drafting, Brainstorming, Content Strategy, and more
- One-click conversation creation with pre-configured persona and system prompt

---

## Skills System

- 50+ toggleable agent capabilities organized by category
- Skills page at `/skills` with search and category filtering
- Skills inject additional context and instructions into agent system prompts
- Includes specialized skills: Vibe Marketing, Browser Automation, Caption Generation, Coding Agent Loops, and more

---

## Inline Chart Generation

- Bar, line, pie, and area chart types
- Generated via `generate_chart` tool and rendered inline in chat messages
- Interactive Recharts components with tooltips and legends

---

## File & Image Upload

- Drag-and-drop or click-to-upload in chat
- Image preview thumbnails before sending
- Secure storage in `uploads/` with cryptographic filenames
- Auth-aware serving with token-based URLs

---

## Export & Import

- Full data export as JSON (API keys redacted)
- One-click import from export file
- Available in Settings page

---

## Digital Product Delivery

- Google Drive + email delivery pipeline
- Delivery tracking and status endpoints
- File manifest management

---

## Project Management

- Create and manage projects
- Link files to projects
- Project-scoped conversations and notes

---

## Mobile PWA Support

- manifest.json with app name, icons (192px, 512px), theme colors
- Service worker with network-first caching
- Apple-specific meta tags for iOS home screen
- Viewport optimization for mobile
- "Install App" button in sidebar

---

## Dark & Light Mode

- Toggle in sidebar and landing page
- CSS custom properties for all color tokens
- Dark class on `<html>` element
- Persisted in localStorage

---

## Discord Bot Integration

- Bot token configured in Settings
- Responds to Discord messages using active persona and model
- Shares same processMessage engine as chat (full tool access)

---

## Public Landing Page

- Hero section with "Platform Online" live badge
- Live Activity Demo: animated agent activity feed, revenue badges, real-time stats
- Agent Team Showcase: all 12 personas
- Features Grid: 6 key capabilities
- Live Platform Stats from API (refreshed every 30s)
- 3-tier pricing with feature comparison
- Sign Up flow with Stripe Checkout integration
- Fully responsive, accessible (aria-live, prefers-reduced-motion)

---

## Security Hardening

- Multi-tenant IDOR protection on all CRUD operations
- LLM cost enforcement — server-side model validation
- Public chat anti-hijacking (7-rule constraint block)
- Public chat rate limiting (30 req/min, 10 msg/min)
- Tool loop detection (hash-based, 4 detection modes)
- Mutation tracking (read-only, write, destructive classification)
- SSRF protection on web_fetch, web_search, and browser tool
- Browser SSRF: IPv4 normalization, IPv6-mapped, DNS fail-closed, metadata blocking
- Path traversal protection (basename-only, realpath checks)
- Token validation (strict regex)
- Context window guard (85%/95% threshold auto-truncation)
- External content security (sanitization, 13 suspicious pattern detection)
- Code sandbox isolation (VM context, blocked patterns, frozen objects, 5s timeout)
- Sub-agent depth limits (max depth 2, max 8 concurrent, max 5 per parent)
- Sandboxed shell execution
- Vanity slug validation (reserved words, format, uniqueness, plan gating)
- HMAC-SHA256 PIN hashing with timing-safe comparison
- PBKDF2-SHA512 password hashing (100k iterations)
- AES-256-GCM encryption for API keys
- DB-backed sessions (not in-memory)
- Secret scanner runs before every GitHub push
- `.replit` excluded from git (contains API keys)

---

## Resilience & Recovery

- Multi-round model failover across providers
- Tool execution timeouts (60s default, 120s for slow tools)
- Self-healing tool retries with error analysis
- Heartbeat dead-letter protection (auto-disable after 5 failures)
- Exception-safe heartbeat mutex (try/finally)
- Adaptive re-planning (up to 2 re-plans)
- Context window auto-compaction via summarization
- Conversation truncation at 95% context usage

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS + shadcn/ui component library
- Wouter (client-side routing)
- TanStack Query v5 (server state)
- Recharts (data visualization)
- ReactMarkdown (rendering)
- Lucide React + react-icons (icons)

### Backend
- Express.js + TypeScript
- Drizzle ORM + PostgreSQL
- Zod (request validation)
- SSE (real-time streaming)
- cron-parser v5 (heartbeat scheduling)
- AgentMail SDK (email)
- Puppeteer-core (browser control)
- js-yaml (workflow parsing)

### Infrastructure
- PostgreSQL (primary database, 30 tables)
- Replit AI Integrations (OpenAI, Anthropic, Google)
- Replit Connectors (ElevenLabs, Stripe, Google Drive)
- Vite (frontend build)
- Single-port deployment on Replit

### External Services
- OpenAI, Anthropic, xAI, Google Gemini, Perplexity, OpenRouter (AI providers)
- Stripe (payments — managed + BYOK)
- Coinbase CDP + Commerce (crypto payments)
- ElevenLabs (TTS/STT)
- Google Drive (cloud backups)
- AgentMail (email)
- Firecrawl (web extraction)
- Jina AI (URL content extraction)
- Perplexity Sonar (web search)
- Browserless (remote browser)

---

## Pages & Navigation

1. **Dashboard** (`/`) — stats, templates, activity feed, quick start
2. **Chat** (`/chat/:id`) — streaming conversations with tool calls
3. **Personas** (`/personas`) — 14-agent management with 8 document fields
4. **Memory** (`/memory`) — long-term memory with search, edit, categories
5. **Knowledge** (`/knowledge`) — permanent knowledge base with priority
6. **Heartbeat** (`/heartbeat`) — autonomous task scheduler with logs
7. **Email** (`/email`) — AgentMail inbox with compose and reply
8. **Skills** (`/skills`) — 50+ toggleable capabilities
9. **Analytics** (`/analytics`) — usage charts and KPIs
10. **Payments** (`/payments`) — Stripe products and transactions
11. **Projects** (`/projects`) — project management
12. **Settings** (`/settings`) — API keys, auth, agent config, browser, voice, tools, backup, export
13. **Landing** (`/landing`) — public marketing page
14. **Sign Up** (`/signup`) — plan selection and registration
15. **Login** (`/login`) — PIN/password entry
16. **Public Chat** (`/public-chat/:token`) — embeddable public chat
17. **Not Found** — 404 page

18. **Deep Research** (`/research`) — autonomous experiment loops with programs, sessions, and results
19. **Usage** (`/usage`) — usage metering and plan limits
20. **File Manager** (`/files`) — tenant-scoped file storage with drag-and-drop upload
21. **Documents** (`/documents`) — document collection search with keyword, semantic, and hybrid modes
22. **Daily Briefing** (`/briefing`) — AI-powered daily briefing with weather and widgets

### Sidebar Features
- Conversation list with grouped headers (Today, Yesterday, This Week, Older)
- Full-text search with 300ms debounce and match snippets
- Infinite scroll with Load More pagination
- Log Out button (visible when auth is active)
- Install App button (PWA support)
- Theme toggle

---

## Deep Research Engine (v5.1)

Karpathy-inspired autonomous experiment loop system ("Deep Work Mode") for running structured research overnight using cost-efficient AI models.

### Research Programs
- Named programs with objective, constraints, success metrics, exploration strategy
- Model selection: OpenRouter cost-efficient models (DeepSeek V3.2, Qwen Flash, DeepSeek R1, Mistral Large)
- Configurable max experiments per session (default 20, up to 100)
- Optional persona assignment for domain expertise
- Full CRUD: create, edit, delete, launch

### Autonomous Sessions
- Start from dashboard or API, runs experiments every 30 seconds
- Each experiment: generate hypothesis → execute → self-evaluate (1-10 score)
- Score >= 6: KEEP — preserved and chained to future experiments
- Score < 6: DISCARD — recorded but not used as basis for future work
- Auto-stop after max experiments or 3 consecutive failures
- AI-generated executive summaries with key findings and actionable insights

### Result Chaining
- Each new experiment sees all previous kept/discarded results
- Progressive refinement — later experiments build on earlier findings
- Full audit trail: hypothesis, approach, result, score, duration, tokens used

### Dev-to-Production Auto-Sync
- `script/sync-dev-to-prod.ts` exports all research data during build
- `seed.ts` imports snapshot on production startup (deduplicates by program name)
- Zero manual steps — run research in dev, publish, everything appears in production

### AI Buddy Health Research Programs (Pre-Built)
Six production research programs for Project #13 (AI Buddy Health — weight loss & emotional eating):

| Program | Persona | Focus |
|---------|---------|-------|
| Emotional Eating Crisis Interventions | Neptune | Evidence-based intervention scripts for craving moments |
| Content Marketing Pipeline | Teagan | Blog posts, social content, email sequences for AI Buddy Health |
| Competitive Intelligence | Radar | Market analysis of weight loss apps and emotional eating tools |
| Revenue & Pricing Strategy | Apollo | Pricing models, conversion funnels, subscription tiers |
| Daily Companion Message Library | Scribe | Personalized daily encouragement messages |
| Legal & Compliance Framework | Luna | FTC/FDA compliance, health claims, privacy policies |

### Research API
10 endpoints: CRUD programs, start/stop sessions, list sessions/experiments, aggregate stats

---

## New Personas (v5.1)

### Cassandra — CFO
- Financial stewardship, P&L tracking, tax strategy, monthly close
- Cost tier: Balanced ($$)
- Specialty: Budget analysis, revenue forecasting, financial reporting

### Luna — Legal & Compliance
- Contracts, regulatory monitoring, privacy, trademark protection
- Cost tier: Balanced ($$)
- Specialty: FTC/FDA compliance, terms of service, health claims review

---

*VisionClaw Agent — Built by AI Buddy LLC*
*VisionClaw Agent Platform*
