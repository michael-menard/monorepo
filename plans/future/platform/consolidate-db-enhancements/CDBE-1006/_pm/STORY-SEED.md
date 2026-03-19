---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: CDBE-1006

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline file provided (null baseline_path). Codebase scanning used as primary reality source.

### Relevant Existing Features

| Feature                              | Location                                                                    | Notes                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workflow.stories` table             | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 33–55             | Primary workflow entity; state column is `text` enforced by trigger, not pgEnum. No RLS currently enabled.                                                               |
| `workflow.plans` table               | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 137–163           | Plan management entity. No RLS currently enabled.                                                                                                                        |
| `workflow.story_state_history` table | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 94–104            | Audit trail of every state change. No RLS currently enabled.                                                                                                             |
| `workflow.workflow_audit_log` table  | `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 292–301           | Execution-level audit log tied to `workflow_executions` via FK. No RLS currently enabled.                                                                                |
| State transition trigger             | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql` | Runs as `SECURITY DEFINER` by default (PostgreSQL default). If caller is non-superuser, trigger inherits definer privileges — a privilege escalation vector without RLS. |
| `valid_transitions` lookup table     | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`      | Deployed in migration 1004 (slot taken). No RLS on this table yet.                                                                                                       |
| Migration runner                     | `apps/api/knowledge-base/scripts/run-migrations.sh`                         | Connects as `kbuser` (default). No role separation in current setup.                                                                                                     |
| Schemas in DB                        | `999_full_schema_baseline.sql` lines 32–53                                  | Four schemas: `analytics`, `artifacts`, `drizzle`, `workflow`. No `telemetry` schema exists.                                                                             |
| Single DB user                       | `apps/api/knowledge-base/.env`                                              | `KB_DB_USER=kbuser` — currently one role for all operations; `agent_role`, `lambda_role`, `reporting_role` do not yet exist anywhere.                                    |

### Active In-Progress Work

| Story          | Title                                                    | Relevance                                                                                                                                                    |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CDBE-1005      | Define valid_transitions Lookup Schema                   | Sibling prerequisite; its seed (already written) confirmed migration 1004 is taken.                                                                          |
| CDBE-1010      | Valid Transitions Lookup Table and State Machine Trigger | **Direct downstream blocker**: CDBE-1006 must be deployed BEFORE CDBE-1010 goes live, per AC. CDBE-1010's trigger must not be a privilege escalation vector. |
| CDBE-1020–1040 | Phase 1 siblings                                         | May write to `workflow.stories` and `workflow.story_state_history`; RLS policies must account for these callers.                                             |

### Constraints to Respect

- Migration files must use sequential NNN\_ numeric prefix. Slots 1000–1004 are confirmed taken. CDBE-1006 must target slot **1005** (verify at implementation time).
- No `telemetry` schema exists in this database. The KB acceptance criteria references `telemetry.workflow_audit_log` — this is a schema name error. The actual table is `workflow.workflow_audit_log`. Implementation must target `workflow.workflow_audit_log` (see Conflict #1 below).
- The current DB role is a single `kbuser` with broad privileges. `agent_role`, `lambda_role`, and `reporting_role` do not exist yet — they must be created in this migration.
- RLS policies must be compatible with `kbuser` (the Lambda runtime role) continuing to function after RLS is enabled — `kbuser` must either be given BYPASSRLS or be granted through a named role that the policy recognizes.
- Migration must be idempotent: re-running must not raise errors.
- Do NOT use `SECURITY DEFINER` to bypass RLS in newly created functions/triggers — that is precisely what this story is guarding against.

---

## Retrieved Context

### Related Endpoints

None — this is a pure database security migration story. No API endpoints are created or modified.

### Related Components

None — no UI components are involved.

### Reuse Candidates

| Candidate                | Path                                                                              | Why                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration 1004 structure | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`            | Canonical model for migration file layout: section headers, idempotent DDL, RAISE NOTICE, COMMENT ON. Next migration (1005) should follow this exact structure.                                      |
| Migration 1001 trigger   | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`       | SECURITY DEFINER behaviour reference. This trigger is the downstream consumer of the tables this story protects.                                                                                     |
| Drizzle schema file      | `apps/api/knowledge-base/src/db/schema/workflow.ts`                               | Pattern for how to register new DB objects in Drizzle if a `roles` or `rls_policies` reference table is warranted (most likely not — RLS has no Drizzle representation, so no schema change needed). |
| pgtap 1004 test          | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | Gold standard for pgtap file layout, `has_table`, `ok`, `throws_ok`, `SELECT plan(N)` / `SELECT * FROM finish()` / `BEGIN` / `ROLLBACK` pattern.                                                     |
| Migration runner         | `apps/api/knowledge-base/scripts/run-migrations.sh`                               | Connects as `kbuser`. RLS policies must permit `kbuser` to function (either BYPASSRLS or explicit policy).                                                                                           |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                       | File                                                                              | Why                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL migration — idempotent DDL with DO blocks | `apps/api/knowledge-base/src/db/migrations/1004_valid_transitions.sql`            | Gold standard for section-commented, idempotent KB migration: IF NOT EXISTS, RAISE NOTICE, COMMENT ON TABLE/INDEX, sequential section headers |
| SQL migration — trigger + function DDL        | `apps/api/knowledge-base/src/db/migrations/1001_canonical_story_states.sql`       | Pattern for CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS, CREATE TRIGGER, and COMMENT ON FUNCTION with migration number prefix          |
| pgtap test structure                          | `apps/api/knowledge-base/src/db/migrations/pgtap/1004_valid_transitions_test.sql` | Complete pgtap test file: BEGIN/ROLLBACK wrapper, SELECT plan(N), has_table, has_column, ok, throws_ok, SELECT \* FROM finish()               |

---

## Knowledge Context

### Lessons Learned

- **[CDBE-0020 / CDBE-1030]** CREATE TRIGGER referencing a missing function aborts the entire pgtap transaction, silently skipping remaining assertions. (_category: testing_)
  - _Applies because_: pgtap tests for this story must NOT reference `validate_story_state_transition` or any trigger function that may not be deployed yet. Test file must be self-contained and only assert on RLS policies and role existence — objects this story creates directly.

- **[WINT-4030]** Migration sequence numbers can be consumed by concurrent stories. (_category: edge-cases_)
  - _Applies because_: Slot 1004 is now taken (valid_transitions, confirmed by file existence). CDBE-1006 should target slot 1005, but must verify at implementation time.

- **[CDBE-1005 sibling seed]** No ADR-LOG exists at `plans/stories/ADR-LOG.md`. Architectural constraints must be derived from codebase analysis. (_category: process_)
  - _Applies because_: Same gap exists for this story. No formal ADRs to reference.

- **[General PostgreSQL RLS]** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` does NOT implicitly create policies — an enabled table with no policies denies ALL access to non-superusers by default (implicit DENY). The migration must create at minimum one PERMISSIVE policy per role per table, or all non-superuser queries will fail silently. (_category: blocker_)
  - _Applies because_: Core implementation risk for this story. Enabling RLS without policies will break `kbuser` operations immediately.

- **[General PostgreSQL RLS]** Triggers run as the trigger owner (typically a superuser), NOT as the session user, unless the trigger function is `SECURITY INVOKER`. RLS is enforced on the underlying table rows, but a `SECURITY DEFINER` function can still bypass it. Both concerns must be tested. (_category: architecture_)
  - _Applies because_: The trigger from migration 1001 (`validate_story_state_transition`) runs with the role that created it. If that role is a superuser, RLS on `workflow.stories` will be bypassed by the trigger anyway — the story must document this limitation and ensure the Lambda role (`lambda_role` / `kbuser`) itself is restricted by RLS even if the trigger is not.

### Blockers to Avoid (from past stories)

- Do NOT enable RLS on a table without simultaneously creating at least one policy — the migration will break `kbuser` operations the moment it runs.
- Do NOT reference the non-existent `telemetry` schema. Target `workflow.workflow_audit_log` exclusively (see Conflict #1).
- Do NOT create roles with `SUPERUSER` or `CREATEROLE` attributes — named roles must be least-privilege only.
- Do NOT assume migration slot 1005 is free; verify at implementation time.
- Do NOT attempt to apply RLS policies in a transaction that also uses `ALTER TYPE ... ADD VALUE` (PostgreSQL restriction) — but this story has no enum changes, so this does not apply.
- Do NOT skip testing with a non-superuser role. The acceptance criteria explicitly requires trigger testing under a non-superuser role — this test must be done outside the migration file itself (in pgtap or a test script) since the migration runs as `kbuser`.

### Architecture Decisions (ADRs)

| ADR | Title            | Constraint                                                     |
| --- | ---------------- | -------------------------------------------------------------- |
| N/A | No ADR-LOG found | No ADR file at `plans/stories/ADR-LOG.md` — ADRs loaded: false |

_The following architectural facts are derived from codebase analysis and serve as informal constraints:_

- **Single-role DB access**: All current KB operations use `kbuser`. Introducing named roles (`agent_role`, `lambda_role`, `reporting_role`) requires that `kbuser` either be configured to SET ROLE or that the Lambda runtime be updated to connect as the appropriate named role. For MVP, the simplest approach is to grant `kbuser` BYPASSRLS while named roles have proper RLS policies — enabling incremental adoption.
- **No Drizzle schema registration needed**: RLS policies are not representable in Drizzle ORM schema. No changes to `workflow.ts` or any other Drizzle schema file are required for this story.
- **Migration idempotency**: All KB migrations use `IF NOT EXISTS`, `CREATE OR REPLACE`, and conditional DO blocks. The `CREATE ROLE IF NOT EXISTS` variant (`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '...') THEN CREATE ROLE ...; END IF; END $$`) is the required pattern.
- **pgtap test isolation**: pgtap tests must run in a `BEGIN/ROLLBACK` block. Tests that verify non-superuser RLS enforcement should use `SET LOCAL ROLE` to impersonate a role within the test transaction, then verify query results.

### Patterns to Follow

- Idempotent role creation: `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_role') THEN CREATE ROLE agent_role NOLOGIN; END IF; END $$`
- Idempotent policy creation: `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'workflow' AND tablename = 'stories' AND policyname = 'stories_agent_select') THEN CREATE POLICY ...; END IF; END $$`
- Section-commented migration: use `-- ── N. Section title ───` headers matching migration 1004 style.
- `COMMENT ON TABLE` and `COMMENT ON POLICY` with migration number prefix (e.g., `'1005: ...'`).
- Test RLS enforcement with `SET LOCAL ROLE <role>` inside pgtap BEGIN/ROLLBACK block.

### Patterns to Avoid

- Do not use `ALTER TABLE ... FORCE ROW LEVEL SECURITY` unless the table owner also needs RLS enforcement — for security, prefer `FORCE ROW LEVEL SECURITY` on `workflow.stories` and `workflow.plans` to ensure even the table owner (if it's `kbuser`) is restricted.
- Do not create policies using `current_user` when the intent is `current_role` — PostgreSQL `current_user` vs `current_role` differ when SET ROLE is in use.
- Do not define RESTRICTIVE policies as the only policies — at least one PERMISSIVE policy must exist per table/role combination for access to be granted.
- Do not reference `telemetry.*` tables — this schema does not exist.

---

## Conflict Analysis

### Conflict #1: Schema Name Error in Acceptance Criteria (BLOCKING)

- **Severity**: blocking
- **Description**: The story's acceptance criteria states: "RLS enabled and policies defined on story_state_history, workflow_audit_log" and references `telemetry.workflow_audit_log`. No `telemetry` schema exists in the KB database. The KB database has four schemas: `analytics`, `artifacts`, `drizzle`, and `workflow` (confirmed via `999_full_schema_baseline.sql`). The actual table is `workflow.workflow_audit_log` (confirmed in `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 292–301 and in the baseline migration). Implementation must target `workflow.workflow_audit_log` — if a `telemetry` schema were created, it would be out of scope and create schema drift.
- **Resolution Hint**: Accept that the AC's `telemetry.workflow_audit_log` reference is a copy-paste error. Implement RLS on `workflow.workflow_audit_log`. Document this correction in the migration file header comment and in the implementation notes. No schema creation needed.
- **Source**: codebase analysis (`999_full_schema_baseline.sql`, `workflow.ts`)

### Conflict #2: Migration Slot Likely Occupied (warning)

- **Severity**: warning
- **Description**: Migration slot 1004 is now confirmed taken by CDBE-1005's `1004_valid_transitions.sql`. CDBE-1006 should target slot 1005. However, concurrent CDBE sibling stories (1010, 1020, etc.) may also be targeting slot 1005. The next free slot must be verified at implementation time.
- **Resolution Hint**: At implementation start, list `apps/api/knowledge-base/src/db/migrations/` and use the next available integer. Name the file `1005_workflow_rls.sql` if 1005 is free.
- **Source**: codebase analysis (migration directory listing)

### Conflict #3: Single DB Role Architecture vs. Multi-Role AC (warning)

- **Severity**: warning
- **Description**: The acceptance criteria requires three named roles: `agent_role`, `lambda_role`, and `reporting_role`. The current KB architecture uses a single `kbuser` for all operations. No Lambda function, agent, or migration currently connects as any named role. Creating these roles in a migration is additive and non-breaking, but unless the Lambda runtime is updated to connect as `lambda_role` instead of `kbuser`, the roles will exist in the DB but be unused. The trigger test AC ("All triggers tested with non-superuser role") can still be satisfied by testing under `agent_role` or `lambda_role` using `SET ROLE` in pgtap.
- **Resolution Hint**: Create all three roles in the migration with appropriate grants. Also ensure `kbuser` retains BYPASSRLS (or an equivalent policy) so existing Lambda operations do not break. Document that runtime adoption of named roles is a follow-up infrastructure task outside this story's scope.
- **Source**: codebase analysis (`client.ts`, `run-migrations.sh`, `.env`)

---

## Story Seed

### Title

Row-Level Security Policies on Workflow Tables Before Trigger Deployment

### Description

**Context**: The KB database currently runs all operations through a single role (`kbuser`) with no row-level access controls. The state machine trigger (`validate_story_state_transition`, migration 1001) runs as its creator's role and enforces state transitions at the DDL level — but any caller with direct table access can bypass the trigger entirely by issuing raw SQL, and no tenant or role boundary prevents one agent from reading or modifying another agent's story records.

**Problem**: CDBE-1010 will deploy a high-privilege trigger on `workflow.story_state_history` that rejects illegal transitions at the DB level. Without RLS, this trigger can be bypassed by any connection with UPDATE privileges on `workflow.stories`. Additionally, the three intended callers (agent Lambda functions, reporting/analytics queries, and background automation agents) currently have undifferentiated access to every row and every write path — including audit tables that must be append-only for compliance.

**Proposed solution**: Create a SQL migration (`1005_workflow_rls.sql` or next free slot) that:

1. Defines three named roles with least-privilege grants: `agent_role` (INSERT/UPDATE on stories + story_state_history), `lambda_role` (full DML on workflow tables), and `reporting_role` (SELECT-only on all workflow tables).
2. Enables RLS on `workflow.stories`, `workflow.plans`, `workflow.story_state_history`, and `workflow.workflow_audit_log`.
3. Creates PERMISSIVE RLS policies for each role on each table, restricting row visibility to rows the role is permitted to access.
4. Preserves `kbuser` BYPASSRLS to ensure zero disruption to existing Lambda operations during the migration window.
5. Must be fully applied and verified before CDBE-1010's trigger is deployed.

### Initial Acceptance Criteria

- [ ] AC-1: A migration file `1005_workflow_rls.sql` (or next free slot) exists in `apps/api/knowledge-base/src/db/migrations/` and is idempotent (re-running produces no error).
- [ ] AC-2: Three DB roles are created idempotently: `agent_role` (NOLOGIN, no SUPERUSER), `lambda_role` (NOLOGIN, no SUPERUSER), `reporting_role` (NOLOGIN, NOINHERIT). Role creation uses `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '...') THEN CREATE ROLE ...; END IF; END $$` pattern.
- [ ] AC-3: RLS is enabled on `workflow.stories` (`ALTER TABLE workflow.stories ENABLE ROW LEVEL SECURITY; ALTER TABLE workflow.stories FORCE ROW LEVEL SECURITY;`) with idempotency guard via `pg_class.relrowsecurity` check.
- [ ] AC-4: RLS is enabled on `workflow.plans` with the same pattern as AC-3.
- [ ] AC-5: RLS is enabled on `workflow.story_state_history` with the same pattern as AC-3.
- [ ] AC-6: RLS is enabled on `workflow.workflow_audit_log` (NOT `telemetry.workflow_audit_log` — no `telemetry` schema exists) with the same pattern as AC-3.
- [ ] AC-7: At least one PERMISSIVE SELECT policy is created per role per RLS-enabled table, permitting the role to read rows it is allowed to access. Policy creation is idempotent (check `pg_policies` before CREATE POLICY).
- [ ] AC-8: `agent_role` is granted INSERT and SELECT on `workflow.stories` and `workflow.story_state_history`; SELECT on `workflow.plans` and `workflow.workflow_audit_log`.
- [ ] AC-9: `lambda_role` is granted SELECT, INSERT, UPDATE, DELETE on `workflow.stories` and `workflow.plans`; INSERT and SELECT on `workflow.story_state_history` and `workflow.workflow_audit_log`.
- [ ] AC-10: `reporting_role` is granted SELECT-only on `workflow.stories`, `workflow.plans`, `workflow.story_state_history`, and `workflow.workflow_audit_log`.
- [ ] AC-11: `kbuser` is granted BYPASSRLS (or an equivalent policy) so existing Lambda operations continue to function unchanged during the migration window.
- [ ] AC-12: A pgtap test file `1005_workflow_rls_test.sql` exists in `apps/api/knowledge-base/src/db/migrations/pgtap/` and verifies: all three roles exist, RLS is enabled on all four tables, and at least one policy exists per table.
- [ ] AC-13: At least one pgtap test uses `SET LOCAL ROLE agent_role` (or equivalent) to verify that a non-superuser role cannot perform an operation it is not permitted (e.g., `agent_role` cannot DELETE from `workflow.stories`).
- [ ] AC-14: Migration is deployed and verified BEFORE CDBE-1010 trigger implementation begins. The PR for CDBE-1006 must be merged and the migration applied to the target environment before CDBE-1010's PR is opened.
- [ ] AC-15: `COMMENT ON TABLE` and `COMMENT ON POLICY` entries with `1005:` prefix are included for all newly created objects.

### Non-Goals

- Do not create a `telemetry` schema or move any tables between schemas.
- Do not modify the existing trigger functions from migrations 1001 or 1003 — those are owned by their respective stories.
- Do not update Drizzle schema files (`workflow.ts`, etc.) — RLS policies have no Drizzle representation and require no schema file changes.
- Do not update `StoryStateSchema` or any application-layer Zod schemas — this is a DB-only security story.
- Do not update the Lambda runtime connection string to use named roles — that is a follow-up infrastructure task. This story creates the roles and policies; adoption is out of scope.
- Do not apply RLS to tables outside `workflow.stories`, `workflow.plans`, `workflow.story_state_history`, and `workflow.workflow_audit_log` — other workflow tables (e.g., `workflow.plans_details`, `workflow.plan_dependencies`) are not in scope for Phase 1.
- Do not implement the CDBE-1010 trigger in this story.

### Reuse Plan

- **Components**: none (DB-only story)
- **Patterns**: Idempotent DO block pattern from migrations 1001 and 1004; COMMENT ON style from migrations 1001–1004; pgtap file layout from `pgtap/1004_valid_transitions_test.sql`
- **Packages**: `apps/api/knowledge-base` (migration files); `apps/api/knowledge-base/scripts/run-migrations.sh` (to verify migration applies cleanly as `kbuser`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary test vector is verifying RLS enforcement under a non-superuser role. Use `SET LOCAL ROLE <role>` inside a pgtap BEGIN/ROLLBACK block to impersonate each role, then assert that:
  - SELECT is permitted on allowed tables
  - INSERT/UPDATE/DELETE is denied on tables outside the role's grant
  - The `reporting_role` cannot mutate any row in any of the four tables
- Include an idempotency test: run the migration script twice (or simulate by re-running the DO blocks) and assert no errors and no duplicate policies in `pg_policies`.
- Test the BYPASSRLS grant for `kbuser`: connect as `kbuser` with RLS enabled and assert that a query against a table with a restrictive policy still returns rows (kbuser bypasses the policy).
- pgtap `throws_ok` pattern (from `1004_valid_transitions_test.sql`) is the right model for asserting that a forbidden DML raises a permission error under a restricted role.
- Regression concern: verify that migration 1001's state transition trigger still fires correctly after RLS is enabled. The trigger's SECURITY DEFINER behavior means it may bypass RLS — document this explicitly in the test output if confirmed.

### For UI/UX Advisor

Not applicable — this is a pure database security migration story with no user-facing surface.

### For Dev Feasibility

- **Primary implementation risk**: enabling RLS without at least one PERMISSIVE policy causes an implicit DENY for all non-superusers. Each table must have a policy in place before `ENABLE ROW LEVEL SECURITY` is committed, or the enabling and policy creation must happen atomically in a single transaction. Recommend a single DO block per table that enables RLS and creates the policy in sequence.
- **BYPASSRLS concern**: `kbuser` is currently a superuser-equivalent. Superusers bypass RLS automatically in PostgreSQL without needing `BYPASSRLS`. If `kbuser` is a superuser, no explicit BYPASSRLS grant is needed — but this should be verified via `SELECT rolsuper FROM pg_roles WHERE rolname = 'kbuser'` at implementation time.
- **Migration slot**: verify at implementation time that slot 1005 is free. Run `ls apps/api/knowledge-base/src/db/migrations/` and use the next available integer.
- **`telemetry.workflow_audit_log` error**: the AC references this non-existent table. Target `workflow.workflow_audit_log` (confirmed in `apps/api/knowledge-base/src/db/schema/workflow.ts` lines 292–301). Do not create a `telemetry` schema.
- **Canonical reference for DO block role creation**: `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_role') THEN CREATE ROLE agent_role NOLOGIN; END IF; END $$` — this is the standard pattern for idempotent role creation in PostgreSQL 10+.
- **Canonical reference for idempotent policy creation**: Check `pg_policies` system view: `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname='workflow' AND tablename='stories' AND policyname='stories_lambda_all') THEN CREATE POLICY stories_lambda_all ON workflow.stories FOR ALL TO lambda_role USING (true) WITH CHECK (true); END IF; END $$`
- **FORCE ROW LEVEL SECURITY**: Consider using `FORCE ROW LEVEL SECURITY` on each table in addition to `ENABLE ROW LEVEL SECURITY`. The FORCE flag ensures that even the table owner is subject to RLS policies — this is the correct security posture for a multi-role system.
