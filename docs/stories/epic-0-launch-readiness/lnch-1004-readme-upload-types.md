# Story lnch-1004: README for upload-types Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the upload-types package,
**so that** I can use the correct Zod schemas for upload operations.

## Epic Context

This is **Story 5 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **High** - Shared types between frontend and backend.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1003: README for upload-client Package (uses these types)
- lnch-1008: README for s3-client Package (uses these types)

## Acceptance Criteria

1. README.md exists at `packages/core/upload-types/README.md`
2. Documents all exported Zod schemas
3. Shows TypeScript type inference pattern
4. Documents validation rules for each schema
5. Shows usage in both frontend and backend
6. Documents file category enums
7. Includes schema hierarchy/relationships

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/core/upload-types/src/index.ts`
  - [ ] List all exported schemas
  - [ ] Document inferred types

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/upload-types/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Type Inference** (AC: 3)
  - [ ] Show `z.infer<typeof Schema>` pattern
  - [ ] Document exported type aliases

- [ ] **Task 4: Document Validation Rules** (AC: 4)
  - [ ] File size limits
  - [ ] Allowed MIME types
  - [ ] Field constraints

- [ ] **Task 5: Document Categories** (AC: 6)
  - [ ] instruction
  - [ ] image
  - [ ] parts-list
  - [ ] thumbnail

- [ ] **Task 6: Show Cross-Platform Usage** (AC: 5)
  - [ ] Frontend validation example
  - [ ] Backend validation example

- [ ] **Task 7: Document Schema Relationships** (AC: 7)
  - [ ] Session schemas
  - [ ] File schemas
  - [ ] Response schemas

## Dev Notes

### Package Location
- `packages/core/upload-types/`

### Zod-First Pattern (from CLAUDE.md)
```typescript
// CORRECT - Zod schema with inferred type
import { z } from 'zod'

const FileSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(['instruction', 'image', 'parts-list', 'thumbnail']),
  filename: z.string(),
  size: z.number().positive(),
})

type File = z.infer<typeof FileSchema>
```

## Testing

### Verification
- README renders correctly in GitHub
- All schema examples are valid Zod
- Type inference examples compile

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
