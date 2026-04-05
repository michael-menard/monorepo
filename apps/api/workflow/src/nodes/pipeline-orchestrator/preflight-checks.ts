/**
 * preflight_checks Node (pipeline-orchestrator) — DETERMINISTIC
 *
 * Runs once at pipeline start before any story processing.
 * Ensures Ollama is running and the required model is loaded.
 *
 * Idempotent — safe to re-run on resume. Never fails hard;
 * degrades gracefully by setting ollamaAvailable=false so the
 * model router knows to skip the Ollama tier.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas
// ============================================================================

export const PreflightChecksResultSchema = z.object({
  ollamaAvailable: z.boolean(),
  ollamaModel: z.string().nullable(),
  ollamaStarted: z.boolean(),
  modelPulled: z.boolean(),
  cloudAuthVerified: z.boolean().default(false),
})

export type PreflightChecksResult = z.infer<typeof PreflightChecksResultSchema>

export const PreflightChecksConfigSchema = z.object({
  ollamaBaseUrl: z.string().default('http://localhost:11434'),
  requiredModel: z.string().default('qwen2.5-coder:14b'),
  cloudModel: z.string().optional(),
  healthTimeoutMs: z.number().default(30_000),
  pollIntervalMs: z.number().default(1_000),
})

export type PreflightChecksConfig = z.infer<typeof PreflightChecksConfigSchema>

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Checks Ollama health by hitting /api/tags.
 * Returns the list of loaded model names on success, or null on failure.
 */
export type HealthCheckerFn = (baseUrl: string) => Promise<string[] | null>

/**
 * Spawns `ollama serve` as a detached background process.
 */
export type ProcessSpawnerFn = () => void

/**
 * Pulls a model via `ollama pull <model>`. Resolves when complete.
 */
export type ModelPullerFn = (model: string) => Promise<void>

/**
 * Sleep helper for polling. Injectable for test speed.
 */
export type SleepFn = (ms: number) => Promise<void>

/**
 * Verifies cloud model auth by making a trivial API call.
 * Returns true if auth succeeds, false if rejected.
 */
export type CloudAuthCheckerFn = (baseUrl: string, cloudModel: string) => Promise<boolean>

export type PreflightAdapters = {
  healthChecker?: HealthCheckerFn
  processSpawner?: ProcessSpawnerFn
  modelPuller?: ModelPullerFn
  sleep?: SleepFn
  cloudAuthChecker?: CloudAuthCheckerFn
}

// ============================================================================
// Default Adapter Implementations
// ============================================================================

export const defaultHealthChecker: HealthCheckerFn = async baseUrl => {
  const res = await fetch(`${baseUrl}/api/tags`)
  if (!res.ok) return null
  const body = (await res.json()) as { models?: Array<{ name?: string }> }
  const names = (body.models ?? []).map(m => m.name ?? '').filter(Boolean)
  return names
}

export const defaultProcessSpawner: ProcessSpawnerFn = () => {
  // Dynamic import to avoid bundling child_process in non-Node environments
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawn } = require('child_process') as typeof import('child_process')
  const child = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

export const defaultModelPuller: ModelPullerFn = async model => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execFile } = require('child_process') as typeof import('child_process')
  return new Promise<void>((resolve, reject) => {
    execFile('ollama', ['pull', model], (err: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

const defaultSleep: SleepFn = ms => new Promise(resolve => setTimeout(resolve, ms))

export const defaultCloudAuthChecker: CloudAuthCheckerFn = async (baseUrl, cloudModel) => {
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cloudModel,
        messages: [{ role: 'user', content: 'respond with ok' }],
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('preflight_checks: cloud auth check failed', {
        status: res.status,
        body: body.slice(0, 200),
      })
      return false
    }
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn('preflight_checks: cloud auth check error', { error: msg })
    return false
  }
}

// ============================================================================
// Pure Logic
// ============================================================================

/**
 * Checks whether the required model is present in the model list.
 * Matches both exact name and name with tag prefix (e.g. "qwen2.5-coder:14b"
 * matches "qwen2.5-coder:14b" or "qwen2.5-coder:14b-fp16").
 */
export function isModelAvailable(models: string[], requiredModel: string): boolean {
  return models.some(m => m === requiredModel || m.startsWith(`${requiredModel}-`))
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the preflight_checks LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Checks Ollama health, starts it if needed,
 * pulls the required model if missing.
 */
export function createPreflightChecksNode(
  config: Partial<PreflightChecksConfig> = {},
  adapters: PreflightAdapters = {},
) {
  const resolved = PreflightChecksConfigSchema.parse(config)
  const healthChecker = adapters.healthChecker ?? defaultHealthChecker
  const processSpawner = adapters.processSpawner ?? defaultProcessSpawner
  const modelPuller = adapters.modelPuller ?? defaultModelPuller
  const sleep = adapters.sleep ?? defaultSleep
  const cloudAuthChecker = adapters.cloudAuthChecker ?? defaultCloudAuthChecker

  return async (): Promise<PreflightChecksResult> => {
    logger.info('preflight_checks: starting Ollama health check', {
      baseUrl: resolved.ollamaBaseUrl,
      requiredModel: resolved.requiredModel,
    })

    let ollamaStarted = false
    let modelPulled = false

    // --- Step 1: Try to reach Ollama ---
    let models: string[] | null = null
    try {
      models = await healthChecker(resolved.ollamaBaseUrl)
    } catch (_err) {
      // Connection refused or network error — will attempt to start
      logger.info('preflight_checks: Ollama not reachable, attempting to start')
    }

    // --- Step 2: If unreachable, spawn and poll ---
    if (models === null) {
      try {
        processSpawner()
        ollamaStarted = true
        logger.info('preflight_checks: spawned ollama serve, polling for health')
      } catch (spawnErr) {
        const msg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr)
        logger.warn('preflight_checks: failed to spawn ollama serve', { error: msg })
        return {
          ollamaAvailable: false,
          ollamaModel: null,
          ollamaStarted: false,
          modelPulled: false,
        }
      }

      const deadline = Date.now() + resolved.healthTimeoutMs
      while (Date.now() < deadline) {
        await sleep(resolved.pollIntervalMs)
        try {
          models = await healthChecker(resolved.ollamaBaseUrl)
          if (models !== null) {
            logger.info('preflight_checks: Ollama came up after spawn')
            break
          }
        } catch (_pollErr) {
          // Still not up, keep polling
        }
      }

      if (models === null) {
        logger.warn('preflight_checks: Ollama did not come up within timeout', {
          timeoutMs: resolved.healthTimeoutMs,
        })
        return {
          ollamaAvailable: false,
          ollamaModel: null,
          ollamaStarted,
          modelPulled: false,
        }
      }
    }

    // --- Step 3: Check if the required model is available ---
    if (!isModelAvailable(models, resolved.requiredModel)) {
      logger.info('preflight_checks: model not found, pulling', {
        model: resolved.requiredModel,
      })
      try {
        await modelPuller(resolved.requiredModel)
        modelPulled = true
        logger.info('preflight_checks: model pull complete', {
          model: resolved.requiredModel,
        })
      } catch (pullErr) {
        const msg = pullErr instanceof Error ? pullErr.message : String(pullErr)
        logger.warn('preflight_checks: model pull failed', {
          error: msg,
          model: resolved.requiredModel,
        })
        return {
          ollamaAvailable: true,
          ollamaModel: null,
          ollamaStarted,
          modelPulled: false,
        }
      }
    }

    // --- Step 4: Verify cloud model authentication (if configured) ---
    let cloudAuthVerified = false
    if (resolved.cloudModel) {
      logger.info('preflight_checks: verifying cloud model auth', {
        cloudModel: resolved.cloudModel,
      })
      cloudAuthVerified = await cloudAuthChecker(resolved.ollamaBaseUrl, resolved.cloudModel)
      if (!cloudAuthVerified) {
        logger.error(
          'preflight_checks: cloud model auth failed — run "ollama signin" to authenticate',
          {
            cloudModel: resolved.cloudModel,
          },
        )
      } else {
        logger.info('preflight_checks: cloud model auth verified', {
          cloudModel: resolved.cloudModel,
        })
      }
    }

    logger.info('preflight_checks: complete', {
      ollamaAvailable: true,
      ollamaModel: resolved.requiredModel,
      ollamaStarted,
      modelPulled,
      cloudAuthVerified,
    })

    return {
      ollamaAvailable: true,
      ollamaModel: resolved.requiredModel,
      ollamaStarted,
      modelPulled,
      cloudAuthVerified,
    }
  }
}
