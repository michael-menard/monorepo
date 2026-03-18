## PR Review Checklist

**Author:**
**Branch:**
**Story ID:**

### Code Quality

- [ ] Code follows project conventions (see CLAUDE.md)
- [ ] No console.logs or debug code
- [ ] No hardcoded secrets/keys
- [ ] Error handling is appropriate
- [ ] No unnecessary dependencies added

### TypeScript

- [ ] Types pass (`pnpm check-types`)
- [ ] No `any` types where appropriate
- [ ] Zod schemas used for runtime validation

### Testing

- [ ] Unit tests pass (`pnpm test`)
- [ ] E2E tests pass (if applicable)
- [ ] Test coverage meets threshold (45%+)

### Linting

- [ ] Lint passes (`/lint-fix`)
- [ ] No eslint-disable comments added

### Security

- [ ] No exposed secrets in code
- [ ] Input validation implemented
- [ ] Authentication/authorization checks in place

### Frontend Specific

- [ ] Components follow directory structure (no barrel files)
- [ ] Uses @repo/ui for shared components
- [ ] Tailwind classes used (no hardcoded colors)
- [ ] Accessibility considerations (ARIA labels, keyboard nav)

### Backend Specific

- [ ] Database queries use proper patterns
- [ ] Rate limiting implemented where needed
- [ ] Error responses follow API contract

### Documentation

- [ ] Complex logic is documented
- [ ] API changes documented (if applicable)

### Verification

| Check      | Status |
| ---------- | ------ |
| Build      | [ ]    |
| TypeScript | [ ]    |
| Lint       | [ ]    |
| Unit Tests | [ ]    |
| E2E Tests  | [ ]    |

### Decision

- [ ] Approved
- [ ] Approved with comments
- [ ] Changes requested
- [ ] Rejected

**Reviewer:**
**Date:**
