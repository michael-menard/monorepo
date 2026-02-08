# Autonomy Tiers

Defines when agents should escalate to humans vs. proceed autonomously. Controlled via `--autonomous=<level>` flag.

---

## Tier Overview

| Tier | Category | Conservative | Moderate | Aggressive |
|------|----------|--------------|----------|------------|
| 1 | Clarification | Escalate | Proceed | Proceed |
| 2 | Preference | Escalate | Escalate | Proceed |
| 3 | Ambiguous Scope | Escalate | Proceed | Proceed |
| 4 | Destructive/Irreversible | **Always Escalate** | **Always Escalate** | **Always Escalate** |
| 5 | External Dependency | Escalate | Escalate | Proceed |

---

## Tier 1: Clarification Decisions

**Definition**: Missing information that has a reasonable default.

**Examples**:
- Test file naming convention (kebab-case vs camelCase)
- Which existing pattern to follow when multiple exist
- Order of operations when not specified

**Conservative**: Escalate to human
**Moderate**: Use codebase conventions, proceed
**Aggressive**: Use codebase conventions, proceed

**Agent Behavior**:
```markdown
# In agent when Tier 1 decision needed:

## Decision: [Brief description]
- **Tier**: 1 (Clarification)
- **Options**: A) [option1] B) [option2]
- **Recommendation**: [option] because [reason]
- **Autonomy Check**:
  - If `--autonomous=conservative`: ESCALATE
  - If `--autonomous=moderate|aggressive`: PROCEED with recommendation
```

---

## Tier 2: Preference Decisions

**Definition**: Valid alternatives exist; human preference matters.

**Examples**:
- Component library choice (shadcn vs custom)
- State management approach (Redux vs Context)
- Test framework configuration options
- API response format variations

**Conservative**: Escalate to human
**Moderate**: Escalate to human
**Aggressive**: Use project defaults, proceed

**Agent Behavior**:
```markdown
# In agent when Tier 2 decision needed:

## Decision: [Brief description]
- **Tier**: 2 (Preference)
- **Options**: A) [option1] B) [option2]
- **Project Default**: [option if exists]
- **Autonomy Check**:
  - If `--autonomous=conservative|moderate`: ESCALATE
  - If `--autonomous=aggressive`: PROCEED with project default
```

---

## Tier 3: Ambiguous Scope Decisions

**Definition**: Story requirements could be interpreted multiple ways.

**Examples**:
- "Add validation" - which fields? what rules?
- "Improve performance" - which metric? by how much?
- "Handle edge cases" - which specific cases?
- AC references "similar to X" without specific behavior

**Conservative**: Escalate to human
**Moderate**: Use minimal interpretation, proceed
**Aggressive**: Use expansive interpretation, proceed

**Agent Behavior**:
```markdown
# In agent when Tier 3 decision needed:

## Decision: [Brief description]
- **Tier**: 3 (Ambiguous Scope)
- **Interpretations**:
  - Minimal: [narrow scope]
  - Expansive: [broad scope]
- **Autonomy Check**:
  - If `--autonomous=conservative`: ESCALATE
  - If `--autonomous=moderate`: PROCEED with minimal
  - If `--autonomous=aggressive`: PROCEED with expansive
```

---

## Tier 4: Destructive/Irreversible Decisions

**Definition**: Actions that cannot be easily undone or have production impact.

**Examples**:
- Deleting files or directories
- Database migrations (especially destructive)
- Modifying CI/CD pipelines
- Changing authentication/authorization rules
- Force pushing to branches
- Modifying production configuration

**All Levels**: **ALWAYS ESCALATE**

**Agent Behavior**:
```markdown
# In agent when Tier 4 decision needed:

## ESCALATION REQUIRED: Destructive Action
- **Tier**: 4 (Destructive/Irreversible)
- **Action**: [description]
- **Impact**: [what could go wrong]
- **Recovery**: [how to undo, if possible]

**Waiting for human approval before proceeding.**
```

---

## Tier 5: External Dependency Decisions

**Definition**: Actions requiring external services or cross-team coordination.

**Examples**:
- Adding new npm dependencies
- Requiring infrastructure changes
- Needing API changes from another team
- Introducing new third-party services
- Modifying shared schemas

**Conservative**: Escalate to human
**Moderate**: Escalate to human
**Aggressive**: Document and proceed if low-risk

**Agent Behavior**:
```markdown
# In agent when Tier 5 decision needed:

## Decision: External Dependency
- **Tier**: 5 (External Dependency)
- **Dependency**: [what is needed]
- **Risk Level**: [low/medium/high]
- **Fallback**: [alternative if not approved]
- **Autonomy Check**:
  - If `--autonomous=conservative|moderate`: ESCALATE
  - If `--autonomous=aggressive` AND risk=low: PROCEED with fallback
  - If `--autonomous=aggressive` AND risk=medium/high: ESCALATE
```

---

## Flag Usage

```bash
# Conservative (default) - Escalates Tier 1-3 and 5
/dev-implement-story plans/features/FEAT STORY-001

# Moderate - Escalates Tier 2 and 5
/dev-implement-story plans/features/FEAT STORY-001 --autonomous=moderate

# Aggressive - Only escalates Tier 4 (always) and high-risk Tier 5
/dev-implement-story plans/features/FEAT STORY-001 --autonomous=aggressive
```

---

## Decision Batching

When multiple decisions arise, batch them into a single escalation:

```markdown
# DECISIONS.md (created when escalation needed)

## Pending Decisions

### 1. [Tier 2] Component Library Choice
- **Options**: A) shadcn B) custom C) existing
- **Recommendation**: A (matches project patterns)

### 2. [Tier 3] Validation Scope
- **Options**: A) client-only B) client+server C) full E2E
- **Recommendation**: B (matches existing patterns)

### 3. [Tier 1] Test Naming
- **Options**: A) kebab-case B) camelCase
- **Recommendation**: A (matches existing tests)

**Awaiting approval for items 1-2. Proceeding with item 3 (Tier 1, moderate autonomy).**
```

---

## Autonomy Level Selection Guide

| Scenario | Recommended Level |
|----------|-------------------|
| First story in new feature | Conservative |
| Well-understood domain | Moderate |
| Bug fixes with clear scope | Moderate |
| Prototype/spike work | Aggressive |
| Production-critical changes | Conservative |
| Refactoring with tests | Moderate |

---

## Implementation Notes

1. **Default is conservative** - preserves current behavior
2. **Tier 4 never autonomous** - human always approves destructive actions
3. **Log all decisions** - even autonomous ones get logged for review
4. **Batch when possible** - reduces HiTL interruptions
5. **Include recommendation** - helps humans decide quickly

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.claude/config/autonomy.yaml` | Autonomy levels, phase overrides, auto-accept conditions |
| `.claude/config/decision-classification.yaml` | Pattern-based tier classification rules |
| `.claude/config/preferences.yaml` | Project conventions and learned preferences |

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/dev-implement-story --autonomous=LEVEL` | Run with specified autonomy level |
| `/workflow-batch` | Batch mode with moderate autonomy default |

---

## Reference

See: `docs/FULL_WORKFLOW.md` → Autonomous Decision Management section
