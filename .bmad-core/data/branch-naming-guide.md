# Semantic Branch Naming Guide

## Overview

This project uses semantic branch naming to provide clear context about the type of work and which part of the codebase is affected.

## Format

```
{type}/{scope}-{issue-number}
```

### Components

1. **Type** - What kind of work is being done
2. **Scope** - Which app or package is primarily affected
3. **Issue Number** - GitHub issue number for tracking

---

## Types

| Type | Description | Use When |
|------|-------------|----------|
| `feature` | New features or enhancements | Adding new functionality |
| `bug` | Bug fixes | Fixing defects or issues |
| `hotfix` | Urgent production fixes | Critical production issues |
| `refactor` | Code refactoring | Improving code without changing behavior |
| `docs` | Documentation changes | Updating documentation only |
| `test` | Test additions/changes | Adding or modifying tests |

---

## Scopes

### Apps

| Scope | Description | Package/Path |
|-------|-------------|--------------|
| `main-app` | Main user-facing application | `apps/web/main-app` |
| `app-dashboard` | Dashboard application | `apps/web/app-dashboard` |
| `api` | API/backend services | `apps/api` |

### Core Packages

| Scope | Description | Package/Path |
|-------|-------------|--------------|
| `ui` | Component library | `packages/core/app-component-library` (@repo/ui) |
| `logger` | Logging utility | `packages/core/logger` (@repo/logger) |
| `design-system` | Design tokens | `packages/core/design-system` |
| `accessibility` | A11y utilities | `packages/core/accessibility` |

### Feature-Specific

| Scope | Description | Use When |
|-------|-------------|----------|
| `gallery` | Gallery feature | Working on gallery functionality |
| `auth` | Authentication | Auth-related changes |
| `payments` | Payment processing | Payment features |
| `search` | Search functionality | Search-related work |
| `profile` | User profiles | Profile features |
| `settings` | Settings/preferences | Settings functionality |

### Cross-Cutting

| Scope | Description | Use When |
|-------|-------------|----------|
| `monorepo` | Monorepo infrastructure | Build, CI/CD, workspace config |
| `deps` | Dependencies | Dependency updates |
| `config` | Configuration | Config file changes |

---

## Examples

### Feature Development
```
feature/gallery-123        # New gallery feature (issue #123)
feature/auth-567           # New authentication feature (issue #567)
feature/payments-890       # New payment feature (issue #890)
feature/ui-234             # New UI component (issue #234)
```

### Bug Fixes
```
bug/main-app-456          # Bug in main app (issue #456)
bug/api-789               # API bug fix (issue #789)
bug/gallery-345           # Gallery bug fix (issue #345)
bug/logger-678            # Logger bug fix (issue #678)
```

### Hotfixes
```
hotfix/api-999            # Critical API fix (issue #999)
hotfix/auth-888           # Critical auth fix (issue #888)
hotfix/payments-777       # Critical payment fix (issue #777)
```

### Refactoring
```
refactor/ui-234           # Refactor UI components (issue #234)
refactor/api-456          # Refactor API structure (issue #456)
refactor/auth-789         # Refactor auth logic (issue #789)
```

### Documentation
```
docs/main-app-123         # Main app documentation (issue #123)
docs/api-456              # API documentation (issue #456)
docs/monorepo-789         # Monorepo docs (issue #789)
```

### Tests
```
test/gallery-123          # Gallery tests (issue #123)
test/auth-456             # Auth tests (issue #456)
test/ui-789               # UI component tests (issue #789)
```

---

## Benefits

### 🎯 **Clear Intent**
- Type immediately shows what kind of work is being done
- No need to read commit messages to understand branch purpose

### 📦 **Scope Visibility**
- Instantly see which part of the codebase is affected
- Easy to identify cross-team dependencies

### 🔍 **Easy Filtering**
- Filter branches by type: `git branch --list 'feature/*'`
- Filter by scope: `git branch --list '*/gallery-*'`
- Filter by issue: `git branch --list '*-123'`

### 🔗 **Issue Tracking**
- Issue number provides direct link to GitHub
- Easy to find branch for a specific issue

### 📊 **Analytics**
- Track how many features vs bugs vs hotfixes
- Identify which areas of codebase change most
- Measure team velocity by type

### 🤝 **Team Communication**
- Consistent naming across team
- Self-documenting branches
- Reduces onboarding friction

---

## Workflow Integration

When using the `*start-work` command, the Dev agent will:

1. Ask for **branch type** (feature, bug, hotfix, etc.)
2. Ask for **scope** (gallery, main-app, ui, etc.)
3. Read **issue number** from story file
4. Generate branch name: `{type}/{scope}-{issue-number}`
5. Create worktree at: `tree/{type}/{scope}-{issue-number}/`

---

## Best Practices

### ✅ DO
- Use lowercase for all components
- Use hyphens for multi-word scopes: `main-app`, `design-system`
- Keep scopes concise and consistent
- Always include issue number

### ❌ DON'T
- Don't use underscores: `feature/main_app-123` ❌
- Don't use camelCase: `feature/mainApp-123` ❌
- Don't omit issue number: `feature/gallery` ❌
- Don't use vague scopes: `feature/stuff-123` ❌

---

## Choosing the Right Scope

### If working on a specific app:
Use the app name: `main-app`, `app-dashboard`, `api`

### If working on a shared package:
Use the package name: `ui`, `logger`, `design-system`

### If working on a feature across multiple areas:
Use the feature name: `gallery`, `auth`, `payments`

### If working on infrastructure:
Use: `monorepo`, `config`, `deps`

### When in doubt:
Choose the **primary** area of impact. If truly cross-cutting, use the feature name.

---

## Git Commands

### List branches by type
```bash
git branch --list 'feature/*'
git branch --list 'bug/*'
git branch --list 'hotfix/*'
```

### List branches by scope
```bash
git branch --list '*/gallery-*'
git branch --list '*/main-app-*'
git branch --list '*/ui-*'
```

### Find branch for issue
```bash
git branch --list '*-123'
```

