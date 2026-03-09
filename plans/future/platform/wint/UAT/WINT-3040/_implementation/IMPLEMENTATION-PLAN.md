# Implementation Plan: WINT-3040

**Story:** Implement Decision Logging Skill (`telemetry-decision`) with Embedding Generation
**Type:** Docs-only (single SKILL.md deliverable)
**Generated:** 2026-03-09

---

# Scope Surface

- backend/API: no
- frontend/UI: no
- infra/config: no
- notes: Docs-only. Single new file at `.claude/skills/telemetry-decision/SKILL.md`. No TypeScript, no Lambda, no DB schema changes.

---

# Acceptance Criteria Checklist

- AC-1: SKILL.md exists at `.claude/skills/telemetry-decision/SKILL.md` with valid frontmatter and all required sections (Usage, Arguments, Task, Output, Error Handling, Examples)
- AC-2: Arguments table documents all 6 fields from `insertHitlDecisionSchema`: `decisionType` (required, enum), `decisionText` (required), `storyId` (required), `operatorId` (required), `invocationId` (optional UUID), `context` (optional JSON)
- AC-3: Task section specifies embedding generation via `text-embedding-3-small` (1536-dim) from concatenation of `decisionText` + `context` BEFORE calling the MCP tool
- AC-4: Task section documents embedding failure fallback — if OpenAI unavailable, call `workflow_log_decision` without `embedding` field; do not block decision log
- AC-5: Error Handling section specifies that MCP tool errors are reported to operator with full error text; no silent failures
- AC-6: At least 2 worked examples: happy-path (approve with full context + embedding) and degraded-path (decision logged without embedding)
- AC-7: SKILL.md documents that `hitl_decisions` stores in `lego_dev` (port 5432), NOT KB database (port 5433)
- AC-8: Frontmatter `kb_tools` field lists `mcp__knowledge-base__workflow_log_decision` as sole MCP dependency
- AC-9: All existing tests pass (no code changes, no regressions expected)

---

# Files To Touch (Expected)

**Create:**
- `.claude/skills/telemetry-decision/SKILL.md` — primary deliverable

**Read (reference only, do not modify):**
- `.claude/skills/token-log/SKILL.md` — canonical SKILL.md format reference
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — confirm registered tool name
- `packages/backend/database-schema/src/schema/wint.ts` — confirm `insertHitlDecisionSchema` fields
- `plans/future/platform/wint/in-progress/WINT-0120/WINT-0120.md` — confirm `workflow_log_decision` input schema

---

# Reuse Targets

- `token-log/SKILL.md` structural template — copy section order, frontmatter keys, argument table layout
- `insertHitlDecisionSchema` from `wint.ts` — authoritative field list (do not guess field names)
- `text-embedding-3-small` (1536 dimensions) — same OpenAI embedding model used by KB server

---

# Architecture Notes (Ports & Adapters)

Not applicable — docs-only story. No code boundaries to define.

**Key constraint (ARCH-001 from WINT-0040):** `hitl_decisions` table lives in the `wint` schema of the `lego_dev` database (port 5432), not the KB database (port 5433). SKILL.md must document this clearly so operators know which DB must be running.

**MCP tool name:** The tool to call is `workflow_log_decision`. When called from a Claude session, the fully-qualified MCP tool identifier is `mcp__knowledge-base__workflow_log_decision`. This is a WINT-0120 deliverable — confirm registration status before marking AC-8 complete.

---

# Step-by-Step Plan (Small Steps)

## Step 1: Read reference files

**Objective:** Gather all information needed to write a complete and accurate SKILL.md.

**Files:**
- `.claude/skills/token-log/SKILL.md` — structural template
- `packages/backend/database-schema/src/schema/wint.ts` (lines 947–984) — `hitlDecisions` table definition and field names
- `plans/future/platform/wint/in-progress/WINT-0120/WINT-0120.md` — confirm `workflow_log_decision` input schema (decisionType enum values, optional fields)

**Verification:** Note the exact field names from `hitlDecisions` table: `id`, `invocationId`, `decisionType`, `decisionText`, `context`, `embedding`, `operatorId`, `storyId`, `createdAt`. Confirm enum values for `decisionType`: `approve`, `reject`, `request_changes`, `escalate`.

---

## Step 2: Create skill directory

**Objective:** Create `.claude/skills/telemetry-decision/` directory.

**Files:**
- `.claude/skills/telemetry-decision/` (new directory)

**Verification:** Directory exists; no files yet.

---

## Step 3: Write SKILL.md frontmatter

**Objective:** Write the YAML frontmatter block following token-log canonical format.

**Content to write:**

```yaml
---
created: 2026-03-09
updated: 2026-03-09
version: 1.0.0
name: telemetry-decision
description: Log a human-in-the-loop (HiTL) decision with semantic embedding to wint.hitl_decisions. Called by operators during story review, QA gate, and sign-off phases to capture structured decisions for preference learning.
kb_tools:
  - mcp__knowledge-base__workflow_log_decision
---
```

**Covers:** AC-1 (frontmatter), AC-8 (kb_tools field)

**Verification:** Frontmatter has `created`, `updated`, `version`, `name`, `description`, `kb_tools`.

---

## Step 4: Write Usage section

**Objective:** Document invocation syntax.

**Content:**

```markdown
## Usage

/telemetry-decision
  decisionType: approve|reject|request_changes|escalate
  decisionText: "Human-readable description of the decision and rationale"
  storyId: WINT-3040
  operatorId: ops-michael
  [invocationId: <uuid>]
  [context: { key: "value" }]
```

**Covers:** AC-1 (Usage section present)

---

## Step 5: Write Arguments section

**Objective:** Document all 6 fields from `insertHitlDecisionSchema` with types, required/optional status, and descriptions.

**Arguments table:**

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `decisionType` | enum | Yes | One of: `approve`, `reject`, `request_changes`, `escalate` |
| `decisionText` | string | Yes | Human-readable rationale for the decision |
| `storyId` | string | Yes | Story this decision is associated with (e.g., `WINT-3040`). Plain text — no FK validation |
| `operatorId` | string | Yes | Identifier for the human making the decision (e.g., `ops-michael`) |
| `invocationId` | UUID string | No | Agent invocation ID if decision occurred within an invocation context |
| `context` | JSON object | No | Free-form context snapshot at time of decision (e.g., `{ stage: "QA gate", testRunId: "tr-001" }`) |

**Covers:** AC-2 (all 6 fields documented)

---

## Step 6: Write Task section

**Objective:** Document the two-step execution flow: (1) generate embedding, (2) call MCP tool with fallback.

**Task steps to document:**

1. Construct embedding input text: concatenate `decisionText` and stringified `context` (if provided), separated by newline
2. Call OpenAI `text-embedding-3-small` to generate a 1536-dimensional embedding vector from the combined text
3. If embedding succeeds: call `mcp__knowledge-base__workflow_log_decision` with all provided arguments including `embedding`
4. If embedding fails (OpenAI unavailable or error): call `mcp__knowledge-base__workflow_log_decision` WITHOUT `embedding` field; report warning to operator
5. Report success or error to operator

**Covers:** AC-3 (embedding generation before MCP call), AC-4 (fallback when OpenAI unavailable)

---

## Step 7: Write Output section

**Objective:** Document what the skill reports to the operator on success.

**Content:**

Success (with embedding):
```
Decision logged for WINT-3040:
  Type: approve
  Operator: ops-michael
  Row ID: <uuid>
  Embedding: generated (1536-dim)
```

Success (degraded — without embedding):
```
Warning: embedding generation failed (OpenAI unavailable). Decision was logged without embedding.
Decision logged for WINT-3040:
  Type: request_changes
  Operator: ops-michael
  Row ID: <uuid>
  Embedding: none (degraded path)
```

**Covers:** AC-1 (Output section present)

---

## Step 8: Write Error Handling section

**Objective:** Document two error scenarios — embedding failure (graceful degradation) and MCP tool failure (hard error reported to operator).

**Content to document:**

1. **OpenAI embedding failure** — Degrade gracefully: call `workflow_log_decision` without embedding; report warning but do not block the decision log
2. **`workflow_log_decision` MCP tool returns error** — Report full error text to operator; do not silently fail. Example error report: `"Error: workflow_log_decision failed: [full error message]"`
3. **DB not running (port 5432)** — MCP tool will return error; apply rule 2 above. Remind operator that `lego_dev` (port 5432) must be running, not the KB database (port 5433)

**Covers:** AC-4 (embedding fallback), AC-5 (MCP error surfaced to operator), AC-7 (port 5432 vs 5433 distinction)

---

## Step 9: Write Examples section

**Objective:** Write 2 worked examples — happy path and degraded path — matching the story's Example 1 and Example 2.

**Example 1 — Happy path (approve with full context + embedding):**
```
/telemetry-decision
  decisionType: approve
  decisionText: "All ACs verified. Implementation matches spec. No regressions detected in test suite."
  storyId: WINT-3040
  operatorId: ops-michael
  context: { stage: "QA gate", reviewer: "ops-michael", testRunId: "tr-2026-03-09-001" }
```
Result: Row inserted in `wint.hitl_decisions` with `embedding` populated (1536-dim), `decision_type=approve`.

**Example 2 — Degraded path (OpenAI unavailable):**
```
/telemetry-decision
  decisionType: request_changes
  decisionText: "AC-3 not met — embedding generation step is missing from SKILL.md Task section."
  storyId: WINT-3040
  operatorId: ops-michael
```
Result: Embedding generation fails; decision logged with `embedding=NULL`. Skill reports: "Warning: embedding generation failed (OpenAI unavailable). Decision was logged without embedding."

**Covers:** AC-6 (2 worked examples)

---

## Step 10: Verify SKILL.md against all ACs

**Objective:** Self-review the completed file against all 8 structural ACs before marking ST-1 complete.

**Checklist:**
- AC-1: frontmatter present; all 6 sections present (Usage, Arguments, Task, Output, Error Handling, Examples)
- AC-2: all 6 fields documented in Arguments table
- AC-3: Task section calls OpenAI embedding BEFORE `workflow_log_decision`
- AC-4: fallback path (no embedding) documented in Task section
- AC-5: MCP error → operator report documented in Error Handling
- AC-6: 2 examples present
- AC-7: port 5432 (lego_dev) vs port 5433 (KB) distinction documented
- AC-8: frontmatter `kb_tools` lists `mcp__knowledge-base__workflow_log_decision`

**Verification:** Read the completed file top to bottom; check each AC off mentally.

---

# Test Plan

**This is a docs-only story — no automated tests to run.**

Verification is manual:

1. **Structural check (MC-2):** Open `.claude/skills/telemetry-decision/SKILL.md` and verify all sections and AC requirements are present. Covers AC-1 through AC-8.

2. **Dependency check (WINT-0120):** Confirm `workflow_log_decision` is a registered MCP tool before smoke testing. Run:
   ```bash
   grep -c "workflow_log_decision" apps/api/knowledge-base/src/mcp-server/tool-schemas.ts
   ```
   Expect: non-zero (requires WINT-0120 to be merged).

3. **Smoke test (HP-1, AC-9):** When WINT-0120 is merged and lego_dev is running, invoke skill and verify:
   ```sql
   SELECT id, decision_type, embedding IS NOT NULL as has_embedding
   FROM wint.hitl_decisions WHERE story_id='WINT-3040';
   ```

4. **Regression check:** No code files were modified; run `pnpm check-types` to confirm no accidental regressions.

---

# Stop Conditions / Blockers

**No blockers for ST-1 (writing SKILL.md).** The story explicitly notes that SKILL.md can be written before WINT-0120 is merged.

**Blocker for ST-2 (smoke test) only:** WINT-0120 must be merged and `workflow_log_decision` must be a registered MCP tool before the skill can be invoked end-to-end. This is a known, documented dependency — it does not block the planning phase or SKILL.md authoring.

---

# Architectural Decisions

**None required.**

The story is fully specified:
- File path: `.claude/skills/telemetry-decision/SKILL.md` — specified in story
- SKILL.md structure: canonical format from `token-log/SKILL.md` — specified in story
- MCP tool name: `mcp__knowledge-base__workflow_log_decision` — confirmed in WINT-0120 story
- Field names: confirmed from `wint.ts` `hitlDecisions` table definition
- Embedding model: `text-embedding-3-small` (1536-dim) — specified in story ACs
- Fallback behavior: documented in story ACs and examples

No user confirmation needed before proceeding to implementation.

---

# Worker Token Summary

- Input: ~18,000 tokens (WINT-3040.md, SCOPE.yaml, CHECKPOINT.yaml, token-log/SKILL.md, wint.ts excerpt, WINT-0120.md grep, decision-handling.md, planner agent)
- Output: ~2,500 tokens (IMPLEMENTATION-PLAN.md)
