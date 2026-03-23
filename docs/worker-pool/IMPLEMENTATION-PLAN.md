# Worker Pool Implementation Plan

**Date:** 2026-03-22  
**Status:** Draft  
**Architecture:** Mac Studio (Infra) + Mac Mini (Workers + Local Model)  
**Stack:** Bun + Hono (backend) + LangGraph (orchestration)

---

## Overview

This plan implements an **agentic worker pool** for the LangGraph orchestrator, enabling:

- **12-15 parallel agents** on Mac Mini M4 Pro 48GB
- **Tool-augmented agents** with file system, git, and shell access
- **Self-reflection and self-correction** loops
- **Local Ollama inference** for light/medium tasks
- **Cloud fallback** for complex reasoning
- **BullMQ job queue** for distributed processing
- **Memory** for cross-job context

## Key Design Principles

1. **Agents, not Workers** - Each worker is a LangGraph agent with tools
2. **Self-Correcting** - Agents validate output and fix errors
3. **Tool-Rich** - File system, git, shell, search capabilities
4. **Memory-Aware** - Context from previous similar tasks
5. **Fallback Chain** - Local → Cloud with graceful degradation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mac Studio M2 Max 32GB                   │
│                    (Infrastructure Host)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Knowledge   │  │ PostgreSQL  │  │     Redis       │   │
│  │ Base       │  │ + pgvector  │  │    (BullMQ)     │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           LangGraph Orchestrator                   │   │
│  │           (Dispatches jobs to queue)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Redis / BullMQ
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Mac Mini M4 Pro 48GB                     │
│                    (Worker Host)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   Ollama   │  │  Worker     │  │    Worker       │   │
│  │  Server    │  │  Process 1  │  │    Process N    │   │
│  │  (Qwen 7B) │  │             │  │                 │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
│                      12-15 concurrent workers              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Task Output
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Cloud APIs                           │
│              (Claude Max + OpenRouter)                      │
│         Used when: Local model fails / Complex task          │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Infrastructure (Mac Studio) - Existing

| Component              | Purpose          | Port |
| ---------------------- | ---------------- | ---- |
| Redis                  | Job queue broker | 6379 |
| BullMQ                 | Queue management | -    |
| LangGraph Orchestrator | Job dispatcher   | -    |

### 2. Workers (Mac Mini) - New

| Component     | Purpose                         | Port  |
| ------------- | ------------------------------- | ----- |
| Ollama Server | Local LLM inference             | 11434 |
| Worker Pool   | 12-15 concurrent job processors | -     |

### 3. Client (MacBook Pro) - Existing

| Component | Purpose              |
| --------- | -------------------- |
| SSH / VPN | Access orchestration |

---

## Directory Structure

```
packages/
  backend/
    worker-pool/                    # NEW: Worker pool package (Bun + Hono + LangGraph)
      src/
        index.ts                   # Bun entry point (index.ts)
        config/
          index.ts                 # Configuration schemas
          agent.config.ts          # Agent settings
          model.config.ts          # Ollama settings
        agents/
          base.agent.ts            # Base LangGraph agent with tools
          code-review.agent.ts     # Code review agent
          qa.agent.ts             # QA verification agent
          lint.agent.ts            # Lint agent
          research.agent.ts        # Research agent
          coder.agent.ts          # Coding agent
        tools/
          index.ts                # Tool registry
          file-tools.ts            # read/write file tools
          git-tools.ts             # git diff, status, log
          shell-tools.ts            # exec, spawn
          search-tools.ts           # code search
        ollama/
          client.ts                # Ollama API client
          router.ts                # Local vs cloud routing
          fallback.ts              # Cloud fallback logic
        graph/
          agent-graph.ts           # LangGraph state definition
          nodes.ts                 # Graph nodes (plan, act, reflect, etc.)
          edges.ts                 # Graph conditional edges
        memory/
          context-store.ts          # Cross-job memory store
          affinity-store.ts       # Model affinity learning
        queue/
          connection.ts           # Redis/BullMQ connection
          job-types.ts             # Job type definitions
          queue-names.ts           # Queue name constants
        health/
          health-check.ts         # Worker health monitoring
          metrics.ts               # Worker metrics
        api/
          routes.ts               # Hono routes for worker management
          middleware.ts            # Auth, logging middleware
      package.json
      tsconfig.json
      bunfig.toml               # Bun configuration
      README.md
```

---

---

## Agentic Architecture

### Core Agent Pattern

Each worker is a **LangGraph agent** with the following loop:

```
┌─────────────────────────────────────────────────────────────┐
│                      AGENT LOOP                             │
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌────────────┐    ┌────┐ │
│   │  PLAN   │───►│   ACT   │───►│  REFLECT   │───►│END?│ │
│   │ (think) │    │(execute)│    │(validate)  │    └────┘ │
│   └─────────┘    └────┬────┘    └─────┬──────┘      │     │
│                       │               │              │     │
│                       │      ┌────────┴────────┐     │     │
│                       │      │                 │     │     │
│                       ▼      ▼                 ▼     │     │
│                   [TOOL CALL]              [FIX]────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tool Suite

| Tool           | Purpose               | Used By           |
| -------------- | --------------------- | ----------------- |
| `read_file`    | Read file contents    | All agents        |
| `write_file`   | Write/modify files    | Coder, QA         |
| `glob`         | Find files by pattern | Research, Lint    |
| `grep`         | Search file contents  | Research, Lint    |
| `exec_command` | Run shell commands    | Lint, Test, Build |
| `git_diff`     | Get changed files     | Code Review       |
| `git_status`   | Check repo state      | All agents        |
| `run_tests`    | Execute test suite    | QA Agent          |
| `run_lint`     | Execute lint checks   | Lint Agent        |

### Self-Correction Loop

```typescript
// Agent executes tool → validates result → fixes if needed
const MAX_ATTEMPTS = 3

for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  const result = await executeWithTools(goal, tools)

  const validation = await validate(result, criteria)

  if (validation.pass) {
    return result
  }

  if (attempt < MAX_ATTEMPTS - 1) {
    goal = `Fix these issues: ${validation.errors}\n\nPrevious attempt:\n${result}`
  }
}

return { result, warnings: validation.errors }
```

### Memory Integration

Agents maintain context across jobs:

```typescript
interface AgentMemory {
  projectId: string
  relevantFiles: string[]
  recentChanges: string[]
  taskHistory: TaskResult[]
}

// Before processing, retrieve relevant context
const memory = await contextStore.getRelevant(projectId, goal)
const prompt = `Previous work on this project:\n${memory}\n\nCurrent task:\n${goal}`
```

---

## Implementation

### Phase 1: Ollama Setup (Mac Mini)

#### 1.1 Install Ollama

```bash
# SSH to Mac Mini or run locally
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version

# Pull initial models
ollama pull qwen2.5-coder:7b       # Light tasks
ollama pull qwen2.5-coder:14b     # Medium tasks
ollama pull deepseek-coder:33b     # Complex tasks (if RAM allows)
```

#### 1.2 Configure Ollama Server

```bash
# Create ollama service (launchd on macOS)
cat > ~/Library/LaunchAgents/com.ollama.ollama.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.ollama</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>0.0.0.0:11434</string>
        <key>OLLAMA_MODELS</key>
        <string>/Users/Shared/ollama/models</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load the service
launchctl load ~/Library/LaunchAgents/com.ollama.ollama.plist
```

#### 1.3 Test Ollama

```bash
# Test local inference
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-coder:7b",
  "prompt": "Write a simple hello world in TypeScript",
  "stream": false
}'
```

---

### Phase 2: Worker Pool Package

#### 2.1 Package Configuration (Bun + Hono + LangGraph)

```json
// packages/backend/worker-pool/package.json
{
  "name": "@repo/worker-pool",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "bun run src/index.ts",
    "dev": "bun --watch src/index.ts",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.8.0",
    "@langchain/langgraph-sdk": "^0.0.0",
    "@langchain/core": "^0.3.0",
    "langchain": "^0.3.0",
    "bullmq": "^5.1.0",
    "ioredis": "^5.3.0",
    "zod": "^3.22.0",
    "@repo/logger": "workspace:*",
    "@repo/config": "workspace:*",
    "ollama": "^0.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "bun-types": "^1.0.0",
    "typescript": "^5.3.0"
  }
}
```

```toml
# packages/backend/worker-pool/bunfig.toml
[install]
peer = true

[run]
bun = true
```

```typescript
// packages/backend/worker-pool/src/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { logger } from '@repo/logger'
import type { WorkerPool } from './workers/pool.js'
import { createWorkerPool } from './workers/pool.js'
import { healthMonitor } from './health/health-check.js'
import routes from './api/routes.js'

const app = new Hono()

// Health endpoint
app.get('/health', async c => {
  const status = await healthMonitor.checkHealth()
  return c.json(status)
})

// Mount API routes
app.route('/api', routes)

const PORT = parseInt(process.env.WORKER_PORT || '3001')

// Start server
console.log(`Worker Pool API starting on port ${PORT}`)

serve({
  fetch: app.fetch,
  port: PORT,
})

logger.info('Worker Pool started', { port: PORT })
```

#### 2.2 Job Type Definitions

```typescript
// packages/backend/worker-pool/src/queue/job-types.ts
import { z } from 'zod'

// Job priority levels
export const JobPriority = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
} as const

// Task complexity tiers for routing
export const TaskComplexity = {
  SIMPLE: 'simple', // 1-3 files, straightforward
  MEDIUM: 'medium', // 5-10 files, moderate logic
  COMPLEX: 'complex', // 10+ files, architecture decisions
} as const

// Supported job types
export const JobTypeSchema = z.enum([
  'code-review',
  'lint-check',
  'typecheck',
  'unit-test',
  'e2e-test',
  'dead-code-scan',
  'context-retrieval',
  'ac-verification',
  'research',
])

export type JobType = z.infer<typeof JobTypeSchema>

// Base job data schema
export const BaseJobDataSchema = z.object({
  jobId: z.string(),
  jobType: JobTypeSchema,
  storyId: z.string().optional(),
  priority: z.number().min(1).max(10).default(5),
  complexity: z.enum(['simple', 'medium', 'complex']).default('simple'),
  worktreeDir: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  timeoutMs: z.number().positive().default(300000), // 5 min default
})

export type BaseJobData = z.infer<typeof BaseJobDataSchema>

// Code review specific schema
export const CodeReviewJobSchema = BaseJobDataSchema.extend({
  jobType: z.literal('code-review'),
  files: z.array(z.string()),
  language: z.string().optional(),
})

export type CodeReviewJob = z.infer<typeof CodeReviewJobSchema>

// Lint check specific schema
export const LintCheckJobSchema = BaseJobDataSchema.extend({
  jobType: z.literal('lint-check'),
  files: z.array(z.string()),
  fix: z.boolean().default(false),
})

export type LintCheckJob = z.infer<typeof LintCheckJobSchema>

// Worker result schema
export const WorkerResultSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  modelUsed: z.string().optional(), // 'ollama', 'claude', 'openrouter'
  tokensUsed: z.number().optional(),
  durationMs: z.number(),
  timestamp: z.string().datetime(),
})

export type WorkerResult = z.infer<typeof WorkerResultSchema>
```

#### 2.3 Queue Connection

```typescript
// packages/backend/worker-pool/src/queue/connection.ts
import { Queue, Worker, ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '@repo/logger'

// Queue names
export const QueueNames = {
  CODE_REVIEW: 'worker:code-review',
  LINT: 'worker:lint',
  QA: 'worker:qa',
  RESEARCH: 'worker:research',
  FALLBACK: 'worker:fallback',
} as const

// Redis connection config (Mac Studio IP/hostname)
export const REDIS_CONFIG: ConnectionOptions = {
  host: process.env.REDIS_HOST || '192.168.1.100', // Mac Studio IP
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
}

// Singleton Redis connection for workers
let redisConnection: Redis | null = null

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis({
      ...REDIS_CONFIG,
      lazyConnect: true,
    })

    redisConnection.on('error', err => {
      logger.error('Redis connection error', { error: err.message })
    })

    redisConnection.on('connect', () => {
      logger.info('Redis connected')
    })
  }
  return redisConnection
}

// Create a queue instance
export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        count: 500, // Keep last 500 failed jobs for debugging
      },
    },
  })
}

// Health check for Redis connection
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedisConnection()
    const result = await redis.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
```

#### 2.4 Tool Suite

```typescript
// packages/backend/worker-pool/src/tools/index.ts
import { tool } from 'langchain/core/tools'
import { z } from 'zod'
import { readFile, writeFile, glob } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ============================================================================
// File Tools
// ============================================================================

export const readFileTool = tool(
  async ({ path, maxLines }: { path: string; maxLines?: number }) => {
    try {
      const content = await readFile(path, 'utf-8')
      if (maxLines) {
        const lines = content.split('\n')
        return (
          lines.slice(0, maxLines).join('\n') +
          (lines.length > maxLines ? `\n... (${lines.length - maxLines} more lines)` : '')
        )
      }
      return content
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'read_file',
    description: 'Read contents of a file. Use maxLines to limit output for large files.',
    schema: z.object({
      path: z.string().describe('Absolute path to the file'),
      maxLines: z.number().optional().describe('Maximum number of lines to read'),
    }),
  },
)

export const writeFileTool = tool(
  async ({ path, content }: { path: string; content: string }) => {
    try {
      await writeFile(path, content, 'utf-8')
      return `Successfully wrote to ${path}`
    } catch (error) {
      return `Error writing file: ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates or overwrites.',
    schema: z.object({
      path: z.string().describe('Absolute path to the file'),
      content: z.string().describe('Content to write'),
    }),
  },
)

export const findFilesTool = tool(
  async ({ pattern, cwd }: { pattern: string; cwd?: string }) => {
    try {
      const matches = await glob(pattern, { cwd: cwd || process.cwd() })
      return (
        matches.slice(0, 50).join('\n') +
        (matches.length > 50 ? `\n... (${matches.length - 50} more)` : '')
      )
    } catch (error) {
      return `Error finding files: ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'find_files',
    description: 'Find files matching a glob pattern.',
    schema: z.object({
      pattern: z.string().describe('Glob pattern (e.g., "**/*.ts")'),
      cwd: z.string().optional().describe('Working directory'),
    }),
  },
)

// ============================================================================
// Shell Tools
// ============================================================================

export const execCommandTool = tool(
  async ({ command, cwd, timeout }: { command: string; cwd?: string; timeout?: number }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout: timeout || 60000,
      })
      return `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string }
      return `Error:\n${err.stderr || err.message}\n\nOutput:\n${err.stdout || ''}`
    }
  },
  {
    name: 'exec_command',
    description: 'Execute a shell command and return output.',
    schema: z.object({
      command: z.string().describe('Shell command to execute'),
      cwd: z.string().optional().describe('Working directory'),
      timeout: z.number().optional().describe('Timeout in ms (default 60000)'),
    }),
  },
)

// ============================================================================
// Git Tools
// ============================================================================

export const gitDiffTool = tool(
  async ({ cwd, file }: { cwd?: string; file?: string }) => {
    try {
      const fileArg = file ? `-- ${file}` : ''
      const { stdout } = await execAsync(`git diff ${fileArg}`, {
        cwd: cwd || process.cwd(),
      })
      return stdout || 'No changes'
    } catch (error) {
      return `Error getting diff: ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'git_diff',
    description: 'Get git diff of changes.',
    schema: z.object({
      cwd: z.string().optional().describe('Working directory'),
      file: z.string().optional().describe('Specific file'),
    }),
  },
)

export const gitStatusTool = tool(
  async ({ cwd }: { cwd?: string }) => {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: cwd || process.cwd(),
      })
      return stdout || 'Clean working tree'
    } catch (error) {
      return `Error getting status: ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'git_status',
    description: 'Get git status of repository.',
    schema: z.object({
      cwd: z.string().optional().describe('Working directory'),
    }),
  },
)

// ============================================================================
// Tool Registry
// ============================================================================

export const TOOL_REGISTRY = {
  read_file: readFileTool,
  write_file: writeFileTool,
  find_files: findFilesTool,
  exec_command: execCommandTool,
  git_diff: gitDiffTool,
  git_status: gitStatusTool,
}

export const ALL_TOOLS = Object.values(TOOL_REGISTRY)
```

#### 2.5 LangGraph Agent Base

```typescript
// packages/backend/worker-pool/src/graph/agent-graph.ts
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { z } from 'zod'

// Agent state annotation
export const AgentStateAnnotation = Annotation.Root({
  // Input
  goal: Annotation<string>({ reducer: (_, b) => b }),
  tools: Annotation<string[]>({ reducer: 'first' }),

  // Memory context
  memory: Annotation<string[]>({ reducer: 'first' }),

  // Execution state
  plan: Annotation<string | null>({ reducer: 'first' }),
  toolCalls: Annotation<string[]>({ reducer: 'first' }),
  toolResults: Annotation<string[]>({ reducer: 'first' }),

  // Reflection/validation
  validationErrors: Annotation<string[]>({ reducer: 'append' }),
  attempts: Annotation<number>({ reducer: 'first' }),

  // Output
  result: Annotation<string | null>({ reducer: 'first' }),
  success: Annotation<boolean>({ reducer: 'first' }),
  modelUsed: Annotation<string>({ reducer: 'first' }),
})

export type AgentState = typeof AgentStateAnnotation.State

// Validation result
export const ValidationResultSchema = z.object({
  pass: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>
```

```typescript
// packages/backend/worker-pool/src/graph/nodes.ts
import type { AgentState, ValidationResult } from './agent-graph.js'
import { getModelRouter } from '../ollama/router.js'
import { TOOL_REGISTRY } from '../tools/index.js'

// Node: Plan - Create execution plan
export async function planNode(state: AgentState): Promise<Partial<AgentState>> {
  const router = getModelRouter()
  const routing = await router.route({ taskType: state.taskType || 'general' })

  // Build planning prompt with memory context
  const memoryContext =
    state.memory.length > 0
      ? `\n\nRelevant context from previous work:\n${state.memory.join('\n')}`
      : ''

  const planningPrompt = `${state.goal}${memoryContext}

Create a step-by-step plan to accomplish this goal. Consider:
1. What files need to be read/modified?
2. What commands need to be run?
3. How will you validate success?

Return a JSON plan:
{
  "steps": ["step 1", "step 2", ...],
  "files": ["file1.ts", "file2.ts"],
  "validation": "how to verify success"
}`

  const { result } = await router.executeWithFallback(planningPrompt, 'planning', {
    complexity: 'medium',
  })

  return {
    plan: result,
    modelUsed: routing.model,
  }
}

// Node: Act - Execute plan with tools
export async function actNode(state: AgentState): Promise<Partial<AgentState>> {
  const toolCalls: string[] = []
  const toolResults: string[] = []

  // Parse plan and execute tools
  // This is simplified - real implementation would parse JSON plan
  const plan = state.plan || state.goal

  // Example: Execute relevant tools based on task
  for (const toolName of state.tools) {
    const tool = TOOL_REGISTRY[toolName]
    if (tool) {
      try {
        const result = await tool.invoke({ goal: state.goal, context: plan })
        toolCalls.push(toolName)
        toolResults.push(result)
      } catch (error) {
        toolResults.push(
          `Tool ${toolName} failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  return {
    toolCalls,
    toolResults,
  }
}

// Node: Reflect - Validate and self-correct
export async function reflectNode(state: AgentState): Promise<Partial<AgentState>> {
  const router = getModelRouter()

  const reflectionPrompt = `Review the following work:

GOAL: ${state.goal}

TOOL CALLS:
${state.toolCalls.join('\n')}

RESULTS:
${state.toolResults.join('\n---\n')}

Validation criteria: ${state.validationCriteria || 'Complete and correct'}

Check if:
1. The goal was achieved
2. Any errors occurred
3. Improvements are needed

Return JSON:
{
  "pass": true/false,
  "errors": ["error 1", "error 2"],
  "warnings": ["warning 1"]
}`

  const { result } = await router.executeWithFallback(reflectionPrompt, 'reflection', {
    complexity: 'medium',
  })

  let validation: ValidationResult = { pass: true, errors: [] }
  try {
    validation = JSON.parse(result) as ValidationResult
  } catch {
    validation = { pass: true, errors: [] }
  }

  return {
    validationErrors: validation.errors,
    attempts: state.attempts + 1,
  }
}

// Node: Finalize - Produce result
export async function finalizeNode(state: AgentState): Promise<Partial<AgentState>> {
  return {
    result: state.toolResults.join('\n\n'),
    success: state.validationErrors.length === 0,
  }
}

// Node: Replan - Fix and retry
export async function replanNode(state: AgentState): Promise<Partial<AgentState>> {
  const router = getModelRouter()

  const replanPrompt = `Fix the following issues and retry:

ORIGINAL GOAL: ${state.goal}

ERRORS FOUND:
${state.validationErrors.join('\n')}

PREVIOUS RESULTS:
${state.toolResults.join('\n---\n')}

Create a corrected plan that addresses the errors.`

  const { result } = await router.executeWithFallback(replanPrompt, 'replan', {
    complexity: 'medium',
  })

  return {
    plan: result,
    validationErrors: [], // Reset for next attempt
  }
}
```

```typescript
// packages/backend/worker-pool/src/graph/edges.ts
import type { AgentState } from './agent-graph.js'

const MAX_ATTEMPTS = 3

// Conditional edge: After reflect, decide next step
export function shouldContinueReflect(state: AgentState): 'replan' | 'finalize' {
  // If validation passed or max attempts reached, finalize
  if (state.validationErrors.length === 0 || state.attempts >= MAX_ATTEMPTS) {
    return 'finalize'
  }

  // Otherwise, replan and try again
  return 'replan'
}

// Conditional edge: After plan, go to act
export function shouldPlan(state: AgentState): 'act' | 'finalize' {
  // If we have a valid plan, proceed
  if (state.plan) {
    return 'act'
  }

  // Failed to create plan
  return 'finalize'
}

// Conditional edge: After act, go to reflect
export function shouldAct(state: AgentState): 'reflect' {
  return 'reflect'
}
```

#### 2.6 Base Agent Class

```typescript
// packages/backend/worker-pool/src/agents/base.agent.ts
import { StateGraph } from '@langchain/langgraph'
import { AgentStateAnnotation, type AgentState } from '../graph/agent-graph.js'
import { planNode, actNode, reflectNode, finalizeNode, replanNode } from '../graph/nodes.js'
import { shouldContinueReflect, shouldPlan, shouldAct } from '../graph/edges.js'
import { Worker, Job } from 'bullmq'
import { logger } from '@repo/logger'
import { getModelRouter } from '../ollama/router.js'
import { getRedisConnection } from '../queue/connection.js'
import type { WorkerResult } from '../queue/job-types.js'

export interface AgentConfig {
  name: string
  queueName: string
  tools: string[]
  systemPrompt?: string
  validationCriteria?: string
  maxConcurrency?: number
}

export class BaseAgent {
  protected graph: ReturnType<typeof StateGraph.prototype.compile>
  protected worker: Worker
  protected router = getModelRouter()
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config

    // Build LangGraph
    this.graph = this.buildGraph()

    // Create BullMQ worker
    this.worker = new Worker(config.queueName, async job => this.runJob(job), {
      connection: getRedisConnection(),
      concurrency: config.maxConcurrency || 3,
    })

    this.setupEventHandlers()
  }

  protected buildGraph() {
    return new StateGraph(AgentStateAnnotation)
      .addNode('plan', planNode)
      .addNode('act', actNode)
      .addNode('reflect', reflectNode)
      .addNode('replan', replanNode)
      .addNode('finalize', finalizeNode)
      .addEdge(START, 'plan')
      .addConditionalEdges('plan', shouldPlan, { act: 'act', finalize: 'finalize' })
      .addConditionalEdges('act', shouldAct, { reflect: 'reflect' })
      .addConditionalEdges('reflect', shouldContinueReflect, {
        replan: 'replan',
        finalize: 'finalize',
      })
      .addEdge('replan', 'act')
      .addEdge('finalize', END)
      .compile()
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info('Agent job completed', {
        agent: this.config.name,
        jobId: job.id,
        success: result?.success,
      })
    })

    this.worker.on('failed', (job, err) => {
      logger.error('Agent job failed', {
        agent: this.config.name,
        jobId: job?.id,
        error: err.message,
      })
    })
  }

  protected async runJob(job: Job): Promise<WorkerResult> {
    const startTime = Date.now()
    const jobId = job.id || 'unknown'

    try {
      const jobData = job.data

      // Run agent graph
      const result = await this.graph.invoke({
        goal: jobData.goal || jobData.description,
        tools: this.config.tools,
        memory: jobData.memory || [],
        validationCriteria: this.config.validationCriteria,
        taskType: this.config.name,
        attempts: 0,
        plan: null,
        toolCalls: [],
        toolResults: [],
        validationErrors: [],
        result: null,
        success: false,
        modelUsed: 'unknown',
      })

      return {
        success: result.success || false,
        jobId,
        result: result.result,
        modelUsed: result.modelUsed,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('Agent job error', {
        agent: this.config.name,
        jobId,
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        success: false,
        jobId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async start(): Promise<void> {
    logger.info('Starting agent', { name: this.config.name, queue: this.config.queueName })
    await this.worker.run()
  }

  async stop(): Promise<void> {
    logger.info('Stopping agent', { name: this.config.name })
    await this.worker.close()
  }
}
```

#### 2.7 Memory & Affinity Stores

```typescript
// packages/backend/worker-pool/src/memory/context-store.ts
import { logger } from '@repo/logger'

interface MemoryEntry {
  projectId: string
  taskType: string
  goal: string
  result: string
  timestamp: number
  filesTouched: string[]
}

export class ContextStore {
  private entries: Map<string, MemoryEntry[]> = new Map()

  async add(entry: MemoryEntry): Promise<void> {
    const key = entry.projectId
    const existing = this.entries.get(key) || []

    // Keep last 100 entries per project
    existing.push(entry)
    if (existing.length > 100) {
      existing.shift()
    }

    this.entries.set(key, existing)
    logger.debug('Memory entry added', { projectId: entry.projectId, taskType: entry.taskType })
  }

  async getRelevant(projectId: string, goal: string, limit = 5): Promise<string[]> {
    const entries = this.entries.get(projectId) || []

    // Simple relevance: look for similar task types or keywords
    const keywords = goal.toLowerCase().split(/\s+/)

    const scored = entries.map(entry => {
      let score = 0

      // Same task type = higher score
      if (keywords.some(k => entry.taskType.toLowerCase().includes(k))) {
        score += 2
      }

      // Keyword overlap
      const entryKeywords = entry.goal.toLowerCase().split(/\s+/)
      score += keywords.filter(k => entryKeywords.includes(k)).length

      // Recency boost
      const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60)
      score += Math.max(0, 1 - ageHours / 24)

      return { entry, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ entry }) => `[${entry.taskType}] ${entry.goal}: ${entry.result.substring(0, 200)}...`)
  }

  async clear(projectId?: string): Promise<void> {
    if (projectId) {
      this.entries.delete(projectId)
    } else {
      this.entries.clear()
    }
  }
}

export const contextStore = new ContextStore()
```

```typescript
// packages/backend/worker-pool/src/memory/affinity-store.ts
import { logger } from '@repo/logger'

interface AffinityEntry {
  taskType: string
  modelId: string
  successRate: number
  sampleCount: number
  avgDurationMs: number
  lastUpdated: number
}

export class AffinityStore {
  private affinity: Map<string, AffinityEntry> = new Map()

  private key(taskType: string, modelId: string): string {
    return `${taskType}:${modelId}`
  }

  record(taskType: string, modelId: string, success: boolean, durationMs: number): void {
    const k = this.key(taskType, modelId)
    const existing = this.affinity.get(k)

    if (existing) {
      // Update with weighted average
      const totalCount = existing.sampleCount + 1
      const newSuccessRate =
        (existing.successRate * existing.sampleCount + (success ? 1 : 0)) / totalCount
      const newDuration = (existing.avgDurationMs * existing.sampleCount + durationMs) / totalCount

      this.affinity.set(k, {
        taskType,
        modelId,
        successRate: newSuccessRate,
        sampleCount: totalCount,
        avgDurationMs: newDuration,
        lastUpdated: Date.now(),
      })
    } else {
      this.affinity.set(k, {
        taskType,
        modelId,
        successRate: success ? 1 : 0,
        sampleCount: 1,
        avgDurationMs: durationMs,
        lastUpdated: Date.now(),
      })
    }
  }

  getBestModel(taskType: string, candidates: string[]): string | null {
    let bestModel: string | null = null
    let bestScore = -1

    for (const modelId of candidates) {
      const entry = this.affinity.get(this.key(taskType, modelId))
      if (!entry) continue

      // Score = success rate * recency factor
      const ageHours = (Date.now() - entry.lastUpdated) / (1000 * 60 * 60)
      const recencyFactor = Math.max(0.5, 1 - ageHours / 168) // Decay over 1 week
      const score = entry.successRate * recencyFactor * (entry.sampleCount >= 5 ? 1 : 0.5)

      if (score > bestScore) {
        bestScore = score
        bestModel = modelId
      }
    }

    return bestModel
  }

  getAffinity(taskType: string, modelId: string): AffinityEntry | null {
    return this.affinity.get(this.key(taskType, modelId)) || null
  }
}

export const affinityStore = new AffinityStore()
```

#### 2.8 Ollama Client

```typescript
// packages/backend/worker-pool/src/ollama/client.ts
import { z } from 'zod'
import { logger } from '@repo/logger'

// Ollama configuration
export const OllamaConfigSchema = z.object({
  baseUrl: z.string().url().default('http://localhost:11434'),
  models: z.object({
    light: z.string().default('qwen2.5-coder:7b'),
    medium: z.string().default('qwen2.5-coder:14b'),
    heavy: z.string().default('deepseek-coder:33b'),
  }),
  timeout: z.number().positive().default(120000), // 2 min
  maxRetries: z.number().int().min(0).default(2),
})

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>

// Ollama generate request/response
const GenerateRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  system: z.string().optional(),
  context: z.array(z.number()).optional(),
  options: z
    .object({
      temperature: z.number().optional(),
      top_p: z.number().optional(),
      num_predict: z.number().optional(),
    })
    .optional(),
  stream: z.boolean().default(false),
  raw: z.boolean().default(false),
})

const GenerateResponseSchema = z.object({
  model: z.string(),
  response: z.string(),
  done: z.boolean(),
  context: z.array(z.number()).optional(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
})

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>

// Ollama client class
export class OllamaClient {
  private config: OllamaConfig
  private baseUrl: string

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = OllamaConfigSchema.parse(config)
    this.baseUrl = this.config.baseUrl
  }

  // Get model name based on complexity
  getModelForComplexity(complexity: 'simple' | 'medium' | 'complex'): string {
    switch (complexity) {
      case 'simple':
        return this.config.models.light
      case 'medium':
        return this.config.models.medium
      case 'complex':
        return this.config.models.heavy
    }
  }

  // Generate completion
  async generate(
    prompt: string,
    options: {
      model?: string
      system?: string
      complexity?: 'simple' | 'medium' | 'complex'
      temperature?: number
      maxTokens?: number
    } = {},
  ): Promise<GenerateResponse> {
    const model = options.model || this.getModelForComplexity(options.complexity || 'simple')

    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            GenerateRequestSchema.parse({
              model,
              prompt,
              system: options.system,
              options: {
                temperature: options.temperature ?? 0.3, // Lower for coding tasks
                num_predict: options.maxTokens ?? 2048,
              },
              stream: false,
            }),
          ),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status}`)
        }

        const data = await response.json()
        const parsed = GenerateResponseSchema.parse(data)

        logger.debug('Ollama generate completed', {
          model,
          durationMs: Date.now() - startTime,
          evalCount: parsed.eval_count,
        })

        return parsed
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(`Ollama attempt ${attempt + 1} failed`, { error: lastError.message })

        // Wait before retry
        if (attempt < this.config.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError || new Error('Ollama generation failed')
  }

  // Check if Ollama is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // List available models
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) return []

      const data = await response.json()
      return (data.models || []).map((m: { name: string }) => m.name)
    } catch {
      return []
    }
  }
}

// Singleton instance
let ollamaClient: OllamaClient | null = null

export function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient({
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    })
  }
  return ollamaClient
}
```

#### 2.5 Model Router (Local vs Cloud)

```typescript
// packages/backend/worker-pool/src/ollama/router.ts
import { z } from 'zod'
import { logger } from '@repo/logger'
import { getOllamaClient, OllamaClient } from './client.js'
import { WorkerResultSchema } from '../queue/job-types.js'

// Task type to complexity mapping
const TASK_COMPLEXITY_MAP: Record<string, 'simple' | 'medium' | 'complex'> = {
  'lint-check': 'simple',
  typecheck: 'simple',
  'unit-test': 'simple',
  'e2e-test': 'simple',
  'dead-code-scan': 'simple',
  'context-retrieval': 'simple',
  'code-review': 'medium', // Can vary widely
  'ac-verification': 'medium',
  research: 'complex',
  'architecture-review': 'complex',
}

// Force cloud for these tasks (no local model capable enough)
const FORCE_CLOUD_TASKS = new Set([
  'architecture-review',
  'security-deep-dive',
  'novel-bug-diagnosis',
])

// Routing decision
export const RoutingDecisionSchema = z.object({
  route: z.enum(['local', 'cloud']),
  model: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
})

export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>

// Routing options
export interface RoutingOptions {
  taskType: string
  complexity?: 'simple' | 'medium' | 'complex'
  forceCloud?: boolean
  contextLength?: number
}

// Model affinity scores (would come from KB in production)
const MODEL_AFFINITY = {
  'ollama:qwen2.5-coder:7b': { simple: 0.9, medium: 0.6, complex: 0.2 },
  'ollama:qwen2.5-coder:14b': { simple: 0.95, medium: 0.8, complex: 0.4 },
  'ollama:deepseek-coder:33b': { simple: 0.98, medium: 0.9, complex: 0.7 },
  'cloud:claude-sonnet': { simple: 0.8, medium: 0.95, complex: 0.95 },
  'cloud:claude-opus': { simple: 0.7, medium: 0.9, complex: 1.0 },
}

export class ModelRouter {
  private ollamaClient: OllamaClient
  private ollamaAvailable: boolean = false
  private lastHealthCheck: number = 0
  private healthCheckInterval: number = 60000 // 1 min

  constructor(ollamaClient?: OllamaClient) {
    this.ollamaClient = ollamaClient || getOllamaClient()
  }

  // Check Ollama health periodically
  async checkOllamaHealth(): Promise<boolean> {
    const now = Date.now()
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.ollamaAvailable
    }

    this.ollamaAvailable = await this.ollamaClient.isAvailable()
    this.lastHealthCheck = now

    logger.debug('Ollama health check', { available: this.ollamaAvailable })
    return this.ollamaAvailable
  }

  // Decide routing for a task
  async route(options: RoutingOptions): Promise<RoutingDecision> {
    const { taskType, forceCloud, contextLength } = options
    let complexity = options.complexity || TASK_COMPLEXITY_MAP[taskType] || 'medium'

    // Always use cloud for certain tasks
    if (forceCloud || FORCE_CLOUD_TASKS.has(taskType)) {
      return {
        route: 'cloud',
        model: 'claude-sonnet-4-5',
        reason: `Task ${taskType} requires cloud model`,
        confidence: 1.0,
      }
    }

    // Check Ollama availability
    const ollamaUp = await this.checkOllamaHealth()

    if (!ollamaUp) {
      logger.warn('Ollama unavailable, routing to cloud', { taskType })
      return {
        route: 'cloud',
        model: 'claude-sonnet-4-5',
        reason: 'Ollama unavailable',
        confidence: 1.0,
      }
    }

    // Get local model based on complexity
    const localModel = this.ollamaClient.getModelForComplexity(complexity)
    const localAffinity = MODEL_AFFINITY[`ollama:${localModel}`]?.[complexity] || 0.5

    // Cloud is always available but costs money
    const cloudAffinity = MODEL_AFFINITY['cloud:claude-sonnet'][complexity]

    // Decision logic
    // Use local if affinity is high enough and task isn't complex
    if (localAffinity >= 0.7 && complexity !== 'complex') {
      return {
        route: 'local',
        model: localModel,
        reason: `Local model ${localModel} has ${Math.round(localAffinity * 100)}% affinity for ${complexity} tasks`,
        confidence: localAffinity,
      }
    }

    // Use local if it's good enough and cloud has similar quality
    if (localAffinity >= 0.6 && cloudAffinity - localAffinity < 0.2) {
      return {
        route: 'local',
        model: localModel,
        reason: `Local model acceptable (${Math.round(localAffinity * 100)}% vs ${Math.round(cloudAffinity * 100)}% cloud)`,
        confidence: localAffinity,
      }
    }

    // Default to cloud for complex or high-quality requirements
    return {
      route: 'cloud',
      model: complexity === 'complex' ? 'claude-opus-3-5' : 'claude-sonnet-4-5',
      reason: `Cloud preferred for ${complexity} tasks`,
      confidence: cloudAffinity,
    }
  }

  // Execute with fallback: try local, fall back to cloud
  async executeWithFallback(
    prompt: string,
    taskType: string,
    options: Partial<RoutingOptions> = {},
  ): Promise<{ result: string; model: string; usedCloudFallback: boolean }> {
    const routing = await this.route({ taskType, ...options })

    if (routing.route === 'local') {
      try {
        const response = await this.ollamaClient.generate(prompt, {
          complexity: routing.confidence > 0.8 ? 'simple' : 'medium',
        })

        return {
          result: response.response,
          model: routing.model,
          usedCloudFallback: false,
        }
      } catch (localError) {
        logger.warn('Local model failed, falling back to cloud', {
          error: localError instanceof Error ? localError.message : String(localError),
          taskType,
        })
        // Fall through to cloud
      }
    }

    // Cloud fallback
    const cloudResult = await this.executeCloud(prompt, routing.model)
    return {
      result: cloudResult.response,
      model: routing.model,
      usedCloudFallback: true,
    }
  }

  // Cloud execution (would call actual Claude/OpenRouter API)
  private async executeCloud(prompt: string, model: string): Promise<{ response: string }> {
    // This would integrate with your existing Claude/OpenRouter client
    // Simplified for now
    logger.info('Executing on cloud model', { model, promptLength: prompt.length })

    // TODO: Integrate with existing cloud LLM client
    throw new Error('Cloud execution not implemented - integrate with existing cloud client')
  }
}

// Singleton
let router: ModelRouter | null = null

export function getModelRouter(): ModelRouter {
  if (!router) {
    router = new ModelRouter()
  }
  return router
}
```

#### 2.6 Base Worker Class

```typescript
// packages/backend/worker-pool/src/workers/base.worker.ts
import { Worker, Job } from 'bullmq'
import { logger } from '@repo/logger'
import {
  BaseJobDataSchema,
  WorkerResultSchema,
  type BaseJobData,
  type WorkerResult,
} from '../queue/job-types.js'
import { getModelRouter, ModelRouter } from '../ollama/router.js'
import { getRedisConnection } from '../queue/connection.js'

// Worker events for monitoring
export interface WorkerEvents {
  onComplete?: (job: Job, result: WorkerResult) => void
  onFailed?: (job: Job, error: Error) => void
  onProgress?: (job: Job, progress: number) => void
}

// Base worker configuration
export interface BaseWorkerConfig {
  queueName: string
  concurrency: number
  events?: WorkerEvents
}

// Base worker class
export abstract class BaseWorker {
  protected worker: Worker
  protected queueName: string
  protected concurrency: number
  protected router: ModelRouter
  protected events: WorkerEvents

  constructor(config: BaseWorkerConfig) {
    this.queueName = config.queueName
    this.concurrency = config.concurrency
    this.router = getModelRouter()
    this.events = config.events || {}

    this.worker = new Worker(config.queueName, async job => this.processJob(job), {
      connection: getRedisConnection(),
      concurrency: config.concurrency,
      limiter: {
        max: config.concurrency,
        duration: 1000, // jobs per second
      },
    })

    this.setupEventHandlers()
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info('Worker job completed', {
        queue: this.queueName,
        jobId: job.id,
        duration: job.finishedOn - job.timestamp,
      })
      this.events.onComplete?.(job, result as WorkerResult)
    })

    this.worker.on('failed', (job, err) => {
      logger.error('Worker job failed', {
        queue: this.queueName,
        jobId: job?.id,
        error: err.message,
      })
      if (job) {
        this.events.onFailed?.(job, err)
      }
    })

    this.worker.on('progress', (job, progress) => {
      this.events.onProgress?.(job, progress as number)
    })

    this.worker.on('error', err => {
      logger.error('Worker error', {
        queue: this.queueName,
        error: err.message,
      })
    })
  }

  // Process a job - override in subclass
  protected abstract processJob(job: Job): Promise<WorkerResult>

  // Common job processing
  protected async runJob<T extends BaseJobData>(
    job: Job,
    processFn: (data: T) => Promise<{ result: unknown; modelUsed: string }>,
  ): Promise<WorkerResult> {
    const startTime = Date.now()
    const jobId = job.id || 'unknown'

    try {
      // Validate job data
      const data = BaseJobDataSchema.parse(job.data) as T

      // Update job progress
      await job.updateProgress(10)

      // Process the job
      const { result, modelUsed } = await processFn(data)

      await job.updateProgress(100)

      const result_ = WorkerResultSchema.parse({
        success: true,
        jobId,
        result,
        modelUsed,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })

      return result_
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Job processing failed', { jobId, error: errorMessage })

      return WorkerResultSchema.parse({
        success: false,
        jobId,
        error: errorMessage,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Start the worker
  async start(): Promise<void> {
    logger.info('Starting worker', {
      queue: this.queueName,
      concurrency: this.concurrency,
    })
    await this.worker.run()
  }

  // Stop the worker gracefully
  async stop(): Promise<void> {
    logger.info('Stopping worker', { queue: this.queueName })
    await this.worker.close()
  }

  // Pause the worker
  async pause(): Promise<void> {
    await this.worker.pause()
    logger.info('Worker paused', { queue: this.queueName })
  }

  // Resume the worker
  async resume(): Promise<void> {
    await this.worker.resume()
    logger.info('Worker resumed', { queue: this.queueName })
  }
}
```

#### 2.7 Code Review Worker

```typescript
// packages/backend/worker-pool/src/workers/code-review.worker.ts
import { Job } from 'bullmq'
import { logger } from '@repo/logger'
import { BaseWorker } from './base.worker.js'
import type { WorkerResult } from '../queue/job-types.js'
import { CodeReviewJobSchema, type CodeReviewJob } from '../queue/job-types.js'

// System prompt for code review
const CODE_REVIEW_SYSTEM = `You are an expert code reviewer. Analyze the provided code changes and provide:
1. Code quality issues
2. Potential bugs
3. Security concerns
4. Performance suggestions
5. Best practice recommendations

Format your response as JSON with the structure:
{
  "issues": [{ "severity": "error|warning|info", "file": string, "line": number, "message": string }],
  "summary": string,
  "recommendations": string[]
}`

export class CodeReviewWorker extends BaseWorker {
  constructor(concurrency: number = 3) {
    super({
      queueName: 'worker:code-review',
      concurrency,
    })
  }

  protected async processJob(job: Job): Promise<WorkerResult> {
    return this.runJob<CodeReviewJob>(job, async data => {
      const { files, storyId, complexity } = data

      // Build prompt from files
      const prompt = `Story ID: ${storyId || 'N/A'}
      
Review the following code changes:

${files.map((f, i) => `--- File ${i + 1} ---\n${f}`).join('\n\n')}

Provide a detailed code review.`

      // Use router with fallback
      const { result, modelUsed, usedCloudFallback } = await this.router.executeWithFallback(
        prompt,
        'code-review',
        { complexity },
      )

      if (usedCloudFallback) {
        logger.info('Code review fell back to cloud', { jobId: job.id })
      }

      // Parse result (assumes JSON response)
      let reviewResult
      try {
        reviewResult = JSON.parse(result)
      } catch {
        reviewResult = { raw: result, summary: 'Review completed (unstructured)' }
      }

      return {
        result: reviewResult,
        modelUsed,
      }
    })
  }
}
```

#### 2.8 Lint Worker

```typescript
// packages/backend/worker-pool/src/workers/lint.worker.ts
import { Job } from 'bullmq'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '@repo/logger'
import { BaseWorker } from './base.worker.js'
import type { WorkerResult } from '../queue/job-types.js'
import { LintCheckJobSchema, type LintCheckJob } from '../queue/job-types.js'

const execAsync = promisify(exec)

export class LintWorker extends BaseWorker {
  constructor(concurrency: number = 5) {
    super({
      queueName: 'worker:lint',
      concurrency,
    })
  }

  protected async processJob(job: Job): Promise<WorkerResult> {
    return this.runJob<LintCheckJob>(job, async data => {
      const { files, fix, worktreeDir } = data

      // Run ESLint on files
      const fixFlag = fix ? '--fix' : ''
      const filesArg = files.join(' ')
      const command = `cd ${worktreeDir || process.cwd()} && pnpm lint ${fixFlag} -- ${filesArg}`

      logger.debug('Running lint', { command })

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 60000, // 1 minute
        })

        const hasErrors = stderr.includes('error') || stdout.includes('error')
        const hasWarnings = stderr.includes('warning') || stdout.includes('warning')

        return {
          result: {
            passed: !hasErrors,
            warnings: hasWarnings,
            output: stderr || stdout,
          },
          modelUsed: 'eslint', // No LLM needed
        }
      } catch (error) {
        const err = error as { stderr?: string; message?: string }
        return {
          result: {
            passed: false,
            errors: err.stderr || err.message,
          },
          modelUsed: 'eslint',
        }
      }
    })
  }
}
```

#### 2.9 Health Check & Metrics

```typescript
// packages/backend/worker-pool/src/health/health-check.ts
import { logger } from '@repo/logger'
import { isRedisHealthy } from '../queue/connection.js'
import { getOllamaClient } from '../ollama/client.js'

export interface HealthStatus {
  healthy: boolean
  components: {
    redis: boolean
    ollama: boolean
  }
  timestamp: string
  uptime: number
}

export interface WorkerMetrics {
  workerId: string
  jobsProcessed: number
  jobsSucceeded: number
  jobsFailed: number
  averageDurationMs: number
  lastJobAt: string | null
}

class HealthMonitor {
  private startTime: number = Date.now()
  private metrics: Map<string, WorkerMetrics> = new Map()

  async checkHealth(): Promise<HealthStatus> {
    const [redisOk, ollamaOk] = await Promise.all([
      isRedisHealthy(),
      getOllamaClient().isAvailable(),
    ])

    return {
      healthy: redisOk, // Redis is required, Ollama is optional
      components: {
        redis: redisOk,
        ollama: ollamaOk,
      },
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    }
  }

  recordJobComplete(workerId: string, durationMs: number, success: boolean): void {
    const metrics = this.metrics.get(workerId) || {
      workerId,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      averageDurationMs: 0,
      lastJobAt: null,
    }

    metrics.jobsProcessed++
    if (success) {
      metrics.jobsSucceeded++
    } else {
      metrics.jobsFailed++
    }

    // Running average
    metrics.averageDurationMs =
      (metrics.averageDurationMs * (metrics.jobsProcessed - 1) + durationMs) / metrics.jobsProcessed
    metrics.lastJobAt = new Date().toISOString()

    this.metrics.set(workerId, metrics)
  }

  getMetrics(workerId: string): WorkerMetrics | undefined {
    return this.metrics.get(workerId)
  }

  getAllMetrics(): WorkerMetrics[] {
    return Array.from(this.metrics.values())
  }
}

// Singleton
export const healthMonitor = new HealthMonitor()

// Periodic health check (run every 30 seconds)
export function startHealthCheckLoop(intervalMs: number = 30000): NodeJS.Timer {
  return setInterval(async () => {
    const status = await healthMonitor.checkHealth()

    if (!status.healthy) {
      logger.error('Health check failed', status)
    } else if (!status.components.ollama) {
      logger.warn('Ollama unavailable, using cloud fallback')
    } else {
      logger.debug('Health check passed', {
        uptime: Math.round(status.uptime / 1000),
        ollama: status.components.ollama,
      })
    }
  }, intervalMs)
}
```

#### 2.10 Hono API Routes

```typescript
// packages/backend/worker-pool/src/api/routes.ts
import { Hono } from 'hono'
import { createQueue } from '../queue/connection.js'
import { healthMonitor } from '../health/health-check.js'
import { contextStore } from '../memory/context-store.js'
import { affinityStore } from '../memory/affinity-store.js'

const routes = new Hono()

// Submit a job to a queue
routes.post('/jobs/:queue', async c => {
  const queueName = c.req.param('queue')
  const body = await c.req.json()

  try {
    const queue = createQueue(`worker:${queueName}`)
    const job = await queue.add(body.jobId || `job-${Date.now()}`, {
      goal: body.goal,
      description: body.description,
      memory: body.memory || [],
      context: body.context,
    })

    return c.json({ success: true, jobId: job.id })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    )
  }
})

// Get job status
routes.get('/jobs/:queue/:jobId', async c => {
  const { queue: queueName, jobId } = c.req.param()

  try {
    const queue = createQueue(`worker:${queueName}`)
    const job = await queue.getJob(jobId)

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404)
    }

    const state = await job.getState()
    const progress = job.progress

    return c.json({
      success: true,
      jobId: job.id,
      state,
      progress,
      result: job.returnvalue,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    )
  }
})

// Get queue stats
routes.get('/queues/:queue/stats', async c => {
  const queueName = c.req.param('queue')

  try {
    const queue = createQueue(`worker:${queueName}`)
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])

    return c.json({
      success: true,
      queue: queueName,
      counts: { waiting, active, completed, failed },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    )
  }
})

// Memory operations
routes.post('/memory', async c => {
  const body = await c.req.json()

  await contextStore.add({
    projectId: body.projectId,
    taskType: body.taskType,
    goal: body.goal,
    result: body.result,
    timestamp: Date.now(),
    filesTouched: body.filesTouched || [],
  })

  return c.json({ success: true })
})

routes.get('/memory/:projectId', async c => {
  const { projectId } = c.req.param()
  const goal = c.req.query('goal') || ''

  const memory = await contextStore.getRelevant(projectId, goal)

  return c.json({ success: true, memory })
})

// Affinity stats
routes.get('/affinity/:taskType', async c => {
  const { taskType } = c.req.param()

  // Return affinity data for all models for this task type
  const models = ['ollama:qwen2.5-coder:7b', 'ollama:qwen2.5-coder:14b', 'cloud:claude-sonnet']
  const affinity = models
    .map(m => ({
      model: m,
      ...affinityStore.getAffinity(taskType, m),
    }))
    .filter(a => a.sampleCount > 0)

  return c.json({ success: true, affinity })
})

export default routes
```

#### 2.11 Entry Point (Bun)

```typescript
// packages/backend/worker-pool/src/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { logger } from '@repo/logger'
import { createWorkerPool } from './workers/pool.js'
import { healthMonitor, startHealthCheckLoop } from './health/health-check.js'
import routes from './api/routes.js'

const app = new Hono()

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  logger.debug(`${c.req.method} ${c.req.path}`, { duration })
})

// Health endpoint
app.get('/health', async c => {
  const status = await healthMonitor.checkHealth()
  const metrics = healthMonitor.getAllMetrics()

  return c.json({
    ...status,
    metrics,
  })
})

// API routes
app.route('/api', routes)

const PORT = parseInt(process.env.WORKER_PORT || '3001')

// Graceful shutdown
let workerPool: ReturnType<typeof createWorkerPool> | null = null
let healthInterval: ReturnType<typeof setInterval> | null = null

async function shutdown() {
  logger.info('Shutting down worker pool...')

  if (healthInterval) clearInterval(healthInterval)
  if (workerPool) await workerPool.stop()

  logger.info('Worker pool shut down')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Start server
async function main() {
  logger.info('Starting Worker Pool API', { port: PORT })

  // Create and start worker pool
  workerPool = createWorkerPool()
  await workerPool.start()

  // Start health check loop
  healthInterval = startHealthCheckLoop()

  // Start Hono server
  serve({
    fetch: app.fetch,
    port: PORT,
  })

  logger.info('Worker Pool started', {
    port: PORT,
    workers: Object.keys(workerPool.agents).length,
  })
}

main().catch(err => {
  logger.error('Worker Pool failed to start', { error: err.message })
  process.exit(1)
})
```

```typescript
// packages/backend/worker-pool/src/workers/pool.ts
import { BaseAgent, type AgentConfig } from '../agents/base.agent.js'
import { logger } from '@repo/logger'

export interface WorkerPool {
  agents: Record<string, BaseAgent>
  start: () => Promise<void>
  stop: () => Promise<void>
}

export function createWorkerPool(): WorkerPool {
  const agents: Record<string, BaseAgent> = {}

  // Create agents
  const agentConfigs: AgentConfig[] = [
    {
      name: 'code-review',
      queueName: 'worker:code-review',
      tools: ['read_file', 'git_diff', 'exec_command'],
      validationCriteria: 'All code review findings documented',
    },
    {
      name: 'lint',
      queueName: 'worker:lint',
      tools: ['exec_command', 'read_file'],
      validationCriteria: 'No lint errors',
    },
    {
      name: 'qa',
      queueName: 'worker:qa',
      tools: ['exec_command', 'read_file', 'write_file'],
      validationCriteria: 'Tests pass, AC verified',
    },
    {
      name: 'research',
      queueName: 'worker:research',
      tools: ['read_file', 'find_files', 'exec_command'],
      validationCriteria: 'Comprehensive findings documented',
    },
    {
      name: 'coder',
      queueName: 'worker:coder',
      tools: ['read_file', 'write_file', 'exec_command', 'git_status'],
      validationCriteria: 'Code compiles, tests pass',
    },
  ]

  for (const config of agentConfigs) {
    agents[config.name] = new BaseAgent(config)
    logger.info('Agent registered', { name: config.name })
  }

  return {
    agents,

    async start() {
      logger.info('Starting all agents...')
      await Promise.all(Object.values(agents).map(a => a.start()))
      logger.info('All agents started')
    },

    async stop() {
      logger.info('Stopping all agents...')
      await Promise.all(Object.values(agents).map(a => a.stop()))
      logger.info('All agents stopped')
    },
  }
}
```

---

## Installation & Setup

### 1. Mac Mini Setup

```bash
# SSH to Mac Mini
ssh admin@mac-mini.local

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5-coder:14b
ollama pull deepseek-coder:33b

# Install Node.js (if not present)
brew install node@20

# Clone/copy worker-pool package
# (from your repo)
cd packages/backend/worker-pool

# Install dependencies
pnpm install

# Build
pnpm build

# Create environment file
cat > .env << 'EOF'
REDIS_HOST=192.168.1.100  # Mac Studio IP
REDIS_PORT=6379
OLLAMA_URL=http://localhost:11434
NODE_ENV=production
EOF

# Start as background service (launchd or pm2)
npm install -g pm2
pm2 start dist/index.js --name worker-pool
pm2 save
pm2 startup
```

### 2. Mac Studio Firewall

```bash
# On Mac Studio, allow Redis connections from Mac Mini
# System Settings > Firewall > Firewall Options > Add Redis

# Or via command line (if firewall enabled)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --addport=6379
```

### 3. Network Configuration

```bash
# Find Mac Studio IP
ipconfig getifaddr en0

# Update REDIS_HOST in Mac Mini .env with Mac Studio IP
# Example: 192.168.1.100
```

---

## Testing

### Unit Tests

```typescript
// packages/backend/worker-pool/__tests__/router.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ModelRouter } from '../src/ollama/router.js'

describe('ModelRouter', () => {
  it('routes simple tasks to local model', async () => {
    const router = new ModelRouter()
    vi.spyOn(router, 'checkOllamaHealth').mockResolvedValue(true)

    const decision = await router.route({ taskType: 'lint-check' })
    expect(decision.route).toBe('local')
  })

  it('routes complex tasks to cloud', async () => {
    const router = new ModelRouter()
    vi.spyOn(router, 'checkOllamaHealth').mockResolvedValue(true)

    const decision = await router.route({ taskType: 'architecture-review' })
    expect(decision.route).toBe('cloud')
  })
})
```

### Integration Test

```bash
# Start worker pool
pnpm start

# Add a test job from Mac Studio
node -e "
const { createQueue } = require('bullmq')
const queue = createQueue('worker:code-review')
await queue.add('test', {
  jobId: 'test-1',
  jobType: 'code-review',
  files: ['console.log(\"hello\")'],
  storyId: 'TEST-001'
})
console.log('Job added')
process.exit(0)
"
```

---

## Monitoring

### PM2 Dashboard

```bash
pm2 monit
```

### BullMQ Dashboard

Use `@bull-board/express` or similar for job monitoring

### Metrics Endpoint

Add an Express server to expose metrics:

```typescript
// metrics-server.ts
import express from 'express'
import { healthMonitor } from './health/health-check.js'

const app = express()
app.get('/health', (_, res) => res.json(healthMonitor.checkHealth()))
app.get('/metrics', (_, res) => res.json(healthMonitor.getAllMetrics()))
app.listen(9090)
```

---

## Environment Variables

| Variable                  | Default                  | Description                 |
| ------------------------- | ------------------------ | --------------------------- |
| `REDIS_HOST`              | `localhost`              | Mac Studio IP               |
| `REDIS_PORT`              | `6379`                   | Redis port                  |
| `REDIS_PASSWORD`          | -                        | Redis password (if set)     |
| `OLLAMA_URL`              | `http://localhost:11434` | Ollama server URL           |
| `CODE_REVIEW_CONCURRENCY` | `3`                      | Max concurrent code reviews |
| `LINT_CONCURRENCY`        | `5`                      | Max concurrent lint checks  |
| `NODE_ENV`                | `development`            | Environment                 |

---

---

## Integration with Existing LangGraph Orchestrator

The worker pool integrates with your existing orchestrator as an **external job processor**:

### Architecture Integration

```
┌─────────────────────────────────────────────────────────────┐
│            Existing LangGraph Orchestrator                    │
│            (Mac Studio)                                      │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Orchestrator Graph                                  │   │
│   │                                                       │   │
│   │  START → plan → execute → review → complete         │   │
│   │                   │                                  │   │
│   │                   ▼                                  │   │
│   │            [Send to Worker Pool]                    │   │
│   │                   │                                  │   │
│   │                   ▼                                  │   │
│   │   ┌─────────────────────────────────┐               │   │
│   │   │  BullMQ Job (worker:{task})     │               │   │
│   │   └─────────────────────────────────┘               │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Redis
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Worker Pool API (Mac Mini)                      │
│                                                             │
│   POST /api/jobs/{queue}   → Submit job                   │
│   GET  /api/jobs/{queue}/{id} → Poll status               │
│                                                             │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│   │ Code    │  │ QA      │  │ Research│                  │
│   │ Review  │  │ Agent   │  │ Agent   │                  │
│   │ Agent   │  │         │  │         │                  │
│   └─────────┘  └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Example: Integrating Code Review

```typescript
// In your existing orchestrator graph
import { createQueue } from '@repo/worker-pool/queue/connection'

async function submitCodeReview(state: OrchestratorState) {
  const queue = createQueue('worker:code-review')

  const job = await queue.add(`review-${state.storyId}`, {
    goal: `Review code changes for story ${state.storyId}`,
    description: state.description,
    files: state.changedFiles,
    memory: state.relevantContext,
  })

  return { jobId: job.id }
}

async function checkCodeReview(state: OrchestratorState) {
  const queue = createQueue('worker:code-review')
  const job = await queue.getJob(state.reviewJobId)

  if (!job) return { status: 'not_found' }

  const state_ = await job.getState()

  if (state_ === 'completed') {
    return {
      status: 'completed',
      result: job.returnvalue,
    }
  }

  return { status: state_, progress: job.progress }
}
```

---

## Future Enhancements

1. **Auto-scaling**: Add/remove workers based on queue depth
2. **Model Affinity Learning**: Track success rates per (task, model) pair (partially implemented)
3. **Cost Tracking**: Monitor local vs cloud spend
4. **Multiple Mac Minis**: Expand worker pool horizontally
5. **GPU Support**: Add CUDA workers for larger models
6. **Supervisor Agent**: Orchestrate multiple specialist agents
7. **Memory Persistence**: Store memory in Redis for cross-restart persistence
8. **Tool Evolution**: Add more sophisticated tools (web search, API calls)

---

## Troubleshooting

### Ollama not responding

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama
launchctl unload ~/Library/LaunchAgents/com.ollama.ollama.plist
launchctl load ~/Library/LaunchAgents/com.ollama.ollama.plist
```

### Redis connection refused

```bash
# Check Redis on Mac Studio
redis-cli ping

# Allow remote connections (Mac Studio)
# Edit /usr/local/etc/redis.conf:
# bind 0.0.0.0
```

### Workers not processing jobs

```bash
# Check queue
redis-cli LLEN worker:code-review

# Check worker logs
bun src/index.ts  # or pm2 logs
```

### Bun-specific issues

```bash
# Ensure Bun is installed
bun --version

# Install dependencies
bun install

# Type check
bun run tsc --noEmit

# Watch mode for development
bun --watch src/index.ts
```

### Hono API not responding

```bash
# Check if port is in use
lsof -i :3001

# Test health endpoint
curl http://localhost:3001/health

# Check API routes
curl http://localhost:3001/api/queues/code-review/stats
```

### LangGraph agent stuck in loop

```bash
# Check agent state
curl http://localhost:3001/api/jobs/code-review/{jobId}

# The agent may be in self-correction loop
# Check if MAX_ATTEMPTS is being hit
```

### Memory store not working

```bash
# Check memory entries
curl http://localhost:3001/api/memory/{projectId}?goal=feature

# Clear memory if needed
# (Add DELETE endpoint if needed)
```

### Redis connection refused

```bash
# Check Redis on Mac Studio
redis-cli ping

# Allow remote connections (Mac Studio)
# Edit /usr/local/etc/redis.conf:
# bind 0.0.0.0
```

### Workers not processing jobs

```bash
# Check queue
redis-cli LLEN worker:code-review

# Check worker logs
pm2 logs worker-pool
```
