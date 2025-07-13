import { describe, it, expect, beforeEach } from 'vitest'
import { resolvers } from './resolvers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUser = (globalThis as any).mockUser;

describe('GraphQL Resolvers', () => {
  beforeEach(() => {
    // Reset any test data if needed
    mockUser.findUnique.mockReset();
    mockUser.findMany.mockReset();
    mockUser.create.mockReset();
    mockUser.update.mockReset();
    mockUser.delete.mockReset();
  })

  it('should create a user', async () => {
    const input = {
      email: 'test@example.com',
      name: 'Test User'
    }
    const createdUser = { ...input, id: '1' };
    mockUser.create.mockResolvedValue(createdUser);

    const result = await resolvers.Mutation.createUser(null, { input })
    
    expect(result).toBeDefined()
    expect(result.email).toBe(input.email)
    expect(result.name).toBe(input.name)
  })

  it('should list users', async () => {
    const users = [{ id: '1', email: 'a', name: 'A' }, { id: '2', email: 'b', name: 'B' }];
    mockUser.findMany.mockResolvedValue(users);
    const result = await resolvers.Query.listUsers()
    
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual(users);
  })
}) 