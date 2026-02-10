# INST-1105 Frontend Implementation Instructions

## Context
You are implementing the frontend portion of INST-1105: Upload Instructions (Presigned >10MB).

**Story Directory**: `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105`

## Required Reading (in order)
1. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/INST-1105.md` - Full story
2. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/PLAN.yaml` - Implementation phases
3. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/KNOWLEDGE-CONTEXT.yaml` - Key patterns to reuse
4. `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/SCOPE.yaml` - Detailed scope

## Implementation Phases

### Phase 5: RTK Query Mutations (AC5-7, AC15-17)
**File**: `packages/core/api-client/src/rtk/instructions-api.ts`

**Pattern to Follow**: Existing mutations in same file with invalidatesTags

**Mutations to Add**:

```typescript
createUploadSession: builder.mutation<
  CreateUploadSessionResponse,
  CreateUploadSessionRequest
>({
  query: ({ mocId, ...body }) => ({
    url: `/api/v2/mocs/${mocId}/upload-sessions`,
    method: 'POST',
    body,
  }),
  invalidatesTags: (result, error, { mocId }) => 
    result ? [{ type: 'MocFiles', id: mocId }] : [],
}),

completeUploadSession: builder.mutation<
  CompleteUploadSessionResponse,
  CompleteUploadSessionRequest
>({
  query: ({ mocId, sessionId }) => ({
    url: `/api/v2/mocs/${mocId}/upload-sessions/${sessionId}/complete`,
    method: 'POST',
    body: { sessionId },
  }),
  invalidatesTags: (result, error, { mocId }) => 
    result ? [{ type: 'MocFiles', id: mocId }] : [],
}),
```

**Type Definitions** (in same file or separate types file):
```typescript
interface CreateUploadSessionRequest {
  mocId: string
  filename: string
  fileSize: number
  fileType: string
}

interface CreateUploadSessionResponse {
  sessionId: string
  presignedUrl: string
  expiresAt: string
}

interface CompleteUploadSessionRequest {
  mocId: string
  sessionId: string
}

interface CompleteUploadSessionResponse {
  id: string
  mocId: string
  fileType: string
  fileUrl: string
  originalFilename: string
  mimeType: string
  fileSize: number
  createdAt: string
  uploadedBy: string
}
```

**Endpoints File**: `packages/core/api-client/src/config/endpoints.ts`
```typescript
export const ENDPOINTS = {
  // ... existing
  CREATE_UPLOAD_SESSION: '/api/v2/mocs/:mocId/upload-sessions',
  COMPLETE_UPLOAD_SESSION: '/api/v2/mocs/:mocId/upload-sessions/:sessionId/complete',
}
```

**ACs to Verify**: AC5, AC6, AC7, AC15, AC16, AC17

### Phase 6: Upload Manager Hook Enhancement (AC9-14, AC20-25)
**File**: `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts`

**Pattern to Reuse**: Existing useUploadManager hook (90% reuse)
**XHR Upload**: `packages/core/upload-client/src/xhr.ts` → `uploadToPresignedUrl()` (100% reuse)

**Key Additions**:
1. Integrate `useCreateUploadSessionMutation`
2. Integrate `useCompleteUploadSessionMutation`
3. Session expiry detection (30s buffer - already exists, adapt for presigned)
4. Upload to S3 via `uploadToPresignedUrl` with progress tracking
5. Auto-refresh on session expiry

**Flow**:
```
1. User selects file >10MB
   ↓
2. Call createUploadSession mutation
   ↓
3. Receive { sessionId, presignedUrl, expiresAt }
   ↓
4. Check local TTL (expiresAt - 30s buffer)
   ↓
5. Upload to S3 via uploadToPresignedUrl with progress events
   ↓
6. On success, call completeUploadSession mutation
   ↓
7. On completion, invalidate cache, show success toast
```

**Session Expiry Handling**:
```typescript
const isSessionExpired = (expiresAt: string) => {
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  const bufferMs = 30 * 1000 // 30 seconds
  return expiryTime < (now + bufferMs)
}

const handleExpiredSession = async (fileId: string) => {
  // Mark file as expired
  // Trigger refresh flow
  // Call createUploadSession again
  // Update file with new presignedUrl
}
```

**ACs to Verify**: AC9-AC14, AC20-AC25

### Phase 7: Components (AC1-4, AC8, AC18-19, AC26-30)

#### Component 1: File Size Routing in InstructionsUpload
**File**: `apps/web/app-instructions-gallery/src/components/InstructionsUpload/index.tsx`

**Pattern**: Extend existing component (60% reuse)

**Key Changes**:
```typescript
import { shouldUsePresignedUpload } from '@repo/upload-config'

const handleFileSelect = (files: File[]) => {
  const directUploadFiles = files.filter(f => f.size <= 10 * 1024 * 1024)
  const presignedUploadFiles = files.filter(f => f.size > 10 * 1024 * 1024)
  
  if (presignedUploadFiles.length > 0) {
    // Route to presigned flow
    handlePresignedUpload(presignedUploadFiles)
  }
  
  if (directUploadFiles.length > 0) {
    // Route to direct upload (existing flow)
    handleDirectUpload(directUploadFiles)
  }
}

// Client validation
const validateFileSize = (file: File) => {
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    toast.error('File too large. Max 50MB.')
    return false
  }
  return true
}
```

**ACs to Verify**: AC1, AC2, AC3, AC4

#### Component 2: PresignedUploadProgress
**File**: `apps/web/app-instructions-gallery/src/components/PresignedUploadProgress/index.tsx`

**New Component**: Progress bar with cancel/retry buttons

```typescript
interface PresignedUploadProgressProps {
  file: UploaderFileItem
  onCancel: (fileId: string) => void
  onRetry: (fileId: string) => void
}

export function PresignedUploadProgress({ file, onCancel, onRetry }: PresignedUploadProgressProps) {
  return (
    <div className="upload-progress">
      <div className="file-info">
        <span>{file.name}</span>
        <span>{file.progress}%</span>
      </div>
      
      <ProgressBar value={file.progress} max={100} />
      
      <div className="upload-stats">
        <span>Uploading... {file.uploadSpeed} MB/s</span>
      </div>
      
      <div className="actions">
        {file.status === 'uploading' && (
          <Button onClick={() => onCancel(file.id)}>Cancel</Button>
        )}
        {file.status === 'failed' && (
          <Button onClick={() => onRetry(file.id)}>Retry</Button>
        )}
      </div>
    </div>
  )
}
```

**UI Components**: Use `@repo/ui` (Button, ProgressBar from primitives)

**ACs to Verify**: AC11, AC13, AC14, AC27

#### Component 3: SessionExpiryWarning
**File**: `apps/web/app-instructions-gallery/src/components/SessionExpiryWarning/index.tsx`

**New Component**: Warning banner for session expiry

```typescript
interface SessionExpiryWarningProps {
  expiresAt: string
  onRefresh: () => void
}

export function SessionExpiryWarning({ expiresAt, onRefresh }: SessionExpiryWarningProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const expiry = new Date(expiresAt).getTime()
      const remaining = Math.max(0, expiry - now)
      setTimeRemaining(remaining)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [expiresAt])
  
  const minutesRemaining = Math.floor(timeRemaining / 60000)
  
  if (minutesRemaining > 5) return null
  
  return (
    <div className="session-expiry-warning" role="alert" aria-live="polite">
      <AlertTriangle className="icon" />
      <span>Upload session expires in {minutesRemaining} minutes</span>
      <Button onClick={onRefresh} variant="secondary">
        Refresh Session
      </Button>
    </div>
  )
}
```

**ACs to Verify**: AC8, AC21, AC22

### Phase 8: Upload Config Enhancement
**File**: `packages/tools/upload-config/src/schema.ts`

**Add Constants**:
```typescript
export const pdfMinBytesForPresigned = 10 * 1024 * 1024 // 10MB
```

**File**: `packages/tools/upload-config/src/index.ts`

**Add Utility**:
```typescript
export const shouldUsePresignedUpload = (fileSize: number): boolean => {
  return fileSize > pdfMinBytesForPresigned
}

export const validateFileSizeForPresigned = (fileSize: number): { valid: boolean; error?: string } => {
  if (fileSize <= pdfMinBytesForPresigned) {
    return { valid: false, error: 'Use direct upload for files ≤10MB' }
  }
  if (fileSize > pdfMaxBytes) {
    return { valid: false, error: 'File too large. Max 50MB.' }
  }
  return { valid: true }
}
```

**ACs to Verify**: AC1, AC2

### Testing Requirements

**Unit Tests** (Phase 9):
- `apps/web/app-instructions-gallery/src/components/PresignedUploadProgress/__tests__/index.test.tsx`
- `apps/web/app-instructions-gallery/src/hooks/__tests__/usePresignedUpload.test.ts`
- Coverage: 80% minimum

**Integration Tests** (Phase 10):
- File: `apps/web/app-instructions-gallery/src/components/InstructionsUpload/__tests__/presigned-integration.test.tsx`
- MSW handlers: `apps/web/app-instructions-gallery/src/test/handlers/index.ts`

**MSW Handlers**:
```typescript
rest.post('/api/v2/mocs/:mocId/upload-sessions', (req, res, ctx) => {
  return res(
    ctx.status(201),
    ctx.json({
      sessionId: 'mock-session-id',
      presignedUrl: 'https://mock-s3-url.com',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    })
  )
}),

rest.post('/api/v2/mocs/:mocId/upload-sessions/:sessionId/complete', (req, res, ctx) => {
  return res(
    ctx.status(200),
    ctx.json({
      id: 'mock-file-id',
      mocId: req.params.mocId,
      fileType: 'instruction',
      fileUrl: 'https://cdn.example.com/file.pdf',
      originalFilename: 'test.pdf',
      mimeType: 'application/pdf',
      fileSize: 26214400,
      createdAt: new Date().toISOString(),
      uploadedBy: 'user-123'
    })
  )
})
```

**ACs to Verify**: AC70-AC77

## Output Requirements

Write to: `/Users/michaelmenard/Development/Monorepo/plans/future/instructions/ready-to-work/INST-1105/_implementation/FRONTEND-LOG.md`

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
2. ALWAYS import UI components from @repo/ui (NEVER from individual paths)
3. ALWAYS use @repo/logger (NEVER console.log)
4. Use semantic queries in tests: getByRole, getByLabelText
5. Follow component directory structure (index.tsx, __tests__/, __types__/)
6. Named exports preferred

## Start Command
```bash
cd /Users/michaelmenard/Development/Monorepo
# Read the story and implementation plan
# Begin with Phase 5 (RTK Query Mutations)
# Note: Phase 5 depends on backend routes being available
```

## Dependency Note
Frontend Phase 5 (RTK Query) depends on Backend Phase 4 (Routes) being completed first.
Coordinate with backend worker or wait for routes to be available.
