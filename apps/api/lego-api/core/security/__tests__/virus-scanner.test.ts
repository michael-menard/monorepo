/**
 * Virus Scanner Tests
 *
 * Story: WISH-2013 - File Upload Security Hardening
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createClamAVVirusScanner,
  createMockVirusScanner,
  createVirusScanner,
  ScanResultSchema,
  type ScanResult,
} from '../virus-scanner.js'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('ClamAV Virus Scanner', () => {
  let scanner: ReturnType<typeof createClamAVVirusScanner>

  beforeEach(() => {
    vi.clearAllMocks()
    scanner = createClamAVVirusScanner()
  })

  describe('scanFile', () => {
    it('should return clean result for valid file', async () => {
      const result = await scanner.scanFile('uploads/test-user/image.jpg')

      expect(result.status).toBe('clean')
      expect(result).toHaveProperty('scannedAt')

      // Validate against schema
      const parsed = ScanResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('should include timestamp in scan result', async () => {
      const before = new Date().toISOString()
      const result = await scanner.scanFile('uploads/test.jpg')
      const after = new Date().toISOString()

      if (result.status === 'clean') {
        expect(result.scannedAt >= before).toBe(true)
        expect(result.scannedAt <= after).toBe(true)
      }
    })

    it('should log scan initiation', async () => {
      const { logger } = await import('@repo/logger')
      await scanner.scanFile('uploads/user-123/test.jpg')

      expect(logger.info).toHaveBeenCalledWith(
        'Virus scan initiated',
        expect.objectContaining({
          s3Key: 'uploads/user-123/test.jpg',
          scanner: 'clamav',
        }),
      )
    })

    it('should log scan completion', async () => {
      const { logger } = await import('@repo/logger')
      await scanner.scanFile('uploads/test.jpg')

      expect(logger.info).toHaveBeenCalledWith(
        'Virus scan completed',
        expect.objectContaining({
          status: 'clean',
          scanner: 'clamav',
        }),
      )
    })
  })

  describe('handleInfectedFile', () => {
    it('should return quarantined action for infected files', async () => {
      const action = await scanner.handleInfectedFile('uploads/malware.exe', ['TestVirus.A'])

      expect(action).toBe('quarantined')
    })

    it('should log infected file detection', async () => {
      const { logger } = await import('@repo/logger')
      await scanner.handleInfectedFile('uploads/virus.exe', ['Trojan.Generic', 'Malware.Test'])

      expect(logger.warn).toHaveBeenCalledWith(
        'Infected file detected',
        expect.objectContaining({
          s3Key: 'uploads/virus.exe',
          threats: ['Trojan.Generic', 'Malware.Test'],
          action: 'quarantine',
        }),
      )
    })
  })
})

describe('Mock Virus Scanner', () => {
  describe('default behavior', () => {
    it('should return clean for all files by default', async () => {
      const scanner = createMockVirusScanner()
      const result = await scanner.scanFile('uploads/any-file.jpg')

      expect(result.status).toBe('clean')
    })
  })

  describe('infected files', () => {
    it('should return infected for configured keys', async () => {
      const scanner = createMockVirusScanner({
        infectedKeys: ['malware', 'virus'],
      })

      const result = await scanner.scanFile('uploads/malware.exe')

      expect(result.status).toBe('infected')
      if (result.status === 'infected') {
        expect(result.threats.length).toBeGreaterThan(0)
      }
    })

    it('should use custom threats when configured', async () => {
      const scanner = createMockVirusScanner({
        infectedKeys: ['infected'],
        defaultThreats: ['CustomVirus.A', 'CustomTrojan.B'],
      })

      const result = await scanner.scanFile('uploads/infected-file.jpg')

      expect(result.status).toBe('infected')
      if (result.status === 'infected') {
        expect(result.threats).toEqual(['CustomVirus.A', 'CustomTrojan.B'])
      }
    })

    it('should match partial key patterns', async () => {
      const scanner = createMockVirusScanner({
        infectedKeys: ['test-infected'],
      })

      const result = await scanner.scanFile('uploads/user-123/test-infected-image.jpg')

      expect(result.status).toBe('infected')
    })
  })

  describe('error simulation', () => {
    it('should return error for configured error keys', async () => {
      const scanner = createMockVirusScanner({
        errorKeys: ['scan-error'],
      })

      const result = await scanner.scanFile('uploads/scan-error-file.jpg')

      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.reason).toBe('Scan service unavailable')
      }
    })

    it('should use custom error reason when configured', async () => {
      const scanner = createMockVirusScanner({
        errorKeys: ['timeout'],
        defaultErrorReason: 'Scan timeout exceeded',
      })

      const result = await scanner.scanFile('uploads/timeout-test.jpg')

      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.reason).toBe('Scan timeout exceeded')
      }
    })
  })

  describe('handleInfectedFile', () => {
    it('should always return quarantined', async () => {
      const scanner = createMockVirusScanner()
      const action = await scanner.handleInfectedFile('uploads/test.exe', ['TestVirus'])

      expect(action).toBe('quarantined')
    })
  })
})

describe('createVirusScanner factory', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should create mock scanner in test environment', () => {
    process.env.NODE_ENV = 'test'
    const scanner = createVirusScanner()

    // Mock scanner returns clean by default (can verify by behavior)
    expect(scanner).toBeDefined()
    expect(typeof scanner.scanFile).toBe('function')
  })

  it('should create ClamAV scanner in production', () => {
    process.env.NODE_ENV = 'production'
    const scanner = createVirusScanner()

    expect(scanner).toBeDefined()
    expect(typeof scanner.scanFile).toBe('function')
  })

  it('should create ClamAV scanner in development', () => {
    process.env.NODE_ENV = 'development'
    const scanner = createVirusScanner()

    expect(scanner).toBeDefined()
  })
})

describe('ScanResult schema validation', () => {
  it('should validate clean result', () => {
    const cleanResult: ScanResult = {
      status: 'clean',
      scannedAt: new Date().toISOString(),
    }

    const parsed = ScanResultSchema.safeParse(cleanResult)
    expect(parsed.success).toBe(true)
  })

  it('should validate infected result', () => {
    const infectedResult: ScanResult = {
      status: 'infected',
      threats: ['TestVirus.A'],
      scannedAt: new Date().toISOString(),
    }

    const parsed = ScanResultSchema.safeParse(infectedResult)
    expect(parsed.success).toBe(true)
  })

  it('should validate error result', () => {
    const errorResult: ScanResult = {
      status: 'error',
      reason: 'Service unavailable',
      scannedAt: new Date().toISOString(),
    }

    const parsed = ScanResultSchema.safeParse(errorResult)
    expect(parsed.success).toBe(true)
  })

  it('should reject invalid status', () => {
    const invalidResult = {
      status: 'unknown',
      scannedAt: new Date().toISOString(),
    }

    const parsed = ScanResultSchema.safeParse(invalidResult)
    expect(parsed.success).toBe(false)
  })

  it('should reject infected result without threats', () => {
    const invalidResult = {
      status: 'infected',
      threats: [],
      scannedAt: new Date().toISOString(),
    }

    const parsed = ScanResultSchema.safeParse(invalidResult)
    expect(parsed.success).toBe(false)
  })
})
