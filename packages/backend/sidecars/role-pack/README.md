# @repo/sidecar-role-pack

Role Pack Sidecar Service for the autonomous development workflow.

Exposes compact (150–300 token) role pack instructions as a versioned HTTP endpoint and MCP tool, so agents can retrieve their role context with a single call instead of re-reading long instruction files.

## Quick Start

```bash
# Build
pnpm build --filter @repo/sidecar-role-pack

# Start the sidecar (default port 3090)
PORT=3090 node packages/backend/sidecars/role-pack/dist/server.js
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3090` | HTTP server port |
| `ROLE_PACK_DIR` | `.claude/prompts/role-packs/` | Directory containing role pack `.md` files |

## HTTP API

### GET /role-pack

Retrieve role pack content.

**Query Parameters:**
- `role` (required): `dev` | `po` | `qa` | `da`
- `v` (optional): integer version number

**Responses:**

```
200 OK
Content-Type: application/json
{ "content": "<role pack text, frontmatter stripped>" }

400 Bad Request — missing role param
{ "error": "role is required" }

400 Bad Request — unknown/invalid role
{ "error": "Unknown role" }

404 Not Found — file missing or read error
{ "error": "Role pack not available" }

404 Not Found — version mismatch
{ "error": "Version not found", "available": 1 }
```

**Examples:**

```bash
# Get dev role pack (latest version)
curl http://localhost:3090/role-pack?role=dev

# Get dev role pack with explicit version
curl http://localhost:3090/role-pack?role=dev&v=1
```

## MCP Tool

```typescript
import { rolePackGet } from '@repo/sidecar-role-pack'

// Returns content string or null
const content = await rolePackGet({ role: 'dev' })

// With version constraint
const content = await rolePackGet({ role: 'qa', version: 1 })

// Throws ZodError on invalid role
await rolePackGet({ role: 'invalid' }) // throws ZodError
```

## Versioning Strategy

- Role pack files include YAML frontmatter with `version: N`
- File reader parses version using `gray-matter`
- Callers can request a specific version via `v=N` (HTTP) or `version: N` (MCP tool)
- If version does not match, returns 404 with the available version number
- If `v` is omitted, the file version is returned regardless of its value

## Content Dependency (WINT-0210)

Role pack files must be present at `ROLE_PACK_DIR` (default: `.claude/prompts/role-packs/`):

```
.claude/prompts/role-packs/
  dev.md   # Developer role pack
  po.md    # Product Owner role pack
  qa.md    # QA Engineer role pack
  da.md    # Devil's Advocate role pack
```

WINT-0210 authors the production content. Until WINT-0210 lands, the sidecar uses fixture stubs from `src/__fixtures__/`.

## In-Memory Cache

- Results are cached per role after first read
- Cache is process-scoped — multiple sidecar instances have independent caches
- Cache invalidated on process restart (v1 scope — hot-reload is out of scope)

## Role Enum

Valid roles: `dev`, `po`, `qa`, `da`

Note: `pm` is NOT a valid role in this service. The `da` (devil's advocate) role was chosen per WINT-0210 output files.

## Downstream Consumers

- **WINT-2020**: Integrates role pack content into agent spawn workflow
- **WINT-4060**: Agent orchestration reads role packs before spawning
- **WINT-4070**: MCP server wrapper for role pack tool

## Running Tests

```bash
pnpm test --filter @repo/sidecar-role-pack
pnpm test:coverage --filter @repo/sidecar-role-pack
```
