/**
 * JSON report generator for impact analysis
 * WISH-20210
 */
import { ImpactResult } from '../__types__/index.js'

/**
 * Generate a JSON report from impact analysis results
 */
export function generateJsonReport(result: ImpactResult): string {
  const report = {
    generatedAt: new Date().toISOString(),
    changeSummary: result.changeSummary,
    riskAssessment: result.riskAssessment,
    effortEstimate: result.effortEstimate,
    totalFindings: getTotalFindings(result),
    findingsByCategory: result.findingsByCategory,
    recommendations: result.recommendations,
  }

  return JSON.stringify(report, null, 2)
}

/**
 * Get total number of findings
 */
function getTotalFindings(result: ImpactResult): number {
  return Object.values(result.findingsByCategory).reduce(
    (sum, findings) => sum + findings.length,
    0,
  )
}
