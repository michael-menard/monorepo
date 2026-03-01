# APIP Architecture Review: Queue & Supervisor Design

**Date:** 2026-02-25
**Status:** CONCERNS — proceed with modifications

---

## Executive Summary

The APIP plan proposes a PostgreSQL-backed work queue, a LangGraph supervisor graph running in Docker, and a multi-phase autonomous development pipeline. The overall direction is sound — the team already has meaningful LangGraph investment in `packages/backend/orchestrator` with working elaboration and story-creation graphs, circuit breakers, and DB-persistence nodes.

However, four architectural decisions need resolution before writing the first line of APIP-0010 code.

---

## 1. Queue Architecture Deep Dive

### 1.1 FOR UPDATE SKIP LOCKED — Assessment

**The Good:** Well-understood, production-proven in PostgreSQL. Transactional claiming: if supervisor crashes mid-claim, the transaction rolls back and the row becomes available. Correctness is excellent.

**Failure Modes:**
1. Aurora PostgreSQL lock contention differs from vanilla PG. At 1-3 concurrent workers (MVP target), non-issue. At 20+, real concern.
2. `ORDER BY priority DESC` + `SKIP LOCKED` does NOT guarantee priority ordering — high-priority locked rows are skipped silently.
3. Long-running claim transactions bloat dead tuples. Keep claiming transactions short; heartbeat in separate transactions.
4. Aurora's `max_connections` can be exhausted if LangGraph checkpoint writes share the pool.

### 1.2 pg_notify — Critical Caveat

pg_notify is **fire-and-forget**. Guarantees delivery ONLY to listeners connected at NOTIFY time.

- NOT durable: missed if no listener connected
- Channels overflow under high frequency (connection may be dropped)
- Connection loss requires explicit re-LISTEN (pg client libraries do NOT auto-reissue)

**Verdict:** pg_notify is a latency optimization, NOT a correctness mechanism. Polling fallback (10-30s interval) is mandatory.

**Recommendation for APIP-0010:** Start with polling only. Add pg_notify later if latency proves unacceptable.

### 1.3 Complete Queue State Machine

```
                         ┌──────────────────────────┐
                         │         pending           │
                         └──────────┬───────────────-┘
                                    │ claim (FOR UPDATE SKIP LOCKED)
                         ┌──────────▼───────────────-┐
                         │       in_progress          │
                         └──┬──────────┬──────────┬──┘
                    success │          │ failure   │ timeout (heartbeat)
             ┌──────────────▼──┐  ┌────▼───────┐  │
             │    completed    │  │  pending    │  │
             │  (terminal)     │  │(rescheduled)│◄─┘
             └─────────────────┘  └────────────┘
                                       │ attempt_count >= max_attempts
                         ┌─────────────▼───────────-┐
                         │         blocked           │
                         │  (human intervention)     │
                         └──────────┬──────────────-─┘
                                    │ human resolves
                                    ▼ pending (reset)

 Additional: pending → cancelled, any → deferred (dependencies not met)
```

**Missing from plan:**
- `deferred` state for dependency-aware ordering
- Heartbeat timeout recovery (reaper job)
- Cancellation support
- Exponential backoff: `scheduled_at = NOW() + INTERVAL '1 min' * (2 ^ attempt_count)`
- Error classification: TRANSIENT vs PERMANENT (permanent → immediate `blocked`)
- Cross-stage retry semantics: if QA fails, does story go back to `pending` with `stage=implementation`?

### 1.4 Recommended Schema

```sql
CREATE TABLE wint.work_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        TEXT NOT NULL UNIQUE,
  stage           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  priority        INTEGER NOT NULL DEFAULT 5,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  worker_id       TEXT,
  claimed_at      TIMESTAMPTZ,
  heartbeat_at    TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  last_error      TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled', 'deferred')
  )
);

-- Partial index: only scan pending rows during claim
CREATE INDEX idx_work_queue_claimable
  ON wint.work_queue (priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Stale heartbeat detection
CREATE INDEX idx_work_queue_stale
  ON wint.work_queue (heartbeat_at)
  WHERE status = 'in_progress';
```

---

## 2. Supervisor Architecture

### 2.1 Plain TypeScript Loop vs. LangGraph Supervisor

**Recommendation: Plain TypeScript supervisor for Phase 0.**

LangGraph adds value for worker graphs (elaboration, implementation, review) where checkpointing and conditional routing matter. The supervisor itself is a polling loop — LangGraph adds complexity without Phase 0 benefit.

A plain supervisor:
1. Polls work queue (10s interval)
2. Dispatches to existing LangGraph worker graphs
3. Awaits completion via stream events
4. Updates queue

Reserve LangGraph supervisor for Phase 2+ when the supervisor needs its own checkpointing.

### 2.2 The Two-Layer State Problem (Critical)

LangGraph checkpoint and work queue are independent state stores:

```
Layer 1: wint.work_queue → story_id=APIP-0010, status=in_progress
Layer 2: LangGraph checkpoint → thread_id=APIP-0010:elaboration:1, node=delta_detect
```

**Crash recovery requires reconciliation:**
1. Find `in_progress` rows with stale heartbeat
2. Check if LangGraph checkpoint exists for that story+stage
3. If checkpoint exists and completed → mark queue row completed
4. If checkpoint exists and incomplete → resume from checkpoint
5. If no checkpoint → reset to pending

**Thread ID convention (document as ADR before coding):**
`{story_id}:{stage}:{attempt_number}` — e.g., `APIP-0100:elaboration:1`

Attempt number is critical: each retry uses a new thread_id to avoid inheriting corrupt checkpoint state.

### 2.3 Stuck Detection

Use wall clock timeout + LangGraph stream events:
- If no node completion event for X minutes → stuck
- If total wall clock exceeds Y minutes → forcibly cancel
- Do NOT rely on heartbeats from inside graph nodes (tight coupling)

---

## 3. Alternative Architectures Compared

| Approach | Correctness | Complexity | Familiarity | Observability | Verdict |
|---|---|---|---|---|---|
| **PG Queue + LangGraph** (plan) | High (with fixes) | Medium-High | High | Low (manual) | **Proceed with mods** |
| **BullMQ + LangGraph** (hybrid) | Very high | Low-Medium | Medium | High (Bull Board) | **Strong alternative** |
| SQS + Step Functions | High | High | Low | High | No (Lambda 15min limit) |
| Temporal.io | Very high | Medium | None | High | No (ramp-up cost) |

### BullMQ Hybrid — Worth Serious Consideration

The codebase already has Redis/ElastiCache (`apps/api/lego-api/core/cache/redis-client.ts`). BullMQ would:
- Eliminate APIP-0010 (custom queue), much of APIP-2010 (blocked handling), and pg_notify complexity
- Provide built-in retry, delay, priority, rate limiting, concurrency, and dashboard (Bull Board)
- Keep LangGraph for worker graphs where it provides genuine value

**Trade-off:** Adds Redis dependency to the pipeline (already in infra) but removes custom PostgreSQL queue code.

---

## 4. Risks and Pre-Implementation Spikes

### Must Prototype (1-2 days each)

| Spike | Why | Blocks |
|-------|-----|--------|
| LangGraph checkpoint resume after crash | Verify graph resumes from last node, not from start | APIP-0020 |
| FOR UPDATE SKIP LOCKED under 3 concurrent readers | Verify claiming + priority behavior | APIP-0010 |
| Plain TypeScript supervisor vs. LangGraph supervisor | Compare complexity for same behavior | APIP-0020 |
| Cheap model quality (5 stories through Ollama) | RISK-001 is HIGH — validate before building Phase 1 | APIP-1030 |

### Scaling Bottlenecks

1. **Aurora connection pool** — supervisor + LangGraph checkpoints + app traffic share pool. Need PgBouncer or RDS Proxy.
2. **Git worktrees** — 3 concurrent = 150-600 MB disk per story. Cleanup policy needed.
3. **Token budget** — circuit breaker must be a hard cap ($X per story → immediate block), not just rate limiting.
4. **LangGraph checkpoint table** — grows unboundedly without retention policy.

### Irreversible Decisions

1. **ChangeSpec schema** (ENG-001) — all Phase 1+ depends on this. Spike as pure research before integration.
2. **LangGraph thread_id convention** — changing requires checkpoint data migration.
3. **Dedicated server vs Lambda async** — server provisioning (APIP-5006) is on critical path for Phase 0. Lambda async is viable for Phase 0 if elaboration graphs < 5 min.

---

## 5. Key Decisions Required

### Decision 1: Queue Backend
**PostgreSQL (plan) vs BullMQ/Redis (hybrid)**
- PG: No new dependency, but custom code for retry/delay/priority/monitoring
- BullMQ: Eliminates custom queue code, uses existing Redis infra, built-in dashboard
- Recommendation: Evaluate BullMQ hybrid before committing to APIP-0010

### Decision 2: Supervisor Implementation
**LangGraph graph vs plain TypeScript loop**
- LangGraph supervisor adds nested checkpoint complexity without Phase 0 benefit
- Recommendation: Plain TypeScript loop for Phase 0, revisit in Phase 2

### Decision 3: Server vs Lambda for Phase 0
**Dedicated Docker server vs Lambda async**
- Server: blocks on provisioning + security hardening
- Lambda: viable if graphs < 5 min, no infra provisioning
- Recommendation: Lambda for Phase 0 validation, server for Phase 1+

### Decision 4: Checkpoint Database
**Same Aurora cluster vs separate PostgreSQL**
- Co-locate with separate connection pool (max: 3) for Phase 0
- Evaluate isolation in Phase 1 if connection pressure appears

---

## Summary

The plan is architecturally sound and builds on real existing investment. The four gaps above are not blockers to the epic — they are blockers to starting Phase 0 without rework risk. Resolve decisions 1-2 before APIP-0010 elaboration. Resolve decision 3 before APIP-0030. Decision 4 can be deferred to implementation time.
