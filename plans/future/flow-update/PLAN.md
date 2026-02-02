You are working in my monorepo’s Claude workflow system. I have already refactored PM story generation and Elab into a structured “phase leader” pattern. I now want you to refactor the **Dev → Code Review → QA Verify cycle** the same way to reduce token usage, reduce re-reading, and make retries artifact-driven.

IMPORTANT: Before implementing, you MUST perform an **audit of current commands and agents** and propose a reconfiguration that better fits the new flow. Do not blindly preserve legacy structure if it conflicts with the new evidence-first design.

# Non-negotiables
- Preserve existing user-facing commands and semantics as much as possible:
  - `/dev-implement-story STORY-XXX` remains the main entry point.
  - `/dev-code-review STORY-XXX` remains available as standalone.
  - `/qa-verify-story STORY-XXX` remains available.
- Token savings is the primary goal:
  - Minimize reads per phase.
  - Use structured artifacts to avoid re-discovery.
  - Fresh context between phases, but rely on artifacts.
- Commands mutate story state; “skills” produce evidence only.
- New artifacts must be deterministic, diff-friendly, and short.
- Prefer YAML for artifacts (human + machine readable).

# Phase 0: AUDIT (must do first)
## 0A) Inventory what exists (commands + agents)
You must:
1) List all relevant command files (paths) for:
   - dev implementation
   - code review
   - QA verify
   - QA gate (if it consumes artifacts from these)
   - token logging (if used)
2) List all relevant agent files (paths) used by those commands.
3) For each command:
   - inputs it reads
   - outputs it writes
   - status transitions it performs
   - which agents it spawns
   - which parts are redundant or re-reading too much

Deliverable: `plans/workflow-audit/DEV_REVIEW_QA_AUDIT.md`
Include:
- a table of commands and their responsibilities
- a table of agents and the phase they belong to
- a “duplication map” (where the same info is read or recomputed multiple times)
- token-risk hotspots (where context bloat is likely)

## 0B) Propose a reconfigured command/agent architecture
Based on the audit, propose the new mapping:
- Which commands remain, which become thin wrappers
- Which existing agents can be reused vs replaced
- Which new phase leaders must be created
- Which workers should be merged, deleted, or made diff-aware
- Where “knowledge context” should be loaded once and reused
- Where token logging should be centralized

Deliverable: `plans/workflow-audit/DEV_REVIEW_QA_REDESIGN.md`
Must include:
- BEFORE/AFTER diagrams (Mermaid):
  - current dev/review/qa flow
  - proposed flow
- New phase boundaries
- New artifact contract (EVIDENCE bundle)
- A “migration plan” (step-by-step) that keeps system working during refactor
- Decision log: what you changed and why (token savings rationale)

Only after these two audit deliverables exist, proceed to implementation.

# High-level design change (core idea)
Introduce an “Evidence Bundle v1” that becomes the single source of truth:
- `_implementation/EVIDENCE.yaml`
Downstream phases (Review + QA) read EVIDENCE first and only open deeper docs on demand.

Also integrate:
- Lessons learned (prior stories / KB) and ADR constraints (ADR-LOG.md) into:
  - Dev planning
  - Review focus selection
  - QA verify edge-case selection
- Write back new learnings at completion (dedupe).

# New/Updated Artifacts (minimum set)
In `plans/stories/{STORY-ID}/_implementation/` create/update:

1) `CHECKPOINT.yaml`
- current_phase
- iteration counters (review/fix loop)
- last_successful_phase
- timestamps
- resume hints

2) `SCOPE.yaml`
- touches_backend, touches_frontend, touches_packages, touches_db, touches_contracts, touches_ui
- touched_paths_globs
- risk_flags (auth, payments, migrations, etc.)

3) `PLAN.yaml`
- steps[]
- files_to_change[]
- commands_to_run[] (build, test, lint, typecheck, migrations if needed)
- acceptance_criteria_map[] (AC id → planned evidence source)

4) `KNOWLEDGE-CONTEXT.yaml`
- lessons_applied[]
- adrs_checked[]
- attack_vectors[]
- do_not_repeat mistakes

5) `EVIDENCE.yaml`  (single source of truth)
- story_id, version, timestamp
- acceptance_criteria[]:
  - ac_id
  - evidence_items[] (command outputs, file paths, screenshots/video paths, endpoints tested)
  - status: PASS|MISSING
- touched_files[]
- commands_run[] (command + result + timestamp)
- endpoints_exercised[]
- notable_decisions[]
- known_deviations[]
- token_summary (per phase)

6) `REVIEW.yaml`
- aggregated review results
- ranked patch list (top 3 must-fix first)

7) `QA-VERIFY.yaml`
- AC verification mapping references EVIDENCE
- gate verdict and fixes

Also keep:
- `PROOF-{STORY}.md` generated from EVIDENCE (no new reasoning).

# Integrate Lessons Learned + ADR Logs
We already have:
- lessons learned files and/or KB tools (kb_search, kb_add)
- ADR log: `plans/stories/ADR-LOG.md`

Implement a reusable loader used by Dev planning / Review / QA:
- `load-knowledge-context.ts` (or reuse existing)
Inputs:
- story_id
- scope (backend/frontend/packages)
- touched domains inferred from SCOPE.yaml
Outputs:
- KNOWLEDGE-CONTEXT.yaml
Behavior:
- If KB tools available: kb_search for relevant lessons
- Always parse ADR-LOG.md for constraints relevant to scope
- If KB unavailable: silent fallback to local lessons + defaults
- Deduplicate lessons
- Never block workflow

Write-back:
- At end of `/dev-implement-story` and/or `/qa-verify-story`, spawn kb-writer (or equivalent) to add new learnings (dedup first).

# Phase leader refactor: what to build
Refactor each command into phase-leader pattern like PM + Elab.

## A) `/dev-implement-story`
Create 4 leaders + optional workers.

Phase 0: `dev-setup-leader.agent.md` (haiku)
- Validate story state and required dirs.
- Create/refresh CHECKPOINT.yaml + SCOPE.yaml.
- Minimal reads: story frontmatter + AC headings only.
- Determine resume/skip.

Phase 1: `dev-plan-leader.agent.md` (sonnet or haiku if simple)
- Generate PLAN.yaml.
- Call knowledge loader → KNOWLEDGE-CONTEXT.yaml.
- PLAN must reference ADR constraints and lessons applied.
- Optional: render `IMPLEMENTATION-PLAN.md` from PLAN.yaml.

Phase 2: `dev-execute-leader.agent.md` (sonnet)
- Use PLAN + SCOPE + KNOWLEDGE-CONTEXT only.
- Spawn targeted coders only for impacted slices.
- Each coder writes:
  - `CHANGES.<slice>.yaml`
  - `COMMANDS.<slice>.yaml`
  - `NOTES.<slice>.md` (tiny)
- Merge into EVIDENCE.yaml.
- Update CHECKPOINT.yaml.

Phase 3: `dev-proof-leader.agent.md` (haiku)
- Generate `PROOF-{STORY}.md` from EVIDENCE.yaml.
- Validate completeness: no missing AC evidence.
- No new reasoning.

Integrated review/fix loop:
- After Phase 3, invoke `/dev-code-review` internally and loop fixes up to N.
- Fix loop must NOT reread story; it uses REVIEW.yaml + EVIDENCE.yaml.
- Each fix iteration updates EVIDENCE.yaml.

## B) `/dev-code-review` (standalone)
Refactor into:
Phase 0: `review-setup-leader.agent.md` (haiku)
- Read only EVIDENCE.yaml + SCOPE.yaml + touched files.
- Decide which review workers to run (diff-aware).
- Spawn selected workers in parallel.

Phase 1: Review workers (haiku), updated to:
- use touched file lists to scope checks
- YAML only output

Phase 2: `review-aggregate-leader.agent.md` (haiku)
- Merge worker outputs into REVIEW.yaml.
- Produce ranked patch list.
- Update CHECKPOINT.yaml.

## C) `/qa-verify-story`
Refactor into:
Phase 0: `qa-verify-setup-leader.agent.md` (haiku)
- Validate preconditions.
- Read EVIDENCE.yaml + REVIEW.yaml verdict only.
- Update status/dirs.

Phase 1: `qa-verify-verification-leader.agent.md` (sonnet constrained)
- Verify ACs primarily via EVIDENCE mapping.
- Only open PROOF/logs if AC evidence is MISSING or suspicious.
- Use KNOWLEDGE-CONTEXT for edge cases/regressions.
- Produce QA-VERIFY.yaml and verdict.

Phase 2: `qa-verify-completion-leader.agent.md` (haiku)
- Update status/dirs.
- Trigger kb-writer for notable learnings (dedup first).
- Append token summary.

# Token reduction rules
- Setup/aggregation/proof phases MUST use haiku.
- Sonnet only for plan reasoning, coding, QA judgment.
- No phase rereads full story if PLAN+EVIDENCE exist.
- Each phase logs token usage into EVIDENCE.yaml.

# Acceptance criteria for this refactor
1) Audit docs exist and are accurate for current codebase.
2) Redesign doc proposes a coherent remapping with token rationale.
3) All three commands work end-to-end with new artifacts.
4) Review and QA can run with only EVIDENCE + minimal reads in common case.
5) Resume works via CHECKPOINT.yaml.
6) Knowledge integration is active (plan/review/qa use it; completion writes back).
7) Fewer redundant reads and fewer unnecessary review workers.

# Output required from you (Claude)
- First: the two audit deliverables (DEV_REVIEW_QA_AUDIT.md + DEV_REVIEW_QA_REDESIGN.md)
- Then: a list of files to create/modify
- Then: complete contents for each new/modified file (ready to paste)

Start with Phase 0 audit now. Do not jump to implementation until the audit deliverables are written.
