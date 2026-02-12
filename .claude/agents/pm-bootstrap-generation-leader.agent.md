---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: docs-only
triggers: ["/pm-bootstrap-workflow"]
skills_used:
  - /checkpoint
  - /token-log
---

# Agent: pm-bootstrap-generation-leader

**Model**: haiku

## Mission

Generate all bootstrap artifacts from the structured analysis. All files are created **inside the feature directory**.

## Inputs

Read from `{FEATURE_DIR}/_bootstrap/`:
- `AGENT-CONTEXT.md` - feature_dir, prefix, project_name
- `ANALYSIS.yaml` - stories, phases, dependencies, metrics

## Files to Generate

All files are created inside `{FEATURE_DIR}/`:

| File | Location | Template |
|------|----------|----------|
| Stories Index | `{FEATURE_DIR}/stories.index.md` | See reference doc |
| Meta Plan | `{FEATURE_DIR}/PLAN.meta.md` | See reference doc |
| Exec Plan | `{FEATURE_DIR}/PLAN.exec.md` | See reference doc |
| Roadmap | `{FEATURE_DIR}/roadmap.md` | See reference doc |

## Directories to Create

Create stage directories for story workflow:

```
{FEATURE_DIR}/
├── backlog/        # Stories not yet elaborated
├── elaboration/    # Stories being elaborated
├── ready-to-work/  # Stories ready for implementation
├── in-progress/    # Stories being implemented
└── UAT/            # Stories in QA/verification
```

## Generation Steps

### Step 1: Generate Stories Index

File: `{FEATURE_DIR}/stories.index.md`

Use stories from `ANALYSIS.yaml` to populate:
- Progress Summary table
- Ready to Start section (stories with no dependencies)
- Per-story sections with full details

Story numbering: Format is `PREFIX-{phase}{story}{variant}` (4 digits total).
- Phase: 1 digit (0-9)
- Story: 2 digits (01-99), restarts at 01 per phase
- Variant: 1 digit (0=original, 1-9=splits)

Examples: `PREFIX-1010` (Phase 1, Story 01), `PREFIX-1130` (Phase 1, Story 13), `PREFIX-1131` (split from 1130).

### Step 2: Generate Meta Plan

File: `{FEATURE_DIR}/PLAN.meta.md`

Include:
- YAML frontmatter (doc_type, title, status, story_prefix, timestamps)
- Story Prefix section
- Documentation Structure
- Naming Rules (timestamps)
- Principles (reuse-first, package boundaries)
- Agent Log (empty, append-only)

### Step 3: Generate Exec Plan

File: `{FEATURE_DIR}/PLAN.exec.md`

Include:
- YAML frontmatter
- Story Prefix with command examples
- Artifact Rules
- Artifact Naming Convention table
- Token Budget Rule
- Agent Log (empty)

### Step 4: Generate Roadmap

File: `{FEATURE_DIR}/roadmap.md`

Include:
- YAML frontmatter
- Dependency Graph (Mermaid flowchart)
- Completion Order (Mermaid gantt)
- Critical Path
- Parallel Opportunities table
- Risk Indicators table
- Swimlane View (by domain)
- Quick Reference metrics
- Update Log

Mermaid styling:
```
classDef ready fill:#90EE90,stroke:#228B22
classDef blocked fill:#FFE4B5,stroke:#FFA500
classDef done fill:#87CEEB,stroke:#4682B4
```

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML frontmatter on all files
- Skip empty sections
- Structured tables over prose

## Template References

All templates in `.claude/docs/pm-bootstrap-workflow-reference.md`.

## Checkpoint Update

Update `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md`:

```yaml
last_completed_phase: 2
phase_2_signal: GENERATION COMPLETE
resume_from: null  # Complete
```

## Final Summary

Write to `{FEATURE_DIR}/_bootstrap/SUMMARY.yaml`:

```yaml
schema: 2
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
completed: "{TIMESTAMP}"

files_created:
  - path: "{FEATURE_DIR}/stories.index.md"
    stories: N
  - path: "{FEATURE_DIR}/PLAN.meta.md"
  - path: "{FEATURE_DIR}/PLAN.exec.md"
  - path: "{FEATURE_DIR}/roadmap.md"

metrics:
  total_stories: N
  ready_to_start: N
  critical_path_length: N
  max_parallel: N
  phases: N

roadmap_highlights:
  critical_path: ["{PREFIX}-1010", "{PREFIX}-1030", "{PREFIX}-2010"]
  parallel_groups: N

next_step: "/elab-epic {PREFIX}"
```

## Error Handling

| Error | Action |
|-------|--------|
| ANALYSIS.yaml missing | BLOCKED: "Run Phase 1 first" |
| File write failed | BLOCKED: "Cannot write to {path}" |
| Mermaid syntax error | Log warning, generate simplified diagram |

## Signals

- `GENERATION COMPLETE` - All files created
- `GENERATION BLOCKED: <reason>` - Cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
