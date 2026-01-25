# Agent Context - KNOW-0051

## Story Context

```yaml
story_id: KNOW-0051
feature_dir: plans/future/knowledgebase-mcp
phase: qa-verify
mode: qa-verification
base_path: plans/future/knowledgebase-mcp/UAT/KNOW-0051/
artifacts_path: plans/future/knowledgebase-mcp/UAT/KNOW-0051/_implementation/
started_at: 2026-01-25T17:05:00Z
```

## Implementation Paths

```yaml
# Story files
story_file: plans/future/knowledgebase-mcp/UAT/KNOW-0051/KNOW-0051.md
elaboration_file: plans/future/knowledgebase-mcp/UAT/KNOW-0051/ELAB-KNOW-0051.md
proof_file: plans/future/knowledgebase-mcp/UAT/KNOW-0051/PROOF-KNOW-0051.md
verification_file: plans/future/knowledgebase-mcp/UAT/KNOW-0051/_implementation/VERIFICATION.yaml

# Implementation target
target_directory: apps/api/knowledge-base/src/mcp-server/

# Source files to create
server_file: apps/api/knowledge-base/src/mcp-server/server.ts
handlers_file: apps/api/knowledge-base/src/mcp-server/tool-handlers.ts
schemas_file: apps/api/knowledge-base/src/mcp-server/tool-schemas.ts
error_file: apps/api/knowledge-base/src/mcp-server/error-handling.ts
index_file: apps/api/knowledge-base/src/mcp-server/index.ts

# Test files to create
test_directory: apps/api/knowledge-base/src/mcp-server/__tests__/
integration_test: apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts
handlers_test: apps/api/knowledge-base/src/mcp-server/__tests__/tool-handlers.test.ts
error_test: apps/api/knowledge-base/src/mcp-server/__tests__/error-handling.test.ts
test_helpers: apps/api/knowledge-base/src/mcp-server/__tests__/test-helpers.ts

# Package file to modify
package_json: apps/api/knowledge-base/package.json
```

## Dependencies to Reference

```yaml
# Existing CRUD operations (KNOW-003)
crud_index: apps/api/knowledge-base/src/crud-operations/index.ts
crud_schemas: apps/api/knowledge-base/src/crud-operations/schemas.ts
crud_errors: apps/api/knowledge-base/src/crud-operations/errors.ts
crud_add: apps/api/knowledge-base/src/crud-operations/kb-add.ts
crud_get: apps/api/knowledge-base/src/crud-operations/kb-get.ts
crud_update: apps/api/knowledge-base/src/crud-operations/kb-update.ts
crud_delete: apps/api/knowledge-base/src/crud-operations/kb-delete.ts
crud_list: apps/api/knowledge-base/src/crud-operations/kb-list.ts

# Database and types
db_schema: apps/api/knowledge-base/src/db/schema.ts
db_client: apps/api/knowledge-base/src/db/client.ts
types: apps/api/knowledge-base/src/__types__/index.ts

# Embedding client
embedding_client: apps/api/knowledge-base/src/embedding-client/index.ts

# Logger
logger: packages/core/logger/src/index.ts
simple_logger: packages/core/logger/src/simple-logger.ts

# Config
config_env: apps/api/knowledge-base/src/config/env.ts
```

## Surfaces

```yaml
backend: true
frontend: false
infra: true
```

## Key Implementation Notes

1. **MCP Protocol Compliance**
   - JSON-RPC communication over stdio (stdin for requests, stdout for responses)
   - Logger MUST write to stderr to avoid interfering with protocol
   - Tools registered via @modelcontextprotocol/sdk

2. **Tool Handlers as Thin Adapters**
   - Each handler calls corresponding CRUD function from KNOW-003
   - No business logic in handlers (Ports & Adapters pattern)
   - Handlers add: logging, error sanitization, performance measurement

3. **Zod-First Schema Generation**
   - Use zod-to-json-schema to convert existing Zod schemas
   - No manual JSON Schema definitions
   - Single source of truth for validation

4. **Error Sanitization**
   - Full errors logged server-side
   - Sanitized errors returned to client
   - Structured format: { code, message, field? }

5. **Environment Validation**
   - DATABASE_URL required at startup
   - OPENAI_API_KEY required at startup
   - Fail fast with descriptive errors

6. **Graceful Shutdown**
   - Handle SIGTERM/SIGINT
   - Configurable timeout (default 30s)
   - Close database connections cleanly
