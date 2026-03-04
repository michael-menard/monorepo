# @repo/sidecar-role-pack

Role Pack Sidecar Service for the autonomous pipeline.

Reads `.claude/prompts/role-packs/{role}.md` files and exposes:
- **MCP tool**: `rolePackGet(input)` — returns content string or null
- **HTTP endpoint**: `GET /role-pack?role=<role>&v=<version>` — returns JSON

## Roles

Valid roles: `dev`, `po`, `qa`, `da`

> Note: `pm` is NOT a valid role (per AC-10).

## HTTP API

### GET /role-pack

Query parameters:
- `role` (required): One of `dev`, `po`, `qa`, `da`
- `v` (optional): Version number

#### 200 — Found

```json
{
  "ok": true,
  "role": "dev",
  "content": "---\nrole: dev\nversion: 1\n---\n...",
  "version": 1
}
```

#### 400 — Invalid role

```json
{
  "ok": false,
  "error": "role must be one of: dev, po, qa, da"
}
```

#### 404 — File not found

```json
{
  "ok": false,
  "error": "Role pack not found: dev"
}
```

## MCP Tool Usage

```typescript
import { rolePackGet } from '@repo/sidecar-role-pack'

// Returns content string or null
const content = await rolePackGet({ role: 'dev' })
if (content) {
  // Use content...
}

// Throws ZodError on invalid input
await rolePackGet({ role: 'pm' }) // throws
```

## Caching

Role pack files are read once and cached in-memory per role per process lifetime.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3090` | HTTP server port |
| `ROLE_PACK_DIR` | `<cwd>/.claude/prompts/role-packs` | Override role pack directory (useful for testing) |

## Development

```bash
pnpm --filter @repo/sidecar-role-pack build
pnpm --filter @repo/sidecar-role-pack test
pnpm --filter @repo/sidecar-role-pack test:coverage
```
