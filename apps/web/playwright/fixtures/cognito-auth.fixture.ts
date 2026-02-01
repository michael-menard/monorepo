/**
 * Cognito Authentication Fixture
 *
 * Provides real Cognito JWT tokens for authenticated API tests.
 * Each test gets a fresh token by authenticating against Cognito.
 *
 * Usage in step definitions:
 * ```typescript
 * import { test } from '../fixtures/cognito-auth.fixture'
 * const { Given, When, Then } = createBdd(test)
 *
 * Given('I am authenticated', async ({ cognitoAuth }) => {
 *   // cognitoAuth.accessToken is available
 * })
 * ```
 */

import { test as base } from '@playwright/test'
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CognitoUser = {
  email: string
  password: string
  name: string
}

export type CognitoAuthResult = {
  accessToken: string
  idToken: string
  refreshToken: string
  userId: string
  email: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_vtW1Slo3o',
  clientId: process.env.COGNITO_CLIENT_ID || '4527ui02h63b7c0ra7vs00gua5',
  region: process.env.AWS_REGION || 'us-east-1',
}

// ─────────────────────────────────────────────────────────────────────────────
// South Park Test Users (matches seeds/cognito-test-users.ts)
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PASSWORD = '0Xcoffee?'

export const COGNITO_TEST_USERS = {
  /** Stan Marsh - primary test user */
  primary: {
    email: 'stan.marsh@southpark.test',
    password: TEST_PASSWORD,
    name: 'Stan Marsh',
  },
  /** Kyle Broflovski - secondary test user */
  secondary: {
    email: 'kyle.broflovski@southpark.test',
    password: TEST_PASSWORD,
    name: 'Kyle Broflovski',
  },
  /** Eric Cartman - for conflict/edge case tests */
  cartman: {
    email: 'eric.cartman@southpark.test',
    password: TEST_PASSWORD,
    name: 'Eric Cartman',
  },
  /** Kenny McCormick - for additional user tests */
  kenny: {
    email: 'kenny.mccormick@southpark.test',
    password: TEST_PASSWORD,
    name: 'Kenny McCormick',
  },
  /** Butters Stotch - for additional user tests */
  butters: {
    email: 'butters.stotch@southpark.test',
    password: TEST_PASSWORD,
    name: 'Butters Stotch',
  },
  /** Randy Marsh - for admin tests if needed */
  admin: {
    email: 'randy.marsh@southpark.test',
    password: TEST_PASSWORD,
    name: 'Randy Marsh',
  },
} as const satisfies Record<string, CognitoUser>

// ─────────────────────────────────────────────────────────────────────────────
// Cognito Client
// ─────────────────────────────────────────────────────────────────────────────

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

/**
 * Authenticate a user with Cognito and return tokens
 */
async function authenticateUser(user: CognitoUser): Promise<CognitoAuthResult> {
  const response = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: user.email,
        PASSWORD: user.password,
      },
    }),
  )

  if (!response.AuthenticationResult) {
    throw new Error(`Authentication failed for ${user.email}`)
  }

  const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult

  if (!AccessToken || !IdToken) {
    throw new Error(`Missing tokens for ${user.email}`)
  }

  // Extract userId (sub) from the access token
  const payload = JSON.parse(
    Buffer.from(AccessToken.split('.')[1], 'base64').toString(),
  )

  return {
    accessToken: AccessToken,
    idToken: IdToken,
    refreshToken: RefreshToken || '',
    userId: payload.sub,
    email: user.email,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth State (shared across steps within a test)
// ─────────────────────────────────────────────────────────────────────────────

export type AuthState = {
  currentAuth: CognitoAuthResult | null
  authenticateAs: (user: CognitoUser) => Promise<CognitoAuthResult>
  clear: () => void
}

function createAuthState(): AuthState {
  return {
    currentAuth: null,

    async authenticateAs(user: CognitoUser): Promise<CognitoAuthResult> {
      this.currentAuth = await authenticateUser(user)
      return this.currentAuth
    },

    clear(): void {
      this.currentAuth = null
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Playwright Fixture
// ─────────────────────────────────────────────────────────────────────────────

type CognitoFixtures = {
  /** Authentication state for the current test */
  cognitoAuth: AuthState
  /** Pre-authenticated as primary user (Stan Marsh) */
  authenticatedUser: CognitoAuthResult
}

/**
 * Extended test with Cognito authentication fixtures
 */
export const test = base.extend<CognitoFixtures>({
  /**
   * Auth state that can be used to authenticate as any user
   */
  cognitoAuth: async ({}, use) => {
    const authState = createAuthState()
    await use(authState)
    authState.clear()
  },

  /**
   * Pre-authenticated as the primary test user (Stan Marsh)
   * Use this fixture when you just need a logged-in user
   */
  authenticatedUser: async ({ cognitoAuth }, use) => {
    const auth = await cognitoAuth.authenticateAs(COGNITO_TEST_USERS.primary)
    await use(auth)
  },
})

export { expect } from '@playwright/test'
