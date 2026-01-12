# Story 3.0.1: @repo/gallery Package Scaffolding

## Status

Completed

## Story

**As a** developer,
**I want** a shared gallery package scaffolded,
**so that** all gallery pages can reuse common components and avoid code duplication.

## Acceptance Criteria

1. ✅ `packages/core/gallery/` folder created with proper structure
2. ✅ package.json with name `@repo/gallery` and correct dependencies
3. ✅ TypeScript configuration extends workspace tsconfig
4. ✅ Vite build configuration for library mode
5. ✅ Package exports configured in package.json
6. ✅ Package resolves correctly from other workspace packages

## Tasks / Subtasks

- [x] **Task 1: Create Package Structure**
  - [x] Create folder `packages/core/gallery/`
  - [x] Create `packages/core/gallery/src/` directory
  - [x] Create `packages/core/gallery/src/index.ts` with placeholder export

- [x] **Task 2: Package Configuration**
  - [x] Create package.json with:
    - name: `@repo/gallery`
    - dependencies: react, @repo/ui
    - devDependencies: typescript, vite
  - [x] Create tsconfig.json extending workspace config
  - [x] Create vite.config.ts for library build

- [x] **Task 3: Workspace Integration**
  - [x] Add to pnpm-workspace.yaml if not auto-detected
  - [x] Verify package resolves from main-app
  - [x] Run `pnpm install` to link workspace

## Dev Notes

### Package Structure

```
packages/core/gallery/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── index.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### package.json

```json
{
  "name": "@repo/gallery",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "vite build",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@repo/ui": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2",
    "vite": "^6.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Testing

- [x] Package builds without errors
- [x] Package can be imported from main-app
- [x] TypeScript types resolve correctly

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20250929

### File List

| File | Action |
| ---- | ------ |
| packages/core/gallery/package.json | Created |
| packages/core/gallery/tsconfig.json | Created |
| packages/core/gallery/vite.config.ts | Created |
| packages/core/gallery/src/index.ts | Created |
| packages/core/gallery/src/components/ | Created |
| packages/core/gallery/src/hooks/ | Created |
| packages/core/gallery/src/types/ | Created |

### Debug Log References

None

### Completion Notes

- Package scaffolding complete with proper structure at `packages/core/gallery/`
- Removed `@repo/typescript-config` dependency as it doesn't exist in workspace
- Removed prohibited barrel exports from index.ts
- Package builds successfully with vite
- TypeScript types resolve correctly
- Package is actively used by `app-instructions-gallery` and `main-app`

## Review Approval

> **Review Date:** 2025-12-28
> **Reviewed By:** PM (John), UX (Sally), SM (Bob)
> **Decision:** APPROVED

All review criteria passed. Story is ready for implementation.

**Specialist Assessments:**
- **PM (John)**: READY - Foundational infrastructure story with clear requirements, appropriate scope, and well-defined acceptance criteria. No product concerns.
- **UX (Sally)**: READY - Infrastructure/scaffolding story with no UI components. UX review not applicable.
- **SM (Bob)**: READY - Clarity score 9/10. Excellent technical guidance, complete specifications, and verified implementation with 303 passing tests.

**Key Strengths:**
- Complete technical specifications with package.json, tsconfig, and vite config examples
- Self-contained documentation requiring minimal external references
- Already proven in production use by 3 gallery implementations
- All acceptance criteria verified with build, import, and type resolution tests

**Verification Results:**
- ✓ Package builds successfully
- ✓ Resolves from consuming apps (app-wishlist-gallery, main-app, app-instructions-gallery)
- ✓ TypeScript types resolve correctly
- ✓ 303 tests passing across 9 test files

---

## Change Log

| Date       | Version | Description                                                      | Author    |
| ---------- | ------- | ---------------------------------------------------------------- | --------- |
| 2025-11-30 | 0.1     | Initial draft                                                    | SM Agent  |
| 2025-11-30 | 0.2     | Implementation complete                                          | Dev Agent |
| 2025-12-25 | 0.3     | Fixed paths to reflect actual location (packages/core/gallery/)  | Dev Agent |
|| 2025-12-28 | 0.4     | Story approved after multi-specialist review                     | Review Team |
|| 2026-01-10 | 0.5     | Status updated to Completed after downstream dependency validation | Dev Agent |
