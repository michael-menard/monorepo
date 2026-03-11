# STORY-012: Test Plan - MOC Instructions Gallery Linking

## Overview

This test plan covers the migration of MOC Instructions gallery linking endpoints from AWS Lambda to Vercel serverless functions. These endpoints enable users to associate gallery images with their MOC instructions, creating a relationship between inspirational imagery and build documentation.

---

## Endpoints Under Test

| # | Endpoint | Method | Description | Auth Required |
|---|----------|--------|-------------|---------------|
| 1 | `/api/mocs/:id/gallery-images` | GET | List gallery images linked to a MOC | Yes |
| 2 | `/api/mocs/:id/gallery-images` | POST | Link a gallery image to a MOC | Yes |
| 3 | `/api/mocs/:id/gallery-images/:galleryImageId` | DELETE | Unlink a gallery image from a MOC | Yes |

---

## Happy Path Tests

| ID | Endpoint | Test Description | Expected Outcome | Evidence |
|----|----------|------------------|------------------|----------|
| HP-1 | `GET /api/mocs/:id/gallery-images` | Owner fetches linked gallery images (MOC has 3 linked images) | 200 OK with `images[]` containing 3 image objects, `total: 3` | `mocs-gallery-get-hp-1.http` |
| HP-2 | `GET /api/mocs/:id/gallery-images` | Owner fetches linked images for MOC with no links | 200 OK with `images: []`, `total: 0` | `mocs-gallery-get-hp-2.http` |
| HP-3 | `POST /api/mocs/:id/gallery-images` | Owner links a new gallery image to their MOC | 201 Created with `message: "Gallery image linked successfully"`, `link` object containing `id`, `mocId`, `galleryImageId` | `mocs-gallery-link-hp-3.http` |
| HP-4 | `POST /api/mocs/:id/gallery-images` | Owner links second image to same MOC | 201 Created, link created successfully | `mocs-gallery-link-hp-4.http` |
| HP-5 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Owner unlinks a gallery image from their MOC | 200 OK with `message: "Gallery image unlinked successfully"` | `mocs-gallery-unlink-hp-5.http` |
| HP-6 | `GET /api/mocs/:id/gallery-images` | Verify image response includes full image metadata | 200 OK with each image containing: `id`, `title`, `description`, `url`, `tags`, `createdAt`, `lastUpdatedAt` | `mocs-gallery-get-hp-6.http` |
| HP-7 | `GET /api/mocs/:id/gallery-images` | Images returned are ordered by createdAt | 200 OK with images sorted by gallery image creation date | `mocs-gallery-get-hp-7.http` |

---

## Error Cases

| ID | Endpoint | Test Description | Expected Status | Expected Error |
|----|----------|------------------|-----------------|----------------|
| ERR-1 | `GET /api/mocs/:id/gallery-images` | Missing authentication token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-2 | `GET /api/mocs/:id/gallery-images` | Invalid/expired JWT token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-3 | `GET /api/mocs/:id/gallery-images` | Malformed JWT token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-4 | `GET /api/mocs/:id/gallery-images` | Non-existent MOC ID (valid UUID format) | 404 | `NOT_FOUND` - "MOC not found" |
| ERR-5 | `GET /api/mocs/:id/gallery-images` | Invalid UUID format for MOC ID | 400 | `VALIDATION_ERROR` - "MOC ID is required" |
| ERR-6 | `GET /api/mocs/:id/gallery-images` | Authenticated user accessing another user's MOC | 403 | `FORBIDDEN` - "You do not own this MOC" |
| ERR-7 | `POST /api/mocs/:id/gallery-images` | Missing authentication token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-8 | `POST /api/mocs/:id/gallery-images` | Non-existent MOC ID | 404 | `NOT_FOUND` - "MOC not found" |
| ERR-9 | `POST /api/mocs/:id/gallery-images` | Accessing another user's MOC | 403 | `FORBIDDEN` - "You do not own this MOC" |
| ERR-10 | `POST /api/mocs/:id/gallery-images` | Missing galleryImageId in request body | 400 | `VALIDATION_ERROR` - "MOC ID and Gallery Image ID are required" |
| ERR-11 | `POST /api/mocs/:id/gallery-images` | Empty request body | 400 | `VALIDATION_ERROR` - "MOC ID and Gallery Image ID are required" |
| ERR-12 | `POST /api/mocs/:id/gallery-images` | Non-existent gallery image ID | 404 | `NOT_FOUND` - "Gallery image not found" |
| ERR-13 | `POST /api/mocs/:id/gallery-images` | Gallery image already linked to this MOC | 409 | `CONFLICT` - "Image is already linked to this MOC" |
| ERR-14 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Missing authentication token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-15 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Non-existent MOC ID | 404 | `NOT_FOUND` - "MOC not found" |
| ERR-16 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Accessing another user's MOC | 403 | `FORBIDDEN` - "You do not own this MOC" |
| ERR-17 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Image not linked to this MOC | 404 | `NOT_FOUND` - "Image is not linked to this MOC" |
| ERR-18 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Missing galleryImageId path parameter | 400 | `VALIDATION_ERROR` - "MOC ID and Gallery Image ID are required" |

---

## Edge Cases

| ID | Endpoint | Test Description | Expected Outcome |
|----|----------|------------------|------------------|
| EDGE-1 | `GET /api/mocs/:id/gallery-images` | MOC exists but linked gallery image was deleted (cascade delete should prevent) | 200 OK, deleted images not returned (handled by FK cascade) |
| EDGE-2 | `POST /api/mocs/:id/gallery-images` | Link same image to two different MOCs (valid scenario) | 201 Created for both - same image can link to multiple MOCs |
| EDGE-3 | `POST /api/mocs/:id/gallery-images` | Link gallery image owned by different user | 201 Created - gallery images can be linked across user boundaries |
| EDGE-4 | `POST /api/mocs/:id/gallery-images` | Link image to draft MOC | 201 Created - linking works regardless of MOC status |
| EDGE-5 | `POST /api/mocs/:id/gallery-images` | Link image to archived MOC | 201 Created - linking works regardless of MOC status |
| EDGE-6 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Unlink after gallery image was soft-deleted | 404 NOT_FOUND (if soft-delete implemented) or 200 OK (hard delete on link table) |
| EDGE-7 | `GET /api/mocs/:id/gallery-images` | Gallery image has null description and tags | 200 OK with null values preserved in response |
| EDGE-8 | `POST /api/mocs/:id/gallery-images` | Malformed JSON in request body | 400 VALIDATION_ERROR or 500 parse error |
| EDGE-9 | `POST /api/mocs/:id/gallery-images` | Extra fields in request body (should be ignored) | 201 Created, extra fields ignored |
| EDGE-10 | `DELETE /api/mocs/:id/gallery-images/:galleryImageId` | Delete link then attempt to delete again | First: 200 OK, Second: 404 NOT_FOUND |
| EDGE-11 | `GET /api/mocs/:id/gallery-images` | Very large number of linked images (100+) | 200 OK with all images (no pagination currently) |
| EDGE-12 | `POST /api/mocs/:id/gallery-images` | UUID with uppercase letters | 404 or 201 depending on UUID normalization |

---

## Authorization Matrix

| Scenario | GET Gallery Images | POST Link | DELETE Unlink |
|----------|-------------------|-----------|---------------|
| Anonymous (no token) | 401 | 401 | 401 |
| Authenticated (MOC Owner) | 200 | 201 | 200 |
| Authenticated (Non-Owner) | 403 | 403 | 403 |
| Invalid Token | 401 | 401 | 401 |

---

## Cross-Entity Validation Tests

| ID | Test Description | Expected Outcome |
|----|------------------|------------------|
| CEV-1 | Link image where MOC exists but gallery image does not | 404 NOT_FOUND "Gallery image not found" |
| CEV-2 | Link image where gallery image exists but MOC does not | 404 NOT_FOUND "MOC not found" |
| CEV-3 | Unlink where MOC exists but link record does not | 404 NOT_FOUND "Image is not linked to this MOC" |
| CEV-4 | GET images where MOC was deleted after links created | 404 NOT_FOUND "MOC not found" (links cascade deleted) |
| CEV-5 | GET images where gallery image was deleted after link | 200 OK, deleted image not in response (FK cascade) |

---

## Response Structure Validation

### GET /api/mocs/:id/gallery-images Response Schema

```json
{
  "images": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "url": "string (image URL)",
      "tags": ["string"] | null,
      "createdAt": "ISO 8601 datetime",
      "lastUpdatedAt": "ISO 8601 datetime"
    }
  ],
  "total": "number"
}
```

### POST /api/mocs/:id/gallery-images Request Schema

```json
{
  "galleryImageId": "uuid (required)"
}
```

### POST /api/mocs/:id/gallery-images Response Schema

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

### DELETE /api/mocs/:id/gallery-images/:galleryImageId Response Schema

```json
{
  "message": "Gallery image unlinked successfully"
}
```

---

## Database State Requirements

### Seed Data for Testing

#### Users

| User ID | Description |
|---------|-------------|
| `user-owner-001` | Primary test user (owns test MOCs) |
| `user-other-002` | Secondary user (non-owner scenarios) |

#### MOC Instructions

| MOC ID | Owner | Status | Description |
|--------|-------|--------|-------------|
| `moc-with-images-001` | user-owner-001 | published | MOC with 3 linked gallery images |
| `moc-no-images-002` | user-owner-001 | published | MOC with no linked images |
| `moc-draft-003` | user-owner-001 | draft | Draft MOC for status edge cases |
| `moc-archived-004` | user-owner-001 | archived | Archived MOC for status edge cases |
| `moc-other-user-005` | user-other-002 | published | Another user's MOC (403 scenarios) |

#### Gallery Images

| Image ID | Owner | Title | Description |
|----------|-------|-------|-------------|
| `gallery-img-001` | user-owner-001 | "Castle Inspiration 1" | "Medieval castle reference" |
| `gallery-img-002` | user-owner-001 | "Castle Inspiration 2" | "Tower detail reference" |
| `gallery-img-003` | user-owner-001 | "Castle Inspiration 3" | "Gate mechanism reference" |
| `gallery-img-004` | user-owner-001 | "Unlinked Image" | "Available for linking tests" |
| `gallery-img-005` | user-other-002 | "Other User Image" | "Cross-user linking test" |
| `gallery-img-006` | user-owner-001 | "Null Fields" | null description, null tags |

#### MOC Gallery Image Links

| Link ID | MOC ID | Gallery Image ID |
|---------|--------|------------------|
| `link-001` | moc-with-images-001 | gallery-img-001 |
| `link-002` | moc-with-images-001 | gallery-img-002 |
| `link-003` | moc-with-images-001 | gallery-img-003 |

---

## Evidence Requirements

QA must capture the following for each test:

1. **HTTP Request**: Full request including URL, method, headers (redacted auth tokens), body
2. **HTTP Response**: Full response including status code, headers, body
3. **Database State**: Relevant seed data or query results (for data verification)
4. **Pre/Post State**: For write operations, capture before and after database state

### Evidence File Format

Store evidence in `__http__/story-012/` directory:

- `mocs-gallery-get-{test-id}.http` - GET request/response pairs
- `mocs-gallery-link-{test-id}.http` - POST request/response pairs
- `mocs-gallery-unlink-{test-id}.http` - DELETE request/response pairs

---

## Test Execution Order

1. **Setup**: Run seed script to populate test data (MOCs, gallery images, initial links)
2. **Authentication Tests**: ERR-1 through ERR-3, ERR-7, ERR-14
3. **Authorization Tests**: ERR-6, ERR-9, ERR-16
4. **Happy Path - Read**: HP-1, HP-2, HP-6, HP-7
5. **Happy Path - Write**: HP-3, HP-4, HP-5
6. **Input Validation**: ERR-5, ERR-10, ERR-11, ERR-18
7. **Cross-Entity Validation**: ERR-4, ERR-8, ERR-12, ERR-15, ERR-17, CEV-1 through CEV-5
8. **Conflict Detection**: ERR-13
9. **Edge Cases**: EDGE-1 through EDGE-12
10. **Cleanup**: Reset database to known state

---

## Performance Considerations

| Endpoint | Expected Response Time | Notes |
|----------|------------------------|-------|
| GET /api/mocs/:id/gallery-images | < 300ms | JOIN query on moc_gallery_images + gallery_images |
| POST /api/mocs/:id/gallery-images | < 500ms | 3 validation queries + 1 insert |
| DELETE /api/mocs/:id/gallery-images/:galleryImageId | < 300ms | 2 validation queries + 1 delete |

---

## Referential Integrity Tests

| ID | Test Description | Expected Outcome |
|----|------------------|------------------|
| RI-1 | Delete MOC that has linked gallery images | Links cascade deleted, gallery images remain |
| RI-2 | Delete gallery image that is linked to MOC | Links cascade deleted, MOC remains |
| RI-3 | Attempt to create link with invalid mocId FK | 404 NOT_FOUND (MOC lookup fails first) |
| RI-4 | Attempt to create link with invalid galleryImageId FK | 404 NOT_FOUND "Gallery image not found" |

---

## Notes

1. **Authentication**: All three endpoints require valid Cognito JWT authentication. No anonymous access is permitted.

2. **Ownership Validation**: Users can only manage links for MOCs they own. Gallery images can be from any user (cross-user linking is permitted for inspiration sharing).

3. **Cascade Deletes**:
   - Deleting a MOC cascades to delete all `moc_gallery_images` links
   - Deleting a gallery image cascades to delete all `moc_gallery_images` links

4. **No Pagination**: Current implementation returns all linked images without pagination. Consider adding if performance issues arise with large link counts.

5. **Image URL Type**: The `url` field in GET response returns the `imageUrl` from `gallery_images` table - this may be a presigned URL or CDN URL depending on gallery image configuration.

6. **Duplicate Prevention**: The POST endpoint explicitly checks for existing links and returns 409 CONFLICT to prevent duplicate link records.

7. **Order Guarantee**: GET returns images ordered by gallery image `createdAt` (ascending), providing consistent ordering.
