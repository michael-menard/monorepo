# Rebrickable MOC Instructions Scraper

Scrapes purchased and liked MOC instructions from Rebrickable, downloads
instruction files and images, and stores everything in PostgreSQL + MinIO.
Includes anti-detection (stealth browser, human-like delays, rate limiting),
checkpoint/resume, and incremental scraping.

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** with the scraper schema (see Database Setup below)
- **MinIO** (or S3-compatible storage) for file uploads
- A **Rebrickable account** with purchased MOC instructions

## Setup

```bash
# From monorepo root
cd apps/scrapers/rebrickable

# Copy and fill in your credentials
cp .env.example .env

# Push the DB schema
pnpm db:push
```

## Environment Variables

| Variable                | Required | Default                    | Description                                        |
| ----------------------- | -------- | -------------------------- | -------------------------------------------------- |
| `SCRAPER_DB_HOST`       |          | `localhost`                | PostgreSQL host                                    |
| `SCRAPER_DB_PORT`       |          | `5432`                     | PostgreSQL port                                    |
| `SCRAPER_DB_USER`       |          | `postgres`                 | PostgreSQL user                                    |
| `SCRAPER_DB_PASSWORD`   | yes      |                            | PostgreSQL password                                |
| `SCRAPER_DB_NAME`       |          | `rebrickable`              | PostgreSQL database name                           |
| `REBRICKABLE_USERNAME`  | yes      |                            | Your Rebrickable login email                       |
| `REBRICKABLE_PASSWORD`  | yes      |                            | Your Rebrickable login password                    |
| `REBRICKABLE_USER_SLUG` | yes      |                            | Your Rebrickable user slug (from your profile URL) |
| `S3_ENDPOINT`           |          |                            | MinIO/S3 endpoint (e.g. `http://localhost:9000`)   |
| `S3_ACCESS_KEY_ID`      |          |                            | MinIO/S3 access key                                |
| `S3_SECRET_ACCESS_KEY`  |          |                            | MinIO/S3 secret key                                |
| `AWS_REGION`            |          | `us-east-1`                | S3 region                                          |
| `SCRAPER_BUCKET`        |          | `rebrickable-instructions` | S3 bucket for uploads                              |
| `SCRAPER_RATE_LIMIT`    |          | `10`                       | Max requests per minute                            |
| `SCRAPER_MIN_DELAY_MS`  |          | `2000`                     | Minimum delay between requests (ms)                |
| `SCRAPER_HEADED`        |          | `false`                    | Launch browser with a visible window               |

## Usage

All commands run from the monorepo root using `pnpm --filter @repo/scraper-rebrickable`
(or `cd apps/scrapers/rebrickable && pnpm`).

### Scrape modes

#### Incremental (default)

```bash
pnpm --filter @repo/scraper-rebrickable scrape
```

Paginates your purchases list starting from page 1. On each page, checks
which MOCs have already been scraped in prior runs. Once two consecutive
pages are entirely already-scraped, pagination stops — the scraper has
caught up. Only new MOCs are processed.

This is the recommended day-to-day command. If you buy 3 new MOCs, it
scrapes those and stops after ~2 extra pages.

#### Single MOC

```bash
pnpm --filter @repo/scraper-rebrickable scrape -- --moc=12345
# or
pnpm --filter @repo/scraper-rebrickable scrape -- --moc=MOC-12345
```

Skips list-page pagination entirely and goes straight to the detail page
for that one MOC. Useful for testing or re-scraping a specific item.

#### Full scan

```bash
pnpm --filter @repo/scraper-rebrickable scrape:full-scan
```

Paginates all pages (like the old default behavior) but still skips
already-completed MOCs at the detail-scraping step. Use this to pick up
MOCs that were missed in prior runs due to errors or gaps.

#### Liked MOCs (free plans)

```bash
pnpm --filter @repo/scraper-rebrickable scrape:liked-mocs
```

Scrapes your liked MOCs list instead of purchases. Filters out premium and
disabled MOCs automatically. Supports incremental mode by default; add
`--full-scan` to scan all pages.

### Modifiers

These flags can be combined with any mode above.

| Flag              | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `--headed`        | Show the browser window (useful for debugging, also forced on first run) |
| `--dry-run`       | Scrape metadata but skip file downloads and uploads                      |
| `--limit=N`       | Cap the number of instructions to process                                |
| `--force`         | Ignore all checkpoints, re-scrape everything                             |
| `--resume`        | Find the last interrupted run and resume from its checkpoint             |
| `--ignore-robots` | Skip robots.txt checks                                                   |

### Recovery

```bash
# Retry MOCs that were partially scraped (detail saved, download failed)
pnpm --filter @repo/scraper-rebrickable scrape:retry-failed

# Backfill missing metadata/images for already-uploaded MOCs
pnpm --filter @repo/scraper-rebrickable scrape:retry-missing

# Dry-run backfill (see what would be updated)
pnpm --filter @repo/scraper-rebrickable scrape:retry-missing:dry-run
```

### Convenience scripts

| Script                           | Equivalent                                            |
| -------------------------------- | ----------------------------------------------------- |
| `pnpm scrape`                    | `tsx src/index.ts` (incremental)                      |
| `pnpm scrape:headed`             | `tsx src/index.ts --headed`                           |
| `pnpm scrape:dry-run`            | `tsx src/index.ts --dry-run`                          |
| `pnpm scrape:full-scan`          | `tsx src/index.ts --full-scan`                        |
| `pnpm scrape:moc`                | `tsx src/index.ts --moc` (pass MOC number after `--`) |
| `pnpm scrape:liked-mocs`         | `tsx src/index.ts --liked-mocs`                       |
| `pnpm scrape:liked-mocs:dry-run` | `tsx src/index.ts --liked-mocs --dry-run`             |
| `pnpm scrape:retry-failed`       | `tsx src/index.ts --retry-failed`                     |
| `pnpm scrape:retry-missing`      | `tsx src/index.ts --retry-missing`                    |

## How it works

### Pipeline

1. **Initialize** MinIO bucket + load robots.txt
2. **Launch** a stealth Playwright browser (Chromium with anti-detection)
3. **Login** to Rebrickable (or reuse existing session cookies)
4. **Build instruction list** from purchases or liked-mocs pages (paginated)
5. **For each MOC:**
   - Navigate to detail page
   - Scrape metadata (title, author, parts count, description, tags, dates)
   - Download instruction files (PDF, Studio, LDR, etc.)
   - Upload files to MinIO
   - Scrape and upload images
   - Scrape parts inventory (Rebrickable CSV, BrickLink XML)
   - Write to gallery database
   - Save checkpoint as `completed`
6. **Enrich** the scrape run with aggregate statistics

### Checkpoint system

Every MOC progresses through phases: `listed` -> `detail_scraped` ->
`downloaded` -> `uploaded` -> `completed`. Checkpoints are stored in
PostgreSQL per scrape run. If the process is interrupted (Ctrl+C, crash),
you can `--resume` from the last checkpoint.

The incremental mode uses cross-run checkpoint lookups — it checks whether
a MOC was completed in _any_ prior run, not just the current one.

### Anti-detection

- Stealth browser with randomized fingerprints
- Human-like delays between actions (reading, thinking, scanning)
- Rate limiting (configurable requests/minute + minimum delay)
- robots.txt compliance (unless `--ignore-robots`)
- Proactive session refresh every 45 minutes to prevent silent 403s

## Database

### Schema management

```bash
pnpm db:push       # Push schema to database
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Drizzle Studio (visual DB explorer)
```

### Tables

- `scrape_runs` — one row per scraper invocation (status, config, counters, errors)
- `instructions` — scraped MOC metadata + MinIO keys
- `parts` — normalized part catalog
- `instruction_parts` — join table (which parts in which MOC)
- `scrape_checkpoints` — per-MOC phase tracking for resume/retry

## Development

```bash
pnpm test           # Run tests
pnpm test:watch     # Watch mode
pnpm check-types    # TypeScript type check
pnpm build          # Compile to dist/
```
