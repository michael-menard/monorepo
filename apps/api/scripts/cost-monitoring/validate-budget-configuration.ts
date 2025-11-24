#!/usr/bin/env node
/**
 * Validate AWS Budget Configuration for User Metrics Observability
 * Story 1.4: Cost Monitoring and Budget Alerts (Task 1, 7)
 *
 * This script validates that the AWS Budget and SNS topic are correctly configured
 * with proper thresholds, filters, and alert subscriptions.
 */

import {
  BudgetsClient,
  DescribeBudgetCommand,
  DescribeBudgetsCommand,
} from '@aws-sdk/client-budgets'
import { SNSClient, ListTopicsCommand, ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

// Initialize AWS clients
const budgetsClient = new BudgetsClient({ region: 'us-east-1' }) // Budgets API only in us-east-1
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' })
const stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })

interface ValidationResult {
  component: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
  details?: any
}

/**
 * Get AWS Account ID
 */
async function getAccountId(): Promise<string> {
  const command = new GetCallerIdentityCommand({})
  const response = await stsClient.send(command)
  return response.Account || ''
}

/**
 * Validate AWS Budget configuration
 */
async function validateBudget(accountId: string, stage: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const budgetName = `user-metrics-budget-${stage}`

  try {
    // Check if budget exists
    const command = new DescribeBudgetCommand({
      AccountId: accountId,
      BudgetName: budgetName,
    })

    const response = await budgetsClient.send(command)
    const budget = response.Budget

    if (!budget) {
      results.push({
        component: 'Budget Existence',
        status: 'FAIL',
        message: `Budget '${budgetName}' not found`,
      })
      return results
    }

    results.push({
      component: 'Budget Existence',
      status: 'PASS',
      message: `Budget '${budgetName}' exists`,
      details: {
        budgetName: budget.BudgetName,
        budgetType: budget.BudgetType,
        timeUnit: budget.TimeUnit,
      },
    })

    // Validate budget limit
    const expectedLimit = 150
    const actualLimit = parseFloat(budget.BudgetLimit?.Amount || '0')

    if (actualLimit === expectedLimit) {
      results.push({
        component: 'Budget Limit',
        status: 'PASS',
        message: `Budget limit correctly set to $${actualLimit}`,
      })
    } else {
      results.push({
        component: 'Budget Limit',
        status: 'FAIL',
        message: `Budget limit is $${actualLimit}, expected $${expectedLimit}`,
      })
    }

    // Validate budget type and time unit
    if (budget.BudgetType === 'COST' && budget.TimeUnit === 'MONTHLY') {
      results.push({
        component: 'Budget Configuration',
        status: 'PASS',
        message: 'Budget type and time unit correctly configured',
      })
    } else {
      results.push({
        component: 'Budget Configuration',
        status: 'FAIL',
        message: `Budget type: ${budget.BudgetType}, time unit: ${budget.TimeUnit}`,
      })
    }

    // Validate cost filters
    const costFilters = budget.CostFilters
    if (costFilters?.TagKey?.includes('Project') && costFilters?.Values?.includes('UserMetrics')) {
      results.push({
        component: 'Cost Filters',
        status: 'PASS',
        message: 'Cost filters correctly configured for Project=UserMetrics',
      })
    } else {
      results.push({
        component: 'Cost Filters',
        status: 'FAIL',
        message: 'Cost filters not properly configured',
        details: costFilters,
      })
    }
  } catch (error) {
    results.push({
      component: 'Budget Validation',
      status: 'FAIL',
      message: `Error validating budget: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return results
}

/**
 * Validate SNS topic and subscriptions
 */
async function validateSNSTopic(stage: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const expectedTopicName = `user-metrics-budget-alerts-${stage}`

  try {
    // List all SNS topics
    const listCommand = new ListTopicsCommand({})
    const listResponse = await snsClient.send(listCommand)

    // Find the budget alert topic
    const budgetTopic = listResponse.Topics?.find(topic =>
      topic.TopicArn?.includes(expectedTopicName),
    )

    if (!budgetTopic) {
      results.push({
        component: 'SNS Topic',
        status: 'FAIL',
        message: `SNS topic '${expectedTopicName}' not found`,
      })
      return results
    }

    results.push({
      component: 'SNS Topic',
      status: 'PASS',
      message: `SNS topic '${expectedTopicName}' exists`,
      details: {
        topicArn: budgetTopic.TopicArn,
      },
    })

    // Validate subscriptions
    const subscriptionsCommand = new ListSubscriptionsByTopicCommand({
      TopicArn: budgetTopic.TopicArn,
    })

    const subscriptionsResponse = await snsClient.send(subscriptionsCommand)
    const subscriptions = subscriptionsResponse.Subscriptions || []

    if (subscriptions.length === 0) {
      results.push({
        component: 'SNS Subscriptions',
        status: 'WARNING',
        message: 'No subscriptions found for budget alert topic',
      })
    } else {
      const emailSubscriptions = subscriptions.filter(sub => sub.Protocol === 'email')

      if (emailSubscriptions.length > 0) {
        results.push({
          component: 'SNS Subscriptions',
          status: 'PASS',
          message: `Found ${emailSubscriptions.length} email subscription(s)`,
          details: {
            subscriptions: emailSubscriptions.map(sub => ({
              protocol: sub.Protocol,
              endpoint: sub.Endpoint,
              subscriptionArn: sub.SubscriptionArn,
            })),
          },
        })
      } else {
        results.push({
          component: 'SNS Subscriptions',
          status: 'WARNING',
          message: 'No email subscriptions found',
          details: { subscriptions },
        })
      }
    }
  } catch (error) {
    results.push({
      component: 'SNS Validation',
      status: 'FAIL',
      message: `Error validating SNS topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return results
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[]) {
  console.log('═'.repeat(80))
  console.log('   AWS BUDGET AND SNS VALIDATION RESULTS')
  console.log('═'.repeat(80))
  console.log()

  let passCount = 0
  let failCount = 0
  let warningCount = 0

  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'

    console.log(`${statusIcon} ${result.component}: ${result.message}`)

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
    console.log()

    if (result.status === 'PASS') passCount++
    else if (result.status === 'FAIL') failCount++
    else warningCount++
  }

  console.log('─'.repeat(80))
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings`)
  console.log('─'.repeat(80))

  return { passCount, failCount, warningCount }
}

/**
 * Main execution
 */
async function main() {
  const stage = process.argv[2] || 'dev'

  console.log(`🔍 Validating User Metrics budget configuration for stage: ${stage}\n`)

  try {
    // Get AWS account ID
    const accountId = await getAccountId()
    console.log(`AWS Account ID: ${accountId}\n`)

    // Run validations
    const [budgetResults, snsResults] = await Promise.all([
      validateBudget(accountId, stage),
      validateSNSTopic(stage),
    ])

    // Combine and print results
    const allResults = [...budgetResults, ...snsResults]
    const { passCount, failCount, warningCount } = printResults(allResults)

    // Exit with appropriate code
    if (failCount > 0) {
      console.log('❌ Validation failed! Please fix the issues above.')
      process.exit(1)
    } else if (warningCount > 0) {
      console.log('⚠️  Validation completed with warnings.')
      process.exit(0)
    } else {
      console.log('✅ All validations passed!')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Error during validation:', error)
    process.exit(1)
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
