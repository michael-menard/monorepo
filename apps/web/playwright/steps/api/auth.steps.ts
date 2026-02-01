/**
 * Cognito Auth Step Definitions
 *
 * Step definitions for testing Cognito authentication flows.
 * Tests sign-up, email verification, and token generation.
 */

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminInitiateAuthCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const { Given, When, Then, After } = createBdd()

// Cognito configuration
const COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_vtW1Slo3o',
  clientId: process.env.COGNITO_CLIENT_ID || '4527ui02h63b7c0ra7vs00gua5',
  region: process.env.AWS_REGION || 'us-east-1',
}

// Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

// Test state
interface AuthTestState {
  email: string | null
  password: string | null
  signUpResponse: unknown
  signUpError: Error | null
  authResponse: unknown
  authError: Error | null
  userConfirmed: boolean
  accessToken: string | null
  idToken: string | null
  refreshToken: string | null
  createdUsers: string[]
}

const authState: AuthTestState = {
  email: null,
  password: null,
  signUpResponse: null,
  signUpError: null,
  authResponse: null,
  authError: null,
  userConfirmed: false,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  createdUsers: [],
}

// Helper to generate unique email
function generateUniqueEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `test-${timestamp}-${random}@playwright-test.example.com`
}

// Helper to clean up test users
async function cleanupTestUser(email: string): Promise<void> {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: email,
      }),
    )
  } catch {
    // Ignore errors during cleanup
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('the Cognito user pool is configured', async () => {
  // Verify we can reach Cognito by checking config exists
  expect(COGNITO_CONFIG.userPoolId).toBeTruthy()
  expect(COGNITO_CONFIG.clientId).toBeTruthy()

  // Reset state for each scenario
  authState.email = null
  authState.password = null
  authState.signUpResponse = null
  authState.signUpError = null
  authState.authResponse = null
  authState.authError = null
  authState.userConfirmed = false
  authState.accessToken = null
  authState.idToken = null
  authState.refreshToken = null
})

// ─────────────────────────────────────────────────────────────────────────────
// Given Steps
// ─────────────────────────────────────────────────────────────────────────────

Given('I have a unique email address', async () => {
  authState.email = generateUniqueEmail()
  authState.password = 'TestPassword123!'
})

Given('a user already exists with email {string}', async ({}, email: string) => {
  try {
    await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: email,
        Password: 'ExistingUser123!',
        UserAttributes: [{ Name: 'email', Value: email }],
      }),
    )
    authState.createdUsers.push(email)
  } catch (error) {
    if ((error as Error).name !== 'UsernameExistsException') {
      throw error
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// When Steps - Sign Up
// ─────────────────────────────────────────────────────────────────────────────

When('I sign up with a valid password', async () => {
  expect(authState.email).toBeTruthy()

  try {
    authState.signUpResponse = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: authState.email!,
        Password: authState.password!,
        UserAttributes: [{ Name: 'email', Value: authState.email! }],
      }),
    )
    authState.createdUsers.push(authState.email!)
    authState.signUpError = null
  } catch (error) {
    authState.signUpError = error as Error
    authState.signUpResponse = null
  }
})

When('I try to sign up with password {string}', async ({}, password: string) => {
  expect(authState.email).toBeTruthy()

  try {
    authState.signUpResponse = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: authState.email!,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: authState.email! }],
      }),
    )
    authState.createdUsers.push(authState.email!)
    authState.signUpError = null
  } catch (error) {
    authState.signUpError = error as Error
    authState.signUpResponse = null
  }
})

When('I try to sign up with email {string}', async ({}, email: string) => {
  try {
    authState.signUpResponse = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: email,
        Password: 'ValidPassword123!',
        UserAttributes: [{ Name: 'email', Value: email }],
      }),
    )
    authState.signUpError = null
  } catch (error) {
    authState.signUpError = error as Error
    authState.signUpResponse = null
  }
})

When(
  'I try to sign up with email {string} and password {string}',
  async ({}, email: string, password: string) => {
    try {
      authState.signUpResponse = await cognitoClient.send(
        new SignUpCommand({
          ClientId: COGNITO_CONFIG.clientId,
          Username: email,
          Password: password,
          UserAttributes: [{ Name: 'email', Value: email }],
        }),
      )
      authState.createdUsers.push(email)
      authState.signUpError = null
    } catch (error) {
      authState.signUpError = error as Error
      authState.signUpResponse = null
    }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// When Steps - Email Verification
// ─────────────────────────────────────────────────────────────────────────────

When('the admin confirms my email', async () => {
  expect(authState.email).toBeTruthy()

  await cognitoClient.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      Username: authState.email!,
    }),
  )
  authState.userConfirmed = true
})

// ─────────────────────────────────────────────────────────────────────────────
// When Steps - Sign In
// ─────────────────────────────────────────────────────────────────────────────

When(
  'I sign in as {string} with password {string}',
  async ({}, email: string, password: string) => {
    authState.email = email
    authState.password = password

    try {
      const response = await cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          ClientId: COGNITO_CONFIG.clientId,
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      )

      authState.authResponse = response
      authState.accessToken = response.AuthenticationResult?.AccessToken || null
      authState.idToken = response.AuthenticationResult?.IdToken || null
      authState.refreshToken = response.AuthenticationResult?.RefreshToken || null
      authState.authError = null
    } catch (error) {
      authState.authError = error as Error
      authState.authResponse = null
    }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// Then Steps - Sign In (also used as When)
// ─────────────────────────────────────────────────────────────────────────────

Then('I should be able to sign in', async () => {
  expect(authState.email).toBeTruthy()
  expect(authState.password).toBeTruthy()

  try {
    const response = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        ClientId: COGNITO_CONFIG.clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: authState.email!,
          PASSWORD: authState.password!,
        },
      }),
    )

    authState.authResponse = response
    authState.accessToken = response.AuthenticationResult?.AccessToken || null
    authState.idToken = response.AuthenticationResult?.IdToken || null
    authState.refreshToken = response.AuthenticationResult?.RefreshToken || null
    authState.authError = null
  } catch (error) {
    authState.authError = error as Error
    authState.authResponse = null
    throw error // Fail the test if sign-in fails
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Then Steps - Sign Up Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the sign up should succeed', async () => {
  expect(authState.signUpError).toBeNull()
  expect(authState.signUpResponse).toBeTruthy()
})

Then('a verification code should be sent to my email', async () => {
  const response = authState.signUpResponse as { CodeDeliveryDetails?: { DeliveryMedium?: string } }
  expect(response?.CodeDeliveryDetails?.DeliveryMedium).toBe('EMAIL')
})

Then('the user should not be confirmed yet', async () => {
  const response = authState.signUpResponse as { UserConfirmed?: boolean }
  expect(response?.UserConfirmed).toBe(false)
})

Then('the user should be confirmed', async () => {
  expect(authState.email).toBeTruthy()

  const response = await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      Username: authState.email!,
    }),
  )

  expect(response.UserStatus).toBe('CONFIRMED')
})

Then('the sign up should fail with {string}', async ({}, expectedError: string) => {
  expect(authState.signUpError).toBeTruthy()
  expect(authState.signUpError?.name).toBe(expectedError)
})

// ─────────────────────────────────────────────────────────────────────────────
// Then Steps - Token Assertions
// ─────────────────────────────────────────────────────────────────────────────

Then('the sign in should succeed', async () => {
  expect(authState.authError).toBeNull()
  expect(authState.authResponse).toBeTruthy()
  expect(authState.accessToken).toBeTruthy()
})

Then('the sign in should fail with {string}', async ({}, expectedError: string) => {
  expect(authState.authError).toBeTruthy()
  expect(authState.authError?.name).toBe(expectedError)
})

Then('I should receive valid tokens', async () => {
  expect(authState.authError).toBeNull()
  expect(authState.accessToken).toBeTruthy()
  expect(authState.idToken).toBeTruthy()
  expect(authState.refreshToken).toBeTruthy()

  // Verify tokens are JWTs (have 3 parts separated by dots)
  expect(authState.accessToken!.split('.').length).toBe(3)
  expect(authState.idToken!.split('.').length).toBe(3)
})

Then('the access token should contain my user ID', async () => {
  expect(authState.accessToken).toBeTruthy()

  // Decode the JWT payload (middle part)
  const payload = JSON.parse(Buffer.from(authState.accessToken!.split('.')[1], 'base64').toString())

  // Verify it contains a sub (user ID)
  expect(payload.sub).toBeTruthy()
  expect(payload.sub).toMatch(/^[a-f0-9-]+$/) // UUID format
})

Then('I can use the token to call the wishlist API', async ({ request }) => {
  expect(authState.accessToken).toBeTruthy()

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

  const response = await request.get(`${baseUrl}/wishlist`, {
    headers: {
      Authorization: `Bearer ${authState.accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  // Should get 200 OK (or at least not 401 Unauthorized)
  expect(response.status()).not.toBe(401)
})

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup - Run after each scenario
// ─────────────────────────────────────────────────────────────────────────────

After(async () => {
  // Clean up all users created during this scenario
  for (const email of authState.createdUsers) {
    await cleanupTestUser(email)
  }
  // Clear the list
  authState.createdUsers = []
})

// Export for potential reuse
export { authState, COGNITO_CONFIG, cognitoClient, cleanupTestUser }
