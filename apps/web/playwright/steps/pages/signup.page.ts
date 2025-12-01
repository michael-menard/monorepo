import type { Page, Locator } from '@playwright/test'

/**
 * Page Object for Signup Page
 * Maps to /register route
 */
export class SignupPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly acceptTermsCheckbox: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator
  readonly successAlert: Locator
  readonly signInLink: Locator
  readonly backToHomeButton: Locator
  readonly showPasswordButton: Locator
  readonly showConfirmPasswordButton: Locator
  readonly passwordStrengthIndicator: Locator
  readonly googleButton: Locator
  readonly facebookButton: Locator
  readonly appleButton: Locator

  constructor(page: Page) {
    this.page = page
    // Form inputs
    this.nameInput = page.locator('#name')
    this.emailInput = page.locator('#email')
    this.passwordInput = page.locator('#password')
    this.confirmPasswordInput = page.locator('#confirmPassword')
    this.acceptTermsCheckbox = page.locator('#acceptTerms')
    this.submitButton = page.getByRole('button', { name: /create account/i })

    // Alerts
    this.errorAlert = page.getByRole('alert').filter({ hasText: /failed|error/i })
    this.successAlert = page.getByRole('alert').filter({ hasText: /success|created/i })

    // Navigation
    this.signInLink = page.getByRole('link', { name: /sign in/i })
    this.backToHomeButton = page.getByRole('link', { name: /back to home/i })

    // Password toggles
    this.showPasswordButton = page.locator('#password').locator('..').getByRole('button')
    this.showConfirmPasswordButton = page.locator('#confirmPassword').locator('..').getByRole('button')

    // Password strength
    this.passwordStrengthIndicator = page.getByText(/password strength:/i)

    // Social signup
    this.googleButton = page.getByRole('button', { name: /google/i })
    this.facebookButton = page.getByRole('button', { name: /facebook/i })
    this.appleButton = page.getByRole('button', { name: /apple/i })
  }

  async goto() {
    await this.page.goto('/register')
    await this.page.waitForLoadState('networkidle')
  }

  async fillName(name: string) {
    await this.nameInput.fill(name)
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password)
  }

  async acceptTerms() {
    await this.acceptTermsCheckbox.click()
  }

  async signup(name: string, email: string, password: string, confirmPassword: string) {
    await this.fillName(name)
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.fillConfirmPassword(confirmPassword)
    await this.acceptTerms()
    await this.submitButton.click()
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  async clickSignIn() {
    await this.signInLink.click()
  }

  async getPasswordStrength(): Promise<string | null> {
    if (await this.passwordStrengthIndicator.isVisible()) {
      const text = await this.passwordStrengthIndicator.textContent()
      // Extract strength value (Weak, Fair, Good, Strong)
      const match = text?.match(/password strength:\s*(\w+)/i)
      return match ? match[1] : null
    }
    return null
  }

  async getValidationError(field: 'name' | 'email' | 'password' | 'confirmPassword' | 'acceptTerms'): Promise<string | null> {
    // Look for error messages near the field
    const fieldContainer = this.page.locator(`#${field}`).locator('..')
    const errorElement = fieldContainer.locator('.text-red-600')
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }
}

/**
 * Factory function for creating SignupPage instances
 */
export function createSignupPage(page: Page): SignupPage {
  return new SignupPage(page)
}
