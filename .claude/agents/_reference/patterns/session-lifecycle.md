# Session Lifecycle Patterns

Standard patterns for session bootstrap and close.

---

## Session Bootstrap (KBMEM-012)

At the START of every run:

### 1. Read working-set.md

```
Check: /.agent/working-set.md in current worktree
Extract: story_id, phase, constraints, next_steps, blockers
```

### 2. Check for Blockers

```
If blockers exist in working-set.md:
  - Report them before proceeding
  - If blocked, return `{PHASE} BLOCKED`
```

### 3. Summarize Active Rules

```
Output: "Following constraints: [top 3-5 from working-set.md]"
```

### 4. Query KB (if working-set sparse)

```javascript
kb_search({ query: "constraints for {story_domain}", entry_type: "constraint", limit: 5 })
kb_search({ query: "decisions for {story_area}", entry_type: "decision", limit: 3 })
kb_list_tasks({ source_story_id: "{story_id}", status: "open" })
```

---

## Session Close (KBMEM-013)

At the END of every run:

### 1. Update working-set.md

- Mark completed actions as `[x]`
- Add results to recent_actions
- Update next_steps
- Add/remove blockers as discovered
- Update phase if transitioning

### 2. Write Back to KB

```javascript
// If notable pattern discovered
kb_add_lesson({
  title: "Implementation pattern: {description}",
  story_id: "{STORY_ID}",
  category: "architecture",
  what_happened: "...",
  resolution: "..."
})

// If follow-up task identified
kb_add_task({
  title: "{task description}",
  task_type: "follow_up",
  source_story_id: "{STORY_ID}",
  source_phase: "{current_phase}"
})

// If constraint discovered
kb_add_constraint({
  constraint: "{rule}",
  rationale: "{why}",
  scope: "{where applicable}"
})
```

### 3. Sync to KB Backup

```javascript
kb_sync_working_set({
  story_id: "{STORY_ID}",
  content: "<working-set.md content>",
  direction: "to_kb"
})
```

---

## Fallback Behavior

| Scenario | Action |
|----------|--------|
| KB unavailable | Queue writes to `_implementation/DEFERRED-KB-WRITES.yaml` |
| working-set.md missing | Query KB for context, create new working-set |
| Blockers found | Report before proceeding, may BLOCK |

---

## Token Tracking

Before reporting completion signal:

```
/token-log {STORY_ID} {phase} <input-tokens> <output-tokens>
```

Include all worker token usage in totals.
