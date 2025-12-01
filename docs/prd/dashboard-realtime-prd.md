## LEGO MOC Instructions – Real‑Time Dashboard PRD (REST + WebSockets)

### 1. Document Info
- **Project:** LEGO MOC Instructions App
- **Feature:** Real‑Time Dashboard (REST Snapshot + Socket)
- **Type:** Feature PRD
- **Version:** 0.1 (Draft)
- **Author:** Michael + Architect (Augment Agent)
- **Source:** Existing `docs/prd.md` (Dashboard epic)

### 2. Introduction & Context
The Dashboard app (`dashboard-app`) is the post‑login landing page. It currently focuses on collection summary, theme breakdown, recent MOCs, and quick actions.

To provide a more engaging experience and reduce manual refreshes, we introduce:
- A REST **Dashboard Snapshot** endpoint returning all dashboard data.
- **socket.io WebSockets** for near real‑time updates of key metrics.

### 3. Problem & Solution Summary
**Problem:** Users see stale dashboard data unless they refresh manually. This is especially noticeable for collection size, theme distribution, and MOCs that are partially sourced (parts ordered).

**Solution:**
- Single REST endpoint returning a `DashboardView` snapshot.
- socket.io namespace `/dashboard` pushing updates for summary, recent MOCs, and partial‑parts table.
- Robust reconnection and fallback to periodic REST polling when WebSockets are unavailable.

### 4. Goals & Non‑Goals
**Goals**
1. Provide a single Dashboard REST endpoint.
2. Deliver near real‑time updates for key dashboard elements.
3. Surface build progress and parts acquisition state clearly.
4. Implement robust client reconnect and degraded‑mode fallback.
5. Keep backend changes minimal and well‑scoped.

**Non‑Goals**
- Customizable dashboards.
- Historical analytics or complex time‑series.
- Introducing GraphQL for this feature.
- Exactly‑once messaging guarantees.

### 5. Users & Use Cases
**Primary user:** Authenticated AFOL managing a personal collection.

**Key use cases:**
- View collection status at a glance (counts, themes, coverage).
- Resume work on recent and "in‑flight" MOCs.
- Receive updates without refreshing.
- Fall back gracefully when real‑time is unavailable.

### 6. Functional Requirements – Dashboard Content
Prefix: `D-FR-*`.

#### 6.1 Collection Summary Card
**D‑FR‑1:** Show `totalMocs` and `totalWishlistItems`.

**D‑FR‑2:** Show MOCs by build status: `ADDED`, `IN_PROGRESS`, `BUILT`.

**D‑FR‑3:** Show MOCs by parts coverage status: `FULL_INVENTORY`, `PARTIAL_ORDERED`, `NONE`.

**D‑FR‑4:** Initial values come from Dashboard REST snapshot.

**D‑FR‑5:** On changes to MOCs, wishlist, or coverage, backend emits WebSocket events to update this card.

#### 6.2 Theme Breakdown Card
**D‑FR‑6:** Show, per theme, `mocCount` and `setCount`.

**D‑FR‑7:** Data included in Dashboard REST snapshot.

**D‑FR‑8 (optional V1):** Backend may emit WebSocket events to refresh Theme Breakdown; otherwise snapshot‑only.

#### 6.3 Recently Added MOCs Card
**D‑FR‑9:** Show last N (5–10) MOCs ordered by `created_at DESC`, with title, theme, build status, cover image, and date added.

**D‑FR‑10:** Data included in Dashboard REST snapshot.

**D‑FR‑11:** On new MOC creation, backend emits a WebSocket event so client prepends it and trims list to N.

#### 6.4 Quick Actions Card
**D‑FR‑12:** Show buttons for "Add New MOC", "Browse Gallery", and "View Wishlist".

**D‑FR‑13:** Quick Actions are static; no backend data required.

#### 6.5 "MOCs with Partial Parts Ordered" Table
**D‑FR‑14:** Show all MOCs where `parts_coverage_status = PARTIAL_ORDERED`.

**D‑FR‑15:** Row fields: title, theme, build status, coverage percentage (0–100), last updated timestamp, and link to MOC/parts view.

**D‑FR‑16:** Initial table contents come from Dashboard REST snapshot.

**D‑FR‑17:** When a MOC enters/leaves `PARTIAL_ORDERED`, backend emits WebSocket events to add/update/remove rows.

### 7. Data Model Requirements (Backend / Postgres)
Prefix: `D-DM-*`.

**D‑DM‑1:** MOCs model includes `build_status` enum: `ADDED`, `IN_PROGRESS`, `BUILT`.

**D‑DM‑2:** For each MOC, backend derives or stores:
- `parts_coverage_status`: `FULL_INVENTORY`, `PARTIAL_ORDERED`, or `NONE`.
- `covered_parts_count`, `total_parts_count`.
- `coverage_percentage` (0–100).

**D‑DM‑3:** Coverage may be computed via queries or materialized/denormalized views.

**D‑DM‑4:** Sets include a `theme` field for Theme Breakdown.

### 8. REST API Requirements
Prefix: `D-API-*`.

#### 8.1 Dashboard Snapshot Endpoint
**D‑API‑1:** Provide `GET /api/dashboard` (or `/api/users/{userId}/dashboard`) protected by existing auth.

**D‑API‑2:** On success, return `DashboardView`:
```ts
type DashboardView = {
  summary: DashboardSummary
  themeBreakdown: ThemeStats[]
  recentMocs: RecentMoc[]
  partialPartsMocs: PartialPartsMoc[]
}
```

**D‑API‑3:** `DashboardSummary`:
```ts
type DashboardSummary = {
  totalMocs: number
  totalWishlistItems: number
  mocsByBuildStatus: Record<'ADDED' | 'IN_PROGRESS' | 'BUILT', number>
  mocsByCoverageStatus: Record<'FULL_INVENTORY' | 'PARTIAL_ORDERED' | 'NONE', number>
}
```

**D‑API‑4:** `ThemeStats`:
```ts
type ThemeStats = { theme: string; mocCount: number; setCount: number }
```

**D‑API‑5:** `RecentMoc`:
```ts
type RecentMoc = {
  id: string
  title: string
  theme: string
  buildStatus: 'ADDED' | 'IN_PROGRESS' | 'BUILT'
  coverImageUrl: string | null
  createdAt: string // ISO
}
```

**D‑API‑6:** `PartialPartsMoc`:
```ts
type PartialPartsMoc = {
  id: string
  title: string
  theme: string
  buildStatus: 'ADDED' | 'IN_PROGRESS' | 'BUILT'
  coveragePercentage: number
  lastUpdatedAt: string // ISO
}
```

**D‑API‑7:** Errors: `401` unauthenticated, `403` forbidden, `500` internal error with standard body.

### 9. WebSocket / socket.io Requirements
Prefix: `D-WS-*`.

**D‑WS‑1:** Use socket.io namespace `/dashboard`.

**D‑WS‑2:** Authenticate during handshake using existing auth (JWT/cookie).

**D‑WS‑3:** On success, join room `user:<userId>`.

**D‑WS‑4:** On auth failure, emit `connect_error` with code `AUTH_FAILED` and close connection.

**D‑WS‑5:** All events use envelope:
```ts
type DashboardEvent<T = unknown> = {
  eventId: string
  type: string
  timestamp: string
  payload: T
}
```

**D‑WS‑6:** Supported event types (V1):
- `dashboard:summaryUpdated` – payload: `DashboardSummary`.
- `dashboard:recentMocAdded` – payload: `RecentMoc`.
- `dashboard:partialPartsUpdated` – payload: `PartialPartsMoc[]` (full list for V1).
- `dashboard:themeBreakdownUpdated` (optional) – payload: `ThemeStats[]`.
- `dashboard:error` – payload: `{ code: string; message: string }`.

**D‑WS‑7:** Server only emits dashboard events to `user:<userId>` room.

**D‑WS‑8:** Client ignores unknown `type` values but logs them.

### 10. Client Resilience & Fallback
Prefix: `D-RES-*`.

**D‑RES‑1:** Configure socket.io auto‑reconnect with exponential backoff (e.g. start 1s, max 30s, jitter).

**D‑RES‑2:** On `AUTH_FAILED`, do not retry automatically; prompt user to re‑auth/refresh.

**D‑RES‑3:** On transient disconnect, allow retries; on reconnect, re‑fetch `GET /api/dashboard` then resume events.

**D‑RES‑4:** After N consecutive failed reconnects (e.g. 5–10), enter degraded mode: show banner and poll `GET /api/dashboard` every 30–60s while continuing slow reconnect attempts. On successful reconnect, stop polling and clear banner.

**D‑RES‑5:** Handle malformed events by logging and skipping them without tearing down the connection.

### 11. Non‑Functional & Observability
Prefix: `D-NFR-*`.

**D‑NFR‑1:** p95 latency for `GET /api/dashboard` under target threshold (e.g. 600 ms).

**D‑NFR‑2:** p95 real‑time latency from backend change to client event ≤ 2 s under normal load.

**D‑NFR‑3:** All traffic over HTTPS/WSS; enforce authorization per user.

**D‑NFR‑4:** Capture metrics for active connections, connect/disconnect reasons, and event/error rates; log structured connection lifecycle and validation errors.

