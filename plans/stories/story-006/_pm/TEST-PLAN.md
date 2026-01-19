# STORY-006 Test Plan

## Story: Gallery - Albums (Full CRUD)

This test plan covers the 5 Vercel endpoints for inspiration gallery album management.

---

## 1. Happy Path Tests

### 1.1 Create Album (POST /api/gallery/albums)

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| HP-CREATE-001 | Create album with required fields | `{ "title": "My Album" }` | 201 Created, album object with generated id |
| HP-CREATE-002 | Create album with all fields | `{ "title": "My Album", "description": "Test description" }` | 201 Created, all fields persisted |
| HP-CREATE-003 | Create album with cover image | `{ "title": "My Album", "coverImageId": "<valid-image-id>" }` | 201 Created, coverImageId set |

### 1.2 Get Album (GET /api/gallery/albums/:id)

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| HP-GET-001 | Get existing album by ID | Valid album UUID | 200 OK, album with images and imageCount |
| HP-GET-002 | Get album includes nested images | Valid album UUID with images | 200 OK, images array populated |

### 1.3 List Albums (GET /api/gallery/albums)

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| HP-LIST-001 | List albums with defaults | No params | 200 OK, paginated list (page 1, limit 20) |
| HP-LIST-002 | List albums with pagination | `?page=2&limit=5` | 200 OK, correct page and limit |
| HP-LIST-003 | List albums includes imageCount | No params | 200 OK, each album has imageCount and coverImageUrl |

### 1.4 Update Album (PATCH /api/gallery/albums/:id)

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| HP-UPDATE-001 | Update album title | `{ "title": "Updated Title" }` | 200 OK, title updated, lastUpdatedAt changed |
| HP-UPDATE-002 | Update multiple fields | `{ "title": "New", "description": "New desc" }` | 200 OK, both fields updated |
| HP-UPDATE-003 | Update cover image | `{ "coverImageId": "<valid-image-id>" }` | 200 OK, coverImageId updated |
| HP-UPDATE-004 | Clear cover image | `{ "coverImageId": null }` | 200 OK, coverImageId set to null |

### 1.5 Delete Album (DELETE /api/gallery/albums/:id)

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| HP-DELETE-001 | Delete existing album | Valid album UUID | 204 No Content |
| HP-DELETE-002 | Images orphaned not deleted | Delete album with images | Images still exist with albumId=null |

---

## 2. Error Cases

### 2.1 Authentication Errors

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| ERR-AUTH-001 | Any endpoint without auth | No token/AUTH_BYPASS=false | 401 Unauthorized |

### 2.2 Create Album Errors

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| ERR-CREATE-001 | Missing title | `{}` | 400 Bad Request |
| ERR-CREATE-002 | Empty title | `{ "title": "" }` | 400 Bad Request |
| ERR-CREATE-003 | Title too long | `{ "title": "<201 chars>" }` | 400 Bad Request |
| ERR-CREATE-004 | Invalid coverImageId format | `{ "title": "Test", "coverImageId": "not-uuid" }` | 400 Bad Request |
| ERR-CREATE-005 | Non-existent coverImageId | `{ "title": "Test", "coverImageId": "<nonexistent-uuid>" }` | 400 Validation Error |
| ERR-CREATE-006 | Other user's image as cover | `{ "title": "Test", "coverImageId": "<other-user-image>" }` | 403 Forbidden |

### 2.3 Get Album Errors

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| ERR-GET-001 | Invalid UUID format | GET `/api/gallery/albums/not-a-uuid` | 400 Bad Request |
| ERR-GET-002 | Album not found | GET `/api/gallery/albums/00000000-0000-0000-0000-000000000000` | 404 Not Found |
| ERR-GET-003 | Other user's album | GET album owned by different user | 403 Forbidden |

### 2.4 List Albums Errors

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| ERR-LIST-001 | Invalid page parameter | `?page=-1` | 400 Bad Request |
| ERR-LIST-002 | Invalid limit parameter | `?limit=0` | 400 Bad Request |
| ERR-LIST-003 | Limit exceeds max | `?limit=200` | Capped at 100 (not error) |

### 2.5 Update Album Errors

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| ERR-UPDATE-001 | Invalid UUID format | PATCH `/api/gallery/albums/not-a-uuid` | 400 Bad Request |
| ERR-UPDATE-002 | Album not found | PATCH nonexistent UUID | 404 Not Found |
| ERR-UPDATE-003 | Other user's album | PATCH album owned by different user | 403 Forbidden |
| ERR-UPDATE-004 | Invalid coverImageId | `{ "coverImageId": "not-uuid" }` | 400 Bad Request |
| ERR-UPDATE-005 | Non-existent coverImageId | `{ "coverImageId": "<nonexistent-uuid>" }` | 400 Validation Error |
| ERR-UPDATE-006 | Other user's image as cover | `{ "coverImageId": "<other-user-image>" }` | 403 Forbidden |

### 2.6 Delete Album Errors

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| ERR-DELETE-001 | Invalid UUID format | DELETE `/api/gallery/albums/not-a-uuid` | 400 Bad Request |
| ERR-DELETE-002 | Album not found | DELETE nonexistent UUID | 404 Not Found |
| ERR-DELETE-003 | Other user's album | DELETE album owned by different user | 403 Forbidden |

---

## 3. Edge Cases

### 3.1 Boundary Conditions

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| EDGE-001 | Title at max length (200) | `{ "title": "<200 chars>" }` | 201 Created |
| EDGE-002 | Description at max length (2000) | `{ "title": "Test", "description": "<2000 chars>" }` | 201 Created |
| EDGE-003 | Unicode in title | `{ "title": "Album" }` | 201 Created |
| EDGE-004 | Empty description | `{ "title": "Test", "description": "" }` | 201 Created |
| EDGE-005 | List empty albums | User with no albums | 200 OK, `{ data: [], pagination: {...} }` |
| EDGE-006 | Pagination beyond total | `?page=999` | 200 OK, empty data array |

### 3.2 State Transitions

| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| EDGE-007 | Delete album with images | Album containing images | Images orphaned (albumId=null), not deleted |
| EDGE-008 | Update empty body | `{}` | 200 OK, only lastUpdatedAt changes |

---

## 4. Evidence Requirements

### 4.1 HTTP Contract Evidence

All `.http` requests in `/__http__/gallery.http` must be executed and responses captured:

**Create Operations:**
- `createAlbum` - 201 response
- `createAlbumFull` - 201 response with all fields
- `createAlbumMissingTitle` - 400 response
- `createAlbumInvalidCover` - 400 response

**Get Operations:**
- `getAlbum` - 200 response with album data
- `getAlbumNotFound` - 404 response
- `getAlbumInvalidId` - 400 response

**List Operations:**
- `listAlbums` - 200 response with pagination
- `listAlbumsPaginated` - 200 response with custom pagination

**Update Operations:**
- `updateAlbum` - 200 response
- `updateAlbumNotFound` - 404 response
- `updateAlbumForbidden` - 403 response

**Delete Operations:**
- `deleteAlbum` - 204 response
- `deleteAlbumNotFound` - 404 response

### 4.2 Unit Test Evidence

- Core function tests pass: `pnpm test packages/backend/gallery-core`
- Coverage report included in proof

### 4.3 Integration Evidence

- `vercel dev` starts successfully
- All HTTP requests return expected status codes
- Database state verified after mutations

---

## 5. Blockers

None identified. All dependencies exist:
- Database schema exists (`gallery_albums` table)
- Auth pattern established in STORY-004/005
- Vercel endpoint pattern established
