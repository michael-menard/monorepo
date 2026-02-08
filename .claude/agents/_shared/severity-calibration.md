# Severity Calibration Framework

Consistent severity assessment across all specialist agents. Use this to calibrate findings before including in verdicts.

**Version**: 1.0.0
**Created**: 2026-02-06

---

## Universal Severity Scale

| Level | Definition | Blocks Merge? | Examples |
|-------|------------|---------------|----------|
| **Critical** | Provable, exploitable vulnerability OR definite data loss OR breaks production | YES - immediate fix required | SQL injection, hardcoded secrets, data corruption, crash on happy path |
| **High** | Significant risk OR missing required pattern OR security concern | YES - needs fix or explicit waiver | XSS possibility, missing auth check, no input validation, architectural violation |
| **Medium** | Convention violation OR suboptimal approach OR technical debt | NO - should fix, doesn't block | Style violation, missing optimization, incomplete error handling |
| **Low** | Suggestion OR minor improvement OR informational | NO - nice to have | Alternative approach, documentation gap, refactoring opportunity |

---

## Calibration Questions

For EVERY finding, answer these questions to determine severity:

### Q1: Is this provable?

| Answer | Impact |
|--------|--------|
| YES - can demonstrate the issue | Maintain severity |
| MAYBE - evidence suggests but not definitive | -1 severity, add `confidence: medium` |
| NO - intuition-based | Cannot be Critical/High, add `confidence: low` |

### Q2: What's the blast radius?

| Impact Scope | Severity Modifier |
|--------------|-------------------|
| All users, system-wide | +1 severity |
| Subset of users | Maintain severity |
| Single user, contained | -1 severity |
| Developer only, no prod impact | -2 severity |

### Q3: Is it actively exploitable?

| Exploitability | Severity Modifier |
|----------------|-------------------|
| Public endpoint, no auth required | +1 severity |
| Requires authentication | Maintain severity |
| Requires admin access | -1 severity |
| Internal/dev only | -2 severity |

### Q4: Is there defense in depth?

| Other Protections | Severity Modifier |
|-------------------|-------------------|
| No other protections | +1 severity |
| Partial mitigation exists | Maintain severity |
| Strong mitigation exists | -1 severity |
| Multiple layers protect this | -2 severity |

### Q5: Does this regress working behavior?

| Regression Status | Severity Modifier |
|-------------------|-------------------|
| Breaks previously working feature | +1 severity |
| New code, no prior behavior | Maintain severity |
| Improves on broken pattern | -1 severity |

---

## Severity Calculation

```
Base Severity (from rule/pattern violated)
  + Modifiers from Q1-Q5
  = Final Severity

Cap at Critical (cannot exceed)
Floor at Low (cannot go below)
```

### Example Calculation

```yaml
finding: "dangerouslySetInnerHTML without sanitization"

base_severity: High  # Standard XSS classification

q1_provable: YES (+0)
q2_blast_radius: "Public page, all users" (+1)
q3_exploitability: "Public, no auth" (+1)
q4_defense: "No CSP, no sanitization upstream" (+1)
q5_regression: "New code" (+0)

calculation: High + 3 = Critical (capped at Critical)
final_severity: Critical
```

### Another Example

```yaml
finding: "Missing Zod validation on request body"

base_severity: Medium  # Pattern violation

q1_provable: YES (+0)
q2_blast_radius: "Admin endpoint only" (-1)
q3_exploitability: "Requires admin auth" (-1)
q4_defense: "Service layer has some validation" (-1)
q5_regression: "Existing pattern" (+0)

calculation: Medium - 3 = Low (floored at Low)
final_severity: Low
```

---

## Domain-Specific Baselines

### Security Domain

| Issue Type | Base Severity |
|------------|---------------|
| Hardcoded secrets | Critical |
| SQL injection | Critical |
| Command injection | Critical |
| XSS (reflected/stored) | High |
| Missing auth on endpoint | High |
| CSRF vulnerability | High |
| Sensitive data in logs | High |
| Missing input validation | Medium |
| Information disclosure (minor) | Medium |
| Outdated dependency (no CVE) | Low |

### Architecture Domain

| Issue Type | Base Severity |
|------------|---------------|
| Breaking API change | High |
| Business logic in route | High |
| Circular dependency | High |
| Missing Zod at boundary | Medium |
| Barrel file created | Medium |
| Package in wrong layer | Medium |
| Naming convention violation | Low |
| Missing documentation | Low |

### UI/UX Domain

| Issue Type | Base Severity |
|------------|---------------|
| Critical a11y violation (no keyboard) | High |
| Arbitrary color values | High (hard gate) |
| Direct shadcn import | High (hard gate) |
| Inline styles | High (hard gate) |
| Missing focus states | Medium |
| Layout shift (CLS > 0.1) | Medium |
| Missing loading state | Medium |
| Minor a11y warning | Low |
| Performance suggestion | Low |

### QA Domain

| Issue Type | Base Severity |
|------------|---------------|
| Core logic mocked in tests | High |
| E2E not run when UI touched | High |
| No test execution proof | High |
| Test coverage gap (critical path) | Medium |
| Missing edge case test | Medium |
| Test naming convention | Low |
| Coverage gap (non-critical) | Low |

---

## Severity Override Rules

### Automatic Upgrades (Apply Even If Calculation Says Lower)

```yaml
upgrade_to_critical:
  - "Hardcoded secrets (always Critical)"
  - "SQL injection with user input (always Critical)"
  - "Command injection (always Critical)"
  - "Production data exposure (always Critical)"

upgrade_to_high:
  - "Any auth/authz bypass (minimum High)"
  - "Hard gate violations in UI/UX (minimum High)"
  - "Core logic mocked in integration tests (minimum High)"
```

### Automatic Downgrades (Apply Even If Calculation Says Higher)

```yaml
downgrade_ceiling:
  - "Dev-only code: ceiling Medium"
  - "Test files: ceiling Medium (unless testing tests)"
  - "Documentation: ceiling Low"
  - "Already deprecated code: ceiling Medium"
```

---

## Confidence Interaction

Severity and confidence work together:

| Confidence | High Severity Allowed? | Critical Allowed? |
|------------|------------------------|-------------------|
| High | Yes | Yes |
| Medium | Yes, with caveat | Escalate first |
| Low | Escalate before including | No |
| Cannot-determine | Escalate | No |

### Example

```yaml
finding:
  severity: high
  confidence: medium
  caveat: "Cannot trace full input path - may have upstream sanitization"

# Acceptable: High severity with medium confidence, caveat explains uncertainty
```

```yaml
finding:
  severity: critical
  confidence: low

# NOT ACCEPTABLE: Critical requires high confidence
# Action: Either upgrade confidence with more evidence OR downgrade severity
```

---

## MVP-Critical vs Future

### MVP-Critical Severity

A finding is **MVP-Critical** if:
- Severity is Critical or High
- AND affects core user journey
- AND no workaround exists

### Future Enhancement Severity

A finding is **Future** if:
- Severity is Medium or Low
- OR High but core journey unaffected
- OR workaround exists for MVP

### Output Format

```yaml
mvp_blockers:
  - finding_id: SEC-001
    severity: critical
    blocks_core_journey: true
    reason: "Auth bypass allows unauthenticated access to core feature"

future:
  - finding_id: SEC-002
    severity: medium
    blocks_core_journey: false
    reason: "Input validation improvement for edge case"
```

---

## Aggregate Verdicts

### Verdict Determination

| Findings | Verdict |
|----------|---------|
| Any Critical | FAIL |
| Any High (>0) and no waiver | FAIL |
| High (all waived) + Medium | CONCERNS |
| Medium only | PASS with notes |
| Low only | PASS |
| None | PASS |

### Waiver Process

High severity findings can be waived if:
1. User explicitly acknowledges risk
2. Mitigation timeline agreed
3. Decision recorded in KB via `kb_add_decision`

```javascript
kb_add_decision({
  title: "Waiver: High severity input validation in admin panel",
  context: "Admin-only feature, trusted users, aggressive timeline",
  decision: "Ship with High finding, fix in STORY-XXX",
  consequences: "Risk accepted until STORY-XXX ships",
  story_id: "WISH-2045",
  tags: ["waiver", "security", "accepted-risk"]
})
```

---

## Calibration Checklist

Before finalizing severity:

- [ ] Base severity matches domain guidelines
- [ ] All 5 calibration questions answered
- [ ] Modifiers applied correctly
- [ ] Override rules checked
- [ ] Confidence level assessed
- [ ] MVP-critical vs future determined
- [ ] No Critical with low confidence
- [ ] Reasoning trace explains calibration
