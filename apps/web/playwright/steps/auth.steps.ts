import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { LoginPage } from './pages/login.page'
import { SignupPage } from './pages/signup.page'
import { OTPPage } from './pages/otp.page'
import { ForgotPasswordPage } from './pages/forgot-password.page'
import { ResetPasswordPage } from './pages/reset-password.page'
import { TEST_DATA, ROUTES } from './fixtures'

const { Given, When, Then } = createBdd()

// ============================================================================
// Page Object Instances (lazy initialization)
// ============================================================================

function getLoginPage(page: any): LoginPage {
  return new LoginPage(page)
}

function getSignupPage(page: any): SignupPage {
  return new SignupPage(page)
}

function getOTPPage(page: any): OTPPage {
  return new OTPPage(page)
}

function getForgotPasswordPage(page: any): ForgotPasswordPage {
  return new ForgotPasswordPage(page)
}

function getResetPasswordPage(page: any): ResetPasswordPage {
  return new ResetPasswordPage(page)
}

// ============================================================================
// Background / Navigation Steps
// ============================================================================

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
})

Given('I am on the signup page', async ({ page }) => {
  await page.goto('/register')
  await page.waitForLoadState('networkidle')
})

Given('I am on the forgot password page', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.waitForLoadState('networkidle')
})

Given('I am on the reset password page', async ({ page }) => {
  await page.goto('/reset-password')
  await page.waitForLoadState('networkidle')
})

Given('I am logged in as {string}', async ({ page }, email: string) => {
  const loginPage = getLoginPage(page)
  await loginPage.goto()
  // Use the email with a default password for test users
  await loginPage.login(email, 'ValidPassword123!')
  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|home)/)
})

Given('I am not logged in', async ({ page }) => {
  // Clear any stored auth state
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
})

// ============================================================================
// Form Element Assertions
// ============================================================================

Then('I should see the login form', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.emailInput).toBeVisible()
  await expect(loginPage.passwordInput).toBeVisible()
  await expect(loginPage.submitButton).toBeVisible()
})

Then('I should see the signup form', async ({ page }) => {
  const signupPage = getSignupPage(page)
  await expect(signupPage.emailInput).toBeVisible()
  await expect(signupPage.passwordInput).toBeVisible()
  await expect(signupPage.submitButton).toBeVisible()
})

Then('I should see the forgot password form', async ({ page }) => {
  const forgotPage = getForgotPasswordPage(page)
  await expect(forgotPage.emailInput).toBeVisible()
  await expect(forgotPage.submitButton).toBeVisible()
})

Then('I should see the reset password form', async ({ page }) => {
  const resetPage = getResetPasswordPage(page)
  await expect(resetPage.emailInput).toBeVisible()
  await expect(resetPage.newPasswordInput).toBeVisible()
  await expect(resetPage.confirmPasswordInput).toBeVisible()
  await expect(resetPage.submitButton).toBeVisible()
})

Then('I should see the email input field', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.emailInput).toBeVisible()
})

Then('I should see the password input field', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.passwordInput).toBeVisible()
})

Then('I should see the confirm password field', async ({ page }) => {
  const signupPage = getSignupPage(page)
  await expect(signupPage.confirmPasswordInput).toBeVisible()
})

Then('I should see the sign in button', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.submitButton).toBeVisible()
})

Then('I should see the sign up button', async ({ page }) => {
  const signupPage = getSignupPage(page)
  await expect(signupPage.submitButton).toBeVisible()
})

Then('I should see the forgot password link', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.forgotPasswordLink).toBeVisible()
})

Then('I should see the sign up link', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.signUpLink).toBeVisible()
})

Then('I should see the back to login link', async ({ page }) => {
  // Look for back to login link on forgot password or signup pages
  const backLink = page.getByRole('link', { name: /back to login|sign in/i })
  await expect(backLink).toBeVisible()
})

Then('I should see the send reset code button', async ({ page }) => {
  const forgotPage = getForgotPasswordPage(page)
  await expect(forgotPage.submitButton).toBeVisible()
})

Then('I should see the OTP code input', async ({ page }) => {
  const resetPage = getResetPasswordPage(page)
  await expect(resetPage.codeInput).toBeVisible()
})

Then('I should see the new password field', async ({ page }) => {
  const resetPage = getResetPasswordPage(page)
  await expect(resetPage.newPasswordInput).toBeVisible()
})

Then('I should see the reset password button', async ({ page }) => {
  const resetPage = getResetPasswordPage(page)
  await expect(resetPage.submitButton).toBeVisible()
})

Then('I should see the OTP input component', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await expect(otpPage.otpContainer).toBeVisible()
})

Then('I should see a verify button', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await expect(otpPage.verifyButton).toBeVisible()
})

// ============================================================================
// Action Steps - Form Interactions
// ============================================================================

When('I click the sign in button', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await loginPage.clickSubmit()
})

When('I click the sign up button', async ({ page }) => {
  const signupPage = getSignupPage(page)
  await signupPage.clickSubmit()
})

When('I click the sign up link', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await loginPage.clickSignUp()
})

When('I click the forgot password link', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await loginPage.clickForgotPassword()
})

When('I click the back to login link', async ({ page }) => {
  const backLink = page.getByRole('link', { name: /back to login|sign in/i })
  await backLink.click()
})

When('I click the back to login button', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await otpPage.clickBackToLogin()
})

When('I click the verify button', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await otpPage.clickVerify()
})

When('I click the send reset code button', async ({ page }) => {
  const forgotPage = getForgotPasswordPage(page)
  await forgotPage.clickSubmit()
})

When('I click the reset password button', async ({ page }) => {
  const resetPage = getResetPasswordPage(page)
  await resetPage.clickSubmit()
})

When('I click the resend code button', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await otpPage.clickResendCode()
})

When('I click the resend code link', async ({ page }) => {
  const resetPage = getResetPasswordPage(page)
  await resetPage.clickResendCode()
})

When('I click the logout button', async ({ page }) => {
  // Look for logout button in various locations (header, dropdown, sidebar)
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    .or(page.getByRole('link', { name: /logout|sign out/i }))
  await logoutButton.click()
})

// ============================================================================
// Form Input Steps
// ============================================================================

When('I enter {string} in the email field', async ({ page }, email: string) => {
  const emailInput = page.locator('#email')
  await emailInput.fill(email)
})

When('I enter {string} in the password field', async ({ page }, password: string) => {
  const passwordInput = page.locator('#password')
  await passwordInput.fill(password)
})

When('I enter {string} in the confirm password field', async ({ page }, password: string) => {
  const confirmInput = page.locator('#confirmPassword')
  await confirmInput.fill(password)
})

When('I enter {string} in the new password field', async ({ page }, password: string) => {
  const resetPage = getResetPasswordPage(page)
  await resetPage.fillNewPassword(password)
})

When('I enter {string} in the name field', async ({ page }, name: string) => {
  const nameInput = page.locator('#name')
  await nameInput.fill(name)
})

When('I enter the valid OTP code {string}', async ({ page }, code: string) => {
  const otpPage = getOTPPage(page)
  await otpPage.enterOTP(code)
})

When('I enter the invalid OTP code {string}', async ({ page }, code: string) => {
  const otpPage = getOTPPage(page)
  await otpPage.enterOTP(code)
})

When('I enter the reset code {string}', async ({ page }, code: string) => {
  const resetPage = getResetPasswordPage(page)
  await resetPage.enterCode(code)
})

When('I enter the invalid reset code {string}', async ({ page }, code: string) => {
  const resetPage = getResetPasswordPage(page)
  await resetPage.enterCode(code)
})

When('I enter the expired reset code {string}', async ({ page }, code: string) => {
  const resetPage = getResetPasswordPage(page)
  await resetPage.enterCode(code)
})

When('I enter the valid verification code {string}', async ({ page }, code: string) => {
  const otpPage = getOTPPage(page)
  await otpPage.enterOTP(code)
})

When('I login with valid credentials', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await loginPage.login(TEST_DATA.validUser.email, TEST_DATA.validUser.password)
})

When('I request reset codes {int} times rapidly', async ({ page }, count: number) => {
  const forgotPage = getForgotPasswordPage(page)
  for (let i = 0; i < count; i++) {
    await forgotPage.requestResetCode('ratelimit@example.com')
    if (i < count - 1) {
      await forgotPage.goto()
    }
  }
})

// ============================================================================
// Navigation Assertion Steps
// ============================================================================

Then('I should be on the signup page', async ({ page }) => {
  await expect(page).toHaveURL(/\/register/)
})

Then('I should be on the forgot password page', async ({ page }) => {
  await expect(page).toHaveURL(/\/forgot-password/)
})

Then('I should be on the dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/)
})

Then('I should be on the login page', async ({ page }) => {
  await expect(page).toHaveURL(/\/login/)
})

Then('I should be on the reset password page', async ({ page }) => {
  await expect(page).toHaveURL(/\/reset-password/)
})

Then('I should remain on the login page', async ({ page }) => {
  await expect(page).toHaveURL(/\/login/)
})

Then('I should remain on the OTP verification page', async ({ page }) => {
  await expect(page).toHaveURL(/\/auth\/otp-verification|\/verify/)
})

Then('I should be redirected to the login page', async ({ page }) => {
  await page.waitForURL(/\/login/, { timeout: 10000 })
  await expect(page).toHaveURL(/\/login/)
})

Then('I should be redirected to the dashboard', async ({ page }) => {
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  await expect(page).toHaveURL(/\/dashboard/)
})

Then('I should be redirected to the OTP verification page', async ({ page }) => {
  await page.waitForURL(/\/auth\/otp-verification|\/verify/, { timeout: 10000 })
})

Then('I should be redirected to the email verification page', async ({ page }) => {
  await page.waitForURL(/\/verify-email/, { timeout: 10000 })
})

Then('I should be redirected to the reset password page', async ({ page }) => {
  await page.waitForURL(/\/reset-password/, { timeout: 10000 })
})

Then('I should be redirected to {string}', async ({ page }, path: string) => {
  await page.waitForURL(new RegExp(path), { timeout: 10000 })
})

// ============================================================================
// Validation Error Steps
// ============================================================================

Then('I should see an email validation error', async ({ page }) => {
  const errorText = page.getByText(/email.*required|enter.*email/i)
  await expect(errorText).toBeVisible()
})

Then('I should see an email format error', async ({ page }) => {
  const errorText = page.getByText(/valid email|invalid email/i)
  await expect(errorText).toBeVisible()
})

Then('I should see a password validation error', async ({ page }) => {
  const errorText = page.getByText(/password.*required|at least.*characters/i)
  await expect(errorText).toBeVisible()
})

Then('I should see an authentication error', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await expect(loginPage.errorAlert).toBeVisible()
})

Then('I should see an invalid code error', async ({ page }) => {
  const errorText = page.getByText(/invalid.*code|incorrect.*code/i)
  await expect(errorText).toBeVisible()
})

Then('I should see a code expired error', async ({ page }) => {
  const errorText = page.getByText(/expired|code.*expired/i)
  await expect(errorText).toBeVisible()
})

Then('I should see a passwords do not match error', async ({ page }) => {
  const errorText = page.getByText(/don't match|do not match|passwords.*match/i)
  await expect(errorText).toBeVisible()
})

Then('I should see an email already exists error', async ({ page }) => {
  const errorText = page.getByText(/already exists|email.*exists|account.*exists/i)
  await expect(errorText).toBeVisible()
})

Then('I should see a rate limit error', async ({ page }) => {
  const errorText = page.getByText(/too many|rate limit|try again later/i)
  await expect(errorText).toBeVisible()
})

Then('I should see a retry after message', async ({ page }) => {
  const errorText = page.getByText(/try again|wait|seconds|minutes/i)
  await expect(errorText).toBeVisible()
})

Then('I should see {string}', async ({ page }, message: string) => {
  await expect(page.getByText(new RegExp(message, 'i'))).toBeVisible()
})

// ============================================================================
// Success Message Steps
// ============================================================================

Then('I should see a welcome message', async ({ page }) => {
  // This could be on the dashboard or in a toast notification
  const welcomeText = page.getByText(/welcome|dashboard|home/i)
  await expect(welcomeText).toBeVisible({ timeout: 10000 })
})

Then('I should see a verification success message', async ({ page }) => {
  const successText = page.getByText(/verified|success|confirmed/i)
  await expect(successText).toBeVisible()
})

Then('I should see a code sent success message', async ({ page }) => {
  const successText = page.getByText(/sent|check.*email|code.*sent/i)
  await expect(successText).toBeVisible()
})

Then('I should see a code sent confirmation', async ({ page }) => {
  const successText = page.getByText(/sent|resent|code.*sent/i)
  await expect(successText).toBeVisible()
})

Then('I should see a password reset success message', async ({ page }) => {
  const successText = page.getByText(/password.*changed|password.*reset|success/i)
  await expect(successText).toBeVisible()
})

Then('I should see a generic success message', async ({ page }) => {
  // For security, forgot password shows same message for existing and non-existing emails
  const successText = page.getByText(/sent|check.*email|success/i)
  await expect(successText).toBeVisible()
})

Then('I should see a login required message', async ({ page }) => {
  const message = page.getByText(/sign in|log in|login required/i)
  await expect(message).toBeVisible()
})

Then('I should see a session expired message', async ({ page }) => {
  const message = page.getByText(/session.*expired|please.*log.*in.*again/i)
  await expect(message).toBeVisible()
})

// ============================================================================
// Password Strength Steps
// ============================================================================

Then('I should see password strength indicator as weak', async ({ page }) => {
  const indicator = page.getByText(/weak/i)
  await expect(indicator).toBeVisible()
})

Then('I should see password strength indicator as strong', async ({ page }) => {
  const indicator = page.getByText(/strong/i)
  await expect(indicator).toBeVisible()
})

Then('the password strength should show {string}', async ({ page }, strength: string) => {
  const indicator = page.getByText(new RegExp(strength, 'i'))
  await expect(indicator).toBeVisible()
})

// ============================================================================
// OTP and Verification Steps
// ============================================================================

Given('I have triggered an MFA challenge', async ({ page }) => {
  const loginPage = getLoginPage(page)
  await loginPage.goto()
  await loginPage.login(TEST_DATA.mfaUser.email, TEST_DATA.mfaUser.password)
  await page.waitForURL(/\/auth\/otp-verification|\/verify/)
})

Given('I have submitted the signup form', async ({ page }) => {
  const signupPage = getSignupPage(page)
  await signupPage.goto()
  await signupPage.signup(
    TEST_DATA.newUser.name,
    TEST_DATA.newUser.email,
    TEST_DATA.newUser.password,
    TEST_DATA.newUser.password
  )
})

Given('I am on the email verification page', async ({ page }) => {
  await expect(page).toHaveURL(/\/verify-email/)
})

Given('I came from the forgot password page with email {string}', async ({ page }, email: string) => {
  const forgotPage = getForgotPasswordPage(page)
  await forgotPage.goto()
  await forgotPage.requestResetCode(email)
  await page.waitForURL(/\/reset-password/)
})

Then('the email field should contain {string}', async ({ page }, email: string) => {
  const resetPage = getResetPasswordPage(page)
  const value = await resetPage.getEmailValue()
  expect(value).toBe(email)
})

Then('the resend button should be disabled temporarily', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await expect(otpPage.resendCodeButton).toBeDisabled()
})

Then('I should see a cooldown timer', async ({ page }) => {
  const otpPage = getOTPPage(page)
  const timer = await otpPage.getCooldownTime()
  expect(timer).toBeTruthy()
})

Then('I cannot click resend until timer expires', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await expect(otpPage.resendCodeButton).toBeDisabled()
})

Then('I should be able to navigate OTP inputs with arrow keys', async ({ page }) => {
  // Focus first input and test arrow key navigation
  const firstInput = page.getByTestId('otp-input-input-0')
  await firstInput.focus()
  await page.keyboard.press('ArrowRight')
  // Verify focus moved (this is a simplified check)
  const secondInput = page.getByTestId('otp-input-input-1')
  await expect(secondInput).toBeFocused()
})

Then('pasting a full code should populate all inputs', async ({ page }) => {
  const otpPage = getOTPPage(page)
  await otpPage.pasteOTP('123456')
  // Verify all inputs have values
  for (let i = 0; i < 6; i++) {
    const input = page.getByTestId(`otp-input-input-${i}`)
    await expect(input).toHaveValue(/\d/)
  }
})

// ============================================================================
// Session Management Steps
// ============================================================================

Then('my session should be cleared', async ({ page }) => {
  // Verify session is cleared by checking cookies or storage
  const cookies = await page.context().cookies()
  const authCookies = cookies.filter(c =>
    c.name.includes('auth') ||
    c.name.includes('token') ||
    c.name.includes('session')
  )
  expect(authCookies.length).toBe(0)
})

When('I navigate to the dashboard', async ({ page }) => {
  await page.goto('/dashboard')
})

When('I navigate to {string}', async ({ page }, path: string) => {
  await page.goto(path)
})

When('I refresh the page', async ({ page }) => {
  await page.reload()
})

Then('I should remain on the dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/)
})

Then('I should still be authenticated', async ({ page }) => {
  // Verify we're not redirected to login
  await expect(page).not.toHaveURL(/\/login/)
})

When('I open a new browser tab', async ({ page, context }) => {
  // Create a new page in the same context (shares cookies/storage)
  const newPage = await context.newPage()
  // Store reference for later use
  ;(page as any).__newTab = newPage
})

When('I navigate to the dashboard in the new tab', async ({ page }) => {
  const newTab = (page as any).__newTab
  if (newTab) {
    await newTab.goto('/dashboard')
  }
})

Then('I should be authenticated in the new tab', async ({ page }) => {
  const newTab = (page as any).__newTab
  if (newTab) {
    await expect(newTab).not.toHaveURL(/\/login/)
  }
})

Given('I am logged in with an expired token', async ({ page }) => {
  // Simulate expired token by setting an old token in storage
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'expired_token_12345')
    localStorage.setItem('tokenExpiry', '0')
  })
})

When('I navigate to a protected route', async ({ page }) => {
  await page.goto('/dashboard')
})

Then('I should be redirected to the forgot password page', async ({ page }) => {
  await page.waitForURL(/\/forgot-password/, { timeout: 10000 })
  await expect(page).toHaveURL(/\/forgot-password/)
})
