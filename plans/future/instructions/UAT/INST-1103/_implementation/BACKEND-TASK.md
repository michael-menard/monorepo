# Backend Implementation Task - INST-1103

## Agent Context
Read: .claude/agents/dev-implement-backend-coder.agent.md

## Story Context
- Feature directory: plans/future/instructions
- Story ID: INST-1103
- Plan file: plans/future/instructions/in-progress/INST-1103/_implementation/PLAN.yaml
- Output file: plans/future/instructions/in-progress/INST-1103/_implementation/BACKEND-LOG.md

## Scope
User selected **MVP + Critical** scope (ACs 1-56 + AC57, AC61, AC64):
- Base upload functionality (drag-drop, validation, S3, CloudFront)
- Service layer architecture (ports & adapters)
- WebP conversion on upload (AC57)
- EXIF metadata stripping (AC61)
- High-resolution image validation >8000x8000 (AC64)

EXCLUDE: AC58-60, AC62-63, AC65-66

## Implementation Steps (from PLAN.yaml)
Execute steps 1-8, 16-18, 27, 31, 34:

### Backend Foundation (Steps 1-3)
1. Create MocImageStorage port interface (AC54)
2. Implement MocImageStorage adapter with S3 (AC55)
3. Create uploadThumbnail service method (AC49-52)

### Backend API Endpoint (Steps 4-8)
4. POST /mocs/:id/thumbnail route handler (AC18-23, AC53, AC56)
5. Server-side file validation (AC24-28)
6. S3 storage logic (AC29-31)
7. Old thumbnail deletion + transaction safety (AC32, AC34)
8. Error handling + security logging (AC33, AC35-37)

### Backend Tests (Steps 16-18)
16. Unit test: MIME type validation (AC39)
17. Unit test: File size validation (AC40)
18. Unit test: Authorization check (AC41)

### Enhancements (User-Selected)
27. WebP conversion with Sharp (AC57)
31. EXIF metadata stripping (AC61)
34. High-res validation reject >8000x8000 (AC64)

## Dependencies to Install
Run before implementation:
```bash
pnpm add file-type sharp exif-reader --filter lego-api
```

## Key Patterns to Reuse
- Multipart form parsing: `c.req.formData()`
- File object conversion: `Buffer.from(await file.arrayBuffer())`
- CloudFront URL conversion: `toCloudFrontUrl()` utility
- Service layer pattern: ports in `ports/`, adapters in `adapters/`, services in `application/`

## Constraints (from ADRs)
- ADR-001: Backend route uses /mocs/:id/thumbnail (frontend uses /api/v2/mocs/:id/thumbnail)
- ADR-003: Store in S3, serve via CloudFront with toCloudFrontUrl()
- Transaction safety required: S3 upload + DB update must be atomic with rollback

## Fast-Fail Requirement
Run `pnpm check-types --filter lego-api` after each major chunk. Stop early if types fail.

## Output
Report in BACKEND-LOG.md:
- Files created/modified
- Dependencies installed
- Tests written
- Test results
- Any blockers encountered
