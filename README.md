# VisionClaw Agent — Agentic AI Corporation Platform

**Built by AI Buddy LLC, Illinois**

VisionClaw is an enterprise-grade agentic AI platform that operates as a fully autonomous AI corporation. It features 14 specialized AI personas forming a complete corporate team, 8 connected AI providers, 85+ tools, and rules-driven autonomous governance based on NIST, OWASP, and Singapore IMDA standards — now powered by a full 6-tier Agency Expansion Framework with earned autonomy, trust scoring, and an autonomous self-tuning engine.

---

## Table of Contents

- [Overview](#overview)
- [Key Highlights](#key-highlights)
- [Architecture](#architecture)
- [AI Personas](#ai-personas)
- [AI Providers](#ai-providers)
- [Subscription-First LLM Routing](#subscription-first-llm-routing-byos)
- [Feature Categories](#feature-categories)
- [Agency Expansion Framework](#agency-expansion-framework)
- [Autonomous Self-Tuning Engine](#autonomous-self-tuning-engine)
- [Corporate Operations Scaffolding](#corporate-operations-scaffolding)
- [Chat UX](#chat-ux)
- [Security](#security)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

VisionClaw implements the Claude Opus 4.6 Agentic Spec, where agents handle tasks autonomously and escalate only mission-critical issues to human owners. The platform is built for multi-tenancy, cost-effectiveness, and robust security, delivering a complete corporate team experience through AI.

The system features a 40-rule governance engine, a 6-tier Agency Expansion Framework enabling agents to earn increasing levels of autonomy through demonstrated trustworthiness, and an autonomous self-tuning engine that calibrates operational parameters based on real performance data.

---

## Key Highlights

| Metric | Value |
|---|---|
| AI Personas | 14 specialized roles |
| AI Providers | 8 connected (OpenAI, Anthropic, Gemini, xAI, Perplexity, OpenRouter, DeepSeek, Meta Llama) |
| Tools | 85+ (communication, research, code, browsing, agentic ops, Google Workspace, virtual browser) |
| Governance Rules | 40 rules across 7 categories (including agency_expansion) |
| Trust Score Categories | 9 categories, 40 scores across 13 agents |
| Express Lanes | 12 approved agent-to-agent direct handoff routes |
| Proactive Triggers | 32 triggers across 9 personas |
| Decision Protocols | 5 collective intelligence protocols |
| Evaluators | 9 real-time system evaluators |
| Operation Scaffolds | 65 structured scaffolds across 12 departments |
| Frontend Pages | 25+ |
| Database Tables | 33+ |
| Agentic Design Patterns | 6 book-inspired patterns |
| Communication Channels | AgentMail, WhatsApp, Discord, Telegram |
| YouTube Integration | OAuth channel management (upload, analytics, comments) |

---

## Architecture

### Frontend
- **Stack:** React 18, Vite, shadcn/ui, TailwindCSS, Wouter, TanStack Query v5
- **UI/UX:** Command Center Dashboard, grouped sidebar with search, auto-named conversations, 3-step onboarding, usage dashboard, legal pages, cookie consent, error boundary, dark mode, code splitting
- **Chat UX:** Scroll-to-bottom button, stop generating button, regenerate last response (preserves attachments), keyboard shortcuts (Ctrl/Cmd+N new chat, Esc stop/clear), smart auto-scroll that respects user scroll position, inline charts, live canvas, voice input/output, camera capture, talk mode

### Backend
- **Stack:** Express.js, TypeScript, Drizzle ORM, Zod, Helmet
- **Features:** Real-time AI responses via SSE, multi-auth (Replit Auth, Email/Password, Admin PIN with HMAC-SHA256), DB-backed sessions, timing-safe cryptography, password policy, email verification, strict multi-tenant data isolation

### Database
- PostgreSQL with Drizzle ORM, 33+ tables
- pgvector for native vector similarity search with HNSW indexes (production-only initialization)
- Safe column selections to avoid pgvector dependency in development
- Automated schema management with safe migration patterns

---

## AI Personas

| ID | Name | Role | Trust Categories |
|---|---|---|---|
| 1 | **VisionClaw** | CEO and Primary Agent | N/A (orchestrator) |
| 2 | **Felix** | Operations Manager — task approval, delegation oversight | external_comms, delegation_efficiency, tool_compliance, purpose_adherence |
| 3 | **Forge** | Full-Stack Developer — code generation, debugging | code_reliability, tool_compliance, purpose_adherence |
| 4 | **Teagan** | Customer Success — user engagement, support | external_comms, content_quality, tool_compliance, purpose_adherence |
| 5 | **Blueprint** | Project Manager — project planning, milestones | tool_compliance, purpose_adherence |
| 6 | **Chief of Staff** | Infrastructure and Stability — watchdog, monitoring | tool_compliance, purpose_adherence |
| 7 | **Scribe** | Content Writer — copywriting, documentation | external_comms, content_quality, tool_compliance, purpose_adherence |
| 8 | **Proof** | QA and Testing — quality assurance, validation | tool_compliance, purpose_adherence |
| 9 | **Radar** | Market Research — competitive analysis, trends | research_accuracy, tool_compliance, purpose_adherence |
| 10 | **Neptune** | Data Analyst — data processing, insights | research_accuracy, content_quality, tool_compliance, purpose_adherence |
| 11 | **Apollo** | Creative Director — branding, sales, outreach | external_comms, tool_compliance, purpose_adherence |
| 12 | **Atlas** | Strategy Consultant — business strategy, metrics | financial_accuracy, tool_compliance, purpose_adherence |
| 13 | **Cassandra** | Risk Analyst — risk assessment, forecasting | financial_accuracy, tool_compliance, purpose_adherence |
| 14 | **Luna** | HR and Legal — compliance, contracts, team culture | legal_soundness, tool_compliance, purpose_adherence |

Each persona has unique brand voice, expert rules, operating loops, per-agent reasoning configuration, and Personality Files (SOUL.md, STYLE.md, USER.md, RULES.md, CONTEXT.md).

---

## AI Providers

| Provider | Models |
|---|---|
| OpenAI | GPT-5.4, GPT-4.1, GPT-4.1 Mini, GPT-5 Mini, o4-mini |
| Anthropic | Claude Opus 4.6, Claude Opus 4, Claude Sonnet 4 |
| Google Gemini | Gemini 3.1 Pro, Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Flash |
| xAI | Grok 4, Grok 3 |
| OpenRouter | DeepSeek R1/V3.2, Llama 4 Maverick/Scout, Qwen 3.5, Kimi K2.5, MiniMax M2.7 |
| Perplexity | Sonar Pro, Sonar Deep Research |
| DeepSeek | DeepSeek V3.2, DeepSeek R1 |
| Meta | Llama 4 Maverick, Llama 4 Scout |

---

## Subscription-First LLM Routing (BYOS)

VisionClaw uses a **Bring Your Own Subscription** model where OAuth subscription tokens are the PRIMARY source for LLM inference, with automatic failover to API keys.

- **OAuth Subscription Tokens** — Connect ChatGPT Plus and Google Gemini subscriptions via OAuth; tokens used as PRIMARY inference source before any API key costs
- **Google OAuth with PKCE** — Redirect-based flow with `generative-language` scope for Gemini API access
- **OpenAI OAuth with PKCE** — Code-paste flow with STS token exchange for ChatGPT Plus API access
- **Tiered Failover TTLs** — 429 rate limit = 2-minute cooldown, 401/403 auth failure = 10-minute cooldown
- **Automatic API Key Fallback** — When subscription quota exhausted, seamlessly falls through to API keys
- **Token Refresh Loop** — Active subscription tokens refreshed every 45 minutes
- **YouTube OAuth** — Web application flow with PKCE for YouTube Data API v3
- **Cost-Optimized Tiers** — Simple tasks use free subscriptions; only premium/complex tasks incur API costs

### Smart Model Auto-Selection

- **Task Complexity Classifier** — Analyzes query complexity before routing to appropriate model tier
- **High-Complexity Coding Router** — Claude Opus 4.6 automatically selected for complex architecture/debugging
- **Budget Model Routing** — Low/medium complexity uses cost-effective models (DeepSeek V3.2, Gemini Flash)
- **Multimodal-Aware Routing** — Detects images/files, routes to vision-capable models
- **Auto-Thinking Mode** — Enables extended thinking for complex queries
- **Persona Cost Tier Integration** — Respects per-persona cost budgets
- **Model Capabilities Registry** — Tracks features per model (vision, function calling, thinking)
- **Adaptive Model Upgrade/Downgrade** — Per-round complexity assessment in tool loops
- **Failover Cascade** — Subscription tokens > API keys > Replit built-in models

---

## Feature Categories

### Autonomous Operations
- **Heartbeat Engine** — Background task scheduler (active: 60s, idle: 5m cycles)
- **Scheduled Tasks** — User-friendly task scheduling with approval gates
- **Corporation Report Export** — Automated PDF generation to Google Drive with email delivery
- **Human-in-the-Loop (HITL)** — Confirmation gate for high-risk actions with risk classification
- **Felix Approval Gate** — All delegation tasks created with enabled=false, approval_status=pending

### Agentic Infrastructure
- **Agent Desks** — Persistent workspace per persona with desk state, notes, priority queue
- **Internal Channels** — Cross-persona communication via named channels
- **Event Bus** — Publish/subscribe event architecture with event log and retention
- **Autonomy Rules** — Four levels: full_auto, notify_after, approve_before, blocked
- **Outcome Tracking** — Pattern recognition on action results
- **Watchlist Monitoring** — Proactive alerting on watched metrics

### Process Governor
- 40-rule governance engine across 7 categories (including agency_expansion)
- 25 condition evaluators including 9 live evaluator-backed conditions
- Emergency Kill Switch for immediate shutdown
- Governance Frameworks Knowledge Base (NIST, OWASP, Singapore IMDA)
- Automated Framework Review and Strict Escalation Policy

### Intelligence and Memory
- **Hierarchical Memory Graph** — Memories auto-organized into categories/subcategories
- **Cross-Referenced Memory Links** — Related memories linked by semantic similarity
- **Proactive Context Loading** — Anticipates context the agent needs
- **Three-Tier Semantic Memory** — Facts, Notes, Vector Knowledge Base with MMR diversity ranking
- **Document Search** — BM25/Vector/Hybrid search
- **Zero-Loss Compaction** — Archives full transcripts before summarizing
- **Per-Tenant Memory Backup** — Automated backup to Google Drive
- **pgvector** — Native PostgreSQL vector similarity with HNSW indexes

### Data Protection System
- **Soft-Delete** — 30-day recovery window for deleted conversations
- **Message Save Verification** — Confirms DB write before AI responds
- **Compaction Safety Gate** — Blocks compaction if archive save fails
- **Google Drive Backup** — Per-tenant backup of conversations, memories, knowledge, projects
- **Trash and Recovery** — View deleted conversations, recover with one click
- **Admin Backup** — Full tenant data export to Google Drive on demand

### Agentic Design Patterns (Book-Inspired)
1. **Parallel Tool Execution** — Read-only tools run concurrently; mutating tools run sequentially
2. **Critique Agent / Self-Correction Loop** — Auto-evaluates responses on accuracy, completeness, relevance, clarity
3. **Chain of Debates** — Convenes 3-6 specialist personas to deliberate complex questions
4. **Tree-of-Thought Reasoning** — Generates 2-5 distinct reasoning branches, scores each
5. **Proactive Resource Prediction** — Estimates token usage, API costs, execution time, risk level
6. **Adaptive Model Downgrade** — Per-round complexity check during tool loops

### Deep Research
- Research Programs with autonomous sessions
- Research Scheduling with AI-generated session summaries
- Dev-to-Prod Auto-Sync

### Quarterly Intelligence System
- Governance Research Scanner for new AI frameworks
- Model Registry Refresh for LLM updates
- Human approval required for live changes

### Agentic Intelligence Engines
- **Decision-Making Engine** — Autonomous decision analysis
- **Predictive Analytics Engine** — Forecasting and trend analysis
- **Process Optimization Engine** — Workflow efficiency improvements

### Execution Supervisor
- **Circuit Breaker** — Prevents cascading failures from repeated tool errors
- **Output Validation** — Verifies tool outputs meet quality thresholds
- **Hallucination Detection** — Flags potentially fabricated content
- **Execution Budget Warnings** — Alerts when tool loops approach cost limits
- **Fallback Suggestions** — Recommends alternative tools on failure

### 85+ AI Tools
- **Communication:** Email (AgentMail), WhatsApp, Discord, Telegram, channel messaging
- **Research:** Web search, Firecrawl extraction, Jina AI reader, deep research sessions
- **Documents:** PDF generation, Google Drive upload, file management, data export
- **Code:** Code execution, debugging, architecture review
- **Virtual Browsing:** Browserless cloud-based headless Chrome with vision-enabled screenshots
- **Agentic:** Desk management, event emission, delegation, watchlist alerts, orchestration
- **Google Workspace:** Drive file management, document creation
- **System:** Health monitoring, usage tracking, model routing, settings management
- **Dashboard Generation:** Agent-generated HTML dashboards rendered in Live Canvas

### OpenClaw-Inspired Features
- **MCP Client Support** — Model Context Protocol integration
- **Webhook Triggers** — External event webhooks
- **Channel Routing** — Message routing between personas
- **Skills Marketplace** — Installable skill packages
- **Live Canvas** — Rendered HTML components from agent responses
- **Personality Files** — Per-tenant SOUL.md/STYLE.md/USER.md/RULES.md/CONTEXT.md customization
- **Firecrawl Search** — Web search returning clean LLM-ready markdown
- **Per-Agent Reasoning Config** — Custom model, thinking level, reasoning tier, max tokens per persona
- **Smart Error Classification** — Transient signal detection, prevents wasteful retries

### Communication and Marketing
- Social Marketing skills and content generation
- AgentMail integration (visionclaw@agentmail.to)
- WhatsApp Business integration (Baileys)
- Discord Bot
- Telegram Bot (grammy framework, pairing/approval system)

### Browser and Web
- **Virtual Browser (Browserless)** — Cloud-based headless Chrome via Browserless API with Puppeteer-core
- **Agent Browser Tools** — browse_web (navigate + screenshot), browser_action (click, type, scroll, execute JS)
- **Multi-Page Workflows** — Agents can navigate, interact with forms, extract data across multiple pages
- **Vision-Enabled** — Screenshots passed as base64 to vision-capable LLMs; agents can SEE web pages
- **SSRF Protection** — DNS-based URL validation blocks internal/private IP navigation
- **Tenant Isolation** — Isolated browser contexts and cookie storage per tenant
- **Credential Vault** — Encrypted login storage per tenant

### YouTube Integration
- **YouTube OAuth** — Web application flow with PKCE for YouTube Data API v3
- **Channel Management** — Upload videos, read analytics, manage comments, view subscriber data
- **Auto-Refresh** — YouTube tokens included in 45-minute refresh loop
- **Scopes** — youtube, youtube.upload, youtube.readonly, youtubepartner

### Payments and Billing
- **Stripe** — Subscriptions, Connect, BYOK tier system, webhook handling
- **Coinbase** — CDP SDK, Commerce API, crypto payments
- **Usage Metering** — Per-tenant tracking of messages, conversations, tool calls

### File and Storage
- Secure Tenant File Storage via Replit Object Storage
- File Manager UI
- Google Drive Integration (upload, share, organize into dated subfolders)
- PDF Toolkit (generation, export, email delivery)

### Stability and Monitoring
- **Stability Watchdog** — Autonomous infrastructure watchdog (Chief of Staff, every 10 min)
  - Auto-kills stuck tasks (8min threshold)
  - Auto-disables flaky tasks (4 errors in 2h)
  - Heartbeat restart on failure
  - Memory pressure management (GC triggers)
  - Stale data cleanup and pool health monitoring
- **Health Monitor** — 6-check health system (every 5 min)
- **Watchdog Stats** — Visible in /api/health response

---

## Agency Expansion Framework

The Agency Expansion Framework is a comprehensive 6-tier system that enables agents to earn increasing levels of autonomy through demonstrated trustworthiness. All components are production-ready and fully integrated.

### Tier 1: Evaluator System
**File:** `server/evaluators.ts`

9 real-time evaluators continuously monitor system health and agent behavior:

| Evaluator | What It Monitors |
|---|---|
| daily_spend | Token spend vs. daily budget (warning/critical thresholds tuned by auto-tuner) |
| pii_exposure | PII patterns in recent assistant messages (SSN, email, phone, credit card, DOB) |
| agent_spend_ratio | Per-agent token consumption to detect runaway agents |
| failover_rate | Model failover percentage (tracks primary model reliability) |
| purpose_drift | Agents working outside their designated persona scope |
| auth_failures | Authentication error tracking across providers |
| desk_queue | Agent desk queue depth monitoring |
| content_pipeline | Content review bypass detection (Scribe/Proof pipeline) |
| tool_boundary_violations | Agents using tools outside their approved scope |

All evaluator thresholds are dynamically tuned by the autonomous self-tuning engine.

### Tier 2: Trust Score Engine
**File:** `server/trust-engine.ts`

A comprehensive trust and earned autonomy system:

- **9 Trust Categories:** external_comms, content_quality, code_reliability, research_accuracy, financial_accuracy, legal_soundness, delegation_efficiency, tool_compliance, purpose_adherence
- **40 Trust Scores** across personas 2-14 (Felix through Luna)
- **4 Autonomy Levels:** blocked (0-25), approve_before (26-50), notify_after (51-75), full_auto (76-95)
- **Hysteresis Logic:** 5-consecutive-day upgrade requirement prevents score oscillation
- **Critical Events:** Security violations, PII exposure, and memory poisoning instantly lock scores to 0
- **Never-Auto Actions:** payment_action, browser_form_submit, execute_shell_destructive, kill_switch, production_data_delete always require human approval regardless of trust level
- **Atomic Updates:** All score changes use CTE-based SQL for race-condition-free concurrent operation

Starting trust scores reflect each agent's initial risk profile:
- Teagan (4) and Scribe (7): external_comms = 40 (approve_before) — they produce outward-facing content
- Felix (2): external_comms = 60 (notify_after) — operational communications
- Most agents: 80 (full_auto) in their core categories

### Tier 3: Proactive Initiative Engine
**File:** `server/proactive-engine.ts`

Enables agents to take autonomous action based on detected conditions:

- **PAB System (Proactive Action Budget):** Daily budgets scale with trust: 0 at score ≤50, 1 at ≤65, 3 at ≤80, 5 at 80+
- **32 Triggers** across 9 personas covering competitive moves, financial alerts, pipeline health, content gaps, system degradation, regulatory changes, and more
- **5-Tier Quality Tracking:** exceptional (+5 trust), solid (+3), acceptable (+1), poor (-5), harmful (-10)
- **Override Controls:** Budget overrides and manual trigger management

### Tier 4: Express Lanes
**File:** `server/express-lanes.ts`

Pre-approved direct agent-to-agent handoff routes that bypass Felix orchestration:

| Lane | Route | Work Type |
|---|---|---|
| EL-01 | Scribe → Proof | Content review |
| EL-02 | Proof → Scribe | Revision feedback |
| EL-03 | Radar → Apollo | Prospect intelligence |
| EL-04 | Radar → Cassandra | Market financial data |
| EL-05 | Atlas → Cassandra | Metrics for financial |
| EL-06 | Cassandra → Felix | Financial alert |
| EL-07 | Chief of Staff → Forge | Technical incident |
| EL-08 | Teagan → Scribe | Longform content request |
| EL-09 | Apollo → Scribe | Proposal copy request |
| EL-10 | Apollo → Luna | Contract review |
| EL-11 | Luna → Felix | Legal risk alert |
| EL-12 | Neptune → Scribe | Script request media |

- **Trust Eligibility:** Both source and target agents must have trust ≥ 60 in tool_compliance AND purpose_adherence
- **Daily Cap:** Configurable per lane (default 10/day, tuned by auto-tuner)
- **Auto-Suspension:** 3 consecutive failures automatically suspends a lane (24h default, auto-cleanup)

### Tier 5: Environmental Awareness
**File:** `server/environmental-awareness.ts`

Continuous monitoring of external conditions:

| Scan Type | Owner | Schedule |
|---|---|---|
| Competitive Pulse | Radar (9) | Every 8 hours |
| Market Sentiment | Radar (9) | Every 4 hours |
| Regulatory Watch | Luna (14) | Daily |
| Technology Watch | Forge (3) | Daily |
| Financial Signals | Cassandra (13) | Every 6 hours |
| Customer Sentiment | Teagan (4) | Every 4 hours |
| Talent Market | Luna (14) | Weekly |
| Industry Events | Radar (9) | Daily |

- **Signal Classification:** NOISE → LOW → MEDIUM → HIGH → CRITICAL
- **Signal Routing Matrix:** Each classification level has specific routing rules (e.g., CRITICAL → immediate Felix + human escalation)

### Tier 6: Collective Intelligence
**File:** `server/collective-intelligence.ts`

Multi-agent decision-making protocols for complex questions:

| Protocol | Complexity Level | Typical Cost | Daily Limit |
|---|---|---|---|
| Direct Delegation | Simple | 1 LLM call | Unlimited |
| Specialist + Critique | Moderate | 2 LLM calls | Unlimited |
| Chain of Debates | Complex | 4-6 LLM calls | 5/day |
| Tree of Thought | Ambiguous | 3-5 LLM calls | 5/day |
| Full Council (ToT → Debate → Critique → Cost) | Strategic | 10-15 LLM calls | 2/day |

- **Participant Domains:** financial_decision, product_strategy, content_marketing, technical_architecture, hiring_team
- **Token Budget Guards:** Protocols restricted when daily spend ≥ 80%
- **Complexity Auto-Classification:** Based on domain count, risk level, and keyword analysis
- **Daily limits dynamically tuned** by the auto-tuner

### Governance Integration
9 new governance rules (#32-#40) tie evaluators to automated responses:
- Trust score critical → lock agent autonomy
- Proactive action quality poor → suspend proactive budget
- Express lane failure spike → auto-cap or suspend lanes
- Environmental signal escalation → route to humans
- Collective intelligence budget overrun → cap protocols
- Earned autonomy audit → periodic trust verification

---

## Autonomous Self-Tuning Engine

**File:** `server/auto-tuner.ts`

An autonomous engine that runs every 24 hours and calibrates the entire agency framework based on real 7-day performance data.

### What It Monitors
- Task success/failure rates across all agents
- Trust score distribution (ceiling clustering at 90+, floor clustering at 10-)
- Trust score variance (differentiation between agents)
- Evaluator warning and critical event frequency
- Express lane usage volume and failure rates
- Proactive action outcomes and success rates
- HITL rejection rates
- Governance action frequency

### What It Tunes (Within Safe Bounds)
| Parameter | Safe Range | What Triggers Adjustment |
|---|---|---|
| Trust deltas (task_success, task_failure, etc.) | Per-event min/max | Score ceiling/floor clustering, high failure rates |
| Evaluator warning thresholds | 50-85% (daily_spend) | Too many false warnings, insufficient critical detection |
| Evaluator critical thresholds | 80-95% (daily_spend) | Frequent critical events |
| Express lane daily cap | 5-25 | High usage with low failures → increase; high failures → decrease |
| CI protocol daily limits | 2-10 | High proactive success rate → increase limits |
| HITL rejection penalty | -3 to -12 | High rejection rate → stronger penalty |

### Safety Guardrails
- **Minimum Data Requirement:** 20+ tasks in 7 days before making any adjustments
- **Hardcoded Safe Bounds:** Every parameter has absolute min/max it can never exceed
- **Confidence Threshold:** Adjustments require ≥ 50% confidence score
- **Audit Trail:** Every tuning cycle persisted to evaluator_snapshots table
- **90-Snapshot Rolling History** for trend analysis
- **Manual Override:** Any parameter can be manually set via API
- **Reset to Defaults:** One-click restore of all original values

### Live Integration
The auto-tuner's values are actively consumed by:
- **Trust Engine** reads tuned deltas via `getEffectiveDelta()`
- **Evaluators** read tuned warning/critical thresholds
- **Express Lanes** reads tuned daily cap via `getExpressLaneDailyCap()`
- **Collective Intelligence** reads tuned protocol limits via `getProtocolLimit()`

All engines fall back to hardcoded defaults if the auto-tuner hasn't loaded yet.

---

## Corporate Operations Scaffolding

**File:** `server/scaffolding.ts`

65 structured operation scaffolds across 12 departments with 6 cross-department workflows:

- **Departments:** Marketing, Sales, Finance, Engineering, Legal, HR, Operations, Customer Success, Executive, Content, Research, Security
- **Each Scaffold Includes:** Step sequences, required tools, expected deliverables, quality gates, escalation conditions
- **Task Classification Engine:** Auto-routes incoming tasks to the correct department and scaffold
- **Integrated into:** Chat engine (Felix prompt), Heartbeat (delegation), CEO Orchestrator (planning), Tool Router (tool selection)

---

## Chat UX

The chat interface includes modern UX features designed for a smooth, professional experience:

- **Smart Auto-Scroll** — Automatically scrolls during streaming only when user is near the bottom
- **Scroll-to-Bottom Button** — Floating pill button appears when scrolled up
- **Stop Generating** — One-click button to abort AI response mid-stream
- **Regenerate Response** — Retry the last response with preserved attachments
- **Keyboard Shortcuts** — Ctrl/Cmd+N new chat, Esc stop generation or clear input
- **Inline Charts** — Bar, Line, Pie, Area charts rendered from AI responses using Recharts
- **Live Canvas** — Sandboxed HTML rendering from agent responses
- **Voice Input/Output** — Speech-to-text recording, text-to-speech playback, Talk Mode
- **Camera Capture** — Direct camera input for mobile/desktop
- **Markdown Rendering** — Full markdown with syntax-highlighted code blocks and copy buttons
- **Thinking/Reasoning Blocks** — Toggleable reasoning traces showing AI thought process
- **Tool Call Display** — Live tool execution status with expandable details
- **Orchestration Plan Cards** — Visual progress tracking for multi-step CEO Orchestrator plans
- **Context Summary Card** — Shows remembered facts, active persona, and recent history
- **Multi-Modal Input** — Drag-and-drop file uploads, image paste, camera capture
- **Model Badge** — Shows which AI model was auto-selected for each response
- **Message Timestamps** — Time displayed on each message
- **Copy and Speak Buttons** — One-click copy or text-to-speech on any assistant message

---

## Security

- **IronClaw-inspired SafetyLayer** — LeakDetector with 17 secret patterns, PolicyEngine for dangerous content, injection protection
- **Helmet CSP** — Content Security Policy headers
- **Provider Key Proxy** — Centralized API key management with encryption
- **DB-persisted Password Reset Tokens** — Secure password recovery with expiration
- **Admin Authorization** — HMAC-SHA256 PIN verification with salt
- **Timing-Safe Cryptography** — Prevents timing attacks on authentication
- **Soft Account Deletion** — Recoverable account removal
- **Multi-Tenant Data Isolation** — Strict tenant boundaries on all queries
- **Parameterized SQL** — All queries use parameterized template literals (no sql.raw with user input)
- **Atomic Trust Updates** — CTE-based SQL prevents race conditions on concurrent score changes
- **Never-Auto Actions** — Payment, destructive, and kill-switch operations always require human approval
- **Input Validation** — API endpoints validate types, ranges, and use Number.isFinite() checks

---

## Database

PostgreSQL with Drizzle ORM, featuring 33+ tables including:

### Core Tables
- `tenants`, `conversations`, `messages`, `personas`
- `memory_entries`, `memory_categories`, `memory_links`, `agent_knowledge`, `daily_notes`
- `projects`, `project_notes`, `project_files`

### Operations Tables
- `heartbeat_tasks`, `heartbeat_logs`
- `agent_desks`, `agent_channels`, `channel_messages`, `channel_subscriptions`
- `event_log`, `event_subscriptions`

### Governance Tables
- `autonomy_rules`, `autonomy_log`
- `governance_rules`, `governance_actions`, `governance_frameworks`
- `action_outcomes`, `outcome_patterns`
- `watchlist_items`, `watchlist_alerts`

### Agency Expansion Tables
- `trust_scores` — 40 trust scores with categories, autonomy levels, hysteresis state
- `proactive_actions` — Proactive initiative tracking with outcome quality
- `express_lane_usage` — Express lane usage records with success/failure tracking
- `evaluator_snapshots` — Evaluator and auto-tuner snapshot persistence

### Platform Tables
- `skills`, `custom_tools`, `experiments`
- `provider_keys`, `tenant_provider_keys`
- `mcp_servers`, `model_registry_updates`
- `personality_files`, `oauth_subscriptions`
- `agent_settings`, `stripe_*` tables
- `file_storage`, `delivery_logs`
- `conversation_templates`, `compaction_archives`
- `scraped_pages`

---

## API Endpoints

### Agency Expansion API (`/api/agency/*`)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/agency/trust-scores | Get all trust scores for tenant |
| POST | /api/agency/trust-scores/initialize | Initialize trust scores for tenant |
| POST | /api/agency/trust-scores/event | Record a trust event (requires personaId, event) |
| GET | /api/agency/express-lanes | Get all express lanes with suspension status |
| POST | /api/agency/express-lanes/check | Check express lane eligibility |
| GET | /api/agency/proactive/:personaId | Get proactive triggers and PAB for persona |
| GET | /api/agency/evaluators | Run all evaluators and return results |
| GET | /api/agency/environmental/schedule | Get environmental scan schedules |
| GET | /api/agency/environmental/signals | Get recent environmental signals |
| GET | /api/agency/collective-intelligence | Get collective intelligence protocol usage |

### Auto-Tuner API (`/api/agency/auto-tuner/*`)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/agency/auto-tuner/status | Get tuner status, config, and last snapshot |
| GET | /api/agency/auto-tuner/config | Get current tuning configuration |
| GET | /api/agency/auto-tuner/history | Get tuning history (up to 90 snapshots) |
| POST | /api/agency/auto-tuner/run | Manually trigger a tuning cycle |
| POST | /api/agency/auto-tuner/override | Override a specific parameter (path + value) |
| POST | /api/agency/auto-tuner/reset | Reset all parameters to defaults |

---

## Deployment

- **Platform:** Replit (development + production)
- **Build:** Vite (frontend) + esbuild (backend)
- **Runtime:** Node.js with TypeScript (tsx)
- **Database:** PostgreSQL (Replit managed) with pgvector extension
- **CDN/Hosting:** Replit Deployments with health checks

---

## License

Proprietary — AI Buddy LLC. All rights reserved.

---

*Built with precision by AI Buddy LLC, Illinois. VisionClaw Agent represents the cutting edge of autonomous AI corporation technology, featuring a self-improving agency framework that learns from operational experience.*
