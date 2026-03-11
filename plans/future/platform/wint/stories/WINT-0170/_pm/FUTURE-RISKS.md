# Future Risks — WINT-0170: Add Doc-Sync Gate to Phase/Story Completion

**Story ID:** WINT-0170
**Generated:** 2026-02-17

---

# Non-MVP Risks

## Risk FR-1: Gate performance impact at scale
- **Risk:** `/doc-sync --check-only` may take 15-60+ seconds on large repositories as agent file counts grow. This adds latency to every PASS completion.
- **Impact (if not addressed post-MVP):** Workflow throughput degrades when running batch completions. Users experience slow completion acknowledgments.
- **Recommended timeline:** After WINT-0170 lands in UAT. Measure actual wall-clock time during UAT runs. If >30s routinely, open a follow-up story for doc-sync check-only optimization (e.g., diff-scoped check rather than full file scan).

## Risk FR-2: Gate not applied to other completion agents
- **Risk:** WINT-0170 only gates `elab-completion-leader` and `qa-verify-completion-leader`. Other completion events (e.g., `dev-implement-implementation-leader`, `code-review` completion signals) are not gated in Phase 0.
- **Impact:** Documentation drift can still occur at non-gated completion boundaries.
- **Recommended timeline:** WINT Phase 1 — after WINT-0170 is validated, audit other completion agents and add gates as appropriate.

## Risk FR-3: LangGraph gate equivalent not implemented
- **Risk:** The doc-sync gate in WINT-0170 is Claude Code agent prose only. When LangGraph workflow is active (WINT-9000 series), there is no equivalent gate in the LangGraph completion node.
- **Impact:** LangGraph completions bypass the doc-sync requirement.
- **Recommended timeline:** WINT-9020 (doc-sync LangGraph Node) — gate logic should be ported as part of that story.

---

# Scope Tightening Suggestions

- **Timeout specification**: The seed explicitly says "Do NOT implement timeout logic in the completion agents." This is correct for MVP. If a follow-up story adds timeout handling, it should be in the doc-sync agent itself, not the completion agents.
- **Explicit bypass flag**: A `--skip-doc-sync-gate` escape hatch on completion agents could be useful in CI environments. Out of scope for WINT-0170 per non-goals; could be added in a follow-up if the gate causes CI friction.

---

# Future Requirements

- Doc-sync gate on `dev-implement-implementation-leader` completion
- Doc-sync gate on code review completion agents
- Performance optimization for `--check-only` in large repos (diff-scoped detection only)
- `--skip-doc-sync-gate` bypass flag for CI/emergency use
- Gate metrics: track how often doc-sync gate fires (exit code 1) vs. passes (exit code 0) across all completions — useful for understanding documentation hygiene trends
