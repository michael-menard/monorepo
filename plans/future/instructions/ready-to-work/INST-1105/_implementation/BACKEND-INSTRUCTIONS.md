# INST-1105 Backend Implementation Instructions

## Context
You are implementing the backend portion of INST-1105: Upload Instructions (Presigned >10MB).

**Story Directory**: `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105`

## Required Reading (in order)
1. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/INST-1105.md` - Full story
2. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/PLAN.yaml` - Implementation phases
3. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/KNOWLEDGE-CONTEXT.yaml` - Key patterns to reuse
4. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/SCOPE.yaml` - Detailed scope

## Implementation Phases

### Phase 1: Database Migration (AC92-94)
**File**: `packages/backend/database-schema/src/migrations/app/0011_add_upload_session_metadata.sql`

```sql
-- Add metadata columns to upload_sessions table for presigned upload tracking
ALTER TABLE upload_sessions 
  ADD COLUMN originalFilename VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN originalFileSize BIGINT NOT NULL DEFAULT 0;

-- Remove defaults after adding columns (for new inserts)
ALTER TABLE upload_sessions 
  ALTER COLUMN originalFilename DROP DEFAULT,
  ALTER COLUMN originalFileSize DROP DEFAULT;
```

**Pattern to Follow**: Look at existing migrations in `packages/backend/database-schema/src/migrations/app/`

**ACs to Verify**: AC92, AC93, AC94

### Phase 2: Port Interfaces (AC86-88)
**File**: `apps/api/lego-api/domains/mocs/ports/index.ts`

**Pattern to Reuse**: Existing port interfaces in same file (look for `MocImageStorage`)

Add two new interfaces:

```typescript
export interface UploadSessionRepository {
  createSession(params: {
    id: string
    userId: string
    mocId: string
    s3Key: string
    originalFilename: string
    originalFileSize: number
    expiresAt: Date
  }): Promise<void>
  
  getSession(sessionId: string): Promise<UploadSession | null>
  
  updateSessionStatus(sessionId: string, status: 'completed' | 'failed' | 'expired'): Promise<void>
  
  expireOldSessions(beforeDate: Date): Promise<number>
}

export interface S3StoragePort {
  generatePresignedUrl(params: {
    bucket: string
    key: string
    contentType: string
    expiresIn: number
  }): Promise<string>
  
  headObject(bucket: string, key: string): Promise<{
    ContentLength?: number
    ContentType?: string
    ETag?: string
  }>
  
  copyObject(source: string, destination: string): Promise<void>
  
  deleteObject(bucket: string, key: string): Promise<void>
}
```

**ACs to Verify**: AC86, AC87, AC88

### Phase 3: Services (AC89-91, AC31-65)
**File**: `apps/api/lego-api/domains/mocs/application/services.ts`

**Patterns to Reuse**:
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/edit-presign.ts` (85% reuse)
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/edit-finalize.ts` (85% reuse)

**Key Pattern**: editPresign flow
```
Authorization check (user owns MOC)
  ↓
Rate limit check
  ↓
File validation (size, type)
  ↓
Generate presigned S3 URL
  ↓
Create upload_sessions record
  ↓
Return session data
```

**Key Pattern**: editFinalize flow
```
Authorization check (user owns session)
  ↓
Session status check (not expired/completed)
  ↓
S3 verification (headObject)
  ↓
File size verification (within 5% tolerance)
  ↓
Transaction:
  - Insert moc_files record
  - Update upload_sessions status
  ↓
Return file metadata
```

**Service Functions to Implement**:
1. `createUploadSession(mocId, userId, filename, fileSize, fileType, deps)` 
2. `completeUploadSession(sessionId, userId, deps)`

**Dependencies Pattern** (from editPresign):
```typescript
interface CreateUploadSessionDeps {
  uploadSessionRepo: UploadSessionRepository
  s3Storage: S3StoragePort
  mocRepo: MocRepository
  rateLimit: RateLimitService
  config: {
    s3Bucket: string
    presignTtlMinutes: number
    pdfMaxBytes: number
    pdfMinBytesForPresigned: number
  }
}
```

**ACs to Verify**: AC31-AC48 (createUploadSession), AC49-AC65 (completeUploadSession), AC89-AC91

### Phase 4: Routes (AC31-35, AC49-51)
**File**: `apps/api/lego-api/domains/mocs/routes.ts`

**Pattern to Follow**: Existing Hono routes in same file with auth middleware chain

```typescript
// POST /mocs/:id/upload-sessions
app.post(
  '/mocs/:id/upload-sessions',
  authMiddleware,
  loadPermissions,
  requireFeature('moc'),
  async (c) => {
    // Extract request data
    // Call createUploadSession service
    // Return 201 with session data
  }
)

// POST /mocs/:id/upload-sessions/:sessionId/complete
app.post(
  '/mocs/:id/upload-sessions/:sessionId/complete',
  authMiddleware,
  loadPermissions,
  requireFeature('moc'),
  async (c) => {
    // Extract session ID
    // Call completeUploadSession service
    // Return 200 with file metadata
  }
)
```

**ACs to Verify**: AC31-AC35, AC49-AC51

### Phase 5: Validation Schemas
**File**: `apps/api/lego-api/domains/mocs/application/validation.ts`

**Pattern to Follow**: Existing Zod schemas in same file

```typescript
export const CreateUploadSessionRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  fileType: z.literal('application/pdf')
})

export const CompleteUploadSessionRequestSchema = z.object({
  sessionId: z.string().uuid()
})
```

**ACs to Verify**: AC36-AC39

### Testing Requirements

**Unit Tests** (Phase 9):
- File: `apps/api/lego-api/domains/mocs/application/__tests__/upload-session-services.test.ts`
- Coverage: 90% minimum
- Test scenarios:
  - createUploadSession: valid request, file too small, file too large, unauthorized, rate limited
  - completeUploadSession: valid, file missing in S3, size mismatch, already completed, unauthorized

**Integration Tests** (Phase 10):
- Use .http files or integration test suite
- Test full flow with mocked S3
- Test error scenarios

**ACs to Verify**: AC70-AC79

## Output Requirements

Write to: `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/BACKEND-LOG.md`

Include:
1. Files created/modified with line counts
2. Test results (passing/failing)
3. ACs verified (list them explicitly)
4. Any blockers or decisions required
5. Type check results (`pnpm check-types`)
6. Lint results (`pnpm lint`)

## Fast-Fail Protocol
Run `pnpm check-types` after each phase. Stop if types fail.

## Decision Protocol
- Autonomy level: **conservative**
- Any ambiguous decisions → Write to BLOCKERS.md and report `BLOCKED: Decision required`
- Reference: `.claude/agents/_shared/decision-handling.md`

## Critical Patterns
1. Use Zod schemas for all types (NEVER use TypeScript interfaces)
2. Follow Ports & Adapters architecture (services depend on port interfaces)
3. Use dependency injection for all external services
4. Return discriminated union results: `{ success: true, data: T } | { success: false, error: ErrorCode }`
5. Wrap DB operations in transactions
6. Use @repo/logger (NEVER console.log)

## Start Command
```bash
cd /Users/michaelmenard/Development/Monorepo
# Read the story and implementation plan
# Begin with Phase 1 (Database Migration)
```
