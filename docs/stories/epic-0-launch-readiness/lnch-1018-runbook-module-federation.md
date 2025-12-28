# Story lnch-1018: Module Federation Debugging Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a Module Federation debugging runbook,
**so that** I can diagnose and resolve micro-frontend issues.

## Epic Context

This is **Story 10 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Medium** - Required for frontend troubleshooting.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1011: Frontend Deployment Runbook (deployment context)

## Related Stories

- lnch-1011: Frontend Deployment Runbook (MFE deployment)
- lnch-1012: Frontend Rollback Runbook (MFE rollback)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/module-federation.md`
2. Documents common MFE failure modes
3. Documents remote loading issues
4. Documents version mismatch problems
5. Documents shared dependency conflicts
6. Documents network/CORS issues
7. Documents debugging tools and techniques

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/module-federation.md`
  - [ ] Add problem/solution format

- [ ] **Task 2: Document Failure Modes** (AC: 2)
  - [ ] Remote entry not found
  - [ ] Container not initialized
  - [ ] Module not found in container
  - [ ] Shared module version conflict

- [ ] **Task 3: Document Remote Loading** (AC: 3)
  - [ ] remoteEntry.js location
  - [ ] Network tab debugging
  - [ ] CORS configuration
  - [ ] 404 resolution

- [ ] **Task 4: Document Version Issues** (AC: 4)
  - [ ] Shared dependency versions
  - [ ] React version matching
  - [ ] How to force version alignment

- [ ] **Task 5: Document Dependency Conflicts** (AC: 5)
  - [ ] Singleton enforcement
  - [ ] Eager loading issues
  - [ ] Multiple React instances

- [ ] **Task 6: Document Network Issues** (AC: 6)
  - [ ] CORS headers required
  - [ ] S3/CloudFront configuration
  - [ ] Caching issues

- [ ] **Task 7: Document Debugging Tools** (AC: 7)
  - [ ] Browser DevTools techniques
  - [ ] Network waterfall analysis
  - [ ] Console error interpretation

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/module-federation.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers debugging tools, common fixes, version alignment

2. **Playbook**: `docs/operations/playbooks/mfe-failures.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers remote loading failures, user impact assessment, rollback

The runbook is the diagnostic guide; the playbook is the incident response flow.

---

### Architecture Overview
- Shell: `apps/web/main-app` (host)
- Remotes: `app-dashboard`, `app-instructions-gallery`, etc.

### remoteEntry.js Locations
- Dev: `http://localhost:300X/remoteEntry.js`
- Prod: `https://cdn.example.com/app-name/remoteEntry.js`

### Common Errors

**"Container not initialized"**
- Remote entry hasn't loaded yet
- Check network tab for remoteEntry.js
- Ensure async boundary exists

**"Shared module not found"**
- Version mismatch in shared config
- Check `vite.config.ts` federation config

**"Multiple instances of React"**
- Shared config not set to singleton
- Different React versions in remotes

### Debugging Steps
1. Open DevTools Network tab
2. Filter by "remoteEntry"
3. Check if all remotes load (200 status)
4. Check Console for federation errors
5. Verify CORS headers present

### Vite Federation Config
```typescript
federation({
  remotes: {
    'app-dashboard': 'https://cdn.example.com/app-dashboard/remoteEntry.js',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
})
```

## Testing

### Verification
- Error messages are accurate
- Debugging steps are actionable
- Solutions are tested

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
