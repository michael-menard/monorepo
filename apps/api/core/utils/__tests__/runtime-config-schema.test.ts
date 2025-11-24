import { describe, it, expect } from 'vitest'
import {
  validateRuntimeConfig,
  safeValidateRuntimeConfig,
  type RuntimeConfig
} from '../runtime-config-schema'

describe('RuntimeConfigSchema', () => {
  const validConfig: RuntimeConfig = {
    apiBaseUrl: 'https://api.example.com',
    useServerless: true,
    cognitoConfig: {
      userPoolId: 'us-east-1_XXXXXXXXX',
      clientId: 'abcdef1234567890abcdef1234',
      region: 'us-east-1',
    },
  }

  describe('valid configurations', () => {
    it('should validate a complete valid configuration', () => {
      expect(() => validateRuntimeConfig(validConfig)).not.toThrow()
    })

    it('should validate with useServerless false', () => {
      const config = { ...validConfig, useServerless: false }
      expect(() => validateRuntimeConfig(config)).not.toThrow()
    })

    it('should validate with localhost URL', () => {
      const config = { ...validConfig, apiBaseUrl: 'http://localhost:9000' }
      expect(() => validateRuntimeConfig(config)).not.toThrow()
    })

    it('should validate with different AWS regions', () => {
      const config = {
        ...validConfig,
        cognitoConfig: {
          ...validConfig.cognitoConfig,
          region: 'us-west-2',
        },
      }
      expect(() => validateRuntimeConfig(config)).not.toThrow()
    })
  })

  describe('invalid configurations', () => {
    it('should reject invalid URL format', () => {
      const config = { ...validConfig, apiBaseUrl: 'not-a-url' }
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject missing apiBaseUrl', () => {
      const { apiBaseUrl: _apiBaseUrl, ...config } = validConfig
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject missing useServerless', () => {
      const { useServerless: _useServerless, ...config } = validConfig
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject missing cognitoConfig', () => {
      const { cognitoConfig: _cognitoConfig, ...config } = validConfig
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject empty userPoolId', () => {
      const config = {
        ...validConfig,
        cognitoConfig: {
          ...validConfig.cognitoConfig,
          userPoolId: '',
        },
      }
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject empty clientId', () => {
      const config = {
        ...validConfig,
        cognitoConfig: {
          ...validConfig.cognitoConfig,
          clientId: '',
        },
      }
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject empty region', () => {
      const config = {
        ...validConfig,
        cognitoConfig: {
          ...validConfig.cognitoConfig,
          region: '',
        },
      }
      expect(() => validateRuntimeConfig(config)).toThrow()
    })

    it('should reject non-boolean useServerless', () => {
      const config = { ...validConfig, useServerless: 'true' as any }
      expect(() => validateRuntimeConfig(config)).toThrow()
    })
  })

  describe('safeValidateRuntimeConfig', () => {
    it('should return success for valid config', () => {
      const result = safeValidateRuntimeConfig(validConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validConfig)
      }
    })

    it('should return error for invalid config', () => {
      const invalidConfig = { ...validConfig, apiBaseUrl: 'invalid-url' }
      const result = safeValidateRuntimeConfig(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].path).toEqual(['apiBaseUrl'])
      }
    })

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidConfig = {
        apiBaseUrl: 'invalid-url',
        useServerless: 'not-boolean' as any,
        cognitoConfig: {
          userPoolId: '',
          clientId: '',
          region: '',
        },
      }
      const result = safeValidateRuntimeConfig(invalidConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1)
      }
    })
  })

  describe('type inference', () => {
    it('should infer correct TypeScript types', () => {
      const config = validateRuntimeConfig(validConfig)
      
      // These should compile without TypeScript errors
      expect(typeof config.apiBaseUrl).toBe('string')
      expect(typeof config.useServerless).toBe('boolean')
      expect(typeof config.cognitoConfig.userPoolId).toBe('string')
      expect(typeof config.cognitoConfig.clientId).toBe('string')
      expect(typeof config.cognitoConfig.region).toBe('string')
    })
  })
})
