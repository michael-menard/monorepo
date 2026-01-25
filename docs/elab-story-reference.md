# Elaboration Reference Documentation

This document contains detailed specifications for the `/elab-story` command.

---

## Purpose

Story Elaboration is a **HARD GATE** that determines whether a story is:
- Safe to implement
- Unambiguous
- Locally testable
- Aligned with the migration plan
- Compliant with reuse-first and ports & adapters rules

A story MUST NOT proceed to implementation unless elaboration PASS is achieved.

---

## Workflow Overview

```
backlog/STORY-XXX/
       │
       ▼ (Phase 0: Setup)
elaboration/STORY-XXX/
       │
       ▼ (Phase 1: Analysis)
elaboration/STORY-XXX/_implementation/ANALYSIS.md
       │
       ▼ (Interactive Discussion)
       │
       ▼ (Phase 2: Completion)
ready-to-work/STORY-XXX/  ──or──  elaboration/STORY-XXX/ (if blocked)
```

---

## Authoritative Inputs

| Input | Location |
|-------|----------|
| Story file | `plans/stories/.../STORY-XXX/STORY-XXX.md` |
| Stories index | `plans/stories/*.stories.index.md` |
| Migration plan | `plans/*.plan.exec.md` (if exists) |
| Plan metadata | `plans/*.plan.meta.md` (if exists) |
| QA agent definition | `.claude/agents/qa.agent.md` |

---

## Audit Checklist Details

### 1. Scope Alignment
Story scope must match stories.index.md exactly. Any extra endpoints, infrastructure, or features is a defect.

### 2. Internal Consistency
- Goals ≠ contradict Non-goals
- Decisions ≠ contradict Non-goals
- AC match Scope
- Testing Plan matches AC

### 3. Reuse-First Enforcement
- Shared logic from `packages/**`
- No per-story one-off utilities
- New shared packages justified and correctly located

### 4. Ports & Adapters Compliance
- Core logic is transport-agnostic
- Adapters explicitly identified
- Platform-specific logic isolated

### 5. Local Testability
| Type | Requirement |
|------|-------------|
| Backend | Runnable `.http` tests |
| Frontend | Playwright tests |
| Both | Concrete and executable |

### 6. Decision Completeness
- No blocking TBDs
- No unresolved design decisions
- Open Questions section clear

### 7. Risk Disclosure
Explicit disclosure of:
- Auth risks
- Database risks
- Upload risks
- Caching risks
- Infrastructure risks
- Hidden dependencies

### 8. Story Sizing

**"Too Large" Indicators:**
| Indicator | Threshold |
|-----------|-----------|
| Acceptance Criteria | > 8 |
| Endpoints | > 5 |
| Frontend + Backend | Both significant |
| Independent features | Multiple bundled |
| Happy path scenarios | > 3 distinct |
| Package touches | > 2 packages |

**If 2+ indicators present:** SPLIT REQUIRED

**Split Requirements:**
- Propose STORY-XXX-A, STORY-XXX-B naming
- Clear boundaries between splits
- AC allocation per split
- Dependency order
- Each split independently testable

---

## Discovery Questions

### Question 1: What are we missing?
- Edge cases not in AC
- Error scenarios not addressed
- Security considerations
- Performance implications
- Accessibility gaps
- Data migration/compatibility
- Monitoring/observability
- Documentation gaps

### Question 2: What would make this killer?
- UX improvements
- Power-user features
- Integration opportunities
- Analytics/insights
- Automation possibilities
- Future-proofing

---

## Interactive Discussion Format

Present findings one at a time:

```
[Gap/Enhancement #X of N]
Category: [Gaps & Blind Spots | Enhancement Opportunity]

Finding: [Description]

Recommendation: [Suggestion]

Impact: [Low | Medium | High]
Effort: [Low | Medium | High]

Options:
(1) Add to story as new AC
(2) Add as follow-up story note
(3) Mark as out-of-scope (with justification)
(4) Skip / Not relevant
```

---

## Verdict Definitions

| Verdict | Meaning | Status Update | Directory Move |
|---------|---------|---------------|----------------|
| PASS | All checks pass, no Critical/High issues | `ready-to-work` | → ready-to-work/ |
| CONDITIONAL PASS | Minor issues, proceed with notes | `ready-to-work` | → ready-to-work/ |
| FAIL | Critical/High issues block progress | `needs-refinement` | Stays in elaboration/ |
| SPLIT REQUIRED | Story too large | `needs-split` | Stays in elaboration/ |

---

## Output Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| ANALYSIS.md | `_implementation/` | Audit + discovery results |
| ELAB-STORY-XXX.md | Story directory | Final elaboration report |
| QA Discovery Notes | Appended to STORY-XXX.md | PM review section |

---

## Hard Constraints

- Do NOT implement code
- Do NOT redesign the system
- Do NOT modify story files (except QA Notes append + status update)
- Do NOT act as PM or Dev
- Do NOT provide implementation advice

---

## Token Budget

| Phase | Typical Tokens |
|-------|----------------|
| elab-setup | ~2,000 |
| elab-analyst | ~15,000 |
| interactive | ~5,000 |
| elab-completion | ~8,000 |
| **Total** | ~30,000 |

---

## Troubleshooting

### Story not found
Check both `backlog/` and `elaboration/` directories.

### Split required but unclear boundaries
Focus on:
1. Backend vs Frontend separation
2. Independent feature isolation
3. AC groupings by functionality

### Conditional pass vs fail
- CONDITIONAL: Issues are minor, documented, can be addressed during implementation
- FAIL: Issues are blocking, require PM intervention before dev can proceed
