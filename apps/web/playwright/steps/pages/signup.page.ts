import { type Page, type Locator } from '@playwright/test'

/**
 * Page Object for the Signup/Registration page
 * Provides methods to interact with the registration form
 */
export class SignupPage {
  readonly page: Page

  // Form fields
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly termsCheckbox: Locator
  readonly signUpButton: Locator

  // Password visibility toggles
  readonly passwordToggle: Locator
  readonly confirmPasswordToggle: Locator

  // Navigation
  readonly loginLink: Locator

  constructor(page: Page) {
    this.page = page

    // Form fields - using id selectors based on the SignupPage component
    this.nameInput = page.locator('#name')
    this.emailInput = page.locator('#email')
    this.passwordInput = page.locator('#password')
    this.confirmPasswordInput = page.locator('#confirmPassword')
    this.termsCheckbox = page.locator('#acceptTerms')
    this.signUpButton = page.locator('button[type="submit"]')

    // Password visibility toggles - buttons with aria-label
    this.passwordToggle = page.locator('button[aria-label*="password"]').first()
    this.confirmPasswordToggle = page.locator('button[aria-label*="password"]').last()

    // Navigation link to login - use the one with "Sign in here" text
    this.loginLink = page.getByRole('link', { name: 'Sign in here' })
  }

  async goto() {
    await this.page.goto('/register')
  }

  async waitForPageLoad() {
    await this.nameInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  // Form input methods
  async enterName(name: string) {
    await this.nameInput.fill(name)
  }

  async enterEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async enterPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async enterConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password)
  }

  async acceptTerms() {
    await this.termsCheckbox.check()
  }

  async clickSignUp() {
    await this.signUpButton.click()
  }

  // Validation error checks - using exact error messages from Zod schema
  async hasNameError(): Promise<boolean> {
    await this.page.waitForTimeout(500) // Wait for validation
    // Error: "Name must be at least 2 characters"
    const error = this.page.locator('text=Name must be at least 2 characters')
    return await error.isVisible().catch(() => false)
  }

  async hasEmailError(): Promise<boolean> {
    await this.page.waitForTimeout(500)
    // Error: "Please enter a valid email address"
    const error = this.page.locator('text=Please enter a valid email address')
    return await error.isVisible().catch(() => false)
  }

  async hasPasswordError(): Promise<boolean> {
    await this.page.waitForTimeout(500)
    // Errors: "Password must be at least 8 characters" or "Password must contain uppercase, lowercase, and number"
    const error1 = this.page.locator('text=Password must be at least 8 characters')
    const error2 = this.page.locator('text=Password must contain uppercase, lowercase, and number')
    return (
      (await error1.isVisible().catch(() => false)) || (await error2.isVisible().catch(() => false))
    )
  }

  async hasConfirmPasswordError(): Promise<boolean> {
    await this.page.waitForTimeout(500)
    // Error: "Passwords don't match"
    const error = this.page.locator("text=Passwords don't match")
    return await error.isVisible().catch(() => false)
  }

  async hasTermsError(): Promise<boolean> {
    await this.page.waitForTimeout(500)
    // Error: "You must accept the terms and conditions"
    const error = this.page.locator('text=You must accept the terms and conditions')
    return await error.isVisible().catch(() => false)
  }

  // Success/error message methods
  async waitForSuccessMessage() {
    // Look for the success message text from SignupPage component
    // "Account created successfully! Please check your email for verification."
    const successText = this.page.locator(
      'text=/Account created successfully|check your email for verification/i',
    )
    await successText.waitFor({ state: 'visible', timeout: 10000 })
  }

  // Password visibility methods
  async isPasswordMasked(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type')
    return type === 'password'
  }

  async togglePasswordVisibility() {
    await this.passwordToggle.click()
  }

  // Field visibility checks
  async isNameFieldVisible(): Promise<boolean> {
    return await this.nameInput.isVisible()
  }

  async isEmailFieldVisible(): Promise<boolean> {
    return await this.emailInput.isVisible()
  }

  async isPasswordFieldVisible(): Promise<boolean> {
    return await this.passwordInput.isVisible()
  }

  async isConfirmPasswordFieldVisible(): Promise<boolean> {
    return await this.confirmPasswordInput.isVisible()
  }

  async isTermsCheckboxVisible(): Promise<boolean> {
    return await this.termsCheckbox.isVisible()
  }

  async isSignUpButtonVisible(): Promise<boolean> {
    return await this.signUpButton.isVisible()
  }

  async isLoginLinkVisible(): Promise<boolean> {
    return await this.loginLink.isVisible()
  }

  // Navigation
  async clickLoginLink() {
    await this.loginLink.click()
  }
}
