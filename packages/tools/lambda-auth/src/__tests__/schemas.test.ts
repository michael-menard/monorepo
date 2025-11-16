/**
 * Unit Tests for Zod Schemas
 *
 * Tests all Zod schemas used for JWT validation including:
 * - CognitoJwtClaimsSchema
 * - JwtValidationConfigSchema
 * - API Gateway event schemas
 * - Helper functions
 */

import { describe, it, expect } from 'vitest'
import {
  CognitoJwtClaimsSchema,
  JwtValidationConfigSchema,
  ApiGatewayEventSchema,
  CognitoIssuerSchema,
  ResourceIdSchema,
  UserIdSchema,
  createDefaultJwtConfig,
} from '../schemas'

describe('CognitoJwtClaimsSchema', () => {
  const validClaims = {
    sub: '1234abcd-56ef-78gh-90ij-klmnopqrstuv',
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
    aud: '1234567890abcdefghijklmno',
    exp: 1640003600,
    iat: 1640000000,
    token_use: 'id' as const,
    'cognito:username': 'john.doe@example.com',
    email: 'john.doe@example.com',
    email_verified: 'true',
    'cognito:groups': ['Users', 'Admins'],
  }

  it('should validate complete valid Cognito JWT claims', () => {
    // When: Parsing valid claims
    const result = CognitoJwtClaimsSchema.safeParse(validClaims)

    // Then: Validation succeeds
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sub).toBe(validClaims.sub)
      expect(result.data.iss).toBe(validClaims.iss)
      expect(result.data.email).toBe(validClaims.email)
      expect(result.data['cognito:groups']).toEqual(['Users', 'Admins'])
    }
  })

  it('should validate minimal required claims', () => {
    // Given: Only required claims
    const minimalClaims = {
      sub: 'user-123',
      iss: 'https://cognito-idp.us-west-2.amazonaws.com/us-west-2_XYZ789',
      aud: 'client-456',
      exp: 1640003600,
      iat: 1640000000,
    }

    // When: Parsing minimal claims
    const result = CognitoJwtClaimsSchema.safeParse(minimalClaims)

    // Then: Validation succeeds
    expect(result.success).toBe(true)
  })

  it('should reject claims with missing required fields', () => {
    // Given: Claims missing required 'sub' field
    const invalidClaims = {
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      aud: '1234567890abcdefghijklmno',
      exp: 1640003600,
      iat: 1640000000,
      // Missing 'sub'
    }

    // When: Parsing invalid claims
    const result = CognitoJwtClaimsSchema.safeParse(invalidClaims)

    // Then: Validation fails
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['sub'])
      expect(result.error.issues[0].message).toContain('Required')
    }
  })

  it('should reject claims with invalid field types', () => {
    // Given: Claims with wrong types
    const invalidClaims = {
      sub: 123, // Should be string
      iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      aud: '1234567890abcdefghijklmno',
      exp: '1640003600', // Should be number
      iat: 1640000000,
    }

    // When: Parsing invalid claims
    const result = CognitoJwtClaimsSchema.safeParse(invalidClaims)

    // Then: Validation fails
    expect(result.success).toBe(false)
  })

  it('should reject invalid issuer URL', () => {
    // Given: Claims with invalid issuer format
    const invalidClaims = {
      ...validClaims,
      iss: 'not-a-valid-cognito-issuer',
    }

    // When: Parsing claims
    const result = CognitoJwtClaimsSchema.safeParse(invalidClaims)

    // Then: Validation fails
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['iss'])
      expect(result.error.issues[0].message).toContain('valid URL')
    }
  })

  it('should allow additional claims (passthrough)', () => {
    // Given: Claims with additional custom fields
    const claimsWithExtra = {
      ...validClaims,
      custom_field: 'custom_value',
      another_field: 123,
    }

    // When: Parsing claims
    const result = CognitoJwtClaimsSchema.safeParse(claimsWithExtra)

    // Then: Validation succeeds and preserves extra fields
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('custom_value')
      expect(result.data.another_field).toBe(123)
    }
  })
})

describe('CognitoIssuerSchema', () => {
  it('should validate correct Cognito issuer format', () => {
    // Given: Valid Cognito issuer URLs
    const validIssuers = [
      'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_XYZ789',
      'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_DEF456',
    ]

    validIssuers.forEach((issuer) => {
      // When: Validating issuer
      const result = CognitoIssuerSchema.safeParse(issuer)

      // Then: Validation succeeds
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid issuer formats', () => {
    // Given: Invalid issuer formats
    const invalidIssuers = [
      'https://malicious-site.com/fake-pool',
      'http://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123', // HTTP instead of HTTPS
      'https://cognito-idp.amazonaws.com/us-east-1_ABC123', // Missing region
      'https://cognito-idp.us-east-1.amazonaws.com/', // Missing user pool ID
      'not-a-url-at-all',
    ]

    invalidIssuers.forEach((issuer) => {
      // When: Validating issuer
      const result = CognitoIssuerSchema.safeParse(issuer)

      // Then: Validation fails
      expect(result.success).toBe(false)
    })
  })
})

describe('JwtValidationConfigSchema', () => {
  it('should validate complete configuration', () => {
    // Given: Complete JWT validation config
    const config = {
      expectedIssuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      expectedAudience: 'client-123',
      clockSkewTolerance: 300,
      validateExpiration: true,
    }

    // When: Validating config
    const result = JwtValidationConfigSchema.safeParse(config)

    // Then: Validation succeeds
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clockSkewTolerance).toBe(300)
      expect(result.data.validateExpiration).toBe(true)
    }
  })

  it('should apply default values', () => {
    // Given: Minimal config (only required fields)
    const minimalConfig = {
      expectedIssuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      expectedAudience: 'client-123',
    }

    // When: Validating config
    const result = JwtValidationConfigSchema.safeParse(minimalConfig)

    // Then: Validation succeeds with defaults applied
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clockSkewTolerance).toBe(300) // Default
      expect(result.data.validateExpiration).toBe(true) // Default
    }
  })

  it('should reject negative clock skew tolerance', () => {
    // Given: Config with negative clock skew
    const invalidConfig = {
      expectedIssuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      expectedAudience: 'client-123',
      clockSkewTolerance: -100, // Invalid negative value
    }

    // When: Validating config
    const result = JwtValidationConfigSchema.safeParse(invalidConfig)

    // Then: Validation fails
    expect(result.success).toBe(false)
  })
})

describe('ResourceIdSchema and UserIdSchema', () => {
  it('should validate non-empty strings', () => {
    // Given: Valid IDs
    const validIds = [
      'user-123',
      '1234abcd-56ef-78gh-90ij-klmnopqrstuv',
      'moc-basic-456',
      'custom-resource-id',
    ]

    validIds.forEach((id) => {
      // When: Validating resource and user IDs
      const resourceResult = ResourceIdSchema.safeParse(id)
      const userResult = UserIdSchema.safeParse(id)

      // Then: Both validations succeed
      expect(resourceResult.success).toBe(true)
      expect(userResult.success).toBe(true)
    })
  })

  it('should reject empty strings', () => {
    // Given: Empty or whitespace-only strings
    const invalidIds = ['', '   ', '\t', '\n']

    invalidIds.forEach((id) => {
      // When: Validating IDs
      const resourceResult = ResourceIdSchema.safeParse(id)
      const userResult = UserIdSchema.safeParse(id)

      // Then: Both validations fail
      expect(resourceResult.success).toBe(false)
      expect(userResult.success).toBe(false)
    })
  })
})

describe('createDefaultJwtConfig', () => {
  it('should create valid configuration with all parameters', () => {
    // When: Creating config with all parameters
    const config = createDefaultJwtConfig('us-east-1_ABC123', 'us-east-1', 'client-123')

    // Then: Config is valid and correctly formatted
    expect(config.expectedIssuer).toBe('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123')
    expect(config.expectedAudience).toBe('client-123')
    expect(config.clockSkewTolerance).toBe(300)
    expect(config.validateExpiration).toBe(true)
  })

  it('should use default region when not specified', () => {
    // When: Creating config without region (uses default)
    const config = createDefaultJwtConfig('us-east-1_ABC123', undefined, 'client-123')

    // Then: Uses default us-east-1 region
    expect(config.expectedIssuer).toBe('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123')
  })

  it('should work with different regions', () => {
    // When: Creating config for different region
    const config = createDefaultJwtConfig('eu-west-1_XYZ789', 'eu-west-1', 'client-456')

    // Then: Uses specified region
    expect(config.expectedIssuer).toBe('https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_XYZ789')
    expect(config.expectedAudience).toBe('client-456')
  })
})
