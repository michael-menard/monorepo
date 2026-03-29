/**
 * constants.ts
 *
 * Shared constants for the model-selector module.
 * Defines MODEL_LEADERBOARD_PATH and REQUIRED_MODELS for the benchmark harness
 * and any future consumers (e.g., model router).
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 *
 * @module model-selector/constants
 */

import * as path from 'path'

// ============================================================================
// Leaderboard Path
// ============================================================================

/**
 * Absolute path to the model leaderboard YAML file.
 *
 * Resolves to: <process.cwd()>/data/model-leaderboard.yaml
 *
 * ARCH-001: Path relative to the orchestrator package output directory.
 * Allows the harness to write next to the package without hardcoding monorepo root.
 * For tests, the path is overridden via argument injection.
 */
export const MODEL_LEADERBOARD_PATH: string = path.join(
  process.cwd(),
  'data',
  'model-leaderboard.yaml',
)

// ============================================================================
// Required Models
// ============================================================================

/**
 * The 5 Ollama models required for the benchmark harness.
 *
 * ARCH-003: Mirrors the REQUIRED_MODELS array from setup-ollama-models.sh.
 * These models are the target of the benchmark and must be installed locally.
 *
 * @see setup-ollama-models.sh
 */
export const REQUIRED_MODELS: readonly string[] = [
  'deepseek-coder-v2:16b',
  'codellama:13b',
  'qwen2.5-coder:14b',
  'qwen2.5-coder:7b',
  'llama3.2:8b',
] as const

// ============================================================================
// Ollama Configuration
// ============================================================================

/**
 * Base URL for the Ollama API.
 *
 * ARCH-002: Direct HTTP fetch to Ollama generate API.
 * Avoids pulling in the full PipelineModelRouter stack for a dev-local benchmark.
 */
export const OLLAMA_BASE_URL: string = 'http://127.0.0.1:11434'

/**
 * Ollama generate endpoint path.
 */
export const OLLAMA_GENERATE_PATH: string = '/api/generate'

/**
 * Default timeout in milliseconds for Ollama inference calls.
 * 5 minutes — large models may be slow on first load.
 */
export const OLLAMA_TIMEOUT_MS: number = 300_000
