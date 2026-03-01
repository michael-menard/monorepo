# ADR-001: APIP Architecture Decisions

**Date:** 2026-02-25
**Status:** Accepted

## Decision 1: BullMQ + Redis for Queue Backend

**Decision:** Use BullMQ with existing Redis/ElastiCache infrastructure instead of custom PostgreSQL queue.

**Rationale:**
- Existing Redis/ElastiCache infrastructure already deployed
- BullMQ provides built-in retry, delay, priority, rate limiting, concurrency, and Bull Board UI
- Eliminates custom pg_notify reconnection handling, heartbeat reaper, and state machine code
- Redis AOF persistence ensures queue items survive restarts

**Consequences:**
- APIP-0010 scope changes: no longer a PostgreSQL migration + QueueRepository. Becomes BullMQ queue setup + Redis persistence config.
- APIP-2010 scope shrinks: BullMQ provides built-in failed job handling and visibility. Story focuses on notification integration only.
- pg_notify removed from architecture entirely.
- `wint.work_queue` PostgreSQL table eliminated. Queue state lives in Redis.

**Persistence:** Redis AOF (appendonly yes) with fsync every second. On restart, BullMQ reloads all pending/delayed/failed jobs from Redis automatically.

## Decision 2: Plain TypeScript Supervisor for Phase 0

**Decision:** Implement the supervisor as a plain TypeScript async loop, not a LangGraph graph.

**Rationale:**
- The supervisor is a polling + dispatch loop — LangGraph adds nested checkpoint complexity without Phase 0 benefit
- Plain loop is easier to test, debug, and reason about
- LangGraph reserved for worker graphs (elaboration, implementation, review, QA, merge) where checkpointing provides genuine value
- Revisit LangGraph supervisor in Phase 2+ if supervisor needs its own checkpointing

**Consequences:**
- APIP-0020 scope changes: supervisor is a TypeScript process with BullMQ worker, not a LangGraph graph
- No LangGraph checkpoint / work queue state reconciliation problem in Phase 0
- Thread ID convention still needed for worker graph checkpoints (not supervisor)

## Decision 3: APIP-1020 as Research Spike

**Decision:** Rewrite APIP-1020 (Diff Planner) as a research spike focused on ChangeSpec schema design and validation before any integration code.

**Rationale:**
- ChangeSpec schema is the contract between 6+ downstream systems (implementation loop, review, QA, telemetry, affinity, merge)
- Retrofitting schema changes after Phase 1 is extremely costly (ENG-001)
- Spike validates: schema design, decomposition quality on real stories, model cost per decomposition

**Consequences:**
- APIP-1020 becomes type: spike with research deliverables (schema ADR, 10+ real story decompositions, quality metrics)
- Integration code (connecting diff planner to implementation graph) moves to a follow-up story
- Phase 1 cannot start integration until spike validates schema

## Decision 4: Local Dedicated Server (No Lambda)

**Decision:** All pipeline components run on a dedicated local server. No AWS Lambda.

**Rationale:**
- User preference for local execution
- Avoids Lambda 15-minute timeout constraint
- Simplifies deployment (Docker Compose on local server)

**Consequences:**
- APIP-0030 (LangGraph Platform Docker) proceeds as planned
- APIP-5006 (Server Infrastructure Baseline) remains on critical path
- No Lambda async alternative evaluated
