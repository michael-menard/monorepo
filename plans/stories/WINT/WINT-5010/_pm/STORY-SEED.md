---
generated: "2026-03-23"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-5010

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file was available. Codebase was scanned directly for relevant context.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Role Pack Sidecar | `packages/backend/sidecars/role-pack/` | Deployed | Canonical sidecar pattern — `@repo/sidecar-role-pack`, port 3090 |
| Context Pack Sidecar | `packages/backend/sidecars/context-pack/` | Deployed | Port 3091 |
| Cohesion Sidecar | `packages/backend/sidecars/cohesion/` | Deployed | Port 3092, uses `@repo/sidecar-http-utils`, MCP tool wrappers |
| Rules Registry Sidecar | `packages/backend/sidecars/rules-registry/` | Deployed | **Port 3093 — already taken** |
| ML Pipeline MCP Tools (WINT-0140) | `apps/api/knowledge-base/src/ml-pipeline/` | Deployed | 7 tools including `trainingDataIngest` |
| `workflow.training_data` table | Drizzle schema in `apps/api/knowledge-base/src/db/schema/workflow.ts:497` | Deployed | `dataType`, `features` (jsonb), `labels` (jsonb), `storyId`, `validated` |
| `workflow.hitl_decisions` table | Drizzle schema in `apps/api/knowledge-base/src/db/schema/workflow.ts:393` | Deployed | `decisionType`, `decisionText`, `context` (jsonb), `embedding`, `operatorId`, `storyId`, `invocationId` |
| `@repo/sidecar-http-utils` | `packages/backend/sidecars/http-utils/src/index.ts` | Deployed | `sendJson`, `readBody`, 1MB body limit |
| `@repo/logger` | workspace package | Deployed | Required; no console.log allowed |

### Active In-Progress Work

| Story | Area | Potential Overlap |
|-------|------|-------------------|
| WINT-5020 (Classification Agent) | ML pipeline | Depends on WINT-5010 training data — downstream consumer |
| WINT-5040 (ML Training Data Collection) | ML pipeline | Depends on WINT-5010 — downstream consumer |

### Constraints to Respect

- **No barrel files** — import directly from source files
- **Zod-first types** — no TypeScript interfaces; all types via `z.infer<>`
- **No console.log** — use `@repo/logger`
- **45% minimum test coverage**
- **Node.js `http` module only** — no Hono or Express (established sidecar pattern)
- **ESM modules** — `"type": "module"` per all existing sidecars
- Port conflict must be resolved (see Conflict Analysis)

---

## Retrieved Context

### Related Endpoints

No existing HTTP endpoints for HiTL interview capture exist. The `workflow.hitl_decisions` table is written to by the `telemetry-decision` skill (calls `workflow_log_decision` MCP tool) but this story creates a *new* structured interview entry point distinct from existing telemetry.

### Related Components

This is a backend sidecar — no UI components involved.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `trainingDataIngest` function | `apps/api/knowledge-base/src/ml-pipeline/training-data-ingest.ts` | Call directly for writing training rows (AC-5) |
| `TrainingDataIngestInputSchema` | `apps/api/knowledge-base/src/ml-pipeline/__types__/index.ts` | Reference for shape of `features`/`labels` JSONB fields |
| `sendJson` / `readBody` | `packages/backend/sidecars/http-utils/src/index.ts` | HTTP response/request utilities via `@repo/sidecar-http-utils` |
| Role-pack server pattern | `packages/backend/sidecars/role-pack/src/server.ts` | `createServer` pattern, PORT env var, error catch |
| Role-pack http-handler pattern | `packages/backend/sidecars/role-pack/src/http-handler.ts` | Request routing, Zod validation, JSON error responses |
| Cohesion MCP tool pattern | `packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts` | MCP tool wrapper that calls compute function directly (no HTTP) |
| Cohesion `package.json` | `packages/backend/sidecars/cohesion/package.json` | Dependency list template: `@repo/db`, `@repo/logger`, `@repo/sidecar-http-utils`, `zod` |
| ML pipeline test mocking pattern | `apps/api/knowledge-base/src/ml-pipeline/__tests__/ml-pipeline.test.ts` | `vi.hoisted()` db mock pattern, mock chain setup |
| HTTP handler test pattern | `packages/backend/sidecars/role-pack/src/__tests__/http-endpoint.test.ts` | `makeRequest` / `makeResponse` helpers, vi.mock for dependencies |
| `workflow.hitl_decisions` Drizzle table | `apps/api/knowledge-base/src/db/schema/workflow.ts:393` | READ-only context enrichment — schema reference for SELECT query |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Sidecar server entry point | `packages/backend/sidecars/role-pack/src/server.ts` | Clean `createServer` + PORT env var + error handler pattern; minimal and correct |
| Sidecar HTTP handler with Zod validation | `packages/backend/sidecars/role-pack/src/http-handler.ts` | Request routing, Zod `.safeParse`, JSON error responses — exactly the pattern needed for POST /hitl-interview |
| MCP tool wrapper calling internal function | `packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts` | MCP tool wraps compute function directly (no HTTP self-call) — use same arch for `hitlInterview` |
| Zod types file for sidecar | `packages/backend/sidecars/role-pack/src/__types__/index.ts` | Zod-first schema file with exported `type` aliases — pattern for `InterviewAnswersSchema`, `FeatureVectorSchema` |

---

## Knowledge Context

### Lessons Learned

No KB lesson search was available without baseline context. The following are inferred from codebase patterns:

- **[WINT-4010]** Extracted `@repo/sidecar-http-utils` to prevent duplication of `sendJson`/`readBody` across sidecars. This story must use `@repo/sidecar-http-utils`, not reimplement helpers.
- **[WINT-4010]** MCP tool wrappers in `src/mcp-tools/` must call compute functions directly, not via HTTP to `localhost`. Avoids requiring the HTTP server to be running for unit tests.
- **[WINT-0140]** `trainingDataIngest` accepts `features: Record<string, unknown>` and `labels: Record<string, unknown>` — feature vectors and interview answers must be shaped to fit these JSONB fields.

### Blockers to Avoid (from past stories)

- Reimplementing `sendJson` / `readBody` — use `@repo/sidecar-http-utils`
- Writing to `workflow.hitl_decisions` — AC-6 explicitly prohibits this; sidecar only READS from it
- Self-calling HTTP endpoint from MCP tool — call compute function directly
- Using TypeScript interfaces instead of Zod schemas
- Hardcoded port 3093 — already taken by rules-registry (see Conflict Analysis)

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. The following ADRs are inferred from codebase patterns:

| Pattern | Source | Constraint |
|---------|--------|------------|
| Sidecar HTTP server | Established across all sidecars | Node.js `http` module only — no Express/Hono |
| MCP tool architecture | WINT-4010 (ARCH-001 note in code) | Call compute functions directly, not via HTTP |
| No cross-sidecar HTTP calls | WINT-4010 code review note | Sidecars must not HTTP-call each other |
| Zod-first typing | CLAUDE.md | No TypeScript interfaces; `z.infer<>` only |
| Port registry | `infra/ports.cjs` + `infra/ports.json` | Ports 3090–3093 are all assigned; next available is 3094 |

### Patterns to Follow

- Sidecar directory structure: `src/server.ts`, `src/index.ts`, `src/__types__/index.ts`, `src/http-handler.ts`, `src/__tests__/`
- Package name format: `@repo/sidecar-{name}` (e.g., `@repo/sidecar-hitl-interview`)
- `"type": "module"` in `package.json`; `"start": "node dist/server.js"`
- MCP tool exported from `src/index.ts`, implemented in `src/mcp-tools/hitl-interview.ts`
- Compute logic in `src/hitl-interview.ts` (separate from MCP wrapper)
- `@repo/db` for database access; `@repo/logger` for all logging
- `vi.hoisted()` for mock setup in tests
- HTTP tests use `makeRequest` / `makeResponse` helper pattern

### Patterns to Avoid

- Barrel files (re-export index.ts)
- `console.log` / `console.warn` — use `@repo/logger`
- Writing to `workflow.hitl_decisions`
- TypeScript interfaces (use Zod schemas)
- Hardcoding port 3093 (taken)
- HTTP calls from MCP tool wrappers to localhost

---

## Conflict Analysis

### Conflict: Port 3093 Already Assigned
- **Severity**: blocking
- **Description**: AC-1 of WINT-5010 specifies `process.env.PORT ?? '3093'` as the default port. However, port 3093 is already assigned to the rules-registry sidecar (`packages/backend/sidecars/rules-registry/src/server.ts`). The cohesion sidecar docs also list this assignment explicitly. Running both sidecars on port 3093 would cause a startup conflict.
- **Resolution Hint**: Update AC-1 to use port 3094 (next unassigned in the 309x sidecar range). Dev agent should use `process.env.PORT ?? '3094'` and update the port comment table in `server.ts` to include:
  ```
  3090 — role-pack         (WINT-2010)
  3091 — context-pack      (WINT-2020)
  3092 — cohesion          (WINT-4010)
  3093 — rules-registry    (WINT-4020)
  3094 — hitl-interview    (WINT-5010)
  ```

### Conflict: `workflow.training_data` features/labels are open JSONB
- **Severity**: warning
- **Description**: `trainingDataIngest` accepts `features: Record<string, unknown>` and `labels: Record<string, unknown>`. The ACs define a `FeatureVectorSchema` with typed fields (storyId, phase, decisionType, storyComplexityScore, agentPhase, decisionContext) and `InterviewAnswersSchema` with rationale, confidence, alternativesConsidered, riskAssessment. These schemas must be serialized as the JSONB payload. There is no DB-level enforcement of the nested shape — all validation must happen in the sidecar before writing.
- **Resolution Hint**: Define `FeatureVectorSchema` and `InterviewAnswersSchema` in `src/__types__/index.ts`, validate input with `.parse()` before passing to `trainingDataIngest`, and map `features = featureVector` and `labels = interviewAnswers` when calling the ingest function.

---

## Story Seed

### Title
Create HiTL Interview Sidecar

### Description

The workflow system captures human-in-the-loop decisions at QA gates, code reviews, and story approvals via `workflow.hitl_decisions` (Phase 3 telemetry). However, these records capture only binary decisions — they lack the structured interview data (rationale, confidence, alternatives considered, risk assessment) needed to train ML classification models.

WINT-5010 creates a sidecar service at `packages/backend/sidecars/hitl-interview/` that prompts operators with structured questions at decision points, captures their answers as labeled training examples, and writes them to `workflow.training_data` via the existing `trainingDataIngest` function from WINT-0140. The sidecar follows the established role-pack and cohesion sidecar patterns (Node.js http, Zod types, `@repo/sidecar-http-utils`, direct function calls from MCP tools).

This is the foundational data collection layer. WINT-5020 (Classification Agent) and WINT-5040 (ML Training Data Collection) depend on this sidecar to have structured, labeled rows to train on.

### Initial Acceptance Criteria

- [ ] AC-1: Sidecar service exists at `packages/backend/sidecars/hitl-interview/` following the role-pack pattern (`src/server.ts`, `src/index.ts`, `src/__types__/index.ts`, `src/http-handler.ts`), registered in pnpm workspace as `@repo/sidecar-hitl-interview`, HTTP server defaults to `process.env.PORT ?? '3094'` (port 3093 is taken by rules-registry; this is a correction to the originally specified port 3093)
- [ ] AC-2: MCP tool `hitlInterview` exported from `src/index.ts`, accepts params `{ storyId: string, phase: string, decisionType: 'qa_gate' | 'code_review' | 'story_approval' }`
- [ ] AC-3: Operator prompted with structured question set specific to `decisionType`; all required `InterviewAnswersSchema` fields (rationale, confidence, alternativesConsidered, riskAssessment) must be validated before writing training row
- [ ] AC-4: Feature vectors include `storyId`, `phase`, `decisionType`, `storyComplexityScore` (numeric), `agentPhase` (string), `decisionContext` (string) — defined in `FeatureVectorSchema`
- [ ] AC-5: Training row written to `workflow.training_data` via `trainingDataIngest` from `apps/api/knowledge-base/src/ml-pipeline/training-data-ingest.ts` (WINT-0140), with `features = FeatureVector` and `labels = InterviewAnswers`
- [ ] AC-6: Sidecar READS from `workflow.hitl_decisions` for context enrichment only — does NOT write to `hitl_decisions`
- [ ] AC-7: `InterviewAnswersSchema` defined in `src/__types__/index.ts` with fields: `rationale` (string), `confidence` (number 0–100), `alternativesConsidered` (string[]), `riskAssessment` (string)
- [ ] AC-8: `FeatureVectorSchema` defined in `src/__types__/index.ts` with typed fields: `storyId` (string), `phase` (string), `decisionType` (enum), `storyComplexityScore` (number), `agentPhase` (string), `decisionContext` (string)
- [ ] AC-9: Uses `@repo/sidecar-http-utils` (`sendJson`, `readBody`) and `@repo/logger` — no `console.*` usage, no reimplementing HTTP helpers
- [ ] AC-10: Unit tests achieve 45% coverage; integration tests verify `trainingDataIngest` called with correct shape (vi.mock the ingest function)

### Non-Goals

- Writing to `workflow.hitl_decisions` — this sidecar only reads from it
- Providing a UI for operators — this is a programmatic MCP tool
- Training the ML model itself — that is WINT-5020's scope
- Validating or marking training data as validated — that is handled by `trainingDataMarkValidated` (WINT-0140)
- Any real-time streaming or websocket interface
- Authentication/authorization for the HTTP endpoint (not in scope for this story)

### Reuse Plan

- **Packages**: `@repo/sidecar-http-utils`, `@repo/logger`, `@repo/db`, `zod`
- **Functions**: `trainingDataIngest` from `apps/api/knowledge-base/src/ml-pipeline/training-data-ingest.ts`
- **Patterns**:
  - Server entry point from `packages/backend/sidecars/role-pack/src/server.ts`
  - HTTP handler routing from `packages/backend/sidecars/role-pack/src/http-handler.ts`
  - MCP tool wrapper pattern from `packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts`
  - Zod types file from `packages/backend/sidecars/role-pack/src/__types__/index.ts`
  - Test mock setup from `apps/api/knowledge-base/src/ml-pipeline/__tests__/ml-pipeline.test.ts`
  - HTTP test helpers from `packages/backend/sidecars/role-pack/src/__tests__/http-endpoint.test.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Unit tests must cover: Zod schema validation (valid + invalid inputs), `trainingDataIngest` called with correct mapped shape, `hitl_decisions` SELECT query called with storyId filter, HTTP handler 200/400/422/500 response paths.
- Integration test must mock `trainingDataIngest` (not a real DB call) — verify the function is called with `{ dataType: 'hitl_interview', features: {...}, labels: {...}, storyId }`.
- 45% coverage minimum — with ~4 source files and the pattern established, hitting 60%+ is achievable.
- Port conflict in AC-1 should be corrected in the test spec: use port 3094, not 3093.
- The HTTP endpoint should accept POST with JSON body (not GET with query params like role-pack) since it carries a payload.

### For UI/UX Advisor

Not applicable — this is a pure backend sidecar with no UI surface. The "operator prompting" described in the story description is MCP-tool-driven (LLM agent calls the tool and presents questions via its context), not a web UI.

### For Dev Feasibility

- **Port correction is blocking**: AC-1 specifies port 3093, which is already used by rules-registry. The sidecar must default to port 3094. This must be flagged and corrected before implementation begins.
- **File layout** (following role-pack pattern):
  ```
  packages/backend/sidecars/hitl-interview/
    package.json              # @repo/sidecar-hitl-interview, "type": "module"
    tsconfig.json
    vitest.config.ts
    src/
      server.ts               # createServer, PORT ?? '3094'
      index.ts                # exports hitlInterview MCP tool + schemas
      http-handler.ts         # POST /hitl-interview route handler
      hitl-interview.ts       # core compute function (reads hitl_decisions, calls trainingDataIngest)
      __types__/
        index.ts              # HitlInterviewInputSchema, InterviewAnswersSchema, FeatureVectorSchema
      __tests__/
        hitl-interview.test.ts
        http-handler.test.ts
  ```
- **Key dependency**: `trainingDataIngest` from `apps/api/knowledge-base/src/ml-pipeline/training-data-ingest.ts` — must be importable cross-package. Check if `@repo/knowledge-base` is a workspace package or if the function needs to be moved/re-exported. The cohesion sidecar uses `@repo/mcp-tools` — check if ML pipeline tools are exposed similarly.
- **hitl_decisions query**: Use `@repo/db` with the `hitlDecisions` Drizzle table (defined at `apps/api/knowledge-base/src/db/schema/workflow.ts:393`). Filter by `storyId` and `invocationId` for context enrichment. Return the most recent decision of the matching `decisionType`.
- **MCP tool shape**: The MCP tool `hitlInterview` should call the compute function directly (not via HTTP) following ARCH-001 pattern from cohesion sidecar.
- **pnpm workspace**: Add `packages/backend/sidecars/hitl-interview` to `pnpm-workspace.yaml` (check the `packages:` list).
