# PRD Template Kit

This directory contains a reusable PRD template, a sample task-config, and quick-start instructions to generate many small, vertical-slice tasks with a build-first gate.

## Files
- PRD_TEMPLATE.md: Authoring template you copy and customize per feature/initiative
- task-config.sample.json: Optional config you can adapt if you maintain PRD→tasks automation
- PROJECT_MAP.md: Monorepo structure and placement rules (atoms/molecules/organisms), testing policy, and examples

## Quick Start
1. Create a PRD from the template
   - Copy prd-template/PRD_TEMPLATE.md to .taskmaster/prds/<feature-name>-prd.txt
   - Fill in Meta, Overview, Endpoints/Schemas (if backend), and keep the Task Granularity Contract and Parsing Directives intact
    - Reference PROJECT_MAP.md to place new code in the right package/app (atoms in `packages/ui`, molecules in `packages/features`, organisms/pages in `apps/web/*`)

2. Parse PRD into tasks (CLI examples)
   - Generate many small tasks under a dedicated tag:
     task-master parse-prd .taskmaster/prds/<feature-name>-prd.txt --tag feature-<feature-name> --num-tasks 30
   - Optionally analyze and expand to refine subtasks:
     task-master analyze-complexity --tag feature-<feature-name> --research
     task-master expand --all --tag feature-<feature-name> --research

3. Work the plan
   - List tasks and pick the next:
     task-master list --tag feature-<feature-name>
     task-master next --tag feature-<feature-name>
   - For complex tasks, expand just that task:
     task-master expand --id <id> --num 3 --tag feature-<feature-name> --force

## Workflow Principles (enforced by the template)
- Build-first gate (Phase A): compile + type-check must be green before tests
- Multi-phase acceptance (see PRD_TEMPLATE):
  - B1 Unit, B2 E2E, C Accessibility, D UX/Performance, E Security, F PWA, G Offline (as applicable)
  - Unit: mock external dependencies; colocate in __tests__
  - E2E: Playwright against real services/data; ≤ 15s/test; golden-path smoke first
- Small vertical slices: ≤ 2 hours, ≤ 3 files, ≤ 80 net LoC, ≤ 1 new file
- Reuse-first: prefer shared exports in packages/** and path aliases (e.g., @features/gallery, @ui/*) instead of duplicating components

## Using task-config.sample.json
- If you have PRD→tasks automation that consumes a config file, copy and adapt task-config.sample.json:
  - Set name, input_file, and output_dir
  - Keep granularity and gating to bias small tasks and two-phase DoD
  - Ensure testing commands match your repo scripts (default: pnpm test:run)

## Tips
- Use a dedicated tag per feature (--tag feature-<name>) to isolate planning from master
- Keep PRDs narrowly scoped; break large initiatives into multiple PRDs/tags
- Treat coverage thresholds as Phase B gates; do not block Phase A on coverage
- Prefer updating existing code/tests over creating new files to reduce drift

---

Happy shipping!
