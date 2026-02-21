# Future Opportunities - WINT-2090

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `sessionQuery` does not support `limit` / pagination guidance in the skill — workers querying large session pools may miss their session if it falls beyond the default limit (50). | Low | Low | Add a note in `session-inherit` that workers should use `storyId` as a filter when available, reducing result set size before client-side ID matching. Defer to a future skill revision. |
| 2 | No session ID validation pattern documented for the `session_id` argument accepted by `session-inherit`. A malformed UUID passed as input (e.g., from prompt injection or copy-paste error) would result in a confusing "SESSION NOT FOUND" rather than an explicit validation error. | Low | Low | Add a UUID format check step at the top of `session-inherit` before invoking `sessionQuery`. Can be added in a minor skill revision post-WINT-2090. |
| 3 | The `sessionComplete` restriction in AC-10 is enforced by documentation only — there is no runtime guard in WINT-0110 preventing a worker from calling `sessionComplete`. A confused worker agent could still double-complete a session. | Low | Medium | Consider adding an `ownerAgentName` field to `wint.contextSessions` in a future story (post-WINT-2100) so `sessionComplete` can reject calls from non-owning agents. Defer to WINT-2100 or later. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **UX Polish**: The `SESSION CREATED` output block pattern `/SESSION CREATED\n\s+session_id:\s+([0-9a-f-]{36})/` is defined in AC-9 but the skill has no guidance on how a leader orchestrator actually captures this block from a spawned worker's output. A brief worked example (pseudocode showing regex match and injection into worker system prompt) would make the skill self-contained. | Medium | Low | Add an "Orchestrator Integration Example" subsection to `session-create/SKILL.md`. Defer to post-MVP skill polish. |
| 2 | **Observability**: Neither skill documents what to log when graceful degradation is triggered. Leaders and workers that emit `SESSION UNAVAILABLE` have no standard format for this warning in telemetry, making it hard to count session failures in aggregate. | Low | Low | Define a structured `SESSION UNAVAILABLE` log format in both skills (e.g., `{ event: "session_unavailable", reason: "null_return", agent: "...", story: "..." }`) and note it in the Graceful Degradation section. Defer to WINT-3020 (Telemetry Logging). |
| 3 | **Performance**: `session-inherit` must call `sessionQuery` with `activeOnly: true` for every worker spawn. In high-parallelism batch workflows (WINT-6010), N workers each issuing a `sessionQuery` call on startup creates N DB reads. A session ID cache in the leader's context could eliminate these reads. | Low | Medium | Defer caching optimization to WINT-2100 (session-manager Agent). No action in WINT-2090. |
| 4 | **Integration**: The skills specify session IDs are passed via "system prompt injection or initial context." For Claude Code workflows, the mechanism is clear. For LangGraph parity (WINT-9090), session ID injection into LangGraph node state will need explicit handling. No LangGraph Porting Notes section is planned in these skills. | Medium | Low | Add a minimal "LangGraph Porting Notes" stub to both skill files (matching the pattern established in `doc-sync/SKILL.md`) tracking WINT-9090 as the implementation story. Defer to WINT-9090 elaboration. |
| 5 | **Accessibility / Discoverability**: The `session-create` and `session-inherit` skills will not be listed in `SKILLS.md` until a `doc-sync` run is triggered post-implementation. Agents that scan SKILLS.md before deciding to use session tracking will not discover these skills until then. | Low | Low | Run `/doc-sync` immediately after WINT-2090 implementation lands. Consider adding to the ST-6 verification step. Defer doc-sync integration to WINT-0170 gate. |

## Categories

- **Edge Cases**: Items 1, 2 — query boundary conditions and input validation gaps
- **UX Polish**: Item 1 in Enhancements — orchestrator integration example
- **Observability**: Item 2 in Enhancements — structured degradation log format
- **Performance**: Item 3 in Enhancements — leader-side session ID caching
- **Integrations**: Item 4 in Enhancements — LangGraph porting notes
- **Discoverability**: Item 5 in Enhancements — doc-sync integration timing
