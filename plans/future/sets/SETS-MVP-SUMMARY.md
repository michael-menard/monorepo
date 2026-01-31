---
doc_type: summary
title: "SETS MVP - Unified Model Approach"
status: draft
created_at: "2026-01-30T12:00:00-07:00"
---

# SETS MVP - Unified Model Approach

## Decision

Replace the 17-story SETS epic with 4 stories that extend the existing WISH feature using a unified data model.

## Rationale

A wishlist item is fundamentally "a set that hasn't been purchased yet." Rather than building parallel infrastructure for Sets and Wishlist, we:

1. Add `status` field to distinguish wishlist vs owned
2. Add owned-specific fields (purchase details, build status)
3. Extend "Got it" flow to update status instead of create+delete
4. Reuse gallery infrastructure for collection view

## Before vs After

### Original SETS Epic (17 stories)

| Story | Feature | Points |
|-------|---------|--------|
| SETS-005 | Add Modal with URL Scrape | 5 |
| SETS-006 | Purchase Details Form | 3 |
| SETS-007 | Sets CRUD API Endpoints | 8 |
| SETS-008 | Wishlist 'Got it' Integration | 8 |
| SETS-009 | Build Status Toggle | 3 |
| SETS-010 | Quantity Stepper | 3 |
| SETS-011 | MOC Linking | 5 |
| SETS-012 | Hard Delete | 2 |
| SETS-013 | Manual Entry Form | 3 |
| SETS-014 | Sort and Filter | 3 |
| SETS-015 | Tag Management | 3 |
| SETS-016 | Collection Stats | 3 |
| SETS-017 | Empty States | 2 |
| SETS-018 | Duplicate Detection | 3 |
| SETS-019 | Accessibility | 5 |
| SETS-020 | Mobile Responsive | 3 |
| SETS-021 | Got it Success Experience | 3 |
| **Total** | | **~64 points** |

### New SETS-MVP (4 stories)

| Story | Feature | Points | Notes |
|-------|---------|--------|-------|
| SETS-MVP-001 | Unified Schema Extension | 2 | Add status + owned fields |
| SETS-MVP-002 | Collection View | 3 | Reuse gallery, filter by status |
| SETS-MVP-003 | Extended Got It Flow | 3 | Add purchase details step |
| SETS-MVP-004 | Build Status Toggle | 2 | Simple toggle component |
| **Total** | | **10 points** | **84% reduction** |

## What's Included in MVP

- View collection (owned items)
- Add items to collection via "Got it" flow
- Capture purchase details (price, date, tax, shipping)
- Toggle build status (built/in pieces)
- Basic collection stats
- Undo support

## What's Deferred (Future Enhancements)

| Feature | Original Story | Priority |
|---------|----------------|----------|
| Quantity management | SETS-010 | Medium |
| MOC linking | SETS-011 | Medium |
| Duplicate detection | SETS-018 | Low |
| Advanced sorting/filtering | SETS-014 | Low |
| Tag management | SETS-015 | Low |
| Direct add to collection (bypass wishlist) | SETS-005 | Low |
| Mobile swipe gestures | SETS-020 | Low |

## Unified Data Model

```
user_sets (formerly wishlist_items)
──────────────────────────────────────
id, userId

status: 'wishlist' | 'owned'          ← Key distinction

# Shared fields
title, store, setNumber, sourceUrl, imageUrl
pieceCount, releaseDate, tags, notes
price, currency

# Wishlist-specific
priority, sortOrder

# Owned-specific
purchaseDate, purchasePrice, purchaseTax, purchaseShipping
buildStatus: 'in_pieces' | 'built'
statusChangedAt

createdAt, updatedAt
```

## "Got It" Flow (Simplified)

```
BEFORE (separate tables):
┌─────────────────────────────────────┐
│  Transaction {                      │
│    INSERT INTO sets (...)           │
│    DELETE FROM wishlist_items (...)  │
│  }                                  │
│  Risk: Partial failure = data loss  │
└─────────────────────────────────────┘

AFTER (unified model):
┌─────────────────────────────────────┐
│  UPDATE user_sets                   │
│  SET status = 'owned',              │
│      purchaseDate = ...,            │
│      buildStatus = 'in_pieces'      │
│  WHERE id = ?                       │
│  Risk: None (atomic single-row)     │
└─────────────────────────────────────┘
```

## Migration Path

1. **SETS-MVP-001**: Add new columns to existing table
2. All existing data becomes `status = 'wishlist'` (default)
3. No data migration needed
4. Existing WISH features continue working unchanged

## Edge Cases

### "Own one, want another"
User can have multiple rows for the same setNumber:
- Row 1: `setNumber=75192, status='owned'` (the one they have)
- Row 2: `setNumber=75192, status='wishlist'` (the one they want)

This naturally supports the use case without special handling.

## Dependencies

```
WISH-2000 (Schema)
    ↓
SETS-MVP-001 (Unified Schema)
    ↓
┌───────────────┬───────────────┐
│               │               │
SETS-MVP-002    SETS-MVP-003
(Collection)    (Got It Flow)
│               │
└───────┬───────┘
        ↓
   SETS-MVP-004
   (Build Toggle)
```

## Recommendation

Proceed with SETS-MVP approach:
- Ship core collection functionality faster
- Reduce complexity and maintenance burden
- Defer advanced features until user feedback validates need
- Keep codebase DRY (single gallery implementation)
