import { logger } from '@repo/logger'
import { z } from 'zod'
import { capabilities, insertCapabilitySchema } from '../schema/index.js'
import type { SeedResult } from './phase-seeder.js'

// Hardcoded list of 7 CRUD capabilities
const CAPABILITIES_DATA = [
  {
    capabilityName: 'create',
    capabilityType: 'business' as const,
    description: 'Create new records',
    maturityLevel: 'stable' as const,
  },
  {
    capabilityName: 'read',
    capabilityType: 'business' as const,
    description: 'View existing records',
    maturityLevel: 'stable' as const,
  },
  {
    capabilityName: 'edit',
    capabilityType: 'business' as const,
    description: 'Modify existing records',
    maturityLevel: 'stable' as const,
  },
  {
    capabilityName: 'delete',
    capabilityType: 'business' as const,
    description: 'Remove existing records',
    maturityLevel: 'stable' as const,
  },
  {
    capabilityName: 'upload',
    capabilityType: 'technical' as const,
    description: 'Upload files or data',
    maturityLevel: 'stable' as const,
  },
  {
    capabilityName: 'replace',
    capabilityType: 'technical' as const,
    description: 'Replace existing data',
    maturityLevel: 'stable' as const,
  },
  {
    capabilityName: 'download',
    capabilityType: 'technical' as const,
    description: 'Download files or data',
    maturityLevel: 'stable' as const,
  },
]

/**
 * Seeds wint.capabilities table with 7 CRUD capabilities
 * @param tx - Database transaction
 * @returns Seed result with row count and warnings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedCapabilities(tx: any): Promise<SeedResult> {
  const warnings: string[] = []

  try {
    // Validate each capability with Zod schema
    const validatedCapabilities: z.infer<typeof insertCapabilitySchema>[] = []
    for (const capability of CAPABILITIES_DATA) {
      const result = insertCapabilitySchema.safeParse(capability)
      if (!result.success) {
        const warning = `Capability ${capability.capabilityName} validation failed: ${result.error.message}`
        logger.warn(warning, { capability, errors: result.error.issues })
        warnings.push(warning)
        continue
      }
      validatedCapabilities.push(result.data)
    }

    if (validatedCapabilities.length === 0) {
      throw new Error('No valid capabilities to seed')
    }

    // Delete existing capabilities (idempotency: DELETE + INSERT)
    await tx.delete(capabilities)
    logger.info('Deleted existing capabilities')

    // Insert new capabilities
    const inserted = await tx.insert(capabilities).values(validatedCapabilities).returning()

    logger.info('Seeded capabilities', {
      rowCount: inserted.length,
      capabilities: inserted.map(c => c.capabilityName),
    })

    return {
      success: true,
      rowCount: inserted.length,
      warnings,
    }
  } catch (err) {
    const error = err as Error
    logger.error('Capability seeding failed', { error: error.message })
    throw error
  }
}
