# VisionClaw Agent — Fork Setup Guide

Complete guide to get the VisionClaw Agent platform running after forking the repository on Replit.

---

## Quick Start Checklist

1. Fork the Repl on Replit
2. Provision a PostgreSQL database
3. Set required environment secrets
4. Install Replit integrations
5. Run the app (it auto-seeds the database)
6. Log in with the default admin PIN
7. Configure optional integrations from Settings

---

## Step 1: Fork the Repl

1. Open the original VisionClaw Agent Repl on Replit
2. Click **Fork** to create your own copy
3. The fork includes all code, workflows, and configuration files
4. The `.replit` file configures the run command and port (5000) automatically

---

## Step 2: Database Setup

The app requires a PostgreSQL database. Replit provides one automatically.

### Automatic (Replit PostgreSQL)
1. In your forked Repl, go to **Tools** > **Database**
2. Click **Create Database** to provision a PostgreSQL instance
3. Replit automatically sets the `DATABASE_URL` environment variable
4. No manual schema setup needed — the app creates all 40+ tables on first startup via `seed.ts`

### What Happens on First Run
- `seed.ts` runs automatically and creates all tables using `CREATE TABLE IF NOT EXISTS`
- Schema evolution patches are applied via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Default admin tenant (ID 1) is created with PIN `0429`
- 14 default AI personas are seeded with full Soul/Identity/Operating Loop documents
- 50+ default skills are created
- System heartbeat tasks (Self-Reflection, backups) are initialized
- Stripe schema tables are created via `stripe-replit-sync`

---

## Step 3: Required Environment Secrets

Go to **Tools** > **Secrets** in your Repl and set these variables.

### Critical (App Won't Start Without These)

| Secret | Description | How to Get |
|--------|-------------|------------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Replit when you create a database |
| `SESSION_SECRET` | Session encryption key (any random 32+ char string) | Generate with: `openssl rand -hex 32` |

### AI Providers (At Least One Required)

The app supports multiple AI providers. You need at least one to chat. The Replit AI integrations (Step 4) provide OpenAI, Anthropic, and Gemini at no API cost to you — start there.

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o, GPT-5, etc.) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude models) | [console.anthropic.com](https://console.anthropic.com/) |
| `XAI_API_KEY` | xAI API key (Grok models) | [console.x.ai](https://console.x.ai/) |
| `OPENROUTER_API_KEY` | OpenRouter API key (DeepSeek, Qwen, Kimi, etc.) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `PERPLEXITY_API_KEY` | Perplexity API key (Sonar web search) | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |

Note: The Replit AI Integrations (Step 4) automatically provide `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, and `AI_INTEGRATIONS_GEMINI_API_KEY`. These work without you needing your own API keys for those three providers.

### Payments (Optional — Enable When Ready)

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `STRIPE_LIVE_SECRET_KEY` | Stripe secret key | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_LIVE_PUBLISHABLE_KEY` | Stripe publishable key | Same Stripe dashboard |
| `COINBASE_CDP_API_KEY_ID` | Coinbase Developer Platform key | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/) |
| `COINBASE_COMMERCE_API_KEY` | Coinbase Commerce API key | [commerce.coinbase.com/settings](https://commerce.coinbase.com/settings) |
| `COINBASE_COMMERCE_PROJECT_ID` | Coinbase Commerce project ID | Same Commerce dashboard |

### Voice & Media (Optional)

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `ELEVENLABS_API_KEY` | ElevenLabs TTS/STT API key | [elevenlabs.io/app/settings](https://elevenlabs.io/app/settings) |

### External Tools (Optional)

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `BROWSERLESS_API_KEY` | Browserless.io key for virtual browser | [browserless.io](https://www.browserless.io/) |
| `AGENTMAIL_API_KEY` | AgentMail key for email features | [agentmail.to](https://agentmail.to/) |
| `FIRECRAWL_API_KEY` | Firecrawl web scraping key | [firecrawl.dev](https://www.firecrawl.dev/) |
| `GITHUB_TOKEN` | GitHub personal access token for auto-backup | [github.com/settings/tokens](https://github.com/settings/tokens) |
| `ADMIN_ALERT_EMAIL` | Email address for system health alerts | Your email address |

---

## Step 4: Install Replit Integrations

These integrations are managed by Replit and provide API access without needing your own keys. Go to **Tools** > **Integrations** in your Repl.

### Required Integrations

| Integration | Purpose | Setup |
|------------|---------|-------|
| **OpenAI AI Integration** | Provides GPT models via Replit's proxy | Search "OpenAI" > Install > Auto-configures `AI_INTEGRATIONS_OPENAI_*` |
| **Anthropic AI Integration** | Provides Claude models via Replit's proxy | Search "Anthropic" > Install > Auto-configures `AI_INTEGRATIONS_ANTHROPIC_*` |
| **Gemini AI Integration** | Provides Gemini models via Replit's proxy | Search "Gemini" > Install > Auto-configures `AI_INTEGRATIONS_GEMINI_*` |

### Recommended Integrations

| Integration | Purpose | Setup |
|------------|---------|-------|
| **Google Drive** | File uploads, backups, PDF storage | Search "Google Drive" > Install > Connect your Google account |
| **Stripe** | Payment processing, subscriptions | Search "Stripe" > Install > Connect your Stripe account |
| **ElevenLabs** | Text-to-Speech and Speech-to-Text | Search "ElevenLabs" > Install > Connect your account |
| **Log in with Replit** | Social login via Replit accounts | Search "Log in with Replit" > Install > Auto-configures |

### How Integrations Work
- Replit integrations inject environment variables automatically (e.g., `AI_INTEGRATIONS_OPENAI_API_KEY`)
- The app's `server/providers.ts` checks for these variables when creating AI clients
- Google Drive uses the Replit Connectors API (`REPLIT_CONNECTORS_HOSTNAME`) to fetch OAuth tokens
- Stripe uses the Connectors API for managed webhook and key provisioning
- These variables are set per-environment (development and production separately)

---

## Step 5: Start the App

1. Click **Run** in your Repl, or the workflow "Start application" will execute `npm run dev`
2. Wait for the console to show: `serving on port 5000`
3. The app will:
   - Create all database tables (first run)
   - Seed default personas, skills, and tasks
   - Initialize the heartbeat engine
   - Start the health monitor
4. Open the Webview panel — you should see the VisionClaw landing page

### Verify Startup
Look for these log messages confirming successful initialization:
```
[seed] Database seeded successfully
[auth] Loaded N active sessions from database
[heartbeat] Starting heartbeat engine (checking every 60s)
[health-monitor] Started (checking every 300s)
serving on port 5000
```

---

## Step 6: First Login

### Default Admin Access
- **PIN**: `0429` (HMAC-SHA256 hashed, can be changed in Settings)
- Navigate to the app URL and enter the PIN
- You are now logged in as the admin tenant (ID 1)

### Changing the Admin PIN
1. Go to **Settings** (sidebar > Admin section)
2. Find the PIN Authentication section
3. Enter your current PIN and set a new one

### Alternative Auth Methods
- **Email + Password**: Users can register via the signup page
- **Replit Auth**: If "Log in with Replit" integration is installed, users can log in with their Replit accounts

---

## Step 7: Post-Login Configuration

### Test AI Connectivity
1. Open a **New Chat** from the sidebar
2. Type "test" and send — Felix should respond using one of the configured AI providers
3. If you get an error, check that at least one AI provider is configured (Replit integrations or API keys)

### Configure Provider API Keys (Settings Page)
1. Go to **Settings** > **API Key Management**
2. You can add/test individual provider keys here
3. Click "Test Connection" next to each provider to verify

### Set Up Google Drive (Recommended)
1. Install the Google Drive integration (Step 4)
2. The app automatically creates a "VisionClaw Agent" folder in your Drive
3. All PDFs, screenshots, and backups are uploaded here
4. Verify: Go to **Settings** > click **Export** on Corporation Report — it should upload to Drive

### Set Up Email (Optional)
1. Set `AGENTMAIL_API_KEY` in Secrets
2. The app auto-provisions a `@agentmail.to` inbox
3. Go to **Email** in the sidebar to see your inbox

### Set Up WhatsApp (Optional — Admin Only)
1. Go to **WhatsApp** in the sidebar (Admin section)
2. Click **Connect** to generate a QR code
3. Scan with WhatsApp on your phone
4. The AI can now send/receive WhatsApp messages and approval requests

### Set Up Stripe Payments (Optional)
1. Install the Stripe integration OR set `STRIPE_LIVE_SECRET_KEY` and `STRIPE_LIVE_PUBLISHABLE_KEY`
2. Go to **Payments** in the sidebar
3. Products and prices sync automatically from your Stripe account
4. The landing page pricing section connects to Stripe Checkout

### Set Up Coinbase Crypto (Optional)
1. Set `COINBASE_CDP_API_KEY_ID` and `COINBASE_COMMERCE_API_KEY` in Secrets
2. Per-tenant wallets are created automatically when users access crypto features

---

## Step 8: Publishing (Production Deployment)

When ready to go live:

1. Click **Deploy** (or **Publish**) in Replit
2. The build process runs automatically:
   - `npm run build` compiles frontend (Vite) and backend (esbuild) into `dist/`
   - Research data syncs from dev to production
3. Production runs `npm run start` which serves `dist/index.cjs`
4. All database tables auto-create/update on production startup
5. Set up a custom domain in Replit's deployment settings if desired

### Production Environment Notes
- Ensure all required Secrets are set in the **Production** environment (Replit manages dev/prod separately)
- Google Drive and Stripe integrations need to be connected in both environments
- The heartbeat engine and health monitor start automatically in production
- WhatsApp connections are environment-specific (dev connects are skipped in production to prevent conflicts)

---

## Troubleshooting

### App won't start
- Check that `DATABASE_URL` is set (create a PostgreSQL database in Tools > Database)
- Check console logs for specific errors
- Run `npm install` if dependencies are missing

### "No AI providers configured"
- Install at least one Replit AI integration (OpenAI, Anthropic, or Gemini)
- OR set at least one API key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.)

### Chat returns errors
- Go to Settings > API Key Management > Test each provider
- Check that the model you selected is available with your configured keys
- Try switching to "Auto Select" mode which routes to the best available model

### Google Drive uploads fail
- Ensure the Google Drive integration is installed and connected
- Check logs for `[gdrive]` messages — it should show "Got fresh token via connector"
- The integration needs to be connected in both dev and production environments

### Stripe webhooks not working
- If using Stripe integration, webhooks are managed automatically
- If using BYOK keys, you need to create a webhook endpoint in Stripe pointing to `https://your-app-url/api/stripe/webhook`

### Email not sending
- Verify `AGENTMAIL_API_KEY` is set
- Check logs for `[email]` messages
- The primary inbox is auto-created as `visionclaw@agentmail.to`

### Heartbeat tasks failing
- Check **Heartbeat Engine** page for error logs
- Most failures are from missing AI provider keys
- System tasks use cost-efficient models (GPT-5-Nano via fast tier) — ensure at least one cheap model is available

### Database issues after schema changes
- The app uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` for safe migrations
- Never run `drizzle-kit push` manually — the app handles all schema evolution in `seed.ts`
- If stuck, you can reset by dropping all tables and restarting (the app re-creates everything)

---

## Environment Variables Reference

### Auto-Set by Replit (Do Not Modify)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (set when you create a database) |
| `REPL_ID` | Repl identifier |
| `REPL_SLUG` | Repl name |
| `REPL_OWNER` | Repl owner username |
| `REPL_IDENTITY` | Repl identity token for internal auth |
| `REPLIT_DOMAINS` | Comma-separated list of domains |
| `REPLIT_DEV_DOMAIN` | Development domain |
| `REPLIT_DEPLOYMENT` | Set to `1` in production deployments |
| `REPLIT_CONNECTORS_HOSTNAME` | Hostname for Replit's connector API |
| `WEB_REPL_RENEWAL` | Deployment renewal token |
| `PORT` | Server port (defaults to 5000) |

### Auto-Set by Replit Integrations (Do Not Modify)
| Variable | Source Integration |
|----------|-------------------|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI AI Integration |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI AI Integration |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic AI Integration |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic AI Integration |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini AI Integration |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini AI Integration |
| `ELEVENLABS_BASE_URL` | ElevenLabs Integration |
| `ISSUER_URL` | Log in with Replit Integration |

### User-Configured Secrets
| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | Yes | Session encryption (generate a random 32+ char hex string) |
| `OPENAI_API_KEY` | Optional | Direct OpenAI API access (separate from Replit integration) |
| `ANTHROPIC_API_KEY` | Optional | Direct Anthropic API access |
| `XAI_API_KEY` | Optional | xAI/Grok models |
| `OPENROUTER_API_KEY` | Optional | OpenRouter (DeepSeek, Qwen, Kimi, etc.) |
| `PERPLEXITY_API_KEY` | Optional | Perplexity Sonar web search |
| `ELEVENLABS_API_KEY` | Optional | Voice TTS/STT |
| `STRIPE_LIVE_SECRET_KEY` | Optional | Stripe payments |
| `STRIPE_LIVE_PUBLISHABLE_KEY` | Optional | Stripe frontend |
| `COINBASE_CDP_API_KEY_ID` | Optional | Coinbase wallets |
| `COINBASE_COMMERCE_API_KEY` | Optional | Coinbase Commerce payments |
| `COINBASE_COMMERCE_PROJECT_ID` | Optional | Coinbase Commerce project |
| `BROWSERLESS_API_KEY` | Optional | Virtual browser for AI |
| `AGENTMAIL_API_KEY` | Optional | Email inbox features |
| `FIRECRAWL_API_KEY` | Optional | Enhanced web scraping |
| `GITHUB_TOKEN` | Optional | Auto-backup to GitHub |
| `ADMIN_ALERT_EMAIL` | Optional | Health alert destination |

---

## Architecture Quick Reference

```
VisionClaw Agent
├── client/                 # React 18 frontend
│   ├── src/
│   │   ├── pages/          # 31 page components
│   │   ├── components/     # Shared UI components (shadcn/ui)
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Query client, utilities
│   └── index.html
├── server/                 # Express.js backend
│   ├── index.ts            # Entry point
│   ├── routes.ts           # 190+ API endpoints
│   ├── providers.ts        # AI model registry & routing
│   ├── model-failover.ts   # Auto-failover between providers
│   ├── oauth-subscriptions.ts  # Subscription OAuth flows
│   ├── chat-engine.ts      # Chat processing & tool loops
│   ├── heartbeat.ts        # Autonomous background engine
│   ├── research-engine.ts  # Deep Research experiment loops
│   ├── agentic-engines.ts  # Decision/Predictive/Optimization
│   ├── memory-intelligence.ts  # Fact extraction & dedup
│   ├── compaction.ts       # Zero-loss conversation compaction
│   ├── tools.ts            # 49+ agentic tool definitions
│   ├── browser-tool.ts     # Virtual browser (Puppeteer)
│   ├── whatsapp.ts         # WhatsApp Web integration
│   ├── google-drive.ts     # Drive uploads & backups
│   ├── email.ts            # AgentMail integration
│   ├── voice.ts            # TTS/STT multi-provider
│   ├── crypto.ts           # AES-256-GCM encryption
│   ├── seed.ts             # Database initialization
│   └── auth.ts             # Multi-method authentication
├── shared/
│   └── schema.ts           # Drizzle ORM schema (40+ tables)
├── script/
│   ├── build.ts            # Production build orchestration
│   └── sync-dev-to-prod.ts # Research data sync
└── package.json            # Scripts: dev, build, start
```

---

## Support

- **GitHub**: [Huskyauto/VisionClaw-Agent](https://github.com/Huskyauto/VisionClaw-Agent)
- **Website**: [visionclawagent.com](https://visionclawagent.com)
- **Company**: AI Buddy LLC, Illinois

---

Built with care on [Replit](https://replit.com).
