# Fix Pipeline Failures

The `implement-stories.sh` script is now a state machine that automatically handles most failure recovery. Here's how to use it.

## Standard Run (picks up everything from current state)

```bash
./scripts/implement-stories.sh autonomous-pipeline
```

This will:
- Clean up duplicate stage directories automatically
- Skip stories in `elaboration/` or with `needs-split` status
- Pick up each story from its current stage and advance it
- Move stories without EVIDENCE.yaml back to `ready-to-work/` for fresh implementation

## With Auto-Fix Retries

```bash
./scripts/implement-stories.sh autonomous-pipeline --max-retries 1
```

When `--max-retries` > 0, stories that land in `failed-code-review` or `failed-qa` will automatically:
1. Run `/dev-fix-story` to address the failures
2. Re-run review or QA
3. Continue advancing if the fix succeeds

## Retry Only Failed Stories

After a run, the script prints an exact retry command:

```bash
# Example output:
# Retry failed: ./scripts/implement-stories.sh autonomous-pipeline --only APIP-1010,APIP-3010,APIP-5004 --max-retries 1
```

## Pipeline State Machine

```
ready-to-work ──→ /dev-implement-story ──→ needs-code-review
                                               │
                    ┌──────────────────────────┘
                    ▼
needs-code-review ─→ /dev-code-review ──→ ready-for-qa
                                    │
                                    └──→ failed-code-review
                                              │
                        ┌─────────────────────┘
                        ▼ (if retries left)
failed-code-review ──→ /dev-fix-story ──→ needs-code-review (loop)

ready-for-qa ──→ /qa-verify-story ──→ UAT (done!)
                               │
                               └──→ failed-qa
                                       │
                   ┌───────────────────┘
                   ▼ (if retries left)
failed-qa ──→ /dev-fix-story ──→ ready-for-qa (loop)
```

## Auto-Corrections

The script automatically handles these situations:

| Situation | Auto-fix |
|---|---|
| Story in multiple stage directories | Keeps most-progressed with EVIDENCE.yaml, removes ghosts |
| Story in `needs-code-review/` without EVIDENCE.yaml | Moves back to `ready-to-work/` for implementation |
| Story in `in-progress/` with EVIDENCE.yaml | Advances to `needs-code-review/` |
| Story in `failed-code-review/` with `--max-retries` | Runs fix then re-review |
| Story in `failed-qa/` with `--max-retries` | Runs fix then re-QA |

## Stories That Cannot Be Auto-Fixed

These require manual intervention:

- **`elaboration/` stage**: Story needs elaboration first (`/elab-story`)
- **`needs-split` status**: Story is too large, needs manual splitting
- **Dependency blocked**: Story depends on packages not yet on `main` — implement dependencies first
