/**
 * Security Module
 *
 * Security utilities and adapters for the lego-api.
 */

export {
  // Schemas
  ScanResultSchema,
  ScanResultCleanSchema,
  ScanResultInfectedSchema,
  ScanResultErrorSchema,
  QuarantineActionSchema,
  // Types
  type ScanResult,
  type ScanResultClean,
  type ScanResultInfected,
  type ScanResultError,
  type QuarantineAction,
  type VirusScannerPort,
  type MockVirusScannerConfig,
  // Factories
  createVirusScanner,
  createClamAVVirusScanner,
  createMockVirusScanner,
} from './virus-scanner.js'
