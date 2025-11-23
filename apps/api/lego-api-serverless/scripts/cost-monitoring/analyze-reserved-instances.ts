#!/usr/bin/env node
/**
 * Analyze Reserved Instance recommendations for RDS, ElastiCache, and OpenSearch
 * Story 5.7: Configure AWS Cost Monitoring and Budgets (AC 9)
 *
 * Fetches RI recommendations from AWS Cost Explorer and calculates potential savings
 */

import {
  CostExplorerClient,
  GetReservationPurchaseRecommendationCommand,
  type GetReservationPurchaseRecommendationCommandInput,
} from '@aws-sdk/client-cost-explorer'
import fs from 'fs'
import path from 'path'

interface RIRecommendation {
  service: string
  instanceType?: string
  estimatedMonthlySavings: number
  estimatedAnnualSavings: number
  upfrontCost: number
  monthlyRecurringCost: number
  recommendedNumberOfInstances: number
  lookbackPeriodDays: number
  termYears: number
  paymentOption: string
}

interface RIAnalysisReport {
  generatedAt: string
  totalEstimatedMonthlySavings: number
  totalEstimatedAnnualSavings: number
  recommendations: RIRecommendation[]
  costEffective: boolean
  recommendation: string
}

/**
 * Fetch RI recommendations for a specific service
 */
async function getRecommendationsForService(
  client: CostExplorerClient,
  service: string,
  lookbackDays: number,
  termYears: number,
  paymentOption: string,
): Promise<RIRecommendation | null> {
  const params: GetReservationPurchaseRecommendationCommandInput = {
    Service: service,
    LookbackPeriodInDays: lookbackDays === 60 ? 'SIXTY_DAYS' : 'THIRTY_DAYS',
    TermInYears: termYears === 1 ? 'ONE_YEAR' : 'THREE_YEARS',
    PaymentOption: paymentOption as any,
  }

  try {
    const command = new GetReservationPurchaseRecommendationCommand(params)
    const response = await client.send(command)

    if (
      !response.Recommendations ||
      !response.Recommendations.RecommendationDetails ||
      response.Recommendations.RecommendationDetails.length === 0
    ) {
      return null
    }

    const detail = response.Recommendations.RecommendationDetails[0]

    const monthlySavings = parseFloat(
      detail.EstimatedMonthlySavingsAmount || '0',
    )
    const annualSavings = monthlySavings * 12

    const upfrontCost = parseFloat(detail.UpfrontCost || '0')
    const monthlyRecurringCost = parseFloat(detail.RecurringStandardMonthlyCost || '0')

    const recommendedInstances = parseInt(
      detail.RecommendedNumberOfInstancesToPurchase || '0',
    )

    return {
      service,
      instanceType: detail.InstanceDetails?.RDSInstanceDetails?.InstanceType ||
        detail.InstanceDetails?.ElastiCacheInstanceDetails?.NodeType ||
        detail.InstanceDetails?.ESInstanceDetails?.InstanceClass ||
        'N/A',
      estimatedMonthlySavings: monthlySavings,
      estimatedAnnualSavings: annualSavings,
      upfrontCost,
      monthlyRecurringCost,
      recommendedNumberOfInstances: recommendedInstances,
      lookbackPeriodDays: lookbackDays,
      termYears,
      paymentOption,
    }
  } catch (error: any) {
    console.warn(`⚠️  Could not fetch recommendations for ${service}:`, error.message)
    return null
  }
}

/**
 * Generate human-readable RI analysis report
 */
function formatRIReport(report: RIAnalysisReport): string {
  let output = '═'.repeat(70) + '\n'
  output += '   RESERVED INSTANCE ANALYSIS - LEGO API\n'
  output += '═'.repeat(70) + '\n\n'

  output += `📅 Generated: ${new Date(report.generatedAt).toLocaleString()}\n`
  output += `💰 Total Estimated Monthly Savings: $${report.totalEstimatedMonthlySavings.toFixed(2)}\n`
  output += `📈 Total Estimated Annual Savings: $${report.totalEstimatedAnnualSavings.toFixed(2)}\n\n`

  if (report.recommendations.length === 0) {
    output += '✅ No Reserved Instance recommendations available.\n'
    output += '   Current usage levels do not justify RI purchases.\n\n'
    return output
  }

  output += '─'.repeat(70) + '\n'
  output += '   RECOMMENDATIONS BY SERVICE\n'
  output += '─'.repeat(70) + '\n\n'

  for (const rec of report.recommendations) {
    output += `🔹 ${rec.service}\n`
    output += `   Instance Type: ${rec.instanceType}\n`
    output += `   Recommended Quantity: ${rec.recommendedNumberOfInstances}\n`
    output += `   Term: ${rec.termYears} year(s)\n`
    output += `   Payment: ${rec.paymentOption}\n`
    output += `   Upfront Cost: $${rec.upfrontCost.toFixed(2)}\n`
    output += `   Monthly Recurring: $${rec.monthlyRecurringCost.toFixed(2)}\n`
    output += `   💵 Estimated Monthly Savings: $${rec.estimatedMonthlySavings.toFixed(2)}\n`
    output += `   💵 Estimated Annual Savings: $${rec.estimatedAnnualSavings.toFixed(2)}\n\n`
  }

  output += '─'.repeat(70) + '\n'
  output += '   RECOMMENDATION\n'
  output += '─'.repeat(70) + '\n\n'

  output += report.recommendation + '\n\n'

  output += '═'.repeat(70) + '\n'

  return output
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const outputDir = args[0] || 'reports/reserved-instances'

  console.log('📊 Analyzing Reserved Instance recommendations...\n')

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Initialize Cost Explorer client
  const client = new CostExplorerClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  console.log('🔍 Fetching RI recommendations from AWS Cost Explorer...')

  // Configuration
  const lookbackDays = 60
  const termYears = 1
  const paymentOption = 'NO_UPFRONT'

  // Fetch recommendations for each service
  const [rdsRec, elasticacheRec, openSearchRec] = await Promise.all([
    getRecommendationsForService(
      client,
      'Amazon Relational Database Service',
      lookbackDays,
      termYears,
      paymentOption,
    ),
    getRecommendationsForService(
      client,
      'Amazon ElastiCache',
      lookbackDays,
      termYears,
      paymentOption,
    ),
    getRecommendationsForService(
      client,
      'Amazon OpenSearch Service',
      lookbackDays,
      termYears,
      paymentOption,
    ),
  ])

  // Collect valid recommendations
  const recommendations: RIRecommendation[] = []
  if (rdsRec) recommendations.push(rdsRec)
  if (elasticacheRec) recommendations.push(elasticacheRec)
  if (openSearchRec) recommendations.push(openSearchRec)

  // Calculate totals
  const totalMonthlySavings = recommendations.reduce(
    (sum, rec) => sum + rec.estimatedMonthlySavings,
    0,
  )
  const totalAnnualSavings = totalMonthlySavings * 12

  // Determine if cost-effective (threshold: $20/month)
  const costEffectiveThreshold = 20
  const costEffective = totalMonthlySavings >= costEffectiveThreshold

  // Generate recommendation text
  let recommendationText = ''
  if (costEffective) {
    recommendationText = `💡 RECOMMENDATION: Purchase Reserved Instances\n\n`
    recommendationText += `   Estimated monthly savings of $${totalMonthlySavings.toFixed(2)} justify RI purchase.\n`
    recommendationText += `   Annual savings: $${totalAnnualSavings.toFixed(2)}\n`
    recommendationText += `   Break-even period: ${(0 / totalMonthlySavings).toFixed(1)} months (no upfront cost)\n`
  } else {
    recommendationText = `✅ RECOMMENDATION: Continue with On-Demand pricing\n\n`
    recommendationText += `   Current usage levels do not justify Reserved Instance purchases.\n`
    if (totalMonthlySavings > 0) {
      recommendationText += `   Savings would be only $${totalMonthlySavings.toFixed(2)}/month.\n`
    }
    recommendationText += `   Re-evaluate in 30 days as usage grows.`
  }

  // Build report
  const report: RIAnalysisReport = {
    generatedAt: new Date().toISOString(),
    totalEstimatedMonthlySavings: totalMonthlySavings,
    totalEstimatedAnnualSavings: totalAnnualSavings,
    recommendations,
    costEffective,
    recommendation: recommendationText,
  }

  // Write JSON report
  const jsonPath = path.join(outputDir, 'ri-analysis.json')
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  console.log(`✅ JSON report saved: ${jsonPath}`)

  // Write human-readable report
  const textPath = path.join(outputDir, 'ri-summary.txt')
  const textReport = formatRIReport(report)
  fs.writeFileSync(textPath, textReport)
  console.log(`✅ Summary report saved: ${textPath}`)

  // Display summary
  console.log('\n' + textReport)

  // Exit with success
  process.exit(0)
}

// Run main function
main().catch((error) => {
  console.error('❌ Error analyzing Reserved Instances:', error)
  process.exit(1)
})
