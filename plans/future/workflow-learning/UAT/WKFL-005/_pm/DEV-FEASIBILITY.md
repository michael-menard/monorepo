# Dev Feasibility Review: WKFL-005 Doc Sync Agent

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** Straightforward file parsing and text generation with well-defined inputs/outputs. No complex dependencies or infrastructure requirements.

## Likely Change Surface (Core Only)

### New Files Created
- `.claude/agents/doc-sync.agent.md` - Main agent logic
- `.claude/commands/doc-sync.md` - Command wrapper
- `SYNC-REPORT.md` schema/output (story-level)

### Files Modified
- `docs/workflow/phases.md` - Agent table updates
- `docs/workflow/README.md` - Command table updates (if applicable)
- `docs/workflow/agent-system.md` - Agent architecture updates
- `docs/workflow/changelog.md` - Version entries

### Dependencies
- **Node.js:** For YAML parsing (existing dependency)
- **Git:** For change detection (already present)
- **Filesystem access:** Read/Write operations

## MVP-Critical Risks

### Risk 1: YAML Parsing Failures
- **Why it blocks MVP:** Cannot extract agent metadata without parsing frontmatter
- **Required mitigation:**
  - Use battle-tested YAML parser (js-yaml or similar)
  - Graceful error handling with clear messages
  - Continue processing other files on single file failure

### Risk 2: Documentation File Write Conflicts
- **Why it blocks MVP:** Concurrent edits could corrupt documentation
- **Required mitigation:**
  - Require clean git working directory before sync
  - Atomic file writes (write to temp, then move)
  - Git status check at start

### Risk 3: Invalid Mermaid Generation
- **Why it blocks MVP:** Broken diagrams make docs unusable
- **Required mitigation:**
  - Validate Mermaid syntax before writing
  - Test with mermaid-cli or online validator
  - Fallback: preserve existing diagram on validation failure

## Missing Requirements for MVP

### Requirement 1: Section Mapping Configuration
- **What's needed:** Explicit mapping between agent patterns and doc sections
- **Concrete decision:**
  ```yaml
  section_mapping:
    pm-*.agent.md: "Phase 2: PM Story Generation"
    elab-*.agent.md: "Phase 3: QA Elaboration"
    dev-*.agent.md: "Phase 4: Dev Implementation"
    qa-*.agent.md: "Phase 6/7: QA Verification"
  ```

### Requirement 2: Version Bump Logic
- **What's needed:** Clear rules for semver increment
- **Concrete decision:**
  - New agent file → minor bump (2.5.0 → 2.6.0)
  - Modified agent frontmatter → patch bump (2.5.0 → 2.5.1)
  - Structural change (new phase) → major bump (2.5.0 → 3.0.0)

### Requirement 3: Changelog Entry Format
- **What's needed:** Template for changelog entries
- **Concrete decision:**
  ```markdown
  ## [2.6.0] [DRAFT] - YYYY-MM-DD

  ### Added
  - `agent-name.agent.md` - Brief description

  ### Changed
  - Updated `agent-name` model from haiku to sonnet

  ### Removed
  - Deprecated `old-agent.agent.md`
  ```

## MVP Evidence Expectations

### Core Journey Proof
1. **File Change Detection:**
   - Show git diff output identifying changed agent files
   - Log of files scanned and changes detected

2. **Frontmatter Parsing:**
   - Display parsed YAML objects for test agents
   - Error handling for malformed YAML

3. **Documentation Updates:**
   - Git diff showing before/after of docs/workflow/phases.md
   - Verify table rows added/updated correctly

4. **Mermaid Generation:**
   - Generated Mermaid code in output
   - Validation result (pass/fail)
   - Screenshot of rendered diagram

5. **SYNC-REPORT.md:**
   - Complete report showing all sections
   - Accurate file counts and change summary

### CI/Deploy Checkpoints
- N/A - Local-only tool, no deployment

---

# FUTURE-RISKS.md

## Non-MVP Risks

### Risk 1: Performance with 200+ Agents
- **Impact:** Slow sync times, user frustration
- **Recommended timeline:** After 100 agents in repo
- **Mitigation:** Implement incremental sync (only changed files)

### Risk 2: Complex Spawn Graph Visualization
- **Impact:** Mermaid diagrams become unreadable with deep nesting
- **Recommended timeline:** After 3-level deep spawn chains
- **Mitigation:** Generate multiple focused diagrams instead of one large graph

### Risk 3: Multi-Repository Support
- **Impact:** Can't sync docs across multiple repos in monorepo
- **Recommended timeline:** If workflow spans multiple repos
- **Mitigation:** Add repo config option, scan multiple .claude/ directories

### Risk 4: Documentation Format Changes
- **Impact:** If docs switch from Markdown to another format
- **Recommended timeline:** Only if format migration planned
- **Mitigation:** Abstract doc writer interface, support pluggable formatters

## Scope Tightening Suggestions

### OUT OF SCOPE for MVP
1. **Automatic git commits:** Manual review and commit preferred for MVP
2. **Pre-commit hook auto-install:** Document manual installation process
3. **Diff-based selective updates:** Full re-sync is acceptable for MVP
4. **Multi-format output:** Markdown only for MVP (no HTML/PDF)
5. **Remote documentation sync:** Local filesystem only for MVP

### Clarifications for Future Iterations
1. **Watch mode:** Auto-sync on file change (future enhancement)
2. **Dry-run mode:** Preview changes before applying (nice-to-have)
3. **Rollback capability:** Undo sync if mistakes detected (future)
4. **Custom templates:** User-defined doc templates (future)

## Future Requirements

### Nice-to-Have Features
1. **Interactive mode:** Confirm each change before applying
2. **Partial sync:** Only sync specific agents or sections
3. **Change statistics:** Track documentation churn over time
4. **Integration tests:** Automated verification of sync accuracy

### Polish and Edge Cases
1. **Progress indicators:** Show scanning/updating progress for large repos
2. **Colorized output:** SYNC-REPORT.md with color-coded changes
3. **Conflict resolution:** Smart merge strategies for concurrent edits
4. **Backup/restore:** Snapshot docs before sync for safety
