# VisionClaw Agent Platform — Agency Expansion Specification
## Autonomous Agent Capability Enhancement Framework
### Version 1.0 — AI Buddy LLC (Illinois)
### Date: March 26, 2026

---

# EXECUTIVE SUMMARY

This specification defines a structured framework for expanding the autonomous capabilities of VisionClaw's 14 AI agent personas. It builds directly on top of the existing Process Governor (31 rules, 22 evaluators, 10 actions) and extends the governance model to support earned autonomy, proactive initiative, direct inter-agent collaboration, and environmental awareness — while maintaining all existing safety controls.

**The Core Principle:** Agents should be able to do more on their own as they prove themselves reliable, and the system should be able to verify that reliability in real-time.

**What This Specification Covers:**

- Tier 1: Activating the 9 unimplemented Process Governor evaluators
- Tier 2: Earned Autonomy System — agents gain and lose permissions based on track record
- Tier 3: Proactive Initiative Framework — agents can self-initiate work within their domain
- Tier 4: Direct Agent-to-Agent Express Lanes — specialist-to-specialist handoffs without Felix bottleneck
- Tier 5: Environmental Awareness Engine — agents detect and respond to external signals
- Tier 6: Collective Intelligence Protocols — multi-agent reasoning and decision-making patterns
- Governance Integration: New rules, evaluators, and actions required for each tier

---

# TABLE OF CONTENTS

1. Current State Assessment
2. Tier 1: Evaluator Activation Plan
3. Tier 2: Earned Autonomy System
4. Tier 3: Proactive Initiative Framework
5. Tier 4: Direct Agent-to-Agent Express Lanes
6. Tier 5: Environmental Awareness Engine
7. Tier 6: Collective Intelligence Protocols
8. New Governance Rules Required
9. New Condition Evaluators Required
10. New Automated Actions Required
11. Updated Autonomy Rules Matrix
12. Implementation Roadmap
13. Risk Assessment & Safeguards

---

# 1. CURRENT STATE ASSESSMENT

## What's Working

The existing Process Governor provides a solid governance foundation:

- **31 active governance rules** across 6 categories (Compliance, Cost Control, Operations, Performance, Resource Management, Security)
- **Human-in-the-Loop gates** for high-risk actions (email, publishing, payments)
- **Emergency Kill Switch** (Rule #20) with protected personas (Blueprint, Chief of Staff)
- **Delegation chain depth limit** (Rule #17) capped at 2 levels
- **Segregation of duties** (Rule #22) requiring 2+ agents for sensitive workflows
- **Memory integrity protection** (Rule #18) against memory poisoning
- **Cascading failure detection** (Rule #15) with automatic pause
- **Three compliance frameworks** (NIST, OWASP, Singapore IMDA) informing rule design

## What's Limiting Agent Effectiveness

### 1.1 — Nine Evaluators Are Unimplemented

The following condition evaluators are listed in the Process Governor but marked "standing by" or "handled inline" without full metering:

| Evaluator | Status | Impact of Gap |
|---|---|---|
| `daily_spend` | Standing by | No real-time cost visibility; can't enforce budget rules |
| `pii_exposure` | Standing by | PII in outputs not detected until human review |
| `agent_spend_ratio` | Standing by | Can't detect one agent monopolizing tokens |
| `failover_rate` | Standing by | Provider degradation goes undetected |
| `purpose_drift` | Requires content analysis | Agents can drift off-mission without detection |
| `auth_failures` | Login-time only | Limited brute-force monitoring window |
| `desk_queue` | Handled by desk system | No governance-level visibility into queue overload |
| `content_pipeline` | Handled inline | No audit trail of review bypasses |
| `tool_boundary_violations` | Handled by tool router | No aggregate pattern detection |

**Why this matters:** You can't safely expand agent autonomy if you can't see what they're doing. These evaluators are the instrumentation that makes expanded agency safe.

### 1.2 — Static Autonomy Levels

Current autonomy assignments are fixed per agent:
- Felix: `full_auto` on delegation
- Forge: `full_auto` on code execution, `approve_before` on shell
- Scribe: `approve_before` on publishing
- Apollo: `full_auto` on email

These never change regardless of agent performance. A Scribe with 200 successful reviews still needs the same approval as on day one. An Apollo whose emails consistently underperform still has `full_auto`.

### 1.3 — Reactive-Only Operation Model

All agents currently operate in a purely reactive model:
- Wait for user request → Felix delegates → Agent executes → Felix reports
- Heartbeat tasks provide some scheduled autonomy, but these are fixed routines (morning standup, EOD summary) — not intelligent responses to changing conditions

Agents cannot:
- Spot opportunities or threats in their domain and raise them
- Start work they believe needs doing without being told
- Suggest workflow improvements based on their experience
- Alert the team about emerging patterns they've noticed

### 1.4 — Felix as Universal Bottleneck

Every piece of work flows: User → Felix → Agent → Felix → User. For a 5-agent orchestration, Felix is in the chain 10 times. Some agent-to-agent flows are natural and low-risk:
- Scribe finishing a draft and sending it directly to Proof
- Radar completing research and passing findings directly to Apollo for outreach
- Atlas generating metrics and passing them to Cassandra for financial analysis

These shouldn't require Felix to relay the handoff.

---

# 2. TIER 1: EVALUATOR ACTIVATION PLAN

**Goal:** Bring all 9 unimplemented evaluators to active status so the governance system has full visibility.

**Dependency:** This tier is a PREREQUISITE for Tiers 2-6. Do not expand agency until visibility is complete.

---

## 2.1 — daily_spend Evaluator

**Purpose:** Real-time tracking of AI token consumption against daily budget.

**Implementation Requirements:**
- Hook into all LLM API calls (message creation, tool usage, sub-agent spawning)
- Track tokens consumed per request: input tokens + output tokens
- Calculate cost per request using model-specific pricing table
- Maintain running daily total, resetting at midnight tenant timezone
- Expose: `spend_percent` (% of daily budget), `spend_total` (absolute dollars), `spend_by_agent` (per-persona breakdown)

**Feeds Rules:** #5 (daily budget warning at 80%), #6 (daily budget critical at 200%)

**Activation Signal:** When `spend_percent` returns accurate real-time data against a configured daily budget value.

---

## 2.2 — pii_exposure Evaluator

**Purpose:** Scan agent outputs for personally identifiable information before external delivery.

**Implementation Requirements:**
- Regex pattern matching for: email addresses, phone numbers (US/international), SSNs (XXX-XX-XXXX), credit card numbers (Luhn validation), physical addresses
- Context-aware: Internal channel messages are logged but not blocked; external communications (send_email, publish_social_post, whatsapp) are blocked if PII detected
- Whitelist: Known business email addresses (visionclaw@agentmail.to, user's own email) should not trigger
- Expose: `pii_in_output` (count of PII instances), `pii_types` (which types detected), `pii_context` (internal vs. external)

**Feeds Rules:** #24 (PII handling enforcement)

**Activation Signal:** When scanner correctly identifies test PII patterns in simulated outputs with <5% false positive rate.

---

## 2.3 — agent_spend_ratio Evaluator

**Purpose:** Detect when a single agent is consuming disproportionate token budget.

**Implementation Requirements:**
- Depends on `daily_spend` being active
- Calculate each agent's percentage of total daily spend
- Track rolling 1-hour and 24-hour ratios
- Expose: `agent_percent_of_total` (per agent), `top_spender` (agent ID), `top_spender_percent`

**Feeds Rules:** #27 (per-agent token budget, 30% cap)

**Activation Signal:** When daily_spend is active and per-agent attribution is accurate.

---

## 2.4 — failover_rate Evaluator

**Purpose:** Monitor how often requests fail to the primary model and fall back to alternates.

**Implementation Requirements:**
- Hook into model routing logic
- Track: primary model attempts, primary model successes, failover events, failover target
- Calculate failover percentage over rolling 1-hour window
- Expose: `failover_percent`, `primary_model`, `failover_targets`, `avg_failover_latency_ms`

**Feeds Rules:** #30 (model failover health, 40% threshold)

**Activation Signal:** When failover tracking produces accurate percentages during normal operation and during simulated provider outage.

---

## 2.5 — purpose_drift Evaluator

**Purpose:** Detect when an agent consistently works on topics outside its defined specialization.

**Implementation Requirements:**
- After each agent response, classify the task topic against the agent's defined focus areas (from persona config)
- Use `llm_task` with a lightweight classification model to score: "Is this task within [Agent]'s defined domain?"
- Track `on_topic` vs. `off_topic` classifications over rolling 48-hour window
- Calculate `off_topic_ratio` (0.0 to 1.0)
- Threshold: 0.5 means more than half the agent's recent work is outside their lane
- Expose: `off_topic_ratio`, `off_topic_examples` (last 3 off-topic tasks), `agent_id`

**Feeds Rules:** #21 (purpose binding enforcement)

**Important Note:** Felix (CEO) is exempt from purpose drift detection — coordinating across all domains IS his purpose. Agent Blueprint is also exempt — working ON agents across all domains is their purpose.

**Activation Signal:** When classifier correctly identifies on-topic vs. off-topic tasks for 3+ agents with >90% accuracy on test set.

---

## 2.6 — auth_failures Evaluator

**Purpose:** Continuous monitoring of authentication failure patterns (not just at login time).

**Implementation Requirements:**
- Monitor all authentication events: API key usage, OAuth token refreshes, session validations, Google Workspace auth
- Track failures by source IP, by session, and by type
- Rolling 1-hour window
- Expose: `failed_attempts` (count), `failure_sources` (unique IPs/sessions), `failure_types` (key expired, invalid token, wrong password)

**Feeds Rules:** #10 (auth anomaly detection, 10+ failures in 1 hour)

**Activation Signal:** When evaluator captures auth failures from all authentication pathways (not just primary login).

---

## 2.7 — desk_queue Evaluator

**Purpose:** Governance-level visibility into agent workload queues.

**Implementation Requirements:**
- Query each agent's desk for pending task count, oldest pending task age, queue growth rate
- Expose: `queue_depth` (per agent), `oldest_pending_hours`, `queue_growth_rate` (tasks added per hour vs. completed per hour)

**Feeds Rules:** #12 (queue depth warning at 10+ items), #29 (workload balance, 5x ratio)

**Activation Signal:** When desk system exposes queue metrics to governance evaluator API.

---

## 2.8 — content_pipeline Evaluator

**Purpose:** Audit trail verification that content flows through required review steps.

**Implementation Requirements:**
- Track content lifecycle: created_by → reviewed_by → approved_by → published_by
- Flag content that was published without going through Proof (persona 8)
- Flag content where the creator and reviewer are the same agent
- Expose: `unreviewed_content` (count), `bypassed_reviews` (list with content IDs), `review_turnaround_hours` (avg time in review queue)

**Feeds Rules:** #13 (content review enforcement), #23 (conflict of interest prevention)

**Activation Signal:** When content creation and publishing events are tracked end-to-end with review step verification.

---

## 2.9 — tool_boundary_violations Evaluator

**Purpose:** Aggregate pattern detection for agents attempting to use tools outside their assigned set.

**Implementation Requirements:**
- Current tool router blocks unauthorized tool usage inline — but doesn't aggregate patterns
- Track: which agent, which tool attempted, how many times, over what period
- Expose: `unauthorized_tool_attempts` (count per agent per 24h), `attempted_tools` (list), `agent_id`

**Feeds Rules:** #19 (agent action boundaries, 3+ violations in 24h)

**Activation Signal:** When tool router reports blocked attempts to governance evaluator with agent attribution.

---

## 2.10 — Activation Priority Order

| Priority | Evaluator | Rationale |
|---|---|---|
| 1 | `daily_spend` | Foundation for all cost control rules |
| 2 | `agent_spend_ratio` | Depends on daily_spend; prevents resource monopolization |
| 3 | `tool_boundary_violations` | Essential for Tier 2 earned autonomy tracking |
| 4 | `content_pipeline` | Essential for Tier 2 earned autonomy (Scribe/Proof) |
| 5 | `purpose_drift` | Safety net for Tier 3 proactive initiative |
| 6 | `desk_queue` | Required for Tier 4 workload-aware routing |
| 7 | `pii_exposure` | Critical for expanding external communication autonomy |
| 8 | `failover_rate` | Operational resilience monitoring |
| 9 | `auth_failures` | Security hardening |

---

# 3. TIER 2: EARNED AUTONOMY SYSTEM

**Goal:** Agents gain and lose permissions based on demonstrated performance, creating a trust gradient that replaces static autonomy levels.

**Prerequisite:** Tier 1 evaluators active (especially `tool_boundary_violations`, `content_pipeline`, `purpose_drift`)

---

## 3.1 — Trust Score Architecture

Each agent maintains a **Trust Score** per operation category. Trust scores are numerical (0-100) and map to autonomy levels:

| Trust Score Range | Autonomy Level | Meaning |
|---|---|---|
| 0-25 | `blocked` | Agent cannot perform this action at all |
| 26-50 | `approve_before` | Human must approve before execution |
| 51-75 | `notify_after` | Agent executes, human notified afterward |
| 76-100 | `full_auto` | Agent executes with no human interaction |

### Trust Score Categories (per agent):

| Category | What It Tracks | Applies To |
|---|---|---|
| `external_comms` | Email, social publishing, WhatsApp | Apollo, Scribe, Teagan, Felix |
| `content_quality` | Writing quality as rated by Proof | Scribe, Teagan, Neptune |
| `code_reliability` | Code execution success rate | Forge |
| `research_accuracy` | Research quality (sourced, accurate) | Radar, Neptune |
| `financial_accuracy` | Financial calculations correctness | Cassandra, Atlas |
| `legal_soundness` | Legal review quality | Luna |
| `delegation_efficiency` | Delegation success rate, appropriate routing | Felix |
| `tool_compliance` | Using only assigned tools | ALL agents |
| `purpose_adherence` | Staying within defined domain | ALL agents |

---

## 3.2 — Trust Score Calculation

### Earning Trust (Score Increases)

| Event | Score Change | Condition |
|---|---|---|
| Successful task completion | +2 | Task completed, no errors, deliverables produced |
| Quality rating: "Ship" from Proof | +3 | Content rated ready to ship on first pass |
| Quality rating: "Minor Edits" | +1 | Content needed small fixes only |
| Positive user feedback | +5 | User explicitly approves or praises result |
| Successful proactive action (Tier 3) | +3 | Self-initiated work produces positive outcome |
| Clean audit (7 consecutive days, no violations) | +5 | No governance rule triggers for 7 days |
| Cross-agent collaboration success | +2 | Express lane handoff (Tier 4) completed successfully |

### Losing Trust (Score Decreases)

| Event | Score Change | Condition |
|---|---|---|
| Task failure | -3 | Task failed or produced error |
| Quality rating: "Revision Needed" | -5 | Content needed significant rework |
| Quality rating: "Rewrite" | -10 | Content was fundamentally off-target |
| Negative user feedback | -10 | User rejects or criticizes result |
| Tool boundary violation | -5 | Attempted to use unauthorized tool |
| Purpose drift detected | -8 | Evaluator flags off-topic work |
| Governance rule triggered (agent-specific) | -5 | Any rule fires because of this agent |
| Failed proactive action (Tier 3) | -5 | Self-initiated work was unnecessary or wrong |
| HITL rejection | -7 | Human rejected an action in the confirmation gate |

### Critical Trust Events (Immediate Level Drop)

| Event | Effect | Recovery |
|---|---|---|
| Security violation (Rule #16 rogue agent) | Trust score → 0, all categories | Manual reset by human only |
| Data leak / PII exposure | Trust score → 0 for `external_comms` | Manual reset after investigation |
| Cascading failure caused | Trust score → 25 for `tool_compliance` | 30 clean days to recover |
| Memory poisoning detected | Trust score → 0 for all categories | Manual reset after investigation |

---

## 3.3 — Trust Score Boundaries and Safety Rails

### Floor and Ceiling

- **Minimum score:** 0 (blocked)
- **Maximum score:** 95 (never reaches 100 — there's always some oversight)
- **Starting score for new agents:** 50 (approve_before level — prove yourself first)
- **Starting score for existing agents:** Based on current static autonomy level:
  - Currently `full_auto` → Start at 80
  - Currently `notify_after` → Start at 60
  - Currently `approve_before` → Start at 40
  - Currently `blocked` → Start at 10

### Transition Thresholds (with hysteresis)

To prevent oscillation at level boundaries, trust score transitions require sustained performance:

- **Upgrade** (e.g., approve_before → notify_after): Score must be above the threshold for **5 consecutive days**
- **Downgrade** (e.g., notify_after → approve_before): Score drops below threshold **immediately** (safety-first)

This means it's easy to lose trust but takes sustained good work to earn it back.

### Never-Auto Categories

Regardless of trust score, some actions ALWAYS require human approval:

| Action | Reason | Override Possible? |
|---|---|---|
| `payment_action` | Financial transactions | No — hardcoded HITL |
| `browser_form_submit` | External system interaction | No — hardcoded HITL |
| `execute_shell` | System-level access | No — hardcoded HITL |
| `kill_switch` activation | Emergency system halt | No — hardcoded HITL |
| `delete` operations on production data | Irreversible data loss | No — hardcoded HITL |

---

## 3.4 — Trust Score Visibility

### Agent Self-Awareness
Each agent can query their own trust scores via a new tool or memory lookup. This lets agents understand their own limitations:

```
"My trust scores:
  external_comms: 72 (notify_after)
  content_quality: 85 (full_auto)
  tool_compliance: 90 (full_auto)
  purpose_adherence: 88 (full_auto)"
```

### Felix Dashboard
Felix can see all agents' trust scores in a single view for operational awareness. This feeds into delegation decisions — Felix prefers agents with higher trust scores for critical work.

### Human Dashboard
The user can see trust scores and override them at any time. Human override is absolute:
- Human can manually set any agent's trust score to any value
- Human can lock a trust score (prevent automatic changes)
- Human can reset all scores to defaults

---

## 3.5 — Specific Earned Autonomy Progressions

### Scribe Publishing Autonomy

**Current State:** Scribe must get Proof approval before any content publishes (`approve_before`).

**Earned Progression:**
```
Phase 1 (Trust 26-50): All content requires Proof review → approve before publish
Phase 2 (Trust 51-75): Short-form content (social posts, emails < 200 words) auto-publishes 
                         with Proof notified after; long-form still requires review
Phase 3 (Trust 76-95): All standard content auto-publishes with Proof notified after; 
                         only HIGH-STAKES content (press releases, legal docs, investor comms) 
                         requires pre-review
```

**Trust Earning:** Every "Ship" rating from Proof = +3. Every "Rewrite" = -10.
**Safety Net:** Proof can retroactively flag published content and trigger a correction, which also decreases Scribe's trust by -5.

### Apollo Email Autonomy

**Current State:** Apollo has `full_auto` on send_email.

**Governance Enhancement:** Track email outcomes to validate this trust level.
```
If reply_rate drops below 5% over 30 days → trust decreases → throttle to notify_after
If bounce_rate exceeds 10% → trust decreases sharply → throttle to approve_before
If user reports inappropriate outreach → trust drops to 0 → blocked until human review
```

### Forge Code Execution Autonomy

**Current State:** Forge has `full_auto` on execute_code, `approve_before` on execute_shell.

**Earned Progression for Shell:**
```
Phase 1 (Trust 26-50): All shell commands require human approval
Phase 2 (Trust 51-75): Read-only shell commands (ls, cat, grep, find) auto-execute 
                         with notification; write commands still require approval
Phase 3 (Trust 76-95): Non-destructive shell commands auto-execute; 
                         destructive commands (rm, chmod, chown, kill) always require approval
```

**Trust Earning:** Successful shell executions without incidents = +2. Failed command or unintended side effect = -10.

### Cassandra Financial Autonomy

**Current State:** No specific autonomy rules defined.

**Earned Progression:**
```
Phase 1 (Trust 26-50): All financial reports require human review before delivery
Phase 2 (Trust 51-75): Internal financial summaries auto-deliver to Felix; 
                         external financial docs still require review
Phase 3 (Trust 76-95): All standard financial reports auto-deliver; 
                         only board/investor/tax documents require review
```

**Never-Auto:** Stripe payment actions, invoice sending, pricing changes — always HITL regardless of trust.

---

# 4. TIER 3: PROACTIVE INITIATIVE FRAMEWORK

**Goal:** Allow agents to self-initiate work within their domain when they detect something worth acting on, without waiting for Felix or the user to ask.

**Prerequisite:** Tier 1 evaluators active + Tier 2 trust scores operational (minimum trust of 51 in `purpose_adherence` for any agent to gain proactive rights)

---

## 4.1 — Proactive Action Budget

Each agent receives a daily **Proactive Action Budget (PAB)** — the maximum number of self-initiated actions they can take per 24-hour period.

### Base PAB Allocation

| Trust Score Range | Daily PAB | Description |
|---|---|---|
| 0-50 | 0 | No proactive actions allowed |
| 51-65 | 1 | One self-initiated action per day |
| 66-80 | 3 | Up to three per day |
| 81-95 | 5 | Up to five per day |

### PAB Cost by Action Type

Not all proactive actions cost the same:

| Action Type | PAB Cost | Examples |
|---|---|---|
| Internal alert / observation | 1 | Post to internal channel, flag an issue |
| Memory update / note | 1 | Create memory, write daily note |
| Research / information gathering | 2 | Web search, deep research |
| Content creation | 3 | Draft a post, write a brief |
| External communication | 4 | Send email, publish content |
| Cross-agent delegation | 3 | Request work from another agent |

**Example:** Radar with PAB of 3 could:
- Post a competitive alert to #intelligence channel (cost: 1)
- Run a web search on a developing trend (cost: 2)
- Total: 3/3 budget used

**Example:** Radar with PAB of 3 could NOT:
- Post an alert (cost: 1) + run research (cost: 2) + send email to user (cost: 4) = 7 > 3 budget

---

## 4.2 — Proactive Action Triggers

Agents can self-initiate actions when they detect specific trigger conditions within their domain. These triggers are defined per persona:

### Radar (Intelligence Analyst) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Competitor makes major move | Watchlist alert or heartbeat scan | Post competitive alert to #intelligence, brief Felix |
| Industry trend shift | Deep research during scheduled scan | Write trend alert, save to knowledge base |
| Relevant regulation change | Regulatory scan | Alert Luna + Felix via channel |
| Client/prospect in the news | Watchlist monitoring | Alert Apollo with prospect research brief |

### Cassandra (CFO) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Revenue below projection by >15% | Financial tracking | Alert Felix with variance analysis |
| Unusual expense spike | Spend monitoring | Flag expense with investigation notes |
| Payment failure detected | Stripe webhook or monitoring | Alert Chief of Staff + Felix |
| Tax deadline approaching (14 days) | Calendar/deadline tracking | Send tax prep reminder to Felix |
| Cash runway below 3 months | Cash flow model | Urgent alert to Felix with scenario analysis |

### Apollo (Revenue Manager) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Deal stale for 7+ days | Pipeline memory review | Draft follow-up email for approval |
| Prospect engages with content | Marketing analytics event | Research prospect, prepare outreach brief |
| Pipeline value drops 20%+ | Pipeline tracking | Alert Felix with pipeline health report |
| Client contract renewal in 30 days | Calendar/memory tracking | Prepare renewal proposal brief |

### Scribe (Content Creator) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Content calendar has gap (3+ days) | Calendar review | Draft content ideas, post to #content-pipeline |
| Trending topic in company's domain | Radar alert or scheduled scan | Draft article outline for Felix review |
| Recurring content due (newsletter, etc.) | Schedule tracking | Begin draft, notify Felix |

### Chief of Staff (Operations) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| System degradation detected | Health check anomaly | Run full diagnostic, alert Felix |
| API key expiration within 24 hours | Token expiry monitoring | Alert human with renewal instructions |
| Agent desk stalled 12+ hours | Desk monitoring | Restart agent, notify Felix |
| Unread channel messages 24+ hours old | Channel monitoring | Compile digest, post summary |

### Atlas (Analytics) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| KPI breaches threshold (up or down) | Metrics monitoring | Alert Felix with metric snapshot |
| Data anomaly detected | Statistical monitoring | Investigate and post findings |
| Weekly metrics ready for compilation | Schedule | Begin metrics compilation |

### Luna (Legal) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Regulatory change in AI/business law | Regulatory scan | Alert Felix with compliance impact brief |
| Contract expiring within 30 days | Contract tracker | Alert Felix with renewal recommendations |
| Compliance checklist items overdue | Checklist monitoring | Alert Felix with overdue items |

### Teagan (Marketing) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Content performing unusually well/poorly | Marketing analytics | Post performance alert with recommendations |
| Trending hashtag in company's space | Social monitoring | Draft reactive content for approval |
| Content calendar week has low volume | Calendar review | Propose additional content |

### Forge (Engineering) — Proactive Triggers

| Trigger | Detection Method | Proactive Action |
|---|---|---|
| Build queue has unprocessed items | Desk/queue monitoring | Begin processing, notify Felix |
| Dependency or tool has known vulnerability | Security scan (deep_research) | Alert Chief of Staff with assessment |
| System performance degradation | Health monitoring | Investigate, post findings to #engineering |

---

## 4.3 — Proactive Action Governance

### Logging Requirements

Every proactive action MUST be logged with:
- Agent ID and persona name
- Trigger condition that justified the action
- Action taken
- PAB cost and remaining daily budget
- Outcome (tracked via track_outcome)
- Timestamp

### Audit Trail

Proactive actions appear in:
1. The agent's daily notes (write_daily_note)
2. The EOD summary compiled by Chief of Staff
3. The governance audit log
4. Felix's morning brief (so the user sees what agents did proactively)

### Override Controls

- **User can disable** proactive actions for any agent at any time
- **User can disable** all proactive actions system-wide with a single toggle
- **Felix can temporarily suspend** an agent's proactive rights if quality drops
- **Process Governor** automatically suspends proactive rights if trust score drops below 51

### Proactive Action Quality Tracking

Each proactive action is rated by its outcome:

| Outcome | Trust Impact | PAB Impact |
|---|---|---|
| Valuable — user acknowledges or uses the output | +3 trust | PAB maintains or increases |
| Neutral — no positive or negative impact | 0 trust | PAB maintains |
| Unnecessary — wasted effort, user didn't need it | -2 trust | PAB maintains |
| Harmful — caused confusion, wrong info, or extra work | -5 trust | PAB decreases by 1 next day |
| Dangerous — caused security, legal, or financial issue | -15 trust, proactive rights suspended | PAB → 0 until human review |

---

# 5. TIER 4: DIRECT AGENT-TO-AGENT EXPRESS LANES

**Goal:** Define pre-approved pathways where agents can hand work directly to other agents without routing through Felix, reducing latency and Felix's cognitive load.

**Prerequisite:** Tier 2 trust scores operational. Both agents in an express lane must have trust ≥ 60 in `tool_compliance` and `purpose_adherence`.

---

## 5.1 — Express Lane Definitions

An **Express Lane** is a pre-approved direct handoff between two specific agents for a specific type of work. Felix is notified but doesn't need to approve.

### Approved Express Lanes

| From Agent | To Agent | Work Type | Condition | Felix Notification |
|---|---|---|---|---|
| Scribe (7) | Proof (8) | Content review | Any content Scribe produces | Summary after review complete |
| Proof (8) | Scribe (7) | Revision feedback | Proof rates "Revision" or "Rewrite" | Summary of revision request |
| Radar (9) | Apollo (11) | Prospect intelligence | Radar discovers actionable prospect data | Alert with intelligence brief |
| Radar (9) | Cassandra (13) | Market financial data | Research produces financial/market data | Alert with data summary |
| Atlas (12) | Cassandra (13) | Metrics for financial analysis | Atlas produces KPI/metrics data | Alert with metrics summary |
| Cassandra (13) | Felix (2) | Financial alerts | Budget/revenue/cash anomalies | Direct alert (always) |
| Chief of Staff (6) | Forge (3) | Technical incident | System health issue needs engineering fix | Alert with incident details |
| Teagan (4) | Scribe (7) | Long-form content request | Campaign needs article or script | Request with brief |
| Apollo (11) | Scribe (7) | Proposal copy request | Deal needs written proposal | Request with client details |
| Apollo (11) | Luna (14) | Contract review | Deal has contract that needs legal review | Request with contract |
| Luna (14) | Felix (2) | Legal risk alert | High/Critical risk identified | Direct alert (always) |
| Neptune (10) | Scribe (7) | Script request for media | Media production needs narration script | Request with specs |

### Express Lane Diagram

```
                    ┌──────────┐
                    │  Felix   │ ← All alerts flow up
                    │  (CEO)   │ ← All summaries flow up
                    └────┬─────┘
                         │ Orchestrates complex work
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌─────────┐ ┌────────┐ ┌──────────┐
        │  Radar  │→│ Apollo │→│  Scribe  │←─── Teagan
        │  (9)    │ │  (11)  │ │   (7)    │←─── Neptune
        └────┬────┘ └───┬────┘ └────┬─────┘
             │          │           │
             ▼          ▼           ▼
        ┌─────────┐ ┌────────┐ ┌──────────┐
        │Cassandra│ │  Luna  │ │  Proof   │
        │  (13)   │ │  (14)  │ │   (8)    │
        └─────────┘ └────────┘ └──────────┘
              ▲
              │
        ┌─────────┐     ┌──────────┐
        │  Atlas  │     │Chief of  │→ Forge (3)
        │  (12)   │     │Staff (6) │
        └─────────┘     └──────────┘
```

---

## 5.2 — Express Lane Protocol

When Agent A uses an express lane to hand off to Agent B:

### Step 1: Eligibility Check
```
IF Agent_A.trust_score[tool_compliance] >= 60 
AND Agent_A.trust_score[purpose_adherence] >= 60 
AND Agent_B.trust_score[tool_compliance] >= 60 
AND Agent_B.trust_score[purpose_adherence] >= 60 
AND express_lane_exists(Agent_A, Agent_B, work_type)
THEN → proceed
ELSE → route through Felix (standard delegation)
```

### Step 2: Handoff Execution
```
Agent A calls: sessions_send OR delegate_task(targetAgent=Agent_B)
With structured handoff:
  - SOURCE: Agent A name and ID
  - WORK_TYPE: [matching express lane work type]
  - CONTEXT: [full context for Agent B]
  - DELIVERABLE_EXPECTED: [what Agent A needs back]
  - DEADLINE: [if time-sensitive]
  - PROJECT_ID: [if project exists]
```

### Step 3: Felix Notification
```
Agent A posts to internal channel:
  "EXPRESS LANE: [Agent A] → [Agent B]
   Work: [description]
   Reason: [trigger condition]
   Expected deliverable: [what]
   ETA: [when]"
```

### Step 4: Completion
```
Agent B completes work → returns result to Agent A (or directly to project)
Agent B posts completion notification to channel
Felix includes in next summary to user
```

---

## 5.3 — Express Lane Safety Controls

### Governance Rules Apply
- Delegation depth limit (Rule #17) still applies: A→B is 1 level, A→B→C is 2 levels (max)
- Express lane handoffs count toward delegation depth
- Segregation of duties (Rule #22) still enforced

### Revocation Conditions
An express lane is automatically suspended if:
- Either agent's trust score drops below 60 in any required category
- The express lane produces 3 consecutive failed handoffs
- User manually disables it
- Process Governor detects pattern abuse (same lane used >20 times/day)

### Volume Limits
Each express lane has a daily volume cap to prevent runaway loops:
- Default: 10 handoffs per day per lane
- Can be adjusted per lane
- Exceeding cap → remaining requests route through Felix

---

# 6. TIER 5: ENVIRONMENTAL AWARENESS ENGINE

**Goal:** Give agents structured ability to monitor their external environment and respond to changes, going beyond the existing watchlist system.

**Prerequisite:** Tier 1 evaluators active, Tier 3 proactive initiative framework in place

---

## 6.1 — Environmental Scan Types

| Scan Type | Frequency | Owner Agent | What It Monitors |
|---|---|---|---|
| Competitive Pulse | Daily (7 AM) | Radar (9) | Competitor websites, news, social mentions |
| Market Sentiment | Daily (7 AM) | Radar (9) | Industry news, analyst opinions, trend signals |
| Regulatory Watch | Weekly (Monday 8 AM) | Luna (14) | AI regulations, business law changes, compliance updates |
| Financial Environment | Daily (8 AM) | Cassandra (13) | Interest rates, market conditions, relevant economic indicators |
| Technology Watch | Weekly (Tuesday 8 AM) | Forge (3) | Dependency updates, security advisories, new tool releases |
| Customer Signals | Daily (9 AM) | Chief of Staff (6) | Inbox analysis, support patterns, feedback themes |
| Content Landscape | Weekly (Monday 9 AM) | Teagan (4) | Trending topics, content performance benchmarks, platform changes |
| Pipeline Health | Daily (9 AM) | Apollo (11) | Deal aging, outreach response rates, pipeline velocity |

---

## 6.2 — Environmental Signal Classification

When a scan detects something noteworthy, the agent classifies the signal:

| Signal Level | Meaning | Action |
|---|---|---|
| **NOISE** | Detected but not actionable | Log only, no notification |
| **WATCH** | Interesting, worth monitoring | Add to watchlist, note in daily log |
| **ALERT** | Actionable, someone should review | Post to relevant channel, include in next brief |
| **URGENT** | Time-sensitive, needs action within 24 hours | Direct notification to Felix + relevant agent |
| **CRITICAL** | Immediate action required | Direct notification to Felix + human escalation |

---

## 6.3 — Signal Routing Matrix

When an environmental signal is detected, route it to the right consumers:

| Signal Category | Primary Consumer | Secondary Consumer | Channel |
|---|---|---|---|
| Competitor pricing change | Apollo (11) | Cassandra (13) | #intelligence |
| New competitor entered market | Radar (9) | Felix (2) | #intelligence |
| Regulatory change | Luna (14) | Felix (2) | #general |
| Technology vulnerability | Forge (3) | Chief of Staff (6) | #engineering |
| Customer complaint pattern | Chief of Staff (6) | Scribe (7) | #general |
| Content viral moment | Teagan (4) | Apollo (11) | #content-pipeline |
| Revenue anomaly | Cassandra (13) | Felix (2) | #revenue-alerts |
| Market downturn signal | Cassandra (13) | Radar (9) | #intelligence |
| Partnership opportunity | Apollo (11) | Felix (2) | #revenue-alerts |
| Prospect trigger event | Apollo (11) | Scribe (7) | #revenue-alerts |

---

# 7. TIER 6: COLLECTIVE INTELLIGENCE PROTOCOLS

**Goal:** Define structured patterns for multi-agent reasoning and decision-making that go beyond simple delegation, using the existing `debate`, `tree_of_thought`, and `critique_response` tools.

**Prerequisite:** All previous tiers operational

---

## 7.1 — Decision Complexity Classification

Felix classifies decisions by complexity to determine the reasoning protocol:

| Complexity | Characteristics | Protocol |
|---|---|---|
| **Simple** | Single domain, clear answer, low risk | Direct delegation to specialist |
| **Moderate** | Single domain, requires analysis, medium risk | Specialist + critique_response |
| **Complex** | Multi-domain, competing factors, high risk | Chain of Debates (debate tool) |
| **Ambiguous** | Multiple valid approaches, unclear best path | Tree of Thought (tree_of_thought tool) |
| **Strategic** | Long-term impact, irreversible, high stakes | Full Council (debate + tree_of_thought + critique) |

---

## 7.2 — Protocol Definitions

### Protocol 1: Specialist + Critique

**When:** Moderate complexity — single domain but important enough to double-check.

**Flow:**
```
Felix → delegate_task(specialist) → specialist produces answer
     → critique_response(answer, context) → critique agent evaluates
     → IF score >= 7/10: deliver to user
     → IF score < 7: return to specialist with feedback, iterate
```

**Example:** "Analyze our Q1 revenue trends" → Atlas produces analysis → Critique evaluates accuracy and completeness → Deliver or revise.

### Protocol 2: Chain of Debates

**When:** Complex decisions requiring multiple perspectives — financial, legal, technical, strategic views.

**Flow:**
```
Felix → debate(question, participantCount=4)
     → System selects relevant personas based on question domain
     → Each persona argues from their perspective
     → Synthesis produces recommendation with consensus level
     → Felix presents to user with all perspectives noted
```

**Example:** "Should we offer a freemium tier?" → Apollo (revenue impact), Cassandra (financial model), Forge (engineering cost), Teagan (marketing value), Luna (legal implications) → Synthesis with consensus level.

**Participant Selection Logic:**

| Question Domain | Default Participants |
|---|---|
| Product strategy | Forge, Apollo, Radar, Cassandra |
| Financial decision | Cassandra, Apollo, Atlas, Luna |
| Marketing strategy | Teagan, Apollo, Radar, Scribe |
| Legal/compliance | Luna, Cassandra, Forge, Felix |
| Technical architecture | Forge, Chief of Staff, Radar, Atlas |
| Hiring/team | Felix, Cassandra, Luna, relevant domain expert |

### Protocol 3: Tree of Thought

**When:** Ambiguous problems with multiple valid approaches and no clear best path.

**Flow:**
```
Felix → tree_of_thought(question, branchCount=3, context)
     → System generates 3 distinct reasoning paths
     → Each path is scored on soundness, completeness, feasibility
     → Best path selected (or hybrid synthesized)
     → Felix presents recommended approach with alternatives noted
```

**Example:** "How should we price our HVAC diagnostic app?" → Branch 1: subscription model analysis → Branch 2: per-use pricing analysis → Branch 3: freemium + premium analysis → Score and recommend.

### Protocol 4: Full Council

**When:** Strategic decisions with long-term, potentially irreversible consequences.

**Flow:**
```
Step 1: Felix → tree_of_thought(question) → generates 3 approaches
Step 2: Felix → debate(best_approach, participantCount=4) → multi-perspective analysis
Step 3: Felix → critique_response(synthesis) → quality check
Step 4: Felix → estimate_cost(implementation_plan) → resource assessment
Step 5: Felix presents to user: Recommended approach, alternatives considered, 
        multi-perspective analysis, cost estimate, risk assessment
```

**Example:** "Should we expand into commercial HVAC market?" → ToT generates 3 market entry strategies → Debate evaluates from revenue, finance, legal, technical angles → Critique reviews synthesis → Cost estimate for implementation → Full recommendation package.

---

## 7.3 — Collective Intelligence Budget

These protocols consume significant tokens. Cost controls:

| Protocol | Typical Token Cost | Max Uses Per Day |
|---|---|---|
| Specialist + Critique | Low (2 LLM calls) | Unlimited |
| Chain of Debates | Medium (4-6 LLM calls) | 5 |
| Tree of Thought | Medium (3-5 LLM calls) | 5 |
| Full Council | High (10-15 LLM calls) | 2 |

Daily token budget rules (#5, #6) still apply. If budget is at 80%+, only Specialist + Critique is available.

---

# 8. NEW GOVERNANCE RULES REQUIRED

These rules must be added to the Process Governor to support Tiers 2-6:

---

### Rule #32: trust-score-update
**Priority:** 7/10 | **Category:** COMPLIANCE

**Description:** Recalculate agent trust scores after each task completion, quality review, or governance event. Persist scores to database. Apply autonomy level changes based on score transitions.

**Condition:**
- Check: task_completion OR quality_review OR governance_event
- Operator: on_event

**Action:** update_trust_score
**Configuration:**
- apply_hysteresis: true (upgrades require 5 days, downgrades immediate)
- notify_on_level_change: true
- channel: "#system-alerts"

---

### Rule #33: trust-score-critical-drop
**Priority:** 9/10 | **Category:** SECURITY

**Description:** When any agent's trust score drops below 25 (blocked threshold) due to accumulated failures, immediately restrict all autonomy for that agent and escalate to human.

**Condition:**
- Check: trust_score_value
- Metric: min_category_score
- Operator: less_than
- Threshold: 25

**Action:** escalate
**Configuration:**
- restrict_agent: true
- message: "Agent trust score has dropped to blocked level. All autonomous actions suspended pending human review."

**ESCALATES TO HUMAN:** Yes

---

### Rule #34: proactive-action-budget-enforcement
**Priority:** 7/10 | **Category:** RESOURCE_MANAGEMENT

**Description:** Enforce daily Proactive Action Budget limits per agent. Block proactive actions that exceed the agent's daily budget.

**Condition:**
- Check: proactive_budget
- Metric: remaining_budget
- Operator: less_than_or_equal
- Threshold: 0

**Action:** block_proactive
**Configuration:**
- log_reason: true
- reset_at: "midnight_tenant_tz"

---

### Rule #35: proactive-action-quality-monitor
**Priority:** 6/10 | **Category:** PERFORMANCE

**Description:** Track outcomes of proactive actions. If an agent's proactive actions are rated "Unnecessary" or "Harmful" more than 50% of the time over 7 days, suspend proactive rights and decrease trust score.

**Condition:**
- Check: proactive_quality
- Metric: negative_outcome_ratio
- Operator: greater_than
- Threshold: 0.5
- Window: 7 days

**Action:** suspend_proactive
**Configuration:**
- trust_penalty: -10
- suspend_days: 7
- notify_channel: "#system-alerts"

---

### Rule #36: express-lane-health-monitor
**Priority:** 6/10 | **Category:** OPERATIONS

**Description:** Monitor express lane handoff success rates. If a specific express lane has 3 consecutive failures, suspend it and route through Felix.

**Condition:**
- Check: express_lane_failures
- Metric: consecutive_failures
- Operator: greater_than_or_equal
- Threshold: 3

**Action:** suspend_express_lane
**Configuration:**
- fallback: "route_through_felix"
- notify_channel: "#system-alerts"

---

### Rule #37: express-lane-volume-cap
**Priority:** 5/10 | **Category:** RESOURCE_MANAGEMENT

**Description:** Cap daily volume per express lane to prevent runaway loops.

**Condition:**
- Check: express_lane_volume
- Metric: daily_handoffs
- Operator: greater_than
- Threshold: 10

**Action:** throttle_express_lane
**Configuration:**
- fallback: "route_through_felix"
- reset_at: "midnight_tenant_tz"

---

### Rule #38: environmental-signal-escalation
**Priority:** 8/10 | **Category:** OPERATIONS

**Description:** Auto-escalate environmental signals classified as URGENT or CRITICAL to Felix and human.

**Condition:**
- Check: environmental_signal
- Metric: signal_level
- Operator: in
- Threshold: ["URGENT", "CRITICAL"]

**Action:** escalate
**Configuration:**
- notify_felix: true
- notify_human: true (CRITICAL only)
- channel: "#system-alerts"

**ESCALATES TO HUMAN:** Only for CRITICAL signals

---

### Rule #39: collective-intelligence-budget
**Priority:** 6/10 | **Category:** COST_CONTROL

**Description:** Limit daily usage of expensive collective intelligence protocols (Debate, Tree of Thought, Full Council) to prevent token budget exhaustion.

**Condition:**
- Check: collective_protocol_usage
- Metric: daily_protocol_calls
- Operator: greater_than
- Threshold: {"debate": 5, "tree_of_thought": 5, "full_council": 2}

**Action:** block_protocol
**Configuration:**
- allow: "critique_only"
- reset_at: "midnight_tenant_tz"

---

### Rule #40: earned-autonomy-audit
**Priority:** 4/10 | **Category:** COMPLIANCE

**Description:** Weekly audit of all trust score changes and autonomy level transitions. Generates report for human review.

**Condition:**
- Check: weekly_schedule
- Metric: day_of_week
- Operator: equals
- Threshold: "Monday"

**Action:** generate_audit_report
**Configuration:**
- include: ["trust_score_changes", "autonomy_transitions", "proactive_actions", "express_lane_usage"]
- deliver_to: "Felix"
- channel: "#system-alerts"

---

# 9. NEW CONDITION EVALUATORS REQUIRED

| Evaluator | Purpose | Key Metrics |
|---|---|---|
| `trust_score_value` | Query current trust scores per agent per category | `min_category_score`, `avg_score`, `score_by_category` |
| `proactive_budget` | Track daily proactive action budget consumption | `remaining_budget`, `spent_today`, `actions_taken` |
| `proactive_quality` | Track outcomes of proactive actions | `negative_outcome_ratio`, `positive_count`, `negative_count` |
| `express_lane_failures` | Track express lane handoff success/failure | `consecutive_failures`, `lane_id`, `success_rate` |
| `express_lane_volume` | Track daily handoff count per express lane | `daily_handoffs`, `lane_id` |
| `environmental_signal` | Classify and route environmental scan results | `signal_level`, `signal_category`, `source_agent` |
| `collective_protocol_usage` | Track daily usage of debate/ToT/council protocols | `daily_protocol_calls` by type |
| `weekly_schedule` | Simple schedule check for periodic governance tasks | `day_of_week`, `hour` |

---

# 10. NEW AUTOMATED ACTIONS REQUIRED

| Action | Purpose | Triggered By |
|---|---|---|
| `update_trust_score` | Recalculate and persist trust scores, apply autonomy changes | Rule #32 |
| `block_proactive` | Prevent proactive actions when budget exhausted | Rule #34 |
| `suspend_proactive` | Temporarily revoke proactive initiative rights | Rule #35 |
| `suspend_express_lane` | Disable a specific express lane, route through Felix | Rule #36 |
| `throttle_express_lane` | Cap express lane volume, overflow to Felix | Rule #37 |
| `block_protocol` | Prevent expensive reasoning protocols when budget hit | Rule #39 |
| `generate_audit_report` | Compile weekly audit of all agency expansion features | Rule #40 |

---

# 11. UPDATED AUTONOMY RULES MATRIX

This replaces the static autonomy assignments with trust-score-driven dynamic levels:

### Felix (CEO — Persona 2)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| delegate_task | 80 | full_auto | full_auto (capped) |
| send_email | 60 | notify_after | full_auto |
| orchestrate | 80 | full_auto | full_auto (capped) |
| payment_action | N/A | approve_before | approve_before (NEVER auto) |

### Forge (Engineer — Persona 3)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| execute_code | 80 | full_auto | full_auto (capped) |
| execute_shell | 40 | approve_before | notify_after (read-only full_auto) |
| deploy | 40 | approve_before | notify_after |

### Teagan (Marketing — Persona 4)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| draft_social_post | 80 | full_auto | full_auto (capped) |
| publish_social_post | 40 | approve_before | notify_after |
| manage_content_calendar | 80 | full_auto | full_auto (capped) |

### Scribe (Content — Persona 7)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| content_creation | 80 | full_auto | full_auto (capped) |
| publish_content | 40 | approve_before | notify_after |
| send_email (content delivery) | 40 | approve_before | notify_after |

### Proof (QA — Persona 8)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| quality_review | 80 | full_auto | full_auto (capped) |
| reject_content | 80 | full_auto | full_auto (capped) |

### Radar (Intelligence — Persona 9)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| web_research | 80 | full_auto | full_auto (capped) |
| deep_research | 80 | full_auto | full_auto (capped) |
| firecrawl operations | 60 | notify_after | full_auto |

### Neptune (Deep Research/Media — Persona 10)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| deep_research | 80 | full_auto | full_auto (capped) |
| generate_audio | 60 | notify_after | full_auto |
| create_slideshow_video | 60 | notify_after | full_auto |

### Apollo (Revenue — Persona 11)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| send_email | 80 | full_auto | full_auto (capped, with quality monitoring) |
| publish_social_post | 40 | approve_before | notify_after |
| deliver_product | 60 | notify_after | full_auto |

### Atlas (Analytics — Persona 12)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| generate_chart | 80 | full_auto | full_auto (capped) |
| generate_dashboard | 80 | full_auto | full_auto (capped) |
| execute_code (analysis) | 80 | full_auto | full_auto (capped) |

### Cassandra (CFO — Persona 13)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| financial_analysis | 80 | full_auto | full_auto (capped) |
| financial_reporting | 40 | approve_before | notify_after |
| payment_action | N/A | approve_before | approve_before (NEVER auto) |

### Luna (Legal — Persona 14)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| legal_review | 80 | full_auto | full_auto (capped) |
| contract_drafting | 40 | approve_before | notify_after |
| compliance_reporting | 60 | notify_after | full_auto |

### Chief of Staff (Operations — Persona 6)
| Action | Starting Trust | Starting Level | Can Earn Up To |
|---|---|---|---|
| system_health_checks | 80 | full_auto | full_auto (capped) |
| restart_agent | 60 | notify_after | full_auto |
| send_email (admin) | 40 | approve_before | notify_after |

---

# 12. IMPLEMENTATION ROADMAP

| Phase | Tier | Timeline | Effort | Dependencies |
|---|---|---|---|---|
| **Phase 1** | Tier 1: Evaluator Activation | Weeks 1-4 | High | Core platform hooks |
| **Phase 2** | Tier 2: Earned Autonomy | Weeks 5-8 | High | Phase 1 complete |
| **Phase 3** | Tier 3: Proactive Initiative | Weeks 9-12 | Medium | Phase 2 operational |
| **Phase 4** | Tier 4: Express Lanes | Weeks 9-12 | Medium | Phase 2 operational (parallel with Phase 3) |
| **Phase 5** | Tier 5: Environmental Awareness | Weeks 13-16 | Medium | Phases 3-4 operational |
| **Phase 6** | Tier 6: Collective Intelligence | Weeks 13-16 | Low | Phase 2 operational (parallel with Phase 5) |

**Total Estimated Timeline:** 16 weeks (4 months) for full implementation.

### Phase 1 Milestones (Weeks 1-4)
- Week 1: Implement `daily_spend` and `agent_spend_ratio` evaluators
- Week 2: Implement `tool_boundary_violations` and `content_pipeline` evaluators
- Week 3: Implement `purpose_drift`, `desk_queue`, `pii_exposure` evaluators
- Week 4: Implement `failover_rate` and `auth_failures` evaluators; integration testing

### Phase 2 Milestones (Weeks 5-8)
- Week 5: Trust score database schema, calculation engine, persistence layer
- Week 6: Trust score integration with autonomy rules system
- Week 7: Trust score visibility (agent self-query, Felix dashboard, human dashboard)
- Week 8: Hysteresis logic, never-auto categories, critical trust events; integration testing

### Phase 3 Milestones (Weeks 9-12)
- Week 9: Proactive Action Budget system, daily allocation and tracking
- Week 10: Proactive trigger definitions per agent, trigger detection hooks
- Week 11: Proactive action logging, audit trail, quality tracking
- Week 12: Governance rules (#34, #35), override controls; integration testing

### Phase 4 Milestones (Weeks 9-12, parallel)
- Week 9: Express lane definitions, eligibility checking
- Week 10: Express lane protocol implementation (handoff, notification, completion)
- Week 11: Safety controls (revocation, volume caps, delegation depth enforcement)
- Week 12: Governance rules (#36, #37); integration testing

### Phase 5 Milestones (Weeks 13-16)
- Week 13: Environmental scan scheduling and execution framework
- Week 14: Signal classification engine (NOISE → CRITICAL)
- Week 15: Signal routing matrix implementation
- Week 16: Governance rule (#38); integration testing

### Phase 6 Milestones (Weeks 13-16, parallel)
- Week 13: Decision complexity classification logic
- Week 14: Protocol selection and execution (existing tools: debate, tree_of_thought, critique_response)
- Week 15: Collective intelligence budget enforcement
- Week 16: Governance rule (#39); integration testing

---

# 13. RISK ASSESSMENT & SAFEGUARDS

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agent earns high trust then produces bad output | Medium | High | Immediate downgrade on failure; critical events reset to 0; Proof review as safety net |
| Proactive actions waste tokens on low-value work | Medium | Medium | PAB limits; quality tracking; automatic suspension after poor outcomes |
| Express lanes create unmonitored work | Low | High | Felix always notified; delegation depth limit still applies; volume caps |
| Environmental scans consume excessive tokens | Medium | Medium | Scheduled frequency limits; budget integration; throttle during high-spend periods |
| Collective intelligence protocols overused | Low | Medium | Daily usage caps; token budget rules (#5, #6) still apply |
| Trust score gaming (agent optimizes for score) | Low | Medium | Multiple score categories; critical events are harsh; human override available |
| Cascade through express lanes | Low | High | Delegation depth limit (Rule #17) still enforced; volume caps; Felix notification |

## Absolute Safeguards (Never Overridden)

These safeguards remain in effect regardless of trust scores, proactive budgets, or any other agency expansion:

1. **Kill Switch (Rule #20)** — Emergency halt always available
2. **Human Sovereignty** — Human can override any trust score, any autonomy level, any proactive action at any time
3. **Payment HITL** — Financial transactions always require human approval
4. **Delegation Depth Cap** — Maximum 2 levels, no exceptions
5. **Segregation of Duties** — Sensitive workflows always require 2+ agents
6. **Memory Integrity** — 20+ writes/hour still triggers investigation
7. **Cascading Failure Detection** — 3+ agents failing still triggers emergency pause
8. **PII Protection** — External PII exposure always blocked
9. **Audit Logging** — All actions logged regardless of autonomy level; 10-year retention
10. **Protected Personas** — Agent Blueprint and Chief of Staff always operational for diagnostics

---

*END OF AGENCY EXPANSION SPECIFICATION v1.0*
*VisionClaw Agent Platform — AI Buddy LLC*
