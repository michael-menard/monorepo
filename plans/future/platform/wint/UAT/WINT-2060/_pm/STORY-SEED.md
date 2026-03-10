---
generated: "2026-03-03"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-2060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No KB lessons loaded (KB search MCP not available in this context); no lesson-tagged entries were queried

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `wint.context_packs` table | Active (WINT-0010, protected) | Write target for library cache entries |
| `contextPackTypeEnum` | Active — includes: codebase, story, feature, epic, architecture, lessons_learned, test_patterns, agent_missions | Determines which packType to use for library entries |
| `contextCachePut()` MCP tool | UAT-complete (WINT-0100) | Primary write mechanism via `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` |
| `populate-project-context.ts` | needs-code-review (WINT-2030) | Direct template: same architecture, file-read + extract + write pattern |
| `populate-domain-kb.ts` | ready-to-work (WINT-2050) | Sibling populate script, dual-DB pattern not needed here |
| Agent mission cache populator | needs-code-review (WINT-2040) | Sibling — glob-based extraction pattern |
| WINT-0030 (Context Cache Tables) | listed as dependency | `context_packs` table is confirmed deployed from WINT-0010, WINT-0030 adds other tables |
| WINT-0100 (Context Cache MCP Tools) | UAT-complete | `contextCachePut()` fully available |
| WINT-2020 (Context Pack Sidecar) | needs-code-review | Listed as dependency; write path does NOT require the sidecar HTTP endpoint |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-2020 (Context Pack Sidecar) | needs-code-review | Listed as dependency; however write path via `contextCachePut()` is independent. No overlap in implementation files. |
| WINT-2040 (Agent Mission Populator) | needs-code-review | Shares `wint.context_packs` write target and `contextCachePut()` pattern. No file conflicts. |
| WINT-2050 (Domain Knowledge Cache) | ready-to-work | Shares populate script pattern and `contextCachePut()`. No file conflicts. |
| WINT-2030 (Project Context Cache) | needs-code-review | Direct template source — `populate-project-context.ts` must be readable but not modified. |

### Constraints to Respect

- **WINT-0010 protected**: `wint.context_packs` schema is protected — no schema changes allowed
- **No new packType enum values** unless a migration is justified and added: existing values are `codebase`, `story`, `feature`, `epic`, `architecture`, `lessons_learned`, `test_patterns`, `agent_missions` — `codebase` is the most semantically appropriate for library usage patterns
- **Port 5432 only** for writes (lego_dev via DATABASE_URL) — this story reads from filesystem only, no port 5433 (KB) access needed
- **Content cap**: JSON.stringify(content).length < 8000 chars per pack (established by WINT-2050)
- **No UI, no HTTP endpoint**: population scripts are Node.js utilities only

---

## Retrieved Context

### Related Endpoints

None — this is a backend-only population script with no HTTP surface.

### Related Components

| File | Relevance |
|------|-----------|
| `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Primary implementation template: readDoc, extractSections, PopulateResultSchema, resilient write loop |
| `packages/backend/mcp-tools/src/scripts/__tests__/populate-project-context.test.ts` | Integration test pattern: beforeEach/afterEach cleanup, real PostgreSQL, idempotency assertions |
| `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Write path — upsert on (packType, packKey) composite |
| `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | `packTypeValues` enum constraint — MUST use only values defined here |
| `packages/backend/mcp-tools/src/context-cache/__tests__/integration.test.ts` | Integration test setup/teardown pattern |
| `packages/backend/database-schema/src/schema/wint.ts` | `contextPackTypeEnum` definition — confirms `codebase` is an existing valid value |
| `CLAUDE.md` | Source of truth for library versions, conventions, and patterns |
| `docs/tech-stack/frontend.md` | React 19, Tailwind, shadcn/ui patterns |
| `docs/tech-stack/backend.md` | Drizzle ORM, Vitest backend patterns |
| `docs/tech-stack/monorepo.md` | pnpm, Turborepo |

### Reuse Candidates

| What | Source | How |
|------|--------|-----|
| `PopulateResultSchema` | `populate-project-context.ts` lines 33–38 | Copy exactly — `{ attempted, succeeded, failed }` shape |
| `readDoc()` helper | `populate-project-context.ts` lines 43–53 | Copy for reading source docs from monorepo root |
| `extractSections()` helper | `populate-project-context.ts` lines 59–81 | Reuse `##` heading-based section parser |
| Resilient write loop | `populate-project-context.ts` lines 304–346 | Sequential try/catch, accumulate counts |
| `MONOREPO_ROOT` constant | `populate-project-context.ts` line 30 | `resolve(import.meta.dirname ?? __dirname, '../../../../../')` |
| `TTL_30_DAYS` constant | `populate-project-context.ts` line 27 | `const TTL_30_DAYS = 2592000` |
| Integration test cleanup | `populate-project-context.test.ts` | `beforeEach`/`afterEach` with `db.delete(contextPacks).where(inArray(...))` |
| `contextCachePut()` | `context-cache-put.ts` | Sole write path — idempotent upsert |

### Similar Stories

- **WINT-2030**: Exact same populate-script architecture — reads files, extracts structured JSONB, writes via `contextCachePut()`. Use as direct model.
- **WINT-2050**: Dual-DB variant of the same pattern (not needed here — filesystem-only reads).
- **WINT-2040**: Glob-based extraction; different source (`.agent.md` files) but same write target.

### Relevant Packages

- `@repo/mcp-tools` — primary home for populate script (matches WINT-2030/2050 placement in `src/scripts/`)
- `@repo/db` — Drizzle connection (write to port 5432)
- `@repo/logger` — all logging
- `@repo/database-schema` — `contextPacks` table ref for test cleanup

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Populate script (primary model) | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Exact same pattern: readDoc, extractSections, extract structured JSONB per pack, resilient write loop via contextCachePut(), PopulateResultSchema |
| Cache write (upsert) | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Only valid write path — upsert on (packType, packKey) composite unique constraint; TTL handling |
| Zod schemas + pack types | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | `packTypeValues` — must use only values already defined here; `codebase` is the right type for library patterns |
| Integration test pattern | `packages/backend/mcp-tools/src/scripts/__tests__/populate-project-context.test.ts` | beforeEach/afterEach cleanup, real PostgreSQL port 5432, idempotency assertion, structured content verification |

---

## Knowledge Context

### Lessons Learned

KB search was not available in this context. The following lessons are inferred from sibling story documentation and baseline observations:

- **[WINT-2040]** Agent mission populator: `contextPackTypeEnum` may not include required pack type — verify before implementation. Mitigation: confirm `codebase` exists in enum (it does per wint.ts) before writing.
  - *Applies because*: WINT-2060 must use a valid `packType` from the existing enum; adding a new value requires a migration, which adds implementation risk.

- **[WINT-2050]** Port confusion (5432 vs 5433) is the #1 failure mode for WINT populate stories. Assert correct port in test env.
  - *Applies because*: This story reads from filesystem only (no port 5433 needed), but integration tests must target port 5432 lego_dev for writes.

- **[WINT-2030]** Populate scripts must handle missing source documents gracefully — `readDoc()` returns null on failure, skips pack with warning, does not abort run.
  - *Applies because*: Library docs (CLAUDE.md, docs/tech-stack/*.md) may be temporarily unavailable during CI or if paths shift.

- **[WINT-2050]** Content must be structured JSONB, not raw file dump. Enforce JSON.stringify(content).length < 8000 per pack.
  - *Applies because*: Library patterns (e.g., Zod API surface, React 19 hooks) can be verbose if excerpted naively from docs.

### Blockers to Avoid (from past stories)

- Using a `packType` value not in `contextPackTypeEnum` — causes PostgreSQL type error at insert time
- Wrong database port for integration tests (must be 5432, not 5433)
- Raw file content in JSONB rather than structured extraction
- Missing `summary` field on content objects — expected by downstream consumers
- Breaking idempotency by using INSERT instead of upsert (onConflictDoUpdate)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — unit tests may mock contextCachePut; integration tests use real PostgreSQL |
| ADR-006 | E2E Tests Required in Dev Phase | No UI-facing ACs for this story → `frontend_impacted: false` → E2E not required |

ADR-001 (API paths), ADR-002 (Infrastructure), ADR-003 (CDN), ADR-004 (Auth) do not apply — this is a backend-only script with no HTTP surface.

### Patterns to Follow

- Use `populate-project-context.ts` as the exact implementation model
- All types via Zod schemas — no TypeScript interfaces
- `@repo/logger` for all output — no `console.log`
- `contextCachePut()` as sole write path (not raw Drizzle insert) — it handles upsert, TTL, hitCount
- `pnpm tsx` runnable as standalone script with JSDoc documenting `DATABASE_URL` requirement
- Injectable dependencies (e.g., `contextCachePutFn` parameter) for testability in unit tests
- `{ attempted, succeeded, failed }` summary result shape via `PopulateResultSchema`
- TTL: 30 days (2592000 seconds) — same as WINT-2030/2050

### Patterns to Avoid

- Do NOT add a new `contextPackTypeEnum` value without a migration (costly, needs coordination)
- Do NOT read from the KB (port 5433) — this story is filesystem-only
- Do NOT dump entire docs as content — extract compact, structured JSONB summaries
- Do NOT use `console.log` for output
- Do NOT import from barrel files (no index.ts re-exports per CLAUDE.md)
- Do NOT use TypeScript interfaces — use Zod schemas with `z.infer<>`

---

## Conflict Analysis

### Conflict: Missing `library_cache` packType in contextPackTypeEnum
- **Severity**: warning (non-blocking — `codebase` packType exists and is semantically valid)
- **Description**: The story index says "code example extractor" as infrastructure and "library_cache" table is mentioned in WINT-0030 description (`project_context, agent_missions, domain_kb, library_cache, and sessions tables`). However, the `contextPackTypeEnum` in `wint.ts` has no `library_cache` or `library` value. The closest valid value is `codebase`. Adding a new enum value requires a migration (adds complexity, adds a blocker subtask).
- **Resolution Hint**: Use `packType: 'codebase'` for library pattern entries. This is the most semantically appropriate existing value and avoids a migration. If domain specificity is required, add a migration for `library_cache` with a story note; but this increases scope and risk (similar to the AC-11 migration decision in WINT-2040).

### Conflict: Dependency on WINT-2020 (Context Pack Sidecar) listed but not actually blocking
- **Severity**: warning (non-blocking)
- **Description**: The index lists WINT-2020 as a dependency, but WINT-2020 provides an HTTP sidecar for runtime retrieval, not for writes. The population script writes directly via `contextCachePut()` (which is `WINT-0100`-delivered and UAT-complete). WINT-2020 is not needed for the write path.
- **Resolution Hint**: Document that the actual blocking dependencies are WINT-0030 (table) + WINT-0100 (MCP tools). WINT-2020 provides runtime retrieval, which is out of scope for this story. Same resolution as WINT-2050 used.

---

## Story Seed

### Title

WINT-2060: Populate Library Cache — Cache Common Library Patterns (React 19, Tailwind, Zod, Vitest) from Docs

### Description

**Context**: The WINT platform Phase 2 goal is 80% token reduction across agent invocations. The `wint.context_packs` table (WINT-0010) is the storage layer. WINT-2030 populated project conventions and tech-stack packs. WINT-2040 populated agent mission packs. WINT-2050 will populate domain knowledge and ADR packs.

This story closes the library usage pattern gap: when agents generate code using React 19, Tailwind CSS, Zod, or Vitest, they currently have no cached reference for the specific patterns, hook APIs, or idioms used in this codebase. They must either re-read docs, re-read source files, or hallucinate. At scale (WINT-2120 benchmarks), this is a measurable token cost.

**Problem**: Agent invocations that need library-specific guidance (e.g., "how do we write a Zod schema here?" or "which React hooks are in use?") must re-read CLAUDE.md, tech-stack docs, and real source files on every invocation. These patterns are stable and highly cacheable.

**Reality baseline**: `wint.context_packs` deployed and protected (WINT-0010). `contextCachePut()` UAT-complete (WINT-0100). `populate-project-context.ts` is the direct implementation model (WINT-2030, needs-code-review). The `codebase` packType exists in `contextPackTypeEnum` and is the correct type for library pattern entries.

**Proposed solution**: Create a `populate-library-cache.ts` script in `packages/backend/mcp-tools/src/scripts/` using the exact same architecture as `populate-project-context.ts`. Read CLAUDE.md and docs/tech-stack/*.md, extract compact structured JSONB packs per library (React 19, Tailwind, Zod, Vitest), and write to `wint.context_packs` via `contextCachePut()`. Each pack: `packType: 'codebase'`, `packKey: 'lib-{name}'`, `content: { summary, patterns, examples, rules }`, TTL 30 days.

### Initial Acceptance Criteria

- [ ] **AC-1**: A population script exists at `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` that reads CLAUDE.md and docs/tech-stack/*.md to extract library usage patterns for: React 19, Tailwind CSS, Zod, and Vitest
- [ ] **AC-2**: The script writes 4 library cache packs to `wint.context_packs`, one per library: `packType: 'codebase'`, `packKey: 'lib-react19'`, `'lib-tailwind'`, `'lib-zod'`, `'lib-vitest'`
- [ ] **AC-3**: Each pack content is a structured JSONB object with fields: `summary: string`, `patterns: string[]`, `rules: string[]`, and optionally `examples: string[]`. JSON.stringify(content).length < 8000 chars per pack
- [ ] **AC-4**: The script uses `contextCachePut()` with `ttl: 2592000` (30 days) for all writes. The script is idempotent — re-running updates existing entries without errors or duplicates
- [ ] **AC-5**: Individual pack write failures are logged via `@repo/logger` and do not abort the full run. Script returns `PopulateResultSchema`-conforming `{ attempted, succeeded, failed }` summary
- [ ] **AC-6**: All input/output types are Zod-validated schemas. No TypeScript interfaces used anywhere in the script
- [ ] **AC-7**: Script is runnable via `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` from the monorepo root. Inline JSDoc documents: run command and `DATABASE_URL` requirement (port 5432, lego_dev)
- [ ] **AC-8**: Unit tests cover: content extraction correctness (summary present, pattern arrays non-empty), TTL value on `contextCachePut` calls (mock), error handling for missing source docs, failed write handling, result schema conformance. All tests use mocked `contextCachePut`
- [ ] **AC-9**: Integration test (real PostgreSQL port 5432): after running the populate function, exactly 4 entries exist in `wint.context_packs` with `packType='codebase'` and the 4 expected packKeys. Re-running produces the same count (idempotency)
- [ ] **AC-10**: All packs use only `packType: 'codebase'` — a value already in `contextPackTypeEnum`. No new enum values are added and no database migration is required

### Non-Goals

- Do NOT implement the cache-warming orchestration — that is WINT-2070/WINT-2080 scope
- Do NOT cache agent missions (WINT-2040), project conventions (WINT-2030), or domain knowledge/ADRs (WINT-2050) — those stories handle their own caches
- Do NOT build an HTTP endpoint — population script is a Node.js utility only
- Do NOT read from the KB (port 5433) — library patterns come from filesystem docs only
- Do NOT modify `wint.context_packs` table schema (protected by WINT-0010)
- Do NOT add new `contextPackTypeEnum` values — use existing `codebase` packType
- Do NOT cache library changelogs or full API references — extract compact codebase-specific idioms only
- Do NOT implement cache retrieval for agents — that is WINT-2110 scope
- Do NOT implement automatic doc-change triggers — manual re-population is MVP
- Do NOT build a CLI command or UI

### Reuse Plan

- **Components**: `contextCachePut()` (sole write path), `PopulateResultSchema` (copy from `populate-project-context.ts`), `readDoc()` helper (copy), `extractSections()` (copy), `MONOREPO_ROOT` constant (copy), `TTL_30_DAYS` constant (copy)
- **Patterns**: Resilient write loop with try/catch per pack; injectable `contextCachePutFn` for testability; `beforeEach`/`afterEach` integration test cleanup
- **Packages**: `@repo/mcp-tools` (script home), `@repo/db` (Drizzle for integration test cleanup), `@repo/logger`, `@repo/database-schema` (contextPacks table ref)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Primary risk**: Content extraction quality — patterns arrays must be non-empty and contain codebase-specific idioms, not generic library documentation
- **Integration test setup**: Real PostgreSQL at port 5432 (lego_dev, DATABASE_URL). Do NOT use port 5433. No KB access needed.
- **Idempotency**: Core requirement — test must run populate function twice and assert row count unchanged
- **Content validation**: Test that each pack has `summary: string` with length > 10, `patterns: string[]` with length >= 3
- **TTL test**: Verify `contextCachePut` spy receives `ttl: 2592000` on all calls
- **Error isolation**: Test that a single pack write failure does not abort remaining packs (mock `contextCachePut` to throw on second call only)
- **packType constraint**: Verify DISTINCT pack_type for the 4 keys is only `'codebase'`
- **No KB dependency**: No fixtures or mocks for port 5433 — this story does not touch KB

### For UI/UX Advisor

Not applicable — this is a backend-only Node.js utility script with no UI surface, no HTTP endpoints, and no user-facing interaction. Skip this phase or note N/A.

### For Dev Feasibility

- **Implementation path**: Exact copy of `populate-project-context.ts` architecture. The only novelty is writing 4 library-specific extraction functions instead of 5 tech-stack/conventions functions.
- **packType decision**: Use `codebase` (already in enum) — avoids migration, avoids WINT-2040-style AC-11 complexity. Document the decision explicitly in the script JSDoc.
- **Content extraction**: Each extraction function takes the raw markdown string and returns `{ summary, patterns, rules }`. Do NOT parse full Markdown AST — simple line-scanning or section extraction is sufficient.
- **Source files**: `CLAUDE.md` (Zod patterns, conventions), `docs/tech-stack/frontend.md` (React 19, Tailwind), `docs/tech-stack/backend.md` (Drizzle, Vitest backend), `docs/tech-stack/monorepo.md` (pnpm, Turborepo). May hardcode extracted patterns rather than parsing if simpler — WINT-2030 does this successfully.
- **Injectable dependency (AC-8)**: Add optional `contextCachePutFn` parameter to `populateLibraryCache()` function for unit test mocking — same pattern as WINT-2050's `kbQueryFn`.
- **Canonical references for subtask decomposition**:
  - ST-1: Scaffold `populate-library-cache.ts` with imports, constants, `PopulateResultSchema`, `readDoc()`, `extractSections()` — copy from `populate-project-context.ts`. ACs: AC-6, AC-7.
  - ST-2: Implement 4 library extraction functions: `extractReact19Patterns`, `extractTailwindPatterns`, `extractZodPatterns`, `extractVitestPatterns`. Each returns `{ summary, patterns, rules }`. ACs: AC-1, AC-3.
  - ST-3: Implement `populateLibraryCache()` function with pack definitions array and resilient write loop. ACs: AC-2, AC-4, AC-5, AC-10.
  - ST-4: Write unit and integration tests. ACs: AC-8, AC-9.
- **Estimated complexity**: low-medium. No new dependencies, no migrations, no dual-DB complexity. All patterns established by WINT-2030.
- **Estimated tokens**: ~60,000–80,000 (4 subtasks × 15,000–20,000 each)
- **Evidence expectations**:
  - `pnpm check-types --filter @repo/mcp-tools` passes
  - `pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` exits 0 with summary logged
  - `SELECT COUNT(*) FROM wint.context_packs WHERE pack_key IN ('lib-react19','lib-tailwind','lib-zod','lib-vitest')` = 4
  - `pnpm test --filter @repo/mcp-tools` passes all unit and integration tests
  - Running script twice produces same row count
