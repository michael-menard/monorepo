# Dev Feasibility: INST-1106 Upload Parts List

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Strong pattern reuse from INST-1103 (Upload Thumbnail) and INST-1104 (Upload Instructions). Proven direct upload pattern (≤10MB), existing file validation utilities, S3 storage adapter in place. Only new work is parts list validation function and single-file replacement logic.

---

## Likely Change Surface (Core Only)

### Frontend

#### New Components
- `apps/web/app-instructions-gallery/src/components/PartsListUpload/index.tsx` (NEW)
- `apps/web/app-instructions-gallery/src/components/PartsListUpload/__tests__/PartsListUpload.test.tsx` (NEW)
- `apps/web/app-instructions-gallery/src/components/PartsListUpload/__types__/index.ts` (NEW)

#### Modified Components
- `apps/web/app-instructions-gallery/src/pages/MocDetailPage/index.tsx` (integrate PartsListUpload)
- `apps/web/app-instructions-gallery/src/pages/MocDetailPage/components/PartsListCard.tsx` (display uploaded file)

#### RTK Query
- `packages/core/api-client/src/rtk/instructions-api.ts` - Add `uploadPartsListFile` mutation (new endpoint)

### Backend

#### New or Modified Files
- `apps/api/lego-api/domains/mocs/routes.ts` - Add `POST /mocs/:id/files` endpoint with `type=parts-list` OR verify existing endpoint supports parts list type
- `apps/api/lego-api/domains/mocs/application/services.ts` - Add `uploadPartsListFile()` method OR extend existing `uploadFile()` method
- `apps/api/lego-api/core/utils/file-validation.ts` - Add `validatePartsListFile()` function (NEW)

### Database
- `moc_files` table - No schema changes required (already supports `type` field)
- Single parts list enforcement via query: `DELETE FROM moc_files WHERE mocId = $1 AND type = 'parts-list'` before insert

### Deploy Touchpoints
- No infrastructure changes required (S3 bucket and CloudFront already configured)
- No database migrations required (schema already supports this use case)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Backend Endpoint Structure Ambiguity
**Description**: Story index references `POST /mocs/:id/files` with `type='parts-list'`, but existing codebase inspection shows:
- INST-1103 uses `/mocs/:id/thumbnail` (dedicated endpoint)
- INST-1104 references `/mocs/:id/files/instruction` (dedicated endpoint)
- Current routes.ts (lines 286-361) only has thumbnail endpoint

**Why it blocks MVP**: If no generic `/mocs/:id/files` endpoint exists, must implement new endpoint OR determine if parts list should have dedicated `/mocs/:id/files/parts-list` endpoint.

**Required Mitigation**:
1. Inspect `routes.ts` thoroughly to check if generic `/mocs/:id/files` exists
2. If not, decide: Implement generic endpoint OR dedicated `/mocs/:id/files/parts-list` endpoint
3. Update RTK Query mutation to match chosen endpoint structure
4. **Recommended**: Use dedicated endpoint pattern for consistency with thumbnail/instructions

**Status**: MEDIUM severity - blocks implementation start but easily resolved via code inspection.

---

### Risk 2: Single File Replacement Logic Complexity
**Description**: Enforcing single parts list per MOC requires:
- Check if existing `moc_files` record exists with `type='parts-list'` for this MOC
- If exists: Delete old S3 object, then delete or update database record
- If delete fails (S3 timeout): Must not block new upload OR must rollback entire operation
- Race condition: Concurrent uploads from same user could create duplicate files

**Why it blocks MVP**: Without proper replacement logic, multiple parts lists could exist per MOC (violates spec). S3 deletion failures could leave orphaned objects.

**Required Mitigation**:
1. **Transaction**: Wrap entire operation (delete old S3 → upload new S3 → update DB) in transaction
2. **Order of operations**: Delete old S3 first (log failure but don't block), then upload new S3, then update DB
3. **Idempotency**: Use upsert pattern in database: `INSERT ... ON CONFLICT (mocId, type) DO UPDATE SET ...`
4. **Race condition**: Frontend button disabled during upload (prevent concurrent uploads)

**Recommended Implementation**:
```typescript
// Service layer
async uploadPartsListFile(userId, mocId, file) {
  // 1. Check authorization (user owns MOC)
  // 2. Query for existing parts list
  const existing = await db.query('SELECT id, s3Key FROM moc_files WHERE mocId = $1 AND type = $2', [mocId, 'parts-list'])

  // 3. Delete old S3 object (if exists)
  if (existing) {
    try {
      await s3.deleteObject(existing.s3Key)
    } catch (err) {
      logger.warn('Failed to delete old parts list S3 object', { err, s3Key: existing.s3Key })
      // Don't block - continue with new upload
    }
  }

  // 4. Upload new S3 object
  const s3Key = `mocs/${userId}/${mocId}/parts-list/${sanitize(file.name)}`
  const s3Url = await s3.uploadFile(file.buffer, s3Key, file.mimetype)

  // 5. Upsert database record
  await db.query(`
    INSERT INTO moc_files (mocId, type, name, size, s3Key, mimeType, uploadedAt)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (mocId, type) DO UPDATE SET
      name = EXCLUDED.name,
      size = EXCLUDED.size,
      s3Key = EXCLUDED.s3Key,
      mimeType = EXCLUDED.mimeType,
      uploadedAt = NOW()
  `, [mocId, 'parts-list', file.name, file.size, s3Key, file.mimetype])

  return { id, mocId, type: 'parts-list', name, size, url: toCloudFrontUrl(s3Url), uploadedAt }
}
```

**Status**: MEDIUM severity - adds complexity but well-understood pattern.

---

### Risk 3: MIME Type Validation for CSV/XML Diversity
**Description**: CSV and XML files have multiple valid MIME types that browsers and servers may report differently:
- **CSV**: `text/csv`, `application/csv`, `application/vnd.ms-excel` (Excel CSV)
- **XML**: `text/xml`, `application/xml`
- **PDF**: `application/pdf` (only one valid type)

If backend validation whitelists only `text/csv` and `text/xml`, valid files from certain sources (e.g., Excel-generated CSV) could be rejected.

**Why it blocks MVP**: Rejecting valid parts lists breaks core user journey. Users would see "Invalid file type" errors for legitimate CSV files.

**Required Mitigation**:
Add comprehensive MIME type whitelist to `file-validation.ts`:
```typescript
export const ALLOWED_PARTS_LIST_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // Excel CSV
  'text/xml',
  'application/xml',
  'application/pdf',
] as const

export function validatePartsListMimeType(mimeType: string | undefined | null): ValidationResult {
  if (!mimeType || mimeType.trim() === '') {
    return { valid: false, error: 'MIME type is required', code: 'MISSING_MIME_TYPE' }
  }

  const normalized = mimeType.toLowerCase().trim()

  if (ALLOWED_PARTS_LIST_MIME_TYPES.includes(normalized as any)) {
    return { valid: true }
  }

  return {
    valid: false,
    error: 'Only CSV, XML, and PDF files are allowed',
    code: 'INVALID_MIME_TYPE',
  }
}
```

**Status**: MEDIUM severity - prevents legitimate uploads but easy to fix with comprehensive whitelist.

---

## Missing Requirements for MVP

### Requirement 1: S3 Key Pattern for Parts Lists
**Issue**: Story seed suggests `mocs/{userId}/{mocId}/parts-list/{filename}` but doesn't specify:
- Should UUID prefix be added to filename? (INST-1103 uses `{uuid}-{filename}`)
- Since single file only, is UUID prefix needed? (No collision risk)

**Decision Needed**:
- **Option A**: No UUID prefix (single file, no collision): `mocs/{userId}/{mocId}/parts-list/parts-list.csv`
- **Option B**: UUID prefix for consistency: `mocs/{userId}/{mocId}/parts-list/{uuid}-parts-list.csv`
- **Option C**: Filename only (replace on each upload): `mocs/{userId}/{mocId}/parts-list/{sanitized-filename}`

**Recommendation**: **Option C** - Use sanitized filename without UUID. Single file enforcement means no collision risk, and preserving original filename makes it easier to identify file type in S3 console.

**Concrete Decision Text for PM**:
> **S3 Key Pattern**: Parts list files will be stored at `mocs/{userId}/{mocId}/parts-list/{sanitized-filename}` where sanitized-filename removes special characters and preserves the original file extension. No UUID prefix is needed since only one parts list is allowed per MOC.

---

### Requirement 2: Database Schema - Unique Constraint on (mocId, type)?
**Issue**: To enforce single parts list per MOC, database could use:
- **Option A**: Application logic only (upsert pattern in service layer)
- **Option B**: Database unique constraint: `UNIQUE (mocId, type)` on `moc_files` table

**Decision Needed**: Should database schema enforce single file constraint?

**Recommendation**: **Option A** - Application logic only. Database already allows multiple files of same type (e.g., multiple instruction PDFs), so adding unique constraint would break existing functionality for instructions. Use upsert pattern in service layer for parts lists specifically.

**Concrete Decision Text for PM**:
> **Single File Enforcement**: Implemented via application logic (service layer upsert pattern), not database constraint. The `moc_files` table will not have a unique constraint on `(mocId, type)` to preserve flexibility for file types that allow multiples (e.g., instructions, gallery images).

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

#### Backend Evidence
1. **.http file**: `POST /mocs/:id/files` request with CSV file upload
2. **Response validation**: Zod schema validates response structure
3. **S3 verification**: Object exists at expected key after upload
4. **Database verification**: Single `moc_files` record with `type='parts-list'` for this MOC
5. **Replacement verification**: Old S3 object deleted when new file uploaded

#### Frontend Evidence
1. **Unit tests**: PartsListUpload component renders, validates file types
2. **Integration tests**: RTK Query mutation calls correct endpoint
3. **E2E test**: Playwright recording of full upload flow (CSV selection → upload → display)

#### Security Evidence
1. **Authorization test**: Unauthorized user (different userId) cannot upload to another user's MOC
2. **MIME type rejection**: Non-CSV/XML/PDF file rejected with proper error code
3. **File size rejection**: File >10MB rejected with proper error code

### Critical CI/Deploy Checkpoints
- All unit tests pass (target: 80% frontend, 90% backend coverage)
- E2E test passes in CI (Playwright on real services per ADR-005)
- No TypeScript errors
- No ESLint errors
- Prettier formatting applied

---

## Architecture Assessment

### Component Reuse (HIGH Confidence)

| Component | Source | Reuse % | Effort |
|-----------|--------|---------|--------|
| File validation (`validateFileSize`) | `file-validation.ts` | 100% | 0h - Direct import |
| S3 storage adapter | `mocs/adapters/storage.ts` | 90% | 1h - Adapt key pattern |
| Direct upload pattern | `routes.ts` (thumbnail) | 85% | 2h - Change endpoint, validation |
| RTK Query mutation | `instructions-api.ts` | 80% | 2h - New mutation for parts list |
| PartsListUpload component | Adapt ThumbnailUpload | 70% | 4h - Change file types, single file logic |

### Backend Complexity (LOW)

**Simple Patterns**:
- Direct upload (no presigned URL complexity)
- Single file enforcement (upsert pattern)
- Existing validation framework (just add MIME types)

**Proven Patterns from INST-1103**:
- Multipart/form-data parsing: `c.req.parseBody()`
- S3 upload: `PutObjectCommand`
- CloudFront URL conversion: `toCloudFrontUrl()`
- Transaction safety: Rollback on S3 failure

**New Logic Required**:
- Parts list MIME type validation (5 allowed types)
- Delete old S3 object before uploading new (10 lines)
- Upsert pattern for single file enforcement (already used in INST-1103 for thumbnail replacement)

### Frontend Complexity (LOW)

**Simple Patterns**:
- File picker (native HTML input)
- Client-side validation (MIME type + size)
- RTK Query mutation (FormData upload)

**New UI Required**:
- PartsListUpload component (adapt from ThumbnailUpload, ~200 lines)
- File type validation (CSV/XML/PDF instead of images)
- Single file display (no list of multiple files)

---

## Effort Estimate

### Breakdown by Area

| Area | Task | Effort |
|------|------|--------|
| **Backend** | Add `validatePartsListMimeType()` to file-validation.ts | 0.5h |
| | Add `uploadPartsListFile()` service method | 2h |
| | Add `POST /mocs/:id/files` route handler (or adapt existing) | 2h |
| | Single file replacement logic (delete old S3 + upsert DB) | 2h |
| | Unit tests for validation and service layer | 2h |
| **Frontend** | Create PartsListUpload component | 4h |
| | Add RTK Query mutation (`uploadPartsListFile`) | 1h |
| | Integrate into MOC detail page | 1h |
| | Unit tests for component | 2h |
| | Integration tests with MSW | 1h |
| **E2E Tests** | Playwright tests (3 scenarios) | 2h |
| **Total** | | **19.5 hours** |

### Rounded Estimate: **2-3 days** (16-24 hours)
- **Day 1**: Backend implementation (validation, service, route, tests)
- **Day 2**: Frontend implementation (component, RTK mutation, integration, tests)
- **Day 3**: E2E tests, edge case testing, bug fixes

---

## Recommendation

**Proceed with story implementation.**

**Justification**:
- High reuse potential (70-100% across all layers)
- Low technical complexity (proven patterns from INST-1103/1104)
- Clear requirements with minimal ambiguity
- Reasonable effort estimate (2-3 days)
- No infrastructure changes required
- No blocking dependencies (INST-1102 already in QA)

**Next Steps**:
1. PM clarifies S3 key pattern (Recommendation: Option C)
2. PM clarifies unique constraint decision (Recommendation: Application logic only)
3. Dev confirms backend endpoint structure (inspect routes.ts)
4. Story moves to Ready to Work status
