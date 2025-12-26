import { type Page, type Locator } from '@playwright/test'

/**
 * Page Object for the Login page
 * Path: /login
 */
export class LoginPage {
  readonly page: Page

  // Form fields
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly rememberMeCheckbox: Locator
  readonly signInButton: Locator

  // Password visibility toggle
  readonly passwordToggle: Locator

  // Navigation links
  readonly signupLink: Locator
  readonly forgotPasswordLink: Locator

  // Error messages
  readonly emailError: Locator
  readonly passwordError: Locator
  readonly loginError: Locator

  // Page elements
  readonly pageTitle: Locator

  constructor(page: Page) {
    this.page = page

    // Form fields - using test IDs for stability
    this.emailInput = page.locator('#email')
    this.passwordInput = page.locator('#password')
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: /remember me/i })
    this.signInButton = page.locator('button[type="submit"]')

    // Password visibility toggle
    this.passwordToggle = page.getByLabel(/show password|hide password/i)

    // Navigation links
    this.signupLink = page.getByRole('link', { name: /sign up/i })
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i })

    // Error messages
    this.emailError = page.locator('#email-error')
    this.passwordError = page.locator('#password-error')
    this.loginError = page.getByTestId('login-error')

    // Page elements
    this.pageTitle = page.getByRole('heading', { name: /welcome back/i })
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPageLoad() {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  // Form input methods
  async enterEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async enterPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async checkRememberMe() {
    await this.rememberMeCheckbox.check()
  }

  async clickSignIn() {
    await this.signInButton.click()
  }

  async togglePasswordVisibility() {
    await this.passwordToggle.click()
  }

  // Navigation methods
  async clickSignupLink() {
    await this.signupLink.click()
  }

  async clickForgotPasswordLink() {
    await this.forgotPasswordLink.click()
  }

  // Validation error checks
  async hasEmailError(): Promise<boolean> {
    return await this.emailError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async hasPasswordError(): Promise<boolean> {
    return await this.passwordError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async getEmailErrorText(): Promise<string | null> {
    if (await this.hasEmailError()) {
      return await this.emailError.textContent()
    }
    return null
  }

  async getPasswordErrorText(): Promise<string | null> {
    if (await this.hasPasswordError()) {
      return await this.passwordError.textContent()
    }
    return null
  }

  // Button state checks
  async isSignInButtonDisabled(): Promise<boolean> {
    return await this.signInButton.isDisabled()
  }

  async getSignInButtonText(): Promise<string | null> {
    return await this.signInButton.textContent()
  }

  async isPasswordMasked(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type')
    return type === 'password'
  }

  // Field visibility checks
  async isEmailFieldVisible(): Promise<boolean> {
    return await this.emailInput.isVisible()
  }

  async isPasswordFieldVisible(): Promise<boolean> {
    return await this.passwordInput.isVisible()
  }

  async isRememberMeVisible(): Promise<boolean> {
    return await this.rememberMeCheckbox.isVisible()
  }

  async isForgotPasswordLinkVisible(): Promise<boolean> {
    return await this.forgotPasswordLink.isVisible()
  }
}

