---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: worker
agents: ["doc-sync.agent.md"]
---

/doc-sync [flags]

Automatically synchronize workflow documentation (`docs/workflow/`) with agent and command file changes.

## Usage

```bash
# Full sync - update all documentation
/doc-sync

# Check-only mode - verify sync without modifying files (for pre-commit hook)
/doc-sync --check-only

# Force sync - process all files regardless of git status
/doc-sync --force
```

---

## What It Does

1. **Detects Changes** - Scans `.claude/agents/` and `.claude/commands/` for added/modified/deleted files
2. **Parses Frontmatter** - Extracts metadata (model, spawns, triggers, etc.) from YAML frontmatter
3. **Updates Documentation** - Modifies tables and sections in `docs/workflow/` files
4. **Regenerates Diagrams** - Creates Mermaid diagrams from spawn relationships
5. **Drafts Changelog** - Proposes version bump and changelog entry
6. **Generates Report** - Creates `SYNC-REPORT.md` with all changes

---

## Flags

| Flag | Purpose |
|------|---------|
| `--check-only` | Dry-run mode - detect out-of-sync docs without modifying files (exit 1 if out of sync) |
| `--force` | Process all agent/command files regardless of git status |

---

## Output

### SYNC-REPORT.md

Generated in current directory with sections:

- **Files Changed** - List of agent/command files added/modified/deleted
- **Sections Updated** - Documentation sections modified
- **Diagrams Regenerated** - Mermaid diagrams created/updated
- **Manual Review Needed** - Items requiring human attention (invalid YAML, unknown patterns, etc.)
- **Changelog Entry** - Proposed version and description
- **Summary** - Counts and success status

### Modified Files

The agent may update these documentation files:

- `docs/workflow/phases.md` - Agent tables, spawn diagrams
- `docs/workflow/README.md` - Commands overview
- `docs/workflow/agent-system.md` - Architecture agents
- `docs/workflow/orchestration.md` - Cross-cutting agents
- `docs/workflow/changelog.md` - Version history

---

## Pre-Commit Hook (Optional)

To automatically verify documentation sync before committing agent/command changes:

### Installation

1. Create `.git/hooks/pre-commit` with the following content:

```bash
#!/bin/bash
# Pre-commit hook to verify documentation sync

# Check if agent/command files are in the commit
if git diff --cached --name-only | grep -qE '\.claude/(agents|commands)/'; then
  echo "🔍 Agent/command files changed, checking documentation sync..."
  
  # Run doc-sync in check-only mode
  /doc-sync --check-only
  
  if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERROR: Documentation out of sync with agent changes."
    echo ""
    echo "To fix:"
    echo "  1. Run: /doc-sync"
    echo "  2. Review SYNC-REPORT.md"
    echo "  3. Stage updated docs: git add docs/workflow/"
    echo "  4. Commit again"
    echo ""
    exit 1
  fi
  
  echo "✅ Documentation is in sync"
fi

exit 0
```

2. Make the hook executable:

```bash
chmod +x .git/hooks/pre-commit
```

### How It Works

- **Triggers** on commits that modify `.claude/agents/` or `.claude/commands/`
- **Runs** `/doc-sync --check-only` to verify sync
- **Blocks commit** if documentation is out of sync
- **Prompts** user to run `/doc-sync` and stage updated docs

### Disable/Bypass

```bash
# Temporarily disable for a single commit
git commit --no-verify

# Permanently disable
rm .git/hooks/pre-commit
```

---

## When to Run

### Manual Runs

- After creating a new agent file
- After modifying agent frontmatter (model, spawns, triggers)
- After creating/modifying command files
- Before creating a PR with agent/command changes

### Automatic Runs (via hook)

- On `git commit` when `.claude/` files are staged

---

## Section Mapping

The agent uses filename patterns to determine which documentation section to update:

| Agent Pattern | Documentation Section |
|---------------|-----------------------|
| `pm-*.agent.md` | `docs/workflow/phases.md` - Phase 2: PM Story Generation |
| `elab-*.agent.md` | `docs/workflow/phases.md` - Phase 3: QA Elaboration |
| `dev-*.agent.md` | `docs/workflow/phases.md` - Phase 4: Dev Implementation |
| `code-review-*.agent.md` | `docs/workflow/phases.md` - Phase 5: Code Review |
| `qa-*.agent.md` | `docs/workflow/phases.md` - Phase 6/7: QA Verification |
| `architect-*.agent.md` | `docs/workflow/agent-system.md` - Architecture Agents |
| `workflow-*.agent.md` | `docs/workflow/orchestration.md` - Cross-Cutting Concerns |
| `*.md` (commands) | `docs/workflow/README.md` - Commands Overview |

**Unknown patterns** are flagged in SYNC-REPORT.md for manual review.

---

## Examples

### Example 1: Sync After Creating New Agent

```bash
# Create new agent
vim .claude/agents/dev-implement-contracts.agent.md

# Sync documentation
/doc-sync

# Review changes
cat SYNC-REPORT.md
git diff docs/workflow/

# Commit agent + updated docs
git add .claude/agents/dev-implement-contracts.agent.md
git add docs/workflow/phases.md
git add docs/workflow/changelog.md
git commit -m "feat: add contracts implementation agent"
```

### Example 2: Pre-Commit Hook Workflow

```bash
# Modify existing agent
vim .claude/agents/dev-implement-backend-coder.agent.md

# Stage changes
git add .claude/agents/dev-implement-backend-coder.agent.md

# Attempt commit (hook triggers)
git commit -m "fix: update backend coder model"
# → Hook detects out-of-sync docs, blocks commit

# Sync documentation
/doc-sync

# Review and stage updated docs
cat SYNC-REPORT.md
git add docs/workflow/

# Commit again (hook passes)
git commit -m "fix: update backend coder model"
# → Success!
```

### Example 3: Check-Only Mode

```bash
# Verify documentation is in sync
/doc-sync --check-only

# Exit codes:
# 0 = In sync
# 1 = Out of sync (SYNC-REPORT.md shows what needs updating)
```

---

## Troubleshooting

### "Documentation out of sync" but no changes visible

**Cause:** Agent frontmatter may have been updated without version bump.

**Fix:** 
1. Review SYNC-REPORT.md to see what changed
2. Update agent's `updated` and `version` fields
3. Run `/doc-sync` again

### "Invalid YAML frontmatter" warnings

**Cause:** Malformed YAML in agent/command file.

**Fix:**
1. Check SYNC-REPORT.md for affected files
2. Validate YAML syntax (indentation, colons, quotes)
3. Run `/doc-sync` again

### Mermaid diagram validation failed

**Cause:** Generated diagram has syntax errors.

**Fix:**
1. SYNC-REPORT.md shows which diagram failed
2. Agent preserves existing diagram (no data loss)
3. Manually review `spawns` field in affected agent
4. Optionally fix diagram manually or update `spawns` field

---

## Version History

### 1.0.0 - 2026-02-07

- Initial release
- Git diff-based change detection
- Frontmatter parsing
- Documentation table updates
- Mermaid diagram generation
- Changelog drafting
- SYNC-REPORT.md generation
- Check-only mode for pre-commit hooks

---

## Agent Details

**Agent:** `doc-sync.agent.md`
**Model:** haiku (fast text processing)
**Tools:** Read, Grep, Glob, Write, Edit, Bash

**Token Budget:**
- Input: ~5,000-10,000 tokens per run
- Output: ~2,000-5,000 tokens per run

**Performance:** Typically completes in 10-30 seconds for standard changes.

---

## Related Commands

- `/pm-story` - Generate new story (may create new agents)
- `/dev-implement-story` - Implement story (may update agent metadata)
- `/elab-story` - Elaborate story (may update elaboration agents)

---

## Future Enhancements

Documented in `WKFL-005` story artifacts but not yet implemented:

- Watch mode for continuous sync during development
- Configuration file for custom section mappings
- Integration with mermaid-cli for diagram validation
- Automatic PR creation for doc updates
- Intelligent diff-based updates (only changed sections)
