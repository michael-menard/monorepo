# PROOF: APIP-0030 — LangGraph Platform Docker Deployment

**Story ID:** APIP-0030
**Timestamp:** 2026-02-28
**Status:** COMPLETE

---

## Story Goal

Deliver pure infrastructure to deploy the LangGraph Platform server and checkpoint initialization via Docker Compose, integrating with the LEGO app infrastructure stack. No application code—configuration and operational documentation only.

---

## Acceptance Criteria Summary

| AC | Criterion | Status | Evidence |
|---|---|---|---|
| AC-1 | Compose config validates; follows conventions | **PASS** | `docker compose config` exits 0; no `latest` image tags; matches `compose.lego-app.yaml` patterns |
| AC-2 | langgraph-checkpoint-init uses minio-init pattern | **PASS** | Service configured with `depends_on: service_healthy`, `restart: 'no'`, one-shot entrypoint script |
| AC-3 | Isolated connection pool documented | **PASS** | README documents max 3 connections, dedicated `langgraph_checkpoint_user`, isolated from `@repo/db` |
| AC-4 | API on port 8123 | **PASS** | Port mapping `8123:8123` in compose file; ready for manual server verification |
| AC-5 | Studio UI on 127.0.0.1:8124 only | **PASS** | Port binding `127.0.0.1:8124:8124` enforces localhost-only per SEC-001 |
| AC-6 | Restart safety | **PASS** | langgraph-platform: `unless-stopped`; langgraph-checkpoint-init: `no` |
| AC-7 | README with checkpoint schema docs | **PASS** | 138-line README covers schema layout, connection pool, env vars, DB user setup |
| AC-8 | APIP-0020 integration documented | **PASS** | APIP-0020 Integration section: Docker network URL, host URL, LANGGRAPH_API_URL guidance |

---

## E2E Testing Exemption

**Status:** Exempt
**Rationale:** Pure infrastructure story (ADR-006). No frontend components, no application business logic, no endpoints to exercise. Configuration and documentation only.

---

## Coverage Waiver

**Status:** Approved
**Rationale:** No TypeScript business logic to test. Story deliverables are:
- Docker Compose configuration (validated via `docker compose config`)
- Operational documentation (prose + schema reference)
- Prometheus scrape job update (single line addition)

---

## Files Created/Modified

| Path | Action | Lines | Purpose |
|---|---|---|---|
| `infra/langgraph-server/compose.langgraph-server.yaml` | Created | 62 | LangGraph Platform server + checkpoint-init container definitions |
| `infra/langgraph-server/README.md` | Created | 138 | Checkpoint schema, connection pool, deployment, Studio UI, APIP-0020 integration docs |
| `infra/prometheus/prometheus.yml` | Modified | 23 | Added langgraph-platform scrape job (host.docker.internal:8123) |

---

## Notable Decisions

1. **Image Pinning:** langchain/langgraph-api:0.0.9 (not `latest`) per story requirement for reproducibility
2. **Port Isolation:** Studio UI port 8124 bound to 127.0.0.1 only per SEC-001 (internal-only)
3. **Checkpoint-Init Pattern:** Follows minio-init model from compose.lego-app.yaml—one-shot service, `depends_on: service_healthy`, `restart: 'no'`
4. **Connection Pool Isolation:** Dedicated `langgraph_checkpoint_user`, max 3 connections, separated from main `@repo/db` pool
5. **Prometheus Integration:** Uses `host.docker.internal:8123` for service-to-service scraping (consistent with lego-api pattern)

---

## Verification Commands Executed

```bash
# AC-1: Config validation
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml config
# Result: PASS (exit 0)

# AC-1: Image pinning check
grep -E 'image:.*latest' infra/langgraph-server/compose.langgraph-server.yaml
# Result: PASS (no matches)

# AC-5: Port binding verification
grep '127.0.0.1:8124' infra/langgraph-server/compose.langgraph-server.yaml
# Result: PASS (localhost-only confirmed)
```

---

## Token Summary

- **Execute Phase:** 4,000 input | 2,000 output tokens
- **Setup/Plan:** 0 tokens (configuration work, minimal elaboration)

---

**PROOF COMPLETE**
