---
story_id: LNGG-003
title: Decision Callback System - Interactive User Prompts
status: backlog
created: 2026-02-13
updated: 2026-02-13
epic: LangGraph Integration Adapters
phase: 0-Infrastructure
size: large
effort_hours: 10
complexity: high
risk_level: high
blocked_by: []
blocks: [LNGG-007]
---

# LNGG-003: Decision Callback System - Interactive User Prompts

## Context

Claude Code workflows use `AskUserQuestion` to prompt users for decisions (e.g., "Add this gap as AC or create follow-up story?"). LangGraph has no equivalent - all decisions are programmatic.

**Example from /elab-story:**
```typescript
// Claude Code does this:
const answer = await AskUserQuestion({
  questions: [{
    question: "How should we handle this PM gap?",
    header: "Gap Decision",
    options: [
      { label: "Add as AC", description: "Append to story acceptance criteria" },
      { label: "Follow-up story", description: "Create INST-XXXX for this" },
      { label: "Out of scope", description: "Document and skip" },
      { label: "Skip", description: "Ignore this finding" }
    ]
  }]
})

// Then executes based on choice
switch (answer) {
  case "Add as AC": await appendToStory(...)
  case "Follow-up story": await createFollowUp(...)
  // ...
}
```

**Problem:** LangGraph has no mechanism for:
- Presenting choices to users
- Collecting user input
- Blocking workflow until decision made
- Supporting multiple UI modes (CLI, web, auto)

**Impact:** Blocks migration of any interactive workflow (`/elab-story`, `/dev-implement-story`, etc.)

---

## Goal

Create a flexible callback system that allows LangGraph workflows to request user decisions with support for:
1. **CLI prompts** - Interactive terminal prompts (default)
2. **Auto-decision mode** - Programmatic decisions (no user input)
3. **Web UI mode** - REST API for web-based decisions (future)
4. **Timeout handling** - Don't block indefinitely
5. **Multiple question types** - Single choice, multi-select, text input

---

## Acceptance Criteria

### AC1: Define Callback Interface
```typescript
Given a decision callback interface
Then it supports:
  - Single-choice questions
  - Multi-select questions
  - Free-text input
  - Context data (finding, story, etc.)
  - Timeout configuration
  - Cancellation
```

**Interface:**
```typescript
export type DecisionCallback = (
  request: DecisionRequest
) => Promise<DecisionResponse>

export interface DecisionRequest {
  id: string // Unique request ID
  type: 'single-choice' | 'multi-select' | 'text-input'
  question: string
  description?: string
  options?: DecisionOption[]
  context?: Record<string, unknown> // Finding, story data, etc.
  timeout?: number // ms, default 300000 (5 min)
}

export interface DecisionOption {
  value: string
  label: string
  description?: string
  recommended?: boolean
}

export interface DecisionResponse {
  requestId: string
  answer: string | string[] | null
  cancelled: boolean
  timedOut: boolean
  timestamp: string
}
```

---

### AC2: CLI Implementation
```typescript
Given a decision request
When CLIDecisionCallback is invoked
Then it:
  - Displays question in terminal
  - Renders options with descriptions
  - Accepts user input (arrow keys + enter)
  - Validates input
  - Returns DecisionResponse
```

**Test:**
```typescript
const callback = new CLIDecisionCallback()

const request: DecisionRequest = {
  id: 'gap-001',
  type: 'single-choice',
  question: 'How should we handle this gap?',
  options: [
    { value: 'add-ac', label: 'Add as AC' },
    { value: 'follow-up', label: 'Follow-up story' },
    { value: 'skip', label: 'Skip' }
  ]
}

// User selects option 1 in terminal
const response = await callback(request)

expect(response.answer).toBe('add-ac')
expect(response.cancelled).toBe(false)
```

---

### AC3: Auto-Decision Mode
```typescript
Given an auto-decision configuration
When AutoDecisionCallback is invoked
Then it:
  - Applies decision rules automatically
  - No user interaction required
  - Logs decision rationale
  - Returns DecisionResponse
```

**Configuration:**
```typescript
const autoCallback = new AutoDecisionCallback({
  rules: [
    {
      condition: (ctx) => ctx.severity === 'high' && ctx.mvpBlocking,
      decision: 'add-ac'
    },
    {
      condition: (ctx) => ctx.severity === 'medium',
      decision: 'follow-up'
    },
    {
      condition: () => true, // Default
      decision: 'skip'
    }
  ]
})

const request: DecisionRequest = {
  id: 'gap-001',
  type: 'single-choice',
  question: 'How should we handle this gap?',
  context: { severity: 'high', mvpBlocking: true },
  options: [...]
}

const response = await autoCallback(request)

expect(response.answer).toBe('add-ac') // Auto-decided based on rules
```

---

### AC4: Integration with LangGraph Nodes
```typescript
Given a LangGraph node that needs a decision
When the node is configured with a callback
Then it:
  - Invokes callback with decision request
  - Waits for response
  - Continues workflow with decision
  - Handles timeout gracefully
```

**Usage in Workflow:**
```typescript
const elaborationGraph = createElaborationGraph({
  onDecisionNeeded: async (finding) => {
    return await cliCallback({
      id: `finding-${finding.id}`,
      type: 'single-choice',
      question: `How should we handle this ${finding.type} finding?`,
      description: finding.description,
      options: [
        { value: 'add-ac', label: 'Add as AC' },
        { value: 'follow-up', label: 'Create follow-up story' },
        { value: 'skip', label: 'Skip for now' }
      ],
      context: finding
    })
  }
})

// Node implementation
const decisionNode = createNode('collect_decisions', async (state, config) => {
  const callback = config.onDecisionNeeded

  const decisions = []
  for (const finding of state.findings) {
    const response = await callback(finding)
    decisions.push({ finding, decision: response.answer })
  }

  return { decisions }
})
```

---

### AC5: Timeout Handling
```typescript
Given a decision request with timeout
When timeout is exceeded
Then it:
  - Returns timedOut: true
  - Falls back to default decision if configured
  - Logs timeout event
```

**Test:**
```typescript
const callback = new CLIDecisionCallback({ timeout: 1000 })

const request: DecisionRequest = {
  id: 'test-timeout',
  type: 'single-choice',
  question: 'Will timeout...',
  options: [{ value: 'option1', label: 'Option 1' }],
  timeout: 1000 // 1 second
}

// Don't provide input, wait for timeout
const response = await callback(request)

expect(response.timedOut).toBe(true)
expect(response.cancelled).toBe(false)
expect(response.answer).toBeNull()
```

---

### AC6: Cancellation Support
```typescript
Given an active decision request
When user cancels (Ctrl+C, cancel button)
Then it:
  - Returns cancelled: true
  - Cleans up resources
  - Allows graceful workflow exit
```

**Test:**
```typescript
const callback = new CLIDecisionCallback()

const request: DecisionRequest = {
  id: 'test-cancel',
  type: 'single-choice',
  question: 'Cancel this...',
  options: [{ value: 'option1', label: 'Option 1' }]
}

// Simulate Ctrl+C after 100ms
setTimeout(() => callback.cancel(), 100)

const response = await callback(request)

expect(response.cancelled).toBe(true)
expect(response.answer).toBeNull()
```

---

## Technical Design

### Callback Registry

```typescript
export class DecisionCallbackRegistry {
  private callbacks = new Map<string, DecisionCallback>()

  register(name: string, callback: DecisionCallback) {
    this.callbacks.set(name, callback)
  }

  get(name: string): DecisionCallback | undefined {
    return this.callbacks.get(name)
  }

  getDefault(): DecisionCallback {
    return this.get('cli') || this.get('auto') || noOpCallback
  }
}

// Global registry
export const decisionCallbacks = new DecisionCallbackRegistry()

// Register built-in callbacks
decisionCallbacks.register('cli', new CLIDecisionCallback())
decisionCallbacks.register('auto', new AutoDecisionCallback({ rules: defaultRules }))
decisionCallbacks.register('noop', noOpCallback)
```

### CLI Implementation (using `inquirer`)

```typescript
import inquirer from 'inquirer'

export class CLIDecisionCallback implements DecisionCallback {
  constructor(private options?: { timeout?: number }) {}

  async invoke(request: DecisionRequest): Promise<DecisionResponse> {
    const timeout = request.timeout || this.options?.timeout || 300000

    // Set up timeout
    const timeoutPromise = new Promise<DecisionResponse>((resolve) => {
      setTimeout(() => {
        resolve({
          requestId: request.id,
          answer: null,
          cancelled: false,
          timedOut: true,
          timestamp: new Date().toISOString()
        })
      }, timeout)
    })

    // Set up prompt
    const promptPromise = this.showPrompt(request)

    // Race between prompt and timeout
    return Promise.race([promptPromise, timeoutPromise])
  }

  private async showPrompt(request: DecisionRequest): Promise<DecisionResponse> {
    console.log(`\n${request.question}`)
    if (request.description) {
      console.log(request.description)
    }

    let answer: string | string[]

    if (request.type === 'single-choice') {
      const response = await inquirer.prompt([{
        type: 'list',
        name: 'answer',
        message: 'Select an option:',
        choices: request.options?.map(opt => ({
          name: `${opt.label}${opt.recommended ? ' (Recommended)' : ''}`,
          value: opt.value,
          short: opt.label
        })) || []
      }])
      answer = response.answer
    } else if (request.type === 'multi-select') {
      const response = await inquirer.prompt([{
        type: 'checkbox',
        name: 'answer',
        message: 'Select options:',
        choices: request.options?.map(opt => ({
          name: opt.label,
          value: opt.value,
          checked: opt.recommended
        })) || []
      }])
      answer = response.answer
    } else {
      const response = await inquirer.prompt([{
        type: 'input',
        name: 'answer',
        message: request.question
      }])
      answer = response.answer
    }

    return {
      requestId: request.id,
      answer,
      cancelled: false,
      timedOut: false,
      timestamp: new Date().toISOString()
    }
  }

  cancel() {
    // Signal cancellation
    process.emit('SIGINT')
  }
}
```

### Auto-Decision Implementation

```typescript
export interface DecisionRule {
  name?: string
  condition: (context: Record<string, unknown>) => boolean
  decision: string
  rationale?: string
}

export class AutoDecisionCallback implements DecisionCallback {
  constructor(private config: { rules: DecisionRule[] }) {}

  async invoke(request: DecisionRequest): Promise<DecisionResponse> {
    const context = request.context || {}

    // Find first matching rule
    const rule = this.config.rules.find(r => r.condition(context))

    if (!rule) {
      throw new Error('No matching decision rule found')
    }

    // Log decision
    console.log(`Auto-decision for ${request.id}: ${rule.decision}`)
    if (rule.rationale) {
      console.log(`  Rationale: ${rule.rationale}`)
    }

    return {
      requestId: request.id,
      answer: rule.decision,
      cancelled: false,
      timedOut: false,
      timestamp: new Date().toISOString()
    }
  }
}

// Default rules for elaboration
export const elaborationAutoRules: DecisionRule[] = [
  {
    name: 'mvp-blocking-high',
    condition: (ctx) => ctx.severity === 'high' && ctx.mvpBlocking === true,
    decision: 'add-ac',
    rationale: 'High severity MVP-blocking gaps must be addressed immediately'
  },
  {
    name: 'enhancement',
    condition: (ctx) => ctx.type === 'enhancement',
    decision: 'follow-up',
    rationale: 'Enhancements should be separate stories'
  },
  {
    name: 'low-severity',
    condition: (ctx) => ctx.severity === 'low',
    decision: 'skip',
    rationale: 'Low severity findings can be deferred'
  },
  {
    name: 'default',
    condition: () => true,
    decision: 'skip',
    rationale: 'Default: skip findings not matching other rules'
  }
]
```

---

## Test Plan

### Unit Tests

```typescript
describe('CLIDecisionCallback', () => {
  it('displays question and options')
  it('accepts user input')
  it('returns selected answer')
  it('handles timeout')
  it('handles cancellation')
  it('validates answer against options')
})

describe('AutoDecisionCallback', () => {
  it('applies rules in order')
  it('returns first matching rule decision')
  it('logs decision rationale')
  it('throws if no rule matches')
})

describe('DecisionCallbackRegistry', () => {
  it('registers callbacks')
  it('retrieves callbacks by name')
  it('returns default callback')
})
```

### Integration Tests

```typescript
describe('LangGraph with Callbacks', () => {
  it('invokes callback from elaboration node')
  it('continues workflow after decision')
  it('handles timeout gracefully')
  it('works in auto mode')
  it('works in CLI mode')
})
```

---

## Dependencies

**NPM Packages:**
- `inquirer@^9.2.0` - CLI prompts
- `ora@^7.0.0` - Spinners (optional)

**Blocks:**
- LNGG-007 (Integration Tests)

---

## Non-Goals

❌ **Web UI implementation** - Future (REST API for web)
❌ **VSCode extension integration** - Future
❌ **Persistent decision history** - Future
❌ **Multi-user decisions** - Future
❌ **Decision replay** - Future

---

## Estimated Effort

**10 hours** (complex state management, timeout handling, CLI UX)
