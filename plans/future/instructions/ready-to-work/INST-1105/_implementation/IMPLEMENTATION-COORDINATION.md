# INST-1105 Implementation Coordination

**Story**: Upload Instructions (Presigned >10MB)  
**Phase**: Implementation (Phase 2)  
**Started**: 2026-02-09T22:45:00Z  
**Autonomy Level**: conservative  
**Batch Mode**: false

## Scope Analysis

Based on SCOPE.yaml analysis:

### Backend Work Required
- **Database Migration**: Add `originalFilename` and `originalFileSize` columns to `upload_sessions` table
- **Port Interfaces**: Define `UploadSessionRepository` and `S3StoragePort` in `apps/api/lego-api/domains/mocs/ports/index.ts`
- **Services**: Implement `createUploadSession()` and `completeUploadSession()` in `apps/api/lego-api/domains/mocs/application/services.ts`
- **Routes**: Add POST `/mocs/:id/upload-sessions` and POST `/mocs/:id/upload-sessions/:sessionId/complete` endpoints
- **Validation**: Add Zod schemas for request/response validation

### Frontend Work Required
- **RTK Query Mutations**: Add `useCreateUploadSessionMutation` and `useCompleteUploadSessionMutation` in `packages/core/api-client/src/rtk/instructions-api.ts`
- **Hooks**: Adapt `useUploadManager` hook for presigned upload flow
- **Components**: Create `PresignedUploadProgress` and `SessionExpiryWarning` components
- **Upload Routing**: Extend `InstructionsUpload` to route >10MB files to presigned flow
- **Utilities**: Add file size detection and validation utilities

### Contracts Work Required
- **None**: This story extends existing patterns, no new contract worker needed

## Parallel Execution Plan

### Wave 1: Foundation (Parallel)
1. **Backend Worker**: Database migration + Port interfaces (Phases 1-2)
2. **Frontend Worker**: Can start utility setup in parallel

### Wave 2: Core Implementation (Sequential after Wave 1)
1. **Backend Worker**: Services + Routes (Phases 3-4)
2. **Frontend Worker**: RTK Query mutations (Phase 5) - depends on routes

### Wave 3: Integration (Sequential after Wave 2)
1. **Frontend Worker**: Hooks + Components (Phases 6-7)

### Wave 4: Testing (Parallel after Wave 3)
1. **Backend Worker**: Unit + Integration tests (Phases 9-10)
2. **Frontend Worker**: Unit + Integration tests (Phases 9-10)

### Wave 5: E2E (Sequential after Wave 4)
1. **Dedicated E2E Worker**: Playwright tests (Phase 11)

## Pattern Reuse Map

### Backend Patterns
- **editPresign** (`packages/backend/moc-instructions-core/src/edit-presign.ts`): 85% reuse
  - Authorization → Rate limit → Validation → S3 presign URL generation
- **editFinalize** (`packages/backend/moc-instructions-core/src/edit-finalize.ts`): 85% reuse
  - Session verification → S3 headObject → Transaction → Status update

### Frontend Patterns
- **useUploadManager** (`apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts`): 90% reuse
  - Session expiry (30s buffer), progress tracking, cancel, retry
- **uploadToPresignedUrl** (`packages/core/upload-client/src/xhr.ts`): 100% reuse
  - XHR-based S3 upload with progress events

## Acceptance Criteria Coverage

**Total ACs**: 94

### Phase Distribution
- **Frontend ACs**: AC1-AC30 (30 ACs)
- **Backend ACs**: AC31-AC65 (35 ACs)
- **Database ACs**: AC66-AC69 (4 ACs)
- **Testing ACs**: AC70-AC85 (16 ACs)
- **Architecture ACs**: AC86-AC94 (9 ACs)

## Risk Mitigation

### Identified Risks
1. **Session expiry during multi-file upload**: Mitigated via 30s buffer + auto-refresh (existing pattern)
2. **S3 upload succeeds but completion fails**: Handled via idempotent completion endpoint
3. **CORS configuration**: Need to verify S3 bucket allows PUT from app domain
4. **File handle lost after page reload**: hasFileHandle() check + prompt re-selection

### Decision Points
Based on conservative autonomy level:
- Tier 1 (Clarification): Escalate to user
- Tier 2 (Preference): Escalate to user
- Tier 3 (Ambiguous): Escalate to user
- Tier 4 (Destructive): ALWAYS escalate
- Tier 5 (External): Escalate to user

## Expected Outputs

### Backend Worker Output
- File: `_implementation/BACKEND-LOG.md`
- Contents:
  - Migration file created
  - Port interfaces defined
  - Services implemented
  - Routes added
  - Unit tests passing
  - Integration tests passing

### Frontend Worker Output
- File: `_implementation/FRONTEND-LOG.md`
- Contents:
  - RTK Query mutations added
  - Hooks adapted
  - Components created
  - Unit tests passing
  - Integration tests passing

### Final Evidence
- File: `_implementation/EVIDENCE.yaml`
- Contents:
  - All files created/modified
  - Test results (unit, integration, E2E)
  - ACs verified
  - E2E status (must be "pass" with mode "live")

## Next Steps

**LIMITATION DETECTED**: Implementation Leader agent invoked without Task tool access. Cannot spawn workers directly.

**Recommended Approach**:
1. User should invoke workers individually, OR
2. User should invoke via proper orchestrator with Task tool, OR
3. Implementation Leader provides detailed step-by-step guidance

Proceeding with Option 3: Detailed guidance below.

