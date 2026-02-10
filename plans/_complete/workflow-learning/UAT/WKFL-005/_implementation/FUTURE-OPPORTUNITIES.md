# WKFL-005 Future Opportunities

This document captures non-blocking enhancements identified during elaboration. These are **NOT required for MVP** but may be valuable for future iterations.

---

## Opportunity 1: Formal SYNC-REPORT Schema

**Priority:** Low
**Effort:** 0.5 hours
**Impact:** Quality enhancement

### Description
Create a formal Zod schema for SYNC-REPORT.md output format to ensure consistent structure and enable validation.

### Current State
AC-5 describes the report fields in prose:
- files_changed (list)
- sections_updated (list)
- diagrams_regenerated (list)
- manual_review_needed (list)
- changelog_entry (object)

### Proposal
```typescript
import { z } from 'zod'

const SyncReportSchema = z.object({
  run_timestamp: z.string().datetime(),
  files_changed: z.array(z.object({
    path: z.string(),
    change_type: z.enum(['added', 'modified', 'deleted']),
    agent_name: z.string().optional(),
  })),
  sections_updated: z.array(z.object({
    file: z.string(),
    section: z.string(),
    change_summary: z.string(),
  })),
  diagrams_regenerated: z.array(z.object({
    file: z.string(),
    diagram_name: z.string(),
    node_count: z.number(),
  })),
  manual_review_needed: z.array(z.object({
    reason: z.string(),
    affected_files: z.array(z.string()),
    suggestion: z.string().optional(),
  })),
  changelog_entry: z.object({
    version: z.string(),
    version_bump: z.enum(['major', 'minor', 'patch']),
    description: z.string(),
    draft: z.boolean(),
  }),
  summary: z.object({
    total_files_changed: z.number(),
    total_sections_updated: z.number(),
    total_diagrams_regenerated: z.number(),
    success: z.boolean(),
  }),
})

type SyncReport = z.infer<typeof SyncReportSchema>
```

### Benefits
- Type safety for report generation
- Schema documentation as code
- Validation at runtime
- Consistent with project's Zod-first approach (see CLAUDE.md)

### When to Implement
When the agent is converted to TypeScript or when report parsing/validation is needed.

---

## Opportunity 2: Smart Change Detection Strategy

**Priority:** Low
**Effort:** 1 hour
**Impact:** User experience enhancement

### Description
Implement intelligent change detection that handles multiple scenarios gracefully.

### Current State
Story mentions "via git diff or file timestamps" but doesn't specify the primary method.

### Proposal
Implement a fallback strategy:

```bash
# Priority 1: Pre-commit hook scenario (staged changes)
if [[ -n "$PRECOMMIT_MODE" ]]; then
  git diff --cached --name-only | grep -E '\.claude/(agents|commands)/'

# Priority 2: Manual run with uncommitted changes
elif [[ -n "$(git status --porcelain .claude/agents/ .claude/commands/)" ]]; then
  git diff HEAD --name-only .claude/agents/ .claude/commands/

# Priority 3: Scan all files (fallback)
else
  find .claude/agents/ .claude/commands/ -name "*.agent.md" -o -name "*.md"
fi
```

### Benefits
- Works in pre-commit hooks (staged changes)
- Works for manual runs (uncommitted changes)
- Graceful degradation if git not available

### When to Implement
If users report confusion about which files are detected or if the pre-commit hook scenario doesn't work as expected.

---

## Opportunity 3: Mermaid Validation Enhancement

**Priority:** Low
**Effort:** 2 hours
**Impact:** Quality enhancement

### Description
Add robust Mermaid syntax validation with helpful error messages.

### Current State
Story says "Validate syntax using mermaid-cli or regex validator" with fallback to preserve existing diagram.

### Proposal

**Phase 1 (MVP):** Regex validation
```javascript
// Basic syntax validation
function validateMermaidSyntax(diagram) {
  const errors = []

  // Check for basic structure
  if (!diagram.match(/^(graph|flowchart|sequenceDiagram)/)) {
    errors.push("Missing diagram type declaration")
  }

  // Check for balanced brackets
  const openBrackets = (diagram.match(/\[/g) || []).length
  const closeBrackets = (diagram.match(/\]/g) || []).length
  if (openBrackets !== closeBrackets) {
    errors.push(`Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`)
  }

  // Check for arrow syntax
  if (!diagram.match(/-->/)) {
    errors.push("No valid arrows found")
  }

  return errors
}
```

**Phase 2 (Future):** Integration with @mermaid-js/mermaid-cli
```bash
# Optional enhanced validation
if command -v mmdc &> /dev/null; then
  echo "$diagram" | mmdc --validate
fi
```

### Benefits
- Catch syntax errors before writing to docs
- Helpful error messages for manual correction
- No hard dependency on mermaid-cli

### When to Implement
If generated diagrams frequently have syntax errors or if users request better validation.

---

## Opportunity 4: Configuration File for Section Mapping

**Priority:** Low
**Effort:** 1 hour
**Impact:** Extensibility enhancement

### Description
Extract section mapping to a configuration file for easier customization.

### Current State
Section mapping is specified in Architecture Notes as YAML but may be hardcoded in agent logic.

### Proposal
Create `.claude/config/doc-sync-mapping.yaml`:

```yaml
# Doc Sync Section Mapping Configuration
version: 1.0.0

# Map agent filename patterns to documentation sections
section_mapping:
  pm-*.agent.md:
    file: docs/workflow/phases.md
    section: "Phase 2: PM Story Generation"
    table: "Agents & Sub-Agents"

  elab-*.agent.md:
    file: docs/workflow/phases.md
    section: "Phase 3: QA Elaboration"
    table: "Agents & Sub-Agents"

  dev-*.agent.md:
    file: docs/workflow/phases.md
    section: "Phase 4: Dev Implementation"
    table: "Agents & Sub-Agents"

  code-review-*.agent.md:
    file: docs/workflow/phases.md
    section: "Phase 5: Code Review"
    table: "Agents & Sub-Agents"

  qa-*.agent.md:
    file: docs/workflow/phases.md
    section: "Phase 6/7: QA Verification"
    table: "Agents & Sub-Agents"

  workflow-*.agent.md:
    file: docs/workflow/orchestration.md
    section: "Cross-Cutting Concerns"
    table: "Workflow Agents"

# Diagram generation settings
diagram_config:
  max_depth: 3  # Maximum spawn depth to visualize
  group_by_phase: true
  include_model_labels: true

# Changelog settings
changelog_config:
  file: docs/workflow/changelog.md
  draft_marker: "[DRAFT]"
  version_pattern: "## Version {version} - {date}"
```

### Benefits
- Easy to modify mapping without editing agent code
- Supports custom documentation structures
- Version-controlled configuration

### When to Implement
If the documentation structure changes or if other projects want to reuse the agent with different mappings.

---

## Opportunity 5: Watch Mode for Continuous Sync

**Priority:** Low
**Effort:** 3 hours
**Impact:** User experience enhancement

### Description
Add a `--watch` mode that automatically syncs documentation when agent files change.

### Current State
Story Non-Goals explicitly excludes "Watch mode or continuous sync" - this is intentional for MVP.

### Proposal
Add optional watch mode using file system watchers:

```bash
# /doc-sync --watch
# Continuously monitor .claude/agents/ and .claude/commands/
# Run sync when changes detected
```

Implementation using `chokidar` or similar:
```javascript
const watcher = chokidar.watch(['.claude/agents/**/*.agent.md', '.claude/commands/**/*.md'])

watcher.on('change', (path) => {
  console.log(`Change detected: ${path}`)
  runDocSync({ files: [path] })
})
```

### Benefits
- Real-time documentation updates during development
- Reduces friction (no need to remember to run command)

### Drawbacks
- Increases complexity
- May create noise with frequent updates
- Pre-commit hook may be sufficient for most users

### When to Implement
If users report that documentation frequently gets out of sync even with the pre-commit hook available. Validate demand before building.

---

## Opportunity 6: Diff Preview Mode

**Priority:** Medium
**Effort:** 2 hours
**Impact:** User experience enhancement

### Description
Add a `--preview` flag that shows what would change without actually modifying files.

### Current State
Story mentions `--check-only` flag for pre-commit validation but not a preview mode.

### Proposal
```bash
# /doc-sync --preview
# Shows git-style diff of what would be changed
# Useful for reviewing changes before committing
```

Output example:
```diff
Files to be updated:
  docs/workflow/phases.md

Section: Phase 4: Dev Implementation
--- Before
+++ After
@@ -42,6 +42,7 @@
| pm-story-generation-leader.agent.md | Sonnet |
| elab-completion-leader.agent.md | Haiku |
| dev-implement-implementation-leader.agent.md | Sonnet |
+| dev-implement-new-feature.agent.md | Haiku |

Diagrams to be regenerated:
  - Agent Spawn Relationships (docs/workflow/phases.md)

Changelog entry to be drafted:
  Version 2.6.0 - 2026-02-07
  - Added dev-implement-new-feature agent
```

### Benefits
- Builds confidence before running actual sync
- Helps catch unexpected changes
- Educational (shows exactly what the agent will do)

### When to Implement
After MVP is stable and users are comfortable with basic usage. Preview mode is a quality-of-life feature, not essential for core functionality.

---

## Opportunity 7: Lock File for Concurrent Run Protection

**Priority:** Low
**Effort:** 1 hour
**Impact:** Robustness enhancement

### Description
Add lock file mechanism to prevent concurrent /doc-sync runs from conflicting.

### Current State
Error handling says "Concurrent file edits → Require clean git working directory" which provides basic protection.

### Proposal
Create a simple lock file mechanism:

```bash
LOCK_FILE=".claude/.doc-sync.lock"

# Before starting sync
if [[ -f "$LOCK_FILE" ]]; then
  echo "ERROR: Another doc-sync process is running (lock file exists)"
  echo "If this is a stale lock, remove: $LOCK_FILE"
  exit 1
fi

# Create lock
echo "$$" > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# Run sync...

# Lock automatically removed on exit
```

### Benefits
- Prevents race conditions in automated environments
- Clear error messages if lock is stale

### Drawbacks
- Adds complexity
- Stale locks possible if process killed abruptly

### When to Implement
Only if concurrent runs become a real issue in practice (e.g., in CI/CD pipelines or with watch mode). For manual usage, this is unlikely to be needed.

---

## Opportunity 8: Metrics and Analytics

**Priority:** Low
**Effort:** 2 hours
**Impact:** Process improvement

### Description
Track metrics about documentation sync frequency and patterns.

### Proposal
Append metrics to a log file:

```yaml
# .claude/logs/doc-sync-metrics.yaml
- timestamp: 2026-02-07T10:30:00Z
  files_changed: 3
  sections_updated: 5
  diagrams_regenerated: 2
  duration_ms: 1250
  success: true

- timestamp: 2026-02-07T14:15:00Z
  files_changed: 1
  sections_updated: 1
  diagrams_regenerated: 0
  duration_ms: 450
  success: true
```

Generate periodic reports:
- Most frequently changed agents
- Average sync duration
- Common error patterns
- Adoption metrics (if pre-commit hook is used)

### Benefits
- Understand documentation drift patterns
- Identify agents that change most often
- Optimize sync performance
- Validate that automation is being used

### When to Implement
After MVP has been in use for a month. Metrics are only valuable once there's baseline data.

---

## Implementation Priority

If implementing future opportunities, suggested order:

1. **Opportunity 6** (Diff Preview Mode) - High user value, moderate effort
2. **Opportunity 1** (Formal Schema) - Aligns with project standards, low effort
3. **Opportunity 2** (Smart Change Detection) - Improves robustness, low effort
4. **Opportunity 4** (Config File) - Enables extensibility, moderate effort
5. **Opportunity 3** (Mermaid Validation) - Quality improvement, moderate effort
6. **Opportunity 8** (Metrics) - Process insights, moderate effort
7. **Opportunity 5** (Watch Mode) - High effort, validate demand first
8. **Opportunity 7** (Lock File) - Only if needed, low effort

---

## Notes

All opportunities are **non-blocking** and should NOT delay MVP implementation. The story is ready to implement as-written.

These opportunities can be addressed:
- During implementation (if time allows)
- In follow-up stories
- Based on user feedback after MVP launch
- Never (if not needed)
