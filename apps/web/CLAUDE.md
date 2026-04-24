# apps/web

## Architecture

The main-app is a shell that hosts all micro-apps. Instead of module federation, we use the Turborepo workspace to import shared packages and micro-apps directly. Each app is self-contained with its own dev server, port, and build config.

**All apps are Vite + React 19** except `app-design-system` (Next.js 16 — a one-off for the design system reference site). Do not introduce Next.js elsewhere.

## Port Registry

All ports live in `infra/ports.json`. **Never hardcode ports. Never launch apps on random ports.** Agents reusing arbitrary ports breaks consumers that depend on stable addresses.

```bash
cat infra/ports.json   # canonical source
```

## App Inventory

| App                        | Port | Description                                 |
| -------------------------- | ---- | ------------------------------------------- |
| `main-app`                 | 8000 | Shell — hosts all micro-apps                |
| `app-dashboard`            | 8003 | Collection overview and stats               |
| `reset-password`           | 8006 | Password reset flow                         |
| `user-settings`            | 8009 | Account settings                            |
| `app-inspiration-gallery`  | 8012 | Discover new MOCs and sets                  |
| `app-instructions-gallery` | 8015 | MOC instructions browser                    |
| `app-sets-gallery`         | 8018 | Sets collection browser                     |
| `app-wishlist-gallery`     | 8021 | Wishlist management                         |
| `workflow-admin-app`       | 8024 | Workflow admin (being rearchitected)        |
| `workflow-roadmap`         | 8027 | Roadmap visualization (being rearchitected) |
| `plan-chat`                | 8030 | Plan discussion interface                   |
| `port-monitor`             | 8033 | Dev tool — service health                   |
| `app-design-system`        | 8036 | Design system reference (Next.js)           |
| `app-scraper-queue`        | —    | Scraper queue management                    |
| `app-minifigs-gallery`     | —    | Minifigs collection browser                 |

## Shared Code

Shared components and utilities go in `packages/`, not in `apps/web/components/` or `apps/web/lib/`. Code stays colocated with the app that uses it until a second consumer needs it — then it moves to the appropriate package.

## Frontend Code Preferences

- **ES7+ TypeScript** — use modern syntax
- **Always use `@repo/app-component-library`** — never raw shadcn primitives, never raw HTML for UI elements
- **Semantic color tokens only** — `bg-background`, `text-foreground`, `bg-primary`. Never `bg-white`, `text-black`, `bg-gray-*`
- **Font classes** — `font-heading` (Cormorant Garamond), `font-body` (Lora), `font-mono` (Geist Mono). Never `font-sans` for body text.
- **Framer Motion** for animations
- **React Router** for navigation within apps
- **Component decomposition** — break components down aggressively, maximize reuse
- **Colocation** — sub-components, utils, tests, types live next to the component they serve. Extract up only when shared.

## Design & UX

See `DESIGN.md` at repo root for theme reference, and search the KB for "design system" before writing or modifying UI components.
