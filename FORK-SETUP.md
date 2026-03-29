# VisionClaw Agent Platform — Fork Setup Guide

**Owner:** Bob Washburn (huskyauto@gmail.com)
**Company:** AI Buddy LLC, Illinois
**GitHub:** https://github.com/Huskyauto/VisionClaw-Agent

---

## STEP 1: Environment Variables & Secrets

After forking, you must set ALL of the following environment variables in Replit Secrets (or your hosting platform's env config).

### REQUIRED — App Will Not Start Without These

| Variable | What It Is | Where To Get It |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Replit auto-provisions this when you add a PostgreSQL database. Format: `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Express session encryption key | Generate any random 64-char hex string: `openssl rand -hex 32` |
| `AGENTMAIL_API_KEY` | AgentMail email service API key | https://agentmail.to — sign up, create inbox `visionclaw@agentmail.to` |
| `PORT` | Server port | Default: `5000` (Replit sets this automatically) |

### AI PROVIDER KEYS — At Least One Required

| Variable | Provider | Where To Get It |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI (GPT-4.1, o4-mini) | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Anthropic (Claude Opus, Sonnet) | https://console.anthropic.com/ |
| `OPENROUTER_API_KEY` | OpenRouter (30+ models fallback) | https://openrouter.ai/keys |
| `XAI_API_KEY` | xAI (Grok models) | https://console.x.ai/ |
| `PERPLEXITY_API_KEY` | Perplexity (Sonar research) | https://www.perplexity.ai/settings/api |
| `FIRECRAWL_API_KEY` | Firecrawl (web scraping) | https://firecrawl.dev/ |
| `ELEVENLABS_API_KEY` | ElevenLabs (text-to-speech) | https://elevenlabs.io/ |
| `BROWSERLESS_API_KEY` | Browserless (headless Chrome) | https://www.browserless.io/ |

### REPLIT INTEGRATIONS — OAuth-Based (Free, No Keys Needed)

These are configured through Replit's integration system, NOT as manual secrets:

| Integration | What It Provides | How To Set Up |
|---|---|---|
| `javascript_openai_ai_integrations` | OpenAI OAuth (GPT-4.1, o4-mini at $0 direct cost) | Replit > Tools > Integrations > OpenAI |
| `javascript_anthropic_ai_integrations` | Anthropic OAuth (Claude models) | Replit > Tools > Integrations > Anthropic |
| `javascript_gemini_ai_integrations` | Google Gemini OAuth (Gemini 3.1 Pro, 3 Flash) | Replit > Tools > Integrations > Gemini |
| `elevenlabs` | ElevenLabs integration | Replit > Tools > Integrations > ElevenLabs |
| `stripe` | Stripe payments | Replit > Tools > Integrations > Stripe |
| `google-drive` | Google Drive file backup | Replit > Tools > Integrations > Google Drive |
| `javascript_log_in_with_replit` | Replit OAuth login | Replit > Tools > Integrations > Log in with Replit |

When these integrations are connected, they automatically provide env vars:
- `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` + `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_GEMINI_API_KEY` + `AI_INTEGRATIONS_GEMINI_BASE_URL`

### PAYMENT PROCESSING

| Variable | What It Is | Where To Get It |
|---|---|---|
| `STRIPE_LIVE_SECRET_KEY` | Stripe Live secret key | https://dashboard.stripe.com/apikeys |
| `STRIPE_LIVE_PUBLISHABLE_KEY` | Stripe Live publishable key | Same page |
| `COINBASE_COMMERCE_API_KEY` | Coinbase Commerce API key | https://commerce.coinbase.com/settings |
| `COINBASE_COMMERCE_PROJECT_ID` | Coinbase Commerce project ID | Same settings page |
| `COINBASE_CDP_API_KEY_ID` | Coinbase Developer Platform key | https://portal.cdp.coinbase.com/ |

### GITHUB INTEGRATION

| Variable | What It Is | Where To Get It |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token | https://github.com/settings/tokens — needs `repo` scope. Used for auto-backup pushes to `Huskyauto/VisionClaw-Agent` |

### YOUTUBE INTEGRATION (Optional)

| Variable | What It Is |
|---|---|
| `YOUTUBE_CLIENT_ID` | Google OAuth Client ID for YouTube |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth Client Secret |
| `YOUTUBE_REFRESH_TOKEN` | YouTube OAuth refresh token |

These are also stored in the `oauth_subscriptions` table and auto-refresh.

---

## STEP 2: Database Setup

### Option A: Fresh Database (Recommended for Fork)

1. Provision a PostgreSQL database (Replit does this automatically)
2. Run the schema push:
   ```bash
   npm run db:push
   ```
3. Start the app — the seed function runs automatically on first boot and creates:
   - Admin tenant (#1): `admin@visionclaw.ai` / plan: enterprise
   - Bob Washburn tenant (#8): `huskyauto@gmail.com` / plan: trial
   - All 14 personas
   - All 40 governance rules
   - All 11 research programs
   - All 13 heartbeat tasks
   - All 59 skills (23 active, 36 inactive)
   - Provider key entries
   - Model registry with 36+ models

### Option B: Restore From Existing Database

If migrating data, export/import using `pg_dump` and `pg_restore`.

### Database Tables (66 total)

```
action_outcomes, agent_channels, agent_desks, agent_knowledge,
agent_settings, ai_insights, auth_sessions, autonomy_log,
autonomy_rules, briefing_reports, briefing_widgets, channel_messages,
channel_subscriptions, code_proposals, compaction_archives,
conversation_templates, conversations, custom_tools, daily_notes,
delivery_logs, doc_chunks, doc_collections, email_verification_codes,
evaluator_snapshots, event_log, event_subscriptions, experiments,
express_lane_usage, file_storage, governance_actions,
governance_frameworks, governance_rules, heartbeat_logs,
heartbeat_tasks, mcp_servers, memory_categories, memory_entries,
memory_links, messages, model_registry_updates, oauth_subscriptions,
outcome_patterns, password_reset_tokens, personality_files, personas,
proactive_actions, project_conversations, project_files, project_notes,
projects, provider_keys, research_experiments, research_programs,
research_schedules, research_sessions, scraped_pages, sessions, skills,
tenant_persona_names, tenant_provider_keys, tenants, trust_scores,
usage_tracking, users, watchlist_alerts, watchlist_items
```

---

## STEP 3: Login Credentials

### Admin Access

| Field | Value |
|---|---|
| Admin Tenant ID | `1` |
| Admin Email | `admin@visionclaw.ai` |
| Auth Type | PIN-based (not password) |
| Default PIN | `0429` |
| PIN Hash Algorithm | `HMAC-SHA256` with key `visionclaw-pin-v1` |

### Bob Washburn Account

| Field | Value |
|---|---|
| Tenant ID | `8` |
| Email | `huskyauto@gmail.com` |
| Password | `Rw-120764` |
| Password Hash | Stored as scrypt hash in `tenants.password_hash` |
| Plan | `trial` (unlimited — `PLAN_LIMITS.trial = -1`) |

### Owner Emails (Hardcoded in `server/auth.ts`)

```
huskyauto@gmail.com
huskyauto@hotmail.com
```

These emails get owner-level privileges regardless of tenant assignment.

---

## STEP 4: The 14 AI Personas

| # | Name | Role |
|---|---|---|
| 1 | VisionClaw | Primary AI assistant — general purpose |
| 2 | Felix | Operations manager — delegation, oversight |
| 3 | Forge | Code generation and technical engineering |
| 4 | Teagan | QA testing and quality assurance |
| 5 | Agent Blueprint | System architecture and design |
| 6 | Chief of Staff | Executive operations and planning |
| 7 | Scribe | Content writing and documentation |
| 8 | Proof | Proofreading and content review |
| 9 | Radar | Market research and competitive intelligence |
| 10 | Neptune | Finance and analytics |
| 11 | Apollo | Creative and brand marketing |
| 12 | Atlas | Data analysis and business intelligence |
| 13 | Cassandra | Risk assessment and forecasting |
| 14 | Luna | Wellness and emotional support |

---

## STEP 5: AI Provider Keys in Database

The `provider_keys` table stores encrypted API keys. After fork, re-enter them via the Admin Settings page (`/settings`). Required providers:

| Provider | Enabled | What It Powers |
|---|---|---|
| `anthropic` | true | Claude models (Opus 4.6, Sonnet 4.6) |
| `openai` | true | GPT-4.1, o4-mini |
| `google` | true | Gemini models (also via OAuth integration) |
| `openrouter` | true | 30+ fallback models (DeepSeek, Qwen, Llama, etc.) |
| `xai` | true | Grok 4 |
| `perplexity` | true | Sonar Pro, Deep Research |
| `elevenlabs` | true | Text-to-speech |
| `google_drive_token` | true | Google Drive backup (auto-managed via OAuth) |

---

## STEP 6: Model Routing Priority (OAuth-First)

The system uses a 3-pass priority system. After fork, models work automatically once integrations + keys are configured:

**Fast Tier:** Gemini 3 Flash → Gemini 2.5 Flash → GPT-4.1 Mini → Replit → OpenRouter
**Powerful Tier:** Gemini 3.1 Pro → GPT-4.1 → Opus 4.6 → Sonnet 4.6 → Grok 4 → OpenRouter
**Reasoning Tier:** Gemini 3.1 Pro → o4-mini (OpenAI) → Opus 4.6 → o4-mini (OpenRouter) → GPT-5.4 → OpenRouter
**Cost Tier (Research):** Gemini 3 Flash → Gemini 2.5 Flash → GPT-4.1 Mini → GLM-5 Turbo

---

## STEP 7: Research Programs (11 Active)

All auto-created by seed. Models default to `gemini-2.5-flash`. Auto-corrected on startup if assigned model doesn't exist.

| # | Program | Type |
|---|---|---|
| 2 | Emotional Eating Crisis Interventions | AI Buddy Business |
| 3 | AI Buddy Content Marketing Pipeline | AI Buddy Business |
| 4 | Competitive Intelligence — Weight Loss & Emotional Eating Market | AI Buddy Business |
| 5 | AI Buddy Revenue & Pricing Strategy | AI Buddy Business |
| 6 | Daily Companion Message Library | AI Buddy Business |
| 7 | AI Buddy Legal & Compliance Framework | AI Buddy Business |
| 8 | Nightly AI Model & Provider Intelligence | Nightly Platform |
| 9 | Nightly AI Tools & Techniques Scanner | Nightly Platform |
| 10 | Nightly Competitive Platform Analysis | Nightly Platform |
| 11 | Nightly Agent Architecture Research | Nightly Platform |
| 12 | Nightly Security & Safety Intelligence | Nightly Platform |

---

## STEP 8: Heartbeat Tasks (13 Scheduled Jobs)

| # | Task | Schedule | Active |
|---|---|---|---|
| 1 | Self-Reflection | Every 30 min | YES |
| 2 | Memory Consolidation | Every 2 hours | YES |
| 3 | Daily Planning | 9 AM daily | no |
| 5 | Test Agent Task | Every 30 min | no |
| 8 | Model Scout | 6 AM Monday | YES |
| 75 | Daily Cloud Backup | 3 AM daily | YES |
| 2149 | Memory Snapshot Backup | Every 12 hours | no |
| 3491 | Decision Analysis Engine | 6 AM daily | no |
| 3492 | Trend Forecasting Engine | 7 AM Monday | no |
| 3493 | Process Optimization Engine | 5 AM daily | no |
| 3495 | Process Governor | Every 12 hours | no |
| 3496 | Quarterly Governance Research | 3 AM, 1st of quarter | no |
| 3497 | Quarterly Model Registry Refresh | 3 AM, 15th of quarter | no |

---

## STEP 9: Governance Rules (40 Active)

All 40 rules are seeded and enabled by default. Categories:
- **Subscription Management** (#1-#2)
- **Task Health** (#3-#4)
- **Budget & Tokens** (#5-#6, #27)
- **Agent Health** (#7, #11, #16, #29)
- **Security** (#10, #24)
- **Content** (#13)
- **Autonomy** (#14, #21)
- **Failure Detection** (#15)
- **Delegation** (#17, #22-#23)
- **Memory** (#18)
- **Boundaries** (#19, #25-#26, #28)
- **Emergency** (#20)
- **Trust System** (#32-#33)
- **Proactive Engine** (#34-#35)
- **Express Lanes** (#36-#37)
- **Environmental** (#38)
- **Collective Intelligence** (#39)
- **Earned Autonomy** (#40)

---

## STEP 10: Email Configuration

| Setting | Value |
|---|---|
| Email Provider | AgentMail (agentmail.to) |
| Inbox Address | `visionclaw@agentmail.to` |
| Env Variable | `AGENTMAIL_API_KEY` |
| Owner Alert Email | `huskyauto@gmail.com` |
| Git Commit Email | `visionclaw@huskyauto.dev` |

---

## STEP 11: GitHub Auto-Backup

The system auto-pushes to GitHub on the Daily Cloud Backup heartbeat task.

| Setting | Value |
|---|---|
| Repository | `https://github.com/Huskyauto/VisionClaw-Agent` |
| Branch | `main` |
| Auth | `GITHUB_TOKEN` env var (Personal Access Token with `repo` scope) |
| Git Author | `VisionClaw Agent <visionclaw@huskyauto.dev>` |

To change the repo after fork, update these files:
- `server/heartbeat.ts` (line ~675)
- `server/routes.ts` (line ~6016)
- `server/index.ts` (line ~37)

---

## STEP 12: Startup Sequence

When the app starts (`npm run dev`), it automatically:

1. Connects to PostgreSQL via `DATABASE_URL`
2. Runs `npm run db:push` to sync schema (66 tables)
3. Runs `seedDatabase()` which:
   - Creates admin tenant (#1) and Bob Washburn tenant (#8)
   - Seeds all 14 personas with personality files
   - Seeds 40 governance rules
   - Seeds 11 research programs
   - Seeds 13 heartbeat tasks
   - Seeds 59 skills
   - Seeds model registry (36+ models)
   - Seeds provider key entries
   - Sets default PIN (0429)
4. Runs `fixResearchProgramModels()` to validate research models exist
5. Starts heartbeat engine (cron scheduler)
6. Starts Express server on PORT (default 5000)
7. Initializes pgvector for embeddings (production only)
8. Backfills embeddings for knowledge entries missing vectors

---

## STEP 13: NPM Scripts

```bash
npm run dev      # Development mode (tsx server/index.ts)
npm run build    # Production build (tsx script/build.ts → dist/index.cjs)
npm run start    # Production mode (node dist/index.cjs)
npm run db:push  # Sync Drizzle schema to database
```

---

## STEP 14: Project Structure

```
server/           # 120 TypeScript files (~60,000 lines)
  index.ts        # Entry point, startup sequence
  routes.ts       # All API routes
  auth.ts         # Authentication, PIN, sessions
  chat-engine.ts  # AI conversation engine
  seed.ts         # Database seeding
  providers.ts    # AI model provider routing
  model-failover.ts  # Auto-failover between providers
  heartbeat.ts    # Scheduled task engine
  research-engine.ts # Autonomous research system
  embeddings.ts   # Vector embedding generation
  trust-engine.ts # Trust score system (Tier 2)
  evaluators.ts   # 9 evaluator system (Tier 1)
  express-lanes.ts # Express lane delegation (Tier 4)
  proactive-engine.ts # Proactive initiative engine (Tier 3)
  environmental-awareness.ts # Signal scanning (Tier 5)
  collective-intelligence.ts # Multi-agent decisions (Tier 6)
  process-governor.ts # Governance rule enforcement
  email.ts        # AgentMail integration
  google-drive.ts # Google Drive backup
  tools.ts        # 89 AI tools
  stripe-connect.ts # Stripe payment processing
  coinbase-commerce.ts # Coinbase Commerce

shared/
  schema.ts       # Drizzle ORM schema (66 tables)

client/src/
  pages/          # 38 React pages
  components/     # UI components
  App.tsx         # Router and layout
```

---

## STEP 15: Agency Expansion Framework (6 Tiers)

All 6 tiers are fully implemented:

| Tier | System | File | What It Does |
|---|---|---|---|
| 1 | Evaluator System | `server/evaluators.ts` | 9 evaluators (spend, PII, drift, failover, etc.) |
| 2 | Trust Score Engine | `server/trust-engine.ts` | 9 trust categories, score 0-95, hysteresis |
| 3 | Proactive Initiative | `server/proactive-engine.ts` | PAB budgets, trigger definitions, quality tracking |
| 4 | Express Lanes | `server/express-lanes.ts` | 12 approved lanes, trust >= 60, 10/day cap |
| 5 | Environmental Awareness | `server/environmental-awareness.ts` | 8 scan types, signal classification, escalation |
| 6 | Collective Intelligence | `server/collective-intelligence.ts` | 4 decision protocols, participant selection |

---

## STEP 16: OAuth Subscriptions (Auto-Managed)

Currently connected OAuth accounts stored in `oauth_subscriptions`:

| Provider | Tenant | Purpose |
|---|---|---|
| `youtube` | 1 (admin) | YouTube uploads, management |
| `google-workspace` | 1 (admin) | Google Drive file backup |

These tokens auto-refresh. After fork, re-authenticate via the OAuth flows in the app.

---

## STEP 17: Quick Start Checklist

After forking:

- [ ] 1. Add PostgreSQL database in Replit
- [ ] 2. Set `SESSION_SECRET` (random hex string)
- [ ] 3. Set `AGENTMAIL_API_KEY`
- [ ] 4. Connect Replit integrations: OpenAI, Anthropic, Gemini, Google Drive
- [ ] 5. Set at least one direct API key: `OPENAI_API_KEY` or `OPENROUTER_API_KEY`
- [ ] 6. Set `GITHUB_TOKEN` for auto-backup
- [ ] 7. Set `STRIPE_LIVE_SECRET_KEY` + `STRIPE_LIVE_PUBLISHABLE_KEY` for payments
- [ ] 8. Run `npm run db:push`
- [ ] 9. Run `npm run dev` — seed runs automatically
- [ ] 10. Login with PIN `0429` or email `huskyauto@gmail.com` / password `Rw-120764`
- [ ] 11. Go to Settings > Provider Keys and enter your API keys
- [ ] 12. Verify heartbeat tasks are running (Self-Reflection, Memory Consolidation)
- [ ] 13. Test a chat message to confirm model routing works

---

## IMPORTANT NOTES

- **Never run `drizzle-kit push --force`** unless schema is out of sync
- **Never modify `shared/schema.ts`** without understanding all 66 table dependencies
- **Seed is idempotent** — safe to run multiple times (uses `ON CONFLICT DO NOTHING`)
- **Build marker:** `build-v5-detailed-errors` in seed.ts confirms latest seed version
- **PLAN_LIMITS.trial = -1** means trial plan has unlimited usage
- **Personas table has NO tenant_id column** — never filter by tenant
- **All files/images go to Google Drive** via `uploadAndShare()` — local URLs are banned
- **PII Whitelist:** `visionclaw@agentmail.to` and `huskyauto@gmail.com` are whitelisted
- **pgvector** initializes only in production to avoid migration conflicts

---

*Last updated: March 29, 2026*
*Platform: VisionClaw Agent v1.0.0 — AI Buddy LLC*
