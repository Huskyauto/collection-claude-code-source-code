# VisionClaw Corporation — Corporate Operations Scaffolding System
## The Universal Playbook for AI Agent Execution
### Version 1.0 — AI Buddy LLC

---

# TABLE OF CONTENTS

1. **SYSTEM ARCHITECTURE** — How the scaffolding works
2. **TASK CLASSIFICATION ENGINE** — Felix's routing brain
3. **DEPARTMENT PLAYBOOKS** (12 Departments)
   - 3A. Executive & Strategic Planning
   - 3B. Engineering & Technology
   - 3C. Content & Creative
   - 3D. Marketing & Growth
   - 3E. Sales & Revenue
   - 3F. Finance & Accounting
   - 3G. Legal & Compliance
   - 3H. Operations & Administration
   - 3I. Research & Intelligence
   - 3J. Data & Analytics
   - 3K. Human Resources & Culture
   - 3L. Customer Success & Support
4. **CROSS-DEPARTMENT WORKFLOWS** — Multi-agent orchestration patterns
5. **PROJECT LIFECYCLE FRAMEWORK** — From intake to delivery
6. **DELIVERABLE STANDARDS** — Quality gates and output specs
7. **ESCALATION & EXCEPTION HANDLING**
8. **SMART TOOL ROUTER ENHANCEMENT** — Context-aware tool selection

---

# 1. SYSTEM ARCHITECTURE — How the Scaffolding Works

## The Problem

Felix has 14 personas and 85+ tools. When a user says "launch a new product," Felix knows vaguely who to call — but the subagents don't have a structured framework telling them:
- What steps to follow for this TYPE of work
- What deliverables are expected
- What tools to use in what sequence
- What quality standards to meet
- When to hand off to another agent
- What to report back to Felix

## The Solution: Operation Scaffolds

An **Operation Scaffold** is a structured template injected into a subagent's context when they receive a delegated task. It contains:

```
┌─────────────────────────────────────────┐
│         OPERATION SCAFFOLD              │
├─────────────────────────────────────────┤
│ 1. OPERATION TYPE: [e.g., "Blog Post"]  │
│ 2. DEPARTMENT: [e.g., Content]          │
│ 3. PRIMARY AGENT: [e.g., Scribe]        │
│ 4. SUPPORT AGENTS: [e.g., Proof, Radar] │
│ 5. REQUIRED INPUTS: [what I need]       │
│ 6. STEP SEQUENCE: [ordered workflow]    │
│ 7. TOOL CHAIN: [tools in order]         │
│ 8. DELIVERABLES: [exact outputs]        │
│ 9. QUALITY GATE: [acceptance criteria]  │
│ 10. HANDOFF PROTOCOL: [what to return]  │
└─────────────────────────────────────────┘
```

## Injection Flow

```
User Request
    │
    ▼
Felix (CEO) receives request
    │
    ▼
Task Classification Engine categorizes the work
    │
    ▼
Felix selects the Operation Scaffold
    │
    ▼
Felix calls delegate_task with:
  - The specialist persona
  - The original request
  - The Operation Scaffold (injected into prompt)
    │
    ▼
Subagent receives scaffold + request
    │
    ▼
Subagent follows the step sequence
    │
    ▼
Subagent returns structured deliverable to Felix
    │
    ▼
Felix synthesizes and presents to user
```

## Scaffold Selection Logic

Felix uses a two-level classification:
1. **Department** — Which functional area does this belong to?
2. **Operation Type** — What specific kind of work within that department?

This gives Felix a fast lookup: Department → Operation → Scaffold → Agent + Workflow.

---

# 2. TASK CLASSIFICATION ENGINE — Felix's Routing Brain

## Level 1: Department Classification

When Felix receives ANY request, the first step is classifying it into one of 12 departments. Here is the keyword/intent map:

### DEPARTMENT ROUTING TABLE

| Department | Trigger Keywords & Intents | Primary Agent | Backup Agent |
|---|---|---|---|
| **Executive** | strategy, vision, roadmap, priorities, OKRs, board, investors, partnerships, company direction | Felix (self) | Chief of Staff |
| **Engineering** | build, code, debug, deploy, API, integration, automation, app, feature, technical, architecture, database, server | Forge (3) | Agent Blueprint (5) |
| **Content** | write, blog, script, article, documentation, copy, email draft, newsletter, ebook, white paper, press release | Scribe (7) | Neptune (10) |
| **Marketing** | social media, campaign, brand, SEO, content calendar, hashtag, engagement, audience growth, ad copy, launch announcement | Teagan (4) | Apollo (11) |
| **Sales** | lead, prospect, pipeline, deal, proposal, outreach, pitch, close, client, revenue target, pricing, quote | Apollo (11) | Scribe (7) |
| **Finance** | budget, forecast, P&L, revenue, expenses, cash flow, ROI, pricing model, tax, invoice, payment, subscription, Stripe | Cassandra (13) | Atlas (12) |
| **Legal** | contract, terms, privacy, compliance, NDA, IP, trademark, license, liability, regulation, GDPR, disclaimer | Luna (14) | — |
| **Operations** | system status, health check, API keys, scheduling, admin, infrastructure, uptime, monitoring, maintenance | Chief of Staff (6) | Forge (3) |
| **Research** | market research, competitive analysis, trend, industry report, deep dive, investigation, benchmark, landscape | Radar (9) | Neptune (10) |
| **Data & Analytics** | metrics, dashboard, report, analytics, KPIs, charts, data analysis, visualization, tracking, performance numbers | Atlas (12) | Cassandra (13) |
| **HR & Culture** | hiring, team, onboarding, culture, benefits, roles, job description, org chart, training, performance review | Felix (self) + Scribe | Luna (14) |
| **Customer Success** | customer, support, feedback, NPS, retention, onboarding flow, help docs, FAQ, ticket, complaint | Chief of Staff (6) | Scribe (7) |

## Level 2: Operation Type Classification

Once the department is identified, Felix classifies the specific operation type. Each department has 8-15 standard operation types.

---

# 3. DEPARTMENT PLAYBOOKS

---

## 3A. EXECUTIVE & STRATEGIC PLANNING

**Owner:** Felix (CEO — Persona 2)
**Support:** Chief of Staff (6), Cassandra (13), Radar (9), Atlas (12)

### Operation Types & Scaffolds

---

### EXEC-01: Strategic Planning Session

**When to use:** User asks for company strategy, roadmap, quarterly planning, OKR setting, vision alignment.

**Required Inputs:**
- Time horizon (quarterly, annual, 3-year)
- Current business context (what's working, what's not)
- Constraints (budget, team size, market conditions)

**Step Sequence:**
1. Felix recalls current strategy from memory (search_memory: "strategy", "OKRs", "roadmap")
2. Delegate to Radar (9): "Research current market conditions and competitive landscape for [industry]"
3. Delegate to Cassandra (13): "Pull current financial position — runway, revenue trajectory, cost structure"
4. Delegate to Atlas (12): "Compile key performance metrics for last [period]"
5. Felix synthesizes all inputs into strategic framework
6. Create strategy document with: Vision → Objectives → Key Results → Resource Allocation → Timeline
7. Save to Google Drive, register in project

**Tool Chain:** search_memory → delegate_task(Radar) → delegate_task(Cassandra) → delegate_task(Atlas) → create_memory → google_drive → project(add_file)

**Deliverables:**
- Strategic Plan document (PDF or Google Drive doc)
- OKR framework with measurable targets
- Resource allocation summary
- 90-day action plan with assigned owners

**Quality Gate:** Every objective has measurable key results. Every key result has an owner (persona). Timeline is realistic against resource constraints.

**Handoff to User:** Executive summary with specific deliverables, links to all documents, next action items with deadlines.

---

### EXEC-02: Board/Investor Update

**When to use:** User needs investor deck, board update, fundraising materials, pitch preparation.

**Step Sequence:**
1. Delegate to Cassandra (13): "Prepare financial highlights — revenue, growth rate, burn rate, runway"
2. Delegate to Atlas (12): "Compile key metrics dashboard — users, engagement, conversion, MRR"
3. Delegate to Radar (9): "Market size and positioning update for [industry]"
4. Delegate to Scribe (7): "Write narrative sections for investor update — problem, solution, traction, vision"
5. Felix assembles into coherent narrative
6. Delegate to Proof (8): Review all content
7. Generate final deliverable (PDF deck or presentation content)

**Tool Chain:** orchestrate → delegate_task(Cassandra) → delegate_task(Atlas) → delegate_task(Radar) → delegate_task(Scribe) → delegate_task(Proof) → create_pdf → google_drive

**Deliverables:**
- Investor update document or pitch deck content
- Financial summary one-pager
- Metrics dashboard snapshot
- Market positioning brief

---

### EXEC-03: Partnership/Vendor Evaluation

**When to use:** Evaluating a potential partner, vendor, tool, or service provider.

**Step Sequence:**
1. Delegate to Radar (9): "Research [vendor/partner] — company background, reputation, pricing, reviews, alternatives"
2. Delegate to Cassandra (13): "Cost-benefit analysis of [vendor] vs alternatives — TCO over 12 months"
3. Delegate to Luna (14): "Review [vendor] terms of service and identify key risks"
4. Delegate to Forge (3) (if technical): "Technical evaluation — API quality, documentation, integration effort"
5. Felix synthesizes into decision framework with recommendation

**Deliverables:**
- Vendor evaluation matrix (scored comparison)
- Financial impact analysis
- Legal risk summary
- Technical feasibility assessment (if applicable)
- Go/No-Go recommendation with rationale

---

### EXEC-04: Crisis Management

**When to use:** System outage, PR issue, customer complaint escalation, security incident, legal threat.

**Step Sequence:**
1. Felix assesses severity: Low / Medium / High / Critical
2. If system-related: Delegate to Chief of Staff (6) for immediate diagnostic
3. If PR/public-facing: Delegate to Scribe (7) for communication draft
4. If legal: Delegate to Luna (14) for risk assessment
5. If financial: Delegate to Cassandra (13) for impact estimate
6. Felix creates incident report with timeline, actions taken, status
7. Create communication plan (internal + external)
8. Schedule follow-up review

**Deliverables:**
- Incident report (timeline, root cause, impact, resolution)
- Communication drafts (customer-facing, internal team)
- Action items with owners and deadlines
- Post-mortem schedule

---

### EXEC-05: Company Meeting Preparation

**When to use:** Preparing for all-hands, team standup, weekly review, monthly review, or any recurring corporate meeting.

**Step Sequence:**
1. Delegate to Chief of Staff (6): "Compile operational status — what's working, what's blocked, what's upcoming"
2. Delegate to Atlas (12): "Pull weekly/monthly metrics snapshot"
3. Delegate to Cassandra (13): "Financial update — revenue, expenses, key transactions"
4. Felix compiles agenda and talking points
5. Save meeting prep document

**Deliverables:**
- Meeting agenda with time allocations
- Metrics snapshot
- Status updates by department
- Decision items requiring input
- Action items from previous meeting (status check)

---

### EXEC-06: Goal Setting & OKR Management

**When to use:** Setting quarterly or annual goals, reviewing OKR progress, realigning priorities.

**Step Sequence:**
1. Felix recalls current OKRs from memory
2. Delegate to Atlas (12): "Pull progress metrics against current OKRs"
3. Felix evaluates: on track / at risk / off track for each KR
4. Propose adjustments or new OKRs for next period
5. Assign each KR to a responsible persona
6. Save updated OKR document and create memories for tracking

**Deliverables:**
- OKR scorecard (current period progress)
- Updated OKR framework for next period
- Owner assignments per key result
- Dependency map between objectives

---

### EXEC-07: Decision Documentation

**When to use:** User makes or needs to make an important business decision that should be recorded.

**Step Sequence:**
1. Felix captures the decision context: What's the question? What are the options?
2. If research needed: Delegate to Radar (9)
3. If financial analysis needed: Delegate to Cassandra (13)
4. Document using decision log format: Context → Options → Analysis → Decision → Rationale → Next Steps
5. Save to memory and project files

**Deliverables:**
- Decision record document
- Memory entries for future reference
- Action items resulting from decision

---

## 3B. ENGINEERING & TECHNOLOGY

**Owner:** Forge (Persona 3)
**Support:** Agent Blueprint (5), Chief of Staff (6)

### Operation Types & Scaffolds

---

### ENG-01: Feature Development

**When to use:** Build a new feature, component, module, page, or functionality.

**Required Inputs:**
- Feature description and requirements
- Target platform/stack
- Integration points
- Acceptance criteria

**Step Sequence:**
1. Research: Check existing codebase patterns, API docs, relevant libraries (web_search, web_fetch)
2. Architecture: Define data flow, components, dependencies
3. Build: Write production-quality code (execute_code)
4. Test: Run code, verify output, check edge cases
5. Document: Technical decisions, setup instructions, API docs
6. Save: Upload to Google Drive with clear file naming
7. Register: Add to project with description

**Tool Chain:** web_search → web_fetch → execute_code → google_drive → project(add_file) → create_memory

**Deliverables:**
- Working code files (uploaded to Google Drive)
- Technical documentation (README, setup instructions)
- Test results / verification output
- Architecture notes (if significant design decisions made)

**Quality Gate:**
- Code executes without errors
- Edge cases handled
- Dependencies documented
- File naming follows convention: `[project]_[feature]_[version].[ext]`

---

### ENG-02: Bug Investigation & Fix

**When to use:** Something is broken, not working as expected, or producing errors.

**Step Sequence:**
1. Reproduce: Understand the exact error or unexpected behavior
2. Diagnose: Isolate the root cause (not symptoms)
3. Research: Check if it's a known issue (web_search for error messages)
4. Fix: Write the corrected code
5. Verify: Test the fix, confirm the bug is resolved
6. Document: What was wrong, what was changed, why
7. Save: Upload fixed files

**Tool Chain:** execute_code (reproduce) → web_search (research) → execute_code (fix) → execute_code (verify) → google_drive → project(add_note)

**Deliverables:**
- Fixed code files
- Bug report: symptom → root cause → fix → verification
- Regression prevention notes

---

### ENG-03: API Integration

**When to use:** Connect to a third-party API, build an integration, set up webhooks.

**Step Sequence:**
1. Research the API: documentation, authentication, rate limits, endpoints (web_fetch API docs)
2. Design the integration: data mapping, error handling, retry logic
3. Build: Write integration code with proper auth, error handling, and logging
4. Test: Make real API calls, verify responses
5. Document: Setup instructions, environment variables needed, endpoint reference
6. Save all files

**Tool Chain:** web_fetch (API docs) → execute_code (build + test) → google_drive → create_pdf (documentation) → project(add_file)

**Deliverables:**
- Integration code with error handling
- Configuration template (env vars, API keys needed)
- Integration test results
- API reference document

---

### ENG-04: Automation / Script Development

**When to use:** Automate a repetitive task, build a utility script, create a workflow.

**Step Sequence:**
1. Define: What manual process are we automating? What are the inputs/outputs?
2. Design: Workflow steps, decision points, error scenarios
3. Build: Write the automation script
4. Test: Run with sample data, verify outputs
5. Document: How to run, expected inputs/outputs, scheduling if applicable
6. Save and register

**Deliverables:**
- Automation script (working, tested)
- Usage guide
- Sample input/output
- Scheduling recommendations (if recurring)

---

### ENG-05: Technical Architecture Review

**When to use:** Evaluate a system design, review architecture decisions, plan a technical migration.

**Step Sequence:**
1. Gather: Current architecture details (from memory, project files, user description)
2. Research: Best practices, comparable systems, technology options (deep_research)
3. Analyze: Strengths, weaknesses, scalability, maintainability, cost
4. Recommend: Proposed changes with rationale
5. Document: Architecture decision record (ADR)

**Deliverables:**
- Architecture review document
- ADR (Architecture Decision Record)
- Recommended changes with priority
- Migration plan (if applicable)

---

### ENG-06: Infrastructure / DevOps

**When to use:** Server setup, deployment, CI/CD, monitoring, cloud configuration.

**Step Sequence:**
1. Assess: Current infrastructure state (check_system_status, test_api_keys)
2. Research: Best practices for the target platform
3. Build: Configuration files, deployment scripts, monitoring setup
4. Test: Verify deployment, health checks
5. Document: Runbook (how to deploy, rollback, monitor)

**Deliverables:**
- Configuration files / scripts
- Deployment runbook
- Monitoring setup documentation
- Health check verification results

---

### ENG-07: Code Review

**When to use:** Review existing code for quality, security, performance.

**Step Sequence:**
1. Read the code (read_file, google_drive download)
2. Analyze: Logic, security, performance, maintainability, edge cases
3. Rate: Critical issues / Warnings / Suggestions / Good practices observed
4. Provide specific fix recommendations with code examples
5. Summary with overall quality assessment

**Deliverables:**
- Code review report with severity-rated findings
- Specific fix recommendations
- Overall quality score and assessment

---

### ENG-08: Technical Documentation

**When to use:** Write API docs, system guides, developer onboarding, technical specs.

**Step Sequence:**
1. Gather: Technical details from code, system, or user description
2. Structure: Choose appropriate doc format (API reference, tutorial, guide, spec)
3. Write: Clear, precise technical documentation
4. Include: Code examples, diagrams (described), configuration templates
5. Save as PDF or Google Doc

**Tool Chain:** search_memory → web_search (research) → create_pdf → google_drive → project(add_file)

**Deliverables:**
- Technical document (PDF or Google Doc)
- Registered in project files

---

## 3C. CONTENT & CREATIVE

**Owner:** Scribe (Persona 7)
**Support:** Proof (8), Neptune (10), Teagan (4)

### Operation Types & Scaffolds

---

### CONTENT-01: Blog Post / Article

**When to use:** Write a blog post, thought leadership article, guest post, or long-form content piece.

**Required Inputs:**
- Topic or brief
- Target audience
- Desired tone (professional, casual, technical, inspirational)
- Target length (word count)
- SEO keywords (optional)

**Step Sequence:**
1. Check memory for brand voice guidelines (search_memory: "brand voice", "writing style")
2. Research the topic (web_search, deep_research if needed)
3. Create outline: Hook → Key points → Supporting evidence → Conclusion → CTA
4. Write the full article in publication-ready quality
5. Include: SEO title, meta description, headers (H2/H3), internal CTA
6. Save to Google Drive
7. Register in project
8. Route to Proof (8) for quality review (if Felix orchestrates)

**Tool Chain:** search_memory → web_search/deep_research → google_drive(save) → project(add_file)

**Deliverables:**
- Complete article (Google Drive document)
- SEO metadata: title tag, meta description, focus keyword
- Suggested featured image description (for AI image generation)
- Social promotion snippet (1-2 sentences for sharing)

**Quality Gate:**
- Original content (no plagiarism)
- Proper header hierarchy (H1 → H2 → H3)
- CTA included
- 150 WPM reading pace for scripts
- Factual claims sourced

---

### CONTENT-02: Video Script

**When to use:** Script for YouTube, explainer video, product demo, training video, social video.

**Step Sequence:**
1. Define format: duration target, style (talking head, explainer, demo, documentary)
2. Research topic if needed
3. Write script with timing marks at 150 WPM
4. Structure: Hook (0:00-0:15) → Problem (0:15-0:45) → Solution → Details → CTA → Outro
5. Include speaker notes, visual cues, b-roll suggestions
6. Save to Google Drive

**Deliverables:**
- Complete script with timing marks
- Visual direction notes (what's on screen)
- B-roll / visual asset suggestions
- Thumbnail concept description
- Title and description for platform

---

### CONTENT-03: Email Campaign / Sequence

**When to use:** Marketing email, drip sequence, newsletter, transactional email copy.

**Step Sequence:**
1. Define: Purpose, audience segment, desired action
2. Write: Subject line (A/B variants), preview text, body, CTA
3. For sequences: Map the flow (email 1 → trigger → email 2 → etc.)
4. Include: Personalization tokens, unsubscribe note
5. Save each email as separate document

**Deliverables:**
- Email copy (subject, preview, body, CTA) per email
- A/B subject line variants
- Sequence flow diagram (for drip campaigns)
- Send timing recommendations

---

### CONTENT-04: Presentation / Slide Deck Content

**When to use:** Keynote content, pitch deck copy, webinar slides, training deck, conference talk.

**Step Sequence:**
1. Define: Audience, duration, key message, format
2. Create slide outline: Title → Agenda → Key slides → Summary → CTA
3. Write: Title + body + speaker notes per slide
4. Keep slides concise (max 6 bullet points, max 8 words per point)
5. Suggest visuals for each slide

**Deliverables:**
- Slide content document (title, body, speaker notes per slide)
- Visual direction per slide
- Handout version (if applicable)

---

### CONTENT-05: Business Document

**When to use:** Proposal, one-pager, case study, white paper, SOW, internal memo, executive brief.

**Step Sequence:**
1. Identify document type and select appropriate template/structure
2. Research if needed (company info, industry data, competitive context)
3. Write in appropriate business format
4. Include executive summary for longer documents
5. Save as PDF with professional formatting

**Tool Chain:** search_memory → web_search → create_pdf → google_drive → project(add_file)

**Deliverables:**
- Formatted business document (PDF)
- Executive summary
- Registered in project

---

### CONTENT-06: Press Release

**When to use:** Company announcement, product launch, partnership, milestone, event.

**Step Sequence:**
1. Gather: Who, what, when, where, why, quote from leadership
2. Write in inverted pyramid format: Headline → Lead → Body → Boilerplate
3. Include: Dateline, media contact, company boilerplate
4. Two versions: Full release + condensed social announcement

**Deliverables:**
- Full press release (PDF)
- Social announcement version
- Media distribution list suggestions

---

### CONTENT-07: Documentation / Knowledge Base

**When to use:** Help docs, FAQ, user guide, internal wiki, process documentation, SOPs.

**Step Sequence:**
1. Define scope and audience (internal team vs. external users)
2. Structure: Overview → Getting Started → Detailed Sections → FAQ → Troubleshooting
3. Write in clear, scannable format with headers and numbered steps
4. Include examples and edge cases
5. Save to knowledge base (create_knowledge) AND as document file

**Deliverables:**
- Documentation file (Google Drive)
- Knowledge base entries (create_knowledge)
- Table of contents / navigation structure

---

### CONTENT-08: Audio/Video Production

**When to use:** Podcast narration, voiceover, video from slides, audio content.

**Delegated to:** Neptune (10)

**Step Sequence:**
1. Scribe writes the script (CONTENT-02)
2. Neptune generates audio narration (generate_audio — ElevenLabs for quality, OpenAI for speed)
3. Neptune prepares slide images or visuals (generate_social_image if needed)
4. Neptune assembles video (create_slideshow_video — slides + audio → MP4)
5. Upload all files to Google Drive
6. Register in project with file details (duration, format, file size)

**Tool Chain:** generate_audio → generate_social_image → create_slideshow_video → google_drive → project(add_file)

**Deliverables:**
- Audio file (MP3/WAV)
- Video file (MP4) if applicable
- Script document (source)
- Production notes: duration, file sizes, format specs

---

## 3D. MARKETING & GROWTH

**Owner:** Teagan (Persona 4)
**Support:** Apollo (11), Scribe (7), Neptune (10), Proof (8)

### Operation Types & Scaffolds

---

### MKT-01: Social Media Content Creation

**When to use:** Create posts for any social platform (X/Twitter, LinkedIn, Instagram, Facebook, TikTok).

**Step Sequence:**
1. Identify platform and optimize for its format/audience
2. Research trending topics or relevant hooks (web_search)
3. Draft post with platform-appropriate tone, length, hashtags, CTA
4. Generate accompanying image (generate_social_image)
5. Schedule on content calendar (manage_content_calendar)
6. Optionally publish directly (publish_social_post)

**Tool Chain:** web_search → draft_social_post OR compose_social_post → manage_content_calendar → publish_social_post

**Deliverables:**
- Post text (platform-optimized)
- Generated image (uploaded to Google Drive)
- Calendar entry
- Publication confirmation (if published)

**Quality Gate:**
- Platform character limits respected
- Hashtags relevant (3-5 for Twitter, 10-15 for Instagram)
- CTA included
- Image matches post theme
- Brand voice consistent

---

### MKT-02: Content Calendar Planning

**When to use:** Plan a week/month of content, create editorial calendar, map content themes.

**Step Sequence:**
1. Review current calendar (manage_content_calendar: view)
2. Research trending topics, holidays, industry events
3. Map themes to platforms (not one-size-fits-all)
4. Create daily/weekly content slots with topic, platform, format
5. Add all entries to content calendar

**Deliverables:**
- Content calendar (structured entries)
- Theme/topic map
- Asset requirements list (images, videos needed)

---

### MKT-03: Campaign Launch

**When to use:** Multi-channel marketing campaign, product launch campaign, seasonal promotion.

**Step Sequence:**
1. Define: Campaign objective, target audience, channels, timeline, budget
2. Delegate to Radar (9): Competitive campaign research
3. Create campaign brief: Messaging pillars, visual direction, channel strategy
4. Write content for each channel (coordinate with Scribe for long-form)
5. Generate visual assets (generate_social_image per platform)
6. Schedule all content (manage_content_calendar)
7. Set up tracking (marketing_analytics, marketing_experiment for A/B tests)
8. Document campaign plan

**Tool Chain:** orchestrate → web_search → compose_social_post (multiple) → manage_content_calendar → marketing_experiment → google_drive

**Deliverables:**
- Campaign brief document
- Content assets per channel (text + images)
- Calendar with all scheduled posts
- A/B test setup
- Campaign tracking framework

---

### MKT-04: Marketing Performance Analysis

**When to use:** Review campaign results, analyze marketing metrics, optimize strategy.

**Step Sequence:**
1. Pull analytics (marketing_analytics: report)
2. Compare against benchmarks and goals
3. Identify top performers and underperformers
4. Extract patterns: what content types, topics, posting times work best
5. Generate recommendations for next period

**Tool Chain:** marketing_analytics → generate_chart → create_pdf → google_drive

**Deliverables:**
- Marketing performance report with charts
- Top/bottom performers analysis
- Optimization recommendations
- Updated strategy for next period

---

### MKT-05: Brand & Style Guide

**When to use:** Define or update brand voice, visual identity, messaging guidelines.

**Step Sequence:**
1. Audit current brand presence (search_memory: "brand", "style guide")
2. Research competitive brand positioning
3. Define: Voice attributes, tone spectrum, do's and don'ts, visual direction
4. Write comprehensive brand guide
5. Save to memory for all agents to reference

**Deliverables:**
- Brand & Style Guide document
- Memory entries for each persona to access
- Quick-reference one-pager

---

### MKT-06: SEO Strategy

**When to use:** Keyword research, SEO audit, content optimization, search strategy.

**Step Sequence:**
1. Research: Target keywords, search volume, competition (web_search, deep_research)
2. Audit: Current content vs. keyword targets
3. Create: Keyword map (primary, secondary, long-tail per page/topic)
4. Recommend: Content gaps, optimization priorities, technical SEO items
5. Document strategy

**Deliverables:**
- Keyword research report
- Content gap analysis
- SEO optimization recommendations
- Content creation priorities (what to write next)

---

## 3E. SALES & REVENUE

**Owner:** Apollo (Persona 11)
**Support:** Scribe (7), Cassandra (13), Proof (8), Forge (3)

### Operation Types & Scaffolds

---

### SALES-01: Prospect Research & Outreach

**When to use:** Research a potential client, prepare personalized outreach, initiate contact.

**Step Sequence:**
1. Research prospect: company, decision-maker, pain points, recent news (web_search, web_fetch, browser)
2. Check memory for any prior interactions (search_memory)
3. Identify value proposition alignment
4. Craft personalized outreach email (not generic template)
5. Send email (send_email)
6. Log interaction in memory (create_memory)
7. Track expected outcome (track_outcome)
8. Schedule follow-up

**Tool Chain:** web_search → web_fetch → search_memory → send_email → create_memory → track_outcome

**Deliverables:**
- Prospect research brief (key facts, pain points, opportunity)
- Personalized outreach email (sent)
- Memory entry for tracking
- Follow-up schedule

**Quality Gate:**
- Outreach references specific prospect details (not generic)
- Value proposition is clear
- CTA is specific ("15-minute call Thursday?" not "let me know")
- No spelling/grammar errors

---

### SALES-02: Proposal / Pitch Deck

**When to use:** Create a client proposal, pitch deck, SOW, or pricing document.

**Step Sequence:**
1. Research: Client needs, competitive alternatives, pricing benchmarks
2. Coordinate with Scribe (7) for proposal copy
3. Coordinate with Cassandra (13) for pricing strategy
4. Assemble proposal: Problem → Solution → Approach → Deliverables → Timeline → Pricing → Terms
5. Route to Proof (8) for review
6. Route to Luna (14) if contract terms included
7. Generate final PDF
8. Track in pipeline

**Tool Chain:** web_search → delegate_task(Scribe) → delegate_task(Cassandra) → delegate_task(Proof) → create_pdf → google_drive → project(add_file) → send_email

**Deliverables:**
- Complete proposal document (PDF)
- Pricing breakdown
- Timeline/milestone plan
- Cover letter / intro email
- Follow-up schedule

---

### SALES-03: Pipeline Management

**When to use:** Review sales pipeline, update deal statuses, forecast revenue.

**Step Sequence:**
1. Recall all active deals from memory (search_memory: "deal", "pipeline", "prospect")
2. Update statuses based on recent activity
3. Calculate pipeline value by stage
4. Generate pipeline visualization (generate_chart)
5. Identify deals needing attention (stale, at risk, ready to close)
6. Create action plan for each priority deal

**Deliverables:**
- Pipeline report with deal stages and values
- Pipeline visualization chart
- At-risk deal alerts
- Weekly action plan per deal

---

### SALES-04: Client Follow-Up Sequence

**When to use:** Follow up after initial outreach, post-meeting, post-proposal, or re-engagement.

**Step Sequence:**
1. Recall last interaction (search_memory)
2. Determine appropriate follow-up timing and approach
3. Write personalized follow-up (reference previous conversation specifics)
4. Send via appropriate channel (send_email)
5. Log and schedule next follow-up
6. Track outcome

**Deliverables:**
- Follow-up message (sent)
- Updated interaction log
- Next action scheduled

---

### SALES-05: Competitive Positioning

**When to use:** Prospect is comparing options, need battle cards, competitive differentiation.

**Step Sequence:**
1. Delegate to Radar (9): "Deep competitive analysis of [competitor(s)] — pricing, features, weaknesses, customer complaints"
2. Create battle card: Feature comparison, differentiators, objection handling, talk tracks
3. Save for future reference

**Deliverables:**
- Competitive battle card
- Feature comparison matrix
- Objection handling scripts
- Win/loss analysis (if data available)

---

### SALES-06: Digital Product Delivery

**When to use:** Customer has purchased, needs file delivery with proper tracking.

**Step Sequence:**
1. Verify order details (customer name, email, product, payment)
2. Prepare deliverable file (create_pdf if needed)
3. Use deliver_product tool (automated: Drive upload → share → branded email → log)
4. Track delivery status (delivery_status)
5. Log in project

**Tool Chain:** create_pdf (if needed) → deliver_product → delivery_status → project(add_note)

**Deliverables:**
- Product delivered with shareable Drive link
- Branded delivery email sent
- Delivery confirmation with tracking ID
- Project updated

---

## 3F. FINANCE & ACCOUNTING

**Owner:** Cassandra (Persona 13)
**Support:** Atlas (12), Apollo (11)

### Operation Types & Scaffolds

---

### FIN-01: Financial Modeling / Analysis

**When to use:** Revenue projection, cost analysis, pricing model, unit economics, what-if scenario.

**Step Sequence:**
1. Define the financial question and key assumptions
2. Gather data: historical (search_memory), market (web_search), operational (delegate to Atlas)
3. Build model using execute_code (calculations, projections)
4. Run scenarios: best case, expected case, worst case
5. Visualize key outputs (generate_chart)
6. Document assumptions, methodology, and recommendations
7. Save as formal report

**Tool Chain:** search_memory → web_search → execute_code → generate_chart → create_pdf → google_drive → project(add_file)

**Deliverables:**
- Financial model with calculations
- Three-scenario analysis (best/expected/worst)
- Charts: revenue projection, cost breakdown, margin trend
- Assumptions document
- Executive summary with recommendation

**Quality Gate:**
- All assumptions explicitly stated
- Numbers are precise (no rounding unless noted)
- Scenarios have clear probability assessments
- Sources cited for market data

---

### FIN-02: Budget Creation / Update

**When to use:** Annual budget, department budget, project budget, budget reforecast.

**Step Sequence:**
1. Gather current spending data and commitments
2. Research market rates for new line items (web_search)
3. Build budget structure: Revenue categories → Expense categories → Net
4. Calculate: Monthly breakdown, quarterly totals, annual summary
5. Compare to prior period if available
6. Flag items needing approval or investigation

**Deliverables:**
- Budget document with line-item detail
- Monthly cash flow projection
- Variance analysis (vs. prior period)
- Budget approval action items

---

### FIN-03: Revenue Reporting / P&L

**When to use:** Monthly close, revenue reconciliation, P&L statement, financial summary.

**Step Sequence:**
1. Pull revenue data (Stripe tools if applicable, memory, project files)
2. Compile expenses by category
3. Calculate: Gross revenue, net revenue, COGS, gross margin, operating expenses, net income
4. Compare to budget/forecast
5. Generate visualizations
6. Write narrative: What happened, why, what it means

**Deliverables:**
- P&L statement (formatted)
- Revenue breakdown chart
- Expense breakdown chart
- Budget vs. actual comparison
- Narrative summary with key takeaways

---

### FIN-04: Pricing Strategy

**When to use:** Set pricing for a product/service, evaluate pricing changes, competitive pricing analysis.

**Step Sequence:**
1. Research: Competitor pricing, market rates, customer willingness to pay (web_search)
2. Analyze: Cost structure, target margins, volume assumptions
3. Model: Multiple pricing tiers/options
4. Calculate: Revenue impact per scenario
5. Recommend: Pricing with rationale

**Deliverables:**
- Pricing analysis document
- Competitor pricing comparison
- Revenue impact models per option
- Recommended pricing with rationale

---

### FIN-05: Cash Flow Management

**When to use:** Runway calculation, cash position update, payment timing optimization.

**Step Sequence:**
1. Current cash position
2. Projected inflows (committed revenue, expected deals)
3. Projected outflows (committed expenses, planned spending)
4. Calculate: Runway in months, monthly burn rate
5. Flag: Payment timing risks, large upcoming expenses
6. Recommend: Cash optimization actions

**Deliverables:**
- Cash flow projection (12-month)
- Runway calculation
- Risk flags
- Optimization recommendations

---

### FIN-06: Tax Preparation

**When to use:** Quarterly tax estimate, annual tax prep, tax planning, deduction tracking.

**Step Sequence:**
1. Compile: Revenue, expenses, deductions by category
2. Research: Applicable tax rates, deadlines, deduction rules (web_search)
3. Calculate: Estimated tax liability
4. Document: What records are needed, what's ready, what's missing
5. Recommend: Tax-saving strategies if applicable

**Deliverables:**
- Tax estimate calculation
- Deduction summary
- Required records checklist
- Filing deadline tracker
- Tax-saving recommendations

---

## 3G. LEGAL & COMPLIANCE

**Owner:** Luna (Persona 14)
**Support:** Cassandra (13), Felix (2)

### Operation Types & Scaffolds

---

### LEGAL-01: Contract Review

**When to use:** Review any contract, agreement, terms before signing.

**Step Sequence:**
1. Obtain contract document (analyze_pdf, google_drive, or from project files)
2. Review clause by clause: Key terms, obligations, liabilities, termination, IP, indemnification
3. Flag risks by severity: Critical / High / Medium / Low
4. For each risk: What it means → Why it matters → Recommended change
5. Overall assessment: Sign as-is / Sign with modifications / Do not sign
6. Document recommendations

**Tool Chain:** analyze_pdf → web_search (legal precedents if needed) → create_pdf (review report) → google_drive → project(add_file)

**Deliverables:**
- Contract review report with risk flags
- Specific recommended changes (redline suggestions)
- Overall recommendation
- Caveat: "This is legal information, not legal advice — consult an attorney for critical matters"

**Quality Gate:**
- Every clause reviewed
- Risks rated by severity
- Specific fix language provided (not just "this is risky")
- Attorney consultation recommended for critical matters

---

### LEGAL-02: Terms of Service / Privacy Policy

**When to use:** Create or update ToS, privacy policy, cookie policy, acceptable use policy.

**Step Sequence:**
1. Research: Current regulatory requirements (GDPR, CCPA, etc.) (web_search)
2. Review: What data is collected, how it's used, who it's shared with
3. Draft: Comprehensive policy in plain language
4. Include: Required disclosures, user rights, opt-out mechanisms
5. Save as legal document

**Deliverables:**
- Terms of Service document
- Privacy Policy document
- Cookie Policy (if applicable)
- Plain-language summary for users

---

### LEGAL-03: NDA / Simple Agreement Drafting

**When to use:** Draft an NDA, freelancer agreement, partnership MOU, or simple contract.

**Step Sequence:**
1. Define: Parties, scope, key terms, duration
2. Research: Standard language for this type of agreement
3. Draft: Using clear, enforceable language
4. Include: Definitions, obligations, confidentiality, termination, governing law, dispute resolution
5. Flag items needing attorney review
6. Save as PDF

**Deliverables:**
- Draft agreement (PDF)
- Key terms summary
- Items flagged for attorney review

---

### LEGAL-04: Compliance Audit

**When to use:** Regulatory review, compliance check, privacy audit, policy compliance verification.

**Step Sequence:**
1. Define: What regulations/standards apply (GDPR, CCPA, SOC2, industry-specific)
2. Research: Current requirements and recent changes (web_search)
3. Audit: Current practices vs. requirements
4. Gap analysis: What's compliant, what's not, what's partially compliant
5. Prioritize: Critical gaps → High → Medium → Low
6. Recommend: Remediation plan with timeline

**Deliverables:**
- Compliance audit report
- Gap analysis matrix
- Remediation plan with priorities
- Regulatory change log

---

### LEGAL-05: IP Protection

**When to use:** Trademark search, copyright questions, IP strategy, invention disclosure.

**Step Sequence:**
1. Research: Existing trademarks/IP in the space (web_search)
2. Assess: Current IP assets and protections
3. Identify: Gaps in protection
4. Recommend: Filing priorities, protection strategies
5. Document: IP inventory

**Deliverables:**
- IP audit report
- Trademark search results
- Protection recommendations
- Filing priority list

---

## 3H. OPERATIONS & ADMINISTRATION

**Owner:** Chief of Staff (Persona 6)
**Support:** Forge (3), Agent Blueprint (5)

### Operation Types & Scaffolds

---

### OPS-01: System Health Check

**When to use:** "Is everything working?", routine health check, pre-deployment verification.

**Step Sequence:**
1. Run test_api_keys — verify all AI provider connections
2. Run check_system_status — uptime, conversations, memory, heartbeats
3. Check list_models — available AI models
4. Verify Google Drive connectivity (google_drive: list)
5. Check email system (check_inbox)
6. Review recent errors or anomalies
7. Report in dashboard format with clear status indicators

**Tool Chain:** test_api_keys → check_system_status → list_models → google_drive(list) → check_inbox

**Deliverables:**
- System health dashboard
- Status per service: ✅ Healthy / ⚠️ Degraded / ❌ Down
- Action items for any issues
- Response times / latency metrics

**Quality Gate:**
- Every service actually tested (not assumed)
- Specific numbers (latency in ms, not "seems fast")
- Token expiry times noted
- Issues have proposed fixes

---

### OPS-02: Morning Standup / Daily Brief

**When to use:** Daily 8:00 AM standup, start-of-day summary, "what's happening today?"

**Step Sequence:**
1. Check system health (abbreviated OPS-01)
2. Review overnight activity (get_daily_notes)
3. Check pending tasks across personas (manage_desk: get_status)
4. Review inbox for anything requiring attention (check_inbox)
5. Compile: Status → Priorities → Blockers → Today's Schedule

**Deliverables:**
- Morning brief document
- Today's priority list
- Blocker report
- Schedule for the day

---

### OPS-03: End of Day Summary

**When to use:** 5:00 PM daily summary, "what got done today?"

**Step Sequence:**
1. Review day's activity (get_daily_notes)
2. Compile completed work by department
3. Note unfinished items and their status
4. Flag anything needing attention tomorrow
5. Write daily summary

**Deliverables:**
- EOD summary
- Completed items list
- Carry-forward items
- Tomorrow's priorities

---

### OPS-04: Weekly Operations Review

**When to use:** Monday weekly review, operational retrospective, process improvement.

**Step Sequence:**
1. Compile daily summaries for the week
2. Aggregate metrics from Atlas (delegate if needed)
3. Review: What went well, what didn't, what to improve
4. Update any operational processes
5. Set priorities for next week

**Deliverables:**
- Weekly operations report
- Metrics summary
- Process improvement recommendations
- Next week's priorities

---

### OPS-05: Scheduling & Calendar Management

**When to use:** Schedule meetings, manage calendar, coordinate across time zones.

**Step Sequence:**
1. Identify: What needs to be scheduled, who's involved, constraints
2. Check calendar (google_workspace: Calendar list)
3. Propose times
4. Create calendar event (google_workspace: Calendar create)
5. Send notifications if needed (send_email)

**Deliverables:**
- Calendar event created
- Notifications sent
- Agenda prepared (if meeting)

---

### OPS-06: Incident Response

**When to use:** System outage, service degradation, critical error, security alert.

**Step Sequence:**
1. Assess severity immediately (check_system_status, test_api_keys)
2. Classify: Severity 1 (service down) / 2 (degraded) / 3 (minor) / 4 (cosmetic)
3. Communicate: Alert Felix (post_to_channel), notify user
4. Diagnose: Root cause investigation
5. Escalate to Forge (3) for technical fix if needed
6. Resolve and verify
7. Post-incident report

**Deliverables:**
- Incident report (timeline, cause, resolution)
- Status updates (real-time)
- Post-incident review document
- Prevention recommendations

---

## 3I. RESEARCH & INTELLIGENCE

**Owner:** Radar (Persona 9) + Neptune (Persona 10)
**Support:** Atlas (12)

### Operation Types & Scaffolds

---

### RESEARCH-01: Market Research

**When to use:** Market size, industry analysis, market trends, TAM/SAM/SOM.

**Step Sequence:**
1. Define research scope and questions
2. Search multiple sources (web_search for breadth, web_fetch for depth)
3. For comprehensive research: use deep_research
4. Cross-reference findings from multiple sources
5. Analyze: Market size, growth rate, segments, trends
6. Structure report: Executive Summary → Market Overview → Segments → Trends → Opportunities → Risks → Sources

**Tool Chain:** web_search → web_fetch → deep_research → generate_chart → create_pdf → google_drive → project(add_file) → create_memory

**Deliverables:**
- Market research report (PDF)
- Market size/growth charts
- Trend analysis
- Opportunity matrix
- All sources cited

**Quality Gate:**
- Multiple sources cross-referenced
- Data recency noted (how recent is each data point)
- Confidence levels stated
- Facts vs. analysis vs. speculation clearly distinguished

---

### RESEARCH-02: Competitive Analysis

**When to use:** Competitor deep dive, competitive landscape, feature comparison, battle cards.

**Step Sequence:**
1. Identify competitor set (direct, indirect, emerging)
2. Research each: Product, pricing, positioning, strengths, weaknesses, recent moves
3. Use firecrawl tools for deep site analysis if needed
4. Build comparison matrix
5. Identify differentiators and vulnerabilities
6. Strategic recommendations

**Tool Chain:** web_search → web_fetch → firecrawl_search → firecrawl_scrape → generate_chart → create_pdf → google_drive

**Deliverables:**
- Competitive analysis report
- Feature comparison matrix
- SWOT per competitor
- Strategic recommendations
- Battle cards for sales team

---

### RESEARCH-03: Technology / Tool Research

**When to use:** Evaluate tools, platforms, technologies, APIs, frameworks.

**Step Sequence:**
1. Define requirements and evaluation criteria
2. Research candidates (web_search, web_fetch for documentation)
3. Compare: Features, pricing, documentation quality, community, integration effort
4. Score against criteria
5. Recommend with rationale

**Deliverables:**
- Technology evaluation report
- Comparison matrix (scored)
- Recommendation with rationale
- Implementation considerations

---

### RESEARCH-04: Industry Trend Report

**When to use:** Trend tracking, emerging technology scan, "what's happening in [industry]?"

**Step Sequence:**
1. Multi-source research (deep_research)
2. Identify trends by category: technology, market, regulatory, behavioral
3. Assess each: Signal strength, timeline, impact potential
4. Extract implications for the business
5. Structure: Key Trends → Analysis → Implications → Action Items → Sources

**Deliverables:**
- Trend report (structured, sourced)
- Trend heat map (impact vs. timeline)
- Action items based on trends

---

### RESEARCH-05: Person / Company Research

**When to use:** Due diligence on a person or company, background check, prospect research.

**Step Sequence:**
1. Search across multiple sources (web_search, web_fetch for LinkedIn/company site)
2. Compile: Background, history, recent activity, reputation, connections
3. For companies: Financials if public, leadership, products, news
4. Note red flags or concerns
5. Create dossier

**Deliverables:**
- Research dossier
- Key facts summary
- Red flags / concerns
- Relevance to current business context

---

## 3J. DATA & ANALYTICS

**Owner:** Atlas (Persona 12)
**Support:** Cassandra (13), Forge (3)

### Operation Types & Scaffolds

---

### DATA-01: KPI Dashboard / Scorecard

**When to use:** Create metrics dashboard, weekly scorecard, performance tracking display.

**Step Sequence:**
1. Define: Which KPIs to track, data sources, time period
2. Collect data (execute_code, web_search for benchmarks, search_memory for historical)
3. Calculate: Current values, trends, period-over-period changes
4. Visualize: Charts per KPI (generate_chart — bar, line, pie as appropriate)
5. Add context: "So what?" for each metric — what does this number mean?
6. Compare to targets/benchmarks
7. Save report

**Tool Chain:** execute_code → search_memory → generate_chart → create_pdf → google_drive → project(add_file)

**Deliverables:**
- KPI dashboard (charts + commentary)
- Trend analysis per metric
- Against-target comparison
- Action recommendations for off-track metrics

**Quality Gate:**
- Every metric has context (not just numbers)
- Trends shown (not just point-in-time)
- Benchmarks included where available
- Data quality issues noted honestly

---

### DATA-02: Ad Hoc Analysis

**When to use:** "Analyze this data", "what does this mean?", one-time data question.

**Step Sequence:**
1. Understand the question precisely
2. Gather or receive data
3. Process and clean data (execute_code)
4. Analyze: Patterns, outliers, correlations, trends
5. Visualize key findings (generate_chart)
6. Lead with the insight (bottom line first), then supporting data

**Deliverables:**
- Analysis summary (insight-first)
- Supporting data and charts
- Methodology notes
- Caveats and limitations

---

### DATA-03: Regular Reporting

**When to use:** Weekly metrics, monthly report, quarterly review — recurring data compilation.

**Step Sequence:**
1. Pull data for the reporting period
2. Calculate standard metrics
3. Compare: vs. prior period, vs. target, vs. benchmark
4. Generate standard visualizations
5. Write narrative: Headlines → Details → Recommendations

**Deliverables:**
- Period report (formatted, consistent template)
- Charts and visualizations
- Variance analysis
- Forward-looking commentary

---

### DATA-04: Data Visualization

**When to use:** User has data and needs it turned into charts, graphs, or visual displays.

**Step Sequence:**
1. Receive or collect data
2. Determine best visualization type (bar for comparison, line for trends, pie for composition, etc.)
3. Generate chart (generate_chart)
4. If complex: generate dashboard (generate_dashboard)
5. Add titles, labels, and context

**Deliverables:**
- Chart(s) rendered in conversation
- Dashboard (if complex)
- Data interpretation notes

---

## 3K. HUMAN RESOURCES & CULTURE

**Owner:** Felix (CEO — self-directed) + Scribe (7)
**Support:** Luna (14), Cassandra (13)

### Operation Types & Scaffolds

---

### HR-01: Job Description / Role Definition

**When to use:** Create a job posting, define a role, write hiring requirements.

**Step Sequence:**
1. Define: Role title, department, reporting structure, key responsibilities
2. Research: Market salary ranges, comparable job postings (web_search)
3. Write: Title → Summary → Responsibilities → Requirements → Nice-to-haves → Compensation → Benefits
4. Route to Luna (14) for compliance review (equal opportunity, legal language)
5. Save as document

**Delegated to:** Scribe (7) for writing, Luna (14) for review

**Deliverables:**
- Job description document
- Salary benchmark data
- Posting-ready version (formatted for job boards)

---

### HR-02: Onboarding Documentation

**When to use:** Create onboarding materials for new team members, contractors, or partners.

**Step Sequence:**
1. Define: Role, access needed, key contacts, first-week priorities
2. Create onboarding checklist: Day 1 → Week 1 → Month 1
3. Write welcome materials and role-specific guides
4. Document: Tool access, communication channels, key processes
5. Save to knowledge base and project files

**Deliverables:**
- Onboarding checklist
- Welcome packet
- Role-specific guide
- Access/setup requirements list

---

### HR-03: Policy Documentation

**When to use:** Employee handbook, workplace policies, remote work policy, expense policy.

**Step Sequence:**
1. Research: Best practices, legal requirements (web_search)
2. Draft policy in clear language
3. Route to Luna (14) for legal review
4. Save as official document

**Deliverables:**
- Policy document
- Legal review notes
- Employee acknowledgment form (if needed)

---

## 3L. CUSTOMER SUCCESS & SUPPORT

**Owner:** Chief of Staff (Persona 6) + Scribe (7)
**Support:** Forge (3), Apollo (11)

### Operation Types & Scaffolds

---

### CS-01: Help Documentation / FAQ

**When to use:** Create customer-facing help docs, FAQ, troubleshooting guides.

**Step Sequence:**
1. Identify common questions/issues (from memory, inbox, user feedback)
2. Write answers in clear, non-technical language
3. Structure: Question → Answer → Steps (if applicable) → Related topics
4. Save to knowledge base (create_knowledge) and as document
5. Route to Proof (8) for accuracy review

**Deliverables:**
- FAQ document
- Knowledge base entries
- Troubleshooting guide (if applicable)

---

### CS-02: Customer Communication

**When to use:** Customer email response, support ticket reply, status update to client.

**Step Sequence:**
1. Understand the customer's issue/question
2. Research answer (web_search if needed, search_memory for customer history)
3. Draft response: Acknowledge → Answer → Next steps → Closing
4. Send via appropriate channel (send_email, whatsapp)
5. Log interaction in memory

**Deliverables:**
- Customer communication (sent)
- Interaction logged in memory
- Follow-up scheduled if needed

---

### CS-03: Customer Feedback Analysis

**When to use:** Analyze customer feedback, NPS results, review themes, complaint patterns.

**Step Sequence:**
1. Collect feedback data
2. Categorize: Feature requests, bugs, praise, complaints
3. Identify patterns and top themes
4. Prioritize: What to address first based on frequency and severity
5. Generate report with recommendations

**Deliverables:**
- Feedback analysis report
- Theme categorization
- Priority action items
- Trend charts (if historical data available)

---

# 4. CROSS-DEPARTMENT WORKFLOWS — Multi-Agent Orchestration Patterns

These are pre-built orchestration plans for work that requires multiple departments working together. Felix uses the `orchestrate` tool with these patterns.

---

## CROSS-01: New Product Launch

**Involved:** Radar → Cassandra → Scribe → Teagan → Apollo → Luna → Felix

**Orchestration Plan:**
```
Step 1 (parallel):
  - Radar (9): Market research — competitive landscape, target audience, positioning
  - Cassandra (13): Financial model — pricing, revenue projections, break-even analysis
  - Luna (14): Legal review — any regulatory requirements, IP considerations

Step 2 (after Step 1):
  - Scribe (7): Write launch materials — landing page copy, product description, press release
  - Apollo (11): Create sales materials — pitch deck, outreach templates, pricing sheet

Step 3 (after Step 2):
  - Teagan (4): Create social media campaign — launch posts, content calendar, visual assets
  - Proof (8): Review all materials for quality and consistency

Step 4 (after Step 3):
  - Felix: Synthesize all deliverables, create launch timeline, present to user
```

---

## CROSS-02: Client Onboarding Package

**Involved:** Apollo → Scribe → Luna → Cassandra → Chief of Staff

**Orchestration Plan:**
```
Step 1 (parallel):
  - Apollo (11): Prepare welcome email and kickoff agenda
  - Luna (14): Generate contract / SOW for signature
  - Cassandra (13): Set up invoicing / payment schedule

Step 2 (after Step 1):
  - Scribe (7): Write onboarding guide and project documentation
  - Chief of Staff (6): Set up project folder, communication channels

Step 3 (after Step 2):
  - Felix: Package all deliverables, deliver to client
```

---

## CROSS-03: Quarterly Business Review (QBR)

**Involved:** Atlas → Cassandra → Radar → Teagan → Scribe → Felix

**Orchestration Plan:**
```
Step 1 (parallel):
  - Atlas (12): Compile all KPIs and metrics for the quarter
  - Cassandra (13): Financial summary — P&L, cash position, budget vs. actual
  - Radar (9): Market/competitive update — what changed this quarter

Step 2 (after Step 1):
  - Scribe (7): Write QBR narrative — executive summary, department highlights, lessons learned
  - Teagan (4): Marketing performance summary

Step 3 (after Step 2):
  - Felix: Synthesize into QBR presentation, set next quarter OKRs
```

---

## CROSS-04: Content-to-Revenue Pipeline

**Involved:** Radar → Scribe → Proof → Teagan → Neptune → Apollo

**Orchestration Plan:**
```
Step 1:
  - Radar (9): Identify trending topic with business relevance

Step 2:
  - Scribe (7): Write thought leadership article

Step 3 (parallel):
  - Proof (8): Quality review
  - Neptune (10): Produce audio/video version

Step 4:
  - Teagan (4): Distribute across social channels

Step 5:
  - Apollo (11): Outreach to prospects who engage with content
```

---

## CROSS-05: Financial Audit & Compliance Review

**Involved:** Cassandra → Luna → Atlas → Chief of Staff → Felix

**Orchestration Plan:**
```
Step 1 (parallel):
  - Cassandra (13): Full financial reconciliation — all transactions, categories, discrepancies
  - Luna (14): Compliance checklist — regulatory requirements, filing deadlines

Step 2:
  - Atlas (12): Generate audit visualizations and anomaly detection

Step 3:
  - Chief of Staff (6): Document findings, create action items

Step 4:
  - Felix: Executive audit summary with recommendations
```

---

## CROSS-06: Rebranding / Brand Refresh

**Involved:** Radar → Scribe → Teagan → Apollo → Luna → Felix

**Orchestration Plan:**
```
Step 1:
  - Radar (9): Brand perception research — current sentiment, competitor brands, market expectations

Step 2 (parallel):
  - Scribe (7): New brand messaging — mission, vision, taglines, voice guide
  - Apollo (11): Visual direction recommendations

Step 3:
  - Teagan (4): Update all social profiles and content templates
  - Luna (14): Review trademark/IP implications

Step 4:
  - Felix: Approve and roll out new brand across all materials
```

---

# 5. PROJECT LIFECYCLE FRAMEWORK — From Intake to Delivery

Every piece of work flows through this standard lifecycle. All agents follow these phases.

## Phase 1: INTAKE
```
Trigger: User request arrives at Felix
Actions:
  1. Felix classifies: Department + Operation Type
  2. Felix checks: Is there an existing project? (project: search)
  3. If no project: Create one (project: create)
  4. Felix selects scaffold and assigns to agent(s)
  5. Felix delegates with scaffold injected
```

## Phase 2: RESEARCH
```
Trigger: Agent receives delegated task with scaffold
Actions:
  1. Agent checks memory for relevant context (search_memory, recall_context)
  2. Agent researches as needed per scaffold (web_search, deep_research)
  3. Agent gathers all required inputs
  4. Agent confirms: Do I have everything I need to proceed?
  5. If missing inputs → report to Felix what's needed
```

## Phase 3: EXECUTION
```
Trigger: Agent has all inputs
Actions:
  1. Agent follows scaffold step sequence
  2. Agent uses prescribed tool chain
  3. Agent produces deliverables per scaffold spec
  4. Agent saves all files (Google Drive preferred)
  5. Agent registers files in project (project: add_file)
```

## Phase 4: QUALITY
```
Trigger: Deliverables produced
Actions:
  1. If high-stakes: Route to Proof (8) for review
  2. If financial: Cassandra (13) verifies numbers
  3. If legal: Luna (14) reviews compliance
  4. If technical: Forge (3) reviews code
  5. Quality reviewer rates: Ship / Minor Edits / Rewrite
  6. If Rewrite: Return to Phase 3 with specific feedback
```

## Phase 5: DELIVERY
```
Trigger: Deliverables pass quality gate
Actions:
  1. Agent reports to Felix: What was done, specific deliverables, file links
  2. Felix synthesizes across all agents (for multi-agent work)
  3. Felix presents to user: Executive summary + deliverables + file links
  4. Felix logs completion in project (project: add_note)
  5. Felix stores key outcomes in memory (create_memory)
```

## Phase 6: FOLLOW-UP
```
Trigger: Delivery complete
Actions:
  1. Track outcomes if applicable (track_outcome)
  2. Schedule follow-up tasks if needed
  3. Update project status
  4. Emit events for other departments if relevant (emit_event)
```

---

# 6. DELIVERABLE STANDARDS — Quality Gates & Output Specs

## Universal File Naming Convention
```
[ProjectName]_[DeliverableType]_[Version]_[Date].[ext]

Examples:
  HVAC_DiagnostiQ_BusinessPlan_v1_2026-03-26.pdf
  ClientName_Proposal_v2_2026-03-26.pdf
  WeeklyMetrics_Scorecard_2026-W13.pdf
  QBR_Q1_2026_ExecutiveSummary.pdf
```

## Universal Deliverable Structure

Every deliverable (report, analysis, document) follows this skeleton:

1. **Executive Summary** — Bottom line first (2-3 sentences)
2. **Context** — Why this was done, what question it answers
3. **Key Findings / Content** — The meat of the deliverable
4. **Recommendations / Next Steps** — What to do with this information
5. **Appendix** (if needed) — Supporting data, sources, methodology

## Quality Ratings

All deliverables are rated before presentation to user:

| Rating | Meaning | Action |
|---|---|---|
| ✅ Ship | Ready for user/client | Deliver immediately |
| ⚠️ Minor Edits | Small fixes needed | Fix and deliver (no re-review needed) |
| 🔄 Revision | Significant issues | Return to author with specific feedback |
| ❌ Rewrite | Fundamentally off-target | Re-scope and restart |

## Department-Specific Standards

### Content Standards (Scribe)
- Blog posts: 800-2000 words with SEO structure
- Scripts: Timed at 150 WPM with visual cues
- Email copy: Subject < 50 chars, body < 200 words, single CTA
- All content: Checked against brand voice, no plagiarism

### Financial Standards (Cassandra)
- All numbers precise (no rounding unless noted)
- Assumptions explicitly listed
- Three scenarios minimum for projections (best/expected/worst)
- Sources cited for all market data
- Currency and time period always specified

### Legal Standards (Luna)
- Risks rated by severity (Critical/High/Medium/Low)
- Specific fix language provided, not just identification
- Attorney referral recommended for critical matters
- Regulatory citations included
- Jurisdiction specified

### Engineering Standards (Forge)
- Code executes without errors
- Edge cases handled
- Dependencies documented
- README included for any significant code
- Security considerations noted

### Research Standards (Radar/Neptune)
- Multiple sources cross-referenced (minimum 3 for any claim)
- Source recency noted
- Confidence levels stated
- Facts vs. analysis vs. speculation distinguished
- All sources cited with URLs

### Analytics Standards (Atlas)
- Every metric has context ("so what?")
- Trends shown, not just point-in-time
- Benchmarks included where available
- Data quality issues noted
- Methodology transparent

---

# 7. ESCALATION & EXCEPTION HANDLING

## When an Agent Can't Complete the Work

If a subagent hits a blocker, here's the escalation path:

### Level 1: Tool Failure
```
Agent tries the tool → tool fails or returns error
Action: Try alternate tool from the same category
Example: web_search fails → try firecrawl_search
Report to Felix ONLY if all alternates fail
```

### Level 2: Missing Information
```
Agent needs info that wasn't provided and can't be found
Action: Return to Felix with SPECIFIC questions:
  "I need [X], [Y], and [Z] to complete this. Can you provide or should I proceed with assumptions?"
  NEVER return with vague "I need more info"
```

### Level 3: Out of Scope
```
Agent receives work that belongs to another persona
Action: Return to Felix immediately:
  "This is [engineering/legal/financial] work — suggest delegating to [Persona Name]"
  DO NOT attempt work outside your domain
```

### Level 4: Quality Failure
```
Proof (8) rates deliverable as Rewrite
Action: Return to original author with SPECIFIC feedback:
  "Rewrite needed. Issues: [1], [2], [3]. Fix by: [specific instructions]"
  NOT: "This isn't good enough, try again"
```

### Level 5: Critical/Emergency
```
Security issue, data loss, compliance violation, or user safety concern
Action: Flag to Felix AND Chief of Staff IMMEDIATELY
  Use post_to_channel for visibility
  Stop all related work until resolved
```

## Exception Patterns

### "I don't know which tool to use"
```
1. Check the scaffold — it lists the tool chain
2. If scaffold doesn't cover it, check the Platform Reference (Part 2) for tool categories
3. If still unclear, try the most likely tool — report what happened
4. NEVER say "I don't have the right tool" without trying
```

### "The user asked for something we've never done before"
```
1. Felix classifies to nearest operation type
2. If no match: Adapt the closest scaffold
3. If truly novel: Felix creates an ad-hoc plan using orchestrate or plan_and_execute
4. After completion: Document the new pattern for future use (manage_skills: create)
```

### "Multiple departments need to coordinate"
```
1. Felix uses orchestrate tool with DAG execution plan
2. Identify parallel vs. sequential steps
3. Assign each step to the right persona
4. Use Cross-Department Workflows (Section 4) if a pattern exists
5. If new pattern: Document for future use
```

---

# 8. SMART TOOL ROUTER ENHANCEMENT — Context-Aware Tool Selection

## The Problem Within the Problem

Even with scaffolds, agents face 85+ tools. The Smart Tool Router narrows this down per conversation, but we can improve it further by mapping tools to operation types.

## Operation → Tool Map

Each operation scaffold includes a specific tool chain. But here's the master reference for when agents need to improvise:

### RESEARCH TOOLS (by depth)
```
Quick fact check      → web_search
Read a specific page  → web_fetch
Deep page scraping    → firecrawl_scrape
Multi-source research → deep_research
Full site indexing    → firecrawl_crawl
Past research recall  → scraped_pages_query
Document search       → doc_search
```

### FILE TOOLS (by output type)
```
PDF creation          → create_pdf
PDF reading           → analyze_pdf
PDF editing           → edit_pdf / fill_pdf
File storage          → google_drive (upload)
File retrieval        → google_drive (download/list)
Local file reading    → read_file / list_uploads
Google Docs/Sheets    → google_workspace
```

### COMMUNICATION TOOLS (by channel)
```
Corporate email       → send_email
Personal email        → google_workspace (Gmail)
WhatsApp              → whatsapp
Internal channels     → post_to_channel / read_channels
Calendar              → google_workspace (Calendar)
```

### ANALYSIS TOOLS (by type)
```
Code/calculations     → execute_code
Simple charts         → generate_chart
Complex dashboards    → generate_dashboard
LLM sub-tasks         → llm_task
```

### DELEGATION TOOLS (by pattern)
```
One-shot specialist   → delegate_task (schedule="once")
Multi-step plan       → orchestrate
Background async      → sessions_spawn
Inter-agent message   → sessions_send
Quality check         → critique_response
Multi-perspective     → debate
Reasoning exploration → tree_of_thought
Cost estimate         → estimate_cost
```

### MEMORY TOOLS (by purpose)
```
Store a fact          → create_memory
Find a fact           → search_memory
Update a fact         → update_memory
Log an event          → write_daily_note
Recall past events    → get_daily_notes
Conversation context  → recall_context
Reference knowledge   → search_knowledge / create_knowledge
```

### SOCIAL MEDIA TOOLS (by workflow stage)
```
Draft post text       → draft_social_post
Draft + image         → compose_social_post
Publish               → publish_social_post
Generate image        → generate_social_image
Schedule              → manage_content_calendar
Track performance     → marketing_analytics
A/B test              → marketing_experiment
Account management    → manage_social_accounts
```

### MEDIA PRODUCTION TOOLS (by output)
```
Audio narration       → generate_audio
Video assembly        → create_slideshow_video
Image generation      → generate_social_image
```

---

# APPENDIX A: SCAFFOLD INJECTION TEMPLATE

When Felix delegates a task, the prompt should include this structure:

```
=== OPERATION SCAFFOLD ===
Operation: [EXEC-01, ENG-03, CONTENT-01, etc.]
Department: [Executive, Engineering, Content, etc.]
You are: [Persona name and role]

CONTEXT:
[User's original request]

YOUR MISSION:
[Specific task for this agent]

STEP SEQUENCE:
1. [Step 1]
2. [Step 2]
...

TOOL CHAIN:
[Ordered list of tools to use]

DELIVERABLES EXPECTED:
- [Deliverable 1]
- [Deliverable 2]
...

QUALITY STANDARDS:
[Standards for this department]

HANDOFF INSTRUCTIONS:
When complete, return to Felix with:
- Summary of what was done
- List of files created (with Google Drive links)
- Any issues or items needing attention
- Recommendations or next steps
=========================
```

---

# APPENDIX B: QUICK REFERENCE — FELIX'S DECISION MATRIX

```
User says...                    → Department    → Operation    → Primary Agent
─────────────────────────────────────────────────────────────────────────────
"Write a blog post about..."    → Content       → CONTENT-01   → Scribe (7)
"Build me an app that..."       → Engineering   → ENG-01       → Forge (3)
"Research the market for..."    → Research      → RESEARCH-01  → Radar (9)
"Create a social media post..." → Marketing     → MKT-01       → Teagan (4)
"How much revenue did we..."    → Finance       → FIN-03       → Cassandra (13)
"Show me our metrics..."        → Data          → DATA-01      → Atlas (12)
"Review this contract..."       → Legal         → LEGAL-01     → Luna (14)
"Is everything working?"        → Operations    → OPS-01       → Chief of Staff (6)
"Reach out to this prospect..." → Sales         → SALES-01     → Apollo (11)
"Plan our Q2 strategy..."       → Executive     → EXEC-01      → Felix (self)
"Create a job posting for..."   → HR            → HR-01        → Scribe (7)
"Help the customer with..."     → Customer Svc  → CS-02        → Chief of Staff (6)
"Launch our new product..."     → Cross-Dept    → CROSS-01     → Felix (orchestrate)
"Do a quarterly review..."      → Cross-Dept    → CROSS-03     → Felix (orchestrate)
"Record a video about..."       → Content       → CONTENT-08   → Neptune (10)
"Send a proposal to..."         → Sales         → SALES-02     → Apollo (11)
"Check our compliance..."       → Legal         → LEGAL-04     → Luna (14)
"Update our privacy policy..."  → Legal         → LEGAL-02     → Luna (14)
"Create a dashboard of..."      → Data          → DATA-04      → Atlas (12)
"Deliver the product to..."     → Sales         → SALES-06     → Apollo (11)
```

---

# APPENDIX C: PERSONA CAPABILITY MAP

| Persona | Creates | Analyzes | Communicates | Manages |
|---|---|---|---|---|
| Felix (CEO) | Strategy docs, OKRs | All (via delegation) | Executive comms | Projects, priorities |
| Forge (Engineer) | Code, scripts, integrations | Technical architecture | Technical docs | Build queues |
| Teagan (Marketing) | Social posts, campaigns | Marketing performance | Brand content | Content calendar |
| Agent Blueprint | Skills, tools, configs | System performance | Platform reports | Agent optimization |
| Chief of Staff | Operational reports | System health | Status updates, alerts | Schedules, admin |
| Scribe (Content) | Articles, scripts, docs | Content quality | Written deliverables | Content pipeline |
| Proof (QA) | Review reports | Quality assessment | Feedback to authors | Quality standards |
| Radar (Intel) | Research reports | Market/competitive data | Intel briefs | Research databases |
| Neptune (Media) | Audio, video, deep reports | Multi-source synthesis | Media deliverables | Production pipeline |
| Apollo (Sales) | Proposals, outreach | Pipeline, prospects | Client emails | Deals, pipeline |
| Atlas (Analytics) | Charts, dashboards | Data patterns | Metrics reports | KPI tracking |
| Cassandra (CFO) | Financial models | Revenue, costs, margins | Financial reports | Budget, forecasts |
| Luna (Legal) | Contracts, policies | Legal risk | Legal advisories | Compliance tracking |

---

*END OF CORPORATE OPERATIONS SCAFFOLDING SYSTEM v1.0*
*VisionClaw Agent Platform — AI Buddy LLC*
