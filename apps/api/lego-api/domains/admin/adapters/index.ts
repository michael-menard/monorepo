/**
 * Admin Domain Adapters
 *
 * Infrastructure implementations for the admin domain.
 */

export { createCognitoUserClient } from './cognito-client.js'
export { createAuditLogRepository, createUserQuotaReadRepository } from './repositories.js'
