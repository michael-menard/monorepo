import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import {
  GraphStateSchema,
  StateSnapshotSchema,
  StateSnapshotStateSchema,
  GRAPH_STATE_SCHEMA_VERSION,
  type GraphState,
  type GraphStateInput,
} from '../graph-state.js'
import {
  ArtifactTypeSchema,
  RoutingFlagSchema,
  GateTypeSchema,
  GateDecisionSchema,
} from '../enums/index.js'
import { EvidenceRefSchema } from '../refs/evidence-ref.js'
import { NodeErrorSchema } from '../refs/node-error.js'

describe('GraphStateSchema', () => {
  describe('Happy Path Tests', () => {
    it('HP-1: creates valid GraphState with all fields', () => {
      const input: GraphStateInput = {
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        schemaVersion: '1.0.0',
        artifactPaths: {
          storyDoc: '/path/to/story.md',
        },
        routingFlags: {
          proceed: true,
        },
        evidenceRefs: [
          {
            type: 'test',
            path: '/path/to/test.log',
            timestamp: '2024-01-15T10:00:00Z',
            description: 'Test output',
          },
        ],
        gateDecisions: {
          codeReview: 'PASS',
        },
        errors: [],
        stateHistory: [],
      }

      const result = GraphStateSchema.parse(input)

      expect(result.epicPrefix).toBe('wrkf')
      expect(result.storyId).toBe('wrkf-1010')
      expect(result.schemaVersion).toBe('1.0.0')
      expect(result.artifactPaths.storyDoc).toBe('/path/to/story.md')
      expect(result.routingFlags.proceed).toBe(true)
      expect(result.evidenceRefs).toHaveLength(1)
      expect(result.gateDecisions.codeReview).toBe('PASS')
    })

    it('HP-2: type inference works via z.infer<typeof GraphStateSchema>', () => {
      const state: GraphState = {
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        schemaVersion: '1.0.0',
        artifactPaths: {},
        routingFlags: {},
        evidenceRefs: [],
        gateDecisions: {},
        errors: [],
        stateHistory: [],
      }

      // TypeScript compiles this - that's the test
      expect(state.epicPrefix).toBe('wrkf')
    })

    it('HP-3: accesses individual state fields with correct types', () => {
      const input: GraphStateInput = {
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      }

      const result = GraphStateSchema.parse(input)

      // All fields are accessible
      expect(typeof result.epicPrefix).toBe('string')
      expect(typeof result.storyId).toBe('string')
      expect(typeof result.schemaVersion).toBe('string')
      expect(typeof result.artifactPaths).toBe('object')
      expect(typeof result.routingFlags).toBe('object')
      expect(Array.isArray(result.evidenceRefs)).toBe(true)
      expect(typeof result.gateDecisions).toBe('object')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(Array.isArray(result.stateHistory)).toBe(true)
    })

    it('HP-4: validates epicPrefix as non-empty string', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(result.epicPrefix).toBe('wrkf')
    })

    it('HP-5: validates storyId pattern matching', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(result.storyId).toBe('wrkf-1010')
    })

    it('HP-6: validates artifactPaths with typed keys', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        artifactPaths: {
          storyDoc: '/story.md',
          elaboration: '/elaboration.md',
          proof: '/proof.md',
          codeReview: '/code-review.md',
          qaVerify: '/qa-verify.md',
          uiuxReview: '/uiux-review.md',
          qaGate: '/qa-gate.md',
          evidence: '/evidence.zip',
        },
      })

      expect(Object.keys(result.artifactPaths)).toHaveLength(8)
    })

    it('HP-7: validates routingFlags with enum keys', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        routingFlags: {
          proceed: true,
          skip: false,
        },
      })

      expect(result.routingFlags.proceed).toBe(true)
      expect(result.routingFlags.skip).toBe(false)
    })

    it('HP-8: validates evidenceRefs array', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        evidenceRefs: [
          {
            type: 'test',
            path: '/test.log',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            type: 'screenshot',
            path: '/screenshot.png',
            timestamp: '2024-01-15T10:01:00Z',
            description: 'UI screenshot',
          },
        ],
      })

      expect(result.evidenceRefs).toHaveLength(2)
      expect(result.evidenceRefs[0].type).toBe('test')
      expect(result.evidenceRefs[1].description).toBe('UI screenshot')
    })

    it('HP-9: validates gateDecisions with PASS/FAIL/CONCERNS/WAIVED/PENDING', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        gateDecisions: {
          codeReview: 'PASS',
          qaVerify: 'FAIL',
          uiuxReview: 'CONCERNS',
          qaGate: 'PENDING',
        },
      })

      expect(result.gateDecisions.codeReview).toBe('PASS')
      expect(result.gateDecisions.qaVerify).toBe('FAIL')
      expect(result.gateDecisions.uiuxReview).toBe('CONCERNS')
      expect(result.gateDecisions.qaGate).toBe('PENDING')
    })

    it('HP-10: schemaVersion defaults to current version', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(result.schemaVersion).toBe(GRAPH_STATE_SCHEMA_VERSION)
      expect(result.schemaVersion).toBe('1.0.0')
    })
  })

  describe('Error Cases', () => {
    it('EC-1: rejects invalid epicPrefix type (number)', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 123,
          storyId: 'wrkf-1010',
        }),
      ).toThrow(ZodError)
    })

    it('EC-2: rejects invalid storyId pattern', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'invalid-story-id-format',
        }),
      ).toThrow(ZodError)
    })

    it('EC-3: rejects invalid artifactPaths structure', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'wrkf-1010',
          artifactPaths: {
            invalidKey: '/path.md',
          },
        }),
      ).toThrow(ZodError)
    })

    it('EC-4: rejects invalid gateDecision value', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'wrkf-1010',
          gateDecisions: {
            codeReview: 'INVALID',
          },
        }),
      ).toThrow(ZodError)
    })

    it('EC-5: rejects missing required fields', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          // missing storyId
        }),
      ).toThrow(ZodError)

      expect(() =>
        GraphStateSchema.parse({
          // missing epicPrefix
          storyId: 'wrkf-1010',
        }),
      ).toThrow(ZodError)
    })

    it('EC-6: rejects wrong type in evidenceRefs', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'wrkf-1010',
          evidenceRefs: [
            {
              type: 'invalid-type',
              path: '/test.log',
              timestamp: '2024-01-15T10:00:00Z',
            },
          ],
        }),
      ).toThrow(ZodError)
    })
  })

  describe('Edge Cases', () => {
    it('EDGE-1: rejects empty string epicPrefix', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: '',
          storyId: 'wrkf-1010',
        }),
      ).toThrow(ZodError)
    })

    it('EDGE-2: accepts empty artifactPaths object', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        artifactPaths: {},
      })

      expect(result.artifactPaths).toEqual({})
    })

    it('EDGE-3: accepts empty routingFlags object', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        routingFlags: {},
      })

      expect(result.routingFlags).toEqual({})
    })

    it('EDGE-4: accepts empty evidenceRefs array', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        evidenceRefs: [],
      })

      expect(result.evidenceRefs).toEqual([])
    })

    it('EDGE-5: accepts empty gateDecisions object', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        gateDecisions: {},
      })

      expect(result.gateDecisions).toEqual({})
    })

    it('EDGE-6: defaults errors to empty array', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
      })

      expect(result.errors).toEqual([])
    })

    it('EDGE-7: strips extra unknown fields', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        unknownField: 'should be stripped',
      })

      expect((result as Record<string, unknown>).unknownField).toBeUndefined()
    })

    it('EDGE-8: accepts case-insensitive storyId pattern', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'WRKF-1010',
      })

      expect(result.storyId).toBe('WRKF-1010')
    })

    it('EDGE-9: accepts all gate decisions WAIVED', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        gateDecisions: {
          codeReview: 'WAIVED',
          qaVerify: 'WAIVED',
          uiuxReview: 'WAIVED',
          qaGate: 'WAIVED',
        },
      })

      expect(Object.values(result.gateDecisions).every(v => v === 'WAIVED')).toBe(true)
    })

    it('EDGE-10: accepts all gate decisions PENDING', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        gateDecisions: {
          codeReview: 'PENDING',
          qaVerify: 'PENDING',
          uiuxReview: 'PENDING',
          qaGate: 'PENDING',
        },
      })

      expect(Object.values(result.gateDecisions).every(v => v === 'PENDING')).toBe(true)
    })
  })

  describe('Cross-Field Refinements', () => {
    it('rejects retry flag when complete is true', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'wrkf-1010',
          routingFlags: {
            complete: true,
            retry: true,
          },
        }),
      ).toThrow(ZodError)
    })

    it('rejects blocked flag when complete is true', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'wrkf-1010',
          routingFlags: {
            complete: true,
            blocked: true,
          },
        }),
      ).toThrow(ZodError)
    })

    it('accepts complete with proceed flag', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        routingFlags: {
          complete: true,
          proceed: true,
        },
      })

      expect(result.routingFlags.complete).toBe(true)
    })

    it('rejects mismatched storyId prefix', () => {
      expect(() =>
        GraphStateSchema.parse({
          epicPrefix: 'wrkf',
          storyId: 'glry-1010', // prefix doesn't match epicPrefix
        }),
      ).toThrow(ZodError)
    })

    it('accepts matching storyId prefix (case-insensitive)', () => {
      const result = GraphStateSchema.parse({
        epicPrefix: 'WRKF',
        storyId: 'wrkf-1010', // lowercase matches uppercase epicPrefix
      })

      expect(result.epicPrefix).toBe('WRKF')
      expect(result.storyId).toBe('wrkf-1010')
    })
  })
})

describe('Enum Schemas', () => {
  it('ArtifactTypeSchema validates all artifact types', () => {
    const types = [
      'storyDoc',
      'elaboration',
      'proof',
      'codeReview',
      'qaVerify',
      'uiuxReview',
      'qaGate',
      'evidence',
    ]

    types.forEach(type => {
      expect(ArtifactTypeSchema.parse(type)).toBe(type)
    })
  })

  it('RoutingFlagSchema validates all routing flags', () => {
    const flags = ['proceed', 'retry', 'blocked', 'escalate', 'skip', 'complete']

    flags.forEach(flag => {
      expect(RoutingFlagSchema.parse(flag)).toBe(flag)
    })
  })

  it('GateTypeSchema validates all gate types', () => {
    const types = ['codeReview', 'qaVerify', 'uiuxReview', 'qaGate']

    types.forEach(type => {
      expect(GateTypeSchema.parse(type)).toBe(type)
    })
  })

  it('GateDecisionSchema validates all gate decisions', () => {
    const decisions = ['PASS', 'CONCERNS', 'FAIL', 'WAIVED', 'PENDING']

    decisions.forEach(decision => {
      expect(GateDecisionSchema.parse(decision)).toBe(decision)
    })
  })
})

describe('Reference Schemas', () => {
  it('EvidenceRefSchema validates complete evidence ref', () => {
    const ref = {
      type: 'test',
      path: '/path/to/test.log',
      timestamp: '2024-01-15T10:00:00Z',
      description: 'Test output',
    }

    const result = EvidenceRefSchema.parse(ref)
    expect(result).toEqual(ref)
  })

  it('EvidenceRefSchema validates evidence ref without description', () => {
    const ref = {
      type: 'build',
      path: '/path/to/build.log',
      timestamp: '2024-01-15T10:00:00Z',
    }

    const result = EvidenceRefSchema.parse(ref)
    expect(result.description).toBeUndefined()
  })

  it('NodeErrorSchema validates complete node error', () => {
    const error = {
      nodeId: 'elaboration-node',
      message: 'Failed to parse story',
      code: 'PARSE_ERROR',
      timestamp: '2024-01-15T10:00:00Z',
      stack: 'Error: Failed to parse...',
      recoverable: true,
    }

    const result = NodeErrorSchema.parse(error)
    expect(result).toEqual(error)
  })

  it('NodeErrorSchema defaults recoverable to false', () => {
    const error = {
      nodeId: 'test-node',
      message: 'Test failed',
      timestamp: '2024-01-15T10:00:00Z',
    }

    const result = NodeErrorSchema.parse(error)
    expect(result.recoverable).toBe(false)
  })
})

describe('StateSnapshot Schema', () => {
  it('validates complete state snapshot', () => {
    const snapshot = {
      timestamp: '2024-01-15T10:00:00Z',
      state: {
        schemaVersion: '1.0.0',
        epicPrefix: 'wrkf',
        storyId: 'wrkf-1010',
        artifactPaths: {},
        routingFlags: {},
        evidenceRefs: [],
        gateDecisions: {},
        errors: [],
      },
    }

    const result = StateSnapshotSchema.parse(snapshot)
    expect(result.timestamp).toBe('2024-01-15T10:00:00Z')
    expect(result.state.storyId).toBe('wrkf-1010')
  })

  it('GraphState can include stateHistory', () => {
    const state = {
      epicPrefix: 'wrkf',
      storyId: 'wrkf-1010',
      stateHistory: [
        {
          timestamp: '2024-01-15T10:00:00Z',
          state: {
            schemaVersion: '1.0.0',
            epicPrefix: 'wrkf',
            storyId: 'wrkf-1010',
            artifactPaths: {},
            routingFlags: {},
            evidenceRefs: [],
            gateDecisions: {},
            errors: [],
          },
        },
      ],
    }

    const result = GraphStateSchema.parse(state)
    expect(result.stateHistory).toHaveLength(1)
  })
})
