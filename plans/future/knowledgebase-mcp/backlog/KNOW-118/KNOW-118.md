---
story_id: KNOW-118
title: Worker Agent KB Integration Pattern
status: backlog
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-040]
follow_up_from: KNOW-040
blocks: []
assignee: null
priority: P2
story_points: 2
tags: [documentation, agent-integration, knowledge-base, worker-agents, patterns]
source: QA Discovery Notes - KNOW-040 Gap #6
---

# KNOW-118: Worker Agent KB Integration Pattern

## Follow-up Context

**Parent Story:** KNOW-040 (Agent Instruction Integration)
**Source:** QA Discovery Notes - Gap #6 from FUTURE-OPPORTUNITIES.md
**Original Finding:** "Integration guide doesn't cover worker agents - Story targets leader agents (dev-implement-implementation-leader, qa-verify-verification-leader) but leader agents spawn worker agents (backend-coder, frontend-coder, playwright). Should worker agents also query KB?"
**Category:** Gap
**Impact:** Medium - Unclear whether worker agents should use KB, creating inconsistent knowledge access patterns
**Effort:** Low - Documentation and pattern definition, minimal implementation

## Context

KNOW-040 establishes KB integration pattern for 5+ leader agents, instructing them to query the Knowledge Base before performing tasks. However, leader agents spawn worker agents (backend-coder, frontend-coder, playwright-engineer, etc.) to execute subtasks.

Currently, there's no guidance on whether worker agents should:
1. Query KB independently for their specific subtasks
2. Rely on KB context passed from leader agents
3. Not use KB at all (delegate all KB access to leaders)

This gap creates uncertainty for agent authors and may lead to:
- Inconsistent knowledge access patterns (some workers query KB, others don't)
- Duplicate KB queries (leader queries, then each worker queries again for same context)
- Missed opportunities (workers don't query KB for worker-specific patterns like code style conventions)

## Goal

Define and document the KB integration pattern for worker agents, ensuring consistent knowledge access across leader-worker agent hierarchies while avoiding duplicate queries and maintaining efficient workflow execution.

## Non-Goals

- **Implementing worker agent KB integration code** - This story defines the pattern only
- **Modifying all worker agents** - Document the pattern for future use, don't bulk-update agents
- **Creating automated KB context passing mechanism** - Manual context passing is acceptable for MVP
- **Worker-specific KB query templates** - Generic query patterns sufficient, specialization deferred
- **Performance optimization of KB queries** - Query caching and optimization deferred to KNOW-042
- **Updating KNOW-040 retrospectively** - Accept that KNOW-040 focused on leaders; this story fills the gap

## Scope

### Packages Affected

**None** - This story modifies documentation only.

### Documentation Modified/Created

**Modified:**
- `.claude/KB-AGENT-INTEGRATION.md` - Add "Worker Agent Pattern" section

**Created:**
- `.claude/KB-WORKER-PATTERN.md` - Detailed worker agent KB integration guide (optional, if content exceeds section length)

**Worker Agents to Analyze:**

Analyze existing worker agents to inform pattern definition:
1. `backend-coder.agent.md` (if exists)
2. `frontend-coder.agent.md` (if exists)
3. `playwright-engineer.agent.md` (if exists)
4. Other worker agents spawned by leaders from KNOW-040

### Infrastructure

None - agent instruction files are read at runtime, no deployment required.

## Acceptance Criteria

### AC1: Worker Agent Pattern Defined

**Given** leader agents spawn worker agents for subtask execution
**When** worker agent KB integration pattern is reviewed
**Then** pattern document includes:
- **Decision:** Whether workers should query KB (Yes/No/Conditional)
- **Rationale:** Why this approach is optimal for leader-worker hierarchies
- **Context Passing Strategy:** How KB results flow from leader to workers (if applicable)
- **Worker Query Triggers:** When workers should query KB independently (if applicable)
- **Anti-Patterns:** What workers should NOT do with KB

**Evidence:**
- Documentation section clearly states "Workers SHOULD query KB" or "Workers SHOULD NOT query KB" or "Workers query KB ONLY when [condition]"
- Rationale explains trade-offs (performance, duplication, coverage)

### AC2: Context Passing Mechanism Documented

**Given** leader agents query KB before spawning workers
**When** leader-to-worker context passing is reviewed
**Then** documentation includes:
- **Mechanism:** How KB results are passed to workers (e.g., via worker prompt, via shared artifact, via environment variable)
- **Format:** Structure of KB context data (e.g., JSON, markdown, plain text)
- **Example:** Concrete code example showing leader passing KB context to worker
- **Scope:** What subset of KB results should be passed (all results vs. filtered subset)

**Evidence:**
- Code block showing leader agent spawning worker with KB context parameter
- Example worker agent receiving and using KB context
- Format specification (e.g., "KB context passed as JSON array of entry objects")

### AC3: Worker Query Triggers Defined (If Workers Query KB)

**Given** pattern allows workers to query KB
**When** worker query triggers are reviewed
**Then** documentation includes:
- At least 2 concrete scenarios when workers SHOULD query KB
- At least 2 concrete scenarios when workers SHOULD NOT query KB (rely on leader context)
- Example query patterns specific to worker domains (backend vs frontend vs playwright)

**Example triggers:**
- Worker SHOULD query: "Worker encounters domain-specific pattern not in leader's KB context (e.g., frontend-coder needs React component pattern, leader only queried backend patterns)"
- Worker SHOULD NOT query: "Leader already queried KB for general architecture context and passed results to worker"

**Evidence:**
- Decision tree or flowchart showing when worker queries KB vs. uses leader context
- 2+ concrete examples per query decision (query vs. reuse)

### AC4: Anti-Patterns Documented

**Given** worker agents may misuse KB integration
**When** anti-patterns section is reviewed
**Then** documentation includes at least 3 anti-patterns:
- **Duplicate Queries:** "Worker re-queries KB with same query string as leader (wasteful)"
- **Over-Querying:** "Worker queries KB for every minor decision instead of using leader context"
- **Ignoring Leader Context:** "Worker ignores KB results passed from leader and queries independently"
- Other anti-patterns identified during analysis

**Evidence:**
- "Anti-Patterns" section with 3+ bulleted items
- Each anti-pattern includes description and why it's problematic

### AC5: Worker Agent Examples Provided

**Given** worker agents need KB integration guidance
**When** example section is reviewed
**Then** documentation includes:
- Example 1: Worker using KB context passed from leader (no independent query)
- Example 2: Worker querying KB for worker-specific knowledge (if pattern allows)
- Example 3: Worker combining leader context + independent KB query (if applicable)

**Format:** Code blocks with pseudo-code showing agent logic

**Evidence:**
- 2-3 code examples demonstrating different worker KB interaction patterns
- Examples reference actual worker agent types (backend-coder, frontend-coder, playwright-engineer)

### AC6: Performance Guidance Included

**Given** worker KB queries may impact workflow performance
**When** performance guidance is reviewed
**Then** documentation includes:
- **Query Budget:** Maximum KB queries per worker (if pattern allows worker queries)
- **Caching Strategy:** Whether workers should cache KB results (or rely on leader's cache)
- **Parallel Query Risk:** Guidance on whether workers can query KB in parallel (if spawned concurrently)

**Example:** "Workers SHOULD limit KB queries to 1-2 per major subtask. Workers SHOULD NOT query KB in parallel (use leader's cached results)."

**Evidence:**
- Performance section with query budget guidance
- Caching/parallel query guidance documented

### AC7: Integration with KNOW-040 Pattern

**Given** KNOW-040 established leader agent KB integration
**When** worker pattern documentation is reviewed
**Then** documentation includes:
- Reference to KNOW-040 leader agent pattern
- Clarification of leader-worker KB access division of responsibility
- Compatibility note: "Worker pattern extends KNOW-040 leader pattern"

**Evidence:**
- "Relationship to Leader Pattern" section
- Clear statement: "Leaders query KB before spawning workers. Workers [pattern decision]."

### AC8: Decision Recorded with Reasoning

**Given** multiple valid approaches exist (workers query vs. don't query)
**When** pattern decision is reviewed
**Then** documentation includes:
- **Decision:** Explicit statement of chosen pattern
- **Alternatives Considered:** At least 2 alternative approaches evaluated
- **Trade-offs:** Pros/cons of chosen pattern vs. alternatives
- **Future Reassessment:** Criteria for revisiting decision (e.g., "If query costs exceed $X/month, reconsider")

**Evidence:**
- "Decision Record" section with decision, alternatives, trade-offs
- Explicit comparison table or bulleted pros/cons list

### AC9: Pilot Validation (Optional)

**Given** worker pattern is documented
**When** pilot story is executed (optional)
**Then:**
- Leader agent queries KB and spawns worker
- Worker agent follows documented pattern (uses leader context OR queries independently)
- Workflow completes without KB-related errors
- KB query count aligns with pattern expectations

**Note:** Pilot validation is optional (story points cover documentation only). Validation can occur during first real-world use of worker pattern.

**Evidence (if pilot executed):**
- Agent execution log showing leader KB query + worker behavior
- Query count analysis (e.g., "Leader: 1 query, Workers: 0 queries" or "Leader: 1 query, Workers: 2 queries")

### AC10: Pattern Added to Integration Guide

**Given** KB-AGENT-INTEGRATION.md exists (from KNOW-040)
**When** integration guide is reviewed
**Then** guide includes new "Worker Agent Pattern" section with:
- Pattern summary (1-2 paragraphs)
- Reference to detailed documentation (if separate file created)
- "When to apply" guidance (which worker types benefit)
- Link to examples

**Evidence:**
- `.claude/KB-AGENT-INTEGRATION.md` updated with worker pattern section
- Section length: ≤500 characters (concise summary)

## Reuse Plan

### Existing Infrastructure from KNOW-040

**Reused components:**
- KB integration template structure (from KNOW-040)
- KB citation format guidance (apply same format to workers)
- KB search schema and parameter documentation (workers use same kb_search tool)

**New components:**
- Leader-to-worker context passing pattern
- Worker-specific query triggers
- Worker anti-patterns documentation

### Existing Patterns to Follow

**From KNOW-040:**
- Use consistent documentation structure (When to query, How to query, How to apply, Fallback)
- Use concrete examples with realistic domain terms
- Limit character count to prevent prompt bloat
- Include error handling guidance

## Architecture Notes

### Leader-Worker KB Access Patterns (Options to Evaluate)

**Option 1: Leader-Only Pattern**
```
Leader queries KB → Passes relevant results to workers → Workers use leader context only
```

**Pros:**
- No duplicate KB queries (cost-efficient)
- Centralized knowledge access (easier to audit)
- Workers remain stateless (simpler design)

**Cons:**
- Leader must anticipate all worker knowledge needs
- Workers can't access worker-specific knowledge not in leader's query
- Less flexible for dynamic worker tasks

---

**Option 2: Worker-Independent Pattern**
```
Leader queries KB → Workers query KB independently → Workers ignore leader context
```

**Pros:**
- Workers access most relevant knowledge for their specific subtasks
- No dependency on leader's query coverage
- Supports specialized worker knowledge domains

**Cons:**
- Potential duplicate queries (leader + each worker query similar content)
- Higher KB query volume (cost impact)
- More complex audit trail

---

**Option 3: Hybrid Pattern (Leader + Worker Conditional)**
```
Leader queries KB → Passes results to workers → Workers query KB ONLY if leader context insufficient
```

**Pros:**
- Balances cost efficiency and coverage
- Workers have fallback for specialized knowledge
- Reduces duplicate queries (workers check leader context first)

**Cons:**
- More complex pattern (workers must evaluate context sufficiency)
- Risk of workers querying unnecessarily
- Requires clear guidance on "when leader context is insufficient"

---

**Recommendation:** Evaluate all 3 options, document chosen pattern with rationale in AC8.

### KB Context Passing Mechanisms (If Leader Passes Context)

**Mechanism 1: Worker Prompt Parameter**
```typescript
// Leader agent spawns worker with KB context
spawnWorker('backend-coder', {
  task: 'Implement auth service',
  kb_context: [
    { id: 'kb_123', title: 'Auth Best Practices', summary: '...' },
    { id: 'kb_456', title: 'JWT Implementation', summary: '...' }
  ]
})
```

**Mechanism 2: Shared Artifact File**
```markdown
<!-- Leader writes KB context to file -->
<!-- _implementation/KB-CONTEXT.md -->
## KB Context for Workers

- KB Entry kb_123: Auth Best Practices
- KB Entry kb_456: JWT Implementation
```

**Mechanism 3: Environment Variable (JSON)**
```bash
export KB_CONTEXT='[{"id":"kb_123","title":"...","summary":"..."}]'
```

**Recommendation:** Document chosen mechanism in AC2.

## Infrastructure Notes

**Not applicable** - no infrastructure changes required.

Agent instruction files are read at runtime. Changes take effect immediately when agents are spawned.

## HTTP Contract Plan

**Not applicable** - no API changes.

## Seed Requirements

**Not applicable** - no database changes.

## Test Plan

### Scope Summary

- **Endpoints touched:** None (documentation/agent instruction changes only)
- **UI touched:** No
- **Data/storage touched:** No

Testing focuses on verifying documentation completeness and validating pattern usability (optional pilot).

### Happy Path Tests

#### Test 1: Worker Pattern Documentation Complete

**Setup:**
- Open KB-AGENT-INTEGRATION.md or KB-WORKER-PATTERN.md

**Action:**
- Review documentation for 10 required sections (decision, rationale, context passing, triggers, anti-patterns, examples, performance, integration, decision record, guide update)

**Expected:**
- All 10 sections present
- Decision clearly stated (workers query vs. don't query vs. conditional)
- At least 2 examples provided

**Evidence:**
- Documentation file path
- Section headers confirmed

#### Test 2: Context Passing Mechanism Documented

**Setup:**
- Review context passing section

**Action:**
- Verify mechanism is specified (prompt parameter, shared file, env var, etc.)
- Verify format is defined (JSON, markdown, etc.)
- Verify example code is provided

**Expected:**
- Mechanism clearly described
- Code example shows leader passing context to worker
- Format specification included

**Evidence:**
- Code block showing context passing
- Format description (e.g., "JSON array of entry objects")

#### Test 3: Anti-Patterns Identified

**Setup:**
- Review anti-patterns section

**Action:**
- Count anti-patterns documented
- Verify each includes description and rationale

**Expected:**
- At least 3 anti-patterns listed
- Common issues addressed (duplicate queries, over-querying, ignoring context)

**Evidence:**
- Anti-patterns list with 3+ items
- Each item has explanation

#### Test 4: Worker Examples Provided

**Setup:**
- Review examples section

**Action:**
- Count example code blocks
- Verify examples cover different worker types or scenarios

**Expected:**
- 2-3 example code blocks
- Examples reference actual worker agents (backend-coder, frontend-coder, playwright-engineer)

**Evidence:**
- Code blocks with pseudo-code or actual agent logic
- Examples show different KB interaction patterns

### Error Cases

#### Error 1: Ambiguous Pattern Decision

**Setup:** Review decision section
**Action:** Check if pattern decision is clear and unambiguous
**Expected:** Decision states "Workers SHOULD query KB" or "Workers SHOULD NOT query KB" or "Workers query KB ONLY when [specific condition]"
**Evidence:** No ambiguity in decision statement

#### Error 2: Missing Context Passing Example (If Leader-Only Pattern)

**Setup:** Pattern chosen is "Leader-Only" (workers don't query)
**Action:** Verify context passing example exists
**Expected:** If workers rely on leader context, example MUST show how context is passed
**Evidence:** Code example showing leader passing KB results to worker

#### Error 3: Missing Worker Query Triggers (If Workers Query)

**Setup:** Pattern allows workers to query KB
**Action:** Verify query triggers are documented
**Expected:** At least 2 scenarios when workers SHOULD query and 2 scenarios when workers SHOULD NOT query
**Evidence:** Decision tree or trigger list with 4+ scenarios

### Edge Cases

#### Edge 1: Worker Query Budget Unclear

**Setup:** Workers allowed to query KB
**Action:** Verify query budget guidance exists
**Expected:** Documentation states maximum queries per worker (e.g., "1-2 queries per subtask, max 5 per workflow")
**Evidence:** Performance section with query budget

#### Edge 2: Parallel Worker KB Access

**Setup:** Leader spawns multiple workers in parallel
**Action:** Verify parallel query guidance exists
**Expected:** Documentation addresses whether workers can query KB concurrently or should serialize
**Evidence:** Performance section with parallel query guidance

#### Edge 3: Worker-Specific Knowledge Domains

**Setup:** Frontend workers need React patterns, backend workers need database patterns
**Action:** Verify pattern handles domain-specific knowledge needs
**Expected:** Documentation addresses how workers access specialized knowledge (leader queries all domains vs. workers query own domains)
**Evidence:** Pattern decision addresses domain specialization

### Required Tooling Evidence

#### Documentation Validation

**Required:**
1. Markdown validation: lint modified documentation files, verify no broken links
2. Content review: human review for clarity, verify examples are understandable
3. Completeness check: verify all 10 AC sections present

**Artifacts to capture:**
- File path to updated KB-AGENT-INTEGRATION.md
- File path to KB-WORKER-PATTERN.md (if created)
- Section headers list (confirm all required sections)

### Risks to Call Out

**Risk 1: Pattern Adoption Inconsistency**
Mitigation: Document pattern in integration guide, add to agent review checklist

**Risk 2: Over-Engineering Before Real-World Use**
Mitigation: Document simplest viable pattern, plan for reassessment after 5-10 real workflows

**Risk 3: Duplicate Queries (If Workers Query Independently)**
Mitigation: Include performance guidance and query budget, monitor query volume in KNOW-041 logs

**Risk 4: Insufficient Leader Context (If Leader-Only Pattern)**
Mitigation: Document fallback: if leader context insufficient, workers can query KB (hybrid pattern)

### Test Prerequisites

1. KNOW-040 completed (leader agent KB integration established)
2. Worker agent files identified (backend-coder, frontend-coder, playwright-engineer exist)
3. Integration guide KB-AGENT-INTEGRATION.md exists

## UI/UX Notes

**Not applicable** - no UI changes. This story modifies agent instruction documentation only.

## Risk Register

### Risk 1: Pattern Choice Wrong for Real-World Use (P2, MEDIUM LIKELIHOOD)

**Impact:** Chosen pattern (leader-only, worker-independent, or hybrid) doesn't match actual workflow needs, requires rework

**Mitigation:**
- Document decision record with alternatives and trade-offs
- Include "Future Reassessment" criteria (e.g., reassess after 10 workflows)
- Keep pattern simple (prefer leader-only unless clear need for worker queries)

### Risk 2: Over-Querying (P2, MEDIUM LIKELIHOOD)

**Impact:** If workers query KB independently, query volume may exceed budget

**Mitigation:**
- Document query budget (1-2 queries per worker)
- Include anti-pattern: "Workers SHOULD NOT query KB for every minor decision"
- Plan for monitoring via KNOW-041 query logging

### Risk 3: Insufficient Worker Knowledge (P2, MEDIUM LIKELIHOOD)

**Impact:** If leader-only pattern, workers may lack domain-specific knowledge (e.g., frontend patterns)

**Mitigation:**
- Hybrid pattern as fallback (workers query if leader context insufficient)
- Document when workers should query independently
- Plan for pattern evolution based on real-world feedback

### Risk 4: Documentation Drift (P3, LOW LIKELIHOOD)

**Impact:** Worker pattern documentation becomes outdated as agent workflows evolve

**Mitigation:**
- Include maintenance note: "Review worker pattern after major agent workflow changes"
- Link pattern to agent review checklist
- Plan for periodic documentation review

## Implementation Notes

### Pre-Implementation Decisions Required

**REQUIRED DECISIONS:**

1. **Pattern Choice:**
   - Leader-Only (workers use leader context only)?
   - Worker-Independent (workers query KB independently)?
   - Hybrid (workers query if leader context insufficient)?
   - **Recommendation:** Start with Leader-Only (simplest), evolve to Hybrid if needed

2. **Context Passing Mechanism (If Leader-Only or Hybrid):**
   - Worker prompt parameter?
   - Shared artifact file (`_implementation/KB-CONTEXT.md`)?
   - Environment variable?
   - **Recommendation:** Worker prompt parameter (cleanest API)

3. **Worker Query Budget (If Workers Query):**
   - Maximum queries per worker: 1, 2, or 3?
   - **Recommendation:** 1-2 queries per worker, max 5 per workflow

4. **Pilot Validation:**
   - Execute pilot story to validate pattern (optional)?
   - Or document pattern and validate in real-world use?
   - **Recommendation:** Document only, validate in next real workflow

### Implementation Order

1. **Analyze Existing Worker Agents** (30 min)
   - Review backend-coder, frontend-coder, playwright-engineer agent files
   - Identify current workflow patterns (how workers receive context from leaders)
   - Document findings

2. **Evaluate Pattern Options** (1 hour)
   - Assess leader-only, worker-independent, hybrid patterns
   - Consider trade-offs (cost, coverage, complexity)
   - Make pattern decision

3. **Document Worker Pattern** (2 hours)
   - Write pattern decision and rationale (AC1, AC8)
   - Document context passing mechanism (AC2)
   - Document worker query triggers (AC3, if applicable)
   - Document anti-patterns (AC4)
   - Write examples (AC5)
   - Add performance guidance (AC6)

4. **Update Integration Guide** (30 min)
   - Add "Worker Agent Pattern" section to KB-AGENT-INTEGRATION.md (AC10)
   - Link to detailed worker pattern documentation (if separate file)

5. **Review and Validate** (30 min)
   - Verify all 10 ACs met
   - Review documentation for clarity
   - Check for broken links or formatting issues

### Success Criteria Summary

A developer adding KB integration to a new worker agent should be able to:
1. Understand whether workers should query KB or rely on leader context
2. Implement context passing mechanism (if leader-only pattern)
3. Know when workers should query KB independently (if hybrid pattern)
4. Avoid anti-patterns (duplicate queries, over-querying)
5. Follow performance guidance (query budget)

If pattern is unclear, documentation should reference decision record with rationale.

---

## Related Stories

**Depends on:** KNOW-040 (Agent Instruction Integration) - Establishes leader agent KB integration pattern

**Blocks:** None

**Related:**
- KNOW-042 (KB-First Workflow Hooks) - May automate leader-to-worker context passing
- KNOW-041 (Query Audit Logging) - Tracks KB usage to validate worker pattern efficiency

---

## Notes

- Pattern decision is critical: choose simplest viable approach (recommend leader-only)
- Documentation is the deliverable; implementation deferred to future worker agent updates
- Plan for pattern reassessment after 10 real-world workflows
- If leader-only pattern, leader must anticipate worker knowledge needs (may require broader KB queries)
- If hybrid pattern, define clear triggers for when workers query independently

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Generation | — | — | — |

(To be filled during implementation)
