# Workflow Intelligence System (WINT)

## Vision

A database-driven, self-improving development workflow where:
- **PostgreSQL is the single source of truth** (no file-based state)
- **Agents learn** from every decision and outcome
- **Documentation stays in sync** automatically
- **Stories live in one place** (`/stories/`) with status in DB

---

## Story Numbering

Format: `WINT-{phase}{story}{variant}` (4 digits total)
- `{phase}` = 1 digit (0-9)
- `{story}` = 2 digits (01-99), restarts at 01 per phase
- `{variant}` = 1 digit (0=original, 1-9=splits)

Examples:
| Story ID | Meaning |
|----------|---------|
| `WINT-0010` | Phase 0 (Bootstrap), Story 01, original |
| `WINT-1030` | Phase 1 (Foundation), Story 03, original |
| `WINT-1130` | Phase 1 (Foundation), Story 13, original |
| `WINT-1131` | Phase 1 (Foundation), Story 13, split 1 (from 1130) |
| `WINT-2010` | Phase 2 (Context Cache), Story 01, original |
| `WINT-7020` | Phase 7 (Migration), Story 02, original |
| `WINT-8010` | Phase 8 (Backlog Management), Story 01, original |

---

## Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Extend existing KB | Fewer connections, already has pgvector |
| **Graph approach** | Relational tables (no AGE) | Simpler, no new extensions, SQL familiar |
| **Migration strategy** | Incremental | 5-10 agents per phase, compatibility shim |
| **Compatibility shim** | Yes | Agents check DB first, fall back to directory |
| **stories.index.md** | Keep as generated | Read-only, human readability |
| **Doc-sync enforcement** | Gate check | Phase/story cannot complete until docs current |
| **Bootstrap** | Phase 0 (manual) | Create schema before tracking begins |

---

## Problem → Solution

| Problem | Solution |
|---------|----------|
| Two sources of truth (dir + index) | Flat `/stories/` dir, status in DB |
| Agents re-read same files every spawn | Context cache in DB with TTL |
| No learning from outcomes | Telemetry + ML pipeline |
| 10-15 HiTL prompts per story | Classification + preference learning → 3-5 |
| Features ship incomplete | Graph-based cohesion detection |
| Docs drift from reality | Mandatory doc-sync at phase/story end |
| 52 agents reference swim-lane dirs | Migrate to DB-based status queries |
| Post-MVP items lost in YAML files | Unified backlog in stories table with refinement |
| Claude Code & LangGraph use separate DBs | Unified schema shared by both systems |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ pgvector │ │ tsvector │ │   AGE    │ │   Core   │       │
│  │(semantic)│ │(fulltext)│ │ (graph)  │ │ (tables) │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  Schemas: core, context_cache, telemetry, ml, graph, workflow│
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Agents  │   │    ML    │   │  Graph   │
        │ (MCP)    │   │ (local)  │   │ Queries  │
        └──────────┘   └──────────┘   └──────────┘
```

---

## Phases (Tracked in DB)

Progress tracked in `workflow.phases` and `workflow.components` tables, not files.

| Phase | Focus | Key Outcome |
|-------|-------|-------------|
| **0. Bootstrap** | Schema creation, MCP tools, doc-sync skill | Infrastructure ready (manual, untracked) |
| **1. Foundation** | Story flattening, core tables, agent shim, LangGraph unification | Single source of truth |
| **2. Context Cache & Sidecars** | Sidecars, agent missions, KB cache, sessions | 80% token reduction |
| **3. Telemetry** | Invocation logging, HiTL capture | Full observability |
| **4. Graph & Cohesion** | Capabilities, rules, PO agent | Completeness detection |
| **5. ML Pipeline** | Router, quality predictor, preferences | Smart automation |
| **6. Batch Mode** | Unattended processing, weekly reports | 5-10 stories hands-off |
| **7. Migration** | All 52 agents updated, docs synced | Zero directory references |
| **8. Backlog Management** | Backlog storage, refinement, promotion | Continuous improvement loop |
| **9. LangGraph Parity** | Port all WINT agents to LangGraph nodes | Full feature parity |

### Phase 0: Bootstrap (Manual, ~2-3 days)

This phase creates the infrastructure needed to track everything else:

1. **Create database schemas** in existing KB database
2. **Add MCP tools** for workflow operations
3. **Create doc-sync skill** for documentation enforcement
4. **Seed initial data** (phases, components, current agents/commands/skills)
5. **Create compatibility shim** for directory → DB fallback

After Phase 0, all subsequent phases are tracked in `workflow.phases`.

### Phase 8: Backlog Management

This phase creates the continuous improvement loop for post-MVP work:

1. **Extend stories schema** with status='backlog', priority, source, category
2. **Add backlog MCP tools** for CRUD operations
3. **Create commands** for add, review (refinement), and promote workflows
4. **Integrate scope-defender** to auto-capture deferred items
5. **Import FUTURE-ROADMAP** items as initial backlog seed

Backlog items use the same `core.stories` table with `status='backlog'`. On-demand `/backlog-review` runs PO-driven refinement sessions with user input for prioritization.

### Phase 9: LangGraph Parity

This phase ensures full feature parity between Claude Code and LangGraph workflows:

1. **Port WINT agents to LangGraph nodes** - Each agent becomes a TypeScript node
2. **Create LangGraph graphs** - Compose nodes into executable workflows
3. **Shared logic extraction** - Move business logic to shared packages
4. **Test both paths** - Same inputs produce same outputs
5. **Document migration path** - How to switch from Claude Code to LangGraph

After Phase 9, you can run the same workflow via:
- Claude Code: `/dev-implement-story WINT-1010`
- LangGraph: `runGraph('implement-story', { storyId: 'WINT-1010' })`

Both read/write the same database tables, produce the same artifacts.

---

## Documentation Sync Requirement

**Mandatory at end of every phase AND every story:**

| Document | Content | Trigger |
|----------|---------|---------|
| `docs/AGENTS.md` | Agent hierarchy, roles, models | Agent added/modified |
| `docs/COMMANDS.md` | Command reference, workflows | Command added/modified |
| `docs/SKILLS.md` | Skill registry, usage | Skill added/modified |
| `docs/workflow/*.md` | Phase docs, orchestration | Workflow changes |

**Enforcement:** New `doc-sync` skill runs automatically. Phase/story cannot complete until docs are current.

---

## New Agents

| Agent | Type | Model | Purpose |
|-------|------|-------|---------|
| `doc-sync.agent.md` | worker | haiku | Update AGENTS.md, COMMANDS.md, SKILLS.md, workflow/ |
| `cohesion-prosecutor.agent.md` | worker | sonnet | PO role: ensure feature has all CRUD capabilities |
| `scope-defender.agent.md` | worker | haiku | Devil's Advocate: challenge non-MVP, defer to backlog |
| `evidence-judge.agent.md` | worker | haiku | Require proof for all ACs, no vibes-based approval |
| `classification-agent.agent.md` | worker | haiku | Classify decisions: MVP/Feature/Moonshot/Critical |
| `preference-predictor.agent.md` | worker | haiku | Predict user choice from similar past decisions |
| `model-recommender.agent.md` | worker | haiku | Query ML router for optimal model |
| `batch-coordinator.agent.md` | leader | sonnet | Orchestrate multi-story batch processing |
| `weekly-analyst.agent.md` | worker | sonnet | Generate weekly improvement recommendations |
| `context-warmer.agent.md` | worker | haiku | Pre-warm caches before workflow starts |
| `session-manager.agent.md` | worker | haiku | Manage leader→worker context in DB |
| `graph-checker.agent.md` | worker | haiku | Query graph for cohesion, coverage, rules |
| `backlog-curator.agent.md` | worker | sonnet | Manage backlog: add, prioritize, promote items with user input |
| `telemetry-logger.agent.md` | worker | haiku | Log invocations, decisions, outcomes to DB |

---

## New Commands

| Command | Purpose | Agents Spawned |
|---------|---------|----------------|
| `/doc-sync` | Force documentation sync | doc-sync |
| `/batch-process {epic} [--count=N]` | Process N stories unattended | batch-coordinator |
| `/batch-status` | Check batch progress | (query only) |
| `/cohesion-check {feature}` | Check feature completeness | graph-checker |
| `/model-recommend {task}` | Get model recommendation | model-recommender |
| `/preference-check {decision}` | Check if can auto-accept | preference-predictor |
| `/weekly-report` | Generate weekly analysis | weekly-analyst |
| `/cache-warm {epic}` | Pre-warm all caches | context-warmer |
| `/telemetry {story}` | View story telemetry | (query only) |
| `/backlog-add {title}` | Add item to backlog (status=backlog) | backlog-curator |
| `/backlog-review` | Refinement session: prioritize backlog items | backlog-curator |
| `/backlog-promote {story}` | Promote backlog item to active story | backlog-curator |

---

## New Skills

| Skill | Purpose | When Used |
|-------|---------|-----------|
| `doc-sync` | Sync docs with agent/command/skill changes | End of phase, end of story |
| `cache-warm` | Warm context/KB/library caches | Before batch mode, workflow start |
| `telemetry-log` | Log agent invocation to DB | Every agent spawn |
| `telemetry-decision` | Log HiTL decision with embedding | Every human decision |
| `graph-query` | Query graph for relationships | Cohesion checks, capability coverage |
| `session-create` | Create session context in DB | Leader start |
| `session-inherit` | Load session context for worker | Worker start |
| `classify-decision` | Run classification agent | Decision points |
| `predict-preference` | Check preference learner | Before HiTL prompt |
| `batch-summary` | Generate batch completion report | After batch-process |

---

## Sidecars (Shared Services)

Sidecars are shared HTTP/MCP endpoints that both Claude Code and LangGraph call. They reduce token bloat, centralize enforcement, and make memory actionable.

| Sidecar | Endpoint | Purpose | Phase |
|---------|----------|---------|-------|
| **Role Pack** | `GET /role-pack?role=X&v=Y` | 150-300 token role instructions, versioned | 2 |
| **Context Pack** | `POST /context-pack` | Node-scoped KB context, story brief, rules | 2 |
| **Rules Registry** | `GET/POST /rules` | Enforceable rules from retros | 4 |
| **Cohesion** | `POST /cohesion/audit\|check` | Franken-feature detection | 4 |
| **Gatekeeper** | `POST /gate/check` | "Proof or it didn't happen" gates | 3 |
| **HiTL Interview** | `POST /hitl/*` | Decision cards, quick overrides | 5 |

### Sidecar Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Sidecar Services                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Role Pack │ │Context   │ │Cohesion  │ │Gatekeeper│   │
│  │          │ │Pack      │ │          │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
        ▲               ▲               ▲
        │               │               │
   ┌────┴────┐     ┌────┴────┐     ┌────┴────┐
   │Claude   │     │LangGraph│     │  API    │
   │Code     │     │Nodes    │     │Clients  │
   └─────────┘     └─────────┘     └─────────┘
```

Both workflows call the same sidecars → single implementation, shared behavior.

---

## New MCP Tools (extend postgres-knowledgebase)

### Context Cache
```
workflow_get_project_context(key) → JSONB
workflow_get_agent_mission(agent_name) → mission, scope, signals
workflow_get_domain_kb(domain) → patterns, adrs, blockers, lessons
workflow_get_library_cache(library, topic) → summary, examples
```

### Session Management
```
workflow_create_session(story_id) → session_id
workflow_get_session(session_id) → full context
workflow_update_session(session_id, updates) → updated session
workflow_add_decision(session_id, decision) → void
```

### Telemetry
```
workflow_log_invocation(agent, tokens, latency, success) → void
workflow_log_decision(context, options, choice) → void
workflow_log_outcome(story_id, quality, churn) → void
workflow_get_story_telemetry(story_id) → full telemetry
```

### ML Pipeline
```
workflow_get_model_recommendation(task_features) → model, confidence
workflow_get_preference_prediction(context_embedding) → choice, confidence
workflow_get_similar_tasks(embedding, limit) → similar tasks
workflow_should_auto_accept(decision_context) → bool, reason
```

### Graph
```
graph_check_cohesion(feature_id) → missing capabilities
graph_get_franken_features() → features with gaps
graph_get_capability_coverage(feature_id) → capability → story mapping
graph_apply_rules(node_type, node_id) → rule violations
```

### Story Management
```
story_get_status(story_id) → status, assignee, updated
story_update_status(story_id, status) → void
story_get_by_status(status) → stories[]
story_get_by_feature(feature_id) → stories[]
```

---

## Database Schema Overview

```sql
-- Core: Stories and outcomes
CREATE SCHEMA core;
  -- stories: id, feature_id, title, status, priority, assignee
  -- story_outcomes: quality_score, tokens, cost, churn

-- Context Cache: Replace .cache/ files
CREATE SCHEMA context_cache;
  -- project_context: key → JSONB (conventions, patterns)
  -- agent_missions: agent_name → mission, scope, signals
  -- domain_kb: domain → patterns[], adrs[], blockers[]
  -- library_cache: library, topic → summary, examples
  -- sessions: session_id → story context for leader→worker

-- Telemetry: Observability
CREATE SCHEMA telemetry;
  -- agent_invocations: every spawn logged
  -- hitl_decisions: every human choice with embedding
  -- story_outcomes: quality, churn, rework

-- ML Pipeline: Learning
CREATE SCHEMA ml;
  -- router_training: task → optimal model
  -- models: trained model binaries
  -- predictions: logged for accuracy tracking

-- Graph: Relationships (relational tables, no AGE needed)
CREATE SCHEMA graph;
  -- Node tables: epics, features, stories, capabilities, packages, rules
  -- Edge tables: feature_capabilities, story_packages, rule_applies_to
  -- Views: franken_features, capability_coverage

-- Workflow: Phase/component tracking
CREATE SCHEMA workflow;
  -- phases: id, status, started_at, completed_at
  -- components: id, phase_id, status, dependencies
```

**Extensions:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector (already have)
-- tsvector is built-in (full-text search)
-- No Apache AGE needed - using relational tables for graph
```

### Graph via Relational Tables (Simpler than AGE)

```sql
-- Node tables
CREATE TABLE graph.capabilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE  -- 'create', 'view', 'edit', 'delete', 'upload', 'replace', 'download'
);

CREATE TABLE graph.features (
    id VARCHAR(50) PRIMARY KEY,
    epic_id VARCHAR(50),
    name TEXT NOT NULL
);

-- Edge table: which features have which capabilities
CREATE TABLE graph.feature_capabilities (
    feature_id VARCHAR(50) REFERENCES graph.features(id),
    capability_id INT REFERENCES graph.capabilities(id),
    implemented_by VARCHAR(50),  -- story_id that added it
    PRIMARY KEY (feature_id, capability_id)
);

-- Cohesion view: find features missing capabilities
CREATE VIEW graph.feature_cohesion AS
SELECT
    f.id, f.name,
    array_agg(c.name) FILTER (WHERE c.name IS NOT NULL) as has_capabilities,
    ARRAY['create','view','edit','delete'] - array_agg(c.name) as missing
FROM graph.features f
LEFT JOIN graph.feature_capabilities fc ON f.id = fc.feature_id
LEFT JOIN graph.capabilities c ON fc.capability_id = c.id
GROUP BY f.id, f.name;

-- Franken-features: upload without replace, create without delete
CREATE VIEW graph.franken_features AS
SELECT id, name, has_capabilities, missing,
    CASE
        WHEN 'upload' = ANY(has_capabilities) AND NOT 'replace' = ANY(has_capabilities)
        THEN 'upload without replace'
        WHEN 'create' = ANY(has_capabilities) AND NOT 'delete' = ANY(has_capabilities)
        THEN 'create without delete'
    END as issue
FROM graph.feature_cohesion
WHERE
    ('upload' = ANY(has_capabilities) AND NOT 'replace' = ANY(has_capabilities))
    OR ('create' = ANY(has_capabilities) AND NOT 'delete' = ANY(has_capabilities));
```

This approach uses standard SQL - no graph extension needed, you already know how to query it.

---

## Directory Structure (After Migration)

```
plans/features/{epic}/
├── stories/           ← ALL stories here (flat)
│   ├── WINT-0010/     ← Phase 0, Story 01
│   ├── WINT-1010/     ← Phase 1, Story 01
│   ├── WINT-1020/     ← Phase 1, Story 02
│   ├── WINT-1021/     ← Phase 1, Story 02, split 1
│   └── ...
└── (no stories.index.md - generated from DB if needed)

docs/
├── AGENTS.md          ← Auto-synced
├── COMMANDS.md        ← Auto-synced
├── SKILLS.md          ← Auto-synced
└── workflow/          ← Auto-synced
    ├── phases.md
    ├── orchestration.md
    └── ...
```

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Sources of truth | 2 | 1 (database) |
| HiTL prompts/story | 10-15 | 3-5 |
| Context tokens/agent | 5,000-8,000 | 500-1,000 |
| Stories batchable | 0 | 5-10 |
| Model routing accuracy | manual | 85% |
| Auto-accept accuracy | 0% | 90% |
| Docs in sync | often stale | always current |
| Agents with dir refs | 52 | 0 |

---

## Optimizations Included

### From Plan 1 (Workflow Quality)
- PO Agent (cohesion-prosecutor) - ensure CRUD completeness
- Devil's Advocate (scope-defender) - challenge scope creep
- Evidence Judge - no vibes-based approvals
- Patch Queue pattern - small diffs, verify after each
- Role Packs - focused agent instructions (150-300 tokens)
- Backlog capture - defer non-MVP properly
- **Examples + Negative Examples** - 2 positive + 1 negative per role, pattern skeletons
- **User Flows Schema** - states (loading/empty/error) + capabilities (CRUD/upload/download)
- **Round Table Agent** - mechanical synthesis only, no brainstorming
- **Repair Loop** - fix only referenced errors, minimal changes, rerun until green
- **Hard Caps** - PO max 5 findings/2 blocking, DA max 5 challenges
- **Scoreboard Metrics** - % stories with QA issues, loop counts, gate failures

### From Plan 2 (ML Automation)
- Context caching (3-tier: static, domain, session)
- Full telemetry (invocations, decisions, outcomes)
- Model Router (LightGBM)
- Quality Predictor (XGBoost)
- Preference Learner (Random Forest)
- Decision Classification (MVP/Feature/Moonshot/Critical)
- Auto-accept with confidence thresholds
- Batch mode (5-10 stories unattended)
- Weekly analysis and improvement loop
- **State Transition Event Log** - from_state, to_state, timestamp, reason
- **Bottleneck Analysis** - gate failure frequency, time-in-state
- **Churn Tracking** - Dev↔Repair, QA↔Dev, Elab↔Fix-story loops

### New Additions
- Mandatory doc-sync at phase/story completion
- Database-driven phase tracking (no phase files)
- Session context in DB (leader→worker inheritance)
- Graph-based capability coverage
- PostgreSQL full-text search (tsvector) for keyword queries
- Combined semantic + keyword search
- **Standardized Elab Outputs** - gaps.json, user-flows.json, cohesion-findings.json, mvp-slice.json, scope-challenges.json, final-scope.json, evidence-expectations.json

---

## Non-Goals

- Elasticsearch (PostgreSQL tsvector sufficient)
- Distributed architecture (single machine)
- AWS Bedrock migration (stay on Claude Pro)
- Real-time dashboards (weekly reports sufficient)
- Multi-project learning (single repo focus)
- Apache AGE or Neo4j (relational tables sufficient for graph)

---

## Resolved Questions

| Question | Decision |
|----------|----------|
| Apache AGE vs Neo4j vs relational? | **Relational tables** - simpler, no extension needed |
| Doc-sync trigger? | **Both** - end of phase AND end of story |
| Batch approval? | **Queue with summary** - review before merge |
| Minimum training data? | **30-50 stories** before ML is meaningful |
| New DB or extend KB? | **Extend KB** - already has pgvector |
| Migration strategy? | **Incremental** - 5-10 agents per phase with compatibility shim |

---

## References

- Plan 1: `~/Desktop/dev-team-automation-plan/plan 1/`
- Plan 2: `~/Desktop/dev-team-automation-plan/plan 2/`
- Workflow Learning: `plans/future/workflow-learning/PLAN.md`
- Current agents: `.claude/agents/` (115 files)
- Current commands: `.claude/commands/` (28 files)
- Current skills: `.claude/skills/` (13 skills)
- Docs to sync: `docs/AGENTS.md`, `docs/COMMANDS.md`, `docs/SKILLS.md`, `docs/workflow/`

---

**Created**: 2026-02-09
**Status**: Draft
**Epic**: WINT
**Estimated**: 20 weeks (can parallelize)
