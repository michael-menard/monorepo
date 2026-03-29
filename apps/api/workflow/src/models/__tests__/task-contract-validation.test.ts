/**
 * task-contract-validation.test.ts
 *
 * Unit tests for task contract validation.
 * Tests schema validation, defaults, and edge cases.
 */

import { describe, it, expect } from 'vitest'
import {
  TaskContractSchema,
  createTaskContract,
  type TaskContract,
} from '../__types__/task-contract.js'

describe('TaskContractSchema', () => {
  describe('valid contracts', () => {
    it('should parse a valid contract with all fields', () => {
      const contract = TaskContractSchema.parse({
        taskType: 'code_generation',
        complexity: 'high',
        qualityRequirement: 'critical',
        budgetTokens: 5000,
        requiresReasoning: true,
        securitySensitive: true,
        allowOllama: false,
      })

      expect(contract.taskType).toBe('code_generation')
      expect(contract.complexity).toBe('high')
      expect(contract.qualityRequirement).toBe('critical')
      expect(contract.budgetTokens).toBe(5000)
      expect(contract.requiresReasoning).toBe(true)
      expect(contract.securitySensitive).toBe(true)
      expect(contract.allowOllama).toBe(false)
    })

    it('should parse a valid contract without optional budgetTokens', () => {
      const contract = TaskContractSchema.parse({
        taskType: 'gap_analysis',
        complexity: 'medium',
        qualityRequirement: 'good',
        requiresReasoning: false,
        securitySensitive: false,
        allowOllama: true,
      })

      expect(contract.taskType).toBe('gap_analysis')
      expect(contract.budgetTokens).toBeUndefined()
    })

    it('should accept all complexity values', () => {
      const low = TaskContractSchema.parse({
        taskType: 'lint',
        complexity: 'low',
        qualityRequirement: 'adequate',
        requiresReasoning: false,
        securitySensitive: false,
        allowOllama: true,
      })
      expect(low.complexity).toBe('low')

      const medium = TaskContractSchema.parse({
        taskType: 'code_generation',
        complexity: 'medium',
        qualityRequirement: 'good',
        requiresReasoning: false,
        securitySensitive: false,
        allowOllama: true,
      })
      expect(medium.complexity).toBe('medium')

      const high = TaskContractSchema.parse({
        taskType: 'security_analysis',
        complexity: 'high',
        qualityRequirement: 'high',
        requiresReasoning: true,
        securitySensitive: true,
        allowOllama: false,
      })
      expect(high.complexity).toBe('high')
    })

    it('should accept all quality requirement values', () => {
      const adequate = TaskContractSchema.parse({
        taskType: 'lint',
        complexity: 'low',
        qualityRequirement: 'adequate',
        requiresReasoning: false,
        securitySensitive: false,
        allowOllama: true,
      })
      expect(adequate.qualityRequirement).toBe('adequate')

      const good = TaskContractSchema.parse({
        taskType: 'code_generation',
        complexity: 'medium',
        qualityRequirement: 'good',
        requiresReasoning: false,
        securitySensitive: false,
        allowOllama: true,
      })
      expect(good.qualityRequirement).toBe('good')

      const high = TaskContractSchema.parse({
        taskType: 'gap_analysis',
        complexity: 'medium',
        qualityRequirement: 'high',
        requiresReasoning: true,
        securitySensitive: false,
        allowOllama: true,
      })
      expect(high.qualityRequirement).toBe('high')

      const critical = TaskContractSchema.parse({
        taskType: 'security_analysis',
        complexity: 'high',
        qualityRequirement: 'critical',
        requiresReasoning: true,
        securitySensitive: true,
        allowOllama: false,
      })
      expect(critical.qualityRequirement).toBe('critical')
    })
  })

  describe('invalid contracts', () => {
    it('should reject contract without taskType', () => {
      expect(() =>
        TaskContractSchema.parse({
          complexity: 'medium',
          qualityRequirement: 'good',
          requiresReasoning: false,
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })

    it('should reject contract with empty taskType', () => {
      expect(() =>
        TaskContractSchema.parse({
          taskType: '',
          complexity: 'medium',
          qualityRequirement: 'good',
          requiresReasoning: false,
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })

    it('should reject contract with invalid complexity', () => {
      expect(() =>
        TaskContractSchema.parse({
          taskType: 'code_generation',
          complexity: 'invalid',
          qualityRequirement: 'good',
          requiresReasoning: false,
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })

    it('should reject contract with invalid quality requirement', () => {
      expect(() =>
        TaskContractSchema.parse({
          taskType: 'code_generation',
          complexity: 'medium',
          qualityRequirement: 'invalid',
          requiresReasoning: false,
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })

    it('should reject contract with negative budgetTokens', () => {
      expect(() =>
        TaskContractSchema.parse({
          taskType: 'code_generation',
          complexity: 'medium',
          qualityRequirement: 'good',
          budgetTokens: -100,
          requiresReasoning: false,
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })

    it('should reject contract with zero budgetTokens', () => {
      expect(() =>
        TaskContractSchema.parse({
          taskType: 'code_generation',
          complexity: 'medium',
          qualityRequirement: 'good',
          budgetTokens: 0,
          requiresReasoning: false,
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })

    it('should reject contract with non-boolean requiresReasoning', () => {
      expect(() =>
        TaskContractSchema.parse({
          taskType: 'code_generation',
          complexity: 'medium',
          qualityRequirement: 'good',
          requiresReasoning: 'yes',
          securitySensitive: false,
          allowOllama: true,
        }),
      ).toThrow()
    })
  })
})

describe('createTaskContract', () => {
  describe('defaults', () => {
    it('should apply all defaults when only taskType provided', () => {
      const contract = createTaskContract({ taskType: 'code_generation' })

      expect(contract.taskType).toBe('code_generation')
      expect(contract.complexity).toBe('medium')
      expect(contract.qualityRequirement).toBe('good')
      expect(contract.budgetTokens).toBeUndefined()
      expect(contract.requiresReasoning).toBe(false)
      expect(contract.securitySensitive).toBe(false)
      expect(contract.allowOllama).toBe(true)
    })

    it('should preserve complexity default when other fields overridden', () => {
      const contract = createTaskContract({
        taskType: 'security_analysis',
        securitySensitive: true,
      })

      expect(contract.taskType).toBe('security_analysis')
      expect(contract.complexity).toBe('medium') // Default
      expect(contract.securitySensitive).toBe(true) // Overridden
    })

    it('should preserve quality default when other fields overridden', () => {
      const contract = createTaskContract({
        taskType: 'code_generation',
        complexity: 'low',
      })

      expect(contract.qualityRequirement).toBe('good') // Default
      expect(contract.complexity).toBe('low') // Overridden
    })
  })

  describe('partial overrides', () => {
    it('should override complexity while preserving other defaults', () => {
      const contract = createTaskContract({
        taskType: 'gap_analysis',
        complexity: 'high',
      })

      expect(contract.complexity).toBe('high')
      expect(contract.qualityRequirement).toBe('good') // Default
      expect(contract.requiresReasoning).toBe(false) // Default
    })

    it('should override multiple fields while preserving remaining defaults', () => {
      const contract = createTaskContract({
        taskType: 'security_analysis',
        securitySensitive: true,
        allowOllama: false,
      })

      expect(contract.securitySensitive).toBe(true)
      expect(contract.allowOllama).toBe(false)
      expect(contract.complexity).toBe('medium') // Default
      expect(contract.qualityRequirement).toBe('good') // Default
    })

    it('should override all fields when provided', () => {
      const contract = createTaskContract({
        taskType: 'code_generation',
        complexity: 'high',
        qualityRequirement: 'critical',
        budgetTokens: 10000,
        requiresReasoning: true,
        securitySensitive: true,
        allowOllama: false,
      })

      expect(contract.complexity).toBe('high')
      expect(contract.qualityRequirement).toBe('critical')
      expect(contract.budgetTokens).toBe(10000)
      expect(contract.requiresReasoning).toBe(true)
      expect(contract.securitySensitive).toBe(true)
      expect(contract.allowOllama).toBe(false)
    })
  })

  describe('validation', () => {
    it('should throw error when taskType missing', () => {
      expect(() =>
        createTaskContract({
          complexity: 'medium',
        } as any),
      ).toThrow()
    })

    it('should throw error when taskType empty', () => {
      expect(() =>
        createTaskContract({
          taskType: '',
        }),
      ).toThrow()
    })

    it('should throw error when invalid complexity provided', () => {
      expect(() =>
        createTaskContract({
          taskType: 'code_generation',
          complexity: 'invalid' as any,
        }),
      ).toThrow()
    })

    it('should throw error when invalid quality requirement provided', () => {
      expect(() =>
        createTaskContract({
          taskType: 'code_generation',
          qualityRequirement: 'invalid' as any,
        }),
      ).toThrow()
    })

    it('should throw error when budgetTokens is negative', () => {
      expect(() =>
        createTaskContract({
          taskType: 'code_generation',
          budgetTokens: -1000,
        }),
      ).toThrow()
    })
  })
})
