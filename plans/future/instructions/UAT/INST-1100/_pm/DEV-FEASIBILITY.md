# Dev Feasibility Review: INST-1100 - View MOC Gallery

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Backend API already exists (`GET /mocs` in instructions/routes.ts), frontend app structure exists (app-instructions-gallery), and reusable gallery components are available (@repo/gallery). Only integration and refinement needed.

---

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey

1. **Frontend**:
   - `apps/web/app-instructions-gallery/src/pages/GalleryPage.tsx` (or refactor existing main-page.tsx)
   - `apps/web/app-instructions-gallery/src/components/InstructionCard` (minor updates if needed)
   - `apps/web/main-app/src/routes/` (ensure `/mocs` route wired)

2. **API Client**:
   - `packages/core/api-client/src/rtk/mocs-api.ts` (NEW - create RTK Query endpoints)
   - OR verify `instructions-api.ts` already has `useGetInstructionsQuery` hook
   - **Blocker**: INST-1008 must complete to wire RTK mutations

3. **Shared Packages**:
   - `packages/core/gallery` (reuse existing components)
   - `packages/core/app-component-library` (reuse CustomButton, etc.)

4. **Backend** (minimal changes):
   - `apps/api/lego-api/domains/instructions/routes.ts` - `GET /mocs` already implemented
   - Verify response shape matches frontend needs

5. **Database** (query optimization if needed):
   - `moc_instructions` table - queried by `userId`
   - Joined with `moc_files` for thumbnail URLs
   - **Check**: Verify index exists on `moc_instructions.user_id`

### Endpoints for Core Journey

- **`GET /mocs`** - Primary endpoint for listing MOCs
  - Path: `/mocs` (or `/api/v2/mocs` via APIGW proxy)
  - Auth: Required (JWT Bearer token)
  - Query params: `page`, `limit`, `search`, `type`, `status`, `theme`
  - Response: `{ items: MocInstructions[], total, page, limit }`

### Critical Deploy Touchpoints

1. **Frontend Deployment**:
   - `apps/web/main-app` - Ensure router includes `/mocs` route
   - `apps/web/app-instructions-gallery` - Build and deploy module

2. **No Backend Deployment Required** (if endpoint already exists):
   - Verify `GET /mocs` is deployed and accessible

3. **Database Migration**:
   - **Unlikely needed** - schema already exists from prior stories
   - **Check**: Ensure `moc_instructions` and `moc_files` tables exist

4. **CDN/Cloudfront**:
   - No changes needed (thumbnails served from S3)

---

## MVP-Critical Risks

### Risk 1: RTK Query Hook Missing (BLOCKER)

**Risk**: `useGetMocsQuery` hook does not exist in `@repo/api-client` because INST-1008 (Wire RTK Query Mutations) is not completed.

**Why it blocks MVP**: Without the RTK Query hook, frontend cannot fetch MOC data from the API.

**Required Mitigation**:
- **Option A**: Complete INST-1008 before starting INST-1100 implementation
- **Option B**: Expand INST-1100 scope to include wiring the `useGetMocsQuery` hook in `packages/core/api-client/src/rtk/mocs-api.ts`
- **Pattern to follow**: `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` (use as template)

**Code Example (if expanded scope)**:
```typescript
// packages/core/api-client/src/rtk/mocs-api.ts
export const mocsApi = createApi({
  reducerPath: 'mocsApi',
  baseQuery: createServerlessBaseQuery({ enableJwtAuth: true }),
  tagTypes: ['Mocs', 'MocItem'],
  endpoints: builder => ({
    getMocs: builder.query<MocListResponse, Partial<MocQueryParams>>({
      query: params => ({
        url: '/mocs',
        params: {
          page: params.page,
          limit: params.limit,
          search: params.search,
          type: params.type,
          status: params.status,
          theme: params.theme,
        },
      }),
      transformResponse: (response: unknown) => MocListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'MocItem' as const, id })),
              { type: 'Mocs', id: 'LIST' },
            ]
          : [{ type: 'Mocs', id: 'LIST' }],
      ...getServerlessCacheConfig('medium'),
    }),
  }),
})

export const { useGetMocsQuery } = mocsApi
```

---

### Risk 2: Backend Response Schema Mismatch

**Risk**: Backend `GET /mocs` response may not include all fields needed for gallery display (especially `thumbnailUrl`).

**Why it blocks MVP**: If thumbnailUrl is missing, cards cannot display images. If partsCount or theme is missing, cards lack critical info.

**Required Mitigation**:
1. **Verify backend response**: Inspect `instructionsService.listMocs` return value
2. **Check JOIN**: Ensure `moc_files` table is joined to get thumbnailUrl
3. **Fallback**: If thumbnailUrl missing, backend should return `null` (not omit field)
4. **Frontend handling**: Display placeholder image if `thumbnailUrl === null`

**Evidence Check**:
```http
GET /mocs?page=1&limit=1
Authorization: Bearer {token}

# Expected response shape:
{
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "thumbnailUrl": "string | null",  # CRITICAL: must be present
      "partsCount": number | null,
      "theme": "string | null"
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}
```

---

### Risk 3: Existing main-page.tsx Conflict

**Risk**: `apps/web/app-instructions-gallery/src/pages/main-page.tsx` already exists and uses `useGetInstructionsQuery`. This may conflict with the story's intent to use `useGetMocsQuery`.

**Why it blocks MVP**: If main-page.tsx is already implemented with a different pattern, refactoring may introduce bugs or break existing functionality.

**Required Mitigation**:
1. **Inspect existing code**: Verify what `useGetInstructionsQuery` does
2. **Determine if same**: Is `useGetInstructionsQuery` equivalent to `useGetMocsQuery`?
   - If YES: Rename or document the equivalence
   - If NO: Determine which hook is correct for this story
3. **Refactor carefully**: If refactoring main-page.tsx, ensure existing tests still pass

**Decision needed from PM**:
- "Should main-page.tsx use `useGetInstructionsQuery` or `useGetMocsQuery`?"
- "Are instructions and MOCs the same entity or different?"

---

### Risk 4: Database Query Performance

**Risk**: Querying `moc_instructions` by `userId` without an index may be slow for users with many MOCs.

**Why it blocks MVP**: If query takes >2 seconds, gallery page is unusable.

**Required Mitigation**:
1. **Verify index exists**: Check database schema for index on `moc_instructions.user_id`
2. **If missing**: Add migration to create index before deploying
   ```sql
   CREATE INDEX idx_moc_instructions_user_id ON moc_instructions(user_id);
   ```
3. **Performance test**: Query with 100+ MOCs should return in <500ms

**Evidence**:
```sql
EXPLAIN ANALYZE
SELECT * FROM moc_instructions WHERE user_id = 'dev-user-...';
# Should show Index Scan (not Seq Scan)
```

---

### Risk 5: Missing Thumbnail URLs in Database

**Risk**: Existing MOCs may not have thumbnailUrl populated (field is nullable).

**Why it blocks MVP**: If all MOCs show placeholder images, gallery looks broken and unprofessional.

**Required Mitigation**:
1. **Seed data check**: Verify seed MOCs in `packages/backend/database-schema/src/seeds/mocs.ts` have thumbnailUrl
2. **Migration consideration**: If existing production data has null thumbnails, create a "default thumbnail generator" task (future story)
3. **Frontend**: Ensure placeholder image is visually acceptable

**Not blocking if**: Placeholder image is well-designed and clearly indicates "no thumbnail"

---

## Missing Requirements for MVP

### Requirement 1: RTK Query Hook Definition

**What's missing**: Story does not specify which RTK Query hook to use (`useGetInstructionsQuery` vs `useGetMocsQuery`) or where it's defined.

**Concrete decision needed**:
> "Frontend shall use the `useGetMocsQuery` hook from `@repo/api-client/rtk/mocs-api.ts` to fetch MOC data. This hook shall be created as part of INST-1008 or expanded into INST-1100 scope."

---

### Requirement 2: Thumbnail Fallback Strategy

**What's missing**: Story does not specify what to display when `thumbnailUrl` is null.

**Concrete decision needed**:
> "When a MOC has `thumbnailUrl === null`, the card shall display a placeholder image: a gray background with a centered BookOpen icon (lucide-react). Alt text shall be 'No thumbnail available'."

---

### Requirement 3: Pagination Behavior

**What's missing**: Story mentions "limit, offset" but does not specify if pagination controls are required for MVP.

**Concrete decision needed**:
> "MVP shall load the first 50 MOCs with no pagination controls. Future story (INST-2XXX) will add 'Load More' or numbered pagination."

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Backend API Evidence**:
   - `.http` request to `GET /mocs` returns 200 with valid JSON
   - Response validates against Zod schema
   - Query filtered by authenticated userId

2. **Frontend Render Evidence**:
   - Playwright screenshot showing gallery with MOC cards
   - Screenshot of empty state with CTA
   - Screenshot of loading skeleton

3. **Integration Evidence**:
   - RTK Query cache populated with MOC data
   - No errors in browser console
   - Network tab shows successful API call

4. **Performance Evidence**:
   - Lighthouse performance score >70
   - Gallery renders in <2 seconds with 50 MOCs
   - No memory leaks (check with React DevTools Profiler)

### Critical CI/Deploy Checkpoints

1. **Pre-Deploy**:
   - [ ] Unit tests pass (GalleryPage, InstructionCard)
   - [ ] Integration tests pass (MSW mocks API correctly)
   - [ ] E2E tests pass (Playwright scenarios green)
   - [ ] TypeScript compiles with no errors
   - [ ] ESLint passes (no errors)

2. **Post-Deploy**:
   - [ ] Gallery page loads successfully in staging
   - [ ] Can authenticate and view MOCs
   - [ ] Empty state displays for new user
   - [ ] No 500 errors in CloudWatch logs

3. **Smoke Test**:
   - [ ] Navigate to `/mocs` in production
   - [ ] Verify MOC cards render
   - [ ] Click a MOC card (should navigate to detail page, if implemented)

---

## Implementation Recommendations

### Reuse-First Strategy

1. **Gallery Layout**: Use `@repo/gallery` components exactly as used in wishlist-gallery
2. **Card Component**: Refactor existing `InstructionCard` to accept props for gallery context
3. **RTK Query**: Copy pattern from `wishlist-gallery-api.ts`, adapt for MOCs

### Minimal Custom Code

- **New files**: 1-2 (GalleryPage.tsx if refactoring main-page, mocs-api.ts if not in INST-1008)
- **Modified files**: 3-4 (router config, InstructionCard props, API client index)
- **Lines of code**: ~300-500 total (mostly config and orchestration)

### Testing Strategy

- **Unit tests**: Focus on GalleryPage rendering logic, card display
- **Integration tests**: Mock `GET /mocs` API with MSW, verify data flow
- **E2E tests**: Test core journey (view gallery, see cards, empty state)

---

## Future Scope (Not MVP)

1. **Advanced Filtering**: Filter by theme, piece count range, status
2. **Sorting UI**: Dropdown to sort by newest, oldest, name, piece count
3. **Pagination**: Load More button or numbered pagination
4. **View Toggle**: Grid vs datatable view (already in @repo/gallery, just wire up)
5. **Drag-to-Reorder**: Reorder MOCs via drag-and-drop (similar to wishlist)
6. **Bulk Actions**: Select multiple MOCs, delete or archive in bulk
7. **Performance Optimization**: Virtual scrolling for 1000+ MOCs
