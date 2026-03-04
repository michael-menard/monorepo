# Dev Feasibility Review: WINT-0210 — Populate Role Pack Templates

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is a pure documentation story — 4 markdown files with no code, no database, no API, no TypeScript. The only technical constraint is the 150-300 token budget per file, which is easily verified via word count. The only risk is dependency timing (WINT-0190 and WINT-0200 must be complete for exact schema filenames), which has a clear mitigation.

---

## Likely Change Surface (Core Only)

- **Files created**: `.claude/prompts/role-packs/dev.md`, `.claude/prompts/role-packs/po.md`, `.claude/prompts/role-packs/da.md`, `.claude/prompts/role-packs/qa.md`
- **Directory created**: `.claude/prompts/role-packs/`
- **Packages modified**: None
- **Endpoints**: None
- **Deploy touchpoints**: None (no deployment required for markdown files)
- **Database changes**: None

---

## MVP-Critical Risks (Max 5)

### Risk 1: Dependency Timing — Schema Filenames Not Final

- **Risk**: dev.md must reference `schemas/patch-plan.schema.json` (WINT-0190) and po.md must reference `schemas/user-flows.schema.json` (WINT-0200). If those stories are not complete when WINT-0210 begins, the exact paths are unknown.
- **Why it blocks MVP**: Role packs with broken schema references are misleading and potentially unusable — agents would reference non-existent files.
- **Required mitigation**: Implementation gate check — verify WINT-0190 and WINT-0200 are in UAT or complete status before authoring role packs. If delayed, use clear placeholder paths (`schemas/patch-plan.schema.json` marked `# TBD`) and do a single-pass update when schemas land.

### Risk 2: WINT-0180 Skeleton Format Not Yet Defined

- **Risk**: AC-12 requires role packs to follow the 10-25 line skeleton format (decision rule, proof requirement, examples) established by WINT-0180. If WINT-0180 does not specify exact section headings or structural requirements, AC-12 verification is ambiguous.
- **Why it blocks MVP**: Inconsistent skeleton across 4 files means the injection mechanism (WINT-2010, Phase 2) cannot rely on a standard parse pattern.
- **Required mitigation**: Before authoring, read and extract the exact skeleton specification from WINT-0180 output. If WINT-0180 specifies headings (e.g., "Decision Rule:", "Proof:", "Positive Example:", "Negative Example:"), use them verbatim. If not specified, adopt a consistent convention across all 4 files and document it as the de facto standard.

---

## Missing Requirements for MVP

None. The story scope is self-contained and requirements are well-specified in the seed and ACs. The only missing information is the exact schema filenames from WINT-0190 and WINT-0200, which is a dependency issue not a requirements gap.

---

## MVP Evidence Expectations

- **AC-1**: `ls .claude/prompts/role-packs/` shows all 4 files
- **AC-4, AC-6**: `grep -i "MUST NOT"` returns results in po.md and da.md with the specific caps stated
- **AC-9**: `grep "ac_id\|evidence_type\|evidence_ref\|verdict"` returns all 4 fields in qa.md
- **AC-11**: `wc -w` on each file shows 110-225 words (≈ 150-300 tokens)
- **AC-12**: `wc -l` shows 10-25 lines per file; structural sections visible in cat output

---

## Effort Estimate

- **Points**: 1 (pure documentation, no code)
- **Hours**: 2-4 hours for 4 focused markdown files, once dependencies complete
- **Token counting verification**: ~30 additional minutes
- **Single-pass schema path update** (if needed): ~15 minutes

---

## Notes

- No TypeScript, no Zod schemas, no test files required for this story
- No changes to existing agent files
- No database migrations
- This story is safe to queue and generate now; implementation blocked only on WINT-0180, WINT-0190, WINT-0200 completion
