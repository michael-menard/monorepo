# GitHub Templates Skill

Use these templates when interacting with GitHub issues and pull requests.

## Issue Templates

Located in `.github/ISSUE_TEMPLATE/`

| Template             | Use When                                         |
| -------------------- | ------------------------------------------------ |
| `feature_request.md` | User/PM suggesting new features → becomes story  |
| `bug_report.md`      | Bugs with reproduction steps → becomes bug story |
| `question.md`        | Questions or clarifications                      |
| `epic_proposal.md`   | Strategic initiatives → becomes plan             |

**Usage:** GitHub automatically shows template dropdown when creating issues.

## Pull Request Template

Located in `.github/PULL_REQUEST_TEMPLATE/PULL_REQUEST_TEMPLATE.md`

**Automatic:** Template auto-populates PR body when PR is created.

**Required checks before PR:**

- [ ] Unit tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm check-types`)
- [ ] Lint passes (`/lint-fix`)
- [ ] E2E tests pass (if applicable)

## PR Review Checklist

Located in `.github/pull_request_review_template.md`

**Usage:** Copy/paste into PR review comments, or reference via URL in PR template.

## Commit Template

Located in `.github/commit_template.txt`

**Usage:** Already configured via `git config commit.template`. Shows automatically in `git commit`.

**Format:**

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert
```

## Summary

| Artifact            | Location                                | Auto | Manual Action        |
| ------------------- | --------------------------------------- | ---- | -------------------- |
| Issue templates     | .github/ISSUE_TEMPLATE/                 | Yes  | Select from dropdown |
| PR template         | .github/PULL_REQUEST_TEMPLATE/          | Yes  | Fill in sections     |
| PR review checklist | .github/pull_request_review_template.md | No   | Copy to comment      |
| Commit template     | .github/commit_template.txt             | Yes  | Fill in message      |
