# Architectural Decision Protocol

All leaders that make implementation decisions MUST follow this protocol.

---

## Rule: No Silent Architectural Decisions

Leaders must NEVER make architectural decisions without explicit user confirmation. This includes:

- File/folder structure choices
- Package placement decisions
- API contract designs
- State management approaches
- Component hierarchy decisions
- Database schema choices
- Authentication/authorization patterns
- Error handling strategies
- Caching approaches
- Third-party library selections

---

## When to Escalate

### ALWAYS escalate if:

1. **Multiple valid approaches exist**
   - "Should this be a shared package or app-specific?"
   - "REST vs GraphQL vs tRPC?"
   - "Server component vs client component?"

2. **Trade-offs are non-obvious**
   - Performance vs simplicity
   - Flexibility vs type safety
   - DRY vs explicit

3. **Reversibility is low**
   - Database schema changes
   - API contracts
   - Public interfaces

4. **Story doesn't specify**
   - Implementation details left ambiguous
   - Multiple interpretations possible

5. **Deviation from patterns**
   - Existing codebase does X, but Y might be better
   - Story suggests approach different from conventions

---

## Escalation Format

Use `AskUserQuestion` with structured options:

```markdown
## Architectural Decision Required

**Context**: [What we're implementing]
**Decision**: [What needs to be decided]

### Options

1. **[Option A Name]** (Recommended)
   - Approach: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Files affected: [List]

2. **[Option B Name]**
   - Approach: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Files affected: [List]

3. **[Option C Name]** (if applicable)
   - ...

### Recommendation
[Why option X is recommended, based on codebase patterns]

### Impact
[What happens after this decision - can it be changed later?]
```

---

## Decision Categories

### Category A: Must Always Ask
- New package creation
- New API endpoints (contract design)
- Database schema changes
- Authentication/authorization changes
- Breaking changes to existing APIs
- New external dependencies
- Cross-cutting architectural patterns

### Category B: Ask If Ambiguous
- Component structure within a feature
- Utility function placement
- Test organization
- Error message wording
- Logging verbosity

### Category C: Can Decide Autonomously
- Variable naming (following conventions)
- Import ordering
- Code formatting
- Test case ordering
- Comment placement

---

## Recording Decisions

After user confirms, record in implementation plan:

```yaml
architectural_decisions:
  - id: ARCH-001
    decision: "Use shared package for auth utilities"
    rationale: "User confirmed - enables reuse across apps"
    alternatives_considered:
      - "App-specific implementation"
      - "Inline in each component"
    decided_by: user
    timestamp: 2026-01-24T10:00:00Z
```

---

## Anti-Patterns (NEVER DO)

### ❌ Silent Decisions
```
# BAD: Just picking an approach
"I'll put this in packages/core since it seems reusable"
```

### ❌ Assumptions as Facts
```
# BAD: Treating assumption as requirement
"Since we need real-time updates, I'll use WebSockets"
```

### ❌ Deferring Without Flagging
```
# BAD: Leaving decision for later without telling user
"I'll use a simple approach for now and we can optimize later"
```

### ❌ Implied Consent
```
# BAD: Proceeding because user didn't object
"You didn't mention a preference so I went with X"
```

---

## Correct Patterns

### ✅ Explicit Escalation
```
"Before I implement the auth flow, I need to confirm the approach:

Option A: JWT tokens stored in httpOnly cookies
Option B: Session-based auth with Redis
Option C: OAuth delegation to Auth0

The story mentions 'secure authentication' but doesn't specify.
Which approach should I use?"
```

### ✅ Stating Assumptions Clearly
```
"I'm assuming we want server-side rendering for this page based on
the SEO requirements in the story. Please confirm or correct."
```

### ✅ Flagging Deferred Decisions
```
"For MVP, I'll implement basic caching. This is a placeholder -
we should revisit with a proper caching strategy in a follow-up story.
Adding to FOLLOW-UPS.md."
```

---

## Integration with Workflow

### In Planning Phase
- Planner identifies all architectural decisions needed
- Escalates Category A decisions immediately
- Documents Category B decisions for implementation phase

### In Implementation Phase
- Coder checks plan for pre-approved decisions
- Escalates any new decisions discovered during coding
- NEVER proceeds with Category A decision without approval

### In Verification Phase
- Verifier checks that all decisions were properly escalated
- Flags any silent decisions as violations

---

## Enforcement

Leaders that skip architectural escalation should be flagged:

```yaml
# In VERIFICATION.yaml
violations:
  - type: silent_architectural_decision
    description: "Created new package without user confirmation"
    file: packages/new-utils/
    severity: high
    action: "Revert and re-implement with proper escalation"
```
