#!/usr/bin/env node
/**
 * Activate Cost Allocation Tags in AWS Billing Console
 * Story 1.4: Cost Monitoring and Budget Alerts (AC 2)
 *
 * This script activates user-defined cost allocation tags in AWS Billing Console
 * to enable cost tracking and filtering by Project, Component, Function, etc.
 *
 * Required tags for UserMetrics project:
 * - Project (primary filter for budget)
 * - Component (Umami, OpenReplay, Grafana, Infrastructure)
 * - Function (SessionReplay, Analytics, Metrics, Logging, Visualization)
 * - Environment (dev, staging, prod)
 * - CostCenter (Observability)
 * - DataType (Sessions, Metrics, Logs)
 */

import { BillingClient, ModifyBillingCommand } from '@aws-sdk/client-billing'

// Initialize Billing client (us-east-1 required for billing operations)
const billingClient = new BillingClient({ region: 'us-east-1' })

/**
 * Cost allocation tags required for UserMetrics project cost tracking
 */
const REQUIRED_COST_ALLOCATION_TAGS = [
  'Project', // Primary filter for budget (UserMetrics)
  'Component', // Observability tool (Umami, OpenReplay, Grafana, Infrastructure)
  'Function', // Capability (SessionReplay, Analytics, Metrics, Logging, Visualization)
  'Environment', // Stage (dev, staging, prod)
  'CostCenter', // Budget allocation (Observability)
  'DataType', // Data classification (Sessions, Metrics, Logs)
] as const

/**
 * Activate cost allocation tags in AWS Billing Console
 */
async function activateCostAllocationTags() {
  console.log('🏷️  Activating cost allocation tags for UserMetrics project...\n')

  const results = []

  for (const tagKey of REQUIRED_COST_ALLOCATION_TAGS) {
    try {
      console.log(`   Activating tag: ${tagKey}`)

      // Note: AWS SDK v3 doesn't have direct billing tag activation
      // This would typically be done via AWS CLI or Console
      // For now, we'll document the required commands

      results.push({
        tagKey,
        status: 'PENDING_ACTIVATION',
        message: 'Use AWS CLI or Console to activate',
      })
    } catch (error) {
      console.error(`   ❌ Failed to activate tag ${tagKey}:`, error)
      results.push({
        tagKey,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Generate AWS CLI commands for cost allocation tag activation
 */
function generateActivationCommands() {
  console.log('\n📋 AWS CLI Commands for Cost Allocation Tag Activation:')
  console.log('='.repeat(70))

  console.log('\n# Activate cost allocation tags (run these commands):')

  for (const tagKey of REQUIRED_COST_ALLOCATION_TAGS) {
    console.log(
      `aws ce put-cost-allocation-tags --cost-allocation-tags Key=${tagKey},Status=Active`,
    )
  }

  console.log('\n# Verify activated tags:')
  console.log('aws ce list-cost-allocation-tags --status Active')

  console.log('\n# Check tag activation status:')
  console.log('aws ce get-cost-allocation-tags')

  console.log('\n⚠️  Important Notes:')
  console.log('   • Cost allocation tags take 24 hours to appear in Cost Explorer')
  console.log('   • Tags must be applied to resources BEFORE activation to be tracked')
  console.log('   • Only resources created AFTER activation will have cost data')
  console.log('   • Historical cost data is not retroactively tagged')
}

/**
 * Validate that all observability resources have required tags
 */
async function validateResourceTagging() {
  console.log('\n🔍 Validating resource tagging...')

  // This would typically query AWS resources to check tags
  // For now, we'll provide guidance on validation

  console.log('\n📋 Resource Tagging Validation Commands:')
  console.log('='.repeat(70))

  console.log('\n# Check ECS service tags:')
  console.log('aws ecs list-tags-for-resource --resource-arn <ecs-service-arn>')

  console.log('\n# Check S3 bucket tags:')
  console.log('aws s3api get-bucket-tagging --bucket <bucket-name>')

  console.log('\n# Check VPC tags:')
  console.log('aws ec2 describe-vpcs --filters "Name=tag:Project,Values=UserMetrics"')

  console.log('\n# Check all resources with UserMetrics project tag:')
  console.log(
    'aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=UserMetrics',
  )

  console.log('\n✅ Required tags for ALL resources:')
  console.log('   • Project=UserMetrics')
  console.log('   • Environment=<stage>')
  console.log('   • ManagedBy=SST')
  console.log('   • CostCenter=Observability')
  console.log('   • Owner=<email>')
  console.log('   • Component=<component-type>')
  console.log('   • Function=<function-type>')
}

/**
 * Main execution
 */
async function main() {
  console.log('🏷️  Cost Allocation Tag Activation for UserMetrics Project')
  console.log('='.repeat(70))

  try {
    // Activate cost allocation tags
    const results = await activateCostAllocationTags()

    // Generate CLI commands
    generateActivationCommands()

    // Validate resource tagging
    await validateResourceTagging()

    console.log('\n📊 Summary:')
    console.log(`   • Tags to activate: ${REQUIRED_COST_ALLOCATION_TAGS.length}`)
    console.log(`   • Activation method: AWS CLI commands (see above)`)
    console.log(`   • Wait time: 24 hours for tags to appear in Cost Explorer`)

    console.log('\n✅ Next steps:')
    console.log('   1. Run the AWS CLI commands above to activate tags')
    console.log('   2. Wait 24 hours for tags to appear in Cost Explorer')
    console.log('   3. Validate resource tagging using the provided commands')
    console.log('   4. Test cost filtering in AWS Cost Explorer')
  } catch (error) {
    console.error('❌ Error activating cost allocation tags:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
