import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminUserGlobalSignOutCommand,
  type UserType,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider'
import { ok, err, type Result } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { CognitoUserPort } from '../ports/index.js'
import type { CognitoUser, UserListResponse, CognitoUserStatus } from '../types.js'

/**
 * Create Cognito User Client
 *
 * AWS SDK v3 client for Cognito user management operations.
 * Requires IAM permissions:
 * - cognito-idp:ListUsers
 * - cognito-idp:AdminGetUser
 * - cognito-idp:AdminUserGlobalSignOut
 */
export function createCognitoUserClient(): CognitoUserPort {
  const userPoolId = process.env.COGNITO_USER_POOL_ID

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required')
  }

  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  /**
   * Map Cognito UserType to our CognitoUser schema
   */
  function mapCognitoUser(user: UserType): CognitoUser {
    const attributes = user.Attributes || []
    const getAttribute = (name: string): string | null =>
      attributes.find((attr: AttributeType) => attr.Name === name)?.Value ?? null

    // Get sub (user ID) from attributes
    const sub = getAttribute('sub')

    return {
      userId: sub || user.Username || '',
      email: getAttribute('email'),
      username: user.Username || '',
      userStatus: mapUserStatus(user.UserStatus),
      enabled: user.Enabled ?? true,
      createdAt: user.UserCreateDate ?? null,
    }
  }

  /**
   * Map Cognito user status string to our enum
   */
  function mapUserStatus(status?: string): CognitoUserStatus | null {
    if (!status) return null

    const statusMap: Record<string, CognitoUserStatus> = {
      UNCONFIRMED: 'UNCONFIRMED',
      CONFIRMED: 'CONFIRMED',
      ARCHIVED: 'ARCHIVED',
      COMPROMISED: 'COMPROMISED',
      UNKNOWN: 'UNKNOWN',
      RESET_REQUIRED: 'RESET_REQUIRED',
      FORCE_CHANGE_PASSWORD: 'FORCE_CHANGE_PASSWORD',
    }

    return statusMap[status] ?? 'UNKNOWN'
  }

  return {
    async listUsers(
      limit: number,
      paginationToken?: string,
    ): Promise<Result<UserListResponse, 'COGNITO_ERROR'>> {
      try {
        const command = new ListUsersCommand({
          UserPoolId: userPoolId,
          Limit: Math.min(limit, 60), // Cognito max is 60
          PaginationToken: paginationToken,
        })

        const response = await client.send(command)

        return ok({
          users: (response.Users || []).map(mapCognitoUser),
          paginationToken: response.PaginationToken ?? null,
        })
      } catch (error) {
        logger.error('Failed to list Cognito users', { error })
        return err('COGNITO_ERROR')
      }
    },

    async searchUsersByEmail(
      emailPrefix: string,
      limit: number,
    ): Promise<Result<UserListResponse, 'COGNITO_ERROR'>> {
      try {
        // Cognito filter syntax: email ^= "prefix"
        const command = new ListUsersCommand({
          UserPoolId: userPoolId,
          Limit: Math.min(limit, 60),
          Filter: `email ^= "${emailPrefix}"`,
        })

        const response = await client.send(command)

        return ok({
          users: (response.Users || []).map(mapCognitoUser),
          paginationToken: response.PaginationToken ?? null,
        })
      } catch (error) {
        logger.error('Failed to search Cognito users', { error, emailPrefix })
        return err('COGNITO_ERROR')
      }
    },

    async getUser(userId: string): Promise<Result<CognitoUser, 'NOT_FOUND' | 'COGNITO_ERROR'>> {
      try {
        // First, find the user by sub (userId) using ListUsers with filter
        const listCommand = new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `sub = "${userId}"`,
          Limit: 1,
        })

        const listResponse = await client.send(listCommand)

        if (!listResponse.Users || listResponse.Users.length === 0) {
          return err('NOT_FOUND')
        }

        const username = listResponse.Users[0].Username
        if (!username) {
          return err('NOT_FOUND')
        }

        // Now get the full user details using AdminGetUser
        const getCommand = new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: username,
        })

        const response = await client.send(getCommand)

        const attributes = response.UserAttributes || []
        const getAttribute = (name: string): string | null =>
          attributes.find((attr: AttributeType) => attr.Name === name)?.Value ?? null

        const user: CognitoUser = {
          userId: getAttribute('sub') || userId,
          email: getAttribute('email'),
          username: response.Username || '',
          userStatus: mapUserStatus(response.UserStatus),
          enabled: response.Enabled ?? true,
          createdAt: response.UserCreateDate ?? null,
        }

        return ok(user)
      } catch (error: unknown) {
        const errorName = (error as { name?: string })?.name
        if (errorName === 'UserNotFoundException') {
          return err('NOT_FOUND')
        }
        logger.error('Failed to get Cognito user', { error, userId })
        return err('COGNITO_ERROR')
      }
    },

    async globalSignOut(userId: string): Promise<Result<void, 'NOT_FOUND' | 'COGNITO_ERROR'>> {
      try {
        // First, find the username from the userId (sub)
        const listCommand = new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `sub = "${userId}"`,
          Limit: 1,
        })

        const listResponse = await client.send(listCommand)

        if (!listResponse.Users || listResponse.Users.length === 0) {
          return err('NOT_FOUND')
        }

        const username = listResponse.Users[0].Username
        if (!username) {
          return err('NOT_FOUND')
        }

        // Now perform the global sign out
        const signOutCommand = new AdminUserGlobalSignOutCommand({
          UserPoolId: userPoolId,
          Username: username,
        })

        await client.send(signOutCommand)

        logger.info('User globally signed out', { userId, username })
        return ok(undefined)
      } catch (error: unknown) {
        const errorName = (error as { name?: string })?.name
        if (errorName === 'UserNotFoundException') {
          return err('NOT_FOUND')
        }
        logger.error('Failed to global sign out user', { error, userId })
        return err('COGNITO_ERROR')
      }
    },
  }
}
