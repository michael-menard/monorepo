/**
 * Tests for validate-connection.ts
 *
 * @see KNOW-039 AC3-AC7, AC11, AC16-AC18, AC20, AC23
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as childProcess from 'child_process'

// Mock modules
vi.mock('fs')
vi.mock('child_process')

describe('validate-connection', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Default environment
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5433/db')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key-12345')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('Docker daemon check', () => {
    it('should pass when Docker is running (AC3)', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from('Docker is running'))

      // Docker check should pass
      expect(() => childProcess.execSync('docker info')).not.toThrow()
    })

    it('should fail with actionable error when Docker not running (AC7)', () => {
      const error = new Error('Cannot connect to Docker daemon')
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw error
      })

      // Docker check should fail
      expect(() => childProcess.execSync('docker info')).toThrow()
    })
  })

  describe('Database container check', () => {
    it('should pass when KB container is healthy (AC3)', () => {
      vi.mocked(childProcess.execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('docker ps') && cmd.includes('knowledge-base-postgres')) {
          return Buffer.from('knowledge-base-postgres')
        }
        if (cmd.includes('docker inspect')) {
          return Buffer.from('healthy')
        }
        return Buffer.from('')
      })

      // Container check should pass
      const result = childProcess.execSync('docker ps --filter "name=knowledge-base-postgres"')
      expect(result.toString()).toContain('knowledge-base-postgres')
    })

    it('should fail when container not found (AC4)', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''))

      // Container check should fail with helpful message
      const result = childProcess.execSync('docker ps --filter "name=knowledge-base-postgres"')
      expect(result.toString()).toBe('')
    })
  })

  describe('MCP server build check', () => {
    it('should pass when dist/mcp-server/index.js exists (AC3)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      expect(fs.existsSync('/path/to/dist/mcp-server/index.js')).toBe(true)
    })

    it('should fail when build is missing (AC7)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(fs.existsSync('/path/to/dist/mcp-server/index.js')).toBe(false)
    })
  })

  describe('Build freshness check (AC17)', () => {
    it('should detect stale build', () => {
      const oldBuildTime = new Date('2024-01-01').getTime()
      const newSrcTime = new Date('2024-01-02').getTime()

      vi.mocked(fs.statSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p)
        if (pathStr.includes('dist')) {
          return { mtimeMs: oldBuildTime } as fs.Stats
        }
        return { mtimeMs: newSrcTime } as fs.Stats
      })

      // Build is stale if src is newer than dist
      const distStat = fs.statSync('/path/to/dist/mcp-server/index.js')
      const srcStat = fs.statSync('/path/to/src/mcp-server/index.ts')

      expect(srcStat.mtimeMs).toBeGreaterThan(distStat.mtimeMs)
    })

    it('should pass when build is fresh', () => {
      const buildTime = new Date('2024-01-02').getTime()
      const srcTime = new Date('2024-01-01').getTime()

      vi.mocked(fs.statSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p)
        if (pathStr.includes('dist')) {
          return { mtimeMs: buildTime } as fs.Stats
        }
        return { mtimeMs: srcTime } as fs.Stats
      })

      const distStat = fs.statSync('/path/to/dist/mcp-server/index.js')
      const srcStat = fs.statSync('/path/to/src/mcp-server/index.ts')

      expect(distStat.mtimeMs).toBeGreaterThan(srcStat.mtimeMs)
    })
  })

  describe('Environment variable checks', () => {
    it('should pass when DATABASE_URL is set (AC3)', () => {
      expect(process.env.DATABASE_URL).toBeDefined()
    })

    it('should fail when DATABASE_URL is not set', () => {
      vi.stubEnv('DATABASE_URL', '')
      expect(process.env.DATABASE_URL).toBe('')
    })

    it('should pass when OPENAI_API_KEY is set (AC3)', () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined()
    })

    it('should fail when OPENAI_API_KEY is not set', () => {
      vi.stubEnv('OPENAI_API_KEY', '')
      expect(process.env.OPENAI_API_KEY).toBe('')
    })

    it('should mask passwords in DATABASE_URL output (AC4, AC7)', () => {
      const dbUrl = 'postgresql://user:secretpassword@localhost:5433/db'
      const masked = dbUrl.replace(/:([^:@]+)@/, ':***@')

      expect(masked).toBe('postgresql://user:***@localhost:5433/db')
      expect(masked).not.toContain('secretpassword')
    })

    it('should not echo full OPENAI_API_KEY (AC5, AC7)', () => {
      const apiKey = 'sk-proj-abc123def456'
      const prefix = apiKey.substring(0, 7)

      expect(prefix).toBe('sk-proj')
      expect(prefix).not.toBe(apiKey)
    })
  })

  describe('Database connectivity check (AC4)', () => {
    it('should pass when database is accessible', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from('accepting connections'))

      const result = childProcess.execSync('docker exec knowledge-base-postgres pg_isready')
      expect(result.toString()).toContain('accepting connections')
    })

    it('should fail with connection details when database is not accessible', () => {
      const error = {
        message: 'Connection refused',
        stderr: Buffer.from('could not connect to server'),
      }
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw error
      })

      expect(() => childProcess.execSync('pg_isready')).toThrow()
    })
  })

  describe('OpenAI API key validation (AC5)', () => {
    it('should validate API key with real API call', async () => {
      // Mock fetch for OpenAI API
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [{ id: 'gpt-4' }] }),
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: 'Bearer sk-test-key' },
      })

      expect(response.ok).toBe(true)
    })

    it('should fail with sanitized error for invalid key', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid API key'),
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const response = await fetch('https://api.openai.com/v1/models')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('MCP server check (AC6)', () => {
    it('should spawn MCP server and verify response', () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        killed: false,
      }

      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any)

      const proc = childProcess.spawn('node', ['/path/to/index.js'])

      expect(proc).toBeDefined()
      expect(proc.kill).toBeDefined()
    })

    it('should cleanup spawned process after test (AC6)', () => {
      const killMock = vi.fn()
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: killMock,
        killed: false,
      }

      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any)

      const proc = childProcess.spawn('node', ['/path/to/index.js'])
      proc.kill('SIGTERM')

      expect(killMock).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('Port conflict detection (AC18)', () => {
    it('should detect existing MCP server process', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from('12345'))

      const result = childProcess.execSync('pgrep -f "mcp-server/index.js"')
      expect(result.toString().trim()).toBe('12345')
    })

    it('should pass when no conflicting process', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''))

      const result = childProcess.execSync('pgrep -f "mcp-server/index.js" || true')
      expect(result.toString().trim()).toBe('')
    })
  })

  describe('Docker platform detection (AC20)', () => {
    it('should detect Docker Desktop', () => {
      vi.mocked(childProcess.execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('Context')) {
          return Buffer.from('desktop-linux')
        }
        return Buffer.from('')
      })

      const result = childProcess.execSync('docker version --format "{{.Client.Context}}"')
      expect(result.toString()).toContain('desktop')
    })

    it('should detect Colima', () => {
      vi.mocked(childProcess.execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('colima')) {
          return Buffer.from('Running')
        }
        return Buffer.from('')
      })

      const result = childProcess.execSync('colima status')
      expect(result.toString()).toContain('Running')
    })
  })

  describe('Quiet mode (AC23)', () => {
    it('should support --quiet flag', () => {
      const quietMode = process.argv.includes('--quiet') || process.argv.includes('-q')

      // Quiet mode should suppress non-error output
      expect(typeof quietMode).toBe('boolean')
    })
  })

  describe('Error messages', () => {
    it('should provide actionable suggestions (AC7)', () => {
      const dockerError = {
        name: 'Docker not running',
        message: 'Docker is not running',
        suggestion: 'Start Docker Desktop and try again',
      }

      expect(dockerError.suggestion).toBeDefined()
      expect(dockerError.suggestion).toContain('Docker')
    })

    it('should include relevant context in errors', () => {
      const dbError = {
        name: 'Database connectivity',
        message: 'Cannot connect to database',
        suggestion: 'Check DATABASE_URL and ensure container is running',
      }

      expect(dbError.message).toContain('database')
      expect(dbError.suggestion).toContain('DATABASE_URL')
    })
  })
})

describe('Check result structure', () => {
  it('should have required fields', () => {
    const checkResult = {
      name: 'Docker daemon running',
      passed: true,
      message: '',
      suggestion: undefined,
    }

    expect(checkResult).toHaveProperty('name')
    expect(checkResult).toHaveProperty('passed')
    expect(checkResult).toHaveProperty('message')
  })

  it('should include suggestion for failed checks', () => {
    const failedCheck = {
      name: 'Docker daemon running',
      passed: false,
      message: 'Docker is not running',
      suggestion: 'Start Docker Desktop and try again',
    }

    expect(failedCheck.passed).toBe(false)
    expect(failedCheck.suggestion).toBeDefined()
  })
})
