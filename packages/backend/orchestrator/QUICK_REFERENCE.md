# Quick Reference - LangGraph Orchestrator

## Installation & Setup

```bash
# Build the package
cd packages/backend/orchestrator
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check
```

## Ollama Setup (Optional)

```bash
# Install and start Ollama
brew install ollama
ollama serve

# Pull models
ollama pull qwen2.5-coder:7b
ollama pull codellama:13b
ollama pull deepseek-coder:6.7b
```

## Core Imports

```typescript
import {
  // State management
  createInitialState,
  updateState,
  type GraphState,

  // Node factories
  createNode,
  createSimpleNode,
  createLLMNode,
  createLLMPoweredNode,

  // LLM provider
  getLLMForAgent,
  isOllamaAvailable,

  // Error handling
  NodeTimeoutError,
  NodeCancellationError,
} from '@repo/orchestrator'
```

## Common Patterns

### Create Initial State

```typescript
const state = createInitialState({
  storyId: 'FEAT-001',
  epicPrefix: 'FEAT',
})
```

### Simple Node

```typescript
const myNode = createSimpleNode('my-node', async (state: GraphState) => {
  // Validation or simple logic
  return updateState({ routingFlags: { proceed: true } })
})
```

### LLM-Powered Node

```typescript
const reviewNode = createLLMPoweredNode(
  { name: 'code-review-lint' },
  async (state, config) => {
    const llm = config.configurable?.llm

    if (llm?.provider === 'ollama') {
      // Use Ollama directly
      const response = await llm.llm.invoke([...messages])
      return updateState({ reviewComplete: true })
    }

    // Claude - handle externally
    return updateState({ pendingClaudeCall: {...} })
  }
)
```

### Update State

```typescript
// Set routing flags
return updateState({ routingFlags: { proceed: true } })

// Add error
return updateState({
  errors: [
    {
      nodeId: 'my-node',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      recoverable: false,
    },
  ],
})

// Multiple updates
return updateState({
  routingFlags: { complete: true },
  artifactPaths: { story: '/path/to/story.md' },
})
```

## Model Assignment

Edit `.claude/config/model-assignments.yaml`:

```yaml
# Ollama models (local, fast)
code-review-lint: ollama:qwen2.5-coder:7b
code-review-syntax: ollama:qwen2.5-coder:7b

# Claude models (complex reasoning)
pm-story-generation-leader: sonnet
dev-implement-backend-coder: sonnet

# Simple validation
code-review-security: haiku
```

## Environment Variables

`.env`:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TEMPERATURE=0
OLLAMA_TIMEOUT_MS=60000
OLLAMA_ENABLE_FALLBACK=true
OLLAMA_FALLBACK_MODEL=haiku
```

## Routing Flags

Available flags (use as `{ flagName: boolean }`):

- `proceed` - Continue to next step
- `retry` - Retry the operation
- `blocked` - Workflow is blocked
- `escalate` - Needs human intervention
- `skip` - Skip this step
- `complete` - Workflow complete

```typescript
return updateState({ routingFlags: { proceed: true } })
```

## Error Codes

Common error codes:

- `TIMEOUT` - Operation timed out
- `VALIDATION_ERROR` - Input validation failed
- `NETWORK_ERROR` - Network request failed
- `LLM_NOT_CONFIGURED` - LLM not available
- `CIRCUIT_OPEN` - Circuit breaker open

## Node Configuration

```typescript
const customNode = createNode(
  {
    name: 'my-node',
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      timeoutMs: 30000,
    },
  },
  async (state) => {
    // Implementation
    return updateState({})
  },
)
```

## Check LLM Provider

```typescript
import { isOllamaAvailable, getLLMForAgent } from '@repo/orchestrator'

// Health check
if (await isOllamaAvailable()) {
  console.log('Ollama is running')
}

// Get LLM for agent
const llm = await getLLMForAgent('code-review-lint')
console.log('Provider:', llm.provider)
console.log('Model:', llm.provider === 'ollama' ? llm.model.fullName : llm.model)
```

## Testing Patterns

### Test a Node

```typescript
import { describe, it, expect } from 'vitest'
import { createInitialState } from '@repo/orchestrator'
import { myNode } from './my-node'

describe('myNode', () => {
  it('updates state correctly', async () => {
    const state = createInitialState({ storyId: 'TEST-001' })
    const result = await myNode(state)

    expect(result.routingFlags?.proceed).toBe(true)
  })
})
```

### Mock Ollama

```typescript
import { vi } from 'vitest'

vi.mock('@langchain/ollama', () => ({
  ChatOllama: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'mocked response' }),
  })),
}))
```

## Common Issues

### Ollama Not Available

```bash
# Start Ollama
ollama serve

# Verify
curl http://127.0.0.1:11434/api/tags

# Or enable fallback
export OLLAMA_ENABLE_FALLBACK=true
```

### Type Errors

```typescript
// Extend GraphState for custom fields
interface MyState extends GraphState {
  customField?: string
}

// Use in node
const myNode = createSimpleNode('test', async (state: MyState) => {
  return updateState({ customField: 'value' })
})
```

### State Updates Not Working

```typescript
// WRONG - Don't mutate state
state.routingFlags.proceed = true
return state

// CORRECT - Return partial update
return updateState({ routingFlags: { proceed: true } })
```

## Useful Files

- **Integration tests**: `src/runner/__tests__/integration.test.ts`
- **LLM provider tests**: `src/config/__tests__/llm-provider.test.ts`
- **State management**: `src/state/__tests__/graph-state.test.ts`
- **Example node**: `src/nodes/llm/code-review-lint.ts`

## Documentation

- [README.md](./README.md) - Comprehensive guide
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Step-by-step tutorial
- [CLAUDE.md](../../../CLAUDE.md) - Project code standards

## Help

Questions? Check:
1. Test files for working examples
2. README troubleshooting section
3. Existing node implementations in `src/nodes/`
