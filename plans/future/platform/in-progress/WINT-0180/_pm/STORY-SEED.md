---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0180

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found, Knowledge Base queries not performed (no KB MCP available in this context)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Decision Handling Protocol | `.claude/agents/_shared/decision-handling.md` | Active | Provides current 5-tier decision framework |
| Autonomy Tiers | `.claude/agents/_shared/autonomy-tiers.md` | Active | Defines when agents escalate vs proceed autonomously |
| Expert Intelligence Framework | `.claude/agents/_shared/expert-intelligence.md` | Active | 10-point framework for specialist agent decisions |
| WINT Database Schemas | `packages/backend/database-schema/src/schema/wint.ts` | Active | 6 schema groups including telemetry for agent decisions |
| Agent Decision Tracking | `wint.agentDecisions` table | Active | Stores decision type, context, confidence, wasCorrect |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| None | N/A | No conflicts detected |

### Constraints to Respect

1. **Zod-first types** - All schemas must use Zod with inferred TypeScript types (CLAUDE.md)
2. **No barrel files** - Direct imports only (CLAUDE.md)
3. **Protected schemas** - Do not modify existing WINT database schemas without migration
4. **Agent ecosystem** - 100+ agents already exist with varying sophistication levels
5. **KB integration pattern** - Agents query KB before decisions (KB-AGENT-INTEGRATION.md)

---

## Retrieved Context

### Related Endpoints
No backend API endpoints directly related to examples framework.

### Related Components

| Component/Pattern | Path | Purpose | Reuse Potential |
|-------------------|------|---------|-----------------|
| Decision Handling Protocol | `.claude/agents/_shared/decision-handling.md` | 5-tier decision classification + escalation | HIGH - existing decision framework to extend |
| Autonomy Tiers | `.claude/agents/_shared/autonomy-tiers.md` | Conservative/Moderate/Aggressive autonomy levels | HIGH - context for when examples apply |
| Expert Intelligence Framework | `.claude/agents/_shared/expert-intelligence.md` | RAPID framework, reasoning traces, precedent awareness | HIGH - precedent awareness uses examples |
| Agent Decisions Table | `wint.agentDecisions` | Tracks decision context, alternatives, confidence | MEDIUM - storage for example outcomes |

### Reuse Candidates

**Existing Patterns:**
- Decision classification system (5 tiers)
- KB precedent querying pattern
- Reasoning trace structure from expert-intelligence.md
- RAPID framework for gray area decisions
- Agent metadata YAML frontmatter patterns

**Existing Packages:**
- `@repo/db` for database access
- Orchestrator artifact validation (Zod schemas)
- Knowledge Base MCP tools (when available)

---

## Knowledge Context

### Lessons Learned
KB queries not performed (no active KB MCP in context). Would query for:
- Past patterns for agent training data
- Decision quality tracking lessons
- Example-based learning implementations

### Blockers to Avoid (from past stories)
Unable to retrieve without KB access. Common risks:
- Schema proliferation without clear ownership
- Examples becoming stale without validation
- Storage format ambiguity (YAML vs JSON vs inline)

### Architecture Decisions (ADRs)
No ADR-LOG.md found at expected location. Would check for:
- ADR on agent instruction format
- ADR on knowledge persistence patterns
- ADR on workflow intelligence data models

### Patterns to Follow
From existing codebase:
1. **YAML for structured agent metadata** - Frontmatter in .agent.md files
2. **Zod schemas for all data structures** - CLAUDE.md requirement
3. **Inline examples in agent files** - See decision-handling.md § Examples
4. **Markdown-based documentation** - Agent instructions use .md format
5. **KB-first queries** - Query before deciding (KB-AGENT-INTEGRATION.md)

### Patterns to Avoid
From existing codebase review:
1. **Hardcoding examples in code** - Makes updates difficult
2. **Per-agent duplicate examples** - Creates consistency drift
3. **Examples without outcome tracking** - Can't validate effectiveness
4. **Unstructured text examples** - Hard to query and match

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Define Examples + Negative Examples Framework

### Description

**Context:**
The autonomous development workflow currently relies on agents making decisions based on:
- Static rules in agent instruction files
- KB precedent queries (when available)
- RAPID framework for gray areas (expert-intelligence.md)
- 5-tier decision classification (decision-handling.md)

However, there's no systematic framework for **examples** and **negative examples** that agents can reference when:
- Determining which pattern to follow among multiple valid options
- Identifying anti-patterns to avoid
- Learning from past successful/unsuccessful decisions
- Building intuition for gray area decisions

**Problem:**
Agents lack structured access to:
1. **Positive examples** - "This is how we do X well"
2. **Negative examples** - "This is what NOT to do when facing Y"
3. **Context for examples** - When/why an example applies
4. **Outcome tracking** - Whether following an example led to success

This forces repeated KB queries, increases token usage, and creates inconsistent decisions when agents encounter similar situations.

**Proposed Solution:**
Define a framework for capturing, storing, and retrieving examples that:
1. **Integrates with existing systems** - Works with decision-handling.md, autonomy-tiers.md, and wint.agentDecisions
2. **Supports downstream stories** - Enables WINT-0190 (Patch Queue), WINT-0200 (User Flows), WINT-0210 (Role Pack Templates)
3. **Tracks effectiveness** - Links examples to outcomes for ML training
4. **Scales across agents** - Reusable by 100+ existing agents

### Initial Acceptance Criteria

- [ ] AC-1: Define Zod schema for ExampleEntry with fields: id, category, scenario, positive_example, negative_example, context, outcome_metrics
- [ ] AC-2: Define storage strategy (inline in agent files, separate examples/ directory, or WINT database table)
- [ ] AC-3: Document integration points with decision-handling.md decision tiers (when to reference examples)
- [ ] AC-4: Define lifecycle: how examples are created, validated, deprecated
- [ ] AC-5: Document query pattern for agents to retrieve relevant examples (by category, scenario, role)
- [ ] AC-6: Define outcome tracking schema to measure example effectiveness
- [ ] AC-7: Create migration path for existing inline examples in decision-handling.md and expert-intelligence.md

### Non-Goals

- Implementing example storage infrastructure (that's for dependent stories)
- Migrating all existing agent patterns to examples format
- Building example search/retrieval tools (separate story)
- Creating ML models to recommend examples (future WINT-5xxx stories)
- Modifying existing WINT database schemas (unless absolutely necessary)

### Reuse Plan

**Schemas:**
- Extend WINT database schema patterns (if database storage chosen)
- Reuse orchestrator Zod validation patterns from `packages/backend/orchestrator/src/artifacts/`
- Follow decision-handling.md tier classification for example categorization

**Patterns:**
- KB precedent query pattern from KB-AGENT-INTEGRATION.md
- RAPID framework structure from expert-intelligence.md
- Agent frontmatter YAML pattern from existing .agent.md files

**Packages:**
- `@repo/db` if examples stored in WINT schema
- Orchestrator artifact validation if examples stored as YAML

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on schema validation tests (Zod schema round-trip)
- Test lifecycle state transitions (created → validated → deprecated)
- Test query pattern effectiveness (can agents find relevant examples?)
- Consider version compatibility (schema evolution over time)

### For UI/UX Advisor
Not applicable - this is a backend/agent framework story with no user-facing UI.

### For Dev Feasibility
- **Key decision:** Storage location choice affects all downstream stories
  - Option A: WINT database table (queryable, versioned, but requires migration)
  - Option B: Filesystem YAML/JSON (simpler, but harder to query cross-project)
  - Option C: Hybrid (common examples in DB, agent-specific inline)
- **Risk:** Schema design must support future ML pipeline (WINT-5xxx)
- **Dependency:** WINT-0190, 0200, 0210 all need this framework stable first
- **Token consideration:** Examples add token overhead - need compression strategy
- **Integration points:**
  - decision-handling.md (when to query examples)
  - KB-AGENT-INTEGRATION.md (how to query examples)
  - wint.agentDecisions (link examples to outcomes)
