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

## Ongoing usage

- **Start services**: Only on the primary Mac. Run the relevant Docker Compose
  files before leaving.
- **Secondary machines**: Just open Tailscale — no Docker needed.
- **Tailscale reconnects automatically** after reboots on both machines.
- **MagicDNS hostnames are stable** — they won't change between sessions.
