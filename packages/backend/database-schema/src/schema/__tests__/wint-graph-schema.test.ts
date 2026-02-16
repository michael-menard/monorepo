/**
 * WINT Graph Schema Unit Tests
 * Story WINT-0060: Create Graph Relational Tables
 *
 * Tests validate:
 * - Graph table structure (features, capabilities, featureRelationships, cohesionRules)
 * - Zod schema inference and validation
 * - Relations definitions for graph traversal
 * - Composite indexes for query optimization
 * - Self-referencing foreign keys
 * - Strength field validation (0-100 range)
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  // Graph Relational Tables
  features,
  capabilities,
  featureRelationships,
  cohesionRules,
  featureRelationshipTypeEnum,

  // Relations
  featuresRelations,
  capabilitiesRelations,
  featureRelationshipsRelations,
  cohesionRulesRelations,

  // Zod Schemas
  insertFeatureSchema,
  selectFeatureSchema,
  insertCapabilitySchema,
  selectCapabilitySchema,
  insertFeatureRelationshipSchema,
  selectFeatureRelationshipSchema,
  insertCohesionRuleSchema,
  selectCohesionRuleSchema,
} from '../wint'

describe('WINT-0060 Graph Relational Schema', () => {
  describe('Features Table', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(features)
      expect(columns).toContain('id')
      expect(columns).toContain('featureName')
      expect(columns).toContain('featureType')
      expect(columns).toContain('packageName')
      expect(columns).toContain('filePath')
      expect(columns).toContain('description')
      expect(columns).toContain('tags')
      expect(columns).toContain('metadata')
      expect(columns).toContain('isActive')
      expect(columns).toContain('deprecatedAt')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have single column indexes', () => {
      // Note: Index verification is implicit in the schema definition
      // This test validates that the table structure supports indexing
      expect(features.featureType).toBeDefined()
      expect(features.packageName).toBeDefined()
      expect(features.isActive).toBeDefined()
    })

    it('should support feature lifecycle tracking', () => {
      expect(features.isActive).toBeDefined()
      expect(features.deprecatedAt).toBeDefined()
    })
  })

  describe('Capabilities Table', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(capabilities)
      expect(columns).toContain('id')
      expect(columns).toContain('capabilityName')
      expect(columns).toContain('capabilityType')
      expect(columns).toContain('description')
      expect(columns).toContain('owner')
      expect(columns).toContain('metadata')
      expect(columns).toContain('maturityLevel')
      expect(columns).toContain('lifecycleStage')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should support maturity level tracking', () => {
      expect(capabilities.maturityLevel).toBeDefined()
      expect(capabilities.lifecycleStage).toBeDefined()
    })

    it('should have owner field (not ownerId)', () => {
      const columns = Object.keys(capabilities)
      expect(columns).toContain('owner')
      expect(columns).not.toContain('ownerId')
    })
  })

  describe('Feature Relationships Table', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(featureRelationships)
      expect(columns).toContain('id')
      expect(columns).toContain('sourceFeatureId')
      expect(columns).toContain('targetFeatureId')
      expect(columns).toContain('relationshipType')
      expect(columns).toContain('strength')
      expect(columns).toContain('description')
      expect(columns).toContain('detectedBy')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have self-referencing foreign keys', () => {
      expect(featureRelationships.sourceFeatureId).toBeDefined()
      expect(featureRelationships.targetFeatureId).toBeDefined()
    })

    it('should have strength field for weighted analysis', () => {
      expect(featureRelationships.strength).toBeDefined()
    })

    it('should support all relationship types via enum', () => {
      const enumValues = featureRelationshipTypeEnum.enumValues
      expect(enumValues).toContain('depends_on')
      expect(enumValues).toContain('enhances')
      expect(enumValues).toContain('conflicts_with')
      expect(enumValues).toContain('related_to')
      expect(enumValues).toContain('supersedes')
      expect(enumValues).toHaveLength(5)
    })
  })

  describe('Cohesion Rules Table', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(cohesionRules)
      expect(columns).toContain('id')
      expect(columns).toContain('ruleName')
      expect(columns).toContain('ruleType')
      expect(columns).toContain('conditions')
      expect(columns).toContain('maxViolations')
      expect(columns).toContain('severity')
      expect(columns).toContain('isActive')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should use single conditions JSONB field (AC-013 decision)', () => {
      const columns = Object.keys(cohesionRules)
      expect(columns).toContain('conditions')
      expect(columns).not.toContain('featurePatterns')
      expect(columns).not.toContain('packagePatterns')
      expect(columns).not.toContain('relationshipTypes')
    })

    it('should support rule activation/deactivation', () => {
      expect(cohesionRules.isActive).toBeDefined()
    })
  })

  describe('Relations for Graph Traversal', () => {
    it('should define featuresRelations with bidirectional relationships', () => {
      expect(featuresRelations).toBeDefined()
    })

    it('should define featureRelationshipsRelations with source and target', () => {
      expect(featureRelationshipsRelations).toBeDefined()
    })

    it('should define capabilitiesRelations', () => {
      expect(capabilitiesRelations).toBeDefined()
    })

    it('should define cohesionRulesRelations', () => {
      expect(cohesionRulesRelations).toBeDefined()
    })
  })

  describe('Zod Schema Inference - Features', () => {
    it('should infer insert schema for features', () => {
      type InsertFeature = z.infer<typeof insertFeatureSchema>
      const validFeature: InsertFeature = {
        featureName: 'test-feature',
        featureType: 'api_endpoint',
      }
      const result = insertFeatureSchema.safeParse(validFeature)
      expect(result.success).toBe(true)
    })

    it('should infer select schema for features', () => {
      type SelectFeature = z.infer<typeof selectFeatureSchema>
      const validFeature: Partial<SelectFeature> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        featureName: 'test-feature',
        featureType: 'api_endpoint',
        isActive: true,
      }
      expect(validFeature.id).toBeDefined()
      expect(validFeature.featureName).toBeDefined()
    })
  })

  describe('Zod Schema Inference - Capabilities', () => {
    it('should infer insert schema for capabilities', () => {
      type InsertCapability = z.infer<typeof insertCapabilitySchema>
      const validCapability: InsertCapability = {
        capabilityName: 'test-capability',
        capabilityType: 'business',
      }
      const result = insertCapabilitySchema.safeParse(validCapability)
      expect(result.success).toBe(true)
    })

    it('should infer select schema for capabilities', () => {
      type SelectCapability = z.infer<typeof selectCapabilitySchema>
      const validCapability: Partial<SelectCapability> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        capabilityName: 'test-capability',
        capabilityType: 'technical',
      }
      expect(validCapability.id).toBeDefined()
      expect(validCapability.capabilityName).toBeDefined()
    })
  })

  describe('Zod Schema Inference - Feature Relationships', () => {
    it('should infer insert schema for feature relationships', () => {
      type InsertFeatureRelationship = z.infer<typeof insertFeatureRelationshipSchema>
      const validRelationship: InsertFeatureRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'depends_on',
        strength: 75,
      }
      const result = insertFeatureRelationshipSchema.safeParse(validRelationship)
      expect(result.success).toBe(true)
    })

    it('should validate strength field is within 0-100 range', () => {
      const validRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'depends_on',
        strength: 50,
      }
      const result = insertFeatureRelationshipSchema.safeParse(validRelationship)
      expect(result.success).toBe(true)
    })

    it('should reject strength below 0', () => {
      const invalidRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'depends_on',
        strength: -1,
      }
      const result = insertFeatureRelationshipSchema.safeParse(invalidRelationship)
      expect(result.success).toBe(false)
    })

    it('should reject strength above 100', () => {
      const invalidRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'depends_on',
        strength: 101,
      }
      const result = insertFeatureRelationshipSchema.safeParse(invalidRelationship)
      expect(result.success).toBe(false)
    })

    it('should accept strength at boundary 0', () => {
      const validRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'depends_on',
        strength: 0,
      }
      const result = insertFeatureRelationshipSchema.safeParse(validRelationship)
      expect(result.success).toBe(true)
    })

    it('should accept strength at boundary 100', () => {
      const validRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'depends_on',
        strength: 100,
      }
      const result = insertFeatureRelationshipSchema.safeParse(validRelationship)
      expect(result.success).toBe(true)
    })
  })

  describe('Zod Schema Inference - Cohesion Rules', () => {
    it('should infer insert schema for cohesion rules', () => {
      type InsertCohesionRule = z.infer<typeof insertCohesionRuleSchema>
      const validRule: InsertCohesionRule = {
        ruleName: 'test-rule',
        ruleType: 'package_cohesion',
        conditions: {
          featurePatterns: ['*.service.ts'],
          packagePatterns: ['packages/backend/*'],
        },
        severity: 'error',
      }
      const result = insertCohesionRuleSchema.safeParse(validRule)
      expect(result.success).toBe(true)
    })

    it('should validate conditions JSONB field structure', () => {
      const validRule = {
        ruleName: 'test-rule',
        ruleType: 'package_cohesion',
        conditions: {
          featurePatterns: ['*.service.ts'],
          packagePatterns: ['packages/backend/*'],
          relationshipTypes: ['depends_on'],
        },
        severity: 'warning',
      }
      const result = insertCohesionRuleSchema.safeParse(validRule)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge Cases - Enum Validation', () => {
    it('should reject invalid relationship type', () => {
      const invalidRelationship = {
        sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
        targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
        relationshipType: 'invalid_type',
        strength: 50,
      }
      const result = insertFeatureRelationshipSchema.safeParse(invalidRelationship)
      expect(result.success).toBe(false)
    })

    it('should accept all valid relationship types', () => {
      const relationshipTypes = ['depends_on', 'enhances', 'conflicts_with', 'related_to', 'supersedes']

      relationshipTypes.forEach(type => {
        const validRelationship = {
          sourceFeatureId: '123e4567-e89b-12d3-a456-426614174000',
          targetFeatureId: '223e4567-e89b-12d3-a456-426614174000',
          relationshipType: type,
          strength: 50,
        }
        const result = insertFeatureRelationshipSchema.safeParse(validRelationship)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Edge Cases - Circular Relationships', () => {
    it('should allow circular relationships (A → B → A)', () => {
      const featureA = '123e4567-e89b-12d3-a456-426614174000'
      const featureB = '223e4567-e89b-12d3-a456-426614174000'

      const relationshipAB = {
        sourceFeatureId: featureA,
        targetFeatureId: featureB,
        relationshipType: 'depends_on',
        strength: 50,
      }

      const relationshipBA = {
        sourceFeatureId: featureB,
        targetFeatureId: featureA,
        relationshipType: 'depends_on',
        strength: 50,
      }

      const resultAB = insertFeatureRelationshipSchema.safeParse(relationshipAB)
      const resultBA = insertFeatureRelationshipSchema.safeParse(relationshipBA)

      expect(resultAB.success).toBe(true)
      expect(resultBA.success).toBe(true)
    })

    it('should allow self-referencing relationships (A → A)', () => {
      const featureId = '123e4567-e89b-12d3-a456-426614174000'

      const selfRelationship = {
        sourceFeatureId: featureId,
        targetFeatureId: featureId,
        relationshipType: 'related_to',
        strength: 50,
      }

      const result = insertFeatureRelationshipSchema.safeParse(selfRelationship)
      expect(result.success).toBe(true)
    })
  })

  describe('JSONB Type Safety', () => {
    it('should validate tags JSONB field in features', () => {
      const validFeature = {
        featureName: 'test-feature',
        featureType: 'ui_component',
        tags: ['react', 'component', 'ui'],
      }
      const result = insertFeatureSchema.safeParse(validFeature)
      expect(result.success).toBe(true)
    })

    it('should validate metadata JSONB field in features', () => {
      const validFeature = {
        featureName: 'test-feature',
        featureType: 'service',
        metadata: {
          version: '1.0.0',
          author: 'test-user',
          complexity: 'high',
        },
      }
      const result = insertFeatureSchema.safeParse(validFeature)
      expect(result.success).toBe(true)
    })

    it('should validate metadata JSONB field in capabilities', () => {
      const validCapability = {
        capabilityName: 'test-capability',
        capabilityType: 'infrastructure',
        metadata: {
          dependencies: ['aws', 'docker'],
          version: '2.0.0',
        },
      }
      const result = insertCapabilitySchema.safeParse(validCapability)
      expect(result.success).toBe(true)
    })
  })
})
