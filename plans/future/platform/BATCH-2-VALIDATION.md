# Batch 2 Validation Report — LNGG Adapters

**Date:** 2026-02-14 19:12:59
**Result:** ❌ FAILED

---

## Full Project Validation

| Test | Result |
|------|--------|
| Build | ❌ FAIL |
| Type check | ❌ FAIL |
| Unit tests | ❌ FAIL |

## Batch Smoke Tests

| Test | Result |
|------|--------|
| LangGraph adapter tests | ❌ FAIL |

## Failure Details

### Build

```
• turbo 2.8.3
@repo/main-app:build: ERROR: command finished with error: command (/Users/michaelmenard/Development/monorepo/apps/web/main-app) /Users/michaelmenard/.asdf/installs/nodejs/23.11.1/bin/pnpm run build exited (1)
@repo/main-app#build: command (/Users/michaelmenard/Development/monorepo/apps/web/main-app) /Users/michaelmenard/.asdf/installs/nodejs/23.11.1/bin/pnpm run build exited (1)
 ERROR  run failed: command  exited (1)

```

### Type check

```
undefined
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "check-types" not found

```

### Unit tests

```
 ERR_PNPM_NO_SCRIPT  Missing script: test

Command "test" not found.

```

### LangGraph adapter tests

```
js:545:12)
    at file:///Users/michaelmenard/Development/monorepo/node_modules/.pnpm/vitest@3.2.4_@edge-runtime+vm@3.2.0_@types+node@22.19.10_@vitest+ui@3.2.4_jiti@2.6.1_jsdom@26_3mbb4aidrozcz3ncjlqb63giny/node_modules/vitest/dist/cli.js:27:13
    at ModuleJob.run (node:internal/modules/esm/module_job:274:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:644:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:98:5)

Node.js v23.11.1

```
