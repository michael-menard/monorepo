# Test Plan: INFR-0030 — MinIO/S3 Docker Setup + Client Adapter

## Scope Summary

### Infrastructure Touched
- Docker Compose stack (`infra/compose.lego-app.yaml`)
- MinIO service (new)
- S3 client adapter (`packages/backend/s3-client/`)

### Backend Touched
Yes - S3 client enhancement with environment detection

### UI Touched
No

### Data/Storage Touched
Yes - MinIO blob storage (local development)

---

## Happy Path Tests

### Test 1: MinIO Service Starts Successfully

**Setup:**
- Clean Docker environment (remove any existing MinIO containers/volumes)
- Ensure Docker is running

**Action:**
```bash
cd /Users/michaelmenard/Development/monorepo
docker compose -f infra/compose.lego-app.yaml up -d minio
```

**Expected Outcome:**
- MinIO container starts and becomes healthy within 30 seconds
- Container named `monorepo-minio` is running
- Health check passes (status: healthy)

**Evidence:**
```bash
docker ps | grep minio
# Should show: STATUS = healthy
docker logs monorepo-minio
# Should show: MinIO started successfully
```

### Test 2: MinIO S3 API Accessible

**Setup:**
- MinIO service running (from Test 1)

**Action:**
```bash
curl -I http://localhost:9000
```

**Expected Outcome:**
- HTTP response received (may be 403/404, but connection succeeds)
- No connection refused errors

**Evidence:**
- HTTP status code returned
- MinIO server headers present

### Test 3: Default Bucket Created Automatically

**Setup:**
- MinIO service running (from Test 1)
- MinIO client (`mc`) installed locally or via Docker exec

**Action:**
```bash
docker exec monorepo-minio mc ls local/
```

**Expected Outcome:**
- Bucket `workflow-artifacts` exists in listing

**Evidence:**
```bash
# Output should include:
[YYYY-MM-DD HH:MM:SS UTC]     0B workflow-artifacts/
```

### Test 4: S3 Client Detects Local Environment

**Setup:**
- Set environment variables:
  ```bash
  export NODE_ENV=development
  export S3_ENDPOINT=http://localhost:9000
  export S3_ACCESS_KEY_ID=minioadmin
  export S3_SECRET_ACCESS_KEY=minioadmin
  ```

**Action:**
- Create test script that imports S3 client and logs configuration
- Run script

**Expected Outcome:**
- Client uses MinIO endpoint (`http://localhost:9000`)
- `forcePathStyle: true` is set
- No errors initializing client

**Evidence:**
- Log output shows MinIO endpoint
- Log output confirms path-style addressing enabled

### Test 5: Upload File to MinIO via S3 Client

**Setup:**
- MinIO running with default bucket
- S3 client configured for local environment (from Test 4)
- Test file: `test-artifact.txt` with content "Hello MinIO"

**Action:**
```typescript
// Test script
import { uploadToS3 } from '@repo/s3-client'

const result = await uploadToS3({
  bucket: 'workflow-artifacts',
  key: 'test/test-artifact.txt',
  body: Buffer.from('Hello MinIO'),
  contentType: 'text/plain'
})
```

**Expected Outcome:**
- Upload succeeds without errors
- Function returns success response with ETag

**Evidence:**
- No exceptions thrown
- Verify file exists in MinIO:
  ```bash
  docker exec monorepo-minio mc cat local/workflow-artifacts/test/test-artifact.txt
  # Should output: Hello MinIO
  ```

### Test 6: Download File from MinIO via S3 Client

**Setup:**
- File uploaded in Test 5

**Action:**
```typescript
import { downloadFromS3 } from '@repo/s3-client'

const result = await downloadFromS3({
  bucket: 'workflow-artifacts',
  key: 'test/test-artifact.txt'
})
```

**Expected Outcome:**
- Download succeeds
- Content matches uploaded file: "Hello MinIO"

**Evidence:**
- Buffer content equals expected string
- No errors during download

### Test 7: Delete File from MinIO via S3 Client

**Setup:**
- File exists from Test 5

**Action:**
```typescript
import { deleteFromS3 } from '@repo/s3-client'

await deleteFromS3({
  bucket: 'workflow-artifacts',
  key: 'test/test-artifact.txt'
})
```

**Expected Outcome:**
- Delete succeeds without errors
- File no longer exists in MinIO

**Evidence:**
```bash
docker exec monorepo-minio mc cat local/workflow-artifacts/test/test-artifact.txt
# Should return: Object does not exist
```

---

## Error Cases

### Error 1: MinIO Not Running

**Setup:**
- Stop MinIO container:
  ```bash
  docker compose -f infra/compose.lego-app.yaml stop minio
  ```

**Action:**
```typescript
import { uploadToS3 } from '@repo/s3-client'

await uploadToS3({
  bucket: 'workflow-artifacts',
  key: 'test/fail.txt',
  body: Buffer.from('test')
})
```

**Expected Outcome:**
- Operation fails with clear error message
- Error indicates connection refused or timeout
- Error distinguishes local MinIO vs production S3

**Evidence:**
- Exception thrown with message containing "MinIO" or "localhost:9000"
- No generic network errors
- Helpful suggestion: "Ensure MinIO is running: docker compose up -d minio"

### Error 2: Invalid Credentials

**Setup:**
- MinIO running
- Set invalid credentials:
  ```bash
  export S3_ACCESS_KEY_ID=invalid
  export S3_SECRET_ACCESS_KEY=invalid
  ```

**Action:**
- Attempt to upload file (Test 5)

**Expected Outcome:**
- Authentication error thrown
- HTTP 403 status or equivalent
- Clear error message

**Evidence:**
- Error message includes "Access Denied" or "Invalid credentials"
- No silent failures

### Error 3: Bucket Does Not Exist

**Setup:**
- MinIO running
- Valid credentials

**Action:**
```typescript
await uploadToS3({
  bucket: 'nonexistent-bucket',
  key: 'test/fail.txt',
  body: Buffer.from('test')
})
```

**Expected Outcome:**
- Error indicates bucket not found
- HTTP 404 or NoSuchBucket error

**Evidence:**
- Error message includes bucket name
- Suggests running bucket initialization

### Error 4: Production Environment (AWS S3)

**Setup:**
- Unset local environment variables
- Set production environment:
  ```bash
  unset S3_ENDPOINT
  export NODE_ENV=production
  export AWS_REGION=us-east-1
  ```

**Action:**
- Initialize S3 client
- Log configuration

**Expected Outcome:**
- Client uses AWS S3 (no custom endpoint)
- `forcePathStyle` is NOT set (or set to false)
- Default AWS credential provider chain used

**Evidence:**
- Configuration shows no custom endpoint
- Path-style addressing disabled
- AWS SDK default behavior preserved

---

## Edge Cases

### Edge 1: Bucket Already Exists (Idempotency)

**Setup:**
- MinIO running
- Bucket `workflow-artifacts` already exists

**Action:**
```typescript
import { initializeBucket } from '@repo/s3-client'

await initializeBucket('workflow-artifacts')
```

**Expected Outcome:**
- Operation succeeds without errors
- Existing bucket unchanged
- No "bucket already exists" errors

**Evidence:**
- Function completes successfully
- Idempotent behavior confirmed

### Edge 2: Large File Upload (Multipart)

**Setup:**
- MinIO running
- Create test file > 5MB

**Action:**
```typescript
import { uploadToS3Multipart } from '@repo/s3-client'

const largeBuffer = Buffer.alloc(6 * 1024 * 1024) // 6 MB
await uploadToS3Multipart({
  bucket: 'workflow-artifacts',
  key: 'test/large-file.bin',
  body: largeBuffer
})
```

**Expected Outcome:**
- Multipart upload succeeds against MinIO
- File stored correctly
- Can download and verify size

**Evidence:**
```bash
docker exec monorepo-minio mc stat local/workflow-artifacts/test/large-file.bin
# Size should show ~6 MB
```

### Edge 3: MinIO Data Persistence Across Restarts

**Setup:**
- MinIO running with data
- Upload test file

**Action:**
```bash
docker compose -f infra/compose.lego-app.yaml restart minio
# Wait for healthy status
docker exec monorepo-minio mc cat local/workflow-artifacts/test/test-artifact.txt
```

**Expected Outcome:**
- File persists after restart
- Named volume `minio_data` preserves state

**Evidence:**
- File content matches original upload
- No data loss

### Edge 4: Empty File Upload

**Setup:**
- MinIO running

**Action:**
```typescript
await uploadToS3({
  bucket: 'workflow-artifacts',
  key: 'test/empty.txt',
  body: Buffer.alloc(0)
})
```

**Expected Outcome:**
- Upload succeeds
- Zero-byte file created

**Evidence:**
```bash
docker exec monorepo-minio mc stat local/workflow-artifacts/test/empty.txt
# Size: 0 B
```

### Edge 5: Special Characters in Keys

**Setup:**
- MinIO running

**Action:**
```typescript
await uploadToS3({
  bucket: 'workflow-artifacts',
  key: 'test/file with spaces & special!chars.txt',
  body: Buffer.from('test')
})
```

**Expected Outcome:**
- Upload succeeds with URL-encoded key
- File retrievable with same key

**Evidence:**
- Download succeeds with same key
- Content matches

---

## Required Tooling Evidence

### Backend Testing

**Integration Tests:**
- Test file: `packages/backend/s3-client/__tests__/s3-client-minio.test.ts`
- Requires Docker running with MinIO
- Test suite covers:
  - Environment detection (local vs production)
  - Upload/download/delete operations
  - Multipart upload
  - Bucket initialization
  - Error handling

**Manual Test Script:**
- Create `packages/backend/s3-client/scripts/test-minio.ts`
- Run with: `pnpm tsx scripts/test-minio.ts`
- Script performs Happy Path Tests 4-7
- Outputs: success/failure for each operation
- Logs S3 client configuration

**Required Assertions:**
- Upload returns ETag
- Download returns Buffer with correct content
- Delete succeeds without throwing
- Bucket creation is idempotent
- Environment variables correctly detected

### Infrastructure Testing

**Docker Compose Validation:**
```bash
# Validate compose file syntax
docker compose -f infra/compose.lego-app.yaml config

# Check health status
docker compose -f infra/compose.lego-app.yaml ps

# Verify volume created
docker volume ls | grep minio
```

**Health Check Validation:**
```bash
# Inspect health check definition
docker inspect monorepo-minio | jq '.[0].State.Health'

# Should show:
# - Status: healthy
# - FailingStreak: 0
```

### Documentation Evidence

**README Updates:**
- Section: "Local Development Setup"
- Includes: `docker compose up -d` command
- Documents: MinIO ports (9000, 9001)
- Links to `.env.example` for configuration

**Environment Variables:**
- `.env.example` includes:
  ```
  # S3/MinIO Configuration
  NODE_ENV=development
  S3_ENDPOINT=http://localhost:9000
  S3_ACCESS_KEY_ID=minioadmin
  S3_SECRET_ACCESS_KEY=minioadmin
  AWS_REGION=us-east-1
  ```

---

## Risks to Call Out

### Test Fragility

**Risk:** Integration tests fail if Docker not running or MinIO slow to start

**Mitigation:**
- Add retry logic with exponential backoff
- Clear error messages if Docker unavailable
- Document Docker requirement in test README

### Missing Prerequisites

**Risk:** Developers may not have MinIO client (`mc`) installed

**Mitigation:**
- Use `docker exec` to run `mc` commands inside MinIO container
- Document alternative: MinIO web console at `localhost:9001`

### Port Conflicts

**Risk:** Ports 9000 or 9001 already in use

**Mitigation:**
- Document how to check for port conflicts
- Provide instructions to stop conflicting services
- Consider making ports configurable via environment variables

### AWS SDK Version Compatibility

**Risk:** MinIO may not support all AWS SDK v3 features

**Mitigation:**
- Test with current SDK version (@aws-sdk/client-s3)
- Document any known limitations
- Use stable S3 API features only (PutObject, GetObject, DeleteObject)

### Test Data Cleanup

**Risk:** Test artifacts accumulate in MinIO

**Mitigation:**
- Test suite cleanup: delete test files after each test
- Teardown script: `mc rm --recursive local/workflow-artifacts/test/`
- Document manual cleanup if needed
