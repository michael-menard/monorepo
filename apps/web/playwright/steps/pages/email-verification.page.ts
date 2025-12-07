import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for the Email Verification page
 * Path: /auth/verify-email
 */
export class EmailVerificationPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly emailDescription: Locator
  readonly otpInput: Locator
  readonly verifyButton: Locator
  readonly resendCodeButton: Locator
  readonly backToSignupButton: Locator
  readonly errorMessage: Locator
  readonly statusMessage: Locator
  readonly successTitle: Locator
  readonly goToLoginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.getByRole('heading', { name: 'Verify Your Email' })
    this.emailDescription = page.locator('.text-gray-600').first()
    this.otpInput = page.getByTestId('otp-input')
    this.verifyButton = page.getByTestId('verify-button')
    this.resendCodeButton = page.getByTestId('resend-code-button')
    this.backToSignupButton = page.getByTestId('back-to-signup-button')
    this.errorMessage = page.getByTestId('error-message')
    this.statusMessage = page.getByTestId('status-message')
    this.successTitle = page.getByRole('heading', { name: 'Email Verified!' })
    this.goToLoginButton = page.getByTestId('go-to-login-button')
  }

  async goto() {
    await this.page.goto('/auth/verify-email')
  }

  async gotoWithPendingEmail(email: string) {
    // First navigate to any page to establish the origin for session storage
    await this.page.goto('/register')
    await this.page.waitForLoadState('domcontentloaded')

    // Set the pending email in session storage
    await this.page.evaluate(e => {
      sessionStorage.setItem('pendingVerificationEmail', e)
    }, email)

    // Now navigate to the verification page
    await this.page.goto('/auth/verify-email')
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get individual OTP input fields
   */
  getOtpInputField(index: number): Locator {
    return this.page.getByTestId(`otp-input-input-${index}`)
  }

  /**
   * Enter OTP code digit by digit
   */
  async enterOtp(code: string) {
    const digits = code.split('')
    for (let i = 0; i < digits.length && i < 6; i++) {
      const input = this.getOtpInputField(i)
      await input.fill(digits[i])
    }
  }

  /**
   * Type characters into OTP (for testing filtering)
   */
  async typeInOtp(text: string) {
    const firstInput = this.getOtpInputField(0)
    await firstInput.focus()

    // Type each character
    for (const char of text) {
      await this.page.keyboard.type(char)
    }
  }

  /**
   * Paste text into OTP input
   */
  async pasteInOtp(text: string) {
    const firstInput = this.getOtpInputField(0)
    await firstInput.focus()

    // Use clipboard API
    await this.page.evaluate(t => {
      navigator.clipboard.writeText(t)
    }, text)

    // Paste using keyboard shortcut
    await this.page.keyboard.press('Meta+v')
  }

  /**
   * Get current OTP value from all inputs
   */
  async getOtpValue(): Promise<string> {
    let value = ''
    for (let i = 0; i < 6; i++) {
      const input = this.getOtpInputField(i)
      const inputValue = await input.inputValue()
      value += inputValue
    }
    return value
  }

  /**
   * Press backspace in the last filled OTP field
   */
  async pressBackspaceInLastField() {
    // Find the last filled input
    for (let i = 5; i >= 0; i--) {
      const input = this.getOtpInputField(i)
      const value = await input.inputValue()
      if (value) {
        await input.focus()
        await this.page.keyboard.press('Backspace')
        break
      }
    }
  }

  async clickVerifyButton() {
    await this.verifyButton.click()
  }

  async clickResendCodeButton() {
    await this.resendCodeButton.click()
  }

  async clickBackToSignup() {
    await this.backToSignupButton.click()
  }

  async clickGoToLogin() {
    await this.goToLoginButton.click()
  }

  async isVerifyButtonEnabled(): Promise<boolean> {
    return !(await this.verifyButton.isDisabled())
  }

  async isResendButtonEnabled(): Promise<boolean> {
    return !(await this.resendCodeButton.isDisabled())
  }

  async getResendButtonText(): Promise<string> {
    return (await this.resendCodeButton.textContent()) || ''
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  async getStatusMessage(): Promise<string | null> {
    if (await this.statusMessage.isVisible()) {
      return await this.statusMessage.textContent()
    }
    return null
  }
}
