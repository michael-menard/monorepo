# @repo/pipeline-queue

BullMQ-based work queue for the Autonomous Pipeline (APIP) project.

## Overview

This package provides the shared queue infrastructure used by pipeline orchestrators and workers.
It exports a factory for creating a dedicated Redis connection and a factory for creating the
pipeline queue with validated job payloads.

## Queue Contract

| Item | Value |
|------|-------|
| Queue name | `apip-pipeline` (exported as `PIPELINE_QUEUE_NAME`) |
| Backing store | Redis / AWS ElastiCache |
| BullMQ version | v5+ |
| ioredis version | v5+ |

**`PIPELINE_QUEUE_NAME = 'apip-pipeline'` is a stable contract.** Once workers begin
consuming from this queue (APIP-0020+), the queue name must not change.

## Payload Schema

All jobs on the pipeline queue must conform to `PipelineJobDataSchema`:

```typescript
import { PipelineJobDataSchema } from '@repo/pipeline-queue'

// Schema definition (Zod):
const PipelineJobDataSchema = z.object({
  storyId: z.string().min(1),      // Required. Story identifier, e.g. "APIP-0010"
  phase:   z.enum([                 // Required. Pipeline phase to execute
    'elaboration',
    'implementation',
    'review',
    'qa',
    'merge',
  ]),
  priority: z.number().int().optional(),        // Optional. Lower = higher BullMQ priority
  metadata: z.record(z.unknown()).optional(),   // Optional. Phase-specific context
})
```

Zod validation is applied at **enqueue time** inside `createPipelineQueue().add()`. Invalid
payloads throw a `ZodError` before the job reaches Redis — the queue never stores malformed data.

## Connection Model

BullMQ requires **two separate IORedis connections per Queue instance** (one for commands,
one for blocking operations). Use `createPipelineConnection` to create a fresh connection for
each Queue or Worker — do not share connections between them.

```typescript
import { createPipelineConnection, createPipelineQueue, PIPELINE_QUEUE_NAME } from '@repo/pipeline-queue'

// Producer setup
const queueConnection = createPipelineConnection(process.env.REDIS_URL!)
const pipelineQueue = createPipelineQueue(queueConnection)

// Enqueue a job
await pipelineQueue.add('run-elaboration', {
  storyId: 'APIP-0010',
  phase: 'elaboration',
  metadata: { iteration: 0 },
})

// Worker setup (separate connection)
import { Worker } from 'bullmq'
const workerConnection = createPipelineConnection(process.env.REDIS_URL!)
const worker = new Worker(PIPELINE_QUEUE_NAME, async job => { /* ... */ }, { connection: workerConnection })
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

| Option | Value |
|--------|-------|
| `attempts` | 3 |
| `backoff.type` | `'exponential'` |
| `backoff.delay` | `1000` ms |

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
