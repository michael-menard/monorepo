import { describe, it, expect, jest } from '@jest/globals';
import { users } from '../db/schema';

// Mock the database client
jest.mock('../db/client', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}));

describe('Profile Schema', () => {
  it('should have bio field in users table', () => {
    // Check that the bio field exists in the schema
    expect(users.bio).toBeDefined();
    expect(users.bio.name).toBe('bio');
  });

  it('should have avatarUrl field in users table', () => {
    // Check that the avatarUrl field exists in the schema
    expect(users.avatarUrl).toBeDefined();
    expect(users.avatarUrl.name).toBe('avatar_url');
  });

  it('should have nullable bio and avatarUrl fields', () => {
    // Check that bio field is nullable (not required)
    expect(users.bio.notNull).toBe(false);
    
    // Check that avatarUrl field is nullable (not required)
    expect(users.avatarUrl.notNull).toBe(false);
  });

  it('should maintain existing required fields', () => {
    // Check that existing required fields are still required
    expect(users.createdAt.notNull).toBe(true);
    expect(users.updatedAt.notNull).toBe(true);
  });
}); 