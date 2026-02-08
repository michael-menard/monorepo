---
doc_type: stories_index
title: "INSP Stories Index"
status: active
story_prefix: "INSP"
created_at: "2026-02-04T00:00:00Z"
updated_at: "2026-02-04T00:00:00Z"
---

# INSP Stories Index

All stories in this epic use the `INSP-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 27 |
| superseded | 2 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| INSP-001 | Gallery scaffolding | — |
| INSP-003 | API endpoints (partial) | — |
| INSP-007 | Album data model and nested hierarchy | — |

---

## INSP-001: Gallery Scaffolding

**Status:** pending
**Depends On:** none
**Phase:** 2

**Feature:** Set up basic gallery page structure with routing, layout, and integration with shared gallery package

**Endpoints:** none

**Infrastructure:** none

**Goal:** Establish the foundational gallery page that will host inspiration cards and albums

**Risk Notes:** Existing story (insp-1000). May be partially complete. Integration with shared gallery package required.

---

## INSP-002: Card Component

**Status:** pending
**Depends On:** INSP-001
**Phase:** 2

**Feature:** Create reusable inspiration and album card components for grid display

**Endpoints:** none

**Infrastructure:** none

**Goal:** Build card UI that visually distinguishes between inspirations (single image) and albums (folder icon)

**Risk Notes:** Existing story (insp-1001). May be partially complete. Must support both inspiration and album types.

---

## INSP-003: API Endpoints (Partial)

**Status:** pending
**Depends On:** none
**Phase:** 1

**Feature:** Initial API endpoint stubs for inspiration CRUD operations

**Endpoints:**
- `GET /api/inspirations`
- `GET /api/inspirations/:id`

**Infrastructure:** none

**Goal:** Provide initial read endpoints for inspirations

**Risk Notes:** Existing story (insp-1002). Partial implementation. Will be extended by INSP-010.

---

## INSP-004: Upload Page

**Status:** pending
**Depends On:** INSP-003
**Phase:** 2

**Feature:** Basic upload page for single image upload

**Endpoints:** none

**Infrastructure:** S3 bucket for image storage

**Goal:** Allow users to upload a single inspiration image

**Risk Notes:** Existing story (insp-1003). Basic implementation. Will be replaced/enhanced by INSP-008 multi-image modal.

---

## INSP-005: Collection Management

**Status:** pending
**Depends On:** INSP-002
**Phase:** 3

**Feature:** Basic collection/album management UI

**Endpoints:** none

**Infrastructure:** none

**Goal:** Provide initial UI for managing albums

**Risk Notes:** Existing story (insp-1004). Basic implementation. Will be enhanced by INSP-008, INSP-012.

---

## INSP-006: Link to MOC

**Status:** pending
**Depends On:** INSP-002
**Phase:** 4

**Feature:** UI and logic to link inspirations to existing MOC Instructions

**Endpoints:** none

**Infrastructure:** none

**Goal:** Enable users to associate inspiration images with their MOC projects

**Risk Notes:** Existing story (insp-1005). Depends on MOC Instructions epic. Many-to-many relationship.

---

## INSP-007: Album Data Model and Nested Hierarchy

**Status:** pending
**Depends On:** none
**Phase:** 1
**Blocked By:** INSP-ENGINE-001 (DAG cycle detection algorithm specification)

**Feature:** Define album schema with many-to-many parent relationships, implement cycle detection for DAG structure

**Endpoints:** none

**Infrastructure:** Database migration for albums table

**Goal:** Establish the album data model supporting nested hierarchies without cycles

**Risk Notes:** High priority. Complex many-to-many DAG structure. Cycle detection critical. Proper indexing required for performance. SIZING WARNING.

**MVP Blocker (ENG-001):** DAG cycle detection algorithm not specified - blocks INSP-007 and INSP-009. Specify cycle detection algorithm (e.g., DFS-based, constraint-based) and performance requirements before implementation. Define max nesting levels and performance SLAs.

**Related Stories:** INSP-ENGINE-001 (algorithm specification spike), INSP-QA-001 (comprehensive test suite), INSP-009 (depends on this)

---

## INSP-008: Upload Modal with Multi-Image Support (SUPERSEDED - Split into INSP-008-A/B/C)

**Status:** superseded
**Depends On:** INSP-004, INSP-007
**Phase:** 2

**Feature:** Replace upload page with modal supporting drag-and-drop, multi-file selection, preview, progress indicators, and album creation prompt

**Endpoints:** none

**Infrastructure:** none

**Goal:** Enable users to upload multiple images at once with option to create album

**Risk Notes:** High priority. Complex UI with multi-file handling, previews, partial failure scenarios. Large uploads may timeout. SIZING WARNING.

**Split Resolution:**
- INSP-008-A: Basic single-file upload modal with success path
- INSP-008-B: Multi-file batch upload support
- INSP-008-C: Error recovery and retry state machine

**Rationale:** Upload error handling is complex and cross-cutting. Breaking into separate stories allows parallel work on modal UI vs. error recovery logic. Complex retry and recovery patterns require design specification (INSP-ENGINE-002) before coding.

---

## INSP-009: Album Create/Edit Endpoints

**Status:** pending
**Depends On:** INSP-007, INSP-ENGINE-001
**Phase:** 1

**Feature:** Complete CRUD endpoints for albums including parent relationship management and cycle validation

**Endpoints:**
- `POST /api/albums`
- `PUT /api/albums/:id`
- `DELETE /api/albums/:id`
- `GET /api/albums`
- `GET /api/albums/:id`

**Infrastructure:** none

**Goal:** Provide full backend CRUD operations for album management

**Risk Notes:** High priority. Must validate cycles in DAG. Handle cascade behaviors for delete operations.

**MVP Blocker (ENG-001):** DAG cycle detection algorithm not specified. Requires INSP-ENGINE-001 completion before implementation to define validation strategy and performance SLAs.

---

## INSP-010: Inspiration Create/Edit Endpoints

**Status:** pending
**Depends On:** INSP-003
**Phase:** 1

**Feature:** Complete CRUD endpoints for inspirations with album membership and MOC linking

**Endpoints:**
- `POST /api/inspirations`
- `PUT /api/inspirations/:id`
- `DELETE /api/inspirations/:id`

**Infrastructure:** none

**Goal:** Provide full backend CRUD operations for inspiration management

**Risk Notes:** High priority. Extends INSP-003. Handle S3 cleanup on delete. Support many-to-many album relationships.

---

## INSP-011: Drag-and-Drop Reorder in Gallery (SUPERSEDED - Split into INSP-011-A/B)

**Status:** superseded
**Depends On:** INSP-001, INSP-002
**Phase:** 3

**Feature:** Implement drag-and-drop reordering with visual feedback, keyboard alternatives, and touch support

**Endpoints:**
- `PATCH /api/inspirations/:id/reorder`
- `PATCH /api/albums/:id/reorder`

**Infrastructure:** none

**Goal:** Allow users to reorder items in gallery and albums via drag-and-drop

**Risk Notes:** Medium priority. Use dnd-kit library. Complex interaction patterns. Must support keyboard and touch. SIZING WARNING.

**Split Resolution:**
- INSP-011-A: Drag-and-drop library evaluation and recommendation
- INSP-011-B: Keyboard reordering accessibility design and implementation

**Rationale:** Library choice impacts implementation approach. Keyboard accessibility must be designed in parallel with drag-and-drop.

---

## INSP-012: Stack-to-Create-Album Gesture with Undo

**Status:** pending
**Depends On:** INSP-011, INSP-009, INSP-UX-001
**Phase:** 3
**Blocked By:** INSP-UX-001 (stack gesture usability testing and discovery UI design)

**Feature:** Implement drag-to-stack gesture for album creation with confirmation modal, undo toast, and keyboard alternative

**Endpoints:** none

**Infrastructure:** none

**Goal:** Enable intuitive album creation by dragging images onto each other

**Risk Notes:** Medium priority. Novel interaction pattern requiring careful UX. Undo mechanism needed. Discoverability via onboarding tooltip.

**MVP Blocker (UX-001):** Stack-to-create gesture discovery UI not designed - non-obvious interaction requires prominent tooltip and/or onboarding. Requires INSP-UX-001 completion with usability testing (5+ users) before Phase 2 to validate learnability.

**Related Stories:** INSP-UX-001 (gesture discovery UI design), INSP-PROD-001 (first-time user onboarding), INSP-018 (onboarding tooltips)

---

## INSP-013: Album Navigation and Breadcrumbs (Session-based Path)

**Status:** pending
**Depends On:** INSP-005, INSP-009
**Phase:** 3

**Feature:** Build album navigation with session-based breadcrumb trail, multi-parent awareness, and back button

**Endpoints:** none

**Infrastructure:** none

**Goal:** Provide clear navigation through nested album hierarchy

**Risk Notes:** Medium priority. Session-based path tracking (not canonical). Must handle multiple parent scenarios with 'Also in' badges.

---

## INSP-014: MOC Linking UI and Endpoints

**Status:** pending
**Depends On:** INSP-006, INSP-009, INSP-010
**Phase:** 4

**Feature:** Create UI components and endpoints for linking inspirations and albums to MOC Instructions

**Endpoints:**
- `POST /api/inspirations/:id/mocs`
- `DELETE /api/inspirations/:id/mocs/:mocId`
- `POST /api/albums/:id/mocs`
- `DELETE /api/albums/:id/mocs/:mocId`

**Infrastructure:** none

**Goal:** Complete the MOC linking feature with full CRUD support

**Risk Notes:** Medium priority. Depends on MOC Instructions epic existence. Many-to-many relationships.

---

## INSP-015: Delete Flows (Album Options, Multi-Album Awareness)

**Status:** pending
**Depends On:** INSP-009, INSP-010
**Phase:** 4

**Feature:** Implement delete confirmation modals with album-specific options and multi-album membership warnings

**Endpoints:** none

**Infrastructure:** none

**Goal:** Provide safe, informed delete operations with clear user choices

**Risk Notes:** Medium priority. Complex UX with different delete options. Must show album membership. Hard delete (no soft delete).

---

## INSP-016: Metadata Edit Modal with Album Membership

**Status:** pending
**Depends On:** INSP-010
**Phase:** 4

**Feature:** Create modal for editing title, description, tags, source URL, and managing album membership

**Endpoints:** none

**Infrastructure:** none

**Goal:** Allow users to edit all metadata and manage which albums contain the inspiration

**Risk Notes:** Low priority. Straightforward form modal. Must integrate with album membership UI.

---

## INSP-017: Tag Management Integration

**Status:** pending
**Depends On:** INSP-001, INSP-010
**Phase:** 4

**Feature:** Integrate tag creation, editing, and filtering with shared gallery package

**Endpoints:** none

**Infrastructure:** none

**Goal:** Enable users to organize inspirations and albums by tags

**Risk Notes:** Low priority. Leverage shared gallery package. Straightforward integration.

---

## INSP-018: Empty States and Onboarding Tooltips

**Status:** pending
**Depends On:** INSP-001, INSP-012, INSP-PROD-001
**Phase:** 4
**Blocked By:** INSP-PROD-001 (first-time user onboarding flow)

**Feature:** Design and implement empty states for all scenarios and onboarding tooltip for stack gesture

**Endpoints:** none

**Infrastructure:** none

**Goal:** Guide users through first-time experience and handle empty states gracefully

**Risk Notes:** Medium priority. Multiple empty state scenarios. Critical for discoverability of stack gesture.

**MVP Blocker (PROD-001):** First-time user onboarding flow missing - blocks core user journey. Stack-to-create gesture is novel and non-obvious without guided introduction. Requires INSP-PROD-001 completion before Phase 2 with stack gesture tutorial, tooltip strategy, and UX validation.

**Related Stories:** INSP-PROD-001 (onboarding story), INSP-UX-001 (gesture discovery UI design), INSP-012 (stack gesture implementation)

---

## INSP-019: Keyboard Navigation and Accessibility

**Status:** pending
**Depends On:** INSP-011, INSP-012, INSP-015
**Phase:** 4

**Feature:** Implement full keyboard navigation, screen reader support, focus management, and WCAG AA compliance

**Endpoints:** none

**Infrastructure:** none

**Goal:** Ensure the inspiration gallery is fully accessible to all users

**Risk Notes:** Medium priority. Comprehensive accessibility requirements. Must support all interactions via keyboard. SIZING WARNING.

---

## INSP-020: Loading States and Error Handling

**Status:** pending
**Depends On:** INSP-001, INSP-008
**Phase:** 4

**Feature:** Implement skeleton loaders, image placeholders, upload progress, and error states with retry actions

**Endpoints:** none

**Infrastructure:** none

**Goal:** Provide responsive UI feedback for all async operations

**Risk Notes:** Low priority. Standard loading/error patterns. Must handle partial upload failures.

---

## INSP-021: Multi-Select Mode and Bulk Operations

**Status:** pending
**Depends On:** INSP-011, INSP-019
**Phase:** 4

**Feature:** Add multi-select mode with shift-click, keyboard shortcuts, and bulk operations (create album, delete, tag)

**Endpoints:** none

**Infrastructure:** none

**Goal:** Enable efficient bulk operations on multiple inspirations

**Risk Notes:** Low priority. Enhances UX for power users. Must integrate with accessibility features. SIZING WARNING.

---

## INSP-022: DAG Cycle Detection Algorithm Specification and Validation

**Status:** pending
**Priority:** P0
**Phase:** 1 Setup (1-2 days)
**Assigned To:** Dev
**Source:** Epic Elaboration - Engineering
**Depends On:** none

**Feature:** Spike story to research and specify DFS-based or constraint-based cycle detection algorithm for album parent relationships

**Goal:** Establish algorithm choice, performance characteristics, and constraints before INSP-007/INSP-009 implementation

**Description:** This engineering spike unblocks INSP-007 (Album Data Model) and INSP-009 (Album CRUD Endpoints). The team will research and evaluate cycle detection approaches, document algorithm choice, define performance characteristics (e.g., max nesting levels), and establish SLAs for cycle detection operations. Outputs include algorithm specification, pseudo-code, performance benchmarks, and recommendations for database indexing strategy.

**Deliverables:**
- Algorithm evaluation matrix (DFS-based vs constraint-based vs hybrid)
- Chosen algorithm with detailed specification and pseudo-code
- Performance benchmarks (e.g., detection time for various nesting depths)
- Max nesting level constraints and SLA for detection operations
- Database indexing strategy recommendations

**Risk Notes:** MVP Critical. Blocks album feature foundation. Requires architecture review before implementation.

**Blocks:** INSP-007, INSP-009

---

## INSP-023: Multi-File Upload State Machine and Error Recovery Specification

**Status:** pending
**Priority:** P0
**Phase:** 2 Setup (1-2 days)
**Assigned To:** Dev
**Source:** Epic Elaboration - Engineering
**Depends On:** none

**Feature:** Design specification for upload state machine covering retry strategy, partial failure handling, and error recovery patterns

**Goal:** Define error handling approach before INSP-008 (split) implementation to enable parallel work on modal UI vs. error recovery

**Description:** This engineering spike specifies the upload state machine and error recovery patterns to unblock INSP-008 (Multi-file upload). The team will design the complete state machine covering: retry strategy (exponential backoff, max retries), partial failure handling (some files succeed, others fail), error categorization (transient vs. permanent), and recovery flow. This specification enables parallel implementation of basic upload modal (INSP-008-A), multi-file support (INSP-008-B), and error recovery logic (INSP-008-C).

**Deliverables:**
- State machine diagram (input states, transitions, outputs)
- Retry strategy specification (backoff algorithm, max retries, timeouts)
- Error categorization and handling matrix
- Partial failure recovery flow diagram
- Test scenario checklist for QA test story (INSP-QA-002)

**Risk Notes:** MVP Critical. Upload reliability depends on robust error handling design. Requires cross-functional review (dev, QA).

**Blocks:** INSP-008-A, INSP-008-B, INSP-008-C

---

## INSP-024: First-Time User Onboarding Flow for Stack Gesture and Album Concepts

**Status:** pending
**Priority:** P0
**Phase:** Before Phase 2 (1 day)
**Assigned To:** PM
**Source:** Epic Elaboration - Product
**Depends On:** none

**Feature:** Product story defining first-time user onboarding flow with stack gesture tutorial, tooltip messaging, and integration points

**Goal:** Enable users to discover and understand the novel stack-to-create gesture before encountering it in the UI

**Description:** This product story defines the onboarding experience for new users, with specific focus on the stack-to-create gesture, which is a novel interaction that requires guided introduction for discoverability. Outputs include: onboarding modal design with step-by-step stack gesture tutorial, tooltip messaging strategy, dismissal logic (once per user, with option to re-enable), and integration point in the initial user flow (e.g., after first image upload). This unblocks INSP-PROD-001 (UX design) and informs INSP-018 (Empty States and Onboarding).

**Deliverables:**
- Onboarding flow definition (when triggered, step sequence, dismissal)
- Stack gesture tutorial sequence (visual, text, interaction steps)
- Tooltip messaging specs (discovery tooltip, contextual help)
- Dismissal logic and re-enablement UX
- Integration points in user flow (after image upload, in gallery empty state, etc.)

**Risk Notes:** MVP Critical. Novel gesture requires guided introduction for usability. Must be completed before Phase 2 to validate with users.

**Blocks:** INSP-018, INSP-012 (implementation)

---

## INSP-025: DAG Cycle Detection Comprehensive Test Suite

**Status:** pending
**Priority:** P0
**Phase:** 1 Testing (parallel with implementation)
**Assigned To:** QA
**Source:** Epic Elaboration - QA
**Depends On:** INSP-022 (algorithm specification)

**Feature:** Comprehensive unit and integration test suite for DAG cycle detection with edge case coverage

**Goal:** Ensure data integrity through exhaustive cycle detection validation before MVP launch

**Description:** This QA story creates comprehensive test coverage for the cycle detection algorithm specified in INSP-022. Test suite includes unit tests for edge cases (5+ parent nesting levels, complex hierarchies, circular parent relationships, indirect cycles) and performance benchmarks to validate algorithm meets SLAs. Tests validate both correctness (cycles are detected) and performance (detection completes within SLA).

**Test Scenarios:**
- Unit tests: Single parent, multiple parents, 5+ nesting levels
- Circular parent detection (A parent of B, B parent of A)
- Indirect cycles (A→B→C→A)
- Performance benchmarks against nesting depth and width
- Bulk operation performance (creating many parent relationships)
- Concurrent update handling

**Risk Notes:** MVP Critical. Data corruption risk unacceptable. Cycle detection must be thoroughly tested before launch.

**Depends On:** INSP-022, INSP-007 (for implementation testing)

---

## INSP-026: Multi-File Upload Error Scenario E2E Tests

**Status:** pending
**Priority:** P0
**Phase:** 2 Testing (parallel with implementation)
**Assigned To:** QA
**Source:** Epic Elaboration - QA
**Depends On:** INSP-023 (error recovery specification)

**Feature:** Comprehensive E2E test suite for multi-file upload error scenarios using Playwright with mocked S3 responses

**Goal:** Ensure upload reliability and error recovery work correctly across failure modes before MVP launch

**Description:** This QA story creates comprehensive Playwright E2E test coverage for upload error scenarios defined in INSP-023. Test suite covers: S3 timeouts, partial batch failures (some files succeed, others fail), network errors, and recovery/retry workflows. Tests use MSW mocking for S3 error responses to simulate real failure conditions without requiring actual S3 errors.

**Test Scenarios:**
- Single file upload timeout
- Partial batch failure (2 of 5 files fail)
- Network connection interruption during upload
- S3 permission errors
- Retry mechanism validation (exponential backoff works correctly)
- Recovery flow (user can retry failed files)
- Progress indicator accuracy with partial failures
- Error message clarity and actionability

**Risk Notes:** MVP Critical. Upload is core user interaction. Error handling must be tested across failure modes.

**Depends On:** INSP-023, INSP-008-A/B/C (for implementation testing)

---

## INSP-027: Stack Gesture Usability Testing and Discovery UI Design

**Status:** pending
**Priority:** P0
**Phase:** Before Phase 2 (3-4 days)
**Assigned To:** UX
**Source:** Epic Elaboration - UX
**Depends On:** INSP-024 (onboarding product spec)

**Feature:** High-fidelity stack gesture discovery UI design with animation/tooltip specs and 5+ participant usability testing

**Goal:** Validate that users can discover and successfully use the stack gesture through design and usability testing

**Description:** This UX story designs and validates the discovery UI for the stack-to-create gesture, which is a novel interaction pattern requiring careful UX design. Deliverables include: high-fidelity gesture discovery UI (animation, tooltip, visual feedback), comprehensive interaction specs, and 5+ participant usability test with success criteria. Usability test validates that users can discover the gesture, understand how to use it, and successfully create an album through stacking.

**Deliverables:**
- High-fidelity gesture discovery UI designs (modal, tooltip, inline hint)
- Animation specifications (hover state, drag preview, drop feedback)
- Tooltip content and copy (discovery, contextual help)
- Usability test plan with 5+ participants
- Success criteria (% users discover gesture, task completion time, SUS score)
- Design validation report with findings and recommendations

**Test Success Criteria:**
- 80%+ of test participants discover the gesture without instruction
- 90%+ of test participants can successfully create an album through stacking
- System Usability Scale (SUS) score ≥ 70

**Risk Notes:** MVP Critical. Novel interaction must be validated that users can discover and use it. UX validation required before Phase 2.

**Blocks:** INSP-012, INSP-018

---
