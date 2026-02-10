---
doc_type: stories_index
title: "AUTO Stories Index"
status: draft
story_prefix: "AUTO"
created_at: "2026-02-09T23:00:00Z"
updated_at: "2026-02-09T23:00:00Z"
---

# AUTO Stories Index

Autonomous Development System - Headless, daemon-based story execution with real-time monitoring.

**Prerequisite:** WINT Phases 0, 1, 3, 4, 6, 9 must be complete before starting.

All stories use `AUTO-{phase}{story}{variant}` format.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| in-progress | 0 |
| pending | 28 |

---

## Ready to Start (after WINT prerequisites)

| Story | Feature | Blocked By |
|-------|---------|------------|
| AUTO-0010 | Create execution state schema | WINT-0010 |
| AUTO-0020 | Create work queue schema | WINT-0010 |

---

## Phase 0: Infrastructure

Database schemas, daemon skeleton, state management for autonomous execution.

### AUTO-0010: Create Execution State Schema

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Add execution tables to database: daemon_runs (id, started_at, status, config), execution_sessions (id, daemon_run_id, story_id, worktree_id, status, started_at, completed_at, cost), execution_events (id, session_id, event_type, payload, timestamp).
**Infrastructure:**
- New schema: autonomous
- Tables for tracking daemon state

**Goal:** Persistent state for daemon execution that survives restarts

**Risk Notes:** Must handle daemon crashes gracefully

---

### AUTO-0020: Create Work Queue Schema

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Add work queue tables: work_queue (id, story_id, priority, status, queued_at, claimed_by, started_at), queue_config (max_parallel, budget_daily, budget_weekly, schedule_start, schedule_end).
**Infrastructure:**
- autonomous.work_queue table
- autonomous.queue_config table

**Goal:** Database-backed work queue for reliable job distribution

**Risk Notes:** Need atomic claim operations to prevent double-execution

---

### AUTO-0030: Create Daemon Skeleton

**Status:** pending
**Depends On:** AUTO-0010, AUTO-0020
**Phase:** 0
**Feature:** Create TypeScript daemon process with: process management (start/stop/status), config loading, graceful shutdown, health check endpoint, PID file management.
**Infrastructure:**
- packages/backend/auto-daemon/
- CLI entry point

**Goal:** Reliable long-running process that can be managed remotely

**Risk Notes:** Must not orphan child processes on shutdown

---

### AUTO-0040: Create Budget Enforcement Module

**Status:** pending
**Depends On:** AUTO-0020, WINT-3020
**Phase:** 0
**Feature:** Create budget enforcer that: tracks cost per session from telemetry, enforces daily/weekly hard limits, pauses all work when budget hit, alerts at 80% threshold, resumes on new budget period.
**Infrastructure:**
- Budget tracking logic
- Integration with WINT telemetry

**Goal:** Never exceed configured cost limits

**Risk Notes:** Cost calculation must be accurate and real-time

---

### AUTO-0050: Create Health Monitor

**Status:** pending
**Depends On:** AUTO-0030
**Phase:** 0
**Feature:** Create health monitor that: pings every 60 seconds, detects stuck sessions (no progress for 10 min), detects repeated failures, auto-pauses on health issues, exposes /health endpoint.
**Infrastructure:**
- Health check logic
- HTTP endpoint

**Goal:** Detect and respond to execution problems automatically

**Risk Notes:** Must distinguish "slow" from "stuck"

---

## Phase 1: Execution Engine

Headless story execution using LangGraph with parallel worktree support.

### AUTO-1010: Create LangGraph Story Executor

**Status:** pending
**Depends On:** AUTO-0030, WINT-9110
**Phase:** 1
**Feature:** Create executor that runs WINT LangGraph story workflow in headless mode: no terminal interaction, all HiTL decisions logged for later, state persisted to DB, resumable after crash.
**Infrastructure:**
- LangGraph runtime integration
- State persistence adapter

**Goal:** Execute full story workflow without human interaction

**Risk Notes:** Must handle all HiTL points gracefully (pause or auto-decide)

---

### AUTO-1020: Integrate Worktree Manager

**Status:** pending
**Depends On:** AUTO-1010, WINT-1140
**Phase:** 1
**Feature:** Integrate worktree management: auto-create worktree per story, track in database, cleanup on completion, handle conflicts (story already has worktree).
**Infrastructure:**
- Integration with WINT worktree tracking

**Goal:** Isolated execution per story with automatic cleanup

**Risk Notes:** Disk space management for many worktrees

---

### AUTO-1030: Create Parallel Executor

**Status:** pending
**Depends On:** AUTO-1020
**Phase:** 1
**Feature:** Enable parallel story execution: respect max_parallel config, independent worktrees per story, aggregate cost across all sessions, coordinate shared resources (git operations).
**Infrastructure:**
- Worker pool management
- Resource coordination

**Goal:** Execute N stories simultaneously for faster throughput

**Risk Notes:** Git operations need serialization to avoid conflicts

---

### AUTO-1040: Create Decision Queue

**Status:** pending
**Depends On:** AUTO-1010
**Phase:** 1
**Feature:** When executor hits HiTL decision point: pause execution, store decision context to decision_queue table, mark session as "waiting_for_human", resume when decision provided via dashboard.
**Infrastructure:**
- autonomous.decision_queue table
- Resume logic

**Goal:** Graceful pause at decision points, resume without losing context

**Risk Notes:** Decision context must be complete enough for human to decide

---

### AUTO-1050: Create Auto-PR Generator

**Status:** pending
**Depends On:** AUTO-1010
**Phase:** 1
**Feature:** On successful story completion: create draft PR via gh CLI, include story summary and changes, link to telemetry/evidence, add to PR review queue in dashboard.
**Infrastructure:**
- GitHub integration
- PR template

**Goal:** Every completed story has a reviewable PR ready

**Risk Notes:** PR description must be useful, not just auto-generated noise

---

### AUTO-1060: Implement Confidence-Based Pause

**Status:** pending
**Depends On:** AUTO-1010, WINT-5100
**Phase:** 1
**Feature:** At each gate check: if confidence < 80%, auto-pause instead of proceeding. Store gate context for human review. Resume with human override or retry.
**Infrastructure:**
- Gate confidence extraction
- Pause/resume logic

**Goal:** Never proceed with low confidence, always pause for human

**Risk Notes:** Confidence threshold may need tuning

---

## Phase 2: Monitoring

Real-time dashboard and notification system.

### AUTO-2010: Create Dashboard Backend

**Status:** pending
**Depends On:** AUTO-0030, AUTO-1010
**Phase:** 2
**Feature:** Create API backend for dashboard: REST endpoints for status/config/control, WebSocket for real-time updates, authentication (local token), aggregate views (daily summary, cost, progress).
**Infrastructure:**
- packages/backend/auto-dashboard-api/
- WebSocket server

**Goal:** Real-time visibility into execution state

**Risk Notes:** WebSocket must handle reconnection gracefully

---

### AUTO-2020: Create Dashboard Frontend

**Status:** pending
**Depends On:** AUTO-2010
**Phase:** 2
**Feature:** Create React dashboard: story progress cards, cost tracking with budget bar, agent activity log, decision queue, PR review queue, responsive for mobile.
**Infrastructure:**
- apps/web/auto-dashboard/
- WebSocket client

**Goal:** At-a-glance status from phone or laptop

**Risk Notes:** Must work well on mobile (primary use case)

---

### AUTO-2030: Create Execution Timeline View

**Status:** pending
**Depends On:** AUTO-2020
**Phase:** 2
**Feature:** Visual timeline showing: which stories ran when, duration per phase, pauses and resumes, cost accumulation over time, parallel execution visualization.
**Infrastructure:**
- Timeline component
- Historical data queries

**Goal:** Understand what happened while you were away

**Risk Notes:** Large timelines need virtualization

---

### AUTO-2040: Create Decision Review UI

**Status:** pending
**Depends On:** AUTO-2020, AUTO-1040
**Phase:** 2
**Feature:** UI for reviewing queued decisions: show full context, options with recommendations, quick-action buttons, batch decision mode (decide multiple at once).
**Infrastructure:**
- Decision review component
- Batch operations

**Goal:** Quickly resolve paused stories with good context

**Risk Notes:** Context must be sufficient for informed decision

---

### AUTO-2050: Create Slack Notifications

**Status:** pending
**Depends On:** AUTO-0030
**Phase:** 2
**Feature:** Slack integration: story completed notification, decision needed notification, budget warning (80%), budget exceeded (paused), daily summary at end of day.
**Infrastructure:**
- Slack webhook integration
- Notification templates

**Goal:** Stay informed without watching dashboard constantly

**Risk Notes:** Avoid notification spam, batch where possible

---

### AUTO-2060: Create Email Notifications

**Status:** pending
**Depends On:** AUTO-0030
**Phase:** 2
**Feature:** Email integration: daily summary email, critical alerts (budget exceeded, repeated failures), weekly progress report.
**Infrastructure:**
- Email service integration (SES or similar)
- Email templates

**Goal:** Async notification for when not watching Slack

**Risk Notes:** Email deliverability, avoid spam filters

---

### AUTO-2070: Create Execution Replay

**Status:** pending
**Depends On:** AUTO-2020, WINT-3020
**Phase:** 2
**Feature:** View detailed replay of story execution: every agent invocation, decisions made (auto or human), files changed, time spent per phase, cost breakdown.
**Infrastructure:**
- Replay component
- Telemetry queries

**Goal:** Understand exactly what happened for review/debugging

**Risk Notes:** Large stories may have lots of events

---

## Phase 3: Controls

Remote pause, resume, abort, and configuration management.

### AUTO-3010: Create Remote Pause/Resume

**Status:** pending
**Depends On:** AUTO-2010
**Phase:** 3
**Feature:** Dashboard controls to: pause all execution, pause specific story, resume paused stories, graceful pause (complete current phase) vs immediate pause.
**Infrastructure:**
- Control endpoints
- Graceful pause logic

**Goal:** Stop execution remotely when needed

**Risk Notes:** Immediate pause may leave story in inconsistent state

---

### AUTO-3020: Create Remote Abort

**Status:** pending
**Depends On:** AUTO-3010
**Phase:** 3
**Feature:** Abort controls: abort specific story (cleanup worktree, mark abandoned), abort all (graceful shutdown), option to keep or discard partial work.
**Infrastructure:**
- Abort logic
- Cleanup procedures

**Goal:** Cleanly stop work that shouldn't continue

**Risk Notes:** Aborting mid-commit could leave git in bad state

---

### AUTO-3030: Create Story Reprioritization

**Status:** pending
**Depends On:** AUTO-2010
**Phase:** 3
**Feature:** Dashboard controls to: reorder queue, move story to front, skip story, add new story to queue, change max_parallel while running.
**Infrastructure:**
- Queue management endpoints
- Priority updates

**Goal:** Adjust execution plan on the fly

**Risk Notes:** Changing priority while executing may be confusing

---

### AUTO-3040: Create Budget Adjustment

**Status:** pending
**Depends On:** AUTO-2010, AUTO-0040
**Phase:** 3
**Feature:** Dashboard controls to: view current budget status, adjust daily/weekly limits, add budget (extend current period), view cost projections.
**Infrastructure:**
- Budget management endpoints
- Projection logic

**Goal:** Control costs without restarting daemon

**Risk Notes:** Increasing budget should require confirmation

---

### AUTO-3050: Create Schedule Management

**Status:** pending
**Depends On:** AUTO-2010
**Phase:** 3
**Feature:** Dashboard controls to: set execution schedule (run 8am-6pm), pause for weekends, set "do not disturb" windows, immediate start/stop override.
**Infrastructure:**
- Schedule management
- Timezone handling

**Goal:** Control when autonomous execution happens

**Risk Notes:** Timezone handling for remote access

---

## Phase 4: Intelligence

Smarter scheduling, prioritization, and learning.

### AUTO-4010: Create Smart Prioritization

**Status:** pending
**Depends On:** AUTO-1030, WINT-5060
**Phase:** 4
**Feature:** Use WINT quality predictor to prioritize queue: stories likely to succeed first, high-value stories first, stories with dependencies together, avoid stories likely to need HiTL early.
**Infrastructure:**
- Integration with WINT ML pipeline
- Priority calculation

**Goal:** Maximize completed stories per day

**Risk Notes:** Predictions may be wrong, need fallback

---

### AUTO-4020: Create Cost Estimation

**Status:** pending
**Depends On:** AUTO-4010, WINT-3050
**Phase:** 4
**Feature:** Before starting story: estimate cost based on similar stories, show estimate in queue, warn if estimate exceeds remaining budget, track estimate vs actual for learning.
**Infrastructure:**
- Cost estimation model
- Estimation accuracy tracking

**Goal:** No surprises on cost, better budget planning

**Risk Notes:** Early estimates will be inaccurate, improves over time

---

### AUTO-4030: Create Failure Pattern Detection

**Status:** pending
**Depends On:** AUTO-1010, WINT-3090
**Phase:** 4
**Feature:** Detect patterns in failures: same agent failing repeatedly, same gate failing, same file causing issues. Auto-pause and alert when pattern detected. Suggest fixes.
**Infrastructure:**
- Pattern detection logic
- Alert generation

**Goal:** Don't waste budget on systemic issues

**Risk Notes:** Patterns may be coincidental

---

### AUTO-4040: Create Optimal Schedule Learning

**Status:** pending
**Depends On:** AUTO-3050, WINT-3020
**Phase:** 4
**Feature:** Learn optimal execution schedule: when are stories most successful, when do most failures happen, when is human response fastest. Suggest schedule adjustments.
**Infrastructure:**
- Schedule analysis
- Recommendation engine

**Goal:** Run at times that maximize success

**Risk Notes:** May not have enough data for learning

---

### AUTO-4050: Create Weekly Improvement Report

**Status:** pending
**Depends On:** AUTO-4010, WINT-6060
**Phase:** 4
**Feature:** Weekly automated report: stories completed, cost efficiency, time to completion trends, common blockers, recommendations for workflow improvements, comparison to previous weeks.
**Infrastructure:**
- Report generation
- Trend analysis

**Goal:** Continuous improvement of autonomous execution

**Risk Notes:** Need enough history for meaningful trends

---

