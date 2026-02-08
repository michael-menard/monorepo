---
doc_type: roadmap
title: "INST - MOC Instructions Roadmap"
status: active
story_prefix: "INST"
created_at: "2026-01-24T15:00:00-07:00"
updated_at: "2026-02-05T00:00:00-07:00"
---

# INST - MOC Instructions Roadmap

## Architecture: Vertical Slices

Each Phase 1 story delivers **end-to-end user value**:

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│  Gallery Page │ Detail Page │ Create Form │ Edit Form       │
├─────────────────────────────────────────────────────────────┤
│                     RTK QUERY                               │
│  useGetMocs │ useGetMoc │ useCreateMoc │ useUpdateMoc       │
├─────────────────────────────────────────────────────────────┤
│                     API LAYER                               │
│  GET /mocs │ GET /mocs/:id │ POST /mocs │ PATCH /mocs/:id   │
├─────────────────────────────────────────────────────────────┤
│                     DATABASE                                │
│  mocs table │ moc_files table │ upload_sessions table       │
└─────────────────────────────────────────────────────────────┘
```

## Execution Waves

| Wave | Stories | Parallel | Focus |
|------|---------|----------|-------|
| 1 | INST-1003, INST-1008 | 2 | Infrastructure (types + RTK) |
| 2 | INST-1004, INST-1100, INST-1102 | 3 | Config + Gallery + Create |
| 3 | INST-1101, INST-1103, INST-1104, INST-1106 | 4 | Detail page + file uploads |
| 4 | INST-1105, INST-1107, INST-1108, INST-1109, INST-1110 | 5 | Presigned + CRUD complete |
| 5 | INST-1200 - INST-1204 | 5 | UX & Reliability |
| 6 | INST-1300, INST-1301 | 2 | Testing & Validation |
| 7+ | Phase 4-9 | varies | Extended features |

## Dependency Graph

```
INST-1003 (Upload Types) ──┬──► INST-1004 (Upload Config) ──► INST-1105 (Presigned Upload)
                           │
INST-1008 (RTK Mutations) ─┼──► INST-1100 (Gallery) ──► INST-1101 (Detail) ──┬──► INST-1107 (Download)
                           │                                                  ├──► INST-1108 (Edit)
                           │                                                  ├──► INST-1109 (Delete)
                           │                                                  └──► INST-1110 (Remove File)
                           │
                           └──► INST-1102 (Create) ──┬──► INST-1103 (Thumbnail)
                                                     ├──► INST-1104 (Instructions Direct)
                                                     └──► INST-1106 (Parts List)
```

## Phase Summary

| Phase | Name | Stories | Description |
|-------|------|---------|-------------|
| 0 | Infrastructure | 3 | Package extraction, RTK mutations |
| 1 | Core Vertical Slices | 11 | Full-stack user journeys (CRUD) |
| 2 | UX & Reliability | 5 | Polish, error handling, a11y |
| 3 | Testing | 2 | Coverage, flow validation |
| 4 | Files & Security | 5 | Gallery images, virus scan |
| 5 | Upload UX | 4 | Drag-drop, progress |
| 6 | Search | 2 | Sort, autocomplete |
| 7 | Parts Integration | 2 | Inventory, shopping list |
| 8 | UI Polish | 4 | Shortcuts, empty states |
| 9 | Moderation | 1 | Content flagging |

## Critical Path

The minimum path to a working MOC management system:

```
INST-1008 → INST-1100 → INST-1101 → INST-1102 → INST-1104 → INST-1108
   RTK       Gallery     Detail      Create      Upload      Edit
```

6 stories to basic functionality.

## High Risk Stories

| Story | Risk | Mitigation |
|-------|------|------------|
| INST-1101 | Complex UI from v0 design | Migrate types to Zod, validate patterns |
| INST-1105 | Presigned URL AWS integration | Early spike, 50MB test |
| INST-1003 | Package extraction breaks consumers | Full test suite after |

## Ready to Start

| Story | Title | Blocked By |
|-------|-------|------------|
| INST-1003 | Extract Upload Types Package | None |
| INST-1008 | Wire RTK Query Mutations | None |

## Deferred to Post-MVP

| Feature | Future Story |
|---------|--------------|
| Multipart upload (>100MB) | INST-3010 |
| File reordering | INST-3020 |
| Parts List Parsing | INST-3040 |
| Mobile/PWA | INST-3060+ |
