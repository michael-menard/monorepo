# @monorepo/cognito-client

AWS Cognito client utilities for user profile operations. Provides a simple interface to interact with AWS Cognito User Pools for retrieving and updating user profile information.

## Features

- Get user profile from Cognito User Pool
- Update user attributes in Cognito User Pool
- Extract specific attributes from user profiles
- Optional logger support for debugging and monitoring
- Singleton client pattern for efficient connection management
- TypeScript support with full type definitions

## Installation

```bash
npm install @monorepo/cognito-client
```

## Environment Variables

The package uses the following environment variables with fallback options:

- `AWS_REGION` - AWS region (defaults to 'us-east-1')
- `COGNITO_USER_POOL_ID` - Cognito User Pool ID (required)

## Usage

### Basic Usage

```typescript
import {
  getCognitoUser,
  updateCognitoUserAttributes,
  getCognitoAttribute,
} from '@monorepo/cognito-client'

// Get a user's profile
const user = await getCognitoUser('user-sub-id')
if (user) {
  console.log('Username:', user.Username)
  console.log('User attributes:', user.UserAttributes)
}

// Extract specific attribute
const email = getCognitoAttribute(user?.UserAttributes, 'email')
console.log('Email:', email)

// Update user attributes
const success = await updateCognitoUserAttributes('user-sub-id', [
  { Name: 'custom:profile_picture', Value: 'https://example.com/avatar.jpg' },
  { Name: 'custom:bio', Value: 'Updated bio text' },
])

if (success) {
  console.log('User attributes updated successfully')
}
```

### With Custom Configuration

```typescript
import { getCognitoUser, type CognitoClientConfig } from '@monorepo/cognito-client'

// Custom logger implementation
const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => console.info(msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(msg, meta),
}

const config: CognitoClientConfig = {
  region: 'us-west-2',
  userPoolId: 'us-west-2_XXXXXXXXX',
  logger,
}

// Use config with individual calls
const user = await getCognitoUser('user-sub-id', config)
```

### Using with Custom Logger (e.g., Winston, Pino)

```typescript
import { getCognitoUser } from '@monorepo/cognito-client'
import winston from 'winston'

// Winston logger example
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
})

// Adapt Winston logger to CognitoClientLogger interface
const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => winstonLogger.debug(msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => winstonLogger.info(msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => winstonLogger.warn(msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => winstonLogger.error(msg, meta),
}

const user = await getCognitoUser('user-sub-id', { logger })
```

### Lambda Function Example

```typescript
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { getCognitoUser, getCognitoAttribute } from '@monorepo/cognito-client'

export const handler: APIGatewayProxyHandler = async (event) => {
  // Extract user ID from JWT claims
  const userId = event.requestContext.authorizer?.claims?.sub

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  // Fetch user profile
  const user = await getCognitoUser(userId)

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'User not found' }),
    }
  }

  // Extract user information
  const profile = {
    username: user.Username,
    email: getCognitoAttribute(user.UserAttributes, 'email'),
    name: getCognitoAttribute(user.UserAttributes, 'name'),
    profilePicture: getCognitoAttribute(user.UserAttributes, 'custom:profile_picture'),
  }

  return {
    statusCode: 200,
    body: JSON.stringify(profile),
  }
}
```

## API Reference

### `getCognitoClient(config?)`

Get or create a singleton Cognito client instance.

**Parameters:**
- `config` (optional): `CognitoClientConfig` - Configuration options

**Returns:** `CognitoIdentityProviderClient`

### `getCognitoUser(userId, config?)`

Retrieve user profile from Cognito User Pool.

**Parameters:**
- `userId`: `string` - Cognito user ID (sub claim from JWT)
- `config` (optional): `CognitoClientConfig` - Configuration options

**Returns:** `Promise<AdminGetUserCommandOutput | null>`

### `updateCognitoUserAttributes(userId, attributes, config?)`

Update user attributes in Cognito User Pool.

**Parameters:**
- `userId`: `string` - Cognito user ID
- `attributes`: `AttributeType[]` - Array of attributes to update
- `config` (optional): `CognitoClientConfig` - Configuration options

**Returns:** `Promise<boolean>` - True if successful, false otherwise

### `getCognitoAttribute(attributes, name)`

Helper function to extract a specific attribute value from Cognito user attributes.

**Parameters:**
- `attributes`: `AttributeType[] | undefined` - Array of Cognito attributes
- `name`: `string` - Attribute name to extract

**Returns:** `string | null` - Attribute value or null if not found

## TypeScript Types

```typescript
interface CognitoClientLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

interface CognitoClientConfig {
  region?: string
  userPoolId?: string
  logger?: CognitoClientLogger
}
```

## Error Handling

The package follows a "fail gracefully" approach:

- `getCognitoUser` returns `null` if the user is not found or an error occurs
- `updateCognitoUserAttributes` returns `false` if the update fails
- Errors are logged using the provided logger (or no-op logger if not provided)

Always check return values and handle null/false cases appropriately.

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch mode for development
npm run dev

# Type check
npm run type-check

# Clean build artifacts
npm run clean
```

## License

MIT
