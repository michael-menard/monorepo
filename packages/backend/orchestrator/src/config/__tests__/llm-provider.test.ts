import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  clearLLMProviderConfigCache,
  clearOllamaAvailabilityCache,
  clearOllamaLLMCache,
  createOllamaLLM,
  getLLMForAgent,
  getModelInfoForAgent,
  isOllamaAvailable,
  loadLLMProviderConfig,
} from '../llm-provider.js'
import { clearModelAssignmentsCache } from '../model-assignments.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock @langchain/ollama
vi.mock('@langchain/ollama', () => ({
  ChatOllama: vi.fn().mockImplementation(config => ({
    model: config.model,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    invoke: vi.fn().mockResolvedValue({ content: '{}' }),
  })),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('LLM Provider Config', () => {
  beforeEach(() => {
    clearLLMProviderConfigCache()
    // Clear environment variables
    delete process.env.OLLAMA_BASE_URL
    delete process.env.OLLAMA_TEMPERATURE
    delete process.env.OLLAMA_TIMEOUT_MS
    delete process.env.OLLAMA_ENABLE_FALLBACK
    delete process.env.OLLAMA_FALLBACK_MODEL
  })

  afterEach(() => {
    clearLLMProviderConfigCache()
  })

  it('loads default configuration', () => {
    const config = loadLLMProviderConfig()

    expect(config.baseUrl).toBe('http://127.0.0.1:11434')
    expect(config.temperature).toBe(0)
    expect(config.timeoutMs).toBe(60000)
    expect(config.enableFallback).toBe(true)
    expect(config.fallbackModel).toBe('haiku')
  })

  it('loads configuration from environment variables', () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:8080'
    process.env.OLLAMA_TEMPERATURE = '0.7'
    process.env.OLLAMA_TIMEOUT_MS = '30000'
    process.env.OLLAMA_ENABLE_FALLBACK = 'false'
    process.env.OLLAMA_FALLBACK_MODEL = 'sonnet'

    const config = loadLLMProviderConfig()

    expect(config.baseUrl).toBe('http://localhost:8080')
    expect(config.temperature).toBe(0.7)
    expect(config.timeoutMs).toBe(30000)
    expect(config.enableFallback).toBe(false)
    expect(config.fallbackModel).toBe('sonnet')
  })

  it('caches configuration', () => {
    const config1 = loadLLMProviderConfig()

    // Change env vars
    process.env.OLLAMA_BASE_URL = 'http://different:9999'

    const config2 = loadLLMProviderConfig()

    // Should return cached config
    expect(config2.baseUrl).toBe(config1.baseUrl)
  })
})

describe('Ollama Availability Check', () => {
  beforeEach(() => {
    clearOllamaAvailabilityCache()
    clearLLMProviderConfigCache()
    // Clear env vars that might affect config
    delete process.env.OLLAMA_BASE_URL
    delete process.env.OLLAMA_TEMPERATURE
    delete process.env.OLLAMA_TIMEOUT_MS
    delete process.env.OLLAMA_ENABLE_FALLBACK
    delete process.env.OLLAMA_FALLBACK_MODEL
    mockFetch.mockReset()
  })

  afterEach(() => {
    clearOllamaAvailabilityCache()
    clearLLMProviderConfigCache()
  })

  it('returns true when Ollama is available', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const available = await isOllamaAvailable()

    expect(available).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:11434/api/tags', expect.any(Object))
  })

  it('returns false when Ollama returns non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const available = await isOllamaAvailable()

    expect(available).toBe(false)
  })

  it('returns false when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const available = await isOllamaAvailable()

    expect(available).toBe(false)
  })

  it('caches availability result', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await isOllamaAvailable()
    await isOllamaAvailable()

    // Should only call fetch once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('force check bypasses cache', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await isOllamaAvailable()
    await isOllamaAvailable(true) // Force check

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('createOllamaLLM', () => {
  beforeEach(() => {
    clearOllamaLLMCache()
    clearLLMProviderConfigCache()
  })

  afterEach(() => {
    clearOllamaLLMCache()
  })

  it('creates ChatOllama instance', () => {
    const llm = createOllamaLLM({
      provider: 'ollama',
      model: 'qwen2.5-coder',
      tag: '7b',
      fullName: 'qwen2.5-coder:7b',
    })

    expect(llm).toBeDefined()
    expect(llm.model).toBe('qwen2.5-coder:7b')
  })

  it('caches LLM instances', () => {
    const parsedModel = {
      provider: 'ollama' as const,
      model: 'qwen2.5-coder',
      tag: '7b',
      fullName: 'qwen2.5-coder:7b',
    }

    const llm1 = createOllamaLLM(parsedModel)
    const llm2 = createOllamaLLM(parsedModel)

    expect(llm1).toBe(llm2)
  })

  it('creates different instances for different models', () => {
    const llm1 = createOllamaLLM({
      provider: 'ollama',
      model: 'qwen2.5-coder',
      tag: '7b',
      fullName: 'qwen2.5-coder:7b',
    })

    const llm2 = createOllamaLLM({
      provider: 'ollama',
      model: 'codellama',
      tag: '13b',
      fullName: 'codellama:13b',
    })

    expect(llm1).not.toBe(llm2)
  })
})

describe('getLLMForAgent', () => {
  beforeEach(() => {
    clearOllamaAvailabilityCache()
    clearOllamaLLMCache()
    clearLLMProviderConfigCache()
    clearModelAssignmentsCache()
    mockFetch.mockReset()
  })

  afterEach(() => {
    clearOllamaAvailabilityCache()
    clearOllamaLLMCache()
    clearModelAssignmentsCache()
  })

  it('returns Claude model info for Claude agents', async () => {
    // Default assignments use Claude models
    const result = await getLLMForAgent('pm-story-generation-leader')

    expect(result.provider).toBe('claude')
    expect(result.model).toBe('sonnet')
    expect(result.llm).toBeNull()
  })

  it('returns Ollama LLM when available', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await getLLMForAgent('test-agent', {
      modelOverride: 'ollama:qwen2.5-coder:7b',
      skipAvailabilityCheck: false,
    })

    expect(result.provider).toBe('ollama')
    expect(result.llm).toBeDefined()
    if (result.provider === 'ollama') {
      expect(result.model.fullName).toBe('qwen2.5-coder:7b')
    }
  })

  it('falls back to Claude when Ollama unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const result = await getLLMForAgent('test-agent', {
      modelOverride: 'ollama:qwen2.5-coder:7b',
    })

    expect(result.provider).toBe('claude')
    expect(result.model).toBe('haiku') // Default fallback
    expect(result.llm).toBeNull()
  })

  it('throws when Ollama unavailable and fallback disabled', async () => {
    process.env.OLLAMA_ENABLE_FALLBACK = 'false'
    clearLLMProviderConfigCache()
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    await expect(
      getLLMForAgent('test-agent', {
        modelOverride: 'ollama:qwen2.5-coder:7b',
      }),
    ).rejects.toThrow('Ollama is not available and fallback is disabled')
  })

  it('skips availability check when specified', async () => {
    const result = await getLLMForAgent('test-agent', {
      modelOverride: 'ollama:qwen2.5-coder:7b',
      skipAvailabilityCheck: true,
    })

    expect(result.provider).toBe('ollama')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('getModelInfoForAgent', () => {
  beforeEach(() => {
    clearModelAssignmentsCache()
  })

  afterEach(() => {
    clearModelAssignmentsCache()
  })

  it('returns Claude model info for Claude agents', () => {
    const info = getModelInfoForAgent('pm-story-generation-leader')

    expect(info.model).toBe('sonnet')
    expect(info.provider).toBe('claude')
    expect(info.parsedOllama).toBeNull()
  })

  it('returns fallback for unknown agents', () => {
    const info = getModelInfoForAgent('unknown-agent')

    expect(info.model).toBe('sonnet') // Default fallback
    expect(info.provider).toBe('claude')
  })
})
