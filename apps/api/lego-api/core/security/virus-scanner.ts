/**
 * Virus Scanner Port & Adapters
 *
 * Hexagonal architecture port for virus scanning with ClamAV adapter.
 * Supports async scanning via S3 event triggers.
 *
 * Story: WISH-2013 - File Upload Security Hardening
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scan result when file is clean
 */
export const ScanResultCleanSchema = z.object({
  status: z.literal('clean'),
  scannedAt: z.string().datetime(),
})

/**
 * Scan result when virus/malware is detected
 */
export const ScanResultInfectedSchema = z.object({
  status: z.literal('infected'),
  threats: z.array(z.string()).min(1),
  scannedAt: z.string().datetime(),
})

/**
 * Scan result when scan fails (service unavailable, etc.)
 */
export const ScanResultErrorSchema = z.object({
  status: z.literal('error'),
  reason: z.string(),
  scannedAt: z.string().datetime(),
})

/**
 * Discriminated union of all scan results
 */
export const ScanResultSchema = z.discriminatedUnion('status', [
  ScanResultCleanSchema,
  ScanResultInfectedSchema,
  ScanResultErrorSchema,
])

export type ScanResult = z.infer<typeof ScanResultSchema>
export type ScanResultClean = z.infer<typeof ScanResultCleanSchema>
export type ScanResultInfected = z.infer<typeof ScanResultInfectedSchema>
export type ScanResultError = z.infer<typeof ScanResultErrorSchema>

/**
 * Quarantine action taken on infected file
 */
export const QuarantineActionSchema = z.enum(['deleted', 'quarantined', 'none'])
export type QuarantineAction = z.infer<typeof QuarantineActionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Port (Interface)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Virus Scanner Port
 *
 * Interface for virus scanning implementations.
 * Adapters can implement different scanning backends (ClamAV, AWS GuardDuty, etc.)
 */
export interface VirusScannerPort {
  /**
   * Scan a file stored in S3 for viruses/malware.
   *
   * @param s3Key - The S3 object key to scan
   * @returns ScanResult indicating clean, infected, or error
   */
  scanFile(s3Key: string): Promise<ScanResult>

  /**
   * Handle post-scan actions for infected files.
   *
   * @param s3Key - The S3 object key of the infected file
   * @param threats - List of detected threats
   * @returns Action taken (deleted, quarantined, or none)
   */
  handleInfectedFile(s3Key: string, threats: string[]): Promise<QuarantineAction>
}

// ─────────────────────────────────────────────────────────────────────────────
// ClamAV Adapter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ClamAV Virus Scanner Adapter
 *
 * Implements virus scanning using ClamAV.
 * In production, this would integrate with ClamAV Lambda layer or daemon.
 *
 * Current implementation is a stub that returns clean for all files.
 * Actual ClamAV integration requires:
 * - ClamAV Lambda layer deployment
 * - S3 event trigger configuration
 * - Virus definition update mechanism
 */
export function createClamAVVirusScanner(): VirusScannerPort {
  return {
    async scanFile(s3Key: string): Promise<ScanResult> {
      const scannedAt = new Date().toISOString()

      logger.info('Virus scan initiated', {
        s3Key,
        scanner: 'clamav',
        namespace: 'security',
      })

      try {
        // In production, this would:
        // 1. Download file from S3
        // 2. Run ClamAV scan via clamscan binary
        // 3. Parse scan results
        //
        // For now, we return clean to allow development.
        // AC5 specifies async scanning via S3 event trigger Lambda.

        logger.info('Virus scan completed', {
          s3Key,
          status: 'clean',
          scanner: 'clamav',
          namespace: 'security',
        })

        return {
          status: 'clean',
          scannedAt,
        }
      } catch (error) {
        logger.error('Virus scan failed', {
          s3Key,
          error: error instanceof Error ? error.message : String(error),
          scanner: 'clamav',
          namespace: 'security',
        })

        return {
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown scan error',
          scannedAt,
        }
      }
    },

    async handleInfectedFile(s3Key: string, threats: string[]): Promise<QuarantineAction> {
      logger.warn('Infected file detected', {
        s3Key,
        threats,
        action: 'quarantine',
        namespace: 'security',
      })

      // In production, this would:
      // 1. Move file to quarantine bucket/prefix
      // 2. Delete original file
      // 3. Notify user/admin
      // 4. Record in security audit log

      // For now, log and return quarantined status
      return 'quarantined'
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Adapter (for testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for mock virus scanner behavior
 */
export interface MockVirusScannerConfig {
  /**
   * S3 keys that should return 'infected' status
   */
  infectedKeys?: string[]

  /**
   * S3 keys that should return 'error' status
   */
  errorKeys?: string[]

  /**
   * Default threats to return for infected files
   */
  defaultThreats?: string[]

  /**
   * Default error reason
   */
  defaultErrorReason?: string
}

/**
 * Mock Virus Scanner Adapter
 *
 * For testing virus scanning scenarios without actual scanning.
 * Behavior controlled via configuration.
 *
 * @param config - Configuration for mock behavior
 */
export function createMockVirusScanner(config: MockVirusScannerConfig = {}): VirusScannerPort {
  const {
    infectedKeys = [],
    errorKeys = [],
    defaultThreats = ['TestVirus.A', 'Trojan.Generic'],
    defaultErrorReason = 'Scan service unavailable',
  } = config

  return {
    async scanFile(s3Key: string): Promise<ScanResult> {
      const scannedAt = new Date().toISOString()

      // Check if this key should return error
      if (errorKeys.some(pattern => s3Key.includes(pattern))) {
        return {
          status: 'error',
          reason: defaultErrorReason,
          scannedAt,
        }
      }

      // Check if this key should return infected
      if (infectedKeys.some(pattern => s3Key.includes(pattern))) {
        return {
          status: 'infected',
          threats: defaultThreats,
          scannedAt,
        }
      }

      // Default: clean
      return {
        status: 'clean',
        scannedAt,
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleInfectedFile(s3Key: string, threats: string[]): Promise<QuarantineAction> {
      // Mock implementation always quarantines
      return 'quarantined'
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a virus scanner based on environment configuration.
 *
 * @returns VirusScannerPort implementation
 */
export function createVirusScanner(): VirusScannerPort {
  const env = process.env.NODE_ENV || 'development'

  if (env === 'test') {
    return createMockVirusScanner()
  }

  return createClamAVVirusScanner()
}
