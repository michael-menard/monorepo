---
description: Code review - run lint, style, syntax, security, typecheck, and build checks
---

# /dev-code-review - Code Review

Run comprehensive code review checks on a story.

## Usage

```
/dev-code-review {STORY_ID}
```

## Review Workers (Parallel)

| Worker           | Focus                            |
| ---------------- | -------------------------------- |
| lint             | ESLint validation                |
| style-compliance | Tailwind + app component library |
| syntax           | ES7+ syntax compliance           |
| security         | OWASP vulnerability scan         |
| typecheck        | TypeScript type checking         |
| build            | Production build verification    |

## Pass Criteria

All 6 workers must pass. Any FAIL → overall FAIL.

## Example

```
/dev-code-review WISH-001
```
