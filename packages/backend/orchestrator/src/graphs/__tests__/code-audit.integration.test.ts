import { describe, expect, it } from 'vitest'
import { createCodeAuditGraph, CodeAuditConfigSchema } from '../../graphs/code-audit.js'

describe('code-audit integration', () => {
  it('AC-17: CodeAuditConfigSchema accepts auditDir and plansDir', () => {
    const config = CodeAuditConfigSchema.parse({
      auditDir: '/tmp/test-audit',
      plansDir: '/tmp/test-plans',
      lenses: ['security'],
      mode: 'pipeline',
    })
    expect(config.auditDir).toBe('/tmp/test-audit')
    expect(config.plansDir).toBe('/tmp/test-plans')
  })

  it('AC-1: pipeline mode graph compiles with custom paths', () => {
    const graph = createCodeAuditGraph({
      mode: 'pipeline',
      lenses: ['security'],
      auditDir: '/tmp/test-audit',
      plansDir: '/tmp/test-plans',
    })
    expect(graph).toBeDefined()
  })

  it('AC-2: roundtable mode graph compiles with custom paths', () => {
    const graph = createCodeAuditGraph({
      mode: 'roundtable',
      lenses: ['security'],
      auditDir: '/tmp/test-audit',
      plansDir: '/tmp/test-plans',
    })
    expect(graph).toBeDefined()
  })

  it('defaults auditDir to plans/audit and plansDir to plans', () => {
    const config = CodeAuditConfigSchema.parse({})
    expect(config.auditDir).toBe('plans/audit')
    expect(config.plansDir).toBe('plans')
  })

  it('AC-17: CodeAuditConfigSchema rejects invalid mode', () => {
    expect(() =>
      CodeAuditConfigSchema.parse({ mode: 'invalid-mode' }),
    ).toThrow()
  })

  it('AC-17: CodeAuditConfigSchema rejects invalid lens', () => {
    expect(() =>
      CodeAuditConfigSchema.parse({ lenses: ['not-a-real-lens'] }),
    ).toThrow()
  })

  it('AC-17: CodeAuditConfigSchema accepts all valid lenses', () => {
    const config = CodeAuditConfigSchema.parse({
      lenses: [
        'security',
        'duplication',
        'react',
        'typescript',
        'a11y',
        'ui-ux',
        'performance',
        'test-coverage',
        'code-quality',
      ],
    })
    expect(config.lenses).toHaveLength(9)
  })

  it('AC-17: CodeAuditConfigSchema uses default lenses when not provided', () => {
    const config = CodeAuditConfigSchema.parse({})
    expect(config.lenses.length).toBeGreaterThan(0)
    expect(config.lenses).toContain('security')
  })

  it('AC-1: pipeline mode graph is defined and invokable object', () => {
    const graph = createCodeAuditGraph({ mode: 'pipeline', lenses: ['security'] })
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })

  it('AC-2: roundtable mode graph is defined and invokable object', () => {
    const graph = createCodeAuditGraph({ mode: 'roundtable', lenses: ['security'] })
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })

  it('createCodeAuditGraph uses default config when called with no arguments', () => {
    const graph = createCodeAuditGraph()
    expect(graph).toBeDefined()
  })
})
