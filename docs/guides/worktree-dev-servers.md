# Per-Worktree Dev Servers with Worktrunk

## Overview

Each git worktree gets its own set of dev servers running on deterministic hashed ports derived from the branch name. This means you can run `main-app` on branch A and `workflow-roadmap` on branch B simultaneously without port conflicts.

Port hashing is handled by Worktrunk's `{{ branch | hash_port }}` filter, which produces a stable port in the 10000–19999 range for any branch name.

## How Ports Are Assigned

| Slot                                 | Template                                | Example (branch: `feat/wishlist`) |
| ------------------------------------ | --------------------------------------- | --------------------------------- |
| Frontend                             | `{{ branch \| hash_port }}`             | e.g. 14823                        |
| roadmap-svc / lego-api (api- prefix) | `{{ ('api-' ~ branch) \| hash_port }}`  | e.g. 11204                        |
| lego-api (lego- prefix)              | `{{ ('lego-' ~ branch) \| hash_port }}` | e.g. 13017                        |

The frontend port is always the "canonical" URL shown in `wt list`.

## Aliases

Start servers with `wt step <alias>` from within the worktree. All processes run in the foreground (backgrounded via `&`), so use a dedicated terminal or tmux window.

### `wt step lego`

Starts `main-app` + `lego-api`.

- **Use for:** Wishlist, user profile, MOC review, admin panel, or any lego domain feature
- **Frontend:** `http://localhost:{{ branch | hash_port }}`
- **Backend:** `http://localhost:{{ ('lego-' ~ branch) | hash_port }}`

### `wt step roadmap`

Starts `workflow-roadmap` + `roadmap-svc`.

- **Use for:** Workflow epics, roadmap UI, plan/story management
- **Frontend:** `http://localhost:{{ branch | hash_port }}`
- **Backend:** `http://localhost:{{ ('api-' ~ branch) | hash_port }}`

### `wt step workflow-admin`

Starts `workflow-admin-app` + `roadmap-svc` + `lego-api`.

- **Use for:** Admin panel features that span both lego and workflow domains
- **Frontend:** `http://localhost:{{ branch | hash_port }}`
- **roadmap-svc:** `http://localhost:{{ ('api-' ~ branch) | hash_port }}`
- **lego-api:** `http://localhost:{{ ('lego-' ~ branch) | hash_port }}`

## Cleanup

When you remove a worktree (`wt remove <branch>`), the `post-remove` hooks automatically kill any processes listening on all three possible ports for that branch. You don't need to manually kill servers.

## How It Works

### Vite configs read ports from env

The vite configs for `main-app`, `workflow-roadmap`, and `workflow-admin-app` all fall back to `infra/ports.json` when env vars are not set (normal single-instance dev), but accept overrides:

| App                  | Frontend env var        | Backend env var(s)                  |
| -------------------- | ----------------------- | ----------------------------------- |
| `main-app`           | `MAIN_APP_PORT`         | `LEGO_API_PORT`                     |
| `workflow-roadmap`   | `WORKFLOW_ROADMAP_PORT` | `ROADMAP_SVC_PORT`                  |
| `workflow-admin-app` | `WORKFLOW_ADMIN_PORT`   | `ROADMAP_SVC_PORT`, `LEGO_API_PORT` |

Gallery apps (`app-wishlist-gallery`, `app-instructions-gallery`, etc.) have no Vite proxy — they are imported as library packages into `main-app` and built together. No separate process is needed.

### lego-api requires LEGO_API_PORT

`lego-api` throws on startup if `LEGO_API_PORT` is not set. The aliases always pass it explicitly.

## Adding a New Service

If a genuinely new backend service is added (new entry in `infra/ports.json`):

1. Update the relevant alias in `.config/wt.toml` to start it with a hashed port env var
2. Update `post-remove` to kill its hashed port
3. If it has a Vite proxy target, update that app's `vite.config.ts` to read the port from `process.env.X ?? readPort('X')`

New domains added inside `lego-api` require no changes — they're part of the single process.

## Running Without Worktrees

The aliases work on `main` too. `wt step lego` on main starts both servers on their hashed-main ports. For the canonical fixed ports (from `ports.json`), just run `pnpm dev` normally.
