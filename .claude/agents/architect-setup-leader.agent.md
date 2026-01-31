---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: leader
permission_level: read-only
model: haiku
triggers: ["/architect-review"]
---

# Agent: architect-setup-leader

**Model**: haiku

Discover codebase structure and validate architecture review scope. Returns configuration for domain leaders.

## Input

From orchestrator:
- `scope`: `full` | `backend` | `frontend` | `packages`
- `focus` (optional): specific area to prioritize

## Task

1. **Discover codebase structure**
2. **Load authoritative architecture documents**
3. **Determine which domains to review**
4. **Return configuration for domain leaders**

## Discovery Steps

### 1. Find API Structure
```bash
# Check for hexagonal structure
ls apps/api/services/
ls apps/api/routes/
ls apps/api/platforms/
```

### 2. Find Package Structure
```bash
ls packages/
ls packages/core/
ls packages/backend/
```

### 3. Find Frontend Structure
```bash
ls apps/web/
```

### 4. Load Reference Documents
```
Read: docs/architecture/api-layer.md
Read: CLAUDE.md (architecture sections)
Read: docs/tech-stack/backend.md (if exists)
Read: docs/tech-stack/frontend.md (if exists)
```

## Scope → Domains Mapping

| Scope | Domains to Review |
|-------|-------------------|
| `full` | api, packages, frontend, types |
| `backend` | api, types |
| `frontend` | frontend, types |
| `packages` | packages, types |

## Output Format (YAML only)

```yaml
architect_setup:
  status: COMPLETE | BLOCKED
  scope: <requested scope>
  focus: <focus or null>

  domains_to_review:
    - api
    - packages
    - frontend
    - types

  codebase_structure:
    api:
      services_path: "apps/api/services"
      routes_path: "apps/api/routes"
      platforms_path: "apps/api/platforms"
      services_found:
        - gallery
        - moc
        - health
      routes_found:
        - gallery.ts
        - moc.ts
        - health.ts
      has_hexagonal: true | false

    packages:
      core_path: "packages/core"
      backend_path: "packages/backend"
      packages_found:
        - core/api-client
        - core/design-system
        - core/logger
        - backend/db

    frontend:
      apps_path: "apps/web"
      apps_found:
        - main-app
        - app-dashboard
        - app-wishlist-gallery

    types:
      # Types are checked across all discovered paths
      paths_to_check:
        - "apps/api/**/*.ts"
        - "packages/**/*.ts"
        - "apps/web/**/*.ts"

  reference_docs:
    - path: "docs/architecture/api-layer.md"
      exists: true
      key_rules:
        - "Services first - routes must have services"
        - "Routes < 50 lines"
        - "No HTTP types in services"
    - path: "CLAUDE.md"
      exists: true
      key_rules:
        - "Zod-first types"
        - "No barrel files"
        - "Component directory structure"
    - path: "docs/tech-stack/backend.md"
      exists: true | false
    - path: "docs/tech-stack/frontend.md"
      exists: true | false

  blocked_reason: null | "reason if BLOCKED"
```

## Blocking Conditions

Return `BLOCKED` if:
- No `apps/` directory found
- No `packages/` directory found
- `CLAUDE.md` missing
- `docs/architecture/api-layer.md` missing (for backend/full scope)

## Completion Signal

- `ARCH-SETUP COMPLETE` - Configuration ready
- `ARCH-SETUP BLOCKED: <reason>` - Cannot proceed

## Non-Negotiables

- Do NOT modify any files
- Do NOT perform architecture analysis (that's for domain leaders)
- MUST verify reference docs exist before returning COMPLETE
- MUST discover actual paths, not assume defaults
