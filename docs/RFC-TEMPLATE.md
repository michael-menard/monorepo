# RFC: [Title]

> **RFC ID:** RFC-XXXX
> **Author:** [Name]
> **Status:** Draft | In Review | Approved | Rejected | Implemented
> **Created:** YYYY-MM-DD
> **Updated:** YYYY-MM-DD
> **Target Release:** [Version or Sprint]

## Summary

One paragraph summary of the proposal. What are you proposing and why?

## Motivation

Why are we doing this? What problem does it solve? What use cases does it support?

### Problem Statement

Clearly articulate the problem:
- Who is affected?
- What is the current pain point?
- What is the impact of not solving this?

### Goals

- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

### Non-Goals

What is explicitly out of scope for this RFC:
- Non-goal 1 (and why it's out of scope)
- Non-goal 2

## Proposal

### Overview

High-level description of the proposed solution.

### Detailed Design

#### Component 1: [Name]

Detailed description of this component.

```typescript
// Code examples if applicable
interface Example {
  field: string
}
```

#### Component 2: [Name]

Detailed description of this component.

#### Data Model

If applicable, describe data model changes:

```sql
-- Example schema changes
CREATE TABLE example (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);
```

#### API Changes

If applicable, describe API changes:

```
POST /api/v1/resource
{
  "field": "value"
}

Response: 201 Created
{
  "id": "uuid",
  "field": "value"
}
```

### User Experience

How will users interact with this feature?

1. User does X
2. System responds with Y
3. User sees Z

Include mockups or wireframes if applicable.

## Alternatives Considered

### Alternative 1: [Name]

**Description:** What is this alternative?

**Pros:**
- [Pro]

**Cons:**
- [Con]

**Why not chosen:** [Reason]

### Alternative 2: [Name]

**Description:** What is this alternative?

**Pros:**
- [Pro]

**Cons:**
- [Con]

**Why not chosen:** [Reason]

### Do Nothing

What happens if we don't do this?

## Implementation Plan

### Phase 1: [Name]

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Phase 2: [Name]

- [ ] Task 1
- [ ] Task 2

### Migration Strategy

If this involves changes to existing systems:
- How will we migrate?
- Is there a rollback plan?
- What's the backwards compatibility story?

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [Mitigation strategy] |
| [Risk 2] | Low/Med/High | Low/Med/High | [Mitigation strategy] |

## Dependencies

- **Requires:** [Other team/project/RFC this depends on]
- **Blocks:** [What is waiting on this]

## Security Considerations

- Authentication/Authorization implications
- Data privacy concerns
- Attack vectors introduced

## Performance Considerations

- Expected load/scale
- Performance requirements
- Potential bottlenecks

## Testing Strategy

- Unit testing approach
- Integration testing approach
- How will we validate the feature works?

## Monitoring and Observability

- What metrics will we track?
- What alerts should we add?
- How will we know if it's working?

## Documentation

What documentation needs to be created or updated?

- [ ] API documentation
- [ ] User-facing documentation
- [ ] Internal runbooks

## Open Questions

- [ ] Question 1?
- [ ] Question 2?

## Appendix

### References

- [Link to relevant documentation]
- [Link to prior art]
- [Link to research]

### Glossary

| Term | Definition |
|------|------------|
| [Term] | [Definition] |

---

## Template Usage Notes

Delete this section when creating an actual RFC.

### What is an RFC?

A Request for Comments (RFC) is a design document that describes a significant change before implementation. RFCs enable:

- **Alignment** - Get buy-in before building
- **Review** - Catch issues early
- **Documentation** - Record why decisions were made
- **Communication** - Keep stakeholders informed

### When to Write an RFC

Write an RFC when:
- Adding a significant new feature
- Making breaking changes
- Changing core architecture
- Work spans multiple sprints
- Multiple teams are affected
- The approach isn't obvious

### When NOT to Write an RFC

- Bug fixes
- Small features (< 1 sprint)
- Refactoring with no behavior change
- Obvious implementations
- Urgent fixes (write post-hoc if needed)

### RFC Lifecycle

```
Draft → In Review → Approved/Rejected → Implemented
```

1. **Draft:** Author writes initial proposal
2. **In Review:** Shared with stakeholders for feedback
3. **Approved:** Consensus reached, ready to implement
4. **Rejected:** Decision made not to proceed (with documented reasoning)
5. **Implemented:** Development complete

### Review Process

1. Author shares RFC with relevant stakeholders
2. Reviewers have [X days] to provide feedback
3. Author addresses feedback, updates RFC
4. Decision makers approve or request changes
5. Final decision is recorded in RFC status

### Best Practices

1. **Start with the problem** - Why before how
2. **Keep it focused** - One proposal per RFC
3. **Show alternatives** - Demonstrate you considered options
4. **Be specific** - Vague proposals get vague feedback
5. **Invite disagreement** - Better to debate now than during implementation
6. **Update as you learn** - RFCs can evolve during review
7. **Close the loop** - Update status when implemented

### Naming Convention

```
RFC-XXXX-brief-title.md
```

Use sequential numbering: RFC-0001, RFC-0002, etc.

Examples:
- `RFC-0001-user-authentication-redesign.md`
- `RFC-0002-real-time-notifications.md`
- `RFC-0003-api-versioning-strategy.md`

### Storage Location

Store in: `docs/rfcs/`

### RFC Index

Maintain an index file (`docs/rfcs/README.md`):

```markdown
# RFCs

| ID | Title | Status | Author | Date |
|----|-------|--------|--------|------|
| [RFC-0001](./RFC-0001-...) | User Auth Redesign | Approved | Jane | 2024-01-15 |
| [RFC-0002](./RFC-0002-...) | Real-time Notifications | In Review | John | 2024-02-01 |
```

### Scaling RFCs

For large organizations:
- Assign RFC shepherds
- Set SLAs for review cycles
- Use labels/tags for categorization
- Regular RFC review meetings
