# DASH — Agent Workflow Dashboard

> Real-time monitoring dashboard for the autonomous agent workflow system.
> Built on Socket.io + React 19, powered by LangGraph run events.
> Designed to run after the LangGraph migration (WINT-9110) is complete.

---

## Vision

A live command center you can watch as agents work — showing what's in the queue,
which agents are active, where tokens are burning, and how the knowledge base is
growing. Built into the existing `apps/web/app-dashboard` app, no new infrastructure
required beyond a Socket.io server.

---

## Relationship to Existing Telemetry Epic (TELE)

The `TELE` epic targets Prometheus + Grafana for historical metrics and alerting
(a pull-based, ops-oriented system). This dashboard is complementary — it is
push-based, developer-oriented, and optimized for watching a live session rather
than querying historical data. They share the same underlying data sources but
serve different audiences and use cases.

| Concern | TELE (Prometheus/Grafana) | DASH (Socket.io) |
|---------|--------------------------|------------------|
| Audience | Ops / async review | Developer watching live |
| Latency | ~15s scrape interval | Sub-second |
| History depth | Weeks/months | Current session + 24h |
| Interaction | Query/filter | Observe/click-through |
| Infrastructure | Docker Compose stack | Thin Socket.io server |

---

## Architecture

> **Design assumption:** This dashboard is built to run after the LangGraph migration
> (WINT-9110+) is complete. LangGraph graphs replace Claude Code CLI workflow commands
> as the orchestration layer. The existing `stories` table and KB DB remain as the
> source of truth for story metadata and analytics — they are populated by the LangGraph
> adapters (stage-movement-adapter, story-file-adapter, etc.).

```
┌──────────────────────────────────────────────────────┐
│  LangGraph Graphs (WINT-9110+)                        │
│  ├ on_node_start / on_node_end callbacks              │
│  ├ astream_events() for token streaming               │
│  └ Custom checkpoint callbacks (LNGG-0060)            │
└────────────────────┬─────────────────────────────────┘
                     │ event callbacks / stream
┌────────────────────▼─────────────────────────────────┐
│  apps/api/dashboard-server (Node.js + Socket.io)      │
│  ├ Receives LangGraph run events via callback bridge  │
│  ├ Polls KB DB for snapshot data (stories, tokens)    │
│  ├ Translates LangGraph events → DashEvent envelope   │
│  ├ Fans out to connected browser clients              │
│  ├ Serves HTTP snapshot endpoints for initial load    │
│  └ Buffers last 500 events for reconnect replay       │
└────────────────────┬─────────────────────────────────┘
                     │ WebSocket (socket.io-client)
┌────────────────────▼─────────────────────────────────┐
│  apps/web/app-dashboard (React 19)    [READ-ONLY]     │
│  ├ Work Queue panel (Panel A)                         │
│  ├ Live Activity Feed (Panel B)                       │
│  ├ Token Burn Rate charts (Panel C)                   │
│  ├ Analytics KPI row (Panel D)                        │
│  ├ Story Board mini-kanban (Panel E)                  │
│  ├ Active Stories cards (Panel F)                     │
│  ├ KB Health panel (Panel G)                          │
│  └ Story Detail Modal (read-only content browsing)    │
└──────────────────────────────────────────────────────┘
```

### LangGraph as primary event source

LangGraph's `astream_events()` API emits structured events at each node boundary:
- `on_chain_start` / `on_chain_end` — graph-level entry/exit (maps to `story:phase_change`)
- `on_tool_start` / `on_tool_end` — tool calls (maps to `artifact:written`, `kb:entry_added`)
- `on_llm_start` / `on_llm_end` — LLM invocations (maps to `tokens:logged`)
- `on_checkpoint` — state persistence (maps to `agent:checkpoint`)

The dashboard server bridges these into the `DashEvent` envelope format. The existing
`stories` DB table is still polled for the initial snapshot (story states, token totals)
since LangGraph's stage-movement-adapter and story-file-adapter write there.

### Read-only design

The dashboard has **no mutation endpoints**. All data flows one direction:
LangGraph → dashboard-server → Socket.io → browser. The browser never writes anything.

---

## Event Schema

All Socket.io events share a common envelope:

```typescript
// Zod schema (source of truth — defined in dashboard-server)
const DashEventSchema = z.object({
  id: z.string().uuid(),              // deduplication on reconnect
  type: z.enum([...EventTypes]),
  timestamp: z.string().datetime(),   // ISO 8601
  feature: z.string().optional(),     // e.g. 'KNOW', 'WISH'
  story_id: z.string().optional(),    // e.g. 'KNOW-018'
  graph_run_id: z.string().optional(),// LangGraph run ID
  payload: z.record(z.unknown()),
})
type DashEvent = z.infer<typeof DashEventSchema>
```

### Event Types — LangGraph source mapping

| DashEvent type | LangGraph source event | Payload |
|----------------|----------------------|---------|
| `story:state_change` | `on_chain_end` (stage-movement-adapter node) | `{ from, to, title, feature }` |
| `story:created` | `on_chain_end` (story-create node) | `{ title, feature, type, priority }` |
| `story:blocked` | `on_chain_end` (block-story node) | `{ blocked_by, reason }` |
| `story:unblocked` | `on_chain_end` (unblock-story node) | `{}` |
| `tokens:logged` | `on_llm_end` (any node) | `{ node_name, phase, input_tokens, output_tokens, total, running_total }` |
| `artifact:written` | `on_tool_end` (write-artifact tool) | `{ artifact_type, phase, iteration }` |
| `qa:verdict` | `on_chain_end` (qa-verify graph) | `{ verdict, issues_count, qa_run_id }` |
| `kb:entry_added` | `on_tool_end` (kb_add_lesson / kb_write tool) | `{ entry_type, tags, role }` |
| `kb:entry_archived` | `on_tool_end` (kb_compress tool) | `{ canonical_id }` |
| `task:created` | `on_tool_end` (task_create tool) | `{ task_type, priority, source_story_id }` |
| `task:promoted` | `on_tool_end` (task_promote tool) | `{ promoted_to_story }` |
| `agent:node_start` | `on_chain_start` (any node) | `{ node_name, graph_name, story_id }` |
| `agent:node_end` | `on_chain_end` (any node) | `{ node_name, outcome, tokens_used }` |
| `agent:checkpoint` | `on_checkpoint` (LNGG-0060) | `{ graph_name, step, state_keys }` |
| `agent:error` | `on_chain_error` (any node) | `{ node_name, error_type, message }` |

### Initial snapshot endpoints (HTTP, polled on connect)

| Endpoint | Source | Purpose |
|----------|--------|---------|
| `GET /snapshot/stories` | KB DB `stories` table | Work queue counts, story board state |
| `GET /snapshot/tokens` | KB DB `story_token_usage` | Token totals by story and phase |
| `GET /snapshot/kb-health` | KB DB `knowledge_entries` | Entry counts by type |
| `GET /snapshot/kpis` | KB DB aggregation query | Cycle time, QA pass rate, throughput |
| `GET /story/:id/content` | Filesystem (story.yaml) | Story detail drawer content |

---

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ STATUS BAR                                                                │
│ DB: ● Connected  |  Embedding API: ●  |  Agents Active: 3  |  Tokens Today: 142,304  |  Last Event: 2s ago │
├────────────────┬─────────────────────────────────┬───────────────────────┤
│                │                                 │                       │
│  WORK QUEUE    │     LIVE ACTIVITY FEED          │   TOKEN BURN RATE     │
│  (Panel A)     │     (Panel B)                   │   (Panel C)           │
│                │                                 │                       │
├────────────────┴─────────────────────────────────┴───────────────────────┤
│  ANALYTICS KPI ROW  (Panel D)                                            │
├────────────────┬─────────────────────────────────┬───────────────────────┤
│                │                                 │                       │
│  STORY BOARD   │     ACTIVE STORIES              │   KB HEALTH           │
│  (Panel E)     │     (Panel F)                   │   (Panel G)           │
│                │                                 │                       │
└────────────────┴─────────────────────────────────┴───────────────────────┘
```

---

## Panel Specifications

---

### Panel A — Work Queue

**Purpose:** Instant answer to "what's in the pipeline right now?"

**Data source:** `stories` table (snapshot on load, live updates via `story:state_change`)

**Layout:**

```
WORK QUEUE                              [Filter: All ▾]

  backlog          ████████████  12     BLOCKED (2)
  in_progress      ███           3      KNOW-021 ← KNOW-016
  in_review        ██            2      WISH-2124 ← WISH-2047
  in_qa            █             1
  uat              █             1
  ──────────────────────────────
  done this week                 8
  done this month               34
```

**Interactions:**
- Click feature filter to scope to one prefix (KNOW, WISH, WKFL, etc.)
- Click a blocked story chip to see the blocking chain
- Blocked stories show a warning color and the blocking story ID

**Real-time behavior:**
- Count badges increment/decrement live as `story:state_change` events arrive
- Blocked rows animate in/out as stories are blocked/unblocked

---

### Panel B — Live Activity Feed

**Purpose:** Heartbeat of the system. What just happened?

**Data source:** Multiplexed from all event types

**Layout:**

```
LIVE ACTIVITY FEED                        [Pause] [Filter ▾]

  14:32:01  🔄  KNOW-018   backlog → in_progress
  14:31:48  📝  kb_add_lesson · WISH-2045 · "reuse auth middleware"
  14:31:12  📦  CHECKPOINT written · KNOW-016 · setup
  14:30:55  🔄  KNOW-017   in_review → in_qa
  14:28:33  ✅  QA PASS · KNOW-016 · 0 blocking issues
  14:25:10  🪙  KNOW-018 · dev-implementation · 4,200 tokens
  14:22:44  📝  kb_add_retro · "Integration stories +30% token overrun"
  14:20:01  🔄  WISH-2045  in_qa → uat
```

**Event categories and colors:**

| Category | Color | Events |
|----------|-------|--------|
| State change | Blue | `story:state_change` |
| KB write | Green | `kb:entry_added` |
| Artifact | Purple | `artifact:written` |
| QA pass | Green | `qa:verdict pass` |
| QA fail | Red | `qa:verdict fail` |
| Token milestone | Amber | `tokens:logged` (thresholds) |
| Blocked | Orange | `story:blocked` |
| Task | Grey | `task:created`, `task:promoted` |

**Interactions:**
- Click any row to open a detail drawer for that story/entry
- Pause button freezes scroll while you read (events still buffer)
- Filter by category or feature prefix
- Auto-scroll to bottom (newest), stops on manual scroll

---

### Panel C — Token Burn Rate

**Purpose:** Are we spending tokens wisely? Where is the money going?

**Data source:** `story_token_usage` (snapshot + `tokens:logged` events)

**Layout:**

```
TOKEN BURN RATE                    Today: 142,304  (~$0.43)

  [Sparkline: tokens/minute over last 60 min — live updating]

  By phase (last 24h):
  dev-implementation   ████████████████  68,200  48%
  code-review          ████████          32,100  23%
  qa-verification      ██████            24,400  17%
  pm-generate          ████              12,800   9%
  other                █                 4,804   3%

  Hot stories (most tokens today):
  KNOW-018   ████  18,200  (est 24,000)
  KNOW-016   ███   12,400  (est 10,000)  ⚠ over budget
  WISH-2045  ██     8,100  (est 16,000)
```

**Real-time behavior:**
- Sparkline appends a new data point on each `tokens:logged` event
- Phase bars update live
- "Over budget" warning fires when `running_total > estimated_tokens * 1.2`
- Story row highlights amber → red as overage grows

**Details on click:**
- Click any story to see per-phase token breakdown over time
- Click any phase bar to see which stories contributed

---

### Panel D — Analytics KPI Row

**Purpose:** At-a-glance health of the whole workflow over time.

**Data source:** Aggregation queries on `story_state_transitions`, `verifications`, `story_token_usage`, `knowledge_entries`

```
┌──────────────┬───────────────────┬──────────────────┬───────────────────┐
│ CYCLE TIME   │ REVIEW ITERATIONS │ QA PASS RATE     │ KB GROWTH         │
│              │                   │                  │                   │
│ p50   2.3d   │ p50   1.4         │ 78%  last 30     │ +12 entries today │
│ p90   4.1d   │ p90   3.2         │                  │ +3 lessons        │
│              │                   │ trend: ▲ +5%     │ +1 retro pattern  │
│ trend: ▼ -4h │ trend: ▼ -0.2     │ last 7 days      │                   │
└──────────────┴───────────────────┴──────────────────┴───────────────────┘
┌──────────────┬───────────────────┬──────────────────┬───────────────────┐
│ THROUGHPUT   │ TOKEN EFFICIENCY  │ BOTTLENECK       │ RETRO RATE        │
│              │                   │                  │                   │
│ 3 done today │ 4,820 tok/point   │ in_review        │ 1 pattern per     │
│ 14 this week │                   │ avg 1.2d stuck   │ 4.2 stories       │
│              │ trend: ▼ -320     │                  │                   │
│ [sparkline]  │ last 7 days       │ 2 stories > 2d   │                   │
└──────────────┴───────────────────┴──────────────────┴───────────────────┘
```

**Update frequency:** Refreshes every 60 seconds (not socket-driven — aggregate queries are heavy)

---

### Panel E — Story Board

**Purpose:** Visual density map of all stories across states. Orientation at a glance.

**Data source:** `stories` table

```
STORY BOARD   [KNOW] [WISH] [WKFL] [ALL]

backlog        in_progress    in_review      in_qa     uat      done
──────────     ───────────    ─────────      ──────    ─────    ──────
K-016 ●        K-018 ●        K-017 ●        K-016 ●   W-047●   W-045 ●
K-017 ●        W-2045 ●       W-2068 ●                          W-2046 ●
K-019 ●        W-2047 ●                                          ...+31
K-020 ●
...+8
```

**Each chip:**
- Color = feature prefix (consistent palette)
- Tooltip = story title + current phase
- Blocked chips show an orange border
- Chips animate (Framer Motion) when sliding between columns on state change

**Real-time behavior:**
- On `story:state_change`: chip slides from old column to new column
- On `story:created`: new chip fades into backlog
- On `story:blocked`: chip border turns orange

---

### Panel F — Active Stories

**Purpose:** What stories are being worked right now? How are they progressing?

> Replaces the original "Active Agents" panel. Story-level visibility is more
> useful than agent-level because LangGraph agents are ephemeral — a story is the
> persistent unit of work you care about watching.

**Data source:** `stories` table filtered to `state IN ('in_progress', 'in_review', 'in_qa', 'uat')`,
enriched by `story_token_usage` + live `story:state_change` / `tokens:logged` events

```
ACTIVE STORIES                                    [4 active]

┌────────────────────────────────────────────────────────┐
│ KNOW-018 · "Embedding Cache Warm-Up Strategy"          │
│ ● in_progress  │  elapsed in phase: 47m                │
│ Tokens: 6,200 / est 8,000  ██████████░░  78%           │
│ Last event: 2m ago — kb:entry_added (lesson)           │
│ [open ↗]                                               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ KNOW-016 · "LRU Cache for Embedding Results"           │
│ ● in_qa  │  elapsed in phase: 12m                      │
│ Tokens: 3,100 / est 4,000  ███████████░  78%           │
│ Last event: 4m ago — artifact:written (EVIDENCE.yaml)  │
│ [open ↗]                                               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ WISH-2045 · "Wishlist CSV Export"                      │
│ ● in_review  │  elapsed in phase: 1h 32m  ⚠ long       │
│ Tokens: 9,800 / est 6,000  ████████████  163%  🔴      │
│ Last event: 31m ago — story:state_change               │
│ [open ↗]                                               │
└────────────────────────────────────────────────────────┘
```

**Each story card shows:**
- Story ID + title (truncated to 1 line)
- State badge with color (in_progress=blue, in_review=violet, in_qa=amber, uat=cyan)
- Elapsed time in current phase — turns amber if > 1.5× baseline, red if > 2×
- Token progress bar: used / estimated, percentage, color-coded (green < 80%, amber 80-100%, red > 100%)
- Last event description + time ago
- "open ↗" button → triggers Story Detail Modal

**Sorted by:** most recent activity first (last event timestamp)

**Real-time behavior:**
- `tokens:logged` → token bar updates in-place
- `story:state_change` → card state badge updates, elapsed timer resets
- `story:blocked` → card gets orange border + "blocked" badge
- Stories that exit active states (→ `completed`, `backlog`) animate out of the list
- New stories entering active states animate in

---

### Story Detail Modal

**Purpose:** Read the full story context — live — while watching it progress. Triggered
by clicking the "open ↗" button on any story card (Active Stories, Story Board chips,
Work Queue rows, Activity Feed events).

**Interaction:** Full-screen modal overlay with a dark glassmorphism backdrop. Dismisses
via Escape key, backdrop click, or close button. Does not close automatically.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [✕]  KNOW-018 · Embedding Cache Warm-Up Strategy                       │
│       ● in_progress  │  feature: know  │  type: feature  │  3 pts       │
│       Last updated: 4 minutes ago                                       │
├──────────────────────────────────────────────────────────────────────── │
│  [Overview] [Acceptance Criteria] [Artifacts] [Dependencies] [Timeline] │
│  [KB Entries]                                                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OVERVIEW TAB                                                           │
│  ─────────────────────────────────────────────────────────────────     │
│  Goal                                                                   │
│  Add an LRU cache layer in front of the OpenAI Embeddings API to        │
│  reduce redundant calls and improve semantic search latency.            │
│                                                                         │
│  Non-goals                                                              │
│  • Persistent cache across restarts (in-memory only for v1)            │
│  • Cache invalidation by content update                                │
│                                                                         │
│  Token Usage                                                            │
│  setup        █████░░░░░   450 / est 800                               │
│  implement    ████████░░  4,200 / est 6,000                            │
│  review       ░░░░░░░░░░     0 / est 1,500                             │
│  total:  4,650 / est 8,300  (56%)                                      │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

**Tabs:**

| Tab | Content |
|-----|---------|
| **Overview** | `goal`, `non_goals`, token usage per phase (bar chart), story metadata |
| **Acceptance Criteria** | Full list of ACs with `id`, `text`, `type` badge; QA verdict per AC if available |
| **Artifacts** | List of artifacts (PLAN.yaml, EVIDENCE.yaml, CHECKPOINT.yaml, etc.) with last-modified time; click any → renders YAML content inline in a code block |
| **Dependencies** | `depends_on` and `blocked_by` as clickable story chips (clicking opens that story's modal); `blocks` list (stories waiting on this one) |
| **Timeline** | State transition history from `story_state_transitions` table — timestamped list of all phase changes |
| **KB Entries** | Knowledge entries tagged with this `story_id`: lessons, decisions, constraints, runbooks. Shows `entry_type` badge, title, created_at |

**Data sources:**
- Metadata, ACs, non-goals, goal: `GET /story/:id/content` → reads `story.yaml` from filesystem
- Token usage: `GET /snapshot/tokens?story_id=KNOW-018` → queries `story_token_usage` table
- Artifacts: `GET /story/:id/artifacts` → lists files in story directory
- Artifact content: `GET /story/:id/artifact/:filename` → reads artifact YAML
- Dependencies: from `story.yaml` `depends_on` / `blocked_by` fields
- Timeline: `GET /story/:id/transitions` → queries `story_state_transitions` table
- KB entries: `GET /story/:id/kb-entries` → queries `knowledge_entries WHERE story_id = :id`

**Live updates while modal is open:**
- `tokens:logged` for this story → token bars update in-place
- `artifact:written` for this story → new row appears in Artifacts tab with animation
- `story:state_change` for this story → state badge and timeline update live
- `kb:entry_added` for this story → new row appears in KB Entries tab

---

### Panel G — KB Health

**Purpose:** Is the knowledge base growing healthily? Is the infrastructure running?

**Data source:** `kb_stats` + `kb_health` MCP tools (polled every 30s) + `kb:entry_added` events

```
KB HEALTH

  Entries by type:                  Infrastructure:
  ──────────────────                ───────────────────
  note          2,841               DB:            ● healthy
  lesson          312               Embedding API: ● healthy
  decision         87               Cache hit rate:  73%  (KNOW-016)
  constraint       64               Last write:     14s ago
  runbook          41               Pending deferred: 0
  retro            24  (KNOW-020)
  ──────────────                    Duplicates (archived):
  total         3,369               142 / 3,369  (4.2%)
                                    Last compression: 3 days ago

  Today's writes: +12 entries
  ├ +3 lessons  (KNOW-018, KNOW-016 ×2)
  ├ +1 retro    (integration token pattern)
  └ +8 other
```

**Real-time behavior:**
- Entry counts tick up on each `kb:entry_added` event
- Infrastructure status dots change color on `kb:health_change`
- "Today's writes" feed updates live

---

## Feature Brainstorm

> Full feature inventory — not all of these belong in Phase 1, but everything worth building is listed here.

### Core Monitoring (Phase 1 priority)

| Feature | Panel | Description |
|---------|-------|-------------|
| Work Queue | A | Story counts by state, blocked stories, live state-change updates |
| Live Activity Feed | B | Multiplexed real-time event stream across all event types |
| Token Burn Rate sparkline | C | Tokens/minute over last 60 minutes, live updating |
| Story Board (mini-kanban) | E | Story chips animated across state columns on state change |
| KB Health status | G | Entry counts, infrastructure up/down, cache hit rate, today's writes |
| Analytics KPI Row | D | Cycle time, throughput, QA pass rate, KB growth — refreshed every 60s |

### Active Stories Panel

| Feature | Description |
|---------|-------------|
| Active Story Cards | Per-story card for stories in_progress / in_review / in_qa / uat |
| State badge with color | in_progress=blue, in_review=violet, in_qa=amber, uat=cyan |
| Elapsed time in phase | Timer showing how long story has been in current state — amber/red on overrun |
| Token progress bar | Used / estimated with color coding (green < 80%, amber 80-100%, red > 100%) |
| Last event description | Most recent event for this story + "X ago" timestamp |
| Sorted by activity | Most recently active story is first |
| Phase overrun detection | Card turns amber if elapsed > 1.5× baseline, red if > 2× baseline |
| Token overrun detection | Bar turns red when tokens exceed estimate, shows % overage |
| Live updates | Token bar, state badge, last event update in real-time via Socket.io |
| Open → Story Detail Modal | "open ↗" button on each card triggers full Story Detail Modal |

### Token & Cost Analytics

| Feature | Description |
|---------|-------------|
| Phase-level token breakdown | Tokens by workflow phase (setup, implementation, review, qa) for any date range |
| Per-story token gauge | Visual budget bar: allocated vs actual, turns amber/red on overage |
| Token efficiency trend | Tokens per story point over time — is the system getting more efficient? |
| Cost estimate panel | Running cost estimate based on configurable per-token price |
| Cost projection | At current burn rate, projected daily/weekly cost |
| Top spenders table | Top N stories by tokens today, with budget status badges |

### Story Lifecycle & QA

| Feature | Description |
|---------|-------------|
| Story Timeline view | Per-story Gantt — how long it spent in each phase |
| Stage duration heatmap | Heatmap across all stories: which phase takes longest? |
| QA failure drill-down | When QA fails: which ACs failed, how many iterations, fix history |
| Review iteration tracker | Distribution of how many code-review rounds stories need |
| Blocked story chain view | Click any blocked story → visualize the full dependency chain |
| Cycle time percentiles | p50/p90 cycle times with trend vs prior week |

### Knowledge Base Deep View

| Feature | Description |
|---------|-------------|
| Entry type growth chart | Line chart: total knowledge_entries by type over 30 days |
| Retro pattern emerging | Show when a pattern is building toward the 3-story kb_add_retro threshold |
| Duplicate rate gauge | Archived/deduped entries as % of total — is KB staying clean? |
| Decision log feed | Live feed of ADR entries written by agents |
| KB search widget | Quick search across KB entries directly from the dashboard |
| Embedding cache trending | Cache hit rate over time — is the cache becoming more effective? |

### Story Board Enhancements

| Feature | Description |
|---------|-------------|
| Feature prefix filter | Scope story board to one or more prefixes (KNOW, WISH, WKFL, etc.) |
| Dependency overlay | Hover a chip → highlight all stories it blocks or depends on |
| Story detail drawer | Click any chip → side drawer with story title, ACs, current artifacts |
| Board density toggle | Compact (chips only) vs expanded (chips + titles) view |

### Story Content Browsing (modal, read-only)

| Feature | Description |
|---------|-------------|
| Story Detail Modal | Click any story chip/row → full-screen modal overlay (not a drawer) |
| Overview tab | goal, non_goals, story metadata, per-phase token usage bars |
| Acceptance Criteria tab | Full AC list with id, text, type badge; QA verdict per AC if available |
| Artifacts tab | Artifact list with last-modified; click any → renders YAML content inline |
| Dependencies tab | depends_on / blocked_by as clickable story chips (open that story's modal) |
| Timeline tab | State transition history with timestamps from story_state_transitions |
| KB Entries tab | Lessons, decisions, constraints tagged with this story_id |
| Live updates in modal | Tokens, artifacts, state, KB entries update in-place while modal is open |

### System & Infrastructure

| Feature | Description |
|---------|-------------|
| Socket.io connection health | Status bar indicator: connected / reconnecting / offline |
| DB connection status | Live ping to KB DB — green/amber/red |
| Event replay indicator | Show "replaying N buffered events" on reconnect |
| Worktree status panel | Active git worktrees mapped to stories — which are open? |

### User Experience

| Feature | Description |
|---------|-------------|
| Command palette | Ctrl+K → jump to story, filter feed, open KB search |
| Browser notifications | Push notification on: QA fail, blocked story, token budget exceeded |
| Feed pause / resume | Pause the activity feed scroll while reading, events buffer silently |
| Persistent filter preferences | Saved via localStorage — feature filter, panel layout, tab |
| Dark mode toggle | Force dark/light regardless of OS setting |
| Panel collapse | Collapse any panel to reclaim screen space |
| Export KPIs | Download current KPI snapshot as JSON/CSV |

---

## Pre-Implementation Design Stories

These are **design/spike stories** that should be completed before any code is written.

### DASH-001 — Design: LangGraph Event Integration + Socket.io Connection Architecture

**Goal:** Define the complete event schema, how LangGraph run events map to `DashEvent`
types, Socket.io channel structure, connection lifecycle (connect → snapshot → live →
disconnect → reconnect → replay), and which events update which panels.

**Deliverables:**
- `DashEvent` Zod schema (finalized)
- Full event type catalog: LangGraph source event → DashEvent type → panel(s) affected
- Socket.io room/channel structure (e.g. `workflow` room for all events)
- Connection lifecycle: connect → authenticate → HTTP snapshot → live events → disconnect → reconnect → replay
- Backpressure strategy: server ring buffer size, max replay count, client buffer
- LangGraph bridge design: how to subscribe to graph run events from the dashboard server
  (callback injection vs event bus vs LangSmith webhook)
- Panel update map: for each event type, which panels react and what they do

---

### DASH-002 — Design: Reusable Component Specs (packages/ui)

**Goal:** Define the full Zod prop schemas, visual specification, and component API for every
reusable dashboard component before any code is written.

**Deliverables per component:**
- Zod schema for all props (required and optional)
- Visual spec: layout, states (loading, empty, error, populated)
- Animation spec (Framer Motion transitions, hover effects, glow)
- Accessibility requirements (ARIA roles, keyboard nav)
- Design token mapping: which mockup colors → which CSS variables

**Components in scope:**
`ParticleCanvas`, `MetricCard`, `PerformanceChart`, `StatusBar`,
`AlertItem`, `ActionButton`, `NavSidebar`,
`LoadingOverlay`, `StoryChip`, `ActiveStoryCard`, `StoryDetailModal`,
`TokenBurnSparkline`, `FeedItem`, `ActivityFeed`

---

## Implementation Phases

### Phase 0 — Design Spikes (before any code)

**Stories:**
- `DASH-001` Design: LangGraph event integration + Socket.io connection architecture
- `DASH-002` Design: Reusable component specs (packages/ui)

---

### Phase 1 — Foundation
*Minimal viable dashboard. Highest signal, lowest effort.*

#### DASH-003 — Create `packages/ui` package scaffolding (`@repo/ui`)

**Goal:** Stand up the new shared UI component library so all dashboard components have a home.

**Deliverables:**
- `packages/ui/package.json` — `name: @repo/ui`, deps: clsx, tailwind-merge, cva, framer-motion, lucide-react
- `packages/ui/tsconfig.json` — extends repo tsconfig
- `packages/ui/src/_lib/utils.ts` — `cn()` helper
- `packages/ui/src/index.ts` — initial empty named exports
- Update root `pnpm-workspace.yaml` if needed; `pnpm install` to link

**Pattern reference:** `packages/core/app-component-library/package.json`

---

#### DASH-004 — Dashboard server: Socket.io scaffold

**Goal:** Stand up the minimal `apps/api/dashboard-server` Node.js process with Socket.io,
room structure, CORS config, and a `/health` endpoint. No events yet — just the server
skeleton that clients can connect to.

**Deliverables:**
- `apps/api/dashboard-server/package.json` — `name: @repo/dashboard-server`
- `apps/api/dashboard-server/src/index.ts` — HTTP server + Socket.io server
- Socket.io room: `workflow` — all connected clients join this room automatically
- `GET /health` endpoint → `{ status: 'ok', clients: N, uptime: Xs }`
- CORS: allow `localhost:*` for local dev
- Client connect/disconnect logging via `@repo/logger`
- `apps/api/dashboard-server/src/__types__/dash-event.ts` — `DashEventSchema` (Zod)

**DashEvent Zod schema:**
```ts
const DashEventSchema = z.object({
  id: z.string().uuid(),
  type: DashEventTypeSchema,    // z.enum([...])
  timestamp: z.string().datetime(),
  feature: z.string().optional(),
  story_id: z.string().optional(),
  graph_run_id: z.string().optional(),
  payload: z.record(z.unknown()),
})
```

---

#### DASH-005 — LangGraph event bridge

**Goal:** The bridge is the translation layer between LangGraph run events and DashEvents.
LangGraph graphs will call the bridge on each significant event; the bridge translates and
broadcasts to Socket.io clients.

**Integration approach: HTTP POST webhook**
- Dashboard server exposes `POST /events` (local only, no auth for dev)
- LangGraph graphs are configured with a custom `DashboardCallbackHandler` that POSTs to this endpoint
- This decouples the dashboard from the LangGraph process — works even if they run in separate processes

**Deliverables:**
- `apps/api/dashboard-server/src/event-bridge.ts` — `/events` HTTP POST handler
  - Validates incoming payload with `IncomingLangGraphEventSchema` (Zod)
  - Translates to `DashEvent` via `translateLangGraphEvent()`
  - Broadcasts translated event to `workflow` room
  - Returns `202 Accepted`
- `apps/api/dashboard-server/src/event-translator.ts` — translation logic:

| Incoming `event` field | `data` fields used | → DashEvent type | Payload |
|---|---|---|---|
| `on_chain_start` | `name`, `run_id`, `metadata.story_id` | `agent:node_start` | `{ node_name, graph_name, story_id }` |
| `on_chain_end` (stage-movement) | `name`, `outputs.to_stage`, `metadata.story_id` | `story:state_change` | `{ from, to, title, feature }` |
| `on_chain_end` (qa-verify) | `outputs.verdict`, `outputs.issues_count` | `qa:verdict` | `{ verdict, issues_count }` |
| `on_chain_end` (any) | `name`, `run_id`, `outputs.outcome` | `agent:node_end` | `{ node_name, outcome, tokens_used }` |
| `on_chain_error` | `name`, `error.message` | `agent:error` | `{ node_name, error_type, message }` |
| `on_llm_end` | `response.usage_metadata` | `tokens:logged` | `{ node_name, input_tokens, output_tokens, total }` |
| `on_tool_end` (write-artifact) | `output.artifact_type`, `output.phase` | `artifact:written` | `{ artifact_type, phase, iteration }` |
| `on_tool_end` (kb_add_lesson / kb_write) | `output.entry_type`, `output.tags` | `kb:entry_added` | `{ entry_type, tags, role }` |
| `on_checkpoint` | `metadata.story_id`, `metadata.step` | `agent:checkpoint` | `{ graph_name, step, state_keys }` |

- Unit tests: each translation case has a test with a sample LangGraph event → expected DashEvent

---

#### DASH-006 — HTTP snapshot endpoints

**Goal:** When a browser connects (or reconnects), it needs the current state of the system
before live events begin. These REST endpoints provide that initial snapshot.

**Deliverables (`apps/api/dashboard-server/src/snapshot-routes.ts`):**

| Endpoint | Source | Response |
|---|---|---|
| `GET /snapshot/stories` | KB DB `stories` table | `{ counts: { in_progress: N, in_review: N, ... }, active: StoryCard[], blocked: BlockedStory[] }` |
| `GET /snapshot/tokens` | KB DB `story_token_usage` GROUP BY story_id | `{ today_total: N, by_phase: Phase[], hot_stories: HotStory[] }` |
| `GET /snapshot/kb-health` | KB DB `knowledge_entries` GROUP BY entry_type | `{ by_type: EntryTypeCount[], total: N, today_writes: N }` |
| `GET /snapshot/kpis` | KB DB aggregation queries | `{ cycle_time_p50, cycle_time_p90, qa_pass_rate, throughput_today }` |
| `GET /story/:id/content` | Filesystem `story.yaml` | Parsed story metadata, goal, non_goals, ACs, risks |
| `GET /story/:id/artifacts` | Filesystem directory listing | `{ artifacts: ArtifactMeta[] }` |
| `GET /story/:id/artifact/:filename` | Filesystem file read | Raw YAML string |
| `GET /story/:id/transitions` | KB DB `story_state_transitions` | `{ transitions: StateTransition[] }` |
| `GET /story/:id/kb-entries` | KB DB `knowledge_entries` | `{ entries: KBEntry[] }` |

All responses use Zod schemas (defined in `src/__types__/snapshot.ts`). All are read-only GET endpoints.

---

#### DASH-007 — Ring buffer + reconnect event replay

**Goal:** When a client disconnects and reconnects (tab refresh, network blip), they should
receive the last N events they missed rather than starting from a blank feed.

**Deliverables (`apps/api/dashboard-server/src/ring-buffer.ts`):**
- `RingBuffer<DashEvent>` class — fixed-size circular buffer (default: 500 events)
- On every broadcast: event is also pushed to the ring buffer
- On client `connection` event: server emits `replay` message with buffered events since `lastEventId` (client sends its last-seen event ID on reconnect)
- If client has no `lastEventId` (fresh connect): replay last 100 events (configurable)
- `GET /health` includes buffer stats: `{ buffer_size: 500, buffer_used: N }`

**Client-side protocol:**
```
client connects          → sends { lastEventId: string | null }
server receives          → emits 'replay' with [events after lastEventId]
client processes replay  → applies events to all panel state reducers
server starts live       → emits new events as they arrive
```

---

#### DASH-008 — Dashboard app shell

**Goal:** The React app side of the connection. Connects to the dashboard server, handles
reconnect, dispatches incoming events to panel state, shows connection status.

**Deliverables:**
- `apps/web/app-dashboard/src/hooks/useDashSocket.ts` — socket.io-client hook
  - Connects on mount, disconnects on unmount
  - Sends `lastEventId` on (re)connect — persisted in `sessionStorage`
  - Handles `connect`, `disconnect`, `replay`, and all event types
  - Returns: `{ status, events, lastEventId }`
- `apps/web/app-dashboard/src/pages/agent-monitor.tsx` — page scaffold
  - Uses `useDashSocket` hook
  - Shows `ConnectionStatusBar` at top (DB ● | Socket.io ● | Last event: Xs ago)
  - Renders panel placeholders with loading skeletons until snapshot loads
- `apps/web/app-dashboard/src/data/agent-monitor-mock.ts` — mock data for all panels
  (so page is visually complete before server wiring)
- Add `/agent-monitor` route to TanStack Router

---

#### DASH-009 — Panel B: Activity Feed — core rendering

**Goal:** The `FeedItem` component and the full event-type-to-row mapping spec. Every
event type has a defined visual treatment before any live events arrive.

**`FeedItem` anatomy:**
```
14:32:01  [icon]  [category badge]  primary text          secondary text
```

**Full event type → row format mapping:**

| Event type | Icon | Category (color) | Primary text | Secondary text |
|---|---|---|---|---|
| `story:state_change` | ArrowRight | State (blue) | `KNOW-018  backlog → in_progress` | feature: know |
| `story:created` | Plus | State (blue) | `KNOW-023 created` | 3pts · feature: know |
| `story:blocked` | AlertTriangle | Blocked (orange) | `KNOW-021 blocked by KNOW-016` | reason (if provided) |
| `story:unblocked` | CheckCircle | State (blue) | `KNOW-021 unblocked` | — |
| `tokens:logged` | Coins | Token (amber) | `KNOW-018 · dev-impl · 4,200 tokens` | +4,200 running: 8,400 |
| `artifact:written` | FileText | Artifact (violet) | `PLAN.yaml written · KNOW-018` | iteration 1 · setup |
| `qa:verdict` (pass) | CheckCircle | QA Pass (green) | `QA PASS · KNOW-016 · 0 blocking` | qa_run_id |
| `qa:verdict` (fail) | XCircle | QA Fail (red) | `QA FAIL · KNOW-016 · 3 blocking issues` | qa_run_id |
| `kb:entry_added` | BookOpen | KB (green) | `lesson added · WISH-2045 · "reuse auth middleware"` | tags |
| `task:created` | SquarePlus | Task (gray) | `Task created: Fix retry logic` | WISH-2045 |
| `task:promoted` | TrendingUp | Task (gray) | `Task promoted to KNOW-024` | from WISH-2045 |
| `agent:node_start` | Play | Agent (cyan) | `qa-verify-leader started · KNOW-016` | graph_run_id |
| `agent:node_end` | StopCircle | Agent (cyan) | `dev-implement-leader completed · KNOW-018` | outcome: success |
| `agent:error` | AlertOctagon | Error (red) | `Error in qa-verify-leader · KNOW-016` | error message |
| `agent:checkpoint` | Bookmark | Agent (cyan) | `Checkpoint · KNOW-018 · step 4` | state_keys count |

**Color-coded category badges:**

| Category | Badge color | CSS class |
|---|---|---|
| State | Blue | `bg-primary/20 text-primary` |
| Blocked | Orange | `bg-accent/20 text-accent` |
| Token | Amber | `bg-yellow-500/20 text-yellow-400` |
| Artifact | Violet | `bg-violet-500/20 text-violet-400` |
| QA Pass | Green | `bg-success/20 text-success` |
| QA Fail | Red | `bg-destructive/20 text-destructive` |
| KB | Teal | `bg-teal-500/20 text-teal-400` |
| Task | Gray | `bg-muted text-muted-foreground` |
| Agent | Cyan | `bg-sky-500/20 text-sky-400` |
| Error | Red | `bg-destructive/20 text-destructive` |

**Component deliverables:**
- `packages/ui/src/dashboard/FeedItem/index.tsx` — Zod props schema, renders single feed row
- `packages/ui/src/dashboard/ActivityFeed/index.tsx` — virtualized list of FeedItem rows (max 500, using `react-virtual` or simple windowing)
- `apps/web/app-dashboard/src/pages/agent-monitor.tsx` — wires Panel B using the above

---

#### DASH-010 — Panel B: Activity Feed — auto-scroll + pause/resume

**Goal:** The feed is a live stream. Auto-scroll keeps you at the newest event. Pause/resume
lets you read history without missing events.

**Behavior spec:**
- Default: auto-scroll to bottom on each new event
- Manual scroll upward (mouse wheel / trackpad) → pauses auto-scroll; shows "↓ N new" floating badge
- Clicking "↓ N new" badge → jumps to bottom, resumes auto-scroll
- "⏸ Pause" button (header of panel) → explicit pause; new events enter an in-memory buffer silently
- "▶ Resume" button → replays buffer events in a fast batch (no animation, just append), then resumes live
- Buffer cap while paused: 200 events (oldest dropped if exceeded; counter shows "200+" capped)
- `react-virtual` (or similar) windowing ensures the DOM stays performant at high event volumes

---

#### DASH-011 — Panel B: Activity Feed — filtering

**Goal:** Filter the feed to reduce noise. Focus on what matters during a specific workflow run.

**Filter controls (in panel header):**
- **Category multi-select chips:** State · KB · Artifact · QA · Token · Blocked · Task · Agent · Error
  (click to toggle; active category highlighted with glow border)
- **Feature prefix dropdown:** ALL · KNOW · WISH · WKFL · … (populated from connected stories)
- Active filter chips shown as removable pills: `× State` `× KNOW`
- "Clear filters" button when any filter is active
- Filter state is owned by the parent page, passed as props to `ActivityFeed`
- Active filters persisted in `sessionStorage` (survive tab refresh)

---

#### DASH-012 — Panel A: Work Queue
#### DASH-013 — Panel C: Token Burn Rate sparkline

**Result:** You can watch stories move through states, tokens accumulate, and every system event scroll by in real time.

---

### Phase 2 — Active Stories + Story Board

| Story | Title |
|-------|-------|
| DASH-014 | Panel E: Story Board kanban (animated chip transitions on `story:state_change`) |
| DASH-015 | Panel F: Active Stories cards (state badge, token bar, elapsed time, last event) |
| DASH-016 | Panel C: Token burn breakdown by phase + over-budget alerts (> 120% estimate) |
| DASH-017 | Feature prefix filter — scope all panels to KNOW / WISH / WKFL / ALL |

**Result:** You can see which stories are being worked, their token usage, and navigate the full story board.

---

### Phase 3 — Story Detail Modal

| Story | Title |
|-------|-------|
| DASH-018 | Story Detail Modal shell — full-screen tabbed modal (6 tabs: see spec above) |
| DASH-019 | Modal: Artifact viewer — list + render YAML inline on click |
| DASH-020 | Modal: Story token history — per-phase bars in Overview tab |
| DASH-021 | Modal: KB entries tab — lessons, decisions, constraints for this story_id |
| DASH-022 | Modal: Live updates while open — tokens, artifacts, state change update in-place |

**Result:** You can read the full story context — ACs, artifacts, KB entries — live while it's being worked.

---

### Phase 4 — Analytics + KB Health

| Story | Title |
|-------|-------|
| DASH-023 | Panel D: Analytics KPI row (cycle time p50/p90, QA pass rate, throughput, KB growth) |
| DASH-024 | Panel G: KB Health panel (entry counts, infra status, today's writes, duplicate rate) |
| DASH-025 | Bottleneck detector — flag stories stuck in a phase > 1.5× baseline |
| DASH-026 | Token efficiency trend (tokens per story point sparkline) |
| DASH-027 | Dashboard settings — persist feature filter + panel preferences via localStorage |

**Result:** Full observability — historical trends, KB health, and workflow bottlenecks at a glance.

---

## Gap Analysis

> Run before story creation. Identifies assumptions, missing requirements, and cross-system
> dependencies that must be resolved as ACs. Severity: 🔴 Blocker | 🟠 High | 🟡 Medium

### Critical Blockers (must resolve before implementation begins)

---

**GAP-001 ✅ RESOLVED — Story state enum**

Migration 009 (underscore enum) is canonical. The `stories` table uses `in_progress`, `in_review`, `in_qa`, `uat`, `completed`, etc. Migration 002's hyphenated enum was replaced. The dashboard's assumed state values are correct.

**AC (closes on DASH-006):** Dashboard server shares `StoryStateSchema` with the KB Drizzle schema (import from `@repo/knowledge-base` types). A CI smoke query confirms the stories table's state column uses the migration 009 enum before DASH-006 merges.

---

**GAP-002 ✅ RESOLVED — `running_total` omitted from v1**

`running_total` is dropped from the `tokens:logged` event payload in Phase 1. The Active Stories token bar reads cumulative totals from the HTTP snapshot endpoint (`GET /snapshot/tokens`) rather than accumulating live events. Running total can be added in a future phase if needed.

**AC (closes on DASH-005):** `DashEventSchema.tokens_logged.payload` must NOT include `running_total`. The Active Stories token bar must source its total from the initial snapshot + snapshot refresh (every 60s), not from event accumulation. This must be documented in DASH-001.

---

**GAP-003 ✅ RESOLVED — Token estimates: actual-only in live card, comparison in modal**

Estimates come from elaboration (PLAN.yaml), stored in `implementation_plans.estimated_tokens`. Not every active story has this row yet.

**Decision:**
- **Active Stories card**: Show raw token count only (`6,200 tokens`) — no progress bar, no estimate in v1. Keeps the card simple and always accurate.
- **Story Detail Modal — Overview tab**: Show estimate vs actual per phase (on-demand, not live). Fetched at modal-open time from `GET /snapshot/tokens?story_id=X` (actual) and `implementation_plans.estimated_tokens` (estimate). If no estimate row exists, show actual-only row with no percentage.

**AC (closes on DASH-020 — Modal token history):** Token phase rows in modal Overview must source actuals from `story_token_usage` and estimates from `implementation_plans`. Both queries at modal-open time only (not live-updating). Missing estimate → show actual tokens only, no bar.

---

**GAP-004 🔴 — Phase baseline durations for bottleneck detection are undefined**

Bottleneck detection requires "elapsed > 1.5× baseline" per state. No table, config, or constant defines baseline durations for `in_progress`, `in_review`, `in_qa`, `uat`.

**AC (closes on DASH-025):** Baselines must be defined before DASH-025 is implemented. Acceptable options: environment variables (`BASELINE_IN_PROGRESS_HOURS=8`), computed as p50 of historical `story_state_transitions` durations, or a config file. The chosen approach must be documented in DASH-001. Must include a unit test confirming 1.5× and 2× thresholds fire correctly.

---

**GAP-005 🔴 — `DashboardCallbackHandler` does not exist**

No LangGraph callback handler exists in `packages/backend/orchestrator/`. The TypeScript LangGraph SDK (`@langchain/langgraph`) has a different callback API than Python. No integration point is defined for injecting callbacks into existing graphs (`story-creation`, `elaboration`, `code-audit`).

**AC (closes on DASH-005):** DASH-005 must confirm: (1) `@langchain/langgraph` SDK version in use supports the callback/stream events API; (2) a concrete injection path exists for all existing graphs; (3) if no callback injection exists, an alternative (event bus, middleware wrapper, post-run polling) is specified. The `DashboardCallbackHandler` must be a deliverable of DASH-005 or a prerequisite story.

---

**GAP-006 🔴 — Filesystem path resolution for story.yaml is undefined**

`GET /story/:id/content` needs to find `story.yaml` on disk. The `stories.story_dir` column is nullable. `STORY_BASE_PATH` env var is mentioned in docker-compose but not defined as a formal contract. Some stories now store artifacts in `story_artifacts.content` (JSONB in DB, migration 010) with no filesystem file.

**AC (closes on DASH-006):** (1) If `story_dir` is null → return `404 { error: 'story_dir not set' }`. (2) `STORY_BASE_PATH` must be in `.env.example`. (3) Artifacts tab must specify whether it reads from `story_artifacts.content` (DB) or filesystem, and which takes precedence. (4) `GET /story/:id/artifact/:filename` must validate filename against allowlist `^[A-Z0-9_\-]+\.(yaml|md|json)$` and confirm resolved path stays within `story_dir` (path traversal prevention — see GAP-023).

---

### Integration Blockers (require prerequisite stories)

---

**GAP-019 🔴 — `story_state_transitions` is NOT written by stage-movement-adapter**

The Timeline tab in Story Detail Modal requires `story_state_transitions` rows. The stage-movement-adapter (`packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts`) is filesystem-only — it moves YAML files and updates frontmatter. It does NOT write to PostgreSQL. The DB function `log_story_state_transition()` exists but is never called by any orchestrator code.

**AC (pre-DASH-006):** A prerequisite story must add KB DB writes to the stage-movement flow. After each successful `moveStage()`, call `log_story_state_transition(story_id, from_state, to_state, actor)`. This write must be non-blocking (DB failure must not fail stage movement). Until this story is complete, the Timeline tab will always be empty — this must be called out as a known limitation in DASH-018.

---

**GAP-020 🔴 — `story_token_usage` is NOT written by LangGraph's MetricsCollector**

`GET /snapshot/tokens` polls `story_token_usage`. But `MetricsCollector` in the orchestrator writes to `METRICS.yaml` files — not to `story_token_usage`. The only path that writes to `story_token_usage` is the `kb_log_tokens` MCP tool (`token-operations.ts`). LangGraph graphs using `MetricsCollector` will not appear in the dashboard's token snapshot.

**AC (pre-DASH-006):** A decision must be made and documented: (1) Route `MetricsCollector` writes to `story_token_usage` via a DB call, or (2) `GET /snapshot/tokens` queries `token_usage` (migration 002 table) instead. The token data source for the initial snapshot and for the live `running_total` (GAP-002) must be the same table. Mismatched sources will cause inconsistent values between page load and live events.

---

### Missing Requirements (need ACs before implementation)

---

**GAP-007 🟠 — `story:state_change` payload fields `from`/`to`/`title`/`feature` not mapped to adapter outputs**

`StageMovementAdapter.moveStage()` returns `{ storyId, fromStage, toStage, storyPath, backupPath }`. The DashEvent payload requires `{ from, to, title, feature }`. `title` and `feature` are not in any adapter output.

**AC:** Event translator must fetch `title` and `feature` from KB DB by `story_id` if not in node output. Must handle the case where the story is not yet in the DB (return `title: null, feature: null` — not drop the event).

---

**GAP-008 🟠 — `qa:verdict` payload field `issues_count` not a DB column**

`verifications.qa_blocking_issues` is `TEXT[]`, not a count. `issues_count` is computed as `array_length(qa_blocking_issues, 1)`. `qa_run_id` doesn't exist as a column.

**AC:** `issues_count` must be computed from `array_length(qa_blocking_issues, 1)` (documented, not magic). `qa_run_id` must be defined as either `graph_run_id` from the LangGraph event envelope or `verifications.id`. Finalized in DASH-001 before DASH-005 is built.

---

**GAP-009 🟠 — `retro` is not a valid `entry_type` in `KnowledgeEntryTypeSchema`**

The Activity Feed spec shows `kb_add_retro` and Panel G shows `retro` as an entry type. The actual enum is `note | decision | constraint | runbook | lesson | feedback | calibration`. `retro` is not in the enum.

**AC:** Display values in Activity Feed and KB Health must match the actual `KnowledgeEntryTypeSchema` enum exactly. If `retro` is desired, add it to the schema before any frontend work. Do not hardcode UI labels that don't match DB values.

---

**GAP-010 🟡 — Story dependencies source: DB table vs story.yaml field**

`story_dependencies` table and `story.yaml` `depends_on` field both exist. Plan doesn't define which is authoritative for the Dependencies tab.

**AC:** Choose one canonical source. Recommended: `story_dependencies` table (DB is more complete). Document in DASH-001.

---

**GAP-011 🟠 — Cycle time query for KPI row is unspecified**

No query defined for p50/p90 computation. `story_state_transitions` has timestamps but no duration column. Requires window functions across transition pairs. Must account for GAP-001 state enum values.

**AC:** DASH-006 must include a tested SQL query for cycle time. Must return `null` if fewer than 5 completed stories exist (avoid misleading percentiles with small samples).

---

**GAP-012 🟡 — `POST /events` has no input validation or auth skeleton**

Even without full auth, malformed event payloads should be rejected. No `DASHBOARD_EVENT_SECRET` env var defined.

**AC:** `POST /events` must Zod-parse incoming payload (not just type coerce). Invalid payloads return `400`. Define `DASHBOARD_EVENT_SECRET` env var in `.env.example` (empty for local dev) so auth can be added later without a breaking change.

---

### Undefined Behaviors (need explicit spec)

---

**GAP-013 🟠 — Reconnect replay when `lastEventId` is too old (pruned from buffer)**

**AC:** If `lastEventId` not found in ring buffer → emit `replay:stale` socket message (include oldest buffered event timestamp), then send full buffer. Client must trigger HTTP snapshot re-fetch before applying replayed events. Covered by a unit test in `ring-buffer.ts`.

---

**GAP-014 🟡 — Concurrent modals: replace or stack?**

When clicking a dependency chip in Story Detail Modal, does the current modal close (replace) or do they stack?

**AC:** Choose one model explicitly. Recommended: replace (simpler, avoids infinite stacking). Document the Escape key behavior.

---

**GAP-015 🟡 — Story Detail Modal when story transitions to `completed` while open**

**AC:** On `story:state_change` → `completed`/`cancelled`/`deferred`, show non-dismissible banner "Story completed" at top. Modal stays open (user controls dismissal). Token bars and timeline show final values.

---

**GAP-016 🟡 — Activity Feed filter applied at ingestion vs. render time**

**AC:** Feed maintains unfiltered internal store (max 500 events). Filtering applied at render time only. Changing filters must re-render from full store without re-fetching.

---

**GAP-017 🟡 — Concurrent LangGraph runs for the same story_id**

**AC:** Token bars aggregate all events by `story_id` regardless of `graph_run_id`. `running_total` is true cumulative. Document "concurrent runs for same story" as out-of-scope constraint if not expected in practice.

---

**GAP-018 🟠 — Event translator DB enrichment failure (DB down during translation)**

**AC:** DB query failures during enrichment (title, feature, running_total) must result in event broadcast with `null` fields — not dropped events. Dashboard must display gracefully degraded labels (story_id only, no title). Covered by unit test with mocked DB that throws.

---

**GAP-023 🟠 — Path traversal vulnerability in `GET /story/:id/artifact/:filename`**

**AC:** `filename` must match `^[A-Z0-9_\-]+\.(yaml|md|json)$`. Resolved path must be confirmed within `STORY_BASE_PATH + story_dir` via `path.resolve()`. Return `400` on validation failure. Unit test with `../../../etc/passwd` filename must return 400.

---

**GAP-024 🟡 — KB Health data source: direct DB vs KB MCP server call**

**AC:** `GET /snapshot/kb-health` must use direct KB DB query from dashboard server (not MCP tools — dashboard server cannot use MCP directly). Document connection pool config and health-check in `/health` endpoint.

---

## Resolved Design Decisions

| Question | Decision |
|---|---|
| Server location | Standalone `apps/api/dashboard-server` — clean separation from KB MCP server |
| Event source | LangGraph callback bridge (HTTP POST webhook) — not PG LISTEN/NOTIFY |
| Authentication | None — local-only (localhost) for dev use case; dashboard is read-only |
| Event retention | 500-event ring buffer (~2-4h of activity); fresh clients get last 100 |
| Multi-session | All clients join `workflow` room; all see the same event stream |
| App placement | Existing `apps/web/app-dashboard` — new `/agent-monitor` route |
| Story detail UI | Full-screen **modal** (not a drawer) |
| Panel F focus | **Active Stories** (not active agents) — story is the persistent unit of work |

---

### Phase 5 — Infrastructure & CI/CD

*Make the dashboard production-ready and first-class in the monorepo pipeline.*

#### DASH-028 — Add `packages/ui` to Turborepo pipeline

**Deliverables:**
- Add `@repo/ui` tasks (`build`, `test`, `check-types`, `lint`) to `turbo.json`
- Confirm `pnpm test` and `pnpm check-types` run `packages/ui` in the pipeline
- Add `vitest.config.ts` to `packages/ui`
- At least 3 component smoke tests in `packages/ui/src/dashboard/__tests__/`

---

#### DASH-029 — Add `apps/api/dashboard-server` to Turborepo pipeline

**Deliverables:**
- Add `dashboard-server` tasks to `turbo.json` (`build`, `test`, `check-types`, `lint`)
- `vitest.config.ts` for the server
- Unit tests for: `event-translator.ts` (all 15 event types), `ring-buffer.ts` (add, overflow, replay)
- Integration test: `POST /events` → validates translation → broadcasts to test Socket.io client

---

#### DASH-030 — Dockerfile for `apps/api/dashboard-server`

**Deliverables:**
- `apps/api/dashboard-server/Dockerfile` — multi-stage build, Node.js 20 Alpine
- `.dockerignore`
- `pnpm build` script in package.json (TypeScript → dist/)
- Exposes port 3099

---

#### DASH-031 — docker-compose integration

**Deliverables:**
- Add `dashboard-server` service to the project's dev `docker-compose.yml`
- Depends on: KB DB service
- Environment variables: `KB_DB_HOST`, `KB_DB_PORT`, `KB_DB_NAME`, `KB_DB_USER`, `KB_DB_PASSWORD`, `PORT`, `STORY_BASE_PATH`
- Health check: `GET /health` → `200 OK`
- `pnpm dev` starts dashboard-server alongside KB MCP server

---

#### DASH-032 — E2E smoke test for the dashboard

**Deliverables:**
- Playwright test in `apps/web/playwright/` (or `apps/web/app-dashboard/src/test/e2e/`)
- Test: navigate to `/agent-monitor`, verify page loads with status bar visible
- Test: mock Socket.io server emits a `story:state_change` event → work queue count increments
- Test: click "open ↗" on a mock story card → Story Detail Modal opens with correct story title
- CI gate: Playwright tests must pass in GitHub Actions before merge

---

## Related Epics

| Epic | Relationship |
|------|-------------|
| TELE | Complementary — TELE for historical/ops metrics, DASH for live dev monitoring |
| KNOW-016 | Cache hit rate panel in KB Health requires KNOW-016 cache implementation |
| KNOW-018 | Story dependency graph enables richer blocked story display |
| KNOW-020 | Retro entry_type enables retro rate KPI in analytics row |
| KNOW-021 | Metrics emission from KB server feeds KB Health infrastructure status |
