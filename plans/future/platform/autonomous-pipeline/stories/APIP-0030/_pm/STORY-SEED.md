---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-0030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No LangGraph Platform Docker configuration exists yet. APIP-5006 (LangGraph Server Infrastructure Baseline) is the gating predecessor story and must complete before APIP-0030 begins. Server hardware availability is the highest-risk unknown — APIP-0030 is blocked if APIP-5006 does not complete first.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Docker Compose for Local Dev | `infra/compose.lego-app.yaml` | Canonical Compose pattern: named volumes, healthchecks, restart policies, `extra_hosts`, one-shot init containers — the direct template for LangGraph server Compose |
| Knowledge Base PostgreSQL | `apps/api/knowledge-base/` | Separate PostgreSQL instance (port 5433) — establishes precedent for isolated DB instances with dedicated connection pools |
| MinIO init pattern | `infra/compose.lego-app.yaml` (`minio-init` service) | One-shot init container pattern for schema initialization — applicable to `langgraph-checkpoint-postgres` init |
| OTel Collector | `infra/compose.lego-app.yaml` | Telemetry pipeline in local infra; LangGraph Platform can emit traces to existing OTel pipeline |
| Redis (ElastiCache) | `infra/compose.lego-app.yaml`, `apps/api/lego-api/core/cache/redis-client.ts` | Already deployed at port 6379; BullMQ (APIP-0010) depends on it; LangGraph server needs network access to it |
| Prometheus + Grafana | `infra/compose.lego-app.yaml`, `infra/prometheus/prometheus.yml` | Observability services already running; LangGraph Platform can expose metrics to this stack |
| Aurora PostgreSQL | Production database | LangGraph checkpoint database uses Aurora — dedicated `langgraph_checkpoint` database, separate from monorepo main DB |

### Active In-Progress Work

| Story | Area | Potential Impact on APIP-0030 |
|-------|------|-------------------------------|
| APIP-5006 | Server Infrastructure Baseline | Hard dependency — APIP-0030 is explicitly gated on APIP-5006 completion (PLAT-001 action item). `infra/langgraph-server/` directory and base compose file will exist after APIP-5006. |
| APIP-0010 | Work Queue (BullMQ) | Parallel work; BullMQ connects to existing Redis. APIP-0030 must ensure server can reach Redis at port 6379. |
| APIP-0020 | Supervisor Loop (Plain TypeScript) | Depends on APIP-0030 for the deployment target. Supervisor process will run on the same dedicated server; compose file must accommodate it. |

### Constraints to Respect

- **APIP ADR-004**: All pipeline components run on dedicated local server — no AWS Lambda. Docker Compose is the deployment mechanism.
- **APIP ADR-001 Decision 2**: Supervisor is a plain TypeScript process, NOT a LangGraph graph. The LangGraph Platform deployment hosts worker graphs (elaboration, implementation, review, QA, merge), not the supervisor itself.
- **APIP ADR-002 (project-level)**: Infrastructure-as-Code must use standalone CloudFormation or plain Docker Compose. No SST/CDK/Serverless Framework.
- **APIP DECISIONS.yaml SEC-001**: LangGraph Studio UI port must not be publicly routable for MVP. Network isolation (not full auth/authz) is the security boundary. Full auth/authz deferred to Phase 2.
- **APIP DECISIONS.yaml PLAT-002**: Checkpoint schema and Aurora integration must be documented before Phase 0 completion.
- **Baseline protected**: Production DB schemas in `packages/backend/database-schema/` must not be touched. `@repo/db` client package API surface is protected.
- **Connection pool isolation**: LangGraph `langgraph-checkpoint-postgres` MUST use a dedicated connection pool (max 3) separate from `@repo/db`. Aurora `max_connections` exhaustion risk if mixed.
- **Reserved ports (must not conflict)**: 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001. LangGraph Platform uses 8123 (API) and 8124 (Studio UI).

---

## Retrieved Context

### Related Endpoints

None — this is a pure infrastructure story. No API endpoints exposed to the monorepo application layer. LangGraph Platform exposes its own internal API on port 8123 (used by the supervisor and worker graphs internally, not the public application API).

### Related Components

None — no UI components. This story produces infrastructure artifacts only. The Studio UI (port 8124) is a LangGraph-provided development tool accessed by operators, not an application UI component.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Docker Compose service definition | `infra/compose.lego-app.yaml` | Direct template: copy healthcheck patterns, named volumes, restart policies, `extra_hosts: host.docker.internal`, one-shot init container pattern. LangGraph Platform services follow the same conventions. |
| Base Compose file from APIP-5006 | `infra/langgraph-server/compose.langgraph-server.yaml` (created by APIP-5006) | APIP-0030 extends this base file by adding LangGraph Platform services: `langgraph-platform`, `langgraph-checkpoint-postgres`, Studio UI routing. |
| Prometheus scrape config | `infra/prometheus/prometheus.yml` | Extend with LangGraph Platform metrics endpoint scrape target |
| minio-init one-shot pattern | `infra/compose.lego-app.yaml` | Use the same `restart: "no"` + `depends_on: condition: service_healthy` pattern for `langgraph-checkpoint-init` service to run schema migrations |
| Redis connection config | `apps/api/lego-api/core/cache/redis-client.ts` | Reference to understand existing Redis config for BullMQ compatibility on the same instance |
| pgvector instance pattern | `apps/api/knowledge-base/` | Reference for running a second isolated PostgreSQL instance with a dedicated connection pool |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Docker Compose service definition | `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` | Complete canonical example: named volumes, healthchecks with `CMD-SHELL` and `CMD` variants, restart policies, port mapping, `extra_hosts: host.docker.internal`, one-shot init container (`minio-init`) — all patterns needed for LangGraph Platform service definitions |
| IaC CloudFormation stack | `/Users/michaelmenard/Development/monorepo/infra/elasticache/template.yaml` | Standalone CloudFormation following ADR-002 — reference for any AWS-managed resources related to the dedicated server |
| Prometheus scrape config | `/Users/michaelmenard/Development/monorepo/infra/prometheus/prometheus.yml` | Scrape config pattern to extend with LangGraph Platform metrics endpoint |

---

## Knowledge Context

### Lessons Learned

- **[Infrastructure QA KB entry]** Infrastructure stories that add only config files do not produce meaningful coverage numbers. The appropriate QA check is build success + smoke test pass. Coverage threshold (45%) should be waived for pure infra/config stories.
  - *Applies because*: APIP-0030 is a pure infrastructure story — Docker Compose YAML, init scripts, documentation. No TypeScript, no Lambda handlers, no business logic. QA gate = `docker compose config` passes + smoke test healthy + connectivity verified.

- **[Pattern: Review phase waived for documentation-only stories]** Stories delivering only config/markdown files with no executable TypeScript receive waived or minimal code review. Infrastructure quality check (schema validity, config correctness) substitutes for code review.
  - *Applies because*: APIP-0030 delivers compose YAML and README only. Review phase should focus on infrastructure correctness (port assignments, healthcheck syntax, volume declarations) rather than TypeScript code quality.

- **[Pure test-file/infrastructure stories: explicit E2E exemption required]** Infrastructure stories with no frontend surface should explicitly declare E2E test exemption in QA-VERIFY with auditable reasons referencing story_type and scope.
  - *Applies because*: APIP-0030 has `frontend_impacted: false`. The E2E exemption must be declared explicitly, not left as a zero count without explanation.

- **[ARCH-001: wint schema / port isolation lesson]** Two PostgreSQL instances in the monorepo (5432 main, 5433 KB) each require their own connection config. Adding a third instance (langgraph checkpoint DB) follows the same isolation pattern — its connection pool must not mix with `@repo/db`.
  - *Applies because*: `langgraph-checkpoint-postgres` adds a third PostgreSQL-adjacent pool. The connection isolation constraint (max 3 connections, dedicated credentials) mirrors the KB pgvector isolation pattern.

### Blockers to Avoid (from past stories)

- **Infrastructure files deleted without replacement (ADR-002 context)**: Past migrations deleted 54 infra files without replacement. All server config for the LangGraph Platform MUST be committed as standalone, framework-agnostic Docker Compose files under `infra/langgraph-server/`.
- **Co-mingling checkpoint connections with `@repo/db`**: Architecture review explicitly flags Aurora `max_connections` exhaustion. The `langgraph-checkpoint-postgres` connection pool must be a separate `pg.Pool` instance — not `@repo/db`, not the KB pool.
- **Port conflicts with local dev services**: Reserved ports that must not be used — 5432, 5433, 6379, 9090, 3003, 4317/4318, 9000/9001. LangGraph Platform services assigned 8123 (API) and 8124 (Studio UI). These must be verified free on the target server before deploying.
- **Over-scoping CD pipeline**: AC for deployment procedure is satisfied by a documented `scp + docker compose pull && docker compose up -d` procedure. Do NOT implement GitHub Actions workflows for server deployment — a simple manual procedure is sufficient and correct for Phase 0.
- **Studio UI port exposure**: Port 8124 (Studio UI) must not be publicly routable for MVP. Network isolation is the security boundary; full auth/authz is deferred to Phase 2 (APIP DECISIONS.yaml SEC-001).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Standalone CloudFormation or plain Docker Compose only. No SST/CDK/Serverless Framework. Each stack independently deployable. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Smoke tests against real deployed server. |
| ADR-006 | E2E Tests Required in Dev Phase | May be skipped if `frontend_impacted: false` — explicitly declare exemption with auditable reason. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Supervisor is NOT deployed via LangGraph Platform. Only worker graphs run on LangGraph. |
| APIP ADR-004 | Local Dedicated Server | All pipeline components on dedicated local server. Docker Compose is the deployment mechanism. No Lambda. |
| APIP DECISIONS SEC-001 | Studio UI Security | Port 8124 not publicly routable. Network isolation = MVP security boundary. Full auth/authz deferred Phase 2. |
| APIP DECISIONS PLAT-002 | Checkpoint Schema Docs | Checkpoint schema and Aurora integration must be documented before Phase 0 completion. |

### Patterns to Follow

- Docker Compose service definitions with explicit healthchecks, named volumes, and `restart: unless-stopped` — copied exactly from `infra/compose.lego-app.yaml`
- One-shot init container (`restart: "no"` + `depends_on: condition: service_healthy`) for `langgraph-checkpoint-postgres` schema initialization
- `extra_hosts: - 'host.docker.internal:host-gateway'` on services that need to reach the host network (supervisor, BullMQ consumer)
- Isolated connection pool (dedicated `pg.Pool` instance, max 3 connections) for `langgraph-checkpoint-postgres` — never import from `@repo/db`
- Checkpoint database on Aurora PostgreSQL — `langgraph_checkpoint` database, dedicated service account credentials
- Standalone infrastructure under `infra/langgraph-server/` following established `infra/*/` directory structure
- Document Studio UI port access controls explicitly: internal-only, operator access only, not publicly routable

### Patterns to Avoid

- IaC framework lock-in (SST, CDK, Serverless Framework)
- Importing `@repo/db` for checkpoint connections — dedicated pool required
- Exposing Studio UI (port 8124) on a public network interface — network isolation required for MVP
- Hardcoding connection credentials in compose file — use environment variable references or secrets management (APIP-5004 scope)
- Building a full CI/CD deployment pipeline — documented manual procedure is sufficient for Phase 0
- Defining LangGraph worker graphs in this story — graphs are implemented in APIP-1010 through APIP-1070

---

## Conflict Analysis

### Conflict: Scope boundary with APIP-5006 (predecessor) and APIP-5003 (successor)
- **Severity**: warning
- **Description**: APIP-5006 provisions the server baseline (OS, Docker, network config, base compose structure). APIP-0030 deploys the LangGraph Platform Docker configuration on top (langgraph-platform services, checkpoint-postgres, Studio UI). APIP-5003 adds security hardening after. The boundary risk: APIP-0030 may inadvertently encroach on APIP-5003 territory (security) or assume APIP-5006 delivered more than it did. Specifically, if APIP-5006 is incomplete or delivered a minimal skeleton, APIP-0030 may need to extend the compose file more substantially than expected.
- **Resolution Hint**: Begin APIP-0030 by reviewing the APIP-5006 handoff checklist in `infra/langgraph-server/README.md`. Confirm: (a) server is provisioned, (b) Docker v2 is installed, (c) ports 8123/8124 are confirmed free, (d) base compose file exists and validates. For security: scope is limited to ensuring Studio UI is accessible only from internal network — defer firewall rules and container hardening to APIP-5003.

### Conflict: Supervisor scope clarification (APIP ADR-001 Decision 2)
- **Severity**: warning
- **Description**: The story stub's `goal` states "Deploy the supervisor graph as a durable, restart-safe long-running process with automatic state checkpointing." Per APIP ADR-001 Decision 2, the supervisor is a plain TypeScript process (not a LangGraph graph) implemented in APIP-0020. APIP-0030 deploys the LangGraph Platform that hosts the worker graphs — not the supervisor itself. The supervisor runs as a standalone TypeScript process on the same server, managed by a separate process supervisor (e.g., systemd or a compose service entry) rather than by LangGraph Platform.
- **Resolution Hint**: Clarify the story goal: APIP-0030 deploys the LangGraph Platform Docker configuration that worker graphs (elaboration, implementation, review, QA, merge) run on. The TypeScript supervisor process (APIP-0020) connects to LangGraph Platform via its HTTP API (port 8123) to invoke and monitor graphs. The compose file may optionally include a `supervisor` service entry for process management, but this is a TypeScript process, not a LangGraph deployment.

---

## Story Seed

### Title

LangGraph Platform Docker Deployment

### Description

The autonomous pipeline (APIP) uses LangGraph worker graphs (elaboration, implementation, review, QA, merge) for all structured AI work. These graphs require the LangGraph Platform — a self-hosted service that provides durable graph execution, PostgreSQL-backed checkpointing, state recovery, and Studio UI for operator inspection.

APIP-5006 established the server infrastructure baseline: a provisioned dedicated server with Docker Compose v2, base compose structure, and documented network configuration. APIP-0030 builds on that foundation to deploy the LangGraph Platform itself.

This story produces:
1. LangGraph Platform service definitions in the `infra/langgraph-server/` compose file: `langgraph-platform`, `langgraph-checkpoint-postgres`, and optional Studio UI service
2. A `langgraph-checkpoint-postgres` init container that runs `langgraph-checkpoint-postgres` schema migrations against the Aurora PostgreSQL `langgraph_checkpoint` database
3. Configuration for the isolated checkpoint connection pool (max 3, dedicated credentials, separate from `@repo/db`) per PLAT-002 action item
4. Studio UI access configured for internal-only access (not publicly routable) per SEC-001
5. A verified smoke test: LangGraph Platform API responds on port 8123, Studio UI accessible on port 8124 from internal network

Note: The TypeScript supervisor (APIP-0020) is a separate process, not deployed via LangGraph Platform. It connects to the LangGraph Platform HTTP API at port 8123 as a client.

### Initial Acceptance Criteria

- [ ] AC-1: LangGraph Platform service definition added to `infra/langgraph-server/compose.langgraph-server.yaml`; `docker compose config` validates without errors; service follows `infra/compose.lego-app.yaml` conventions (named volumes, healthcheck, restart policy)
- [ ] AC-2: `langgraph-checkpoint-postgres` configured and connected to Aurora PostgreSQL `langgraph_checkpoint` database; schema initialization confirmed (via init container or migration run)
- [ ] AC-3: LangGraph checkpoint connection pool documented and implemented as isolated from `@repo/db`: dedicated `pg.Pool` instance, max 3 connections, dedicated service account credentials
- [ ] AC-4: LangGraph Platform API reachable on port 8123 from the server; smoke test confirms the API responds to a health check endpoint within 60 seconds of `docker compose up -d`
- [ ] AC-5: LangGraph Studio UI reachable on port 8124 from internal network (localhost or VPN-accessible host); port is not exposed on public network interface
- [ ] AC-6: Restart safety verified: `docker compose restart langgraph-platform` restores the service and API health check passes within 60 seconds; in-flight graph state checkpointed to PostgreSQL is recoverable after restart
- [ ] AC-7: Checkpoint schema documented in `infra/langgraph-server/README.md`: Aurora PostgreSQL `langgraph_checkpoint` database schema, connection pool spec (max 3, separate from `@repo/db`), and migration procedure
- [ ] AC-8: APIP-0020 integration readiness: TypeScript supervisor process can connect to LangGraph Platform API at port 8123; connection config documented for APIP-0020 implementation reference

### Non-Goals

- Deploying or implementing any LangGraph worker graphs (elaboration, implementation, review, QA, merge) — those are APIP-1010 through APIP-1070
- Implementing the TypeScript supervisor loop — that is APIP-0020
- Provisioning the dedicated server or installing Docker — that is APIP-5006 (prerequisite)
- Implementing security hardening beyond port isolation (firewall rules, container hardening, mTLS) — that is APIP-5003
- Implementing secrets management (API keys, credentials vault) — that is APIP-5004
- Building full CI/CD deployment pipeline — a documented manual procedure is sufficient for Phase 0
- Implementing cron jobs or monitoring dashboards — those are APIP-3090 and APIP-2020
- Modifying production DB schemas in `packages/backend/database-schema/` — protected
- Modifying `@repo/db` client package API surface — protected
- Implementing BullMQ work queue — that is APIP-0010

### Reuse Plan

- **Components**: No UI components — pure infrastructure
- **Patterns**: `infra/compose.lego-app.yaml` service definition conventions (healthchecks, named volumes, restart policies, `extra_hosts`); `minio-init` one-shot container pattern for checkpoint schema initialization; port non-conflict pattern from existing port inventory
- **Packages**: No monorepo packages modified. References `apps/api/lego-api/core/cache/redis-client.ts` to verify Redis connection config compatibility. References `apps/api/knowledge-base/` for isolated DB instance precedent.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a pure infrastructure story — no TypeScript code, no Lambda handlers, no UI. All testing is operational:
  - **HP-1**: `docker compose -f infra/langgraph-server/compose.langgraph-server.yaml config` exits 0
  - **HP-2**: `docker compose up -d && docker compose ps` → all services healthy within 60 seconds (AC-4, AC-6)
  - **HP-3**: LangGraph Platform API health check at port 8123 returns 200 (AC-4)
  - **HP-4**: Studio UI accessible at port 8124 from internal network (AC-5)
  - **HP-5**: `docker compose restart langgraph-platform` → API health check passes within 60s (AC-6)
  - **HP-6**: Aurora PostgreSQL `langgraph_checkpoint` schema exists after init; checkpoint connection pool uses separate credentials from `@repo/db` (AC-2, AC-3)
  - **HP-7**: Port 8124 (Studio UI) is NOT accessible from external IP — verify with `ss -tlnp` bind address check (AC-5)
  - **EC-1**: Init container fails to reach Aurora — compose startup fails fast with clear error (AC-2)
  - **EC-2**: Port 8123 or 8124 conflict — compose fails with port conflict error (AC-1)
- Coverage threshold waiver applies (KB lesson): no business logic to cover. QA gate = compose health + API reachability + smoke test pass
- ADR-006 E2E exemption: explicitly declare `frontend_impacted: false` with auditable reason in QA-VERIFY
- ADR-005 applies: smoke tests must run against real deployed server — no mocks

### For UI/UX Advisor

- No user-facing UI impact. This story is invisible to end users of the LEGO MOC platform.
- Operator ergonomics consideration: the Studio UI (port 8124) is an internal operator tool. Document:
  - How to access it (hostname/IP, port, any authentication if LangGraph Platform requires it)
  - What state is visible in the Studio UI (active graphs, checkpoint history, thread IDs)
  - How to use it to inspect stalled graphs during APIP Phase 0 debugging
- Deployment procedure documentation in README.md should be operator-friendly: numbered steps, expected output for each command, clear error signals.

### For Dev Feasibility

- **Gate check first**: Verify APIP-5006 handoff checklist is complete before any implementation work. Key items to confirm: server is provisioned, Docker v2 is installed, `infra/langgraph-server/compose.langgraph-server.yaml` exists and validates, ports 8123 and 8124 confirmed free on server.
- **LangGraph Platform version pinning**: Pin the LangGraph Platform Docker image to a specific version tag in the compose file — do not use `latest`. The platform API surface is the contract between this story and APIP-0020; a version change could break the supervisor's HTTP client.
- **Checkpoint schema initialization**: `langgraph-checkpoint-postgres` provides its own schema migration utility or init SQL. Use the one-shot init container pattern (`restart: "no"` + `depends_on: condition: service_healthy`) to run it — identical to the `minio-init` pattern in `infra/compose.lego-app.yaml`.
- **Connection pool isolation is critical**: The `langgraph-checkpoint-postgres` connection config must use a separate `pg.Pool` instance — not `@repo/db`. Document in README.md with explicit Aurora connection string template: `postgresql://<dedicated_user>:<password>@<aurora_host>:5432/langgraph_checkpoint`. Max 3 connections. This prevents Aurora `max_connections` exhaustion under concurrent graph execution.
- **Studio UI access control**: Bind Studio UI port (8124) to `127.0.0.1` only in compose port mapping: `- '127.0.0.1:8124:8124'`. This ensures it is accessible only from localhost/internal network. Document this explicitly as the MVP security boundary per APIP DECISIONS SEC-001.
- **Restart-safety verification**: AC-6 requires that checkpointed state is recoverable after restart. To verify: start a LangGraph graph, wait for at least one checkpoint write, kill the container, restart, confirm graph state persists in PostgreSQL. This requires the `langgraph_checkpoint` schema to be correctly initialized.
- **APIP-0020 connection config**: Document the LangGraph Platform API URL (`http://langgraph-platform:8123` from within Docker network, `http://localhost:8123` from host) for the TypeScript supervisor implementation in APIP-0020.
- **Canonical references for implementation**:
  - `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` — direct template for all service definitions, healthchecks, volumes, init container pattern
  - `/Users/michaelmenard/Development/monorepo/infra/prometheus/prometheus.yml` — extend with LangGraph Platform metrics scrape target if exposing metrics endpoint
  - `infra/langgraph-server/compose.langgraph-server.yaml` (from APIP-5006) — the base file this story extends
