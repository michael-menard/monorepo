# Future Opportunities - WINT-4090

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | AC-2 warning count specification is implicit: the story says "warning count incremented" but does not define what constitutes a warning vs. a skipped optional input vs. a soft degradation. | Low | Low | In ST-2 implementation, define a `warnings: string[]` list in the output schema alongside `overall_verdict`. Clarify that each missing optional input adds one warning entry. |
| 2 | ac-verdict.json is described as written to `{story_dir}/_implementation/` but no idempotency behavior is specified: does a second run overwrite or append? | Low | Low | Specify overwrite semantics in the agent file (same pattern as scope-defender). Add a note in LangGraph Porting Notes. |
| 3 | The schema has no `schema_version` field. WINT-4150 will need to distinguish v1 from future versions. | Low | Low | WINT-4150 should add `schema_version: 1` to the schema when standardizing. Implementer may pre-add as an optional field without violating this story's scope. |
| 4 | `spawned_by` / `triggers` frontmatter fields are not included in the specified WINT standard fields for AC-1. Other agents use `spawned_by` for traceability. | Low | Low | Add `spawned_by: []` as a placeholder in the frontmatter with a note that WINT-4120 will populate it when the agent is integrated into the QA workflow. |
| 5 | The WINT-9050 depends_on field in stories.index.md lists `WINT-4070` (cohesion-prosecutor) rather than `WINT-4090` (evidence-judge). This is likely a PM typo. | Medium | Low | PM should correct WINT-9050 depends_on to WINT-4090 before WINT-9050 elaboration begins. Non-blocking for WINT-4090 implementation. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The human summary output format is not specified. The agent produces a machine-readable `ac-verdict.json` but the summary for human consumption has no documented location or format. | Low | Low | Define a `## Human Summary` section in the completion output or write a companion `ac-verdict-summary.md` alongside the JSON. |
| 2 | Evidence type taxonomy could be extended: `log` (structured log output), `screenshot` (E2E visual), `migration` (DB state artifact). These are reasonable future additions as the workflow matures. | Low | Medium | Defer to WINT-4150 schema standardization. Document these as candidate types in FUTURE-OPPORTUNITIES. |
| 3 | The subjective language blocklist (`appears`, `seems`, `should`, `looks`) could be expanded to include: `possibly`, `probably`, `might`, `expect`, `assume`. | Low | Low | Implementer may expand the list during ST-3 as a non-breaking addition. |
| 4 | A shared regression test harness (canonical EVIDENCE.yaml fixtures with expected ac-verdict.json outputs) would benefit multiple Phase 4 agents. | Medium | Medium | Defer to WINT-4150 or create a `tests/fixtures/evidence-judge/` directory alongside ST-6's test fixtures. |
| 5 | The `proof_required` field in ac-verdict.json is documented as optional. Requiring it for all CHALLENGE/REJECT verdicts (not just when available) would make the output more actionable for implementers. | Low | Low | Consider making `proof_required` required (non-nullable) for CHALLENGE and REJECT verdicts in the ST-1 schema design. |

## Categories

- **Edge Cases**: Warning count ambiguity (gap-1), idempotency behavior (gap-2), schema versioning (gap-3), spawned_by traceability (gap-4)
- **UX Polish**: Human summary output format (enh-1), expanded subjective language blocklist (enh-3)
- **Future-Proofing**: Evidence type taxonomy extensions (enh-2), shared test fixture harness (enh-4), proof_required constraint tightening (enh-5)
- **Data Integrity**: WINT-9050 depends_on typo (gap-5)
