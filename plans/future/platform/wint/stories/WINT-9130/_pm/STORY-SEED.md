---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-9130

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 9 work (LangGraph parity stories); several Phase 9 stories have since completed (WINT-9020, WINT-9090) or been created (WINT-9105, WINT-9106, WINT-9107, WINT-9110). The parity story dependency chain (WINT-9110 → WINT-9120 → WINT-9130) is not reflected in the baseline.

### Relevant Existing Features
| Feature | Location | Relevance |
|---------|----------|-----------|
| Claude Code workflow docs | `docs/workflow/` (README, phases, orchestration, etc.) | WINT-9130 will add a migration guide alongside these docs |
| LangGraph graphs | `packages/backend/orchestrator/src/graphs/` | Represents the LangGraph side of the feature comparison |
| Claude Code commands | `docs/workflow/README.md` (commands table) | Feature comparison must document Claude Code command → LangGraph graph mapping |
| WINT-0220-STRATEGY.md | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | Existing strategy/architecture doc pattern; migration doc should follow similar structure |
| LangGraph parity test suite | `packages/backend/orchestrator/src/__tests__/parity/` (to be created by WINT-9120) | Primary evidence for feature comparison — the test suite results will inform completeness of the migration guide |

### Active In-Progress Work
| Story | Status | Overlap |
|-------|--------|---------|
| WINT-9120 | pending (depends on WINT-9110) | Direct dependency — WINT-9130 cannot start until WINT-9120 is complete. Parity test results feed the feature comparison table. |
| WINT-9110 | created | Indirect dependency — full workflow graphs must exist before the parity suite and migration guide are meaningful |
| WINT-9105 | created | Indirect context — error handling ADR (adr-langgraph-error-handling.md) affects what "feature parity" means for retry/error scenarios |
| WINT-9140 | pending | Successor — WINT-9130 is a dependency of WINT-9140 (Phase 9 validation gate) |

### Constraints to Respect
- Output path specified in index: `docs/workflow/langraph-migration.md` (note: index has a typo — "langraph" vs "langgraph"; AC should address canonical path)
- Documentation must remain consistent with existing `docs/workflow/` structure (frontmatter, version, status: active)
- This is a documentation-only story — no code changes expected
- Protected: existing LangGraph implementation in `packages/backend/orchestrator/` must not be modified

---

## Retrieved Context

### Related Endpoints
None — this is a documentation-only story with no API surface.

### Related Components
None — no UI components involved.

### Reuse Candidates
| Artifact | Path | Reuse Pattern |
|----------|------|---------------|
| Workflow docs index | `docs/workflow/README.md` | Copy frontmatter format (title, version, created_at, updated_at, status, tags) |
| WINT-0220-STRATEGY.md | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | Strategy document structure with decision rationale and decision guide |
| Workflow README commands table | `docs/workflow/README.md` | Claude Code command list for feature comparison table |
| Existing LangGraph graphs | `packages/backend/orchestrator/src/graphs/` | Graph inventory for feature comparison |
| doc-sync SKILL.md lesson | `.claude/skills/doc-sync/SKILL.md` | Sibling docs-only pattern for formatting and versioning decisions |

### Similar Stories
| Story | Similarity | What to Borrow |
|-------|-----------|----------------|
| WINT-1050/WINT-1060 | Sibling docs-only command spec stories | Formatting decisions, sub-step insertion pattern, sibling-as-pattern-source lesson |
| WKFL-001/006/008 | Documentation-only stories | Lighter-weight review applies here (documentation quality check, not full TypeScript review) |
| WINT-0220-STRATEGY.md creation | Architecture doc story | Decision guide + feature comparison structure |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Workflow documentation frontmatter and structure | `docs/workflow/README.md` | Canonical format for all workflow docs — frontmatter schema, section ordering, Mermaid diagram style |
| Architecture/strategy doc with decision guide | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | Existing example of a decision rationale + comparison document in the orchestrator package |
| LangGraph graph implementation (elaboration) | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Representative LangGraph graph — shows graph structure to reference in feature comparison |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1050/WINT-1060]** Sibling story as parallel pattern source for docs-only specs (category: workflow)
  - *Applies because*: WINT-9130 is a documentation-only story. The implementer should read WINT-0220-STRATEGY.md and existing docs/workflow/*.md files first to resolve all formatting ambiguities before writing.

- **[WKFL-001/006/008]** Review phase waived for documentation-only stories (category: workflow)
  - *Applies because*: WINT-9130 delivers only a markdown file. The standard TypeScript code review pipeline provides no value here. Substitute a documentation quality check (formatting, cross-reference verification, schema validity) for code review.

- **[WINT-1050]** Docs-only versioning: sub-step insertion without renumbering (category: workflow)
  - *Applies because*: If this migration guide references step numbers in existing docs (e.g., workflow phases), use sub-step insertion (1a, 1b) rather than renumbering to avoid breaking external references.

- **[WINT-9020]** Native 7-phase LangGraph node implementation proves viable for subprocess-delegating agents (category: architecture)
  - *Applies because*: WINT-9130's feature comparison should include this as a concrete example of a completed Claude Code → LangGraph port with measurable parity metrics (42 tests, 86% coverage).

- **[WINT-9090]** TypeScript interfaces in LangGraph node files must be converted to Zod schemas (category: other)
  - *Applies because*: The migration guide should call this out as a known gotcha for implementers porting agents — all state extension types must use `z.object()`, not TypeScript interfaces.

### Blockers to Avoid (from past stories)
- Do not begin writing the feature comparison table before WINT-9120 (parity test suite) is complete — the comparison data must be grounded in test results, not assumptions
- Do not reference `_implementation/` file paths in the migration guide (lesson from KFMB-5010: agent output sections that reference _implementation/ become stale)
- Do not hardcode the file path as `docs/workflow/langraph-migration.md` without resolving the typo — the canonical spelling should be `langgraph-migration.md`

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Not directly applicable (docs-only story). No UAT infrastructure needed. |
| ADR-006 | E2E Tests Required in Dev Phase | Skip condition applies: `frontend_impacted: false`, no UI-facing acceptance criteria |

### Patterns to Follow
- Use YAML frontmatter with `title`, `version`, `created_at`, `updated_at`, `status: active`, `tags` (see `docs/workflow/README.md` template)
- Mermaid diagrams for workflow comparison visuals where helpful
- Cross-reference existing docs rather than duplicating content (link to `docs/workflow/README.md`, `docs/workflow/phases.md`, etc.)
- Decision guide must be opinionated: tell the reader which workflow to use for which scenario, not just list options

### Patterns to Avoid
- Do not duplicate content already in `docs/workflow/README.md` or `docs/workflow/phases.md` — link to them instead
- Do not create a feature comparison table with speculative data — only include rows backed by WINT-9120 parity test evidence
- Do not use TypeScript interfaces anywhere (though this is a docs-only story, if any YAML schema snippets are included, use Zod-style notation for consistency)

---

## Conflict Analysis

No blocking conflicts detected.

The only notable advisory: the index entry specifies `docs/workflow/langraph-migration.md` (typo: "langraph" missing the second "g"). The canonical LangGraph spelling is `langgraph`. The AC should resolve this explicitly — the story should create `docs/workflow/langgraph-migration.md` and note the index typo.

---

## Story Seed

### Title
Document Migration Path: Claude Code to LangGraph Workflow

### Description

**Context**: Phase 9 (LangGraph Parity) is delivering a complete parallel implementation of the WINT workflow system using LangGraph TypeScript graphs. By the time WINT-9130 is worked, WINT-9110 (full workflow graphs) and WINT-9120 (parity test suite) will be complete, providing evidence-backed data on feature parity between the Claude Code agent workflow and the LangGraph workflow.

**Problem**: Developers who want to adopt the LangGraph workflow — or who need to decide whether to use Claude Code agents or LangGraph graphs for a given use case — currently have no single authoritative reference. They must read scattered documents, inspect source code, and infer the comparison manually.

**Solution Direction**: Create `docs/workflow/langgraph-migration.md` as the definitive guide for the Claude Code → LangGraph transition. The document should cover:
1. A feature comparison table grounded in WINT-9120 parity test results
2. A decision guide explaining when to use each workflow
3. Step-by-step migration path for porting a Claude Code agent to a LangGraph node/graph
4. Known gotchas and lessons learned from Phase 9 porting work (e.g., Zod schema requirement, PostgresSaver.setup() pattern)
5. Links to canonical implementation examples (WINT-9020 doc-sync node, WINT-9090 context cache nodes)

### Initial Acceptance Criteria

- [ ] AC-1: File `docs/workflow/langgraph-migration.md` is created with YAML frontmatter matching the pattern in `docs/workflow/README.md` (title, version, created_at, updated_at, status: active, tags)
- [ ] AC-2: Feature comparison table lists all major workflow capabilities, with a "Supported in Claude Code", "Supported in LangGraph", and "Parity Verdict" column for each — data sourced from WINT-9120 test results
- [ ] AC-3: Decision guide section with clear, opinionated guidance for: (a) new greenfield workflows, (b) extending an existing Claude Code agent, (c) migrating an existing agent to LangGraph, (d) running both in parallel during transition
- [ ] AC-4: Step-by-step migration walkthrough covering: identify agent contract, implement as LangGraph node, wire into graph, add tests (following WINT-9020 doc-sync as the canonical example)
- [ ] AC-5: "Known Gotchas" section captures at minimum: Zod-first types requirement (no TypeScript interfaces in node files), PostgresSaver.setup() for checkpoint migrations, `@repo/workflow-logic` usage scope
- [ ] AC-6: Document cross-references existing `docs/workflow/` files correctly — does not duplicate content but links to phases.md, README.md, orchestration.md where appropriate
- [ ] AC-7: All Mermaid diagrams (if any) render correctly in standard GitHub Markdown preview
- [ ] AC-8: Index entry path typo (`langraph-migration.md`) is noted in the story and the canonical filename used is `langgraph-migration.md`; the stories.index.md entry is updated to match

### Non-Goals
- This story does not implement any LangGraph code — it is documentation only
- This story does not backfill incomplete parity items; it documents the state as of WINT-9120 completion
- This story does not define the LangGraph error handling strategy (that is WINT-9105's ADR)
- This story does not update any agent `.agent.md` files or skills
- This story does not gate on all Phase 9 stories being complete — only WINT-9120 (parity test suite) is a hard dependency

### Reuse Plan
- **Components**: None (docs-only)
- **Patterns**: YAML frontmatter from `docs/workflow/README.md`; decision guide structure from `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md`
- **Packages**: None

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
This is a documentation-only story. A traditional test plan is not applicable. Recommend substituting a **documentation quality checklist** in place of unit/integration tests:
- Frontmatter schema validity check (required fields present, valid status value)
- Cross-reference link validation (all linked docs/files exist)
- Feature comparison table completeness check (all WINT-9120 parity test dimensions covered)
- Mermaid diagram render verification
- No TypeScript interface patterns in any code snippets
Per KB lesson `0b577526`: full TypeScript code review pipeline should be waived or scoped to documentation quality only. Estimated token savings: 20,000–40,000 tokens.

### For UI/UX Advisor
Not applicable — this is a technical documentation story with no UI components. If a UX perspective is desired, focus on document readability: the decision guide must be scannable (use tables and short bullet points), and the migration walkthrough should use numbered steps with concrete before/after code examples.

### For Dev Feasibility
**Implementation is straightforward** — single markdown file, no code changes. Key feasibility notes:
- **Hard dependency**: Do not begin until WINT-9120 (parity test suite) is marked complete; the feature comparison table must be data-driven
- **Canonical example to study**: `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` and its corresponding test file `src/nodes/sync/__tests__/doc-sync.test.ts` are the best examples of a completed Claude Code → LangGraph port to reference in the migration walkthrough
- **Graphs inventory for comparison table**: Enumerate all graphs under `packages/backend/orchestrator/src/graphs/` to build the feature comparison (elaboration.ts, story-creation.ts, qa.ts, review.ts, metrics.ts, code-audit.ts, doc-graph.ts, merge.ts, etc.)
- **Existing workflow docs to link**: `docs/workflow/README.md` (commands), `docs/workflow/phases.md` (phase details), `docs/workflow/orchestration.md` (error handling), `docs/workflow/extending.md` (how to add phases/workers)
- **Filename correction**: Use `langgraph-migration.md` (correct spelling), not `langraph-migration.md` (index typo); update the stories.index.md infrastructure entry at the same time
- **E2E skip condition**: `frontend_impacted: false` — no E2E tests required (ADR-006 skip condition satisfied)
