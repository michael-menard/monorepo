# Knowledge Base Integration (REQUIRED)

All agents with `kb_tools` in frontmatter MUST query the KB at workflow start AND write significant findings/decisions after.

## Why This Matters

The KB contains:
- **Lessons Learned**: What went wrong, what worked, patterns discovered
- **Architectural Decision Records (ADRs)**: Why decisions were made
- **Prior Story Context**: Patterns and approaches from past stories
- **Exceptions/Waivers**: Approved deviations from standards

Skipping KB queries means missing relevant patterns, repeating solved problems, and ignoring architectural decisions.

## The KB Learning Loop

```
Query KB before work → Apply precedent → Do work → Write lessons/decisions → Future agents query your learnings
```

This creates institutional knowledge that compounds over time.

---

## Frontmatter Declaration

Agents that need KB access declare tools in frontmatter:

```yaml
---
kb_tools:
  - kb_search           # Read: semantic search
  - kb_add_lesson       # Write: capture lessons
  - kb_add_decision     # Write: capture ADRs
---
```

---

## Required Query Pattern (MANDATORY)

**At the START of every agent execution**, before any implementation work:

```javascript
// Step 1: Query for domain patterns
const patterns = await kb_search({
  query: "{domain} {task_type} patterns",
  role: "{agent_role}",  // "dev", "pm", "qa", "all"
  limit: 5
})

// Step 2: Query for known issues/blockers
const issues = await kb_search({
  query: "{domain} blockers lessons",
  tags: ["blocker", "lesson"],
  limit: 3
})

// Step 3: Check for relevant ADRs
const adrs = await kb_search({
  query: "{topic} architecture decision",
  tags: ["adr", "architecture"],
  limit: 3
})
```

---

## Query Examples by Agent Role

### PM Agents (story creation)
```javascript
kb_search({ query: "wishlist story patterns sizing", role: "pm", limit: 5 })
kb_search({ query: "acceptance criteria patterns", role: "pm", limit: 3 })
```

### Dev Agents (implementation)
```javascript
kb_search({ query: "backend api endpoint patterns", role: "dev", limit: 5 })
kb_search({ query: "frontend react component patterns", role: "dev", limit: 5 })
kb_search({ query: "database migration patterns", tags: ["database"], limit: 3 })
```

### QA Agents (verification)
```javascript
kb_search({ query: "test coverage patterns e2e", role: "qa", limit: 5 })
kb_search({ query: "verification edge cases", role: "qa", limit: 3 })
```

### Architecture Agents
```javascript
kb_search({ query: "hexagonal api patterns", tags: ["architecture"], limit: 5 })
kb_search({ query: "monorepo boundaries", tags: ["architecture"], limit: 3 })
```

---

## Citing KB Results (REQUIRED)

When KB results influence decisions, cite them in output files:

```markdown
## KB Context Applied

Per KB entry on "API endpoint patterns":
- Used /api/v2/{domain} path convention
- Applied request validation middleware pattern

Per ADR-001 (API Endpoint Path Schema):
- Frontend paths: /api/v2/wishlist/items
- Backend paths: /wishlist (Hono)
```

---

## Writing to KB (CRITICAL - All Specialist Agents)

### Architecture Decision Log (ADL)

The ADL captures WHY decisions were made. This is critical for:
- Future agents understanding context
- Avoiding re-litigation of settled decisions
- Tracking exceptions and waivers

**When to Write ADL Entries:**

| Trigger | Action |
|---------|--------|
| Architectural decision made | `kb_add_decision` |
| Exception/waiver granted | `kb_add_decision` with `exception-granted` tag |
| Pattern approved for first time | `kb_add_decision` |
| Approach chosen between alternatives | `kb_add_decision` |

**ADL Entry Format:**

```javascript
kb_add_decision({
  title: "ADR: {brief title}",  // Prefix with ADR for discoverability
  context: "What problem we were solving",
  decision: "What we decided",
  consequences: "What this means for future work",
  story_id: "{STORY_ID}",
  tags: ["adr", "{domain}", "{decision-type}"]
})
```

**Example ADL Entries:**

```javascript
// Architectural pattern decision
kb_add_decision({
  title: "ADR: State management approach for wishlist",
  context: "Needed client-side state for drag-drop and optimistic updates",
  decision: "Use React Query for server state, zustand for UI-only state",
  consequences: "Components must distinguish server vs UI state. Additional dependency but better cache management.",
  story_id: "WISH-2045",
  tags: ["adr", "frontend", "state-management", "wishlist"]
})

// Exception granted
kb_add_decision({
  title: "ADR: Exception - inline style for dynamic width",
  context: "Story WISH-2050 requires dynamic width based on drag position",
  decision: "Approved inline style for width only, not colors/fonts",
  consequences: "This is a narrow exception. Future dynamic sizing should also use this pattern.",
  story_id: "WISH-2050",
  tags: ["adr", "exception-granted", "frontend", "inline-style"]
})

// Security decision
kb_add_decision({
  title: "ADR: JWT refresh token strategy",
  context: "Needed to balance security with UX for long sessions",
  decision: "15-minute access tokens, 7-day refresh tokens, refresh on 401",
  consequences: "Requires refresh interceptor. Access token expiry won't interrupt active users.",
  story_id: "AUTH-015",
  tags: ["adr", "security", "authentication", "jwt"]
})
```

### Lessons Learned

Lessons capture WHAT we learned. Different from ADL which captures WHY we decided.

**When to Write Lessons:**

| Trigger | Category |
|---------|----------|
| Reusable pattern discovered | `reuse` |
| Blocker overcome | `blockers` |
| Performance issue fixed | `performance` |
| Testing insight | `testing` |
| Architecture pattern | `architecture` |
| Security finding | `security` |

**Lesson Entry Format:**

```javascript
kb_add_lesson({
  title: "Descriptive title of learning",
  story_id: "{STORY_ID}",
  category: "reuse | blockers | performance | testing | architecture | security",
  what_happened: "Brief description of situation",
  resolution: "What we learned / how we solved it",
  tags: ["relevant", "searchable", "tags"]
})
```

**Example Lessons:**

```javascript
// Blocker overcome
kb_add_lesson({
  title: "Fix for circular import in api-client",
  story_id: "WISH-2045",
  category: "blockers",
  what_happened: "TypeScript compilation failed with circular reference between schemas and api",
  resolution: "Extracted shared types to packages/core/api-client/src/__types__/shared.ts",
  tags: ["typescript", "circular-import", "api-client", "blocker"]
})

// Reuse discovery
kb_add_lesson({
  title: "DI pattern for image processing functions",
  story_id: "WISH-2045",
  category: "reuse",
  what_happened: "Needed consistent error handling across 4 new image functions",
  resolution: "Applied DI pattern from album functions - wrap core logic with consistent try/catch and logging",
  tags: ["dependency-injection", "image-processing", "pattern", "reuse"]
})

// Security finding
kb_add_lesson({
  title: "HEIC detection requires file extension check",
  story_id: "WISH-2045",
  category: "security",
  what_happened: "Browser FileReader couldn't reliably detect HEIC magic bytes",
  resolution: "Use file extension as primary detection, magic bytes as secondary confirmation",
  tags: ["heic", "file-upload", "browser-api", "image-detection"]
})
```

### Query-Before-Write Pattern

Always check if similar lesson/decision exists before writing:

```javascript
// Before adding a lesson about circular imports
const existing = await kb_search({
  query: "circular import typescript fix",
  tags: ["blocker"],
  limit: 3
})

if (existing.results.some(r => r.relevance_score > 0.85)) {
  // Similar lesson exists - reference it instead of creating duplicate
  // Or extend the existing lesson if new information
} else {
  // Safe to add new lesson
  kb_add_lesson({...})
}
```

---

## Fallback Behavior

If KB is unavailable:
1. Log warning: "KB unavailable, proceeding without context"
2. Continue with standard patterns
3. Do NOT block on KB failures

If no results returned:
1. Log: "No KB results for query: {query}"
2. Proceed with implementation
3. Consider if this is a gap to fill later

---

## Verification Checklist

Before marking work complete, verify:

- [ ] KB queried at start of execution
- [ ] Relevant results cited in output
- [ ] New patterns/lessons captured (if applicable)
- [ ] ADRs recorded for architectural decisions

---

## Non-Negotiables

| Rule | Enforcement |
|------|-------------|
| Query at start | MUST query before implementation |
| Cite sources | MUST reference KB in decisions |
| Capture lessons | Leaders MUST write blockers/solutions |
| No silent skips | Log if KB unavailable or empty results |
