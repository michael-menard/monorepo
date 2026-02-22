---
generated: "2026-02-21"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
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
- Gaps: Baseline pre-dates many WINT stories now in UAT. No ADR-LOG.md found at expected path.

### Relevant Existing Features
| Feature | Status | Relevance |
|---------|--------|-----------|
| Role packs `_specs/` | Active | patch-queue-pattern.md and repair-loop-pattern.md already exist under `.claude/prompts/role-packs/_specs/` - created by WINT-0190 |
| Orchestrator artifact schemas | Active | Zod-validated schemas in `packages/backend/orchestrator/src/artifacts/` |
| Agent `.agent.md` files | Active | 115+ agent files with established frontmatter format |
| KB MCP tools | Active | `kb_search`, `kb_add_decision`, `kb_add_lesson` available |

### Active In-Progress Work
| Story | Scope | Overlap Risk |
|-------|-------|-------------|
| WINT-0190 | Patch Queue Pattern + Schema | Direct downstream - WINT-0190 already created `_specs/` directory and pattern files. WINT-0180 must define the framework these fit into |
| WINT-0210 | Populate Role Pack Templates | Depends on WINT-0180 - will consume the framework defined here |

### Constraints to Respect
- Token budget: Role pack examples must be small (150-300 tokens per role)
- Pattern skeletons: 10-25 lines max
- Max 2 positive + 1 negative example per role
- Must not modify existing `_specs/` files (owned by WINT-0190)

---

## Retrieved Context

### Related Endpoints
None - this is a documentation/framework story, not an API story.

### Related Components
None - no UI changes.

### Reuse Candidates
| Candidate | Path | Reuse Type |
|-----------|------|-----------|
| Patch Queue Pattern | `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` | Template reference - follows the exact positive/negative example format this story should standardize |
| Repair Loop Pattern | `.claude/prompts/role-packs/_specs/repair-loop-pattern.md` | Template reference - demonstrates decision rule + proof structure |
| Agent frontmatter | `.claude/agents/*.agent.md` | Pattern - established YAML frontmatter format for versioning |
| Orchestrator schemas | `packages/backend/orchestrator/src/artifacts/` | Pattern - Zod validation approach for structured data |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Example format | `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` | Already implements the 2-positive + 1-negative example pattern with decision rules and proof requirements |
| Example format | `.claude/prompts/role-packs/_specs/repair-loop-pattern.md` | Demonstrates bounded protocol with escalation, positive/negative examples |

---

## Knowledge Context

### Lessons Learned
- KB not queried (no live MCP connection in seed phase)

### Blockers to Avoid (from past stories)
- Overly verbose examples that blow token budget
- Framework definitions that are too abstract to be actionable

### Architecture Decisions (ADRs)
- No ADR-LOG.md found at expected path

### Patterns to Follow
- WINT-0190 `_specs/` pattern: each pattern is a standalone .md file with Version, Story, Status, Decision Rule, Examples (positive + negative), Cross-References
- Keep examples concrete and JSON/code-based, not prose descriptions

### Patterns to Avoid
- Creating framework docs without concrete examples
- Defining rules without verification/proof mechanisms

---

## Conflict Analysis

No conflicts detected. WINT-0180 has no dependencies and the `_specs/` directory already exists from WINT-0190, providing a clear foundation.

---

## Story Seed

### Title
Define Examples + Negative Examples Framework

### Description
Create a framework for role packs that standardizes how examples are defined, structured, and delivered to agents. Each role (Dev, PO, DA, QA) gets max 2 positive examples + 1 negative example. Define the pattern skeleton format (10-25 lines), decision rule format, and proof requirements. Establish the directory structure and delivery mechanisms: `prompts/role-packs/*` files, KB MCP storage, and context-pack sidecar injection.

The existing `_specs/` directory (from WINT-0190) already contains two pattern specs (patch-queue-pattern.md and repair-loop-pattern.md) that follow this framework implicitly. This story formalizes that implicit structure into an explicit, documented framework.

### Initial Acceptance Criteria
- [ ] AC-1: Framework document created at `.claude/prompts/role-packs/FRAMEWORK.md` defining the example structure standard
- [ ] AC-2: Pattern skeleton template defined (10-25 lines max) with required sections: Decision Rule, Positive Examples (max 2), Negative Example (max 1), Proof Requirements
- [ ] AC-3: Role pack directory structure documented: `prompts/role-packs/{role}.md` for role instructions, `prompts/role-packs/_specs/{pattern}.md` for pattern specs
- [ ] AC-4: Token budget constraints defined per role (150-300 tokens for role instructions, configurable max for examples)
- [ ] AC-5: Decision rule format standardized - when to apply the pattern, with boolean/threshold criteria
- [ ] AC-6: Proof requirements format defined - what evidence must exist after applying the pattern
- [ ] AC-7: Delivery mechanism documented: file-based (prompts/role-packs/*), KB MCP (kb_search by tags), context-pack sidecar injection point
- [ ] AC-8: Existing `_specs/` patterns (patch-queue-pattern.md, repair-loop-pattern.md) validated against the framework - no breaking changes required

### Non-Goals
- Do NOT create the actual role pack content (that is WINT-0210)
- Do NOT create the JSON schemas for artifacts (that is WINT-0190/WINT-0200)
- Do NOT modify existing `_specs/` files
- Do NOT implement the context-pack sidecar (that is WINT-2020)

### Reuse Plan
- **Components**: Existing `_specs/` patterns as exemplars of the framework
- **Patterns**: YAML frontmatter versioning from agent files
- **Packages**: None - documentation-only story

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
This is a documentation/framework story. Verification is structural: validate that FRAMEWORK.md exists, covers all required sections, and that existing `_specs/` patterns conform. No unit tests needed.

### For UI/UX Advisor
No UI/UX impact - this is an internal developer tooling framework.

### For Dev Feasibility
Low implementation risk - primarily documentation. Main deliverable is FRAMEWORK.md. Validate existing `_specs/` patterns against framework as acceptance test. Consider whether FRAMEWORK.md should include a Zod schema for pattern validation (deferred to WINT-0210 if so).
