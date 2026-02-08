# Dev Feasibility: INST-1103 - Upload Thumbnail

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Direct reuse of proven patterns from wishlist domain. ImageUploadZone component exists and is production-ready. Direct upload pattern (≤10MB) is simpler than presigned URLs and already validated in wishlist implementation.

---

## MVP-Critical Risks

### Risk 1: INST-1102 Dependency (MEDIUM - Manageable)
- **Description**: This story requires MOC creation endpoint (POST /mocs) from INST-1102 to be functional
- **Impact**: Cannot test thumbnail upload without a MOC to attach it to
- **Mitigation**:
  - INST-1102 status: "Ready to Work" (not currently blocking)
  - Can proceed with component development in parallel
  - Mock MOC creation in unit/integration tests
  - E2E tests depend on INST-1102 completion
- **Blocking for MVP**: No (can develop in parallel, only E2E tests blocked)

### Risk 2: S3 CORS Configuration (LOW - Known Solution)
- **Description**: S3 bucket must allow multipart/form-data uploads from frontend origin
- **Impact**: Upload fails with CORS error if not configured
- **Mitigation**:
  - Wishlist domain already has S3 CORS configured
  - Reuse existing bucket or apply same CORS policy
  - CORS policy:
    ```json
    {
      "AllowedOrigins": ["http://localhost:5173", "https://app.example.com"],
      "AllowedMethods": ["GET", "POST", "PUT"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
    ```
- **Blocking for MVP**: No (already solved in wishlist domain)

### Risk 3: Multipart Form Data Handling (LOW - Proven)
- **Description**: Backend must parse multipart/form-data correctly
- **Impact**: File upload fails if body parsing incorrect
- **Mitigation**:
  - Hono has built-in `c.req.parseBody()` for multipart
  - Wishlist domain demonstrates working pattern
  - Example:
    ```typescript
    const body = await c.req.parseBody()
    const file = body.file as File
    const buffer = Buffer.from(await file.arrayBuffer())
    ```
- **Blocking for MVP**: No (proven pattern exists)

---

## Architecture Assessment

### Component Reuse (HIGH Confidence)

#### ImageUploadZone Component
- **Source**: `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`
- **Reuse Score**: 95% (minimal adaptation needed)
- **Adaptations**:
  - Set `maxImages={1}` prop (component already supports this)
  - Remove reorder button UI (not needed for single thumbnail)
  - Change labels from "Images" to "Thumbnail"
  - Adjust preview aspect ratio to match gallery cards (16:9 or 1:1)
- **Effort**: 2-4 hours
- **Confidence**: High (component is production-ready in app-sets-gallery)

#### File Validation Utilities
- **Source**: `apps/api/lego-api/core/utils/file-validation.ts`
- **Reuse Score**: 100% (direct reuse, no changes)
- **Functions**:
  - `validateMimeType(file, allowedTypes)` - MIME type whitelist check
  - `validateFileSize(file, minSize, maxSize)` - Size validation
  - `createSecurityEvent(userId, filename, reason)` - Security logging
- **Effort**: 0 hours (direct import)
- **Confidence**: Very High (already validated in wishlist domain)

#### S3 Storage Adapter
- **Source**: `apps/api/lego-api/domains/wishlist/adapters/storage.ts`
- **Reuse Score**: 80% (pattern reuse, adapt key structure)
- **Adaptations**:
  - Change S3 key pattern: `mocs/{userId}/{mocId}/thumbnail/{uuid}-{filename}`
  - Reuse upload logic, delete logic, CloudFront conversion
- **Effort**: 2-3 hours
- **Confidence**: High

### Backend Complexity (LOW)

#### POST /mocs/:id/thumbnail Route
- **Pattern**: Direct upload (not presigned URL)
- **Why Simple**: Files ≤10MB don't need multipart chunking or presigned URLs
- **Steps**:
  1. Parse multipart/form-data body (`c.req.parseBody()`)
  2. Validate MIME type (image/jpeg, image/png, image/webp)
  3. Validate file size (1 byte ≤ size ≤ 10MB)
  4. Generate S3 key with UUID prefix
  5. Upload to S3
  6. Update database (`moc_instructions.thumbnailUrl`)
  7. Return CloudFront URL
- **Effort**: 6-8 hours (including tests)
- **Confidence**: High

#### Database Update
- **Schema**: `moc_instructions.thumbnailUrl` field already exists
- **Transaction Safety**: Wrap DB update in transaction, rollback on S3 failure
- **Pattern**:
  ```typescript
  await db.transaction(async (trx) => {
    // Upload to S3
    const s3Url = await uploadToS3(buffer, key)
    // Update database
    await trx('moc_instructions')
      .where({ id: mocId })
      .update({ thumbnailUrl: toCloudFrontUrl(s3Url) })
  })
  ```
- **Effort**: 2-3 hours
- **Confidence**: High

### Frontend Complexity (LOW-MEDIUM)

#### ThumbnailUpload Component
- **Base**: Adapt `ImageUploadZone` from app-sets-gallery
- **New Logic**:
  - Single image mode (maxImages=1)
  - Replace existing thumbnail (DELETE then POST)
  - Success/error toast notifications
  - Loading state during upload
- **RTK Query**:
  - Add `useUploadThumbnailMutation` to `@repo/api-client/rtk/mocs-api.ts`
  - Cache invalidation on success (refetch MOC detail)
- **Effort**: 8-10 hours (including tests)
- **Confidence**: Medium (new component, but based on proven pattern)

#### Integration Points
- **Gallery Page (INST-1100)**: Display thumbnailUrl in card (already planned)
- **Detail Page (INST-1101)**: Display thumbnail in sidebar cover card
- **Create Page (INST-1102)**: Add thumbnail upload after MOC creation
- **Effort**: 2-3 hours (minimal - just pass thumbnailUrl to existing components)
- **Confidence**: High

---

## Security & Validation

### Client-Side Validation (Required)
- [ ] File type: `accept="image/jpeg,image/png,image/webp"` on file input
- [ ] File size: Check `file.size <= 10MB` before upload
- [ ] MIME type: Check `file.type` matches allowed types
- [ ] Feedback: Display error toast if validation fails

### Server-Side Validation (CRITICAL)
- [ ] MIME type: Use `file-type` library to verify actual file content (don't trust client)
- [ ] File size: Enforce 1 byte ≤ size ≤ 10MB
- [ ] Extension: Validate filename extension matches MIME type
- [ ] Authorization: Verify userId from auth token matches MOC owner
- [ ] MOC existence: Return 404 if MOC not found

### Security Logging (Required)
- [ ] Log rejected uploads: userId, filename, reason (invalid MIME, oversized, etc.)
- [ ] Log S3 upload failures: mocId, userId, error details
- [ ] CloudWatch structured logging for security events

---

## Data Flow

### Upload Flow (Happy Path)
```
1. User selects image file
2. Frontend validates (type, size)
3. Preview displays
4. User clicks "Upload"
5. POST /api/v2/mocs/:id/thumbnail (multipart/form-data)
   ↓
6. Backend parses body
7. Validate MIME type, file size
8. Check authorization (user owns MOC)
9. Generate S3 key: mocs/{userId}/{mocId}/thumbnail/{uuid}-{filename}
10. Upload to S3
11. Convert S3 URL to CloudFront URL
12. Update moc_instructions.thumbnailUrl
13. Return { thumbnailUrl: "https://cdn.example.com/..." }
   ↓
14. Frontend invalidates RTK cache
15. Detail page refetches MOC data
16. Gallery card updates thumbnail
17. Success toast displays
```

### Replace Thumbnail Flow
```
1. User uploads new thumbnail
2. Backend checks if existing thumbnailUrl exists
3. If exists: Delete old S3 object
4. Upload new thumbnail to S3
5. Update database with new URL
6. Return new CloudFront URL
```

### Error Flow (Example: Invalid MIME Type)
```
1. User selects PDF file
2. Frontend validates: FAIL (not image/*)
3. Error toast: "Only images allowed"
4. Upload button disabled
   (If client validation bypassed:)
5. POST /api/v2/mocs/:id/thumbnail
6. Backend validates MIME type: FAIL
7. Return 400 { code: "INVALID_MIME_TYPE", message: "..." }
8. Security log entry created
9. Frontend displays error toast
```

---

## Effort Estimate

### Breakdown by Task

| Task | Effort | Confidence |
|------|--------|------------|
| Adapt ImageUploadZone component | 2-4 hours | High |
| Backend POST /mocs/:id/thumbnail route | 6-8 hours | High |
| Database transaction logic | 2-3 hours | High |
| S3 storage adapter adaptation | 2-3 hours | High |
| RTK Query mutation setup | 2-3 hours | High |
| Unit tests (frontend) | 3-4 hours | Medium |
| Unit tests (backend) | 3-4 hours | Medium |
| Integration tests | 2-3 hours | Medium |
| E2E tests (Playwright) | 4-5 hours | Medium |
| Documentation | 1-2 hours | High |

**Total**: 27-39 hours (~3.5-5 days for single developer)

### Adjusted Estimate (Accounting for Unknowns)
- **Optimistic**: 3 days (24 hours)
- **Realistic**: 4 days (32 hours)
- **Pessimistic**: 5 days (40 hours)

**Recommended**: 4 days (1 day frontend, 1 day backend, 0.5 day integration, 0.5 day E2E, 1 day buffer)

---

## Testing Strategy

### Unit Tests
- **Frontend**: ThumbnailUpload component validation, preview, upload states
- **Backend**: Route handler, file validation, S3 upload (mocked), DB update
- **Coverage Target**: 80% frontend, 90% backend

### Integration Tests
- **Frontend**: MSW handlers for POST /mocs/:id/thumbnail (success/error)
- **Backend**: Full route test with mocked S3 client
- **Coverage Target**: Key user journeys (upload, replace, validation errors)

### E2E Tests (Per ADR-006)
- **Happy Path**: Upload JPEG, verify thumbnail in gallery and detail page
- **Error Path**: Reject PDF file, display error message
- **Replace Path**: Upload new thumbnail, verify old one replaced
- **Environment**: Test S3 bucket (real S3, not mocked per ADR-005)

---

## Dependencies & Blockers

### Hard Dependencies
- **INST-1102 (Create Basic MOC)**: Required for E2E tests (need MOC to upload thumbnail to)
- **S3 Bucket**: Must exist and have CORS configured (likely already done)
- **CloudFront Distribution**: Must be configured for S3 bucket (likely already done)

### Soft Dependencies
- **INST-1100 (View MOC Gallery)**: Nice to have for testing gallery thumbnail display
- **INST-1101 (View MOC Details)**: Nice to have for testing detail page thumbnail display

### Recommended Execution Order
1. Develop ThumbnailUpload component in isolation (unit tests with mocked API)
2. Implement backend route (unit tests with mocked S3)
3. Integration tests (MSW)
4. Wait for INST-1102 completion
5. E2E tests with real S3

---

## Technical Debt & Future Considerations

### Potential Technical Debt
- **No image optimization**: Uploading 9MB images without resize could slow page loads
  - **Mitigation**: Add Sharp resize to 800x800 in backend before S3 upload (optional for MVP)
  - **Future Story**: INST-2033 (Image Optimization)
- **No virus scanning**: Accepting user-uploaded files without scanning
  - **Mitigation**: Defer to future (low risk for authenticated users)
  - **Future Story**: INST-2031 (File Virus Scanning)
- **No cleanup for orphaned S3 objects**: If DB update fails, S3 object remains
  - **Mitigation**: Transaction wraps both S3 upload and DB update (rollback on failure)
  - **Future Story**: INST-1204 (S3 Cleanup for Failed Uploads)

### Future Enhancements (Out of MVP)
- Image cropping before upload (INST-2037)
- Multiple thumbnail sizes (small, medium, large)
- Auto-generate thumbnail from instructions PDF (INST-2032)
- Thumbnail rotation/flip tools
- Bulk thumbnail upload for multiple MOCs

---

## Non-MVP Concerns (FUTURE-RISKS.md)

### Performance
- **Large image uploads (9MB)**: May take 5-10 seconds on slow connections
  - **Future**: Add progress bar (INST-2036)
  - **Future**: Resize images client-side before upload
- **High-resolution images**: May slow gallery page rendering
  - **Future**: Generate multiple sizes (thumbnail, medium, full) (INST-2033)

### Mobile Experience
- **Camera access**: May not work on all mobile browsers
  - **Future**: Test on iOS Safari, Android Chrome
- **Network conditions**: 10MB upload on 3G may fail
  - **Future**: Reduce max file size for mobile or compress before upload

### Edge Cases
- **Concurrent uploads**: User uploads multiple thumbnails rapidly
  - **Future**: Implement upload queue or cancel previous upload
- **Session expiry during upload**: Auth token expires mid-upload
  - **Future**: Refresh token before upload or handle 401 gracefully

---

## Recommendation

**Proceed with story implementation.**

- High reuse potential from existing components and patterns
- Low technical complexity (direct upload is simple)
- Clear requirements and acceptance criteria
- Proven validation and security patterns
- Effort estimate is reasonable (4 days)
- No MVP-blocking risks

**Suggested Implementation Order:**
1. Backend route + validation (Day 1)
2. Frontend component adaptation (Day 2)
3. Integration (Day 3)
4. E2E tests after INST-1102 completion (Day 4)

**Key Success Factors:**
- Reuse ImageUploadZone from app-sets-gallery
- Reuse file validation utilities from core/utils
- Follow direct upload pattern from wishlist domain
- Ensure transaction safety for S3 + DB operations
- Write at least one E2E happy path test (per ADR-006)
