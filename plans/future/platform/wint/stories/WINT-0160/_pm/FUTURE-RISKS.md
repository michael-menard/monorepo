# Future Risks: WINT-0160 — Validate and Harden doc-sync Agent

**Story:** WINT-0160
**Authored:** 2026-02-17

---

## Non-MVP Risks

### Risk 1: Documentation Quality Drift After Agent Updates

**Risk:** After WINT-0160 closes, future modifications to `doc-sync.agent.md` may re-introduce frontmatter gaps or mismatched tool names without detection.

**Impact (if not addressed post-MVP):** The hardening achieved in WINT-0160 erodes over time.

**Recommended timeline:** WINT-7120 (Final Documentation Sync) — add a validation step that re-checks agent frontmatter completeness at Phase 7 completion.

---

### Risk 2: LangGraph Porting Notes May Be Stale by WINT-9020

**Risk:** The porting interface contract added in AC-6 is authored in 2026-02. By the time WINT-9020 (Phase 9) is worked, the doc-sync agent may have been updated, making the porting notes outdated.

**Impact (if not addressed post-MVP):** WINT-9020 implementer ports a stale interface, causing parity mismatches.

**Recommended timeline:** WINT-9020 setup phase — implementer must re-read AC-6 notes and confirm currency before porting.

---

### Risk 3: WINT-0170 Integration Coupling

**Risk:** If the `--check-only` exit code semantics are documented in WINT-0160 but WINT-0170 implements them differently, the gate will malfunction.

**Impact (if not addressed post-MVP):** Silent documentation drift — commits pass pre-commit hook even when docs are out of sync.

**Recommended timeline:** WINT-0170 elaboration — implementer must reference the AC-7 documentation as the source of truth and verify alignment.

---

## Scope Tightening Suggestions

- AC-1 (MCP tool name verification) has optional depth: if the server is unavailable, this AC should close with "assumed correct" attestation rather than blocking the story.
- AC-6 (LangGraph Porting Notes) should be capped at a single concise section (300-500 words max) — do not allow this to expand into a full porting guide document.

---

## Future Requirements

- **Watch mode for doc-sync** — currently flagged in `doc-sync.agent.md` Future Enhancements section. Useful for developer inner-loop but not MVP-blocking.
- **Mermaid-cli validation** — automated diagram validation in CI would harden the doc-sync output quality beyond WINT-0160's manual verification scope.
