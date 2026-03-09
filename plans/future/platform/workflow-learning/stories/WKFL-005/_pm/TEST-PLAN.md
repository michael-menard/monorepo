# Test Plan: WKFL-005 Doc Sync Agent

## Scope Summary

- **Endpoints touched:** None (file system only)
- **UI touched:** No
- **Data/storage touched:** Yes (filesystem reads/writes)

## Happy Path Tests

### Test 1: Add New Agent File
- **Setup:**
  - Clean git state
  - Create test agent file: `.claude/agents/test-new-agent.agent.md` with valid frontmatter
- **Action:**
  - Run `/doc-sync`
- **Expected outcome:**
  - `SYNC-REPORT.md` generated showing new agent detected
  - `docs/workflow/phases.md` updated with new agent in appropriate section
  - No errors or warnings
- **Evidence:**
  - SYNC-REPORT.md lists test-new-agent.agent.md in `files_changed`
  - Git diff shows additions to phases.md
  - Report shows sections_updated

### Test 2: Modify Existing Agent Frontmatter
- **Setup:**
  - Clean git state
  - Modify existing agent's `model` field from `haiku` to `sonnet`
- **Action:**
  - Run `/doc-sync`
- **Expected outcome:**
  - SYNC-REPORT.md shows modified agent
  - Model Assignments table in docs updated
  - Changelog entry drafted
- **Evidence:**
  - Git diff shows model column updated in table
  - SYNC-REPORT.md contains changelog_entry with version bump
  - Changelog section has [DRAFT] tag

### Test 3: Add Agent with Spawns Field
- **Setup:**
  - Create agent with `spawns: [worker1, worker2]` in frontmatter
- **Action:**
  - Run `/doc-sync`
- **Expected outcome:**
  - Mermaid diagram regenerated showing spawn relationships
  - SYNC-REPORT.md shows diagram regeneration
- **Evidence:**
  - diagrams_regenerated list in SYNC-REPORT.md
  - New Mermaid syntax in docs includes new agent nodes
  - Valid Mermaid syntax (parseable)

### Test 4: Add New Command File
- **Setup:**
  - Create `.claude/commands/test-command.md` with frontmatter
- **Action:**
  - Run `/doc-sync`
- **Expected outcome:**
  - Commands Overview table updated
  - SYNC-REPORT.md shows command file change
- **Evidence:**
  - Commands table has new row
  - SYNC-REPORT.md files_changed includes test-command.md

### Test 5: No Changes Detected
- **Setup:**
  - Clean git state
  - No agent/command changes
- **Action:**
  - Run `/doc-sync`
- **Expected outcome:**
  - SYNC-REPORT.md shows no changes
  - No documentation modifications
  - Success message
- **Evidence:**
  - SYNC-REPORT.md has empty files_changed array
  - Git status shows no modifications to docs

## Error Cases

### Error 1: Invalid Agent Frontmatter
- **Setup:**
  - Create agent file with malformed YAML frontmatter
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - Error message identifying invalid file
  - SYNC-REPORT.md shows parse error
  - No documentation corrupted
- **Evidence:**
  - Error log with file path and line number
  - manual_review_needed in SYNC-REPORT.md
  - Docs remain in valid state

### Error 2: Missing Required Frontmatter Fields
- **Setup:**
  - Create agent without required `created` or `version` fields
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - Warning about missing fields
  - File skipped or marked for review
  - SYNC-REPORT.md notes issue
- **Evidence:**
  - Warning in console output
  - manual_review_needed in SYNC-REPORT.md

### Error 3: Documentation File Not Found
- **Setup:**
  - Rename or move docs/workflow/phases.md
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - Clear error about missing target file
  - No partial writes
  - Graceful failure
- **Evidence:**
  - Error message with expected path
  - Exit code non-zero
  - No corrupted files

## Edge Cases (Reasonable)

### Edge 1: Multiple Simultaneous Changes
- **Setup:**
  - Add 3 new agents
  - Modify 2 existing agents
  - Add 1 new command
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - All changes processed
  - SYNC-REPORT.md lists all 6 files
  - Documentation sections updated correctly
- **Evidence:**
  - 6 entries in files_changed
  - All relevant sections updated
  - No missed updates

### Edge 2: Agent Deletion
- **Setup:**
  - Delete existing agent file
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - Removed from documentation tables
  - Changelog entry about removal
  - Diagrams updated to exclude deleted agent
- **Evidence:**
  - Git diff shows row/entry removal
  - Changelog entry type: "Removed"
  - SYNC-REPORT.md shows deletion

### Edge 3: Large Frontmatter Block
- **Setup:**
  - Agent with 20+ frontmatter fields
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - Parses successfully
  - Only relevant fields extracted
  - No performance degradation
- **Evidence:**
  - Successful sync
  - Correct table values
  - Execution time < 10s

### Edge 4: Special Characters in Agent Description
- **Setup:**
  - Agent description with quotes, pipes, markdown syntax
- **Action:**
  - Run `/doc-sync`
- **Expected:**
  - Description properly escaped in tables
  - Mermaid diagram syntax valid
  - No markdown corruption
- **Evidence:**
  - Table renders correctly in markdown preview
  - No broken formatting
  - Valid Mermaid syntax

### Edge 5: Pre-commit Hook Integration
- **Setup:**
  - Install doc-sync as pre-commit hook
  - Stage agent file change
- **Action:**
  - Attempt commit
- **Expected:**
  - Hook runs doc-sync --check-only
  - Blocks commit if docs out of sync
  - Clear message to user
- **Evidence:**
  - Commit blocked with message
  - Instructions to run /doc-sync
  - Exit code 1

## Required Tooling Evidence

### Backend
- **File system operations:**
  - Read `.claude/agents/*.agent.md`
  - Read `.claude/commands/*.md`
  - Read/write `docs/workflow/*.md`
  - Write `SYNC-REPORT.md`
- **Git operations:**
  - `git diff --cached --name-only` for changed files
  - `git diff` for detailed changes
- **Assertions:**
  - Files exist after sync
  - Valid YAML frontmatter
  - Valid Mermaid syntax
  - No markdown lint errors

### Frontend
- **N/A** - No UI surface

### Command-line Tests
- **Required test harness:**
  ```bash
  # Setup test environment
  ./test/setup-doc-sync-test.sh

  # Run tests
  ./test/doc-sync-happy-path.sh
  ./test/doc-sync-error-cases.sh
  ./test/doc-sync-edge-cases.sh

  # Cleanup
  ./test/cleanup-doc-sync-test.sh
  ```

## Risks to Call Out

### Risk 1: Merge Conflicts
- **Risk:** Concurrent doc edits + doc-sync could cause merge conflicts
- **Mitigation:** Run doc-sync before manual edits, test on clean git state

### Risk 2: Mermaid Syntax Fragility
- **Risk:** Complex agent graphs may generate invalid Mermaid syntax
- **Mitigation:** Validate Mermaid syntax after generation, fallback to simplified diagram

### Risk 3: Performance with Large Agent Count
- **Risk:** Scanning 100+ agents may be slow
- **Mitigation:** Cache parsed frontmatter, only re-parse changed files

### Risk 4: Documentation Structure Changes
- **Risk:** If docs/workflow/ structure changes significantly, section mapping breaks
- **Mitigation:** Version the section mapping, warn on unknown sections

### Risk 5: Missing Manual Review Items
- **Risk:** Agent may not detect all documentation drift scenarios
- **Mitigation:** manual_review_needed section in SYNC-REPORT.md for edge cases
