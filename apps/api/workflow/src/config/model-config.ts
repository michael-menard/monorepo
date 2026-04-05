/**
 * Canonical Model Configuration
 *
 * Single source of truth for which model handles each pipeline stage.
 * Every other file reads from here — no model strings hardcoded elsewhere.
 *
 * To change a model, edit THIS FILE ONLY.
 */

import { z } from 'zod'

export const ModelConfigSchema = z.object({
  // Per-stage model assignments
  // Format: 'ollama:<model>' for local/cloud, 'claude-code/<model>' for Claude -p
  planRefinement: z.string().default('claude-code/opus'),
  storyGeneration: z.string().default('claude-code/sonnet'),
  devExecutor: z.string().default('ollama:qwen3-coder-next:cloud'),
  devPlanner: z.string().default('ollama:qwen3-coder-next:cloud'),
  reviewAgent: z.string().default('ollama:minimax-m2.7:cloud'),
  qaVerifier: z.string().default('ollama:deepseek-v3.2:cloud'),

  // Preflight
  requiredLocalModel: z.string().default('qwen3-embedding:latest'),
  cloudModelToVerify: z.string().default('minimax-m2.7:cloud'),

  // Escalation chain for dev executor (ORCH-9050)
  // When the executor gets stuck, retry with next model in chain
  devEscalationChain: z
    .array(z.string())
    .default(['ollama:deepseek-v3.2:cloud', 'claude-code/sonnet']),

  // Legacy compat
  primaryModel: z.string().default('sonnet'),
  ollamaModel: z.string().default('qwen2.5-coder:14b'),
})

export type ModelConfig = z.infer<typeof ModelConfigSchema>

/** Default model config — use this everywhere instead of hardcoding strings */
export const DEFAULT_MODEL_CONFIG: ModelConfig = ModelConfigSchema.parse({})
