---
name: cache-warm
description: Warm all four context-pack caches in the app database (wint.context_packs) by running the four populate scripts in sequence. Individual script failures are non-fatal. Use this skill at the start of a long session or after a schema/content change to ensure agents have fresh context packs available.
---

# /cache-warm — Warm the Context Pack Cache

## Who Should Call This

Any leader agent that needs fresh context packs before spawning workers:
- `dev-implement-story` (start of execute phase)
- `dev-fix-story` (start of fix phase)
- `qa-verify-story` (start of QA phase)
- Manual invocation when context packs are stale or missing

## Description

Runs four populate scripts in sequence against the app database (`wint.context_packs`).
Each script is independent — a failure in one does not stop the others.
After all scripts run, a summary block reports N/4 succeeded with per-script status.

## Usage

```
/cache-warm                        # Run all four scripts
/cache-warm --skip=agent-missions  # Skip the agent-mission populator
```

## Parameters

- **--skip={script}** — Skip one script by short name. Valid values:
  - `project-context` — skip populate-project-context.ts
  - `domain-kb` — skip populate-domain-kb.ts
  - `library-cache` — skip populate-library-cache.ts
  - `agent-missions` — skip agent-mission-cache-populator.ts

---

## EXECUTION INSTRUCTIONS

### Phase 1: Precondition Check

Before running any scripts, verify the required environment variables are set.

**DATABASE_URL (REQUIRED)**

Check that `DATABASE_URL` is set and points to port **5432** (the app database):

```
Expected: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
```

If `DATABASE_URL` is missing or absent, STOP and emit:

```
CACHE-WARM BLOCKED: DATABASE_URL is not set.
Set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev and retry.
```

**KB_DATABASE_URL (OPTIONAL — warn if absent)**

Check whether `KB_DATABASE_URL` is set and points to port **5433** (the KB database):

```
Expected: KB_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/lego_kb
```

If `KB_DATABASE_URL` is absent, emit a warning (do NOT stop):

```
WARNING: KB_DATABASE_URL is not set.
  populate-domain-kb.ts reads KB entries at port 5433 — it will be skipped.
  All other scripts will still run normally.
```

Mark `domain-kb` as `SKIP (KB_DATABASE_URL not set)` for the summary block.

### Phase 2: Run populate-project-context.ts

**Script:** `packages/backend/mcp-tools/src/scripts/populate-project-context.ts`

**What it does:** Reads `CLAUDE.md` and docs in `docs/tech-stack/` and `docs/testing/`, extracts structured JSONB per domain, and writes 5 cache entries to `wint.context_packs`.

**Command (run from monorepo root):**

```bash
pnpm tsx packages/backend/mcp-tools/src/scripts/populate-project-context.ts
```

**Success signal:** Script exits 0. Output includes `attempted`, `succeeded`, `failed` counts.

**On failure:** Log the error. Mark `project-context` as FAIL. Continue to Phase 3.

### Phase 3: Run populate-domain-kb.ts

**Skip condition:** `KB_DATABASE_URL` is not set, OR `--skip=domain-kb` was passed.
If skipping, mark `domain-kb` as SKIP and proceed to Phase 4.

**Script:** `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts`

**What it does:** Reads `ADR-LOG.md` and queries the KB database (port 5433) for lessons learned and blockers, then writes 6 cache entries to `wint.context_packs`.

**Command (run from monorepo root):**

```bash
pnpm tsx packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts
```

**Success signal:** Script exits 0. Output includes `attempted`, `succeeded`, `failed` counts.

**On failure:** Log the error. Mark `domain-kb` as FAIL. Continue to Phase 4.

### Phase 4: Run populate-library-cache.ts

**Script:** `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts`

**What it does:** Reads `CLAUDE.md` and `docs/tech-stack/*.md`, extracts structured JSONB per library (React 19, Tailwind, Zod, Vitest), and writes 4 cache entries to `wint.context_packs`.

**Command (run from monorepo root):**

```bash
pnpm tsx packages/backend/mcp-tools/src/scripts/populate-library-cache.ts
```

**Success signal:** Script exits 0. Output includes `attempted`, `succeeded`, `failed` counts.

**On failure:** Log the error. Mark `library-cache` as FAIL. Continue to Phase 5.

### Phase 5: Run agent-mission-cache-populator.ts

**Skip condition:** `--skip=agent-missions` was passed. If skipping, mark `agent-missions` as SKIP and proceed to Phase 6.

**Script:** `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts`

> NOTE: This script lives in `database-schema/src/seed/`, NOT in `mcp-tools/`. Use the exact path below.

**What it does:** Discovers all non-archived `.agent.md` files from `.claude/agents/`, extracts mission/scope/signals from frontmatter and body content, and upserts compact mission summaries into `wint.context_packs` with `packType='agent_missions'`.

**Command (run from monorepo root):**

```bash
pnpm tsx packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts
```

**Success signal:** Script exits 0. Output includes `totalFound`, `cached`, `skipped`, `warnings` counts.

**On failure:** Log the error. Mark `agent-missions` as FAIL. Continue to Phase 6.

### Phase 6: Summary Block

After all four phases complete, emit the following summary block.

Count:
- **succeeded** = number of scripts that exited 0
- **skipped** = number of scripts marked SKIP (not attempted)
- **failed** = number of scripts that exited non-zero

**Status values per script:**
- `PASS` — script exited 0
- `FAIL` — script exited non-zero (include one-line error reason)
- `SKIP` — not run (include reason: `--skip=` flag or `KB_DATABASE_URL not set`)

```
═══════════════════════════════════════════════════════
  /cache-warm — {date}
═══════════════════════════════════════════════════════

Result: {N}/4 scripts succeeded  ({S} skipped, {F} failed)

── Script Results ──────────────────────────────────────
  project-context    {PASS | FAIL: reason | SKIP: reason}
  domain-kb          {PASS | FAIL: reason | SKIP: reason}
  library-cache      {PASS | FAIL: reason | SKIP: reason}
  agent-missions     {PASS | FAIL: reason | SKIP: reason}

── Cache Packs Written ─────────────────────────────────
  {Sum of succeeded/attempted counts from each script that PASSed, or "—" if all failed}
  e.g. 19 packs written to wint.context_packs

{If any FAIL:}
── Failures ───────────────────────────────────────────
  {script-name}: {error message or exit code}

{If all 4 PASS or SKIP:}
✓ Cache warm complete. Context packs are ready for agent use.

{If any FAIL:}
CACHE-WARM PARTIAL: {N}/4 scripts succeeded.
  Failed scripts left their packs stale — agents may receive outdated context.
  Retry failed scripts manually or re-run /cache-warm.

═══════════════════════════════════════════════════════
```

---

## Environment Reference

| Variable | Port | Database | Required by |
|----------|------|----------|-------------|
| `DATABASE_URL` | 5432 | `lego_dev` | All scripts (writes to `wint.context_packs`) |
| `KB_DATABASE_URL` | 5433 | `lego_kb` | `populate-domain-kb.ts` only (reads lessons/blockers) |

**Typical local values:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
KB_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/lego_kb
```

---

## Script Reference

| Short name | Full path | Packs written |
|------------|-----------|---------------|
| `project-context` | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | 5 |
| `domain-kb` | `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` | 6 |
| `library-cache` | `packages/backend/mcp-tools/src/scripts/populate-library-cache.ts` | 4 |
| `agent-missions` | `packages/backend/database-schema/src/seed/agent-mission-cache-populator.ts` | 1 per agent |

---

## Failure Handling

Individual script failures are **non-fatal**. The skill continues to the next script regardless of outcome.

The only blocking condition is a missing `DATABASE_URL` — without it, no script can write to `wint.context_packs`.

If `KB_DATABASE_URL` is absent, `populate-domain-kb.ts` is automatically skipped (it would fail without the KB connection anyway).

---

## When to Re-Run

| Trigger | Scripts to re-run |
|---------|------------------|
| New `.agent.md` added or modified | `agent-missions` |
| ADR-LOG.md updated | `domain-kb` |
| `CLAUDE.md` or `docs/tech-stack/*.md` changed | `project-context`, `library-cache` |
| First time on a new machine | All 4 |
| Packs missing from `wint.context_packs` | All 4 |
| After `wint.context_packs` table truncated | All 4 |
