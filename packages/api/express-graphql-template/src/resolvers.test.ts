// Mock PrismaClient at the very top before any imports
const mockUser = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => ({ user: mockUser })),
  };
});

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolvers } from './resolvers'

describe('GraphQL Resolvers', () => {
  beforeEach(() => {
    // Reset any test data if needed
    vi.clearAllMocks();
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