# PM Worker Prompts for WINT-0020

## Test Plan Writer

Read: /Users/michaelmenard/Development/monorepo/.claude/agents/pm-draft-test-plan.agent.md

STORY CONTEXT:
- Index path: /Users/michaelmenard/Development/monorepo/plans/future/platform/platform.stories.index.md
- Story ID: WINT-0020
- Feature: WINT (Workflow Intelligence)
- Output file: /Users/michaelmenard/Development/monorepo/plans/future/platform/backlog/WINT-0020/_pm/TEST-PLAN.md

SEED CONTEXT:
- Seed file: /Users/michaelmenard/Development/monorepo/plans/future/platform/backlog/WINT-0020/_pm/STORY-SEED.md

Test Plan recommendations:
- Focus on new tables only (storyArtifacts, storyPhaseHistory, storyMetadataVersions, storyAssignments, storyBlockers)
- Do NOT re-test existing WINT-0010 tables
- Minimum 80% coverage
- Critical areas: FK constraints, unique constraints, indexes, Drizzle relations, Zod schemas
- Test cascade delete behavior
- Follow WINT-0010 test patterns

---

## Dev Feasibility

Read: /Users/michaelmenard/Development/monorepo/.claude/agents/pm-dev-feasibility-review.agent.md

STORY CONTEXT:
- Index path: /Users/michaelmenard/Development/monorepo/plans/future/platform/platform.stories.index.md
- Story ID: WINT-0020
- Output file: /Users/michaelmenard/Development/monorepo/plans/future/platform/backlog/WINT-0020/_pm/DEV-FEASIBILITY.md

SEED CONTEXT:
- Seed recommendations include implementation phases, technical considerations, risk analysis
- Estimated 8 story points
- 5 new database tables extending WINT-0010
- Backend-only (no UI)

---

## Risk Predictor

Read: /Users/michaelmenard/Development/monorepo/.claude/agents/pm-story-risk-predictor.agent.md

STORY CONTEXT:
- Story ID: WINT-0020
- Epic: WINT
- Seed path: /Users/michaelmenard/Development/monorepo/plans/future/platform/backlog/WINT-0020/_pm/STORY-SEED.md
- Output: predictions YAML (inline for merge)
