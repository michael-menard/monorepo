#!/usr/bin/env node

/**
 * Script to systematically replace console statements with logger calls
 */

const fs = require('fs')
const path = require('path')

// Mapping of console methods to logger methods
const CONSOLE_TO_LOGGER_MAP = {
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
  'console.debug': 'logger.debug',
  'console.group': '// logger.info', // Convert to comment since logger doesn't have group
  'console.groupEnd': '// logger.info', // Convert to comment
  'console.groupCollapsed': '// logger.info', // Convert to comment
}

// Files to process
const TARGET_DIR = 'apps/web/lego-moc-instructions-app/src'

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

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  
  let hasConsoleStatements = false
  let hasLoggerImport = false
  let modifiedLines = []
  
  // Check if file already has logger import
  for (const line of lines) {
    if (line.includes("from '@repo/logger'") || line.includes('createLogger')) {
      hasLoggerImport = true
      break
    }
  }
  
  // Check if file has console statements
  for (const line of lines) {
    if (line.includes('console.')) {
      hasConsoleStatements = true
      break
    }
  }
  
  if (!hasConsoleStatements) {
    return false // No changes needed
  }
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Add logger import after existing imports if needed
    if (!hasLoggerImport && line.trim() === '' && i > 0 && lines[i-1].includes('import')) {
      modifiedLines.push("import { createLogger } from '@repo/logger'")
      modifiedLines.push('')
      modifiedLines.push('const logger = createLogger(\'ComponentName\')')
      modifiedLines.push(line)
      hasLoggerImport = true
      continue
    }
    
    // Replace console statements
    let modifiedLine = line
    for (const [consoleMethod, loggerMethod] of Object.entries(CONSOLE_TO_LOGGER_MAP)) {
      if (line.includes(consoleMethod)) {
        // Simple replacement for now - more sophisticated parsing could be added
        modifiedLine = modifiedLine.replace(new RegExp(consoleMethod.replace('.', '\\.'), 'g'), loggerMethod)
      }
    }
    
    modifiedLines.push(modifiedLine)
  }
  
  // If we added logger but didn't find a good place for import, add it at the top
  if (hasConsoleStatements && !hasLoggerImport) {
    const importIndex = modifiedLines.findIndex(line => line.includes('import'))
    if (importIndex !== -1) {
      modifiedLines.splice(importIndex, 0, "import { createLogger } from '@repo/logger'", '')
      modifiedLines.splice(importIndex + 2, 0, 'const logger = createLogger(\'ComponentName\')', '')
    }
  }
  
  const newContent = modifiedLines.join('\n')
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8')
    return true
  }
  
  return false
}

function main() {
  const files = getAllTsxFiles(TARGET_DIR)
  let processedCount = 0
  
  console.log(`Found ${files.length} TypeScript files to process...`)
  
  for (const file of files) {
    try {
      const wasModified = processFile(file)
      if (wasModified) {
        processedCount++
        console.log(`✓ Processed: ${file}`)
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message)
    }
  }
  
  console.log(`\nCompleted! Modified ${processedCount} files.`)
  console.log('\nNote: You may need to manually:')
  console.log('1. Update component names in createLogger() calls')
  console.log('2. Review complex console statements that may need manual adjustment')
  console.log('3. Run the linter to fix any remaining issues')
}

if (require.main === module) {
  main()
}
