# AUDT — Code Audit Engine

## Goal

A repeatable, multi-lens code audit system built on LangGraph. Scans the codebase for security issues, duplication, React anti-patterns, TypeScript problems, accessibility gaps, and more. Produces structured FINDINGS artifacts. Initially code-only (Tier 0 — regex/pattern matching), with upgrade path to model-assisted analysis via Task Contracts (from MODL epic).

## Current State

All nodes are **scaffolded** from a prior implementation session. The graph, schemas, and all 15 nodes exist but need:
- Index exports registered in package
- Unit tests with fixtures
- Integration test (end-to-end audit run)
- Cleanup and polish

## Architecture

### LangGraph Graph: `code-audit.ts`

**Pipeline mode (fast):**
```
START -> scan_scope -> [9 lens nodes parallel] -> synthesize -> deduplicate -> persist_findings -> persist_trends -> END
```

**Roundtable mode (thorough):**
```
START -> scan_scope -> [9 lens nodes parallel] -> devils_advocate -> roundtable -> synthesize -> deduplicate -> persist_findings -> persist_trends -> END
```

Conditional edge after parallel lenses checks `state.mode` to route.

### 9 Specialist Lenses

| Lens | Detection | Severity Calibration |
|------|-----------|---------------------|
| Security | Regex: secrets, eval, injection, CORS | Production = high, config = medium |
| Duplication | Cross-app filename matching, known patterns | Always medium |
| React | Missing cleanup, DOM access, stale closures | Production = high, test = low |
| TypeScript | `as any`, interfaces, loose generics, enums | Production = high, test = low |
| Accessibility | Missing labels, keyboard handlers, alt text | Always medium+ |
| UI/UX | Inline styles, arbitrary colors, CSS imports | Always medium |
| Performance | N+1 queries, sync I/O, large imports | Backend = high, frontend = medium |
| Test Coverage | Missing test files for source files | Critical files = high |
| Code Quality | Empty catches, console.log, TODO/HACK | Always low-medium |

### Orchestration Nodes

| Node | Purpose |
|------|---------|
| `devils-advocate.ts` | Challenge findings by confidence, file type, context |
| `roundtable.ts` | Apply challenges, detect cross-lens references |
| `synthesize.ts` | Merge, dedup same-file-same-title, assign AUDIT-NNN IDs |
| `deduplicate.ts` | Jaccard similarity against existing story titles |
| `persist-findings.ts` | Write `FINDINGS-{date}.yaml` |
| `persist-trends.ts` | Aggregate into `TRENDS.yaml` |

## Existing Files

```
packages/backend/orchestrator/src/
  graphs/code-audit.ts              # StateGraph + conditional routing
  artifacts/audit-findings.ts       # Zod schemas
  nodes/audit/
    scan-scope.ts                   # File discovery
    lens-security.ts               # 9 lens nodes
    lens-duplication.ts
    lens-react.ts
    lens-typescript.ts
    lens-accessibility.ts
    lens-ui-ux.ts
    lens-performance.ts
    lens-test-coverage.ts
    lens-code-quality.ts
    devils-advocate.ts              # Orchestration nodes
    roundtable.ts
    synthesize.ts
    deduplicate.ts
    persist-findings.ts
    persist-trends.ts
```

## Claude Code Agent Specs (Prototypes)

```
.claude/agents/
  audit-*.agent.md                  # 16 agent specs
.claude/commands/
  code-audit.md                     # /code-audit command
```

## Output

```
plans/audit/
  FINDINGS-{YYYY-MM-DD}.yaml       # Per-run findings
  TRENDS.yaml                       # Aggregated trends
```
