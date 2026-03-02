# LangGraph Platform Security Hardening

> **Scope**: Network boundary isolation, container hardening, and secrets management for the LangGraph Platform deployment on the dedicated internal server.
>
> **Story**: APIP-5003 | **Epic**: autonomous-pipeline | **Phase**: 0 (MVP Foundation)

---

## 1. Network Boundary Statement

The LangGraph Platform runs on a dedicated local server (APIP ADR-004) and is **not exposed to external networks**. Network isolation is the MVP security boundary per architecture decision **APIP DECISIONS SEC-001**.

All LangGraph Platform services bind exclusively to `127.0.0.1` (localhost). They are reachable only from processes running on the same host. No reverse proxy, load balancer, or external-facing ingress is configured for these services in Phase 1.

The **Supervisor Graph** (APIP-0020) is the only authorized caller for the LangGraph Platform API on port 8123, communicating via `127.0.0.1:8123` on the same host.

Full authentication and authorization is **explicitly deferred to Phase 2** when external access is planned (see [Phase 2: Authentication and Authorization](#7-phase-2-authentication-and-authorization) and FOLLOW-UPS SEC-001-full-auth).

---

## 2. Port Inventory

All LangGraph Platform services and their network bindings:

| Service | Internal Port | External Binding | Protocol | Access Scope |
|---|---|---|---|---|
| LangGraph Platform API | 8123 | `127.0.0.1:8123` | HTTP | Internal only (Supervisor Graph caller) |
| LangGraph Studio UI | 8124 | `127.0.0.1:8124` | HTTP | Internal only (operator browser on same host) |
| LangGraph PostgreSQL | 5433 | `127.0.0.1:5433` | PostgreSQL | Internal only (LangGraph Platform state) |

**Related services** (defined in other compose files, listed for completeness):

| Service | Internal Port | External Binding | Protocol | Access Scope |
|---|---|---|---|---|
| Main PostgreSQL | 5432 | `127.0.0.1:5432` | PostgreSQL | Internal only |
| Redis | 6379 | `127.0.0.1:6379` | Redis | Internal only |
| Prometheus | 9090 | `127.0.0.1:9090` | HTTP | Internal only |
| Grafana | 3003 | `127.0.0.1:3003` | HTTP | Internal only (operator) |
| OTEL Collector gRPC | 4317 | `127.0.0.1:4317` | gRPC | Internal only |
| OTEL Collector HTTP | 4318 | `127.0.0.1:4318` | HTTP | Internal only |
| MinIO API | 9000 | `127.0.0.1:9000` | HTTP | Internal only |
| MinIO Console | 9001 | `127.0.0.1:9001` | HTTP | Internal only |

**Reserved ports** (must not introduce conflicts): 5432, 5433, 6379, 9090, 3003, 4317, 4318, 9000, 9001, 8123, 8124.

---

## 3. Container Hardening

The following hardening directives are applied to all LangGraph Platform services in `compose.langgraph-server.yaml`:

### 3.1 Image Tag Pinning (AC-5)

All Docker images use specific version tags. The `:latest` tag is **never used**. This prevents supply chain attacks via mutable image references.

```yaml
# CORRECT
image: langchain/langgraph-api:0.2.10

# WRONG - never use :latest
image: langchain/langgraph-api:latest
```

### 3.2 Port Binding to Localhost (AC-2)

All ports bind exclusively to `127.0.0.1`:

```yaml
ports:
  - '127.0.0.1:8123:8123'
  - '127.0.0.1:8124:8124'
```

A port bound without the `127.0.0.1` prefix (e.g., `'8123:8123'`) exposes the service on all interfaces (`0.0.0.0`), which is a **security boundary violation**.

### 3.3 Linux Capability Dropping (AC-3)

All containers drop all Linux capabilities by default:

```yaml
cap_drop:
  - ALL
```

No capabilities are re-added unless the LangGraph Platform image explicitly requires them. If specific capabilities are needed, they are documented here with justification.

### 3.4 Read-Only Root Filesystem (AC-3)

Containers run with a read-only root filesystem where supported:

```yaml
read_only: true
tmpfs:
  - /tmp
  - /var/run
```

**Compatibility note**: If the LangGraph Platform image writes to the root filesystem at startup (e.g., PID files, temp dirs), `tmpfs` mounts are provided for those paths. If `read_only: true` is incompatible with the image, this is documented as a gap with a GitHub issue reference for Phase 2 remediation.

### 3.5 Non-Root User (AC-3)

Where the upstream Docker image supports it, containers run as a non-root user:

```yaml
user: "1000:1000"
```

**Gap**: If the LangGraph Platform image does not support running as non-root (e.g., it requires root for internal service management), this gap is documented here. Phase 2 should investigate building a custom image with a non-root user.

### 3.6 Read-Only Volume Mounts (AC-4)

All configuration files mounted into containers use the `:ro` (read-only) suffix:

```yaml
volumes:
  - ./langgraph.json:/app/langgraph.json:ro
```

Only named volumes for persistent state (checkpoint data, database storage) are mounted read-write.

---

## 4. Container Secret Injection Mechanism (AC-6)

### MVP Pattern

For MVP, secrets enter containers via Docker Compose `environment:` stanza using **variable references** sourced from a `.env` file or host environment:

```yaml
environment:
  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
  LANGGRAPH_POSTGRES_URL: ${LANGGRAPH_POSTGRES_URL}
  LANGSMITH_API_KEY: ${LANGSMITH_API_KEY:-}
```

### Rules

1. **Secret values must NEVER be hardcoded** in `compose.langgraph-server.yaml`. All secret values use `${VAR_NAME}` variable reference syntax.
2. **The `.env` file must be in `.gitignore`**. The `.env` file at `infra/langgraph-server/.env` contains actual secret values and must never be committed to the repository.
3. **APIP-5004 provides runtime values**. The `SecretsClient` (APIP-5004) retrieves secrets from AWS Secrets Manager and populates the `.env` file or host environment before `docker compose up`. See APIP-5004 for the implementation of secret retrieval.

### Env Var Inventory

| Variable | Source | Required | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | AWS Secrets Manager (via APIP-5004) | Yes | Anthropic API key for LLM calls |
| `OPENROUTER_API_KEY` | AWS Secrets Manager (via APIP-5004) | Yes | OpenRouter API key for multi-model routing |
| `LANGGRAPH_POSTGRES_URL` | Local config | Yes | PostgreSQL connection string for LangGraph state |
| `LANGSMITH_API_KEY` | AWS Secrets Manager (via APIP-5004) | No | LangSmith tracing key (optional) |

### Cross-Reference

- **APIP-5003** (this story): Defines the Docker Compose `environment:` stanza with `${VAR_NAME}` references
- **APIP-5004**: Implements `SecretsClient` that retrieves secret values and populates the `.env` file

---

## 5. Operational Verification Checklist (AC-7)

Run this checklist after any change to `compose.langgraph-server.yaml` to confirm the security posture is intact.

### Step 1: Compose Config Validation

```bash
docker compose -f infra/langgraph-server/compose.langgraph-server.yaml config
```

**Expected**: Exit code 0, no errors. All service definitions visible with hardening directives.

| Result | Status |
|---|---|
| Exit code 0, no errors | PASS |
| Non-zero exit code or parse errors | FAIL |

### Step 2: Port Binding Verification

```bash
# Primary command
ss -tlnp | grep -E '8123|8124'

# Fallback if ss is unavailable (no iproute2 package)
netstat -tlnp | grep -E '8123|8124'
```

**Expected**: Output shows `127.0.0.1:8123` and `127.0.0.1:8124`. Neither port shows `0.0.0.0` or `:::` bind addresses.

| Result | Status |
|---|---|
| Only `127.0.0.1` bindings for 8123 and 8124 | PASS |
| Any `0.0.0.0` or `:::` binding for 8123 or 8124 | FAIL — security boundary violation |

### Step 3: Dropped Capabilities

```bash
docker inspect --format='{{.HostConfig.CapDrop}}' <langgraph-platform-container>
```

**Expected**: Returns `[ALL]`.

| Result | Status |
|---|---|
| `[ALL]` | PASS |
| Empty or partial list | FAIL |

### Step 4: Security Options

```bash
docker inspect --format='{{.HostConfig.SecurityOpt}}' <langgraph-platform-container>
```

**Expected**: Returns configured security options (or `[]` if defaults apply with `cap_drop: [ALL]`).

| Result | Status |
|---|---|
| Configured security options visible | PASS |
| Unexpected options or missing expected options | FAIL |

### Step 5: Volume Mount Read-Only Status

```bash
docker inspect --format='{{range .Mounts}}{{.Source}} RW:{{.RW}}{{println}}{{end}}' <langgraph-platform-container>
```

**Expected**: All configuration file mounts show `RW:false`. Only named volumes for persistent state show `RW:true`.

| Result | Status |
|---|---|
| Config mounts: `RW:false`, state volumes: `RW:true` | PASS |
| Config mounts with `RW:true` | FAIL |

### Step 6: Image Tag Verification

```bash
grep 'image:' infra/langgraph-server/compose.langgraph-server.yaml | grep ':latest'
```

**Expected**: Empty output (no `:latest` tags).

| Result | Status |
|---|---|
| Empty output | PASS |
| Any line with `:latest` | FAIL |

### Step 7: Secret Hardcoding Check

```bash
grep -E '(API_KEY|SECRET|PASSWORD|TOKEN)\s*[:=]\s*[^${\s]' infra/langgraph-server/compose.langgraph-server.yaml
```

**Expected**: Empty output (no hardcoded credentials).

| Result | Status |
|---|---|
| Empty output | PASS |
| Any match (hardcoded credential) | FAIL — remove hardcoded value, use `${VAR_NAME}` |

### Step 8: .env Git Status

```bash
git status infra/langgraph-server/.env 2>/dev/null
```

**Expected**: `.env` is untracked (listed in `.gitignore`).

| Result | Status |
|---|---|
| File not shown or shown as ignored | PASS |
| File shown as modified/new (tracked) | FAIL — add to `.gitignore` |

---

## 6. Compatibility Notes

### LangGraph Platform Image Hardening Compatibility

The LangGraph Platform Docker image (`langchain/langgraph-api`) may have specific requirements that affect hardening directives:

- **`read_only: true`**: The image may write to `/tmp`, `/var/run`, or application-specific directories at startup. `tmpfs` mounts are provided for known writable paths. If startup fails with `read_only: true`, add additional `tmpfs` entries or document the incompatibility.
- **Non-root `user:`**: The image may require root for internal process management. If the image does not support non-root operation, this is a known gap documented for Phase 2 remediation.
- **`cap_drop: [ALL]`**: Most application containers work with all capabilities dropped. If the LangGraph Platform requires specific capabilities (e.g., `NET_BIND_SERVICE` for privileged ports), they must be explicitly re-added and documented.

### Fallback Commands

| Primary Command | Fallback | Package Required |
|---|---|---|
| `ss -tlnp` | `netstat -tlnp` | `iproute2` / `net-tools` |
| `docker inspect` | N/A | Docker CLI |
| `docker compose config` | N/A | Docker Compose v2 |

---

## 7. Phase 2: Authentication and Authorization

> **Status**: Deferred per FOLLOW-UPS SEC-001-full-auth
>
> This section is a placeholder for Phase 2 design. The items below are **not implemented** in Phase 1 (MVP).

### Deferred Items

1. **LangGraph Platform API Authentication** (port 8123)
   - Bearer token or mTLS authentication for API access
   - Required when external callers need access beyond the Supervisor Graph

2. **Studio UI Access Control** (port 8124)
   - User authentication for Studio UI web interface
   - Required when operators access Studio remotely (not from the host machine)

3. **Network Policy Enforcement**
   - `iptables`/`ufw` rules or Docker network driver policies
   - Required for defense-in-depth beyond localhost port binding

4. **Estimated Prerequisites**
   - External access requirement confirmed (business decision)
   - Identity provider or token management system selected
   - Network topology for multi-host deployment defined
