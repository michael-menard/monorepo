# Story Context Standard

Leaders read context from: `_implementation/AGENT-CONTEXT.md`

Setup phase creates this file. Subsequent phases read it.

## AGENT-CONTEXT.md Structure
```yaml
feature_dir: {FEATURE_DIR}                              # e.g., plans/stories/WISH
story_id: {STORY_ID}                                    # e.g., WISH-001
base_path: {FEATURE_DIR}/in-progress/{STORY_ID}/        # or backlog/, UAT/
artifacts_path: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/
failure_source: code-review-failed | needs-work
backend_fix: true | false
frontend_fix: true | false
```

## Stage-Dependent Paths

The `base_path` varies by workflow stage:
```
backlog:       {FEATURE_DIR}/backlog/{STORY_ID}/
in-progress:   {FEATURE_DIR}/in-progress/{STORY_ID}/
UAT:           {FEATURE_DIR}/UAT/{STORY_ID}/
```
