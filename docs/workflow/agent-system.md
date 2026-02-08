# Agent System

This document covers the expert intelligence framework, agent architecture, and testing approaches.

## Table of Contents

- [Expert Agent Intelligence](#expert-agent-intelligence)
  - [The Expert Intelligence Framework](#the-expert-intelligence-framework)
  - [Expert Personas](#expert-personas)
  - [Decision Heuristics](#decision-heuristics)
  - [Reasoning Traces](#reasoning-traces)
  - [Confidence Signals](#confidence-signals)
  - [Severity Calibration](#severity-calibration)
  - [Precedent Awareness](#precedent-awareness)
  - [Cross-Domain Awareness](#cross-domain-awareness)
  - [Knowledge Base Learning Loop](#knowledge-base-learning-loop)
  - [Agent Enhancement Checklist](#agent-enhancement-checklist)
- [Testing Agents](#testing-agents)

---

## Expert Agent Intelligence

> **Source of Truth:** `.claude/agents/_shared/expert-intelligence.md` (master framework)
> **Supporting Docs:**
> - `.claude/agents/_shared/expert-personas.md` (domain expertise)
> - `.claude/agents/_shared/severity-calibration.md` (consistent severity)
> - `.claude/agents/_shared/reasoning-traces.md` (finding format)
> - `.claude/agents/_shared/cross-domain-protocol.md` (sibling awareness)

This framework transforms specialist agents (security, architecture, UI/UX, QA, product, engineering) from "checklist validators" into "expert advisors" with domain intuitions, reasoning capabilities, and institutional knowledge.

### The Expert Intelligence Framework

The framework provides 10 capabilities that make agents smarter:

| Capability | Purpose | Shared Doc |
|------------|---------|------------|
| **Expert Personas** | Domain-specific intuitions and mental models | `expert-personas.md` |
| **Decision Heuristics** | Structured reasoning for gray areas | `expert-intelligence.md` |
| **Reasoning Traces** | Explain WHY conclusions were reached | `reasoning-traces.md` |
| **Confidence Signals** | Communicate certainty levels | `reasoning-traces.md` |
| **Severity Calibration** | Consistent impact assessment | `severity-calibration.md` |
| **Precedent Awareness** | Learn from KB decisions/lessons | `kb-integration.md` |
| **Cross-Domain Awareness** | Consider sibling agent findings | `cross-domain-protocol.md` |
| **Context-Aware Escalation** | Smart escalation based on story context | `decision-handling.md` |
| **Dynamic Standards** | Load story-specific rules | `expert-intelligence.md` |
| **Disagreement Protocol** | Resolve conflicting findings | `cross-domain-protocol.md` |

### Expert Personas

Each specialist agent embodies deep domain expertise with:

- **Identity**: Senior expert with 10+ years experience
- **Mental Models**: How they think about problems
- **Domain Intuitions**: Checklist of things to always verify
- **Red Flags**: Patterns that always require escalation

#### Security Expert Persona

```yaml
identity: "Senior application security engineer"
mental_models:
  - "Attacker perspective: How would I exploit this?"
  - "Blast radius: If compromised, what else falls?"
  - "Defense in depth: What other layers protect this?"

intuitions:
  authentication:
    - Token storage (httpOnly cookies >> localStorage)
    - Token expiry and refresh patterns
    - Session invalidation on password change
  authorization:
    - Default deny vs default allow
    - Privilege escalation paths
    - Row-level security
  input_handling:
    - All inputs validated at trust boundaries
    - Parameterized queries for SQL
    - Output encoding for XSS
```

#### Architecture Expert Persona

```yaml
identity: "Senior software architect"
mental_models:
  - "Future reader: Will someone understand this in 6 months?"
  - "Coupling awareness: What depends on this decision?"
  - "Reversibility: How hard to change if wrong?"

intuitions:
  api_design:
    - Service layer HTTP-agnostic
    - Route handlers < 50 lines
    - Zod validation at boundaries
  packages:
    - Similar functionality exists?
    - Boundary correctly drawn?
    - Circular dependencies possible?
```

#### UI/UX Expert Persona

```yaml
identity: "Senior UX engineer"
mental_models:
  - "User-first: Does this work for all users?"
  - "System coherence: Does this feel like part of the same app?"
  - "Progressive enhancement: Does it degrade gracefully?"

intuitions:
  accessibility:
    - Focus states on all interactive elements
    - Color contrast 4.5:1 for text
    - Keyboard navigation works
  design_system:
    - Colors from design tokens only
    - Components from _primitives layer
    - No inline styles
```

#### QA Expert Persona

```yaml
identity: "Senior QA engineer - professionally skeptical"
mental_models:
  - "Reality check: Does this actually work, or just pass tests?"
  - "Edge case hunting: What if empty? 10,000 items?"
  - "Mock detection: Testing real behavior or assumptions?"

intuitions:
  test_coverage:
    - Happy path covered
    - Error paths covered
    - Integration points tested
  verification:
    - Tests actually ran (show output)
    - E2E for UI changes
    - Demo script works as written
```

### Decision Heuristics

For gray areas where rules don't clearly apply, agents use the **RAPID Framework**:

```
R - Risk: What's the worst-case outcome?
A - Attack surface: Who has access? Public? Admin?
P - Precedent: Does KB show approved/rejected patterns?
I - Intent: What was the developer trying to achieve?
D - Defense: Are there other protective layers?
```

#### Example: "Is This Really a Security Vulnerability?"

```
1. Can untrusted data reach this code path?
   → NO: Low risk (internal only)
   → YES: Continue

2. Is there sanitization/validation upstream?
   → YES + ADEQUATE: Document, Low severity
   → YES + INADEQUATE: Medium severity
   → NO: High severity

3. What's the attack surface?
   → PUBLIC + UNAUTHENTICATED: +1 severity
   → ADMIN ONLY: -1 severity
   → INTERNAL: -2 severity
```

### Reasoning Traces

Every finding MUST include a reasoning trace explaining WHY the conclusion was reached:

```yaml
finding:
  id: SEC-001
  severity: high
  confidence: high
  category: input-validation

  issue: "No Zod validation on request body"

  reasoning:
    observation: |
      In apps/api/routes/wishlist.ts:34-38, POST handler
      accepts body without validation:
      ```typescript
      const body = await c.req.json()
      return wishlistService.create(body)
      ```

    standard: |
      Per CLAUDE.md: "Always use Zod schemas for types"
      Per docs/architecture/api-layer.md: "Validate at boundaries"

    impact: |
      Malformed input could crash service or corrupt data.
      Admin-only endpoint reduces exposure.

    context: |
      Mitigating: Admin-only endpoint (-1 severity)
      No upstream validation found
      Similar pattern in sets.ts HAS validation

  evidence:
    - file: apps/api/routes/wishlist.ts
      lines: "34-38"

  remediation: |
    Add Zod validation:
    const body = WishlistSchema.parse(await c.req.json())
```

### Confidence Signals

Agents must communicate certainty levels:

| Level | Definition | Action |
|-------|------------|--------|
| **high** | Provable via static analysis | Include in verdict |
| **medium** | Strong evidence, some ambiguity | Include with caveat |
| **low** | Pattern-based intuition | Flag for human review |
| **cannot-determine** | Insufficient context | Escalate, don't opine |

**Rule**: Critical severity requires high confidence. Low confidence findings cannot block.

### Severity Calibration

Consistent severity assessment using calibration questions:

| Question | Impact |
|----------|--------|
| Is this provable? | Low confidence → downgrade |
| What's the blast radius? | All users → upgrade |
| Is it exploitable? | Public access → upgrade |
| Defense in depth? | Other protections → downgrade |
| Does this regress? | Broke working code → upgrade |

#### Base Severity by Domain

**Security:**
- Critical: Hardcoded secrets, SQL injection, command injection
- High: XSS, missing auth, data exposure
- Medium: Missing validation, info disclosure

**Architecture:**
- High: Breaking API, business logic in route, circular deps
- Medium: Missing Zod, barrel files, wrong package layer

**UI/UX:**
- High (hard gate): Arbitrary colors, inline styles, direct shadcn
- Medium: Missing focus states, layout shift

**QA:**
- High: Core logic mocked, no E2E for UI, no test output
- Medium: Coverage gaps, missing edge cases

### Precedent Awareness

Agents query KB before analysis and write findings after:

#### Pre-Work Queries (REQUIRED)

```javascript
// Query for domain patterns
kb_search({ query: "{domain} patterns", tags: ["architecture"], limit: 5 })

// Query for prior decisions
kb_search({ query: "{topic} decision", tags: ["adr", "decision"], limit: 5 })

// Query for exceptions/waivers
kb_search({ query: "{pattern} exception approved", tags: ["exception"], limit: 3 })

// Query for lessons learned
kb_search({ query: "{domain} lessons findings", tags: ["lesson"], limit: 3 })
```

#### Applying Precedent

```yaml
precedent_check:
  query: "input validation api boundary decision"
  results:
    - id: "kb-arch-042"
      summary: "All API endpoints must have Zod validation"
      relevance: 0.92

  application: |
    KB entry kb-arch-042 requires Zod at boundaries.
    Current code lacks validation → flagging as violation.
```

### Cross-Domain Awareness

Specialist agents check sibling outputs before finalizing verdicts:

| Your Domain | Check These Siblings |
|-------------|---------------------|
| Security | Architecture (auth patterns), QA (test coverage) |
| Architecture | Security (pattern risks), Dev Feasibility |
| UI/UX | Accessibility, Performance, QA (E2E) |
| QA | All domains (verify claims are testable) |

#### Correlation Protocol

```yaml
cross_domain:
  siblings_checked:
    - architecture: true
    - security: true

  correlations:
    - your_finding: QA-001
      corroborates: SEC-002
      impact: "Both agree: auth flow needs testing"
      severity_impact: "Maintains High"

  conflicts: []
```

When 2+ domains flag the same issue, consider upgrading severity.

### Knowledge Base Learning Loop

The KB creates institutional knowledge that compounds:

```
Query KB → Apply precedent → Do work → Write lessons/decisions → Future agents query
```

#### Writing Lessons (After Work)

```javascript
kb_add_lesson({
  title: "DI pattern for image functions",
  story_id: "WISH-2045",
  category: "reuse",  // reuse | blockers | performance | testing | security
  what_happened: "Needed consistent error handling across 4 functions",
  resolution: "Applied DI pattern from album functions",
  tags: ["dependency-injection", "pattern", "reuse"]
})
```

#### Writing Decisions (ADL)

```javascript
kb_add_decision({
  title: "ADR: JWT refresh token strategy",
  context: "Needed to balance security with UX",
  decision: "15-min access tokens, 7-day refresh, refresh on 401",
  consequences: "Requires refresh interceptor",
  story_id: "AUTH-015",
  tags: ["adr", "security", "authentication"]
})
```

### Agent Enhancement Checklist

To upgrade an agent to use expert intelligence:

- [ ] Add `shared:` references in frontmatter
- [ ] Add Expert Persona section with domain intuitions
- [ ] Add KB queries at workflow start (3-4 queries)
- [ ] Add Decision Heuristics for gray areas
- [ ] Add Reasoning Traces section
- [ ] Add Confidence field to all findings
- [ ] Add Severity Calibration rules
- [ ] Add Cross-Domain check before verdict
- [ ] Add KB writes for significant findings
- [ ] Update output schema per framework

#### Enhanced Agents (Completed)

| Agent | Status | Version |
|-------|--------|---------|
| `code-review-security` | ✅ Enhanced | 4.0.0 |
| `architect-story-review` | ✅ Enhanced | 2.0.0 |
| `uiux` | ✅ Enhanced | 3.0.0 |
| `qa` | ✅ Enhanced | 3.0.0 |
| `elab-epic-security` | ✅ Enhanced | 4.0.0 |
| `elab-epic-engineering` | ✅ Enhanced | 4.0.0 |

#### Agents Pending Enhancement

| Agent | Priority |
|-------|----------|
| `elab-epic-product` | High |
| `elab-epic-ux` | High |
| `pm-dev-feasibility-review` | High |
| `ui-ux-review-reviewer` | Medium |
| `architect-*-worker` (all) | Medium |
| `dev-implement-backend-coder` | Low |
| `dev-implement-frontend-coder` | Low |

---

## Testing Agents

### Unit Testing an Agent

1. Create test fixture in `__tests__/fixtures/`:

```
__tests__/fixtures/
  STORY-TEST/
    STORY-TEST.md
    _pm/
      TEST-PLAN.md
    _implementation/
      (expected outputs)
```

2. Run agent in isolation:

```bash
claude --agent .claude/agents/my-new-agent.agent.md \
  --input "Process STORY-TEST" \
  --dry-run
```

3. Verify outputs match expected fixtures

### Integration Testing

1. Use harness story (WRKF-000) as integration test
2. Run full workflow with `--dry-run` to validate orchestration
3. Check CHECKPOINT.md for correct phase progression

### Regression Testing

Before merging agent changes:
1. Run `/dev-implement-story WRKF-000 --dry-run`
2. Compare TRACE.jsonl with baseline
3. Ensure no new errors or warnings
