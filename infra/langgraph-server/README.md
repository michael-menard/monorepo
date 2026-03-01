# LangGraph Server — Infrastructure

Docker Compose configuration for the LangGraph Platform server and autonomous pipeline supervisor.

---

## Services

| Service                      | Purpose                                               | Port(s)                                    |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `langgraph-platform`         | LangGraph API server + Studio UI                      | `8123` (API), `127.0.0.1:8124` (Studio)   |
| `langgraph-checkpoint-init`  | One-shot Aurora schema initializer (exits 0)          | —                                          |
| `pipeline-supervisor`        | BullMQ job processor + health HTTP server             | `9091`                                     |
| `redis`                      | Pipeline job queue backend                            | `6379`                                     |

Image version is **pinned** to `langchain/langgraph-api:0.0.9`. Do not use `latest`.

---

## Quick Start

```bash
# Start all services
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml up -d

# Check supervisor health
curl http://localhost:9091/health

# Check liveness probe
curl http://localhost:9091/live

# View logs
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml logs -f pipeline-supervisor

# Stop all services
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml down
```

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

| Variable                             | Default                      | Description                                          |
| ------------------------------------ | ---------------------------- | ---------------------------------------------------- |
| `LANGGRAPH_CHECKPOINT_DATABASE_URL`  | —                            | Aurora PostgreSQL DSN for langgraph_checkpoint schema |
| `REDIS_URL`                          | `redis://redis:6379`         | Redis connection URL |
| `PIPELINE_QUEUE_NAME`                | `pipeline`                   | BullMQ queue name |
| `PIPELINE_STAGE_TIMEOUT_MS`          | `600000`                     | Max time for a single graph stage (10 min) |
| `SUPERVISOR_DRAIN_TIMEOUT_MS`        | `600000`                     | Max drain wait before forced exit (10 min) |
| `SUPERVISOR_HEALTH_PORT`             | `9091`                       | Port for health HTTP server |

Store sensitive values in the server's `.env` file (not committed to the repo).

Example DSN:

```
postgresql://langgraph_checkpoint_user:password@aurora-host:5432/monorepo?options=-c%20search_path=langgraph_checkpoint
```

**WARNING**: `SUPERVISOR_DRAIN_TIMEOUT_MS` must be >= `PIPELINE_STAGE_TIMEOUT_MS`. If drain timeout is shorter than a running elaboration stage, the supervisor will force-exit before the job completes, causing that job to be requeued. The supervisor logs a warning on startup if this condition is detected.

---

## Health Endpoints (Pipeline Supervisor)

The pipeline supervisor exposes two HTTP endpoints on port 9091 (configurable via `SUPERVISOR_HEALTH_PORT`):

### GET /health

Returns full supervisor health status. Used by Prometheus scraping and monitoring.

**Response 200 (healthy/draining)**:
```json
{
  "status": "healthy",
  "draining": false,
  "activeJobs": 0,
  "circuitBreakerState": {
    "elaboration": "CLOSED",
    "storyCreation": "CLOSED"
  },
  "uptimeMs": 45231
}
```

**Status values**:
- `healthy` — supervisor running normally
- `draining` — SIGTERM received, finishing in-flight jobs before exit
- `unhealthy` — Redis unreachable

**Response 503 (unhealthy)**: Same JSON body but HTTP 503 status code.

### GET /live

Liveness probe — always returns 200 while the process is alive.

```json
{ "status": "ok" }
```

Used by Docker HEALTHCHECK: `curl -f http://localhost:9091/live || exit 1`

---

## Port Assignments

Port 9091 is reserved for the pipeline supervisor health server. This port was confirmed free in the compose environment (reserved ports: 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001, 8123, 8124).

---

## Deployment Procedure (LangGraph Platform)

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
# Check LangGraph API
curl -sf http://localhost:8123/ok && echo "API healthy"

# Check checkpoint-init exited cleanly
docker inspect monorepo-langgraph-checkpoint-init --format '{{.State.ExitCode}}'
# Expected: 0

# Check supervisor health
curl http://localhost:9091/health
```

### Upgrading the image version

Update the `image:` tag in `compose.langgraph-server.yaml`, then re-run steps 3-5. Always use a pinned version tag, never `latest`.

---

## Deployment Runbook: Rolling Restart (Zero-Downtime, Pipeline Supervisor)

This runbook documents the safe procedure for restarting the pipeline supervisor without losing in-flight story work.

### Prerequisites
- Docker Compose is running with `compose.langgraph-server.yaml`
- Health endpoint is accessible: `curl http://localhost:9091/health`

### Step 1: Initiate Drain

Send SIGTERM to the supervisor process to trigger drain mode. Docker Compose handles this when you call `docker compose stop` or `docker compose down`.

```bash
# Docker Compose graceful stop (recommended — respects stop_grace_period: 630s)
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml stop pipeline-supervisor

# Or send SIGTERM directly by container name
docker kill --signal=SIGTERM pipeline-supervisor
```

### Step 2: Monitor Drain State

Poll GET /health until the supervisor exits. Status transitions: `healthy` → `draining` → connection refused (process exited).

```bash
# Poll health every 5 seconds
watch -n 5 'curl -s http://localhost:9091/health | python3 -m json.tool'

# Or use a shell loop
while curl -s http://localhost:9091/health > /dev/null 2>&1; do
  echo "$(date): $(curl -s http://localhost:9091/health | python3 -c 'import json,sys; d=json.load(sys.stdin); print(f"status={d[\"status\"]} activeJobs={d[\"activeJobs\"]}')"
  sleep 5
done
echo "Supervisor exited"
```

### Step 3: Verify Exit Code

- Exit code **0** = clean drain (all in-flight jobs completed)
- Exit code **1** = drain timeout exceeded (some jobs may be requeued)

```bash
# Check container exit code
docker inspect pipeline-supervisor --format='{{.State.ExitCode}}'
```

### Step 4: Deploy New Supervisor

Build and deploy the new supervisor image or binary.

```bash
# Pull latest image (if using Docker Hub)
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml pull pipeline-supervisor

# Or rebuild from source
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml build pipeline-supervisor
```

### Step 5: Start New Supervisor

```bash
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml up -d pipeline-supervisor
```

### Step 6: Verify Healthy

Poll GET /health until HTTP 200 with `status: healthy` is returned (within 30 seconds of start).

```bash
# Wait for healthy state
for i in $(seq 1 12); do
  STATUS=$(curl -sf http://localhost:9091/health 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])' 2>/dev/null)
  if [ "$STATUS" = "healthy" ]; then
    echo "Supervisor healthy after ${i}x5s attempts"
    break
  fi
  echo "Waiting... (${i}/12)"
  sleep 5
done
```

### Docker HEALTHCHECK Verification

To verify the Docker HEALTHCHECK is working:

```bash
# Start supervisor
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml up -d pipeline-supervisor

# Wait for start_period (10 seconds)
sleep 15

# Check health status
docker inspect pipeline-supervisor --format='{{.State.Health.Status}}'
# Expected output: healthy
```

### Drain Timeout Configuration

If in-flight jobs take longer than `SUPERVISOR_DRAIN_TIMEOUT_MS` (default: 10 minutes), the supervisor will force-exit with code 1 and log:

```json
{"event": "drain_timeout_exceeded", "drainTimeoutMs": 600000, "activeJobs": 1}
```

In this case, the active job will be requeued by BullMQ for retry on the next supervisor start. To prevent this, increase `SUPERVISOR_DRAIN_TIMEOUT_MS` to accommodate the maximum expected job duration.

### Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|-----------|
| `/health` returns 503 immediately | Redis unreachable | Check Redis connection via `docker compose logs redis` |
| Container stuck in `starting` health state | Port 9091 conflict | Check `lsof -i :9091`; ensure no other process on port |
| Exit code 1 after SIGTERM | Drain timeout exceeded | Increase `SUPERVISOR_DRAIN_TIMEOUT_MS` |
| Container SIGKILL'd before drain completes | `stop_grace_period` too short | Ensure `stop_grace_period >= SUPERVISOR_DRAIN_TIMEOUT_MS + 30` |

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

LangGraph Platform exposes Prometheus metrics at `http://localhost:8123/metrics`. The pipeline supervisor exposes health status at `http://localhost:9091/health`. Both are scraped by the Prometheus instance defined in `infra/compose.lego-app.yaml` via scrape jobs in `infra/prometheus/prometheus.yml`.

View dashboards in Grafana at `http://localhost:3003`.

---

## Restart Behavior

| Service                     | `restart` policy     | Why                                                                   |
| --------------------------- | -------------------- | --------------------------------------------------------------------- |
| `langgraph-platform`        | `unless-stopped`     | Auto-restart on crash/reboot; does not restart if manually stopped    |
| `langgraph-checkpoint-init` | `no`                 | One-shot initializer -- must not re-run and duplicate schema objects  |
| `pipeline-supervisor`       | `unless-stopped`     | Auto-restart on crash/reboot; does not restart if manually stopped    |
| `redis`                     | `unless-stopped`     | Auto-restart on crash/reboot; does not restart if manually stopped    |
