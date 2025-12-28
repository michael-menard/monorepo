# ADR-XXXX: [Title]

> **Status:** Proposed | Accepted | Deprecated | Superseded
> **Date:** YYYY-MM-DD
> **Deciders:** [List of people involved in decision]
> **Supersedes:** [ADR-XXXX if applicable]
> **Superseded by:** [ADR-XXXX if applicable]

## Context

What is the issue that we're seeing that is motivating this decision or change?

Describe:
- The current situation
- The problem or opportunity
- Any constraints or requirements
- Forces at play (technical, business, team, etc.)

## Decision

What is the change that we're proposing and/or doing?

State the decision clearly and concisely. Use active voice: "We will..." not "It was decided..."

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive

- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

### Negative

- [Drawback 1]
- [Drawback 2]
- [Drawback 3]

### Neutral

- [Observation that is neither positive nor negative]

## Options Considered

### Option 1: [Name]

**Description:** Brief description of this option.

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

### Option 2: [Name]

**Description:** Brief description of this option.

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

### Option 3: [Name] (Selected)

**Description:** Brief description of this option.

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Why selected:** Explain why this option was chosen over the others.

## Implementation

High-level implementation approach (optional, can be brief):

- Step 1
- Step 2
- Step 3

## Related

- [Link to related ADRs]
- [Link to related RFCs]
- [Link to relevant documentation]

---

## Template Usage Notes

Delete this section when creating an actual ADR.

### What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision along with its context and consequences. ADRs are:

- **Immutable** - Once accepted, don't edit. Create a new ADR to supersede.
- **Lightweight** - Keep them short and focused.
- **Contextual** - Future readers need to understand why, not just what.

### When to Write an ADR

Write an ADR when you make a decision that:
- Affects the structure of the system
- Is difficult or expensive to change later
- Impacts multiple teams or components
- Involves significant trade-offs
- You want future developers to understand

Examples:
- Choosing a database technology
- Selecting an authentication approach
- Defining API design patterns
- Establishing coding conventions
- Picking a framework or library

### When NOT to Write an ADR

- Trivial decisions
- Decisions easily reversed
- Implementation details (use code comments)
- Temporary solutions (use tickets)

### Status Lifecycle

```
Proposed → Accepted → (Deprecated or Superseded)
```

- **Proposed:** Under discussion, not yet decided
- **Accepted:** Decision made and in effect
- **Deprecated:** No longer applies (system changed)
- **Superseded:** Replaced by a newer ADR

### Best Practices

1. **Keep it short** - If it's over 2 pages, consider splitting
2. **Focus on "why"** - The decision itself is often obvious
3. **Be honest about trade-offs** - Every decision has downsides
4. **Write for future readers** - They don't have your context
5. **Include rejected options** - Shows you considered alternatives
6. **Link to evidence** - Benchmarks, research, prior art

### Naming Convention

```
ADR-XXXX-brief-title.md
```

Use sequential numbering: ADR-0001, ADR-0002, etc.

Examples:
- `ADR-0001-use-postgresql-for-primary-database.md`
- `ADR-0002-adopt-event-sourcing-for-orders.md`
- `ADR-0003-choose-react-for-frontend.md`

### Storage Location

Store in: `docs/architecture/decisions/` or `docs/adr/`

### ADR Index

Maintain an index file (`docs/architecture/decisions/README.md`):

```markdown
# Architecture Decision Records

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-0001](./ADR-0001-...) | Use PostgreSQL | Accepted | 2024-01-15 |
| [ADR-0002](./ADR-0002-...) | Adopt Event Sourcing | Accepted | 2024-02-01 |
```
