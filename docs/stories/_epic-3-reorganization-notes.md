# Epic 3 Story Reorganization Notes

## Overview

This document outlines the reorganization of Epic 3 (Gallery) stories following the decision to create:
1. A shared `@repo/gallery` package for reusable components
2. Four distinct gallery pages: Instructions, Inspiration, Wishlist, and Sets

## New Story Structure

### 3.0.x - @repo/gallery Shared Package
| New Story | Replaces/Consolidates |
|-----------|----------------------|
| 3.0.1 Gallery Package Scaffolding | 3.1 (partial) |
| 3.0.2 Gallery Grid Component | 3.6 Collection Grid |
| 3.0.3 Gallery Card Component | 3.5 MOC Card (base only) |
| 3.0.4 Gallery Search Component | 3.8 Search Input |
| 3.0.5 Gallery Filter Components | 3.10 Tag Filter, 3.11 Theme Filter, 3.13 Clear Filters |
| 3.0.6 Gallery Sort Component | (new) |
| 3.0.7 Gallery Pagination/Infinite Scroll | 3.7 Infinite Scroll |
| 3.0.8 Gallery Lightbox Component | 3.20 Image Lightbox |
| 3.0.9 Gallery Empty States | 3.14 No Results, 3.15 Empty State |
| 3.0.10 Gallery Types & Hooks | 3.2 API Slice (types), 3.12 URL State Sync |

### 3.1.x - Instructions Gallery
| New Story | Replaces/Consolidates |
|-----------|----------------------|
| 3.1.1 Instructions Gallery Scaffolding | 3.1 Gallery Scaffolding (refocused) |
| 3.1.2 Instructions Card Component | 3.5 MOC Card (instructions-specific) |
| 3.1.3 Instructions API Endpoints | 3.3 Get MOCs, 3.4 Get MOC by ID, 3.9 Search Integration |
| 3.1.4 Instructions Detail Page | 3.16-3.19 MOC Detail stories |

### 3.2.x - Inspiration Gallery
| New Story | Notes |
|-----------|-------|
| 3.2.1 Inspiration Gallery Scaffolding | New |
| 3.2.2 Inspiration Card Component | New |
| 3.2.3 Inspiration API Endpoints | New |
| 3.2.4 Inspiration Upload Page | New |
| 3.2.5 Inspiration Collection Management | New |
| 3.2.6 Inspiration Link to MOC | New |

### 3.3.x - Wishlist Gallery
| New Story | Notes |
|-----------|-------|
| 3.3.1 Wishlist Gallery Scaffolding | New |
| 3.3.2 Wishlist Card Component | New |
| 3.3.3 Wishlist API Endpoints | New |
| 3.3.4 Wishlist Add Item Page | New |

### 3.4.x - Sets Gallery
| New Story | Notes |
|-----------|-------|
| 3.4.1 Sets Gallery Scaffolding | New |
| 3.4.2 Sets Card Component | New |
| 3.4.3 Sets API Endpoints | New |
| 3.4.4 Sets Detail Page | New |
| 3.4.5 Sets Add Page | New |

## Removed Stories

The following original 3.x stories have been **deleted** (2025-11-30) as they are now covered by the new structure:

### Deleted Stories (3.1-3.26)
| Original | Replaced By |
|----------|-------------|
| 3.1 Gallery Scaffolding | 3.0.1, 3.1.1 |
| 3.2 Gallery API Slice | 3.0.10, 3.1.3 |
| 3.3 Get MOCs Endpoint | 3.1.3 |
| 3.4 Get MOC by ID | 3.1.3 |
| 3.5 MOC Card Component | 3.0.3, 3.1.2 |
| 3.6 Collection Grid | 3.0.2 |
| 3.7 Infinite Scroll | 3.0.7 |
| 3.8 Search Input | 3.0.4 |
| 3.9 Search Integration | Each API story |
| 3.10 Tag Filter | 3.0.5 |
| 3.11 Theme Filter | 3.0.5 |
| 3.12 URL State Sync | 3.0.10 |
| 3.13 Clear Filters | 3.0.5 |
| 3.14 No Results State | 3.0.9 |
| 3.15 Collection Empty State | 3.0.9 |
| 3.16 MOC Detail Page | 3.1.4 |
| 3.17 MOC Detail Header | 3.1.4 |
| 3.18 Image Thumbnail Strip | 3.1.4 |
| 3.19 Main Image Display | 3.0.8, 3.1.4 |
| 3.20 Image Lightbox | 3.0.8 |
| 3.21 File List PDFs | Future 3.1.x |
| 3.22 File List Parts | Future 3.1.x |
| 3.23 Edit MOC Link | Future 3.1.x |
| 3.24 Breadcrumb Navigation | Epic 1 shared UI |
| 3.25 Gallery Loading States | 3.0.9 |
| 3.26 Gallery Unit Tests | Each story's Testing section |

### Future Considerations
Stories 3.21-3.24 (File List PDFs, File List Parts, Edit MOC Link, Breadcrumb Navigation) may warrant new stories in the future:
- File list features could be added as 3.1.5, 3.1.6
- Breadcrumb navigation could be a shared UI component in Epic 1

## Recommended Implementation Order

Prioritize implementation:
   - 3.0.x (shared package) first - foundation for all galleries
   - 3.1.x (Instructions) second - primary use case
   - 3.4.x (Sets) third - complements Instructions
   - 3.2.x (Inspiration) fourth - new feature
   - 3.3.x (Wishlist) fifth - new feature

## Story Count Summary

| Category | Count |
|----------|-------|
| 3.0.x Shared Package | 10 stories |
| 3.1.x Instructions | 4 stories |
| 3.2.x Inspiration | 6 stories |
| 3.3.x Wishlist | 4 stories |
| 3.4.x Sets | 5 stories |
| **Total New Stories** | **29 stories** |
| Original 3.x Stories | 26 stories |
| Net New Stories | +3 stories |

The slight increase is due to the addition of entirely new features (Inspiration, Wishlist, Sets galleries) that weren't in the original scope.

---

*Created: 2025-11-30*
*Author: SM Agent (Bob)*
