#!/usr/bin/env node
/**
 * Cost Optimization Analysis for UserMetrics Observability Infrastructure
 * Story 1.4: Cost Monitoring and Budget Alerts (AC 5)
 *
 * This script analyzes current cost patterns and provides specific optimization
 * recommendations for each component of the observability infrastructure.
 */

import {
  getCostByProject,
  getCostByComponent,
  getCostByFunction,
} from '../../src/lib/cost-monitoring/cost-explorer'
import fs from 'fs'
import path from 'path'

interface OptimizationRecommendation {
  component: string
  currentCost: number
  potentialSavings: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  recommendations: string[]
  implementation: string[]
}

/**
 * Analyze OpenReplay cost optimization opportunities
 */
function analyzeOpenReplayCosts(cost: number): OptimizationRecommendation {
  const potentialSavings = cost * 0.25 // Estimate 25% savings potential

  return {
    component: 'OpenReplay',
    currentCost: cost,
    potentialSavings,
    priority: cost > 50 ? 'HIGH' : 'MEDIUM',
    recommendations: [
      'Optimize session recording retention (currently 30 days)',
      'Review ECS task CPU/memory allocation for right-sizing',
      'Implement S3 Intelligent-Tiering for session storage',
      'Consider session sampling for high-traffic periods',
      'Optimize Application Load Balancer target group health checks',
    ],
    implementation: [
      'Analyze session storage usage patterns in S3',
      'Monitor ECS task utilization metrics in CloudWatch',
      'Review session recording quality settings',
      'Implement conditional recording based on user segments',
      'Set up CloudWatch alarms for cost anomalies',
    ],
  }
}

/**
 * Analyze Umami cost optimization opportunities
 */
function analyzeUmamiCosts(cost: number): OptimizationRecommendation {
  const potentialSavings = cost * 0.2 // Estimate 20% savings potential

  return {
    component: 'Umami',
    currentCost: cost,
    potentialSavings,
    priority: cost > 30 ? 'HIGH' : 'MEDIUM',
    recommendations: [
      'Optimize Aurora PostgreSQL database connections',
      'Review analytics data retention policies',
      'Implement database query optimization',
      'Consider read replicas for analytics queries',
      'Optimize ECS task scaling policies',
    ],
    implementation: [
      'Enable Aurora Performance Insights',
      'Implement connection pooling (PgBouncer)',
      'Review and optimize slow queries',
      'Set up database monitoring dashboards',
      'Implement auto-scaling based on CPU/memory metrics',
    ],
  }
}

/**
 * Analyze Infrastructure cost optimization opportunities
 */
function analyzeInfrastructureCosts(cost: number): OptimizationRecommendation {
  const potentialSavings = cost * 0.3 // Estimate 30% savings potential

  return {
    component: 'Infrastructure',
    currentCost: cost,
    potentialSavings,
    priority: 'HIGH',
    recommendations: [
      'Implement VPC endpoints to reduce NAT Gateway costs',
      'Optimize security group rules and network ACLs',
      'Review inter-AZ data transfer patterns',
      'Consider VPC peering for cross-region communication',
      'Implement network monitoring and optimization',
    ],
    implementation: [
      'Create VPC endpoints for S3, ECR, and CloudWatch',
      'Analyze VPC Flow Logs for traffic patterns',
      'Implement least-privilege network access',
      'Set up network cost monitoring',
      'Review and consolidate security groups',
    ],
  }
}

/**
 * Analyze CloudWatch cost optimization opportunities
 */
function analyzeCloudWatchCosts(cost: number): OptimizationRecommendation {
  const potentialSavings = cost * 0.35 // Estimate 35% savings potential

  return {
    component: 'CloudWatch',
    currentCost: cost,
    potentialSavings,
    priority: cost > 20 ? 'HIGH' : 'MEDIUM',
    recommendations: [
      'Optimize log retention policies (currently indefinite)',
      'Implement log aggregation and filtering',
      'Review custom metrics usage and necessity',
      'Optimize dashboard refresh intervals',
      'Implement log compression and archival',
    ],
    implementation: [
      'Set appropriate log retention periods (7-30 days)',
      'Implement CloudWatch Logs Insights for analysis',
      'Create metric filters for important events only',
      'Archive old logs to S3 with lifecycle policies',
      'Review and remove unused custom metrics',
    ],
  }
}

/**
 * Generate comprehensive cost optimization report
 */
async function generateOptimizationReport(days: number = 30) {
  console.log('🔍 Analyzing UserMetrics cost optimization opportunities...\n')

  const { startDate, endDate } = getDateRange(days)

  try {
    // Fetch cost data
    const [projectCosts, componentCosts] = await Promise.all([
      getCostByProject(startDate, endDate, 'MONTHLY'),
      getCostByComponent(startDate, endDate, 'MONTHLY'),
    ])

    const totalCost = projectCosts.reduce(
      (sum, period) => sum + parseFloat(period.total.blendedCost.amount),
      0,
    )

    // Analyze each component
    const optimizations: OptimizationRecommendation[] = []

    for (const timeResult of componentCosts) {
      if (timeResult.groups) {
        for (const group of timeResult.groups) {
          const component = group.keys[0]
          const cost = parseFloat(group.metrics.BlendedCost.amount)

          if (cost > 0) {
            let optimization: OptimizationRecommendation

            switch (component) {
              case 'OpenReplay':
                optimization = analyzeOpenReplayCosts(cost)
                break
              case 'Umami':
                optimization = analyzeUmamiCosts(cost)
                break
              case 'Infrastructure':
                optimization = analyzeInfrastructureCosts(cost)
                break
              case 'CloudWatch':
                optimization = analyzeCloudWatchCosts(cost)
                break
              default:
                optimization = {
                  component,
                  currentCost: cost,
                  potentialSavings: cost * 0.15,
                  priority: 'LOW',
                  recommendations: ['Review resource utilization and right-sizing opportunities'],
                  implementation: ['Monitor usage patterns and optimize accordingly'],
                }
            }

            optimizations.push(optimization)
          }
        }
      }
    }

    // Sort by potential savings (highest first)
    optimizations.sort((a, b) => b.potentialSavings - a.potentialSavings)

    return {
      totalCost,
      totalPotentialSavings: optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0),
      optimizations,
      budgetUtilization: (totalCost / 150) * 100, // $150 budget
    }
  } catch (error) {
    console.error('❌ Error generating optimization report:', error)
    throw error
  }
}

/**
 * Get date range for analysis
 */
function getDateRange(days: number) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

/**
 * Format optimization report
 */
function formatOptimizationReport(report: any): string {
  let output = '═'.repeat(80) + '\n'
  output += '   USERMETRICS COST OPTIMIZATION ANALYSIS\n'
  output += '═'.repeat(80) + '\n\n'

  output += `💰 Current Monthly Cost: $${report.totalCost.toFixed(2)}\n`
  output += `🎯 Budget Limit: $150.00\n`
  output += `📊 Budget Utilization: ${report.budgetUtilization.toFixed(1)}%\n`
  output += `💡 Total Potential Savings: $${report.totalPotentialSavings.toFixed(2)} (${((report.totalPotentialSavings / report.totalCost) * 100).toFixed(1)}%)\n\n`

  // Budget status
  if (report.budgetUtilization >= 100) {
    output += '🚨 STATUS: OVER BUDGET - Immediate action required!\n\n'
  } else if (report.budgetUtilization >= 80) {
    output += '⚠️  STATUS: APPROACHING LIMIT - Optimization recommended\n\n'
  } else {
    output += '✅ STATUS: Within budget - Proactive optimization opportunities\n\n'
  }

  // Component optimizations
  output += '─'.repeat(80) + '\n'
  output += '   OPTIMIZATION RECOMMENDATIONS BY COMPONENT\n'
  output += '─'.repeat(80) + '\n\n'

  for (const opt of report.optimizations) {
    output += `🔧 ${opt.component} (Priority: ${opt.priority})\n`
    output += `   Current Cost: $${opt.currentCost.toFixed(2)}\n`
    output += `   Potential Savings: $${opt.potentialSavings.toFixed(2)}\n\n`

    output += '   Recommendations:\n'
    for (const rec of opt.recommendations) {
      output += `   • ${rec}\n`
    }

    output += '\n   Implementation Steps:\n'
    for (const impl of opt.implementation) {
      output += `   1. ${impl}\n`
    }
    output += '\n'
  }

  return output
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const days = args[0] ? parseInt(args[0]) : 30
  const outputDir = args[1] || 'reports/cost-optimization'

  console.log('🔍 UserMetrics Cost Optimization Analysis')
  console.log(`   Period: Last ${days} days`)
  console.log(`   Output: ${outputDir}\n`)

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  try {
    const report = await generateOptimizationReport(days)

    // Write JSON report
    const jsonPath = path.join(outputDir, 'cost-optimization-analysis.json')
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
    console.log(`✅ JSON report saved: ${jsonPath}`)

    // Write formatted report
    const textPath = path.join(outputDir, 'cost-optimization-recommendations.txt')
    const textReport = formatOptimizationReport(report)
    fs.writeFileSync(textPath, textReport)
    console.log(`✅ Recommendations saved: ${textPath}`)

    // Display summary
    console.log('\n' + textReport)

    console.log('📋 Next Steps:')
    console.log('   1. Review high-priority recommendations first')
    console.log('   2. Implement quick wins (log retention, right-sizing)')
    console.log('   3. Plan infrastructure optimizations (VPC endpoints)')
    console.log('   4. Monitor cost impact after each optimization')
    console.log('   5. Schedule monthly cost optimization reviews')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
