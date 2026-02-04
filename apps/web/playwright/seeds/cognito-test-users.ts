/**
 * Cognito Test Users Seed
 *
 * Creates South Park character test users in Cognito.
 * All users share the same password for easy testing.
 *
 * Usage:
 *   pnpm --filter playwright seed:users
 *   pnpm --filter playwright seed:users:delete
 */

import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: '.env' })

import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'

// Cognito configuration - loaded from environment
function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check apps/web/playwright/.env`)
  }
  return value
}

const COGNITO_CONFIG = {
  userPoolId: getRequiredEnv('VITE_AWS_USER_POOL_ID'),
  clientId: getRequiredEnv('VITE_AWS_USER_POOL_WEB_CLIENT_ID'),
  region: process.env.VITE_AWS_REGION || 'us-east-1',
}

// Shared password for all test users
const TEST_PASSWORD = '0Xcoffee?'

// South Park character test users
const TEST_USERS = [
  { username: 'stan.marsh', email: 'stan.marsh@southpark.test', name: 'Stan Marsh' },
  { username: 'kyle.broflovski', email: 'kyle.broflovski@southpark.test', name: 'Kyle Broflovski' },
  { username: 'eric.cartman', email: 'eric.cartman@southpark.test', name: 'Eric Cartman' },
  { username: 'kenny.mccormick', email: 'kenny.mccormick@southpark.test', name: 'Kenny McCormick' },
  { username: 'butters.stotch', email: 'butters.stotch@southpark.test', name: 'Butters Stotch' },
  { username: 'randy.marsh', email: 'randy.marsh@southpark.test', name: 'Randy Marsh' },
  { username: 'wendy.testaburger', email: 'wendy.testaburger@southpark.test', name: 'Wendy Testaburger' },
  { username: 'jimmy.valmer', email: 'jimmy.valmer@southpark.test', name: 'Jimmy Valmer' },
  { username: 'timmy.burch', email: 'timmy.burch@southpark.test', name: 'Timmy Burch' },
  { username: 'token.black', email: 'token.black@southpark.test', name: 'Token Black' },
  { username: 'craig.tucker', email: 'craig.tucker@southpark.test', name: 'Craig Tucker' },
  { username: 'tweek.tweak', email: 'tweek.tweak@southpark.test', name: 'Tweek Tweak' },
  { username: 'clyde.donovan', email: 'clyde.donovan@southpark.test', name: 'Clyde Donovan' },
  { username: 'bebe.stevens', email: 'bebe.stevens@southpark.test', name: 'Bebe Stevens' },
  { username: 'mr.garrison', email: 'mr.garrison@southpark.test', name: 'Mr. Garrison' },
]

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

async function createUser(user: (typeof TEST_USERS)[0]): Promise<boolean> {
  try {
    // Sign up the user
    await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: user.email,
        Password: TEST_PASSWORD,
        UserAttributes: [
          { Name: 'email', Value: user.email },
          { Name: 'name', Value: user.name },
          { Name: 'preferred_username', Value: user.username },
        ],
      }),
    )

    // Confirm the user (skip email verification)
    await cognitoClient.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: user.email,
      }),
    )

    console.log(`  Created: ${user.name} (${user.email})`)
    return true
  } catch (error) {
    const err = error as Error
    if (err.name === 'UsernameExistsException') {
      console.log(`  Exists:  ${user.name} (${user.email})`)
      return true
    }
    console.error(`  Failed:  ${user.name} - ${err.message}`)
    return false
  }
}

async function deleteUser(user: (typeof TEST_USERS)[0]): Promise<boolean> {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: user.email,
      }),
    )
    console.log(`  Deleted: ${user.name} (${user.email})`)
    return true
  } catch (error) {
    const err = error as Error
    if (err.name === 'UserNotFoundException') {
      console.log(`  Not found: ${user.name} (${user.email})`)
      return true
    }
    console.error(`  Failed:  ${user.name} - ${err.message}`)
    return false
  }
}

async function listTestUsers(): Promise<void> {
  try {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Filter: 'email ^= "southpark.test"',
        Limit: 60,
      }),
    )

    console.log('\nExisting South Park test users:')
    if (response.Users && response.Users.length > 0) {
      for (const user of response.Users) {
        const email = user.Attributes?.find(a => a.Name === 'email')?.Value
        const name = user.Attributes?.find(a => a.Name === 'name')?.Value
        console.log(`  - ${name || 'Unknown'} (${email || user.Username})`)
      }
    } else {
      console.log('  (none)')
    }
  } catch (error) {
    console.error('Failed to list users:', (error as Error).message)
  }
}

async function seedUsers(): Promise<void> {
  console.log('Seeding Cognito test users...')
  console.log(`User Pool: ${COGNITO_CONFIG.userPoolId}`)
  console.log(`Password:  ${TEST_PASSWORD}\n`)

  let created = 0
  let failed = 0

  for (const user of TEST_USERS) {
    const success = await createUser(user)
    if (success) created++
    else failed++
  }

  console.log(`\nDone: ${created} users ready, ${failed} failed`)
}

async function deleteAllUsers(): Promise<void> {
  console.log('Deleting Cognito test users...')
  console.log(`User Pool: ${COGNITO_CONFIG.userPoolId}\n`)

  let deleted = 0
  let failed = 0

  for (const user of TEST_USERS) {
    const success = await deleteUser(user)
    if (success) deleted++
    else failed++
  }

  console.log(`\nDone: ${deleted} deleted, ${failed} failed`)
}

// CLI handling
const command = process.argv[2]

if (command === 'delete') {
  deleteAllUsers()
} else if (command === 'list') {
  listTestUsers()
} else {
  seedUsers()
}

export { TEST_USERS, TEST_PASSWORD, COGNITO_CONFIG }
