/**
 * Bundle Size Analysis Script
 * Story 3.5: Performance Validation & Optimization
 *
 * Analyzes the production bundle size and validates that tracking libraries
 * add less than 50KB overhead as per acceptance criteria.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'

interface BundleStats {
  name: string
  size: number
  gzipSize: number
  path: string
}

interface BundleAnalysis {
  totalSize: number
  totalGzipSize: number
  jsSize: number
  jsGzipSize: number
  cssSize: number
  cssGzipSize: number
  trackingSize: number
  trackingGzipSize: number
  files: BundleStats[]
  largestFiles: BundleStats[]
  trackingFiles: BundleStats[]
}

const DIST_PATH = join(process.cwd(), 'dist')
const SIZE_THRESHOLD_KB = 50 // 50KB tracking overhead limit
const TRACKING_PATTERNS = [
  'web-vitals',
  'error-reporting',
  'tracking',
  'reportWebVitals',
  'ErrorBoundary',
]

/**
 * Get file size stats
 */
function getFileStats(filePath: string): BundleStats {
  const content = readFileSync(filePath)
  const gzipContent = gzipSync(content)

  return {
    name: filePath.split('/').pop() || filePath,
    size: content.length,
    gzipSize: gzipContent.length,
    path: filePath,
  }
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)

  files.forEach(file => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  })

  return fileList
}

/**
 * Check if file is a tracking-related file
 */
function isTrackingFile(filePath: string): boolean {
  return TRACKING_PATTERNS.some(pattern => filePath.toLowerCase().includes(pattern.toLowerCase()))
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Analyze bundle
 */
function analyzeBundle(): BundleAnalysis {
  const allFiles = getAllFiles(DIST_PATH)
  const fileStats: BundleStats[] = []

  let totalSize = 0
  let totalGzipSize = 0
  let jsSize = 0
  let jsGzipSize = 0
  let cssSize = 0
  let cssGzipSize = 0
  let trackingSize = 0
  let trackingGzipSize = 0

  // Analyze each file
  allFiles.forEach(filePath => {
    const ext = filePath.split('.').pop()?.toLowerCase()

    // Only analyze JS and CSS files
    if (ext !== 'js' && ext !== 'css' && ext !== 'mjs') {
      return
    }

    const stats = getFileStats(filePath)
    fileStats.push(stats)

    totalSize += stats.size
    totalGzipSize += stats.gzipSize

    if (ext === 'js' || ext === 'mjs') {
      jsSize += stats.size
      jsGzipSize += stats.gzipSize
    } else if (ext === 'css') {
      cssSize += stats.size
      cssGzipSize += stats.gzipSize
    }

    if (isTrackingFile(filePath)) {
      trackingSize += stats.size
      trackingGzipSize += stats.gzipSize
    }
  })

  // Sort by gzip size descending
  const sortedFiles = [...fileStats].sort((a, b) => b.gzipSize - a.gzipSize)
  const largestFiles = sortedFiles.slice(0, 10)
  const trackingFiles = fileStats.filter(f => isTrackingFile(f.path))

  return {
    totalSize,
    totalGzipSize,
    jsSize,
    jsGzipSize,
    cssSize,
    cssGzipSize,
    trackingSize,
    trackingGzipSize,
    files: fileStats,
    largestFiles,
    trackingFiles,
  }
}

/**
 * Print bundle analysis report
 */
function printReport(analysis: BundleAnalysis): void {
  console.log('\n📦 Bundle Size Analysis Report')
  console.log('━'.repeat(60))

  console.log('\n📊 Overall Bundle Size:')
  console.log(`  Total:          ${formatBytes(analysis.totalSize)} (raw)`)
  console.log(`                  ${formatBytes(analysis.totalGzipSize)} (gzip)`)
  console.log(`  JavaScript:     ${formatBytes(analysis.jsSize)} (raw)`)
  console.log(`                  ${formatBytes(analysis.jsGzipSize)} (gzip)`)
  console.log(`  CSS:            ${formatBytes(analysis.cssSize)} (raw)`)
  console.log(`                  ${formatBytes(analysis.cssGzipSize)} (gzip)`)

  console.log('\n📈 Tracking Overhead:')
  console.log(`  Total:          ${formatBytes(analysis.trackingSize)} (raw)`)
  console.log(`                  ${formatBytes(analysis.trackingGzipSize)} (gzip)`)
  console.log(
    `  Percentage:     ${((analysis.trackingGzipSize / analysis.totalGzipSize) * 100).toFixed(2)}% of total`,
  )

  const trackingKB = analysis.trackingGzipSize / 1024
  const threshold = SIZE_THRESHOLD_KB
  const thresholdMet = trackingKB < threshold

  console.log(`\n  Threshold:      ${threshold}KB (gzip)`)
  console.log(`  Status:         ${thresholdMet ? '✅ PASS' : '❌ FAIL'}`)

  if (!thresholdMet) {
    console.log(`  ⚠️  Exceeds threshold by ${(trackingKB - threshold).toFixed(2)}KB`)
  }

  console.log('\n📦 Largest Files (Top 10):')
  analysis.largestFiles.forEach((file, index) => {
    const relativePath = file.path.replace(DIST_PATH, '')
    console.log(`  ${index + 1}. ${formatBytes(file.gzipSize).padEnd(12)} ${relativePath}`)
  })

  if (analysis.trackingFiles.length > 0) {
    console.log('\n🎯 Tracking-Related Files:')
    analysis.trackingFiles.forEach(file => {
      const relativePath = file.path.replace(DIST_PATH, '')
      console.log(`  • ${formatBytes(file.gzipSize).padEnd(12)} ${relativePath}`)
    })
  }

  console.log('\n━'.repeat(60))

  // Exit with error code if threshold exceeded
  if (!thresholdMet) {
    console.error(
      `\n❌ Bundle size validation FAILED: Tracking overhead (${trackingKB.toFixed(2)}KB) exceeds ${threshold}KB threshold`,
    )
    process.exit(1)
  } else {
    console.log(
      `\n✅ Bundle size validation PASSED: Tracking overhead (${trackingKB.toFixed(2)}KB) is within ${threshold}KB threshold`,
    )
  }
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🔍 Analyzing bundle size...\n')

    const analysis = analyzeBundle()
    printReport(analysis)

    // Save analysis to JSON for CI/CD
    const outputPath = join(process.cwd(), 'performance-reports', 'bundle-analysis.json')
    require('fs').mkdirSync(join(process.cwd(), 'performance-reports'), { recursive: true })
    require('fs').writeFileSync(outputPath, JSON.stringify(analysis, null, 2))
    console.log(`\n💾 Analysis saved to: ${outputPath}`)
  } catch (error) {
    console.error('❌ Error analyzing bundle:', error)
    process.exit(1)
  }
}

main()
