/**
 * Cognito Authentication Infrastructure
 * 
 * Creates Cognito User Pool and Identity Pool for authentication:
 * - Email-based sign-in with auto-verification
 * - Password policy: 8+ chars, lowercase, uppercase, digits
 * - Custom attributes: avatar_url, preferences
 * - OAuth 2.0 authorization code flow
 * - JWT token validity: 1 hour (access/id), 30 days (refresh)
 */

export function createCognito(stage: string) {
  /**
   * Cognito User Pool
   * - Email-based sign-in with auto-verification
   * - Password policy: 8+ chars, lowercase, uppercase, digits
   * - Custom attributes: avatar_url, preferences
   * - Deletion protection enabled for production
   */
  const userPool = new aws.cognito.UserPool('LegoMocUserPool', {
    name: `lego-moc-users-${stage}`,

    // Sign-in configuration
    usernameAttributes: ['email'],
    autoVerifiedAttributes: ['email'],

    // Password policy
    passwordPolicy: {
      minimumLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
      temporaryPasswordValidityDays: 7,
    },

    // Email verification
    emailVerificationMessage: 'Your LEGO MOC verification code is {####}',
    emailVerificationSubject: 'LEGO MOC - Verify your email',

    // Custom attributes
    schemas: [
      {
        name: 'avatar_url',
        attributeDataType: 'String',
        mutable: true,
        required: false,
      },
      {
        name: 'preferences',
        attributeDataType: 'String',
        mutable: true,
        required: false,
      },
    ],

    // Account recovery
    accountRecoverySetting: {
      recoveryMechanisms: [
        {
          name: 'verified_email',
          priority: 1,
        },
      ],
    },

    // Deletion protection for production
    deletionProtection: stage === 'production' ? 'ACTIVE' : 'INACTIVE',

    tags: {
      Environment: stage,
      Project: 'lego-api-serverless',
      Service: 'Authentication',
    },
  })

  /**
   * Cognito User Pool Client
   * - OAuth 2.0 authorization code flow
   * - JWT token validity: 1 hour (access/id), 30 days (refresh)
   * - Callback URLs for local development and production
   */
  const userPoolClient = new aws.cognito.UserPoolClient('LegoMocWebClient', {
    userPoolId: userPool.id,
    name: `lego-moc-web-client-${stage}`,

    // OAuth configuration
    allowedOauthFlows: ['code'],
    allowedOauthScopes: ['openid', 'email', 'profile'],
    callbackUrls:
      stage === 'production'
        ? ['https://lego-moc-instructions.com/auth/callback']
        : ['http://localhost:3002/auth/callback', 'http://localhost:5173/auth/callback'],
    logoutUrls:
      stage === 'production'
        ? ['https://lego-moc-instructions.com/auth/logout']
        : ['http://localhost:3002/auth/logout', 'http://localhost:5173/auth/logout'],

    // Token validity
    accessTokenValidity: 60, // 1 hour
    idTokenValidity: 60, // 1 hour
    refreshTokenValidity: 43200, // 30 days (in minutes)

    // Security settings
    generateSecret: false, // SPA doesn't need client secret
    preventUserExistenceErrors: 'ENABLED',

    // Token configuration
    tokenValidityUnits: {
      accessToken: 'minutes',
      idToken: 'minutes',
      refreshToken: 'minutes',
    },

    explicitAuthFlows: ['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
  })

  return {
    userPool,
    userPoolClient,
  }
}
