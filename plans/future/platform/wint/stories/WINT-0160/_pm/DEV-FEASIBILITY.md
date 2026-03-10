# Dev Feasibility Review: WINT-0160 — Validate and Harden doc-sync Agent

**Story:** WINT-0160
**Authored:** 2026-02-17
**Agent:** pm-dev-feasibility-review (v3.0.0)

---

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This is an audit and documentation hardening story with no new code. The existing `doc-sync.agent.md` (v1.1.0) is the primary artifact. The work is read-verify-update, not build-test-deploy. All tooling is available (Read, Edit, Grep, Bash). The only external dependency is the postgres-knowledgebase MCP server for AC-1 (MCP tool name verification), which is a known constraint that can be worked around.

---

## Likely Change Surface (Core Only)

**Files with possible edits:**

| File | Change Type | Reason |
|------|-------------|--------|
| `/Users/michaelmenard/Development/monorepo/.claude/agents/doc-sync.agent.md` | Audit + possible frontmatter update | MCP tool name corrections if needed; add LangGraph Porting Notes or WINT-0170 doc if placed here |
| `/Users/michaelmenard/Development/monorepo/.claude/skills/doc-sync/SKILL.md` | Add section | LangGraph Porting Notes section (AC-6) |

**No new files created.** No packages touched. No database migrations. No TypeScript changes.

---

## MVP-Critical Risks (Max 5)

### Risk 1: MCP Tool Name Cannot Be Verified Without Live Server

**Why it blocks MVP:** AC-1 requires comparing frontmatter tool names against actual postgres-knowledgebase MCP server registrations. If the server is not running or WINT-0080's seeded workflow data does not include these tools, verification cannot be completed definitively.

**Required mitigation:** Dev must check WINT-0080 status at story start. If WINT-0080 is in UAT and the server is accessible, proceed. If server is unavailable, document AC-1 as "tool names assumed correct, server verification deferred" and flag in SYNC-REPORT.md. Do not block the story — this is a soft risk.

---

### Risk 2: WINT-0150 Merge State

**Why it matters for MVP:** WINT-0150 is in UAT. If its changes to `doc-sync.agent.md` have not yet landed in the main branch, WINT-0160 may be auditing an older version of the agent. Dev must confirm the current state of the file reflects WINT-0150 additions before auditing.

**Required mitigation:** Read `doc-sync.agent.md` at story start and confirm `mcp_tools` field exists with the two postgres-knowledgebase tool references. If not present, WINT-0150 has not landed yet — wait for UAT to complete before starting.

---

### Risk 3: LangGraph Porting Notes Scope Creep

**Why it blocks MVP:** AC-6 requires adding a "LangGraph Porting Notes" section. If the implementer over-interprets this as needing implementation code, TypeScript interfaces, or architectural decisions, it will balloon the story beyond 2 points.

**Required mitigation:** The porting notes section is specification prose only — inputs, workflow, outputs, MCP tool list. No code. No Zod schemas. No LangGraph-specific implementation. PM must be explicit: this is a human-readable porting guide, not a technical implementation.

---

## Missing Requirements for MVP

None. All acceptance criteria are fully specified in the seed. The story is narrow by design.

---

## MVP Evidence Expectations

| AC | Evidence Required |
|----|------------------|
| AC-1 | MCP server tool registry output OR written attestation that WINT-0080 verification confirmed tool names |
| AC-2 | Frontmatter field-by-field checklist with values shown |
| AC-3 | SYNC-REPORT.md from `/doc-sync` run showing `database_status: unavailable` (or equivalent) |
| AC-4 | SYNC-REPORT.md from file-only run showing docs were updated |
| AC-5 | Screenshot or text of "Completion Signals" section in agent file |
| AC-6 | Full contents of "LangGraph Porting Notes" section |
| AC-7 | `--check-only` flag documentation shown with exit code semantics |
| AC-8 | Updated index entry for WINT-0160 |

**No CI pipeline checkpoints required** — this story produces no compiled code.

---

## Implementation Approach (Recommended)

1. Read current `doc-sync.agent.md` — confirm WINT-0150 changes are present
2. Audit frontmatter against WINT standard fields (AC-2)
3. Verify MCP tool names against server or WINT-0080 artifacts (AC-1)
4. Confirm completion signals are present in agent file (AC-5)
5. Add "LangGraph Porting Notes" section to `SKILL.md` or `doc-sync.agent.md` (AC-6)
6. Document `--check-only` as WINT-0170 gate mechanism in agent file (AC-7)
7. Run `/doc-sync` in file-only mode to verify graceful degradation (AC-3, AC-4)
8. Update stories index via `/index-update` (AC-8)
9. Update frontmatter `updated` date and version if any corrections were made
