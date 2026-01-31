# Test Plan: KNOW-039 - MCP Registration and Claude Integration

## Scope Summary

- **Endpoints touched:** None (CLI tooling and configuration)
- **UI touched:** No
- **Data/storage touched:** No (file system only - ~/.claude/mcp.json, package scripts)

## Happy Path Tests

### Test 1: Configuration Template Generation
- **Setup:**
  - Fresh clone of monorepo
  - No existing ~/.claude/mcp.json
  - Environment variables available: DATABASE_URL, OPENAI_API_KEY
- **Action:**
  - Run `pnpm kb:generate-config`
- **Expected outcome:**
  - ~/.claude/mcp.json created with correct structure
  - Correct paths to dist/mcp-server/index.js
  - Environment variables interpolated correctly
  - Valid JSON structure
- **Evidence:**
  - Cat ~/.claude/mcp.json and verify structure
  - Validate JSON with `jq` or similar
  - Verify all required fields present (command, args, env)

### Test 2: Connection Validation - All Systems Healthy
- **Setup:**
  - Docker running with KB database
  - MCP server built (dist/ exists)
  - Valid OPENAI_API_KEY set
  - Valid DATABASE_URL
- **Action:**
  - Run `pnpm kb:validate-connection`
- **Expected outcome:**
  - All checks pass: Docker ✓, DB ✓, MCP ✓, Tools ✓
  - Exit code 0
  - Green checkmarks or success indicators in output
- **Evidence:**
  - Capture stdout showing all checks passed
  - Verify exit code is 0
  - Log output should list all 10 tools (5 CRUD + 2 search + 3 admin)

### Test 3: Health Check Tool Returns Status
- **Setup:**
  - MCP server running
  - DB and OpenAI API accessible
- **Action:**
  - Invoke kb_health tool via MCP client or Claude Code
- **Expected outcome:**
  - JSON response with:
    - db_status: "connected"
    - openai_status: "connected"
    - uptime: positive number
    - version: semantic version string
- **Evidence:**
  - Capture kb_health response
  - Verify all status fields are "connected"

### Test 4: Setup Documentation Walkthrough
- **Setup:**
  - Clean development environment
  - README updated with setup guide
- **Action:**
  - Follow README step-by-step
- **Expected outcome:**
  - Can complete entire setup without errors
  - All commands work as documented
  - MCP server successfully registered with Claude Code
- **Evidence:**
  - Document each step with screenshots or output
  - Final test: kb_list returns empty array or seeded data

## Error Cases

### Error 1: Docker Not Running
- **Setup:**
  - Stop Docker daemon
- **Action:**
  - Run `pnpm kb:validate-connection`
- **Expected:**
  - Clear error message: "Docker is not running. Start Docker and try again."
  - Exit code non-zero
  - Provides actionable guidance
- **Evidence:**
  - Capture error output
  - Verify exit code != 0

### Error 2: Database Not Accessible
- **Setup:**
  - Docker running but KB container not started or wrong port
- **Action:**
  - Run `pnpm kb:validate-connection`
- **Expected:**
  - Clear error message: "Cannot connect to database at localhost:5433. Check DATABASE_URL and ensure container is running."
  - Exit code non-zero
  - Suggests troubleshooting steps
- **Evidence:**
  - Capture error output
  - Verify error message includes connection details

### Error 3: Invalid OPENAI_API_KEY
- **Setup:**
  - Set OPENAI_API_KEY to invalid value
- **Action:**
  - Run `pnpm kb:validate-connection`
- **Expected:**
  - Clear error message: "OpenAI API key is invalid or not set. Check OPENAI_API_KEY environment variable."
  - Exit code non-zero
- **Evidence:**
  - Capture error output
  - Verify no API key is leaked in error message

### Error 4: MCP Server Build Missing
- **Setup:**
  - Delete dist/ directory
- **Action:**
  - Run `pnpm kb:validate-connection`
- **Expected:**
  - Clear error message: "MCP server not built. Run 'pnpm build' first."
  - Exit code non-zero
- **Evidence:**
  - Capture error output
  - Verify suggests build command

### Error 5: Tools Not Registered
- **Setup:**
  - Mock scenario where MCP server starts but tools not registered
- **Action:**
  - Run `pnpm kb:validate-connection`
- **Expected:**
  - Error message listing missing tools
  - Clear indication of which tools failed to register
- **Evidence:**
  - Capture error output showing tool registration failure

## Edge Cases (Reasonable)

### Edge 1: Existing ~/.claude/mcp.json
- **Setup:**
  - Existing ~/.claude/mcp.json with other servers
- **Action:**
  - Run `pnpm kb:generate-config`
- **Expected:**
  - Warns user about overwriting existing config
  - Offers to merge or backup existing config
  - OR: documents manual merge steps
- **Evidence:**
  - Capture warning message
  - Verify existing servers preserved or backup created

### Edge 2: Path Differences - macOS vs Linux
- **Setup:**
  - Test on both macOS and Linux
  - Different home directory paths
- **Action:**
  - Run `pnpm kb:generate-config`
- **Expected:**
  - Correct path resolution on both platforms
  - ${HOME} or ~ expanded correctly
- **Evidence:**
  - Compare generated mcp.json on both platforms
  - Verify paths are absolute and platform-appropriate

### Edge 3: Claude Code Version Compatibility
- **Setup:**
  - Different versions of Claude Code CLI
- **Action:**
  - Run validation with different versions
- **Expected:**
  - Works with documented minimum version
  - Clear error if version too old
- **Evidence:**
  - Document minimum version required
  - Test with version at boundary

### Edge 4: Multiple Environment Variable Formats
- **Setup:**
  - Test with .env file, exported vars, inline vars
- **Action:**
  - Run `pnpm kb:validate-connection` with different env var sources
- **Expected:**
  - All formats work correctly
  - Clear error if vars not found
- **Evidence:**
  - Test results from each env var source method

### Edge 5: Concurrent Validation Runs
- **Setup:**
  - Run `pnpm kb:validate-connection` multiple times in parallel
- **Action:**
  - Execute 3-5 concurrent validation runs
- **Expected:**
  - No race conditions
  - Each run completes successfully
  - No port conflicts or resource contention
- **Evidence:**
  - All runs exit with code 0
  - No error messages about resource conflicts

## Required Tooling Evidence

### Backend

**1. Script Execution Tests:**
```bash
# Test config generator
pnpm kb:generate-config
cat ~/.claude/mcp.json | jq .

# Test connection validator
pnpm kb:validate-connection
echo $?  # Should be 0

# Test with Docker stopped
docker stop knowledge-base-postgres
pnpm kb:validate-connection
echo $?  # Should be non-zero
```

**2. MCP Tool Tests:**
```bash
# Via MCP client simulation in tests
# Test kb_health tool returns expected structure
```

**Assertions required:**
- Config generator exit code 0
- Generated JSON is valid
- Validator checks all prerequisites
- Error messages are actionable
- Exit codes correct for all scenarios

### Frontend

Not applicable - no UI components

### Integration

**MCP Protocol Tests:**
- Tool discovery returns kb_health tool
- kb_health returns valid JSON structure
- All required fields present in health response

## Risks to Call Out

1. **Claude Code Version Drift:** MCP protocol or config schema may change between Claude Code versions
   - Mitigation: Document minimum version, add version check to validator

2. **Path Resolution Fragility:** Different shells (bash, zsh, fish) handle ~ and ${HOME} differently
   - Mitigation: Use absolute paths in generated config, test on multiple shells

3. **Environment Variable Leakage:** Risk of exposing secrets in error messages or logs
   - Mitigation: Sanitize all error messages, never echo API keys

4. **Manual Config Merge Complexity:** If user has existing ~/.claude/mcp.json, merging is error-prone
   - Mitigation: Provide clear merge instructions, consider interactive merge tool

5. **Docker Desktop Variations:** Docker Desktop vs Docker Engine vs Podman have different behaviors
   - Mitigation: Document Docker Desktop as supported platform, test on macOS and Linux variants

6. **Test Fragility:** Validation script may pass but Claude Code still can't connect
   - Mitigation: End-to-end test that actually invokes a tool via Claude Code (not just checks)
