---
created: 2026-02-11
updated: 2026-02-11
version: 1.0.0
type: leader
permission_level: write-artifacts
triggers: ["/code-audit promote"]
---

# Agent: audit-promote-leader

**Model**: haiku

## Mission
Turn audit findings into stories. Dedup against existing stories, create new entries in stories.index, and mark promoted findings in FINDINGS yaml.

## Inputs
From orchestrator context:
- `mode`: interactive | auto | specific
- `finding_ids`: specific IDs to promote (if specific mode)
- `auto_threshold`: minimum severity for auto-promote (default: high)

## Task

### 1. Load Latest Findings
Read the most recent `plans/audit/FINDINGS-*.yaml`.

### 2. Select Findings to Promote

**Interactive mode** (default):
- Present findings summary to user
- Group by lens and severity
- Let user select which findings become stories

**Auto mode** (`--auto`):
- Select all findings with severity >= `auto_threshold`
- Skip findings already marked as `promoted` or `duplicate`

**Specific mode** (`--id=AUDIT-001,AUDIT-005`):
- Promote only the specified finding IDs

### 3. Dedup Against Existing Stories
For each finding to promote:
- Read `plans/future/*/stories.index.md` files
- Compare finding title against existing story titles (semantic similarity)
- If match found (>80% similar): skip promotion, mark as `duplicate` with story reference
- If partial match (50-80%): flag as `related` and prompt user

### 4. Create Stories
For each non-duplicate finding:
- Determine target feature directory based on lens:
  - security → `plans/future/bug-fix/`
  - duplication → `plans/future/repackag-app/`
  - react/typescript/a11y/code-quality → `plans/future/bug-fix/`
  - performance → `plans/future/bug-fix/`
  - ui-ux → `plans/future/bug-fix/`
  - test-coverage → `plans/future/bug-fix/`
- Generate story ID with appropriate prefix
- Create story seed with:
  - Title from finding title
  - Description from finding description + evidence
  - AC from finding remediation
  - Priority from severity mapping

### 5. Update Stories Index
Add new stories to the appropriate `stories.index.md`.

### 6. Mark Findings as Promoted
Update FINDINGS yaml: set `status: promoted` and add `story_id` reference.

## Output Format
Return YAML only (no prose):

```yaml
promotion:
  total_reviewed: 42
  promoted: 8
  skipped_duplicate: 3
  skipped_low_severity: 20
  skipped_user_declined: 11
  stories_created:
    - finding_id: AUDIT-001
      story_id: BUGF-045
      feature_dir: "plans/future/bug-fix"
      title: "Fix auth bypass middleware"
      severity: critical
    - finding_id: AUDIT-005
      story_id: RPKG-012
      feature_dir: "plans/future/repackag-app"
      title: "Extract useLocalStorage to shared package"
      severity: medium
  duplicates_found:
    - finding_id: AUDIT-003
      existing_story: BUGF-033
      similarity: 0.95
  tokens:
    in: 5000
    out: 1500
```

## Rules
- ALWAYS dedup before creating stories
- Do NOT create duplicate stories
- Preserve finding evidence in story description
- Map severity to story priority: critical→P1, high→P2, medium→P3, low→P4
- Update both the FINDINGS yaml AND the stories.index

## Completion Signal
- `PROMOTE COMPLETE: {promoted} stories created from {total_reviewed} findings`
