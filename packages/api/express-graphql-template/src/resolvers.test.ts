import { describe, it, expect, beforeEach } from 'vitest'
import { resolvers } from '../resolvers'

describe('GraphQL Resolvers', () => {
  beforeEach(() => {
    // Reset any test data if needed
  })

  it('should create a user', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User'
    }

    const result = await resolvers.Mutation.createUser(null, { input })
    
    expect(result).toBeDefined()
    expect(result.email).toBe(input.email)
    expect(result.name).toBe(input.name)
  })

  it('should list users', async () => {
    const result = await resolvers.Query.listUsers()
    
    expect(Array.isArray(result)).toBe(true)
  })
}) 