# Epic 4 & 5 Story Reorganization Notes

## Overview

This document outlines the reorganization of Epic 4 (Instructions MOC Management) and Epic 5 (Wishlist) stories following the Epic 3 Gallery reorganization. These epics have been **consolidated** into the new 3.x gallery stories to eliminate duplication.

## Rationale

The original Epic 4 and Epic 5 stories were created before the decision to:
1. Create a shared `@repo/gallery` package for reusable components
2. Organize all gallery-related features under Epic 3 with subgroups (3.0.x, 3.1.x, 3.2.x, 3.3.x, 3.4.x)

The new structure eliminates duplication and ensures consistent patterns across all galleries.

---

## Epic 4: Instructions MOC Management → 3.1.x Instructions Gallery

### Mapping Table

| Old Story | New Story | Notes |
|-----------|-----------|-------|
| 4.1 Instructions Scaffolding | 3.1.1 Instructions Gallery Scaffolding | Merged |
| 4.2 Instructions API Slice | 3.1.3 Instructions API Endpoints | Merged |
| 4.3 Create MOC Endpoint | 3.1.3 Instructions API Endpoints | Merged |
| 4.4 Update MOC Endpoint | 3.1.3 Instructions API Endpoints | Merged |
| 4.5 Delete MOC Endpoint | 3.1.3 Instructions API Endpoints | Merged |
| 4.6 Upload File Endpoint | 3.1.3 Instructions API Endpoints | Merged |
| 4.7 Delete File Endpoint | 3.1.3 Instructions API Endpoints | Merged |
| 4.8 Add MOC Page | 3.1.4 Instructions Detail Page | Add mode in detail page |
| 4.9 MOC Form Basic | 3.1.4 Instructions Detail Page | Part of detail/edit |
| 4.10 MOC Form Theme | 3.1.4 Instructions Detail Page | Part of detail/edit |
| 4.11 MOC Form Tags | 3.1.4 Instructions Detail Page | Part of detail/edit |
| 4.12 Cover Image Upload | 3.1.4 Instructions Detail Page | Part of detail/edit |
| 4.13 Image Upload Preview | 3.0.8 Gallery Lightbox + 3.1.4 | Shared + specific |
| 4.14 Upload Progress | 3.1.4 Instructions Detail Page | Part of upload flow |
| 4.15 Save MOC Create | 3.1.3 Instructions API Endpoints | Part of API |
| 4.16 Edit MOC Page | 3.1.4 Instructions Detail Page | Edit mode in detail |
| 4.17 Prefill Edit Form | 3.1.4 Instructions Detail Page | Part of edit mode |
| 4.18 Save MOC Update | 3.1.3 Instructions API Endpoints | Part of API |
| 4.19 Delete MOC | 3.1.3 Instructions API Endpoints | Part of API |
| 4.20 File Manager Section | 3.1.4 Instructions Detail Page | Part of detail page |
| 4.21 Upload Additional Images | 3.1.4 Instructions Detail Page | Part of detail page |
| 4.22 Upload Instruction PDFs | 3.1.4 Instructions Detail Page | Part of detail page |
| 4.23 Upload Parts Lists | 3.1.4 Instructions Detail Page | Part of detail page |
| 4.24 File Type Validation | 3.1.3 Instructions API Endpoints | API validation |
| 4.25 File Size Validation | 3.1.3 Instructions API Endpoints | API validation |
| 4.26 Delete Individual File | 3.1.3 Instructions API Endpoints | Part of API |
| 4.27 Replace File | 3.1.3 Instructions API Endpoints | Part of API |
| 4.28 Reorder Images | 3.1.4 Instructions Detail Page | Part of detail page |
| 4.29 Set Cover Image | 3.1.4 Instructions Detail Page | Part of detail page |
| 4.30 Upload Error Handling | 3.1.3 + 3.1.4 | Both API and UI |
| 4.31 Instructions Loading States | 3.0.9 Gallery Empty States | Shared skeletons |
| 4.32 Instructions Unit Tests | Each story's Testing section | Distributed |

### Deleted Stories (32 files)
All 4.x stories have been deleted as they are now covered by the new 3.1.x structure.

---

## Epic 5: Wishlist → 3.3.x Wishlist Gallery

### Mapping Table

| Old Story | New Story | Notes |
|-----------|-----------|-------|
| 5.1 Wishlist Scaffolding | 3.3.1 Wishlist Gallery Scaffolding | Merged |
| 5.2 Wishlist API Slice | 3.3.3 Wishlist API Endpoints | Merged |
| 5.3 Get Wishlist Endpoint | 3.3.3 Wishlist API Endpoints | Merged |
| 5.4 Add Item Endpoint | 3.3.3 Wishlist API Endpoints | Merged |
| 5.5 Update Item Endpoint | 3.3.3 Wishlist API Endpoints | Merged |
| 5.6 Delete Item Endpoint | 3.3.3 Wishlist API Endpoints | Merged |
| 5.7 Wishlist Item Card | 3.3.2 Wishlist Card Component | Merged |
| 5.8 Wishlist List View | 3.0.2 Gallery Grid Component | Shared grid |
| 5.9 Wishlist Grid View | 3.0.2 Gallery Grid Component | Shared grid |
| 5.10 View Toggle | 3.3.1 Wishlist Gallery Scaffolding | Part of scaffolding |
| 5.11 Group By Type | 3.3.1 Wishlist Gallery Scaffolding | Part of scaffolding |
| 5.12 Add Item Button | 3.3.4 Wishlist Add Item Page | Part of add page |
| 5.13 Add Item Modal | 3.3.4 Wishlist Add Item Page | Full page instead |
| 5.14 Add Item Form | 3.3.4 Wishlist Add Item Page | Part of add page |
| 5.15 URL Validation | 3.3.3 + 3.3.4 | API + form validation |
| 5.16 Save New Item | 3.3.3 Wishlist API Endpoints | Part of API |
| 5.17 Edit Item Modal | 3.3.4 Wishlist Add Item Page | Edit mode |
| 5.18 Save Item Changes | 3.3.3 Wishlist API Endpoints | Part of API |
| 5.19 Delete Item | 3.3.3 Wishlist API Endpoints | Part of API |
| 5.20 External Link Handling | 3.3.2 Wishlist Card Component | Part of card |
| 5.21 Wishlist Empty State | 3.0.9 Gallery Empty States | Shared component |
| 5.22 Wishlist Loading State | 3.0.9 Gallery Empty States | Shared skeleton |
| 5.23 Wishlist Unit Tests | Each story's Testing section | Distributed |

### Deleted Stories (23 files)
All 5.x stories have been deleted as they are now covered by the new 3.3.x structure.

---

## Summary

| Category | Stories Deleted | Stories Added (in 3.x) |
|----------|-----------------|------------------------|
| Epic 4 (Instructions) | 32 | Covered by 3.1.1-3.1.4 |
| Epic 5 (Wishlist) | 23 | Covered by 3.3.1-3.3.4 |
| **Total** | **55** | **Already created in Epic 3 reorg** |

## Benefits of Consolidation

1. **No Duplicate Work**: Components like grids, cards, search, filters are built once in @repo/gallery
2. **Consistent Patterns**: All galleries follow the same structure (scaffolding → card → API → detail/add)
3. **Reduced Story Count**: 55 stories consolidated into 8 stories (4 per gallery)
4. **Clearer Dependencies**: Clear layering: 3.0.x (shared) → 3.1-3.4.x (specific galleries)
5. **Easier Testing**: Shared components tested once, gallery-specific tests focused

---

*Created: 2025-11-30*
*Author: SM Agent (Bob)*
