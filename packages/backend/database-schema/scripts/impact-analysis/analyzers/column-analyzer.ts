/**
 * Column change analyzer for impact analysis
 * WISH-20210
 */
import { Project } from 'ts-morph'
import {
  ParsedChange,
  ImpactResult,
  ImpactFinding,
  ImpactCategory,
} from '../__types__/index.js'
import { TableInfo } from '../utils/schema-introspector.js'
import {
  scanForTableReferences,
  scanForColumnReferences,
  scanForSchemaReferences,
  scanForTypeImports,
} from '../utils/ast-scanner.js'

/**
 * Analyze column change impact
 * Handles: add-column, drop-column, rename-column, change-type
 */
export function analyzeColumnChange(
  project: Project,
  parsedChange: ParsedChange,
  tableInfo: TableInfo,
  monorepoRoot: string,
): ImpactResult {
  const { operation, target, newName, newType } = parsedChange
  const findings: ImpactFinding[] = []

  // Scan for affected files
  const tableFiles = scanForTableReferences(project, tableInfo.name)
  const columnFiles = scanForColumnReferences(project, tableInfo.name, target)

  // Generate table name for schemas (e.g., wishlist_items -> WishlistItem)
  const schemaBaseName = toSchemaName(tableInfo.name)

  // Scan for Zod schema references
  const zodSchemaFiles = scanForSchemaReferences(project, `${schemaBaseName}Schema`)
  const zodTypeFiles = scanForTypeImports(project, schemaBaseName)

  switch (operation) {
    case 'add-column':
      return analyzeAddColumn(
        parsedChange,
        tableInfo,
        tableFiles,
        zodSchemaFiles,
        zodTypeFiles,
        monorepoRoot,
      )

    case 'drop-column':
      return analyzeDropColumn(
        parsedChange,
        tableInfo,
        columnFiles,
        zodSchemaFiles,
        zodTypeFiles,
        monorepoRoot,
      )

    case 'rename-column':
      return analyzeRenameColumn(
        parsedChange,
        tableInfo,
        columnFiles,
        zodSchemaFiles,
        zodTypeFiles,
        monorepoRoot,
      )

    case 'change-type':
      return analyzeChangeType(
        parsedChange,
        tableInfo,
        columnFiles,
        zodSchemaFiles,
        zodTypeFiles,
        monorepoRoot,
      )

    default:
      throw new Error(`Unsupported column operation: ${operation}`)
  }
}

/**
 * Analyze adding a column
 */
function analyzeAddColumn(
  parsedChange: ParsedChange,
  tableInfo: TableInfo,
  tableFiles: string[],
  zodSchemaFiles: string[],
  zodTypeFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target, newType } = parsedChange
  const findings: ImpactFinding[] = []

  // Check if column is nullable or has default
  const isOptional = true // Assume optional for new columns (safest assumption)

  // Add findings for Zod schemas
  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Zod schema needs new optional field '${target}' with type ${newType || 'unknown'}`,
      recommendation: `Add ${target}: z.${mapTypeToZod(newType)}.optional() to schema definition`,
    })
  }

  // Add findings for backend services
  for (const file of tableFiles) {
    if (file.includes('apps/api/lego-api/domains') && !file.includes('repository')) {
      findings.push({
        file: file.replace(monorepoRoot, ''),
        category: 'backend-service',
        confidence: 'medium',
        description: `Backend service may need to handle new column '${target}'`,
        recommendation: 'Review if service logic needs to populate or validate this new field',
      })
    }
  }

  const breaking = !isOptional
  const effortEstimate = findings.length > 10 ? 'High' : findings.length > 5 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'add-column',
      target,
      description: `Adding ${isOptional ? 'optional' : 'required'} column '${target}' with type ${newType || 'unknown'}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking,
      backwardCompatible: isOptional,
      rollbackSafe: true,
      deploymentOrder: ['database', 'backend', 'frontend'],
    },
    recommendations: [
      'Add migration with ALTER TABLE ADD COLUMN',
      'Update Zod schemas with optional field',
      breaking ? 'Deploy database changes before code changes' : 'Safe to deploy in any order',
      'Update API documentation',
    ],
    effortEstimate,
  }
}

/**
 * Analyze dropping a column
 */
function analyzeDropColumn(
  parsedChange: ParsedChange,
  tableInfo: TableInfo,
  columnFiles: string[],
  zodSchemaFiles: string[],
  zodTypeFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target } = parsedChange
  const findings: ImpactFinding[] = []

  // High impact - column is being removed
  for (const file of columnFiles) {
    const category = categorizeFile(file)
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category,
      confidence: 'high',
      description: `Column '${target}' is referenced and will be removed`,
      recommendation: 'Remove all references to this column before dropping',
    })
  }

  // Zod schemas need updates
  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Remove '${target}' field from Zod schema`,
      recommendation: `Delete ${target} field definition from schema`,
    })
  }

  const effortEstimate = findings.length > 15 ? 'High' : findings.length > 8 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'drop-column',
      target,
      description: `Dropping column '${target}' from table`,
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
      'Deploy code changes before database migration',
      'Consider deprecation period instead of immediate removal',
      'Update API documentation to mark field as deprecated',
    ],
    effortEstimate,
  }
}

/**
 * Analyze renaming a column
 */
function analyzeRenameColumn(
  parsedChange: ParsedChange,
  tableInfo: TableInfo,
  columnFiles: string[],
  zodSchemaFiles: string[],
  zodTypeFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target, newName } = parsedChange
  const findings: ImpactFinding[] = []

  // All references need to be updated
  for (const file of columnFiles) {
    const category = categorizeFile(file)
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category,
      confidence: 'high',
      description: `Column reference '${target}' needs to be renamed to '${newName}'`,
      recommendation: `Update all references from ${target} to ${newName}`,
    })
  }

  // Zod schemas need updates
  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Rename schema field '${target}' to '${newName}'`,
      recommendation: `Update field name in schema definition and maintain backward compatibility if needed`,
    })
  }

  const effortEstimate = findings.length > 15 ? 'High' : findings.length > 8 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'rename-column',
      target,
      description: `Renaming column '${target}' to '${newName}'`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: true,
      backwardCompatible: false,
      rollbackSafe: true,
      deploymentOrder: ['database-add-new', 'backend', 'frontend', 'database-drop-old'],
    },
    recommendations: [
      'BREAKING CHANGE: Consider using a migration strategy with both columns',
      'Step 1: Add new column with same type',
      'Step 2: Dual-write to both columns in application',
      'Step 3: Migrate existing data',
      'Step 4: Update code to read from new column',
      'Step 5: Drop old column',
    ],
    effortEstimate,
  }
}

/**
 * Analyze changing column type
 */
function analyzeChangeType(
  parsedChange: ParsedChange,
  tableInfo: TableInfo,
  columnFiles: string[],
  zodSchemaFiles: string[],
  zodTypeFiles: string[],
  monorepoRoot: string,
): ImpactResult {
  const { target, newType } = parsedChange
  const findings: ImpactFinding[] = []

  // Type change affects all usages
  for (const file of columnFiles) {
    const category = categorizeFile(file)
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category,
      confidence: 'medium',
      description: `Column '${target}' type is changing to ${newType}`,
      recommendation: 'Review code for type compatibility and add necessary conversions',
    })
  }

  // Zod schemas need type updates
  for (const file of zodSchemaFiles) {
    findings.push({
      file: file.replace(monorepoRoot, ''),
      category: 'zod-schema',
      confidence: 'high',
      description: `Update Zod validation for '${target}' to match new type ${newType}`,
      recommendation: `Change schema type to z.${mapTypeToZod(newType)}()`,
    })
  }

  const effortEstimate = findings.length > 12 ? 'High' : findings.length > 6 ? 'Medium' : 'Low'

  return {
    changeSummary: {
      operation: 'change-type',
      target,
      description: `Changing column '${target}' type to ${newType}`,
    },
    findingsByCategory: groupByCategory(findings),
    riskAssessment: {
      breaking: true,
      backwardCompatible: false,
      rollbackSafe: false,
      deploymentOrder: ['database', 'backend', 'frontend'],
    },
    recommendations: [
      'BREAKING CHANGE: Type changes require data migration',
      'Create migration to convert existing data',
      'Update Zod schemas with new type',
      'Test thoroughly with existing data',
      'Consider backward compatibility period',
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
 * Map database type to Zod type
 */
function mapTypeToZod(dbType: string | undefined): string {
  if (!dbType) return 'string'

  const typeMap: Record<string, string> = {
    text: 'string',
    integer: 'number',
    uuid: 'string',
    timestamp: 'string',
    boolean: 'boolean',
    jsonb: 'object',
  }

  return typeMap[dbType] || 'string'
}

/**
 * Convert table name to schema name (e.g., wishlist_items -> WishlistItem)
 */
function toSchemaName(tableName: string): string {
  return tableName
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
    .replace(/s$/, '') // Remove trailing 's' for singular
}
