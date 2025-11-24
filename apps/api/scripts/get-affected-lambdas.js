#!/usr/bin/env node

/**
 * Get Affected Lambda Functions
 *
 * Detects which Lambda functions are affected by git changes and need to be deployed.
 * Uses git diff to identify changed files and maps them to Lambda functions.
 *
 * Usage:
 *   node scripts/get-affected-lambdas.js [--base=main] [--layer=standard]
 *   node scripts/get-affected-lambdas.js --base=HEAD~1
 *   node scripts/get-affected-lambdas.js --layer=processing
 *
 * Outputs:
 *   Space-separated list of Lambda function names (for use in CI/CD)
 *
 * Examples:
 *   # Get functions changed since main branch
 *   node scripts/get-affected-lambdas.js
 *   Output: GalleryUploadImage WishlistCreateItem Health
 *
 *   # Get functions using a specific layer
 *   node scripts/get-affected-lambdas.js --layer=processing
 *   Output: GalleryUploadImage WishlistUploadImage MocInstructionsUploadFile ...
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const API_ROOT = join(__dirname, '..')

// Import Lambda function mapping
// Note: In production, this would be compiled TypeScript
const LAMBDA_FUNCTIONS = [
  { name: 'Health', handler: 'endpoints/health/handler.ts', domain: 'health', layers: ['minimal'] },
  {
    name: 'GalleryListAlbums',
    handler: 'endpoints/gallery/list-albums/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryGetAlbum',
    handler: 'endpoints/gallery/get-album/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryCreateAlbum',
    handler: 'endpoints/gallery/create-album/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryUpdateAlbum',
    handler: 'endpoints/gallery/update-album/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryDeleteAlbum',
    handler: 'endpoints/gallery/delete-album/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryListImages',
    handler: 'endpoints/gallery/list-images/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryGetImage',
    handler: 'endpoints/gallery/get-image/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryDeleteImage',
    handler: 'endpoints/gallery/delete-image/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryUpdateImage',
    handler: 'endpoints/gallery/update-image/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GallerySearchImages',
    handler: 'endpoints/gallery/search-images/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryFlagImage',
    handler: 'endpoints/gallery/flag-image/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'GalleryUploadImage',
    handler: 'endpoints/gallery/upload-image/handler.ts',
    domain: 'gallery',
    layers: ['minimal', 'standard', 'processing'],
  },
  {
    name: 'WishlistList',
    handler: 'endpoints/wishlist/list/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistGetItem',
    handler: 'endpoints/wishlist/get-item/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistCreateItem',
    handler: 'endpoints/wishlist/create-item/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistUpdateItem',
    handler: 'endpoints/wishlist/update-item/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistDeleteItem',
    handler: 'endpoints/wishlist/delete-item/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistReorder',
    handler: 'endpoints/wishlist/reorder/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistSearch',
    handler: 'endpoints/wishlist/search/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WishlistUploadImage',
    handler: 'endpoints/wishlist/upload-image/handler.ts',
    domain: 'wishlist',
    layers: ['minimal', 'standard', 'processing'],
  },
  {
    name: 'MocInstructionsList',
    handler: 'endpoints/moc-instructions/list/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsDownloadFile',
    handler: 'endpoints/moc-instructions/download-file/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsDeleteFile',
    handler: 'endpoints/moc-instructions/delete-file/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsLinkGalleryImage',
    handler: 'endpoints/moc-instructions/link-gallery-image/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsUnlinkGalleryImage',
    handler: 'endpoints/moc-instructions/unlink-gallery-image/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsGetGalleryImages',
    handler: 'endpoints/moc-instructions/get-gallery-images/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsGetStats',
    handler: 'endpoints/moc-instructions/get-stats/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsGetUploadsOverTime',
    handler: 'endpoints/moc-instructions/get-uploads-over-time/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocInstructionsUploadFile',
    handler: 'endpoints/moc-instructions/upload-file/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard', 'processing'],
  },
  {
    name: 'MocInstructionsInitializeWithFiles',
    handler: 'endpoints/moc-instructions/initialize-with-files/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard', 'processing'],
  },
  {
    name: 'MocInstructionsFinalizeWithFiles',
    handler: 'endpoints/moc-instructions/finalize-with-files/handler.ts',
    domain: 'moc-instructions',
    layers: ['minimal', 'standard', 'processing'],
  },
  {
    name: 'MocPartsListsGet',
    handler: 'endpoints/moc-parts-lists/get/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsCreate',
    handler: 'endpoints/moc-parts-lists/create/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsUpdate',
    handler: 'endpoints/moc-parts-lists/update/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsUpdateStatus',
    handler: 'endpoints/moc-parts-lists/update-status/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsDelete',
    handler: 'endpoints/moc-parts-lists/delete/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsGetUserSummary',
    handler: 'endpoints/moc-parts-lists/get-user-summary/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'MocPartsListsParse',
    handler: 'endpoints/moc-parts-lists/parse/handler.ts',
    domain: 'moc-parts-lists',
    layers: ['minimal', 'standard', 'processing'],
  },
  {
    name: 'WebsocketConnect',
    handler: 'endpoints/websocket/connect/handler.ts',
    domain: 'websocket',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WebsocketDisconnect',
    handler: 'endpoints/websocket/disconnect/handler.ts',
    domain: 'websocket',
    layers: ['minimal', 'standard'],
  },
  {
    name: 'WebsocketDefault',
    handler: 'endpoints/websocket/default/handler.ts',
    domain: 'websocket',
    layers: ['minimal', 'standard'],
  },
]

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  base: 'main',
  layer: null,
  verbose: false,
}

for (const arg of args) {
  if (arg.startsWith('--base=')) {
    options.base = arg.split('=')[1]
  } else if (arg.startsWith('--layer=')) {
    options.layer = arg.split('=')[1]
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: node scripts/get-affected-lambdas.js [options]

Options:
  --base=<ref>     Git ref to compare against (default: main)
  --layer=<name>   Get all functions using a specific layer (minimal|standard|processing)
  --verbose, -v    Verbose output showing analysis
  --help, -h       Show this help message

Examples:
  node scripts/get-affected-lambdas.js
  node scripts/get-affected-lambdas.js --base=HEAD~1
  node scripts/get-affected-lambdas.js --layer=processing
`)
    process.exit(0)
  }
}

/**
 * Get functions that use a specific layer
 */
function getFunctionsUsingLayer(layer) {
  return LAMBDA_FUNCTIONS.filter(fn => fn.layers.includes(layer)).map(fn => fn.name)
}

/**
 * Get changed files using git diff
 */
function getChangedFiles(base) {
  try {
    const output = execSync(`git diff --name-only ${base}...HEAD`, {
      cwd: API_ROOT,
      encoding: 'utf-8',
    })
    return output
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean)
  } catch (error) {
    console.error('Error running git diff:', error.message)
    process.exit(1)
  }
}

/**
 * Determine which Lambda functions are affected by changed files
 */
function getAffectedFunctions(changedFiles) {
  const affectedFunctions = new Set()

  for (const file of changedFiles) {
    // Skip if file is outside apps/api
    if (!file.includes('apps/api/')) continue

    // Extract the path relative to apps/api
    const apiRelativePath = file.substring(file.indexOf('apps/api/') + 9)

    if (options.verbose) {
      console.error(`\nAnalyzing: ${apiRelativePath}`)
    }

    // Individual endpoint changed
    if (apiRelativePath.startsWith('endpoints/')) {
      const match = apiRelativePath.match(/^endpoints\/([^/]+)\/([^/]+)/)
      if (match) {
        const [, domain, endpoint] = match
        const affected = LAMBDA_FUNCTIONS.filter(fn =>
          fn.handler.includes(`endpoints/${domain}/${endpoint}/`),
        )
        affected.forEach(fn => {
          affectedFunctions.add(fn.name)
          if (options.verbose) {
            console.error(`  → Affects ${fn.name} (endpoint change)`)
          }
        })
      }

      // Domain schemas changed
      if (apiRelativePath.includes('/schemas')) {
        const domain = apiRelativePath.split('/')[1]
        const affected = LAMBDA_FUNCTIONS.filter(fn => fn.domain === domain)
        affected.forEach(fn => {
          affectedFunctions.add(fn.name)
          if (options.verbose) {
            console.error(`  → Affects ${fn.name} (schema change)`)
          }
        })
      }

      // _shared directory changed
      if (apiRelativePath.includes('/_shared/')) {
        const domain = apiRelativePath.split('/')[1]
        const affected = LAMBDA_FUNCTIONS.filter(fn => fn.domain === domain)
        affected.forEach(fn => {
          affectedFunctions.add(fn.name)
          if (options.verbose) {
            console.error(`  → Affects ${fn.name} (_shared change)`)
          }
        })
      }
    }

    // Core module changed - affects all functions using standard layer
    if (apiRelativePath.startsWith('core/')) {
      const affected = LAMBDA_FUNCTIONS.filter(fn => fn.layers.includes('standard'))
      affected.forEach(fn => {
        affectedFunctions.add(fn.name)
        if (options.verbose) {
          console.error(`  → Affects ${fn.name} (core change)`)
        }
      })
    }

    // Layer changed - affects all functions using that layer
    if (apiRelativePath.startsWith('layers/')) {
      if (apiRelativePath.includes('minimal-layer')) {
        const affected = LAMBDA_FUNCTIONS.filter(fn => fn.layers.includes('minimal'))
        affected.forEach(fn => {
          affectedFunctions.add(fn.name)
          if (options.verbose) {
            console.error(`  → Affects ${fn.name} (minimal layer change)`)
          }
        })
      }
      if (apiRelativePath.includes('standard-layer')) {
        const affected = LAMBDA_FUNCTIONS.filter(fn => fn.layers.includes('standard'))
        affected.forEach(fn => {
          affectedFunctions.add(fn.name)
          if (options.verbose) {
            console.error(`  → Affects ${fn.name} (standard layer change)`)
          }
        })
      }
      if (apiRelativePath.includes('processing-layer')) {
        const affected = LAMBDA_FUNCTIONS.filter(fn => fn.layers.includes('processing'))
        affected.forEach(fn => {
          affectedFunctions.add(fn.name)
          if (options.verbose) {
            console.error(`  → Affects ${fn.name} (processing layer change)`)
          }
        })
      }
    }

    // sst.config.ts changed - deploy all
    if (apiRelativePath === 'sst.config.ts') {
      LAMBDA_FUNCTIONS.forEach(fn => {
        affectedFunctions.add(fn.name)
        if (options.verbose) {
          console.error(`  → Affects ${fn.name} (SST config change)`)
        }
      })
    }
  }

  return Array.from(affectedFunctions).sort()
}

// Main execution
if (options.layer) {
  // Mode: Get functions using a specific layer
  const functions = getFunctionsUsingLayer(options.layer)
  if (options.verbose) {
    console.error(`\nFunctions using ${options.layer} layer: ${functions.length}`)
  }
  console.log(functions.join(' '))
} else {
  // Mode: Detect affected functions from git changes
  const changedFiles = getChangedFiles(options.base)

  if (options.verbose) {
    console.error(`\nChanged files (${changedFiles.length}):`)
    changedFiles.forEach(f => console.error(`  ${f}`))
  }

  const affectedFunctions = getAffectedFunctions(changedFiles)

  if (options.verbose) {
    console.error(`\nAffected Lambda functions (${affectedFunctions.length}):`)
    affectedFunctions.forEach(fn => console.error(`  ${fn}`))
    console.error('')
  }

  // Output space-separated list (for use in scripts)
  console.log(affectedFunctions.join(' '))
}
