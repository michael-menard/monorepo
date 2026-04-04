/**
 * Claude Code Provider
 *
 * Invokes `claude -p` as a subprocess so workflow nodes can use the full
 * Claude Code session (existing auth, MCP servers, tools) without requiring
 * a separate ANTHROPIC_API_KEY.
 *
 * Usage:
 *   const provider = new ClaudeCodeProvider()
 *   const response = await provider.invoke('Your prompt here')
 */

import { spawn } from 'node:child_process'
import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Types
// ============================================================================

export type ClaudeCodeResponse = {
  content: string
  inputTokens: number
  outputTokens: number
}

// ============================================================================
// JSON output schema from `claude -p --output-format json`
// ============================================================================

const ClaudeJsonOutputSchema = z.object({
  type: z.string(),
  subtype: z.string().optional(),
  is_error: z.boolean().optional(),
  result: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
})

// ============================================================================
// Config
// ============================================================================

export type ClaudeCodeProviderConfig = {
  /** Path to claude binary. Defaults to 'claude' (resolved via PATH). */
  claudeBin?: string
  /** Path to MCP config JSON. Defaults to ~/.claude.json */
  mcpConfig?: string
  /** Model to use (e.g. 'sonnet', 'haiku', 'opus'). Defaults to 'sonnet'. */
  model?: string
  /** Timeout in milliseconds. Defaults to 300000 (5 minutes). */
  timeoutMs?: number
  /**
   * When true, passes --dangerously-skip-permissions so Claude can write files,
   * run commands, etc. Only enable for the executor node where real writes are needed.
   */
  allowDangerousPermissions?: boolean
  /**
   * Working directory for the claude subprocess. Defaults to process.cwd().
   * Set this to the target repo/worktree root so Claude's file tools resolve
   * paths relative to the correct location.
   */
  cwd?: string
}

// ============================================================================
// Provider
// ============================================================================

export class ClaudeCodeProvider {
  private readonly claudeBin: string
  private readonly mcpConfig: string
  private readonly model: string
  private readonly timeoutMs: number
  private readonly allowDangerousPermissions: boolean
  private readonly cwd: string | undefined

  constructor(config: ClaudeCodeProviderConfig = {}) {
    this.claudeBin = config.claudeBin ?? 'claude'
    this.mcpConfig =
      config.mcpConfig ?? `${process.env.HOME ?? '/Users/michaelmenard'}/.claude.json`
    this.model = config.model ?? 'sonnet'
    this.timeoutMs = config.timeoutMs ?? 300_000
    this.allowDangerousPermissions = config.allowDangerousPermissions ?? false
    this.cwd = config.cwd
  }

  /**
   * Invokes `claude -p -` with the prompt via stdin and returns the response.
   * Using stdin avoids shell argument length limits for large prompts.
   */
  async invoke(prompt: string): Promise<ClaudeCodeResponse> {
    const startTime = Date.now()

    const args = [
      '-p',
      '-',
      '--output-format',
      'json',
      '--model',
      this.model,
      // No --mcp-config: workflow nodes manage their own tool loop via the ReAct pattern.
      // Giving claude MCP access causes it to use real tools instead of returning JSON.
      ...(this.allowDangerousPermissions ? ['--dangerously-skip-permissions'] : []),
    ]

    logger.debug('ClaudeCodeProvider: invoking claude -p (stdin)', {
      model: this.model,
      promptLength: prompt.length,
    })

    return new Promise((resolve, reject) => {
      // Pass full env but strip ANTHROPIC_API_KEY so claude uses its own
      // session credentials rather than a potentially exhausted API key.
      const { ANTHROPIC_API_KEY: _stripped, ...childEnv } = process.env
      const child = spawn(this.claudeBin, args, {
        timeout: this.timeoutMs,
        env: childEnv as NodeJS.ProcessEnv,
        ...(this.cwd ? { cwd: this.cwd } : {}),
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.on('error', err => {
        reject(new Error(`ClaudeCodeProvider: spawn failed: ${err.message}`))
      })

      child.on('close', code => {
        const durationMs = Date.now() - startTime

        if (stderr) {
          logger.debug('ClaudeCodeProvider: stderr output', { stderr: stderr.slice(0, 500) })
        }

        if (code !== 0) {
          reject(
            new Error(
              `ClaudeCodeProvider: process exited with code ${code}: ${stderr.slice(0, 500)}`,
            ),
          )
          return
        }

        try {
          const parsed = ClaudeJsonOutputSchema.safeParse(JSON.parse(stdout))
          if (!parsed.success) {
            reject(
              new Error(`ClaudeCodeProvider: unexpected output format: ${stdout.slice(0, 200)}`),
            )
            return
          }

          if (parsed.data.is_error) {
            reject(
              new Error(
                `ClaudeCodeProvider: claude returned error: ${parsed.data.result ?? 'unknown'}`,
              ),
            )
            return
          }

          const content = parsed.data.result ?? ''
          const inputTokens = parsed.data.usage?.input_tokens ?? 0
          const outputTokens = parsed.data.usage?.output_tokens ?? 0

          logger.debug('ClaudeCodeProvider: complete', {
            durationMs,
            inputTokens,
            outputTokens,
            contentLength: content.length,
          })

          resolve({ content, inputTokens, outputTokens })
        } catch (err) {
          reject(
            new Error(
              `ClaudeCodeProvider: failed to parse output: ${err instanceof Error ? err.message : String(err)}`,
            ),
          )
        }
      })

      // Write prompt to stdin and close
      child.stdin.write(prompt, 'utf8')
      child.stdin.end()
    })
  }
}

// ============================================================================
// Singleton factory (lazy, one instance per model)
// ============================================================================

const instances = new Map<string, ClaudeCodeProvider>()

export function getClaudeCodeProvider(config: ClaudeCodeProviderConfig = {}): ClaudeCodeProvider {
  const key = `${config.model ?? 'sonnet'}:${config.mcpConfig ?? 'default'}`
  if (!instances.has(key)) {
    instances.set(key, new ClaudeCodeProvider(config))
  }
  return instances.get(key)!
}
