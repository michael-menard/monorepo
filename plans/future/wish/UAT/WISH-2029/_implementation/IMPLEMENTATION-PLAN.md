# Implementation Plan - WISH-2029

## Overview

Rewrite `docs/architecture/api-layer.md` to document the current hexagonal architecture pattern at `apps/api/lego-api/domains/`.

## Document Structure

### Sections to Write

1. **Overview** (existing, update)
   - Update diagram to show domains/ structure
   - Explain hexagonal architecture

2. **Directory Structure** (rewrite)
   - Show `apps/api/lego-api/domains/{domain}/` pattern
   - Document all subdirectories

3. **Layer Responsibilities** (new section)
   - application/ - Business logic (services)
   - adapters/ - Infrastructure (repositories, storage)
   - ports/ - Interface definitions
   - routes.ts - HTTP adapter (Hono)
   - types.ts - Zod schemas

4. **Hexagonal Architecture Explanation** (new section)
   - Ports & Adapters pattern
   - Dependency inversion
   - Why this pattern was chosen

5. **Real Code Examples** (rewrite)
   - Use health domain (simple)
   - Use wishlist domain (complex with cross-domain)

6. **Creating a New Domain Guide** (new section)
   - Step-by-step checklist
   - File creation order
   - Dependency wiring

7. **Hono Framework Patterns** (existing, update)
   - Route definition
   - Validation with Zod
   - Response formatting
   - Error handling

8. **Shared Schema Patterns** (new section)
   - Backend owns schemas in types.ts
   - Frontend imports via @repo/api-client
   - Schema versioning

9. **Cross-Domain Dependencies** (new section)
   - Dependency injection pattern
   - Example: wishlist -> sets (purchase flow)

10. **Testing Strategy** (new section)
    - Unit tests for application layer
    - Integration tests for adapters
    - Route testing patterns

11. **Migration Notes** (existing, update)
    - Old pattern: services/{domain}/ (deprecated)
    - New pattern: domains/{domain}/ (canonical)
    - Migration steps

12. **Verification Section** (update)
    - Add "Last Verified: 2026-01-28"

## Code Examples to Include

### Health Domain (Simple Example)
- routes.ts - ~70 lines, thin HTTP adapter
- types.ts - Zod schemas with z.infer
- application/services.ts - Pure business logic

### Wishlist Domain (Complex Example)
- routes.ts - Shows dependency injection wiring
- ports/index.ts - Interface definitions
- adapters/repositories.ts - Drizzle implementation
- application/services.ts - Business logic with injected deps
- Cross-domain: setsService injection

## Cross-References to Verify

1. All file paths in examples exist
2. Code snippets match actual files
3. No conflicts with CLAUDE.md guidelines
4. Zod-first types (no TypeScript interfaces)
5. No barrel file recommendations

## Risks Mitigated

- Documentation drift: Adding "Last Verified" date
- Pattern inconsistency: Noting health domain variation
- CLAUDE.md conflicts: Explicit compatibility check

## Estimated Sections

| Section | Lines | Priority |
|---------|-------|----------|
| Overview | 30 | High |
| Directory Structure | 40 | High |
| Layer Responsibilities | 60 | High |
| Hexagonal Architecture | 50 | High |
| Code Examples | 150 | High |
| Creating New Domain | 50 | High |
| Hono Patterns | 40 | Medium |
| Shared Schemas | 30 | Medium |
| Cross-Domain | 40 | Medium |
| Testing Strategy | 40 | Medium |
| Migration Notes | 30 | Medium |
| Verification | 10 | Low |

**Total Estimated: ~570 lines**
