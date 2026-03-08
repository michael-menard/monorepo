---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-4050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT Phase 4 infrastructure deliveries (WINT-4010, WINT-4020 completed after baseline); supplemented by direct codebase scan

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Rules Registry DB schema (`wint.rules`) | `packages/backend/database-schema/src/schema/rules-registry.ts` | Delivered (WINT-4020) | The table where cohesion rules will be stored |
| Rules Registry sidecar (`proposeRule`, `getRules`, `promoteRule`) | `packages/backend/sidecars/rules-registry/src/rules-registry.ts` | Delivered (WINT-4020) | The service that receives proposed rules via direct-call |
| MCP tool wrappers (`rules_registry_propose`, `rules_registry_get`) | `packages/backend/mcp-tools/src/rules-registry/` | Delivered (WINT-4020) | MCP surface for proposing/getting rules |
| Cohesion sidecar (`computeCheck`, CRUD lifecycle check) | `packages/backend/sidecars/cohesion/src/` | Delivered (WINT-4010) | Checks features against the CRUD model; rules will expand its logic |
| Graph DB tables (`capabilities`, `features`, `feature_cohesion` view) | `packages/backend/database-schema/src/schema/wint.ts` (WINT-0060) | UAT | The graph that rules will be evaluated against |
| Capability lifecycle stages (`create`, `read`, `update`, `delete`) | `packages/backend/sidecars/cohesion/src/compute-check.ts` | Active | The CRUD_STAGES constant; upload/replace are not yet lifecycle stages |

### Active In-Progress Work

| Story | Feature | Overlap Risk |
|-------|---------|-------------|
| WINT-4030 | Populate Graph with Existing Features and Epics | Low — populates the graph that rules will eventually govern; no shared files |
| WINT-4040 | Infer Existing Capabilities | Low — adds inferred capabilities to the graph; rules validate against graph, not inferred capabilities directly |

### Constraints to Respect

- `wint.rules` table exists with `rule_text`, `rule_type` (gate/lint/prompt_injection), `scope`, `severity`, `status` (proposed/active/deprecated) columns — rules MUST fit this schema
- Rule proposal uses `proposeRule()` from `@repo/sidecar-rules-registry` via direct-call pattern (ARCH-001) — no HTTP calls
- Rules require `source_story_id` or `source_lesson_id` to promote from `proposed` to `active`
- CRUD_STAGES in cohesion sidecar are currently `['create', 'read', 'update', 'delete']` — "upload" and "replace" are not recognized lifecycle stages yet; rules referencing them must be scoped appropriately or the cohesion sidecar must be extended
- Protected: do not modify `wint.rules` DB schema or the `proposeRule`/`promoteRule` public API surface

---

## Retrieved Context

### Related Endpoints

| Path | Method | Service | Relevance |
|------|--------|---------|-----------|
| (rules-registry sidecar) `proposeRule()` | direct-call | `@repo/sidecar-rules-registry` | Entry point for proposing each cohesion rule |
| (rules-registry sidecar) `promoteRule()` | direct-call | `@repo/sidecar-rules-registry` | Entry point for activating proposed rules |
| (rules-registry sidecar) `getRules()` | direct-call | `@repo/sidecar-rules-registry` | Used to verify rules exist after seeding |
| (cohesion sidecar) `computeCheck()` | direct-call | `@repo/sidecar-cohesion` | The consumer that will apply rules; currently hardcoded to CRUD_STAGES |

### Related Components

No frontend UI components are impacted. This is a pure backend/data story.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|-------------|
| `proposeRule()` | `packages/backend/sidecars/rules-registry/src/rules-registry.ts` | Call directly to propose each rule in the seed script |
| `promoteRule()` | same file | Call to promote each proposed rule to active |
| `ProposeRuleInputSchema` | `packages/backend/sidecars/rules-registry/src/__types__/index.ts` | Validates each rule payload before proposing |
| `RuleTypeSchema`, `RuleSeveritySchema` | same file | Use enum values (`gate`, `lint`, `prompt_injection`; `error`, `warning`) |
| `@repo/logger` | `packages/core/logger` | Use for logging seed script output |
| Existing migration pattern | `packages/backend/database-schema/src/migrations/app/` | If a DB seed migration is needed; otherwise use a standalone seed script |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Direct-call rule proposal (proposeRule) | `packages/backend/sidecars/rules-registry/src/rules-registry.ts` | Canonical implementation of propose + promote lifecycle; shows exact function signatures and return types |
| Rules Registry MCP tool wrapper | `packages/backend/mcp-tools/src/rules-registry/rules-registry-propose.ts` | Shows how to call `proposeRule` from outside the sidecar with proper error handling |
| Zod schemas for rules | `packages/backend/sidecars/rules-registry/src/__types__/index.ts` | Shows `ProposeRuleInputSchema`, `RuleTypeSchema`, and `RuleSeveritySchema` — the types that constrain all rule definitions |
| Cohesion CRUD check (consumer) | `packages/backend/sidecars/cohesion/src/compute-check.ts` | Shows the CRUD_STAGES constant and how violations are derived — this is what rules must be designed to feed |

---

## Knowledge Context

### Lessons Learned

- **[WINT-4010/OPP-01]** Import `FrankenFeatureItemSchema` and `CapabilityCoverageOutputSchema` from `@repo/mcp-tools` rather than redeclaring them. (category: architecture)
  - *Applies because*: Any types introduced for cohesion rules should similarly be imported from the canonical sidecar rather than redeclared.

- **[WINT-4020/KB entry]** Database-level conflict uniqueness constraint (partial unique index on `lower(trim(rule_text)) WHERE status != 'deprecated'`) was deferred as a future opportunity. Application-level conflict detection via `detectConflicts()` is already in place.
  - *Applies because*: The seed script must be idempotent — if rules already exist (re-run scenario), `proposeRule()` will return `{ ok: false, conflicting_ids: [...] }` rather than error; the script should handle this gracefully.

- **[WINT-0060]** Self-referencing FKs in Drizzle ORM require forward refs and `relationName`.
  - *Applies because*: If any new DB schema work is needed (e.g., adding a `cohesion_rules` junction), this pattern applies. However, this story should NOT touch the DB schema.

- **[WINT-4010/lesson]** Cohesion detector pattern — pure functions `(filePath) => Violation[]` — is highly testable and composable. New detectors can be added by following this exact signature.
  - *Applies because*: If WINT-4050 introduces rule-driven cohesion checking (e.g., a `applyRules()` function that replaces or augments the hardcoded CRUD check), the detector pattern is the right shape.

### Blockers to Avoid (from past stories)

- Do not extend or modify `wint.rules` schema — WINT-4020 delivered the schema, which is protected
- Do not re-declare types already exported from `@repo/sidecar-rules-registry` or `@repo/mcp-tools`
- The `proposeRule()` conflict detector is case-insensitive text match — duplicate rule text will be rejected; ensure rules are distinct
- `upload` and `replace` are not currently lifecycle stages in the cohesion sidecar (`CRUD_STAGES = ['create', 'read', 'update', 'delete']`); rules referencing these must either extend the sidecar's lifecycle model or be scoped as `prompt_injection` / `lint` advisory rules rather than enforced `gate` rules

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Unit tests with mocked DB; integration/UAT tests against real `wint.rules` table |
| ADR-006 | E2E Tests Required in Dev Phase | If any CLI or MCP exposure surfaces, an E2E smoke is required; pure backend seed story may qualify as `e2e: not_applicable` |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (images), ADR-004 (auth) are not applicable to this story.

### Patterns to Follow

- Zod-first types — no TypeScript interfaces
- Direct-call pattern (ARCH-001): import compute functions from `@repo/sidecar-rules-registry`; do NOT make HTTP calls
- `@repo/logger` for all logging
- Discriminated union result types `{ ok: true, data: T } | { ok: false, error: string }` for all compute function results
- Idempotent seed scripts — handle "already exists" gracefully (conflict response from `proposeRule`)
- Source reference required for promote: every activated rule must carry `source_story_id: 'WINT-4050'`

### Patterns to Avoid

- Do not use TypeScript `interface` — use `z.object()` + `z.infer<>`
- Do not call rules-registry HTTP routes if the sidecar HTTP server happens to be running — use direct-call
- Do not hardcode rule enforcement inside `computeCheck()` if the goal is to make rules data-driven; instead, fetch active rules from `getRules()` and apply them dynamically
- Do not create a barrel file (index.ts that only re-exports)

---

## Conflict Analysis

No blocking conflicts detected.

### Warning: upload/replace lifecycle stages not in CRUD model
- **Severity**: warning
- **Description**: The story description calls out "features with 'upload' need 'replace'" as a rule. However, `CRUD_STAGES` in `compute-check.ts` currently only recognizes `['create', 'read', 'update', 'delete']`. Rules that check for `upload`/`replace` cannot be enforced as `gate` rules by the existing cohesion sidecar without extending it. This is a design decision for the implementer: either (a) store upload/replace rules as `prompt_injection` advisory rules only, or (b) extend `CRUD_STAGES` and the cohesion sidecar in this story, or (c) defer cohesion sidecar extension to WINT-4120.
- **Resolution Hint**: Dev feasibility should assess whether extending `CRUD_STAGES` is in scope here or deferred to WINT-4120. A clean MVP: seed only `gate` rules for canonical CRUD pairs (`create`→requires`delete`, `read`→requires`update`) and store upload/replace as advisory (`prompt_injection`) rules for now.

### Warning: Rule promotion requires source reference
- **Severity**: warning
- **Description**: `promoteRule()` requires `source_story_id` or `source_lesson_id` to be present. The seed script must pass `source_story_id: 'WINT-4050'` for every promote call.
- **Resolution Hint**: Ensure the seed script always passes `source_story_id: 'WINT-4050'` in the promote payload.

---

## Story Seed

### Title

WINT-4050: Seed Initial Cohesion Rules into the Rules Registry

### Description

The rules registry table (`wint.rules`) was delivered by WINT-4020 and is fully operational. The cohesion sidecar (WINT-4010) currently applies a hardcoded CRUD completeness check (`create`/`read`/`update`/`delete`). WINT-4120 will integrate the prosecutor/judge agents into the workflow gating system, but it depends on WINT-4050 providing a populated set of active rules to drive that logic.

This story formalizes the cohesion requirements that every feature must satisfy by seeding an initial ruleset into the `wint.rules` table and promoting those rules to `active` status. The rules encode invariants such as:
- A feature with a `create` capability must also have a `delete` capability
- A feature with an `upload` capability must also have a `replace` (or `update`) capability
- (And symmetrically: a `delete` without `create` is also a cohesion violation)

The primary deliverable is a TypeScript seed script (or migration seed) that calls `proposeRule()` and `promoteRule()` from `@repo/sidecar-rules-registry` for each rule. Secondary deliverables are unit tests verifying the seed script logic and a design decision on how to handle lifecycle stages (upload/replace) that are not yet in the CRUD model.

### Initial Acceptance Criteria

- [ ] AC-1: A seed script (or seed migration) exists that proposes and promotes at least the following rule pairs into `wint.rules` with `status = 'active'`:
  - "A feature with a `create` capability must have a corresponding `delete` capability" (`rule_type: gate`, `severity: error`)
  - "A feature with a `delete` capability must have a corresponding `create` capability" (`rule_type: gate`, `severity: error`)
  - "A feature with an `update` capability must have a corresponding `read` capability" (`rule_type: gate`, `severity: warning`)
  - "A feature with an `upload` capability must have a corresponding `replace`/`update` capability" (`rule_type: prompt_injection` or `gate` depending on AC-5 decision, `severity: warning`)
- [ ] AC-2: The seed script is idempotent — running it a second time does not error or duplicate rules; it detects conflicts gracefully via the `proposeRule()` conflict response and logs accordingly
- [ ] AC-3: All proposed rules carry `source_story_id: 'WINT-4050'` on promotion
- [ ] AC-4: Unit tests cover the seed script logic with mocked `proposeRule`/`promoteRule` calls — at minimum: happy path (all rules seeded), idempotency path (conflict on re-run), promote failure path
- [ ] AC-5: A design decision is documented (in ELAB) on how upload/replace rules are handled: stored as `gate` (requires cohesion sidecar extension), stored as `prompt_injection` advisory, or deferred to WINT-4120
- [ ] AC-6: After running the seed, `getRules({ status: 'active' })` returns all seeded rules
- [ ] AC-7: All new code passes TypeScript strict mode, ESLint (no errors), and Prettier formatting
- [ ] AC-8: The seed script location and invocation method are documented in the story evidence

### Non-Goals

- Do NOT modify the `wint.rules` DB schema (WINT-4020 delivered it; it is protected)
- Do NOT extend the cohesion sidecar's CRUD_STAGES in this story unless AC-5 decision approves it — if deferred, that work belongs to WINT-4120
- Do NOT create a UI for rule management (out of scope for this phase)
- Do NOT implement the graph-checker agent (WINT-4060) or the cohesion-prosecutor agent (WINT-4070) — those are separate stories
- Do NOT add rules for features outside the LEGO MOC instructions domain unless generalizable
- Do NOT create a runtime rule engine that dynamically evaluates rules at query time — that is WINT-4120's concern

### Reuse Plan

- **Packages**: `@repo/sidecar-rules-registry` (proposeRule, promoteRule, getRules), `@repo/logger`
- **Patterns**: Idempotent seed script pattern (propose → check conflict → promote), direct-call pattern (ARCH-001), discriminated union results
- **Types**: `ProposeRuleInputSchema`, `RuleTypeSchema`, `RuleSeveritySchema` from `@repo/sidecar-rules-registry`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary testable behavior is the seed script: unit tests with mocked `proposeRule`/`promoteRule`, integration tests against a live `wint.rules` table (real DB, per ADR-005)
- Integration test should verify: (1) all expected rules appear in `getRules({ status: 'active' })` after seed, (2) re-running seed is a no-op (idempotency), (3) all rules have `source_story_id = 'WINT-4050'`
- No frontend/E2E tests required (ADR-006 skip condition: `frontend_impacted: false`)
- Consider a snapshot test that asserts the exact set of active rules (rule_text, rule_type, severity) to prevent accidental drift

### For UI/UX Advisor

Not applicable. This is a pure backend seed story with no user-facing changes.

### For Dev Feasibility

- **Primary question**: Where does the seed script live? Options: (a) `packages/backend/database-schema/src/migrations/app/` as a data migration alongside schema migrations, (b) a standalone `packages/backend/sidecars/rules-registry/src/seeds/` script run manually or via `pnpm seed:cohesion-rules`, (c) a test-only fixture used by integration tests. Recommend (b) with a `pnpm` script entry.
- **Key decision**: AC-5 — should upload/replace rules be `gate` type (requires extending `CRUD_STAGES`) or `prompt_injection` advisory only? If `gate`, this story must also update `packages/backend/sidecars/cohesion/src/compute-check.ts`. Recommend advisory `prompt_injection` rules for MVP to keep scope bounded.
- **Canonical references**:
  - `packages/backend/sidecars/rules-registry/src/rules-registry.ts` — the proposeRule/promoteRule function signatures
  - `packages/backend/mcp-tools/src/rules-registry/rules-registry-propose.ts` — how to call proposeRule with error handling
  - `packages/backend/sidecars/rules-registry/src/__types__/index.ts` — ProposeRuleInputSchema and enum values
  - `packages/backend/sidecars/cohesion/src/compute-check.ts` — current CRUD_STAGES and violation model (to understand what gap the rules are filling)
- **Risk**: The `proposeRule()` conflict detector uses case-insensitive text match; ensure rule texts are unique and unambiguous
- **Estimated complexity**: Low-Medium. No schema changes (unless AC-5 decides gate rules for upload/replace). Core work is authoring rule texts and wiring the seed script.
