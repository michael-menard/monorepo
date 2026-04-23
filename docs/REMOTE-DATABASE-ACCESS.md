# Remote Access via Tailscale

This guide walks you through accessing the development environment remotely — databases, web apps, and services — all running on the Mac Studio at home, accessible from anywhere via Tailscale.

## How It Works (the simple version)

The Mac Studio at home runs everything: databases in Docker, dev servers, the whole stack. Tailscale creates a private, encrypted tunnel between any device and the Mac Studio — no matter where you are. All you do is replace `localhost` with `mac-studio` in your config.

Tailscale is free for personal use. Nothing is exposed to the public internet. Only devices on your tailnet can connect.

---

## Network Overview

### Machines on the Tailnet

| Machine     | Tailscale IP     | MagicDNS Name            | Role                                    |
| ----------- | ---------------- | ------------------------ | --------------------------------------- |
| Mac Studio  | `100.85.133.32`  | `mac-studio`             | Home server — runs Docker + dev servers |
| MacBook Pro | `100.103.206.44` | `michaels-macbook-pro-2` | Laptop — remote development             |

### All Accessible Services

These services run on the Mac Studio and are accessible from any machine on the tailnet:

#### Databases

| Service                          | Port | Remote URL        | Credentials                                                   |
| -------------------------------- | ---- | ----------------- | ------------------------------------------------------------- |
| LEGO DB (PostgreSQL 16)          | 5432 | `mac-studio:5432` | user: `postgres`, pass: `postgres`, db: `monorepo`            |
| KB DB via PgBouncer              | 5433 | `mac-studio:5433` | user: `kbuser`, pass: `TestPassword123!`, db: `knowledgebase` |
| KB DB Direct (for LISTEN/NOTIFY) | 5435 | `mac-studio:5435` | user: `kbuser`, pass: `TestPassword123!`, db: `knowledgebase` |

#### Infrastructure Services (Docker)

| Service           | Port | Remote URL                                                        |
| ----------------- | ---- | ----------------------------------------------------------------- |
| Redis             | 6379 | `mac-studio:6379`                                                 |
| MinIO S3 API      | 9000 | `http://mac-studio:9000`                                          |
| MinIO Web Console | 9001 | `http://mac-studio:9001` (user: `minioadmin`, pass: `minioadmin`) |
| Grafana           | 3003 | `http://mac-studio:3003` (user: `admin`, pass: `admin`)           |
| Prometheus        | 9090 | `http://mac-studio:9090`                                          |

#### Web Apps (Dev Servers — must be started with `pnpm dev`)

| App                  | Port | Remote URL               |
| -------------------- | ---- | ------------------------ |
| LEGO App (main-app)  | 8000 | `http://mac-studio:8000` |
| Workflow Roadmap     | 8027 | `http://mac-studio:8027` |
| Dashboard            | 8003 | `http://mac-studio:8003` |
| Workflow Admin       | 8024 | `http://mac-studio:8024` |
| Inspiration Gallery  | 8012 | `http://mac-studio:8012` |
| Instructions Gallery | 8015 | `http://mac-studio:8015` |
| Sets Gallery         | 8018 | `http://mac-studio:8018` |
| Wishlist Gallery     | 8021 | `http://mac-studio:8021` |

#### Backend API Servers (Dev Servers — must be started with `pnpm dev`)

| Service         | Port | Remote URL               |
| --------------- | ---- | ------------------------ |
| LEGO API        | 9100 | `http://mac-studio:9100` |
| Roadmap Service | 9103 | `http://mac-studio:9103` |

> **Note:** Docker services (databases, Redis, MinIO, Grafana, Prometheus) run all the time. Web apps and API servers only run when you start `pnpm dev` on the Mac Studio.

---

## For Yourself: Working from Your Laptop

### One-Time Setup (already done)

- [x] Tailscale installed on Mac Studio
- [x] Tailscale installed on MacBook Pro
- [x] Both machines registered to your tailnet (`mlmmayhem@`)
- [x] Docker databases running on Mac Studio
- [x] Databases accessible via Tailscale IP (tested and confirmed)

### When You Get to the Coffee Shop

#### Step 1: Make Sure Tailscale Is Connected

Open the Tailscale app on your MacBook Pro (menu bar icon at the top of the screen). Make sure it says "Connected."

If it says "Disconnected," click on it and toggle it on.

#### Step 2: Quick Sanity Check (Optional)

Open Terminal and type:

```bash
ping -c 3 mac-studio
```

If you see replies, you're connected. If it says "cannot resolve," Tailscale isn't connected — go back to Step 1.

#### Step 3: Update Your .env Files

You need to change `localhost` to `mac-studio` in 6 files. Only the hostname changes — everything else stays the same.

---

**File 1: `.env` (project root)**

Path: `/Users/michaelmenard/Development/monorepo/.env`

Find and change these 4 lines:

| Find                                                                                | Change to                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev`               | `...@mac-studio:5432/lego_dev`                         |
| `KB_DATABASE_URL=postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase` | `...@mac-studio:5433/knowledgebase`                    |
| `KB_DB_HOST=localhost`                                                              | `KB_DB_HOST=mac-studio`                                |
| `S3_ENDPOINT=http://localhost:9000`                                                 | `S3_ENDPOINT=http://mac-studio.tail9eb57b.ts.net:9000` |

> **The S3_ENDPOINT must use the full Tailscale domain name** (`mac-studio.tail9eb57b.ts.net`), not just `mac-studio`. The app uses Zod URL validation which rejects hostnames without a TLD. Without this change, MOC detail pages, instruction downloads, and gallery images will fail to load.

---

**File 2: `apps/api/knowledge-base/.env`**

Path: `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/.env`

Find and change these 2 lines:

| Find                                                                             | Change to                           |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| `KB_DB_HOST=localhost`                                                           | `KB_DB_HOST=mac-studio`             |
| `DATABASE_URL=postgresql://kbuser:TestPassword123!@localhost:5435/knowledgebase` | `...@mac-studio:5435/knowledgebase` |

> **This is the critical one for Claude Code.** The KB MCP server reads this file at startup. After changing it, restart Claude Code so the MCP server picks up the new host.

---

**File 3: `.env.docker`**

Path: `/Users/michaelmenard/Development/monorepo/.env.docker`

Find and change this 1 line:

| Find                                                                    | Change to                           |
| ----------------------------------------------------------------------- | ----------------------------------- |
| `KB_DB_URL=postgresql://postgres:postgres@localhost:5433/knowledgebase` | `...@mac-studio:5433/knowledgebase` |

---

**File 4: `apps/api/lego-api/.env.local`**

Path: `/Users/michaelmenard/Development/monorepo/apps/api/lego-api/.env.local`

Find and change these 2 lines:

| Find                                                                  | Change to                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monorepo` | `...@mac-studio:5432/monorepo`                         |
| `S3_ENDPOINT=http://localhost:9000`                                   | `S3_ENDPOINT=http://mac-studio.tail9eb57b.ts.net:9000` |

> **The S3_ENDPOINT here overrides the root .env** — this is what the lego-api actually reads. Must use the full Tailscale domain (`mac-studio.tail9eb57b.ts.net`) because Zod URL validation rejects hostnames without a TLD.

---

**File 5: `apps/api/workflow-admin/roadmap-svc/.env`**

Path: `/Users/michaelmenard/Development/monorepo/apps/api/workflow-admin/roadmap-svc/.env`

Find and change these 3 lines:

| Find                                                                                    | Change to                           |
| --------------------------------------------------------------------------------------- | ----------------------------------- |
| `KB_DB_HOST=localhost`                                                                  | `KB_DB_HOST=mac-studio`             |
| `DATABASE_URL=postgresql://kbuser:TestPassword123!@localhost:5435/knowledgebase`        | `...@mac-studio:5435/knowledgebase` |
| `DATABASE_URL_DIRECT=postgresql://kbuser:TestPassword123!@localhost:5435/knowledgebase` | `...@mac-studio:5435/knowledgebase` |

---

**File 6: `apps/scrapers/rebrickable/.env`**

Path: `/Users/michaelmenard/Development/monorepo/apps/scrapers/rebrickable/.env`

Find and change these 2 lines:

| Find                        | Change to                    |
| --------------------------- | ---------------------------- |
| `SCRAPER_DB_HOST=localhost` | `SCRAPER_DB_HOST=mac-studio` |
| `GALLERY_DB_HOST=localhost` | `GALLERY_DB_HOST=mac-studio` |

---

**Total: 13 changes across 6 files.** In every case, you're just replacing `localhost` with `mac-studio`.

#### Step 4: You're Done!

Start working as normal. Everything that talks to the database will now connect to your Mac Studio at home through Tailscale.

### When You Get Back Home

Change everything back from `mac-studio` to `localhost` in those same 6 files. Or just leave it — `mac-studio` works when you're home too, it's just a tiny bit slower than `localhost`.

---

## For a Tester: Accessing the Web Apps

If someone else needs to access the running web apps (for testing, demos, etc.), here's what they need to do.

### Step 1: Install Tailscale

1. Go to [tailscale.com/download](https://tailscale.com/download)
2. Download and install Tailscale for their platform (Mac, Windows, Linux, iOS, Android)
3. Open Tailscale and sign in

### Step 2: Join the Tailnet

You (Michael) need to invite them:

1. Go to the [Tailscale admin console](https://login.tailscale.com/admin/machines)
2. Invite the tester's email address to your tailnet
3. They accept the invite and connect

### Step 3: Access the Apps

Once connected, they open a browser and go to:

| What they want   | URL                      |
| ---------------- | ------------------------ |
| LEGO App         | `http://mac-studio:8000` |
| Workflow Roadmap | `http://mac-studio:8027` |
| Dashboard        | `http://mac-studio:8003` |

> **Important:** These URLs only work when `pnpm dev` is running on the Mac Studio. The databases (Docker) run all the time, but the web apps and API servers need to be started manually.

### What the Tester Does NOT Need

- Access to the codebase
- Any `.env` files
- Database credentials
- Anything installed besides Tailscale and a browser

---

## Troubleshooting

### "Connection refused" or "could not connect to server"

1. **Is Tailscale connected?** Check the menu bar icon (Mac) or system tray (Windows).
2. **Is the Mac Studio on?** It needs to be running with Docker up.
3. **Is Tailscale running on the Mac Studio?** Someone might have restarted it. Check remotely via SSH if you can.
4. **Are the dev servers running?** Web apps and API servers require `pnpm dev` to be running on the Mac Studio. Docker services (databases, Redis) run automatically.

### "Cannot resolve host mac-studio"

Tailscale's MagicDNS might not be working. Use the IP address directly instead:

- Replace `mac-studio` with `100.85.133.32` everywhere.

### "Password authentication failed"

You probably changed `localhost` to `mac-studio` but accidentally modified the username or password part of the URL. Double-check that only the hostname part changed.

### Everything is really slow

This is normal for database-heavy operations over the internet. Your home upload speed is the bottleneck. For heavy work (migrations, bulk imports), save it for when you're home.

### Claude Code KB tools aren't connecting

The MCP server reads `apps/api/knowledge-base/.env` at startup. If you changed the host after starting Claude Code, you need to restart Claude Code so the MCP server restarts with the new config.

---

## Quick Reference

| What            | Local (at home)  | Remote (anywhere) |
| --------------- | ---------------- | ----------------- |
| LEGO DB         | `localhost:5432` | `mac-studio:5432` |
| KB (PgBouncer)  | `localhost:5433` | `mac-studio:5433` |
| KB (Direct)     | `localhost:5435` | `mac-studio:5435` |
| Redis           | `localhost:6379` | `mac-studio:6379` |
| MinIO           | `localhost:9000` | `mac-studio:9000` |
| Grafana         | `localhost:3003` | `mac-studio:3003` |
| LEGO App        | `localhost:8000` | `mac-studio:8000` |
| Roadmap         | `localhost:8027` | `mac-studio:8027` |
| LEGO API        | `localhost:9100` | `mac-studio:9100` |
| Roadmap Service | `localhost:9103` | `mac-studio:9103` |

> Fallback IP if MagicDNS fails: `100.85.133.32`
