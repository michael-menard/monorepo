/**
 * Authentication fixture for E2E tests
 *
 * Sets up browser auth state by:
 * 1. Authenticating with Cognito to get real tokens
 * 2. Injecting the auth state into the browser before tests run
 */

import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider'

// Cognito configuration
const COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_vtW1Slo3o',
  clientId: process.env.COGNITO_CLIENT_ID || '4527ui02h63b7c0ra7vs00gua5',
  region: process.env.AWS_REGION || 'us-east-1',
}

// Test user credentials
const TEST_USER = {
  email: 'stan.marsh@southpark.test',
  password: '0Xcoffee?',
}

interface AuthResult {
  accessToken: string
  idToken: string
  refreshToken: string
  userId: string
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

/**
 * Authenticate with Cognito and get tokens
 */
async function authenticateWithCognito(): Promise<AuthResult> {
  const response = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: TEST_USER.email,
        PASSWORD: TEST_USER.password,
      },
    }),
  )

  if (!response.AuthenticationResult) {
    throw new Error('Authentication failed')
  }

  const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult

  if (!AccessToken || !IdToken) {
    throw new Error('Missing tokens')
  }

  // Extract userId (sub) from the access token
  const payload = JSON.parse(Buffer.from(AccessToken.split('.')[1], 'base64').toString())

  return {
    accessToken: AccessToken,
    idToken: IdToken,
    refreshToken: RefreshToken || '',
    userId: payload.sub,
  }
}

/**
 * Inject auth state into the browser
 */
async function injectAuthState(page: Page, auth: AuthResult): Promise<void> {
  // Go to the app first (any page) to be able to run scripts in context
  await page.goto('/')

  // Wait a bit for the app to initialize
  await page.waitForTimeout(1000)

  // Inject auth state into Redux store via window dispatch
  await page.evaluate(
    ({ auth, email }) => {
      // Access Redux store dispatch if available
      const win = window as any
      if (win.__REDUX_DEVTOOLS_EXTENSION__) {
        // Try to dispatch via devtools
        console.log('Attempting auth injection...')
      }

      // Set auth tokens in localStorage for Amplify
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${auth.clientId}.${email}.idToken`,
        auth.idToken,
      )
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${auth.clientId}.${email}.accessToken`,
        auth.accessToken,
      )
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${auth.clientId}.${email}.refreshToken`,
        auth.refreshToken,
      )
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${auth.clientId}.LastAuthUser`,
        email,
      )
    },
    {
      auth: { ...auth, clientId: COGNITO_CONFIG.clientId },
      email: TEST_USER.email,
    },
  )

  // Reload to pick up the auth state
  await page.reload()
  await page.waitForTimeout(2000)
}

// Extended test with authentication
type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    try {
      // Get real Cognito tokens
      const auth = await authenticateWithCognito()

      // Inject into browser
      await injectAuthState(page, auth)

      await use(page)
    } catch (error) {
      console.error('Auth setup failed:', error)
      // Fall through without auth - tests will fail with redirect
      await use(page)
    }
  },
})

export { expect } from '@playwright/test'
