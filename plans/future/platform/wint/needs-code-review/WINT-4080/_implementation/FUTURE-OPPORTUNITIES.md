# Future Opportunities - WINT-4080

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Stale path references in ST-1 and ST-4 subtask bodies point to `backlog/WINT-4080/` which does not exist; correct path is `elaboration/WINT-4080/_pm/STORY-SEED.md` | Low | Low | Fix subtask file paths at implementation time; no story re-elaboration needed |
| 2 | Warning count per missing optional input is not specified in AC-2; TEST-PLAN ERR-2 assumes 2 warnings (gaps.json missing + da.md missing) but AC-2 is silent on the count algorithm | Low | Low | Implementer convention: count one warning per missing optional input; document in agent file under Completion Signals section |
| 3 | No explicit instruction on what happens when `scope-challenges.json` already exists from a prior run (idempotency behavior) | Low | Low | Add to agent Non-Negotiables: "Overwrite existing `scope-challenges.json` on each run; do not append or merge" — defer to v1.1.0 patch |
| 4 | Agent file has no `spawned_by` or `triggers` frontmatter field; makes it undiscoverable from orchestrator context | Low | Low | WINT-4140 story should document which orchestrator spawns scope-defender; add `spawned_by` field when Round Table integration is implemented |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | ST-6 creates test fixtures in `tests/fixtures/scope-defender/` — these could be promoted to a formal regression harness reusable across DA agent versions and WINT-9040 LangGraph port | Medium | Low | Tag fixture creation in ST-6 as a candidate for promotion to shared test harness when WINT-9040 begins |
| 2 | `deferral_note` in `scope-challenges.json` schema is marked optional but is the primary input to WINT-8060 backlog write; a missing note means the backlog entry will be imprecise | Medium | Low | Make `deferral_note` required when `recommendation == "defer-to-backlog"`; defer this constraint to WINT-4150 schema standardization |
| 3 | Agent produces a human-readable summary alongside JSON (per TEST-PLAN HP-5) but the storage location and format of this summary are not specified — it could be inline in agent response or as a separate `.md` artifact | Low | Low | Define summary output location in agent file; suggest inline response summary (not a file) to keep artifact surface minimal; defer formal artifact definition to WINT-4150 |
| 4 | Hard cap priority ordering ("top 5 by highest-impact deferral potential") uses `risk_if_deferred` enum as primary sort key but does not define a tie-breaking rule when multiple items share the same risk level | Low | Low | Add tie-breaking rule: secondary sort by scope size (number of ACs or file count affected by the deferred item); defer to v1.1.0 when empirical data exists |
| 5 | `accept-as-mvp` recommendation value in the `scope-challenges.json` schema represents a non-challenge (the DA concluded the item is MVP-justified) — including these in the `challenges` array adds noise for WINT-4140 Round Table | Low | Medium | Consider filtering `accept-as-mvp` items from the `challenges` array and tracking them in a separate `accepted` array; defer to WINT-4150 schema standardization |
| 6 | No version field in `scope-challenges.json` output — if WINT-4150 makes breaking schema changes, WINT-4140 cannot detect which schema version it is consuming | Low | Low | Add `schema_version: "1.0"` to the top-level `scope-challenges.json` output; defer to WINT-4150 which owns formal schema versioning |

## Categories

- **Edge Cases**: Issues 1-4 in Gaps section; Items 3, 4 in Enhancement Opportunities
- **UX Polish**: Item 3 (human summary location), Item 5 (accept-as-mvp noise reduction)
- **Integrations**: Item 1 (fixture harness reuse for WINT-9040), Item 2 (deferral_note for WINT-8060), Item 6 (schema versioning for WINT-4150)
- **Observability**: Item 6 (schema_version field for downstream consumers)
