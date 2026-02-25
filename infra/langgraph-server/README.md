# LangGraph Server Infrastructure

## Overview

This directory contains the Docker Compose infrastructure definition for the LangGraph server — the execution engine powering the autonomous development pipeline (APIP). The server hosts LangGraph graphs (agent workflows) and persists their checkpoint state to an isolated Aurora PostgreSQL pool.

The files here define the **base infrastructure skeleton** used as the handoff target for APIP-0030, which will build the actual LangGraph Platform image and deploy it into this compose specification.

---

## Resource Limits

All limits are sized to support **2–3 concurrent graph executions** without OOM or CPU starvation.

| Resource | Limit | Reservation | Notes |
|----------|-------|-------------|-------|
| CPU | 2.0 cores | 0.5 cores | Burst to 2 cores for parallel graph steps |
| RAM | 4 GB | 1 GB | Each graph execution uses ~500 MB–1.5 GB |
| Disk (volume) | 100 GB recommended | — | Named volume `langgraph_data`; provision host accordingly |

**Minimum host requirements:**
- 8 GB RAM (to leave headroom for OS + other services)
- 100 GB available disk for the `langgraph_data` volume
- 4 physical CPU cores

These limits are set in `compose.langgraph-server.yaml` under `deploy.resources.limits`. Adjust `cpus` and `memory` for your host capacity, but do not drop below the minimums above.

---

## Network Configuration

### Port Assignments

| Port | Protocol | Service | Description |
|------|----------|---------|-------------|
| 8123 | HTTP | LangGraph REST API | Primary API for graph invocation and thread management |
| 8124 | HTTP | LangGraph Studio UI | Browser-based graph visualization and debugging |

### Reserved Ports (DO NOT USE)

The following ports are in use by other services in this monorepo and must not be assigned to the LangGraph server or any future service in this compose file:

| Port | Reserved by |
|------|-------------|
| 5432 | PostgreSQL (monorepo primary) |
| 5433 | PostgreSQL (monorepo test) |
| 6379 | Redis |
| 9090 | Prometheus |
| 3003 | Grafana |
| 4317 | OTel Collector (gRPC) |
| 4318 | OTel Collector (HTTP) |
| 9000 | MinIO S3 API |
| 9001 | MinIO Console |

### Conflict Audit

Before deploying on a new host, verify that ports 8123 and 8124 are free:

```bash
ss -tlnp | grep -E '8123|8124'
```

No output means the ports are available. If either port shows as bound, identify and stop the conflicting process before proceeding.

---

## Checkpoint Database Connection

LangGraph uses a PostgreSQL-backed checkpoint store to persist intermediate graph state across invocations. This allows graphs to resume from any step after interruption.

### Isolation Requirement

The checkpoint pool **must** be isolated from the application's primary database connection:

- Use a **dedicated `pg.Pool`** with `max: 3` connections
- Do **NOT** use `@repo/db` or any shared pool from the main application
- Target: **Aurora PostgreSQL** (same cluster as monorepo, separate database `langgraph_checkpoints`)

**Rationale**: Graph checkpointing is bursty — a single graph execution can produce dozens of checkpoint writes in a short window. Sharing the application pool would starve request-handling connections during heavy graph workloads.

### Connection Configuration

Set these environment variables at deploy time (see `.env` or secrets manager):

```env
LANGGRAPH_CHECKPOINT_DB_HOST=<aurora-cluster-endpoint>
LANGGRAPH_CHECKPOINT_DB_PORT=5432
LANGGRAPH_CHECKPOINT_DB_NAME=langgraph_checkpoints
LANGGRAPH_CHECKPOINT_DB_USER=<service-account-user>
LANGGRAPH_CHECKPOINT_DB_PASSWORD=<secret>
LANGGRAPH_CHECKPOINT_DB_POOL_MAX=3
```

The database `langgraph_checkpoints` must be created on the Aurora cluster before first start:

```sql
CREATE DATABASE langgraph_checkpoints;
GRANT ALL PRIVILEGES ON DATABASE langgraph_checkpoints TO <service-account-user>;
```

---

## Deployment Procedure

The following procedure deploys or updates the LangGraph server on the target host. The entire procedure should complete in **under 15 minutes** on a standard EC2 instance with a stable internet connection.

### Prerequisites

- Docker Engine 24+ and Docker Compose v2+ installed on the target host
- SSH access to the target host
- Aurora PostgreSQL cluster accessible from the target host
- `LANGGRAPH_CHECKPOINT_DB_*` environment values available

### Steps

1. **Copy compose file to target host**

   ```bash
   scp infra/langgraph-server/compose.langgraph-server.yaml <user>@<host>:/opt/langgraph/compose.yaml
   ```

2. **Create environment file on the target host**

   ```bash
   ssh <user>@<host>
   cat > /opt/langgraph/.env << 'ENVEOF'
   LANGGRAPH_CHECKPOINT_DB_HOST=<aurora-endpoint>
   LANGGRAPH_CHECKPOINT_DB_PORT=5432
   LANGGRAPH_CHECKPOINT_DB_NAME=langgraph_checkpoints
   LANGGRAPH_CHECKPOINT_DB_USER=<user>
   LANGGRAPH_CHECKPOINT_DB_PASSWORD=<password>
   ENVEOF
   chmod 600 /opt/langgraph/.env
   ```

3. **Pull latest image**

   ```bash
   docker compose -f /opt/langgraph/compose.yaml --env-file /opt/langgraph/.env pull
   ```

4. **Start the service**

   ```bash
   docker compose -f /opt/langgraph/compose.yaml --env-file /opt/langgraph/.env up -d
   ```

5. **Verify health**

   ```bash
   docker compose -f /opt/langgraph/compose.yaml ps
   # Expected: langgraph-server  running (healthy)

   curl -sf http://localhost:8123/ok && echo "API OK"
   # Expected: API OK
   ```

6. **Verify Studio UI** (optional)

   Open `http://<host>:8124` in a browser. The LangGraph Studio interface should load.

7. **Check logs if unhealthy**

   ```bash
   docker compose -f /opt/langgraph/compose.yaml logs langgraph-server --tail 100
   ```

**Total estimated time**: 5–12 minutes depending on image size and network speed.

---

## APIP-0030 Handoff Checklist

The following items must all be confirmed before declaring the LangGraph server ready for LangGraph Platform deployment (APIP-0030):

- [ ] `compose.langgraph-server.yaml` is present in `infra/langgraph-server/` and committed to the story branch
- [ ] Placeholder image (`python:3.11-slim`) has been replaced with the actual LangGraph Platform image produced by the APIP-0030 build pipeline
- [ ] Ports 8123 (API) and 8124 (Studio UI) are confirmed free on the target host (`ss -tlnp | grep -E '8123|8124'` returns no output)
- [ ] No reserved ports (5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001) are used in the compose file
- [ ] Aurora PostgreSQL database `langgraph_checkpoints` exists and the service account has `ALL PRIVILEGES`
- [ ] `LANGGRAPH_CHECKPOINT_DB_*` environment variables are set and the server can connect to Aurora on startup (check logs for connection errors)
- [ ] `docker compose ps` shows `langgraph-server` as `running (healthy)`
- [ ] `curl -sf http://localhost:8123/ok` returns HTTP 200
- [ ] LangGraph Studio UI loads at `http://<host>:8124`
- [ ] Resource limits (`cpus: '2.0'`, `memory: 4G`) are appropriate for the target host (host has ≥ 8 GB RAM and ≥ 4 CPU cores)
- [ ] Named volume `langgraph_data` is created on a disk with ≥ 100 GB free space
- [ ] `restart: unless-stopped` is confirmed — server survives a container restart without manual intervention
- [ ] `extra_hosts: host.docker.internal:host-gateway` is present (required for callbacks to host services)
- [ ] This README has been reviewed and any environment-specific values (endpoints, credentials) have been documented in the team runbook or secrets manager

