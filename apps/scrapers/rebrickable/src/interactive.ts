import { createStealthBrowser, saveSession } from './scraper/browser.js'
import { LoginPage } from './pages/login-page.js'
import { MocDetailPage } from './pages/moc-detail-page.js'
import { logger } from '@repo/logger'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const { browser, context, page } = await createStealthBrowser({ headed: true })

  try {
    // Login
    const loginPage = new LoginPage(page)
    await loginPage.login(process.env.REBRICKABLE_USERNAME!, process.env.REBRICKABLE_PASSWORD!)
    await saveSession(context)
    logger.info('Logged in')

    // Go to MOC detail
    const testUrl = 'https://rebrickable.com/mocs/MOC-194994/Caesar12138/hermit-crab-ocean-themed-bar/'
    const mocPage = new MocDetailPage(page)
    await mocPage.navigate(testUrl)

    // Scrape detail metadata
    logger.info('Scraping detail metadata...')
    const detail = await mocPage.scrapeDetail('194994')
    logger.info('=== DETAIL ===')
    logger.info(`  Title: "${detail.title}"`)
    logger.info(`  Author: "${detail.author}"`)
    logger.info(`  Parts count: ${detail.partsCount}`)
    logger.info(`  Download URL: ${detail.downloadUrl || 'none'}`)
    logger.info(`  File type: ${detail.fileType}`)

    // Scrape file list
    logger.info('\nScraping file list...')
    const files = await mocPage.scrapeFileList()
    logger.info(`  Found ${files.length} files:`)
    for (const f of files) {
      logger.info(`    ${f.fileName} (${f.fileSize}) — data-url: ${f.downloadDataUrl}`)
    }

    // Download hero images
    logger.info('\nScraping hero images...')
    const images = await mocPage.scrapeImages('194994')
    logger.info('=== IMAGES ===')
    for (const img of images) {
      logger.info(`  ${img.filePath}`)
    }

    // Download all export formats from inventory tab
    logger.info('\nScraping parts from inventory tab (all export formats)...')
    const partsResult = await mocPage.scrapePartsFromInventory('194994')

    logger.info('=== EXPORTS ===')
    for (const exp of partsResult.exports) {
      logger.info(`  ${exp.label}: ${exp.filePath || 'FAILED'}`)
    }

    logger.info('=== PARTS (from Rebrickable CSV) ===')
    logger.info(`  Total unique parts: ${partsResult.parts.length}`)
    if (partsResult.parts.length > 0) {
      const totalQty = partsResult.parts.reduce((sum, p) => sum + p.quantity, 0)
      logger.info(`  Total quantity: ${totalQty}`)
      logger.info('  Sample parts:')
      for (const p of partsResult.parts.slice(0, 10)) {
        logger.info(`    ${p.partNumber} — ${p.name || '(no name)'} (color: ${p.color}) x${p.quantity}`)
      }
    }

    logger.info('\nDONE — press Ctrl+C to close.')
    await new Promise(() => {})
  } catch (error) {
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    await browser.close()
    process.exit(1)
  }
}

main()
