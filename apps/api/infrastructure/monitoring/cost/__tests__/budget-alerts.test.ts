/**
 * Tests for Budget Alert Handler
 * Story 1.4: Cost Monitoring and Budget Alerts
 */

import { describe, it, expect, vi } from 'vitest'
import { SNSEvent } from 'aws-lambda'
import { parseBudgetAlert, processBudgetAlert, handleBudgetAlerts } from '../budget-alerts'

describe('Budget Alert Handler', () => {
  describe('parseBudgetAlert', () => {
    it('should parse valid budget alert JSON', () => {
      const snsMessage = JSON.stringify({
        BudgetName: 'user-metrics-budget-dev',
        BudgetType: 'COST',
        BudgetLimit: {
          Amount: '150.00',
          Unit: 'USD',
        },
        ActualAmount: {
          Amount: '125.50',
          Unit: 'USD',
        },
        Threshold: 80,
        ThresholdType: 'PERCENTAGE',
        ComparisonOperator: 'GREATER_THAN',
        NotificationType: 'ACTUAL',
        AccountId: '123456789012',
        Time: '2025-11-23T10:00:00Z',
      })

      const result = parseBudgetAlert(snsMessage)

      expect(result).toEqual({
        budgetName: 'user-metrics-budget-dev',
        budgetType: 'COST',
        budgetLimit: {
          amount: 150.00,
          unit: 'USD',
        },
        actualAmount: {
          amount: 125.50,
          unit: 'USD',
        },
        threshold: 80,
        thresholdType: 'PERCENTAGE',
        comparisonOperator: 'GREATER_THAN',
        notificationType: 'ACTUAL',
        accountId: '123456789012',
        timestamp: '2025-11-23T10:00:00Z',
      })
    })

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'invalid json string'
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = parseBudgetAlert(invalidJson)
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse budget alert:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle missing fields with defaults', () => {
      const snsMessage = JSON.stringify({
        BudgetName: 'test-budget',
      })

      const result = parseBudgetAlert(snsMessage)

      expect(result).toMatchObject({
        budgetName: 'test-budget',
        budgetType: '',
        budgetLimit: {
          amount: 0,
          unit: 'USD',
        },
        actualAmount: {
          amount: 0,
          unit: 'USD',
        },
        threshold: 0,
        thresholdType: 'PERCENTAGE',
        comparisonOperator: 'GREATER_THAN',
        notificationType: 'ACTUAL',
        accountId: '',
      })
    })
  })

  describe('processBudgetAlert', () => {
    it('should classify CRITICAL alert for 100%+ utilization', () => {
      const alert = {
        budgetName: 'test-budget',
        budgetType: 'COST',
        budgetLimit: { amount: 150, unit: 'USD' },
        actualAmount: { amount: 155, unit: 'USD' },
        threshold: 100,
        thresholdType: 'PERCENTAGE' as const,
        comparisonOperator: 'GREATER_THAN' as const,
        notificationType: 'ACTUAL' as const,
        accountId: '123456789012',
        timestamp: '2025-11-23T10:00:00Z',
      }

      const result = processBudgetAlert(alert)

      expect(result.severity).toBe('CRITICAL')
      expect(result.utilizationPercentage).toBe(103.33)
      expect(result.actions).toContain('Immediate cost review required')
      expect(result.message).toContain('103.3% utilization')
    })

    it('should classify WARNING alert for 80-99% utilization', () => {
      const alert = {
        budgetName: 'test-budget',
        budgetType: 'COST',
        budgetLimit: { amount: 150, unit: 'USD' },
        actualAmount: { amount: 125, unit: 'USD' },
        threshold: 80,
        thresholdType: 'PERCENTAGE' as const,
        comparisonOperator: 'GREATER_THAN' as const,
        notificationType: 'ACTUAL' as const,
        accountId: '123456789012',
        timestamp: '2025-11-23T10:00:00Z',
      }

      const result = processBudgetAlert(alert)

      expect(result.severity).toBe('WARNING')
      expect(result.utilizationPercentage).toBe(83.33)
      expect(result.actions).toContain('Monitor cost trends closely')
      expect(result.message).toContain('83.3% utilization')
    })

    it('should classify INFO alert for <80% utilization', () => {
      const alert = {
        budgetName: 'test-budget',
        budgetType: 'COST',
        budgetLimit: { amount: 150, unit: 'USD' },
        actualAmount: { amount: 75, unit: 'USD' },
        threshold: 50,
        thresholdType: 'PERCENTAGE' as const,
        comparisonOperator: 'GREATER_THAN' as const,
        notificationType: 'ACTUAL' as const,
        accountId: '123456789012',
        timestamp: '2025-11-23T10:00:00Z',
      }

      const result = processBudgetAlert(alert)

      expect(result.severity).toBe('INFO')
      expect(result.utilizationPercentage).toBe(50)
      expect(result.actions).toContain('Continue monitoring')
    })
  })

  describe('handleBudgetAlerts', () => {
    it('should process SNS event with budget alerts', async () => {
      const snsEvent: SNSEvent = {
        Records: [
          {
            EventSource: 'aws:sns',
            EventVersion: '1.0',
            EventSubscriptionArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
            Sns: {
              Type: 'Notification',
              MessageId: 'test-message-id',
              TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
              Subject: 'Budget Alert',
              Message: JSON.stringify({
                BudgetName: 'user-metrics-budget-dev',
                BudgetType: 'COST',
                BudgetLimit: { Amount: '150.00', Unit: 'USD' },
                ActualAmount: { Amount: '125.00', Unit: 'USD' },
                Threshold: 80,
                ThresholdType: 'PERCENTAGE',
                ComparisonOperator: 'GREATER_THAN',
                NotificationType: 'ACTUAL',
                AccountId: '123456789012',
                Time: '2025-11-23T10:00:00Z',
              }),
              Timestamp: '2025-11-23T10:00:00Z',
              SignatureVersion: '1',
              Signature: 'test-signature',
              SigningCertUrl: 'test-cert-url',
              UnsubscribeUrl: 'test-unsubscribe-url',
              MessageAttributes: {},
            },
          },
        ],
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const result = await handleBudgetAlerts(snsEvent)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body).results).toHaveLength(1)
      expect(JSON.parse(result.body).results[0]).toMatchObject({
        budgetName: 'user-metrics-budget-dev',
        severity: 'WARNING',
        utilization: 83.33,
        processed: true,
      })

      expect(consoleSpy).toHaveBeenCalledWith('Budget Alert Received:', expect.any(Object))
      
      consoleSpy.mockRestore()
    })

    it('should handle invalid SNS messages gracefully', async () => {
      const snsEvent: SNSEvent = {
        Records: [
          {
            EventSource: 'aws:sns',
            EventVersion: '1.0',
            EventSubscriptionArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
            Sns: {
              Type: 'Notification',
              MessageId: 'test-message-id',
              TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
              Subject: 'Budget Alert',
              Message: 'invalid json',
              Timestamp: '2025-11-23T10:00:00Z',
              SignatureVersion: '1',
              Signature: 'test-signature',
              SigningCertUrl: 'test-cert-url',
              UnsubscribeUrl: 'test-unsubscribe-url',
              MessageAttributes: {},
            },
          },
        ],
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await handleBudgetAlerts(snsEvent)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body).results).toHaveLength(0)
      
      consoleSpy.mockRestore()
    })
  })
})
