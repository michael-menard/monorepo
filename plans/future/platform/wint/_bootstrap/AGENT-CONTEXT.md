schema: 2
command: pm-bootstrap-workflow
feature_dir: "plans/future/wint"
prefix: "WINT"
project_name: "Workflow Intelligence System"
created: "2026-02-09T22:16:52Z"

raw_plan_file: "plans/future/wint/PLAN.md"
raw_plan_summary: |
  # Workflow Intelligence System (WINT)

  ## Vision

  A database-driven, self-improving development workflow where:
  - **PostgreSQL is the single source of truth** (no file-based state)
  - **Agents learn** from every decision and outcome
  - **Documentation stays in sync** automatically
  - **Stories live in one place** (`/stories/`) with status in DB

  ---

  ## Story Numbering

  Format: `WINT-{phase}{story}{variant}` (4 digits total)
  - `{phase}` = 1 digit (0-7)
  - `{story}` = 2 digits (01-99), restarts at 01
