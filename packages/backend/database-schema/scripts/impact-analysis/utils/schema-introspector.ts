/**
 * Schema introspection utilities for parsing Drizzle schema files
 * WISH-20210
 */
import { Project, SyntaxKind, VariableDeclaration } from 'ts-morph'
import { resolve } from 'path'

export interface TableInfo {
  name: string
  columns: ColumnInfo[]
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  hasDefault: boolean
}

export interface EnumInfo {
  name: string
  values: string[]
}

/**
 * Introspect a Drizzle table definition from schema files
 * @param schemaDir - Path to schema directory
 * @param tableName - Table name (snake_case, e.g., 'wishlist_items')
 * @returns Table information or null if not found
 */
export function introspectTable(schemaDir: string, tableName: string): TableInfo | null {
  const project = new Project({ skipAddingFilesFromTsConfig: true })

  // Load all schema files
  project.addSourceFilesAtPaths([
    `${schemaDir}/*.ts`,
    `${schemaDir}/**/*.ts`,
  ])

  const schemaFiles = project.getSourceFiles()

  // Convert table name to variable name (e.g., wishlist_items -> wishlistItems)
  const variableName = toCamelCase(tableName)

  for (const sourceFile of schemaFiles) {
    const variables = sourceFile.getVariableDeclarations()

    for (const variable of variables) {
      if (variable.getName() === variableName) {
        const columns = extractColumns(variable)
        if (columns) {
          return {
            name: tableName,
            columns,
          }
        }
      }
    }
  }

  return null
}

/**
 * Introspect a Drizzle enum definition from schema files
 * @param schemaDir - Path to schema directory
 * @param enumName - Enum name (snake_case, e.g., 'wishlist_store')
 * @returns Enum information or null if not found
 */
export function introspectEnum(schemaDir: string, enumName: string): EnumInfo | null {
  const project = new Project({ skipAddingFilesFromTsConfig: true })

  // Load all schema files
  project.addSourceFilesAtPaths([
    `${schemaDir}/*.ts`,
    `${schemaDir}/**/*.ts`,
  ])

  const schemaFiles = project.getSourceFiles()

  // Convert enum name to variable name (e.g., wishlist_store -> wishlistStoreEnum)
  const variableName = `${toCamelCase(enumName)}Enum`

  for (const sourceFile of schemaFiles) {
    const variables = sourceFile.getVariableDeclarations()

    for (const variable of variables) {
      if (variable.getName() === variableName) {
        const values = extractEnumValues(variable)
        if (values) {
          return {
            name: enumName,
            values,
          }
        }
      }
    }
  }

  return null
}

/**
 * Extract column definitions from pgTable declaration
 */
function extractColumns(variable: VariableDeclaration): ColumnInfo[] | null {
  const initializer = variable.getInitializer()
  if (!initializer) return null

  // The initializer itself should be the pgTable(...) call expression
  if (!initializer.isKind(SyntaxKind.CallExpression)) return null

  const callExpr = initializer
  const args = callExpr.getArguments()
  if (args.length < 2) return null

  // Second argument is the columns object
  const columnsObj = args[1]
  if (!columnsObj.isKind(SyntaxKind.ObjectLiteralExpression)) return null

  const columns: ColumnInfo[] = []
  const properties = columnsObj.getProperties()

  for (const prop of properties) {
    if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue

    const name = prop.getName()
    const columnDef = prop.getInitializer()
    if (!columnDef) continue

    const columnInfo = parseColumnDefinition(name, columnDef.getText())
    if (columnInfo) {
      columns.push(columnInfo)
    }
  }

  return columns.length > 0 ? columns : null
}

/**
 * Parse column definition to extract type, nullable, default
 */
function parseColumnDefinition(name: string, definition: string): ColumnInfo | null {
  // Extract type from function call (e.g., text('column_name'), wishlistStoreEnum('store'))
  // Match common Drizzle types and enum types
  const typeMatch = definition.match(
    /(text|integer|uuid|timestamp|boolean|jsonb|date|serial|varchar|pgEnum|[\w]+Enum)\(/,
  )
  if (!typeMatch) return null

  const type = typeMatch[1]
  const nullable = !definition.includes('.notNull()')
  const hasDefault =
    definition.includes('.default(') ||
    definition.includes('.defaultNow()') ||
    definition.includes('.defaultRandom()')

  return {
    name,
    type,
    nullable,
    hasDefault,
  }
}

/**
 * Extract enum values from pgEnum declaration
 */
function extractEnumValues(variable: VariableDeclaration): string[] | null {
  const initializer = variable.getInitializer()
  if (!initializer) return null

  // The initializer itself should be the pgEnum(...) call expression
  if (!initializer.isKind(SyntaxKind.CallExpression)) return null

  const callExpr = initializer
  const args = callExpr.getArguments()
  if (args.length < 2) return null

  // Second argument is the array of values
  const valuesArray = args[1]
  if (!valuesArray.isKind(SyntaxKind.ArrayLiteralExpression)) return null

  const values: string[] = []
  const elements = valuesArray.getElements()

  for (const element of elements) {
    if (element.isKind(SyntaxKind.StringLiteral)) {
      values.push(element.getLiteralValue())
    }
  }

  return values.length > 0 ? values : null
}

/**
 * Get table columns (helper wrapper)
 */
export function getTableColumns(table: TableInfo): ColumnInfo[] {
  return table.columns
}

/**
 * Get enum values (helper wrapper)
 */
export function getEnumValues(enumInfo: EnumInfo): string[] {
  return enumInfo.values
}

/**
 * Helper: Convert snake_case to camelCase
 */
function toCamelCase(snakeCase: string): string {
  return snakeCase.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}
