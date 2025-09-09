# @tools/api-gen

Zero-dep CLI to scaffold an **Express + TypeScript API** under `apps/api` for a Turborepo.

Includes:
- JWT decode + role check middleware (Zod-validated env via `dotenv`)
- Security: `helmet`, `cors` (open by default), `express-rate-limit`, `cookie-parser`
- Logging: `winston`
- Docs: `swagger-ui-express` at `/docs`
- Tests: adds `vitest` and `supertest` (no example tests)
- Linting/formatting: ESLint (Airbnb + TS) with Prettier plugin

Optional with `--db`:
- Postgres config via `drizzle-orm` + `drizzle-kit` and `pg`
- `docker-compose.yml` includes a Postgres service

## Wire it up

Add to your repo root `package.json`:
```json
{
  "scripts": {
    "gen:api": "node generators/api-gen/bin/api-gen.js"
  }
}
```

## Usage

```bash
# default
pnpm gen:api new --dir apps/api --name api --packageName @apps/api --port 4000

# with Postgres (drizzle)
pnpm gen:api new --dir apps/api --name api --packageName @apps/api --port 4000 --db
```
