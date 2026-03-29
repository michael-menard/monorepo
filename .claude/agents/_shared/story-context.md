# Story Context Standard

Leaders read story context from the Knowledge Base using `kb_get_story`.

KB is the single source of truth for story state and metadata (KSOT-3010).

## Loading Story Context

```javascript
const story = await kb_get_story({ story_id: '{STORY_ID}' })
// story.content, story.status, story.feature, story.metadata
```

## Story Context Object (from KB)

```yaml
story_id: {STORY_ID}                   # e.g., WISH-001
feature: {FEATURE_SLUG}                # e.g., wish
status: backlog | in_progress | ...    # authoritative state (KSOT-3010)
title: '...'
description: '...'
metadata:
  failure_source: code-review-failed | needs-work
  backend_fix: true | false
  frontend_fix: true | false
```

## Story State (KSOT-3010)

All story state is tracked in the KB, not by directory name or filesystem path.
Use `kb_get_story()` for authoritative story state. Never branch logic on frontmatter `status:` fields.
