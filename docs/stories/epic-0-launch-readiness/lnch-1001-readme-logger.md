# Story lnch-1001: README for logger Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the @repo/logger package,
**so that** I can use structured logging correctly across the codebase.

## Epic Context

This is **Story 2 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **Critical** - All backend code must use this instead of console.log.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1000: README for app-component-library Package
- lnch-1002: README for accessibility Package
- lnch-1008: README for s3-client Package (also backend)

## Acceptance Criteria

1. README.md exists at `packages/core/logger/README.md`
2. Documents the logger API (info, warn, error, debug methods)
3. Shows correct import pattern (`import { logger } from '@repo/logger'`)
4. Explains why console.log is forbidden
5. Documents structured logging format (JSON in production)
6. Shows examples with context objects
7. Documents log levels and when to use each

## Tasks / Subtasks

- [ ] **Task 1: Audit Logger Implementation** (AC: 2, 5)
  - [ ] Review `packages/core/logger/src/index.ts`
  - [ ] Document available methods
  - [ ] Document output format (JSON structure)

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/logger/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Import and Usage** (AC: 3, 4)
  - [ ] Show correct import: `import { logger } from '@repo/logger'`
  - [ ] Show WRONG pattern: `console.log()` - explain why forbidden
  - [ ] Explain ESLint rule enforcement

- [ ] **Task 4: Document Log Levels** (AC: 7)
  - [ ] `logger.debug()` - Development debugging
  - [ ] `logger.info()` - Normal operations
  - [ ] `logger.warn()` - Potential issues
  - [ ] `logger.error()` - Errors and exceptions

- [ ] **Task 5: Add Context Examples** (AC: 6)
  - [ ] Show logging with context objects
  - [ ] Show error logging with stack traces
  - [ ] Show request context logging

## Dev Notes

### Package Location
- `packages/core/logger/`

### Usage Rule (from CLAUDE.md)
```typescript
// CORRECT
import { logger } from '@repo/logger'
logger.info('message')

// WRONG - never use console
console.log('message')
```

### Production Output Format
Logs are JSON-formatted in production for CloudWatch parsing:
```json
{
  "level": "info",
  "message": "User logged in",
  "userId": "123",
  "timestamp": "2025-12-27T10:00:00Z"
}
```

## Testing

### Verification
- README renders correctly in GitHub
- Import pattern works in backend code
- Log output format matches documentation

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
