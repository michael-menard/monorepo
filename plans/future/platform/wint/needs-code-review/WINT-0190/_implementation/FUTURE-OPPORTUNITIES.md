# Future Opportunities - WINT-0190

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | ST-3 subtask references stale `backlog/WINT-0190/_pm/STORY-SEED.md` path; actual path is `elaboration/WINT-0190/_pm/STORY-SEED.md` | Low | Low | Implementer note; no AC impact since specs are in story body. Fix subtask path in a future story-quality cleanup pass. |
| 2 | `max_files` and `max_diff_lines` defaults (10 and 300) are described as "starting estimates" needing per-codebase tuning — no override/config mechanism is designed | Medium | Medium | Deferred to a future configuration story. Current story explicitly calls this out in Non-Goals. Could become a WINT-3xxx concern alongside Gatekeeper Sidecar. |
| 3 | JSON Schema draft 2020-12 cannot enforce ordered sequence of `patch_type` values in the `patches` array — ordering is convention, not machine-enforced | Medium | High | Runtime enforcement is explicitly WINT-3010 scope. Future opportunity: add a `patternProperties` or `unevaluatedItems` constraint, or design a Gatekeeper validation step that checks array order by `patch_type` sequence. |
| 4 | No `minItems: 1` constraint on the `patches` array — a technically valid document with zero patches would pass schema validation | Low | Low | Add `minItems: 1` to `patches` array definition. Low effort, could be added in implementation without changing scope. Deferred here as it is not AC-specified. |
| 5 | `verification_command` is optional per AC-1 spec — patches without a verification command provide no proof-of-completion signal for the Gatekeeper | Low | Low | Deferred to WINT-3010 which will enforce this at runtime. Future option: add a warning-level validation rule if `verification_command` is absent. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `patch-plan.schema.json` could include a top-level `description` field for human-readable plan summaries (e.g., "Add wishlist feature to main app") | Low | Low | Add optional `description: string` to root object in a v1.1 schema bump. Consistent with `user-flows.schema.json` which includes `featureName` |
| 2 | No `$comment` or `description` fields on `RepairLoop.rerun_command` to guide implementers on what commands are valid (e.g., `pnpm lint`, `pnpm check-types`) | Low | Low | Add `description` fields inline in schema for each field. Zero schema-version change, purely informational. |
| 3 | Pattern documentation files (`patch-queue-pattern.md`, `repair-loop-pattern.md`) will initially be standalone; they could be cross-indexed in a `_specs/README.md` for discoverability | Low | Low | Add a `_specs/README.md` index listing all spec files in a future pass, potentially as part of WINT-0210 scope. |
| 4 | AJV validation steps are documented inline in pattern docs but not as a standalone runnable script; a `scripts/validate-patch-plan.sh` wrapper would improve DX | Low | Low | Out of scope for this story (no TypeScript/scripts). Could be added in WINT-3010 or as a standalone chore. |
| 5 | The `patch-plan.example.json` is constrained to 10-25 lines to satisfy WINT-0210 AC-1 skeleton requirements; a richer reference example demonstrating all 5 `patch_type` steps would be valuable for documentation | Medium | Low | Create a separate `patch-plan.full-example.json` in `schemas/examples/` outside WINT-0190 scope. |
| 6 | No machine-readable link between `patch-queue-pattern.md` and `patch-plan.schema.json` — the cross-reference is prose only | Low | Low | Future: add a YAML frontmatter `schema_ref` field to pattern docs linking to canonical schema path. Requires `examples-framework.md` v1.1 format update. |

## Categories

- **Edge Cases**: Items 4, 5 in Gaps — schema completeness edge cases and optional field enforcement
- **UX Polish**: Items 2, 3, 4, 5 in Enhancements — developer experience improvements around discoverability and tooling
- **Performance**: None applicable (static artifacts)
- **Observability**: Item 4 in Enhancements — validation script for CI
- **Integrations**: Item 3 in Gaps — ordering enforcement integration with WINT-3010 Gatekeeper
- **Future-Proofing**: Items 1, 6 in Enhancements — schema evolution and cross-referencing
