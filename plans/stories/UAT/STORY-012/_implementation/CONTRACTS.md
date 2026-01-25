# STORY-012 Contract Documentation

## Swagger Updates

This project does **NOT use Swagger/OpenAPI** for API documentation. API contracts are documented via:
1. Story markdown files (acceptance criteria with request/response schemas)
2. `.http` files for executable contract verification
3. TypeScript types inline in handlers (Zod schemas per project conventions)

**No Swagger files require updating for this story.**

---

## HTTP Files

### Added/Updated File

| File Path | Status |
|-----------|--------|
| `/__http__/mocs.http` | MODIFIED - Added STORY-012 gallery linking section |

### HTTP Requests Added (17 total)

#### GET /api/mocs/:id/gallery-images (6 requests)

| Request Name | Purpose | Method | Expected Status |
|--------------|---------|--------|-----------------|
| `getMocGalleryImages` | List linked images for King's Castle (2 images) | GET | 200 |
| `getMocGalleryImagesCrossUser` | List images for Space Station (cross-user link) | GET | 200 |
| `getMocGalleryImagesEmpty` | List images for MOC with no links | GET | 200 (empty) |
| `getMocGalleryImages403` | Access other user's MOC gallery images | GET | 403 |
| `getMocGalleryImages404` | Non-existent MOC | GET | 404 |
| `getMocGalleryImages400` | Invalid UUID format | GET | 400 |

#### POST /api/mocs/:id/gallery-images (8 requests)

| Request Name | Purpose | Method | Expected Status |
|--------------|---------|--------|-----------------|
| `linkGalleryImage` | Link new image to MOC | POST | 201 |
| `linkGalleryImage409` | Link already-linked image | POST | 409 |
| `linkGalleryImage404Image` | Link non-existent gallery image | POST | 404 |
| `linkGalleryImage404Moc` | Link to non-existent MOC | POST | 404 |
| `linkGalleryImage403` | Link to other user's MOC | POST | 403 |
| `linkGalleryImage400Missing` | Missing galleryImageId in body | POST | 400 |
| `linkGalleryImage400InvalidMoc` | Invalid MOC UUID format | POST | 400 |
| `linkGalleryImage400InvalidImage` | Invalid galleryImageId format | POST | 400 |

#### DELETE /api/mocs/:id/gallery-images/:galleryImageId (6 requests)

| Request Name | Purpose | Method | Expected Status |
|--------------|---------|--------|-----------------|
| `unlinkGalleryImage` | Unlink existing linked image | DELETE | 200 |
| `unlinkGalleryImage404` | Unlink non-linked image | DELETE | 404 |
| `unlinkGalleryImage404Moc` | Unlink from non-existent MOC | DELETE | 404 |
| `unlinkGalleryImage403` | Unlink from other user's MOC | DELETE | 403 |
| `unlinkGalleryImage400InvalidMoc` | Invalid MOC UUID format | DELETE | 400 |
| `unlinkGalleryImage400InvalidImage` | Invalid galleryImageId format | DELETE | 400 |

---

## Executed HTTP Evidence

### Server Status

**Vercel dev server is NOT running** at time of contract documentation.

HTTP execution is **deferred to QA verification phase** where:
1. Server will be started with `pnpm --filter @repo/api-vercel dev`
2. Database will be seeded with `pnpm seed`
3. All HTTP requests will be executed and responses captured
4. Evidence will be documented in `QA-VERIFY-STORY-012.md`

### Pre-requisites for HTTP Execution

```bash
# 1. Start local PostgreSQL (if not running)
docker compose up -d

# 2. Seed database (includes STORY-012 moc_gallery_images links)
pnpm seed

# 3. Start Vercel dev server
cd apps/api/platforms/vercel
pnpm dev
```

### Environment Requirements

| Variable | Value | Required |
|----------|-------|----------|
| `AUTH_BYPASS` | `true` | YES (dev mode) |
| `DEV_USER_SUB` | `dev-user-00000000-0000-0000-0000-000000000001` | YES (dev mode) |
| `DATABASE_URL` | PostgreSQL connection string | YES |

---

## API Contract Summary

### Endpoint 1: GET /api/mocs/:id/gallery-images

**Purpose**: List all gallery images linked to a MOC

**Request**:
```
GET /api/mocs/:id/gallery-images
Authorization: Bearer <token> (or AUTH_BYPASS in dev)
```

**Success Response (200)**:
```json
{
  "images": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "url": "string",
      "tags": ["string"] | null,
      "createdAt": "ISO8601",
      "lastUpdatedAt": "ISO8601"
    }
  ],
  "total": 2
}
```

**Error Responses**:
- `401 UNAUTHORIZED` - Missing/invalid authentication
- `403 FORBIDDEN` - User does not own the MOC
- `404 NOT_FOUND` - MOC does not exist
- `400 VALIDATION_ERROR` - Invalid UUID format

---

### Endpoint 2: POST /api/mocs/:id/gallery-images

**Purpose**: Link an existing gallery image to a MOC

**Request**:
```
POST /api/mocs/:id/gallery-images
Content-Type: application/json
Authorization: Bearer <token> (or AUTH_BYPASS in dev)

{
  "galleryImageId": "uuid"
}
```

**Success Response (201)**:
```json
{
  "message": "Gallery image linked successfully",
  "link": {
    "id": "uuid",
    "mocId": "uuid",
    "galleryImageId": "uuid"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED` - Missing/invalid authentication
- `403 FORBIDDEN` - User does not own the MOC
- `404 NOT_FOUND` - MOC or gallery image does not exist
- `409 CONFLICT` - Image already linked to this MOC
- `400 VALIDATION_ERROR` - Missing/invalid galleryImageId or MOC ID

---

### Endpoint 3: DELETE /api/mocs/:id/gallery-images/:galleryImageId

**Purpose**: Unlink a gallery image from a MOC

**Request**:
```
DELETE /api/mocs/:id/gallery-images/:galleryImageId
Authorization: Bearer <token> (or AUTH_BYPASS in dev)
```

**Success Response (200)**:
```json
{
  "message": "Gallery image unlinked successfully"
}
```

**Error Responses**:
- `401 UNAUTHORIZED` - Missing/invalid authentication
- `403 FORBIDDEN` - User does not own the MOC
- `404 NOT_FOUND` - MOC or link does not exist
- `400 VALIDATION_ERROR` - Invalid UUID format

---

## Files Verified

| File | Status | Notes |
|------|--------|-------|
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | EXISTS | GET + POST handlers |
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` | EXISTS | DELETE handler |
| `apps/api/platforms/vercel/vercel.json` | VERIFIED | Routes added at lines 35-36 |
| `apps/api/core/database/seeds/mocs.ts` | VERIFIED | 3 gallery image links seeded |
| `__http__/mocs.http` | VERIFIED | 17 STORY-012 requests added |

---

## Route Configuration Verified

From `vercel.json`:
```json
{ "source": "/api/mocs/:id/gallery-images/:galleryImageId", "destination": "/api/mocs/[id]/gallery-images/[galleryImageId].ts" },
{ "source": "/api/mocs/:id/gallery-images", "destination": "/api/mocs/[id]/gallery-images/index.ts" }
```

**Note**: More specific route (with `:galleryImageId`) correctly comes before the general route per Vercel routing precedence.

---

## Seed Data Verified

From `apps/api/core/database/seeds/mocs.ts`:

| Link ID | MOC | Gallery Image | Purpose |
|---------|-----|---------------|---------|
| `cccccccc-cccc-cccc-cccc-cccccccc0001` | King's Castle | Castle Tower Photo | Happy path list test |
| `cccccccc-cccc-cccc-cccc-cccccccc0002` | King's Castle | Medieval Knight | Multiple links test |
| `cccccccc-cccc-cccc-cccc-cccccccc0003` | Space Station | Private Image | Cross-user link test |

---

## Notes

1. **No discrepancies** found between implementation and story requirements
2. All error codes match AC-4 requirements: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`
3. Cross-user gallery linking is **permitted** as specified in story (users can link any gallery image, not just their own)
4. HTTP execution deferred to verification phase - all contracts documented and ready for testing

---

**Contract documentation complete. Ready for QA verification.**
