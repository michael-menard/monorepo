/**
 * benchmark-corpus.test.ts
 *
 * Unit tests for benchmark-corpus.ts.
 * Verifies the corpus structure: >= 3 tasks per category, all 4 categories present.
 *
 * AC-1: benchmark-corpus.test.ts covers corpus structure validation.
 * AC-8: Corpus structure tests.
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 */

import { describe, it, expect } from 'vitest'
import { BENCHMARK_CORPUS } from '../benchmark-corpus.js'

// ============================================================================
// Corpus Structure Tests
// ============================================================================

describe('BENCHMARK_CORPUS', () => {
  it('should export a non-empty corpus array', () => {
    expect(BENCHMARK_CORPUS).toBeDefined()
    expect(Array.isArray(BENCHMARK_CORPUS)).toBe(true)
    expect(BENCHMARK_CORPUS.length).toBeGreaterThan(0)
  })

  it('should have at least 12 tasks total (3 per category x 4 categories)', () => {
    // AC-1: >= 3 tasks per category x 4 categories = 12 minimum
    expect(BENCHMARK_CORPUS.length).toBeGreaterThanOrEqual(12)
  })

  it('should have all 4 required categories present', () => {
    const categories = new Set(BENCHMARK_CORPUS.map(t => t.category))
    // AC-1: All 4 categories must be present
    expect(categories.has('code_generation')).toBe(true)
    expect(categories.has('code_review')).toBe(true)
    expect(categories.has('elaboration_analysis')).toBe(true)
    expect(categories.has('lint_syntax')).toBe(true)
  })

  it('should have at least 3 code_generation tasks', () => {
    // AC-1: >= 3 prompts per category
    const count = BENCHMARK_CORPUS.filter(t => t.category === 'code_generation').length
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('should have at least 3 code_review tasks', () => {
    const count = BENCHMARK_CORPUS.filter(t => t.category === 'code_review').length
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('should have at least 3 elaboration_analysis tasks', () => {
    const count = BENCHMARK_CORPUS.filter(t => t.category === 'elaboration_analysis').length
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('should have at least 3 lint_syntax tasks', () => {
    const count = BENCHMARK_CORPUS.filter(t => t.category === 'lint_syntax').length
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('should have unique task IDs', () => {
    const ids = BENCHMARK_CORPUS.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have non-empty prompts for all tasks', () => {
    for (const task of BENCHMARK_CORPUS) {
      expect(task.prompt.length).toBeGreaterThan(10)
    }
  })

  it('should have non-empty IDs for all tasks', () => {
    for (const task of BENCHMARK_CORPUS) {
      expect(task.id.length).toBeGreaterThan(0)
    }
  })

  it('should have task IDs following the naming convention {category}_{NNN}', () => {
    const validPattern = /^(code_generation|code_review|elaboration_analysis|lint_syntax)_\d{3}$/
    for (const task of BENCHMARK_CORPUS) {
      expect(task.id).toMatch(validPattern)
    }
  })

  it('should have valid categories for all tasks', () => {
    const validCategories = new Set([
      'code_generation',
      'code_review',
      'elaboration_analysis',
      'lint_syntax',
    ])
    for (const task of BENCHMARK_CORPUS) {
      expect(validCategories.has(task.category)).toBe(true)
    }
  })

  it('should have expectedKeywords arrays (possibly empty)', () => {
    for (const task of BENCHMARK_CORPUS) {
      // expectedKeywords defaults to [] — it should always be present
      expect(Array.isArray(task.expectedKeywords)).toBe(true)
    }
  })
})

// ============================================================================
// Category-specific structure tests
// ============================================================================

describe('BENCHMARK_CORPUS code_generation tasks', () => {
  const tasks = BENCHMARK_CORPUS.filter(t => t.category === 'code_generation')

  it('should include a Zod schema generation task', () => {
    const hasZodTask = tasks.some(t => t.id === 'code_generation_001')
    expect(hasZodTask).toBe(true)
  })

  it('should include prompts referencing TypeScript', () => {
    const hasTypeScript = tasks.some(t =>
      t.prompt.toLowerCase().includes('typescript'),
    )
    expect(hasTypeScript).toBe(true)
  })
})

describe('BENCHMARK_CORPUS code_review tasks', () => {
  const tasks = BENCHMARK_CORPUS.filter(t => t.category === 'code_review')

  it('should include code snippets in prompts (markdown code blocks)', () => {
    const hasCodeBlock = tasks.some(t => t.prompt.includes('```'))
    expect(hasCodeBlock).toBe(true)
  })
})

describe('BENCHMARK_CORPUS lint_syntax tasks', () => {
  const tasks = BENCHMARK_CORPUS.filter(t => t.category === 'lint_syntax')

  it('should include a Zod conversion task', () => {
    const hasZodConversion = tasks.some(t => t.id === 'lint_syntax_003')
    expect(hasZodConversion).toBe(true)
  })

  it('should include prompts mentioning ESLint or TypeScript', () => {
    const hasLintContext = tasks.some(t =>
      t.prompt.toLowerCase().includes('eslint') ||
      t.prompt.toLowerCase().includes('typescript'),
    )
    expect(hasLintContext).toBe(true)
  })
})
