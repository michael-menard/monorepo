/**
 * Constraint change analyzer for impact analysis
 * WISH-20210
 */
import { Project } from 'ts-morph'
import {
  ParsedChange,
  ImpactResult,
  ImpactFinding,
  ImpactCategory,
} from '../__types__/index.js'
import { scanForTableReferences } from '../utils/ast-scanner.js'

/**
 * Analyze constraint change impact
 * Handles: add-index, add-fk, modify-constraint
 */
export function analyzeConstraintChange(
  project: Project,
  parsedChange: ParsedChange,
  tableName: string,
  monorepoRoot: string,
): ImpactResult {
  const { operation, target } = parsedChange
  const findings: ImpactFinding[] = []

  // Scan for files that reference the table
  const tableFiles = scanForTableReferences(project, tableName)

  switch (operation) {
    case 'add-index':
      return analyzeAddIndex(parsedChange, tableName, tableFiles, monorepoRoot)

    case 'add-fk':
      return analyzeAddForeignKey(parsedChange, tableName, tableFiles, monorepoRoot)

    case 'modify-constraint':
      return analyzeModifyConstraint(parsedChange, tableName, tableFiles, monorepoRoot)

    default:
      throw new Error(`Unsupported constraint operation: ${operation}`)
  }
}

/**
 * Analyze adding an index
 */
function analyzeAddIndex(
  parsedChange: ParsedChange,
  tableName: string,
  tableFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target } = parsedChange
  const findings: ImpactFinding[] = []

  // Index additions are generally low impact on code
  for (const file of tableFiles.slice(0, 3)) {
    // Limit to top 3 for brevity
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'repository',
      confidence: 'low',
      description: `Queries on '${target}' may benefit from new index`,
      recommendation: 'No code changes required - performance may improve',
    })
  }

  return {
    changeSummary: {
      operation: 'add-index',
      target,
      description: `Adding index on '${target}' to ${tableName}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: false,
      backwardCompatible: true,
      rollbackSafe: true,
      deploymentOrder: ['database'],
    },
    recommendations: [
      'Non-breaking: Index addition is transparent to application code',
      'Monitor query performance after deployment',
      'Consider CREATE INDEX CONCURRENTLY to avoid table locks',
      'Test in staging environment first',
    ],
    effortEstimate: 'Low',
  }
}

/**
 * Analyze adding a foreign key
 */
function analyzeAddForeignKey(
  parsedChange: ParsedChange,
  tableName: string,
  tableFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target } = parsedChange
  const findings: ImpactFinding[] = []

  // Foreign key additions can affect inserts/updates
  for (const file of tableFiles) {
    if (file.includes('repository') || file.includes('service')) {
      findings.push({
        file: file.replace(monorepoRoot, ''),
        category: 'repository',
        confidence: 'medium',
        description: `Foreign key on '${target}' will enforce referential integrity`,
        recommendation: 'Ensure inserts/updates provide valid referenced values',
      })
    }
  }

  return {
    changeSummary: {
      operation: 'add-fk',
      target,
      description: `Adding foreign key constraint on '${target}' in ${tableName}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: true,
      backwardCompatible: false,
      rollbackSafe: true,
      deploymentOrder: ['cleanup-data', 'database', 'backend'],
    },
    recommendations: [
      'BREAKING CHANGE: Foreign key will reject invalid references',
      'Clean up existing data with invalid references first',
      'Update application logic to validate referenced IDs',
      'Consider adding CASCADE options for delete/update behavior',
      'Test constraint with existing data before deployment',
    ],
    effortEstimate: 'Medium',
  }
}

/**
 * Analyze modifying a constraint
 */
function analyzeModifyConstraint(
  parsedChange: ParsedChange,
  tableName: string,
  tableFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target } = parsedChange
  const findings: ImpactFinding[] = []

  // Constraint modifications can affect data validation
  for (const file of tableFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'repository',
      confidence: 'medium',
      description: `Constraint '${target}' is being modified`,
      recommendation: 'Review affected queries and validation logic',
    })
  }

  return {
    changeSummary: {
      operation: 'modify-constraint',
      target,
      description: `Modifying constraint '${target}' on ${tableName}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: true,
      backwardCompatible: false,
      rollbackSafe: false,
      deploymentOrder: ['backend', 'database'],
    },
    recommendations: [
      'BREAKING CHANGE: Constraint modification may reject existing patterns',
      'Review and update application validation logic',
      'Test with existing data before deployment',
      'Consider two-phase approach: relax constraint first, then tighten',
    ],
    effortEstimate: 'Medium',
  }
}

/**
 * Group findings by category
 */
function groupByCategory(
  findings: ImpactFinding[],
): Record<ImpactCategory, ImpactFinding[]> {
  const grouped: Record<string, ImpactFinding[]> = {}

  for (const finding of findings) {
    if (!grouped[finding.category]) {
      grouped[finding.category] = []
    }
    grouped[finding.category].push(finding)
  }

  return grouped as Record<ImpactCategory, ImpactFinding[]>
}
