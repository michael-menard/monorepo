# Scraper Pipeline Architecture

## Overview

The scraper pipeline enriches LEGO set and minifig data from three external sources:

- **BrickLink** — Marketplace data: minifig inventory, price guides, weight, dimensions
- **Rebrickable** — Catalog data: set numbers, themes, part counts, years
- **LEGO.com** — Official product data: MSRP, descriptions, current availability

All scrapers run as BullMQ workers sharing a single Redis instance. Each source has its own queue with independent rate limiting and circuit breakers.

## Queue Architecture

| Queue                           | Rate Limit           | Purpose                                       |
| ------------------------------- | -------------------- | --------------------------------------------- |
| `scrape-bricklink-minifig`      | 20/hour              | BrickLink item scraping (minifigs AND sets)   |
| `scrape-bricklink-catalog`      | 20/hour              | Multi-page BrickLink catalog discovery        |
| `scrape-bricklink-prices`       | 15/hour              | BrickLink price guide (minifig variants only) |
| `scrape-lego-set`               | None (concurrency 1) | LEGO.com product pages                        |
| `scrape-rebrickable-set`        | 20/hour              | Rebrickable set pages                         |
| `scrape-rebrickable-mocs`       | None (concurrency 1) | MOC discovery pipeline                        |
| `scrape-rebrickable-moc-single` | None                 | Individual MOC scraping                       |

All queues: 3 attempts with exponential backoff (5s initial), concurrency 1.

### Shared Browser

All BrickLink workers (`bricklink-minifig`, `bricklink-catalog`, `bricklink-prices`) share a single Chrome instance via `shared-browser.ts`. This uses a persistent profile at `apps/scrapers/bricklink-minifigs/.chrome-profile` to maintain session cookies and avoid bot detection.

Key shared utilities:

- `navigateWithRetry()` — Retries once on `net::ERR_ABORTED` (common with BrickLink redirects/age gates)
- `waitForAgeGate()` — Detects birthday verification popups, waits up to 2 minutes for manual resolution
- `checkRateLimited()` — Detects rate limit / Cloudflare challenge pages
- `dismissCookiePopup()` — Handles cookie consent dialogs

### Circuit Breaker

When a worker detects rate limiting (via page text detection), it trips the circuit breaker:

1. Pauses the affected queue
2. Stores state in Redis (`circuit-breaker:{queueName}`)
3. Schedules auto-resume after cooldown (default 30 min, or parsed from page)
4. Emits WebSocket event to the scraper queue UI

## Set Enrichment Pipeline

### Data Flow

```
User adds set (manual / LEGO.com / Rebrickable)
         |
         v
  Cross-enqueue triggers
         |
    +----+----+
    |         |
    v         v
BrickLink   Rebrickable
Set Scrape  Set Scrape
    |
    +---> Detail page: year, weight, dimensions, category, image
    +---> Minifig inventory: catalogItemInv.asp?S={num}&viewItemType=M
    +---> Price guide: #T=P tab
    |
    v
Insert set_minifigs rows (set_number <-> minifig_number)
Update sets row (fill gaps + price guide + scraped_sources)
    |
    v
Enqueue bricklink-minifig jobs (itemType='M') for each discovered minifig
    |
    v
Each minifig scrape -> variant created -> auto-enqueue price job
```

### Cross-Enqueue Rules

When a set scrape completes from one source, it automatically enqueues scrapes from other sources:

| Source completes | Enqueues                        |
| ---------------- | ------------------------------- |
| BrickLink set    | Rebrickable set                 |
| Rebrickable set  | BrickLink set                   |
| LEGO.com set     | BrickLink set + Rebrickable set |

**Never enqueued:** BrickLink/Rebrickable -> LEGO.com (LEGO.com only has current sets; would 404 for retired)

**Never enqueued:** Minifig -> Set (minifig scrapes do not trigger set scrapes)

### Deduplication

The `scraped_sources` TEXT[] column on `sets` tracks which sources have already scraped a set (e.g., `['rebrickable', 'bricklink']`). Cross-enqueue checks this array before adding jobs. The backfill endpoint also uses this for its query.

### Set Number Normalization

Set numbers differ across sources:

- **LEGO.com:** `75192` (bare number)
- **Rebrickable:** `75192-1` (with variant suffix)
- **BrickLink:** `75192-1` (with variant suffix)

Normalization happens at the cross-enqueue boundary:

- When constructing a BrickLink URL from a bare number, append `-1`
- When matching sets across sources, strip the `-1` suffix for comparison

No retroactive normalization of stored `setNumber` values.

## BrickLink Set Scraper Details

**File:** `apps/api/scrapers/src/workers/bricklink-set.ts`

The set scraper reuses the `scrape-bricklink-minifig` queue (same rate limit, same shared browser). When a job has `itemType='S'`, the minifig worker delegates to `processBricklinkSet()`.

### Pages Scraped (per set)

1. **Detail page** — `catalogitem.page?S={setNumber}#T=S`
   - Extracts: name, year, weight (grams), dimensions (cm), category/theme, piece count, main image
   - Downloads main image to S3 at `sets/{setNumber}/images/main.jpg`

2. **Minifig inventory** — `catalogItemInv.asp?S={setNumber}&viewItemType=M`
   - Extracts: minifig numbers (`M=` links) with quantities
   - Inserts `set_minifigs` join rows via `POST /sets/minifigs` (upsert on conflict)

3. **Price guide** — `catalogitem.page?S={setNumber}#T=P`
   - Extracts: Last 6 Months Sales (new + used)
   - Stats: timesSold, totalQty, minPrice, avgPrice, qtyAvgPrice, maxPrice

### Update Strategy

- **Fill gaps:** Year, weight, dimensions, theme, image, piece count — only written if the field is currently empty
- **Always overwrite:** `priceGuide`, `scrapedSources`, `lastScrapedAt`, `lastScrapedSource`

### Error Handling

Each scrape phase (detail, inventory, price guide) is independently try/caught. If minifig inventory or price guide fails, the set metadata is still saved. Non-fatal failures are logged as warnings.

## Database Schema

### `set_minifigs` (new)

Many-to-many join linking sets to minifigs they contain. Uses text keys (no FKs) following the `moc_source_sets` pattern.

```sql
set_minifigs
  id              UUID PK
  set_number      TEXT NOT NULL
  minifig_number  TEXT NOT NULL
  quantity        INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
  UNIQUE(set_number, minifig_number)
```

Indexed on both `set_number` and `minifig_number` for bidirectional queries.

### New columns on `sets`

| Column            | Type   | Purpose                                                                  |
| ----------------- | ------ | ------------------------------------------------------------------------ |
| `price_guide`     | JSONB  | BrickLink market prices `{newSales: {...}, usedSales: {...}}`            |
| `scraped_sources` | TEXT[] | Which sources have scraped this set, e.g. `['rebrickable', 'bricklink']` |

## API Endpoints

### Scraper Queue

| Method | Endpoint                           | Purpose                                           |
| ------ | ---------------------------------- | ------------------------------------------------- |
| POST   | `/scraper/jobs`                    | Add scrape job (auto-detects type from URL)       |
| POST   | `/scraper/backfill/bricklink-sets` | Enqueue BrickLink scrapes for all un-scraped sets |
| GET    | `/scraper/jobs`                    | List jobs across all queues                       |
| GET    | `/scraper/queues`                  | Queue health + circuit breaker status             |

### Set Minifigs

| Method | Endpoint                           | Purpose                                           |
| ------ | ---------------------------------- | ------------------------------------------------- |
| POST   | `/sets/minifigs`                   | Upsert a set_minifigs join row (used by scrapers) |
| GET    | `/sets/minifigs?setNumber=75192-1` | List minifigs for a set                           |

## Backfill Process

To enrich all existing sets with BrickLink data:

```bash
# Via API
curl -X POST http://localhost:9100/scraper/backfill/bricklink-sets \
  -H "Authorization: Bearer $TOKEN"

# Response: { "success": true, "enqueued": 42, "total": 42 }
```

This queries all sets where `'bricklink'` is not in `scraped_sources` and enqueues them. At 20 jobs/hour, a backfill of 100 sets takes ~5 hours.

## Files Reference

| File                                                      | Purpose                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/api/scrapers/src/index.ts`                          | Worker orchestrator, job processing, cross-enqueue logic                     |
| `apps/api/scrapers/src/queues.ts`                         | Queue definitions, job schemas                                               |
| `apps/api/scrapers/src/workers/bricklink-set.ts`          | BrickLink set detail + inventory + price scraper                             |
| `apps/api/scrapers/src/workers/bricklink-minifig.ts`      | BrickLink minifig detail scraper (delegates to set scraper for itemType='S') |
| `apps/api/scrapers/src/workers/bricklink-prices.ts`       | BrickLink price guide scraper (minifig variants)                             |
| `apps/api/scrapers/src/workers/bricklink-catalog.ts`      | BrickLink catalog list discovery                                             |
| `apps/api/scrapers/src/workers/shared-browser.ts`         | Shared Chrome instance, navigation helpers                                   |
| `apps/api/scrapers/src/workers/lego-set.ts`               | LEGO.com product page scraper                                                |
| `apps/api/scrapers/src/workers/rebrickable-set.ts`        | Rebrickable set page scraper                                                 |
| `apps/api/scrapers/src/circuit-breaker.ts`                | Rate limit response, queue pause/resume                                      |
| `apps/api/lego-api/domains/scraper/routes.ts`             | Scraper API routes (jobs, queues, backfill)                                  |
| `apps/api/lego-api/domains/sets/routes.ts`                | Set CRUD + minifigs join endpoints                                           |
| `packages/backend/db/src/sets.ts`                         | Drizzle schema (sets, setMinifigs)                                           |
| `packages/backend/db/src/migrations/013_set_minifigs.sql` | Migration for set_minifigs + new columns                                     |
