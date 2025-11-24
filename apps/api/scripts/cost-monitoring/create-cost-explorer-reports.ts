#!/usr/bin/env node
/**
 * Create Cost Explorer Saved Reports for UserMetrics Project
 * Story 1.4: Cost Monitoring and Budget Alerts (AC 5)
 *
 * This script creates saved Cost Explorer reports for the UserMetrics project
 * to enable easy access to cost analysis and trends. Reports are configured
 * with proper filters and groupings for observability infrastructure.
 */

import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
} from '@aws-sdk/client-resource-groups-tagging-api'

// Initialize Resource Groups client
const resourceGroupsClient = new ResourceGroupsTaggingAPIClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

/**
 * Cost Explorer report configurations for UserMetrics project
 */
const COST_EXPLORER_REPORTS = [
  {
    name: 'UserMetrics-Monthly-Cost-by-Component',
    description:
      'Monthly cost breakdown by observability component (Umami, OpenReplay, Grafana, etc.)',
    timeUnit: 'MONTHLY',
    granularity: 'MONTHLY',
    groupBy: 'Component',
    metrics: ['BlendedCost', 'UnblendedCost'],
  },
  {
    name: 'UserMetrics-Daily-Cost-Trend',
    description: 'Daily cost trend for UserMetrics observability infrastructure',
    timeUnit: 'DAILY',
    granularity: 'DAILY',
    groupBy: 'Service',
    metrics: ['BlendedCost'],
  },
  {
    name: 'UserMetrics-Cost-by-Function',
    description: 'Cost breakdown by function (SessionReplay, Analytics, Metrics, etc.)',
    timeUnit: 'MONTHLY',
    granularity: 'MONTHLY',
    groupBy: 'Function',
    metrics: ['BlendedCost', 'UnblendedCost'],
  },
  {
    name: 'UserMetrics-Budget-vs-Actual',
    description: 'Budget utilization tracking for $150/month limit',
    timeUnit: 'MONTHLY',
    granularity: 'MONTHLY',
    groupBy: 'Project',
    metrics: ['BlendedCost'],
  },
] as const

/**
 * Generate Cost Explorer report URLs for manual creation
 */
function generateCostExplorerReportUrls() {
  console.log('📊 Cost Explorer Saved Reports for UserMetrics Project')
  console.log('='.repeat(70))

  console.log('\n🔗 Manual Report Creation URLs:')
  console.log('   (Cost Explorer API for saved reports requires manual creation)')

  const baseUrl = 'https://console.aws.amazon.com/cost-management/home#/custom'

  for (const report of COST_EXPLORER_REPORTS) {
    console.log(`\n📈 ${report.name}:`)
    console.log(`   Description: ${report.description}`)
    console.log(`   URL: ${baseUrl}`)
    console.log(`   Configuration:`)
    console.log(`     • Time Unit: ${report.timeUnit}`)
    console.log(`     • Granularity: ${report.granularity}`)
    console.log(`     • Group By: ${report.groupBy}`)
    console.log(`     • Metrics: ${report.metrics.join(', ')}`)
    console.log(`     • Filter: Tag:Project = UserMetrics`)
  }
}

/**
 * Create AWS Resource Group for UserMetrics observability resources
 */
async function createResourceGroup() {
  console.log('\n🏷️  Creating Resource Group for UserMetrics Observability...')

  try {
    // Query resources with UserMetrics project tag
    const getResourcesCommand = new GetResourcesCommand({
      TagFilters: [
        {
          Key: 'Project',
          Values: ['UserMetrics'],
        },
      ],
    })

    const resources = await resourceGroupsClient.send(getResourcesCommand)

    console.log(
      `   Found ${resources.ResourceTagMappingList?.length || 0} resources with Project=UserMetrics tag`,
    )

    if (resources.ResourceTagMappingList && resources.ResourceTagMappingList.length > 0) {
      console.log('\n   Resources found:')
      for (const resource of resources.ResourceTagMappingList) {
        const resourceType = resource.ResourceARN?.split(':')[2] || 'Unknown'
        const resourceName = resource.ResourceARN?.split('/').pop() || 'Unknown'
        console.log(`     • ${resourceType}: ${resourceName}`)
      }
    }

    // Generate AWS CLI command for resource group creation
    console.log('\n📋 AWS CLI Command to Create Resource Group:')
    console.log('='.repeat(70))

    const resourceGroupConfig = {
      Name: 'UserMetrics-Observability',
      Description: 'All observability infrastructure resources for UserMetrics project',
      ResourceQuery: {
        Type: 'TAG_FILTERS_1_0',
        Query: JSON.stringify({
          ResourceTypeFilters: ['AWS::AllSupported'],
          TagFilters: [
            {
              Key: 'Project',
              Values: ['UserMetrics'],
            },
          ],
        }),
      },
      Tags: {
        Project: 'UserMetrics',
        Purpose: 'ResourceGrouping',
        ManagedBy: 'SST',
      },
    }

    console.log('\naws resource-groups create-group \\')
    console.log(`  --name "${resourceGroupConfig.Name}" \\`)
    console.log(`  --description "${resourceGroupConfig.Description}" \\`)
    console.log(`  --resource-query '${JSON.stringify(resourceGroupConfig.ResourceQuery)}' \\`)
    console.log(`  --tags '${JSON.stringify(resourceGroupConfig.Tags)}'`)

    return {
      resourceCount: resources.ResourceTagMappingList?.length || 0,
      resourceGroupConfig,
    }
  } catch (error) {
    console.error('❌ Error creating resource group:', error)
    throw error
  }
}

/**
 * Generate Cost Explorer configuration instructions
 */
function generateCostExplorerInstructions() {
  console.log('\n📋 Cost Explorer Configuration Instructions')
  console.log('='.repeat(70))

  console.log('\n1. 📊 Create Saved Reports:')
  console.log('   • Navigate to AWS Cost Explorer in the AWS Console')
  console.log('   • Click "Saved Reports" in the left navigation')
  console.log('   • Click "Create new report" for each report configuration above')
  console.log('   • Use the provided configurations for filters and groupings')

  console.log('\n2. 🏷️  Configure Cost Allocation Tags:')
  console.log('   • Navigate to AWS Billing Console > Cost allocation tags')
  console.log('   • Activate the following user-defined tags:')
  console.log('     - Project (primary filter)')
  console.log('     - Component (Umami, OpenReplay, Grafana, Infrastructure)')
  console.log('     - Function (SessionReplay, Analytics, Metrics, etc.)')
  console.log('     - Environment (dev, staging, prod)')
  console.log('     - CostCenter (Observability)')

  console.log('\n3. 📈 Set Up Cost Anomaly Detection:')
  console.log('   • Navigate to AWS Cost Explorer > Cost Anomaly Detection')
  console.log('   • Create anomaly detector for UserMetrics project')
  console.log('   • Set threshold: $10 (significant for $150 budget)')
  console.log('   • Configure email notifications')

  console.log('\n4. 🎯 Create Budget Alerts:')
  console.log('   • Budget already configured via SST (user-metrics-budget-{stage})')
  console.log('   • Verify budget is active and alerts are configured')
  console.log('   • Test email notifications')
}

/**
 * Main execution
 */
async function main() {
  console.log('🏗️  Setting up Cost Explorer Reports and Resource Groups')
  console.log('   for UserMetrics Observability Infrastructure')
  console.log('='.repeat(70))

  try {
    // Generate Cost Explorer report URLs
    generateCostExplorerReportUrls()

    // Create resource group
    const resourceGroupResult = await createResourceGroup()

    // Generate configuration instructions
    generateCostExplorerInstructions()

    console.log('\n✅ Setup Summary:')
    console.log(
      `   • Cost Explorer reports: ${COST_EXPLORER_REPORTS.length} configurations provided`,
    )
    console.log(`   • Resources found: ${resourceGroupResult.resourceCount}`)
    console.log(`   • Resource group: Configuration generated`)

    console.log('\n📝 Next Steps:')
    console.log('   1. Run the AWS CLI command above to create the resource group')
    console.log('   2. Create the Cost Explorer saved reports using the provided URLs')
    console.log('   3. Activate cost allocation tags in AWS Billing Console')
    console.log('   4. Set up cost anomaly detection for the UserMetrics project')
    console.log('   5. Wait 24 hours for cost data to populate with new tags')
  } catch (error) {
    console.error('❌ Error setting up Cost Explorer reports:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
