# workflow-svc

LangGraph orchestrator service with a Hono HTTP API. Runs 5 agent graphs (dev-implement, story-generation, review, qa-verify, plan-refinement) as a first-class Bun service.

**Package:** `@repo/workflow-svc`
**Port:** `9104`
**Location:** `apps/api/workflow/`

---

## Quick Start

```bash
# From monorepo root
pnpm --filter @repo/workflow-svc dev

# Verify it's running
curl http://localhost:9104/health
# → {"status":"ok"}
```

---

## Environment

| Variable            | Default | Description                |
| ------------------- | ------- | -------------------------- |
| `PORT`              | `9104`  | HTTP listen port           |
| `DATABASE_URL`      | —       | Postgres connection string |
| `ANTHROPIC_API_KEY` | —       | Claude model access        |
| `OPENAI_API_KEY`    | —       | Embeddings / fallback      |

Copy root `.env` values — the service inherits all variables from the monorepo `.env` file when run via `pnpm dev`.

---

## HTTP API

### Health

```
GET /health
→ 200 {"status":"ok"}
```

### Graph endpoints

All graph endpoints accept `POST` with a JSON body and return `202 Accepted`. Full invocation wiring is in-progress — stubs are in place.

| Method | Path                              | Graph                  |
| ------ | --------------------------------- | ---------------------- |
| POST   | `/api/v1/graphs/dev-implement`    | Dev implement graph    |
| POST   | `/api/v1/graphs/story-generation` | Story generation graph |
| POST   | `/api/v1/graphs/review`           | Code review graph      |
| POST   | `/api/v1/graphs/qa-verify`        | QA verification graph  |
| POST   | `/api/v1/graphs/plan-refinement`  | Plan refinement graph  |

```bash
curl -X POST http://localhost:9104/api/v1/graphs/story-generation \
  -H 'Content-Type: application/json' \
  -d '{"storyId":"APRS-1010"}'
# → 202 {"status":"accepted","graph":"story-generation"}
```

---

## Source Layout

```
src/
  index.ts            # Hono app entry point
  routes/
    graphs.ts         # Graph endpoint stubs
  graphs/             # LangGraph graph definitions (v2)
    dev-implement-v2.ts
    story-generation-v2.ts
    review-v2.ts
    qa-verify-v2.ts
    plan-refinement-v2.ts
  nodes/              # Per-graph node implementations
  state/              # LangGraph state schemas (Zod)
  artifacts/          # Artifact Zod schemas (elaboration, dev proof, etc.)
  runner/             # Graph runner utilities
  checkpointer/       # LangGraph checkpointer (Postgres-backed)
  db/                 # Postgres DB layer (queries, migrations)
  services/           # Domain services (story, plan, etc.)
  providers/          # LLM provider wrappers
  models/             # Model selector logic
  model-selector/     # Cost/capability-based model routing
  config/             # Runtime config loader
  secrets/            # AWS Secrets Manager access
  observability/      # OpenTelemetry tracing
  telemetry/          # Agent invocation telemetry
  schemas/            # Shared Zod schemas
  errors/             # Typed error classes
  utils/              # General utilities
  __types__/          # Shared DB-derived types (drizzle-zod)
  pipeline/           # BullMQ pipeline integration (future)
  persistence/        # Artifact persistence helpers
  scripts/            # One-off migration scripts (excluded from build)
```

---

## Development

```bash
# Type check
pnpm --filter @repo/workflow-svc type-check

# Run tests
pnpm --filter @repo/workflow-svc test

# Build (outputs to dist/)
pnpm --filter @repo/workflow-svc build
```

---

## Wiring a Graph Invocation

To connect a route stub to an actual graph:

1. Import the compiled graph from `../graphs/<name>-v2.js`
2. Build the initial state from the request body
3. Stream or await `graph.invoke(state, { configurable: { thread_id: ... } })`
4. Return the final state or a run ID

```ts
import { devImplementGraph } from '../graphs/dev-implement-v2.js'

graphRoutes.post('/graphs/dev-implement', async c => {
  const { storyId } = await c.req.json()
  const result = await devImplementGraph.invoke(
    { storyId },
    { configurable: { thread_id: storyId } },
  )
  return c.json({ runId: result.runId }, 202)
})
```

---

## Migration History

Moved from `packages/backend/orchestrator` → `apps/api/workflow` to give the LangGraph orchestrator a proper Bun + Hono runtime home consistent with `roadmap-svc`. The old barrel-export `index.ts` was replaced by this Hono entry point. Nothing in the monorepo imported `@repo/orchestrator` prior to migration.
