import { type Page, type Locator } from '@playwright/test'

/**
 * Page Object for the Forgot Password page
 * Path: /forgot-password
 */
export class ForgotPasswordPage {
  readonly page: Page

  // Form fields
  readonly emailInput: Locator
  readonly submitButton: Locator

  // Navigation links
  readonly backToLoginLink: Locator
  readonly signupLink: Locator

  // Messages
  readonly errorMessage: Locator
  readonly successMessage: Locator

  // Page elements
  readonly pageTitle: Locator
  readonly pageDescription: Locator

  constructor(page: Page) {
    this.page = page

    // Form fields - using test IDs for stability
    this.emailInput = page.locator('#email')
    this.submitButton = page.locator('button[type="submit"]')

    // Navigation links
    this.backToLoginLink = page.getByRole('link', { name: /back to login|sign in/i })
    this.signupLink = page.getByRole('link', { name: /sign up|create account/i })

    // Messages
    this.errorMessage = page.getByTestId('forgot-password-error')
    this.successMessage = page.getByTestId('forgot-password-success')

    // Page elements
    this.pageTitle = page.getByRole('heading', { name: /forgot password|reset password/i })
    this.pageDescription = page.locator('.text-gray-600, .text-muted-foreground').first()
  }

  async goto() {
    await this.page.goto('/forgot-password')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPageLoad() {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  // Form input methods
  async enterEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  // Navigation methods
  async clickBackToLogin() {
    await this.backToLoginLink.click()
  }

  async clickSignupLink() {
    await this.signupLink.click()
  }

  // Message checks
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async hasSuccessMessage(): Promise<boolean> {
    return await this.successMessage.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async getErrorMessageText(): Promise<string | null> {
    if (await this.hasErrorMessage()) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  async getSuccessMessageText(): Promise<string | null> {
    if (await this.hasSuccessMessage()) {
      return await this.successMessage.textContent()
    }
    return null
  }

  // Button state checks
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled()
  }

  async getSubmitButtonText(): Promise<string | null> {
    return await this.submitButton.textContent()
  }

  // Field visibility checks
  async isEmailFieldVisible(): Promise<boolean> {
    return await this.emailInput.isVisible()
  }

  async isBackToLoginLinkVisible(): Promise<boolean> {
    return await this.backToLoginLink.isVisible()
  }

  // Email validation error (inline field error)
  async hasEmailValidationError(): Promise<boolean> {
    const emailError = this.page.locator('#email-error')
    return await emailError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async getEmailValidationErrorText(): Promise<string | null> {
    const emailError = this.page.locator('#email-error')
    if (await emailError.isVisible().catch(() => false)) {
      return await emailError.textContent()
    }
    return null
  }
}

