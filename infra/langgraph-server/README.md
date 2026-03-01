# LangGraph Platform Server

Docker Compose deployment for the LangGraph Platform server used by the autonomous pipeline (APIP).

---

## Overview

| Service                      | Purpose                                       | Port(s)                                    |
| ---------------------------- | --------------------------------------------- | ------------------------------------------ |
| `langgraph-platform`         | LangGraph API server + Studio UI              | `8123` (API), `127.0.0.1:8124` (Studio)   |
| `langgraph-checkpoint-init`  | One-shot Aurora schema initializer (exits 0)  | —                                          |

Image version is **pinned** to `langchain/langgraph-api:0.0.9`. Do not use `latest`.

---

## Aurora Checkpoint Schema

LangGraph Platform uses a dedicated `langgraph_checkpoint` schema within Aurora PostgreSQL to persist agent state (checkpoints, thread history, runs).

### Schema layout

```
langgraph_checkpoint
  checkpoints          -- serialized agent state snapshots
  checkpoint_blobs     -- large binary data (tool outputs, file refs)
  checkpoint_writes    -- pending write queue for durability
  runs                 -- agent run records (id, status, timestamps)
  threads              -- conversation/session threads
```

The schema is initialized on first start by the `langgraph-checkpoint-init` container, which runs `langgraph.checkpoint.postgres.init` and then exits cleanly (restart: "no"). This matches the `minio-init` pattern used in `compose.lego-app.yaml`.

---

## Connection Pool

The LangGraph Platform uses an **isolated** connection pool to Aurora. It does **not** share the pool used by `@repo/db`.

| Parameter         | Value                         |
| ----------------- | ----------------------------- |
| Database user     | `langgraph_checkpoint_user`   |
| Schema            | `langgraph_checkpoint`        |
| Max connections   | 3                             |
| Pool isolation    | Separate from `@repo/db` pool |

### Why isolated?

- Prevents checkpoint writes from exhausting the application pool under load.
- Allows independent monitoring and rate-limiting of LangGraph DB activity.
- The dedicated user has `USAGE` + `CREATE` on the `langgraph_checkpoint` schema only — no access to application tables.

### Creating the DB user (run once on Aurora)

```sql
CREATE USER langgraph_checkpoint_user WITH PASSWORD 'your-password-here';
CREATE SCHEMA IF NOT EXISTS langgraph_checkpoint;
GRANT USAGE, CREATE ON SCHEMA langgraph_checkpoint TO langgraph_checkpoint_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA langgraph_checkpoint TO langgraph_checkpoint_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA langgraph_checkpoint
  GRANT ALL ON TABLES TO langgraph_checkpoint_user;
```

---

## Environment Variables

| Variable                             | Description                                          |
| ------------------------------------ | ---------------------------------------------------- |
| `LANGGRAPH_CHECKPOINT_DATABASE_URL`  | Aurora PostgreSQL DSN for langgraph_checkpoint schema |

Store this in the server's `.env` file (not committed to the repo).

Example DSN:

```
postgresql://langgraph_checkpoint_user:password@aurora-host:5432/monorepo?options=-c%20search_path=langgraph_checkpoint
```

---

## Deployment Procedure

### 1. Copy compose file to server

```bash
scp infra/langgraph-server/compose.langgraph-server.yaml user@server:/opt/monorepo/infra/langgraph-server/
```

### 2. Set environment variables on server

Create or update `/opt/monorepo/.env` on the server with the required variables listed above.

### 3. Pull the pinned image

```bash
docker compose -f /opt/monorepo/infra/langgraph-server/compose.langgraph-server.yaml pull
```

### 4. Start services

```bash
docker compose \
  -f /opt/monorepo/infra/langgraph-server/compose.langgraph-server.yaml \
  --env-file /opt/monorepo/.env \
  up -d
```

### 5. Verify health

```bash
# Check API
curl -sf http://localhost:8123/ok && echo "API healthy"

# Check checkpoint-init exited cleanly
docker inspect monorepo-langgraph-checkpoint-init --format '{{.State.ExitCode}}'
# Expected: 0
```

### Upgrading the image version

Update the `image:` tag in `compose.langgraph-server.yaml`, then re-run steps 3-5. Always use a pinned version tag, never `latest`.

---

## Studio UI Access (Port 8124)

LangGraph Studio provides a visual debugger for agent graphs and thread inspection.

- **Bound to**: `127.0.0.1:8124` -- accessible on localhost only (SEC-001)
- **Not exposed** on `0.0.0.0` -- no public internet access
- Access via SSH tunnel when connecting remotely:

```bash
ssh -L 8124:127.0.0.1:8124 user@server
# Then open: http://localhost:8124
```

---

## APIP-0020 Integration

APIP-0020 (autonomous pipeline orchestrator) communicates with LangGraph Platform as follows:

| Context              | URL                                    | Notes                                  |
| -------------------- | -------------------------------------- | -------------------------------------- |
| Docker network       | `http://langgraph-platform:8123`       | When APIP-0020 runs as a container     |
| Host access          | `http://localhost:8123`                | When APIP-0020 runs directly on host   |
| External (tunneled)  | `http://127.0.0.1:8123`               | Via SSH port forward                   |

The APIP-0020 agent uses the `LANGGRAPH_API_URL` environment variable to select the appropriate URL:

```bash
# Docker network (recommended for production)
LANGGRAPH_API_URL=http://langgraph-platform:8123

# Host-local (dev / direct execution)
LANGGRAPH_API_URL=http://localhost:8123
```

Refer to the APIP-0020 story for the full agent client configuration and retry policy.

---

## Monitoring

LangGraph Platform exposes Prometheus metrics at `http://localhost:8123/metrics`. These are scraped by the Prometheus instance defined in `infra/compose.lego-app.yaml` via the `langgraph-platform` scrape job in `infra/prometheus/prometheus.yml`.

View dashboards in Grafana at `http://localhost:3003`.

---

## Restart Behavior

| Service                     | `restart` policy     | Why                                                                   |
| --------------------------- | -------------------- | --------------------------------------------------------------------- |
| `langgraph-platform`        | `unless-stopped`     | Auto-restart on crash/reboot; does not restart if manually stopped    |
| `langgraph-checkpoint-init` | `no`                 | One-shot initializer -- must not re-run and duplicate schema objects  |
