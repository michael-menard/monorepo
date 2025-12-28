# Story lnch-1007: README for mock-data Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the mock-data package,
**so that** I can use consistent test fixtures across the codebase.

## Epic Context

This is **Story 8 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **Low** - Test support package.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1051: E2E Happy Path Journeys (uses mock data)
- lnch-1052: E2E UX Improvements Verification (uses mock data)

## Acceptance Criteria

1. README.md exists at `packages/backend/mock-data/README.md`
2. Documents all exported fixtures
3. Shows usage in tests
4. Documents factory functions
5. Shows how to extend fixtures
6. Documents relationship between fixtures

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/backend/mock-data/src/index.ts`
  - [ ] List all exported fixtures
  - [ ] Document factory functions

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/backend/mock-data/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Fixtures** (AC: 2, 6)
  - [ ] User fixtures
  - [ ] MOC fixtures
  - [ ] File fixtures
  - [ ] Document relationships

- [ ] **Task 4: Document Factory Functions** (AC: 4)
  - [ ] Factory API
  - [ ] Override patterns
  - [ ] Sequence generation

- [ ] **Task 5: Show Test Usage** (AC: 3)
  - [ ] Unit test example
  - [ ] Integration test example

- [ ] **Task 6: Document Extension** (AC: 5)
  - [ ] How to add new fixtures
  - [ ] How to customize existing

## Dev Notes

### Package Location
- `packages/backend/mock-data/`

### Usage in Tests
```typescript
import { mockUser, mockMoc, createMockFile } from '@repo/mock-data'

const user = mockUser()
const moc = mockMoc({ ownerId: user.id })
const file = createMockFile({ mocId: moc.id })
```

## Testing

### Verification
- README renders correctly in GitHub
- Code examples are syntactically correct

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
