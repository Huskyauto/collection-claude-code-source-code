# VisionClaw Agent Platform — Fork Setup Guide

**GitHub:** https://github.com/Huskyauto/VisionClaw-Agent

---

## STEP 1: Environment Variables & Secrets

After forking, you must set ALL of the following environment variables in Replit Secrets (or your hosting platform's env config).

### REQUIRED — App Will Not Start Without These

| Variable | What It Is | Where To Get It |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Replit auto-provisions this when you add a PostgreSQL database. Format: `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Express session encryption key | Generate any random 64-char hex string: `openssl rand -hex 32` |
| `AGENTMAIL_API_KEY` | AgentMail email service API key | https://agentmail.to — sign up, create inbox |
| `PORT` | Server port | Default: `5000` (Replit sets this automatically) |

### OWNER CONFIGURATION

| Variable | What It Is |
|---|---|
| `OWNER_EMAILS` | Comma-separated owner email addresses for auto-admin privileges |
| `OWNER_ALERT_EMAIL` | Email address for system alert notifications |
| `OWNER_NAME` | Owner display name for tenant seed |
| `ADMIN_PIN` | Admin PIN for login (default: `0000`) |
| `GIT_COMMIT_EMAIL` | Email for git commit author (default: `agent@visionclaw.ai`) |

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
| `javascript_openai_ai_integrations` | OpenAI OAuth | Replit > Tools > Integrations > OpenAI |
| `javascript_anthropic_ai_integrations` | Anthropic OAuth | Replit > Tools > Integrations > Anthropic |
| `javascript_gemini_ai_integrations` | Google Gemini OAuth | Replit > Tools > Integrations > Gemini |
| `elevenlabs` | ElevenLabs integration | Replit > Tools > Integrations > ElevenLabs |
| `stripe` | Stripe payments | Replit > Tools > Integrations > Stripe |
| `google-drive` | Google Drive file backup | Replit > Tools > Integrations > Google Drive |
| `javascript_log_in_with_replit` | Replit OAuth login | Replit > Tools > Integrations > Log in with Replit |

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
| `GITHUB_TOKEN` | GitHub Personal Access Token | https://github.com/settings/tokens — needs `repo` scope |

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
   - Owner tenant (if `OWNER_ALERT_EMAIL` is set)
   - All 14 personas
   - All 40 governance rules
   - All 11 research programs
   - All 13 heartbeat tasks
   - All 59 skills (23 active, 36 inactive)
   - Provider key entries
   - Model registry (36+ models)

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
| Default PIN | Set via `ADMIN_PIN` env var (default: `0000`) |
| PIN Hash Algorithm | `HMAC-SHA256` with key `visionclaw-pin-v1` |

### Owner Account

If `OWNER_ALERT_EMAIL` and `OWNER_NAME` env vars are set, a trial tenant is auto-created on first boot. Set a password via the app's login page.

Owner emails in `OWNER_EMAILS` env var get owner-level privileges regardless of tenant assignment.

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

## STEP 5: Model Routing Priority (OAuth-First)

The system uses a 3-pass priority system. After fork, models work automatically once integrations + keys are configured:

**Fast Tier:** Gemini 3 Flash > Gemini 2.5 Flash > GPT-4.1 Mini > Replit > OpenRouter
**Powerful Tier:** Gemini 3.1 Pro > GPT-4.1 > Opus 4.6 > Sonnet 4.6 > Grok 4 > OpenRouter
**Reasoning Tier:** Gemini 3.1 Pro > o4-mini (OpenAI) > Opus 4.6 > o4-mini (OpenRouter) > GPT-5.4 > OpenRouter

---

## STEP 6: Agency Expansion Framework (6 Tiers)

| Tier | System | File | What It Does |
|---|---|---|---|
| 1 | Evaluator System | `server/evaluators.ts` | 9 evaluators (spend, PII, drift, failover, etc.) |
| 2 | Trust Score Engine | `server/trust-engine.ts` | 9 trust categories, score 0-95, hysteresis |
| 3 | Proactive Initiative | `server/proactive-engine.ts` | PAB budgets, trigger definitions, quality tracking |
| 4 | Express Lanes | `server/express-lanes.ts` | 12 approved lanes, trust >= 60, 10/day cap |
| 5 | Environmental Awareness | `server/environmental-awareness.ts` | 8 scan types, signal classification, escalation |
| 6 | Collective Intelligence | `server/collective-intelligence.ts` | 4 decision protocols, participant selection |

---

## STEP 7: Project Structure

```
server/           # 130+ TypeScript files (~89,000 lines)
  index.ts        # Entry point, startup sequence
  routes.ts       # All API routes
  auth.ts         # Authentication, PIN, sessions
  chat-engine.ts  # AI conversation engine
  seed.ts         # Database seeding
  providers.ts    # AI model provider routing
  tools.ts        # 95 AI tools
  heartbeat.ts    # Scheduled task engine
  instinct-learning.ts  # Agent instinct learning system
  auto-qa.ts      # Automatic QA pipeline
  delegation-events.ts  # Live delegation event feed

shared/
  schema.ts       # Drizzle ORM schema (66 tables)

client/src/
  pages/          # 38+ React pages
  components/     # UI components
  App.tsx         # Router and layout
```

---

## Quick Start Checklist

After forking:

- [ ] 1. Add PostgreSQL database in Replit
- [ ] 2. Set `SESSION_SECRET` (random hex string)
- [ ] 3. Set `AGENTMAIL_API_KEY`
- [ ] 4. Set `ADMIN_PIN`, `OWNER_ALERT_EMAIL`, `OWNER_EMAILS`, `OWNER_NAME`
- [ ] 5. Connect Replit integrations: OpenAI, Anthropic, Gemini, Google Drive
- [ ] 6. Set at least one direct API key: `OPENAI_API_KEY` or `OPENROUTER_API_KEY`
- [ ] 7. Set `GITHUB_TOKEN` for auto-backup
- [ ] 8. Run `npm run db:push`
- [ ] 9. Run `npm run dev` — seed runs automatically
- [ ] 10. Login with your configured admin PIN
- [ ] 11. Go to Settings > Provider Keys and enter your API keys
- [ ] 12. Verify heartbeat tasks are running

---

## IMPORTANT NOTES

- **Never run `drizzle-kit push --force`** unless schema is out of sync
- **Seed is idempotent** — safe to run multiple times (uses `ON CONFLICT DO NOTHING`)
- **Personas table has NO tenant_id column** — never filter by tenant
- **All files/images go to Google Drive** via `uploadAndShare()` — local URLs are banned
- **pgvector** initializes only in production to avoid migration conflicts
- **Sensitive data** — All credentials are loaded from environment variables, never hardcoded

---

*Last updated: March 31, 2026*
*Platform: VisionClaw Agent v1.0.0*
