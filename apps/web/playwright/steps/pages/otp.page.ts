import type { Page, Locator } from '@playwright/test'

/**
 * Page Object for OTP Verification Page
 * Maps to /auth/otp-verification route
 */
export class OTPPage {
  readonly page: Page
  readonly otpContainer: Locator
  readonly verifyButton: Locator
  readonly backToLoginButton: Locator
  readonly resendCodeButton: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator
  readonly cooldownTimer: Locator

  constructor(page: Page) {
    this.page = page
    // OTP inputs container
    this.otpContainer = page.getByTestId('otp-input')

    // Buttons
    this.verifyButton = page.getByRole('button', { name: /verify/i })
    this.backToLoginButton = page.getByRole('button', { name: /back to login/i }).or(
      page.getByRole('link', { name: /back to login/i })
    )
    this.resendCodeButton = page.getByRole('button', { name: /resend/i })

    // Messages
    this.errorMessage = page.getByRole('alert').filter({ hasText: /invalid|error|incorrect/i })
    this.successMessage = page.getByRole('alert').filter({ hasText: /success|verified/i })

    // Timer
    this.cooldownTimer = page.getByText(/resend in|seconds/i)
  }

  async goto() {
    await this.page.goto('/auth/otp-verification')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Enter OTP code digit by digit
   */
  async enterOTP(code: string) {
    const digits = code.split('')
    for (let i = 0; i < digits.length; i++) {
      const input = this.page.getByTestId(`otp-input-input-${i}`)
      await input.fill(digits[i])
    }
  }

  /**
   * Paste full OTP code (simulates clipboard paste)
   */
  async pasteOTP(code: string) {
    // Focus first input
    const firstInput = this.page.getByTestId('otp-input-input-0')
    await firstInput.focus()

    // Use keyboard to paste
    await this.page.keyboard.type(code)
  }

  async clickVerify() {
    await this.verifyButton.click()
  }

  async clickBackToLogin() {
    await this.backToLoginButton.click()
  }

  async clickResendCode() {
    await this.resendCodeButton.click()
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  async isResendDisabled(): Promise<boolean> {
    return await this.resendCodeButton.isDisabled()
  }

  async getCooldownTime(): Promise<string | null> {
    if (await this.cooldownTimer.isVisible()) {
      return await this.cooldownTimer.textContent()
    }
    return null
  }

  /**
   * Navigate between OTP inputs using arrow keys
   */
  async navigateWithArrowKeys(direction: 'left' | 'right') {
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
    await this.page.keyboard.press(key)
  }
}

/**
 * Factory function for creating OTPPage instances
 */
export function createOTPPage(page: Page): OTPPage {
  return new OTPPage(page)
}
