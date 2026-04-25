# Tailscale Multi-Machine Dev Setup

This guide covers connecting a secondary machine (e.g. laptop) to all local dev
services running on the primary Mac (KB, SonarQube, Flagsmith, postgres) using
Tailscale.

Tailscale creates a private encrypted WireGuard tunnel between your devices over
the internet. Both machines can reach each other from **any network** — home,
coffee shop, cellular — as long as they're online and Tailscale is running.

---

## Services hosted on primary Mac

| Service           | Port |
| ----------------- | ---- |
| KB (pgvector)     | 5433 |
| Monorepo postgres | 5432 |
| Flagsmith         | 8000 |
| SonarQube         | 9001 |
| Grafana           | 3003 |
| Prometheus        | 9090 |

All are managed by Docker Compose and only need to run on the primary Mac.
Secondary machines connect remotely via Tailscale.

---

## Phase 1 — Primary Mac

### 1. Install Tailscale

Download from the Mac App Store, or:

```bash
brew install --cask tailscale
```

### 2. Sign in

Open Tailscale from the menu bar and sign in with Google, GitHub, or Microsoft.
Create a free account at tailscale.com if you don't have one (free for personal
use, up to 100 devices).

### 3. Enable MagicDNS

In the Tailscale admin console (https://login.tailscale.com/admin/dns):

- Enable **MagicDNS**

Your primary Mac will now have a stable hostname like `your-macbook.tail1234.ts.net`.
Find it by clicking the Tailscale menu bar icon, or running:

```bash
tailscale status
```

### 4. Prevent the primary Mac from sleeping

Services are only reachable when the primary Mac is awake. Configure it to stay
on when you're away:

**Option A — System Settings (permanent):**

> System Settings → Energy → disable "Enable Power Nap" and enable
> "Prevent automatic sleeping when display is off"

**Option B — Command line (temporary, for the current session):**

```bash
caffeinate -i &
```

Run this before leaving home. Kill it when you're back with `kill %1` or by
closing the terminal.

---

## Phase 2 — Secondary Machine

### 5. Install Tailscale and join your tailnet

```bash
# macOS
brew install --cask tailscale
```

Open Tailscale and sign in with the **same account** as the primary Mac. Both
machines will immediately appear in your tailnet.

### 6. Verify connectivity

```bash
# Replace with your actual Tailscale hostname
ping your-macbook.tail1234.ts.net

# Test each service
curl http://your-macbook.tail1234.ts.net:8000/health      # Flagsmith
curl http://your-macbook.tail1234.ts.net:9001             # SonarQube
psql postgresql://kbuser:<password>@your-macbook.tail1234.ts.net:5433/knowledgebase -c '\l'
```

### 7. Clone the repo

```bash
git clone git@github.com:michael-menard/monorepo.git ~/Development/Monorepo
cd ~/Development/Monorepo
pnpm install
```

### 8. Build the KB MCP server

```bash
cd ~/Development/Monorepo/apps/api/knowledge-base
pnpm build
```

### 9. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` — replace `localhost` with your Tailscale hostname:

```env
SONAR_HOST_URL=http://your-macbook.tail1234.ts.net:9001
FLAGSMITH_API_URL=http://your-macbook.tail1234.ts.net:8000/api/v1/
VITE_FLAGSMITH_API_URL=http://your-macbook.tail1234.ts.net:8000/api/v1/
```

Copy `SONAR_TOKEN` and `FLAGSMITH_ENVIRONMENT_KEY` from your primary machine's
`.env`.

### 10. Configure Claude MCP

Edit `~/.claude/claude_desktop_config.json`. In the project entry for
`/Users/michaelmenard/Development/Monorepo`, update the connection strings:

```json
"knowledge-base": {
  "type": "stdio",
  "command": "node",
  "args": ["/Users/michaelmenard/Development/Monorepo/apps/api/knowledge-base/dist/mcp-server/index.js"],
  "env": {
    "DATABASE_URL": "postgresql://kbuser:<password>@your-macbook.tail1234.ts.net:5433/knowledgebase",
    "OPENAI_API_KEY": "<your key>"
  }
},
"postgres-knowledgebase": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres",
    "postgresql://kbuser:<password>@your-macbook.tail1234.ts.net:5433/knowledgebase"]
},
"postgres-monorepo": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres",
    "postgresql://postgres:postgres@your-macbook.tail1234.ts.net:5432/monorepo"]
}
```

---

## Phase 3 — Web Apps & Dev Servers over Tailscale

The primary Mac also runs the lego app and workflow roadmap. A startup script
brings everything up so you can access it from the laptop browser.

### 11. Start the remote dev environment

On the primary Mac, before leaving:

```bash
./scripts/remote-dev-up.sh
```

This starts Docker infrastructure, then four dev servers:

| Service       | URL                                      |
| ------------- | ---------------------------------------- |
| Lego App (UI) | http://mac-studio.tail9eb57b.ts.net:8000 |
| Lego API      | http://mac-studio.tail9eb57b.ts.net:9100 |
| Roadmap (UI)  | http://mac-studio.tail9eb57b.ts.net:8027 |
| Roadmap API   | http://mac-studio.tail9eb57b.ts.net:9103 |
| Grafana       | http://mac-studio.tail9eb57b.ts.net:3003 |
| Prometheus    | http://mac-studio.tail9eb57b.ts.net:9090 |

To stop dev servers (Docker keeps running):

```bash
./scripts/remote-dev-up.sh --stop
```

### 12. Access from the laptop browser

Open any of the URLs above. The Vite dev servers bind to all interfaces
(`host: true`) and proxy API requests server-side to `localhost`, so everything
works transparently over Tailscale.

---

## Phase 4 — Claude Code & OpenCode with KB Access

The laptop runs the KB MCP server locally (via `tsx`), connecting to the KB
database on the primary Mac over Tailscale. No HTTP server or auth needed —
Tailscale is the security boundary.

### 13. Configure Claude Code (`~/.claude.json`)

In the `mcpServers` section for your project, update the `knowledge-base`
entry to point at the Tailscale hostname:

```json
"knowledge-base": {
  "type": "stdio",
  "command": "/bin/sh",
  "args": [
    "-c",
    "set -a && . /path/to/monorepo/apps/api/knowledge-base/.env.remote && set +a && exec npx tsx /path/to/monorepo/apps/api/knowledge-base/src/mcp-server/index.ts"
  ]
}
```

Create `.env.remote` in `apps/api/knowledge-base/` on the laptop:

```env
DATABASE_URL=postgresql://kbuser:TestPassword123!@mac-studio.tail9eb57b.ts.net:5433/knowledgebase
EMBEDDING_PROVIDER=ollama
LOG_LEVEL=info
```

> **Important**: Use port 5433 (PgBouncer), not 5435 (direct Postgres). The
> MCP server doesn't need `LISTEN/NOTIFY`, and PgBouncer handles connection
> pooling better over a network link.

### 14. Configure OpenCode (`opencode.json`)

Same approach — update the MCP command to source `.env.remote`:

```json
"knowledge-base": {
  "type": "local",
  "command": [
    "/bin/sh",
    "-c",
    "set -a && . /path/to/monorepo/apps/api/knowledge-base/.env.remote && set +a && exec npx tsx /path/to/monorepo/apps/api/knowledge-base/src/mcp-server/index.ts"
  ],
  "enabled": true
}
```

### 15. Verify KB connectivity

```bash
# From the laptop, test the database connection:
docker run --rm postgres:16 psql \
  postgresql://kbuser:TestPassword123!@mac-studio.tail9eb57b.ts.net:5433/knowledgebase \
  -c 'SELECT count(*) FROM workflow.plans'

# Or if psql is installed locally:
psql postgresql://kbuser:TestPassword123!@mac-studio.tail9eb57b.ts.net:5433/knowledgebase \
  -c 'SELECT count(*) FROM workflow.plans'
```

Then open Claude Code or OpenCode — KB tools (`kb_search`, `kb_get_plan`,
etc.) should work normally.

---

## Ongoing usage

- **Start services**: Run `./scripts/remote-dev-up.sh` on the primary Mac
  before leaving. It also runs `caffeinate` to prevent sleep.
- **Secondary machines**: Just open Tailscale — no Docker needed.
- **Tailscale reconnects automatically** after reboots on both machines.
- **MagicDNS hostnames are stable** — they won't change between sessions.
- **Stop dev servers**: `./scripts/remote-dev-up.sh --stop` (Docker keeps running).
