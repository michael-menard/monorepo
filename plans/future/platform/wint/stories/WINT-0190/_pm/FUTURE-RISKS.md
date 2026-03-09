# Future Risks: WINT-0190 — Create Patch Queue Pattern and Schema

## Non-MVP Risks

### Risk 1: Default limits may not fit all codebase sizes
**Impact:** If max_files=10 and max_diff_lines=300 are too restrictive for some story types (e.g., large schema migrations), agents will consistently exceed limits and the Patch Queue pattern will be perceived as noise rather than signal.
**Recommended timeline:** Revisit defaults after 10 stories use the pattern (Phase 3 telemetry data should show limit violation frequency).

---

### Risk 2: Ordering convention is documentation-only, not schema-enforced
**Impact:** JSON Schema cannot enforce that `types_schema` patches appear before `api` patches in the array. Agents may submit out-of-order patch plans that pass validation. The constraint relies entirely on documentation and agent role pack guidance.
**Recommended timeline:** WINT-3010 (Gatekeeper Sidecar) should implement ordering enforcement as a runtime check, not a schema check. Add to WINT-3010 scope notes.

---

### Risk 3: `patch-queue-pattern.md` format may diverge from role pack format
**Impact:** WINT-0210 will embed the Patch Queue pattern spec into a full role pack file. If the `_specs/` format used here is incompatible with the role pack format, WINT-0210 implementer will need to reformat.
**Recommended timeline:** Coordinate with WINT-0210 implementer before starting AC-4. A quick format check against any existing role pack stub prevents rework.

---

### Risk 4: Schema becomes stale relative to codebase conventions
**Impact:** As the project evolves, new patch types may be needed (e.g., `database_migration`, `config_change`). The current `patch_type` enum would need updating, which is a schema version bump.
**Recommended timeline:** Add `schema_version` semver field (already in scope) to enable schema evolution. Document versioning policy when schema reaches v1.0.0.

---

### Risk 5: AJV CLI not available in agent runtime environments
**Impact:** Test Plan validation commands (AC-6 AJV steps) may not be runnable in restricted environments. QA verification would fall back to manual inspection only.
**Recommended timeline:** Document `npx ajv` invocation consistently. Consider adding AJV to project devDependencies in a future story.

---

## Scope Tightening Suggestions

- **OUT OF SCOPE (defer to WINT-3010):** Runtime enforcement of ordering constraints. This story defines the schema and documents the convention. Enforcement belongs to the Gatekeeper Sidecar.
- **OUT OF SCOPE (defer to WINT-0210):** Creating the actual Dev role pack file. WINT-0190 produces only the specification contribution, not the full role pack.
- **OUT OF SCOPE (defer to future config story):** Per-codebase limit overrides. The schema establishes defaults; codebase-specific tuning is a future configuration story.
- **Clarification for AC-5 (Repair Loop):** Should the Repair Loop be in the same file as the Patch Queue pattern, or a separate `repair-loop-pattern.md`? The seed says "documented separately" — implementer should follow this and create two files.

---

## Future Requirements

- **Zod schema for TypeScript validation:** When `patch-plan.schema.json` is used in runtime contexts (e.g., Gatekeeper Sidecar validation), a corresponding Zod schema in `packages/backend/orchestrator/src/` should be derived from the JSON Schema. Per CLAUDE.md, all runtime types must be Zod-first.
- **Additional patch types:** `database_migration`, `config_change`, `infra_change` may be needed for infrastructure-heavy stories. Track via backlog.
- **Interactive Patch Plan builder:** A `/patch-plan new` command that guides devs through creating a valid patch-plan.json would improve adoption. Defer to Phase 6 tooling stories.
- **Patch plan validation in CI:** Add a pre-commit hook or CI step that validates any `patch-plan.json` files against the schema. Defer to Phase 7 migration stories.
