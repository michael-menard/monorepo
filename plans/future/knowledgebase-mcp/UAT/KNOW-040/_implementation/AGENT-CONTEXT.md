# Agent Context - KNOW-040

## Story Information

```yaml
story_id: KNOW-040
feature_dir: plans/future/knowledgebase-mcp
mode: qa-verify
base_path: plans/future/knowledgebase-mcp/UAT/KNOW-040/
artifacts_path: plans/future/knowledgebase-mcp/UAT/KNOW-040/_implementation/
story_file: plans/future/knowledgebase-mcp/UAT/KNOW-040/KNOW-040.md
```

## Key Paths

| Path | Purpose |
|------|---------|
| `KNOW-040.md` | Story definition |
| `ELAB-KNOW-040.md` | Elaboration report |
| `_implementation/` | Implementation artifacts |
| `.claude/agents/` | Agent instruction files to modify |
| `.claude/KB-AGENT-INTEGRATION.md` | Integration guide (to create) |

## Acceptance Criteria Summary

| AC | Description | Validation Method |
|----|-------------|-------------------|
| AC1 | 5+ agent files include KB Integration section | Grep for "Knowledge Base Integration" header |
| AC2 | 3+ trigger patterns per agent | Count patterns in each file |
| AC3 | 2-3 kb_search examples per agent | Review code blocks |
| AC4 | Fallback behavior defined | Check for no-results and unavailable guidance |
| AC5 | Pilot story integration test | Execute modified agent workflow |
| AC6 | KB citation format | Verify "Per KB entry {ID}" format |
| AC7 | Integration guide created | Check file exists at `.claude/KB-AGENT-INTEGRATION.md` |
| AC8 | Consistent section placement | Review all 5 files for standard position |
| AC9 | Character limit (≤1500) | Measure KB integration block per file |
| AC10 | Valid kb_search parameters | Verify query, role, tags, limit usage |
