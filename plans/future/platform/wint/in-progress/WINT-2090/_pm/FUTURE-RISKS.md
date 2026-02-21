# Future Risks: WINT-2090 — Session Context Management Skills

## Non-MVP Risks

### FR-1: No Validation of Skill Execution in Real Agent Context

- **Risk**: The skill files are authored as documentation. There is no automated mechanism to verify that a leader agent following the `session-create` skill will successfully create a session and emit parseable output. A typo in the execution steps could cause silent failures.
- **Impact (if not addressed post-MVP)**: Leader agents using the skill may emit malformed output blocks, causing orchestrators to fail to capture session_id. Token accounting will break silently.
- **Recommended timeline**: Address in WINT-2100 (session-manager agent) or a future skill validation framework. Consider adding integration test scaffolding when WINT-2080 (context-warmer agent) is built as a reference implementation.

---

### FR-2: Session Accumulation Without Cleanup

- **Risk**: Sessions created by `session-create` will accumulate in `wint.contextSessions` indefinitely until WINT-2100 implements the cleanup scheduler. The `sessionCleanup` tool exists (dryRun=true by default) but is not scheduled.
- **Impact (if not addressed post-MVP)**: `wint.contextSessions` may grow without bound. Query performance for `sessionQuery` may degrade over time, especially with `activeOnly: false` queries.
- **Recommended timeline**: Address in WINT-2100 (session-manager agent). The Session Lifecycle section in both skills documents the cleanup contract with `retentionDays: 90`.

---

### FR-3: No Versioning Strategy for Skill Files

- **Risk**: If the session tool API changes in a future WINT story (e.g., WINT-0110 revision or new session fields), both skill files must be updated. There is no version field in skill frontmatter (unlike agent files which use `version: X.Y.Z`).
- **Impact (if not addressed post-MVP)**: Stale skill documentation may reference outdated parameter names. Agents following the skill may pass deprecated fields.
- **Recommended timeline**: Consider adding `version` and `updated` fields to skill frontmatter in a future WINT-0 polish story. Low priority until multiple skills require versioning.

---

### FR-4: session-inherit Skill Does Not Handle Concurrent Inheritance

- **Risk**: If two worker agents simultaneously call `session-inherit` with the same session_id, both will invoke `sessionQuery` and may both attempt `sessionUpdate` at approximately the same time. While `sessionUpdate` in incremental mode is SQL-arithmetic-safe (no race condition), there is no locking or uniqueness constraint preventing multiple workers from inheriting the same session.
- **Impact**: Multiple workers inheriting the same session is the desired behavior; however, if two workers both inherit and both attempt to interpret themselves as "owning" the session, behavioral confusion could arise in future workflow designs.
- **Recommended timeline**: Not a current concern. Document explicitly in the skill that multiple workers CAN inherit the same session (that is the design intent). No DB change needed.

---

## Scope Tightening Suggestions

- **OUT OF SCOPE (current story)**: Do not add a session ID to `.agent.md` frontmatter or `CHECKPOINT.yaml` — passing session IDs via system prompt injection or initial context is the documented approach.
- **OUT OF SCOPE (current story)**: Do not implement context-pack sidecar injection of session IDs. That is WINT-2020's concern.
- **Future consideration**: When WINT-2110 updates 5 high-volume agents to use cache, the session-create skill may need a `context_pack_session_id` field to correlate sessions with context cache entries.

---

## Future Requirements

- **WINT-2100**: Implement `session-manager` agent that calls `sessionCleanup` on schedule with `dryRun: false` and `retentionDays: 90`
- **WINT-2110**: Update 5 high-volume agents (pm-bootstrap-workflow, dev-implement-story, etc.) to invoke `session-create` skill at workflow start and pass session_id to spawned workers
- **Skill validation framework** (untracked): A future story could add automated validation that skill frontmatter is valid, required sections exist, and MCP tool names referenced in the skill match registered tool names
