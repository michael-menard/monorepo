# Test Plan: WINT-0160 — Validate and Harden doc-sync Agent

**Story:** WINT-0160
**Authored:** 2026-02-17
**Agent:** pm-draft-test-plan (v3.0.0)

---

## Scope Summary

- **Endpoints touched:** None (no HTTP API changes)
- **UI touched:** No
- **Data/storage touched:** No (read-only MCP tool name verification against postgres-knowledgebase)
- **Files touched:**
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/doc-sync.agent.md` (audit + potential updates)
  - `/Users/michaelmenard/Development/monorepo/.claude/skills/doc-sync/SKILL.md` (add LangGraph Porting Notes section)
- **Scope type:** Audit, verification, and documentation hardening — no new logic

---

## Happy Path Tests

### Test 1: MCP Tool Name Verification (AC-1)

**Setup:**
- postgres-knowledgebase MCP server must be running (WINT-0080 data seeded)
- Read current `doc-sync.agent.md` frontmatter to get tool names: `mcp__postgres-knowledgebase__query-workflow-phases`, `mcp__postgres-knowledgebase__query-workflow-components`

**Action:**
- Query the postgres-knowledgebase MCP server tool registry
- Compare registered tool names against agent frontmatter `mcp_tools` list

**Expected outcome:**
- Both tool names in frontmatter exactly match registered tool identifiers
- If mismatch found: frontmatter updated with correct names

**Evidence:**
- Screenshot or log output of MCP server tool list showing exact tool name strings
- Agent frontmatter before/after diff (if corrections were made)

---

### Test 2: Frontmatter Completeness Check (AC-2)

**Setup:**
- Read current `doc-sync.agent.md` at `/Users/michaelmenard/Development/monorepo/.claude/agents/doc-sync.agent.md`

**Action:**
- Verify all WINT standard fields are present: `created`, `updated`, `version`, `type`, `name`, `description`, `model`, `tools`, `mcp_tools`
- Verify `model` is exactly `haiku`
- Verify `updated` is `2026-02-16` (WINT-0150 modification date)
- Verify `version` is at minimum `1.1.0` in semantic version format

**Expected outcome:**
- All 9 required fields present
- `model: haiku` confirmed
- `updated: 2026-02-16` confirmed
- `version: 1.1.0` or higher confirmed

**Evidence:**
- Output of frontmatter fields with checklist of each field verified

---

### Test 3: Completion Signal Consistency (AC-5)

**Setup:**
- Read `doc-sync.agent.md` body content

**Action:**
- Search for "Completion Signals" section
- Verify all four signals are defined:
  - `DOC-SYNC COMPLETE`
  - `DOC-SYNC COMPLETE (warnings)`
  - `DOC-SYNC CHECK FAILED`
  - `DOC-SYNC BLOCKED: {reason}`

**Expected outcome:**
- "Completion Signals" section exists in agent file
- All four signals listed with descriptions

**Evidence:**
- Screenshot of Completion Signals section in agent file

---

### Test 4: LangGraph Porting Interface Contract (AC-6)

**Setup:**
- Identify target file: `SKILL.md` or `doc-sync.agent.md`
- Read current content of target file

**Action:**
- Verify "LangGraph Porting Notes" section exists (or add it)
- Section must define:
  - Canonical inputs: flags `--check-only`, `--force`
  - The 7-phase workflow as the logical execution contract (phases 1-7 named)
  - Outputs: `SYNC-REPORT.md` + modified documentation files
  - MCP tools used: list for LangGraph node dependency mapping

**Expected outcome:**
- "LangGraph Porting Notes" section present and complete
- All four subsections present (inputs, workflow, outputs, MCP tools)
- Section is prose/spec-only — no implementation code

**Evidence:**
- Contents of "LangGraph Porting Notes" section shown in full

---

### Test 5: WINT-0170 Integration Point (AC-7)

**Setup:**
- Read `doc-sync.agent.md`

**Action:**
- Search for `--check-only` flag documentation
- Verify exit code behavior is documented:
  - `exit 0` = docs are in sync
  - `exit 1` = docs are out of sync, blocks completion

**Expected outcome:**
- `--check-only` flag documented in Input section (or dedicated section)
- Exit code semantics clearly stated
- Note that WINT-0170 will use this flag as a gate mechanism

**Evidence:**
- Contents of flag documentation shown

---

## Error Cases

### Error Test 1: MCP Tools Unavailable (AC-3 — Graceful Degradation)

**Setup:**
- postgres-knowledgebase workflow tables (`workflow.phases`, `workflow.components`) do not exist
  - Either WINT-0070 is pending OR tables dropped for test
  - Simulate by: querying a non-existent table OR confirming WINT-0070 is still pending

**Action:**
- Run `/doc-sync` command against real codebase

**Expected:**
- Command completes without unhandled exception
- SYNC-REPORT.md generated with `database_status: unavailable` (or equivalent)
- Agent falls back to file-only mode
- No error thrown to the user

**Evidence:**
- SYNC-REPORT.md contents showing `database_status: unavailable` or similar
- Confirmation no exception was thrown

---

### Error Test 2: File-Only Mode Produces Valid Output (AC-4)

**Setup:**
- postgres-knowledgebase unavailable OR no MCP tools accessible

**Action:**
- Run `/doc-sync` without database access

**Expected:**
- Documentation files updated from file frontmatter only
- `AGENTS.md`, `COMMANDS.md`, or `docs/workflow/` files reflect file-sourced data
- SYNC-REPORT.md accurately reflects file-only operation mode
- `database_queried: false` or `database_status: unavailable` in report

**Evidence:**
- SYNC-REPORT.md showing file-only mode
- At least one documentation file updated (or "no changes needed" message)

---

### Error Test 3: Check-Only Mode Does Not Modify Files (AC-7 regression)

**Setup:**
- Agent and doc files in a known state

**Action:**
- Run `/doc-sync --check-only`

**Expected:**
- Zero documentation files modified
- SYNC-REPORT.md written with "Check only" mode marker
- Exit code 0 if in sync, exit code 1 if out of sync

**Evidence:**
- `git diff` showing no changes to documentation files
- SYNC-REPORT.md showing "Check only" run mode

---

## Edge Cases

### Edge Case 1: WINT-0080 Tables Live But WINT-0070 Not

**Setup:**
- WINT-0080 (in UAT) seeded agents/commands/skills data
- WINT-0070 (workflow tracking tables) is still pending — `workflow.phases` and `workflow.components` may not exist

**Action:**
- Verify the agent gracefully handles the case where the workflow tables queried in Phase 2.2 of the agent don't exist yet

**Expected:**
- `workflow.components` and `workflow.phases` queries fail gracefully (timeout or table-not-found)
- Agent degrades to file-only mode
- No crash

**Evidence:**
- SYNC-REPORT.md showing which tables were unavailable

---

### Edge Case 2: Concurrent /doc-sync Runs

**Setup:**
- Two doc-sync invocations started near-simultaneously (or simulate via documentation in edge cases table)

**Action:**
- Verify "Concurrent runs" scenario in agent's Edge Cases table is documented
- Verify agent checks `git working directory clean, warn if dirty`

**Expected:**
- Edge cases table in agent file contains "Concurrent runs" scenario with documented handling

**Evidence:**
- Screenshot of Edge Cases table showing concurrent run handling

---

### Edge Case 3: Agent Frontmatter Already Correct (no-op)

**Setup:**
- `doc-sync.agent.md` frontmatter already fully correct

**Action:**
- Run verification — all fields pass

**Expected:**
- No changes made to agent file
- Story can still close: ACs verified without requiring file modification

**Evidence:**
- Frontmatter fields listed with "PASS" next to each

---

## Required Tooling Evidence

### Backend

- None — this story has no HTTP API changes

### MCP Tool Verification

- **Tool:** Run MCP server inspection to list registered tools from postgres-knowledgebase
- **Assert:** Tool names `mcp__postgres-knowledgebase__query-workflow-phases` and `mcp__postgres-knowledgebase__query-workflow-components` appear exactly in the registered tool list
- **Artifact:** Copy of MCP server tool registry output (or screenshot)

### Documentation Verification

- **Read:** Final state of `doc-sync.agent.md` frontmatter
- **Assert:** All 9 WINT standard fields present, model=haiku, version>=1.1.0
- **Read:** Target file for LangGraph Porting Notes section
- **Assert:** Section present with all four subsections

### End-to-End Test (Manual)

- **Run:** `/doc-sync` against real codebase in file-only mode
- **Assert:** SYNC-REPORT.md generated, no crash
- **Run:** `/doc-sync --check-only`
- **Assert:** No documentation files modified, exit code appropriate

---

## Risks to Call Out

1. **MCP tool name verification requires live server** — If postgres-knowledgebase MCP server is not running during implementation, AC-1 cannot be definitively verified. Dev should check WINT-0080 status. If server unavailable, document tool names as "assumed correct" and flag for follow-up.

2. **WINT-0070 still pending** — `workflow.phases` and `workflow.components` tables do not exist yet. The graceful degradation test (AC-3) may simply confirm expected table-not-found behavior rather than a real timeout scenario.

3. **LangGraph Porting Notes review** — AC-6 produces a porting guide for WINT-9020. The completeness of this guide is difficult to verify without WINT-9020 implementer input. Consider flagging for WINT-9020 author to review before WINT-0160 closes.

4. **No regression test for actual doc-sync output quality** — This story validates the agent file structure and operational modes, but does not formally verify that the documentation updates produced are correct. Output quality is assumed acceptable based on WINT-0150 UAT passage.
