# LangGraph Orchestrator

TypeScript-based orchestrator for agent workflows, supporting hybrid Claude/Ollama LLM execution.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Hybrid LLM Support](#hybrid-llm-support)
- [Creating Workflows](#creating-workflows)
- [Node Types](#node-types)
- [Configuration](#configuration)
- [Examples](#examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The orchestrator package provides:

- **LangGraph Integration**: Build stateful, multi-agent workflows
- **Hybrid LLM Support**: Local Ollama models for fast tasks, Claude for complex reasoning
- **Node Factory**: Pre-configured node types (Simple, LLM, Tool, LLM-Powered)
- **Error Handling**: Retry, timeout, circuit breaker patterns
- **State Management**: Type-safe GraphState with Zod validation
- **Persistence**: YAML artifact bridge and PostgreSQL repositories

## Installation

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build the orchestrator package
cd packages/backend/orchestrator
pnpm build
```

## Quick Start

### 1. Basic Node Creation

```typescript
import { createNode, type GraphState } from '@repo/orchestrator'

// Create a simple validation node
const validateNode = createNode(
  { name: 'validate-input' },
  async (state: GraphState) => {
    if (!state.storyId) {
      return {
        errors: [
          {
            nodeId: 'validate-input',
            message: 'Story ID is required',
            code: 'MISSING_STORY_ID',
            timestamp: new Date().toISOString(),
            recoverable: false,
          },
        ],
      }
    }

    return { routingFlags: ['validated'] }
  },
)
```

### 2. Create a Workflow Graph

```typescript
import { StateGraph } from '@langchain/langgraph'
import { createInitialState } from '@repo/orchestrator'

// Define graph
const workflow = new StateGraph({
  channels: {
    storyId: null,
    routingFlags: null,
    errors: null,
    // ... other GraphState fields
  },
})

// Add nodes
workflow.addNode('validate', validateNode)
workflow.addNode('process', processNode)

// Define edges
workflow.addEdge('__start__', 'validate')
workflow.addConditionalEdges('validate', (state) => {
  return state.errors?.length ? '__end__' : 'process'
})
workflow.addEdge('process', '__end__')

// Compile
const app = workflow.compile()
```

### 3. Execute the Workflow

```typescript
// Create initial state
const initialState = createInitialState({
  storyId: 'FEAT-001',
})

// Run the workflow
const result = await app.invoke(initialState)

console.log('Final state:', result)
console.log('Errors:', result.errors)
console.log('Routing flags:', result.routingFlags)
```

## Hybrid LLM Support

The orchestrator supports both **local Ollama models** (fast, cheap) and **Claude models** (complex reasoning).

### Setup Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama server
ollama serve

# Pull recommended models
ollama pull qwen2.5-coder:7b
ollama pull codellama:13b
ollama pull deepseek-coder:6.7b
```

### Environment Configuration

Create a `.env` file:

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TEMPERATURE=0
OLLAMA_TIMEOUT_MS=60000

# Fallback Configuration
OLLAMA_ENABLE_FALLBACK=true
OLLAMA_FALLBACK_MODEL=haiku
```

### Model Assignments

Edit `.claude/config/model-assignments.yaml`:

```yaml
# Fast local tasks → Ollama
code-review-lint: ollama:qwen2.5-coder:7b
code-review-syntax: ollama:qwen2.5-coder:7b
code-review-style-compliance: ollama:qwen2.5-coder:7b

# Complex tasks → Claude
pm-story-generation-leader: sonnet
dev-implement-backend-coder: sonnet
dev-implement-planning-leader: sonnet

# Simple validation → Claude Haiku
code-review-security: haiku
code-review-typecheck: haiku
```

### Creating LLM-Powered Nodes

```typescript
import {
  createLLMPoweredNode,
  type LLMRunnableConfig,
  type GraphState,
} from '@repo/orchestrator'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

const codeReviewNode = createLLMPoweredNode(
  { name: 'code-review-lint' },
  async (state: GraphState, config: LLMRunnableConfig) => {
    const llmResult = config.configurable?.llm

    if (!llmResult) {
      throw new Error('LLM not configured')
    }

    const codeToReview = state.codeToReview ?? ''

    // Ollama path - invoke directly
    if (llmResult.provider === 'ollama') {
      const response = await llmResult.llm.invoke([
        new SystemMessage('You are a code reviewer. Analyze for lint issues.'),
        new HumanMessage(`Review this code:\n\n${codeToReview}`),
      ])

      return {
        reviewResult: {
          issues: JSON.parse(response.content),
          modelUsed: llmResult.model.fullName,
        },
      }
    }

    // Claude path - return signal for external invocation
    return {
      pendingClaudeCall: {
        model: llmResult.model,
        systemPrompt: 'You are a code reviewer...',
        userPrompt: `Review this code:\n\n${codeToReview}`,
        nodeId: 'code-review-lint',
      },
    }
  },
)
```

### Check Ollama Availability

```typescript
import { isOllamaAvailable, getLLMForAgent } from '@repo/orchestrator'

// Health check
const available = await isOllamaAvailable()
console.log('Ollama available:', available)

// Get LLM for an agent
const llmResult = await getLLMForAgent('code-review-lint')

if (llmResult.provider === 'ollama') {
  console.log('Using Ollama:', llmResult.model.fullName)
  const response = await llmResult.llm.invoke([...])
} else {
  console.log('Using Claude:', llmResult.model)
  // Invoke Claude externally via Claude Code
}
```

## Creating Workflows

### Story Creation Workflow Example

```typescript
import {
  StateGraph,
  createInitialState,
  loadBaselineRealityNode,
  retrieveContextNode,
  storySeedNode,
  saveToDbNode,
  type GraphState,
} from '@repo/orchestrator'

// Create workflow
const storyWorkflow = new StateGraph<GraphState>({
  channels: {
    storyId: null,
    routingFlags: null,
    baselineReality: null,
    retrievedContext: null,
    storySeed: null,
    errors: null,
    // ... other fields
  },
})

// Add nodes
storyWorkflow.addNode('load-baseline', loadBaselineRealityNode)
storyWorkflow.addNode('retrieve-context', retrieveContextNode)
storyWorkflow.addNode('generate-seed', storySeedNode)
storyWorkflow.addNode('save-to-db', saveToDbNode)

// Define flow
storyWorkflow.addEdge('__start__', 'load-baseline')
storyWorkflow.addEdge('load-baseline', 'retrieve-context')
storyWorkflow.addEdge('retrieve-context', 'generate-seed')
storyWorkflow.addEdge('generate-seed', 'save-to-db')
storyWorkflow.addEdge('save-to-db', '__end__')

// Compile and execute
const app = storyWorkflow.compile()

const initialState = createInitialState({
  storyId: 'FEAT-123',
  featureDir: 'user-management',
})

const result = await app.invoke(initialState)
```

### Conditional Routing

```typescript
// Add conditional edges based on state
workflow.addConditionalEdges('validate', (state: GraphState) => {
  // Check for blocking errors
  if (state.errors?.some((e) => !e.recoverable)) {
    return '__end__'
  }

  // Check routing flags
  if (state.routingFlags?.includes('needs-approval')) {
    return 'approval-gate'
  }

  return 'continue-processing'
})
```

### Parallel Execution

```typescript
import { Send } from '@langchain/langgraph'

// Fan-out to parallel workers
workflow.addConditionalEdges('dispatch', (state: GraphState) => {
  const workers = ['lint-check', 'type-check', 'security-check']

  return workers.map((worker) => new Send(worker, state))
})

// Fan-in: collect results
workflow.addEdge(['lint-check', 'type-check', 'security-check'], 'aggregate-results')
```

## Node Types

### Simple Node (No Retry)

```typescript
import { createSimpleNode } from '@repo/orchestrator'

const validationNode = createSimpleNode('validate', async (state) => {
  // Validation logic
  return { routingFlags: ['validated'] }
})
```

### LLM Node (High Retry)

```typescript
import { createLLMNode } from '@repo/orchestrator'

const analysisNode = createLLMNode('analyze', async (state) => {
  // LLM call with retry
  return { analysis: 'Results...' }
})
```

### Tool Node (Low Retry)

```typescript
import { createToolNode } from '@repo/orchestrator'

const apiCallNode = createToolNode('fetch-data', async (state) => {
  // External API call with timeout
  return { data: 'fetched' }
})
```

### Custom Configuration

```typescript
import { createNode } from '@repo/orchestrator'

const customNode = createNode(
  {
    name: 'custom-node',
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      timeoutMs: 30000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
    },
  },
  async (state) => {
    // Implementation
    return {}
  },
)
```

## Configuration

### Model Assignment Configuration

Models are assigned in `.claude/config/model-assignments.yaml`:

```yaml
# Criteria:
# - ollama:{model}:{tag} → Local Ollama models
# - haiku → Fast validation, simple tasks
# - sonnet → Analysis, code generation
# - opus → Critical decisions (rarely used)

# Setup Leaders (validation)
dev-setup-leader: haiku

# Work Leaders (complex analysis)
pm-story-generation-leader: sonnet
dev-implement-planning-leader: sonnet

# Workers (focused checks)
code-review-lint: ollama:qwen2.5-coder:7b
code-review-syntax: ollama:qwen2.5-coder:7b
code-review-security: haiku
```

### LLM Provider Configuration

Configure via environment variables:

```bash
# Ollama Server
OLLAMA_BASE_URL=http://127.0.0.1:11434

# Model Parameters
OLLAMA_TEMPERATURE=0          # 0-2, lower = more deterministic
OLLAMA_TIMEOUT_MS=60000       # Request timeout

# Fallback Behavior
OLLAMA_ENABLE_FALLBACK=true   # Fall back to Claude if Ollama unavailable
OLLAMA_FALLBACK_MODEL=haiku   # Claude model to use as fallback
```

### Programmatic Configuration

```typescript
import {
  loadLLMProviderConfig,
  loadModelAssignments,
  getModelForAgent,
} from '@repo/orchestrator'

// Load configurations
const llmConfig = loadLLMProviderConfig()
const modelAssignments = loadModelAssignments()

// Check assignment for specific agent
const model = getModelForAgent('code-review-lint')
console.log('Assigned model:', model) // "ollama:qwen2.5-coder:7b"
```

## Working Examples

The best way to learn is by studying the comprehensive test suites. Here are key examples:

- **Node creation**: `src/runner/__tests__/integration.test.ts`
- **LLM integration**: `src/config/__tests__/llm-provider.test.ts`
- **State management**: `src/state/__tests__/graph-state.test.ts`

### Example 1: Code Review Workflow (Conceptual)

```typescript
import {
  StateGraph,
  createInitialState,
  createLLMPoweredNode,
  type GraphState,
} from '@repo/orchestrator'

// Create review nodes
const lintNode = createLLMPoweredNode({ name: 'code-review-lint' }, async (state, config) => {
  const llm = config.configurable?.llm
  // Implementation...
  return { lintResults: [] }
})

const securityNode = createLLMPoweredNode(
  { name: 'code-review-security' },
  async (state, config) => {
    // Security review
    return { securityResults: [] }
  },
)

// Build workflow
const reviewWorkflow = new StateGraph<GraphState>({ channels: {...} })
reviewWorkflow.addNode('lint', lintNode)
reviewWorkflow.addNode('security', securityNode)
reviewWorkflow.addEdge('__start__', 'lint')
reviewWorkflow.addEdge('lint', 'security')
reviewWorkflow.addEdge('security', '__end__')

const app = reviewWorkflow.compile()

// Execute
const result = await app.invoke(
  createInitialState({
    storyId: 'FEAT-001',
    codeToReview: 'const x = 1;',
  }),
)
```

### Example 2: Multi-Agent Story Creation

```typescript
import {
  StateGraph,
  createLLMNode,
  createSimpleNode,
  type GraphState,
} from '@repo/orchestrator'

// PM Agent - generates story structure
const pmAgentNode = createLLMNode('pm-agent', async (state) => {
  return {
    storyStructure: {
      title: 'User Login Feature',
      acceptanceCriteria: ['AC-1', 'AC-2'],
    },
  }
})

// UX Agent - adds design considerations
const uxAgentNode = createLLMNode('ux-agent', async (state) => {
  return {
    uxRecommendations: ['Mobile-first', 'Accessible form'],
  }
})

// Synthesizer - combines results
const synthesizerNode = createSimpleNode('synthesizer', async (state) => {
  return {
    finalStory: {
      ...state.storyStructure,
      ux: state.uxRecommendations,
    },
  }
})

// Build workflow
const workflow = new StateGraph<GraphState>({ channels: {...} })
workflow.addNode('pm', pmAgentNode)
workflow.addNode('ux', uxAgentNode)
workflow.addNode('synthesize', synthesizerNode)

workflow.addEdge('__start__', 'pm')
workflow.addEdge('pm', 'ux')
workflow.addEdge('ux', 'synthesize')
workflow.addEdge('synthesize', '__end__')

const app = workflow.compile()
```

### Example 3: Error Handling and Retry

```typescript
import { createNode, type GraphState } from '@repo/orchestrator'

const resilientNode = createNode(
  {
    name: 'api-call',
    retry: {
      maxAttempts: 5,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 30000,
      timeoutMs: 10000,
      jitterFactor: 0.25,
    },
    onRetryAttempt: (attempt, error, delayMs) => {
      console.log(`Retry attempt ${attempt}, waiting ${delayMs}ms`)
      console.log(`Error: ${error.message}`)
    },
  },
  async (state: GraphState, config) => {
    // Simulated API call that might fail
    const response = await fetch('https://api.example.com/data', {
      signal: config?.signal, // Support cancellation
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    return { apiData: await response.json() }
  },
)
```

## Testing

### Unit Testing Nodes

```typescript
import { describe, it, expect } from 'vitest'
import { createInitialState } from '@repo/orchestrator'
import { myCustomNode } from './my-custom-node'

describe('myCustomNode', () => {
  it('processes state correctly', async () => {
    const state = createInitialState({ storyId: 'TEST-001' })

    const result = await myCustomNode(state)

    expect(result.routingFlags).toContain('processed')
    expect(result.errors).toHaveLength(0)
  })

  it('handles errors gracefully', async () => {
    const state = createInitialState({ storyId: '' })

    const result = await myCustomNode(state)

    expect(result.errors).toHaveLength(1)
    expect(result.errors?.[0].code).toBe('MISSING_STORY_ID')
  })
})
```

### Integration Testing Workflows

```typescript
import { describe, it, expect } from 'vitest'
import { StateGraph } from '@langchain/langgraph'

describe('Story Workflow', () => {
  it('completes full workflow', async () => {
    const workflow = new StateGraph<GraphState>({...})
    // Add nodes...
    const app = workflow.compile()

    const result = await app.invoke(createInitialState({ storyId: 'TEST-001' }))

    expect(result.routingFlags).toContain('completed')
    expect(result.errors).toHaveLength(0)
  })
})
```

### Testing LLM-Powered Nodes

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createLLMPoweredNode } from '@repo/orchestrator'

// Mock Ollama
vi.mock('@langchain/ollama', () => ({
  ChatOllama: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: '{"result": "mocked"}' }),
  })),
}))

describe('LLM Node', () => {
  it('uses Ollama when available', async () => {
    const node = createLLMPoweredNode({ name: 'test-node' }, async (state, config) => {
      const llm = config.configurable?.llm
      expect(llm?.provider).toBe('ollama')
      return {}
    })

    const result = await node(createInitialState({ storyId: 'TEST-001' }))
    expect(result).toBeDefined()
  })
})
```

## Troubleshooting

### Ollama Connection Issues

**Problem**: `Ollama is not available` error

**Solutions**:
1. Check if Ollama is running: `ps aux | grep ollama`
2. Start Ollama: `ollama serve`
3. Verify connectivity: `curl http://127.0.0.1:11434/api/tags`
4. Check firewall settings
5. Enable fallback: `OLLAMA_ENABLE_FALLBACK=true`

### Model Not Found

**Problem**: Ollama model not available

**Solutions**:
1. Pull the model: `ollama pull qwen2.5-coder:7b`
2. List available models: `ollama list`
3. Use a different model in `model-assignments.yaml`

### Slow Performance

**Problem**: Workflows taking too long

**Solutions**:
1. Increase parallelism with `Send()` for independent nodes
2. Reduce retry attempts for fast-failing scenarios
3. Use local Ollama models for simple tasks
4. Optimize timeout values
5. Enable result caching where appropriate

### Memory Issues

**Problem**: Out of memory errors

**Solutions**:
1. Limit context size in LLM calls
2. Stream responses for large outputs
3. Clear node caches: `clearOllamaLLMCache()`
4. Reduce concurrent workflow executions

### Type Errors

**Problem**: TypeScript type mismatches

**Solutions**:
1. Always use `createInitialState()` for state creation
2. Validate state with `validateGraphState()`
3. Use Zod schemas for type inference
4. Check that all GraphState fields are properly typed

### State Management Issues

**Problem**: State updates not persisting

**Solutions**:
1. Return partial state updates from nodes
2. Use state helper functions: `updateState()`, `mergeStateUpdates()`
3. Ensure LangGraph channels are configured correctly
4. Check for state overwrites in conditional edges

## Additional Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Ollama Documentation](https://ollama.ai/docs)
- [Project CLAUDE.md](../../../CLAUDE.md) - Project guidelines
- [Package Source](./src) - Browse implementation

## Support

For issues or questions:
1. Check this documentation
2. Review existing tests in `src/**/__tests__`
3. Consult [CLAUDE.md](../../../CLAUDE.md) for code standards
4. Create an issue in the repository
