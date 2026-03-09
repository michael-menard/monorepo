---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-5003

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No security hardening documentation for the LangGraph Platform exists yet. APIP-0030 (LangGraph Platform Docker Deployment) is the direct predecessor and its story seed explicitly defers security hardening to APIP-5003. APIP-5006 (LangGraph Server Infrastructure Baseline) provides the server foundation and is currently In Elaboration. Neither predecessor has started implementation, so APIP-5003 has no artefacts to harden yet — this story is documentation-and-config-first.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Docker Compose for Local Dev | `infra/compose.lego-app.yaml` | Canonical Compose service definition patterns — localhost port binding convention (`127.0.0.1:port:port`) is the primary network boundary mechanism for MVP; established pattern for all container service definitions |
| Grafana (port 3003) | `infra/compose.lego-app.yaml` | Example of an operator-only UI service with no special port restriction in local dev — contrast with LangGraph Studio UI which must be localhost-bound even in server deployment |
| ElastiCache CloudFormation stack | `infra/elasticache/template.yaml` | Security Group definition pattern for restricting service access to source security groups — reference for network boundary documentation style |
| Knowledge Base PostgreSQL (port 5433) | `apps/api/knowledge-base/` | Precedent for an isolated, internal-only service with dedicated connection pool; network boundary via separate port assignment |
| Redis client config | `apps/api/lego-api/core/cache/redis-client.ts` | Existing service credential pattern — reference for how credentials are injected without hardcoding |

### Active In-Progress Work

| Story | Area | Potential Impact on APIP-5003 |
|-------|------|-------------------------------|
| APIP-5006 — LangGraph Server Infrastructure Baseline | Server provisioning, base compose | In Elaboration. APIP-5003 cannot fully document firewall rules and host network config until APIP-5006 defines server OS, network interface names, and base compose structure. APIP-5003 must note APIP-5006 as the handoff supplier. |
| APIP-0030 — LangGraph Platform Docker Deployment | Docker Compose, LangGraph services | Hard predecessor. APIP-0030 owns Studio UI port binding (port 8124 to `127.0.0.1`). APIP-5003 documents and verifies that binding, then adds additional hardening layers on top. APIP-5003 must not duplicate APIP-0030 ACs — it extends them. |
| APIP-5004 — Secrets Engine and API Key Management | Secrets management, API key storage | Parallel work. APIP-5004 owns the `SecretsClient` library and AWS Secrets Manager CloudFormation stack. APIP-5003 owns Docker container-level secret mounting and whether secrets enter containers via env vars or Docker secrets. Clear boundary required: APIP-5003 documents the container secret injection mechanism; APIP-5004 implements the secrets retrieval library. |

### Constraints to Respect

- **APIP DECISIONS SEC-001**: Network isolation is the MVP security boundary. Full auth/authz for LangGraph Platform API (port 8123) and Studio UI (port 8124) is deferred to Phase 2 when external access is planned. APIP-5003 must not implement auth/authz middleware or JWT gating — that is out of scope for MVP.
- **APIP DECISIONS SEC-001-full-auth (FOLLOW-UPS)**: Deferred until Phase 2 external access scope. Do not schedule or design for external access in this story.
- **APIP ADR-004**: All pipeline components run on a dedicated local server — no AWS Lambda. Security boundary is host-network-level isolation, not VPC/IAM.
- **ADR-002**: Infrastructure-as-Code must use standalone CloudFormation or plain Docker Compose. No SST/CDK/Serverless Framework. Any firewall or iptables rules must be documented as repeatable shell commands, not framework-managed resources.
- **Baseline protected**: Production DB schemas in `packages/backend/database-schema/` must not be touched. `@repo/db` client package API surface is protected.
- **Reserved ports** (must not add conflicts): 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001. LangGraph Platform: 8123 (API), 8124 (Studio UI).
- **APIP-5003 scope (from story.yaml notes)**: Scope reduced from full auth/authz to network boundary documentation + container hardening. Secrets management implementation deferred to APIP-5004.

---

## Retrieved Context

### Related Endpoints

None — this is a pure infrastructure/documentation story. No HTTP endpoints are added or modified in the monorepo application layer. The story concerns the security posture of LangGraph Platform ports 8123 and 8124 and the Docker container runtime configuration.

### Related Components

None — no UI components are introduced or modified. LangGraph Studio UI (port 8124) is a LangGraph-provided operator tool whose access is being restricted, not built, in this story.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| Port binding convention | `infra/compose.lego-app.yaml` | `- '127.0.0.1:8124:8124'` pattern for localhost-only binding — already used for Studio UI per APIP-0030 seed; verify and document its security effectiveness |
| Grafana security env vars | `infra/compose.lego-app.yaml` | `GF_USERS_ALLOW_SIGN_UP=false`, `GF_SECURITY_ADMIN_PASSWORD` — example of container-level security configuration via environment variables; model the documentation style after this pattern |
| Security Group pattern | `infra/elasticache/template.yaml` | `CacheSecurityGroup` resource — source-SG-restricted ingress rules — model for network boundary documentation table format |
| minio-init one-shot pattern | `infra/compose.lego-app.yaml` | One-shot init container for applying hardening steps at startup — applicable if any hardening init commands are needed (e.g., setting file permissions on mounted secrets) |
| Docker image pinning | `infra/compose.lego-app.yaml` | All images use pinned version tags (`postgres:16`, `redis:7.2-alpine`, `prom/prometheus:v2.50.1`) — APIP-5003 must verify LangGraph Platform image is also pinned in APIP-0030, and document image pinning as a security requirement |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Docker Compose service security config | `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` | Shows localhost port binding syntax, named volumes, read-only volume mounts (`:ro`), `restart: unless-stopped`, and environment variable injection — all Docker security hardening patterns this story documents and verifies |
| CloudFormation Security Group + network boundary | `/Users/michaelmenard/Development/monorepo/infra/elasticache/template.yaml` | Example of source-SG-restricted ingress rules and network boundary documentation in IaC; model the network access control table after this resource's structure |
| IaC stack structure (ADR-002 compliance) | `/Users/michaelmenard/Development/monorepo/infra/elasticache/template.yaml` | Standalone CloudFormation stack with Parameters, Resources, Outputs — if any AWS-side firewall resources are documented, they follow this structure |

---

## Knowledge Context

### Lessons Learned

- **[Infrastructure QA KB entry]** Infrastructure stories that add only config files and documentation do not produce meaningful coverage numbers. The appropriate QA gate is build success + smoke test pass + operational verification. Coverage threshold (45%) should be waived for pure infra/config stories.
  - *Applies because*: APIP-5003 is a documentation + container-hardening story — it produces Markdown documentation and Docker Compose configuration changes. No TypeScript business logic. QA gate = compose config validation + port binding verification + security checklist audit pass.

- **[Pattern: Review phase waived for documentation-only stories]** Stories delivering only config/markdown with no executable TypeScript receive waived or minimal code review. Infrastructure quality checks (config correctness, documentation completeness) substitute for TypeScript code review.
  - *Applies because*: APIP-5003 delivers documentation and compose config. Review phase should focus on security correctness (port bindings, container user settings, read-only mounts) rather than TypeScript quality.

- **[Pure infrastructure stories: explicit E2E exemption required]** Infrastructure stories with no frontend surface should explicitly declare E2E test exemption in QA-VERIFY with auditable reasons referencing `frontend_impacted: false`.
  - *Applies because*: APIP-5003 has no frontend surface. E2E exemption must be explicitly declared with story_type and scope rationale.

- **[Scope overlap between APIP-5003 and APIP-5004 (from APIP-5004 seed)]** APIP-5004 identified a scope risk: both stories touch secrets management. APIP-5004 owns the `SecretsClient` library. APIP-5003 must explicitly claim or disclaim Docker container secret mounting as its deliverable. The boundary: APIP-5003 owns the container-level mechanism (env vars vs. Docker secrets); APIP-5004 owns the secrets retrieval library.
  - *Applies because*: Without an explicit boundary in APIP-5003 ACs, the two stories will either duplicate work or leave a gap in the secrets injection chain.

- **[ARCH-001: Port isolation lesson]** Two PostgreSQL instances in the monorepo (5432, 5433) are isolated by dedicated port assignment and connection pools. The LangGraph Platform adds two more service ports (8123, 8124). APIP-5003 must document the full port inventory and the network boundary for each.
  - *Applies because*: Port inventory documentation is one of the primary deliverables of this story; missing a reserved port can cause startup failures or unintended exposure.

### Blockers to Avoid (from past stories)

- **Scope creep into full auth/authz**: FOLLOW-UPS SEC-001-full-auth explicitly defers full authentication and authorization to Phase 2. Implementing JWT middleware, API keys for the LangGraph Platform API, or access control lists in this story violates the MVP boundary.
- **Scope creep into APIP-5004 (secrets implementation)**: APIP-5003 must document the container secret injection mechanism (how secrets enter the container) but must NOT implement the `SecretsClient` library. Cross-reference APIP-5004 outputs explicitly in the documentation.
- **Hardcoding credentials in compose file**: Any credentials appearing in Docker Compose config must use environment variable references (`${VAR_NAME}`). Plain-text secrets in compose files are a security anti-pattern regardless of whether the server is "internal-only."
- **Infrastructure files deleted without replacement (ADR-002)**: Past migrations deleted 54 infra files without replacement. All security documentation for the LangGraph Platform MUST be committed under `infra/langgraph-server/` as standalone, framework-agnostic Markdown and Compose config.
- **Assuming server-level firewall without verifying OS firewall state**: `iptables`/`ufw` rules must be documented as explicit, runnable commands — not assumed to be pre-configured by APIP-5006 unless APIP-5006 ACs explicitly promise them.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Standalone CloudFormation or plain Docker Compose only. No SST/CDK/Serverless Framework. Firewall rules documented as repeatable shell commands under `infra/`. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Smoke test for security verification runs against real deployed server. |
| ADR-006 | E2E Tests Required in Dev Phase | Skippable with `frontend_impacted: false` — explicitly declare exemption with auditable reason in QA-VERIFY. |
| APIP ADR-004 | Local Dedicated Server | All pipeline components on dedicated local server. No Lambda. Docker Compose is the deployment mechanism. Security boundary is host-network isolation. |
| APIP DECISIONS SEC-001 | Studio UI Security | Port 8124 not publicly routable. Network isolation = MVP security boundary. Full auth/authz deferred Phase 2. |
| APIP DECISIONS SEC-001-full-auth (FOLLOW-UPS) | Auth/authz deferred | Full auth/authz layer for LangGraph Platform deferred to Phase 2 when external access is planned. Do not implement in APIP-5003. |

### Patterns to Follow

- Document port bindings explicitly with the `127.0.0.1:port:port` pattern for internal-only services — this is the primary network isolation mechanism for Docker on a dedicated server
- Use read-only volume mounts (`:ro`) for all configuration files mounted into containers — prevents container-internal modification of host config
- Document all container security settings in a `SECURITY.md` or equivalent section in `infra/langgraph-server/README.md`
- Follow `infra/compose.lego-app.yaml` image pinning pattern — all images must use specific version tags, not `latest`
- Verify port bindings with `ss -tlnp` or `netstat -tlnp` as the operational check — document this as the verification command
- Non-root container user: document whether LangGraph Platform image supports a `user:` directive in compose; if it does, configure it; if not, document the gap explicitly
- Cross-reference APIP-5004 for secrets injection boundary: APIP-5003 owns the Docker Compose `environment:` or `secrets:` stanza definition; APIP-5004 provides the values

### Patterns to Avoid

- Implementing JWT authentication or API key gating for LangGraph Platform API (port 8123) — deferred to Phase 2
- Implementing mTLS between containers — out of scope for internal-only MVP
- Importing `@repo/db` for any security-related database access — dedicated pools only
- Defining IaC using SST, CDK, or Serverless Framework — standalone Compose and CloudFormation only
- Using `latest` image tags in compose config — pin all images to specific versions
- Declaring security hardening "complete" without an operational verification step (`ss -tlnp` check, Docker inspect of security options)
- Assuming APIP-5006 delivers firewall rules — unless explicitly in APIP-5006 ACs, APIP-5003 must document them itself

---

## Conflict Analysis

### Conflict: Dependency on incomplete predecessors (APIP-5006 and APIP-0030)
- **Severity**: warning
- **Description**: APIP-5003 depends on APIP-0030, which in turn depends on APIP-5006. Neither predecessor is complete. APIP-5006 is In Elaboration; APIP-0030 is backlog. APIP-5003 cannot fully enumerate firewall rules (they depend on server OS network interfaces from APIP-5006) or verify port binding security (the ports are only created by APIP-0030). The risk is that APIP-5003 is elaborated in isolation and discovers at implementation time that it needs APIP-5006 and APIP-0030 artefacts that do not yet exist.
- **Resolution Hint**: Scope APIP-5003 ACs to be verifiable against the APIP-0030 output: (a) verify port 8124 is bound to `127.0.0.1` (APIP-0030 deliverable), (b) add hardening on top (read-only mounts, non-root user). ACs that depend on APIP-5006 server config (specific network interface names, firewall tool) should be documented as "to be completed post-APIP-5006" with explicit placeholders. Begin APIP-5003 implementation only after APIP-0030 is complete.
- **Source**: index analysis + dependency chain

### Conflict: Scope boundary with APIP-5004 (secrets injection)
- **Severity**: warning
- **Description**: APIP-5004 story seed explicitly notes that "APIP-5003 should own whether secrets are mounted as Docker secrets vs. env vars in the container definition." Both stories are in backlog with no elaboration. Without an explicit boundary in APIP-5003 ACs, either (a) APIP-5003 leaves a documentation gap about how secrets enter containers, or (b) APIP-5003 and APIP-5004 both implement container secret injection and conflict.
- **Resolution Hint**: APIP-5003 AC must explicitly state: the container secret injection mechanism is documented in `infra/langgraph-server/SECURITY.md` (owned by APIP-5003), and that mechanism uses Docker Compose `environment:` with variable references (`${VAR_NAME}`) for MVP. The secrets retrieval mechanism (what provides those env var values) is APIP-5004's scope. The two stories cross-reference each other explicitly.
- **Source**: APIP-5004 seed conflict analysis

### Conflict: Risk of over-scoping into Phase 2 auth/authz
- **Severity**: warning
- **Description**: The story title includes "security hardening" which is broad. FOLLOW-UPS SEC-001-full-auth explicitly defers full auth/authz to Phase 2. There is a natural temptation during elaboration to add ACs for LangGraph Platform API authentication (port 8123 requires bearer token) or mTLS between containers. These are Phase 2 concerns and would significantly expand the story scope beyond MVP.
- **Resolution Hint**: Any AC that involves adding authentication middleware, token validation, TLS certificates, or access control lists to the LangGraph Platform API must be explicitly rejected as out of scope for this story, with a note referencing FOLLOW-UPS SEC-001-full-auth and scheduling for Phase 2. The Non-Goals section of the story must be explicit and comprehensive on this point.
- **Source**: FOLLOW-UPS.md SEC-001-full-auth + story.yaml notes

---

## Story Seed

### Title

LangGraph Platform Security Hardening and Network Boundary Documentation

### Description

**Context**: The autonomous pipeline runs on a dedicated local server with LangGraph Platform services (API port 8123, Studio UI port 8124) deployed via Docker Compose (APIP-0030). These services expose internal pipeline execution capabilities that must not be reachable from outside the server's host network. The architecture decision (SEC-001) establishes network isolation as the MVP security boundary — full authentication and authorization is deferred to Phase 2 when external access is planned.

APIP-0030 establishes the basic port binding (`127.0.0.1:8124:8124` for Studio UI). APIP-5003 builds on that foundation to: (1) document the complete network boundary for all LangGraph Platform services, (2) apply Docker container hardening best practices (non-root user, read-only mounts, no unnecessary capabilities), (3) define the container secret injection mechanism (the boundary with APIP-5004), and (4) produce a security architecture document (`infra/langgraph-server/SECURITY.md`) that serves as the Phase 2 starting point for full auth/authz design.

**Problem**: Without explicit documentation and hardening, the LangGraph Platform deployment is an implicit security boundary dependent on correct configuration in APIP-0030. Any future change to the compose file could inadvertently expose services. There is no documented port inventory, no container hardening baseline, and no record of what the network boundary is and how to verify it.

**Proposed Solution Direction**: Deliver a `SECURITY.md` document under `infra/langgraph-server/` that formally states the network boundary, the port inventory, the container hardening configuration, and the secrets injection mechanism. Update the `compose.langgraph-server.yaml` to apply container hardening directives (read-only filesystem where supported, non-root user where supported, dropped Linux capabilities). Provide an operational verification checklist (`ss -tlnp` port binding check, Docker inspect of security options) that an operator can run to confirm the security posture is intact after any compose config change.

### Initial Acceptance Criteria

- [ ] AC-1: `infra/langgraph-server/SECURITY.md` created and committed, containing: (a) network boundary statement declaring LangGraph Platform API (port 8123) and Studio UI (port 8124) as internal-only services, (b) full port inventory table for all LangGraph server services (including ports inherited from APIP-5006 base), (c) explicit statement that full auth/authz is deferred to Phase 2 per FOLLOW-UPS SEC-001-full-auth, with a Phase 2 design placeholder section
- [ ] AC-2: Port 8123 (LangGraph Platform API) is bound to `127.0.0.1` only in `compose.langgraph-server.yaml` (`- '127.0.0.1:8123:8123'`); port 8124 (Studio UI) is bound to `127.0.0.1` only; verified with `ss -tlnp | grep -E '8123|8124'` — neither port shows `0.0.0.0` or `::` bind addresses
- [ ] AC-3: Docker container hardening applied to all LangGraph Platform services in `compose.langgraph-server.yaml` where the upstream image supports it: (a) `read_only: true` on container root filesystem or specific writable paths declared via `tmpfs:`, (b) `user:` directive set to a non-root UID (if LangGraph Platform image supports it — if not, document the gap with an issue reference), (c) `cap_drop: [ALL]` with only required capabilities re-added if needed
- [ ] AC-4: All configuration files mounted into LangGraph Platform containers use read-only volume mounts (`:ro` suffix); no host directory is mounted read-write except named volumes for persistent state (checkpoint data, logs)
- [ ] AC-5: All Docker Compose image tags for LangGraph Platform services are pinned to specific version tags (no `latest`); this is documented as a security requirement in `SECURITY.md` with rationale (supply chain integrity)
- [ ] AC-6: Container secret injection mechanism documented in `SECURITY.md`: for MVP, secrets enter containers via Docker Compose `environment:` stanza using variable references (`${ANTHROPIC_API_KEY}`, `${OPENROUTER_API_KEY}`, etc.) sourced from a `.env` file or host environment. The document explicitly states: (a) secret values must never be hardcoded in `compose.langgraph-server.yaml`, (b) the `.env` file must be in `.gitignore`, (c) APIP-5004 provides the values for these variables at runtime via its `SecretsClient`. Cross-reference APIP-5004 explicitly.
- [ ] AC-7: Operational security verification checklist in `SECURITY.md`: numbered steps an operator can run after any compose config change to confirm security posture — includes `ss -tlnp` port binding check, `docker inspect --format='{{.HostConfig.SecurityOpt}}' <container>` for security options, and `docker inspect --format='{{.HostConfig.CapDrop}}' <container>` for dropped capabilities
- [ ] AC-8: `compose.langgraph-server.yaml` passes `docker compose config` without errors after all hardening changes are applied; no service definition breaks due to hardening directives
- [ ] AC-9: `SECURITY.md` includes a Phase 2 design placeholder section titled "Phase 2: Authentication and Authorization" that lists deferred items: LangGraph Platform API authentication (bearer token or mTLS), Studio UI access control, network policy enforcement, and estimated prerequisites (external access requirement)

### Non-Goals

- Implementing authentication or authorization middleware for LangGraph Platform API (port 8123) — deferred to Phase 2 per FOLLOW-UPS SEC-001-full-auth
- Implementing mTLS between containers or between the supervisor and LangGraph Platform — Phase 2 concern
- Implementing the `SecretsClient` library or AWS Secrets Manager CloudFormation resources — that is APIP-5004's scope
- Configuring OS-level firewall rules (iptables/ufw) on the server — if required, document in `SECURITY.md` as a server provisioning prerequisite pointing to APIP-5006; do not implement here unless APIP-5006 ACs explicitly leave this undone
- Provisioning the dedicated server or installing Docker — that is APIP-5006 (prerequisite of APIP-0030 which is prerequisite of this story)
- Deploying or modifying any LangGraph worker graphs — those are APIP-1010 through APIP-1070
- Implementing SAST scanning or security review gates in the code review graph — that is APIP-1050 scope (confirmed by FOLLOW-UPS SEC-003-story)
- Modifying production DB schemas in `packages/backend/database-schema/` — protected
- Modifying `@repo/db` client package API surface — protected
- Building a full security audit tool or automated compliance scanner

### Reuse Plan

- **Components**: No UI components — pure infrastructure and documentation
- **Patterns**: `infra/compose.lego-app.yaml` image pinning convention (specific version tags); `:ro` read-only volume mount pattern; `127.0.0.1:port:port` localhost binding pattern from APIP-0030 seed; `infra/elasticache/template.yaml` security documentation format for network boundary tables
- **Packages**: No monorepo packages. `infra/langgraph-server/compose.langgraph-server.yaml` (from APIP-0030) is the primary artefact to harden. `infra/langgraph-server/README.md` (from APIP-5006/APIP-0030) is extended with security content.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a pure infrastructure/documentation story — no TypeScript code, no Lambda handlers, no UI. All testing is operational:
  - **HP-1**: `docker compose -f infra/langgraph-server/compose.langgraph-server.yaml config` exits 0 after hardening changes (AC-8)
  - **HP-2**: `ss -tlnp | grep -E '8123|8124'` on the server shows `127.0.0.1` bind address only — not `0.0.0.0` (AC-2)
  - **HP-3**: `docker inspect --format='{{.HostConfig.SecurityOpt}}' langgraph-platform` returns expected security options (AC-3)
  - **HP-4**: `docker inspect --format='{{.HostConfig.CapDrop}}' langgraph-platform` returns `[ALL]` or equivalent (AC-3)
  - **HP-5**: `docker inspect --format='{{.Mounts}}' langgraph-platform` — all config volume mounts show `RW:false` (AC-4)
  - **HP-6**: All image tags in compose file are pinned (no `latest`); verified by `grep 'image:' compose.langgraph-server.yaml | grep ':latest'` returning empty (AC-5)
  - **HP-7**: `SECURITY.md` exists at `infra/langgraph-server/SECURITY.md` and contains all required sections (AC-1, AC-6, AC-7, AC-9) — automated check via `test -f infra/langgraph-server/SECURITY.md`
  - **EC-1**: Hardening directives that conflict with the LangGraph Platform image (e.g., `read_only: true` on a container that writes to root FS) cause compose startup failure — document which hardening directives are compatible and provide fallback config if the image does not support full hardening
- Coverage threshold waiver applies: no business logic to cover. QA gate = compose health + port binding verification + security checklist audit pass
- ADR-006 E2E exemption: explicitly declare `frontend_impacted: false` with auditable reason in QA-VERIFY (story type: infrastructure/documentation; no frontend surface)
- ADR-005 applies: operational verification steps must run against the real deployed server — no mock containers

### For UI/UX Advisor

- No user-facing UI impact. This story is invisible to end users of the LEGO MOC platform.
- Operator ergonomics is the primary "UX" consideration:
  - `SECURITY.md` must be structured for an operator who needs to quickly verify security posture after a compose config change — use numbered steps, expected command output, and "PASS / FAIL" indicators
  - The Phase 2 design placeholder section should be written to be useful to the Phase 2 engineer who will implement auth/authz — include the questions that need answering (which auth mechanism, which CA for mTLS, etc.)
  - The port inventory table should be sortable/scannable at a glance — use a consistent column order: service name, internal port, external binding, protocol, access scope

### For Dev Feasibility

- **Gate check first**: APIP-5003 implementation must not begin until APIP-0030 is complete and `compose.langgraph-server.yaml` exists with LangGraph Platform services defined. Hardening a compose file that does not yet exist is not possible.
- **Container hardening compatibility research required**: LangGraph Platform is a third-party Docker image. Before writing `read_only: true` or `cap_drop: [ALL]` in the compose file, verify the image is compatible. Some images write to their filesystem at startup; `read_only: true` will cause them to fail. Research step: run the image with `--read-only --cap-drop ALL` and confirm startup succeeds. If not, document the gap explicitly in `SECURITY.md` and use `tmpfs:` for writable paths as a fallback.
- **Non-root user compatibility**: Check if the LangGraph Platform image declares a non-root user in its Dockerfile. If it does, reference it in the compose `user:` directive. If it runs as root, document this as a known gap in `SECURITY.md` with a GitHub issue reference for Phase 2 remediation.
- **Port binding verification command**: `ss -tlnp` is the recommended command (replaces deprecated `netstat`); ensure the target server OS has `ss` available (part of `iproute2` package on Linux). If not available, `netstat -tlnp` is the fallback. Document both in the verification checklist.
- **`.env` file gitignore check**: Before AC-6 is marked complete, verify `.gitignore` at the `infra/langgraph-server/` level excludes `.env`. If it does not, add it.
- **APIP-5004 coordination**: Before starting AC-6 implementation, confirm with APIP-5004 what the expected env var names are for all secrets (e.g., `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `MINIMAX_API_KEY`, `LANGGRAPH_POSTGRES_URL`). The APIP-5003 `SECURITY.md` documentation of the injection mechanism must use the same names that APIP-5004 will provide at runtime.
- **Canonical references for implementation**:
  - `/Users/michaelmenard/Development/monorepo/infra/compose.lego-app.yaml` — pattern for image pinning, `:ro` volume mounts, localhost port binding syntax
  - `/Users/michaelmenard/Development/monorepo/infra/elasticache/template.yaml` — network boundary documentation format (security group ingress table)
  - `infra/langgraph-server/compose.langgraph-server.yaml` (from APIP-0030) — the primary artefact to harden; must exist before this story begins
  - `infra/langgraph-server/README.md` (from APIP-5006 + APIP-0030) — extend with security content rather than creating a separate file (unless `SECURITY.md` is preferred for discoverability)
