import type { Page, Locator } from '@playwright/test'

/**
 * Page Object for Login Page
 * Maps to /login route
 */
export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator
  readonly forgotPasswordLink: Locator
  readonly signUpLink: Locator
  readonly rememberMeCheckbox: Locator
  readonly showPasswordButton: Locator
  readonly googleButton: Locator
  readonly facebookButton: Locator
  readonly appleButton: Locator
  readonly backToHomeButton: Locator

  constructor(page: Page) {
    this.page = page
    // Form inputs - using id selectors as they're more reliable
    this.emailInput = page.locator('#email')
    this.passwordInput = page.locator('#password')
    this.submitButton = page.getByRole('button', { name: /sign in/i })

    // Error display
    this.errorAlert = page.getByTestId('login-error')

    // Navigation links
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i })
    this.signUpLink = page.getByRole('link', { name: /sign up/i })
    this.backToHomeButton = page.getByRole('link', { name: /back to home/i })

    // Checkbox and toggles
    this.rememberMeCheckbox = page.locator('#rememberMe')
    this.showPasswordButton = page.getByRole('button', { name: /show password|hide password/i })

    // Social login buttons
    this.googleButton = page.getByRole('button', { name: /google/i })
    this.facebookButton = page.getByRole('button', { name: /facebook/i })
    this.appleButton = page.getByRole('button', { name: /apple/i })
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submitButton.click()
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click()
  }

  async clickSignUp() {
    await this.signUpLink.click()
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.click()
  }

  async toggleRememberMe() {
    await this.rememberMeCheckbox.click()
  }

  async getEmailValidationError(): Promise<string | null> {
    const errorElement = this.page.locator('#email-error')
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }

  async getPasswordValidationError(): Promise<string | null> {
    const errorElement = this.page.locator('#password-error')
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }

  async getAuthError(): Promise<string | null> {
    if (await this.errorAlert.isVisible()) {
      return await this.errorAlert.textContent()
    }
    return null
  }
}

/**
 * Factory function for creating LoginPage instances
 */
export function createLoginPage(page: Page): LoginPage {
  return new LoginPage(page)
}
