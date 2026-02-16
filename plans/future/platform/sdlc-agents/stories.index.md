# SDLC Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Pending | 5 |
| **Total** | **5** |

## Ready to Start (Once all upstream epics complete)

- SDLC-001 and SDLC-005 can start once INFRA is done (don't need full MODL/TELE/LEARN)

---

### SDLC-001: Machine-Readable PLAN.md Schema

**Status:** `pending`
**Priority:** P0
**Dependencies:** INFRA complete
**Blocks:** SDLC-002, SDLC-003, SDLC-004

**Description:**
Define and enforce a YAML front matter schema for PLAN.md files. Agents consume this structured data for decisions. Validation rejects plans with missing required sections.

**Key Deliverables:**
- Zod schema for PLAN.md front matter (plan_id, plan_version, objectives, scope, roles, workflows, events, metrics, alerts, budgets, learning_loop)
- Validation function: `validatePlan(content) → { valid, errors }`
- Required markdown sections after front matter (Objectives, Scope, Roles, Workflows, Telemetry, Dashboards, Learning Loop, Backlog Rules, DoD)
- Migration guide for existing plans

**Acceptance Criteria:**
- [ ] Zod schema covers all fields from PLAN_SCHEMA.md spec
- [ ] Validation correctly rejects missing required fields
- [ ] Validation correctly rejects missing required markdown sections
- [ ] At least one existing plan converted as proof-of-concept
- [ ] Plan parser integrated into PM agent workflow

---

### SDLC-002: PO Agent (Product Owner)

**Status:** `pending`
**Priority:** P1
**Dependencies:** SDLC-001, MODL complete, TELE complete
**Blocks:** None

**Description:**
LangGraph PO agent that handles triage, scoring, prioritization, and churn detection. Consumes telemetry metrics to make data-driven decisions. Runs via Task Contract.

**Key Deliverables:**
- `nodes/sdlc/po-agent.ts` — LangGraph node
- Triage: normalize requests, tag, assess completeness
- Scoring: priority ranking (Now/Next/Later) based on impact + effort + risk
- Churn detection: flag stories with high post-ready change rates
- Stability prioritization: boost stability work when gap/escape rates rise

**Acceptance Criteria:**
- [ ] Triages incoming requests with completeness assessment
- [ ] Assigns priority using configurable scoring rubric
- [ ] Detects churn-heavy story patterns from telemetry data
- [ ] Prioritizes stability work when gap_found rates exceed threshold
- [ ] All decisions include confidence score (0-1)
- [ ] Low confidence escalates to human

---

### SDLC-003: PM Agent (Project Manager)

**Status:** `pending`
**Priority:** P1
**Dependencies:** SDLC-001, MODL complete, TELE complete
**Blocks:** None

**Description:**
LangGraph PM agent for sequencing, dependency mapping, bottleneck detection, and risk management. Consumes cycle time and throughput metrics.

**Key Deliverables:**
- `nodes/sdlc/pm-agent.ts` — LangGraph node
- Sequencing: dependency-aware story ordering
- Bottleneck detection: identify steps with rising cycle time
- Risk register: flag high-risk items (large scope, many dependencies, complex auth/migration)
- Release planning: group stories into shippable increments

**Acceptance Criteria:**
- [ ] Produces dependency-aware sequence from backlog
- [ ] Detects bottlenecks from cycle time trends
- [ ] Maintains risk register with severity + mitigation
- [ ] Suggests scope trades when capacity constrained
- [ ] All decisions include confidence score (0-1)

---

### SDLC-004: SM Agent (Scrum Master)

**Status:** `pending`
**Priority:** P1
**Dependencies:** SDLC-001, INFRA complete
**Blocks:** None

**Description:**
LangGraph SM agent enforcing WIP limits, detecting blocked work, and maintaining ready queue health. Lightweight — mostly Tier 0 (code) with optional Task Contract for nuanced analysis.

**Key Deliverables:**
- `nodes/sdlc/sm-agent.ts` — LangGraph node
- WIP limits: enforce max concurrent in-progress stories
- Blocked detection: idle time + blocked state from events
- Ready queue: alert when ready-to-work queue drops below threshold
- Cadence: trigger grooming/refinement when needed

**Acceptance Criteria:**
- [ ] Enforces configurable WIP limit
- [ ] Detects blocked work from idle time events (> 24h in same state)
- [ ] Alerts when ready queue < 3 stories
- [ ] Triggers grooming when queue is empty
- [ ] Reports queue health metrics

---

### SDLC-005: DecisionRecord + Budgets + Confidence

**Status:** `pending`
**Priority:** P1
**Dependencies:** INFRA complete
**Blocks:** None

**Description:**
Cross-cutting concerns: every significant agent decision becomes a versioned artifact. Hard budgets enforced. Confidence scoring with escalation.

**Key Deliverables:**
- `nodes/sdlc/decision-record.ts` — Create ADR-lite artifact for each decision
- DecisionRecord schema: decision, alternatives, evidence, confidence, outcome
- Budget enforcement: max tokens/run, max USD/day, max retries/step
- `workflow.cost_limit_hit` event when budget exceeded
- Override audit trail: human overrides recorded as events
- Confidence thresholds: < 0.7 → stronger model, < 0.4 → human

**Acceptance Criteria:**
- [ ] Every PO/PM/SM decision creates a DecisionRecord artifact
- [ ] DecisionRecord stored in artifact system (INFRA)
- [ ] Budget limits enforced per-run and per-day
- [ ] Cost limit events emitted when exceeded
- [ ] Human overrides recorded with timestamp + reason
- [ ] Confidence escalation rules working
