# Story Context Standard

Leaders read context from: `_implementation/AGENT-CONTEXT.md`

Setup phase creates this file. Subsequent phases read it.

## AGENT-CONTEXT.md Structure
```
story_id: STORY-XXX
base_path: plans/stories/STORY-XXX/
artifacts_path: plans/stories/STORY-XXX/_implementation/
failure_source: code-review-failed | needs-work
backend_fix: true | false
frontend_fix: true | false
```
