# Getting Started with LangGraph Orchestrator

A quick guide to get you up and running with the LangGraph orchestrator.

## Prerequisites

1. **Node.js 18+** installed
2. **pnpm** installed (`npm install -g pnpm`)
3. **(Optional) Ollama** for local LLM support

## Step 1: Install Ollama (Optional)

If you want to use local LLMs for fast, cost-effective execution:

```bash
# macOS
brew install ollama

# Start Ollama server
ollama serve

# In another terminal, pull a model
ollama pull qwen2.5-coder:7b
```

## Step 2: Build the Package

```bash
# From the orchestrator directory
cd packages/backend/orchestrator

# Install dependencies (if not already done from root)
pnpm install

# Build the package
pnpm build
```

## Step 3: Your First Workflow

Create a file `my-first-workflow.ts`:

```typescript
import { StateGraph } from '@langchain/langgraph'
import {
  createInitialState,
  createSimpleNode,
  type GraphState,
} from '@repo/orchestrator'

// Step 1: Create a simple node
const greetingNode = createSimpleNode('greeting', async (state: GraphState) => {
  console.log(`Hello from story: ${state.storyId}!`)

  return {
    routingFlags: [...(state.routingFlags ?? []), 'greeted'],
  }
})

// Step 2: Build the workflow
const workflow = new StateGraph<GraphState>({
  channels: {
    storyId: null,
    routingFlags: null,
    errors: null,
    featureDir: null,
    artifactPaths: null,
    evidenceRefs: null,
    gateDecisions: null,
  },
})

workflow.addNode('greet', greetingNode)
workflow.addEdge('__start__', 'greet')
workflow.addEdge('greet', '__end__')

const app = workflow.compile()

// Step 3: Execute the workflow
const initialState = createInitialState({
  storyId: 'EXAMPLE-001',
})

const result = await app.invoke(initialState)

console.log('Routing flags:', result.routingFlags)
// Output: Routing flags: [ 'greeted' ]
```

Build and run:

```bash
# Compile TypeScript
npx tsc my-first-workflow.ts

# Run
node my-first-workflow.js
```

## Step 4: Add LLM Support

Now let's use an LLM (Ollama or Claude):

```typescript
import { StateGraph } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import {
  createInitialState,
  createLLMPoweredNode,
  type GraphState,
} from '@repo/orchestrator'

// Define extended state with custom fields
interface MyState extends GraphState {
  question?: string
  answer?: string
}

// Create LLM-powered node
const answerNode = createLLMPoweredNode(
  { name: 'code-review-lint' }, // Uses model assignment from YAML
  async (state: MyState, config) => {
    const llm = config.configurable?.llm

    if (!llm) {
      throw new Error('LLM not configured')
    }

    const question = state.question ?? 'What is TypeScript?'

    // Check which provider we're using
    if (llm.provider === 'ollama') {
      // Direct Ollama invocation
      const response = await llm.llm.invoke([
        new SystemMessage('You are a helpful coding assistant.'),
        new HumanMessage(question),
      ])

      return {
        answer: typeof response.content === 'string' ? response.content : '',
        routingFlags: [...(state.routingFlags ?? []), 'answered'],
      }
    }

    // Claude - would be invoked externally
    return {
      answer: 'Claude would answer this externally',
      routingFlags: [...(state.routingFlags ?? []), 'answered'],
    }
  },
)

// Build workflow
const workflow = new StateGraph<MyState>({
  channels: {
    storyId: null,
    routingFlags: null,
    errors: null,
    featureDir: null,
    artifactPaths: null,
    evidenceRefs: null,
    gateDecisions: null,
    question: null,
    answer: null,
  },
})

workflow.addNode('answer', answerNode)
workflow.addEdge('__start__', 'answer')
workflow.addEdge('answer', '__end__')

const app = workflow.compile()

// Execute
const result = await app.invoke(
  createInitialState({
    storyId: 'QA-001',
    question: 'Explain TypeScript generics in one sentence.',
  }),
)

console.log('Answer:', (result as MyState).answer)
```

## Step 5: Understanding the Flow

A LangGraph workflow consists of:

1. **State**: Shared data structure (GraphState) passed between nodes
2. **Nodes**: Functions that transform state
3. **Edges**: Connections between nodes defining execution order
4. **Graph**: Compiled workflow ready for execution

### State Flow Example

```
Initial State
     ↓
[Validate Node] → Adds 'validated' flag
     ↓
[Process Node] → Adds 'processed' flag
     ↓
[Save Node] → Adds 'saved' flag
     ↓
Final State
```

Each node receives the current state and returns a **partial update** that gets merged.

## Step 6: Error Handling

Nodes can report errors without crashing the workflow:

```typescript
const validateNode = createSimpleNode('validate', async (state: GraphState) => {
  if (!state.storyId) {
    return {
      errors: [
        {
          nodeId: 'validate',
          message: 'Story ID is required',
          code: 'MISSING_STORY_ID',
          timestamp: new Date().toISOString(),
          recoverable: false,
        },
      ],
    }
  }

  return { routingFlags: [...(state.routingFlags ?? []), 'validated'] }
})
```

Use conditional edges to handle errors:

```typescript
workflow.addConditionalEdges('validate', (state) => {
  // Stop if there are non-recoverable errors
  const hasBlockingError = state.errors?.some((e) => !e.recoverable)
  return hasBlockingError ? '__end__' : 'next-step'
})
```

## Step 7: Configure Models

Edit `.claude/config/model-assignments.yaml`:

```yaml
# Use local Ollama for fast tasks
code-review-lint: ollama:qwen2.5-coder:7b

# Use Claude for complex analysis
pm-story-generation-leader: sonnet
```

Set environment variables (`.env`):

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_ENABLE_FALLBACK=true
OLLAMA_FALLBACK_MODEL=haiku
```

## Common Patterns

### Sequential Flow

```typescript
workflow.addEdge('step1', 'step2')
workflow.addEdge('step2', 'step3')
```

### Conditional Routing

```typescript
workflow.addConditionalEdges('check', (state) => {
  return state.someCondition ? 'branch-a' : 'branch-b'
})
```

### Parallel Execution

```typescript
import { Send } from '@langchain/langgraph'

workflow.addConditionalEdges('fanout', (state) => {
  return ['worker-1', 'worker-2', 'worker-3'].map((w) => new Send(w, state))
})

// Converge
workflow.addEdge(['worker-1', 'worker-2', 'worker-3'], 'aggregate')
```

## Next Steps

1. **Read the [README](./README.md)** for comprehensive documentation
2. **Study the test examples** in `src/**/__tests__/` for working patterns:
   - `src/runner/__tests__/integration.test.ts` - Complete node workflow examples
   - `src/config/__tests__/llm-provider.test.ts` - LLM integration patterns
   - `src/state/__tests__/graph-state.test.ts` - State management
3. **Review node implementations** in `src/nodes/` for real-world usage

## Troubleshooting

### "Ollama is not available"

1. Start Ollama: `ollama serve`
2. Verify: `curl http://127.0.0.1:11434/api/tags`
3. Or enable fallback in `.env`: `OLLAMA_ENABLE_FALLBACK=true`

### "Cannot find module"

1. Build the package: `pnpm build`
2. Check imports use `@repo/orchestrator` or relative paths from `dist/`

### "Type errors"

1. Extend GraphState with your custom fields:
   ```typescript
   interface MyState extends GraphState {
     myCustomField?: string
   }
   ```
2. Add custom fields to workflow channels:
   ```typescript
   const workflow = new StateGraph<MyState>({
     channels: {
       ...standardChannels,
       myCustomField: null,
     },
   })
   ```

## Help

- Questions? Check [README.md](./README.md) troubleshooting section
- Issues? Create a GitHub issue
- Examples? See `examples/` and `src/__tests__/`
