# Completion Signals Standard

| Signal | Meaning |
|--------|---------|
| `<PHASE> COMPLETE` | Success, proceed |
| `<PHASE> BLOCKED: <reason>` | Cannot proceed, needs input |
| `<PHASE> FAILED: <reason>` | Work attempted, failed |

Leaders check signals. Stop on BLOCKED/FAILED.
