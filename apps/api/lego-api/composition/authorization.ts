/**
 * Authorization Composition
 *
 * Creates the authorization service with its dependencies.
 * Separated from routes to avoid circular dependencies with middleware.
 */

import {
  createUserQuotaRepository,
  createUserAddonRepository,
} from '../domains/authorization/adapters/index.js'
import { createAuthorizationService } from '../domains/authorization/application/index.js'
import { db, schema } from './database.js'

// Create repositories
const quotaRepo = createUserQuotaRepository(db, schema)
const addonRepo = createUserAddonRepository(db, schema)

// Create and export the authorization service
export const authorizationService = createAuthorizationService({
  quotaRepo,
  addonRepo,
})

export type { AuthorizationService } from '../domains/authorization/application/index.js'
