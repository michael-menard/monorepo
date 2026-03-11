# KFMB-3020 Setup Summary

## Story
**Title:** Eliminate stories.index.md — Command Updates  
**Status:** in-progress  
**Phase:** 3: Index & Stage Elimination  
**Story Points:** 3  
**Started:** 2026-03-06T23:35:00Z

## Scope
Replace all filesystem `stories.index.md` reads/writes with KB MCP tool calls across 6 `.claude/commands/` files.

### Files in Scope
1. `.claude/commands/story-update.md` (254 lines)
2. `.claude/commands/pm-story.md` (300+ lines)
3. `.claude/commands/story-status.md` (150+ lines)
4. `.claude/commands/code-audit.md` (250+ lines)
5. `.claude/commands/elab-epic.md` (250+ lines)
6. `.claude/commands/index-update.md` (200+ lines)

### Baseline
- **Current references:** 41 live `stories.index.md` references (grep baseline)
- **Target:** 0 live references (only deprecation notice in index-update.md header)

## Acceptance Criteria (13 total)

### story-update.md
- **AC-1:** Step 4 (index write) completely removed
- **AC-2:** `--no-index` flag deprecated as no-op in Arguments table
- **AC-3:** Integration Test Scenario F updated (no `index_updated` field in result YAML)

### pm-story.md
- **AC-4:** Collision detection uses `kb_list_stories` instead of index file check
- **AC-5:** Step 3 leader context prompt no longer includes Index path
- **AC-6:** Step 4.5 KB seed migration remains intact

### code-audit.md
- **AC-7:** Promote subcommand dedup logic uses KB tools (`kb_search`/`kb_list_stories`)

### elab-epic.md
- **AC-8:** `stories_index` removed from context-init template

### index-update.md
- **AC-9:** Deprecation header added at top of file

### story-status.md
- **AC-10:** Feature Only mode uses `kb_list_stories`
- **AC-11:** `--depth` and `--deps-order` modes use `kb_list_stories`

### Cross-File
- **AC-12:** Zero live `stories.index.md` references across all 6 command files
- **AC-13:** All completion signals preserved (UPDATE COMPLETE, PM COMPLETE, etc.)

## Implementation Plan

### Phase 1: story-update.md
1. Remove entire Step 4 (lines 163-169)
2. Update Arguments table: mark `--no-index` as deprecated
3. Update Integration Test Scenario F result YAML

### Phase 2: pm-story.md
1. Replace collision detection logic (line 115) with `kb_list_stories` query
2. Remove Index path from Step 3 prompt template
3. Keep Step 4.5 unchanged

### Phase 3: story-status.md
1. Update Feature Only mode to use `kb_list_stories`
2. Update `--depth` mode to use `kb_list_stories`
3. Update `--deps-order` mode to use `kb_list_stories`

### Phase 4: code-audit.md
1. Replace promote dedup logic (lines 198-200) with KB tools

### Phase 5: elab-epic.md
1. Identify and remove `stories_index` from context-init template

### Phase 6: index-update.md
1. Add deprecation header

## Artifacts Created
- **CHECKPOINT.yaml:** Phase tracking (phase: setup, iteration: 0)
- **SCOPE.yaml:** Detailed change analysis with AC mapping

## Verification
```bash
# Final verification command
grep -rn 'stories.index.md' .claude/commands/ | grep -v "index-update.md.*Deprecation" | wc -l
# Expected result: 0 (or only deprecation notice lines)
```

## Notes
- This is a docs-only story (no TypeScript, DB, or tests)
- All changes are in markdown command documentation
- No breaking changes to tool behavior — backward compatibility via `--no-index` no-op
- KB tools already available per KFMB-3010 (prerequisite story)
