# MOC-to-Set Dependencies

## Goal

When scraping a MOC from Rebrickable, capture all linked LEGO sets shown in the "Alternate Build of the following" section on the Details tab. Store the many-to-many relationships, enqueue set scrapes, and display the links bidirectionally in the UI.

## Key Decisions

| #   | Decision                 | Resolution                                                                                   |
| --- | ------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Goal                     | Capture all linked LEGO sets from a MOC page on Rebrickable, regardless of relationship type |
| 2   | Data captured            | MOC number + set number (minimal join). Set metadata comes from the set scrape.              |
| 3   | Queue routing            | Linked sets enqueue to `scrape-rebrickable-set`                                              |
| 4   | Relationship model       | Many-to-many join between MOCs and sets                                                      |
| 5   | When to enqueue          | Inline during the MOC scrape (single pass)                                                   |
| 6   | Join table schema        | `moc_source_sets`: id, moc_number (text), set_number (text), created_at, updated_at          |
| 7   | Scraper DB consolidation | Deferred to a future plan. Join table goes in main LEGO DB for now.                          |
| 8   | No FKs for now           | Text keys only (pragmatic — gets proper FKs when DBs consolidate)                            |
| 9   | Set creation             | No stub records. Set scrape creates the full record. Join works on set_number text match.    |
| 10  | Extraction point         | Existing MOC scrape pipeline, "Alternate Build of" section in Details tab                    |
| 11  | Rate limiting            | Add 20/hour limiter to `scrape-rebrickable-set`                                              |
| 12  | Deduplication            | Unique constraint on (moc_number, set_number). BullMQ jobId = set_number for queue dedup.    |
| 13  | UI                       | Bidirectional — MOC detail shows linked sets, set detail shows buildable MOCs                |
| 14  | Set detail page          | Best judgement at implementation time                                                        |

## Not In Scope

- "Fans who also bought" section on Rebrickable MOC pages
- Scraper DB consolidation into main LEGO DB (separate future plan)
- Enrichment from LEGO.com or BrickLink (future enhancement)

## Architecture Notes

### Database Split (Current State)

- MOC data (`instructions` table) lives in the Rebrickable scraper DB
- Set data (`sets` table) lives in the main LEGO DB (`monorepo:5432`)
- Cross-DB FKs are not possible, so `moc_source_sets` uses text keys (moc_number, set_number)
- When the scraper DB is consolidated into the main DB (future plan), this table gets proper FKs

### Join Table Schema

```sql
CREATE TABLE moc_source_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moc_number TEXT NOT NULL,
  set_number TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(moc_number, set_number)
);
```

---

## Phases

### Phase 1: Schema + Data Layer

- Create `moc_source_sets` migration in main LEGO DB
- Unique constraint on (moc_number, set_number)
- Drizzle schema + repository layer (CRUD operations)

**Tests:**

- **Unit:** Repository functions (create, findByMoc, findBySet, upsert dedup)
- **Integration:** Migration runs clean, constraints enforced, upsert doesn't duplicate

**Gate:** All tests pass. Can create, read, and deduplicate join records against a real DB. Migration is reversible.

---

### Phase 2: Scraper Extraction

- Add "Alternate Build of" section parsing to MOC scrape pipeline
- Extract set numbers, names, URLs from the page
- Write to `moc_source_sets` table
- Enqueue `scrape-rebrickable-set` jobs with dedup (jobId = set_number)

**Tests:**

- **Unit:** Page parser function with mocked HTML (happy path, no sets section, malformed links)
- **Integration:** Full scrape of a known MOC page (MOC-253417) extracts the correct sets (76342, etc.)
- **Integration:** Enqueued jobs have correct set numbers and are deduplicated

**Gate:** Scrape a real MOC with known linked sets. Verify `moc_source_sets` rows match expected sets. Verify set scrape jobs appear in the queue. No duplicate rows on re-scrape.

---

### Phase 3: Rate Limiting + Queue Hardening

- Add 20/hour limiter to `scrape-rebrickable-set`
- Verify rate limiter state shows in queue health API
- Verify UI banner shows when rate limited

**Tests:**

- **Unit:** Rate limiter config is applied to worker
- **Integration:** Queue health endpoint returns `rateLimiter.isLimited` when limit hit

**Gate:** Enqueue 25 set scrape jobs. Verify only 20 process in the first hour window. Verify queue health API reports rate limiting. Verify UI banner appears.

---

### Phase 4: API Endpoints

- `GET /mocs/:id/sets` — returns linked sets for a MOC
- `GET /sets/:id/mocs` — returns MOCs buildable from a set
- Response includes set/MOC metadata (name, image, set_number)

**Tests:**

- **Unit:** Service layer returns correct data shape
- **Integration:** API endpoints return correct linked data for known MOC/set pairs
- **Regression:** Existing MOC detail and set list endpoints unchanged

**Gate:** Call both endpoints with test data. Verify correct relationships returned. Verify existing endpoints still work identically.

---

### Phase 5: UI — MOC Detail to Sets

- "Built From" section on MOC detail page
- Shows linked set thumbnails with name, set number
- Links to set detail (or list)

**Tests:**

- **Unit:** Component renders with mock data (0 sets, 1 set, 3 sets)
- **E2E:** Navigate to a MOC with known linked sets, verify "Built From" section visible with correct sets

**Gate:** Visual review on both desktop and mobile. E2E test passes.

---

### Phase 6: UI — Set Detail to MOCs

- "MOCs from this set" section on set detail/list page
- Shows linked MOC thumbnails

**Tests:**

- **Unit:** Component renders with mock data (0 MOCs, 1 MOC, 5 MOCs)
- **E2E:** Navigate to a set with known linked MOCs, verify section visible
- **Regression:** Set list/gallery page still renders correctly with no visual regressions

**Gate:** Visual review. E2E test passes. No regressions to existing set pages.

---

## Phase Gate Dependencies

| Phase              | Gate Criteria                                              | Blocks         |
| ------------------ | ---------------------------------------------------------- | -------------- |
| 1 - Schema         | Migration + CRUD tests pass                                | Phase 2, 4     |
| 2 - Scraper        | Real MOC scrape produces correct join records + queue jobs | Phase 3        |
| 3 - Rate Limiting  | Limiter active, health API reports it, UI banner shows     | Phase 5 (soft) |
| 4 - API            | Both endpoints return correct data, no regressions         | Phase 5, 6     |
| 5 - UI MOC to Sets | E2E passes, visual review approved                         | Phase 6        |
| 6 - UI Set to MOCs | E2E passes, no regressions                                 | Done           |

No phase starts until the prior gate passes. Phases 1 to 2 to 3 are sequential. Phase 4 can start after Phase 1. Phases 5 and 6 require Phase 4.
