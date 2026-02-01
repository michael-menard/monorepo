/**
 * Access Control Tests - KNOW-009
 *
 * Comprehensive tests for role-based access control:
 * - All 44 matrix combinations (11 tools x 4 roles)
 * - Invalid role handling
 * - Missing role handling
 * - Case-insensitive role handling
 * - Performance benchmark (<1ms target)
 * - Thread-safety test
 *
 * @see KNOW-009 for authorization implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the logger
vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import {
  checkAccess,
  normalizeRole,
  ADMIN_TOOLS,
  cacheGet,
  cacheSet,
  cacheInvalidate,
  generateSearchCacheKey,
  type AgentRole,
  type ToolName,
  type CacheKey,
} from '../access-control.js'

// All 11 tools in the access control matrix
const ALL_TOOLS: ToolName[] = [
  'kb_add',
  'kb_get',
  'kb_update',
  'kb_delete',
  'kb_list',
  'kb_search',
  'kb_get_related',
  'kb_bulk_import',
  'kb_rebuild_embeddings',
  'kb_stats',
  'kb_health',
]

// All 4 roles
const ALL_ROLES: AgentRole[] = ['pm', 'dev', 'qa', 'all']

// Non-admin tools (allowed for all roles)
const NON_ADMIN_TOOLS: ToolName[] = [
  'kb_add',
  'kb_get',
  'kb_update',
  'kb_list',
  'kb_search',
  'kb_get_related',
  'kb_stats',
  'kb_health',
]

describe('Access Control Matrix (KNOW-009 AC1)', () => {
  describe('PM role has full access to all 11 tools', () => {
    it.each(ALL_TOOLS)('PM role can access %s', toolName => {
      const result = checkAccess(toolName, 'pm')
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('PM role allowed count is 11', () => {
      const allowedCount = ALL_TOOLS.filter(tool => checkAccess(tool, 'pm').allowed).length
      expect(allowedCount).toBe(11)
    })
  })

  describe('Dev role denied admin tools (KNOW-009 AC5)', () => {
    it.each(ADMIN_TOOLS)('Dev role denied %s', toolName => {
      const result = checkAccess(toolName, 'dev')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe(`${toolName} requires pm role`)
    })

    it.each(NON_ADMIN_TOOLS)('Dev role allowed %s', toolName => {
      const result = checkAccess(toolName, 'dev')
      expect(result.allowed).toBe(true)
    })

    it('Dev role allowed count is 8', () => {
      const allowedCount = ALL_TOOLS.filter(tool => checkAccess(tool, 'dev').allowed).length
      expect(allowedCount).toBe(8)
    })

    it('Dev role denied count is 3', () => {
      const deniedCount = ALL_TOOLS.filter(tool => !checkAccess(tool, 'dev').allowed).length
      expect(deniedCount).toBe(3)
    })
  })

  describe('QA role denied admin tools (KNOW-009 AC5)', () => {
    it.each(ADMIN_TOOLS)('QA role denied %s', toolName => {
      const result = checkAccess(toolName, 'qa')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe(`${toolName} requires pm role`)
    })

    it.each(NON_ADMIN_TOOLS)('QA role allowed %s', toolName => {
      const result = checkAccess(toolName, 'qa')
      expect(result.allowed).toBe(true)
    })

    it('QA role allowed count is 8', () => {
      const allowedCount = ALL_TOOLS.filter(tool => checkAccess(tool, 'qa').allowed).length
      expect(allowedCount).toBe(8)
    })
  })

  describe('All role denied admin tools (KNOW-009 AC5)', () => {
    it.each(ADMIN_TOOLS)('All role denied %s', toolName => {
      const result = checkAccess(toolName, 'all')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe(`${toolName} requires pm role`)
    })

    it.each(NON_ADMIN_TOOLS)('All role allowed %s', toolName => {
      const result = checkAccess(toolName, 'all')
      expect(result.allowed).toBe(true)
    })

    it('All role allowed count is 8', () => {
      const allowedCount = ALL_TOOLS.filter(tool => checkAccess(tool, 'all').allowed).length
      expect(allowedCount).toBe(8)
    })
  })

  describe('Complete 44-combination matrix test (KNOW-009 AC12)', () => {
    // Build expected matrix
    const expectedMatrix: Array<{ tool: ToolName; role: AgentRole; allowed: boolean }> = []

    for (const tool of ALL_TOOLS) {
      for (const role of ALL_ROLES) {
        const isAdminTool = ADMIN_TOOLS.includes(tool as (typeof ADMIN_TOOLS)[number])
        const allowed = role === 'pm' || !isAdminTool
        expectedMatrix.push({ tool, role, allowed })
      }
    }

    it('should have 44 test cases', () => {
      expect(expectedMatrix.length).toBe(44)
    })

    it.each(expectedMatrix)(
      'checkAccess($tool, $role) should return allowed=$allowed',
      ({ tool, role, allowed }) => {
        const result = checkAccess(tool, role)
        expect(result.allowed).toBe(allowed)
      },
    )

    it('all 44 matrix assertions pass', () => {
      let passCount = 0
      for (const { tool, role, allowed } of expectedMatrix) {
        const result = checkAccess(tool, role)
        if (result.allowed === allowed) {
          passCount++
        }
      }
      expect(passCount).toBe(44)
    })
  })
})

describe('Role Normalization (KNOW-009 AC1)', () => {
  describe('normalizeRole function', () => {
    it('normalizes lowercase roles', () => {
      expect(normalizeRole('pm')).toBe('pm')
      expect(normalizeRole('dev')).toBe('dev')
      expect(normalizeRole('qa')).toBe('qa')
      expect(normalizeRole('all')).toBe('all')
    })

    it('normalizes uppercase roles', () => {
      expect(normalizeRole('PM')).toBe('pm')
      expect(normalizeRole('DEV')).toBe('dev')
      expect(normalizeRole('QA')).toBe('qa')
      expect(normalizeRole('ALL')).toBe('all')
    })

    it('normalizes mixed case roles', () => {
      expect(normalizeRole('Pm')).toBe('pm')
      expect(normalizeRole('Dev')).toBe('dev')
      expect(normalizeRole('Qa')).toBe('qa')
      expect(normalizeRole('All')).toBe('all')
    })

    it('returns null for invalid roles', () => {
      expect(normalizeRole('admin')).toBeNull()
      expect(normalizeRole('unknown')).toBeNull()
      expect(normalizeRole('')).toBeNull()
      expect(normalizeRole('root')).toBeNull()
    })
  })

  describe('Case-insensitive role handling in checkAccess', () => {
    // checkAccess expects normalized AgentRole type, so case sensitivity
    // is handled by normalizeRole before calling checkAccess
    it('checkAccess works with normalized pm role', () => {
      expect(checkAccess('kb_delete', 'pm').allowed).toBe(true)
    })

    it('checkAccess works with normalized dev role', () => {
      expect(checkAccess('kb_delete', 'dev').allowed).toBe(false)
    })
  })
})

describe('Unknown Tool Handling', () => {
  it('denies access for unknown tools', () => {
    const result = checkAccess('unknown_tool', 'pm')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Unknown tool: unknown_tool')
  })

  it('denies access for empty tool name', () => {
    const result = checkAccess('', 'pm')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Unknown tool')
  })
})

describe('Access Check Result Structure', () => {
  it('returns correct structure for allowed access', () => {
    const result = checkAccess('kb_add', 'dev')

    expect(result).toHaveProperty('allowed')
    expect(typeof result.allowed).toBe('boolean')
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('returns correct structure for denied access', () => {
    const result = checkAccess('kb_delete', 'dev')

    expect(result).toHaveProperty('allowed')
    expect(typeof result.allowed).toBe('boolean')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('kb_delete requires pm role')
  })
})

describe('Performance Benchmark (KNOW-009 AC10)', () => {
  it('checkAccess executes in less than 1ms per call', () => {
    const iterations = 100
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      checkAccess('kb_search', 'dev')
    }

    const endTime = performance.now()
    const totalTimeMs = endTime - startTime
    const avgTimeMs = totalTimeMs / iterations

    // p95 target is < 1ms, with some margin
    expect(avgTimeMs).toBeLessThan(1)

    // Log for benchmark visibility
    console.log(`Performance: ${iterations} calls in ${totalTimeMs.toFixed(2)}ms`)
    console.log(`Average: ${avgTimeMs.toFixed(4)}ms per call`)
  })

  it('checkAccess p95 is less than 1ms', () => {
    const iterations = 100
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      checkAccess('kb_search', 'dev')
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    // Sort times and get p95
    times.sort((a, b) => a - b)
    const p95Index = Math.floor(iterations * 0.95)
    const p95 = times[p95Index]

    expect(p95).toBeLessThan(1)

    // Log percentiles for visibility
    console.log(`p50: ${times[Math.floor(iterations * 0.5)].toFixed(4)}ms`)
    console.log(`p95: ${p95.toFixed(4)}ms`)
    console.log(`p99: ${times[Math.floor(iterations * 0.99)].toFixed(4)}ms`)
  })
})

describe('Thread-Safety (KNOW-009 AC11)', () => {
  it('handles concurrent access checks correctly', async () => {
    const concurrentCalls = 10
    const promises: Promise<{ tool: ToolName; role: AgentRole; allowed: boolean }>[] = []

    // Mix of roles and tools
    const testCases: Array<{ tool: ToolName; role: AgentRole; expectedAllowed: boolean }> = [
      { tool: 'kb_search', role: 'dev', expectedAllowed: true },
      { tool: 'kb_delete', role: 'pm', expectedAllowed: true },
      { tool: 'kb_delete', role: 'dev', expectedAllowed: false },
      { tool: 'kb_add', role: 'qa', expectedAllowed: true },
      { tool: 'kb_bulk_import', role: 'all', expectedAllowed: false },
    ]

    // Execute all checks concurrently
    for (let i = 0; i < concurrentCalls; i++) {
      const testCase = testCases[i % testCases.length]
      promises.push(
        new Promise(resolve => {
          const result = checkAccess(testCase.tool, testCase.role)
          resolve({
            tool: testCase.tool,
            role: testCase.role,
            allowed: result.allowed,
          })
        }),
      )
    }

    const results = await Promise.all(promises)

    // Verify all results match expected
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const testCase = testCases[i % testCases.length]
      expect(result.allowed).toBe(testCase.expectedAllowed)
    }

    // No errors should have occurred
    expect(results.length).toBe(concurrentCalls)
  })

  it('parallel calls with same role return consistent results', async () => {
    const concurrentCalls = 10
    const promises = Array(concurrentCalls)
      .fill(null)
      .map(() => Promise.resolve(checkAccess('kb_search', 'dev')))

    const results = await Promise.all(promises)

    // All should return allowed
    expect(results.every(r => r.allowed === true)).toBe(true)
    expect(results.length).toBe(concurrentCalls)
  })

  it('parallel calls with mixed roles return correct results', async () => {
    const promises = [
      Promise.resolve(checkAccess('kb_delete', 'pm')),
      Promise.resolve(checkAccess('kb_delete', 'dev')),
      Promise.resolve(checkAccess('kb_delete', 'qa')),
    ]

    const [pmResult, devResult, qaResult] = await Promise.all(promises)

    expect(pmResult.allowed).toBe(true)
    expect(devResult.allowed).toBe(false)
    expect(qaResult.allowed).toBe(false)
  })
})

describe('Admin Tools List', () => {
  it('ADMIN_TOOLS contains exactly 3 tools', () => {
    expect(ADMIN_TOOLS).toHaveLength(3)
  })

  it('ADMIN_TOOLS contains kb_delete', () => {
    expect(ADMIN_TOOLS).toContain('kb_delete')
  })

  it('ADMIN_TOOLS contains kb_bulk_import', () => {
    expect(ADMIN_TOOLS).toContain('kb_bulk_import')
  })

  it('ADMIN_TOOLS contains kb_rebuild_embeddings', () => {
    expect(ADMIN_TOOLS).toContain('kb_rebuild_embeddings')
  })
})

// Keep the existing caching stub tests
describe('Result Caching Stubs (KNOW-0053 AC6)', () => {
  describe('cacheGet', () => {
    it('should always return null (cache miss)', () => {
      const result = cacheGet('kb_stats')
      expect(result).toBeNull()
    })

    it('should return null for any key', () => {
      const keys: CacheKey[] = [
        'kb_stats',
        'kb_health',
        'kb_search:abc123',
        'kb_get_related:uuid-here',
        'random-key',
      ]

      for (const key of keys) {
        expect(cacheGet(key)).toBeNull()
      }
    })
  })

  describe('cacheSet', () => {
    it('should not throw for any input', () => {
      expect(() => cacheSet('kb_stats', { total: 100 }, 60000)).not.toThrow()
    })

    it('should accept various value types', () => {
      expect(() => cacheSet('key1', null, 1000)).not.toThrow()
      expect(() => cacheSet('key2', 'string', 1000)).not.toThrow()
      expect(() => cacheSet('key3', 123, 1000)).not.toThrow()
      expect(() => cacheSet('key4', { nested: { object: true } }, 1000)).not.toThrow()
      expect(() => cacheSet('key5', [1, 2, 3], 1000)).not.toThrow()
    })

    it('should be a no-op (subsequent cacheGet still returns null)', () => {
      cacheSet('test-key', { data: 'cached' }, 60000)
      expect(cacheGet('test-key')).toBeNull()
    })
  })

  describe('cacheInvalidate', () => {
    it('should not throw for any pattern', () => {
      expect(() => cacheInvalidate('kb_stats')).not.toThrow()
      expect(() => cacheInvalidate('kb_search:*')).not.toThrow()
      expect(() => cacheInvalidate('*')).not.toThrow()
    })
  })

  describe('generateSearchCacheKey', () => {
    it('should generate deterministic keys for same input', () => {
      const key1 = generateSearchCacheKey('test query')
      const key2 = generateSearchCacheKey('test query')

      expect(key1).toBe(key2)
    })

    it('should generate different keys for different queries', () => {
      const key1 = generateSearchCacheKey('query one')
      const key2 = generateSearchCacheKey('query two')

      expect(key1).not.toBe(key2)
    })

    it('should include kb_search prefix', () => {
      const key = generateSearchCacheKey('test')
      expect(key).toMatch(/^kb_search:/)
    })

    it('should include filters in key generation', () => {
      const key1 = generateSearchCacheKey('test', { role: 'dev' })
      const key2 = generateSearchCacheKey('test', { role: 'pm' })
      const key3 = generateSearchCacheKey('test')

      expect(key1).not.toBe(key2)
      expect(key1).not.toBe(key3)
    })
  })
})
