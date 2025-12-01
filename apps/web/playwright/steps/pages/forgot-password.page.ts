import type { Page, Locator } from '@playwright/test'

/**
 * Page Object for Forgot Password Page
 * Maps to /forgot-password route
 */
export class ForgotPasswordPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly submitButton: Locator
  readonly backToLoginLink: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  constructor(page: Page) {
    this.page = page
    // Form inputs
    this.emailInput = page.locator('#email').or(page.getByLabel(/email/i))
    this.submitButton = page.getByRole('button', { name: /send.*code|reset|submit/i })

    // Navigation
    this.backToLoginLink = page.getByRole('link', { name: /back to login|sign in/i })

    // Messages
    this.errorMessage = page.getByRole('alert').filter({ hasText: /error|failed|invalid/i })
    this.successMessage = page.getByRole('alert').filter({ hasText: /sent|success|check.*email/i })
  }

  async goto() {
    await this.page.goto('/forgot-password')
    await this.page.waitForLoadState('networkidle')
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  async requestResetCode(email: string) {
    await this.fillEmail(email)
    await this.clickSubmit()
  }

  async clickBackToLogin() {
    await this.backToLoginLink.click()
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  async getSuccessMessage(): Promise<string | null> {
    if (await this.successMessage.isVisible()) {
      return await this.successMessage.textContent()
    }
    return null
  }

  async getEmailValidationError(): Promise<string | null> {
    const errorElement = this.page.locator('#email-error').or(
      this.page.locator('#email').locator('..').locator('.text-red-600')
    )
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }
}

/**
 * Factory function for creating ForgotPasswordPage instances
 */
export function createForgotPasswordPage(page: Page): ForgotPasswordPage {
  return new ForgotPasswordPage(page)
}
