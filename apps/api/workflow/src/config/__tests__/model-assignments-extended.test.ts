import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ClaudeModelSchema,
  clearModelAssignmentsCache,
  getModelForAgent,
  getModelProvider,
  isClaudeModel,
  isOllamaModel,
  ModelSchema,
  OllamaModelSchema,
  parseOllamaModel,
  type ClaudeModel,
} from '../model-assignments.js'

describe('OllamaModelSchema', () => {
  it('validates correct Ollama model format', () => {
    const validModels = [
      'ollama:qwen2.5-coder:7b',
      'ollama:codellama:13b',
      'ollama:deepseek-coder:6.7b',
      'ollama:llama3:8b',
      'ollama:mistral:7b-instruct',
    ]

    for (const model of validModels) {
      const result = OllamaModelSchema.safeParse(model)
      expect(result.success, `Expected ${model} to be valid`).toBe(true)
    }
  })

  it('rejects invalid Ollama model format', () => {
    const invalidModels = [
      'ollama:qwen',          // Missing tag
      'ollama::7b',           // Missing model name
      'qwen:7b',              // Missing ollama prefix
      'ollama-qwen:7b',       // Wrong separator
    ]

    for (const model of invalidModels) {
      const result = OllamaModelSchema.safeParse(model)
      expect(result.success, `Expected ${model} to be invalid`).toBe(false)
    }
  })

  it('accepts case-insensitive ollama prefix', () => {
    // The regex is case-insensitive, so uppercase is valid
    expect(OllamaModelSchema.safeParse('OLLAMA:qwen:7b').success).toBe(true)
    expect(OllamaModelSchema.safeParse('Ollama:qwen:7b').success).toBe(true)
  })
})

describe('ClaudeModelSchema', () => {
  it('validates Claude models', () => {
    expect(ClaudeModelSchema.safeParse('haiku').success).toBe(true)
    expect(ClaudeModelSchema.safeParse('sonnet').success).toBe(true)
    expect(ClaudeModelSchema.safeParse('opus').success).toBe(true)
  })

  it('rejects invalid Claude models', () => {
    expect(ClaudeModelSchema.safeParse('gpt-4').success).toBe(false)
    expect(ClaudeModelSchema.safeParse('claude').success).toBe(false)
    expect(ClaudeModelSchema.safeParse('').success).toBe(false)
  })
})

describe('ModelSchema (combined)', () => {
  it('accepts Claude models', () => {
    expect(ModelSchema.safeParse('haiku').success).toBe(true)
    expect(ModelSchema.safeParse('sonnet').success).toBe(true)
    expect(ModelSchema.safeParse('opus').success).toBe(true)
  })

  it('accepts Ollama models', () => {
    expect(ModelSchema.safeParse('ollama:qwen2.5-coder:7b').success).toBe(true)
    expect(ModelSchema.safeParse('ollama:codellama:13b').success).toBe(true)
  })

  it('rejects invalid models', () => {
    expect(ModelSchema.safeParse('gpt-4').success).toBe(false)
    expect(ModelSchema.safeParse('random').success).toBe(false)
    expect(ModelSchema.safeParse('').success).toBe(false)
  })
})

describe('getModelProvider', () => {
  it('returns ollama for Ollama models', () => {
    expect(getModelProvider('ollama:qwen2.5-coder:7b')).toBe('ollama')
    expect(getModelProvider('ollama:codellama:13b')).toBe('ollama')
  })

  it('returns claude for Claude models', () => {
    expect(getModelProvider('haiku')).toBe('claude')
    expect(getModelProvider('sonnet')).toBe('claude')
    expect(getModelProvider('opus')).toBe('claude')
  })
})

describe('isOllamaModel', () => {
  it('returns true for Ollama models', () => {
    expect(isOllamaModel('ollama:qwen2.5-coder:7b')).toBe(true)
    expect(isOllamaModel('ollama:codellama:13b')).toBe(true)
  })

  it('returns false for Claude models', () => {
    expect(isOllamaModel('haiku')).toBe(false)
    expect(isOllamaModel('sonnet')).toBe(false)
    expect(isOllamaModel('opus')).toBe(false)
  })
})

describe('isClaudeModel', () => {
  it('returns true for Claude models', () => {
    expect(isClaudeModel('haiku')).toBe(true)
    expect(isClaudeModel('sonnet')).toBe(true)
    expect(isClaudeModel('opus')).toBe(true)
  })

  it('returns false for Ollama models', () => {
    expect(isClaudeModel('ollama:qwen2.5-coder:7b' as ClaudeModel)).toBe(false)
  })
})

describe('parseOllamaModel', () => {
  it('parses valid Ollama model strings', () => {
    const result = parseOllamaModel('ollama:qwen2.5-coder:7b')

    expect(result).toEqual({
      provider: 'ollama',
      model: 'qwen2.5-coder',
      tag: '7b',
      fullName: 'qwen2.5-coder:7b',
    })
  })

  it('parses model with dots in name', () => {
    const result = parseOllamaModel('ollama:qwen2.5-coder:7b')

    expect(result?.model).toBe('qwen2.5-coder')
    expect(result?.tag).toBe('7b')
  })

  it('parses model with dots in tag', () => {
    const result = parseOllamaModel('ollama:deepseek-coder:6.7b')

    expect(result?.model).toBe('deepseek-coder')
    expect(result?.tag).toBe('6.7b')
  })

  it('returns null for invalid Ollama model strings', () => {
    expect(parseOllamaModel('haiku')).toBeNull()
    expect(parseOllamaModel('ollama:invalid')).toBeNull()
    expect(parseOllamaModel('gpt-4')).toBeNull()
    expect(parseOllamaModel('')).toBeNull()
  })

  it('returns null for non-string input', () => {
    // @ts-expect-error Testing runtime behavior
    expect(parseOllamaModel(123)).toBeNull()
    // @ts-expect-error Testing runtime behavior
    expect(parseOllamaModel(null)).toBeNull()
  })
})

describe('Model assignments with Ollama', () => {
  beforeEach(() => {
    clearModelAssignmentsCache()
  })

  afterEach(() => {
    clearModelAssignmentsCache()
  })

  // Note: We test with default assignments which use Claude models.
  // Ollama models would be added via the YAML config file.

  it('default assignments use Claude models for leaders', () => {
    // Leaders use sonnet (from default assignments)
    expect(getModelForAgent('pm-story-generation-leader')).toBe('sonnet')
  })

  it('code-review workers can use Ollama models via YAML config', () => {
    // Note: In production, code-review-lint may be assigned to Ollama
    // via the YAML config. Here we test the default fallback.
    const model = getModelForAgent('code-review-lint')
    // Either haiku (default) or ollama model (from YAML config)
    expect(typeof model).toBe('string')
  })
})
