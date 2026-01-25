/elab-epic {PREFIX}

Epic Elaboration - Multi-stakeholder review of an entire epic before story work begins.
This is a strategic gate that identifies gaps, risks, and improvements at the epic level.

---

## Purpose

Review the epic holistically from multiple stakeholder perspectives:
- Find gaps in story coverage
- Identify missing dependencies
- Validate technical approach
- Ensure user value is clear
- Surface risks early
- Recommend improvements

This happens AFTER `/pm-bootstrap-workflow` and BEFORE starting individual stories.

---

## Inputs

| Artifact | Location | Required |
|----------|----------|----------|
| Stories Index | `plans/stories/{PREFIX}.stories.index.md` | Yes |
| Meta Plan | `plans/{PREFIX}.plan.meta.md` | Yes |
| Exec Plan | `plans/{PREFIX}.plan.exec.md` | Yes |
| Roadmap | `plans/{PREFIX}.roadmap.md` | Yes |
| Original PRD/Plan | (user provides or references) | Recommended |

---

## Stakeholder Agents (Run in Parallel)

| Agent | Perspective | Focus Areas |
|-------|-------------|-------------|
| `elab-epic-engineering.agent.md` | Engineering Lead | Architecture, feasibility, effort, technical debt |
| `elab-epic-product.agent.md` | Product Manager | Scope, value, prioritization, user impact |
| `elab-epic-qa.agent.md` | QA Lead | Testability, quality gates, risk coverage |
| `elab-epic-ux.agent.md` | UX Lead | User experience, accessibility, design consistency |
| `elab-epic-platform.agent.md` | Platform/DevOps | Infrastructure, deployment, observability |
| `elab-epic-security.agent.md` | Security | Security risks, compliance, data handling |

---

## Execution

### Phase 0: Setup & Validation

1. Verify all required artifacts exist
2. Read all artifacts into context
3. Create `plans/{PREFIX}.epic-elab/` directory for outputs
4. If any artifact missing → `SETUP BLOCKED: Missing <artifact>`

### Phase 1: Stakeholder Reviews (PARALLEL)

Spawn ALL 6 stakeholder agents in a SINGLE message with `run_in_background: true`.

Each agent returns YAML (not markdown). Orchestrator aggregates into single file.

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Epic review - Engineering"
  run_in_background: true
  prompt: |
    Read: .claude/agents/elab-epic-engineering.agent.md

    CONTEXT: {PREFIX} | plans/stories/{PREFIX}.stories.index.md

    Return YAML only (no markdown):
    ```yaml
    perspective: engineering
    verdict: READY | CONCERNS | BLOCKED
    critical: []
    high: []
    medium: []
    recommendations: []
    missing_stories: []
    ```
```

### Phase 2: Aggregate to EPIC-REVIEW.yaml

1. Wait for all 6 agents
2. Create `plans/{PREFIX}.epic-elab/EPIC-REVIEW.yaml`:

```yaml
schema: 1
epic: {PREFIX}
reviewed: <timestamp>

verdict: READY | CONCERNS | BLOCKED
summary: "one line"

perspectives:
  engineering: <agent output>
  product: <agent output>
  qa: <agent output>
  ux: <agent output>
  platform: <agent output>
  security: <agent output>

findings:
  critical: <merged from all>
  high: <merged from all>

new_stories: <merged>
stories_to_split: <merged>
```

### Phase 3: Synthesize

```markdown
# Epic Analysis: {PREFIX}

## Executive Summary
<1-2 paragraph overall assessment>

## Findings by Severity

### 🔴 Critical (Must Address Before Starting)
| ID | Category | Finding | Affected Stories | Recommendation |
|----|----------|---------|------------------|----------------|

### 🟡 High (Should Address Soon)
| ID | Category | Finding | Affected Stories | Recommendation |
|----|----------|---------|------------------|----------------|

### 🟢 Medium (Improve When Possible)
| ID | Category | Finding | Affected Stories | Recommendation |
|----|----------|---------|------------------|----------------|

### 💡 Enhancements (Nice to Have)
| ID | Category | Finding | Affected Stories | Recommendation |
|----|----------|---------|------------------|----------------|

## Gap Analysis

### Missing Stories Identified
| Gap | Description | Suggested Story | Priority |
|-----|-------------|-----------------|----------|

### Missing Dependencies
| Story | Missing Dependency | Impact |
|-------|-------------------|--------|

### Scope Concerns
| Concern | Stories Affected | Recommendation |
|---------|------------------|----------------|

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|

## Stakeholder Consensus

| Topic | Engineering | Product | QA | UX | Platform | Security |
|-------|-------------|---------|----|----|----------|----------|
| Scope appropriate | ✓/⚠️/✗ | ... | ... | ... | ... | ... |
| Dependencies clear | ✓/⚠️/✗ | ... | ... | ... | ... | ... |
| Risks identified | ✓/⚠️/✗ | ... | ... | ... | ... | ... |
| Ready to start | ✓/⚠️/✗ | ... | ... | ... | ... | ... |

## Recommended Actions

### Before Starting Any Stories
1. <action>
2. <action>

### Story-Specific Adjustments
| Story | Adjustment |
|-------|------------|

### New Stories to Add
| Story ID | Title | Description | Priority | Blocks |
|----------|-------|-------------|----------|--------|

### Stories to Split
| Story | Reason | Suggested Split |
|-------|--------|-----------------|

### Stories to Remove/Defer
| Story | Reason |
|-------|--------|
```

### Phase 4: Interactive Review

Present findings to user:

```
## Epic Elaboration Complete: {PREFIX}

I've reviewed this epic from 6 stakeholder perspectives.

**Summary:**
- 🔴 Critical findings: N
- 🟡 High findings: N
- 🟢 Medium findings: N
- 💡 Enhancements: N
- 📋 New stories suggested: N
- ✂️ Stories to split: N

Would you like to:
1. **Review all findings** - Walk through each one
2. **Review critical only** - Focus on blockers
3. **See new story suggestions** - Review proposed additions
4. **Accept and update** - Apply recommended changes to artifacts
5. **Export summary** - Generate executive summary only
```

**If user chooses to review:**
- Present each finding with context
- Collect decision: Accept / Modify / Reject / Defer
- Track all decisions

### Phase 5: Apply Updates (If Approved)

Based on user decisions:

1. **Update stories index** with:
   - New stories added
   - Stories marked for split
   - Dependency corrections
   - Risk notes added

2. **Update roadmap** with:
   - New stories in dependency graph
   - Updated critical path
   - Risk indicators

3. **Create follow-up tracking**:
   - `plans/{PREFIX}.epic-elab/FOLLOW-UPS.md` for deferred items

---

## Stakeholder Agent Templates

### Engineering Lead Focus
```markdown
## Engineering Review: {PREFIX}

### Architecture Assessment
- [ ] Clear separation of concerns
- [ ] Appropriate package boundaries
- [ ] No circular dependencies planned
- [ ] Reuse opportunities identified

### Technical Feasibility
| Story | Feasibility | Complexity | Concerns |
|-------|-------------|------------|----------|

### Effort Estimation (T-Shirt)
| Story | Size | Confidence | Notes |
|-------|------|------------|-------|

### Technical Debt Risks
- <risk>

### Missing Technical Stories
- <suggested story>

### Architecture Recommendations
- <recommendation>
```

### Product Manager Focus
```markdown
## Product Review: {PREFIX}

### Value Assessment
| Story | User Value | Business Value | Priority Score |
|-------|------------|----------------|----------------|

### Scope Validation
- [ ] All user journeys covered
- [ ] No feature creep
- [ ] MVP clearly defined
- [ ] Nice-to-haves identified

### Prioritization Review
| Current Order | Recommended Order | Rationale |
|---------------|-------------------|-----------|

### Missing User Stories
- <gap in user journey>

### Acceptance Criteria Quality
| Story | AC Quality | Issues |
|-------|------------|--------|

### Product Recommendations
- <recommendation>
```

### QA Lead Focus
```markdown
## QA Review: {PREFIX}

### Testability Assessment
| Story | Unit Testable | Integration Testable | E2E Testable | Concerns |
|-------|---------------|---------------------|--------------|----------|

### Quality Gate Coverage
- [ ] All stories have clear ACs
- [ ] Test plan exists or can be derived
- [ ] Edge cases identified
- [ ] Error scenarios covered

### Risk Coverage
| Risk Area | Stories Covering | Gap? |
|-----------|------------------|------|

### Missing Test Stories
- <testing gap>

### QA Recommendations
- <recommendation>
```

### UX Lead Focus
```markdown
## UX Review: {PREFIX}

### User Experience Assessment
| Story | UX Impact | Consistency | Accessibility |
|-------|-----------|-------------|---------------|

### Design System Compliance
- [ ] All UI stories reference design system
- [ ] No custom styling planned
- [ ] Component reuse planned
- [ ] Responsive requirements clear

### Accessibility Coverage
| Story | A11y Considerations | WCAG Level |
|-------|---------------------|------------|

### User Flow Gaps
- <missing flow>

### UX Recommendations
- <recommendation>
```

### Platform/DevOps Focus
```markdown
## Platform Review: {PREFIX}

### Infrastructure Assessment
| Story | Infra Changes | Deployment Impact | Monitoring Needs |
|-------|---------------|-------------------|------------------|

### Deployment Risks
- [ ] No breaking changes without migration
- [ ] Feature flags where needed
- [ ] Rollback plan exists
- [ ] Performance impact assessed

### Observability Gaps
| Area | Current Coverage | Needed |
|------|------------------|--------|

### Missing Platform Stories
- <infra gap>

### Platform Recommendations
- <recommendation>
```

### Security Focus
```markdown
## Security Review: {PREFIX}

### Security Assessment
| Story | Auth Required | Data Sensitivity | Risk Level |
|-------|---------------|------------------|------------|

### OWASP Top 10 Coverage
| Risk | Stories Addressing | Gap? |
|------|-------------------|------|
| Injection | | |
| Broken Auth | | |
| Sensitive Data | | |
| XXE | | |
| Broken Access Control | | |
| Security Misconfiguration | | |
| XSS | | |
| Insecure Deserialization | | |
| Vulnerable Components | | |
| Insufficient Logging | | |

### Compliance Concerns
- <concern>

### Missing Security Stories
- <security gap>

### Security Recommendations
- <recommendation>
```

---

## Output Files

| File | Location | Purpose |
|------|----------|---------|
| `EPIC-REVIEW.yaml` | `plans/{PREFIX}.epic-elab/` | All perspectives + synthesis |
| `FOLLOW-UPS.md` | `plans/{PREFIX}.epic-elab/` | Deferred items (only if needed) |

**Single YAML file replaces 7 markdown files.** Each agent appends their section.

See `.claude/agents/_shared/lean-docs.md` for format.

---

## Verdicts

| Verdict | Meaning | Action |
|---------|---------|--------|
| `EPIC READY` | No critical issues, can start stories | Proceed to `/pm-generate-story` |
| `EPIC READY WITH CONCERNS` | Minor issues, can start with awareness | Document concerns, proceed |
| `EPIC NEEDS WORK` | Significant gaps found | Address findings, re-run |
| `EPIC BLOCKED` | Critical issues prevent starting | Escalate to stakeholders |

---

## Done

Stop when:
- All stakeholder reviews complete
- Findings aggregated and presented
- User decisions collected
- Artifacts updated (if approved)
- Verdict determined

**Next steps by verdict:**
- `EPIC READY` → `/pm-generate-story {PREFIX}-001`
- `EPIC READY WITH CONCERNS` → `/pm-generate-story {PREFIX}-001` (with documented concerns)
- `EPIC NEEDS WORK` → Address findings, re-run `/elab-epic {PREFIX}`
- `EPIC BLOCKED` → Escalate to leadership

---

## Token Optimization

- All 6 stakeholder agents run in parallel (single spawn message)
- Each agent uses Haiku (simple analysis)
- Aggregation uses orchestrator context
- Total estimated: ~60k tokens for full epic review
