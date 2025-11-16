/**
 * Unit Tests for JWT Authentication Utilities
 *
 * Tests JWT claim extraction from API Gateway v2 events.
 * Focus: Claim extraction, null safety, error handling, Cognito integration.
 */

import { describe, it, expect } from 'vitest'
import { APIGatewayProxyEventV2 } from 'aws-lambda'
import {
  getUserIdFromEvent,
  getEmailFromEvent,
  getUsernameFromEvent,
  getJwtClaims,
} from '../jwt-utils'

describe('JWT Authentication Utilities', () => {
  describe('getUserIdFromEvent()', () => {
    it('should extract user ID from JWT claims', () => {
      // Given: API Gateway event with JWT authorizer
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123-456-789',
                email: 'user@example.com',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting user ID
      const userId = getUserIdFromEvent(event)

      // Then: Returns Cognito sub claim
      expect(userId).toBe('user-123-456-789')
    })

    it('should return null when no authorizer present', () => {
      // Given: Event without authorizer
      const event = {
        requestContext: {},
      } as any as APIGatewayProxyEventV2

      // When: Extracting user ID
      const userId = getUserIdFromEvent(event)

      // Then: Returns null
      expect(userId).toBeNull()
    })

    it('should return null when JWT claims missing', () => {
      // Given: Event with authorizer but no JWT claims
      const event = {
        requestContext: {
          authorizer: {},
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting user ID
      const userId = getUserIdFromEvent(event)

      // Then: Returns null
      expect(userId).toBeNull()
    })

    it('should return null when sub claim is empty', () => {
      // Given: Event with empty sub claim
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: '',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting user ID
      const userId = getUserIdFromEvent(event)

      // Then: Returns null
      expect(userId).toBeNull()
    })

    it('should handle malformed event gracefully', () => {
      // Given: Malformed event
      const event = null as any as APIGatewayProxyEventV2

      // When: Extracting user ID
      const userId = getUserIdFromEvent(event)

      // Then: Returns null without throwing
      expect(userId).toBeNull()
    })
  })

  describe('getEmailFromEvent()', () => {
    it('should extract email from JWT claims', () => {
      // Given: API Gateway event with email in JWT
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
                email: 'user@example.com',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting email
      const email = getEmailFromEvent(event)

      // Then: Returns email from claims
      expect(email).toBe('user@example.com')
    })

    it('should return null when email not in claims', () => {
      // Given: Event without email claim
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting email
      const email = getEmailFromEvent(event)

      // Then: Returns null
      expect(email).toBeNull()
    })

    it('should return null when no authorizer present', () => {
      // Given: Event without authorizer
      const event = {
        requestContext: {},
      } as any as APIGatewayProxyEventV2

      // When: Extracting email
      const email = getEmailFromEvent(event)

      // Then: Returns null
      expect(email).toBeNull()
    })
  })

  describe('getUsernameFromEvent()', () => {
    it('should extract username from JWT claims', () => {
      // Given: API Gateway event with cognito:username
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
                'cognito:username': 'john_doe',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting username
      const username = getUsernameFromEvent(event)

      // Then: Returns cognito:username claim
      expect(username).toBe('john_doe')
    })

    it('should return null when username not in claims', () => {
      // Given: Event without cognito:username claim
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting username
      const username = getUsernameFromEvent(event)

      // Then: Returns null
      expect(username).toBeNull()
    })

    it('should return null when no authorizer present', () => {
      // Given: Event without authorizer
      const event = {
        requestContext: {},
      } as any as APIGatewayProxyEventV2

      // When: Extracting username
      const username = getUsernameFromEvent(event)

      // Then: Returns null
      expect(username).toBeNull()
    })
  })

  describe('getJwtClaims()', () => {
    it('should extract all JWT claims', () => {
      // Given: API Gateway event with full JWT claims
      const claims = {
        sub: 'user-123-456-789',
        email: 'user@example.com',
        'cognito:username': 'john_doe',
        'cognito:groups': ['admin', 'users'],
        iat: 1234567890,
        exp: 1234571490,
      }

      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims,
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting all claims
      const result = getJwtClaims(event)

      // Then: Returns complete claims object
      expect(result).toEqual(claims)
      expect(result?.sub).toBe('user-123-456-789')
      expect(result?.email).toBe('user@example.com')
      expect(result?.['cognito:username']).toBe('john_doe')
    })

    it('should return null when no authorizer present', () => {
      // Given: Event without authorizer
      const event = {
        requestContext: {},
      } as any as APIGatewayProxyEventV2

      // When: Extracting claims
      const claims = getJwtClaims(event)

      // Then: Returns null
      expect(claims).toBeNull()
    })

    it('should return null when JWT claims missing', () => {
      // Given: Event with authorizer but no claims
      const event = {
        requestContext: {
          authorizer: {
            jwt: {},
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting claims
      const claims = getJwtClaims(event)

      // Then: Returns null
      expect(claims).toBeNull()
    })

    it('should handle empty claims object', () => {
      // Given: Event with empty claims
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {},
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting claims
      const claims = getJwtClaims(event)

      // Then: Returns empty object (not null)
      expect(claims).toEqual({})
    })
  })

  describe('Error Handling', () => {
    it('should handle undefined event gracefully', () => {
      // Given: Undefined event
      const event = undefined as any as APIGatewayProxyEventV2

      // When: Calling all utility functions
      // Then: All return null without throwing
      expect(getUserIdFromEvent(event)).toBeNull()
      expect(getEmailFromEvent(event)).toBeNull()
      expect(getUsernameFromEvent(event)).toBeNull()
      expect(getJwtClaims(event)).toBeNull()
    })

    it('should handle null requestContext gracefully', () => {
      // Given: Event with null requestContext
      const event = {
        requestContext: null,
      } as any as APIGatewayProxyEventV2

      // When: Calling all utility functions
      // Then: All return null without throwing
      expect(getUserIdFromEvent(event)).toBeNull()
      expect(getEmailFromEvent(event)).toBeNull()
      expect(getUsernameFromEvent(event)).toBeNull()
      expect(getJwtClaims(event)).toBeNull()
    })
  })

  describe('Cognito Integration', () => {
    it('should handle typical Cognito JWT structure', () => {
      // Given: Realistic Cognito JWT event
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: '1234abcd-56ef-78gh-90ij-klmnopqrstuv',
                'cognito:username': 'john.doe@example.com',
                email: 'john.doe@example.com',
                email_verified: 'true',
                'cognito:groups': ['Users'],
                iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
                aud: '1234567890abcdefghijklmno',
                token_use: 'id',
                auth_time: '1640000000',
                exp: '1640003600',
                iat: '1640000000',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting user information
      const userId = getUserIdFromEvent(event)
      const email = getEmailFromEvent(event)
      const username = getUsernameFromEvent(event)
      const claims = getJwtClaims(event)

      // Then: All Cognito fields are extracted correctly
      expect(userId).toBe('1234abcd-56ef-78gh-90ij-klmnopqrstuv')
      expect(email).toBe('john.doe@example.com')
      expect(username).toBe('john.doe@example.com')
      expect(claims?.['cognito:groups']).toEqual(['Users'])
      expect(claims?.email_verified).toBe('true')
    })

    it('should handle social login Cognito structure', () => {
      // Given: Cognito JWT from social provider
      const event = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: 'google-123456789',
                'cognito:username': 'Google_123456789',
                email: 'user@gmail.com',
                identities: '[{"userId":"123456789","providerName":"Google","providerType":"Google"}]',
              },
            },
          },
        },
      } as any as APIGatewayProxyEventV2

      // When: Extracting user information
      const userId = getUserIdFromEvent(event)
      const email = getEmailFromEvent(event)
      const username = getUsernameFromEvent(event)

      // Then: Social login claims are extracted
      expect(userId).toBe('google-123456789')
      expect(email).toBe('user@gmail.com')
      expect(username).toBe('Google_123456789')
    })
  })
})
