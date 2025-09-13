/**
 * Test Users for Auth E2E Tests
 * 
 * This file contains user data for testing the auth flow.
 * These users should be seeded in the database before running tests.
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  bio?: string;
}

// Main test users for automated testing
export const TEST_USERS = {
  // Standard test user
  STANDARD: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'Automated test user for E2E testing',
  },

  // Admin test user
  ADMIN: {
    name: 'Admin Test',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    isVerified: true,
    role: 'admin' as const,
    bio: 'Admin test user for E2E testing',
  },

  // Unverified user for testing verification flows
  UNVERIFIED: {
    name: 'Mr. Garrison',
    email: 'mr.garrison@southpark.co',
    password: 'SouthPark123!',
    isVerified: false,
    role: 'user' as const,
    bio: 'I\'m a teacher at South Park Elementary. Mkay?',
  },
} as const;

// South Park characters for fun testing
export const SOUTH_PARK_USERS = {
  STAN: {
    name: 'Stan Marsh',
    email: 'stan.marsh@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'I\'m just a regular kid from South Park. Oh my God, they killed Kenny!',
  },

  KYLE: {
    name: 'Kyle Broflovski',
    email: 'kyle.broflovski@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'Smart kid from South Park. I wear a green hat and care about doing the right thing.',
  },

  CARTMAN: {
    name: 'Eric Cartman',
    email: 'eric.cartman@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'Respect my authoritah! I\'m the coolest kid in South Park.',
  },

  KENNY: {
    name: 'Kenny McCormick',
    email: 'kenny.mccormick@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'Mmmph mmmph mmmph! (I die a lot but always come back)',
  },

  BUTTERS: {
    name: 'Butters Stotch',
    email: 'butters.stotch@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'Oh hamburgers! I\'m just trying to be a good kid and not get grounded.',
  },

  WENDY: {
    name: 'Wendy Testaburger',
    email: 'wendy.testaburger@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'user' as const,
    bio: 'Student body president and activist. I care about important issues.',
  },

  RANDY: {
    name: 'Randy Marsh',
    email: 'randy.marsh@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'admin' as const,
    bio: 'I\'m a geologist and Stan\'s dad. I thought this was America!',
  },

  CHEF: {
    name: 'Chef Jerome',
    email: 'chef@southpark.co',
    password: 'SouthPark123!',
    isVerified: true,
    role: 'admin' as const,
    bio: 'Hello there children! I\'m the school chef and I love to sing.',
  },
} as const;

// All users combined for easy access
export const ALL_TEST_USERS = {
  ...TEST_USERS,
  ...SOUTH_PARK_USERS,
} as const;

// Helper functions for tests
export function getRandomUser(): TestUser {
  const users = Object.values(ALL_TEST_USERS);
  return users[Math.floor(Math.random() * users.length)];
}

export function getVerifiedUser(): TestUser {
  const users = Object.values(ALL_TEST_USERS).filter(user => user.isVerified);
  return users[Math.floor(Math.random() * users.length)];
}

export function getUnverifiedUser(): TestUser {
  const users = Object.values(ALL_TEST_USERS).filter(user => !user.isVerified);
  return users[Math.floor(Math.random() * users.length)];
}

export function getAdminUser(): TestUser {
  const users = Object.values(ALL_TEST_USERS).filter(user => user.role === 'admin');
  return users[Math.floor(Math.random() * users.length)];
}

export function getUserByEmail(email: string): TestUser | undefined {
  return Object.values(ALL_TEST_USERS).find(user => user.email === email);
}

// Default user for most tests (reliable and verified)
export const DEFAULT_TEST_USER = TEST_USERS.STANDARD;

// User for admin tests
export const DEFAULT_ADMIN_USER = TEST_USERS.ADMIN;

// User for verification tests
export const DEFAULT_UNVERIFIED_USER = TEST_USERS.UNVERIFIED;

// Fun user for manual testing
export const DEFAULT_FUN_USER = SOUTH_PARK_USERS.STAN;

// Export types
export type { TestUser };

// Validation helpers
export function isValidTestUser(user: any): user is TestUser {
  return (
    typeof user === 'object' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.password === 'string' &&
    typeof user.isVerified === 'boolean' &&
    (user.role === 'user' || user.role === 'admin')
  );
}

// Password validation for tests
export function isValidPassword(password: string): boolean {
  // Must be at least 8 characters with uppercase, lowercase, number, and special char
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

// Email validation for tests
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate all test users (for development checks)
export function validateAllTestUsers(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  Object.entries(ALL_TEST_USERS).forEach(([key, user]) => {
    if (!isValidTestUser(user)) {
      errors.push(`${key}: Invalid user structure`);
    }
    
    if (!isValidEmail(user.email)) {
      errors.push(`${key}: Invalid email format`);
    }
    
    if (!isValidPassword(user.password)) {
      errors.push(`${key}: Invalid password format`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Development helper to check all users
if (process.env.NODE_ENV === 'development') {
  const validation = validateAllTestUsers();
  if (!validation.valid) {
    console.warn('⚠️  Test user validation errors:', validation.errors);
  }
}
