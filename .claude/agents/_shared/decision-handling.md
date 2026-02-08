# Decision Handling Protocol

When you encounter a decision point during execution, follow this protocol to determine whether to escalate to the user or proceed autonomously.

---

## Step 1: Classify the Decision Tier

Read `.claude/config/decision-classification.yaml` for pattern matching, but use these definitions:

| Tier | Name | Examples |
|------|------|----------|
| 1 | **Clarification** | File naming, import order, which existing pattern to follow |
| 2 | **Preference** | Component library choice, state management, API format |
| 3 | **Ambiguous Scope** | "Add validation" (which fields?), "improve performance" (how?) |
| 4 | **Destructive** | Delete files, drop tables, force push, production changes |
| 5 | **External Dependency** | Add npm package, infrastructure change, third-party API |

### Quick Classification

Ask yourself:
- **Will this delete or destroy something?** → Tier 4 (ALWAYS escalate)
- **Does this require installing something external?** → Tier 5
- **Are there multiple valid approaches the user might care about?** → Tier 2
- **Is the requirement ambiguous or interpretable multiple ways?** → Tier 3
- **Is there a reasonable default I can use?** → Tier 1

---

## Step 2: Check Autonomy Level

The autonomy level is passed via `--autonomous=LEVEL` flag or defaults to `conservative`.

Read from context or default:
```
autonomy_level = context.autonomous || "conservative"
```

### Decision Matrix

| Tier | Conservative | Moderate | Aggressive |
|------|--------------|----------|------------|
| 1 (Clarification) | Escalate | **Auto** | **Auto** |
| 2 (Preference) | Escalate | Escalate | **Auto** |
| 3 (Ambiguous) | Escalate | **Auto** | **Auto** |
| 4 (Destructive) | **ESCALATE** | **ESCALATE** | **ESCALATE** |
| 5 (External) | Escalate | Escalate | **Auto** (low-risk only) |

---

## Step 3: Check Project Preferences

Before escalating Tier 2 decisions, check `.claude/config/preferences.yaml`:

```yaml
# If pattern matches a locked project_preference, use it
project_preferences:
  - pattern: "test.*framework"
    choice: vitest
    locked: true  # Cannot be overridden
```

If a locked preference matches → **Auto-accept using that preference**

---

## Step 4: Execute Decision

### If Auto-Accept

1. **Log the decision to KB** using `kb_add_decision`:
   ```javascript
   kb_add_decision({
     title: "{brief decision title}",
     context: "{why this decision was needed}",
     decision: "{the choice made}",
     consequences: "{impact of this choice}",
     story_id: "{STORY_ID}",
     tags: ["{domain}", "auto-accepted", "tier-{N}"]
   })
   ```

2. Proceed with the chosen option

### If Escalate

1. **Check batch mode** (context.batch_mode == true):
   - **Batch mode**: Queue decision, continue with other work
   - **Normal mode**: Stop and ask user immediately

2. **Query KB for prior decisions** on similar topics:
   ```javascript
   kb_search({
     query: "{topic} decision",
     tags: ["architecture"],
     limit: 3
   })
   ```

3. **Format the escalation** (use AskUserQuestion):
   ```markdown
   ## Decision Required: {Title}

   **Tier**: {N} ({category})
   **Context**: {why this decision is needed}
   **Prior Decisions**: {relevant KB results, if any}

   **Options**:
   1. **{Option A}**: {description}
   2. **{Option B}**: {description}

   **Recommendation**: {Option X} because {rationale}
   ```

4. **After user decides**, log to KB:
   ```javascript
   kb_add_decision({
     title: "{decision title}",
     context: "{problem being solved}",
     decision: "{what was decided}",
     consequences: "{outcomes}",
     story_id: "{STORY_ID}",
     tags: ["{domain}", "user-approved", "tier-{N}"]
   })
   ```

---

## Step 5: Handle Moonshots

If the decision matches moonshot patterns (out of scope, future, nice-to-have):

1. Do NOT block on it
2. **Log to KB as a lesson/suggestion** for follow-up:
   ```javascript
   kb_add_lesson({
     title: "Deferred: {brief description}",
     summary: "{what was deferred and why}",
     context: "Story {STORY_ID} - out of scope",
     recommendation: "Consider for follow-up story",
     story_id: "{STORY_ID}",
     tags: ["deferred", "moonshot", "{domain}"]
   })
   ```
3. Continue with current scope

**Note**: Deferred items can be queried later:
```javascript
kb_search({ query: "deferred moonshot", tags: ["deferred"], limit: 10 })
```

---

## Batch Mode Protocol

When `context.batch_mode == true` (set by `/workflow-batch`):

1. **Tier 4 decisions**: Still escalate immediately (never batch destructive)
2. **Tier 1, 3** (if moderate/aggressive): Auto-accept, log to KB
3. **Tier 2, 5**: Queue in memory, present at phase end
4. **At phase end**: Present batch summary to user

### Batch Presentation

At phase end, present queued decisions together:

```markdown
## Batched Decisions ({N} items)

### Auto-Accepted ({N}) - logged to KB
✓ [Tier 1] Test naming → kebab-case
✓ [Tier 3] Validation scope → minimal

### Requires Review ({N})
? [Tier 2] State management approach
  - A) zustand (recommended)
  - B) context

### Deferred ({N}) - logged to KB
→ [Moonshot] Keyboard shortcuts

**Actions**: [A] Approve all / [1-N] Review specific / [R] Reject
```

After user approves, log all decisions to KB with appropriate tags.

---

## Examples

### Example 1: Tier 1 - Clarification

**Situation**: Need to name a test file, existing tests use kebab-case.

```
Tier: 1 (Clarification)
Autonomy: moderate
Decision: Use kebab-case to match existing tests
Action: Auto-accept, log to DECISIONS-AUTO.yaml
```

### Example 2: Tier 2 - Preference (with project preference)

**Situation**: Need to choose a testing framework.

```
Tier: 2 (Preference)
Check preferences.yaml: "test.*framework" → vitest (locked)
Action: Auto-accept using vitest, log rationale
```

### Example 3: Tier 4 - Destructive

**Situation**: Need to delete a directory to clean up.

```
Tier: 4 (Destructive)
Autonomy: ANY
Action: ALWAYS escalate, never auto-accept
```

### Example 4: Moonshot

**Situation**: User story mentions "nice to have" keyboard shortcuts.

```
Pattern match: "nice to have" → moonshot
Action: Log to DEFERRED-BACKLOG.yaml, continue without implementing
```

---

## Reference

- `.claude/agents/_shared/autonomy-tiers.md` - Tier definitions
- `.claude/config/autonomy.yaml` - Level configurations
- `.claude/config/preferences.yaml` - Project preferences
- `.claude/config/decision-classification.yaml` - Pattern rules
