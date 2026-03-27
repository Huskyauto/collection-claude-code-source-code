# VisionClaw Process Governor - Complete Governance Reference
## AI Buddy LLC (Illinois)

---

# OVERVIEW

The Process Governor is VisionClaw's autonomous governance engine that enforces rules, compliance, and operational discipline across all 14 AI agent personas. It operates continuously, evaluating conditions against real-time system state and taking automated corrective actions when rules are triggered.

**Architecture:**
- 31 governance rules across 6 categories
- 22 condition evaluators (real-time system checks)
- 10 automated action types
- 3 compliance frameworks (NIST, OWASP, Singapore IMDA)
- Emergency Kill Switch for critical failures
- Human-in-the-Loop (HITL) escalation gates
- Per-agent autonomy rules

---

# PART 1: GOVERNANCE FRAMEWORKS

## NIST AI Agent Standards Initiative
**Organization:** National Institute of Standards and Technology (NIST)
**Version:** February 2026
**Category:** government_standard
**Status:** active
**Source:** https://www.nist.gov/artificial-intelligence/ai-agent-standards

**Description:** First U.S. government standards specifically for autonomous AI agents. Establishes identity management, action boundaries, audit requirements, and human oversight models for AI agents operating in enterprise environments. Part of NIST AI 600-series publications.

**Key Principles:**
- Agent identity and authorization — every agent must have verifiable identity and bounded permissions
- Action boundary enforcement — agents must not exceed their defined operational scope
- Audit log retention — all agent actions must be logged with minimum 10-year retention for EU AI Act compliance
- Human oversight models — defines graduated autonomy levels from full human control to full agent autonomy
- Inter-agent communication standards — secure protocols for agent-to-agent delegation and messaging
- Risk categorization — agents classified by risk level determining oversight requirements
- Transparency requirements — agents must be able to explain their decision-making process

**Rules Informed:** agent_action_boundaries, audit_log_retention, purpose_binding_enforcement, delegation_chain_depth_limit, segregation_of_duties

**Last Reviewed:** 2026-03-22 11:29:45.971377+00
**Next Review:** 2026-09-22 11:29:45.971377+00
**Notes:** Initial adoption March 2026. NIST updates these standards annually. Check for AI 600-3 series updates.

---

## OWASP Top 10 for Agentic AI Applications
**Organization:** Open Worldwide Application Security Project (OWASP)
**Version:** Version 1.0 — December 2025
**Category:** industry_framework
**Status:** active
**Source:** https://genai.owasp.org/resource/owasp-top-10-for-agentic-ai/

**Description:** First industry security framework specifically for autonomous AI agents. Identifies the 10 most critical security risks in agentic AI systems. Developed by 100+ security experts. Covers ASI01 (Excessive Agency) through ASI10 (Misaligned Behaviors).

**Key Principles:**
- ASI01 - Excessive Agency — agents acting beyond their defined scope; mitigate with least-privilege permissions
- ASI02 - Uncontrolled Agentic Behavior — cascading failures from autonomous decision loops; implement circuit breakers
- ASI03 - Insecure Agentic Communication — agents exchanging data without verification; enforce authenticated channels
- ASI04 - Inadequate Delegation Controls — unbounded agent-to-agent delegation chains; cap delegation depth
- ASI05 - Lack of Agent Traceability — inability to trace agent decision chains; maintain complete audit logs
- ASI06 - Memory and State Manipulation — adversaries poisoning agent memory; monitor write rates and validate integrity
- ASI07 - Prompt Injection and Manipulation — indirect prompt injection via tools/data; sanitize all inputs
- ASI08 - Agent Supply Chain Vulnerabilities — compromised tools or models; verify tool provenance
- ASI09 - Insufficient Monitoring — failure to detect anomalous agent behavior; implement real-time monitoring
- ASI10 - Misaligned Behaviors — agents drifting from intended goals; detect purpose drift and enforce alignment

**Rules Informed:** cascading_failure_detection, rogue_agent_detection, delegation_chain_depth_limit, memory_integrity_check, agent_action_boundaries, purpose_binding_enforcement

**Last Reviewed:** 2026-03-22 11:29:45.971377+00
**Next Review:** 2026-09-22 11:29:45.971377+00
**Notes:** OWASP updates this list annually. Version 1.1 expected mid-2026 with expanded supply chain guidance. Monitor owasp.org/genai for updates.

---

## Singapore IMDA Model AI Governance Framework for Agentic AI
**Organization:** Infocomm Media Development Authority (IMDA), Singapore
**Version:** January 2026
**Category:** government_standard
**Status:** active
**Source:** https://aiverifyfoundation.sg/resources/agentic-ai-governance/

**Description:** World's first government framework specifically for agentic AI governance. Published by Singapore's IMDA in collaboration with AI Verify Foundation. Establishes graduated autonomy, emergency controls, and accountability chains for autonomous AI systems.

**Key Principles:**
- Emergency kill switch — every agentic system must have an immediately accessible mechanism to halt all agent operations
- Graduated autonomy levels — agents progress through autonomy tiers based on demonstrated reliability and trust
- Accountability chains — clear chain of responsibility from agent action to human owner must be maintained
- Purpose binding — agents must be constrained to their defined purpose and detected when drifting
- Human-in-the-loop for critical decisions — define which decision categories always require human approval
- Continuous monitoring — real-time oversight of agent behavior with anomaly detection
- Transparency and explainability — agents must be able to explain why they took specific actions
- Data protection — agents handling personal data must comply with PDPA (Personal Data Protection Act) principles

**Rules Informed:** emergency_kill_switch, purpose_binding_enforcement, workload_balancing, business_hours_scheduling, model_failover_health_monitoring, pii_handling_enforcement

**Last Reviewed:** 2026-03-22 11:29:45.971377+00
**Next Review:** 2026-09-22 11:29:45.971377+00
**Notes:** Singapore leads global agentic AI governance. IMDA releases updates quarterly. AI Verify Foundation publishes companion technical guides. Check aiverifyfoundation.sg regularly.

---

## Corporate Governance Best Practices for AI Operations
**Organization:** Internal — AI Buddy LLC
**Version:** March 2026
**Category:** corporate_governance
**Status:** active
**Source:** null

**Description:** Internal governance principles derived from traditional corporate governance adapted for AI agent operations. Covers segregation of duties, conflict of interest prevention, change management, and cost controls. Based on SOX compliance patterns, COSO framework, and COBIT IT governance.

**Key Principles:**
- Segregation of duties — no single agent should control an end-to-end sensitive workflow without checks
- Conflict of interest prevention — agents cannot approve their own work product or audit their own outputs
- Change management audit — all configuration changes must be logged and traceable to a source
- Cost control thresholds — daily and per-agent spending limits with automatic alerts at warning and critical levels
- Failing task termination — tasks with 100% failure rate over 7 days are automatically disabled
- Dead resource cleanup — unused subscriptions and stale resources are automatically identified and cleaned
- Business continuity — essential services (governance, backup) are protected from kill switch and cost controls
- Need-only-when-needed principle — agents never perform speculative work; all actions must be justified by current demand

**Rules Informed:** segregation_of_duties, conflict_of_interest_prevention, change_management_audit, daily_spend_warning, daily_spend_critical, per_agent_token_budget, terminate_failing_tasks, dead_subscription_cleanup

**Last Reviewed:** 2026-03-22 11:29:45.971377+00
**Next Review:** 2026-06-22 11:29:45.971377+00
**Notes:** Internal framework. Review quarterly as operational patterns emerge. Update when new agent capabilities are added.

---

# PART 2: ALL GOVERNANCE RULES (31 Rules)

## Category: COMPLIANCE (9 rules)
Rules ensuring agents follow internal policies, review chains, and segregation of duties.

### Rule #14: autonomy-override-escalate
**Priority:** 9/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Escalate when an agent attempts an action that is explicitly blocked by autonomy rules

**Condition:**
- Check: autonomy_violation
- Metric: blocked_attempts
- Operator: greater_than
- Threshold: 3
- Window: 24 hours

**Action:** escalate
**Action Configuration:**
- message: "An agent has repeatedly attempted a blocked action. Review autonomy rules."

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** Repeated autonomy rule violations by an agent

### Rule #24: pii-handling-enforcement
**Priority:** 9/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Monitor agent outputs for potential PII exposure (email addresses, phone numbers, SSNs, credit card numbers). If detected in external-facing outputs, block and alert.

**Condition:**
- Check: pii_exposure
- Metric: pii_in_output
- Operator: greater_than
- Threshold: 0
- Context: external

**Action:** block_delegation
**Action Configuration:**
- scan_outputs: true
- block_external: true
- notify_channel: "#system-alerts"


### Rule #23: conflict-of-interest-prevention
**Priority:** 8/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Agents cannot approve or review their own work. If an agent creates content, a different agent must review it. If an agent proposes a task, a different agent must validate it.

**Condition:**
- Check: self_approval
- Metric: self_approved_actions
- Operator: greater_than
- Threshold: 0

**Action:** block_delegation
**Action Configuration:**
- enforce_different_reviewer: true


### Rule #13: content-review-enforcement
**Priority:** 8/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Ensure all Scribe content goes through Proof before publishing

**Condition:**
- Check: content_pipeline
- Metric: unreviewed_content
- Operator: greater_than
- Threshold: 0
- Source Persona: Scribe

**Action:** enforce_review
**Action Configuration:**
- block_publish: true
- require_persona: "Proof"


### Rule #19: agent-action-boundaries
**Priority:** 8/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Enforce that agents only use tools explicitly assigned to their persona. If an agent attempts to use a tool outside its defined toolset 3+ times, flag and restrict.

**Condition:**
- Check: tool_boundary_violations
- Metric: unauthorized_tool_attempts
- Operator: greater_than
- Threshold: 3
- Window: 24 hours

**Action:** investigate
**Action Configuration:**
- assign_to: "Agent Blueprint"
- restrict_tools: true


### Rule #22: segregation-of-duties
**Priority:** 8/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** No single agent should control an end-to-end sensitive workflow (create + approve + execute). Financial actions, content publishing, and external communications require at least 2 different agents in the chain.

**Condition:**
- Check: duty_segregation
- Metric: single_agent_sensitive_workflows
- Operator: greater_than
- Threshold: 0

**Action:** block_delegation
**Action Configuration:**
- sensitive_actions: ["payment_action","publish_content","send_email","execute_shell"]
- require_different_agent: true


### Rule #21: purpose-binding-enforcement
**Priority:** 6/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Ensure agents stay within their documented purpose and focus area. Monitor for persona drift where an agent consistently works on topics unrelated to its defined specialization.

**Condition:**
- Check: purpose_drift
- Metric: off_topic_ratio
- Operator: greater_than
- Threshold: 0.5
- Window: 48 hours

**Action:** investigate
**Action Configuration:**
- assign_to: "Chief of Staff"
- notify_channel: "#system-alerts"


### Rule #26: audit-log-retention
**Priority:** 6/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Ensure governance action logs and autonomy logs are retained and not pruned below minimum thresholds. EU AI Act requires 10-year retention for high-risk systems. Alert if log tables are approaching size limits or if entries are being deleted.

**Condition:**
- Check: log_retention
- Metric: oldest_log_days
- Operator: less_than
- Threshold: 365

**Action:** investigate
**Action Configuration:**
- assign_to: "Agent Blueprint"
- notify_channel: "#system-alerts"


### Rule #31: governance_framework_review
**Priority:** 3/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Automatically review governance frameworks when their review date has passed. Uses AI to check for framework updates, new principles, and suggested rule changes. Reviews are logged and next review dates are reset.

**Condition:**
- Check: framework_review_due
- Metric: N/A
- Operator: N/A
- Threshold: N/A

**Action:** review_frameworks
**Action Configuration:**
- notify_channel: "#system-alerts"


## Category: COST_CONTROL (3 rules)


### Rule #6: daily-token-budget-critical
**Priority:** 10/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Escalate to human when daily AI token spend exceeds 200% of budget

**Condition:**
- Check: daily_spend
- Metric: spend_percent
- Operator: greater_than
- Threshold: 200

**Action:** escalate
**Action Configuration:**
- message: "Daily AI spend has exceeded 2x the configured budget. Non-essential tasks have been paused."
- pause_non_essential: true

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** Runaway AI spend detected — exceeds 2x daily budget

### Rule #5: daily-token-budget-warning
**Priority:** 7/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Throttle non-essential tasks when daily AI token spend exceeds 80% of budget

**Condition:**
- Check: daily_spend
- Metric: spend_percent
- Operator: greater_than
- Threshold: 80

**Action:** throttle_tasks
**Action Configuration:**
- keep_types: ["delegation","process_governance","agentic_engine"]
- throttle_types: ["reflection","self_improvement","content"]


### Rule #27: per-agent-token-budget
**Priority:** 7/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Monitor individual agent token consumption. If any single agent consumes more than 30% of the daily total, throttle that specific agent to prevent one persona from monopolizing resources.

**Condition:**
- Check: agent_spend_ratio
- Metric: agent_percent_of_total
- Operator: greater_than
- Threshold: 30

**Action:** throttle_tasks
**Action Configuration:**
- cap_percent: 30
- notify_channel: "#system-alerts"
- throttle_agent: true


## Category: OPERATIONS (5 rules)
Rules monitoring operational health - task performance, agent workloads, response times.

### Rule #7: auto-restart-stalled-agents
**Priority:** 6/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Re-enable agents whose desk status is stalled for 24+ hours with pending queue items

**Condition:**
- Check: desk_status
- Metric: stalled_hours
- Operator: greater_than
- Threshold: 24

**Action:** restart_agent
**Action Configuration:**
- log_reason: true
- notify_channel: "#system-alerts"


### Rule #25: change-management-audit
**Priority:** 5/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Track and log all changes to agent configurations: persona updates, tool assignments, autonomy rule changes, and governance rule modifications. Ensures accountability for who changed what.

**Condition:**
- Check: config_changes
- Metric: unlogged_changes
- Operator: greater_than
- Threshold: 0

**Action:** log_change
**Action Configuration:**
- track: ["persona_config","autonomy_rules","governance_rules","tool_assignments","event_subscriptions"]


### Rule #29: agent-workload-balance
**Priority:** 5/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Detect when task distribution is severely unbalanced — one agent has 5x more active tasks than the average. Route new tasks to underutilized agents to prevent burnout/delays.

**Condition:**
- Check: workload_balance
- Metric: max_vs_avg_ratio
- Operator: greater_than
- Threshold: 5

**Action:** rebalance
**Action Configuration:**
- strategy: "redistribute_to_underloaded"
- notify_channel: "#system-alerts"


### Rule #8: watchlist-alert-routing
**Priority:** 5/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Auto-route watchlist alerts to the most relevant persona based on alert category

**Condition:**
- Check: watchlist_alert
- Metric: unacknowledged
- Operator: greater_than
- Threshold: 0

**Action:** route_alert
**Action Configuration:**
- routing: {"customer":"Apollo","industry":"Neptune","competitor":"Radar","regulation":"Cassandra","technology":"Forge"}


### Rule #28: business-hours-scheduling
**Priority:** 4/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Reduce non-essential agent activity during off-hours (10PM-6AM tenant timezone) to minimize costs. Only critical monitoring, security, and emergency tasks should run at full capacity overnight.

**Condition:**
- Check: time_of_day
- Metric: off_hours
- Operator: equals
- Threshold: true

**Action:** throttle_tasks
**Action Configuration:**
- keep_types: ["process_governance","agentic_engine","cloud_backup"]
- throttle_types: ["reflection","self_improvement","content","delegation"]
- reduce_frequency: true


## Category: PERFORMANCE (3 rules)


### Rule #12: queue-depth-warning
**Priority:** 6/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Alert when any agent desk has 10+ pending queue items

**Condition:**
- Check: desk_queue
- Metric: queue_depth
- Operator: greater_than
- Threshold: 10

**Action:** rebalance
**Action Configuration:**
- strategy: "redistribute"
- notify_channel: "#system-alerts"


### Rule #30: model-failover-health
**Priority:** 6/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Monitor model failover rates. If more than 40% of requests in the last hour required failover to backup models, investigate the primary provider health.

**Condition:**
- Check: failover_rate
- Metric: failover_percent
- Operator: greater_than
- Threshold: 40
- Window: 1 hours

**Action:** investigate
**Action Configuration:**
- assign_to: "Agent Blueprint"
- notify_channel: "#system-alerts"


### Rule #11: slow-response-detection
**Priority:** 5/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Log and investigate when average agent response time exceeds 30 seconds over 1 hour

**Condition:**
- Check: response_time
- Metric: avg_duration_ms
- Operator: greater_than
- Threshold: 30000
- Window: 1 hours

**Action:** investigate
**Action Configuration:**
- assign_to: "Agent Blueprint"
- notify_channel: "#system-alerts"


## Category: RESOURCE_MANAGEMENT (4 rules)


### Rule #4: block-task-cascades
**Priority:** 9/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Block any agent-created task that attempts to spawn more tasks from within a heartbeat context

**Condition:**
- Check: delegation_source
- Metric: source_type
- Operator: in
- Threshold: persona_heartbeat,task_heartbeat

**Action:** block_delegation
**Action Configuration:**
- log_reason: true


### Rule #3: kill-failing-tasks
**Priority:** 8/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Auto-disable heartbeat tasks with 100% failure rate over 7 days (5+ attempts)

**Condition:**
- Check: task_failure_rate
- Metric: failure_rate
- Operator: equals
- Threshold: 1
- Min Attempts: 5

**Action:** disable_task
**Action Configuration:**
- log_reason: true
- notify_channel: "#system-alerts"


### Rule #2: enable-justified-subscriptions
**Priority:** 7/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Auto-enable subscriptions when real business activity is detected

**Condition:**
- Check: subscription_activity
- Metric: activity_count
- Operator: greater_than
- Threshold: 0

**Action:** enable_subscription
**Action Configuration:**
- log_reason: true
- notify_channel: "#system-alerts"


### Rule #1: disable-dead-subscriptions
**Priority:** 6/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Auto-disable event subscriptions with zero matching activity for 30+ days

**Condition:**
- Check: subscription_activity
- Metric: activity_count
- Operator: equals
- Threshold: 0

**Action:** disable_subscription
**Action Configuration:**
- log_reason: true
- notify_channel: "#system-alerts"


## Category: SECURITY (7 rules)
Rules protecting against security threats - delegation chains, memory poisoning, scope violations.

### Rule #16: rogue-agent-detection
**Priority:** 10/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Detect when an agent repeatedly attempts actions outside its defined focus area or tool scope. Triggers if an agent accumulates 5+ out-of-scope actions in 24 hours.

**Condition:**
- Check: agent_scope_violations
- Metric: out_of_scope_actions
- Operator: greater_than
- Threshold: 5
- Window: 24 hours

**Action:** escalate
**Action Configuration:**
- message: "Possible rogue agent behavior: repeated out-of-scope actions detected."
- disable_agent: true

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** Agent operating outside defined boundaries — possible compromise or misalignment

### Rule #10: auth-anomaly-detection
**Priority:** 10/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Escalate on 10+ failed login attempts in 1 hour from same source

**Condition:**
- Check: auth_failures
- Metric: failed_attempts
- Operator: greater_than
- Threshold: 10
- Window: 1 hours

**Action:** escalate
**Action Configuration:**
- action: "block_source"
- message: "Potential brute-force login attempt detected."

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** Possible security breach — brute-force login detected

### Rule #9: provider-key-failure-escalate
**Priority:** 10/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Escalate when all provider keys for a model tier fail simultaneously

**Condition:**
- Check: provider_health
- Metric: tier_available
- Operator: equals
- Threshold: 0

**Action:** escalate
**Action Configuration:**
- message: "All AI provider keys for a model tier have failed. The system cannot route to any available model."

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** Complete AI provider tier failure — no models available

### Rule #20: emergency-kill-switch
**Priority:** 10/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Immediately disable all non-essential agent operations if system enters critical state: all providers down, database unreachable, or manual trigger. Protected agents (Blueprint, Chief of Staff) continue for diagnostics.

**Condition:**
- Check: system_critical_state
- Metric: critical_failures
- Operator: greater_than
- Threshold: 0

**Action:** kill_switch
**Action Configuration:**
- message: "Emergency kill switch activated — all non-essential agent operations halted."
- protected_personas: [5,6]

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** System in critical state — emergency shutdown of non-essential agents

### Rule #15: cascading-failure-detection
**Priority:** 10/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Detect when multiple agents fail in sequence within a short window, indicating a cascading failure. If 3+ different agents fail within 30 minutes, halt non-essential tasks and escalate.

**Condition:**
- Check: cascading_failures
- Metric: distinct_failing_agents
- Operator: greater_than
- Threshold: 2

**Action:** escalate
**Action Configuration:**
- message: "Cascading failure detected: 3+ agents failing in sequence. Non-essential tasks paused pending investigation."
- pause_non_essential: true

**ESCALATES TO HUMAN:** Yes
**Escalation Reason:** Cascading multi-agent failure — system stability at risk

### Rule #17: delegation-chain-depth-limit
**Priority:** 9/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Prevent delegation chains deeper than 2 levels. If Agent A delegates to B who delegates to C, block further delegation. Prevents privilege escalation through recursive delegation.

**Condition:**
- Check: delegation_depth
- Metric: max_chain_depth
- Operator: greater_than
- Threshold: 2

**Action:** block_delegation
**Action Configuration:**
- max_depth: 2
- log_reason: true
- notify_channel: "#system-alerts"


### Rule #18: memory-integrity-check
**Priority:** 7/10 | **Enabled:** Yes | **Trigger Count:** 0

**Description:** Detect anomalous memory writes — if an agent writes 20+ memory entries in a single session, flag for review. Protects against memory poisoning where an agent floods its own context.

**Condition:**
- Check: memory_write_rate
- Metric: writes_per_session
- Operator: greater_than
- Threshold: 20
- Window: 1 hours

**Action:** investigate
**Action Configuration:**
- assign_to: "Agent Blueprint"
- cap_writes: true
- notify_channel: "#system-alerts"


---

# PART 3: CONDITION EVALUATORS

These are the 22 real-time system checks the Process Governor uses to evaluate rules:

**subscription_activity:** Checks event subscriptions for business justification. Identifies dead subscriptions with zero events in 30 days and subscriptions without business activity.

**task_failure_rate:** Monitors heartbeat tasks for 100% failure rates. Checks success vs failure counts over 7 days with minimum attempt threshold.

**delegation_source:** Guards against unauthorized delegation paths. Prevents heartbeat tasks from creating new heartbeat tasks (handled inline).

**daily_spend:** Tracks daily AI token spending against budget limits. (Standing by for token tracking implementation)

**desk_status:** Detects stalled agent desks - agents with pending work whose desk has not been updated in 24+ hours.

**watchlist_alert:** Counts unacknowledged watchlist alerts that need routing to appropriate personas.

**provider_health:** Checks AI provider key availability. Triggers if no active provider keys are configured.

**auth_failures:** Monitors authentication failure patterns. (Evaluated at login time)

**response_time:** Monitors average response time from heartbeat logs. Triggers when average exceeds threshold (default 30s).

**desk_queue:** Monitors desk queue depth for overloaded agents. (Handled by desk system)

**content_pipeline:** Ensures Scribe content goes through Proof review before publishing. (Handled inline)

**autonomy_violation:** Counts blocked autonomy actions in the last 24 hours. Triggers when agents repeatedly attempt blocked actions (>3).

**cascading_failures:** Detects cascading failure patterns - multiple distinct agents failing within 30 minutes.

**agent_scope_violations:** Detects agents operating outside their defined scope by monitoring blocked actions (>5 in 24h).

**delegation_depth:** Prevents delegation chains deeper than 2 levels (A>B>C). Blocks recursive delegation to prevent privilege escalation.

**memory_write_rate:** Detects memory flooding - agents writing 20+ memory entries per hour. Protects against memory poisoning.

**tool_boundary_violations:** Enforces that agents only use tools assigned to their persona. (Handled by tool router)

**system_critical_state:** Checks for critical system failures - database connectivity and provider key availability.

**purpose_drift:** Detects when agent task outputs drift from intended goals. (Requires content analysis implementation)

**duty_segregation:** Enforces separation of duties - no single agent controls create+approve+execute for sensitive workflows.

**self_approval:** Prevents agents from approving their own work. (Enforced inline)

**pii_exposure:** Monitors agent outputs for PII (emails, phone numbers, SSNs, credit cards). (Standing by for implementation)

**config_changes:** Tracks governance action volume in last 24 hours for audit purposes.

**log_retention:** Checks governance log retention age to ensure compliance with retention requirements.

**agent_spend_ratio:** Tracks per-agent token spending ratios. (Standing by for implementation)

**time_of_day:** Detects off-hours periods (10PM-6AM) for applying restricted operation rules.

**workload_balance:** Detects workload imbalance - when one agent has 5x+ more tasks than average.

**failover_rate:** Tracks model failover frequency. (Standing by for implementation)

**framework_review_due:** Checks governance frameworks for overdue reviews and upcoming review dates (within 14 days).

---

# PART 4: AUTOMATED ACTIONS

Actions the Process Governor can take when rules are triggered:

**disable_subscription:** Automatically disables event subscriptions that have no business activity. Posts notification to #system-alerts channel.

**enable_subscription:** Re-enables previously disabled subscriptions when business activity is detected.

**disable_task:** Auto-disables heartbeat tasks with 100% failure rate (0 successes, 5+ attempts in 7 days). Logs and notifies.

**block_delegation:** Prevents delegation chains, blocks heartbeat-spawned delegations, enforces segregation of duties.

**throttle_tasks:** Reduces non-essential task execution when token budget is exceeded. (Standing by)

**restart_agent:** Resets stalled agent desks (inactive 24h+) and posts recovery notification.

**route_alert:** Routes unacknowledged watchlist alerts to the appropriate specialist persona based on category.

**kill_switch:** EMERGENCY: Disables all non-essential heartbeat tasks, keeps only protected personas (Blueprint, Chief of Staff) active. Posts critical alert and escalates to human.

**escalate:** Raises an issue to human attention with detailed context and recommended action.

**investigate:** Assigns the issue to a specific persona (usually Agent Blueprint) for investigation.

**enforce_review:** Blocks content publishing until required review persona (e.g., Proof) has reviewed.

**restrict_scope:** Limits an agent to off-hours safe operations only (no emails, no external communications).

---

# PART 5: AUTONOMY RULES

Per-agent autonomy levels controlling what actions are auto-approved vs. gated:

**Autonomy Levels:**
- **full_auto:** Agent can perform this action without any approval
- **approve_before:** Action requires human approval before execution
- **notify_after:** Action executes automatically but human is notified afterward
- **blocked:** Action is completely prohibited for this agent

**Felix - delegate_task:** full_auto - Felix can delegate tasks freely
**Felix - send_email:** notify_after - Felix auto-sends emails, notifies after
**Forge - execute_code:** full_auto - Forge can execute code in sandbox
**Forge - execute_shell:** approve_before (escalates to: human) - Forge shell commands need approval
**Scribe - publish_content:** approve_before (escalates to: proof) - Scribe content needs Proof review
**Apollo - send_email:** full_auto - Apollo can send outreach emails
**ALL AGENTS - browser_form_submit:** approve_before (escalates to: human) - Form submissions need approval
**ALL AGENTS - browser_navigate:** full_auto - All agents can navigate freely
**ALL AGENTS - payment_action:** approve_before (escalates to: human) - Payment actions always need approval

---

# PART 6: HUMAN-IN-THE-LOOP (HITL) CONFIRMATION GATE

The HITL system intercepts high-risk tool calls and requires user confirmation before execution.

**Risk Levels:**
- **low:** Auto-approved, no user interaction
- **medium:** Logged for audit, auto-approved
- **high:** Requires explicit user confirmation (Yes/No prompt in chat)
- **critical:** Blocked entirely, human must take action manually

**Tools Requiring Confirmation:**
- send_email (high) - External communication
- publish_social_post (high) - Public-facing content
- payment_action (critical) - Financial transactions
- browser form_submit (high) - Web form submissions
- scraped_pages_delete (medium) - Data deletion
- delete operations generally (medium-high) - Data loss risk

---

# PART 7: VALUES PLATFORM

Core values that inform all governance decisions:

1. **Transparency** - All agent decisions are logged, traceable, and explainable
2. **Accountability** - Every action has an owner (persona) and an audit trail
3. **Safety First** - Kill switch, circuit breakers, and escalation paths always available
4. **Human Sovereignty** - Humans retain final authority over all consequential decisions
5. **Proportional Autonomy** - Agent independence scales with trust, track record, and risk level
6. **Separation of Concerns** - No single agent controls end-to-end sensitive workflows
7. **Continuous Improvement** - Self-improvement engine with guardrails, governance framework reviews
8. **Privacy Protection** - PII scanning, tenant data isolation, minimal data retention
9. **Cost Consciousness** - Token budget awareness, spend tracking, model tier optimization
10. **Resilience** - Graceful degradation, failover cascades, cascading failure detection

