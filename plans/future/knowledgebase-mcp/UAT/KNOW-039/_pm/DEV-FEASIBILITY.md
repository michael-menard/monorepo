# Dev Feasibility Review: KNOW-039 - MCP Registration and Claude Integration

## Feasibility Summary

- **Feasible:** Yes
- **Confidence:** High
- **Why:** This story is primarily scripting and documentation. All MCP server infrastructure (KNOW-0051, KNOW-0052, KNOW-0053) is already complete, so we're just adding developer experience tooling around it. The technical components are straightforward: Node.js scripts, JSON generation, and documentation.

## Likely Change Surface

### Areas/Packages Likely Impacted

**Primary:**
- `apps/api/knowledge-base/` package.json (add new scripts)
- `apps/api/knowledge-base/scripts/` (new directory for CLI tools)
  - `generate-config.ts` - Config template generator
  - `validate-connection.ts` - Connection validator script
- `apps/api/knowledge-base/README.md` - Setup documentation updates

**Secondary:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Enhance kb_health tool
- `apps/api/knowledge-base/src/mcp-server/__tests__/` - Add tests for kb_health enhancements

### Endpoints Likely Impacted

None. This story doesn't touch HTTP endpoints - only MCP tools.

**MCP Tools Enhanced:**
- `kb_health` - Add version, uptime, connection status fields

### Migration/Deploy Touchpoints

**No deployment required.** This story is local development tooling only.

**Configuration touchpoints:**
- User's `~/.claude/mcp.json` (local file, not deployed)
- Environment variables (DATABASE_URL, OPENAI_API_KEY) - already required

**No database migrations needed.**

## Risk Register (Top 5–10)

### Risk 1: Platform-Specific Path Resolution
- **Why it's risky:** macOS, Linux, and Windows handle file paths differently. The ~ and ${HOME} expansions behave differently across shells (bash, zsh, fish).
- **Mitigation PM should bake into AC:**
  - AC must specify: "Works on macOS and Linux" (Windows out of scope)
  - Config generator must use absolute paths (no ~ or ${HOME} in generated JSON)
  - Test plan must cover both macOS and Linux

### Risk 2: Existing ~/.claude/mcp.json Overwrite
- **Why it's risky:** Users may have other MCP servers configured. Blindly overwriting ~/.claude/mcp.json could break their setup.
- **Mitigation PM should bake into AC:**
  - AC: "If ~/.claude/mcp.json exists, prompt user before overwriting OR provide merge instructions"
  - Consider: --force flag to skip prompt, --dry-run to preview output
  - Backup existing file before overwrite

### Risk 3: Environment Variable Handling
- **Why it's risky:** Different ways to set env vars (.env file, export, inline) may not all work. Risk of hardcoding secrets in generated config.
- **Mitigation PM should bake into AC:**
  - AC: "Generated config uses ${VAR} syntax, not hardcoded values"
  - Validator must check env vars are set before running MCP server
  - Document recommended .env file approach

### Risk 4: Docker Version Compatibility
- **Why it's risky:** Docker Desktop, Docker Engine, Podman, Colima all behave differently. Container state detection may fail on some platforms.
- **Mitigation PM should bake into AC:**
  - AC: "Validator checks Docker daemon is running and KB container is healthy"
  - Document supported Docker platforms (Docker Desktop recommended)
  - Provide troubleshooting for common Docker issues

### Risk 5: Claude Code Version Drift
- **Why it's risky:** MCP protocol or ~/.claude/mcp.json schema may change in future Claude Code versions, breaking our generated config.
- **Mitigation PM should bake into AC:**
  - AC: "Document minimum Claude Code version required"
  - Consider: version check in validator script
  - Plan for config migration if schema changes

### Risk 6: Error Message Leaking Secrets
- **Why it's risky:** Validator script may echo DATABASE_URL or OPENAI_API_KEY in error messages, exposing secrets in logs or screenshots.
- **Mitigation PM should bake into AC:**
  - AC: "All error messages sanitize secrets (mask API keys, passwords)"
  - Never echo full DATABASE_URL (mask password)
  - Never echo OPENAI_API_KEY

### Risk 7: Validation Passes But Connection Still Fails
- **Why it's risky:** Validator may check prerequisites but not actually test MCP protocol end-to-end. False positive: validator ✓ but Claude Code still can't invoke tools.
- **Mitigation PM should bake into AC:**
  - AC: "Validator invokes at least one MCP tool (e.g., kb_health) to verify end-to-end connectivity"
  - Don't just check if server starts - actually call a tool

### Risk 8: Build State Confusion
- **Why it's risky:** User may run validator before building MCP server, or after changing code without rebuilding. Validator may pass against stale dist/.
- **Mitigation PM should bake into AC:**
  - AC: "Validator checks dist/mcp-server/index.js exists and is newer than src/ files"
  - Suggest `pnpm build` if dist/ is stale
  - Consider: auto-build before validation (or warn user)

### Risk 9: Concurrent MCP Server Instances
- **Why it's risky:** User may already have MCP server running. Running validator may spawn second instance, causing port conflicts or unexpected behavior.
- **Mitigation PM should bake into AC:**
  - AC: "Validator detects if MCP server is already running"
  - Reuse existing instance if running, or spawn temporary instance
  - Clean up spawned processes after validation

### Risk 10: Troubleshooting Documentation Drift
- **Why it's risky:** Troubleshooting guide may become outdated as MCP protocol, Docker, or Claude Code evolve. Stale docs frustrate users.
- **Mitigation PM should bake into AC:**
  - AC: "Troubleshooting section includes date last updated"
  - Link to external resources (Claude Code docs, MCP spec)
  - Plan to update troubleshooting based on real user feedback

## Scope Tightening Suggestions (Non-breaking)

### Clarification 1: Platform Support
Add explicit statement: "Supports macOS and Linux. Windows support deferred to future story."

### Clarification 2: Docker Platform
Add constraint: "Requires Docker Desktop or Docker Engine. Podman/Colima may work but are not officially supported."

### Clarification 3: Merge vs Overwrite
Decide now: Does config generator merge with existing ~/.claude/mcp.json, or just document manual merge? Recommend: **Manual merge with clear instructions** (simpler, less fragile).

### Clarification 4: Video Walkthrough
Index mentions "Video walkthrough (optional)" - clarify: Is this in scope or out of scope? Recommend: **Out of scope for MVP** - can add later based on user feedback.

### Clarification 5: kb_health Scope
Limit kb_health to essential fields only:
- db_status: "connected" | "disconnected"
- openai_status: "connected" | "disconnected"
- uptime: number (seconds since start)
- version: string (semantic version)

Do NOT add:
- Detailed metrics (query counts, cache hit rates) - defer to monitoring story
- Performance benchmarks - defer to KNOW-007 or KNOW-0052

## Missing Requirements / Ambiguities

### Ambiguity 1: Error Exit Codes
Should validator use semantic exit codes (1=Docker, 2=DB, 3=OpenAI) or generic non-zero? Recommend: **Generic non-zero** (simpler, more portable).

### Ambiguity 2: Config Generator Output Location
Should `pnpm kb:generate-config` write directly to ~/.claude/mcp.json, or output to stdout for user to redirect? Recommend: **Write to ~/.claude/mcp.json** with prompt if exists (matches index example).

### Ambiguity 3: Validator Verbosity
Should validator always print all checks, or be quiet on success? Recommend: **Always print all checks** (more user-friendly, shows progress).

### Ambiguity 4: Version Field in kb_health
Where does version come from? package.json? Hardcoded? Recommend: **Read from package.json** (single source of truth).

### Ambiguity 5: Uptime Measurement
When does uptime start? Process start or first tool invocation? Recommend: **Process start** (simpler, more standard).

### Ambiguity 6: Connection Status Polling
Does kb_health test connectivity in real-time, or report last known state? Recommend: **Test in real-time** (call DB and OpenAI on every kb_health invocation to verify current status).

## Evidence Expectations

### What Proof/Dev Should Capture

1. **Script Execution Proof:**
   - Screenshot or output of `pnpm kb:generate-config` creating ~/.claude/mcp.json
   - Cat ~/.claude/mcp.json showing correct structure

2. **Validation Proof:**
   - Screenshot of `pnpm kb:validate-connection` passing all checks
   - Screenshot of validation failing with clear error (e.g., Docker stopped)

3. **kb_health Tool Proof:**
   - JSON response from kb_health showing all required fields
   - Test both connected and disconnected states

4. **Test Coverage:**
   - Vitest output showing 80%+ coverage on new scripts
   - Tests for all error cases (Docker down, DB down, etc.)

5. **Documentation Proof:**
   - README.md diff showing setup guide additions
   - Troubleshooting section covering top 10 issues from risk register

### What Might Fail in CI/Deploy

**Nothing should fail in CI** because:
- This story doesn't deploy anything (local tooling only)
- Scripts run locally, not in CI pipeline
- No database migrations or infrastructure changes

**Possible local test failures:**
- Tests that spawn MCP server may fail if port already in use
- Tests that check Docker may fail on CI runners without Docker
- Recommend: Mock Docker/DB checks in unit tests, or skip tests if Docker unavailable
