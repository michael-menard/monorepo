# INST-1105 Implementation Orchestration Status

**Date**: 2026-02-09T22:45:00Z  
**Orchestrator**: dev-implement-implementation-leader  
**Story**: INST-1105 - Upload Instructions (Presigned >10MB)  
**Autonomy Level**: conservative  
**Batch Mode**: false

## Status: READY FOR WORKER EXECUTION

### Limitation Detected
The Implementation Leader agent was invoked without access to the Task tool, which is required for spawning background workers. 

### Workaround Applied
Created detailed implementation instructions for manual worker invocation:
1. **BACKEND-INSTRUCTIONS.md** - Complete backend implementation guide
2. **FRONTEND-INSTRUCTIONS.md** - Complete frontend implementation guide
3. **IMPLEMENTATION-COORDINATION.md** - Execution strategy and coordination plan

### Recommended Next Steps

#### Option 1: Sequential Execution (Recommended)
Execute workers in order due to dependencies:

1. **Backend Worker** (Phases 1-4, 9-10):
   ```bash
   # Follow: _implementation/BACKEND-INSTRUCTIONS.md
   # Start with: Database Migration
   # Output to: _implementation/BACKEND-LOG.md
   ```

2. **Frontend Worker** (Phases 5-7, 9-10):
   ```bash
   # Follow: _implementation/FRONTEND-INSTRUCTIONS.md
   # Depends on: Backend routes (Phase 4) completed
   # Output to: _implementation/FRONTEND-LOG.md
   ```

3. **E2E Tests** (Phase 11):
   ```bash
   # After both backend and frontend complete
   # Playwright tests with real S3 (ADR-006 requirement)
   ```

#### Option 2: Parallel Where Possible
1. **Wave 1** (Parallel):
   - Backend: Database Migration + Port Interfaces (Phases 1-2)
   - Frontend: Upload Config Enhancement (Phase 8)

2. **Wave 2** (Backend Sequential):
   - Backend: Services + Routes (Phases 3-4)

3. **Wave 3** (Frontend Sequential):
   - Frontend: RTK Query + Hooks + Components (Phases 5-7)

4. **Wave 4** (Parallel):
   - Backend: Unit + Integration tests
   - Frontend: Unit + Integration tests

5. **Wave 5** (Sequential):
   - E2E tests

#### Option 3: Invoke via Proper Orchestrator
Re-invoke this agent through the dev-execute-leader or pm agent with proper Task tool access.

## Work Package Summary

### Backend Work
**Files to Create/Modify**: 8  
**ACs**: 59 (AC31-AC69, AC86-AC94)  
**Estimated Effort**: 16-20 hours

**Key Files**:
- `packages/backend/database-schema/src/migrations/app/0011_add_upload_session_metadata.sql` (new)
- `apps/api/lego-api/domains/mocs/ports/index.ts` (modify)
- `apps/api/lego-api/domains/mocs/application/services.ts` (modify)
- `apps/api/lego-api/domains/mocs/routes.ts` (modify)
- `apps/api/lego-api/domains/mocs/application/validation.ts` (modify)
- `apps/api/lego-api/domains/mocs/application/__tests__/upload-session-services.test.ts` (new)

**Key Patterns**:
- editPresign: 85% reuse from `packages/backend/moc-instructions-core/src/edit-presign.ts`
- editFinalize: 85% reuse from `packages/backend/moc-instructions-core/src/edit-finalize.ts`

### Frontend Work
**Files to Create/Modify**: 10  
**ACs**: 30 (AC1-AC30)  
**Estimated Effort**: 16-20 hours

**Key Files**:
- `packages/core/api-client/src/rtk/instructions-api.ts` (modify)
- `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts` (modify)
- `apps/web/app-instructions-gallery/src/components/InstructionsUpload/index.tsx` (modify)
- `apps/web/app-instructions-gallery/src/components/PresignedUploadProgress/index.tsx` (new)
- `apps/web/app-instructions-gallery/src/components/SessionExpiryWarning/index.tsx` (new)
- `packages/tools/upload-config/src/schema.ts` (modify)
- `packages/tools/upload-config/src/index.ts` (modify)

**Key Patterns**:
- useUploadManager: 90% reuse from existing hook
- uploadToPresignedUrl: 100% reuse from `packages/core/upload-client/src/xhr.ts`

### Testing Work
**E2E Tests**: Phase 11  
**ACs**: 6 (AC80-AC85)  
**Estimated Effort**: 4-6 hours

**Requirements**:
- Real S3 presigned URLs (ADR-006: no mocks in E2E)
- Test 30MB PDF upload with progress tracking
- Test file size validation (reject 60MB)
- Test cancel/retry flows
- Test network error scenarios

## Dependencies

### Critical Path
```
Database Migration (Phase 1)
  ↓
Port Interfaces (Phase 2)
  ↓
Services (Phase 3)
  ↓
Routes (Phase 4)
  ↓
Frontend RTK Query (Phase 5)
  ↓
Frontend Hooks (Phase 6)
  ↓
Frontend Components (Phase 7)
  ↓
Tests (Phases 9-11)
```

### Parallel Opportunities
- Upload Config (Phase 8) can run in parallel with backend Phases 1-4
- Backend tests (Phase 9) can run in parallel with Frontend tests (Phase 9)

## Risk Mitigation

### Identified Risks
1. **CORS Configuration**: S3 bucket must allow PUT from app domain
   - **Mitigation**: Verify before testing, document in setup
   
2. **Session Expiry During Multi-File**: Session expires during upload
   - **Mitigation**: 30s buffer + auto-refresh (existing pattern in useUploadManager)
   
3. **S3 Upload Success, Completion Fails**: Network error after S3 upload
   - **Mitigation**: Idempotent completion endpoint, orphan cleanup job (INST-1204)

### Decision Points (Conservative Mode)
All decision tiers escalate to user in conservative mode:
- Tier 1 (Clarification): Escalate
- Tier 2 (Preference): Escalate
- Tier 3 (Ambiguous): Escalate
- Tier 4 (Destructive): ALWAYS escalate (regardless of mode)
- Tier 5 (External): Escalate

## Output Tracking

### Required Outputs
1. **BACKEND-LOG.md**: Backend implementation evidence
2. **FRONTEND-LOG.md**: Frontend implementation evidence
3. **EVIDENCE.yaml**: Final consolidated evidence (all ACs, tests, files)

### Evidence Requirements
- All 94 ACs must be verified
- Test coverage: Backend 90%, Frontend 80%, State machine 95%
- E2E tests: PASS with mode "live" (real S3)
- Type checking: PASS
- Linting: PASS

## Token Tracking
Final token usage will be logged via:
```
/token-log INST-1105 dev-implementation <input-tokens> <output-tokens>
```

## Completion Signals

### Success
`IMPLEMENTATION COMPLETE` - All workers succeeded, all tests pass, all ACs verified

### Blocked
`IMPLEMENTATION BLOCKED: <reason>` - Worker blocked on decision or technical issue

### Retry Required
If type errors: Retry once with error context, then BLOCKED if fails again

---

**Next Action**: Choose execution option above and begin implementation.
