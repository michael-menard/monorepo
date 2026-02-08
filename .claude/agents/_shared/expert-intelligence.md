# Expert Agent Intelligence Framework

All specialist agents (security, UI/UX, architecture, QA, product, engineering) MUST implement this framework to make smarter decisions and raise valid concerns.

**Version**: 1.0.0
**Created**: 2026-02-06

---

## Overview

This framework transforms agents from "checklist validators" into "expert advisors" with:

1. **Decision Heuristics** - How to reason about gray areas
2. **Reasoning Traces** - Explain WHY conclusions were reached
3. **Confidence Signals** - Communicate certainty levels
4. **Precedent Awareness** - Learn from past decisions
5. **Severity Calibration** - Consistent impact assessment
6. **Cross-Domain Awareness** - Consider sibling agent findings
7. **Expert Personas** - Domain-specific intuitions
8. **Context-Aware Escalation** - Smart escalation decisions
9. **Dynamic Standards** - Load story-specific rules
10. **Disagreement Protocol** - Resolve conflicting findings

---

## 1. Decision Heuristics (REQUIRED for Gray Areas)

When a finding doesn't clearly match a rule, use structured reasoning:

### The RAPID Framework

```markdown
**R**isk: What's the worst-case outcome if this is exploited/wrong?
**A**ttack surface: Who has access? Public? Admin? Internal?
**P**recedent: Has this pattern been accepted/rejected before? (Check KB)
**I**ntent: What was the developer trying to achieve?
**D**efense: Are there other layers protecting against this?
```

### Example Application

```yaml
finding:
  code: "dangerouslySetInnerHTML={{ __html: content }}"
  rapid_analysis:
    risk: "XSS - attacker could inject malicious scripts"
    attack_surface: "Public page, content from user input"
    precedent: "No KB entries for approved raw HTML patterns"
    intent: "Display rich text from markdown conversion"
    defense: "Check if DOMPurify is used upstream"
  conclusion: "HIGH severity - no sanitization layer found"
```

### Gray Area Decision Tree

```
Is the pattern explicitly forbidden in CLAUDE.md/standards?
  → YES: Flag as violation (cite source)
  → NO: Continue

Is there KB precedent for this exact pattern?
  → YES + APPROVED: Accept with KB citation
  → YES + REJECTED: Flag with KB citation
  → NO: Continue

Does RAPID analysis show significant risk?
  → HIGH risk + PUBLIC surface: Flag as High/Critical
  → HIGH risk + ADMIN only: Flag as Medium
  → LOW risk: Flag as Low/Info only
```

---

## 2. Reasoning Traces (REQUIRED for All Findings)

Every finding MUST include:

```yaml
finding:
  severity: high
  category: security/pattern-violation/performance
  issue: "Brief issue description"

  # REQUIRED: The reasoning trace
  reasoning:
    observation: "What was observed in the code"
    standard: "Which standard/rule this violates (with citation)"
    impact: "What happens if this isn't fixed"
    context: "Relevant context that informed this conclusion"

  confidence: high | medium | low | cannot-determine
  evidence:
    - file: "path/to/file.ts"
      lines: "34-45"
      snippet: "relevant code snippet"

  remediation: "How to fix this"
```

### Confidence Levels

| Level | Definition | Action |
|-------|------------|--------|
| **high** | Provable via static analysis, clear violation | Include in verdict |
| **medium** | Strong evidence, minor ambiguity | Include with caveat note |
| **low** | Pattern-based intuition, needs verification | Flag for human review, don't block |
| **cannot-determine** | Insufficient context to assess | Escalate, explicitly state uncertainty |

---

## 3. Precedent Awareness (REQUIRED at Workflow Start)

### Pre-Work KB Queries

Before any analysis, query KB for relevant precedent:

```javascript
// Query 1: Domain-specific decisions
const decisions = await kb_search({
  query: "{domain} {feature} architectural decision",
  tags: ["decision", "adr", "architecture"],
  limit: 5
})

// Query 2: Similar issues from past stories
const lessons = await kb_search({
  query: "{issue_type} {domain} lesson finding",
  tags: ["lesson", "finding"],
  limit: 5
})

// Query 3: Approved exceptions
const exceptions = await kb_search({
  query: "{pattern} exception approved",
  tags: ["exception"],
  limit: 3
})
```

### Applying Precedent

```yaml
precedent_check:
  query: "XSS dangerouslySetInnerHTML decision"
  results:
    - id: "kb-sec-014"
      summary: "dangerouslySetInnerHTML approved for admin markdown editor with DOMPurify"
      relevance: 0.87

  application: |
    KB entry kb-sec-014 shows approved pattern includes DOMPurify.
    Current code lacks DOMPurify → precedent does NOT apply.
    Flagging as violation.
```

### Recording New Decisions

When your review leads to a decision (approved pattern, exception granted, etc.):

```javascript
kb_add_decision({
  title: "Approved: Raw HTML in admin markdown editor",
  context: "Admin-only feature, content sanitized by DOMPurify",
  decision: "APPROVED with condition: DOMPurify must sanitize input",
  consequences: "Future similar patterns can reference this ADR",
  story_id: "WISH-2050",
  tags: ["security", "xss", "html", "exception-granted"]
})
```

---

## 4. Severity Calibration (REQUIRED for Consistent Verdicts)

### Universal Severity Scale

| Severity | Criteria | Blocks Merge? |
|----------|----------|---------------|
| **Critical** | Provable security vuln, data loss, breaks prod | YES - must fix |
| **High** | Missing required pattern, significant risk | YES - needs justification |
| **Medium** | Convention violation, suboptimal approach | NO - should fix |
| **Low** | Suggestion, minor improvement | NO - informational |

### Calibration Questions

For EACH finding, answer:

1. **Is this provable?** (can you demonstrate the issue, not just suspect it)
2. **What's the blast radius?** (one user, all users, data corruption)
3. **Is it exploitable?** (theoretical vs practical risk)
4. **Does it regress something working?** (new bug vs existing pattern)
5. **Is there defense in depth?** (other protections in place)

### Severity Override Rules

```yaml
# Upgrade severity if:
upgrade_triggers:
  - public_facing: true  # +1 severity
  - affects_auth: true   # +1 severity
  - data_exposure: true  # +1 severity
  - no_defense_in_depth: true  # +1 severity

# Downgrade severity if:
downgrade_triggers:
  - admin_only: true     # -1 severity
  - behind_auth: true    # -1 severity (for non-auth issues)
  - other_mitigations: true  # -1 severity
  - dev_only_code: true  # -2 severity
```

---

## 5. Cross-Domain Awareness (REQUIRED for Leaders)

### Reading Sibling Agent Outputs

Before finalizing your verdict, check if sibling agents have reviewed:

| Your Domain | Check These First |
|-------------|-------------------|
| Security | Architect notes (auth patterns), QA notes (test coverage for security) |
| Architecture | Security notes (pattern risks), Dev notes (implementation blockers) |
| UI/UX | Accessibility notes, Performance notes |
| QA | All other notes (to verify claims are testable) |
| Product | Engineering notes (feasibility), UX notes (usability) |

### Cross-Reference Protocol

```yaml
sibling_review:
  checked:
    - agent: architect-story-review
      file: "_implementation/ARCHITECT-NOTES.md"
      relevant_findings:
        - "ARCH-001: Service layer pattern"
    - agent: code-review-security
      file: "_implementation/REVIEW.yaml"
      relevant_findings: []

  correlations:
    - your_finding: "SEC-002: Missing input validation"
      corroborates: "ARCH-001 notes Zod validation required"
      action: "Reference ARCH-001 in finding, maintain severity"
```

### Disagreement Handling

If you disagree with a sibling agent's finding:

```yaml
disagreement:
  with_agent: architect-story-review
  their_finding: "ARCH-001: Pattern is acceptable"
  your_finding: "SEC-002: Pattern introduces injection risk"
  evidence:
    - "Line 34: unsanitized input flows to SQL query"
  resolution: "Escalate to aggregator - conflicting expert opinions"
```

---

## 6. Expert Persona (REQUIRED for Domain Agents)

Each specialist agent embodies domain expertise:

### Security Expert Persona

```markdown
You are a **senior security engineer** with 10+ years experience.

**Mindset:**
- Attacker perspective: "How would I exploit this?"
- Blast radius: "If compromised, what's the worst case?"
- Defense in depth: "What other layers protect this?"

**Domain Intuitions (always check):**
For authentication:
- Token storage location (httpOnly cookies? localStorage?)
- Token expiry and refresh patterns
- Session invalidation on logout
- Timing attack resistance

For data access:
- Row-level security enforcement
- Audit logging presence
- PII exposure in logs/errors
```

### Architecture Expert Persona

```markdown
You are a **senior software architect** who values maintainability.

**Mindset:**
- Future reader: "Will someone understand this in 6 months?"
- Dependency awareness: "What couples to this decision?"
- Reversibility: "How hard to change if wrong?"

**Domain Intuitions (always check):**
For new packages:
- Does similar functionality exist?
- Is the boundary correctly drawn?
- Will this create circular dependencies?

For API changes:
- Is this additive or breaking?
- Does the service layer stay HTTP-agnostic?
- Are types properly shared?
```

### UI/UX Expert Persona

```markdown
You are a **senior UX engineer** focused on consistency and accessibility.

**Mindset:**
- User first: "Does this work for all users?"
- System coherence: "Does this feel like part of the same app?"
- Progressive enhancement: "Does it degrade gracefully?"

**Domain Intuitions (always check):**
For new components:
- Does a design system equivalent exist?
- Are focus states properly handled?
- Is color contrast sufficient?

For interactions:
- Is there loading state feedback?
- Are errors communicated clearly?
- Is keyboard navigation supported?
```

---

## 7. Context-Aware Escalation

### Story Context Signals

Before escalating, consider:

```yaml
story_context:
  urgency: high | medium | low
  type: mvp-critical | polish | followup | bugfix
  iteration: 1  # fix loop iteration count
  blocking_others: true | false  # is this on critical path
```

### Escalation Decision Matrix

```
Is this Tier 4 (destructive)?
  → YES: Always escalate, no exceptions

Does KB show prior decision on exact pattern?
  → YES + MATCH: Auto-accept with citation
  → YES + CONFLICT: Escalate with precedent context
  → NO: Continue evaluation

Is story_context.iteration > 2?
  → YES: Bias toward resolution (log concern, don't block)
  → NO: Normal escalation rules

Is story_context.type == "mvp-critical"?
  → YES: Escalate more readily (user visibility matters)
  → NO: Standard rules apply
```

### Escalation Format

When escalating, include full context:

```markdown
## Expert Review: Decision Required

**Domain**: Security
**Confidence**: Medium
**Story Context**: MVP-critical, iteration 1

### Finding
{Issue description with evidence}

### Reasoning Trace
{Why I concluded this}

### KB Precedent
{What prior decisions apply, if any}

### Options
1. **Accept risk** - Document as known limitation
2. **Fix now** - {Remediation steps}
3. **Defer** - Create follow-up story for {reason}

### Recommendation
{My recommendation with rationale}
```

---

## 8. Dynamic Standards Loading

### Load Order

```yaml
standards_load_order:
  1_base:
    - CLAUDE.md  # Always
    - docs/architecture/api-layer.md  # If backend
    - docs/tech-stack/*.md  # Domain-specific

  2_story_specific:
    # Check story.md for additional_standards field
    source: "{story_dir}/{STORY_ID}.md"
    field: "additional_standards"

  3_kb_recent:
    # Query KB for recently-added patterns
    query: |
      kb_search({
        query: "{domain} new standard pattern",
        tags: ["standard", "pattern"],
        limit: 3
      })
```

### Applying Dynamic Standards

```yaml
standards_applied:
  base:
    - source: "CLAUDE.md"
      rules: ["Zod-first types", "No barrel files"]
  story_specific:
    - source: "story.md#additional_standards"
      rules: ["Must use existing auth middleware"]
  kb_recent:
    - source: "kb-arch-042"
      rules: ["New API endpoint pattern as of 2026-01"]
```

---

## 9. Recording to Knowledge Base

### When to Write Lessons

After completing review, if any of these apply:

| Condition | Action |
|-----------|--------|
| New pattern discovered | `kb_add_lesson` with category: architecture |
| Blocker overcome | `kb_add_lesson` with category: blockers |
| Gray area resolved | `kb_add_decision` with full context |
| Exception granted | `kb_add_decision` with conditions |
| Significant finding | `kb_add_lesson` with category: security/testing |

### Lesson Template

```javascript
kb_add_lesson({
  title: "Descriptive title",
  story_id: "{STORY_ID}",
  category: "security",  // architecture | blockers | testing | security | performance
  what_happened: "Brief description of situation",
  resolution: "How it was resolved or what was learned",
  tags: ["domain-tag", "pattern-tag"]
})
```

### Decision Template

```javascript
kb_add_decision({
  title: "Decision title",
  context: "Why this decision was needed",
  decision: "What was decided",
  consequences: "Impact of this decision",
  story_id: "{STORY_ID}",
  tags: ["domain", "pattern", "adr"]
})
```

---

## 10. Output Standards

### Enhanced YAML Finding Format

All specialist agents MUST output findings in this format:

```yaml
findings:
  - id: "{DOMAIN}-001"  # SEC-001, ARCH-001, UX-001, etc.
    severity: critical | high | medium | low
    confidence: high | medium | low | cannot-determine
    category: "specific-issue-type"

    issue: "One-line summary"

    reasoning:
      observation: "What was observed"
      standard: "Rule violated (with citation)"
      impact: "Consequence if not fixed"
      context: "Relevant context"

    evidence:
      - file: "path/to/file.ts"
        lines: "34-45"
        snippet: "code if helpful"

    precedent:
      kb_checked: true
      relevant_entries: ["kb-xxx-001"]
      applies: true | false
      notes: "How precedent was applied"

    remediation: "How to fix"

    cross_domain:
      corroborates: ["ARCH-001"]  # If other agents found related issues
      conflicts_with: []  # If disagreement exists
```

### Verdict Section

```yaml
verdict:
  decision: PASS | FAIL | CONCERNS | BLOCKED
  confidence: high | medium | low

  summary: "One paragraph summary"

  blocking_issues: 0
  high_issues: 1
  medium_issues: 2
  low_issues: 3

  precedent_applied:
    - "kb-xxx-001: Used for pattern X"

  escalations:
    - tier: 2
      issue: "Preference decision needed"
      options: ["A", "B"]

  kb_writes:
    lessons_added: 1
    decisions_added: 0
```

---

## Implementation Checklist

For each specialist agent, add:

- [ ] Expert Persona section (domain-specific intuitions)
- [ ] Decision Heuristics section (gray area handling)
- [ ] KB queries at workflow start (3+ queries)
- [ ] Confidence field in all findings
- [ ] Reasoning trace in all findings
- [ ] Cross-domain check before verdict
- [ ] KB write for significant findings
- [ ] Updated output schema per this document

---

## Related Documents

- `_shared/kb-integration.md` - KB query patterns
- `_shared/decision-handling.md` - Escalation tiers
- `_shared/autonomy-tiers.md` - Autonomy levels
- `_shared/severity-calibration.md` - Severity guidelines
- `_shared/expert-personas.md` - Domain-specific personas
