---
created: 2026-02-11
updated: 2026-02-11
version: 1.0.0
type: orchestrator
agents: ["audit-setup-leader.agent.md", "audit-security.agent.md", "audit-duplication.agent.md", "audit-react.agent.md", "audit-typescript.agent.md", "audit-accessibility.agent.md", "audit-ui-ux.agent.md", "audit-performance.agent.md", "audit-test-coverage.agent.md", "audit-code-quality.agent.md", "audit-aggregate-leader.agent.md", "audit-devils-advocate.agent.md", "audit-moderator.agent.md", "audit-promote-leader.agent.md", "audit-trends-leader.agent.md", "audit-debt-map-leader.agent.md"]
---

Usage: /code-audit <subcommand> [flags]

Multi-tier codebase audit system. Scans codebase with 9 specialist lenses, produces FINDINGS.yaml.

## Subcommands

| Command | Description |
|---------|-------------|
| `run` | Execute audit scan |
| `findings` | View/filter findings from latest audit |
| `promote` | Turn findings into stories |
| `trends` | View trend analysis across audit runs |
| `debt-map` | Generate lint debt map by file |

---

## `/code-audit run [flags]`

### Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--mode` | `pipeline`, `roundtable` | `pipeline` | Agent orchestration mode |
| `--scope` | `full`, `delta`, `domain`, `story` | `full` | What to scan |
| `--lens` | `all`, `security`, `duplication`, `react`, `typescript`, `a11y`, `ui-ux`, `performance`, `test-coverage`, `code-quality` | `all` | Which lenses to run (comma-separated) |
| `--target` | `<path>` | `apps/` | Target directory |
| `--since` | `<date\|commit>` | — | For delta scope |
| `--story` | `<STORY-ID>` | — | For story scope (reads EVIDENCE.yaml) |

### Audit Tiers

| Scope | Default Mode | Default Lenses | Typical Cost |
|-------|-------------|----------------|--------------|
| story | pipeline | reusability, react, typescript, a11y | Low |
| delta | pipeline | all | Medium |
| domain | pipeline or roundtable | all | Medium |
| full | roundtable | all | High |

### Pipeline Mode (fast)

```
Phase 0: Setup → audit-setup-leader (discover scope, build file list)
Phase 1: Parallel Fanout → 9 lens agents run in parallel
Phase 2: Synthesize → audit-aggregate-leader (merge findings, dedup)
Phase 3: Persist → write FINDINGS-{date}.yaml to plans/audit/
```

### Roundtable Mode (thorough)

```
Phase 0: Setup → audit-setup-leader (discover scope, build file list)
Phase 1: Parallel Fanout → 9 lens agents run in parallel
Phase 2: Devil's Advocate → audit-devils-advocate (challenge each finding)
Phase 3: Roundtable → audit-moderator (cross-specialist synthesis)
Phase 4: Synthesize → audit-aggregate-leader (merge vetted findings)
Phase 5: Persist → write FINDINGS-{date}.yaml to plans/audit/
```

### Execution

**Phase 0 — Setup**

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Audit setup"
  prompt: |
    Read: .claude/agents/audit-setup-leader.agent.md
    CONTEXT:
    scope: {scope}
    target: {target}
    since: {since}  # if delta
    story: {story}  # if story scope
    Return file list as YAML.
```

**Phase 1 — Parallel Lens Fanout**

Determine which lenses to run based on `--lens` flag:
- `all` → run all 9 lenses
- Comma-separated → run only specified lenses

Map lens names to agent files:
```python
lens_agents = {
    "security": "audit-security",
    "duplication": "audit-duplication",
    "react": "audit-react",
    "typescript": "audit-typescript",
    "a11y": "audit-accessibility",
    "ui-ux": "audit-ui-ux",
    "performance": "audit-performance",
    "test-coverage": "audit-test-coverage",
    "code-quality": "audit-code-quality",
}
```

Spawn all selected lens agents in SINGLE message (parallel):

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  run_in_background: true
  description: "Audit {lens} lens"
  prompt: |
    Read: .claude/agents/audit-{lens}.agent.md
    CONTEXT:
    scope: {scope}
    target_files: <file list from Phase 0>
    Return findings as YAML.
```

Wait for all lens agents to complete.

**Phase 2 — Devil's Advocate (roundtable mode only)**

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Devil's advocate review"
  prompt: |
    Read: .claude/agents/audit-devils-advocate.agent.md
    CONTEXT:
    lens_findings: <collected findings from all lenses>
    Return challenged findings as YAML.
```

**Phase 3 — Roundtable (roundtable mode only)**

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Roundtable synthesis"
  prompt: |
    Read: .claude/agents/audit-moderator.agent.md
    CONTEXT:
    lens_findings: <original lens findings>
    devils_advocate_result: <challenged findings>
    Return vetted findings as YAML.
```

**Phase 4 (or 2 in pipeline) — Aggregate**

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Aggregate audit findings"
  prompt: |
    Read: .claude/agents/audit-aggregate-leader.agent.md
    CONTEXT:
    mode: {mode}
    scope: {scope}
    target: {target}
    lens_findings: <all lens findings>
    vetted_findings: <roundtable output, if applicable>
    Write FINDINGS-{date}.yaml to plans/audit/
```

**Done**

Report: `AUDIT COMPLETE: {total_findings} findings ({critical} critical, {high} high)`

---

## `/code-audit findings [flags]`

| Flag | Description |
|------|-------------|
| `--lens` | Filter by lens |
| `--severity` | Filter by severity (critical, high, medium, low) |
| `--file` | Filter by file path |

Read latest `plans/audit/FINDINGS-*.yaml` and present formatted summary.

---

## `/code-audit promote [flags]`

| Flag | Description |
|------|-------------|
| `--auto` | Auto-promote findings above threshold |
| `--id` | Promote specific finding IDs (comma-separated) |

Spawn `audit-promote-leader` to:
1. Dedup against existing `stories.index.md` entries
2. Create stories in appropriate backlog
3. Update `stories.index.md`
4. Mark promoted findings in FINDINGS yaml

---

## `/code-audit trends [flags]`

| Flag | Description |
|------|-------------|
| `--lens` | Trends for specific lens |
| `--file` | Trends for specific file |
| `--days` | Time window (default: 30) |

Spawn `audit-trends-leader` to read all `FINDINGS-*.yaml` and compute trends.

---

## `/code-audit debt-map [flags]`

| Flag | Description |
|------|-------------|
| `--granularity` | `file` (default), `category`, `line` |
| `--top` | Top N worst files (default: 20) |

Spawn `audit-debt-map-leader` to run linter/tsc across codebase and produce `DEBT-MAP-{date}.yaml`.

---

## Output Storage

```
plans/audit/
  FINDINGS-2026-02-11.yaml
  DEBT-MAP-2026-02-11.yaml
  TRENDS.yaml
```

## Schema Reference

Output schema: `packages/backend/orchestrator/src/artifacts/audit-findings.ts`
