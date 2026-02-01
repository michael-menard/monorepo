#!/usr/bin/env node
/**
 * CLI Script: Chunk Document
 *
 * Splits a markdown document into chunks for knowledge base import.
 * Outputs JSON array to stdout for piping or file redirection.
 *
 * Usage:
 *   pnpm kb:chunk path/to/doc.md
 *   pnpm kb:chunk path/to/doc.md --max-tokens=300
 *   pnpm kb:chunk path/to/doc.md > chunks.json
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (file not found, parse error)
 *
 * @see KNOW-048 AC5 for CLI requirements
 */

import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { chunkMarkdown, cleanupEncoder } from '../chunking/index.js'

/**
 * Parse command line arguments.
 *
 * @param args - Process argv (starting from index 2)
 * @returns Parsed arguments
 */
function parseArgs(args: string[]): {
  filePath: string | null
  maxTokens: number
  help: boolean
} {
  let filePath: string | null = null
  let maxTokens = 500
  let help = false

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true
    } else if (arg.startsWith('--max-tokens=')) {
      const value = parseInt(arg.split('=')[1], 10)
      if (!isNaN(value) && value > 0) {
        maxTokens = value
      } else {
        console.error(`Error: Invalid max-tokens value: ${arg}`)
        process.exit(1)
      }
    } else if (!arg.startsWith('-')) {
      filePath = arg
    }
  }

  return { filePath, maxTokens, help }
}

/**
 * Print usage information.
 */
function printUsage(): void {
  console.log(`
Usage: pnpm kb:chunk <file> [options]

Arguments:
  file                  Path to markdown file to chunk

Options:
  --max-tokens=N        Maximum tokens per chunk (default: 500)
  -h, --help            Show this help message

Examples:
  pnpm kb:chunk README.md
  pnpm kb:chunk docs/guide.md --max-tokens=300
  pnpm kb:chunk docs/api.md > chunks.json

Output:
  JSON array of chunks to stdout. Each chunk includes:
  - content: The chunk text
  - sourceFile: Original file path
  - chunkIndex: Zero-based chunk index
  - totalChunks: Total chunks from file
  - headerPath: The ## header for this chunk
  - tokenCount: Token count for chunk
  - frontMatter: Extracted YAML front matter (if any)
`)
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const { filePath, maxTokens, help } = parseArgs(args)

  // Handle help flag
  if (help) {
    printUsage()
    process.exit(0)
  }

  // Validate file path provided
  if (!filePath) {
    console.error('Error: No file path provided')
    console.error('Usage: pnpm kb:chunk <file> [--max-tokens=N]')
    process.exit(1)
  }

  try {
    // Resolve to absolute path
    const absolutePath = resolve(process.cwd(), filePath)

    // Read file
    const content = await readFile(absolutePath, 'utf-8')

    // Chunk the document
    const result = chunkMarkdown(content, filePath, { maxTokens })

    // Output warnings to stderr
    for (const warning of result.warnings) {
      console.error(`Warning: ${warning}`)
    }

    // Output chunks as JSON to stdout
    // Use compact format if output is piped, pretty if terminal
    const isPiped = !process.stdout.isTTY
    const output = isPiped ? JSON.stringify(result.chunks) : JSON.stringify(result.chunks, null, 2)

    console.log(output)

    // Cleanup tiktoken encoder
    cleanupEncoder()

    process.exit(0)
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ENOENT') {
        console.error(`Error: File not found: ${filePath}`)
      } else {
        console.error(`Error: ${error.message}`)
      }
    } else {
      console.error(`Error: ${String(error)}`)
    }

    // Cleanup on error too
    cleanupEncoder()

    process.exit(1)
  }
}

// Run main
main()
