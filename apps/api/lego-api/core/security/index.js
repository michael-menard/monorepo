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
  // Factories
  createVirusScanner,
  createClamAVVirusScanner,
  createMockVirusScanner,
} from './virus-scanner.js'
