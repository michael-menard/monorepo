# WINT-0160 Working Set — QA Verification Failed

## Story Context

**Story ID:** WINT-0160
**Title:** Validate and Harden doc-sync Agent for Production Readiness
**Current Status:** failed-qa
**Phase:** 0
**Verdict:** QA FAIL — 3 ACs not met
**QA Complete:** 2026-02-17T23:35:00Z

---

## Open Blockers

**QA Verification Failed**: Three acceptance criteria were not met on disk despite EVIDENCE.yaml attestations:

1. **AC-4: SKILL.md Version History Entry 1.1.0 Missing**
   - _Issue_: Version history section in SKILL.md contains only 1.0.0 entry; 1.1.0 entry does not exist
   - _Evidence_: File inspection + grep confirmed no "1.1.0" match in SKILL.md
   - _Fix Required_: Add version history entry for 1.1.0 to SKILL.md

2. **AC-6: LangGraph Porting Notes Section Missing from SKILL.md**
   - _Issue_: SKILL.md lacks "LangGraph Porting Notes" section required by AC-6
   - _Evidence_: Full file read (748 lines) confirms section absence; grep for "LangGraph" returned zero matches
   - _Fix Required_: Add LangGraph Porting Notes section to SKILL.md with:
     - Canonical inputs (flags: `--check-only`, `--force`)
     - 7-phase workflow contract
     - Outputs (SYNC-REPORT.md + doc files)
     - MCP tool list for dependency mapping

3. **AC-7: WINT-0170 Integration Note Missing from doc-sync.agent.md**
   - _Issue_: Check-Only Mode section in doc-sync.agent.md does not mention WINT-0170 integration point
   - _Evidence_: Full file read confirms Check-Only Mode section (lines 404-417) lacks WINT-0170 reference; grep returned zero matches
   - _Fix Required_: Add WINT-0170 integration note to doc-sync.agent.md documenting:
     - WINT-0170 will add doc-sync as a gate to phase/story completion
     - `--check-only` flag behavior: Exit 0 = docs in sync, Exit 1 = docs out of sync (blocks completion)

---

## Lessons Learned

From QA-VERIFY.yaml:

> EVIDENCE.yaml attestations can diverge from disk reality in doc-only stories where the leader executes changes without spawning a coder. Three of eight ACs in WINT-0160 were attested as PASS in EVIDENCE.yaml but were not found on disk. QA verification by actual file inspection is essential — evidence self-attestation alone is insufficient.

**Recommended Pattern for Doc-Only Stories:**

For future doc-only chore stories executed entirely in-leader, require the leader to emit a grep/read verification step confirming new content is present before writing EVIDENCE.yaml. A "write then verify" pattern catches false attestations before QA phase.

---

## Next Steps

1. **Fix AC-4**: Add 1.1.0 entry to SKILL.md version history
2. **Fix AC-6**: Add LangGraph Porting Notes section to SKILL.md (4 subsections)
3. **Fix AC-7**: Add WINT-0170 integration note to doc-sync.agent.md Check-Only Mode section
4. **Rerun QA Verification** after fixes are applied
5. **Transition to ready-for-qa** pending successful verification

---

## Waiting On

- **Fix iteration**: Implementation of 3 doc-only fixes to SKILL.md and doc-sync.agent.md
