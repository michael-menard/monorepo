/**
 * Mock User Data for Tests
 */

export const mockUsers = {
  user1: {
    id: 'user-123',
    email: 'user1@example.com',
    cognitoSub: 'cognito-sub-123',
  },
  user2: {
    id: 'user-456',
    email: 'user2@example.com',
    cognitoSub: 'cognito-sub-456',
  },
}

/**
 * Mock JWT Claims
 */
export const mockJwtClaims = {
  user1: {
    sub: 'user-123',
    email: 'user1@example.com',
    'cognito:username': 'user1',
  },
  user2: {
    sub: 'user-456',
    email: 'user2@example.com',
    'cognito:username': 'user2',
  },
}

/**
 * Mock JWT Tokens (base64 encoded)
 */
export const mockJwtTokens = {
  user1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidXNlcjFAZXhhbXBsZS5jb20ifQ.mock',
  user2: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQ1NiIsImVtYWlsIjoidXNlcjJAZXhhbXBsZS5jb20ifQ.mock',
}
