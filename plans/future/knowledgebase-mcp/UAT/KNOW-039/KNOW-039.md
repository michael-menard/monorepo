---
story_id: KNOW-039
title: "MCP Registration and Claude Integration"
status: uat
created: 2026-01-25
updated: 2026-01-26
assignee: null
story_points: 3
priority: P0
depends_on: [KNOW-0051, KNOW-0052, KNOW-0053]
blocks: [KNOW-040]
tags:
  - knowledge-base
  - mcp
  - developer-experience
  - tooling
---

# KNOW-039: MCP Registration and Claude Integration

## Context

The MCP server foundation (KNOW-0051), search tools (KNOW-0052), and admin tool stubs (KNOW-0053) are complete. The knowledge base is fully functional with 10 MCP tools ready to use. However, the setup process for connecting the MCP server to Claude Code is currently manual and error-prone, requiring developers to:

1. Manually edit `~/.claude/mcp.json` with correct paths and environment variables
2. Remember the exact command, args, and env structure
3. Troubleshoot connection failures without clear diagnostics
4. Verify the setup worked by trial and error

This creates friction for onboarding new developers and increases the risk of configuration errors.

**Current state:**
- MCP server runs successfully when properly configured
- All 10 tools (5 CRUD + 2 search + 3 admin) are implemented and tested
- Documentation exists but lacks step-by-step automation

**Key Architectural Context:**
- MCP server runs as a local Node.js process spawned by Claude Code
- Configuration lives in `~/.claude/mcp.json` (user's home directory)
- Each Claude Code session spawns a new MCP server instance
- Environment variables (DATABASE_URL, OPENAI_API_KEY) must be available to spawned process

## Goal

Create zero-friction setup automation and comprehensive documentation for registering the KB MCP server with Claude Code. Developers should be able to go from fresh clone to working MCP integration with two commands:
1. `pnpm kb:generate-config` - Generate `~/.claude/mcp.json` configuration
2. `pnpm kb:validate-connection` - Verify all prerequisites and test end-to-end connectivity

**Primary deliverables:**
1. Configuration template generator script
2. Connection validator script with comprehensive health checks
3. Enhanced kb_health tool for debugging
4. Setup guide in README with troubleshooting section

## Non-Goals

- ❌ Windows support - defer to future (macOS and Linux only)
- ❌ Video walkthrough - optional, not required for MVP
- ❌ Automatic Claude Code installation - assume Claude Code already installed
- ❌ Interactive merge tool for existing configs - document manual merge instead
- ❌ GUI configuration tool - CLI only
- ❌ Remote MCP server deployment - local development only
- ❌ Performance monitoring in kb_health - basic status only

## Scope

### Packages Affected

**Primary:**
- `apps/api/knowledge-base/package.json` - Add scripts: kb:generate-config, kb:validate-connection
- `apps/api/knowledge-base/scripts/` (new directory)
  - `generate-config.ts` - Configuration template generator
  - `validate-connection.ts` - Connection validator
  - `__tests__/` - Tests for scripts
- `apps/api/knowledge-base/README.md` - Add setup guide and troubleshooting

**Secondary:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Enhance kb_health tool
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Add kb_health response schema
- `apps/api/knowledge-base/src/mcp-server/__tests__/` - Add kb_health tests

### CLI Tools Implemented

**1. Configuration Template Generator (`pnpm kb:generate-config`)**

Generates `~/.claude/mcp.json` with correct structure:
- Absolute path to `dist/mcp-server/index.js`
- Environment variable references (not hardcoded secrets)
- Platform-appropriate path resolution (macOS/Linux)
- Warns if file exists, prompts before overwrite

**2. Connection Validator (`pnpm kb:validate-connection`)**

Checks all prerequisites and tests connectivity:
- ✓ Docker daemon is running
- ✓ KB database container is healthy
- ✓ MCP server dist/ is built
- ✓ Environment variables are set (DATABASE_URL, OPENAI_API_KEY)
- ✓ Database is accessible
- ✓ OpenAI API key is valid
- ✓ MCP server can start
- ✓ All 10 tools are registered
- ✓ End-to-end test: invoke kb_health tool

### MCP Tool Enhanced

**kb_health** - Server health and status check

Enhanced to return detailed status for debugging:
```typescript
{
  db_status: "connected" | "disconnected",
  openai_status: "connected" | "disconnected",
  uptime: number,  // seconds since server start
  version: string  // from package.json
}
```

### Configuration Template

The generated `~/.claude/mcp.json` will have this structure:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["${MONOREPO}/apps/api/knowledge-base/dist/mcp-server/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

Notes:
- `${MONOREPO}` is replaced with absolute path to monorepo root
- `${DATABASE_URL}` and `${OPENAI_API_KEY}` remain as variable references
- Claude Code will expand these from user's environment

### Database Tables

No database changes required. This story is tooling only.

## Acceptance Criteria

### AC1: Configuration Template Generator Creates Valid Config

**Given** a fresh monorepo clone with no `~/.claude/mcp.json`
**When** developer runs `pnpm kb:generate-config`
**Then**:
- ✅ `~/.claude/mcp.json` is created in user's home directory
- ✅ File contains valid JSON structure
- ✅ `mcpServers.knowledge-base` entry exists with correct structure
- ✅ `command` is "node"
- ✅ `args` contains absolute path to `dist/mcp-server/index.js`
- ✅ `env.DATABASE_URL` and `env.OPENAI_API_KEY` use variable references (not hardcoded)
- ✅ Works on both macOS and Linux
- ✅ Exit code 0 on success

**Evidence:** Generated config can be validated with `jq` and contains all required fields

---

### AC2: Generator Handles Existing Config Safely

**Given** `~/.claude/mcp.json` already exists
**When** developer runs `pnpm kb:generate-config`
**Then**:
- ✅ Warning message displayed: "~/.claude/mcp.json already exists"
- ✅ Prompt asks: "Overwrite? (y/N)"
- ✅ If yes: backup created at `~/.claude/mcp.json.backup` before overwrite
- ✅ If no: exits without modifying file, prints manual merge instructions
- ✅ Manual merge instructions show how to add knowledge-base entry

**Evidence:** Existing configs are preserved or backed up, never lost

---

### AC3: Connection Validator Checks All Prerequisites

**Given** environment is properly set up (Docker running, DB healthy, build complete)
**When** developer runs `pnpm kb:validate-connection`
**Then**:
- ✅ Checks and reports status for each prerequisite:
  - Docker daemon running
  - KB database container healthy
  - `dist/mcp-server/index.js` exists
  - `DATABASE_URL` environment variable set
  - `OPENAI_API_KEY` environment variable set
- ✅ Each check displays: "✓ Docker running" or "✗ Docker not running"
- ✅ All checks pass: exit code 0
- ✅ Any check fails: exit code non-zero
- ✅ Summary at end: "All checks passed" or "X checks failed"

**Evidence:** Validator output clearly shows status of each prerequisite

---

### AC4: Validator Tests Database Connectivity

**Given** Docker is running but database is not accessible
**When** developer runs `pnpm kb:validate-connection`
**Then**:
- ✅ Attempts to connect to database using DATABASE_URL
- ✅ If connection succeeds: "✓ Database connected at localhost:5433"
- ✅ If connection fails: "✗ Cannot connect to database. Check DATABASE_URL and ensure container is running."
- ✅ Error message includes connection details (host, port) but masks password
- ✅ Suggests troubleshooting steps: "Run: docker ps | grep knowledge-base"

**Evidence:** Database connectivity is verified, not just assumed

---

### AC5: Validator Tests OpenAI API Key

**Given** OPENAI_API_KEY is set but invalid
**When** developer runs `pnpm kb:validate-connection`
**Then**:
- ✅ Makes test API call to OpenAI (simple completion or model list)
- ✅ If call succeeds: "✓ OpenAI API key valid"
- ✅ If call fails: "✗ OpenAI API key is invalid or not set"
- ✅ Error message does NOT echo the API key (sanitized)
- ✅ Suggests: "Check OPENAI_API_KEY environment variable"

**Evidence:** API key is validated with real API call, not just presence check

---

### AC6: Validator Performs End-to-End MCP Test

**Given** all prerequisites pass
**When** validator reaches end-to-end test phase
**Then**:
- ✅ Spawns temporary MCP server process
- ✅ Invokes `kb_health` tool via MCP protocol
- ✅ Verifies response contains required fields (db_status, openai_status, uptime, version)
- ✅ Cleans up spawned process after test
- ✅ If test succeeds: "✓ MCP server responding, all 10 tools registered"
- ✅ If test fails: "✗ MCP server failed to respond" with error details

**Evidence:** End-to-end connectivity is proven, not just assumed

---

### AC7: Error Messages Are Actionable

**Given** any prerequisite fails
**When** validator displays error
**Then**:
- ✅ Error message clearly states what failed
- ✅ Error message explains why it might have failed
- ✅ Error message suggests concrete next steps
- ✅ No secrets leaked in error messages (API keys, passwords masked)
- ✅ Errors include relevant context (paths, ports, versions)

**Examples:**
- "✗ Docker not running. Start Docker Desktop and try again."
- "✗ Build missing. Run 'pnpm build' in apps/api/knowledge-base."
- "✗ DATABASE_URL not set. Add to .env file or export in shell."

**Evidence:** Developer can fix issues without external help

---

### AC8: kb_health Tool Returns Detailed Status

**Given** MCP server is running
**When** `kb_health` tool is invoked
**Then**:
- ✅ Returns JSON object with structure:
  ```json
  {
    "db_status": "connected" | "disconnected",
    "openai_status": "connected" | "disconnected",
    "uptime": <seconds>,
    "version": "<semver>"
  }
  ```
- ✅ `db_status`: Tests database connectivity in real-time (not cached)
- ✅ `openai_status`: Tests OpenAI API in real-time (not cached)
- ✅ `uptime`: Seconds since MCP server process started
- ✅ `version`: Reads from `package.json` (single source of truth)

**Evidence:** kb_health provides accurate real-time status for debugging

---

### AC9: Setup Guide in README Is Complete

**Given** developer reads `apps/api/knowledge-base/README.md`
**When** following setup guide section
**Then**:
- ✅ Prerequisites listed (Claude Code, Docker, Node.js versions)
- ✅ Step-by-step setup instructions:
  1. Clone repo
  2. Install dependencies
  3. Start Docker and KB database
  4. Build MCP server
  5. Generate config
  6. Validate connection
  7. Test in Claude Code
- ✅ Each step has command to run
- ✅ Each step has expected output
- ✅ Troubleshooting section covers top 10 issues (from dev-feasibility)

**Evidence:** New developer can complete setup without external help

---

### AC10: Troubleshooting Section Covers Common Issues

**Given** setup fails for any of top 10 reasons
**When** developer consults troubleshooting section
**Then**:
- ✅ Issue #1: Docker not running - how to diagnose and fix
- ✅ Issue #2: Database not accessible - port conflicts, container status
- ✅ Issue #3: Invalid API key - how to obtain and set
- ✅ Issue #4: Build missing or stale - when to rebuild
- ✅ Issue #5: Environment variables not loaded - .env vs export vs inline
- ✅ Issue #6: Claude Code version too old - minimum version documented
- ✅ Issue #7: Path resolution issues - shell-specific behaviors
- ✅ Issue #8: Existing config conflicts - how to merge manually
- ✅ Issue #9: MCP server crashes - log locations and debugging
- ✅ Issue #10: Tools not appearing in Claude Code - cache clearing, restart

**Evidence:** Troubleshooting covers errors identified in dev-feasibility risk register

---

### AC11: Test Coverage on Scripts

**Given** test suite is run
**When** testing scripts in `scripts/` directory
**Then**:
- ✅ `generate-config.ts` has 80%+ coverage
- ✅ `validate-connection.ts` has 80%+ coverage
- ✅ Tests cover happy path (all checks pass)
- ✅ Tests cover error cases (Docker down, DB down, API key invalid, etc.)
- ✅ Tests mock filesystem operations (reading/writing ~/.claude/mcp.json)
- ✅ Tests mock process spawning (MCP server process)
- ✅ Tests verify error messages are actionable

**Evidence:** Vitest output shows 80%+ coverage on new scripts

---

## Reuse Plan

### Existing Packages to Reuse

**1. @repo/logger**
- Use for all script logging
- Structured logging for validator checks
- Error logging with context

**2. Existing CRUD and MCP Infrastructure**
- `kb_health` tool already exists in tool-handlers.ts (KNOW-0053)
- Enhance it rather than create new tool
- Reuse existing MCP server startup logic for validation

**3. Database and Embedding Clients**
- Reuse database client from KNOW-001 for connectivity tests
- Reuse OpenAI client from KNOW-002 for API key validation

### New Shared Code

**None required.** All scripts are KB-specific utilities, not reusable across projects.

If future stories need similar config generation or validation patterns, consider extracting to `packages/backend/dev-tools` at that time.

## Architecture Notes

### Ports & Adapters Pattern

**Scripts as Adapters:**
- `generate-config.ts` is an adapter for filesystem operations (write ~/.claude/mcp.json)
- `validate-connection.ts` is an adapter for system checks (Docker, DB, OpenAI, MCP)
- Both scripts are thin layers that orchestrate existing domain logic

**Domain Logic Reuse:**
- Database connectivity: Reuse existing PostgreSQL client
- OpenAI validation: Reuse existing embedding client
- MCP tool invocation: Reuse existing MCP server infrastructure

**Separation of Concerns:**
- Scripts handle CLI UX (prompts, colored output, exit codes)
- Domain modules handle business logic (DB queries, API calls)
- No business logic in scripts - delegate to existing modules

### Script Architecture

**generate-config.ts:**
```
1. Check if ~/.claude/mcp.json exists
2. If exists: prompt user, create backup
3. Resolve absolute path to monorepo root
4. Generate config object
5. Write to ~/.claude/mcp.json
6. Validate with JSON parse
7. Print success message
```

**validate-connection.ts:**
```
1. Check Docker daemon
2. Check KB container status
3. Check dist/mcp-server/index.js exists
4. Check environment variables set
5. Test database connectivity
6. Test OpenAI API key
7. Spawn MCP server process
8. Invoke kb_health tool
9. Verify response structure
10. Cleanup and report results
```

### Enhanced kb_health Tool

**Current implementation (KNOW-0053):**
- Returns basic status object
- Stub for detailed health checks

**Enhanced implementation (this story):**
- Test DB connectivity on every invocation (not cached)
- Test OpenAI API connectivity on every invocation
- Track uptime from process start (use process.uptime())
- Read version from package.json (fs.readFileSync)

**Error handling:**
- If DB test fails: db_status = "disconnected"
- If OpenAI test fails: openai_status = "disconnected"
- Tool always succeeds (never throws) - returns status regardless

## Infrastructure Notes

### File System Operations

**Configuration file:**
- Location: `~/.claude/mcp.json` (user's home directory)
- Format: JSON
- Ownership: User (not root)
- Permissions: 644 (read/write for user, read for others)

**Backup strategy:**
- If overwriting existing config, create `~/.claude/mcp.json.backup`
- Only one backup maintained (new backup overwrites old backup)
- Backup is timestamped in content (comment with date)

### Process Management

**MCP Server Process:**
- Spawned by Claude Code (not managed by these scripts)
- Validator spawns temporary instance for testing
- Cleanup: validator kills spawned process after test (SIGTERM, 5s timeout)

**Environment Variables:**
- DATABASE_URL: Required, format: `postgresql://user:pass@host:port/db`
- OPENAI_API_KEY: Required, format: `sk-...`
- Validation: Check both are set and non-empty
- Security: Never echo full values in logs or errors

### Platform Support

**Supported:**
- macOS (primary development platform)
- Linux (CI and alternate development)

**Not Supported:**
- Windows (defer to future story)

**Platform-specific considerations:**
- Path separators: Use path.join (Node.js handles cross-platform)
- Home directory: Use os.homedir() (works on macOS and Linux)
- Docker: Assume Docker Desktop on macOS, Docker Engine on Linux

## HTTP Contract Plan

Not applicable - no HTTP endpoints. MCP tools only.

## Seed Requirements

Not applicable - no seed data.

## Test Plan

See: `/Users/michaelmenard/Development/Monorepo/plans/future/knowledgebase-mcp/backlog/KNOW-039/_pm/TEST-PLAN.md`

### Summary

**Happy Path Tests (4):**
1. Configuration template generation
2. Connection validation with all systems healthy
3. kb_health tool returns detailed status
4. Setup documentation walkthrough

**Error Cases (5):**
1. Docker not running
2. Database not accessible
3. Invalid OPENAI_API_KEY
4. MCP server build missing
5. Tools not registered

**Edge Cases (5):**
1. Existing ~/.claude/mcp.json (merge/overwrite)
2. Path differences - macOS vs Linux
3. Claude Code version compatibility
4. Multiple environment variable formats
5. Concurrent validation runs

**Evidence Required:**
- Script execution outputs (stdout, exit codes)
- Generated config file structure
- Validator check outputs (pass/fail for each prerequisite)
- kb_health JSON response
- Test coverage reports (80%+ on scripts)

### Test Coverage Targets

- `generate-config.ts`: 80%+ coverage
- `validate-connection.ts`: 80%+ coverage
- Enhanced `kb_health` handler: 80%+ coverage
- Integration tests: All 10 MCP tools discoverable
- End-to-end test: Full setup process from clone to working MCP server

## Risk Notes

From dev-feasibility review:

1. **Platform-specific path resolution** - Mitigated by using absolute paths and testing on macOS/Linux
2. **Existing config overwrite** - Mitigated by prompting user and creating backups
3. **Environment variable handling** - Mitigated by using variable references, not hardcoded values
4. **Docker version compatibility** - Mitigated by documenting supported platforms
5. **Claude Code version drift** - Mitigated by documenting minimum version
6. **Error message secret leakage** - Mitigated by sanitizing all error messages
7. **Validation passes but connection fails** - Mitigated by end-to-end MCP tool invocation test
8. **Build state confusion** - Mitigated by checking dist/ exists and is not stale
9. **Concurrent MCP server instances** - Mitigated by validator cleaning up spawned processes
10. **Troubleshooting documentation drift** - Mitigated by dating troubleshooting section

See full risk register in: `/Users/michaelmenard/Development/Monorepo/plans/future/knowledgebase-mcp/backlog/KNOW-039/_pm/DEV-FEASIBILITY.md`

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Missing MCP protocol version check | Add as AC | Validator should verify Claude Code version or MCP protocol compatibility. Added as AC16. |
| 2 | No stale build detection | Add as AC | Validator checks if dist/ exists but not if it's stale compared to src/. Added as AC17. |
| 3 | Backup overwrite risk | Out-of-scope | Single-backup policy is acceptable for MVP. Users can manually preserve old configs. |
| 4 | Port conflict detection missing | Add as AC | DEV-FEASIBILITY Risk #9 identified this. Add check for existing MCP server process. Added as AC18. |
| 5 | No rollback mechanism | Add as AC | Atomic write pattern: write to temp file, validate, then move to target. Added as AC19. |
| 6 | Shell-specific behavior undocumented | Out-of-scope | Troubleshooting section covers bash vs zsh vs fish env var loading. Deferred to enhancement. |
| 7 | Docker platform detection | Add as AC | Validator should distinguish between Docker Desktop, Engine, Colima, Podman. Added as AC20. |
| 8 | No integration test for full setup flow | Add as AC | Tests should cover end-to-end: clone → build → config → validate → invoke tool. Added as AC21. |
| 9 | Error recovery documentation missing | Add as AC | Add "Starting Fresh" section: how to reset ~/.claude/mcp.json, clear stale builds. Added as AC22. |
| 10 | Logging verbosity not configurable | Add as AC | Consider --quiet flag for validator. Useful for automation. Added as AC23. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Interactive merge tool | Add as AC | Defer to future story. Manual merge with clear instructions is safer for MVP. Added as AC24. |
| 2 | Automatic rebuild detection | Add as AC | Add --auto-build flag to validator. Significantly improves DX but adds complexity. Added as AC25. |
| 3 | Health check dashboard | Add as AC | Future enhancement: CLI dashboard that polls kb_health. Out of scope for KNOW-039. Added as AC26. |
| 4 | Config diff preview | Add as AC | Add --dry-run flag to config generator. Good DX enhancement. Added as AC27. |
| 5 | Automatic Claude Code restart | Add as AC | Platform-specific complexity. Better to document manual restart. Added as AC28. |
| 6 | MCP server metrics collection | Add as AC | Defer to monitoring story. Not needed for setup validation. Added as AC29. |
| 7 | Setup script orchestrator | Add as AC | Add pnpm kb:setup that orchestrates all steps. Great DX win. Added as AC30. |
| 8 | Cross-project MCP config template | Add as AC | Only relevant if other MCP servers emerge. Wait and see. Added as AC31. |
| 9 | Visual setup guide | Add as AC | Screenshots or animated GIFs. Defer to future, focus on text. Added as AC32. |
| 10 | Telemetry integration | Add as AC | Privacy concerns, not needed for MVP. Added as AC33. |

### Follow-up Stories Suggested

- [ ] KNOW-040: Enhanced kb_health Tool and OpenAI Validation (for issue #2 from audit)
- [ ] KNOW-041: Advanced MCP Setup Features (interactive merge, auto-restart, visual guides)
- [ ] KNOW-007: MCP Server Health Monitoring Dashboard (health dashboard, metrics collection)
- [ ] KNOW-042: Setup Automation and Orchestration (pnpm kb:setup orchestrator)

### Items Marked Out-of-Scope

- Backup overwrite risk (gap #3): Single-backup policy documented as acceptable for MVP.
- OpenAI validation approach (audit issue #2): Deferred to KNOW-040. ENV var check sufficient for MVP.
- Shell-specific behavior (gap #6): Documented in troubleshooting, not requiring code changes.

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Notes |
|---|---|---|---|
| 2026-01-25T12:00 | pm-story-generation-leader | Story generated | Initial story creation from index entry KNOW-039 |
| 2026-01-25T13:30 | elab-completion-leader | Elaboration completed | CONDITIONAL PASS verdict. 23 new ACs added (gaps + enhancements). Story moved to ready-to-work. |
