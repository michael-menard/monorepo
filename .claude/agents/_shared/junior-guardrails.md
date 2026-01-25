# Junior Developer Guardrails

Standard guardrails to include in phase leaders for junior-friendly workflows.

## Pre-Flight Checks

Before any implementation phase, validate:

```markdown
## Pre-Flight Check

### Environment
- [ ] On correct branch (not main)
- [ ] No uncommitted changes from previous work
- [ ] Required services running (if applicable)

### Story Readiness
- [ ] Story has status: ready-for-dev or in-progress
- [ ] All ACs are testable (no vague requirements)
- [ ] Dependencies identified and available

### Developer Context
- [ ] Implementation plan exists and approved
- [ ] No blocking questions in story comments
- [ ] Previous phase artifacts present

**Result**: READY | BLOCKED: <specific issue with fix instructions>
```

## Complexity Warning

Flag when task may be too complex:

```markdown
## Complexity Assessment

| Factor | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Files to modify | X | >10 | ⚠️/✓ |
| Packages affected | X | >3 | ⚠️/✓ |
| New dependencies | X | >2 | ⚠️/✓ |
| Shared type changes | X | >0 | ⚠️/✓ |
| Database migrations | X | >1 | ⚠️/✓ |

**Overall**: STRAIGHTFORWARD | MODERATE | COMPLEX | NEEDS-SENIOR-REVIEW

If COMPLEX or NEEDS-SENIOR-REVIEW:
> ⚠️ This task has elevated complexity. Consider:
> - Pairing with a senior developer
> - Breaking into smaller stories
> - Scheduling architecture review first
```

## Learning Moments

Capture teachable moments for junior growth:

```markdown
## Learning Moment

**What happened**: <description of issue or pattern>

**Why it matters**: <explanation in plain terms>

**Best practice**: <what to do instead>

**Example**:
```typescript
// ❌ What you did
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`)

// ✅ What to do instead
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId])
```

**Learn more**: <link to docs or internal wiki>
```

## Decision Documentation

Force explicit reasoning for non-obvious choices:

```markdown
## Decision Record

**Decision**: <what was decided>

**Context**: <why this decision was needed>

**Options Considered**:
1. **<Option A>**: <pros/cons>
2. **<Option B>**: <pros/cons>
3. **<Option C>**: <pros/cons>

**Chosen**: Option X

**Rationale**: <why this option>

**Trade-offs accepted**: <what we gave up>

**Revisit if**: <conditions that would change this decision>
```

## Safe Defaults

When uncertain, apply safe defaults:

```markdown
## Safe Default Applied

**Situation**: <ambiguous requirement or choice>

**Safe default chosen**: <conservative option>

**Rationale**: <why this is the safe choice>

**To override**: <how to explicitly choose differently>

> 💡 When in doubt, the system chooses the option that:
> - Is easier to change later
> - Has smaller blast radius
> - Follows existing patterns
> - Requires less new code
```

## Escalation Triggers

Auto-escalate when juniors shouldn't proceed alone:

| Trigger | Action |
|---------|--------|
| Security-sensitive code (auth, crypto, PII) | Require senior review before merge |
| Shared type modifications | Show blast radius, suggest pairing |
| New package creation | Require architecture approval |
| Database schema changes | Require DBA review |
| >500 lines changed | Suggest breaking into smaller PRs |
| Performance-critical path | Require benchmark before/after |

```markdown
## Escalation Required

**Trigger**: <what triggered escalation>

**Why this matters**: <plain language explanation>

**Required action**: <what needs to happen>

**Who to contact**: <role or specific person>

**How to proceed after approval**: <next steps>
```
