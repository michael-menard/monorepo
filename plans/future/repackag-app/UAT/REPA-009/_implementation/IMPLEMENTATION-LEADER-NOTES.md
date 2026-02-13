# Implementation Leader Notes - REPA-009

## Scope Analysis

Based on SCOPE.yaml:
- frontend: true (app-inspiration-gallery)
- packages: true (@repo/gallery)
- backend: false
- contracts: false

## Worker Assignment

**Frontend Coder Only** - This story requires a single worker to handle:
1. Package enhancements (packages/core/gallery)
2. Frontend component refactors (apps/web/app-inspiration-gallery)

## Architectural Decisions (Pre-Approved)

All decisions in DECISIONS.yaml have been approved:
1. Fixed positions when both selectable+draggable (checkbox=top-left, drag=top-right)
2. Remove built-in actions overlay (BREAKING CHANGE)
3. Always visible on mobile, hover-visible on desktop
4. Include renderDragHandle as optional MVP prop

## Implementation Approach

The Frontend Coder should follow PLAN.yaml steps 1-23:

### Phase 1: GalleryCard Enhancement (Steps 1-13)
- Create Zod schemas for new props
- Update GalleryCardPropsSchema  
- Remove actions overlay (breaking change)
- Implement selection checkbox overlay
- Implement drag handle rendering
- Implement hover overlay container
- Update TSDoc documentation

### Phase 2: Card Refactors (Steps 18-21)
- Refactor InspirationCard to use GalleryCard
- Refactor AlbumCard to use GalleryCard
- Write regression tests

### Phase 3: Testing & Documentation (Steps 14-17, 22-23)
- Comprehensive unit tests for GalleryCard
- Integration tests for refactored cards
- Update README.md
- Verify coverage targets (45% overall, 80% GalleryCard)

## Blockers

**Task Tool Unavailable**: The standard Task tool for spawning workers is not available in this environment. Implementation requires either:
A) Task tool to be made available, OR
B) Manual execution of Frontend Coder instructions

## Token Budget

Story estimate: 180,000 tokens
Current usage: ~38,000 tokens (leader overhead)
Remaining: ~142,000 tokens for implementation

## Next Steps

Frontend Coder should execute with context:
- autonomy_level: conservative
- batch_mode: false
- All architectural decisions pre-approved in DECISIONS.yaml
