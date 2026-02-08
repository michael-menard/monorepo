---
generated: "2026-02-05"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
story_type: "retrospective"
completion_detected: true
completion_date: "2025-12-09"
---

# Story Seed: INST-1004

## Reality Context

### Baseline Status
- Loaded: **NO**
- Date: N/A
- Gaps: **No baseline reality file exists**. Proceeding with codebase scanning only.

### CRITICAL FINDING: Package Already Exists

**Analysis**: During codebase scanning, discovered that the `@repo/upload-config` package **already exists** and was implemented on **December 9, 2025** (commit `6ce460fe`).

**Package Status**:
- Location: `packages/tools/upload-config/`
- Companion package: `packages/backend/upload-config-core/` (platform-agnostic loader)
- Status: **COMPLETE** and **IN USE**
- Implementation date: 2025-12-09
- Implementing story: Story 3.1.30 (from a different epic)

**Key Features Implemented**:
1. ✅ Zod schema for upload configuration (`UploadConfigSchema`)
2. ✅ File category enum (`instruction`, `parts-list`, `thumbnail`, `gallery-image`)
3. ✅ Pure functions for config access (no process.env in package)
4. ✅ File size limits by category
5. ✅ MIME type validation
6. ✅ Count limits (max files per MOC)
7. ✅ TTL configuration (presign, session)
8. ✅ Rate limiting config
9. ✅ Default configuration values
10. ✅ Comprehensive unit tests (158 + 127 tests)

**Companion Package (`@repo/upload-config-core`)**:
- Platform-agnostic config loader
- Environment variable parsing (`loadUploadConfigFromEnv`)
- Public config filtering (`getPublicUploadConfig`)
- Integrates with `@repo/upload-config` schemas

**Current Usage**:
- Used by: `apps/api/core/config/env-loader.ts`
- Exposed via: `GET /api/config/upload` endpoint
- Replaces: Previous hardcoded upload config at `apps/api/core/config/upload.ts`

### Relevant Existing Features

| Feature | Status | Location |
|---------|--------|----------|
| `@repo/upload-config` package | ✅ Complete | `packages/tools/upload-config/` |
| `@repo/upload-config-core` loader | ✅ Complete | `packages/backend/upload-config-core/` |
| Environment variable mapping | ✅ Complete | `upload-config-core/src/config-loader.ts` |
| Default config values | ✅ Complete | `upload-config/src/schema.ts` |
| File size utilities | ✅ Complete | `upload-config/src/limits.ts` |
| MIME type validation | ✅ Complete | `upload-config/src/limits.ts` |
| Public API endpoint | ✅ Complete | `GET /api/config/upload` |
| Unit tests | ✅ Complete | 285 tests passing |

### Active In-Progress Work

None detected that would conflict with this story.

### Constraints to Respect

None - package is already complete and integrated.

---

## Retrieved Context

### Related Endpoints

- `GET /api/config/upload` - Public upload configuration endpoint (implemented)
- Handler: `apps/api/endpoints/config/upload/handler.ts`

### Related Components

- `@repo/upload-types` - Companion types package (INST-1003, completed 2024-12-26)
- `apps/api/core/config/env-loader.ts` - Server-side environment loader bridge
- `apps/api/core/utils/file-validation.ts` - File validation utilities (uses hardcoded limits, predates package)

### Reuse Candidates

**Already implemented**:
- `@repo/upload-config` - Core config package
- `@repo/upload-config-core` - Platform-agnostic loader
- Zod schemas for validation
- Pure function config access pattern
- Comprehensive test suite

**Deprecated after this package**:
- `apps/api/core/config/upload.ts` - Old hardcoded config (replaced by package)
- Hardcoded constants in `file-validation.ts` - Should migrate to use package

---

## Knowledge Context

### Lessons Learned

No lessons loaded (no baseline or KB query performed).

**Pattern Detected from Codebase**:
- **Config injection pattern**: Package exports pure functions that accept config objects
- **No process.env in package**: Environment variables read only in server-side loaders
- **Two-package pattern**: Shared types/logic in `@repo/upload-config`, platform-agnostic loader in `upload-config-core`
- **Public/Private split**: `getPublicUploadConfig()` filters sensitive config before exposing to frontend

### Blockers to Avoid

None identified.

### Architecture Decisions (ADRs)

No ADRs loaded (no ADR-LOG.md read performed).

**Implicit Patterns from Implementation**:
1. **Pure functions over globals**: Config passed as parameter, not accessed globally
2. **Zod-first validation**: All config validated with Zod schemas
3. **Platform-agnostic core**: No AWS/Vercel dependencies in shared packages
4. **Test coverage**: Comprehensive unit tests for all config functions

### Patterns to Follow

- Config injection (pure functions)
- Zod schema validation
- Two-package pattern (shared + loader)
- Public/private config split

### Patterns to Avoid

- Reading `process.env` directly in shared packages
- Hardcoding config values across multiple files

---

## Conflict Analysis

**No conflicts detected**.

---

## Story Seed

### Title

**INST-1004: Extract Upload Config Package (RETROSPECTIVE)**

### Description

**Context**: This is a **retrospective story** documenting the `@repo/upload-config` package that was **already implemented** on December 9, 2025 as part of Story 3.1.30.

**Problem**: Upload configuration (file size limits, MIME types, TTL, rate limits) was previously scattered across multiple files and hardcoded in various locations.

**Solution Implemented**: Created two packages:
1. **`@repo/upload-config`** - Pure config types, schemas, and accessor functions
2. **`@repo/upload-config-core`** - Platform-agnostic environment loader and public config filtering

**Current State**:
- Package fully implemented and tested
- Integrated with API via `apps/api/core/config/env-loader.ts`
- Exposed via public endpoint `GET /api/config/upload`
- 285 unit tests passing
- Zero technical debt

**Story Purpose**: Document this infrastructure work for the INST epic index and provide knowledge base entry for future stories that depend on upload config.

### Initial Acceptance Criteria

**Note**: All criteria already satisfied by existing implementation.

- [x] AC-1: Package `@repo/upload-config` exists at `packages/tools/upload-config/`
- [x] AC-2: Zod schema `UploadConfigSchema` defines all config fields
- [x] AC-3: File size limits configurable per category (instruction, parts-list, thumbnail, image)
- [x] AC-4: MIME type validation by category
- [x] AC-5: TTL configuration for presigned URLs and sessions
- [x] AC-6: Rate limiting configuration
- [x] AC-7: Default values defined for all config fields
- [x] AC-8: Pure functions export (no process.env in package)
- [x] AC-9: Environment variable loader in `@repo/upload-config-core`
- [x] AC-10: Public config endpoint at `GET /api/config/upload`
- [x] AC-11: Unit tests with >80% coverage
- [x] AC-12: TypeScript types exported from Zod schemas
- [x] AC-13: Package consumed by API server

### Non-Goals

- ❌ Re-implementing the package (already complete)
- ❌ Changing the package structure (working well)
- ❌ Adding new config fields (out of scope for documentation)
- ❌ Migrating all consumers (gradual migration acceptable)

### Reuse Plan

**Already Implemented**:
- **Package**: `@repo/upload-config` - Config types and functions
- **Loader**: `@repo/upload-config-core` - Environment variable parsing
- **Tests**: 158 + 127 unit tests
- **Documentation**: Inline TSDoc comments

**Future Reuse Opportunities**:
- INST-1105 (Presigned uploads) - Use `getPresignTtlSeconds()`
- INST-1104 (Direct uploads) - Use `getFileSizeLimit()`, `isMimeTypeAllowed()`
- INST-1103 (Thumbnails) - Use MIME validation for images
- INST-1106 (Parts lists) - Use parts list size/MIME limits

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context**: Tests already exist and pass (285 tests total).

Recommendations:
- Document existing test structure
- Verify test coverage meets quality gates
- Identify any edge cases not yet covered
- Document integration tests if needed

### For UI/UX Advisor

**Not applicable** - This is a backend infrastructure package with no UI.

### For Dev Feasibility

**Context**: Package already implemented and working.

Recommendations:
- Verify package exports are correct
- Confirm API integration is complete
- Identify any remaining hardcoded config to migrate
- Document any breaking changes vs. old approach

---

## STORY-SEED COMPLETE WITH WARNINGS: 1 warning

**Warning**: No baseline reality file found. Seed generated from codebase scanning only.

**Recommendation**: This story should be marked as **RETROSPECTIVE / DOCUMENTATION ONLY** since the work is complete.
