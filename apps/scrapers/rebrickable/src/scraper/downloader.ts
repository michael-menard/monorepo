import { existsSync, mkdirSync } from 'fs'
import { readFile, unlink } from 'fs/promises'
import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import { computeHash } from '../utils/hash.js'
import type { Page } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOWNLOAD_DIR = resolve(__dirname, '../../data/downloads')

export async function downloadInstruction(
  page: Page,
  downloadSelector: string,
): Promise<{ filePath: string; fileName: string; fileSize: number; contentHash: string }> {
  // Ensure download directory exists
  if (!existsSync(DOWNLOAD_DIR)) {
    mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  // Start waiting for download before clicking
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.click(downloadSelector),
  ])

  const suggestedFilename = download.suggestedFilename()
  const filePath = resolve(DOWNLOAD_DIR, suggestedFilename)

  // Save the download
  await download.saveAs(filePath)

  const failure = await download.failure()
  if (failure) {
    throw new Error(`Download failed: ${failure}`)
  }

  // Read file for hashing
  const buffer = await readFile(filePath)
  const contentHash = computeHash(buffer)
  const fileSize = buffer.length
  const fileType = extname(suggestedFilename).replace('.', '').toUpperCase()

  logger.info(`[downloader] Downloaded ${suggestedFilename} (${formatBytes(fileSize)}, ${fileType})`)

  return {
    filePath,
    fileName: suggestedFilename,
    fileSize,
    contentHash,
  }
}

export async function downloadFromUrl(
  page: Page,
  url: string,
  mocNumber: string,
): Promise<{ filePath: string; fileName: string; fileSize: number; contentHash: string }> {
  if (!existsSync(DOWNLOAD_DIR)) {
    mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.evaluate(downloadUrl => {
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = ''
      document.body.appendChild(a)
      a.click()
      a.remove()
    }, url),
  ])

  const suggestedFilename = download.suggestedFilename() || `MOC-${mocNumber}.pdf`
  const filePath = resolve(DOWNLOAD_DIR, suggestedFilename)

  await download.saveAs(filePath)

  const failure = await download.failure()
  if (failure) {
    throw new Error(`Download failed for MOC-${mocNumber}: ${failure}`)
  }

  const buffer = await readFile(filePath)
  const contentHash = computeHash(buffer)

  logger.info(`[downloader] Downloaded ${suggestedFilename} (${formatBytes(buffer.length)})`)

  return {
    filePath,
    fileName: suggestedFilename,
    fileSize: buffer.length,
    contentHash,
  }
}

export async function cleanupDownload(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  } catch {
    // Ignore cleanup errors
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
