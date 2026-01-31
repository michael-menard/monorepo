# Elaboration Analysis - KNOW-039

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md entry. CLI tooling for MCP registration only. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. AC properly scoped. Local testing plan matches AC. |
| 3 | Reuse-First | PASS | — | Correctly reuses @repo/logger, existing DB/OpenAI clients, and MCP infrastructure. No unnecessary new packages. |
| 4 | Ports & Adapters | PASS | — | Scripts are adapters (filesystem, system checks). Domain logic delegated to existing modules. Clean separation. |
| 5 | Local Testability | PASS | — | Scripts are testable with mocked filesystem/process operations. kb_health tool already has tests. |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | Minor ambiguities resolved in DEV-FEASIBILITY. No blocking TBDs remaining. |
| 7 | Risk Disclosure | PASS | — | All 10 risks documented in DEV-FEASIBILITY. Security considerations (secret sanitization) explicit. |
| 8 | Story Sizing | PASS | — | 11 ACs, but most are straightforward. No frontend work. 2 packages touched. Reasonable 3-point story. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | kb_health schema structure unclear | Medium | Story says "db_status: connected/disconnected" but existing implementation returns complex HealthResponse with nested checks. Need clarification if we're simplifying or documenting current structure. |
| 2 | OpenAI validation approach | Low | AC5 says "Makes test API call to OpenAI" but current kb_health only checks if env var is set. Story needs to clarify if we enhance kb_health or add separate validation in validator script. |
| 3 | Version field source | Low | AC8 says version comes from package.json, but existing code uses MCP_SERVER_VERSION constant. Need to verify single source of truth. |
| 4 | Windows explicitly out of scope | Low | Story should add to Non-Goals section: "Windows support - defer to future" (mentioned in DEV-FEASIBILITY but not in story). |
| 5 | Test coverage target placement | Low | AC11 sets 80% coverage on scripts, but scripts/ directory doesn't exist yet. Story should clarify test location (scripts/__tests__/ or src/scripts/__tests__/). |

## Split Recommendation

**Not Applicable** - Story is appropriately sized at 3 points. Single cohesive feature with clear dependencies.

## Preliminary Verdict

**CONDITIONAL PASS**: Story is well-structured and ready for implementation after resolving 5 medium/low issues. No critical blockers. Issues are clarifications, not fundamental design flaws.

**Verdict**: CONDITIONAL PASS

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Missing MCP protocol version check** - Validator doesn't verify Claude Code version or MCP protocol compatibility | Medium | Low | Add version check to validator script. Query Claude Code version if possible, or document minimum version prominently. |
| 2 | **No stale build detection** - Validator checks if dist/ exists but not if it's stale compared to src/ | Medium | Low | AC should specify checking file modification times. Warn if dist/ older than src/ files. |
| 3 | **Backup overwrite risk** - Story says "Only one backup maintained (new backup overwrites old backup)" but users may want multiple backups | Low | Low | Consider timestamped backups: ~/.claude/mcp.json.backup.YYYYMMDD-HHMMSS or document single-backup policy clearly. |
| 4 | **Port conflict detection missing** - If MCP server already running, validator may conflict | Medium | Medium | DEV-FEASIBILITY Risk #9 identified this but no AC addresses it. Add check for existing MCP server process. |
| 5 | **No rollback mechanism** - If config generation fails midway, user left with broken config | Low | Medium | Atomic write pattern: write to temp file, validate, then move to target. Or clear rollback instructions. |
| 6 | **Shell-specific behavior undocumented** - bash vs zsh vs fish handle environment variables differently | Low | Low | Troubleshooting section should cover shell-specific env var loading (.bashrc vs .zshrc). |
| 7 | **Docker platform detection** - Validator doesn't distinguish between Docker Desktop, Engine, Colima, Podman | Low | Medium | Add platform detection to validator output. Warn if unsupported Docker variant detected. |
| 8 | **No integration test for full setup flow** - Tests cover scripts individually but not end-to-end setup from clone to working MCP | Medium | Medium | AC should require integration test that simulates fresh setup: clone → build → config → validate → invoke tool. |
| 9 | **Error recovery documentation missing** - Troubleshooting covers failures but not how to recover from partial setup | Low | Low | Add "Starting Fresh" section to troubleshooting: how to reset ~/.claude/mcp.json, clear stale builds, etc. |
| 10 | **Logging verbosity not configurable** - Scripts always print all checks, no quiet mode for CI/automation | Low | Low | Consider --quiet flag for validator. Not required for MVP but useful for automation. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Interactive merge tool** - Currently manual merge only, but could offer interactive prompts | Medium | High | Defer to future story. Manual merge with clear instructions is safer for MVP. |
| 2 | **Automatic rebuild detection** - Validator could auto-run pnpm build if dist/ is stale | High | Medium | Add --auto-build flag to validator. Significantly improves DX but adds complexity. Consider for v2. |
| 3 | **Health check dashboard** - kb_health returns rich data but only consumable via JSON | Low | High | Future enhancement: CLI dashboard that polls kb_health and displays live status. Out of scope for KNOW-039. |
| 4 | **Config diff preview** - Before overwriting ~/.claude/mcp.json, show diff of changes | Medium | Low | Add --dry-run flag to config generator that outputs diff without writing. Good DX enhancement. |
| 5 | **Automatic Claude Code restart** - After config generation, could trigger Claude Code reload | Low | Medium | Platform-specific complexity. Better to document manual restart for MVP. |
| 6 | **MCP server metrics collection** - kb_health could track historical uptime, query counts | Low | High | Defer to monitoring story (KNOW-007 or future). Not needed for setup validation. |
| 7 | **Setup script orchestrator** - Single command that runs all setup steps: build → config → validate → test | High | Medium | Add pnpm kb:setup that orchestrates all steps. Great DX win. Recommend adding to story. |
| 8 | **Cross-project MCP config template** - If multiple MCP servers exist, share config generation logic | Low | High | Only relevant if other MCP servers emerge. Wait and see. |
| 9 | **Visual setup guide** - Screenshots or animated GIFs in README | Medium | High | Mentioned as "optional video walkthrough" in index. Defer to future, focus on clear text instructions. |
| 10 | **Telemetry integration** - Track setup success/failure rates to identify common issues | Low | High | Privacy concerns, not needed for MVP. Consider for SaaS deployments only. |

---

## Worker Token Summary

- Input: ~38,000 tokens (story, index, plans, test plan, dev-feasibility, existing code)
- Output: ~1,800 tokens (ANALYSIS.md)
