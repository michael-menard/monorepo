---
name: adversarial-review
description: Multi-role adversarial code review with debate rounds. Specialists review code from different perspectives, challenge each other's findings, and converge on consensus or preserve dissents. Point at any file, directory, or glob pattern. Backend-focused with LangGraph, Database, AI Applications, and Multi-Agent Workflow experts.
mcp_tools_available:
  - context7 # For LangGraph, OpenAI, multi-agent docs
  - kb_search # For project-specific patterns
  - postgres-mcp # For DB schema/query analysis
  - kb_log_tokens # For token tracking
  - kb_add_decision # For ruling decisions
  - kb_add_lesson # For effectiveness tracking
  - kb_write_artifact # For review sessions
---

# /adversarial-review - Adversarial Code Review Round Table

## Description

Multi-role adversarial code review where specialist agents review from different perspectives, challenge each other's findings through structured debate rounds, and converge on consensus (or preserve dissents).

**Backend-focused** - Optimized for LangGraph workflows, database code, AI integrations, and multi-agent orchestration.

**Key Features:**

- Point at any file, directory, or glob pattern
- 6 specialist roles with backend focus
- Multi-model: Sonnet for complex analysis, Opus for AI reasoning, Haiku for focused tasks
- Structured 3-round debate with adversarial challenges
- No forced consensus - arbiter makes binding rulings
- Dissents preserved with opposing views
- Severity-weighted final recommendations
- **KB-powered learning** - tracks rulings, tokens, and effectiveness over time

## Usage

```bash
# Review a specific file
/adversarial-review packages/backend/orchestrator/src/graphs/implementation.ts

# Review a directory
/adversarial-review packages/backend/orchestrator/src/

# Review with glob pattern
/adversarial-review "packages/**/*graph*.ts"

# Quick mode (fewer roles, faster)
/adversarial-review src/auth.ts --quick

# Deep mode (all roles, 3 debate rounds)
/adversarial-review packages/langgraph/ --deep

# Custom roles only
/adversarial-review src/api.ts --roles=langgraph,database,ai-apps
```

## Parameters

- **target** - File path, directory, or glob pattern to review
- **--quick** - Run 4 roles, 1 debate round (faster)
- **--deep** - Run all roles, 3 debate rounds (thorough)
- **--roles** - Comma-separated list of roles: langgraph,database,ai-apps,multiagent,security,performance,architecture,devils-advocate
- **--no-track** - Disable KB outcome tracking (opt-out, tracking is enabled by default)

---

## EXECUTION INSTRUCTIONS

**CRITICAL: Use Task tool to spawn agents. Use TodoWrite to track progress.**

---

## Knowledge Base Integration

The adversarial review process is KB-powered - it learns from past reviews, rulings, and outcomes.

**Tracking is ON by default.** Use `--no-track` to disable.

### What Gets Tracked

| Category               | KB Tool             | Purpose                             |
| ---------------------- | ------------------- | ----------------------------------- |
| **Review Sessions**    | `kb_write_artifact` | Historical record of each review    |
| **Rulings**            | `kb_add_decision`   | Arbiter decisions with context      |
| **Token Usage**        | `kb_log_tokens`     | Cost tracking per role/round        |
| **Model Performance**  | `kb_log_tokens`     | Track model per role & outcome      |
| **Ruling Accuracy**    | `kb_add_lesson`     | Did fixes work? Was severity right? |
| **Contested Patterns** | `kb_add_note`       | What commonly gets debated?         |

### KB Schema: arbiter-review

Each review creates an artifact:

```yaml
arbiter_review_session:
  session_id: 'uuid'
  target: 'packages/backend/orchestrator/src/graphs/'
  mode: 'deep'
  timestamp: '2026-03-20T10:00:00Z'

  rounds:
    round1:
      agents:
        - role: 'langgraph'
          model: 'claude-sonnet-4-5-20250514'
          findings_count: 5
          tokens: { input: 12000, output: 4000 }
        - role: 'database'
          model: 'claude-sonnet-4-5-20250514'
          findings_count: 3
          tokens: { input: 8000, output: 3000 }
        - role: 'ai-apps'
          model: 'claude-opus-4-5-20250514'
          findings_count: 4
          tokens: { input: 15000, output: 6000 }
        # ...
      total_findings: 23
      total_tokens: { input: 85000, output: 32000 }
    round2:
      agents:
        - role: 'langgraph-challenge'
          model: 'claude-sonnet-4-5-20250514'
          challenges_count: 8
        - role: 'ai-apps-challenge'
          model: 'claude-opus-4-5-20250514'
          challenges_count: 5
      total_challenges: 28
    round3:
      arbiter:
        model: 'claude-opus-4-5-20250514'
        contested_rulings: 5
        tokens: { input: 25000, output: 8000 }

  rulings:
    - finding_id: 'LG-001'
      ruling: 'upheld'
      contested_by: ['devils_advocate']
      severity: 'high'
      source_agent_role: 'langgraph'
      source_agent_model: 'claude-sonnet-4-5-20250514'
      outcome: pending # updated after fixes
      effort: 'medium'

  effectiveness_tracking:
    - finding_id: 'LG-001'
      fixed: true|false|null # null = not yet tracked
      severity_accurate: true|false|null
      outcome_notes: '...'

  cost_summary:
    total_tokens: { N }
    estimated_cost_usd: '{price}'

  kb_references:
    - type: 'similar_ruling'
      past_session_id: 'uuid'
      past_ruling: 'DISMISSED'
      past_accuracy: 'correct' # lesson learned
```

### Before Review: Query Past Rulings

```
kb_search(
  query: "LangGraph state serialization ruling",
  entry_type: "decision",
  tags: ["arbiter-ruling", "langgraph"]
)

→ Returns past rulings on similar issues
→ Arbiter can see: "Similar issue was DISMISSED last time, was that correct?"
```

### After Review: Log Session

```
kb_write_artifact(
  artifact_type: "arbiter-review",
  content: {arbiter_review_session},
  tags: ["arbiter-review", "deep-mode", "langgraph"]
)
```

### Outcome Tracking: Log Lessons

After the code is fixed, update with effectiveness:

```
kb_add_lesson(
  title: "Arbiter ruling accuracy: LG-001",
  what_happened: "Arbiter upheld N+1 finding, severity HIGH",
  resolution: "Fix applied, no regression after 2 weeks",
  category: "arbiter-effectiveness",
  story_id: "REVIEW-{date}"
)

→ Future arbiter can query: "Has upholding N+1 findings been correct historically?"
```

---

## Phase 1: Initialize & Load Knowledge

```
TodoWrite([
  { content: "Resolve target and gather code context", status: "in_progress", activeForm: "Resolving target" },
  { content: "Load KB past rulings for similar issues", status: "pending", activeForm: "Loading KB past rulings" },
  { content: "Load knowledge packs for each role", status: "pending", activeForm: "Loading knowledge packs" },
  { content: "Spawn specialist agents (Round 1)", status: "pending", activeForm: "Spawning Round 1 specialists" },
  { content: "Collect initial findings + log tokens", status: "pending", activeForm: "Collecting Round 1 findings" },
  { content: "Spawn challenge agents (Round 2)", status: "pending", activeForm: "Spawning Round 2 challenges" },
  { content: "Collect challenge responses + log tokens", status: "pending", activeForm: "Collecting Round 2 responses" },
  { content: "Spawn arbiter for final ruling (Round 3)", status: "pending", activeForm: "Running arbiter round" },
  { content: "Log review session to KB", status: "pending", activeForm: "Logging to KB" },
  { content: "Generate final report with rulings", status: "pending", activeForm: "Generating final report" }
])
```

### 1.1 Query Past Rulings from KB

Before spawning specialists, query KB for relevant past rulings:

```
# Search for similar past rulings
kb_search(
  query: "{target_domain} arbiter ruling patterns",
  tags: ["arbiter-review"],
  limit: 5
)

# Example: If reviewing LangGraph code
kb_search(
  query: "LangGraph state checkpoint ruling upheld dismissed",
  entry_type: "decision",
  tags: ["arbiter-ruling"],
  limit: 10
)

# Search for lessons about ruling accuracy
kb_search(
  query: "arbiter ruling accuracy effectiveness",
  entry_type: "lesson",
  tags: ["arbiter-effectiveness"],
  limit: 5
)
```

### 1.2 Load Past Rulings into Context

For the Arbiter's Round 3 prompt, include:

````
PAST RULINGS ON SIMILAR ISSUES:
```yaml
{past_rulings_from_kb}
````

ARBITER EFFECTIVENESS TRACKING:

```yaml
# Example: Has "upheld" rulings on N+1 issues been correct?
past_upheld_n_plus_one:
  total: 12
  confirmed_correct: 10 # fixes worked
  confirmed_wrong: 2 # fixes unnecessary or wrong severity
  accuracy_rate: 0.83

past_dismissed_issues:
  total: 5
  should_have_upheld: 1 # same issue recurred
  accuracy_rate: 0.80
```

NOTE: The Arbiter should consider past accuracy when ruling, but is NOT bound by it.

````

### Knowledge Loading

**For each role, load relevant knowledge before spawning:**

#### LangGraph Expert Knowledge

```yaml
context7_queries:
  - library_id: '/websites/langchain_oss_javascript_langgraph'
    query: 'StateGraph Annotation state management node patterns checkpointing'
  - library_id: '/langchain-ai/langgraph'
    query: 'tool calling memory integration graph composition patterns'

kb_queries:
  - query: 'langgraph workflow patterns state management'
    limit: 5
````

#### Database Expert Knowledge

```yaml
schema_files:
  - packages/backend/orchestrator/src/db/story-repository.ts
  - packages/backend/orchestrator/src/state/graph-state.ts

kb_queries:
  - query: 'database postgresql patterns schema'
    limit: 5
```

#### AI Apps Expert Knowledge

```yaml
context7_queries:
  - library_id: '/openai/openai-node'
    query: 'function calling prompts assistant API streaming'
  - library_id: '/websites/developers_openai_api'
    query: 'best practices prompts gpt models'

existing_patterns:
  - packages/backend/orchestrator/src/providers/openrouter.ts
```

#### Multi-Agent Workflow Expert Knowledge

```yaml
context7_queries:
  - library_id: '/websites/langchain_oss_javascript_langgraph'
    query: 'multi-agent orchestration handoffs task delegation parallel execution'

kb_queries:
  - query: 'multi-agent workflow agent orchestration'
    limit: 5
```

---

## Phase 2: Round 1 - Independent Specialist Reviews

**Spawn all specialist agents in parallel with `run_in_background: true`**

### Specialist Roles (Backend-Focused)

#### A. LangGraph Expert (sonnet)

**Knowledge sources:**

- Context7: LangGraph JS docs (state, nodes, checkpointing)
- KB: langgraph patterns, state management lessons
- Project: existing graph patterns in `packages/backend/orchestrator/src/graphs/`

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-sonnet-4-5-20250514",
  description: "LangGraph review - Round 1",
  run_in_background: true,
  prompt: "You are a LangGraph expert conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

PROJECT LANGGRAPH PATTERNS (from your codebase):
- State annotation uses LangGraph's Annotation.Root pattern
- Zod-first: all state uses Zod schemas, no TypeScript interfaces
- Graph composition: StateGraph with START, END edges
- Node patterns: createToolNode factory, injectable adapters
- Error handling: top-level catch converts errors to warnings

YOUR ROLE: LangGraph Expert
- Focus: State management, node patterns, graph composition, checkpointing
- Challenge: Find where LangGraph patterns are violated or could fail

REVIEW FOCUS:
1. State annotation correctness (Annotation.Root usage)
2. Zod schema vs TypeScript interface violations (must use Zod)
3. Node composition patterns (createToolNode, injectable adapters)
4. Graph edge logic (START, END, conditional routing)
5. Error handling in nodes (should convert to warnings, not throw)
6. State projection in nested graph invocation
7. Checkpoint and memory integration if present
8. Streaming and durability patterns

For each finding, provide:
- severity: critical|high|medium|low
- type: The LangGraph issue category
- location: file and line
- description: What you found
- impact: How this affects graph reliability
- challenge: What would break under load or edge cases?

OUTPUT FORMAT:
```yaml
langgraph_findings:
  - id: LG-001
    severity: high
    type: state-annotation-violation
    location: "src/graphs/impl.ts:67"
    description: "..."
    impact: "State may not serialize correctly across checkpoint boundaries"
    challenge: "Show this state works across process restarts..."
  total_critical: 0
  total_high: 1
  total_medium: 2
  total_low: 0
  confidence: high|medium|low
```"
)
````

#### B. Database/Data Expert (sonnet)

**Knowledge sources:**

- Schema files from project
- KB: PostgreSQL patterns, partitioning, FK patterns
- Postgres MCP: query analysis if available

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-sonnet-4-5-20250514",
  description: "Database review - Round 1",
  run_in_background: true,
  prompt: "You are a database expert conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

PROJECT DATABASE PATTERNS:
- PostgreSQL with pgvector for embeddings
- Partitioning patterns for telemetry tables
- Foreign key patterns with per-partition indexes
- pgTAP for database testing
- Zod schemas for runtime validation

YOUR ROLE: Database Expert
- Focus: Query patterns, schema design, indexes, data integrity
- Challenge: Find where data could be lost, corrupted, or become inconsistent

REVIEW FOCUS:
1. N+1 query patterns (watch for loops with DB calls)
2. Missing indexes for query patterns
3. FK constraint violations or missing indexes
4. Partitioning edge cases (boundary dates, default partitions)
5. Transaction isolation issues (dirty reads, lost updates)
6. Query injection vulnerabilities
7. Connection pool exhaustion patterns
8. Batch operation efficiency (bulk vs individual)

For each finding, provide:
- severity: critical|high|medium|low
- type: The database issue category
- location: file and line
- description: What you found
- impact: Query performance or data integrity impact
- challenge: "Show this query performs at 1000 records..."

OUTPUT FORMAT:
```yaml
database_findings:
  - id: DB-001
    severity: high
    type: n-plus-one
    location: "src/db/repository.ts:45"
    description: "..."
    impact: "O(n) queries, will break at 100+ records"
    challenge: "Show this query is efficient at scale..."
  total_critical: 0
  total_high: 1
  total_medium: 2
  total_low: 0
  confidence: high|medium|low
```"
)
````

#### C. AI Applications Builder (opus)

**Knowledge sources:**

- Context7: OpenAI API, function calling, prompt engineering
- KB: LLM integration lessons
- Project: existing LLM calls in `packages/backend/orchestrator/src/providers/`

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-opus-4-5-20250514",
  description: "AI Applications review - Round 1",
  run_in_background: true,
  prompt: "You are an AI Applications expert (Opus-tier reasoning) conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

PROJECT AI PATTERNS:
- OpenRouter provider for multi-model access
- Model routing with affinity-based dispatch
- Token bucketing for rate limiting
- Budget accumulation per story
- Zod schema for tool outputs
- Streaming support where needed

YOUR ROLE: AI Applications Builder (Opus-tier)
- Focus: LLM integration, prompt quality, function calling, model selection
- Challenge: Think deeply - what could go wrong with AI integrations under production load?

REVIEW FOCUS:
1. Prompt injection vulnerabilities
2. Function calling schema design (Zod vs JSON Schema)
3. Model selection logic (is the right model used for each task?)
4. Token budget management (could we run out mid-request?)
5. Rate limiting edge cases
6. Streaming vs non-streaming consistency
7. Error handling when LLM returns malformed output
8. Context window management (truncation, summarization)

For each finding, provide:
- severity: critical|high|medium|low
- type: The AI integration issue category
- location: file and line
- description: What you found
- impact: Production reliability or cost impact
- challenge: Deep question about edge cases...

OUTPUT FORMAT:
```yaml
ai_apps_findings:
  - id: AI-001
    severity: high
    type: prompt-injection
    location: "src/providers/llm.ts:78"
    description: "..."
    impact: "User input could manipulate LLM behavior"
    challenge: "What happens when user input contains prompt injection attempts?"
  total_critical: 0
  total_high: 1
  total_medium: 2
  total_low: 0
  confidence: high|medium|low
```"
)
````

#### D. Multi-Agent Workflow Expert (sonnet)

**Knowledge sources:**

- Context7: multi-agent patterns, handoffs, delegation
- KB: workflow lessons, agent orchestration patterns
- Project: pipeline patterns in orchestrator

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-sonnet-4-5-20250514",
  description: "Multi-Agent Workflow review - Round 1",
  run_in_background: true,
  prompt: "You are a Multi-Agent Workflow expert conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

PROJECT WORKFLOW PATTERNS:
- LangGraph-based workflow orchestration
- Pipeline model dispatch (escalation chain: ollama → openrouter → anthropic)
- Agent handoffs between graph nodes
- State passing between workflow phases
- Budget and rate limiting per agent
- Parallel fan-out with aggregation (map-reduce patterns)

YOUR ROLE: Multi-Agent Workflow Expert
- Focus: Agent orchestration, handoffs, state consistency, parallel execution
- Challenge: Find where workflow could deadlock, lose state, or produce inconsistent results

REVIEW FOCUS:
1. Agent handoff reliability (is state preserved?)
2. Parallel execution correctness (race conditions?)
3. State consistency across workflow phases
4. Timeout and retry logic
5. Dead letter handling (what happens when agent fails?)
6. Budget exhaustion mid-workflow
7. Concurrent execution limits
8. Workflow cancellation handling

For each finding, provide:
- severity: critical|high|medium|low
- type: The workflow orchestration issue category
- location: file and line
- description: What you found
- impact: Workflow reliability or correctness impact
- challenge: What breaks under concurrent execution?

OUTPUT FORMAT:
```yaml
workflow_findings:
  - id: WF-001
    severity: critical
    type: state-loss-handoff
    location: "src/pipeline/dispatch.ts:89"
    description: "..."
    impact: "Agent state lost during handoff, workflow produces wrong result"
    challenge: "Show state is preserved across agent handoffs..."
  total_critical: 1
  total_high: 0
  total_medium: 2
  total_low: 1
  confidence: high|medium|low
```"
)
````

#### E. Security Auditor (sonnet)

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-sonnet-4-5-20250514",
  description: "Security audit - Round 1",
  run_in_background: true,
  prompt: "You are a security auditor conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

YOUR ROLE: Security Auditor
- Focus: Authentication, authorization, injection, data exposure
- Challenge: Be critical. Assume malicious intent. Look for edge cases.

REVIEW FOCUS:
1. Authentication/authorization bypass risks
2. Injection vulnerabilities (SQL, command, prompt)
3. Sensitive data exposure (logs, errors, responses)
4. Hardcoded secrets or credentials
5. Secret management (environment vs AWS Secrets Manager)
6. API authentication patterns
7. Input validation gaps

OUTPUT FORMAT:
```yaml
security_findings:
  - id: SEC-001
    severity: high
    type: injection
    location: "src/api/handler.ts:45"
    description: "..."
    impact: "..."
    challenge: "..."
```"
)
````

#### F. Performance Profiler (sonnet)

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-sonnet-4-5-20250514",
  description: "Performance review - Round 1",
  run_in_background: true,
  prompt: "You are a performance engineer conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

YOUR ROLE: Performance Profiler
- Focus: Algorithmic complexity, resource leaks, unnecessary work
- Challenge: Find where this code will fail under load or scale.

REVIEW FOCUS:
1. N+1 patterns
2. Unbounded operations (no pagination, streaming)
3. Memory leaks (event listeners, closures, caches)
4. Synchronous blocking operations
5. Inefficient data structures or algorithms
6. Missing connection pool management
7. Cache invalidation issues

OUTPUT FORMAT:
```yaml
performance_findings:
  - id: PERF-001
    severity: high
    type: n-plus-one
    location: "src/service.ts:67"
    description: "..."
    impact: "O(n) queries per request, breaks at ~100 users"
    challenge: "..."
```"
)
````

#### G. Architecture Reviewer (opus)

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-opus-4-5-20250514",
  description: "Architecture review - Round 1",
  run_in_background: true,
  prompt: "You are a software architect conducting an adversarial code review.

CODE TO REVIEW:
```{code_context}```

PROJECT ARCHITECTURE PATTERNS:
- Zod-first (no TypeScript interfaces for types)
- Injectable adapters for testability
- Pipeline patterns (dispatch, routing, rate limiting)
- Repository pattern for data access
- Error handling with typed error codes

YOUR ROLE: Architecture Reviewer (Opus-tier)
- Focus: Design patterns, SOLID, separation of concerns, coupling
- Challenge: Think deeply - how will this code evolve?

REVIEW FOCUS:
1. SOLID principle violations
2. Tight coupling between modules
3. Missing abstractions or leaky abstractions
4. Dependency direction violations
5. Error handling consistency
6. Testability concerns
7. Separation of concerns violations

OUTPUT FORMAT:
```yaml
architecture_findings:
  - id: ARCH-001
    severity: medium
    type: solid-violation
    location: "src/service.ts:89"
    description: "..."
    impact: "..."
    challenge: "Show how adding a new data source would work..."
```"
)
````

#### H. Devil's Advocate (haiku)

````
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Devil's advocate - Round 1",
  run_in_background: true,
  prompt: "You are a Devil's Advocate conducting an adversarial review.

CODE TO REVIEW:
```{code_context}```

YOUR ROLE: Devil's Advocate
- Focus: Challenge assumptions, find edge cases, question requirements
- Challenge EVERYTHING. If the author claims it works, find when it doesn't.

REVIEW FOCUS:
1. Edge cases (null, undefined, empty, zero, negative)
2. Race conditions in async code
3. What if external service fails?
4. Happy path vs error path coverage
5. Localization, timezone, encoding edge cases
6. Scale testing (0, 1, 100, 1M items)
7. Concurrent access patterns

OUTPUT FORMAT:
```yaml
devils_advocate_findings:
  - id: DAVE-001
    severity: high
    type: edge-case
    location: "src/parser.ts:34"
    description: "..."
    scenario: "When input is empty string..."
    challenge: "What happens when the input is an empty string?"
```"
)
````

---

## Phase 3: Collect Round 1 Findings & Log Tokens

Aggregate all findings into unified structure:

```yaml
round1_findings:
  langgraph: { task_output }
  database: { task_output }
  ai_apps: { task_output }
  multiagent: { task_output }
  security: { task_output }
  performance: { task_output }
  architecture: { task_output }
  devils_advocate: { task_output }

total_findings: { sum }
critical_issues: { count }
high_issues: { count }

# Track token usage for cost analysis
round1_tokens:
  input: { total_input_tokens }
  output: { total_output_tokens }
  by_role:
    langgraph: { model: 'claude-sonnet-4-5-20250514', input: X, output: Y }
    database: { model: 'claude-sonnet-4-5-20250514', input: X, output: Y }
    ai_apps: { model: 'claude-opus-4-5-20250514', input: X, output: Y }
    # ...
```

### Log Round 1 Tokens to KB

```
kb_log_tokens(
  story_id: "ARBITER-REVIEW-{timestamp}",
  phase: "arbiter-round1",
  input_tokens: { total_input_tokens },
  output_tokens: { total_output_tokens },
  agent: "adversarial-review-round1"
)

# Log per-role model performance
kb_log_tokens(
  story_id: "ARBITER-REVIEW-{timestamp}",
  phase: "arbiter-round1",
  input_tokens: { role_input },
  output_tokens: { role_output },
  agent: "langgraph-sonnet"
)
# ... repeat for each role with their model
```

---

## Phase 4: Round 2 - Adversarial Challenges

### Challenge Pattern

Each challenge agent receives all Round 1 findings and must:

1. **Defend** findings they agree with
2. **Challenge** findings they think are wrong or overstated
3. **Counter** with alternative perspectives

#### Challenge from LangGraph POV

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-sonnet-4-5-20250514",
  description: "Cross-examine findings - LangGraph lens",
  run_in_background: true,
  prompt: "You are a LangGraph expert cross-examining code review findings.

CODE UNDER REVIEW:
```{code_context}```

ROUND 1 FINDINGS:
```yaml
{round1_findings}
````

YOUR TASK:

1. For each finding from other specialists:
   - Does it have LangGraph implications?
   - Could this affect graph state, nodes, or checkpointing?
   - Is there a LangGraph-native solution?

2. For each LangGraph finding:
   - Is the challenge in the finding valid?
   - Are there related LangGraph issues the original reviewer missed?

3. Identify findings that ARE LangGraph issues but weren't flagged

OUTPUT FORMAT:

````yaml
challenge_defenses:
  - finding_id: "DB-001"
    langgraph_connection: "This query pattern would cause checkpoint failures..."
    recommended_approach: "Use buffered state updates..."

challenge_additions:
  - original_findings_missed: "..."
    langgraph_risk: "..."

consensus_list:
  - id: "LG-001"
    verdict: agree|disagree|modify
    final_severity: critical|high|medium|low
```"
)
````

#### Challenge from AI Apps POV

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-opus-4-5-20250514",
  description: "Cross-examine findings - AI Apps lens",
  run_in_background: true,
  prompt: "You are an AI Applications expert (Opus reasoning) cross-examining findings.

CODE UNDER REVIEW:
```{code_context}```

ROUND 1 FINDINGS:
```yaml
{round1_findings}
````

YOUR TASK:

1. For each finding, assess AI integration implications
2. Challenge findings that understate or overstate AI risks
3. Identify AI-specific issues other reviewers missed

OUTPUT FORMAT:

````yaml
ai_risk_assessment:
  - finding_id: "ARCH-001"
    ai_implications: "..."
    model_selection_concern: "..."
    budget_impact: "..."

consensus_list:
  - id: "AI-001"
    verdict: agree|disagree|modify
```"
)
````

#### Challenge Synthesis

````
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  description: "Resolve challenges to findings",
  run_in_background: true,
  prompt: "You are resolving conflicts between reviewers.

ROUND 1 FINDINGS:
```yaml
{round1_findings}
````

CHALLENGE RESPONSES:

```yaml
{ challenge_responses }
```

YOUR TASK:
For each finding, determine:

1. Was the challenge valid?
2. Does the finding still stand?
3. Should severity change?

OUTPUT FORMAT:

````yaml
resolution:
  consensus_findings:
    - id: "LG-001"
      final_severity: high
      status: confirmed|modified|retracted
      consensus_note: "All reviewers agree..."

  dissents:
    - id: "ARCH-003"
      original_severity: medium
      final_severity: high
      dissent_note: "DA disagrees..."
      dissenting_roles: ["devils_advocate"]

severity_recalibration:
  escalated: ["...", "..."]
  deescalated: ["...", "..."]

consensus_rate: 0.85
```"
)
````

### Log Round 2 Tokens to KB

```
kb_log_tokens(
  story_id: "ARBITER-REVIEW-{timestamp}",
  phase: "arbiter-round2",
  input_tokens: { total_input_tokens },
  output_tokens: { total_output_tokens },
  agent: "adversarial-review-round2"
)
```

### Load Past Rulings for Arbiter Context

```
# Query KB for similar past rulings to inform Arbiter
kb_search(
  query: "{finding_type} {finding_category} arbiter ruling",
  entry_type: "decision",
  tags: ["arbiter-ruling", "{category}"],
  limit: 5
)

# Query ruling accuracy lessons
kb_search(
  query: "arbiter ruling accuracy {severity}",
  entry_type: "lesson",
  tags: ["arbiter-effectiveness"],
  limit: 3
)
```

---

## Phase 5: Round 3 - Arbiter Ruling (Deep Mode Only)

**After 3 rounds of debate, the Arbiter makes binding rulings on contested findings.**

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-opus-4-5-20250514",
  description: "Arbiter ruling - Round 3",
  run_in_background: true,
  prompt: "You are the Arbiter. After 3 rounds of adversarial debate, you must make binding rulings on all contested findings.

DEBATE HISTORY:
```yaml
{all_debate_history}
````

ROUND 1 FINDINGS (Initial):

```yaml
{ round1_findings }
```

ROUND 2 CHALLENGES (Cross-examination):

```yaml
{ round2_challenges }
```

PAST RULINGS ON SIMILAR ISSUES (from KB):

```yaml
{ past_rulings_from_kb }
```

ARBITER EFFECTIVENESS TRACKING:

```yaml
# Example: Has "upheld" rulings on N+1 issues been correct historically?
past_upheld_n_plus_one:
  total: 12
  confirmed_correct: 10 # fixes worked
  confirmed_wrong: 2 # severity was wrong
  accuracy_rate: 0.83

past_dismissed_issues:
  total: 5
  should_have_upheld: 1 # same issue recurred
  accuracy_rate: 0.80
```

NOTE: Past accuracy informs but does NOT bind your ruling. Each case is unique.

YOUR ROLE AS ARBITER:

- You do NOT seek consensus - you MAKE DECISIONS
- When specialists disagree, YOU decide who is right
- Consider the strength of arguments, not popularity
- Be decisive - "in doubt, lean toward caution"
- Preserve dissenting opinions but make clear rulings

FOR EACH FINDING, DETERMINE:

1. **AGREED** - All reviewers accept this finding
   - Status: confirmed
   - Proceed to recommendations

2. **CONTESTED** - Reviewers disagree
   - Status: upheld | modified | dismissed
   - RULING: Your binding decision
   - REASONING: Why you ruled this way
   - DISSENT: Preserved opposing view

3. **NEW** - Issues discovered during debate that weren't in Round 1
   - Add to findings with appropriate severity

OUTPUT FORMAT:

```yaml
arbiter_ruling:
  agreed_findings:
    - id: 'LG-001'
      severity: high
      status: confirmed
      finding: '...'
      all_reviewers_agreed: true

  contested_findings:
    - id: 'ARCH-003'
      original_severity: medium
      original_position: 'Should be high - tight coupling'
      challenger_position: 'Disagree - acceptable for this context'

      ruling: upheld|modified|dismissed
      final_severity: high|medium|low
      ruling_reasoning: |
        "The coupling concern is valid. Even if acceptable NOW,
        it creates technical debt that will compound..."

      dissent_preserved:
        - role: 'architecture-reviewer'
          view: 'Disagrees - acceptable given constraints'
        - role: 'devils_advocate'
          view: 'Concern is overstated'

    - id: 'SEC-002'
      original_severity: high
      ruling: modified
      final_severity: medium
      ruling_reasoning: |
        "The vulnerability exists but requires specific preconditions
        that are unlikely in production..."

  new_findings:
    - id: 'ARB-001'
      severity: medium
      discovered_by: 'arbiter'
      description: '...'
      ruling_reasoning: '...'

  root_causes:
    - cause: 'Missing error handling abstraction'
      affected_findings: ['LG-001', 'WF-003', 'ARCH-002']
      recommended_fix: '...'

  top_priorities:
    - priority: 1
      finding_id: 'WF-001'
      action: '...'
      effort: small|medium|large
      risk_if_not_fixed: high|medium|low

  overall_assessment:
    risk_level: critical|high|medium|low
    ruling_summary: |
      After 3 rounds of debate:
      - {N} findings agreed
      - {N} findings contested, {upheld}/{modified}/{dismissed}
      - {N} new issues identified

    recommendation: '...'
```

)

````
Task(
  subagent_type: "general-purpose",
  model: "anthropic/claude-opus-4-5-20250514",
  description: "Final synthesis and recommendations",
  run_in_background: true,
  prompt: "You are synthesizing adversarial review findings into actionable recommendations.

ALL FINDINGS WITH RESOLUTIONS:
```yaml
{resolved_findings}
````

YOUR TASK:

1. Group findings by root cause
2. Identify top 5 priorities
3. Provide specific, actionable recommendations
4. Estimate effort for each recommendation

OUTPUT FORMAT:

````yaml
synthesis:
  root_causes:
    - cause: "Missing error handling abstraction"
      affected_findings: ["LG-001", "WF-003", "ARCH-002"]
      recommended_fix: "Use top-level catch pattern..."

  top_priorities:
    - priority: 1
      finding_id: "WF-001"
      action: "..."
      effort: small|medium|large
      risk_if_not_fixed: high|medium|low

  overall_assessment:
    risk_level: critical|high|medium|low
    recommendation: "..."
```"
)
````

---

## Phase 6: Generate Final Report

```yaml
# adversarial-review-{target}-{timestamp}.md

# Adversarial Code Review Report

**Target:** {target}
**Date:** {ISO-8601}
**Mode:** {quick|default|deep}
**Debate Rounds:** 3

---

## Executive Summary

**Risk Level:** {critical|high|medium|low}
**Total Findings:** {count}
**Agreed Findings:** {count}
**Contested (Ruled):** {count}
**Preserved Dissents:** {count}

**Ruling Summary:**
{arbiter_summary}

---

## Arbiter's Rulings

### Critical Issues (Binding)

| ID | Finding | Ruling | Effort |
|----|---------|--------|--------|
| WF-001 | State loss during handoff | UPHELD - fix required | medium |
| SEC-002 | SQL injection risk | MODIFIED to medium | small |

### High Priority Issues (Binding)

| ID | Finding | Ruling | Effort |
|----|---------|--------|--------|
| LG-001 | State serialization issue | UPHELD | medium |
| DB-003 | N+1 query pattern | UPHELD | small |

---

## Agreed Findings (All Reviewers)

These findings were accepted by all reviewers after debate:

### Critical
{findings}

### High
{findings}

### Medium
{findings}

---

## Contested Findings (Arbiter's Ruling)

These findings were debated but the Arbiter made a binding decision:

### Upheld
{finding_id}: {description}
- **Original position:** {what reviewer claimed}
- **Arbiter's ruling:** UPHELD
- **Reasoning:** {why}
- **Effort:** {small|medium|large}

### Modified
{finding_id}: {description}
- **Original severity:** {original}
- **Final severity:** {final}
- **Arbiter's ruling:** MODIFIED
- **Reasoning:** {why}
- **Effort:** {small|medium|large}

### Dismissed
{finding_id}: {description}
- **Arbiter's ruling:** DISMISSED
- **Reasoning:** {why concern is unfounded}

---

## Preserved Dissents

These dissenting opinions were recorded but overruled by the Arbiter:

### {role} - {finding_id}
> "{dissenting_view}"

**Arbiter's response:** "{why dissent was overruled}"

---

## Root Causes

{grouped by root cause with affected findings}

---

## Actionable Recommendations

### Must Fix (Critical/High)
1. **{Finding ID}** - {one-line action}
   - Effort: {small|medium|large}
   - Ruling: {binding}

### Should Fix (Medium)
2. **{Finding ID}** - {one-line action}
   - Effort: {small|medium|large}
   - Ruling: {binding}

### Consider (Low)
3. **{Finding ID}** - {one-line action}
   - Effort: {small|medium|large}

---

## Debate Statistics

- **Round 1:** {N} findings from {M} specialists
- **Round 2:** {N} challenges, {N} defenses
- **Round 3:** Arbiter ruled on {N} contested findings
- **Agreement rate:** {percentage}%
- **Most contested area:** {category}
```

### Write Review Session to KB

After generating the report, write the full session to KB for future reference:

```
# Log token usage for Round 3 (Arbiter)
kb_log_tokens(
  story_id: "ARBITER-REVIEW-{timestamp}",
  phase: "arbiter-round3",
  input_tokens: { arbiter_input_tokens },
  output_tokens: { arbiter_output_tokens },
  agent: "adversarial-review-arbiter"
)

# Log each ruling as a decision (with model attribution)
kb_add_decision(
  title: "Ruling: {finding_id} - {ruling}",
  context: |
    Contested finding: {finding_description}
    Challenger: {challenger_position}
    Original position: {original_position}
    Source agent: {source_role} ({source_model})
  decision: "ARBITER {ruling}: {reasoning}",
  consequences: "If upheld: fix required. If dismissed: no action needed. Effort: {effort}",
  role: "dev",
  tags: [
    "arbiter-ruling",
    "{finding_category}",
    "{severity}",
    "model:{source_model}",
    "role:{source_role}"
  ]
)

# Write complete review session artifact (with model tracking)
kb_write_artifact(
  story_id: "ARBITER-REVIEW-{timestamp}",
  artifact_type: "arbiter-review",
  content: {
    session_id: "{uuid}",
    target: "{target}",
    mode: "{mode}",
    timestamp: "{ISO-8601}",
    rounds: {
      round1: {
        agents: [
          { role: "langgraph", model: "claude-sonnet-4-5-20250514", findings: N },
          { role: "database", model: "claude-sonnet-4-5-20250514", findings: N },
          { role: "ai-apps", model: "claude-opus-4-5-20250514", findings: N },
          { role: "multiagent", model: "claude-sonnet-4-5-20250514", findings: N },
          { role: "security", model: "claude-sonnet-4-5-20250514", findings: N },
          { role: "performance", model: "claude-sonnet-4-5-20250514", findings: N },
          { role: "architecture", model: "claude-opus-4-5-20250514", findings: N },
          { role: "devils-advocate", model: "haiku", findings: N }
        ],
        total_findings: N,
        total_tokens: { input: X, output: Y }
      },
      round2: {
        agents: [
          { role: "langgraph-challenge", model: "claude-sonnet-4-5-20250514" },
          { role: "ai-apps-challenge", model: "claude-opus-4-5-20250514" },
          { role: "challenge-synthesis", model: "haiku" }
        ],
        total_challenges: N,
        total_tokens: { input: X, output: Y }
      },
      round3: {
        arbiter: { model: "claude-opus-4-5-20250514" },
        contested_rulings: N,
        tokens: { input: X, output: Y }
      }
    },
    rulings: { all_rulings_with_source_agents },
    total_tokens: { sum },
    estimated_cost_usd: "{price}",
    findings_by_category: { ... },
    model_performance_snapshot: {
      # Captured at time of review for later correlation with outcomes
      sonnet_findings_total: N,
      opus_findings_total: N,
      haiku_findings_total: N
    }
  },
  tags: ["arbiter-review", "{mode}", "{target_domain}"]
)

# Log cost summary
kb_log_tokens(
  story_id: "ARBITER-REVIEW-{timestamp}",
  phase: "arbiter-total",
  input_tokens: { total_input },
  output_tokens: { total_output },
  agent: "adversarial-review-total"
)
```

### Outcome Tracking (Automatic)

Outcome tracking is **automatic by default**. The system will prompt for tracking after fixes are applied.

#### How It Works

1. **During Review**: All rulings are stored in KB with `outcome: pending`
2. **After Fixes**: System prompts "Ready to track outcomes?" with session ID
3. **User Confirms**: Tracks each ruling's accuracy automatically

#### Automatic Prompt

After the report is generated, the system will:

```
═══════════════════════════════════════════════════════════════════
  TRACKING ENABLED (default)
═══════════════════════════════════════════════════════════════════
  Session ID: {session_id}
  Use this ID to track outcomes later:

  /arbiter-outcome-tracker --session-id "{session_id}" --track-all

  Or simply reply: "track outcomes"

  The system will prompt for each ruling's accuracy after fixes.
═══════════════════════════════════════════════════════════════════
```

#### To Disable Tracking

Use `--no-track` flag:

```bash
/adversarial-review packages/langgraph/ --deep --no-track
```

---

## Phase 7: Report to User

```
╔═══════════════════════════════════════════════════════════════════╗
║        ADVERSARIAL CODE REVIEW COMPLETE - ROUND 3               ║
╠═══════════════════════════════════════════════════════════════════╣
║  Target: {target}                                               ║
║  Mode:  {quick|default|deep}  |  Debate Rounds: 3               ║
╠═══════════════════════════════════════════════════════════════════╣
║  ROLES: LangGraph, Database, AI Apps, MultiAgent, Security,      ║
║         Performance, Architecture, Devil's Advocate             ║
╠═══════════════════════════════════════════════════════════════════╣
║  RISK LEVEL: {CRITICAL|HIGH|MEDIUM|LOW}                        ║
╠═══════════════════════════════════════════════════════════════════╣
║  ARBITER'S RULING                                               ║
║    Agreed:       {N} findings                                   ║
║    Contested:    {N} findings → {upheld}/{modified}/{dismissed} ║
║    New issues:   {N} findings                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  FINDINGS SUMMARY                                               ║
║    Critical: {N}   High: {N}   Medium: {N}   Low: {N}           ║
╠═══════════════════════════════════════════════════════════════════╣
║  TOP 3 BINDING RULINGS                                         ║
║    1. {finding} - UPHELD/MODIFIED/DISMISSED                    ║
║    2. {finding} - UPHELD/MODIFIED/DISMISSED                    ║
║    3. {finding} - UPHELD/MODIFIED/DISMISSED                    ║
╠═══════════════════════════════════════════════════════════════════╣
║  DISSENTS PRESERVED: {N} (overruled by arbiter)                 ║
╠═══════════════════════════════════════════════════════════════════╣
║  TRACKING: Session ID {session_id} queued for outcome followup  ║
╠═══════════════════════════════════════════════════════════════════╣
║  Report: adversarial-review-{target}-{date}.md                  ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Roles Reference

| Role                        | Model  | Focus                                       |
| --------------------------- | ------ | ------------------------------------------- |
| LangGraph Expert            | sonnet | State, nodes, graphs, checkpointing         |
| Database Expert             | sonnet | Queries, schemas, indexes, integrity        |
| AI Applications Builder     | opus   | LLM integration, prompts, function calling  |
| Multi-Agent Workflow Expert | sonnet | Orchestration, handoffs, parallel execution |
| Security Auditor            | sonnet | Auth, injection, secrets                    |
| Performance Profiler        | sonnet | Complexity, N+1, memory                     |
| Architecture Reviewer       | opus   | SOLID, coupling, patterns                   |
| Devil's Advocate            | haiku  | Edge cases, assumptions, failure            |

---

## Mode Reference

| Mode      | Roles                         | Rounds | Arbiter | Speed    |
| --------- | ----------------------------- | ------ | ------- | -------- |
| `--quick` | 4 (LG, DB, SEC, DAVE)         | 1      | No      | Fast     |
| Default   | 6 (LG, DB, AI, MA, SEC, DAVE) | 2      | No      | Medium   |
| `--deep`  | 8 (all roles)                 | 3      | **YES** | Thorough |

### Deep Mode Round Structure

1. **Round 1** - Independent specialist reviews (parallel)
2. **Round 2** - Cross-examination challenges (parallel)
3. **Round 3** - Arbiter ruling (binding decisions on contested findings)

The Arbiter makes binding rulings after 3 rounds. No consensus is forced - the Arbiter decides.
