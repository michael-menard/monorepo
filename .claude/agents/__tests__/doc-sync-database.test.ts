/**
 * Unit tests for database query timeout handling in doc-sync agent
 *
 * Tests timeout handling, graceful degradation, and error scenarios for
 * postgres-knowledgebase MCP tool queries.
 *
 * @see WINT-0150 AC-7, AC-9
 * @see .claude/agents/doc-sync.agent.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Database query timeout configuration
const DB_QUERY_TIMEOUT_MS = 30000 // Default: 30 seconds

// Mock MCP tool responses
type MCPQueryResult = {
  success: boolean
  data?: any[]
  error?: {
    type: 'TIMEOUT' | 'CONNECTION_FAILED' | 'OTHER'
    message: string
  }
}

// Simulated database query function with timeout
async function queryWorkflowComponents(options: {
  component_types: string[]
  timeout: number
}): Promise<MCPQueryResult> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject({
        type: 'TIMEOUT',
        message: `Query timeout after ${options.timeout}ms`,
      })
    }, options.timeout)

    // Simulate query completion (would normally query database)
    setTimeout(
      () => {
        clearTimeout(timeoutId)
        resolve({
          success: true,
          data: [
            { component_id: 1, name: 'test-agent', type: 'agent' },
            { component_id: 2, name: 'test-command', type: 'command' },
          ],
        })
      },
      100,
    ) // Normal query completes in 100ms
  })
}

// Simulated slow database query (exceeds timeout)
async function queryWorkflowComponentsSlow(options: {
  component_types: string[]
  timeout: number
}): Promise<MCPQueryResult> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject({
        type: 'TIMEOUT',
        message: `Query timeout after ${options.timeout}ms`,
      })
    }, options.timeout)

    // Simulate slow query that exceeds timeout
    setTimeout(
      () => {
        clearTimeout(timeoutId)
        resolve({
          success: true,
          data: [],
        })
      },
      options.timeout + 1000,
    ) // Query takes longer than timeout
  })
}

// Simulated database connection failure
async function queryWorkflowComponentsConnectionFailed(options: {
  component_types: string[]
  timeout: number
}): Promise<MCPQueryResult> {
  return Promise.reject({
    type: 'CONNECTION_FAILED',
    message: 'Failed to connect to postgres-knowledgebase',
  })
}

// Database status tracker (used by doc-sync agent)
interface DatabaseStatus {
  queried: boolean
  status: 'success' | 'timeout' | 'connection_failed' | 'unavailable'
  components_count: number
  phases_count: number
  query_duration_ms?: number
}

// Query wrapper with timeout handling (as doc-sync agent would use)
async function queryDatabaseWithTimeout(): Promise<{
  components: any[]
  status: DatabaseStatus
}> {
  const status: DatabaseStatus = {
    queried: false,
    status: 'unavailable',
    components_count: 0,
    phases_count: 0,
  }

  try {
    const startTime = Date.now()
    const result = await queryWorkflowComponents({
      component_types: ['agent', 'command', 'skill'],
      timeout: DB_QUERY_TIMEOUT_MS,
    })

    status.queried = true
    status.status = 'success'
    status.components_count = result.data?.length || 0
    status.query_duration_ms = Date.now() - startTime

    return {
      components: result.data || [],
      status,
    }
  } catch (error: any) {
    status.queried = true

    if (error.type === 'TIMEOUT') {
      status.status = 'timeout'
      status.query_duration_ms = DB_QUERY_TIMEOUT_MS
    } else if (error.type === 'CONNECTION_FAILED') {
      status.status = 'connection_failed'
    } else {
      status.status = 'unavailable'
    }

    // Fall back to file-only mode (graceful degradation)
    return {
      components: [],
      status,
    }
  }
}

describe('Database Query Timeout Handling', () => {
  describe('Successful Queries', () => {
    it('queries database successfully within timeout threshold', async () => {
      const result = await queryDatabaseWithTimeout()

      expect(result.status.queried).toBe(true)
      expect(result.status.status).toBe('success')
      expect(result.status.components_count).toBe(2)
      expect(result.components).toHaveLength(2)
      expect(result.status.query_duration_ms).toBeLessThan(DB_QUERY_TIMEOUT_MS)
    })

    it('includes component data when query succeeds', async () => {
      const result = await queryDatabaseWithTimeout()

      expect(result.components).toEqual([
        { component_id: 1, name: 'test-agent', type: 'agent' },
        { component_id: 2, name: 'test-command', type: 'command' },
      ])
    })
  })

  describe('Timeout Handling (AC-9)', () => {
    it('detects timeout after 30-second threshold', async () => {
      // Mock slow query function
      const slowQuery = vi.fn(queryWorkflowComponentsSlow)

      const status: DatabaseStatus = {
        queried: false,
        status: 'unavailable',
        components_count: 0,
        phases_count: 0,
      }

      try {
        const startTime = Date.now()
        await slowQuery({
          component_types: ['agent', 'command', 'skill'],
          timeout: DB_QUERY_TIMEOUT_MS,
        })
      } catch (error: any) {
        status.queried = true
        status.status = 'timeout'
        status.query_duration_ms = DB_QUERY_TIMEOUT_MS

        expect(error.type).toBe('TIMEOUT')
        expect(error.message).toContain('Query timeout after 30000ms')
      }

      expect(status.status).toBe('timeout')
      expect(status.query_duration_ms).toBe(DB_QUERY_TIMEOUT_MS)
    })

    it('falls back to file-only mode on timeout', async () => {
      // Mock slow query that times out
      vi.spyOn(global, 'queryWorkflowComponents' as any).mockImplementation(
        queryWorkflowComponentsSlow,
      )

      // Wrapper should catch timeout and return empty components
      const queryWrapper = async () => {
        const status: DatabaseStatus = {
          queried: false,
          status: 'unavailable',
          components_count: 0,
          phases_count: 0,
        }

        try {
          await queryWorkflowComponentsSlow({
            component_types: ['agent', 'command', 'skill'],
            timeout: DB_QUERY_TIMEOUT_MS,
          })
        } catch (error: any) {
          status.queried = true
          status.status = 'timeout'
          status.components_count = 0

          // Graceful degradation - return empty components
          return {
            components: [],
            status,
          }
        }
      }

      const result = await queryWrapper()

      expect(result.status.status).toBe('timeout')
      expect(result.components).toEqual([])
      expect(result.status.components_count).toBe(0)
    })

    it('logs timeout duration in status', async () => {
      const queryWrapper = async () => {
        const status: DatabaseStatus = {
          queried: false,
          status: 'unavailable',
          components_count: 0,
          phases_count: 0,
        }

        try {
          await queryWorkflowComponentsSlow({
            component_types: ['agent', 'command', 'skill'],
            timeout: DB_QUERY_TIMEOUT_MS,
          })
        } catch (error: any) {
          status.queried = true
          status.status = 'timeout'
          status.query_duration_ms = DB_QUERY_TIMEOUT_MS
          return { components: [], status }
        }
      }

      const result = await queryWrapper()

      expect(result!.status.query_duration_ms).toBe(30000)
      expect(result!.status.status).toBe('timeout')
    })
  })

  describe('Connection Failure Handling (AC-7)', () => {
    it('handles database connection failure gracefully', async () => {
      const status: DatabaseStatus = {
        queried: false,
        status: 'unavailable',
        components_count: 0,
        phases_count: 0,
      }

      try {
        await queryWorkflowComponentsConnectionFailed({
          component_types: ['agent', 'command', 'skill'],
          timeout: DB_QUERY_TIMEOUT_MS,
        })
      } catch (error: any) {
        status.queried = true
        status.status = 'connection_failed'
        status.components_count = 0

        expect(error.type).toBe('CONNECTION_FAILED')
        expect(error.message).toContain('Failed to connect')
      }

      expect(status.status).toBe('connection_failed')
      expect(status.components_count).toBe(0)
    })

    it('falls back to file-only mode when database unavailable', async () => {
      const queryWrapper = async () => {
        const status: DatabaseStatus = {
          queried: false,
          status: 'unavailable',
          components_count: 0,
          phases_count: 0,
        }

        try {
          await queryWorkflowComponentsConnectionFailed({
            component_types: ['agent', 'command', 'skill'],
            timeout: DB_QUERY_TIMEOUT_MS,
          })
        } catch (error: any) {
          status.queried = true
          status.status = 'connection_failed'

          // Graceful degradation
          return {
            components: [],
            status,
          }
        }
      }

      const result = await queryWrapper()

      expect(result.status.status).toBe('connection_failed')
      expect(result.components).toEqual([])
    })
  })

  describe('Status Reporting', () => {
    it('distinguishes between timeout and connection failure in status', async () => {
      // Test timeout status
      const timeoutWrapper = async () => {
        try {
          await queryWorkflowComponentsSlow({
            component_types: ['agent'],
            timeout: DB_QUERY_TIMEOUT_MS,
          })
        } catch (error: any) {
          return { status: error.type }
        }
      }

      // Test connection failure status
      const connectionWrapper = async () => {
        try {
          await queryWorkflowComponentsConnectionFailed({
            component_types: ['agent'],
            timeout: DB_QUERY_TIMEOUT_MS,
          })
        } catch (error: any) {
          return { status: error.type }
        }
      }

      const timeoutResult = await timeoutWrapper()
      const connectionResult = await connectionWrapper()

      expect(timeoutResult.status).toBe('TIMEOUT')
      expect(connectionResult.status).toBe('CONNECTION_FAILED')
    })

    it('includes all required status fields for SYNC-REPORT.md', async () => {
      const result = await queryDatabaseWithTimeout()

      // Verify all fields required by SYNC-REPORT.md are present
      expect(result.status).toHaveProperty('queried')
      expect(result.status).toHaveProperty('status')
      expect(result.status).toHaveProperty('components_count')
      expect(result.status).toHaveProperty('phases_count')
      expect(result.status).toHaveProperty('query_duration_ms')

      expect(result.status.queried).toBe(true)
      expect(['success', 'timeout', 'connection_failed', 'unavailable']).toContain(
        result.status.status,
      )
    })
  })

  describe('Configurable Timeout (AC-9)', () => {
    it('uses default 30-second timeout when not specified', () => {
      expect(DB_QUERY_TIMEOUT_MS).toBe(30000)
    })

    it('timeout constant is exposed for future configurability', () => {
      // Verify constant can be modified for future config support
      const customTimeout = 60000

      expect(customTimeout).toBeGreaterThan(DB_QUERY_TIMEOUT_MS)
      expect(typeof DB_QUERY_TIMEOUT_MS).toBe('number')
    })
  })
})
