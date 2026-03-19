# Database Unit Tests (pgtap)

This directory contains SQL-level unit tests for the knowledge-base PostgreSQL schema.
Tests use [pgtap](https://pgtap.org/) — a TAP-compliant testing framework that runs
directly inside PostgreSQL.

## Directory Structure

```
tests/db/
  fixtures/
    rollback-helper.sql   # Documents the transaction-rollback isolation pattern
  triggers/
    test_set_story_completed_at.sql   # Example trigger test
  README.md               # This file
```

## Prerequisites

### Local development

1. **Docker** — to run the pgtap postgres container.
2. **pg\_prove** — the pgtap test runner (Perl-based TAP harness).
3. **Credentials** — copy `.env.pgtap.example` to `.env.local` in the repo root and set `PGTAP_DB_PASS`.
   `.env.local` is git-ignored. Never commit credentials.

Install pg\_prove:

```bash
# macOS
brew install pgTAP

# Debian / Ubuntu
apt-get install libtap-parser-sourcehandler-pgtap-perl
```

Alternatively, all tests can be run inside the container (pg\_prove is pre-installed):

```bash
docker compose -f docker-compose.pgtap.yml exec pgtap-postgres \
  pg_prove --host localhost --username pgtap --dbname pgtap_test /tests/db/**/*.sql
```

### CI

The `.github/workflows/pgtap.yml` workflow spins up a postgres+pgtap service container,
applies the knowledge-base schema baseline, and runs `bash scripts/db/run-pgtap.sh`.

## Running Tests Locally

```bash
# 0. Set credentials (one-time setup)
cp .env.pgtap.example .env.local
# Edit .env.local and set PGTAP_DB_PASS to any local-only value

# 1. Load credentials into shell
export $(grep -v '^#' .env.local | xargs)

# 2. Start the pgtap postgres container (first time builds the image)
docker compose -f docker-compose.pgtap.yml up -d

# 3. Wait for healthy (a few seconds on first run while pgtap installs)
docker compose -f docker-compose.pgtap.yml ps

# 4. Apply the schema baseline so triggers and functions exist
PGPASSWORD="$PGTAP_DB_PASS" psql -h localhost -p 5434 -U pgtap -d pgtap_test \
  -f apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql

# 5. Run all pgtap tests
bash scripts/db/run-pgtap.sh

# 6. Tear down when done
docker compose -f docker-compose.pgtap.yml down
```

## Writing a New Test

Each test file follows the **transaction-rollback** isolation pattern:

```sql
BEGIN;

SELECT plan(N); -- N = total number of assertions in this file

-- Setup: insert any rows needed for this test
INSERT INTO some_schema.some_table (...) VALUES (...);

-- Assertions (use pgtap functions: ok, is, isnt, results_eq, etc.)
SELECT ok(
  (SELECT some_column FROM some_schema.some_table WHERE id = '...') = 'expected_value',
  'Description of what we are asserting'
);

SELECT * FROM finish(); -- summarises results; raises on mismatch
ROLLBACK;               -- undo ALL setup data — database stays clean
```

### Why ROLLBACK?

- Each test file is completely isolated from other files
- The database is left clean after every run (no accumulated test garbage)
- Tests can be re-run multiple times without manual cleanup
- A failed assertion causes PostgreSQL to abort automatically, preserving isolation

See `fixtures/rollback-helper.sql` for a detailed explanation of the pattern.

## pgtap Assertion Reference

| Function | Description |
|----------|-------------|
| `ok(bool, text)` | Assert that expression is true |
| `is(actual, expected, text)` | Assert equality |
| `isnt(actual, expected, text)` | Assert inequality |
| `results_eq(query1, query2, text)` | Assert two queries return the same rows |
| `has_table(schema, table, text)` | Assert a table exists |
| `has_column(schema, table, col, text)` | Assert a column exists |
| `has_trigger(schema, table, trigger, text)` | Assert a trigger exists |
| `function_returns(schema, func, args, type, text)` | Assert function return type |

Full reference: <https://pgtap.org/documentation.html>

## Security Considerations

- **Credential management**: Never hardcode database passwords in scripts, docker-compose files,
  or workflow files. Local credentials live in `.env.local` (git-ignored). CI credentials are
  stored in the `PGTAP_DB_PASSWORD` GitHub Secret. See `.env.pgtap.example` for the required
  variables. If `PGTAP_DB_PASS` is not set, `docker-compose.pgtap.yml` will error and refuse
  to start — this is intentional to prevent accidental runs without credentials.

- **Test table naming**: All test-only tables must use the `_test_*` prefix to clearly distinguish
  them from production schema objects and prevent accidental data leakage between environments.

- **Localhost-only port binding**: The Docker Compose setup binds the pgtap postgres port to
  `127.0.0.1` only (e.g. `127.0.0.1:5434:5432`). This prevents the ephemeral test database
  from being reachable on any network interface other than loopback.

- **Credentials are local-dev only (ephemeral)**: Credentials in `.env.local` are intended solely
  for local development against a short-lived throwaway container. They must never be used in
  production or shared environments. CI uses `secrets.PGTAP_DB_PASSWORD` so the credential is
  not stored in source control.

- **pgtap output in CI logs**: `--verbose` mode (which logs all SQL output) is suppressed in CI
  (`CI=true`) to avoid leaking schema structure. It is enabled locally for developer convenience.
  Avoid referencing production table names, sensitive column names, or real data values inside
  test assertion messages or test file comments. Keep test fixtures synthetic and non-production.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGTAP_DB_HOST` | `localhost` | Postgres host |
| `PGTAP_DB_PORT` | `5434` | Postgres port (avoids conflict with KB postgres on 5433) |
| `PGTAP_DB_USER` | `pgtap` | Postgres user |
| `PGTAP_DB_PASS` | — (required) | Postgres password — set in `.env.local`; CI uses `PGTAP_DB_PASSWORD` secret |
| `PGTAP_DB_NAME` | `pgtap_test` | Postgres database |
