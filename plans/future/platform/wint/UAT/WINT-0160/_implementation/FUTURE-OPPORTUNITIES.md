# Future Opportunities - WINT-0160

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | SKILL.md version history has no 1.1.0 entry for WINT-0150 changes (database query integration added) | Low | Low | Add version history entry during WINT-0160 implementation as a completeness fix. |
| 2 | SKILL.md `mcp_tools_available` frontmatter field may not be updated if AC-1 discovers wrong tool names and developer only updates agent frontmatter | Low | Low | Scope AC-1 correction to cover both files — agent frontmatter `mcp_tools` AND SKILL.md `mcp_tools_available`. |
| 3 | No formal attestation record for MCP tool names if server is unavailable at implementation time | Low | Low | Consider adding a note to SKILL.md or SYNC-REPORT template stating that tool names were added by WINT-0150 and await live server verification (WINT-0080 UAT gating). |
| 4 | The doc-sync.agent.md "Future Enhancements" section (watch mode, configuration file, mermaid-cli, PR creation, intelligent diff) was written before WINT-0150 and does not note which items are now being tracked in the WINT backlog vs. which are truly untracked future ideas | Low | Low | During WINT-0160 or a subsequent cleanup story, link "Watch mode" to WINT backlog or note it as a Phase 2+ item. This prevents future workers from re-inventing listed items. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The 7-phase workflow names are not consistent between the agent file and the SKILL.md. Agent uses "Mermaid Diagram Regeneration" while AC-6 in the story specifies the phase names as: "File Discovery, Frontmatter Parsing, Section Mapping, Documentation Updates, Mermaid Diagram Regeneration, Changelog Entry Drafting, SYNC-REPORT.md Generation". Both the agent and skill use these names correctly — but the LangGraph Porting Notes section being added in AC-6 should canonicalize them to ensure WINT-9020 ports from a single authoritative list. | Medium | Low | When creating the LangGraph Porting Notes section (AC-6), define the 7 phase names as the canonical contract and add a cross-reference to those names in the agent's Process section. |
| 2 | The `--force` flag is documented in the agent and SKILL.md but its interaction with `--check-only` is only noted in SKILL.md ("check-only takes precedence"). The agent file does not mention this precedence. | Low | Low | Add a note to the agent's Input table that `--check-only --force` processes all files without modifying (check-only takes precedence). |
| 3 | WINT-9020 will need to know which MCP tools are used by phase (not just a flat list). The AC-6 LangGraph Porting Notes section currently scopes MCP tools as a flat list. A phase-by-phase MCP tool mapping would be more useful for WINT-9020 implementers. | Medium | Low | When writing AC-6, include an optional subsection that maps MCP tools to phases: Phase 2 uses `query-workflow-phases` and `query-workflow-components`. This makes the porting guide more actionable. |
| 4 | The doc-sync.agent.md does not document its own version history inline (unlike some other agents that have a "Changelog" section in the body). When the WINT-0170 integration note and LangGraph Porting Notes are added, there will be no inline record of when they were added. | Low | Low | Consider adding a brief "Agent Changelog" section to doc-sync.agent.md noting: v1.0.0 (initial), v1.1.0 (WINT-0150 database query support added), v1.2.0 (WINT-0160 hardening + porting contract). This mirrors best practice seen in other WINT agents. |
| 5 | The SKILL.md pre-commit hook integration example uses emoji (checkmarks, X marks) in the bash script echo statements. Per project guidelines, the codebase avoids emojis. This is a minor style inconsistency in the hook template. | Low | Low | Clean up hook template in SKILL.md to remove emoji from echo statements during WINT-0160 or next touch of the file. |

## Categories

- **Edge Cases**: Issue #2 (SKILL.md frontmatter sync on AC-1 correction), Issue #3 (attestation record when server unavailable)
- **UX Polish**: Issue #5 (emoji in pre-commit hook template)
- **Observability**: Issue #4 (agent inline changelog)
- **Integrations**: Issue #1 (WINT-9020 phase-by-phase MCP tool mapping for richer porting contract)
- **Documentation Consistency**: Issue #1 (SKILL.md version history), Issue #4 (future enhancements backlog linkage), Issue #2 (flag interaction documentation)
