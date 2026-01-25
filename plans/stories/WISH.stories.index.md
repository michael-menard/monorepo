---
doc_type: stories_index
title: "WISH — Wishlist Stories Index"
status: active
story_prefix: WISH
created_at: "2026-01-24T02:00:00-07:00"
updated_at: "2026-01-24T02:00:00-07:00"
---

# WISH — Wishlist Stories Index

## Overview

This index tracks all stories for Epic 6: Wishlist Gallery. Stories are organized by phase and execution order.

## Plan Documents

- [Meta Plan](../WISH.plan.meta.md) - Project principles and data model
- [Execution Plan](../WISH.plan.exec.md) - Phases, dependencies, and execution order
- [Roadmap](../WISH.roadmap.md) - Visual dependency graph and critical path

## Original Story Source

Stories were consolidated from: `plans/future/wishlist/`

---

## Stories by Phase

### Phase 1: Foundation

| Story ID | Title | Status | Points | Folder |
|----------|-------|--------|--------|--------|
| WISH-2000 | Database Schema & Types | Ready for Review | 3 | [WISH-2000](./WISH/WISH-2000/) |
| WISH-2007 | Run Migration | Approved | 1 | [WISH-2007](./WISH/WISH-2007/) |

### Phase 2: Gallery MVP (Vertical Slice)

| Story ID | Title | Status | Points | Folder |
|----------|-------|--------|--------|--------|
| WISH-2001 | Gallery MVP | Ready for Review | 8 | [WISH-2001](./WISH/WISH-2001/) |

### Phase 3: Core Features

| Story ID | Title | Status | Points | Folder |
|----------|-------|--------|--------|--------|
| WISH-2002 | Add Item Flow | Approved | 5 | [WISH-2002](./WISH/WISH-2002/) |
| WISH-2003 | Detail & Edit Pages | Done | 5 | [WISH-2003](./WISH/WISH-2003/) |
| WISH-2004 | Modals & Transitions | Approved | 8 | [WISH-2004](./WISH/WISH-2004/) |

### Phase 4: UX Polish

| Story ID | Title | Status | Points | Folder |
|----------|-------|--------|--------|--------|
| WISH-2005 | UX Polish | Draft | 5 | [WISH-2005](./WISH/WISH-2005/) |

### Phase 5: Accessibility

| Story ID | Title | Status | Points | Folder |
|----------|-------|--------|--------|--------|
| WISH-2006 | Accessibility | Draft | 5 | [WISH-2006](./WISH/WISH-2006/) |

---

## Status Legend

| Status | Description |
|--------|-------------|
| Draft | Not yet ready for review |
| Ready for Review | Elaboration complete, awaiting approval |
| Approved | Approved, ready to implement |
| In Progress | Currently being implemented |
| In Review | Code review or QA in progress |
| Done | Completed and merged |
| Blocked | Waiting on external dependency |

---

## Progress Summary

| Status | Count |
|--------|-------|
| Done | 1 |
| Approved | 3 |
| Ready for Review | 2 |
| Draft | 2 |
| **Total** | **7** |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Status | Blocked By |
|-------|---------|--------|------------|
| WISH-2000 | Database Schema & Types | Ready for Review | — |

---

## Point Totals

| Category | Points |
|----------|--------|
| Foundation (Phase 1) | 4 |
| Gallery MVP (Phase 2) | 8 |
| Core CRUD (Phase 3) | 18 |
| UX Polish (Phase 4) | 5 |
| Accessibility (Phase 5) | 5 |
| **Total** | **40** |

---

## Quick Links

### Command Reference

```bash
/elab-story WISH-2000
/dev-implement-story WISH-2000
/qa-verify-story WISH-2000
/scrum-master WISH-2000
```

### MVP Stories (Priority)
1. [WISH-2000: Database Schema & Types](./WISH/WISH-2000/)
2. [WISH-2007: Run Migration](./WISH/WISH-2007/)
3. [WISH-2001: Gallery MVP](./WISH/WISH-2001/)

### Core Features
4. [WISH-2002: Add Item Flow](./WISH/WISH-2002/)
5. [WISH-2003: Detail & Edit Pages](./WISH/WISH-2003/)
6. [WISH-2004: Modals & Transitions](./WISH/WISH-2004/)

### Polish
7. [WISH-2005: UX Polish](./WISH/WISH-2005/)
8. [WISH-2006: Accessibility](./WISH/WISH-2006/)

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-24 02:00 | pm-bootstrap-generation-leader | Created stories index | WISH.stories.index.md |
