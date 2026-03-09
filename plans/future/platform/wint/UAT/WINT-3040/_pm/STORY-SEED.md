---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-3040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: The baseline predates WINT-0040 (hitl_decisions table) and WINT-0120 (telemetry MCP tools), both of which are dependencies. Both are confirmed complete or near-complete by reading their story files directly.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Embedding generation infrastructure already in place for `knowledgeEntries`; pattern is directly reusable |
| `hitl_decisions` table | `packages/backend/database-schema/src/schema/wint.ts:947` | Primary write target for this story; has `embedding vector(1536)` column ready |
| `workflow_log_decision` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Added by WINT-0120; accepts optional `embedding` as `number[]`; WINT-3040 enriches calls to this tool with real embeddings |
| Invocation logging skill | `.claude/skills/telemetry-log/SKILL.md` | Added by WINT-3020; sibling skill; canonical SKILL.md structure to follow |
| `token-log` skill | `.claude/skills/token-log/SKILL.md` | Lighter-weight sibling skill; provides minimal SKILL.md reference format |
| OpenAI text-embedding-3-small | `apps/api/knowledge-base/src/` | Already configured for 1536-dim embeddings in KB; embedding client is available |
| MCP tool registration pattern | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` + `tool-handlers.ts` | 60+ tools already registered; pattern is well-established |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0120 (Telemetry MCP Tools) | `in-progress` | DIRECT dependency — this story is the unblocking prerequisite; `workflow_log_decision` handler must exist and accept `embedding` before WINT-3040 can call it |
| WINT-3020 (Invocation Logging Skill) | `needs-code-review` | Sibling skill story; defines the `telemetry-log` SKILL.md structure WINT-3040's `telemetry-decision` skill should follow |
| WINT-3030 (telemetry-logger Agent) | `needs-code-review` | No direct overlap; WINT-3040 is a skill (human-triggered), not an agent-triggered tool |
| WINT-3010 (Gatekeeper Sidecar) | `ready-for-code-review` | No overlap; separate Phase 3 component |

### Constraints to Respect

- `hitl_decisions` table lives in `lego_dev` (port 5432), NOT the KB database (port 5433) — ARCH-001, confirmed by WINT-0040 architecture notes
- Embedding generation uses OpenAI `text-embedding-3-small` (1536 dimensions) — matches the vector column definition exactly
- No barrel file imports (CLAUDE.md); import directly from `packages/backend/database-schema/src/schema/wint.ts`
- All types via Zod schemas, no TypeScript interfaces (CLAUDE.md)
- Skill files live at `.claude/skills/{name}/SKILL.md` (established pattern)
- `workflow_log_decision` MCP tool (WINT-0120) already accepts `embedding: number[]` as optional — WINT-3040 generates and provides it; it does NOT add a new MCP tool
- The `telemetry-decision` skill is human-triggered (like `token-log`), not fired by LangGraph nodes

---

## Retrieved Context

### Related Endpoints

None — this story creates a skill (a Claude command instruction file) that calls an existing MCP tool (`workflow_log_decision`). No HTTP endpoints are added or modified.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `workflow_log_decision` handler | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | The MCP tool this skill wraps; accepts `decisionType`, `decisionText`, `operatorId`, `storyId`, and optional `embedding` |
| `workflow_log_decision` schema | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Input schema definition for the MCP tool |
| `hitlDecisions` Drizzle table | `packages/backend/database-schema/src/schema/wint.ts:947` | DB table being written to; `embedding vector(1536)` column is the novel element |
| `insertHitlDecisionSchema` | `packages/backend/database-schema/src/schema/wint.ts:~1898` | Zod insert schema for type reference |
| KB embedding client | `apps/api/knowledge-base/src/` | Used internally by KB server for `knowledgeEntries`; same infrastructure needed for decision embeddings |
| `telemetry-log` skill | `.claude/skills/telemetry-log/SKILL.md` | Direct structural template for new `telemetry-decision` SKILL.md |
| `token-log` skill | `.claude/skills/token-log/SKILL.md` | Lighter-weight canonical SKILL.md format reference |

### Reuse Candidates

- **SKILL.md structure**: Copy structure from `.claude/skills/telemetry-log/SKILL.md` — same sections (usage, arguments, task, output, error-handling, examples)
- **Embedding generation pattern**: Reuse how KB server calls OpenAI `text-embedding-3-small`; the model and dimension are already validated in production
- **Zod schema exports**: `insertHitlDecisionSchema` from `wint.ts` provides the authoritative field list for skill argument documentation
- **Error handling pattern**: `errorToToolResult` from `apps/api/knowledge-base/src/mcp-server/error-handling.ts` — already used by `workflow_log_decision` handler; skill should document fallback when embedding fails

### Similar Stories

| Story | Similarity | Takeaway |
|-------|-----------|----------|
| WINT-3020 (telemetry-log skill) | Near-identical pattern; logs agent invocations | Follow exact SKILL.md structure; use same argument table format |
| WINT-0120 (Telemetry MCP Tools) | Created `workflow_log_decision` tool this story calls | Understand `embedding` optional field handling; MCP tool is already ready |
| WINT-0040 (hitl_decisions table) | Created target table | Architecture notes on `storyId` text type, nullable `invocationId`, ivfflat index |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Skill SKILL.md structure | `.claude/skills/telemetry-log/SKILL.md` | Direct structural template — same sections, argument table format, MCP call block, error-handling section. WINT-3040 should follow this exactly with decision-specific parameters. |
| MCP tool call with optional embedding | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Shows how `workflow_log_decision` accepts optional `embedding: number[]` — the skill must construct this array before calling the tool |
| KB embedding generation | `apps/api/knowledge-base/src/` | Existing OpenAI text-embedding-3-small invocation; same model, same dimension (1536) |
| Lightweight SKILL.md format | `.claude/skills/token-log/SKILL.md` | Minimal canonical skill file; useful baseline for section ordering and conciseness |

---

## Knowledge Context

### Lessons Learned

- **[WINT-0040]** `hitl_decisions.storyId` is text type — JOIN to `wint.stories.story_id` is valid (both text, no cast needed) — applies because the skill will reference storyId as a string argument
  - *Applies because*: Skill documentation should note storyId is a plain string like `'WINT-3040'`, not a UUID

- **[WINT-0040]** `hitlDecisions.invocationId` is nullable — HITL decisions may occur outside an agent invocation (e.g., manual human operator review)
  - *Applies because*: The skill's `invocationId` argument should be optional; skill must not require it

- **[WINT-1060]** Telemetry hook pre-wire — `hitl_decisions` table definitions in `wint.ts` should carry JSDoc write-point comments for WINT-3070
  - *Applies because*: WINT-3040 is exactly one of those planned write points; the pre-wire comments should have already been placed by WINT-0040 implementer; dev should confirm and reference them

- **[WINT-2050]** Structured telemetry should wait for Phase 3 infrastructure before being added to earlier stories
  - *Applies because*: This story IS the Phase 3 infrastructure for HiTL decision logging; downstream workflow commands will call this skill post-WINT-3040

- **[HiTL gates lesson]** Pending HiTL ACs are not QA failures — QA verifies automated coverage; HiTL sign-off is downstream
  - *Applies because*: Test plan for this story should not block QA pass on embedding generation latency being variable

### Blockers to Avoid (from past stories)

- Assuming WINT-0120 migration is applied — confirm `hitl_decisions` table exists in dev DB before integration tests
- Tool count drift in `mcp-integration.test.ts` — WINT-3040 does NOT add a new MCP tool (it calls the existing `workflow_log_decision`), so tool count assertion is unaffected
- Embedding generation latency as a test blocker — test plan must mock OpenAI in unit tests; only integration tests should call real embedding API
- Confusing the KB database (port 5433) with the lego_dev database (port 5432) — `hitl_decisions` is in lego_dev (5432)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — embedding generation must run against real OpenAI in UAT |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable — this story has no UI (`frontend_impacted: false`); skill is invoked via Claude, not Playwright |

### Patterns to Follow

- SKILL.md files have frontmatter (`created`, `updated`, `version`, `name`, `description`, `kb_tools`) followed by sections: Usage, Arguments, Task, Output, Error Handling, Examples
- Embedding generation is done BEFORE calling `workflow_log_decision`; the embedding array is passed in the `embedding` field
- The skill should be fire-and-forget for embedding failure: if OpenAI is unavailable, log the decision WITHOUT embedding (graceful degradation) rather than blocking the workflow
- All MCP calls use the `mcp__knowledge-base__workflow_log_decision` tool name convention

### Patterns to Avoid

- Do NOT add a new MCP tool — `workflow_log_decision` already exists in WINT-0120; this story only adds a skill that calls it
- Do NOT generate embeddings server-side in the MCP handler (that is WINT-3040 scope at the skill/Claude layer, not the Lambda layer)
- Do NOT require embedding generation to succeed for the skill to complete — embedding adds latency and can fail; the decision text is the primary data
- Do NOT use port 5433 (KB database) for hitl_decisions — those tables are in lego_dev (port 5432)

---

## Conflict Analysis

### Conflict: Dependency not yet complete
- **Severity**: warning
- **Description**: WINT-0120 (which creates `workflow_log_decision` MCP tool) is `in-progress` at seed time. WINT-3040 is gated on WINT-0120 being merged and its tools available in the MCP server. The story index correctly lists WINT-0120 as the dependency.
- **Resolution Hint**: Story should remain in `backlog` until WINT-0120 moves to `completed` or `UAT`. No implementation can begin until `workflow_log_decision` is callable. The story's `depends_on: WINT-0120` already reflects this correctly.

---

## Story Seed

### Title

Implement Decision Logging Skill (`telemetry-decision`) with Embedding Generation

### Description

**Context:** The wint platform has the `hitl_decisions` table (WINT-0040) and the `workflow_log_decision` MCP tool (WINT-0120) in place. Human-in-the-loop decisions made during story review, QA, and sign-off phases are valuable training data for the preference learning system — but currently there is no standardized way for an operator to log a decision from a Claude session with the semantic embedding that enables similarity search over past decisions.

**Problem:** When a human operator makes a decision (approve, reject, request_changes, escalate) during story review, that decision and its rationale exist only in conversation context. Without a skill that captures it as a structured record with a context embedding, the `hitl_decisions` table remains empty, and the preference learning goal of the WINT epic cannot be realized.

**Proposed Solution:** Create a `.claude/skills/telemetry-decision/SKILL.md` skill that:
1. Accepts the structured decision fields (decisionType, decisionText, storyId, operatorId, optional invocationId and context)
2. Generates a `text-embedding-3-small` (1536-dim) embedding from the decision text and context using the OpenAI API
3. Calls `mcp__knowledge-base__workflow_log_decision` with all fields including the embedding
4. Handles embedding failure gracefully by falling back to logging without embedding (decision data is not lost)

This is a documentation-first story: the primary deliverable is the SKILL.md file. No new MCP tools, no Lambda changes, no DB schema changes.

### Initial Acceptance Criteria

- [ ] **AC-1:** `telemetry-decision` skill file exists at `.claude/skills/telemetry-decision/SKILL.md` with valid frontmatter (`created`, `updated`, `version`, `name`, `description`) and all required sections: Usage, Arguments, Task, Output, Error Handling, Examples
- [ ] **AC-2:** SKILL.md documents all arguments matching `insertHitlDecisionSchema`: `decisionType` (required, enum: approve/reject/request_changes/escalate), `decisionText` (required, operator's reasoning), `storyId` (required, the story being reviewed), `operatorId` (required, human identifier), `invocationId` (optional, UUID), `context` (optional, free-form context snapshot)
- [ ] **AC-3:** SKILL.md Task section specifies that the skill generates a `text-embedding-3-small` (1536-dim) embedding from the concatenation of `decisionText` and `context` (if provided) BEFORE calling the MCP tool
- [ ] **AC-4:** SKILL.md documents the embedding failure fallback: if OpenAI is unavailable or returns an error, call `workflow_log_decision` without the `embedding` field (do not block the decision log)
- [ ] **AC-5:** SKILL.md Error Handling section specifies that if `workflow_log_decision` MCP tool returns an error, the skill reports the error to the operator with the full error text and does not silently fail
- [ ] **AC-6:** SKILL.md includes at least 2 worked examples: one happy-path (approve with full context + embedding), one degraded-path (decision logged without embedding due to OpenAI unavailability)
- [ ] **AC-7:** SKILL.md documents that `hitl_decisions` stores in `lego_dev` (port 5432), NOT the KB database (port 5433), so operators know which environment must be running
- [ ] **AC-8:** SKILL.md frontmatter `kb_tools` field lists `mcp__knowledge-base__workflow_log_decision` as the sole MCP dependency
- [ ] **AC-9:** All existing tests pass with no regressions (this story adds a docs-only artifact; no code changes expected)

### Non-Goals

- Do NOT create a new MCP tool — `workflow_log_decision` already exists from WINT-0120
- Do NOT modify `tool-handlers.ts`, `tool-schemas.ts`, or any Lambda code
- Do NOT modify the `hitl_decisions` Drizzle schema in `wint.ts`
- Do NOT implement server-side embedding generation in the MCP handler — embedding is generated at the skill/Claude layer
- Do NOT create a LangGraph node or agent for automated decision logging — that is WINT-3030/3070 scope
- Do NOT add a Playwright E2E test — no UI is involved
- Do NOT generate embeddings for the `storyOutcomes` table — that is separate (WINT-3050 scope)

### Reuse Plan

- **Skills**: Copy SKILL.md structure from `.claude/skills/telemetry-log/SKILL.md` (WINT-3020 deliverable) — same section order, same argument table format
- **Patterns**: OpenAI text-embedding-3-small call pattern from KB server; 1536-dim vector construction
- **Packages**: `mcp__knowledge-base__workflow_log_decision` tool (WINT-0120); `insertHitlDecisionSchema` Zod type from `@repo/database-schema` for argument documentation accuracy

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a **docs-only story** — the primary deliverable is a SKILL.md file, not TypeScript code
- Test strategy should be: manual validation of SKILL.md structure against `telemetry-log/SKILL.md` format; manual smoke test of the skill invocation against real DB with WINT-0120 migration applied
- Unit tests are not applicable (no code to test); integration test = call the skill, verify row in `wint.hitl_decisions` with non-null embedding and non-null decision fields
- ADR-005 applies to UAT: embedding generation must use real OpenAI in UAT (no mocks); confirm `OPENAI_API_KEY` is set in test environment
- The embedding latency risk noted in the index should be documented in the test plan as an expected performance characteristic (~200-500ms for OpenAI call), not a failure condition
- WINT-0120 migration precondition: MC-1 equivalent — confirm `hitl_decisions` table exists in dev DB before integration testing

### For UI/UX Advisor

- No UI component — this is a skill (Claude command text file); UI/UX review not applicable
- The "UX" of this story is the SKILL.md argument table clarity: operator must understand what to pass for `decisionType`, `operatorId`, and `context`; the document should use concrete examples with realistic values (not placeholder strings)
- Consider the operator workflow: when does a human invoke this skill? Immediately after reviewing a story (during QA gate, sign-off, or code review). The examples should reflect these real use cases.

### For Dev Feasibility

- This story is **docs-only** (SKILL.md only); no TypeScript implementation required
- Primary risk: WINT-0120 dependency — confirm `workflow_log_decision` tool name exactly matches what will be in the registered tools list (the skill's MCP call block must use the exact tool name)
- Secondary risk: embedding generation step requires Claude (the skill executor) to have OpenAI access — confirm this is available in the operator's Claude session environment
- Canonical references for subtask decomposition:
  - ST-1: Write SKILL.md based on `telemetry-log/SKILL.md` structure (covers AC-1 through AC-8)
  - ST-2: Manual smoke test — invoke skill in Claude session, verify row in `wint.hitl_decisions` with embedding (covers AC-9 and integration validation)
- No Lambda deployment, no `pnpm build` required — artifact is purely a Markdown file
- Confirm at implementation start: read `workflow_log_decision` entry in `tool-schemas.ts` to verify exact tool name and accepted fields match what SKILL.md will document
