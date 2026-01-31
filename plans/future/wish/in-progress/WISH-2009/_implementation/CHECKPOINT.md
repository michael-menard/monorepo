```yaml
schema: 2
feature_dir: "plans/future/wish"
story_id: "WISH-2009"
timestamp: "2026-01-29T18:35:00Z"
stage: fix
implementation_complete: true
phases_completed:
  - setup
  - planning
  - implementation
  - verification
  - documentation
iteration: 1
max_iterations: 3
code_review_verdict: FAIL
review_findings:
  lint_errors: 3
  style_errors: 2
  syntax_errors: 7
  security_errors: 0
  typecheck_errors: 7
  build_errors: 1 (pre-existing)
  test_failures: 5
critical_issues:
  - "repositories.ts: TypeScript errors with Drizzle eq() types"
  - "Barrel files in adapters/index.ts and application/index.ts"
  - "Frontend tests fail due to MSW/fetch mock conflict"
```
