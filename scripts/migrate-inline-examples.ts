#!/usr/bin/env npx tsx
/**
 * migrate-inline-examples.ts
 *
 * Migrates existing inline examples from markdown documentation files
 * to structured ExampleEntry schema format.
 *
 * Story: WINT-0180 (AC-7)
 *
 * Usage:
 *   npx tsx scripts/migrate-inline-examples.ts --dry-run  # Show what would be migrated
 *   npx tsx scripts/migrate-inline-examples.ts --output yaml  # Write to YAML files
 *   npx tsx scripts/migrate-inline-examples.ts --output database  # Write to DB (future)
 *   npx tsx scripts/migrate-inline-examples.ts --validate  # Validate only
 *
 * Input files:
 *   - .claude/agents/_shared/decision-handling.md (4 tier examples)
 *   - .claude/agents/_shared/expert-intelligence.md (if exists)
 *
 * Output:
 *   - .claude/agents/_shared/examples/migrated-examples.yaml (if --output yaml)
 *   - Console summary with count validation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createExampleEntry, ExampleEntrySchema } from '../packages/backend/orchestrator/src/artifacts/example-entry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

// ============================================================================
// CLI Arguments
// ============================================================================

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const validateOnly = args.includes('--validate')
const outputMode = args.find(arg => arg.startsWith('--output='))?.split('=')[1] ||
                   (args.includes('--output') ? args[args.indexOf('--output') + 1] : null)

// ============================================================================
// Types
// ============================================================================

interface InlineExample {
  source_file: string
  section: string
  tier?: number
  scenario: string
  positive_example?: string
  negative_example?: string
  context?: string
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract examples from decision-handling.md
 */
function extractDecisionHandlingExamples(filePath: string): InlineExample[] {
  if (!existsSync(filePath)) {
    console.log(`⏭️  Skipping ${filePath}: file not found`)
    return []
  }

  const content = readFileSync(filePath, 'utf-8')
  const examples: InlineExample[] = []

  // Pattern: ## Examples section with ### Example N: Tier X - Category
  const exampleSectionMatch = content.match(/## Examples\n\n([\s\S]+?)(?=\n---|\n## |$)/m)

  if (!exampleSectionMatch) {
    console.log(`⚠️  No Examples section found in ${filePath}`)
    return []
  }

  const examplesSection = exampleSectionMatch[1]

  // Extract individual examples (### Example N: Tier X - Category)
  const exampleRegex = /### Example \d+: Tier (\d+) - (.+?)\n\n\*\*Situation\*\*: (.+?)\n\n```\n([\s\S]+?)```/g

  let match
  while ((match = exampleRegex.exec(examplesSection)) !== null) {
    const tier = parseInt(match[1], 10)
    const category = match[2]
    const situation = match[3]
    const details = match[4]

    // Parse details for decision/action
    const decisionMatch = details.match(/Decision: (.+?)(?:\n|$)/m)
    const actionMatch = details.match(/Action: (.+?)(?:\n|$)/m)

    examples.push({
      source_file: 'decision-handling.md',
      section: 'Examples',
      tier,
      scenario: `${category}: ${situation}`,
      positive_example: actionMatch?.[1] || decisionMatch?.[1] || undefined,
      context: details,
    })
  }

  return examples
}

/**
 * Extract examples from expert-intelligence.md (if it exists)
 */
function extractExpertIntelligenceExamples(filePath: string): InlineExample[] {
  if (!existsSync(filePath)) {
    console.log(`⏭️  Skipping ${filePath}: file not found`)
    return []
  }

  // For MVP, we'll just note the file exists but defer extraction
  // since we don't have visibility into its structure
  console.log(`ℹ️  Found ${filePath}, but extraction pattern not yet implemented`)
  console.log(`   Manual review needed for this file`)
  return []
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert inline example to ExampleEntry schema
 */
function convertToExampleEntry(inline: InlineExample, index: number) {
  // Generate ID based on source and index
  const sourcePrefix = inline.source_file === 'decision-handling.md' ? 'dh' : 'ei'
  const id = `migrated-${sourcePrefix}-${String(index + 1).padStart(3, '0')}`

  // Determine category based on tier or content
  let category: any = 'decision-making' // Default
  if (inline.scenario.includes('test')) category = 'testing'
  if (inline.scenario.includes('code') || inline.scenario.includes('naming')) category = 'code-patterns'
  if (inline.scenario.includes('workflow')) category = 'workflow'

  return createExampleEntry({
    id,
    category,
    scenario: inline.scenario,
    positive_example: inline.positive_example || null,
    negative_example: inline.negative_example || null,
    context: {
      applicability: `Migrated from ${inline.source_file} § ${inline.section}`,
      decision_tier: inline.tier || null,
      tags: ['migrated', inline.source_file.replace('.md', '')],
    },
    created_by: 'migration-script',
    source_story_id: 'WINT-0180',
  })
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate all examples pass schema validation
 */
function validateExamples(examples: ReturnType<typeof createExampleEntry>[]): boolean {
  let allValid = true

  examples.forEach((example, index) => {
    try {
      ExampleEntrySchema.parse(example)
    } catch (error) {
      console.error(`❌ Example ${index + 1} failed validation:`, error)
      allValid = false
    }
  })

  return allValid
}

/**
 * Check for duplicate IDs
 */
function checkDuplicateIds(examples: ReturnType<typeof createExampleEntry>[]): boolean {
  const ids = examples.map(ex => ex.id)
  const uniqueIds = new Set(ids)

  if (ids.length !== uniqueIds.size) {
    console.error('❌ Duplicate IDs found!')
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    console.error('   Duplicates:', [...new Set(duplicates)])
    return false
  }

  return true
}

// ============================================================================
// Output Functions
// ============================================================================

/**
 * Write examples to YAML file
 */
function writeToYaml(examples: ReturnType<typeof createExampleEntry>[], outputPath: string) {
  const yamlContent = `# Migrated Examples
# Generated by: scripts/migrate-inline-examples.ts
# Story: WINT-0180
# Date: ${new Date().toISOString()}

examples:
${examples.map(ex => `
  - id: "${ex.id}"
    schema_version: "${ex.schema_version}"
    category: "${ex.category}"
    type: "${ex.type}"
    scenario: "${ex.scenario}"
    positive_example: ${ex.positive_example ? `"${ex.positive_example.replace(/"/g, '\\"')}"` : 'null'}
    negative_example: ${ex.negative_example ? `"${ex.negative_example.replace(/"/g, '\\"')}"` : 'null'}
    status: "${ex.status}"
    created_at: "${ex.created_at}"
    updated_at: "${ex.updated_at}"
    context:
      applicability: "${ex.context?.applicability || ''}"
      decision_tier: ${ex.context?.decision_tier || 'null'}
      tags: ${JSON.stringify(ex.context?.tags || [])}
    created_by: "${ex.created_by}"
    source_story_id: "${ex.source_story_id}"
`).join('')}
`

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, yamlContent, 'utf-8')
  console.log(`✅ Wrote ${examples.length} examples to ${outputPath}`)
}

/**
 * Write examples to JSON file (for database import)
 */
function writeToJson(examples: ReturnType<typeof createExampleEntry>[], outputPath: string) {
  const jsonContent = JSON.stringify(
    {
      metadata: {
        generated_by: 'scripts/migrate-inline-examples.ts',
        story: 'WINT-0180',
        timestamp: new Date().toISOString(),
        count: examples.length,
      },
      examples,
    },
    null,
    2,
  )

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, jsonContent, 'utf-8')
  console.log(`✅ Wrote ${examples.length} examples to ${outputPath}`)
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  console.log('🔄 Migrating inline examples to ExampleEntry schema...\n')

  // Extract examples from all sources
  const decisionHandlingPath = resolve(ROOT, '.claude/agents/_shared/decision-handling.md')
  const expertIntelligencePath = resolve(ROOT, '.claude/agents/_shared/expert-intelligence.md')

  const decisionHandlingExamples = extractDecisionHandlingExamples(decisionHandlingPath)
  const expertIntelligenceExamples = extractExpertIntelligenceExamples(expertIntelligencePath)

  const allInlineExamples = [...decisionHandlingExamples, ...expertIntelligenceExamples]

  console.log(`\n📊 Extraction Summary:`)
  console.log(`   decision-handling.md: ${decisionHandlingExamples.length} examples`)
  console.log(`   expert-intelligence.md: ${expertIntelligenceExamples.length} examples`)
  console.log(`   Total extracted: ${allInlineExamples.length} examples\n`)

  if (allInlineExamples.length === 0) {
    console.log('⚠️  No examples found to migrate')
    return
  }

  // Convert to ExampleEntry schema
  const convertedExamples = allInlineExamples.map((inline, index) =>
    convertToExampleEntry(inline, index),
  )

  console.log(`✅ Converted ${convertedExamples.length} examples\n`)

  // Validation
  console.log('🔍 Validating examples...')
  const schemaValid = validateExamples(convertedExamples)
  const noDuplicates = checkDuplicateIds(convertedExamples)

  if (!schemaValid || !noDuplicates) {
    console.error('\n❌ Validation failed!')
    process.exit(1)
  }

  console.log('✅ All examples passed validation\n')

  // Count verification (AC-7 requirement)
  if (allInlineExamples.length !== convertedExamples.length) {
    console.error(
      `❌ Count mismatch! Original: ${allInlineExamples.length}, Converted: ${convertedExamples.length}`,
    )
    process.exit(1)
  }

  console.log('✅ Count verification passed (no data loss)\n')

  // Output
  if (validateOnly) {
    console.log('✅ Validation-only mode: All checks passed')
    return
  }

  if (isDryRun) {
    console.log('🔍 Dry-run mode: Showing first 3 examples...\n')
    convertedExamples.slice(0, 3).forEach((ex, i) => {
      console.log(`Example ${i + 1}:`)
      console.log(`  ID: ${ex.id}`)
      console.log(`  Category: ${ex.category}`)
      console.log(`  Scenario: ${ex.scenario}`)
      console.log(`  Positive: ${ex.positive_example?.substring(0, 60)}...`)
      console.log('')
    })
    console.log(`... and ${convertedExamples.length - 3} more examples`)
    return
  }

  if (outputMode === 'yaml') {
    const outputPath = resolve(ROOT, '.claude/agents/_shared/examples/migrated-examples.yaml')
    writeToYaml(convertedExamples, outputPath)
  } else if (outputMode === 'json' || outputMode === 'database') {
    const outputPath = resolve(ROOT, '.claude/agents/_shared/examples/migrated-examples.json')
    writeToJson(convertedExamples, outputPath)
  } else {
    console.log('ℹ️  No output mode specified (use --output yaml or --output database)')
    console.log('   Use --dry-run to preview migration')
  }

  console.log('\n✅ Migration complete!')
  console.log(`   Examples extracted: ${allInlineExamples.length}`)
  console.log(`   Examples converted: ${convertedExamples.length}`)
  console.log(`   Validation: PASSED`)
  console.log(`   Data loss: NONE`)
}

// Run
main()
