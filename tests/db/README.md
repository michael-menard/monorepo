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
# 1. Start the pgtap postgres container (first time builds the image)
docker compose -f docker-compose.pgtap.yml up -d

# 2. Wait for healthy (a few seconds on first run while pgtap installs)
docker compose -f docker-compose.pgtap.yml ps

# 3. Apply the schema baseline so triggers and functions exist
PGPASSWORD=pgtap psql -h localhost -p 5434 -U pgtap -d pgtap_test \
  -f apps/api/knowledge-base/src/db/migrations/999_full_schema_baseline.sql

# 4. Run all pgtap tests
bash scripts/db/run-pgtap.sh

# 5. Tear down when done
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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGTAP_DB_HOST` | `localhost` | Postgres host |
| `PGTAP_DB_PORT` | `5434` | Postgres port (avoids conflict with KB postgres on 5433) |
| `PGTAP_DB_USER` | `pgtap` | Postgres user |
| `PGTAP_DB_PASS` | `pgtap` | Postgres password |
| `PGTAP_DB_NAME` | `pgtap_test` | Postgres database |
