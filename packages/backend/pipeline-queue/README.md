# @repo/pipeline-queue

BullMQ-based work queue for the Autonomous Pipeline (APIP) project.

## Overview

This package provides the shared queue infrastructure used by pipeline orchestrators and workers.
It exports a factory for creating a dedicated Redis connection and a factory for creating the
pipeline queue with validated job payloads.

## Queue Contract

| Item            | Value                                               |
| --------------- | --------------------------------------------------- |
| Queue name      | `apip-pipeline` (exported as `PIPELINE_QUEUE_NAME`) |
| Backing store   | Redis / AWS ElastiCache                             |
| BullMQ version  | v5+                                                 |
| ioredis version | v5+                                                 |

**`PIPELINE_QUEUE_NAME = 'apip-pipeline'` is a stable contract.** Once workers begin
consuming from this queue (APIP-0020+), the queue name must not change.

## Payload Schema

All jobs on the pipeline queue must conform to `PipelineJobDataSchema`, a **discriminated union**
on the `stage` field. Each variant shares a common set of required fields and may specialize the
`payload` type.

### Common fields (all stages)

| Field                 | Type                     | Description                                                     |
| --------------------- | ------------------------ | --------------------------------------------------------------- |
| `storyId`             | `string` (min 1)         | Required. Story identifier, e.g. `"APIP-0010"`                  |
| `stage`               | `string` literal         | Required. Discriminant field — determines which variant is used |
| `attemptNumber`       | `number` (int, min 1)    | Required. Tracks retry count for escalation logic               |
| `payload`             | object                   | Required. Stage-specific context (see per-stage types below)    |
| `priority`            | `number` (int, optional) | Optional. Lower = higher BullMQ priority                        |
| `touchedPathPrefixes` | `string[]`               | Optional. Paths modified by this job (defaults to `[]`)         |

### Stage variants

```typescript
import { PipelineJobDataSchema } from '@repo/pipeline-queue'

// Discriminated union — stage field selects the variant
const PipelineJobDataSchema = z.discriminatedUnion('stage', [
  ElaborationJobDataSchema, // stage: 'elaboration'
  StoryCreationJobDataSchema, // stage: 'story-creation'
  ImplementationJobDataSchema, // stage: 'implementation'
  ReviewJobDataSchema, // stage: 'review'
  QaJobDataSchema, // stage: 'qa'
])
```

#### Elaboration / Story-creation jobs

`payload` is `z.record(z.unknown())` — a free-form object for stage-specific context.

```typescript
import type { ElaborationJobData } from '@repo/pipeline-queue'

const job: ElaborationJobData = {
  storyId: 'APIP-0010',
  stage: 'elaboration',
  attemptNumber: 1,
  payload: { iteration: 0 },
  touchedPathPrefixes: [],
}
```

#### Implementation jobs

`payload` is `StorySnapshotPayloadSchema` — a structured story snapshot:

```typescript
import type { ImplementationJobData } from '@repo/pipeline-queue'

const job: ImplementationJobData = {
  storyId: 'APIP-0010',
  stage: 'implementation',
  attemptNumber: 1,
  payload: {
    storyId: 'APIP-0010',
    title: 'BullMQ Work Queue Setup',
    description: 'Setup BullMQ pipeline queue',
    feature: 'apip',
    state: 'in_progress',
  },
  priority: 5,
  touchedPathPrefixes: ['packages/backend/pipeline-queue'],
}
```

#### Review jobs

`payload` is `ReviewPayloadSchema` — extends `StorySnapshotPayloadSchema` with optional worktree context:

| Field          | Type                       | Description                                          |
| -------------- | -------------------------- | ---------------------------------------------------- |
| `storyId`      | `string` (min 1)           | Required. Story identifier                           |
| `title`        | `string` (min 1)           | Required. Story title                                |
| `description`  | `string` (default '')      | Optional. Story description                          |
| `feature`      | `string` (default '')      | Optional. Feature prefix                             |
| `state`        | `string` (default 'ready') | Optional. Story state                                |
| `worktreePath` | `string` (optional)        | Optional. Absolute path to worktree for review graph |
| `featureDir`   | `string` (optional)        | Optional. Feature directory path for review graph    |

```typescript
import type { ReviewJobData } from '@repo/pipeline-queue'

const job: ReviewJobData = {
  storyId: 'PIPE-2020',
  stage: 'review',
  attemptNumber: 1,
  payload: {
    storyId: 'PIPE-2020',
    title: 'Dispatch Router',
    worktreePath: '/tmp/worktrees/PIPE-2020',
    featureDir: 'plans/future/platform/pipeline-orchestrator-activation',
  },
}
```

`worktreePath` and `featureDir` are required by the review graph worker (`ReviewWorkerInputSchema`)
but optional at the BullMQ boundary because the scheduler may enqueue before a worktree is allocated.
The dispatch router defaults to `''` / `'plans/future/platform'` if absent.

#### QA jobs

`payload` is `QaPayloadSchema` — identical to `StorySnapshotPayloadSchema`. `RunQAVerifyFn` only
needs `storyId` + `attempt` from job-level fields; the payload carries story context for
logging/reporting.

```typescript
import type { QaJobData } from '@repo/pipeline-queue'

const job: QaJobData = {
  storyId: 'PIPE-2030',
  stage: 'qa',
  attemptNumber: 1,
  payload: {
    storyId: 'PIPE-2030',
    title: 'Completion Callbacks',
  },
}
```

**Decision (PIPE-2010 AC-9):** `SynthesizedStoryPayloadSchema` and `StoryRequestPayloadSchema` in
`apps/api/pipeline/src/supervisor/__types__/index.ts` are **retained as local documentation**. They
document the expected shapes for `elaboration` and `story-creation` payloads respectively. They are
NOT moved to `@repo/pipeline-queue` because those stages intentionally use `z.record(z.unknown())`
in the canonical schema until ORCH stories formalize the graph input contracts.

Zod validation is applied at **enqueue time** inside `createPipelineQueue().add()`. Invalid
payloads throw a `ZodError` before the job reaches Redis — the queue never stores malformed data.

## Connection Model

BullMQ requires **two separate IORedis connections per Queue instance** (one for commands,
one for blocking operations). Use `createPipelineConnection` to create a fresh connection for
each Queue or Worker — do not share connections between them.

```typescript
import {
  createPipelineConnection,
  createPipelineQueue,
  PIPELINE_QUEUE_NAME,
} from '@repo/pipeline-queue'

// Producer setup
const queueConnection = createPipelineConnection(process.env.REDIS_URL!)
const pipelineQueue = createPipelineQueue(queueConnection)

// Enqueue an elaboration job
await pipelineQueue.add('run-elaboration', {
  storyId: 'APIP-0010',
  stage: 'elaboration',
  attemptNumber: 1,
  payload: { iteration: 0 },
})

// Enqueue an implementation job (requires story snapshot payload)
await pipelineQueue.add('run-implementation', {
  storyId: 'APIP-0010',
  stage: 'implementation',
  attemptNumber: 1,
  payload: {
    storyId: 'APIP-0010',
    title: 'BullMQ Work Queue Setup',
  },
  touchedPathPrefixes: ['packages/backend'],
})

// Worker setup (separate connection)
import { Worker } from 'bullmq'
const workerConnection = createPipelineConnection(process.env.REDIS_URL!)
const worker = new Worker(
  PIPELINE_QUEUE_NAME,
  async job => {
    /* ... */
  },
  { connection: workerConnection },
)
```

### Connection Configuration

`createPipelineConnection` creates an IORedis instance with:

- **`enableOfflineQueue: false`** — commands fail immediately if Redis is unavailable (no memory
  accumulation during outages)
- **`maxRetriesPerRequest: null`** — required by BullMQ v5+; disables per-request retry cap
- **No `lazyConnect`** — connection is established eagerly on factory call
- **No singleton** — callers own the connection lifecycle

## Persistence: Append-Only File (AOF) Note

For production deployments, Redis **must** be configured with AOF persistence enabled to prevent
job loss during crashes or restarts.

- **AWS ElastiCache**: Select an AOF-enabled tier (Valkey/Redis with AOF). Cluster mode is
  supported by BullMQ v5+.
- **Self-hosted Redis**: Add `appendonly yes` and `appendfsync everysec` to `redis.conf`.

Without AOF, any Redis restart will drop all pending and delayed pipeline jobs.

## Default Job Options

| Option          | Value           |
| --------------- | --------------- |
| `attempts`      | 3               |
| `backoff.type`  | `'exponential'` |
| `backoff.delay` | `1000` ms       |

## Bull Board Setup

[Bull Board](https://github.com/felixmosh/bull-board) provides a web UI for monitoring
the pipeline queue. Mount it in your Express/Lambda adapter:

```typescript
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { createPipelineConnection, createPipelineQueue } from '@repo/pipeline-queue'
import { Queue } from 'bullmq'

const monitorConnection = createPipelineConnection(process.env.REDIS_URL!)
const rawQueue = new Queue('apip-pipeline', { connection: monitorConnection })

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')

createBullBoard({
  queues: [new BullMQAdapter(rawQueue)],
  serverAdapter,
})

// Mount on your Express app:
app.use('/admin/queues', serverAdapter.getRouter())
```

Note: Bull Board is **not bundled** in this package — install `@bull-board/api` and
`@bull-board/express` (or `@bull-board/hono` etc.) separately in the consuming app.

## Development

```bash
pnpm build               # Compile TypeScript → dist/
pnpm check-types         # Type check only (no emit)
pnpm test                # Unit tests (no Redis required)

# Integration tests (requires Redis):
REDIS_URL=redis://localhost:6379 pnpm test
```

Start a local Redis instance for integration testing:

```bash
docker run -d -p 6379:6379 redis:7-alpine
```
