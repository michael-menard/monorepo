/**
 * AST scanning utilities for detecting code references using ts-morph
 * WISH-20210
 */
import { Project, SyntaxKind, Node } from 'ts-morph'

/**
 * Scan for Drizzle table references in TypeScript files
 * Looks for: db.select().from(tableName), db.insert(tableName), etc.
 */
export function scanForTableReferences(project: Project, tableName: string): string[] {
  const affectedFiles = new Set<string>()
  const sourceFiles = project.getSourceFiles()

  for (const sourceFile of sourceFiles) {
    const text = sourceFile.getFullText()

    // Check for direct table name usage (e.g., wishlistItems, mocInstructions)
    const camelCaseTableName = toCamelCase(tableName)

    // Pattern 1: db.select().from(tableName)
    if (text.includes(`.from(${camelCaseTableName})`)) {
      affectedFiles.add(sourceFile.getFilePath())
      continue
    }

    // Pattern 2: db.insert(tableName)
    if (text.includes(`.insert(${camelCaseTableName})`)) {
      affectedFiles.add(sourceFile.getFilePath())
      continue
    }

    // Pattern 3: db.update(tableName)
    if (text.includes(`.update(${camelCaseTableName})`)) {
      affectedFiles.add(sourceFile.getFilePath())
      continue
    }

    // Pattern 4: db.delete().from(tableName)
    if (text.includes(`.delete()`)) {
      const deleteStatements = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
      for (const call of deleteStatements) {
        const callText = call.getText()
        if (callText.includes('.delete()') && callText.includes(camelCaseTableName)) {
          affectedFiles.add(sourceFile.getFilePath())
          break
        }
      }
    }

    // Pattern 5: Import of table definition
    const imports = sourceFile.getImportDeclarations()
    for (const importDecl of imports) {
      const namedImports = importDecl.getNamedImports()
      for (const namedImport of namedImports) {
        if (namedImport.getName() === camelCaseTableName) {
          affectedFiles.add(sourceFile.getFilePath())
          break
        }
      }
    }
  }

  return Array.from(affectedFiles)
}

/**
 * Scan for Zod schema references in TypeScript files
 * Looks for: WishlistItemSchema, CreateWishlistItemSchema, etc.
 */
export function scanForSchemaReferences(project: Project, schemaName: string): string[] {
  const affectedFiles = new Set<string>()
  const sourceFiles = project.getSourceFiles()

  for (const sourceFile of sourceFiles) {
    const text = sourceFile.getFullText()

    // Pattern 1: Direct usage (e.g., WishlistItemSchema.parse())
    if (text.includes(`${schemaName}.`)) {
      affectedFiles.add(sourceFile.getFilePath())
      continue
    }

    // Pattern 2: Import of schema
    const imports = sourceFile.getImportDeclarations()
    for (const importDecl of imports) {
      const namedImports = importDecl.getNamedImports()
      for (const namedImport of namedImports) {
        if (namedImport.getName() === schemaName) {
          affectedFiles.add(sourceFile.getFilePath())
          break
        }
      }
    }

    // Pattern 3: Type inference (z.infer<typeof SchemaName>)
    if (text.includes(`z.infer<typeof ${schemaName}>`)) {
      affectedFiles.add(sourceFile.getFilePath())
    }
  }

  return Array.from(affectedFiles)
}

/**
 * Scan for type imports from @repo/api-client
 * Looks for: import type { WishlistItem } from '@repo/api-client'
 */
export function scanForTypeImports(project: Project, typeName: string): string[] {
  const affectedFiles = new Set<string>()
  const sourceFiles = project.getSourceFiles()

  for (const sourceFile of sourceFiles) {
    // Check all import declarations
    const imports = sourceFile.getImportDeclarations()
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue()

      // Check if importing from @repo/api-client
      if (moduleSpecifier.includes('@repo/api-client')) {
        const namedImports = importDecl.getNamedImports()
        for (const namedImport of namedImports) {
          if (namedImport.getName() === typeName) {
            affectedFiles.add(sourceFile.getFilePath())
            break
          }
        }
      }
    }
  }

  return Array.from(affectedFiles)
}

/**
 * Scan for specific column references in code
 * Looks for: .set({ columnName: ... }), .where(eq(table.columnName, ...))
 */
export function scanForColumnReferences(
  project: Project,
  tableName: string,
  columnName: string,
): string[] {
  const affectedFiles = new Set<string>()
  const sourceFiles = project.getSourceFiles()
  const camelCaseTableName = toCamelCase(tableName)

  for (const sourceFile of sourceFiles) {
    const text = sourceFile.getFullText()

    // Pattern 1: table.columnName in Drizzle queries
    if (text.includes(`${camelCaseTableName}.${columnName}`)) {
      affectedFiles.add(sourceFile.getFilePath())
      continue
    }

    // Pattern 2: Object literal with column name as key
    const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
    for (const obj of objectLiterals) {
      const properties = obj.getProperties()
      for (const prop of properties) {
        if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
          const name = prop.getName()
          if (name === columnName) {
            affectedFiles.add(sourceFile.getFilePath())
            break
          }
        }
      }
      if (affectedFiles.has(sourceFile.getFilePath())) break
    }

    // Pattern 3: String literal column name (e.g., in select clauses)
    if (text.includes(`'${columnName}'`) || text.includes(`"${columnName}"`)) {
      affectedFiles.add(sourceFile.getFilePath())
    }
  }

  return Array.from(affectedFiles)
}

/**
 * Scan for enum references in code
 * Looks for: WishlistStore enum, specific enum values
 */
export function scanForEnumReferences(
  project: Project,
  enumName: string,
  enumValue?: string,
): string[] {
  const affectedFiles = new Set<string>()
  const sourceFiles = project.getSourceFiles()

  for (const sourceFile of sourceFiles) {
    const text = sourceFile.getFullText()

    // Pattern 1: Import of enum schema
    const imports = sourceFile.getImportDeclarations()
    for (const importDecl of imports) {
      const namedImports = importDecl.getNamedImports()
      for (const namedImport of namedImports) {
        const importName = namedImport.getName()
        // Match both Schema and Type versions (e.g., WishlistStoreSchema, WishlistStore)
        if (importName === enumName || importName === `${enumName}Schema`) {
          affectedFiles.add(sourceFile.getFilePath())
          break
        }
      }
    }

    // Pattern 2: Specific enum value usage (if provided)
    if (enumValue) {
      // Look for string literal usage
      if (text.includes(`'${enumValue}'`) || text.includes(`"${enumValue}"`)) {
        affectedFiles.add(sourceFile.getFilePath())
      }
    }

    // Pattern 3: Direct usage of enum schema
    if (text.includes(`${enumName}Schema.`)) {
      affectedFiles.add(sourceFile.getFilePath())
    }
  }

  return Array.from(affectedFiles)
}

/**
 * Helper: Convert snake_case table name to camelCase
 */
function toCamelCase(snakeCase: string): string {
  return snakeCase.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}
