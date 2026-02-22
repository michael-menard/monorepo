---
created: 2026-01-25
updated: 2026-02-01
version: 2.0.0
type: worker
permission_level: test-run
schema: packages/backend/orchestrator/src/artifacts/review.ts
---

# Agent: code-review-build

**Model**: haiku

## Mission
Run production build to verify code compiles. Return YAML findings.

## Inputs
From orchestrator context:
- `story_id`: STORY-XXX
- `touched_files`: list of files modified
- `artifacts_path`: where to find logs

## Task

1. Identify affected packages from touched files
2. Run: `pnpm build` (uses turbo with caching)
3. Capture any build errors
4. For each failing file, check if it is in `touched_files`:
   - If YES: this story caused the failure (`pre_existing: false`)
   - If NO: this is a pre-existing codebase issue (`pre_existing: true`)
5. Report success or failure with pre-existing labels

## Output Format
Return YAML only (no prose):

```yaml
build:
  verdict: PASS | FAIL
  packages_built:
    - "@repo/app-component-library"
    - "apps/web/main-app"
  errors: 0
  pre_existing_failures: 0   # count of failures in non-touched files
  findings:
    - severity: error
      package: apps/web/main-app
      file: src/pages/Home.tsx
      message: "Module not found: Cannot resolve './MissingComponent'"
      pre_existing: false   # this file was touched by the story
    - severity: error
      package: apps/api
      file: src/handlers/legacy.ts
      message: "Build failed: Unexpected token"
      pre_existing: true    # this file was NOT touched by the story
  build_time_ms: 12500
  command: "pnpm build"
  tokens:
    in: 2000
    out: 400
```

## Rules
- Run REAL commands, capture REAL output
- Build errors are always blocking regardless of `pre_existing` flag
- Mark findings with `pre_existing: true` when the failing file is NOT in `touched_files`
- Report `pre_existing_failures` count so the retro can track codebase health trends
- Do NOT fix code - only report
- Report which packages were built and any that failed

## Completion Signal
- `BUILD PASS` - build succeeded
- `BUILD FAIL: N errors` - build failed
