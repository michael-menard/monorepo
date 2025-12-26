import { type Page, type Locator } from '@playwright/test'

/**
 * Page Object for the Reset Password page
 * Path: /reset-password
 */
export class ResetPasswordPage {
  readonly page: Page

  // Form fields
  readonly emailInput: Locator
  readonly codeInput: Locator
  readonly newPasswordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly submitButton: Locator

  // Password visibility toggles
  readonly newPasswordToggle: Locator
  readonly confirmPasswordToggle: Locator

  // Password strength indicator
  readonly passwordStrengthIndicator: Locator

  // Navigation links
  readonly backToLoginLink: Locator
  readonly resendCodeButton: Locator

  // Messages
  readonly errorMessage: Locator
  readonly successMessage: Locator

  // Validation errors
  readonly emailError: Locator
  readonly codeError: Locator
  readonly passwordError: Locator
  readonly confirmPasswordError: Locator

  // Page elements
  readonly pageTitle: Locator

  constructor(page: Page) {
    this.page = page

    // Form fields - using test IDs for stability
    this.emailInput = page.locator('#email')
    this.codeInput = page.locator('#code')
    this.newPasswordInput = page.locator('#newPassword')
    this.confirmPasswordInput = page.locator('#confirmPassword')
    this.submitButton = page.locator('button[type="submit"]')

    // Password visibility toggles
    this.newPasswordToggle = page.locator('button[aria-label*="password"]').first()
    this.confirmPasswordToggle = page.locator('button[aria-label*="password"]').last()

    // Password strength indicator
    this.passwordStrengthIndicator = page.getByTestId('password-strength-indicator')

    // Navigation links
    this.backToLoginLink = page.getByRole('link', { name: /back to login|sign in/i })
    this.resendCodeButton = page.getByTestId('resend-code-button')

    // Messages
    this.errorMessage = page.getByTestId('reset-password-error')
    this.successMessage = page.getByTestId('reset-password-success')

    // Validation errors
    this.emailError = page.locator('#email-error')
    this.codeError = page.locator('#code-error')
    this.passwordError = page.locator('#newPassword-error')
    this.confirmPasswordError = page.locator('#confirmPassword-error')

    // Page elements
    this.pageTitle = page.getByRole('heading', { name: /reset password|set new password/i })
  }

  async goto() {
    await this.page.goto('/reset-password')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPageLoad() {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  // Form input methods
  async enterEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async enterCode(code: string) {
    await this.codeInput.fill(code)
  }

  async enterNewPassword(password: string) {
    await this.newPasswordInput.fill(password)
  }

  async enterConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password)
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  // Password visibility methods
  async toggleNewPasswordVisibility() {
    await this.newPasswordToggle.click()
  }

  async toggleConfirmPasswordVisibility() {
    await this.confirmPasswordToggle.click()
  }

  async isNewPasswordMasked(): Promise<boolean> {
    const type = await this.newPasswordInput.getAttribute('type')
    return type === 'password'
  }

  async isConfirmPasswordMasked(): Promise<boolean> {
    const type = await this.confirmPasswordInput.getAttribute('type')
    return type === 'password'
  }

  // Navigation methods
  async clickBackToLogin() {
    await this.backToLoginLink.click()
  }

  async clickResendCode() {
    await this.resendCodeButton.click()
  }

  // Password strength indicator methods
  async isPasswordStrengthIndicatorVisible(): Promise<boolean> {
    return await this.passwordStrengthIndicator.isVisible().catch(() => false)
  }

  async getPasswordStrengthLabel(): Promise<string | null> {
    if (await this.isPasswordStrengthIndicatorVisible()) {
      const label = this.page.locator('[data-testid="password-strength-indicator"] p')
      return await label.textContent()
    }
    return null
  }

  async getPasswordStrengthScore(): Promise<number> {
    if (await this.isPasswordStrengthIndicatorVisible()) {
      // Count filled strength bars
      const bars = this.page.locator('[data-testid="password-strength-indicator"] > div > div')
      const count = await bars.count()
      let filledCount = 0
      for (let i = 0; i < count; i++) {
        const bar = bars.nth(i)
        const className = await bar.getAttribute('class')
        if (className && !className.includes('bg-gray-200')) {
          filledCount++
        }
      }
      return filledCount
    }
    return 0
  }

  // Validation error checks
  async hasEmailError(): Promise<boolean> {
    return await this.emailError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async hasCodeError(): Promise<boolean> {
    return await this.codeError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async hasPasswordError(): Promise<boolean> {
    return await this.passwordError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async hasConfirmPasswordError(): Promise<boolean> {
    return await this.confirmPasswordError.isVisible({ timeout: 5000 }).catch(() => false)
  }

  async getEmailErrorText(): Promise<string | null> {
    if (await this.hasEmailError()) {
      return await this.emailError.textContent()
    }
    return null
  }

  async getCodeErrorText(): Promise<string | null> {
    if (await this.hasCodeError()) {
      return await this.codeError.textContent()
    }
    return null
  }

  async getPasswordErrorText(): Promise<string | null> {
    if (await this.hasPasswordError()) {
      return await this.passwordError.textContent()
    }
    return null
  }

  async getConfirmPasswordErrorText(): Promise<string | null> {
    if (await this.hasConfirmPasswordError()) {
      return await this.confirmPasswordError.textContent()
    }
    return null
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

  async isCodeFieldVisible(): Promise<boolean> {
    return await this.codeInput.isVisible()
  }

  async isNewPasswordFieldVisible(): Promise<boolean> {
    return await this.newPasswordInput.isVisible()
  }

  async isConfirmPasswordFieldVisible(): Promise<boolean> {
    return await this.confirmPasswordInput.isVisible()
  }
}

