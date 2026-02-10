/**
 * Enum change analyzer for impact analysis
 * WISH-20210
 */
import { Project } from 'ts-morph'
import {
  ParsedChange,
  ImpactResult,
  ImpactFinding,
  ImpactCategory,
} from '../__types__/index.js'
import { EnumInfo } from '../utils/schema-introspector.js'
import { scanForEnumReferences, scanForSchemaReferences } from '../utils/ast-scanner.js'

/**
 * Analyze enum change impact
 * Handles: add-value, remove-value, rename-value
 */
export function analyzeEnumChange(
  project: Project,
  parsedChange: ParsedChange,
  enumInfo: EnumInfo,
  monorepoRoot: string,
): ImpactResult {
  const { operation, target, newName } = parsedChange

  switch (operation) {
    case 'add-value':
      return analyzeAddValue(parsedChange, enumInfo, project, monorepoRoot)

    case 'remove-value':
      return analyzeRemoveValue(parsedChange, enumInfo, project, monorepoRoot)

    case 'rename-value':
      return analyzeRenameValue(parsedChange, enumInfo, project, monorepoRoot)

    default:
      throw new Error(`Unsupported enum operation: ${operation}`)
  }
}

/**
 * Analyze adding an enum value
 */
function analyzeAddValue(
  parsedChange: ParsedChange,
  enumInfo: EnumInfo,
  project: Project,
  monorepoRoot: string,
): ImpactResult {
  const { target } = parsedChange
  const findings: ImpactFinding[] = []

  // Find enum schema name (e.g., wishlist_store -> WishlistStore)
  const schemaName = toSchemaName(enumInfo.name)

  // Scan for Zod schema references
  const zodSchemaFiles = scanForSchemaReferences(project, `${schemaName}Schema`)

  // Add findings for Zod schemas
  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Zod enum schema needs new value '${target}'`,
      recommendation: `Add '${target}' to the z.enum([...]) values array`,
    })
  }

  // Scan for enum references to find potential switch statements
  const enumFiles = scanForEnumReferences(project, schemaName)

  for (const file of enumFiles) {
    const category = categorizeFile(file)
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category,
      confidence: 'medium',
      description: `File uses ${schemaName} enum - may need to handle new value '${target}'`,
      recommendation: 'Review switch statements and conditional logic to handle the new enum value',
    })
  }

  const effortEstimate = findings.length > 10 ? 'High' : findings.length > 5 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'add-value',
      target,
      description: `Adding enum value '${target}' to ${enumInfo.name}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: false,
      backwardCompatible: true,
      rollbackSafe: true,
      deploymentOrder: ['database', 'backend', 'frontend'],
    },
    recommendations: [
      'Non-breaking: Adding enum value is backward compatible',
      'Update Zod enum schema with new value',
      'Review switch statements for exhaustiveness',
      'Update API documentation with new enum option',
      'Consider adding validation tests',
    ],
    effortEstimate,
  }
}

/**
 * Analyze removing an enum value
 */
function analyzeRemoveValue(
  parsedChange: ParsedChange,
  enumInfo: EnumInfo,
  project: Project,
  monorepoRoot: string,
): ImpactResult {
  const { target } = parsedChange
  const findings: ImpactFinding[] = []

  // Find enum schema name
  const schemaName = toSchemaName(enumInfo.name)

  // Scan for specific enum value usage
  const valueFiles = scanForEnumReferences(project, schemaName, target)

  // High impact - value is being removed
  for (const file of valueFiles) {
    const category = categorizeFile(file)
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category,
      confidence: 'high',
      description: `Enum value '${target}' is hardcoded and will be removed`,
      recommendation: 'Remove or replace all references to this enum value before dropping',
    })
  }

  // Scan for Zod schema references
  const zodSchemaFiles = scanForSchemaReferences(project, `${schemaName}Schema`)

  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Remove '${target}' from Zod enum schema`,
      recommendation: `Delete '${target}' from z.enum([...]) values array`,
    })
  }

  const effortEstimate = findings.length > 15 ? 'High' : findings.length > 8 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'remove-value',
      target,
      description: `Removing enum value '${target}' from ${enumInfo.name}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: true,
      backwardCompatible: false,
      rollbackSafe: false,
      deploymentOrder: ['frontend', 'backend', 'database'],
    },
    recommendations: [
      'BREAKING CHANGE: Remove all code references first',
      'Check database for existing rows with this value',
      'Migrate existing data to alternative enum value',
      'Deploy code changes before database migration',
      'Consider deprecation period instead of immediate removal',
    ],
    effortEstimate,
  }
}

/**
 * Analyze renaming an enum value
 */
function analyzeRenameValue(
  parsedChange: ParsedChange,
  enumInfo: EnumInfo,
  project: Project,
  monorepoRoot: string,
): ImpactResult {
  const { target, newName } = parsedChange
  const findings: ImpactFinding[] = []

  // Find enum schema name
  const schemaName = toSchemaName(enumInfo.name)

  // Scan for specific enum value usage
  const valueFiles = scanForEnumReferences(project, schemaName, target)

  // All references need to be updated
  for (const file of valueFiles) {
    const category = categorizeFile(file)
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category,
      confidence: 'high',
      description: `Enum value '${target}' needs to be renamed to '${newName}'`,
      recommendation: `Update all string literals from '${target}' to '${newName}'`,
    })
  }

  // Scan for Zod schema references
  const zodSchemaFiles = scanForSchemaReferences(project, `${schemaName}Schema`)

  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Rename enum value '${target}' to '${newName}' in Zod schema`,
      recommendation: `Update enum value in z.enum([...]) array`,
    })
  }

  const effortEstimate = findings.length > 15 ? 'High' : findings.length > 8 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'rename-value',
      target,
      description: `Renaming enum value '${target}' to '${newName}' in ${enumInfo.name}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: true,
      backwardCompatible: false,
      rollbackSafe: true,
      deploymentOrder: ['database-add-new', 'backend', 'frontend', 'database-drop-old'],
    },
    recommendations: [
      'BREAKING CHANGE: Consider migration strategy',
      'Step 1: Add new enum value to database',
      'Step 2: Update code to accept both old and new values',
      'Step 3: Migrate existing database rows',
      'Step 4: Update code to use only new value',
      'Step 5: Remove old enum value',
    ],
    effortEstimate,
  }
}

/**
 * Categorize file by its path
 */
function categorizeFile(filePath: string): ImpactCategory {
  if (filePath.includes('repository') || filePath.includes('adapters')) return 'repository'
  if (filePath.includes('apps/api')) return 'backend-service'
  if (filePath.includes('api-client/src/schemas')) return 'zod-schema'
  if (filePath.includes('apps/web') && filePath.includes('components')) return 'frontend-component'
  if (filePath.includes('apps/web') && filePath.includes('hooks')) return 'api-hook'
  if (filePath.includes('database-schema')) return 'db-schema'
  return 'backend-service'
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

/**
 * Convert enum name to schema name (e.g., wishlist_store -> WishlistStore)
 */
function toSchemaName(enumName: string): string {
  return enumName
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
