import dotenv from 'dotenv'
dotenv.config()

import { createStealthBrowser, saveSession } from './scraper/browser.js'
import { LoginPage } from './pages/login-page.js'

async function main() {
  const { browser, context, page } = await createStealthBrowser({ headed: false })

  try {
    // Login if needed
    const loginPage = new LoginPage(page)
    const sessionValid = await loginPage.checkSessionValid()
    if (!sessionValid) {
      console.log('Logging in...')
      await loginPage.login(process.env.REBRICKABLE_USERNAME!, process.env.REBRICKABLE_PASSWORD!)
      await saveSession(context)
    } else {
      console.log('Session valid')
    }

    const userSlug = process.env.REBRICKABLE_USER_SLUG!
    await page.goto(`https://rebrickable.com/users/${userSlug}/mocs/purchases/`, {
      waitUntil: 'networkidle',
    })

    console.log('=== CURRENT URL ===')
    console.log(page.url())
    console.log('=== PAGE TITLE ===')
    console.log(await page.title())

    // Count MOC links
    const mocLinks = await page.$$eval('a[href*="/mocs/MOC-"]', links =>
      links.map(a => ({
        text: a.textContent?.trim().substring(0, 60),
        href: a.getAttribute('href')?.substring(0, 80),
      })),
    )
    console.log(`\n=== MOC links on page 1: ${mocLinks.length} ===`)
    for (const l of mocLinks.slice(0, 5)) {
      console.log(`  ${l.text} → ${l.href}`)
    }

    // Get pagination HTML
    const paginationHtml = await page.evaluate(() => {
      const els = document.querySelectorAll('.pagination, nav[aria-label], [class*=paginat]')
      return Array.from(els).map(el => el.outerHTML).join('\n---\n')
    })
    console.log('\n=== PAGINATION HTML ===')
    console.log(paginationHtml || '(none found)')

    // Check what elements match each selector from goToNextPage
    const selectors = [
      '.pagination .next a',
      'a[rel="next"]',
      '.page-link[aria-label="Next"]',
    ]
    for (const sel of selectors) {
      const count = await page.$$(sel).then(els => els.length)
      if (count > 0) {
        const info = await page.$eval(sel, el => ({
          text: el.textContent?.trim().substring(0, 80),
          href: el.getAttribute('href'),
          classes: el.className,
          disabled: el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true',
        }))
        console.log(`\n  "${sel}" → ${count} matches, first: ${JSON.stringify(info)}`)
      } else {
        console.log(`\n  "${sel}" → 0 matches`)
      }
    }

    // Check a:has-text("Next")
    try {
      const hasTextNext = await page.$('a:has-text("Next")')
      if (hasTextNext) {
        const info = await hasTextNext.evaluate(el => ({
          text: el.textContent?.trim().substring(0, 80),
          href: el.getAttribute('href'),
          classes: el.className,
          parent: el.parentElement?.className || '',
          parentTag: el.parentElement?.tagName || '',
        }))
        console.log('\n=== a:has-text("Next") first match ===')
        console.log(JSON.stringify(info, null, 2))
      } else {
        console.log('\n=== a:has-text("Next") → no match ===')
      }
    } catch (e) {
      console.log('has-text error:', e)
    }

    // Also check for any "next" page link patterns
    const allPageLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.pagination a, .pagination li'))
        .map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 40),
          href: el.getAttribute('href'),
          classes: el.className,
        }))
    })
    console.log('\n=== All .pagination children ===')
    for (const l of allPageLinks) {
      console.log(`  <${l.tag} class="${l.classes}"> ${l.text} → ${l.href}`)
    }

  } finally {
    await browser.close()
  }
}

main().catch(console.error)
