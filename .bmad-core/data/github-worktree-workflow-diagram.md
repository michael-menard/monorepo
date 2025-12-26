# GitHub + Worktree Workflow - Visual Diagram

## Complete Flow with QA Gates

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Story Creation (SM Agent)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  @sm                                                                 │
│  *draft                                                              │
│    ↓                                                                 │
│  Creates: docs/stories/epic-X.Y-story-name.md                       │
│    ↓                                                                 │
│  *create-issue                                                       │
│    ↓                                                                 │
│  Creates: GitHub Issue #123                                         │
│  Links:   Story ←→ Issue                                            │
│                                                                      │
│  Output:                                                             │
│  ✓ Story file with issue reference                                  │
│  ✓ GitHub issue with story details                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Start Development (Dev Agent)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  @dev                                                                │
│  *start-work                                                         │
│    ↓                                                                 │
│  Reads: Issue #123 from story                                       │
│  Asks:  Branch type? (feature/bug/hotfix/etc.)                      │
│  Asks:  Scope? (gallery/main-app/ui/etc.)                           │
│  Asks:  Base branch? (main/develop)                                 │
│    ↓                                                                 │
│  git checkout main                                                   │
│  git pull origin main                                                │
│    ↓                                                                 │
│  git worktree add tree/feature/gallery-123 -b feature/gallery-123   │
│    ↓                                                                 │
│  Updates: Story file with worktree info                             │
│                                                                      │
│  Output:                                                             │
│  ✓ Worktree: tree/feature/gallery-123/                              │
│  ✓ Branch:   feature/gallery-123                                    │
│  ✓ Type:     feature                                                │
│  ✓ Scope:    gallery                                                │
│  ✓ Story updated with dev environment info                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Implementation (Dev Agent)                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  cd tree/feature/gallery-123/                                        │
│  @dev                                                                │
│  *develop-story                                                      │
│    ↓                                                                 │
│  For each task:                                                      │
│    - Implement code                                                  │
│    - Write tests                                                     │
│    - Run validations                                                 │
│    - Update story checkboxes                                         │
│    - Update File List                                                │
│    ↓                                                                 │
│  All tasks complete                                                  │
│    ↓                                                                 │
│  Run story-dod-checklist                                             │
│    ↓                                                                 │
│  Set story status: "Ready for Review"                               │
│                                                                      │
│  Output:                                                             │
│  ✓ All tasks implemented and tested                                 │
│  ✓ All tests passing                                                 │
│  ✓ Story marked "Ready for Review"                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Open PR (Dev Agent)                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  @dev                                                                │
│  *finish-work                                                        │
│    ↓                                                                 │
│  Verifies:                                                           │
│    ✓ All changes committed                                          │
│    ✓ All tests passing                                              │
│    ✓ Story status = "Ready for Review"                              │
│    ↓                                                                 │
│  git push origin feature-issue-123-slug                             │
│    ↓                                                                 │
│  gh pr create \                                                      │
│    --title "Story Title" \                                           │
│    --body "[Story details, AC, tests]" \                            │
│    --base main \                                                     │
│    --head feature-issue-123-slug \                                  │
│    --label "ready-for-review"                                       │
│    ↓                                                                 │
│  gh issue comment #123 "PR created: #45"                            │
│    ↓                                                                 │
│  Updates: Story file with PR info                                   │
│                                                                      │
│  Output:                                                             │
│  ✓ PR #45 created and linked to Issue #123                          │
│  ✓ Worktree KEPT ACTIVE for potential fixes                         │
│  ✓ Story updated with PR details                                    │
│                                                                      │
│  Handoff: "Ready for QA - @qa *review {story}"                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: QA Review (QA Agent)                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  @qa                                                                 │
│  *review docs/stories/epic-X.Y-story.md                             │
│    ↓                                                                 │
│  Runs comprehensive review:                                          │
│    - Requirements traceability                                       │
│    - Test coverage analysis                                          │
│    - Risk assessment                                                 │
│    - NFR validation                                                  │
│    - Code quality check                                              │
│    ↓                                                                 │
│  Creates gate decision:                                              │
│    qa/gates/epic-X.Y-story-slug.yml                                 │
│    ↓                                                                 │
│  Updates story QA Results section                                   │
│                                                                      │
│  Decision: PASS / CONCERNS / FAIL / WAIVED                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
           ↓                                    ↓
    ┌──────────┐                         ┌──────────┐
    │   PASS   │                         │   FAIL   │
    └──────────┘                         └──────────┘
           ↓                                    ↓
┌──────────────────────────┐      ┌──────────────────────────────┐
│ QA Approves & Merges     │      │ QA Rejects - Back to Dev     │
├──────────────────────────┤      ├──────────────────────────────┤
│                          │      │                              │
│ @qa                      │      │ QA updates story with issues │
│ *approve-and-merge       │      │   ↓                          │
│   ↓                      │      │ Dev fixes in same worktree   │
│ Verifies PR mergeable    │      │   ↓                          │
│   ↓                      │      │ cd tree/feature-issue-123/   │
│ gh pr merge #45 --squash │      │ @dev                         │
│   ↓                      │      │ *develop-story               │
│ gh issue close #123      │      │   ↓                          │
│   ↓                      │      │ Fix issues, commit, push     │
│ git worktree remove      │      │   ↓                          │
│   ↓                      │      │ Update PR (auto-updates)     │
│ git worktree prune       │      │   ↓                          │
│   ↓                      │      │ Back to QA review            │
│ Updates story:           │      │                              │
│   Status: Done           │      └──────────────────────────────┘
│   PR: Merged             │
│   Issue: Closed          │
│   Worktree: Removed      │
│                          │
│ ✅ COMPLETE!             │
│                          │
└──────────────────────────┘
```

## Key Points

### 🔒 **QA Gate Enforcement**
- Dev agent NEVER merges or closes issues
- Dev agent opens PR and hands off to QA
- QA agent has final merge authority

### 🌳 **Worktree Lifecycle**
- Created: When dev starts work
- Active: During development and QA review
- Removed: Only after QA approves and merges

### 🔄 **Iteration Support**
- Worktree stays active during QA review
- If QA rejects, dev continues in same worktree
- No need to recreate environment for fixes

### 🔗 **Traceability Chain**
```
Story File ←→ GitHub Issue ←→ Branch ←→ Worktree ←→ PR ←→ Merge Commit
```

## Agent Responsibilities

| Agent | Creates | Updates | Merges | Closes |
|-------|---------|---------|--------|--------|
| **SM** | Story, Issue | Story | ❌ | ❌ |
| **Dev** | Worktree, Branch, PR | Story (dev sections) | ❌ | ❌ |
| **QA** | Gate Decision | Story (QA section) | ✅ | ✅ |

## Directory Structure During Workflow

```
/
├── docs/
│   └── stories/
│       └── epic-1.1-user-auth.md          # Story file (all agents update)
├── qa/
│   └── gates/
│       └── epic-1.1-user-auth.yml         # QA gate decision
├── tree/                                   # Worktrees (dev creates, QA removes)
│   ├── feature/
│   │   ├── gallery-123/                   # Feature worktree (active)
│   │   └── auth-567/                      # Another feature worktree
│   └── bug/
│       └── main-app-456/                  # Bug fix worktree
└── [main working directory]                # Untouched during feature work
```

