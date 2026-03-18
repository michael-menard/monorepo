# WINT-9070 Backend Log — Fix Iteration 1

## Chunk 1 — Fix KbSearchFn type mismatch in BacklogCuratorConfigSchema

- Objective (maps to AC-4: injectable KbSearchFn with correct type):
  Resolve TypeScript error TS2345 in backlog-curate.ts line 604 where
  `fullConfig.kbSearch` (typed as returning `Promise<unknown[]>` by Zod
  inference) was not assignable to `KbSearchFn | undefined` (returning
  `Promise<KbRawItem[]>`).

- Files changed:
  - packages/backend/orchestrator/src/nodes/backlog/backlog-curate.ts

- Summary of changes:
  1. Moved `KbRawItemSchema` and `KbSearchFn` declarations BEFORE
     `BacklogCuratorConfigSchema` so the schema can reference `KbRawItemSchema`.
  2. Changed `z.array(z.unknown())` to `z.array(KbRawItemSchema)` in the
     `kbSearch` function return type within `BacklogCuratorConfigSchema`.
  This makes TypeScript infer the correct return type `Promise<KbRawItem[]>`
  for the injectable kbSearch function, eliminating the type mismatch.

- Reuse compliance:
  - Reused: existing `KbRawItemSchema` Zod schema (already defined in same file)
  - New: none
  - Why new was necessary: N/A

- Ports & adapters note:
  - What stayed in core: Business logic unchanged — only schema declaration ordering fixed
  - What stayed in adapters: Node factory wiring unchanged

- Commands run:
  - `pnpm --filter @repo/orchestrator check-types`
    Result: backlog-curate.ts errors: 0 (pre-existing errors in __types__/index.ts,
    context-warmer.ts, session-manager.ts remain — out of scope for WINT-9070)
  - `pnpm --filter @repo/orchestrator test src/nodes/backlog/__tests__/backlog-curate.test.ts -- --run`
    Result: 33/33 PASS

- Notes / Risks:
  Pre-existing errors in packages/backend/orchestrator/src/__types__/index.ts
  (wint schema references) and context-warmer.ts/session-manager.ts are out of
  scope for WINT-9070 and existed before this story.

---

## Worker Token Summary
- Input: ~3000 tokens (files read: backlog-curate.ts, agent instructions)
- Output: ~800 tokens (files written: backlog-curate.ts fix, BACKEND-LOG.md)
