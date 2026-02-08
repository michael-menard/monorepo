# Reasoning Traces Protocol

All specialist agents MUST include reasoning traces with their findings. A finding without reasoning is not actionable and cannot be trusted.

**Version**: 1.0.0
**Created**: 2026-02-06

---

## Why Reasoning Traces Matter

Without reasoning:
- Developers don't know WHY something is wrong
- False positives can't be disputed
- Similar issues may be missed
- Knowledge doesn't transfer

With reasoning:
- Clear explanation of the issue
- Evidence for the conclusion
- Referenceable standards
- Actionable remediation

---

## Required Structure

Every finding MUST include:

```yaml
finding:
  id: "{DOMAIN}-001"
  severity: high
  confidence: high
  category: "issue-category"

  issue: "One-line summary of the problem"

  # THE REASONING TRACE (REQUIRED)
  reasoning:
    observation: |
      What was observed in the code.
      Include specific file, line, and code snippet.

    standard: |
      Which rule/standard this violates.
      Include citation (CLAUDE.md, docs/architecture/*, KB entry).

    impact: |
      What happens if this is not fixed.
      Be specific about the risk.

    context: |
      Relevant context that informed this conclusion.
      Include any mitigating factors considered.

  evidence:
    - file: "path/to/file.ts"
      lines: "34-45"
      snippet: |
        // The problematic code

  remediation: "How to fix this"
```

---

## Observation Section

### What to Include

- **Specific location**: File path and line numbers
- **Actual code**: The problematic snippet
- **Data flow**: How does input reach this point?
- **Pattern matched**: What pattern triggered this finding?

### Examples

**Good Observation:**
```yaml
observation: |
  In src/routes/wishlist.ts:34-38, the POST handler accepts
  a request body and passes it directly to wishlistService.create()
  without any validation:

  ```typescript
  app.post('/wishlist', async (c) => {
    const body = await c.req.json()  // No validation
    return wishlistService.create(body)  // Direct pass-through
  })
  ```
```

**Bad Observation:**
```yaml
observation: "Missing validation in wishlist route"
# Too vague - which route? what validation? where?
```

---

## Standard Section

### What to Include

- **Specific rule**: Which standard is violated
- **Citation**: Where is this rule defined
- **Rationale**: Why this rule exists

### Citation Sources

| Source | Citation Format |
|--------|-----------------|
| CLAUDE.md | `Per CLAUDE.md: "Always use Zod schemas for types"` |
| Architecture docs | `Per docs/architecture/api-layer.md: "Route handlers < 50 lines"` |
| KB entry | `Per KB entry kb-arch-042: "Zod validation at all API boundaries"` |
| Industry standard | `Per OWASP: "Validate all input at trust boundaries"` |

### Examples

**Good Standard:**
```yaml
standard: |
  Per CLAUDE.md Type System section:
  "ALWAYS use Zod schemas for types - never use TypeScript interfaces"

  Per docs/architecture/api-layer.md:
  "Route handlers MUST validate request bodies with Zod schemas
  before passing to service layer"

  This ensures runtime validation and prevents malformed data
  from reaching business logic.
```

**Bad Standard:**
```yaml
standard: "Should use Zod"
# No citation, no rationale
```

---

## Impact Section

### What to Include

- **Immediate risk**: What can go wrong right now
- **Blast radius**: How widespread is the impact
- **Exploitation path**: How would this be exploited/triggered
- **Business impact**: User/data/security consequences

### Examples

**Good Impact:**
```yaml
impact: |
  Without input validation:
  1. Malformed data could crash the service (500 errors)
  2. Invalid types could corrupt database records
  3. Injection attacks are possible if input reaches SQL
  4. API contract is not enforced, leading to inconsistent behavior

  Risk is HIGH because this is a public endpoint accepting
  unauthenticated requests.
```

**Bad Impact:**
```yaml
impact: "Could cause problems"
# No specifics, not actionable
```

---

## Context Section

### What to Include

- **Mitigating factors**: What reduces the risk
- **Related patterns**: Similar code elsewhere
- **Historical context**: Why might it have been done this way
- **Precedent**: KB entries for similar situations

### Examples

**Good Context:**
```yaml
context: |
  Mitigating factors considered:
  - This is an admin-only endpoint (reduces public exposure)
  - TypeScript provides compile-time type checking (but not runtime)

  However, compile-time checks don't prevent malformed API requests.
  No KB precedent found for approved unvalidated endpoints.

  Similar pattern exists in src/routes/sets.ts:45 which DOES
  have Zod validation, suggesting this was an oversight.
```

**Bad Context:**
```yaml
context: "Seems wrong"
# No analysis, no mitigation consideration
```

---

## Evidence Section

### What to Include

- **File path**: Absolute or relative from repo root
- **Line numbers**: Specific range
- **Code snippet**: Relevant excerpt (not entire file)

### Format

```yaml
evidence:
  - file: "apps/api/routes/wishlist.ts"
    lines: "34-38"
    snippet: |
      app.post('/wishlist', async (c) => {
        const body = await c.req.json()
        return wishlistService.create(body)
      })

  - file: "apps/api/services/wishlist/index.ts"
    lines: "12-15"
    snippet: |
      export function create(data: WishlistInput) {
        // No validation here either
        return db.insert(wishlist).values(data)
      }
```

### Multiple Evidence Points

For findings that span multiple files/locations:

```yaml
evidence:
  - file: "source.ts"
    lines: "10-12"
    snippet: "// Where bad data enters"
    role: "entry_point"

  - file: "middle.ts"
    lines: "25-27"
    snippet: "// Where data passes through"
    role: "pass_through"

  - file: "sink.ts"
    lines: "45-50"
    snippet: "// Where data causes harm"
    role: "vulnerability_sink"
```

---

## Confidence Levels

### Definition

| Level | Meaning | Requirements |
|-------|---------|--------------|
| **high** | Certain this is an issue | Provable via static analysis, clear standard violation |
| **medium** | Likely an issue | Strong evidence, some ambiguity |
| **low** | Possibly an issue | Pattern suggests risk, needs verification |
| **cannot-determine** | Unable to assess | Insufficient context |

### Confidence Impacts Severity

```yaml
# High confidence: Severity stands as-is
confidence: high
severity: high  # Accepted

# Medium confidence: Include caveat
confidence: medium
severity: high
caveat: "Cannot trace full input path - may have upstream validation"

# Low confidence: Cannot be Critical/High blocker
confidence: low
severity: medium  # Downgraded from high
escalate: true  # Flag for human review

# Cannot-determine: Escalate, don't opine
confidence: cannot-determine
severity: null  # Don't assign
action: escalate
reason: "Need runtime analysis to determine if input is sanitized"
```

---

## Remediation Section

### What to Include

- **Specific fix**: Exactly what to change
- **Code example**: How the fixed code should look
- **Alternative approaches**: If multiple valid fixes exist

### Examples

**Good Remediation:**
```yaml
remediation: |
  Add Zod validation before passing to service:

  ```typescript
  import { z } from 'zod'

  const WishlistInputSchema = z.object({
    name: z.string().min(1).max(100),
    setNumber: z.string().regex(/^\d{4,6}$/),
    priority: z.number().int().min(1).max(10)
  })

  app.post('/wishlist', async (c) => {
    const body = WishlistInputSchema.parse(await c.req.json())
    return wishlistService.create(body)
  })
  ```

  Place schema in `apps/api/services/wishlist/types.ts` for reuse.
```

**Bad Remediation:**
```yaml
remediation: "Add validation"
# No specifics, not actionable
```

---

## Complete Example

```yaml
findings:
  - id: SEC-001
    severity: high
    confidence: high
    category: input-validation

    issue: "POST /api/wishlist accepts unvalidated request body"

    reasoning:
      observation: |
        In apps/api/routes/wishlist.ts:34-38, the POST handler
        accepts a request body and passes it to the service without
        any validation:

        ```typescript
        app.post('/wishlist', async (c) => {
          const body = await c.req.json()
          return wishlistService.create(body)
        })
        ```

        The body is then used in a database insert at
        apps/api/services/wishlist/index.ts:45.

      standard: |
        Per CLAUDE.md (TypeScript section):
        "ALWAYS use Zod schemas for types"

        Per docs/architecture/api-layer.md:
        "Zod validation at API boundaries"

        Per OWASP Input Validation:
        "Validate all input at trust boundaries"

      impact: |
        Without input validation:
        1. Malformed data can crash the service
        2. Invalid types may corrupt database
        3. SQL injection possible if input reaches raw queries
        4. API contract not enforced

        This is a PUBLIC endpoint - high exposure.

      context: |
        Mitigating factors:
        - None found - no upstream validation
        - TypeScript types don't prevent runtime issues

        Related pattern in sets.ts:45 DOES have validation,
        suggesting this was an oversight.

        KB query "wishlist validation" returned no exceptions.

    evidence:
      - file: "apps/api/routes/wishlist.ts"
        lines: "34-38"
        snippet: |
          app.post('/wishlist', async (c) => {
            const body = await c.req.json()
            return wishlistService.create(body)
          })

      - file: "apps/api/services/wishlist/index.ts"
        lines: "45"
        snippet: |
          return db.insert(wishlist).values(data)

    remediation: |
      Add Zod validation in route handler:

      ```typescript
      const WishlistInputSchema = z.object({
        name: z.string().min(1).max(100),
        setNumber: z.string().regex(/^\d{4,6}$/),
      })

      app.post('/wishlist', async (c) => {
        const body = WishlistInputSchema.parse(await c.req.json())
        return wishlistService.create(body)
      })
      ```
```

---

## Validation Checklist

Before including a finding:

- [ ] Observation includes file, lines, code snippet
- [ ] Standard includes citation to authoritative source
- [ ] Impact explains specific consequences
- [ ] Context considers mitigating factors
- [ ] Evidence provides reproducible location
- [ ] Confidence level matches evidence quality
- [ ] Remediation is specific and actionable

### Anti-Patterns

| Bad Practice | Why It's Bad |
|--------------|--------------|
| "This is wrong" | No explanation |
| "Should be different" | No standard cited |
| "Could cause issues" | No specific impact |
| "Fix it" | No actionable guidance |
| High confidence with no evidence | Untrustworthy |
