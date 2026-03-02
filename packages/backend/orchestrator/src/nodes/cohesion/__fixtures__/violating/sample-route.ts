/**
 * Violating sample route handler fixture.
 *
 * This file intentionally violates cohesion conventions for testing:
 * - Uses console.log instead of @repo/logger
 * - Uses TypeScript interface instead of Zod schema
 * - Has a barrel-like re-export pattern
 * - Contains direct DB access in handler
 */

// ❌ Wrong: TypeScript interface instead of Zod schema
interface GetItemRequest {
  id: string
}

// ❌ Wrong: No Zod schema, no type alias pattern
interface GetItemResponse {
  id: string
  name: string
  createdAt: string
}

// ❌ Wrong: bare name without Schema suffix would be caught by Zod naming detector
// (not included here to avoid confusing the interface detector)

// ❌ Wrong: uses console.log
function logRequest(id: string): void {
  console.log('Processing request', id)
  console.warn('This is a warning')
}

// ❌ Wrong: direct DB access in handler function (simulated)
export function getItemHandler(req: GetItemRequest): GetItemResponse {
  logRequest(req.id)

  // Simulated direct DB access — should be in a service layer
  const db = null as any
  const result = db.select().from('items').where('id = ?', req.id)

  console.error('Direct DB access in handler', result)

  return {
    id: req.id,
    name: 'Violating Item',
    createdAt: new Date().toISOString(),
  }
}
