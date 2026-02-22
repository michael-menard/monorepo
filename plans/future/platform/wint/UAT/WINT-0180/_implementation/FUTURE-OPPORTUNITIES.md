# Future Opportunities - WINT-0180

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | AC-5 and AC-6 lack explicit `grep`-based verification commands in the Test Plan | Low | Low | When WINT-0180 is complete, add two verification commands to the story's Test Plan section for documentation completeness: one for decision rule format (`grep -E "when:\|threshold"`) and one for proof requirements format (`grep -E "verification_command"`) |
| 2 | ST-1 has no output artifact — its findings exist only in the implementing agent's context window | Low | Low | In a future harness iteration, consider requiring ST-1 to write a short `_implementation/SPEC-NOTES.md` capturing the extracted structure map, so the pattern is preserved across context resets |
| 3 | DEFERRED-KB-WRITES.yaml contains stale `story_dir` path (`backlog/WINT-0180` instead of `elaboration/WINT-0180`) | Low | Low | When KB MCP is live, update the path before executing the deferred INSERT, or use `ON CONFLICT DO UPDATE` to correct any previously-written stale entry |
| 4 | AC-7 verification command (`grep -c`) passes even if all three delivery mechanism mentions come from a single section rather than three distinct sections | Low | Low | Post-implementation, manually verify that FRAMEWORK.md contains a dedicated subsection or paragraph for each of the three delivery mechanisms: file injection, `kb_search`, and context-pack sidecar |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | FRAMEWORK.md could include a machine-readable YAML/JSON index of all registered patterns (linking pattern name → `_specs/` file) | Medium | Low | Add an appendix table or `patterns-registry.yaml` alongside FRAMEWORK.md once the pattern library grows beyond 3-4 patterns. Allows agents to discover patterns via file lookup rather than prose reading |
| 2 | Token budget for role instructions (150-300 tokens) is not enforced — it is advisory only | Medium | Medium | In WINT-2010 (Role Pack Sidecar), add a gate that measures token count of each `{role}.md` file against the FRAMEWORK.md-defined budget and rejects files exceeding 300 tokens at sidecar build time |
| 3 | FRAMEWORK.md defines a delivery precedence order but does not specify conflict resolution if two delivery mechanisms return different versions of the same pattern | Low | Low | Add a "Delivery Precedence" section to FRAMEWORK.md: file injection takes precedence over KB MCP, which takes precedence over context-pack sidecar. Deferred to WINT-2010 implementation |
| 4 | Pattern skeleton line constraint (10-25 lines) has no tooling enforcement — the constraint is prose-only | Low | Medium | Consider adding a `scripts/validate-patterns.sh` that counts body lines in all `_specs/*.md` files and fails if any exceed 25 lines. Low-priority until pattern count exceeds ~5 |
| 5 | No versioning strategy for FRAMEWORK.md itself — unlike `_specs/` files, FRAMEWORK.md has no `Version` frontmatter | Low | Low | Add YAML frontmatter to FRAMEWORK.md (e.g., `version: 1.0.0`, `status: Active`, `story: WINT-0180`) following the same convention established by the `_specs/` files. Can be done by the implementing agent within this story's scope |
| 6 | No guidance in FRAMEWORK.md on how to deprecate or retire a pattern | Low | Low | Add a "Pattern Lifecycle" section: Active → Deprecated → Archived, with retention rules. Deferred until a pattern needs deprecation |
| 7 | AC-8 conformance validation is manual (human reads both files and checks) — no automated diff or schema-level check | Low | Medium | In a future story, add a `scripts/check-pattern-conformance.sh` that validates `_specs/*.md` files against the FRAMEWORK.md-defined required sections using `grep` or a lightweight parser |

## Categories

- **Edge Cases**: Items 3, 4 above (stale KB path, enforcement gap)
- **UX Polish**: Item 1 (pattern registry for discoverability)
- **Performance**: Not applicable — documentation-only story
- **Observability**: Item 2 (token budget enforcement at sidecar build time)
- **Integrations**: Items 2, 3 (WINT-2010 sidecar integration, delivery precedence)
- **Future-Proofing**: Items 4, 5, 6, 7 (versioning, lifecycle, tooling)
