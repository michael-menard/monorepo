import { describe, it, expect } from 'vitest'
import {
  normalizeSurfaceType,
  denormalizeSurfaceType,
  normalizeSurfaces,
  denormalizeSurfaces,
  normalizeScopeTouches,
  denormalizeScopeTouches,
  normalizePlanSlice,
  denormalizePlanSlice,
  createSurfaceNormalizer,
  isYamlShortForm,
  type YamlScopeTouches,
  type NormalizedScopeTouches,
} from '../surface-normalizer.js'

describe('SurfaceNormalizer', () => {
  describe('normalizeSurfaceType', () => {
    it('normalizes infra to infrastructure', () => {
      expect(normalizeSurfaceType('infra')).toBe('infrastructure')
    })

    it('normalizes db to database', () => {
      expect(normalizeSurfaceType('db')).toBe('database')
    })

    it('passes through already normalized types', () => {
      expect(normalizeSurfaceType('frontend')).toBe('frontend')
      expect(normalizeSurfaceType('backend')).toBe('backend')
      expect(normalizeSurfaceType('infrastructure')).toBe('infrastructure')
      expect(normalizeSurfaceType('database')).toBe('database')
    })

    it('handles case insensitively', () => {
      expect(normalizeSurfaceType('INFRA')).toBe('infrastructure')
      expect(normalizeSurfaceType('Db')).toBe('database')
    })

    it('throws on unknown surface type', () => {
      expect(() => normalizeSurfaceType('unknown')).toThrow('Unknown surface type')
    })
  })

  describe('denormalizeSurfaceType', () => {
    it('denormalizes infrastructure to infra', () => {
      expect(denormalizeSurfaceType('infrastructure')).toBe('infra')
    })

    it('denormalizes database to db', () => {
      expect(denormalizeSurfaceType('database')).toBe('db')
    })

    it('passes through other types unchanged', () => {
      expect(denormalizeSurfaceType('frontend')).toBe('frontend')
      expect(denormalizeSurfaceType('backend')).toBe('backend')
    })
  })

  describe('normalizeSurfaces', () => {
    it('normalizes an array of surfaces', () => {
      const input = ['frontend', 'infra', 'db']
      const expected = ['frontend', 'infrastructure', 'database']
      expect(normalizeSurfaces(input)).toEqual(expected)
    })

    it('handles empty array', () => {
      expect(normalizeSurfaces([])).toEqual([])
    })

    it('handles array with no changes needed', () => {
      const input = ['frontend', 'backend']
      expect(normalizeSurfaces(input)).toEqual(['frontend', 'backend'])
    })
  })

  describe('denormalizeSurfaces', () => {
    it('denormalizes an array of surfaces', () => {
      const input = ['frontend', 'infrastructure', 'database'] as const
      const expected = ['frontend', 'infra', 'db']
      expect(denormalizeSurfaces([...input])).toEqual(expected)
    })

    it('handles empty array', () => {
      expect(denormalizeSurfaces([])).toEqual([])
    })
  })

  describe('normalizeScopeTouches', () => {
    it('normalizes scope touches object', () => {
      const input: YamlScopeTouches = {
        backend: true,
        frontend: true,
        packages: false,
        db: true,
        contracts: false,
        ui: false,
        infra: true,
      }

      const result = normalizeScopeTouches(input)

      expect(result).toEqual({
        backend: true,
        frontend: true,
        packages: false,
        database: true,
        contracts: false,
        ui: false,
        infrastructure: true,
      })
    })

    it('handles all false values', () => {
      const input: YamlScopeTouches = {
        backend: false,
        frontend: false,
        packages: false,
        db: false,
        contracts: false,
        ui: false,
        infra: false,
      }

      const result = normalizeScopeTouches(input)

      expect(result.infrastructure).toBe(false)
      expect(result.database).toBe(false)
    })
  })

  describe('denormalizeScopeTouches', () => {
    it('denormalizes scope touches object', () => {
      const input: NormalizedScopeTouches = {
        backend: true,
        frontend: true,
        packages: false,
        database: true,
        contracts: false,
        ui: false,
        infrastructure: true,
      }

      const result = denormalizeScopeTouches(input)

      expect(result).toEqual({
        backend: true,
        frontend: true,
        packages: false,
        db: true,
        contracts: false,
        ui: false,
        infra: true,
      })
    })
  })

  describe('normalizePlanSlice', () => {
    it('normalizes infra to infrastructure', () => {
      expect(normalizePlanSlice('infra')).toBe('infrastructure')
    })

    it('passes through other slices unchanged', () => {
      expect(normalizePlanSlice('backend')).toBe('backend')
      expect(normalizePlanSlice('frontend')).toBe('frontend')
      expect(normalizePlanSlice('shared')).toBe('shared')
    })
  })

  describe('denormalizePlanSlice', () => {
    it('denormalizes infrastructure to infra', () => {
      expect(denormalizePlanSlice('infrastructure')).toBe('infra')
    })

    it('passes through other slices unchanged', () => {
      expect(denormalizePlanSlice('backend')).toBe('backend')
      expect(denormalizePlanSlice('frontend')).toBe('frontend')
    })
  })

  describe('isYamlShortForm', () => {
    it('returns true for infra', () => {
      expect(isYamlShortForm('infra')).toBe(true)
    })

    it('returns true for db', () => {
      expect(isYamlShortForm('db')).toBe(true)
    })

    it('returns false for full forms', () => {
      expect(isYamlShortForm('infrastructure')).toBe(false)
      expect(isYamlShortForm('database')).toBe(false)
    })

    it('returns false for other types', () => {
      expect(isYamlShortForm('frontend')).toBe(false)
      expect(isYamlShortForm('backend')).toBe(false)
    })
  })

  describe('createSurfaceNormalizer', () => {
    it('creates normalizer with default config', () => {
      const normalizer = createSurfaceNormalizer()
      expect(normalizer.config.normalizeOnRead).toBe(true)
      expect(normalizer.config.denormalizeOnWrite).toBe(true)
    })

    it('creates normalizer with custom config', () => {
      const normalizer = createSurfaceNormalizer({
        normalizeOnRead: false,
        denormalizeOnWrite: false,
      })
      expect(normalizer.config.normalizeOnRead).toBe(false)
      expect(normalizer.config.denormalizeOnWrite).toBe(false)
    })

    it('normalizes when normalizeOnRead is true', () => {
      const normalizer = createSurfaceNormalizer({ normalizeOnRead: true })
      expect(normalizer.normalize('infra')).toBe('infrastructure')
    })

    it('skips normalization when normalizeOnRead is false', () => {
      const normalizer = createSurfaceNormalizer({ normalizeOnRead: false })
      expect(normalizer.normalize('infra')).toBe('infra')
    })

    it('denormalizes when denormalizeOnWrite is true', () => {
      const normalizer = createSurfaceNormalizer({ denormalizeOnWrite: true })
      expect(normalizer.denormalize('infrastructure')).toBe('infra')
    })

    it('skips denormalization when denormalizeOnWrite is false', () => {
      const normalizer = createSurfaceNormalizer({ denormalizeOnWrite: false })
      expect(normalizer.denormalize('infrastructure')).toBe('infrastructure')
    })

    it('handles unknown types in non-strict mode', () => {
      const normalizer = createSurfaceNormalizer({ strictMode: false })
      expect(normalizer.normalize('unknown')).toBe('unknown')
    })

    it('throws on unknown types in strict mode', () => {
      const normalizer = createSurfaceNormalizer({ strictMode: true })
      expect(() => normalizer.normalize('unknown')).toThrow()
    })
  })
})
