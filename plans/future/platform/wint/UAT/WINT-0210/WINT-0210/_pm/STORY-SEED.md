---
generated: "2026-02-17"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0210

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No KB lessons loaded (no kb_search tool available in this context); ADRs loaded from plans/stories/ADR-LOG.md

### Relevant Existing Features
| Feature | Location | Relevance |
|---------|----------|-----------|
| YAML artifact persistence with Zod validation | `packages/backend/orchestrator/src/artifacts/` | Role packs are a similar config artifact pattern |
| `.claude/schemas/` directory | `.claude/schemas/*.yaml` | Existing schema patterns for agent configs |
| `.claude/config/` directory | `.claude/config/*.yaml` | Existing config pattern (model-assignments.yaml, preferences.yaml, etc.) |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated artifact precedent |

### Active In-Progress Work
| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-0180 (Define Examples + Negative Examples Framework) | ready-to-work | Direct dependency — must complete before WINT-0210 |
| WINT-0190 (Create Patch Queue Pattern and Schema) | pending, depends on WINT-0180 | Direct dependency — patch-plan.schema.json feeds dev role pack |
| WINT-0200 (Create User Flows Schema) | pending, depends on WINT-0180 | Direct dependency — user-flows schema feeds PO role pack |
| WINT-1011 (Compatibility Shim Core Functions) | in-progress | No overlap |
| WINT-1140 (Worktree into dev-implement-story) | in-progress | No overlap |
| WINT-1150 (Worktree Cleanup into Story Completion) | in-progress | No overlap |

### Constraints to Respect
- Role pack files must target 150-300 tokens each — this is a hard cap from the index feature description
- The `.claude/prompts/role-packs/` directory does not yet exist and must be created
- WINT-0210 cannot start until WINT-0180 (framework), WINT-0190 (patch queue schema), and WINT-0200 (user flows schema) are all complete
- No TypeScript interfaces allowed — Zod-first types for any code artifacts (not applicable to .md role packs, but relevant if schema validation is added)
- Role packs are markdown prompt files, not code; no test coverage requirement applies to the files themselves

---

## Retrieved Context

### Related Endpoints
None — this story creates prompt configuration files, not API endpoints.

### Related Components
None — this story creates markdown prompt files under `.claude/prompts/`.

### Reuse Candidates
| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `.claude/schemas/agent-hints-schema.yaml` | `.claude/schemas/agent-hints-schema.yaml` | Pattern for structured YAML/MD config files in .claude/ |
| `.claude/config/model-assignments.yaml` | `.claude/config/model-assignments.yaml` | Pattern for role-specific config files in .claude/config |
| Existing agent `.agent.md` files | `.claude/agents/` | Role definitions used in these files show what "dev", "qa", "po", "da" roles mean in this workflow |
| `plans/stories/ADR-LOG.md` patterns | ADR-005, ADR-006 | QA role pack must reference "AC→Evidence trace" and real-service testing |
| WINT-0180 framework (when complete) | `.claude/prompts/role-packs/` | Will define max 2 positive + 1 negative example per role, 10-25 line pattern skeleton |
| WINT-0190 patch-plan.schema.json (when complete) | `schemas/patch-plan.schema.json` | Dev role pack must reference Patch Queue + Repair Loop patterns from this schema |
| WINT-0200 user-flows.schema.json (when complete) | `schemas/user-flows.schema.json` | PO role pack hard caps reference this schema |

### Similar Stories
| Story | Similarity | Lesson |
|-------|-----------|--------|
| WINT-0180 | Parent framework | Establishes format constraints: 10-25 line skeleton, max 2 positive + 1 negative example |
| WINT-0150 (doc-sync Skill) | Config file creation pattern | Creating new config artifacts in `.claude/` follows existing established patterns |

---

## Knowledge Context

### Lessons Learned
No KB lessons retrieved (tool unavailable). Knowledge inferred from codebase patterns:

- **Token budget is a first-class constraint.** The 150-300 token cap per role pack is explicitly stated in both the feature description and goal. Every word in each role pack must earn its place.
- **Hard caps must be enforced mechanically, not by convention.** PO (max 5 findings, max 2 blocking) and DA (max 5 challenges, cannot challenge blocking items) caps are meaningless unless the role pack explicitly states them as MUST constraints, not suggestions.
- **Negative examples are required.** WINT-0180 framework mandates 1 negative example per role. Without a negative example showing the wrong behavior, agents default to verbosity and scope creep.
- **QA evidence trace must be explicit.** ADR-005 (UAT must use real services) and ADR-006 (E2E tests required in dev phase) require that QA agents understand AC→Evidence trace. The ac-trace.json output format must be specified, not assumed.

### Blockers to Avoid
- Starting implementation before WINT-0180, WINT-0190, and WINT-0200 are complete — the role packs must reference actual schema filenames and pattern names defined by those stories
- Making role packs too long — exceeding 300 tokens defeats the purpose of context reduction
- Making role packs too vague — "be thorough" instructions without specific caps and examples will not change agent behavior
- Writing role packs without negative examples — positive-only instructions leave agents to define "minimum viable" themselves
- Writing PO/DA caps as soft guidance ("aim for max 5") rather than hard stops ("MUST NOT exceed 5")

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services — QA role pack must reference this; ac-trace.json must include evidence fields linked to real test results |
| ADR-006 | E2E Tests Required in Dev Phase | Dev role pack should note E2E test requirement as part of done definition |

### Patterns to Follow
- Markdown prompt files in `.claude/prompts/role-packs/` (directory to be created)
- Hard caps expressed as "MUST NOT" constraints, not suggestions
- Pattern skeleton: 10-25 lines (from WINT-0180 framework)
- One negative example per role (from WINT-0180 framework)
- Reference to schema files by relative path (e.g., `schemas/patch-plan.schema.json`)

### Patterns to Avoid
- Verbose role instructions that exceed 300 tokens
- Soft guidance instead of hard caps for PO/DA roles
- QA role packs that don't specify the ac-trace.json output format
- Dev role packs that omit the Repair Loop pattern (fix only referenced errors)

---

## Conflict Analysis

### Conflict: Dependency Blocker (Warning)
- **Severity**: warning (non-blocking for seed generation, blocking for implementation)
- **Description**: WINT-0210 depends on WINT-0180 (ready-to-work), WINT-0190 (pending), and WINT-0200 (pending). All three must complete before WINT-0210 can be implemented. Role packs must reference specific schema filenames and pattern names established by those stories.
- **Resolution Hint**: Story can be fully seeded and elaborated now. Implementation gate: verify WINT-0180, WINT-0190, and WINT-0200 are in UAT/complete status before dev phase begins. If schemas from WINT-0190/WINT-0200 are not yet named, use placeholder references and update during dev setup.

---

## Story Seed

### Title
Populate Role Pack Templates for Dev, PO, DA, and QA Roles

### Description

The workflow currently provides no focused, role-specific instruction sets for agents. Each agent spawning session must derive role expectations from full agent files (which are long) or from system prompts (which are generic). This leads to scope creep, vibes-based approvals, and inconsistent enforcement of hard caps.

WINT-0180 will establish the framework (skeleton format, example constraints, injection mechanism). WINT-0190 will create the Patch Queue + Repair Loop schema for dev. WINT-0200 will create the User Flows schema for PO. WINT-0210 uses those foundations to produce the actual role pack files.

Each role pack is a focused markdown file targeting 150-300 tokens that is injected at agent spawn time. Role packs use the pattern skeleton format from WINT-0180: decision rule, proof requirement, max 2 positive examples, 1 negative example. Four role packs are in scope:

- **dev.md**: Patch Queue pattern (from WINT-0190 schema), Reuse Shared Packages pattern, Repair Loop pattern
- **po.md**: Hard caps (max 5 findings per session, max 2 may be blocking), references user-flows schema (WINT-0200)
- **da.md**: Hard caps (max 5 challenges, cannot challenge blocking items), focused challenge format
- **qa.md**: AC→Evidence trace pattern, ac-trace.json output format specification

The goal is behavior change, not documentation: agents reading these role packs must produce measurably different outputs — fewer mega-patches, fewer vague approvals, fewer uncapped finding lists, consistent evidence trace formatting.

### Initial Acceptance Criteria

- [ ] AC-1: `.claude/prompts/role-packs/` directory created with 4 role pack files: `dev.md`, `po.md`, `da.md`, `qa.md`
- [ ] AC-2: `dev.md` references Patch Queue pattern from `schemas/patch-plan.schema.json` (WINT-0190 output), includes Reuse Shared Packages pattern, and includes Repair Loop pattern (fix only referenced errors, minimal changes, rerun until green)
- [ ] AC-3: `dev.md` includes 1 positive example (correct patch ordering: types→API→UI→tests→cleanup) and 1 negative example (anti-pattern: mega-patch touching multiple layers in one diff)
- [ ] AC-4: `po.md` hard caps are expressed as MUST NOT constraints: MUST NOT exceed 5 findings per session, MUST NOT mark more than 2 findings as blocking; references user-flows.schema.json (WINT-0200 output)
- [ ] AC-5: `po.md` includes 1 positive example (focused 3-finding report with clear blocking/non-blocking split) and 1 negative example (bloated finding list with everything marked blocking)
- [ ] AC-6: `da.md` hard caps are expressed as MUST NOT constraints: MUST NOT exceed 5 challenges, MUST NOT challenge any item already marked blocking by PO
- [ ] AC-7: `da.md` includes 1 positive example (targeted 2-challenge scope reduction) and 1 negative example (challenging a blocking item or raising trivial concerns)
- [ ] AC-8: `qa.md` specifies AC→Evidence trace pattern: each AC must map to at least one evidence item (test result, log entry, or screenshot reference)
- [ ] AC-9: `qa.md` specifies ac-trace.json output format with required fields: `ac_id`, `evidence_type` (test|log|screenshot), `evidence_ref`, `verdict` (pass|fail|blocked)
- [ ] AC-10: `qa.md` includes 1 positive example (ac-trace.json with 3 ACs fully traced) and 1 negative example (verdict without evidence reference)
- [ ] AC-11: Every role pack file is between 150 and 300 tokens (verified via token counting tool or word estimation — 150-300 tokens ≈ 110-225 words)
- [ ] AC-12: Role packs use the 10-25 line skeleton format established by WINT-0180 (decision rule, proof requirement, positive example, negative example)

### Non-Goals
- Creating the injection mechanism that reads and inserts role packs at agent spawn time — this is WINT-2010 (Role Pack Sidecar) in Phase 2
- Creating role packs for roles beyond dev, po, da, qa (e.g., architect, pm-bootstrap) — deferred
- Writing tests for the role pack markdown files themselves — they are prompt text, not code
- Defining how role packs are versioned in the database — deferred to WINT-2010
- Modifying any existing agent files to use role packs — agents will consume packs when the sidecar is live in Phase 2
- Expanding the user-flows schema (WINT-0200) or patch-plan schema (WINT-0190) — those are upstream dependencies, not in scope here

### Reuse Plan
- **Components**: None — this story creates markdown prompt files only
- **Patterns**: 10-25 line skeleton from WINT-0180; MUST NOT constraint pattern from existing ADR language
- **Packages**: None
- **Schema references**: `schemas/patch-plan.schema.json` (WINT-0190), `schemas/user-flows.schema.json` (WINT-0200)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Verifiable ACs are: token count per file (AC-11), file existence in correct path (AC-1), presence of required hard cap language in po.md and da.md (AC-4, AC-6), presence of ac-trace.json schema in qa.md (AC-9)
- Token counting: use a simple word count estimation (1 token ≈ 0.75 words, so 150-300 tokens ≈ 110-225 words); or use Claude's tokenizer via a small script
- Test plan should verify that the WINT-0180 skeleton format (decision rule, proof requirement, examples) is structurally present in each file
- AC-12 can be verified by grepping for required structural sections in each file

### For UI/UX Advisor
- No UI surface — these are markdown files injected at agent spawn time
- The "UX" concern here is the agent reading experience: role packs must be scannable in one pass, with the hard cap front-loaded, not buried in examples

### For Dev Feasibility
- This is a documentation-only story — no TypeScript, no database changes, no API work
- Only risk: waiting for WINT-0190 and WINT-0200 schemas to have finalized filenames before writing path references in role packs
- If WINT-0190 or WINT-0200 are delayed, dev can write role packs with placeholder schema paths and update them in a single pass once schemas are named
- Estimated effort: 2-4 hours for 4 focused markdown files once dependency stories complete
- Token counting verification adds ~30 minutes
- Total points estimate: 1 point (pure docs, no code)
