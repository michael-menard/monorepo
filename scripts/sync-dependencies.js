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

// Find all package.json files in apps and packages
function findPackageJsonFiles() {
  const packages = []

  // Search in apps directory
  const appsDir = path.join(__dirname, '../apps')
  if (fs.existsSync(appsDir)) {
    const appDirs = fs.readdirSync(appsDir)
    appDirs.forEach(app => {
      const packageJsonPath = path.join(appsDir, app, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        packages.push(packageJsonPath)
      }
    })
  }

  // Search in packages directory
  const packagesDir = path.join(__dirname, '../packages')
  if (fs.existsSync(packagesDir)) {
    const packageDirs = fs.readdirSync(packagesDir)
    packageDirs.forEach(pkg => {
      const packageJsonPath = path.join(packagesDir, pkg, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        packages.push(packageJsonPath)
      }
    })
  }

  return packages
}

// Update package.json with common dependencies
function updatePackageJson(packageJsonPath) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  let updated = false

  // Update dependencies
  if (!packageJson.dependencies) {
    packageJson.dependencies = {}
  }

  Object.entries(COMMON_DEPENDENCIES).forEach(([dep, version]) => {
    if (!packageJson.dependencies[dep] || packageJson.dependencies[dep] !== version) {
      packageJson.dependencies[dep] = version
      updated = true
      console.log(`✅ Updated ${dep} to ${version} in ${path.relative(__dirname, packageJsonPath)}`)
    }
  })

  // Update devDependencies
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {}
  }

  Object.entries(COMMON_DEV_DEPENDENCIES).forEach(([dep, version]) => {
    if (!packageJson.devDependencies[dep] || packageJson.devDependencies[dep] !== version) {
      packageJson.devDependencies[dep] = version
      updated = true
      console.log(
        `✅ Updated dev dependency ${dep} to ${version} in ${path.relative(__dirname, packageJsonPath)}`,
      )
    }
  })

  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  }

  return updated
}

// Main function
function main() {
  console.log('🔄 Syncing dependencies across monorepo...\n')

  const packageJsonFiles = findPackageJsonFiles()
  let totalUpdated = 0

  packageJsonFiles.forEach(packageJsonPath => {
    const updated = updatePackageJson(packageJsonPath)
    if (updated) {
      totalUpdated++
    }
  })

  console.log(`\n✨ Sync complete! Updated ${totalUpdated} packages.`)
  console.log('\n📝 Next steps:')
  console.log('1. Run "pnpm install" to install updated dependencies')
  console.log('2. Run "pnpm run build" to ensure everything still works')
}

// Run main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { updatePackageJson, findPackageJsonFiles }
