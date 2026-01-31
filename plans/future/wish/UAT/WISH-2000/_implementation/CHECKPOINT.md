```yaml
schema: 2
feature_dir: "plans/future/wish"
story_id: "WISH-2000"
timestamp: "2026-01-27T18:45:00-07:00"
stage: done
implementation_complete: true
phases_completed:
  - setup
  - planning
  - implementation
  - verification
  - documentation
  - review
  - fix
  - review_iteration_2
iteration: 2
fix_iteration: 1
max_iterations: 3
code_review_verdict: PASS
fix_iterations_completed:
  - iteration: 1
    timestamp: "2026-01-27T18:35:00-07:00"
    issues_fixed:
      - "Prettier formatting error in packages/backend/database-schema/src/schema/index.ts line 375"
    remediation: "Ran pnpm eslint --fix to auto-format array to single line"
    verification: "ESLint passes, TypeScript compiles successfully"
review_iterations_completed:
  - iteration: 2
    timestamp: "2026-01-27T18:45:00-07:00"
    workers_run: [lint, typecheck, build]
    workers_skipped: [style, syntax, security]
    verdict: PASS
    notes: "All re-run workers passed. Carried forward passing workers from iteration 1."
blocking_issues: []
completed_at: "2026-01-27T18:50:00-07:00"
```
