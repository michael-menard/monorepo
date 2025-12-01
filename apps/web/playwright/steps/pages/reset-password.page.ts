import type { Page, Locator } from '@playwright/test'

/**
 * Page Object for Reset Password Page
 * Maps to /reset-password route
 */
export class ResetPasswordPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly codeInput: Locator
  readonly newPasswordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly submitButton: Locator
  readonly passwordStrengthIndicator: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator
  readonly resendCodeLink: Locator
  readonly showPasswordButton: Locator

  constructor(page: Page) {
    this.page = page
    // Form inputs
    this.emailInput = page.locator('#email').or(page.getByLabel(/email/i))
    this.codeInput = page.getByTestId('otp-input').or(page.getByLabel(/code|otp/i))
    this.newPasswordInput = page.locator('#newPassword').or(page.getByLabel(/new password/i))
    this.confirmPasswordInput = page.locator('#confirmPassword').or(page.getByLabel(/confirm password/i))
    this.submitButton = page.getByRole('button', { name: /reset password|submit/i })

    // Password strength
    this.passwordStrengthIndicator = page.getByTestId('password-strength').or(
      page.getByText(/password strength:/i)
    )

    // Messages
    this.errorMessage = page.getByRole('alert').filter({ hasText: /error|failed|invalid|expired/i })
    this.successMessage = page.getByRole('alert').filter({ hasText: /success|changed|reset/i })

    // Links
    this.resendCodeLink = page.getByRole('link', { name: /resend|request new code/i })

    // Toggle
    this.showPasswordButton = page.getByRole('button', { name: /show password|hide password/i })
  }

  async goto() {
    await this.page.goto('/reset-password')
    await this.page.waitForLoadState('networkidle')
  }

  async fillEmail(email: string) {
    if (await this.emailInput.isEditable()) {
      await this.emailInput.fill(email)
    }
  }

  async fillNewPassword(password: string) {
    await this.newPasswordInput.fill(password)
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password)
  }

  /**
   * Enter reset code digit by digit (for OTP-style input)
   */
  async enterCode(code: string) {
    // Check if it's an OTP-style input
    const otpInput = this.page.getByTestId('otp-input-input-0')
    if (await otpInput.isVisible()) {
      const digits = code.split('')
      for (let i = 0; i < digits.length; i++) {
        await this.page.getByTestId(`otp-input-input-${i}`).fill(digits[i])
      }
    } else {
      // Single input field
      await this.codeInput.fill(code)
    }
  }

  async clickSubmit() {
    await this.submitButton.click()
  }

  async resetPassword(email: string, code: string, newPassword: string, confirmPassword: string) {
    await this.fillEmail(email)
    await this.enterCode(code)
    await this.fillNewPassword(newPassword)
    await this.fillConfirmPassword(confirmPassword)
    await this.clickSubmit()
  }

  async clickResendCode() {
    await this.resendCodeLink.click()
  }

  async getPasswordStrength(): Promise<string | null> {
    if (await this.passwordStrengthIndicator.isVisible()) {
      const text = await this.passwordStrengthIndicator.textContent()
      // Extract strength value
      const match = text?.match(/(weak|fair|good|strong)/i)
      return match ? match[1] : text
    }
    return null
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

  async getPasswordValidationError(): Promise<string | null> {
    const errorElement = this.page.locator('#newPassword').locator('..').locator('.text-red-600')
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }

  async getConfirmPasswordError(): Promise<string | null> {
    const errorElement = this.page.locator('#confirmPassword').locator('..').locator('.text-red-600')
    if (await errorElement.isVisible()) {
      return await errorElement.textContent()
    }
    return null
  }

  async getEmailValue(): Promise<string> {
    return await this.emailInput.inputValue()
  }
}

/**
 * Factory function for creating ResetPasswordPage instances
 */
export function createResetPasswordPage(page: Page): ResetPasswordPage {
  return new ResetPasswordPage(page)
}
