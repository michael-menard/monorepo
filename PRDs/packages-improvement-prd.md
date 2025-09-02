# PRD: Monorepo Packages – Phased Improvement Plan (Checklist)

Scope: packages/*  
Packages discovered:
- @repo/auth (packages/auth)
- @repo/ui (packages/ui)
- @monorepo/shared (packages/shared)
- @repo/shared-cache (packages/shared-cache)
- @repo/shared-image-utils (packages/shared-image-utils)
- Feature packages (packages/features/*): gallery, moc-instructions, profile, wishlist, FileUpload, ImageUploadModal, shared

Standards to adhere to:
- Build-First Policy (A: Build Green → B: Tests Green)
- Tailwind-only styling (no CSS files) for apps/features; evaluate UI atoms policy
- RTK Query for HTTP calls; path aliases for shared imports
- Testing policy: Vitest for unit; Playwright for E2E (apps only)

---

## 0) Cross-Package Audit (Current State)

- Build/Tooling
  - Mix of build tools across packages:
    - Some use tsc only (e.g., @repo/ui), others use Vite builds (e.g., gallery, moc-instructions).
    - Root contains `vite.config.lib.ts` suitable for library builds; alignment recommended.
  - Export maps vary:
    - Some export `./src/*` (e.g., @repo/auth) which leaks source and can cause consumer compile-through.
    - Some point to `dist` (better for tree-shaking and type distribution) or to `src/index.ts` for types.
  - Types: d.ts generation not standardized across packages (some rely on TS project references, some on Vite types, some on tsc).

- Styling
  - CSS files exported by multiple packages:
    - @repo/auth: `./styles.css`
    - @repo/moc-instructions: `./styles.css`
    - @repo/gallery: `./styles.css`
    - @repo/ui: `./globals.css`
    - @monorepo/shared: `./design-tokens.css`
  - This conflicts with Tailwind v4 “Tailwind-only” rule, especially for feature packages. UI atoms may still centralize base CSS variables, but should be minimized and replaced with Tailwind tokens/utilities where feasible.

- Router & APIs
  - @repo/auth depends on `react-router-dom` and provides both `RouteGuard` and `TanStackRouteGuard` variants. Apps have standardized on TanStack Router v1.
  - Feature packages use Redux Toolkit/RTK Query consistently; confirm consistent usage patterns and module side-effect flags for tree-shaking.

- React & Peer Dependencies
  - Versions vary in peer ranges:
    - Some packages peer `react`/`react-dom` `^19.1.0`
    - Some support `^18 || ^19` (e.g., moc-instructions, gallery)
  - Consider consolidating on React 19 peer range across packages for consistency (or keep 18+19 where back-compat is required, but document policy).

- Browser vs Node Exports
  - @repo/shared-image-utils includes `sharp` (Node) and exports browser builds via `exports.{browser}`.
  - Risk: accidental inclusion of `sharp` in web bundles if conditional exports are misused. Ensure clear separation and tests preventing `sharp` in browser bundles.

- Shared Cache/Utilities
  - @repo/shared-cache declares `peerDependencies: { react: ^19 }` even though it’s a pure TS utility; likely unnecessary and creates install friction.

- Testing
  - Vitest present across packages; coverage thresholds need enforcement and gaps filled (branch-heavy modules, schema validators, adapters).
  - UI package ships Storybook; ensure it’s aligned with Tailwind v4 and shadcn/ui primitives.

---

## Phase A — Build Green (per-package compiles + type-checks)

Goal: Every package builds and type-checks cleanly using a consistent approach, export maps are correct, consuming apps build without compile-through or type resolution issues.

Cross-cutting
- [ ] Standardize on root `vite.config.lib.ts` for library builds where suitable. For packages using tsc-only, decide:
      - Either adopt Vite lib build for bundling (preferred for ESM + type rollup)
      - Or keep tsc-only but ensure types and exports are correct and tree-shakeable
- [ ] Normalize export maps:
      - [ ] Prefer exporting compiled outputs (`./dist/*.js`) and `types` to `./dist/*.d.ts`
      - [ ] Avoid exporting `./src/*` to consumers (useful for internal dev only). If internal paths needed, gate via `exports` conditions like `"development"` or document internal-use only.
- [ ] Ensure `"sideEffects": false` where appropriate for optimal tree-shaking
- [ ] Align TypeScript configs: TS 5.8.x, moduleResolution `bundler` where using TS with ESM, and consistent tsconfig base
- [ ] Remove unnecessary peer deps (e.g., `react` from @repo/shared-cache) if not required

Per-package focus
- @repo/auth
  - [ ] Build using Vite lib config or tsc consistently with other packages
  - [ ] Decide on router adapter strategy (TanStack-first); keep React Router adapter in a separate entry (`./react-router` subpath) to avoid forcing `react-router-dom` on all consumers
  - [ ] Stop exporting `./src/*` in public exports (replace with compiled outputs and `.d.ts`)
- @repo/ui
  - [ ] Confirm tsc build generates `.d.ts` and tree-shakeable ESM
  - [ ] Evaluate `globals.css` necessity; if needed, consider Tailwind plugin pattern or CSS variables via Tailwind config to reduce CSS surface
- @monorepo/shared
  - [ ] Replace/augment `design-tokens.css` with Tailwind tokens (v4) where possible; minimize CSS export
  - [ ] Vite build uses `@vitejs/plugin-react-swc` but package should avoid React dependency if only sharing state/tokens; re-check dependencies
- @repo/shared-image-utils
  - [ ] Validate conditional exports ensure browsers never pull `sharp`; add test to guard against it
  - [ ] Consider splitting Node-specific utilities to `@repo/shared-image-utils-node` (follow-up)
- @repo/moc-instructions, @repo/gallery, feature packages
  - [ ] Remove `./styles.css` exports in favor of Tailwind utilities and component-scoped classes
  - [ ] Build alignment to Vite lib config; ensure types and exports are consistent

Acceptance (Phase A)
- [ ] `pnpm -w build` completes for all packages
- [ ] `pnpm -w --filter @repo/* run check-types` passes (and for @monorepo/shared)
- [ ] Apps compile after dependencies are updated (no source compile-through, no missing types)
- [ ] Size and tree-shaking verified for a few sample imports (no accidental inclusion of Node deps)

---

## Phase B — Tests Green (Unit/Component)

Goal: Package-level tests green with coverage thresholds (Lines ≥ 90%, Branches ≥ 85%, Functions ≥ 90%, Statements ≥ 90%).

- Testing setup
  - [ ] Ensure consistent Vitest configs per package; JSDOM for React components; MSW where HTTP present
  - [ ] Add targeted tests:
    - @repo/auth: route guards (both adapters), form validation schemas (zod), slice logic
    - @repo/ui: atom behavior, accessibility props (aria), keyboard navigation (see repo docs)
    - @monorepo/shared: selectors/utilities and any exposed hooks (if any)
    - @repo/shared-image-utils: schema validators, browser entry ensures no `sharp` import; Node entry covers transformations
    - Feature packages: core components and RTK Query adapters (mock network via MSW)
  - [ ] Add coverage config (per repo policy) and enforce thresholds
- Accessibility baseline for @repo/ui atoms (props pass-through, focus states)

Acceptance (Phase B)
- [ ] `pnpm -w --filter ./packages/... test:run` green across packages
- [ ] Coverage thresholds met per policy

---

## Phase C — Styling Standardization (Tailwind v4)

Goal: Remove CSS exports from feature packages; consolidate styling to Tailwind utilities and tokens.

- Cross-cutting
  - [ ] Create a Tailwind plugin (in `packages/shared` or new `@repo/tailwind-config`) that exposes design tokens as Tailwind theme values (colors, spacing, radii, etc.)
  - [ ] Migrate styles from:
        - @repo/auth, @repo/moc-instructions, @repo/gallery → remove `styles.css` exports
  - [ ] Evaluate @repo/ui `globals.css` usage:
        - If only for CSS variables/base resets that Tailwind can cover, migrate to Tailwind plugin and remove globals
        - If kept, document it as the single, minimal CSS entrypoint allowed for atoms; ensure apps/features don’t add CSS files
- [ ] Update docs in `packages/shared/DESIGN_SYSTEM.md` to reflect Tailwind v4 tokens

Acceptance (Phase C)
- [ ] No CSS files exported from feature packages
- [ ] UI atoms styling primarily Tailwind utilities; any remaining globals documented and minimal
- [ ] Apps using these packages render correctly without CSS exports

---

## Phase D — Router Standardization (Adapters)

Goal: Make TanStack Router the first-class adapter across shared packages, with optional React Router adapter isolated.

- @repo/auth
  - [ ] Provide TanStack Router adapter as default export path
  - [ ] Move React Router-specific code to a separate subpath export (e.g., `@repo/auth/react-router`)
  - [ ] Update docs: recommended usage with TanStack v1; include migration notes
- Feature packages that include navigational helpers
  - [ ] Ensure they are router-agnostic or provide adapters similarly

Acceptance (Phase D)
- [ ] Apps using TanStack Router consume default paths without pulling in react-router-dom
- [ ] No cross-router dependency leaks in consuming bundles

---

## Phase E — Bundle Hygiene, Types, and Security

Goal: Ensure packages are light, tree-shakeable, typed, and secure-by-default.

- Bundle hygiene
  - [ ] Confirm `"sideEffects": false` where safe
  - [ ] Narrow subpath exports to only public API; avoid leaking internals
  - [ ] Add `"types"` mapping in `exports` for subpaths
- Types & DX
  - [ ] Ensure `.d.ts` generation for all public APIs
  - [ ] Add `typesVersions` if needed for subpath types resolution
- Security & Policies
  - [ ] Avoid `eval`/unsafe dynamic imports in shared code
  - [ ] Document security expectations: no direct DOM access in utilities; prefer framework-safe APIs

Acceptance (Phase E)
- [ ] Verified via test imports that unused submodules tree-shake out
- [ ] Type resolution works from consumer apps without tsconfig hacks
- [ ] Security lint passes (eslint security config, if applicable)

---

## Phase F — Versioning, Release, and Docs

Goal: Clear release story, changelogs, and documentation for consumers.

- Versioning
  - [ ] Adopt Changesets or align with existing monorepo versioning strategy
  - [ ] Generate CHANGELOG entries automatically per package
- Publish
  - [ ] If publishing externally: ensure `"publishConfig"` fields, files whitelist, correct module types (ESM), and README badges/examples
  - [ ] If internal-only: mark private or document internal consumption practices
- Documentation
  - [ ] Update READMEs for all packages with:
        - Installation/usage
        - Peer dependencies
        - Example imports (tree-shakeable patterns)
        - Router adapter guidance (where applicable)
        - Tailwind token usage

Acceptance (Phase F)
- [ ] Changelogs generated for meaningful updates
- [ ] Docs consistent and discoverable; examples compile in consumer app

---

## Deliverables by Phase

- Phase A: Unified builds, corrected export maps/types, removed unnecessary peers, tree-shakeable defaults
- Phase B: Tests + coverage green across packages
- Phase C: Tailwind v4 styling standardization (no CSS in feature packages), plugin for tokens
- Phase D: Router adapter standardization (TanStack default)
- Phase E: Bundle hygiene, types, security hardening
- Phase F: Versioning & docs

---

## Risks & Decisions

- CSS removal from feature packages may require minor visual adjustments; mitigate by adding Tailwind tokens and utilities up-front.
- Router adapter split requires clear docs to avoid consumer confusion; provide codemods or recipes where feasible.
- Shared-image-utils Node dependency (`sharp`) must never leak to browsers; guard via tests and CI.
- Consolidating peer ranges to React 19 may impact legacy consumers; decide policy explicitly (support 18+19 or 19-only).

---

## Commands (Examples)

- Build/type-check all packages:
  - `pnpm -w build`
  - `pnpm -w --filter ./packages/... run check-types`
- Test all packages:
  - `pnpm -w --filter ./packages/... run test:run`
- Example per-package (auth):
  - `pnpm -w --filter @repo/auth run build`
  - `pnpm -w --filter @repo/auth run test:run`

---

## Pointers to Code Reviewed

- @repo/auth: package.json, src structure with route guards, schemas, slices
- @repo/ui: package.json, Storybook/test setup, Radix primitives
- @monorepo/shared: package.json, tokens CSS export
- @repo/shared-cache: package.json (peer react), zod-only runtime dep
- @repo/shared-image-utils: package.json (sharp + browser exports)
- Feature packages (gallery, moc-instructions): package.json exporting styles.css; Vite lib builds
