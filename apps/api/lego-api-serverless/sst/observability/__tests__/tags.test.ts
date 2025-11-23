/**
 * Unit tests for observability tagging configuration
 * Validates tag structure and compliance with AWS tagging schema
 */

import { describe, it, expect } from 'vitest'
import { 
  requiredTags, 
  componentTags, 
  createResourceTags, 
  observabilityTags 
} from '../tags'

describe('Observability Tags', () => {
  describe('requiredTags', () => {
    it('should return all required tags with correct values', () => {
      const tags = requiredTags('dev', 'test@example.com')
      
      expect(tags).toEqual({
        Project: 'UserMetrics',
        Environment: 'dev',
        ManagedBy: 'SST',
        CostCenter: 'Observability',
        Owner: 'test@example.com',
      })
    })

    it('should use default owner when not provided', () => {
      const tags = requiredTags('prod')
      
      expect(tags.Owner).toBe('engineering@example.com')
      expect(tags.Environment).toBe('prod')
    })

    it('should have exactly 5 required tags', () => {
      const tags = requiredTags('staging')
      
      expect(Object.keys(tags)).toHaveLength(5)
    })
  })

  describe('componentTags', () => {
    it('should have networking component tags', () => {
      expect(componentTags.networking).toEqual({
        Component: 'Networking',
        Function: 'Networking',
        NetworkTier: 'Private',
      })
    })

    it('should have security component tags', () => {
      expect(componentTags.security).toEqual({
        Component: 'Networking',
        Function: 'Security',
        Purpose: 'AccessControl',
      })
    })

    it('should have IAM component tags', () => {
      expect(componentTags.iam).toEqual({
        Component: 'IAM',
        Function: 'AccessControl',
        AccessLevel: 'ReadWrite',
      })
    })

    it('should have ECS component tags', () => {
      expect(componentTags.ecs).toEqual({
        Component: 'Compute',
        Function: 'Container',
        Platform: 'ECS',
      })
    })
  })

  describe('createResourceTags', () => {
    it('should combine required and component tags', () => {
      const tags = createResourceTags('dev', 'networking', 'test@example.com')
      
      expect(tags).toEqual({
        Project: 'UserMetrics',
        Environment: 'dev',
        ManagedBy: 'SST',
        CostCenter: 'Observability',
        Owner: 'test@example.com',
        Component: 'Networking',
        Function: 'Networking',
        NetworkTier: 'Private',
      })
    })

    it('should include additional tags when provided', () => {
      const additionalTags = { Service: 'TestService', Version: '1.0' }
      const tags = createResourceTags('prod', 'ecs', undefined, additionalTags)
      
      expect(tags.Service).toBe('TestService')
      expect(tags.Version).toBe('1.0')
      expect(tags.Component).toBe('Compute')
    })
  })

  describe('observabilityTags', () => {
    it('should create Umami tags', () => {
      const tags = observabilityTags.umami('dev')
      
      expect(tags.Service).toBe('Umami')
      expect(tags.Purpose).toBe('Analytics')
      expect(tags.Component).toBe('Compute')
      expect(tags.Platform).toBe('ECS')
    })

    it('should create OpenReplay tags', () => {
      const tags = observabilityTags.openreplay('prod')
      
      expect(tags.Service).toBe('OpenReplay')
      expect(tags.Purpose).toBe('SessionReplay')
      expect(tags.Environment).toBe('prod')
    })

    it('should create Grafana tags', () => {
      const tags = observabilityTags.grafana('staging')
      
      expect(tags.Service).toBe('Grafana')
      expect(tags.Tier).toBe('Essential')
      expect(tags.Component).toBe('Observability')
    })

    it('should create session storage tags', () => {
      const tags = observabilityTags.sessionStorage('dev')
      
      expect(tags.Service).toBe('OpenReplay')
      expect(tags.DataType).toBe('Sessions')
      expect(tags.Component).toBe('Storage')
    })
  })

  describe('Tag compliance', () => {
    it('should ensure all observability tags have minimum required tags', () => {
      const umamiTags = observabilityTags.umami('dev')
      const requiredKeys = ['Project', 'Environment', 'ManagedBy', 'CostCenter', 'Owner']
      
      requiredKeys.forEach(key => {
        expect(umamiTags).toHaveProperty(key)
      })
    })

    it('should have at least 5 tags for compliance', () => {
      const tags = createResourceTags('dev', 'networking')
      
      expect(Object.keys(tags).length).toBeGreaterThanOrEqual(5)
    })
  })
})
