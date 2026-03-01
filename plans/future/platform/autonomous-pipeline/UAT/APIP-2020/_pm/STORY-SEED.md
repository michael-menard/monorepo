---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-2020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active stories currently in-progress for the platform epic; all Phase 0-1 stories are in backlog/ready state. Knowledge base has no lessons loaded (kb_search not available in this context).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `wint.stories` table with `state` enum including `blocked` | `packages/backend/database-schema/src/schema/unified-wint.ts` | Dashboard pipeline view queries story state |
| `wint.token_usage` table (phase, storyId, tokensInput, tokensOutput, model, agentName) | `packages/backend/database-schema/src/schema/unified-wint.ts` | Direct source for per-story cost tracking |
| `wint.story_state_transitions` table | `packages/backend/orchestrator/src/db/story-repository.ts` | Transition history for pipeline view |
| `wint.worktrees` table | `packages/backend/database-schema/src/schema/unified-wint.ts` | Active worktree visibility |
| `StoryRepository.getStoriesByState()` | `packages/backend/orchestrator/src/db/story-repository.ts` | Existing read pattern for queue view |
| `StoryRepository.getWorkableStories()` | `packages/backend/orchestrator/src/db/story-repository.ts` | Blocked/unblocked queue separation already implemented |
| Hono route pattern (thin routes + service delegation) | `apps/api/lego-api/domains/health/routes.ts` | API server pattern for new monitor endpoints |
| `app-dashboard` React app | `apps/web/app-dashboard/` | Candidate host for the monitor UI page |
| `ActivityFeed` component | `apps/web/app-dashboard/src/components/ActivityFeed/index.tsx` | Timeline pattern reusable for pipeline event feed |
| `StatsCards` component | `apps/web/app-dashboard/src/components/StatsCards.tsx` | Stats card pattern for cost/queue summary tiles |

### Active In-Progress Work

| Story | Scope | Overlap Risk |
|-------|-------|-------------|
| APIP-5005 (Minimal Operator Visibility CLI) | CLI for queue depth, supervisor status, graph execution status | Shared read queries; CLI and dashboard must not duplicate service logic — both should consume the same read layer |
| APIP-2010 (Blocked Queue and Notification System) | DB transitions to `blocked` state, webhook notifications | APIP-2020 depends on APIP-2010 being complete; `blocked` state data must exist before dashboard can show it |

### Constraints to Respect

- `wint.stories`, `wint.token_usage`, and related tables are in the protected `packages/backend/database-schema/` — do NOT alter schemas; query read-only
- All new endpoints must follow ADR-001: frontend uses `/api/v2/{domain}`, backend Hono uses `/{domain}`
- Zod-first types required throughout — no TypeScript interfaces
- No barrel files — import directly from source
- `@repo/logger` for all logging — no `console.log`
- `@repo/ui` for all UI primitives — no direct shadcn imports

---

## Retrieved Context

### Related Endpoints

| Endpoint | File | Notes |
|----------|------|-------|
| `GET /health` (and `/live`, `/ready`) | `apps/api/lego-api/domains/health/routes.ts` | Pattern to follow for new monitor domain routes |
| (None yet) monitor/pipeline endpoints | — | Must be created as new Hono domain routes |

### Related Components

| Component | File | Usage |
|-----------|------|-------|
| `ActivityFeed` | `apps/web/app-dashboard/src/components/ActivityFeed/index.tsx` | Timeline/feed pattern for pipeline events |
| `StatsCards` | `apps/web/app-dashboard/src/components/StatsCards.tsx` | Summary stat tiles for queue depth, cost totals |
| `BuildStatusChart` | `apps/web/app-dashboard/src/components/BuildStatusChart/index.tsx` | Chart pattern for pipeline state distribution |
| `MainPage` (app-dashboard) | `apps/web/app-dashboard/src/pages/main-page.tsx` | Full page composition pattern with sections |

### Reuse Candidates

- `StoryRepository` (read-only methods) from `packages/backend/orchestrator/src/db/story-repository.ts` — `getStoriesByState`, `getWorkableStories`, `getAllStories` are directly applicable for the queue/blocked views
- `wint.token_usage` DB table — already has required fields (`story_id`, `phase`, `tokens_input`, `tokens_output`, `total_tokens`, `model`, `agent_name`)
- Hono route/service/adapter domain structure from `apps/api/lego-api/domains/` — follow this exact structure for new `monitor` domain
- `@repo/app-component-library` card/stats primitives already in use in `app-dashboard`
- Drizzle ORM read-only queries following pattern in `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Hono route handler (thin routes + service delegation) | `apps/api/lego-api/domains/health/routes.ts` | Clean separation, no business logic in route layer, exactly the right scope for read-only status endpoints |
| Drizzle read query with typed result | `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` | Shows discriminated union result types (`ok`/`err`), Drizzle query patterns, schema import structure |
| Dashboard page composition with sections | `apps/web/app-dashboard/src/pages/main-page.tsx` | Zod-first props, accessibility sections, loading skeleton pattern, component composition |
| Activity timeline feed component | `apps/web/app-dashboard/src/components/ActivityFeed/index.tsx` | Timeline/feed UI with loading skeleton, empty state, Card primitives from `@repo/app-component-library` |

---

## Knowledge Context

### Lessons Learned

*Knowledge base was not queryable in this session. The following lessons are inferred from ADRs and codebase inspection.*

- **[ADR-001 context]** API path mismatches between frontend and backend caused 404 errors in past stories (WISH-2004). The monitor UI must strictly follow ADR-001 path schema from day one.
  - *Applies because*: New monitor endpoints will have frontend RTK Query callers; mismatch will block E2E and UAT.

- **[ADR-006 context]** Config drift between unit test mocks and real services went undetected until UAT, costing rework time.
  - *Applies because*: Dashboard data fetching involves new endpoints; E2E tests with live backend must be written in the dev phase.

### Blockers to Avoid (from past stories)

- Frontend/backend API path mismatch — enforce ADR-001 path schema from the first endpoint
- SSE connection dropping silently on the frontend without reconnect logic — implement automatic reconnect with exponential backoff
- Scope expansion of dashboard UI into write operations — this story is strictly read-only; any operator actions belong in APIP-5005 or a future story
- Over-fetching on large `wint.work_queue` / `wint.stories` tables — use `LIMIT` and pagination by default, add indexes if needed (check existing indexes before adding)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Frontend: `/api/v2/monitor`, Backend Hono: `/monitor`; proxy rewrite required in local dev |
| ADR-002 | Infrastructure-as-Code Strategy | Any new Lambda or hosted server must use standalone CloudFormation templates; avoid IaC framework lock-in |
| ADR-005 | Testing Strategy | UAT must use real services (real DB, real backend); no MSW mocking in UAT |
| ADR-006 | E2E Tests Required in Dev Phase | At minimum one happy-path Playwright test per UI-facing AC, run with live backend (`VITE_ENABLE_MSW=false`) |

### Patterns to Follow

- Hono route domain structure: `routes.ts` → `application/services.ts` → `adapters/repositories.ts` (thin routes, service delegation)
- Zod schemas for all request/response shapes — no TypeScript interfaces
- Discriminated union result types (`ok`/`err` from `@repo/api-core`) for service layer returns
- `@repo/logger` for all log calls
- `@repo/ui` for all UI primitives
- `@repo/app-component-library` Card/Stats primitives for dashboard widgets
- Loading skeleton pattern (animate-pulse) for async data in dashboard components

### Patterns to Avoid

- Do NOT modify `wint.*` schema tables — read-only queries only for this story
- Do NOT add barrel files (`index.ts` re-exports)
- Do NOT use `console.log` — always `@repo/logger`
- Do NOT use TypeScript interfaces — use Zod schemas with `z.infer<>`
- Do NOT use MSW in UAT tests
- Do NOT make the dashboard a write surface (no operator actions, retries, or unblocking from UI in v1)

---

## Conflict Analysis

### Conflict: Scope overlap with APIP-5005

- **Severity**: warning
- **Description**: APIP-5005 (Minimal Operator Visibility CLI) also reads queue depth and supervisor state. If both stories independently implement DB read queries, there is risk of duplicated logic and divergent data representations.
- **Resolution Hint**: Define a shared read service or query layer (e.g., `packages/backend/orchestrator/src/services/pipeline-read-service.ts`) that both CLI and dashboard consume. APIP-5005 is Phase 1; APIP-2020 is Phase 2 — coordinate at hand-off to ensure the CLI's read queries are reusable.

### Conflict: Dependency on APIP-2010 (blocked state data)

- **Severity**: warning
- **Description**: APIP-2020 depends on APIP-2010 completing the `blocked` state transitions and DB visibility. If APIP-2010 is incomplete, the "Blocked Queue" panel of the dashboard will show no meaningful data in dev/UAT.
- **Resolution Hint**: Design the blocked queue UI panel to degrade gracefully when no blocked stories exist (empty state). The dashboard can be developed and tested with mock-blocked stories in the dev database before APIP-2010 ships, but UAT requires APIP-2010 to be merged first.

---

## Story Seed

### Title

Monitor UI v1 — Read-Only Pipeline Dashboard

### Description

**Context**: The autonomous pipeline (APIP) processes stories through a multi-phase workflow stored in `wint.stories`, with token consumption tracked in `wint.token_usage` and blocked stories managed by APIP-2010. Currently, operators must query the database directly or use the CLI (APIP-5005) to observe pipeline state.

**Problem**: Operators need real-time visibility into three areas without direct DB access: (1) the current state of the work queue (what is queued, running, blocked), (2) per-story token/cost totals to detect runaway spend (RISK-009), and (3) which stories are blocked and why. Without a visual interface, routine monitoring requires technical access and is error-prone.

**Proposed Solution**: Build a read-only web dashboard page hosted in the existing `apps/web/app-dashboard` application (or as a lightweight new app). The dashboard will poll or stream three data panels: a Pipeline View (queue table), a Cost Panel (per-story token cost), and a Blocked Queue Panel (blocked stories with block reason). A REST endpoint provides snapshot data; an optional SSE stream provides live updates. No write operations are exposed.

### Initial Acceptance Criteria

- [ ] AC-1: Pipeline View panel — displays all active stories with their current `wint.stories.state`, story ID, title, and last-updated timestamp; sorted by state priority (in-progress first, then ready-to-work, then backlog).
- [ ] AC-2: Cost Panel — displays per-story token cost aggregated from `wint.token_usage` (sum of `total_tokens` grouped by `story_id`, broken down by `phase`); shows model name where available.
- [ ] AC-3: Blocked Queue Panel — displays all stories with `state = 'blocked'` including their `blocked_by` value and `updated_at` timestamp.
- [ ] AC-4: REST snapshot endpoint `GET /monitor/pipeline` returns the full dashboard payload (pipeline view + cost summary + blocked queue) as a single JSON response; protected by operator auth or internal-only access.
- [ ] AC-5: Dashboard auto-refreshes on a configurable interval (default: 30 seconds) without full page reload; stale data is visually indicated.
- [ ] AC-6: SSE endpoint `GET /monitor/pipeline/stream` emits `pipeline-update` events when story state changes; frontend subscribes and updates panels without polling when SSE is active.
- [ ] AC-7: All three panels show a loading skeleton during initial fetch and display a non-blocking error state (with retry button) if the endpoint is unreachable.
- [ ] AC-8: Dashboard is accessible (ARIA labels on all panels, keyboard navigation, focus management on data refresh).
- [ ] AC-9: Read queries on `wint.stories` and `wint.token_usage` complete in under 500ms for up to 500 stories (validated in dev with query timing).
- [ ] AC-10: At least one happy-path Playwright E2E test covers the pipeline view rendering with live backend (no MSW).

### Non-Goals

- No write operations from the dashboard (no retry buttons, no unblock actions, no state transitions) — operators use CLI (APIP-5005) or direct DB for interventions in v1
- No authentication UI — auth is assumed to be handled at infrastructure/proxy layer or via existing Cognito session; do not build a new auth flow
- No mobile-optimized layout — operator tooling is desktop-first; responsive polish is deferred
- No historical trend charts — per-story cost display is current state only; time-series analytics belong in Phase 3 (APIP-3010)
- Do NOT modify `wint.*` schema tables or add new columns
- Do NOT implement the APIP-5005 CLI scope (queue inspection commands) — this story is UI only

### Reuse Plan

- **Components**: `ActivityFeed` (timeline pattern for pipeline events), `StatsCards` (summary tiles for queue depth / total cost), `BuildStatusChart` (pipeline state distribution), `Card`/`CardContent`/`CardHeader` primitives from `@repo/app-component-library`
- **Patterns**: Hono domain route structure (health domain as reference), Drizzle read queries with discriminated union results, Zod-first request/response schemas, loading skeleton pattern from existing dashboard components
- **Packages**: `@repo/app-component-library` for UI primitives, `@repo/logger` for logging, `@repo/api-core` for `ok`/`err` result types, existing `StoryRepository` read methods from `packages/backend/orchestrator/src/db/story-repository.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Unit tests needed for: query aggregation logic (token cost rollup by story), SSE event emission (mock DB change triggers correct event), error boundary behavior when endpoint is unreachable
- Integration test needed for: `GET /monitor/pipeline` returns correctly shaped JSON from real `wint.*` tables
- E2E test (ADR-006) needed for: pipeline view renders stories from real backend; blocked queue panel shows stories in `blocked` state; cost panel shows non-zero totals after story activity
- UAT (ADR-005): requires real database with real pipeline activity; do not mock the backend in UAT
- Consider: seeding test data for `wint.token_usage` and `wint.stories` with controlled states in the dev DB before E2E runs

### For UI/UX Advisor

- Dashboard is operator-facing internal tooling — functional density is preferred over polish; data density is acceptable
- Three distinct panels should be visually separated (cards with clear headings) but fit on a single viewport without scrolling on 1920px width
- Color coding for story states: `in-progress` (blue), `blocked` (red/amber), `ready-to-work` (green), `backlog` (muted gray)
- SSE live update indicator (e.g., green dot / "Live" badge) should be clearly visible; offline/polling fallback should show "Refreshing every 30s" indicator
- Blocked Queue panel should visually prioritize attention (warning color, top of page or prominent placement)
- Loading states must use consistent skeleton pattern from existing `app-dashboard` components

### For Dev Feasibility

- **API server**: The pipeline monitor endpoints belong in a new Hono domain `monitor` inside the existing `apps/api/lego-api` server or a new dedicated lightweight server — evaluate whether `lego-api` is the right host for internal operator tooling vs. a separate process
- **SSE stability**: Hono supports streaming responses; SSE in a Lambda-hosted Hono app may have connection duration limits (API Gateway has a 29-second timeout). If deployed to Lambda, consider polling-only with configurable interval and defer SSE to a non-Lambda process (e.g., the LangGraph server from APIP-0030 or a dedicated monitor process)
- **Read query performance**: `wint.token_usage` aggregation (`SUM(total_tokens) GROUP BY story_id`) needs a covering index on `(story_id, total_tokens)` — verify existing indexes in `unified-wint.ts` before creating new ones
- **Shared read service**: Coordinate with APIP-5005 implementer to extract a `PipelineReadService` that both CLI and dashboard consume — avoids duplicate SQL and ensures consistent data shapes
- **Canonical references for subtask decomposition**:
  - Backend route: `apps/api/lego-api/domains/health/routes.ts`
  - Backend repository (Drizzle read queries): `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`
  - Frontend page: `apps/web/app-dashboard/src/pages/main-page.tsx`
  - Frontend feed component: `apps/web/app-dashboard/src/components/ActivityFeed/index.tsx`
