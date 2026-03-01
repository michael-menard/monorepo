---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: APIP-5006

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No existing server provisioning infrastructure documented in baseline. No LangGraph Platform deployment infrastructure exists yet.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Docker Compose for Local Dev | `infra/compose.lego-app.yaml` | Established pattern for multi-service Docker Compose configuration |
| Prometheus + Grafana stack | `infra/compose.lego-app.yaml` | Observability services pattern for resource monitoring |
| OTel Collector | `infra/compose.lego-app.yaml` | Telemetry pipeline already running in local dev infra |
| Redis (ElastiCache) | `infra/compose.lego-app.yaml`, `apps/api/lego-api/core/cache/redis-client.ts` | Redis already in infra; BullMQ queue (ADR Decision 1) depends on it |
| MinIO object storage | `infra/compose.lego-app.yaml` | S3-compatible local storage with `workflow-artifacts` bucket already created |
| CloudFormation stacks | `infra/*/template.yaml` | IaC pattern: standalone CloudFormation for AWS-managed resources |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Separate PostgreSQL instance (port 5433) pattern for isolated services |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| None | — | Platform stories index bootstrapped; no active Phase 0 work yet |

### Constraints to Respect

- ADR-002: Use standalone CloudFormation templates (framework-agnostic) for any AWS-managed infrastructure
- Baseline: Production DB schemas in `packages/backend/database-schema/` are protected — server provisioning must not touch these
- Baseline: `@repo/db` client package API surface is protected — LangGraph checkpoint connection pool must be separate (max 3 connections per architecture review)
- APIP Architecture Review: Checkpoint database co-locates with Aurora but uses its own connection pool (max: 3) for Phase 0
- FOLLOW-UPS PLAT-001: "Provision dedicated server as part of Foundation phase; gate APIP-0030 on availability" — this story IS that provisioning gate

---

## Retrieved Context

### Related Endpoints

None — this is a pure infrastructure story with no API endpoints.

### Related Components

None — no UI components. This story produces infrastructure artifacts only.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Docker Compose pattern | `infra/compose.lego-app.yaml` | Model the LangGraph server Compose file after the existing lego-app compose: named volumes, healthchecks, restart policies, `extra_hosts: host.docker.internal` |
| Prometheus config | `infra/prometheus/prometheus.yml` | Extend with LangGraph server scrape targets |
| Grafana provisioning | `infra/grafana/provisioning/` | Add LangGraph dashboard provisioning under same pattern |
| OTel Collector config | `infra/otel/otel-collector.yml` | Reuse same OTel pipeline or add LangGraph-specific pipeline |
| ElastiCache/Redis | Already deployed | BullMQ queue (APIP-0010) runs against existing Redis; no new Redis needed |
| MinIO init pattern | `infra/compose.lego-app.yaml` (minio-init service) | Pattern for one-shot initialization containers in Compose |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Docker Compose service definition | `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` | Complete example: named volumes, healthchecks, restart policies, port mapping, `extra_hosts`, one-shot init containers — all patterns needed for LangGraph server Compose |
| IaC CloudFormation stack | `/Users/michaelmenard/Development/monorepo/infra/elasticache/template.yaml` | Standalone CloudFormation following ADR-002 — model for any AWS-managed server resources |
| Monitoring config | `/Users/michaelmenard/Development/monorepo/infra/prometheus/prometheus.yml` | Prometheus scrape config pattern to extend with LangGraph metrics endpoint |

---

## Knowledge Context

### Lessons Learned

- **[AUDT-0010]** LangGraph graph tests should target compiled graph routing logic, not dynamic lens imports (*category: testing*)
  - *Applies because*: When APIP-5006 delivers its deployment, downstream graph tests (APIP-5000) should follow this pattern — not directly relevant to infrastructure provisioning itself, but informs test expectations for dependent stories.

- **[Infrastructure stories — QA KB entry]** Infrastructure stories that add only config files and schemas do not produce meaningful coverage numbers. The appropriate QA check is: build success + type-check success + unit tests on any schemas pass. Coverage threshold (45%) should be waived for pure infra/config stories. (*category: qa/pattern*)
  - *Applies because*: APIP-5006 is a pure infrastructure story — no Lambda handlers, no business logic. The QA gate should be: server reachable, compose up healthy, CI pipeline passes, resource limits documented.

### Blockers to Avoid (from past stories)

- Infrastructure files deleted without replacement (ADR-002 context): IaC framework migrations in the past deleted 54 infra files without replacement. Any server config MUST be committed as standalone, framework-agnostic files under `infra/`.
- Co-mingling LangGraph checkpoint connections with the main Aurora pool: the architecture review explicitly flags Aurora `max_connections` exhaustion risk. Checkpoint DB must use a dedicated connection pool (max 3).
- Port conflicts with existing local dev services: ports already claimed — 5432 (postgres), 5433 (kb-postgres), 6379 (redis), 9090 (prometheus), 3003 (grafana), 4317/4318 (otel), 9000/9001 (minio). LangGraph server services must use non-conflicting ports.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Use standalone CloudFormation templates (framework-agnostic). Each stack independently deployable. No SST/CDK/Serverless Framework. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Smoke tests against real deployed server. |
| APIP ADR-004 | Local Dedicated Server | All pipeline components run on a dedicated local server. No AWS Lambda. Docker Compose is the deployment mechanism. |

### Patterns to Follow

- Docker Compose service definitions with explicit healthchecks, named volumes, and `restart: unless-stopped`
- One-shot init containers (like `minio-init`) for any bootstrap tasks (e.g., creating Docker networks, initializing checkpoint schema)
- Standalone infrastructure directories under `infra/langgraph-server/` following existing `infra/*/` structure
- Resource limits defined per service (CPU + memory) with documented rationale
- Document server specs in `infra/langgraph-server/README.md` following `infra/grafana/dashboards/README.md` pattern

### Patterns to Avoid

- IaC framework lock-in (SST, CDK, Serverless Framework) — use standalone CloudFormation or plain Docker Compose only
- Mixing LangGraph checkpoint connections with `@repo/db` pool — dedicated pool required
- Exposing LangGraph Studio UI port publicly — network isolation per APIP-5003 and FOLLOW-UPS SEC-001 (defer full auth/authz to Phase 2, but ensure port is not publicly routable for MVP)
- Hardcoding resource limits without measurement — document sizing rationale based on expected graph concurrency (2-3 worktrees per APIP-3080)

---

## Conflict Analysis

### Conflict: Scope boundary with APIP-0030
- **Severity**: warning
- **Description**: APIP-5006 provisions the server and base Docker infrastructure. APIP-0030 deploys the LangGraph Platform Docker configuration (langgraph-checkpoint-postgres, Studio UI) on top of that server. The boundary is: APIP-5006 delivers the server baseline (OS, Docker, network, base compose structure, CI/CD pipeline hook); APIP-0030 delivers the LangGraph-specific service definitions. There is risk that APIP-5006 over-scopes into APIP-0030 territory or under-scopes leaving APIP-0030 without a working foundation.
- **Resolution Hint**: ACs for APIP-5006 must explicitly define the handoff contract: what is "done" in terms of server readiness for APIP-0030. A smoke test verifying `docker compose up` succeeds and base services are healthy is the right exit criterion, not the LangGraph Platform itself.

---

## Story Seed

### Title

LangGraph Server Infrastructure Baseline

### Description

The autonomous pipeline (APIP) requires all graph execution components to run on a dedicated local server rather than AWS Lambda (per APIP ADR-004). Before APIP-0030 can deploy the LangGraph Platform Docker configuration, the underlying server must be provisioned with Docker, configured with appropriate resource limits, connected to the existing observability stack, and integrated into the deployment pipeline.

This story establishes that foundation. It produces:
1. A provisioned server with Docker and Docker Compose installed
2. A base `infra/langgraph-server/compose.langgraph-server.yaml` modeled after the existing `infra/compose.lego-app.yaml` pattern
3. Documented resource allocation (CPU, RAM, disk) sized for 2-3 concurrent graph executions
4. Network configuration ensuring the server can reach existing services (Redis/BullMQ, Aurora PostgreSQL for checkpoints) without port conflicts with local dev services
5. A CI/CD pipeline hook (or documented manual deployment procedure) for pushing config updates to the server
6. A health-check endpoint or `docker compose ps` smoke test confirming the server is ready to receive APIP-0030 deployment

The story is on the critical path for Phase 0 (PLAT-001 action item): APIP-0030 is gated on this story's completion.

### Initial Acceptance Criteria

- [ ] AC-1: Server provisioned with Docker Engine and Docker Compose v2 installed; `docker compose version` returns v2.x on target server
- [ ] AC-2: Base `infra/langgraph-server/compose.langgraph-server.yaml` created with at least: a placeholder service skeleton, named volumes, and restart policies matching `infra/compose.lego-app.yaml` conventions
- [ ] AC-3: Resource limits documented in `infra/langgraph-server/README.md`: CPU, RAM, and disk allocation per service, sized for 2-3 concurrent LangGraph graph executions (APIP-3080 target)
- [ ] AC-4: Network configuration documented — server can reach existing Redis (BullMQ queue) and Aurora PostgreSQL (LangGraph checkpoint DB) without port conflicts with existing local dev services (ports 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001)
- [ ] AC-5: LangGraph checkpoint database connection configuration documented: isolated connection pool (max 3 connections), separate from `@repo/db` main pool, targeting Aurora PostgreSQL
- [ ] AC-6: Deployment procedure documented in `infra/langgraph-server/README.md` — either a CI/CD pipeline hook or a repeatable manual procedure for applying Compose config changes to the server
- [ ] AC-7: Smoke test passes: `docker compose -f infra/langgraph-server/compose.langgraph-server.yaml up -d` on the server returns healthy status for all defined services within 60 seconds
- [ ] AC-8: Server readiness checklist in `infra/langgraph-server/README.md` confirms APIP-0030 handoff contract — what is ready for LangGraph Platform Docker deployment to proceed

### Non-Goals

- Deploying the LangGraph Platform itself (langgraph-checkpoint-postgres, Studio UI) — that is APIP-0030
- Implementing the BullMQ work queue setup — that is APIP-0010 (queue runs against existing Redis)
- Implementing security hardening beyond basic network isolation — that is APIP-5003
- Implementing secrets management — that is APIP-5004
- Defining or implementing any LangGraph graph, supervisor, or worker — those are APIP-0020+
- Modifying production DB schemas in `packages/backend/database-schema/` — protected
- Modifying `@repo/db` client package API surface — protected
- Adding monitoring dashboards beyond basic healthcheck — APIP-2020 covers Monitor UI

### Reuse Plan

- **Components**: No UI components — pure infrastructure
- **Patterns**: `infra/compose.lego-app.yaml` service definition pattern (healthchecks, named volumes, restart policies, `extra_hosts`); `infra/*/template.yaml` CloudFormation pattern for any AWS-side resources; `infra/scripts/minio-init.sh` for one-shot init script pattern
- **Packages**: No monorepo packages — infrastructure only. References `apps/api/lego-api/core/cache/redis-client.ts` to understand existing Redis connection config for BullMQ compatibility

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a pure infrastructure story — no TypeScript code, no Lambda handlers, no UI. Testing is operational:
  - Smoke test: `docker compose up` succeeds and all services healthy
  - Connectivity test: server can reach Redis and Aurora PostgreSQL from within Docker network
  - Resource test: confirm CPU/RAM limits are set and enforced (check with `docker stats`)
- Coverage threshold waiver applies (KB lesson): no business logic to cover. QA gate = build success + compose health + smoke test pass
- No MSW, no E2E Playwright — ADR-006 E2E requirement does not apply (no frontend impact)
- Verifiable AC: APIP-0030 team can start work immediately after APIP-5006 completes — use this as the integration acceptance signal

### For UI/UX Advisor

- No UI impact. This story is invisible to end users.
- The only "UX" consideration is operator ergonomics: the deployment procedure documented in `infra/langgraph-server/README.md` should be runnable by a single operator in under 15 minutes with clear commands and expected output.

### For Dev Feasibility

- **Canonical references for implementation**:
  - `infra/compose.lego-app.yaml` — use as template for `compose.langgraph-server.yaml`; copy healthcheck patterns exactly
  - `infra/elasticache/template.yaml` — reference for CloudFormation pattern if any server-side AWS resources are needed
  - `infra/prometheus/prometheus.yml` — extend if LangGraph metrics scraping is included in base server config
- **Key risk**: Port allocation. Before writing any Compose config, audit all ports in `infra/compose.lego-app.yaml` and the knowledge-base pgvector instance (port 5433). LangGraph Platform typically uses ports 8123 (API), 8124 (Studio UI) — verify these are available on the target server.
- **Key risk**: Connection pool isolation. The `@repo/db` package uses `max: 1` per Lambda. For the LangGraph checkpoint connection, implement a separate pool instance (not `@repo/db`) with `max: 3`. Document this explicitly in the README to prevent future engineers from reusing `@repo/db` for checkpoints.
- **Key risk**: The server itself. If the dedicated server hardware/VM is not yet provisioned, this story's first AC (Docker installed) is blocked by hardware availability. Flag this immediately — if hardware isn't available, APIP-0030 and all of Phase 0 are blocked.
- **Sizing guidance from architecture review**: 2-3 concurrent git worktrees use 150-600 MB disk per story. RAM sizing should account for: LangGraph server process + 2-3 concurrent graph worker processes + checkpoint writes. Recommend minimum 8 GB RAM, 100 GB disk for Phase 0.
- **CI/CD integration**: If the monorepo uses GitHub Actions (`/.github/workflows/`), consider whether the server can receive config pushes from a workflow trigger. Alternatively, document an SSH-based manual procedure. Do not build a complex CD pipeline in this story — a documented `scp` + `docker compose pull && docker compose up -d` is sufficient for Phase 0.
