# Implementation Plan - KNOW-039

## Overview

MCP Registration and Claude Integration - Zero-friction setup automation for KB MCP server.

## Implementation Chunks

### Chunk 1: Create scripts directory structure

**Files:**
- `apps/api/knowledge-base/scripts/` (new directory)
- `apps/api/knowledge-base/scripts/__tests__/` (new directory)

**Actions:**
1. Create scripts directory
2. Create __tests__ subdirectory

### Chunk 2: Implement generate-config.ts

**File:** `apps/api/knowledge-base/scripts/generate-config.ts`

**Functionality:**
1. Detect existing `~/.claude/mcp.json`
2. If exists: warn user, create backup at `~/.claude/mcp.json.backup`
3. Resolve absolute path to monorepo root
4. Generate config with structure:
   ```json
   {
     "mcpServers": {
       "knowledge-base": {
         "command": "node",
         "args": ["<absolute-path>/dist/mcp-server/index.js"],
         "env": {
           "DATABASE_URL": "${DATABASE_URL}",
           "OPENAI_API_KEY": "${OPENAI_API_KEY}"
         }
       }
     }
   }
   ```
5. Atomic write: temp file -> validate JSON -> move to target
6. Print success message with path

**AC Coverage:** AC1, AC2, AC19, AC24 (partial), AC27

### Chunk 3: Implement validate-connection.ts

**File:** `apps/api/knowledge-base/scripts/validate-connection.ts`

**Functionality:**
1. Check Docker daemon running
2. Check KB container healthy
3. Check dist/mcp-server/index.js exists
4. Check dist/ not stale vs src/ (AC17)
5. Check DATABASE_URL env var set
6. Check OPENAI_API_KEY env var set
7. Test database connectivity
8. Test OpenAI API key (simple models list call)
9. Spawn MCP server, invoke kb_health, verify response
10. Cleanup spawned process
11. Report results with checkmarks

**AC Coverage:** AC3, AC4, AC5, AC6, AC7, AC16, AC17, AC18, AC20, AC23

### Chunk 4: Enhance kb_health tool

**File:** `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`

**Enhancements:**
1. Add real-time OpenAI API validation (not just env var check)
2. Read version from package.json (not hardcoded constant)
3. Return simplified response structure for debugging:
   ```json
   {
     "status": "healthy" | "degraded" | "unhealthy",
     "db_status": "connected" | "disconnected",
     "openai_status": "connected" | "disconnected",
     "uptime": <seconds>,
     "version": "<semver>",
     "checks": { ... detailed checks ... }
   }
   ```

**AC Coverage:** AC8, AC12, AC13

### Chunk 5: Add package.json scripts

**File:** `apps/api/knowledge-base/package.json`

**Add scripts:**
```json
{
  "scripts": {
    "kb:generate-config": "tsx scripts/generate-config.ts",
    "kb:validate-connection": "tsx scripts/validate-connection.ts"
  }
}
```

### Chunk 6: Write tests for scripts

**Files:**
- `apps/api/knowledge-base/scripts/__tests__/generate-config.test.ts`
- `apps/api/knowledge-base/scripts/__tests__/validate-connection.test.ts`

**Test Coverage:**
1. Config generator happy path
2. Config generator with existing file (backup)
3. Config generator with invalid JSON (error handling)
4. Validator all checks pass
5. Validator Docker not running
6. Validator DB not accessible
7. Validator invalid API key
8. Validator missing build

**AC Coverage:** AC11, AC21

### Chunk 7: Update README with setup guide

**File:** `apps/api/knowledge-base/README.md`

**Add sections:**
1. Claude Code Integration
   - Prerequisites
   - Step-by-step setup
   - Expected output examples
2. Troubleshooting (top 10 issues from DEV-FEASIBILITY)
   - Docker not running
   - Database not accessible
   - Invalid API key
   - Build missing
   - Environment variables not loaded
   - Claude Code version too old
   - Path resolution issues
   - Existing config conflicts
   - MCP server crashes
   - Tools not appearing in Claude Code
3. Error Recovery section

**AC Coverage:** AC9, AC10, AC14, AC22

## Execution Order

1. Chunk 1: Directory structure
2. Chunk 5: Package.json scripts (so we can test as we go)
3. Chunk 2: generate-config.ts
4. Chunk 3: validate-connection.ts
5. Chunk 4: Enhance kb_health
6. Chunk 6: Tests
7. Chunk 7: README documentation

## Type Check After Each Chunk

Run `pnpm check-types` after each file creation to catch issues early.

## Dependencies

- `os.homedir()` for cross-platform home directory
- `path.join()` for cross-platform paths
- `child_process.spawn()` for Docker and MCP server checks
- `fs.promises` for async file operations

## Risk Mitigations

1. **Atomic writes**: Write to temp file, validate, then move
2. **Secret sanitization**: Never echo API keys in error messages
3. **Process cleanup**: Always kill spawned MCP server after validation
4. **Backup safety**: Create backup before overwriting existing config
