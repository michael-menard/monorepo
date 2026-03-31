/**
 * LLM Adapters Integration Test
 *
 * Tests the LLM adapter with actual Ollama/Qwen calls.
 * Requires Ollama to be running locally with qwen2.5-coder:7b model.
 *
 * Run with: pnpm vitest run src/services/__tests__/llm-adapters.integration.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  createLlmAdapter,
  createQwenAdapter,
  convertToLangChainMessages,
  extractTokenUsage,
} from '../llm-adapters.js'
import { clearModelAssignmentsCache } from '../../config/model-assignments.js'
import { AIMessage } from '@langchain/core/messages'

// Skip if Ollama not available
const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) })
    return response.ok
  } catch {
    return false
  }
}

describe('LLM Adapters', () => {
  // Clear model assignments cache before all tests to ensure fresh YAML load
  beforeAll(() => {
    clearModelAssignmentsCache()
  })
  describe('convertToLangChainMessages', () => {
    it('should convert simple messages to LangChain format', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful.' },
        { role: 'user' as const, content: 'Hello!' },
        { role: 'assistant' as const, content: 'Hi there!' },
      ]

      const langChainMessages = convertToLangChainMessages(messages)

      expect(langChainMessages).toHaveLength(3)
      expect(langChainMessages[0].constructor.name).toBe('SystemMessage')
      expect(langChainMessages[1].constructor.name).toBe('HumanMessage')
      expect(langChainMessages[2].constructor.name).toBe('AIMessage')
    })
  })

  describe('extractTokenUsage', () => {
    it('should extract usage from usage_metadata', () => {
      const aiMessage = new AIMessage({
        content: 'Hello',
        usage_metadata: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
        },
      })

      const usage = extractTokenUsage(aiMessage)

      expect(usage.inputTokens).toBe(100)
      expect(usage.outputTokens).toBe(50)
    })

    it('should return zeros when no usage info', () => {
      const aiMessage = new AIMessage({ content: 'Hello' })

      const usage = extractTokenUsage(aiMessage)

      expect(usage.inputTokens).toBe(0)
      expect(usage.outputTokens).toBe(0)
    })
  })

  describe('createLlmAdapter (integration)', () => {
    let ollamaAvailable = false

    beforeAll(async () => {
      ollamaAvailable = await isOllamaAvailable()
      if (!ollamaAvailable) {
        console.log('⚠️ Ollama not available, skipping integration tests')
      }
    })

    it('should call Qwen and get a response', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const adapter = createQwenAdapter()

      const response = await adapter([
        { role: 'system', content: 'You are a helpful assistant. Respond in exactly one word.' },
        { role: 'user', content: 'Say hello.' },
      ])

      expect(response.content).toBeTruthy()
      expect(typeof response.content).toBe('string')
      expect(response.content.length).toBeGreaterThan(0)
      // Token usage may or may not be available depending on model
      expect(typeof response.inputTokens).toBe('number')
      expect(typeof response.outputTokens).toBe('number')

      console.log('✅ Qwen response:', response.content.trim())
      console.log('   Tokens:', response.inputTokens, 'in /', response.outputTokens, 'out')
    }, 60000) // 60 second timeout for model loading

    it('should handle JSON tool call response', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const adapter = createQwenAdapter()

      const response = await adapter([
        {
          role: 'system',
          content: `You are implementing a user story. Respond ONLY with valid JSON.
Available tools:
- complete: { "tool": "complete", "args": { "filesCreated": [], "filesModified": [], "testsRan": true, "testsPassed": true, "testOutput": "<string>" } }

Call the complete tool with empty arrays and testsPassed: true.`,
        },
        { role: 'user', content: 'Call the complete tool now.' },
      ])

      // Try to parse JSON from response
      const content = response.content.trim()
      console.log('✅ JSON response:', content)

      // Check if it looks like JSON
      const hasJson = content.includes('"tool"') || content.includes('{')
      expect(hasJson).toBe(true)
    }, 60000)

    it('should use explicit model string', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      // Use explicit model string to verify model selection works
      const adapter = createLlmAdapter({ modelString: 'ollama:qwen2.5-coder:7b' })

      const response = await adapter([
        { role: 'system', content: 'Respond with "OK" only.' },
        { role: 'user', content: 'Confirm.' },
      ])

      expect(response.content).toBeTruthy()
      console.log('✅ Explicit model adapter response:', response.content.trim())
    }, 60000)
  })
})
