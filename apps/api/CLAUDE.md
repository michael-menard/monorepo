# apps/api

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Architecture:** Hexagonal (Ports & Adapters)
- **ORM:** Drizzle + Drizzle Kit
- **Validation:** Zod everywhere — all inputs, all boundaries
- **Database:** PostgreSQL in Docker
- **Object Storage:** MinIO in Docker
- **Auth:** AWS Cognito (the only AWS service in use)
- **Trust Model:** Zero trust — every service validates auth independently, every input is Zod-validated at the boundary, services do not trust each other's data

## Services

| Service                | Directory                        | Purpose                                                 |
| ---------------------- | -------------------------------- | ------------------------------------------------------- |
| `lego-api`             | `apps/api/lego-api/`             | Main product API                                        |
| `knowledge-base`       | `apps/api/knowledge-base/`       | KB MCP server, semantic search (pgvector)               |
| `workflow`             | `apps/api/workflow/`             | Being rearchitected — do not build on existing patterns |
| `notifications-server` | `apps/api/notifications-server/` | Real-time notifications                                 |
| Scrapers               | `apps/scrapers/`                 | Rebrickable, BrickLink, LEGO.com                        |

## Domain Structure (lego-api)

The lego-api uses hexagonal architecture with explicit port interfaces and adapter implementations:

```
domains/[domain-name]/
  ports/           # Interface definitions — what the domain needs
  adapters/        # Infrastructure implementations (repositories, storage)
  application/     # Business logic & services
  routes.ts        # HTTP handlers (Hono)
  types.ts         # Domain types (Zod schemas)
  schema.ts        # Drizzle DB schema
```

**Composition root** at `composition/` — central DI container, database client, auth service.

## Shared Backend Packages

| Package               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `@repo/db`            | Shared Drizzle schema                      |
| `@repo/api-core`      | DI utilities, auth (JOSE), S3 helpers      |
| `@repo/logger`        | Structured logging                         |
| `@repo/observability` | OpenTelemetry tracing + Prometheus metrics |

## Gotchas

- **wint/kbar schemas are dead** — do not create new references to `wint.*` or `kbar.*`. They keep reappearing and need to be removed, not extended.
- **Ports & adapters is required** — new domains must define explicit port interfaces. Do not bypass with direct DB access in route handlers.
