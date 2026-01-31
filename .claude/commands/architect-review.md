---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: orchestrator
agents: ["architect-setup-leader.agent.md", "architect-api-leader.agent.md", "architect-packages-leader.agent.md", "architect-frontend-leader.agent.md", "architect-types-leader.agent.md", "architect-aggregation-leader.agent.md"]
---

/architect-review [SCOPE] [--focus=AREA]

System architecture review orchestrator. Enforces architectural patterns, identifies violations, and produces actionable guidance.

## Usage

```bash
# Full system review
/architect-review full

# Scoped reviews
/architect-review backend
/architect-review frontend
/architect-review packages

# Focused review
/architect-review full --focus=hexagonal
/architect-review backend --focus=services
```

## Scopes

| Scope | What's Reviewed |
|-------|-----------------|
| `full` | All domains (API, packages, frontend, types) |
| `backend` | API hexagonal architecture + backend packages |
| `frontend` | Frontend apps + UI packages |
| `packages` | Package boundaries, dependencies, layering |

## Architecture Hierarchy

```
/architect-review (this orchestrator)
    │
    ├─► architect-setup-leader
    │       └─► Discovers codebase structure, validates scope
    │
    ├─► Domain Leaders (parallel based on scope)
    │   ├─► architect-api-leader ─────► API workers (parallel)
    │   │       ├─► hexagonal-compliance
    │   │       ├─► route-thickness
    │   │       └─► service-isolation
    │   │
    │   ├─► architect-packages-leader ─► Package workers (parallel)
    │   │       ├─► boundary-check
    │   │       ├─► circular-deps
    │   │       └─► workspace-protocol
    │   │
    │   ├─► architect-frontend-leader ─► Frontend workers (parallel)
    │   │       ├─► component-structure
    │   │       ├─► import-patterns
    │   │       └─► barrel-detection
    │   │
    │   └─► architect-types-leader ────► Type workers (parallel)
    │           ├─► zod-compliance
    │           ├─► interface-detection
    │           └─► schema-validation
    │
    └─► architect-aggregation-leader
            └─► Synthesizes all findings, produces ARCHITECTURE-REVIEW.md
```

## Phases

| # | Phase | Agent | Model | Signal |
|---|-------|-------|-------|--------|
| 0 | Setup | `architect-setup-leader` | haiku | `ARCH-SETUP COMPLETE` |
| 1 | Domain Reviews | Domain leaders (parallel) | sonnet | `ARCH-{DOMAIN} COMPLETE` |
| 2 | Aggregation | `architect-aggregation-leader` | sonnet | `ARCH-AGGREGATION COMPLETE` |
| 3 | Report | (self) | — | `ARCHITECTURE REVIEW COMPLETE` |

## Execution

### Phase 0: Setup

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Architect Setup"
  prompt: |
    Read instructions: .claude/agents/architect-setup-leader.agent.md
    Scope: {SCOPE}
    Focus: {FOCUS or "none"}
```

Wait for `ARCH-SETUP COMPLETE`. Receives:
- `domains_to_review`: list of domains based on scope
- `codebase_structure`: discovered paths for each domain
- `reference_docs`: list of authoritative architecture docs

If `ARCH-SETUP BLOCKED: <reason>` → STOP.

### Phase 1: Domain Reviews (Parallel)

Spawn domain leaders based on `domains_to_review` from Phase 0.

**All applicable leaders in SINGLE message:**

```
Task tool (for each domain in domains_to_review):
  subagent_type: "general-purpose"
  model: sonnet
  run_in_background: true
  description: "Architect {DOMAIN} Review"
  prompt: |
    Read instructions: .claude/agents/architect-{domain}-leader.agent.md

    CONTEXT:
    Scope: {SCOPE}
    Focus: {FOCUS}
    Paths: {paths from setup for this domain}
    Reference docs: {reference_docs}

    Spawn your workers, collect results, return aggregated YAML.
```

Wait for ALL domain leaders to complete:
- `ARCH-API COMPLETE` (if backend/full)
- `ARCH-PACKAGES COMPLETE` (if packages/full)
- `ARCH-FRONTEND COMPLETE` (if frontend/full)
- `ARCH-TYPES COMPLETE` (always)

### Phase 2: Aggregation

Collect all domain leader outputs (YAML).

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "Architect Aggregation"
  prompt: |
    Read instructions: .claude/agents/architect-aggregation-leader.agent.md

    DOMAIN RESULTS:
    {api_yaml}
    {packages_yaml}
    {frontend_yaml}
    {types_yaml}

    OUTPUT_PATH: docs/architecture/ARCHITECTURE-REVIEW.md
```

Wait for `ARCH-AGGREGATION COMPLETE`.

### Phase 3: Report

Read `docs/architecture/ARCHITECTURE-REVIEW.md` and report to user:

```markdown
## Architecture Review Complete

**Verdict**: {PASS | CONCERNS | VIOLATIONS}

### Summary
- Critical: {n}
- High: {n}
- Medium: {n}
- Low: {n}

### Top Violations
1. {violation summary}
2. {violation summary}
3. {violation summary}

### Immediate Actions
1. {action}
2. {action}

Full report: `docs/architecture/ARCHITECTURE-REVIEW.md`
```

## Verdicts

| Verdict | Criteria | Action |
|---------|----------|--------|
| `PASS` | No violations, ≤3 concerns | Codebase is architecturally sound |
| `CONCERNS` | No critical/high violations, has concerns | Review concerns, address in next sprint |
| `VIOLATIONS` | Has critical or high violations | Must address before new features |

## Output Artifacts

| Artifact | Location | Content |
|----------|----------|---------|
| Domain reports | `docs/architecture/_reviews/{domain}.yaml` | Raw findings per domain |
| Final report | `docs/architecture/ARCHITECTURE-REVIEW.md` | Synthesized findings + recommendations |

## Error Handling

| Signal | Action |
|--------|--------|
| `ARCH-SETUP BLOCKED` | Stop, report missing prerequisites |
| Domain leader timeout | Continue with available results, note incomplete |
| Worker failure | Leader continues with other workers, notes failure |
| Aggregation failure | Report raw domain results |

## Integration with Story Workflow

The architect review can be integrated into story elaboration:

```bash
# During /elab-story, add architect validation
/architect-review backend --focus=story:{STORY_ID}
```

This scopes the review to only areas affected by the story.

## Token Tracking

After completion: `/token-log ARCH architect-review <in> <out>`

## Done

Stop when:
- All domain leaders complete
- Aggregation complete
- `ARCHITECTURE-REVIEW.md` written
- User notified with verdict

**Next steps by verdict:**
- PASS → Continue development
- CONCERNS → Track in tech debt backlog
- VIOLATIONS → Create fix stories before new features
