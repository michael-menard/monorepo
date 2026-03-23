import { logger } from '@repo/logger'
import { BasePage } from './base-page.js'
import { waitAfterLogin } from '../scraper/human-behavior.js'

// Selectors updated from discovery screenshot 2026-03-23
const SELECTORS = {
  usernameField: 'input[placeholder*="Username"]',
  usernameFieldAlt: 'input[name="login"]',
  usernameFieldAlt2: '#id_login',

  passwordField: 'input[placeholder="Password"]',
  passwordFieldAlt: 'input[name="password"]',
  passwordFieldAlt2: 'input[type="password"]',

  submitButton: 'button:has-text("LOGIN")',
  submitButtonAlt: 'button[type="submit"]',
  submitButtonAlt2: 'form button.btn',

  // Post-login detection — must be specific to nav bar, not page content
  loggedInIndicator: '[href*="logout"]',
  loggedInIndicatorAlt: 'a:has-text("Account")',
  loggedInIndicatorAlt2: '.navbar a[href*="/users/jonnybricks"]',
}

const LOGIN_URL = 'https://rebrickable.com/login/'

export class LoginPage extends BasePage {
  async navigate(): Promise<void> {
    try {
      await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch {
      // ERR_ABORTED happens when /login/ redirects (already logged in)
      // Just wait for whatever page we ended up on
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {})
    }
    logger.info(`[login] Navigated to ${LOGIN_URL}`)
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const indicator = await this.page.waitForSelector(
        [SELECTORS.loggedInIndicator, SELECTORS.loggedInIndicatorAlt, SELECTORS.loggedInIndicatorAlt2].join(', '),
        { timeout: 3000 },
      )
      return !!indicator
    } catch {
      return false
    }
  }

  async login(username: string, password: string): Promise<void> {
    await this.withScreenshotOnError('login', async () => {
      await this.navigate()

      // If /login/ redirected us away, we're already logged in
      if (!this.page.url().includes('/login')) {
        logger.info('[login] Redirected from login page — already logged in')
        return
      }

      await this.screenshot('login-page', 'discovery')

      // Find and fill username — try each selector until one works
      const usernameSelector = await this.findWorkingSelector(
        SELECTORS.usernameField,
        SELECTORS.usernameFieldAlt,
        SELECTORS.usernameFieldAlt2,
      )
      await this.type(usernameSelector, username)

      // Find and fill password
      const passwordSelector = await this.findWorkingSelector(
        SELECTORS.passwordField,
        SELECTORS.passwordFieldAlt,
        SELECTORS.passwordFieldAlt2,
      )
      await this.type(passwordSelector, password)

      // Submit
      const submitSelector = await this.findWorkingSelector(
        SELECTORS.submitButton,
        SELECTORS.submitButtonAlt,
        SELECTORS.submitButtonAlt2,
      )
      await this.click(submitSelector)

      // Wait for navigation after login
      await this.page.waitForLoadState('networkidle', { timeout: 15000 })
      await waitAfterLogin()

      // Verify login succeeded
      const loggedIn = await this.isLoggedIn()
      if (!loggedIn) {
        await this.screenshot('login-failed', 'errors')
        throw new Error('Login failed — could not detect logged-in state after submit')
      }

      logger.info('[login] Successfully logged in')
      await this.screenshot('login-success', 'discovery')
    })
  }

  async checkSessionValid(): Promise<boolean> {
    try {
      await this.page.goto('https://rebrickable.com/', { waitUntil: 'networkidle' })
      return this.isLoggedIn()
    } catch {
      return false
    }
  }

  private async findWorkingSelector(...selectors: string[]): Promise<string> {
    for (const selector of selectors) {
      try {
        const el = await this.page.waitForSelector(selector, { timeout: 3000 })
        if (el) {
          logger.info(`[login] Found element with selector: ${selector}`)
          return selector
        }
      } catch {
        // Try next
      }
    }
    throw new Error(`No element found with selectors: ${selectors.join(', ')}`)
  }
}
