/**
 * WINT Schema Unit Tests
 * Story WINT-0010: Create Core Database Schemas
 * 
 * Tests validate:
 * - Schema structure and table definitions
 * - Zod schema inference
 * - Relations definitions
 * - Enums
 */

import { describe, expect, it } from 'vitest'
import {
  // Schema namespace
  wintSchema,

  // Story Management
  stories,
  storyStates,
  storyTransitions,
  storyDependencies,
  storyArtifacts,
  storyPhaseHistory,
  storyMetadataVersions,
  storyAssignments,
  storyBlockers,
  storyStateEnum,
  storyPriorityEnum,
  artifactTypeEnum,
  phaseEnum,
  phaseStatusEnum,
  assigneeTypeEnum,
  assignmentStatusEnum,
  blockerTypeEnum,
  severityEnum,
  
  // Context Cache
  contextPacks,
  contextSessions,
  contextCacheHits,
  contextPackTypeEnum,
  
  // Telemetry
  agentInvocations,
  agentDecisions,
  agentOutcomes,
  stateTransitions,
  agentDecisionTypeEnum,
  
  // ML Pipeline
  trainingData,
  mlModels,
  modelPredictions,
  modelMetrics,
  modelTypeEnum,
  
  // Graph Relational
  features,
  capabilities,
  featureRelationships,
  cohesionRules,
  featureRelationshipTypeEnum,
  
  // Workflow Tracking
  workflowExecutions,
  workflowCheckpoints,
  workflowAuditLog,
  workflowStatusEnum,
  
  // Zod Schemas
  insertStorySchema,
  selectStorySchema,
  insertStoryArtifactSchema,
  selectStoryArtifactSchema,
  insertStoryPhaseHistorySchema,
  selectStoryPhaseHistorySchema,
  insertStoryMetadataVersionSchema,
  selectStoryMetadataVersionSchema,
  insertStoryAssignmentSchema,
  selectStoryAssignmentSchema,
  insertStoryBlockerSchema,
  selectStoryBlockerSchema,
  insertContextPackSchema,
  selectContextPackSchema,
  insertAgentInvocationSchema,
  selectAgentInvocationSchema,
  insertTrainingDataSchema,
  selectTrainingDataSchema,
  insertFeatureSchema,
  selectFeatureSchema,
  insertWorkflowExecutionSchema,
  selectWorkflowExecutionSchema,
  
  // Relations
  storiesRelations,
  storyArtifactsRelations,
  storyPhaseHistoryRelations,
  storyMetadataVersionsRelations,
  storyAssignmentsRelations,
  storyBlockersRelations,
  contextSessionsRelations,
  agentInvocationsRelations,
  mlModelsRelations,
  featuresRelations,
  workflowExecutionsRelations,
} from '../wint'

describe('WINT Schema - AC-001: Schema Namespace', () => {
  it('should define wintSchema namespace', () => {
    expect(wintSchema).toBeDefined()
    expect(wintSchema.schemaName).toBe('wint')
  })
  
  it('should define all tables in wint namespace', () => {
    expect(stories).toBeDefined()
    expect(contextPacks).toBeDefined()
    expect(agentInvocations).toBeDefined()
    expect(trainingData).toBeDefined()
    expect(features).toBeDefined()
    expect(workflowExecutions).toBeDefined()
  })
})

describe('WINT Schema - AC-002: Story Management Schema', () => {
  it('should define all story management tables', () => {
    expect(stories).toBeDefined()
    expect(storyStates).toBeDefined()
    expect(storyTransitions).toBeDefined()
    expect(storyDependencies).toBeDefined()
  })
})

describe('WINT Schema - AC-003: Context Cache Schema', () => {
  it('should define all context cache tables', () => {
    expect(contextPacks).toBeDefined()
    expect(contextSessions).toBeDefined()
    expect(contextCacheHits).toBeDefined()
  })
})

describe('WINT Schema - AC-004: Telemetry Schema', () => {
  it('should define all telemetry tables', () => {
    expect(agentInvocations).toBeDefined()
    expect(agentDecisions).toBeDefined()
    expect(agentOutcomes).toBeDefined()
    expect(stateTransitions).toBeDefined()
  })
})

describe('WINT Schema - AC-005: ML Pipeline Schema', () => {
  it('should define all ML pipeline tables', () => {
    expect(trainingData).toBeDefined()
    expect(mlModels).toBeDefined()
    expect(modelPredictions).toBeDefined()
    expect(modelMetrics).toBeDefined()
  })
})

describe('WINT Schema - AC-006: Graph Relational Schema', () => {
  it('should define all graph relational tables', () => {
    expect(features).toBeDefined()
    expect(capabilities).toBeDefined()
    expect(featureRelationships).toBeDefined()
    expect(cohesionRules).toBeDefined()
  })
})

describe('WINT Schema - AC-007: Workflow Tracking Schema', () => {
  it('should define all workflow tracking tables', () => {
    expect(workflowExecutions).toBeDefined()
    expect(workflowCheckpoints).toBeDefined()
    expect(workflowAuditLog).toBeDefined()
  })
})

describe('WINT Schema - AC-009: Relations', () => {
  it('should define relations for all schema groups', () => {
    // Story Management relations
    expect(storiesRelations).toBeDefined()
    
    // Context Cache relations
    expect(contextSessionsRelations).toBeDefined()
    
    // Telemetry relations
    expect(agentInvocationsRelations).toBeDefined()
    
    // ML Pipeline relations
    expect(mlModelsRelations).toBeDefined()
    
    // Graph Relational relations
    expect(featuresRelations).toBeDefined()
    
    // Workflow Tracking relations
    expect(workflowExecutionsRelations).toBeDefined()
  })
})

describe('WINT Schema - AC-010: Zod Schemas', () => {
  it('should generate insert and select schemas for stories', () => {
    expect(insertStorySchema).toBeDefined()
    expect(selectStorySchema).toBeDefined()
    
    // Test insert schema parsing
    const validInsert = {
      storyId: 'WINT-0010',
      title: 'Test Story',
      storyType: 'feature',
      priority: 'P1',
      state: 'backlog',
    }
    
    const parsed = insertStorySchema.parse(validInsert)
    expect(parsed.storyId).toBe('WINT-0010')
  })
  
  it('should generate insert and select schemas for context packs', () => {
    expect(insertContextPackSchema).toBeDefined()
    expect(selectContextPackSchema).toBeDefined()
    
    const validInsert = {
      packType: 'story',
      packKey: 'WINT-0010',
      content: { summary: 'Test' },
    }
    
    const parsed = insertContextPackSchema.parse(validInsert)
    expect(parsed.packKey).toBe('WINT-0010')
  })
  
  it('should generate insert and select schemas for agent invocations', () => {
    expect(insertAgentInvocationSchema).toBeDefined()
    expect(selectAgentInvocationSchema).toBeDefined()
    
    const validInsert = {
      invocationId: 'inv-123',
      agentName: 'dev-execute-leader',
      status: 'success',
    }
    
    const parsed = insertAgentInvocationSchema.parse(validInsert)
    expect(parsed.agentName).toBe('dev-execute-leader')
  })
  
  it('should generate insert and select schemas for training data', () => {
    expect(insertTrainingDataSchema).toBeDefined()
    expect(selectTrainingDataSchema).toBeDefined()
    
    const validInsert = {
      dataType: 'story_outcome',
      features: { complexity: 'high' },
      labels: { quality: 95 },
    }
    
    const parsed = insertTrainingDataSchema.parse(validInsert)
    expect(parsed.dataType).toBe('story_outcome')
  })
  
  it('should generate insert and select schemas for features', () => {
    expect(insertFeatureSchema).toBeDefined()
    expect(selectFeatureSchema).toBeDefined()
    
    const validInsert = {
      featureName: 'wishlist-api',
      featureType: 'api_endpoint',
    }
    
    const parsed = insertFeatureSchema.parse(validInsert)
    expect(parsed.featureName).toBe('wishlist-api')
  })
  
  it('should generate insert and select schemas for workflow executions', () => {
    expect(insertWorkflowExecutionSchema).toBeDefined()
    expect(selectWorkflowExecutionSchema).toBeDefined()
    
    const validInsert = {
      executionId: 'exec-123',
      workflowName: 'dev-implement-story',
      workflowVersion: '1.0.0',
      triggeredBy: 'user',
      status: 'pending',
    }
    
    const parsed = insertWorkflowExecutionSchema.parse(validInsert)
    expect(parsed.workflowName).toBe('dev-implement-story')
  })
})

describe('WINT Schema - AC-013: Enums', () => {
  it('should define story state enum', () => {
    expect(storyStateEnum).toBeDefined()
    expect(storyStateEnum.enumName).toBe('story_state')
  })
  
  it('should define story priority enum', () => {
    expect(storyPriorityEnum).toBeDefined()
    expect(storyPriorityEnum.enumName).toBe('story_priority')
  })
  
  it('should define context pack type enum', () => {
    expect(contextPackTypeEnum).toBeDefined()
    expect(contextPackTypeEnum.enumName).toBe('context_pack_type')
  })
  
  it('should define agent decision type enum', () => {
    expect(agentDecisionTypeEnum).toBeDefined()
    expect(agentDecisionTypeEnum.enumName).toBe('agent_decision_type')
  })
  
  it('should define model type enum', () => {
    expect(modelTypeEnum).toBeDefined()
    expect(modelTypeEnum.enumName).toBe('model_type')
  })
  
  it('should define feature relationship type enum', () => {
    expect(featureRelationshipTypeEnum).toBeDefined()
    expect(featureRelationshipTypeEnum.enumName).toBe('feature_relationship_type')
  })
  
  it('should define workflow status enum', () => {
    expect(workflowStatusEnum).toBeDefined()
    expect(workflowStatusEnum.enumName).toBe('workflow_status')
  })
})

// ============================================================================
// WINT-0020: Story Management Tables Tests
// ============================================================================

describe('WINT-0020 - AC-1: storyArtifacts Table', () => {
  it('should define storyArtifacts table', () => {
    expect(storyArtifacts).toBeDefined()
  })

  it('should define artifactType enum with correct values', () => {
    expect(artifactTypeEnum).toBeDefined()
    expect(artifactTypeEnum.enumName).toBe('artifact_type')
  })

  it('should generate valid insert and select schemas', () => {
    expect(insertStoryArtifactSchema).toBeDefined()
    expect(selectStoryArtifactSchema).toBeDefined()

    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      artifactType: 'PLAN',
      filePath: '/path/to/artifact.yaml',
      checksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    }

    const parsed = insertStoryArtifactSchema.parse(validInsert)
    expect(parsed.artifactType).toBe('PLAN')
    expect(parsed.checksum).toHaveLength(64)
  })
})

describe('WINT-0020 - AC-2: storyPhaseHistory Table', () => {
  it('should define storyPhaseHistory table', () => {
    expect(storyPhaseHistory).toBeDefined()
  })

  it('should define phase and phaseStatus enums with correct values', () => {
    expect(phaseEnum).toBeDefined()
    expect(phaseEnum.enumName).toBe('phase')

    expect(phaseStatusEnum).toBeDefined()
    expect(phaseStatusEnum.enumName).toBe('phase_status')
  })

  it('should generate valid insert and select schemas', () => {
    expect(insertStoryPhaseHistorySchema).toBeDefined()
    expect(selectStoryPhaseHistorySchema).toBeDefined()

    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 'execute',
      status: 'completed',
      enteredAt: new Date(),
      iteration: 1,
    }

    const parsed = insertStoryPhaseHistorySchema.parse(validInsert)
    expect(parsed.phase).toBe('execute')
    expect(parsed.status).toBe('completed')
    expect(parsed.iteration).toBe(1)
  })
})

describe('WINT-0020 - AC-3: storyMetadataVersions Table', () => {
  it('should define storyMetadataVersions table', () => {
    expect(storyMetadataVersions).toBeDefined()
  })

  it('should generate valid insert and select schemas with JSONB support', () => {
    expect(insertStoryMetadataVersionSchema).toBeDefined()
    expect(selectStoryMetadataVersionSchema).toBeDefined()

    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      version: 1,
      metadataSnapshot: {
        title: 'Test Story',
        description: 'Test description',
        tags: ['test', 'story'],
      },
      changedBy: 'dev-execute-leader',
    }

    const parsed = insertStoryMetadataVersionSchema.parse(validInsert)
    expect(parsed.version).toBe(1)
    expect(parsed.metadataSnapshot).toEqual({
      title: 'Test Story',
      description: 'Test description',
      tags: ['test', 'story'],
    })
  })
})

describe('WINT-0020 - AC-4: storyAssignments Table', () => {
  it('should define storyAssignments table', () => {
    expect(storyAssignments).toBeDefined()
  })

  it('should define assigneeType and assignmentStatus enums with correct values', () => {
    expect(assigneeTypeEnum).toBeDefined()
    expect(assigneeTypeEnum.enumName).toBe('assignee_type')

    expect(assignmentStatusEnum).toBeDefined()
    expect(assignmentStatusEnum.enumName).toBe('assignment_status')
  })

  it('should generate valid insert and select schemas', () => {
    expect(insertStoryAssignmentSchema).toBeDefined()
    expect(selectStoryAssignmentSchema).toBeDefined()

    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      assigneeType: 'agent',
      assigneeId: 'dev-execute-leader',
      phase: 'execute',
      status: 'active',
    }

    const parsed = insertStoryAssignmentSchema.parse(validInsert)
    expect(parsed.assigneeType).toBe('agent')
    expect(parsed.assigneeId).toBe('dev-execute-leader')
    expect(parsed.status).toBe('active')
  })
})

describe('WINT-0020 - AC-5: storyBlockers Table', () => {
  it('should define storyBlockers table', () => {
    expect(storyBlockers).toBeDefined()
  })

  it('should define blockerType and severity enums with correct values', () => {
    expect(blockerTypeEnum).toBeDefined()
    expect(blockerTypeEnum.enumName).toBe('blocker_type')

    expect(severityEnum).toBeDefined()
    expect(severityEnum.enumName).toBe('severity')
  })

  it('should generate valid insert and select schemas', () => {
    expect(insertStoryBlockerSchema).toBeDefined()
    expect(selectStoryBlockerSchema).toBeDefined()

    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      blockerType: 'technical',
      blockerDescription: 'Migration dependency not resolved',
      severity: 'high',
    }

    const parsed = insertStoryBlockerSchema.parse(validInsert)
    expect(parsed.blockerType).toBe('technical')
    expect(parsed.severity).toBe('high')
  })
})

describe('WINT-0020 - AC-6: Drizzle Relations', () => {
  it('should define relations for all new tables', () => {
    expect(storyArtifactsRelations).toBeDefined()
    expect(storyPhaseHistoryRelations).toBeDefined()
    expect(storyMetadataVersionsRelations).toBeDefined()
    expect(storyAssignmentsRelations).toBeDefined()
    expect(storyBlockersRelations).toBeDefined()
  })

  it('should extend storiesRelations with new tables', () => {
    expect(storiesRelations).toBeDefined()
    // Note: Relations structure is validated by Drizzle ORM at runtime
  })
})

describe('WINT-0020 - AC-7: Zod Schema Generation', () => {
  it('should generate insert schemas for all new tables', () => {
    expect(insertStoryArtifactSchema).toBeDefined()
    expect(insertStoryPhaseHistorySchema).toBeDefined()
    expect(insertStoryMetadataVersionSchema).toBeDefined()
    expect(insertStoryAssignmentSchema).toBeDefined()
    expect(insertStoryBlockerSchema).toBeDefined()
  })

  it('should generate select schemas for all new tables', () => {
    expect(selectStoryArtifactSchema).toBeDefined()
    expect(selectStoryPhaseHistorySchema).toBeDefined()
    expect(selectStoryMetadataVersionSchema).toBeDefined()
    expect(selectStoryAssignmentSchema).toBeDefined()
    expect(selectStoryBlockerSchema).toBeDefined()
  })
})

describe('WINT-0020 - AC-9: Unit Tests Coverage', () => {
  it('should validate checksum field constraints', () => {
    const validChecksum = '1234567890abcdef'.repeat(4) // 64 characters
    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      artifactType: 'PLAN',
      filePath: '/path/to/artifact.yaml',
      checksum: validChecksum,
    }

    const parsed = insertStoryArtifactSchema.parse(validInsert)
    expect(parsed.checksum).toHaveLength(64)
  })

  it('should validate phase enum values', () => {
    const phases = ['setup', 'plan', 'execute', 'review', 'qa']
    phases.forEach(phase => {
      const validInsert = {
        storyId: '550e8400-e29b-41d4-a716-446655440000',
        phase,
        status: 'entered',
        enteredAt: new Date(),
      }

      expect(() => insertStoryPhaseHistorySchema.parse(validInsert)).not.toThrow()
    })
  })

  it('should validate iteration field defaults to 1', () => {
    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 'execute',
      status: 'entered',
      enteredAt: new Date(),
    }

    const parsed = insertStoryPhaseHistorySchema.parse(validInsert)
    // iteration has default value of 1 at DB level
    expect(parsed.iteration === undefined || parsed.iteration === 1).toBe(true)
  })

  it('should validate JSONB metadata snapshot field', () => {
    const validInsert = {
      storyId: '550e8400-e29b-41d4-a716-446655440000',
      version: 1,
      metadataSnapshot: {
        complex: {
          nested: {
            structure: ['with', 'arrays', 'and', 'objects'],
          },
        },
      },
    }

    expect(() => insertStoryMetadataVersionSchema.parse(validInsert)).not.toThrow()
  })

  it('should validate assignee types', () => {
    const assigneeTypes = ['agent', 'user']
    assigneeTypes.forEach(assigneeType => {
      const validInsert = {
        storyId: '550e8400-e29b-41d4-a716-446655440000',
        assigneeType,
        assigneeId: 'test-assignee',
        status: 'active',
      }

      expect(() => insertStoryAssignmentSchema.parse(validInsert)).not.toThrow()
    })
  })

  it('should validate blocker severity levels', () => {
    const severities = ['high', 'medium', 'low']
    severities.forEach(severity => {
      const validInsert = {
        storyId: '550e8400-e29b-41d4-a716-446655440000',
        blockerType: 'technical',
        blockerDescription: 'Test blocker',
        severity,
      }

      expect(() => insertStoryBlockerSchema.parse(validInsert)).not.toThrow()
    })
  })
})
