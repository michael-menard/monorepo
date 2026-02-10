#!/usr/bin/env node
/**
 * Schema Change Impact Analysis CLI Tool
 * WISH-20210
 *
 * Usage:
 *   pnpm db:impact-analysis --table wishlist_items --change add-column:priority:text
 *   pnpm db:impact-analysis --enum wishlist_store --change add-value:Amazon
 *   pnpm db:impact-analysis --table wishlist_items --change drop-column:notes --format json
 */
import { Project } from 'ts-morph'
import { resolve, join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { CliOptionsSchema, ParsedChangeSchema, ParsedChange } from './__types__/index.js'
import { discoverFiles } from './utils/file-scanner.js'
import { introspectTable, introspectEnum } from './utils/schema-introspector.js'
import { analyzeColumnChange } from './analyzers/column-analyzer.js'
import { analyzeEnumChange } from './analyzers/enum-analyzer.js'
import { analyzeConstraintChange } from './analyzers/constraint-analyzer.js'
import { generateMarkdownReport } from './reporters/markdown-reporter.js'
import { generateJsonReport } from './reporters/json-reporter.js'

/**
 * Main CLI entry point
 */
async function main() {
  try {
    // Parse CLI arguments
    const args = parseArgs(process.argv.slice(2))

    // Validate args with Zod
    const options = CliOptionsSchema.parse(args)

    // Validate that either --table or --enum is provided
    if (!options.table && !options.enum) {
      throw new Error('Either --table or --enum must be provided')
    }

    if (options.table && options.enum) {
      throw new Error('Cannot specify both --table and --enum')
    }

    // Parse change specification
    const parsedChange = parseChangeSpec(options.change)

    // Get monorepo root
    const monorepoRoot = resolve(process.cwd(), '../../..')
    const schemaDir = resolve(monorepoRoot, 'packages/backend/database-schema/src/schema')

    // Discover TypeScript files
    const files = await discoverFiles(monorepoRoot)

    // Create ts-morph project
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
    })

    // Add discovered files to project
    project.addSourceFilesAtPaths(files)

    // Run appropriate analyzer
    let result

    if (options.table) {
      // Table change analysis
      const tableInfo = introspectTable(schemaDir, options.table)
      if (!tableInfo) {
        throw new Error(`Table '${options.table}' not found in schema`)
      }

      // Check operation type
      if (
        parsedChange.operation === 'add-index' ||
        parsedChange.operation === 'add-fk' ||
        parsedChange.operation === 'modify-constraint'
      ) {
        result = analyzeConstraintChange(project, parsedChange, options.table, monorepoRoot)
      } else {
        result = analyzeColumnChange(project, parsedChange, tableInfo, monorepoRoot)
      }
    } else if (options.enum) {
      // Enum change analysis
      const enumInfo = introspectEnum(schemaDir, options.enum)
      if (!enumInfo) {
        throw new Error(`Enum '${options.enum}' not found in schema`)
      }

      result = analyzeEnumChange(project, parsedChange, enumInfo, monorepoRoot)
    }

    // Generate report
    const report =
      options.format === 'json'
        ? generateJsonReport(result!)
        : generateMarkdownReport(result!)

    // Output report
    if (options.dryRun) {
      // Dry run: print to stdout
      process.stdout.write(report)
      process.stdout.write('\n')
    } else {
      // Write to file
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const target = options.table || options.enum
      const operation = parsedChange.operation
      const extension = options.format === 'json' ? 'json' : 'md'
      const filename = `${timestamp}-${target}-${operation}.${extension}`

      const outputDir = resolve(monorepoRoot, 'packages/backend/database-schema/impact-reports')
      mkdirSync(outputDir, { recursive: true })

      const outputPath = join(outputDir, filename)
      writeFileSync(outputPath, report, 'utf-8')

      process.stdout.write(`Impact analysis report written to: ${outputPath}\n`)
    }

    // Exit code based on risk
    const exitCode = result!.riskAssessment.breaking ? 1 : 0
    process.exit(exitCode)
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`Error: ${error.message}\n`)
    } else {
      process.stderr.write(`Unknown error: ${String(error)}\n`)
    }
    process.exit(2)
  }
}

/**
 * Parse CLI arguments into options object
 */
function parseArgs(argv: string[]): Record<string, unknown> {
  const options: Record<string, unknown> = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = argv[i + 1]

      if (key === 'dry-run') {
        options.dryRun = true
      } else if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg
        i++
      } else {
        options[key] = true
      }
    }
  }

  return options
}

/**
 * Parse change specification string into ParsedChange object
 * Format: "operation:target[:newName][:newType]"
 * Examples:
 *   - "add-column:priority:text"
 *   - "rename-column:oldName:newName"
 *   - "drop-column:columnName"
 *   - "add-value:enumValue"
 */
function parseChangeSpec(changeSpec: string): ParsedChange {
  const parts = changeSpec.split(':')

  if (parts.length < 2) {
    throw new Error('Change spec must have at least operation and target (e.g., "add-column:priority")')
  }

  const [operation, target, arg1, arg2] = parts

  const parsed: ParsedChange = {
    operation: operation as any,
    target,
  }

  // Determine what arg1 and arg2 represent based on operation
  if (operation === 'rename-column' || operation === 'rename-value') {
    parsed.newName = arg1
  } else if (operation === 'add-column' || operation === 'change-type') {
    parsed.newType = arg1
  }

  return ParsedChangeSchema.parse(parsed)
}

// Run main function
main()
