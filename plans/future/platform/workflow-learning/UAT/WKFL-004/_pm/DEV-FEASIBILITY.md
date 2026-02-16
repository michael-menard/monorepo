# Dev Feasibility: WKFL-004 - Human Feedback Capture

## Executive Summary

**FEASIBLE** - This story is implementable within the 30k token budget with low technical risk.

**Key Factors:**
- ✅ Reuses existing KB infrastructure (no new tables/servers needed)
- ✅ Simple command structure (utility pattern, no orchestration)
- ✅ Well-defined schema with Zod validation
- ✅ Clear integration points with existing MCP tools
- ✅ No UI/UX dependencies (CLI-only)
- ✅ Straightforward YAML parsing with established libraries

**Estimated Effort:** 25-30k tokens (within budget)

**Blockers:** None

**Recommendations:** Proceed with implementation as specified

---

## Technical Analysis

### 1. Command Structure

**Location:** `.claude/commands/feedback.md`

**Pattern:** Utility command (not orchestrator)

**Argument Structure:**
```bash
/feedback {FINDING-ID} [--false-positive | --helpful | --missing | --severity-wrong] [--suggested-severity LEVEL] ["note text"]
```

**Parsing Approach:**
- Positional arg: Finding ID (required)
- Mutually exclusive flags: feedback type (exactly one required)
- Optional: `--suggested-severity` (required if `--severity-wrong`)
- Optional: Note text (quoted string)

**Implementation Complexity:** LOW
- Simple argument parsing with validation
- No complex state management
- No async coordination needed
- Error messages are straightforward

**Effort Estimate:** ~3k tokens (command file + argument parsing logic)

---

### 2. KB Schema Extension

**Current Schema Location:** `apps/api/knowledge-base/src/__types__/index.ts`

**Required Changes:**

1. **Extend `KnowledgeEntryTypeSchema`:**
```typescript
// Current
export const KnowledgeEntryTypeSchema = z.enum([
  'note',
  'decision',
  'constraint',
  'runbook',
  'lesson',
])

// After
export const KnowledgeEntryTypeSchema = z.enum([
  'note',
  'decision',
  'constraint',
  'runbook',
  'lesson',
  'feedback',  // ADD THIS
])
```

2. **Add `FeedbackContentSchema`:**
```typescript
export const FeedbackContentSchema = z.object({
  finding_id: z.string().min(1, 'Finding ID required'),
  agent_id: z.string().min(1, 'Agent ID required'),
  story_id: z.string().min(1, 'Story ID required'),
  feedback_type: z.enum(['false_positive', 'helpful', 'missing', 'severity_wrong']),
  original_severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  suggested_severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  note: z.string(),
  created_at: z.string().datetime(),
})

export type FeedbackContent = z.infer<typeof FeedbackContentSchema>
```

3. **Update Entry Validation:**
```typescript
// In crud-operations/schemas.ts or similar
export const FeedbackEntrySchema = BaseEntrySchema.extend({
  entryType: z.literal('feedback'),
  content: FeedbackContentSchema,
  tags: z.array(z.string()).min(1), // Must have at least 'feedback' tag
})
```

**Reuse Assessment:**
- ✅ No new tables needed (uses existing `knowledge_entries`)
- ✅ Follows established Zod-first pattern
- ✅ Integrates with existing CRUD operations
- ✅ No migration needed (entryType is string field)

**Implementation Complexity:** LOW
- Simple schema definition
- No database changes
- Zod handles validation automatically
- Follows established patterns

**Effort Estimate:** ~2k tokens (schema definition + validation)

---

### 3. VERIFICATION.yaml Parsing

**Challenge:** Finding IDs can appear in multiple sections of VERIFICATION.yaml

**Sections to Search:**
- `code_review.security.findings[]`
- `code_review.architecture.findings[]`
- `code_review.accessibility.findings[]`
- `code_review.performance.findings[]`
- `qa_verify.findings[]`

**Parsing Strategy:**

```typescript
// Pseudo-implementation
async function parseFindingFromVerification(
  storyDir: string,
  findingId: string
): Promise<{ agent_id: string; severity: string; description: string }> {
  const verificationPath = path.join(storyDir, '_implementation/VERIFICATION.yaml')

  // Check if file exists
  if (!fs.existsSync(verificationPath)) {
    throw new Error('Story has no VERIFICATION.yaml yet')
  }

  // Parse YAML
  let verification: any
  try {
    const content = fs.readFileSync(verificationPath, 'utf-8')
    verification = yaml.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse VERIFICATION.yaml: ${error.message}`)
  }

  // Search across all review sections
  const sections = [
    { path: 'code_review.security', agent: 'code-review-security' },
    { path: 'code_review.architecture', agent: 'code-review-architecture' },
    { path: 'code_review.accessibility', agent: 'code-review-accessibility' },
    { path: 'qa_verify', agent: 'qa-verify-completion-leader' },
  ]

  for (const section of sections) {
    const findings = _.get(verification, `${section.path}.findings`, [])
    const finding = findings.find(f => f.id === findingId)
    if (finding) {
      return {
        agent_id: finding.agent || section.agent,
        severity: finding.severity || 'unknown',
        description: finding.description || '',
      }
    }
  }

  throw new Error(`Finding ${findingId} not found in VERIFICATION.yaml`)
}
```

**Dependencies:**
- `yaml` package (already used in codebase)
- `fs` and `path` (Node.js built-ins)
- `lodash` for `_.get()` (already in codebase)

**Implementation Complexity:** MEDIUM
- Need to handle missing files gracefully
- Need to search across multiple sections
- Need robust error handling for malformed YAML
- But structure is well-defined and consistent

**Effort Estimate:** ~5k tokens (parsing logic + error handling + tests)

---

### 4. KB Write Integration

**Approach:** Use existing `kb_add` MCP tool (no new tool needed)

**Write Flow:**

```typescript
// Pseudo-implementation
async function captureFeedback(
  findingId: string,
  feedbackType: 'false_positive' | 'helpful' | 'missing' | 'severity_wrong',
  note: string,
  suggestedSeverity?: string
): Promise<void> {
  // 1. Parse VERIFICATION.yaml to get finding context
  const finding = await parseFindingFromVerification(currentStoryDir, findingId)

  // 2. Get current story ID from context
  const storyId = getCurrentStoryId() // e.g., from working-set.md or env

  // 3. Build feedback content
  const content: FeedbackContent = {
    finding_id: findingId,
    agent_id: finding.agent_id,
    story_id: storyId,
    feedback_type: feedbackType,
    original_severity: finding.severity,
    suggested_severity: suggestedSeverity,
    note: note,
    created_at: new Date().toISOString(),
  }

  // 4. Build tags
  const tags = [
    'feedback',
    `agent:${finding.agent_id}`,
    `story:${storyId}`,
    `type:${feedbackType}`,
    `date:${new Date().toISOString().substring(0, 7)}`, // YYYY-MM
  ]

  // 5. Call kb_add via MCP
  await kb_add({
    entryType: 'feedback',
    content: content,
    tags: tags,
    correlationId: generateCorrelationId(),
  })

  // 6. Confirm to user
  console.log(`Feedback captured for ${findingId}`)
}
```

**Reuse Assessment:**
- ✅ `kb_add` already handles Zod validation
- ✅ MCP tool infrastructure already has logging and error handling
- ✅ Correlation ID generation follows existing patterns
- ✅ No new backend code needed (pure KB write)

**Implementation Complexity:** LOW
- Straightforward data transformation
- Existing infrastructure handles all complexity
- Error handling already built into MCP tools

**Effort Estimate:** ~3k tokens (integration logic + confirmation)

---

### 5. Query Integration

**Approach:** Use existing `kb_search` MCP tool

**Query Patterns:**

```typescript
// Example queries for WKFL-002 calibration
kb_search({
  tags: ['feedback', 'agent:code-review-security'],
  limit: 100,
})

// Example query for false positive rate
kb_search({
  tags: ['feedback', 'type:false_positive', 'agent:code-review-security'],
  limit: 100,
})

// Example query for recent feedback
kb_search({
  tags: ['feedback', 'date:2026-02'],
  limit: 50,
})

// Combined text + tag search
kb_search({
  query: 'intentional behavior',
  tags: ['feedback', 'type:false_positive'],
  limit: 20,
})
```

**Reuse Assessment:**
- ✅ `kb_search` already supports tag filtering
- ✅ Text search already implemented
- ✅ Limit and pagination already work
- ✅ No new query capabilities needed

**Implementation Complexity:** NONE
- No implementation needed (existing functionality)
- Just need to document query patterns

**Effort Estimate:** ~1k tokens (documentation only)

---

### 6. Error Handling

**Error Scenarios:**

| Scenario | Error Message | Recovery |
|----------|---------------|----------|
| Finding not found | `Finding {ID} not found in VERIFICATION.yaml` | User checks finding ID |
| No VERIFICATION.yaml | `Story has no VERIFICATION.yaml yet` | User waits for story to complete review phase |
| Malformed YAML | `Failed to parse VERIFICATION.yaml: {error}` | User fixes YAML syntax |
| Invalid severity | `Suggested severity must be: critical, high, medium, low` | User corrects flag value |
| Missing required flag | `Must specify exactly one feedback type: --false-positive, --helpful, --missing, --severity-wrong` | User adds flag |
| KB write failure | `Failed to capture feedback: {error}` | User retries or checks KB availability |

**Implementation Strategy:**
- Validate arguments before file I/O
- Catch YAML parse errors gracefully
- Sanitize KB write errors before displaying
- Log all errors with correlation IDs for debugging

**Implementation Complexity:** LOW
- Standard try/catch patterns
- Clear error messages
- No complex recovery logic needed

**Effort Estimate:** ~3k tokens (error handling + user messages)

---

### 7. Context Detection

**Challenge:** How does command know current story context?

**Options:**

1. **From working-set.md (preferred):**
```typescript
function getCurrentStoryId(): string {
  const workingSet = fs.readFileSync('.agent/working-set.md', 'utf-8')
  const match = workingSet.match(/story_id:\s*(\S+)/)
  return match ? match[1] : null
}
```

2. **From environment variable:**
```bash
export CURRENT_STORY_ID=WKFL-004
```

3. **From command argument:**
```bash
/feedback SEC-042 --story WKFL-004 --false-positive "reason"
```

**Recommendation:** Use option 1 (working-set.md) as primary, with option 3 as fallback

**Implementation Complexity:** LOW
- Simple file read + regex
- Fallback to explicit flag if needed

**Effort Estimate:** ~2k tokens (context detection + fallback)

---

### 8. Command File Structure

**Location:** `.claude/commands/feedback.md`

**Frontmatter:**
```yaml
---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: utility
---
```

**Sections:**
- Command signature
- Brief description
- Usage examples (all 4 feedback types)
- Arguments table
- Implementation notes
- Error handling
- Integration with WKFL-002/003

**Implementation Complexity:** LOW
- Follows established command file pattern
- Documentation-focused

**Effort Estimate:** ~3k tokens (documentation)

---

## Reuse Plan

### Must Reuse

| Component | Location | Usage |
|-----------|----------|-------|
| `knowledge_entries` table | `apps/api/knowledge-base/src/db/schema.ts` | Store feedback entries |
| `kb_add` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Write feedback to KB |
| `kb_search` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Query feedback |
| Zod schemas | `apps/api/knowledge-base/src/__types__/index.ts` | Validate feedback content |
| Command pattern | `.claude/commands/story-status.md` | Command file structure |
| YAML parsing | `yaml` package (already in codebase) | Parse VERIFICATION.yaml |

### May Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `/feedback` command | `.claude/commands/feedback.md` | CLI entry point |
| `FeedbackContentSchema` | `apps/api/knowledge-base/src/__types__/index.ts` | Feedback-specific validation |
| Feedback utility functions | `.claude/commands/utils/feedback-helpers.ts` (optional) | VERIFICATION.yaml parsing helpers |

### Must Not Create

- ❌ New database tables (use existing `knowledge_entries`)
- ❌ New MCP tools (reuse `kb_add` and `kb_search`)
- ❌ New backend services (KB MCP server handles everything)
- ❌ UI components (CLI-only story)

---

## Dependencies

### External Packages

All dependencies already exist in the monorepo:

| Package | Version | Usage | Location |
|---------|---------|-------|----------|
| `zod` | ^3.x | Schema validation | All packages |
| `yaml` | ^2.x | VERIFICATION.yaml parsing | Already used in codebase |
| `@repo/logger` | workspace:* | Logging | All packages |

**No new package installations needed**

### Internal Dependencies

| Dependency | Status | Blocker? |
|------------|--------|----------|
| Knowledge Base MCP Server | ✅ Active | No |
| `kb_add` tool | ✅ Implemented | No |
| `kb_search` tool | ✅ Implemented | No |
| VERIFICATION.yaml format | ✅ Standardized | No |
| Command file pattern | ✅ Established | No |

**No blockers from internal dependencies**

---

## Risk Assessment

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| VERIFICATION.yaml format varies | LOW | LOW | Test with multiple examples; robust error handling |
| Finding ID collisions across stories | MEDIUM | LOW | Scope queries with story_id tag |
| KB write failures | LOW | LOW | Reuse existing error handling; add retry logic if needed |
| Performance with large feedback datasets | LOW | LOW | Tag indexing already exists; queries are scoped |
| Context detection failures | MEDIUM | MEDIUM | Provide explicit `--story` flag as fallback |

### Non-Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Users forget to provide feedback | HIGH | MEDIUM | Optional: Add post-gate prompt (story.yaml line 130-141) |
| Feedback quality varies | MEDIUM | HIGH | Accept all feedback; let WKFL-002/003 filter signal from noise |
| Adoption resistance | LOW | LOW | Make command simple and fast; show value in calibration reports |

### Overall Risk Level: **LOW**

---

## Effort Breakdown

| Component | Effort (tokens) | Complexity |
|-----------|----------------|------------|
| Command file (`.claude/commands/feedback.md`) | ~3,000 | LOW |
| KB schema extension (`FeedbackContentSchema`) | ~2,000 | LOW |
| VERIFICATION.yaml parsing logic | ~5,000 | MEDIUM |
| Argument parsing and validation | ~4,000 | LOW |
| KB write integration (`kb_add` wrapper) | ~3,000 | LOW |
| Error handling and logging | ~3,000 | LOW |
| Context detection (working-set.md) | ~2,000 | LOW |
| Testing (unit + integration) | ~8,000 | MEDIUM |
| **Total Estimated Effort** | **~30,000** | **LOW-MEDIUM** |

**Budget:** 30,000 tokens (estimated)

**Confidence:** HIGH (well-scoped, minimal unknowns)

---

## Implementation Plan

### Phase 1: Schema and Validation (6k tokens)
1. Extend `KnowledgeEntryTypeSchema` to include 'feedback'
2. Define `FeedbackContentSchema` with Zod
3. Add validation to CRUD operations
4. Unit tests for schema validation

### Phase 2: VERIFICATION.yaml Parsing (7k tokens)
1. Implement `parseFindingFromVerification()` function
2. Test with multiple VERIFICATION.yaml examples
3. Error handling for missing/malformed files
4. Integration tests with mock VERIFICATION.yaml

### Phase 3: Command Implementation (10k tokens)
1. Create `.claude/commands/feedback.md` with frontmatter
2. Implement argument parsing and flag validation
3. Integrate parsing + KB write flow
4. Add context detection (working-set.md + fallback)
5. Error messages and user confirmations

### Phase 4: KB Integration (4k tokens)
1. Wrapper around `kb_add` for feedback entries
2. Tag generation logic
3. Correlation ID handling
4. Logging and traceability

### Phase 5: Testing and Documentation (3k tokens)
1. Unit tests for all functions
2. Integration tests for KB roundtrips
3. UAT test script
4. Update WKFL-004.md with implementation notes

---

## Blockers

**None identified**

All dependencies are met:
- ✅ Knowledge Base MCP Server is operational
- ✅ `kb_add` and `kb_search` tools are available
- ✅ Zod validation infrastructure exists
- ✅ Command file pattern is established
- ✅ VERIFICATION.yaml format is standardized

---

## Recommendations

### For Implementation

1. **Start with schema:** Define `FeedbackContentSchema` first to clarify data structure
2. **Test VERIFICATION.yaml parsing early:** Use real examples from WISH-2045 and other completed stories
3. **Implement progressively:** Schema → Parsing → Command → Integration → Testing
4. **Reuse aggressively:** Don't reinvent KB write logic; just wrap existing tools
5. **Keep command simple:** Avoid feature creep (e.g., skip post-gate prompt for MVP)

### For Testing

1. **Create diverse test fixtures:** VERIFICATION.yaml from security, architecture, QA reviews
2. **Test error paths thoroughly:** Missing files, malformed YAML, invalid args
3. **Verify KB queries:** Ensure tag filtering works for WKFL-002/003 consumption
4. **UAT with real data:** Run on actual completed story to validate end-to-end

### For Future Enhancements (Out of Scope)

- **Post-gate prompt:** Optional interactive feedback capture after `/qa-gate` completes
- **Bulk feedback mode:** Accept multiple findings in one command or from file
- **Feedback editing:** Allow users to update/delete previously captured feedback
- **Feedback analytics:** Built-in summary commands (e.g., `/feedback-stats`)

---

## Conclusion

**FEASIBLE** - Proceed with implementation

This story is well-scoped, low-risk, and fits comfortably within the 30k token budget. All dependencies are satisfied, reuse opportunities are abundant, and the implementation path is clear.

**Confidence Level:** HIGH

**Recommended Next Steps:**
1. Approve story for implementation
2. Assign to dev-implement workflow
3. Execute in single sprint (1-2 days estimated)

---

## Appendix: Code Samples

### Sample FeedbackContentSchema

```typescript
// apps/api/knowledge-base/src/__types__/index.ts

export const FeedbackContentSchema = z.object({
  finding_id: z.string().min(1, 'Finding ID required'),
  agent_id: z.string().min(1, 'Agent ID required'),
  story_id: z.string().min(1, 'Story ID required'),
  feedback_type: z.enum(['false_positive', 'helpful', 'missing', 'severity_wrong'], {
    errorMap: () => ({ message: 'Feedback type must be: false_positive, helpful, missing, or severity_wrong' })
  }),
  original_severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  suggested_severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  note: z.string().default(''),
  created_at: z.string().datetime(),
}).refine(
  (data) => {
    // If feedback_type is severity_wrong, suggested_severity is required
    if (data.feedback_type === 'severity_wrong' && !data.suggested_severity) {
      return false
    }
    return true
  },
  {
    message: 'suggested_severity is required when feedback_type is severity_wrong',
    path: ['suggested_severity'],
  }
)

export type FeedbackContent = z.infer<typeof FeedbackContentSchema>
```

### Sample Command Usage

```bash
# False positive
/feedback SEC-042 --false-positive "This is intentional behavior for admin users"

# Helpful finding
/feedback ARCH-015 --helpful "Good catch, added error handling"

# Helpful without note (optional)
/feedback QA-001 --helpful

# Missing context
/feedback SEC-003 --missing "Should also check for SQL injection in raw queries"

# Severity wrong
/feedback SEC-042 --severity-wrong --suggested-severity medium "Defense in depth exists at API Gateway"

# With explicit story (fallback)
/feedback SEC-042 --story WISH-2045 --false-positive "reason"
```

### Sample KB Query for WKFL-002

```typescript
// Calibration agent queries feedback for security review agent
const securityFeedback = await kb_search({
  tags: ['feedback', 'agent:code-review-security'],
  limit: 100,
})

// Compute false positive rate
const totalFindings = securityFeedback.length
const falsePositives = securityFeedback.filter(
  f => f.content.feedback_type === 'false_positive'
).length
const falsePositiveRate = totalFindings > 0 ? falsePositives / totalFindings : 0

console.log(`Security agent false positive rate: ${(falsePositiveRate * 100).toFixed(1)}%`)
```
