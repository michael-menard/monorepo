import { Amplify } from 'aws-amplify'

// Cognito configuration from our deployed stack
const amplifyConfig = {
  Auth: {
    Cognito: {
      // User Pool configuration
      userPoolId: 'us-east-1_b0UJziNnZ',
      userPoolClientId: '21qsttnb5r7io49eslnq2pur9j',

      // Identity Pool configuration (for AWS resource access)
      identityPoolId: 'us-east-1:4dffa274-13c4-4be5-9478-9231e658a1fa',

      // AWS Region
      region: 'us-east-1',

      // Sign up configuration
      signUpVerificationMethod: 'code' as const,

      // Login configuration
      loginWith: {
        email: true,
        username: false,
        phone: false,
      },

      // User attributes
      userAttributes: {
        email: {
          required: true,
        },
        given_name: {
          required: true,
        },
        family_name: {
          required: false,
        },
      },

      // Password policy (matches our Cognito configuration)
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },

      // OAuth configuration (for future Google login)
      oauth: {
        domain: 'us-east-1_b0UJziNnZ.auth.us-east-1.amazoncognito.com',
        scope: ['email', 'openid', 'profile'],
        redirectSignIn: [
          'http://localhost:3002/auth/callback',
          'https://lego-moc-instructions.com/auth/callback',
        ],
        redirectSignOut: [
          'http://localhost:3002/auth/logout',
          'https://lego-moc-instructions.com/auth/logout',
        ],
        responseType: 'code' as const,
      },
    },
  },

  // Storage configuration (for future file uploads)
  Storage: {
    S3: {
      region: 'us-east-1',
      bucket: 'lego-moc-files-dev', // We'll create this later
    },
  },
}

// Configure Amplify
Amplify.configure(amplifyConfig)

export { amplifyConfig }
export default amplifyConfig
