# Fix Iteration 2 - WINT-0110

**Story**: Winter Workflow Session Management MCP Tools
**Iteration**: 2
**Date**: 2026-02-15
**Status**: COMPLETE

## Summary

Fixed single critical build error preventing @repo/main-app from building. The `useLazyGetFileDownloadUrlQuery` hook was implemented in the instructions API but not exported from the package's main index.

## Issues Fixed

### Issue 1: Missing Export (Critical)

**File**: `packages/core/api-client/src/index.ts`
**Problem**: `useLazyGetFileDownloadUrlQuery` hook exists in `packages/core/api-client/src/rtk/instructions-api.ts` but was not re-exported in the package's main index file
**Consumer Impact**: `apps/web/app-instructions-gallery/src/components/FileDownloadButton/index.tsx` could not import the hook
**Severity**: Critical (build failure)

**Fix Applied**:
Added `useLazyGetFileDownloadUrlQuery` to the export list in `packages/core/api-client/src/index.ts` at line 57:

```typescript
// RTK Query Hooks - Instructions/MOC (INST-1103)
export {
  useUploadThumbnailMutation,
  useGetMocDetailQuery,
  useCreateMocMutation,
  useUpdateMocMutation,
  useDeleteMocMutation,
  useUploadInstructionFileMutation,
  useUploadPartsListFileMutation,
  useDeleteFileMutation,
  useLazyGetFileDownloadUrlQuery, // Added
} from './rtk/instructions-api'
```

## Verification

### Build Verification
- ✅ `pnpm build --filter=@repo/api-client` - PASS
- ✅ `pnpm build --filter=@repo/main-app` - PASS (verified import resolution)

### Results
- Total issues fixed: 1/1
- Auto-fixable: Yes
- Build status: PASS
- No new errors introduced

## Files Modified

1. `packages/core/api-client/src/index.ts` - Added missing export

## Next Steps

Run code review to verify all issues resolved:
```bash
/dev-code-review plans/future/platform WINT-0110
```

## Evidence Updated

- `EVIDENCE.yaml` - Added iteration 2 fix verification section
- `REVIEW.yaml` - Incremented iteration from 2 to 3
