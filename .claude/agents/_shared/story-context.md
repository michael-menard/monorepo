# Story Context Standard

Leaders read context from: `_implementation/AGENT-CONTEXT.md`

Setup phase creates this file. Subsequent phases read it.

## AGENT-CONTEXT.md Structure
```yaml
feature_dir: {FEATURE_DIR}                              # e.g., plans/stories/WISH
story_id: {STORY_ID}                                    # e.g., WISH-001
base_path: {FEATURE_DIR}/stories/{STORY_ID}/            # KSOT-3010: flat layout
artifacts_path: {FEATURE_DIR}/stories/{STORY_ID}/_implementation/
failure_source: code-review-failed | needs-work
backend_fix: true | false
frontend_fix: true | false
```

## Story Path (KSOT-3010)

All stories live in a flat `stories/` directory. State is tracked in KB, not by directory name.
```
{FEATURE_DIR}/stories/{STORY_ID}/
```
