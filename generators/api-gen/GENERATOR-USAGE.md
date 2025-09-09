# Express API Generator (TypeScript) — Usage & Options

This generator scaffolds an **Express + TypeScript API** under `apps/api` for a Turborepo,
with sensible security defaults, JWT role enforcement, and optional Postgres (Drizzle).

## Requirements
- Node.js ≥ 18
- A JS workspace tool (recommended: pnpm)
- Turborepo-style monorepo (but works in any repo)

## Wire It Up
In your **repo root** `package.json` add:
```json
{
  "scripts": {
    "gen:api": "node generators/api-gen/bin/api-gen.js"
  }
}
```

## Commands
- `gen:api help` — prints usage
- `gen:api new` — scaffolds a new API project

### Basic
```bash
pnpm gen:api new --dir apps/api --name api --packageName @apps/api --port 4000
```

### With Postgres/Drizzle
```bash
pnpm gen:api new --dir apps/api --name api --packageName @apps/api --port 4000 --db
```

## Options
| Flag | Type | Default | Description |
|---|---|---|---|
| `--dir` | string | `apps/api` | Target directory (repo-relative) for the app. |
| `--name` | string | `api` | Service name; used in README and metadata. |
| `--packageName` | string | `@apps/api` | NPM package name for the workspace. |
| `--port` | number | `4000` | Default HTTP port. |
| `--db` | boolean | `false` | If present, scaffold Drizzle + Postgres config and docker-compose service. |
| `--open` | boolean | `false` | Open the generated project in `$EDITOR` (if set). |
| `--dry` | boolean | `false` | Preview files without writing to disk. |

## What Gets Scaffoled
- **Express + TS** app with security middleware: `helmet`, `cors` (open), `express-rate-limit`, `cookie-parser`
- **Logging**: `winston` + simple request logger
- **Auth**: JWT verification + `requireRole()` middleware (tokens are issued by your existing auth service)
- **Validation**: `zod` (request + env via `dotenv` + Zod)
- **Docs**: `swagger-ui-express` at `/docs`
- **Tests**: adds `vitest` + `supertest` (no example tests created)
- **Lint/Format**: ESLint (Airbnb + TS) + Prettier plugin
- **Only default route**: `GET /healthz`

If `--db` is used:
- **Drizzle**: `drizzle-orm`, `drizzle-kit`, basic `drizzle.config.ts`
- **Postgres**: `pg` client + `docker-compose.yml` with a `db` service

## Project Layout
```
apps/api/
  Dockerfile
  docker-compose.yml
  package.json
  tsconfig.json
  tsconfig.build.json
  .env.example
  .gitignore
  .eslintrc.cjs
  .eslintignore
  .prettierrc.json
  .editorconfig
  README.md
  src/
    index.ts
    server.ts
    env.ts
    logger.ts
    docs/swagger.ts
    routes/health.ts
    middleware/
      auth.ts         # requireAuth + requireRole()
      validate.ts     # zod validator
    schemas/
      shared.ts
    db/               # only if --db
      client.ts
      schema.ts
  drizzle.config.ts   # only if --db
```

## Environment Variables
Create `.env` from `.env.example`:
```
JWT_SECRET=supersecret_change_me
PORT=4000
# HOST=0.0.0.0
# If --db:
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
```
- `JWT_SECRET` is **required** (HS256 JWT). For RS256, switch to key-based verification in `middleware/auth.ts`.

## Install Dependencies (workspace)
```bash
# core
pnpm -w add -F <pkg> express zod jsonwebtoken helmet cors express-rate-limit cookie-parser swagger-ui-express winston dotenv

# dev
pnpm -w add -D -F <pkg> typescript tsx vitest supertest @types/node @types/express @types/jsonwebtoken @types/cookie-parser @types/cors

# eslint + prettier
pnpm -w add -D -F <pkg> eslint prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-import @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-airbnb-base eslint-config-airbnb-typescript

# optional DB
pnpm -w add -F <pkg> pg drizzle-orm
pnpm -w add -D -F <pkg> drizzle-kit
```
Replace `<pkg>` with your package name, e.g. `@apps/api`.

## Scripts
- `pnpm dev` — hot reload via `tsx`
- `pnpm build` — compile TypeScript
- `pnpm start` — run compiled build
- `pnpm typecheck` — type-only check
- `pnpm test` — runs vitest (supertest available)
- `pnpm lint` / `pnpm lint:fix` — ESLint (Airbnb + TS)
- `pnpm format` — Prettier
- `pnpm drizzle:generate` / `pnpm drizzle:migrate` — only when `--db`

## JWT & Roles
Use the provided middlewares:
```ts
import { requireAuth, requireRole } from './middleware/auth';

app.get('/v1/secure', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});
```

## Swagger
Visit **`/docs`** for Swagger UI (basic spec seeded with `/healthz`). Extend the spec in `src/docs/swagger.ts`.

## Docker
Quick local run (no DB):
```bash
docker compose up --build
```

With DB (`--db`):
```bash
docker compose up --build db api
```
Make sure `.env` contains `JWT_SECRET` (and `DATABASE_URL` when `--db`).

## Customization Tips
- Switch CORS to specific origins in `server.ts`:
  ```ts
  app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));
  ```
- Structured JSON logs: tune `logger.ts` format/transports.
- RS256 JWTs: replace `jwt.verify(secret)` with public key verification.
- Add routes under `src/routes`, mount in `server.ts`.
- OpenAPI: expand `spec.paths` or integrate a generator if desired.

## Troubleshooting
- **`JWT_SECRET` missing** → app exits on startup; set it in `.env`.
- **Port already in use** → change `PORT` env or `--port` at scaffold.
- **Workspace filters**: when installing/running, use `--filter <pkg>`.

---

**That’s it!** You now have a repeatable way to spin up opinionated, secure APIs in your monorepo.
