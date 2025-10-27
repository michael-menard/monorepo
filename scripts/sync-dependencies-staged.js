#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Common dependencies that should be consistent across packages
const COMMON_DEPENDENCIES = {
  react: '^19.1.0',
  'react-dom': '^19.1.0',
  'framer-motion': '^12.23.3',
  'class-variance-authority': '^0.7.0',
  clsx: '^2.1.1',
  'tailwind-merge': '^2.5.4',
  'lucide-react': '^0.468.0',
}

const COMMON_DEV_DEPENDENCIES = {
  '@types/react': '^19.1.0',
  '@types/react-dom': '^19.1.0',
  typescript: '5.8.3',
  eslint: '^9.30.0',
}

// Get staged package.json files from command line arguments
function getStagedPackageJsonFiles() {
  const args = process.argv.slice(2)
  return args.filter(file => file.endsWith('package.json'))
}

// Update package.json with common dependencies
function updatePackageJson(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) {
    return false
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  let updated = false

  // Skip root package.json
  const relativePath = path.relative(process.cwd(), packageJsonPath)
  if (relativePath === 'package.json') {
    return false
  }

  // Update dependencies
  if (packageJson.dependencies) {
    Object.entries(COMMON_DEPENDENCIES).forEach(([dep, version]) => {
      if (packageJson.dependencies[dep] && packageJson.dependencies[dep] !== version) {
        console.log(`📦 ${path.relative(process.cwd(), packageJsonPath)}: ${dep} ${packageJson.dependencies[dep]} → ${version}`)
        packageJson.dependencies[dep] = version
        updated = true
      }
    })
  }

  // Update devDependencies
  if (packageJson.devDependencies) {
    Object.entries(COMMON_DEV_DEPENDENCIES).forEach(([dep, version]) => {
      if (packageJson.devDependencies[dep] && packageJson.devDependencies[dep] !== version) {
        console.log(`🔧 ${path.relative(process.cwd(), packageJsonPath)}: ${dep} ${packageJson.devDependencies[dep]} → ${version}`)
        packageJson.devDependencies[dep] = version
        updated = true
      }
    })
  }

  // Write back if updated
  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
    console.log(`✅ Updated ${path.relative(process.cwd(), packageJsonPath)}`)
  }

  return updated
}

// Validate that dependencies are in sync
function validateDependencySync(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) {
    return true
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  let isValid = true

  // Skip root package.json
  const relativePath = path.relative(process.cwd(), packageJsonPath)
  if (relativePath === 'package.json') {
    return true
  }

  // Check dependencies
  if (packageJson.dependencies) {
    Object.entries(COMMON_DEPENDENCIES).forEach(([dep, expectedVersion]) => {
      if (packageJson.dependencies.hasOwnProperty(dep)) {
        const actualVersion = packageJson.dependencies[dep]
        if (actualVersion !== expectedVersion) {
          console.error(`❌ ${path.relative(process.cwd(), packageJsonPath)}: ${dep} version mismatch`)
          console.error(`   Expected: ${expectedVersion}`)
          console.error(`   Found: ${actualVersion}`)
          isValid = false
        }
      }
    })
  }

  // Check devDependencies
  if (packageJson.devDependencies) {
    Object.entries(COMMON_DEV_DEPENDENCIES).forEach(([dep, expectedVersion]) => {
      if (packageJson.devDependencies.hasOwnProperty(dep) && packageJson.devDependencies[dep] !== expectedVersion) {
        console.error(`❌ ${path.relative(process.cwd(), packageJsonPath)}: ${dep} version mismatch`)
        console.error(`   Expected: ${expectedVersion}`)
        console.error(`   Found: ${packageJson.devDependencies[dep]}`)
        isValid = false
      }
    })
  }

  return isValid
}

// Main function for lint-staged
function main() {
  const stagedFiles = getStagedPackageJsonFiles()
  
  if (stagedFiles.length === 0) {
    // No package.json files staged, nothing to do
    process.exit(0)
  }

  console.log('🔄 Checking dependency versions in staged package.json files...\n')

  const mode = process.env.SYNC_DEPS_MODE || 'fix'
  let allValid = true
  let totalUpdated = 0

  stagedFiles.forEach(file => {
    if (mode === 'check') {
      // Validation mode - fail if versions are inconsistent
      const isValid = validateDependencySync(file)
      if (!isValid) {
        allValid = false
      }
    } else {
      // Fix mode - automatically update versions
      const updated = updatePackageJson(file)
      if (updated) {
        totalUpdated++
      }
    }
  })

  if (mode === 'check' && !allValid) {
    console.error('\n❌ Dependency version mismatches found!')
    console.error('Run "pnpm sync-deps" to fix these issues.')
    process.exit(1)
  }

  if (mode === 'fix' && totalUpdated > 0) {
    console.log(`\n✨ Updated ${totalUpdated} package(s) with consistent dependency versions.`)
    console.log('📝 Changes have been applied to staged files.')
  } else if (mode === 'fix') {
    console.log('\n✅ All staged package.json files have consistent dependency versions.')
  } else {
    console.log('\n✅ All staged package.json files have consistent dependency versions.')
  }
}

// Run if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { updatePackageJson, validateDependencySync }
