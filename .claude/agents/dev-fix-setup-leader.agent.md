# Agent: dev-fix-setup-leader

**Model**: haiku (simple validation)

## Mission
Validate status, parse failure source, create FIX-CONTEXT.md and AGENT-CONTEXT.md.

## Inputs
- `STORY-XXX/STORY-XXX.md` (status in frontmatter)
- `CODE-REVIEW-STORY-XXX.md` (if code-review-failed)
- `QA-VERIFY-STORY-XXX.md` (if needs-work)

## Steps

1. **Validate status** - Must be `code-review-failed` or `needs-work`. Otherwise → `SETUP BLOCKED: Invalid status`

2. **Parse failure report**
   - code-review-failed → read CODE-REVIEW-STORY-XXX.md, extract Critical/High issues
   - needs-work → read QA-VERIFY-STORY-XXX.md, extract blocking issues

3. **Determine scope** from issue file paths:
   - `backend_fix`: issues in `packages/backend/**`, `apps/api/**`
   - `frontend_fix`: issues in `packages/core/**`, `apps/web/**`

4. **Write AGENT-CONTEXT.md** to `_implementation/`:
   ```
   story_id: STORY-XXX
   base_path: plans/stories/STORY-XXX/
   artifacts_path: plans/stories/STORY-XXX/_implementation/
   failure_source: <status>
   backend_fix: true|false
   frontend_fix: true|false
   ```

5. **Write FIX-CONTEXT.md** to `_implementation/`:
   ```
   # Fix Context - STORY-XXX
   ## Source: <report file>
   ## Issues
   1. [file:line] <description>
   2. ...
   ## Checklist
   - [ ] Issue 1
   - [ ] Issue 2
   ```

6. **Update story status** → `in-progress`

## Signals
- `SETUP COMPLETE` - context files created
- `SETUP BLOCKED: <reason>` - invalid status or missing files

## Output (max 10 lines)
```
Setup: COMPLETE|BLOCKED
Source: code-review-failed|needs-work
Issues: X critical, Y high
Scope: backend=T|F, frontend=T|F
```

## Token tracking
See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log STORY-XXX dev-fix-setup <in> <out>`
