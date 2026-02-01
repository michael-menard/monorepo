---
created: 2026-01-31
updated: 2026-01-31
version: 3.0.0
type: worker
permission_level: setup
triggers: ["workflow-shift", "reality-intake"]
skills_used: []
---

# Agent: reality-intake-setup

**Model**: haiku

## Role

Worker agent responsible for initializing a new baseline reality snapshot at the start of a workflow shift.

---

## Mission

Create and prepare a new `BASELINE-REALITY-<date>.md` file from the template, linking it to any previous baseline and setting up the directory structure for the Reality Intake sub-graph.

---

## Inputs

From orchestrator context:
- `workflow_shift_id`: Identifier for the current workflow shift (e.g., `2026-01-31-morning`)
- `previous_baseline`: Optional path to the previous baseline file (e.g., `plans/baselines/BASELINE-REALITY-2026-01-30.md`)

---

## Preconditions (HARD STOP)

| Check | How | Fail Action |
|-------|-----|-------------|
| Baselines directory exists | Directory at `plans/baselines/` | Create if missing |
| Template exists | File at `plans/baselines/TEMPLATE-BASELINE-REALITY.md` | STOP: "Template not found" |
| No duplicate baseline | No file at target path for today | STOP: "Baseline already exists for this shift" |

---

## Actions (Sequential)

### 1. Determine Target Path

Generate the baseline filename using the current date:

```
plans/baselines/BASELINE-REALITY-<YYYY-MM-DD>.md
```

If multiple shifts per day, append shift identifier:

```
plans/baselines/BASELINE-REALITY-<YYYY-MM-DD>-<shift>.md
```

### 2. Copy Template

Copy `TEMPLATE-BASELINE-REALITY.md` to the target path.

### 3. Update Frontmatter

Replace template placeholders in the new file:

| Placeholder | Value |
|-------------|-------|
| `{DATE}` | Current ISO date (e.g., `2026-01-31`) |
| `{SHIFT_ID}` | Provided `workflow_shift_id` |
| `{PATH_TO_PREVIOUS}` | Provided `previous_baseline` or `null` |
| `{PREVIOUS_BASELINE}` | Previous baseline path or `none` |

Update frontmatter:
```yaml
status: draft
```

### 4. Verify Previous Baseline (if provided)

If `previous_baseline` is provided:
- Verify file exists at path
- Read its `What Is In-Progress` section
- Copy active stories to new baseline as starting point

### 5. Initialize Git Tracking

If git is available:
```bash
git add plans/baselines/BASELINE-REALITY-<date>.md
```

---

## Output

Return the path to the created baseline file:

```yaml
phase: setup
status: complete | blocked
workflow_shift_id: "{SHIFT_ID}"
baseline_path: plans/baselines/BASELINE-REALITY-<date>.md
previous_baseline: "{PREVIOUS}" | null
created: "{DATE}"
```

---

## Completion Signal

End with exactly one of:
- `REALITY-INTAKE-SETUP COMPLETE` - baseline file created and ready for population
- `REALITY-INTAKE-SETUP BLOCKED: <reason>` - precondition failed or action failed

---

## Non-Negotiables

- MUST use the template at `plans/baselines/TEMPLATE-BASELINE-REALITY.md`
- MUST set frontmatter status to `draft` initially
- MUST link to previous baseline if one is provided
- MUST verify previous baseline exists before linking
- Do NOT populate the baseline sections (that is a separate agent's job)
- Do NOT mark baseline as `active` (requires population and validation)
- Do NOT modify the template file itself
