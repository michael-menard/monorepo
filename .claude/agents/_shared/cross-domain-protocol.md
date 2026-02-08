# Cross-Domain Awareness Protocol

Specialist agents should be aware of sibling agent findings to produce coherent, non-conflicting verdicts and identify corroborating evidence.

**Version**: 1.0.0
**Created**: 2026-02-06

---

## Why Cross-Domain Awareness Matters

Without cross-domain awareness:
- Agents may contradict each other
- Related findings are not connected
- Same issue reported differently by multiple agents
- Conflicting guidance confuses developers

With cross-domain awareness:
- Findings reference and corroborate each other
- Severity can be upgraded when multiple domains agree
- Conflicts are explicitly flagged for resolution
- Coherent picture emerges for developers

---

## Sibling Agent Matrix

### Which Agents to Check

| Your Domain | Check These Siblings (if available) |
|-------------|-------------------------------------|
| **Security** | Architecture (auth patterns), QA (security test coverage) |
| **Architecture** | Security (pattern risks), Dev Feasibility (implementation concerns) |
| **UI/UX** | Accessibility, Performance, QA (E2E coverage) |
| **QA Verification** | All domains (to verify claims are testable) |
| **Product** | Engineering (feasibility), UX (usability) |
| **Engineering** | Security (risks), Architecture (patterns) |

### Where to Find Sibling Outputs

```yaml
sibling_output_locations:
  security: "{story_dir}/_implementation/REVIEW.yaml"
  architecture: "{story_dir}/_implementation/ARCHITECT-NOTES.md"
  uiux: "{story_dir}/_implementation/UI-UX-FINDINGS.yaml"
  qa: "{story_dir}/_implementation/VERIFICATION.yaml"
  dev_feasibility: "{story_dir}/_pm/DEV-FEASIBILITY.md"

  # For epic-level reviews
  epic_reviews: "{epic_dir}/_epic-elab/REVIEW-{PERSPECTIVE}.yaml"
```

---

## Cross-Reference Protocol

### Step 1: Check for Sibling Outputs

Before finalizing your verdict, check if sibling agents have reviewed:

```yaml
sibling_check:
  security:
    checked: true
    file: "_implementation/REVIEW.yaml"
    exists: true
  architecture:
    checked: true
    file: "_implementation/ARCHITECT-NOTES.md"
    exists: false  # Not yet run
```

### Step 2: Identify Related Findings

Look for findings that relate to your domain:

```yaml
related_findings:
  - sibling: security
    finding_id: SEC-001
    issue: "Missing input validation on POST /api/wishlist"
    relates_to: "Your ARCH-002 finding about Zod at boundaries"
    relationship: corroborates  # corroborates | conflicts | extends
```

### Step 3: Document Cross-References

In your output, include cross-domain section:

```yaml
cross_domain:
  siblings_checked:
    - security: true
    - architecture: true
    - uiux: false  # Not applicable for backend story

  correlations:
    - your_finding: ARCH-002
      corroborates: SEC-001
      impact: "Both agree: Zod validation missing at API boundary"
      severity_impact: "Maintains High (security + architecture agree)"

  conflicts: []  # Empty if no conflicts
```

---

## Handling Corroborations

When your finding aligns with a sibling finding:

### Same Issue, Different Angle

```yaml
correlation:
  your_finding: ARCH-002
  your_issue: "Missing Zod schema at API boundary"

  sibling_finding: SEC-001
  sibling_issue: "No input validation on POST endpoint"

  relationship: same_underlying_issue

  action: |
    Reference sibling finding in yours.
    Consider severity upgrade if both domains flag it.
```

### Complementary Evidence

```yaml
correlation:
  your_finding: SEC-003
  your_issue: "XSS risk in user-generated content display"

  sibling_finding: UX-001
  sibling_issue: "dangerouslySetInnerHTML without sanitization"

  relationship: complementary_evidence

  action: |
    Combine evidence in your finding.
    Cite: "Corroborated by UX-001 finding same pattern"
```

### Severity Upgrade Rule

When multiple domains flag the same issue:
- 2 domains agree → Consider +1 severity
- 3+ domains agree → Strongly consider +1 severity

```yaml
severity_upgrade:
  finding: ARCH-002
  original_severity: medium
  domains_agreeing: [security, architecture]
  upgraded_severity: high
  reason: "Two independent domains identified same risk"
```

---

## Handling Conflicts

When your finding contradicts a sibling finding:

### Document the Disagreement

```yaml
disagreement:
  your_finding: SEC-005
  your_position: "This pattern introduces injection risk"
  your_evidence:
    - "Line 34: unsanitized input flows to query builder"
    - "No parameterized queries used"

  sibling_finding: ARCH-001
  sibling_position: "Pattern is acceptable for this use case"
  sibling_evidence:
    - "Follows existing codebase pattern"
    - "Input is from trusted admin source"

  conflict_type: risk_assessment  # risk_assessment | pattern_interpretation | priority
```

### Escalation Decision

```yaml
conflict_resolution:
  approach: escalate_to_aggregator
  reason: "Conflicting expert opinions require human decision"

  your_action: |
    Include your finding with full evidence.
    Note the disagreement explicitly.
    Do NOT suppress your finding.
```

### Never Suppress Your Finding

Even if a sibling agent disagrees:
- Include your finding
- Note the disagreement
- Let the aggregator/human resolve

---

## For Leader/Aggregator Agents

### Conflict Resolution Protocol

When aggregating findings from multiple specialists:

```yaml
conflict_resolution_steps:
  1_identify: "List all conflicts between specialists"
  2_compare_evidence: "Which has stronger evidence?"
  3_check_domain_expertise: "Which is the authoritative domain for this issue?"
  4_check_kb: "Any precedent for this pattern?"
  5_decide:
    - clear_winner: "Accept finding with stronger evidence/authority"
    - unclear: "Escalate to human with both perspectives"
```

### Domain Authority

For conflict resolution, domain authority matters:

| Issue Type | Authoritative Domain |
|------------|---------------------|
| Security vulnerability | Security |
| Pattern violation | Architecture |
| Accessibility | UI/UX |
| Performance impact | UI/UX (frontend), Engineering (backend) |
| Testability | QA |
| Scope/requirements | Product |
| Feasibility | Engineering |

### Aggregation Output

```yaml
aggregated_findings:
  all_findings: 12
  corroborated: 3
  conflicts_resolved: 1
  conflicts_escalated: 0

  resolved_conflicts:
    - finding_ids: [SEC-005, ARCH-001]
      resolution: "Security authority - treated as injection risk"
      action: "Added to mvp_blockers"
```

---

## Cross-Domain in Output

### Finding-Level Cross-Reference

```yaml
findings:
  - id: SEC-001
    severity: high
    issue: "Missing input validation"

    cross_domain:
      corroborates:
        - finding: ARCH-002
          agent: architect-story-review
          summary: "Same issue from architecture perspective"
      conflicts_with: []
```

### Verdict-Level Summary

```yaml
verdict:
  decision: FAIL

  cross_domain_summary:
    siblings_checked: [architecture, uiux]
    corroborations: 2
    conflicts: 0

    unified_findings:
      - issue: "Input validation at API boundary"
        domains: [security, architecture]
        unified_severity: high
```

---

## Implementation Checklist

For each specialist agent that supports cross-domain:

- [ ] Check for sibling outputs before finalizing
- [ ] Identify related findings
- [ ] Document corroborations
- [ ] Document conflicts (never suppress)
- [ ] Consider severity upgrades for multi-domain agreement
- [ ] Include cross_domain section in output

### Agent File Addition

Add to specialist agent files:

```markdown
## Cross-Domain Awareness

Before finalizing verdict, check sibling agent outputs per
`.claude/agents/_shared/cross-domain-protocol.md`

### Required Checks
- [ ] Read sibling outputs if they exist
- [ ] Identify corroborating findings
- [ ] Flag any conflicts
- [ ] Include cross_domain section in output
```
