# VisionClaw Agent v5.2.0 — Complete Feature Update
## AI Buddy LLC, Illinois | March 21, 2026
## Platform: visionclawagent.com | Repo: github.com/Huskyauto/VisionClaw-Agent

---

# WHAT'S NEW IN v5.2.0

## 1. Deep Research — "Run All Programs" (Batch Execution)
- **One-Click Batch Start**: Purple "Run All Programs" button at the top of the Deep Research page
- Starts sessions for EVERY active research program simultaneously
- Returns summary: how many started, how many failed
- No more clicking "Run" on each program individually

## 2. Deep Research — Automated Scheduling System
- **New "Schedules" Tab**: Fourth tab on the Deep Research page (Programs | Sessions | All Experiments | Schedules)
- **Create Automated Schedules** with adjustable settings:
  - **Preset Times**: Nightly at 2 AM, Midnight, 3 AM, Every Morning 6 AM, Every Evening 10 PM, Weekly Monday, Mon & Thu, Every 6 Hours, Every 12 Hours
  - **Timezone Support**: Central (Chicago), Eastern (New York), Mountain (Denver), Pacific (Los Angeles), UTC
  - **Target Selection**: Run All Programs or target a specific program
  - **Enable/Disable Toggle**: Turn schedules on/off without deleting them
  - **Edit & Delete**: Full CRUD management of schedules
- **Heartbeat Integration**: System checks every 60 seconds and auto-fires research sessions when scheduled time arrives
- **Last/Next Run Tracking**: Shows when each schedule last ran and when it will run next

## 3. Per-Tenant WhatsApp (Completed in v5.1)
- Each tenant gets their own WhatsApp Web connection (separate QR code scan)
- Per-tenant approval phone numbers for Human-in-the-Loop confirmations
- New WhatsApp Approvals page accessible to all users
- Tenant isolation: conversations include tenantId, no cross-tenant data leakage
- Admin WhatsApp keyed as "admin", tenant WhatsApp keyed as "t{id}"

## 4. Per-Tenant Coinbase Commerce (Completed in v5.1)
- Each tenant can configure their own Coinbase Commerce API keys
- Coinbase CDP API Key ID and Secret stored per-tenant in database
- Admin falls back to environment variables when no tenant keys configured
- New API endpoints: GET/PUT/DELETE /api/coinbase/keys
- Cached CDP client per tenant, cleared on key update/delete

## 5. Per-Tenant Email (Already Complete)
- `getOrCreateTenantInbox()` auto-creates unique @agentmail.to address per tenant
- Full tenant isolation for email communications

---

# COMPLETE PLATFORM FEATURE CATALOG

## Authentication & Security
- **Triple Auth**: Replit Auth, Email + Password, Admin PIN (HMAC-SHA256)
- **DB-Backed Sessions**: Persistent across restarts, timing-safe validation
- **Password Policy**: Minimum strength, email verification required
- **Password Reset**: Token-based with auto-cleanup
- **Content Security Policy**: Helmet CSP with explicit allowlists
- **AES-256-GCM Credential Vault**: Encrypted storage for website logins
- **Account Deletion**: Soft-delete with 30-day grace period
- **Health Monitor**: Automated checks for 6+ core services with auto-remediation and email alerts

## AI Agent System (14 Personas)
1. **Felix** — CEO & Orchestrator
2. **Forge** — Engineer
3. **Scribe** — Content Writer
4. **Apollo** — Business Strategist
5. **Maven** — Marketing Expert
6. **Sentinel** — Security & Compliance
7. **Radar** — Intelligence & Analytics
8. **Harmony** — Customer Experience
9. **Atlas** — Operations Manager
10. **Nexus** — Integration Specialist
11. **Oracle** — Data Scientist
12. **Teagan** — Social Media Manager
13. **Neptune** — Deep Research Specialist
14. **Vanguard** — Innovation & R&D

Each persona has: Unique Soul, Operating Loop, Brand Voice, Specialized Tools, and Model Tier Assignment.

## CEO Orchestrator ("War Room")
- LLM-powered task decomposition and routing
- Delegates work to specialist personas
- Synthesizes multi-persona responses
- Tracks delegation history and performance

## Intelligence & Tool System (49+ Tools)
- **Semantic Tool Router**: Keyword-based dynamic tool selection (saves tokens)
- **Self-Healing Tool Loop**: Injects recovery hints on failure and retries
- **Tool Categories**:
  - Browser (navigate, click, screenshot, extract, auto-login)
  - Communication (email, WhatsApp, Discord)
  - Memory & Knowledge (facts, notes, vector search)
  - Research (start sessions, query experiments)
  - PDF/Document (create, analyze, merge, split)
  - Code Execution (sandboxed JS, shell)
  - Orchestration (delegate to personas)
  - Marketing (social posts, content calendars)
  - Self-Improvement (create new tools, evolve)
  - Visualization (Recharts chart generation)
  - Credential Vault (secure website logins)
  - Google Drive (upload, organize, share)
  - Calendar & Scheduling

## Deep Research Engine (Karpathy-Inspired)
- **6 Pre-Built Research Programs**: AI Buddy Health focused topics
- **Autonomous Overnight Sessions**: Set-and-forget experiment loops
- **Run All Programs**: One-click batch execution
- **Automated Scheduling**: Cron-based with timezone support
- **Self-Evaluating Experiments**: Keep/Discard/Crash status
- **Chained Results**: Experiments build on prior findings
- **AI Summaries**: Executive summary generation
- **Cost-Efficient Models**: DeepSeek V3.2, Qwen 3.5 Flash, R1 Reasoning, Mistral Large
- **Dev-to-Prod Auto-Sync**: Research data flows to production on publish

## Heartbeat Engine (Autonomous Background Tasks)
- 13 pre-built task templates
- 60-second tick interval
- Guardrails: max concurrent tasks, AI call rate limiting, dead-letter disabled after 5 failures
- Tenant-scoped AI call limits
- Research schedule checking integrated
- Cloud and memory backup automation

## Communication Hub
- **AgentMail**: Per-tenant @agentmail.to inboxes, auto-created
- **WhatsApp Web**: Per-tenant connections with QR code pairing
- **WhatsApp Approvals**: Human-in-the-Loop confirmation via WhatsApp
- **Discord Bot**: Bot control and messaging
- **Voice Talk Mode**: ElevenLabs TTS/STT integration
- **Email Notifications**: Welcome, verification, usage warnings, plan changes

## Payments & Billing
- **Stripe Connect**: Subscription checkout, plan updates, marketplace payouts
- **Coinbase Commerce**: Per-tenant CDP Wallet + Commerce API for crypto
- **Usage Metering**: Messages/day, tool calls/day, conversations/month
- **BYOK Tier System**: Enhanced limits for Bring-Your-Own-Key users
- **Plan Enforcement**: Automatic limit tracking and upgrade prompts

## Memory & Knowledge System
- **Three-Tier Semantic Memory**:
  - Durable Facts (long-term persistent)
  - Daily Notes (event logs)
  - Vector Knowledge Base (embeddings)
- **Hybrid Search**: BM25 + Vector + combined modes
- **Document Analysis**: PDF parsing and knowledge extraction

## Browser & Web
- **Virtual Browser**: Tenant-scoped Puppeteer with Browserless
- **Session Isolation**: Each tenant gets isolated browser sessions
- **SSRF Protection**: URL validation and network hardening
- **Auto-Login**: AI uses credential vault for website authentication
- **Screenshot Capture**: Visual evidence for research and analysis

## File & Storage
- **Per-Tenant Object Storage**: Isolated file storage via Replit
- **File Manager**: Drag-and-drop upload, search, sort
- **Google Drive Integration**: Auto-organized subfolders, share links
- **PDF Toolkit Pro**: Create, analyze, merge, split, compress PDFs

## Daily Briefing & Weather
- **AI-Powered Briefings**: Personalized daily briefings with weather
- **Text-to-Speech Option**: Audio briefings via ElevenLabs
- **IP Geolocation**: Automatic location detection

## UI/UX
- **Command Center Dashboard**: Progressive disclosure, grouped sidebar
- **Dark Mode**: Full theme support with localStorage persistence
- **3-Step Onboarding**: New user welcome flow
- **Auto-Named Conversations**: Smart conversation labeling
- **Code Splitting**: React.lazy() + Suspense for performance
- **SEO Optimized**: Open Graph tags, meta descriptions
- **Legal Pages**: Terms of Service, Privacy Policy, Cookie Consent
- **Error Boundary**: Graceful error handling

## Multi-Tenancy
- Strict tenantId filtering across ALL modules
- Per-tenant WhatsApp connections
- Per-tenant Coinbase keys
- Per-tenant email inboxes
- Per-tenant file storage
- Per-tenant API key management (BYOK)
- Per-tenant usage metering

## AI Providers Supported
- OpenAI (GPT-4o, GPT-5)
- Anthropic (Claude 3.5, Claude 4)
- Google Gemini
- xAI (Grok)
- Perplexity (Sonar)
- OpenRouter (DeepSeek, Llama, Qwen, Mistral)
- ElevenLabs (Voice)
- Model failover with automatic fallback chains

---

# INFRASTRUCTURE
- **Frontend**: React 18, Vite, shadcn/ui, TailwindCSS, Wouter, TanStack Query v5
- **Backend**: Express.js, TypeScript, Drizzle ORM, Zod, Helmet
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Replit Object Storage, Google Drive
- **Deployment**: Replit Autoscale (8 vCPU / 16 GiB RAM / 8 Max)
- **Domains**: visionclawagent.com, openclaw-agent.replit.app
- **Repository**: github.com/Huskyauto/VisionClaw-Agent

---

# AI BUDDY HEALTH (Project #13)
- Founder: Robert Washburn, 61, lost 220 lbs
- Domain: ai-buddyhealth.com
- 90-Day AI Companion Weight Loss Protocol
- Integrated with VisionClaw research programs
- 6 dedicated research programs for AI Buddy Health

---

Document compiled: March 21, 2026
VisionClaw Agent v5.2.0 | AI Buddy LLC, Illinois
