/**
 * task-selector.test.ts
 *
 * Integration tests for task-based model selector.
 * Tests tier selection matrix, escalation logic, fallback validation, and backward compatibility.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  selectModelForTask,
  getTierForTaskType,
  validateFallbackChain,
} from '../task-selector.js'
import { createTaskContract } from '../__types__/task-contract.js'
import { loadStrategy } from '../strategy-loader.js'

describe('selectModelForTask', () => {
  beforeAll(async () => {
    // Ensure strategy is loaded before tests
    await loadStrategy()
  })

  describe('simple tasks', () => {
    it('should select Tier 3 for low complexity, adequate quality', async () => {
      const contract = createTaskContract({
        taskType: 'setup_validation',
        complexity: 'low',
        qualityRequirement: 'adequate',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(3)
      expect(selection.provider).toMatch(/ollama|anthropic/)
    })

    it('should select Tier 3 for lint and syntax tasks', async () => {
      const contract = createTaskContract({
        taskType: 'lint_and_syntax',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(3)
    })

    it('should select Tier 3 for completion reporting', async () => {
      const contract = createTaskContract({
        taskType: 'completion_reporting',
        complexity: 'low',
        qualityRequirement: 'adequate',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(3)
    })
  })

  describe('complex tasks', () => {
    it('should select Tier 1 for gap analysis with default settings', async () => {
      const contract = createTaskContract({
        taskType: 'gap_analysis',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(1)
      expect(selection.model).toMatch(/sonnet|haiku/)
    })

    it('should select Tier 1 for attack analysis', async () => {
      const contract = createTaskContract({
        taskType: 'attack_analysis',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(1)
    })

    it('should escalate to Tier 0 for high complexity gap analysis', async () => {
      const contract = createTaskContract({
        taskType: 'gap_analysis',
        complexity: 'high',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(0)
      expect(selection.model).toMatch(/opus|sonnet/)
    })
  })

  describe('critical tasks', () => {
    it('should select Tier 0 for critical quality requirement', async () => {
      const contract = createTaskContract({
        taskType: 'simple_code_generation',
        qualityRequirement: 'critical',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(0)
      expect(selection.model).toMatch(/opus/)
    })

    it('should select Tier 0 for security-sensitive tasks', async () => {
      const contract = createTaskContract({
        taskType: 'security_review',
        securitySensitive: true,
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBeLessThanOrEqual(1)
    })

    it('should select Tier 0 for epic planning', async () => {
      const contract = createTaskContract({
        taskType: 'epic_planning',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(0)
    })

    it('should select Tier 0 for commitment gates', async () => {
      const contract = createTaskContract({
        taskType: 'commitment_gate',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(0)
    })
  })

  describe('escalation rules', () => {
    it('should escalate for high complexity', async () => {
      const baseContract = createTaskContract({
        taskType: 'simple_code_generation', // Tier 2 default
        complexity: 'medium',
      })
      const highComplexityContract = createTaskContract({
        taskType: 'simple_code_generation',
        complexity: 'high',
      })

      const baseSelection = await selectModelForTask(baseContract)
      const escalatedSelection = await selectModelForTask(highComplexityContract)

      expect(escalatedSelection.tier).toBeLessThan(baseSelection.tier)
    })

    it('should escalate for high quality requirement', async () => {
      const goodContract = createTaskContract({
        taskType: 'simple_code_generation',
        qualityRequirement: 'good',
      })
      const highContract = createTaskContract({
        taskType: 'simple_code_generation',
        qualityRequirement: 'high',
      })

      const goodSelection = await selectModelForTask(goodContract)
      const highSelection = await selectModelForTask(highContract)

      expect(highSelection.tier).toBeLessThanOrEqual(goodSelection.tier)
    })

    it('should force Tier 0 for critical quality', async () => {
      const contract = createTaskContract({
        taskType: 'simple_code_generation', // Tier 2 default
        qualityRequirement: 'critical',
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBe(0)
    })

    it('should escalate security-sensitive tasks to Tier 0/1', async () => {
      const contract = createTaskContract({
        taskType: 'simple_code_generation', // Tier 2 default
        securitySensitive: true,
      })

      const selection = await selectModelForTask(contract)

      expect(selection.tier).toBeLessThanOrEqual(1)
    })
  })

  describe('de-escalation rules', () => {
    it('should de-escalate for budget constraints when quality permits', async () => {
      const contract = createTaskContract({
        taskType: 'gap_analysis', // Tier 1 default
        complexity: 'medium',
        qualityRequirement: 'good', // Permits de-escalation
        budgetTokens: 1000, // Low budget
      })

      const selection = await selectModelForTask(contract)

      // Should de-escalate from Tier 1 to Tier 2 due to budget
      expect(selection.tier).toBeGreaterThanOrEqual(1)
    })

    it('should NOT de-escalate for budget if quality is high', async () => {
      const contract = createTaskContract({
        taskType: 'gap_analysis', // Tier 1 default
        qualityRequirement: 'high',
        budgetTokens: 500, // Very low budget
      })

      const selection = await selectModelForTask(contract)

      // Should stay at Tier 1 or escalate due to high quality
      expect(selection.tier).toBeLessThanOrEqual(1)
    })

    it('should NOT de-escalate for budget if quality is critical', async () => {
      const contract = createTaskContract({
        taskType: 'simple_code_generation',
        qualityRequirement: 'critical',
        budgetTokens: 100, // Extremely low budget
      })

      const selection = await selectModelForTask(contract)

      // Should stay at Tier 0 despite budget constraint
      expect(selection.tier).toBe(0)
    })
  })

  describe('Ollama filtering', () => {
    it('should include Ollama in fallback chain when allowOllama=true', async () => {
      const contract = createTaskContract({
        taskType: 'simple_code_generation',
        allowOllama: true,
      })

      const selection = await selectModelForTask(contract)

      // Should include Ollama models in chain
      expect(selection.tier).toBe(2) // Default tier for simple_code_generation
    })

    it('should exclude Ollama from fallback chain when allowOllama=false', async () => {
      const contract = createTaskContract({
        taskType: 'simple_code_generation',
        allowOllama: false,
      })

      const selection = await selectModelForTask(contract)

      // Fallback chain should not include Ollama
      const hasOllama = selection.fallbackChain.some(model =>
        model.toLowerCase().includes('ollama'),
      )
      expect(hasOllama).toBe(false)
    })

    it('should work for security-sensitive tasks with no Ollama', async () => {
      const contract = createTaskContract({
        taskType: 'security_review',
        securitySensitive: true,
        allowOllama: false,
      })

      const selection = await selectModelForTask(contract)

      // Should use Tier 0/1 (Anthropic only)
      expect(selection.tier).toBeLessThanOrEqual(1)
      expect(selection.provider).toBe('anthropic')

      // Fallback chain should not include Ollama
      const hasOllama = selection.fallbackChain.some(model =>
        model.toLowerCase().includes('ollama'),
      )
      expect(hasOllama).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should throw error for unknown task type', async () => {
      const contract = createTaskContract({
        taskType: 'unknown_task_type',
      })

      await expect(selectModelForTask(contract)).rejects.toThrow(
        'not found in strategy',
      )
    })

    it('should throw error with available task types in message', async () => {
      const contract = createTaskContract({
        taskType: 'invalid_type',
      })

      await expect(selectModelForTask(contract)).rejects.toThrow(
        'Available types:',
      )
    })
  })

  describe('tier selection matrix', () => {
    it('should select appropriate tier for task type matrix', async () => {
      const testCases = [
        { taskType: 'setup_validation', expectedTier: 3 },
        { taskType: 'completion_reporting', expectedTier: 3 },
        { taskType: 'lint_and_syntax', expectedTier: 3 },
        { taskType: 'simple_code_generation', expectedTier: 2 },
        { taskType: 'gap_analysis', expectedTier: 1 },
        { taskType: 'attack_analysis', expectedTier: 1 },
        { taskType: 'synthesis', expectedTier: 1 },
        { taskType: 'security_review', expectedTier: 1 },
        { taskType: 'complex_code_generation', expectedTier: 1 },
        { taskType: 'implementation_planning', expectedTier: 1 },
        { taskType: 'readiness_scoring', expectedTier: 1 },
        { taskType: 'triage', expectedTier: 1 },
        { taskType: 'epic_planning', expectedTier: 0 },
        { taskType: 'commitment_gate', expectedTier: 0 },
      ]

      for (const testCase of testCases) {
        const contract = createTaskContract({
          taskType: testCase.taskType,
        })

        const selection = await selectModelForTask(contract)

        expect(selection.tier).toBe(testCase.expectedTier)
      }
    })
  })
})

describe('getTierForTaskType', () => {
  it('should return correct tier for known task types', async () => {
    expect(await getTierForTaskType('setup_validation')).toBe(3)
    expect(await getTierForTaskType('gap_analysis')).toBe(1)
    expect(await getTierForTaskType('epic_planning')).toBe(0)
  })

  it('should throw error for unknown task type', async () => {
    await expect(getTierForTaskType('unknown_task')).rejects.toThrow(
      'not found in strategy',
    )
  })

  it('should include available task types in error message', async () => {
    await expect(getTierForTaskType('invalid')).rejects.toThrow(
      'Available types:',
    )
  })
})

describe('validateFallbackChain', () => {
  it('should return true when Ollama allowed and fallbacks exist', () => {
    const tierSelection = {
      tier: 2,
      model: 'ollama/deepseek-coder-v2:16b',
      provider: 'ollama',
      cost_per_1m_tokens: 0.0,
      fallbackChain: ['anthropic/claude-haiku-3.5'],
    }

    const valid = validateFallbackChain(tierSelection, true)
    expect(valid).toBe(true)
  })

  it('should return true when Ollama prohibited and non-Ollama fallbacks exist', () => {
    const tierSelection = {
      tier: 1,
      model: 'anthropic/claude-sonnet-4.5',
      provider: 'anthropic',
      cost_per_1m_tokens: 3.0,
      fallbackChain: ['anthropic/claude-haiku-3.5'],
    }

    const valid = validateFallbackChain(tierSelection, false)
    expect(valid).toBe(true)
  })

  it('should return false when Ollama primary and no non-Ollama fallbacks', () => {
    const tierSelection = {
      tier: 2,
      model: 'ollama/deepseek-coder-v2:16b',
      provider: 'ollama',
      cost_per_1m_tokens: 0.0,
      fallbackChain: ['ollama/codellama:13b', 'ollama/qwen2.5-coder:14b'],
    }

    const valid = validateFallbackChain(tierSelection, false)
    expect(valid).toBe(false)
  })

  it('should return true when primary is Anthropic regardless of Ollama setting', () => {
    const tierSelection = {
      tier: 0,
      model: 'anthropic/claude-opus-4.6',
      provider: 'anthropic',
      cost_per_1m_tokens: 15.0,
      fallbackChain: ['anthropic/claude-sonnet-4.5'],
    }

    expect(validateFallbackChain(tierSelection, true)).toBe(true)
    expect(validateFallbackChain(tierSelection, false)).toBe(true)
  })
})
