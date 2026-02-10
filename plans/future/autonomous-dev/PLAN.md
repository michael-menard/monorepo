# Autonomous Development System (AUTO)

## Vision

A headless, daemon-based development system that can work through a backlog of stories unattended while you're away—with real-time monitoring, cost controls, and automatic quality gates.

**The dream:** Point it at a directory, go to work, come home to completed features ready for review.

---

## Prerequisites

This plan depends on **WINT** (Workflow Intelligence System) being substantially complete:

| WINT Phase | Required For |
|------------|--------------|
| Phase 0: Bootstrap | Database schemas, MCP tools |
| Phase 1: Foundation | Story management, worktree integration |
| Phase 3: Telemetry | Progress tracking, cost monitoring |
| Phase 4: Graph & Cohesion | Quality gates, evidence requirements |
| Phase 6: Batch Mode | Multi-story processing |
| Phase 9: LangGraph Parity | Durable execution, state persistence |

**Minimum viable prerequisite:** WINT Phases 0, 1, 3, 4, 6, 9 complete.

---

## Story Numbering

Format: `AUTO-{phase}{story}{variant}` (4 digits total)

| Phase | Focus |
|-------|-------|
| 0 | Infrastructure (daemon, queue, state) |
| 1 | Execution Engine (headless workflows) |
| 2 | Monitoring (dashboard, notifications) |
| 3 | Controls (pause, resume, abort, budget) |
| 4 | Intelligence (scheduling, prioritization) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       You (Remote)                               │
│            Phone/Laptop viewing dashboard                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard (Web UI)                            │
│  • Real-time story progress    • Cost tracking                  │
│  • Agent activity log          • Pause/Resume controls          │
│  • Notification center         • PR review queue                │
└─────────────────────────────────────────────────────────────────┘
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Execution Daemon                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Work Queue   │  │ Budget       │  │ Health       │          │
│  │ Manager      │  │ Enforcer     │  │ Monitor      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                              │                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │              LangGraph Executor                   │           │
│  │  • Story workflows as durable graphs             │           │
│  │  • State persistence (resume after crash)        │           │
│  │  • Parallel execution across worktrees           │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (WINT)                             │
│  • Story queue & status      • Telemetry & costs                │
│  • Worktree tracking         • Execution history                │
│  • Gate decisions            • Notification queue               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │Worktree 1│   │Worktree 2│   │Worktree 3│
        │ Story A  │   │ Story B  │   │ Story C  │
        └──────────┘   └──────────┘   └──────────┘
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Execution engine** | LangGraph | Durable execution, state persistence, resumable |
| **Dashboard** | Web UI (React) | Already have React expertise, mobile-friendly |
| **Real-time updates** | WebSocket | Low latency, bidirectional |
| **Notifications** | Slack + Email | Already use Slack, email for async |
| **Cost enforcement** | Hard limits | No soft warnings—hard stop when budget hit |
| **Quality gates** | Auto-pause | Never merge without human review |
| **Parallelism** | Worktree-per-story | Isolation, no git conflicts |

---

## Safety Rails

### Cost Protection
- Daily budget limit (hard stop)
- Weekly budget limit (hard stop)
- Per-story cost estimate before starting
- Real-time cost tracking in dashboard
- Alert at 80% of budget

### Quality Protection
- Never auto-merge to main
- Always create draft PR for review
- Auto-pause on any gate failure
- Auto-pause on low confidence (< 80%)
- Require human approval for "Critical" decisions (from WINT classification)

### Execution Protection
- Health check every 60 seconds
- Auto-pause on repeated failures (3 consecutive)
- Maximum execution time per story (4 hours default)
- Graceful shutdown (complete current phase, don't abandon mid-work)

---

## User Experience

### Starting a Run

```bash
# Point at a feature directory, set budget
auto-dev start plans/future/wint \
  --daily-budget 50 \
  --max-parallel 3 \
  --schedule "08:00-18:00" \
  --notify slack,email

# Output:
# Daemon started (PID 12345)
# Dashboard: http://localhost:3100
# Found 7 stories ready to start
# Estimated cost: $35-45
# Starting in 60 seconds (Ctrl+C to cancel)
```

### Checking Status (Mobile)

```
┌─────────────────────────────────┐
│  AUTO Dashboard          12:34 │
├─────────────────────────────────┤
│  Running: 2 stories            │
│  Completed: 3 stories          │
│  Paused: 1 (needs decision)    │
│  Queued: 4 stories             │
│                                │
│  Cost today: $18.42 / $50.00   │
│  ████████░░░░░░░░░░ 37%       │
│                                │
│  [Pause All]  [View PRs]       │
└─────────────────────────────────┘
```

### Coming Home

```
┌─────────────────────────────────────────────────────────────────┐
│  Daily Summary - Feb 9, 2026                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Completed (3 PRs ready for review):                            │
│  ✓ WINT-0180 - Examples Framework           $4.21  [Review PR]  │
│  ✓ WINT-0190 - Patch Queue Pattern          $3.87  [Review PR]  │
│  ✓ WINT-0200 - User Flows Schema            $2.94  [Review PR]  │
│                                                                  │
│  Paused (needs your input):                                     │
│  ⏸ WINT-0210 - Role Pack Templates                              │
│    → Decision required: "Which roles to include first?"         │
│    [Resume with A] [Resume with B] [Skip Story]                 │
│                                                                  │
│  Failed (auto-paused):                                          │
│  ✗ WINT-1130 - Worktree Tracking                                │
│    → QA gate failed: missing test for edge case                 │
│    [View Details] [Retry] [Skip Story]                          │
│                                                                  │
│  Still Running:                                                  │
│  ◐ WINT-3090 - Scoreboard Metrics (78% complete)                │
│                                                                  │
│  Total cost: $23.41                                             │
│  Budget remaining: $26.59                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Stories completed per day (unattended) | 3-5 |
| Human review time per story | < 15 min |
| Auto-pause accuracy (should have paused) | > 95% |
| Cost per story | < $10 avg |
| False positive pauses | < 10% |
| Time to first PR (from start) | < 2 hours |

---

## Non-Goals

- Full CI/CD replacement (this is for feature development, not deployment)
- Multi-repo support (single repo focus)
- Team collaboration features (solo developer tool)
- Mobile app (web dashboard is sufficient)
- Voice control (tempting but overkill)

---

## Open Questions

1. **Local vs cloud execution?** Start local (your machine), cloud later if needed
2. **How to handle rate limits?** Exponential backoff, queue management
3. **What if machine sleeps?** Require "caffeinate" mode or wake-on-schedule
4. **PR review automation?** Just create draft PRs, human reviews

---

## References

- WINT Plan: `plans/future/wint/PLAN.md`
- LangGraph docs: Phase 9 of WINT
- Batch mode: WINT Phase 6

---

**Created**: 2026-02-09
**Status**: Draft (depends on WINT completion)
**Epic**: AUTO
**Estimated**: 8-12 weeks (after WINT Phase 9)
