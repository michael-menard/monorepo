#!/usr/bin/env node

/**
 * Script to systematically remove console statements from TypeScript/React files
 */

const fs = require('fs')
const path = require('path')

// Files to process
const TARGET_DIR = process.argv[2] || 'apps/web/lego-moc-instructions-app/src'

function getAllTsxFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        traverse(fullPath)
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

function removeConsoleStatements(content) {
  const lines = content.split('\n')
  const filteredLines = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Skip lines that are purely console statements
    if (isConsoleStatement(trimmedLine)) {
      continue
    }
    
    // Handle lines with console statements mixed with other code
    let modifiedLine = line
    
    // Remove console.method() calls but preserve other code on the same line
    modifiedLine = modifiedLine.replace(/console\.(log|info|warn|error|debug|group|groupEnd|groupCollapsed|trace|table)\([^)]*\)\.?/g, '')
    
    // Remove console.method calls that are chained (like .catch(console.warn))
    modifiedLine = modifiedLine.replace(/\.catch\(console\.(warn|error|log)\)/g, '.catch(() => {})')
    
    // Clean up any leftover empty statements or trailing commas/semicolons
    modifiedLine = modifiedLine.replace(/;\s*;/g, ';') // Remove double semicolons
    modifiedLine = modifiedLine.replace(/,\s*,/g, ',') // Remove double commas
    
    // If the line becomes empty or just whitespace after removing console, skip it
    if (modifiedLine.trim() === '' && line.trim() !== '') {
      continue
    }
    
    filteredLines.push(modifiedLine)
  }
  
  return filteredLines.join('\n')
}

function isConsoleStatement(line) {
  // Check if the line is purely a console statement
  const consoleRegex = /^\s*console\.(log|info|warn|error|debug|group|groupEnd|groupCollapsed|trace|table)\s*\(/
  return consoleRegex.test(line)
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Check if file has console statements
    if (!content.includes('console.')) {
      return false // No changes needed
    }
    
    const newContent = removeConsoleStatements(content)
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8')
      return true
    }
    
    return false
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
    return false
  }
}

function main() {
  const files = getAllTsxFiles(TARGET_DIR)
  let processedCount = 0
  let totalConsoleStatements = 0
  
  console.log(`Found ${files.length} TypeScript files to process...`)
  
  for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf8')
    const consoleCount = (originalContent.match(/console\./g) || []).length
    
    if (consoleCount > 0) {
      totalConsoleStatements += consoleCount
      const wasModified = processFile(file)
      if (wasModified) {
        processedCount++
        console.log(`✓ Removed ${consoleCount} console statements from: ${file}`)
      }
    }
  }
  
  console.log(`\nCompleted!`)
  console.log(`- Modified ${processedCount} files`)
  console.log(`- Removed approximately ${totalConsoleStatements} console statements`)
  console.log('\nNext steps:')
  console.log('1. Run the linter to check for any issues: pnpm --filter @repo/lego-moc-instructions-app lint')
  console.log('2. Test the application to ensure functionality is preserved')
  console.log('3. Consider adding proper logging where needed using @repo/logger')
}

if (require.main === module) {
  main()
}
