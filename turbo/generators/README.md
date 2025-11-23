# Turbo Generators

Code generators for the LEGO API monorepo with built-in AWS tagging schema compliance.

## Overview

These generators create scaffolding for common development tasks with standardized structure, best practices, and **automatic AWS tagging compliance** per [aws-tagging-schema.md](/docs/aws-tagging-schema.md).

## Available Generators

### 1. Lambda Generator

Generate AWS Lambda functions with JWT authentication, schema validation, and complete AWS tagging.

```bash
pnpm turbo gen lambda
```

**Features:**
- ✅ Modular or standalone structure
- ✅ JWT authentication (basic, enhanced, or ownership-based)
- ✅ Zod schema validation
- ✅ Error handling with lambda-wrapper
- ✅ CloudWatch metrics and X-Ray tracing
- ✅ **AWS tagging schema compliance** (5 required tags + functional tags)
- ✅ SST configuration example with tags
- ✅ Unit test scaffolding

**Prompts:**
- Lambda structure (modular/standalone)
- Domain/category (for modular)
- Handler name
- Description
- **Project name** (AWS tag)
- **Owner email** (AWS tag)
- **Cost center** (AWS tag)
- Database access needed
- Authentication type
- Cognito configuration (if enhanced auth)
- Test files
- Schema files
- SST integration
- API Gateway configuration

**Generated Files (Modular):**
```
apps/api/lego-api-serverless/{domain}/{name}/
├── index.ts                    # Lambda handler
├── package.json                # Package configuration
├── README.md                   # Usage documentation
└── sst-config-example.ts       # SST config with AWS tags
```

**Generated Files (Standalone):**
```
apps/api/lambda-{name}/
├── index.ts                    # Lambda handler
├── package.json                # Package configuration
├── tsconfig.json               # TypeScript config
├── README.md                   # Usage documentation
├── .env.example                # Environment variables
├── schemas/
│   ├── request.ts              # Request validation
│   └── response.ts             # Response validation
├── utils/
│   └── response.ts             # Response helpers
├── __tests__/
│   └── index.test.ts           # Unit tests
├── vitest.config.ts            # Test configuration
└── sst-config-example.ts       # SST config with AWS tags
```

**AWS Tags Applied:**

Generated Lambda functions include all required tags:

```typescript
// sst-config-example.ts
const lambdaTags = createLambdaTags({
  project: 'lego-api',              // Required: Project name
  environment: $app.stage,          // Required: Environment
  owner: 'engineering@example.com', // Required: Owner email
  costCenter: 'Engineering',        // Required: Cost center
  endpoint: 'MyFunction',           // Functional: Endpoint name
  runtime: 'nodejs20.x',            // Functional: Runtime
})

// Includes additional tags:
// - ManagedBy: 'SST'
// - Component: 'API'
// - Function: 'Compute'
// - ServiceType: 'Lambda'
// - MonitoringLevel: 'Enhanced'
// - LogRetention: '90'
```

### 2. API Generator

Generate Express API services with database integration and AWS tagging.

```bash
pnpm turbo gen api
```

**Features:**
- ✅ Express server setup
- ✅ PostgreSQL or MongoDB support
- ✅ Authentication middleware
- ✅ Zod schema validation
- ✅ Docker configuration
- ✅ Swagger/OpenAPI documentation
- ✅ **AWS tagging prompts** for future SST migration

**Prompts:**
- API service name
- Package name
- Port number
- **Project name** (AWS tag)
- **Owner email** (AWS tag)
- **Cost center** (AWS tag)
- Database type
- Authentication middleware
- Docker configuration

**Generated Files:**
```
apps/api/{name}/
├── src/
│   ├── index.ts                # Entry point
│   ├── server.ts               # Express server
│   ├── env.ts                  # Environment validation
│   ├── logger.ts               # Logging configuration
│   ├── routes/
│   │   └── health.ts           # Health check endpoint
│   ├── middleware/
│   │   ├── validate.ts         # Schema validation
│   │   └── auth.ts             # Authentication (optional)
│   ├── schemas/
│   │   └── shared.ts           # Shared schemas
│   ├── docs/
│   │   └── swagger.ts          # API documentation
│   └── db/
│       ├── client.ts           # Database client
│       └── schema.ts           # Database schema
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── README.md
├── .env.example
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Orchestration
├── docker-compose.db.yml       # Database services
└── drizzle.config.ts           # Database migrations
```

### 3. Component Generator

Generate React components with Storybook stories and tests.

```bash
pnpm turbo gen component
```

**Features:**
- ✅ TypeScript React component
- ✅ Storybook story (optional)
- ✅ Vitest test file (optional)
- ✅ Consistent file structure

**Prompts:**
- Component name
- Package location
- Include Storybook story
- Include test file

### 4. Package Generator

Generate new packages for the monorepo.

```bash
pnpm turbo gen package
```

**Features:**
- ✅ React library
- ✅ Node.js library
- ✅ Shared utilities
- ✅ Feature package
- ✅ Storybook setup (optional)

**Prompts:**
- Package name
- Package type
- Description
- Include Storybook

### 5. PRD Generator

Generate Product Requirements Documents.

```bash
pnpm turbo gen prd
```

**Features:**
- ✅ Standardized PRD template
- ✅ Task configuration file
- ✅ Metadata (area, type, risk, owner)

**Prompts:**
- PRD name
- Package/app path
- Area (web, api, ui, infra, docs)
- Type (feature, improvement, bugfix, refactor, docs)
- Risk level (low, medium, high)
- Owner

## AWS Tagging Schema Integration

### Required Tags (Applied Automatically)

All Lambda and API generators now prompt for AWS tagging information and generate code with proper tags:

| Tag Key | Prompt | Default | Purpose |
|---------|--------|---------|---------|
| `Project` | Project name | `lego-api` | Group resources by project |
| `Environment` | (Auto: `$app.stage`) | `dev`/`staging`/`prod` | Deployment environment |
| `ManagedBy` | (Auto-set) | `SST` | Infrastructure tool |
| `CostCenter` | Cost center | `Engineering` | Budget allocation |
| `Owner` | Owner email | `engineering@bricklink.com` | Point of contact |

### Functional Tags (Lambda-Specific)

Generated Lambda functions include functional tags:

```typescript
{
  Component: 'API',              // Architectural component
  Function: 'Compute',           // Functional role
  ServiceType: 'Lambda',         // AWS service type
  Runtime: 'nodejs20.x',         // Lambda runtime
  Endpoint: 'YourFunction',      // Endpoint name
  MonitoringLevel: 'Enhanced',   // CloudWatch monitoring
  LogRetention: '90',            // Log retention (days)
}
```

### Using Tags in SST

The generator creates `sst-config-example.ts` showing proper tag usage:

```typescript
import { createLambdaTags } from './sst-tags'

const lambdaTags = createLambdaTags({
  project: 'lego-api',
  environment: $app.stage,
  owner: 'engineering@bricklink.com',
  costCenter: 'Engineering',
  endpoint: 'MyFunction',
})

const myFunction = new sst.aws.Function('MyFunction', {
  handler: 'src/handler.main',
  tags: lambdaTags,
})
```

### Tag Helper Utilities

The generator also creates `sst-tags.ts` with reusable tag utilities:

```typescript
// Create base tags for any resource
const baseTags = createBaseTags({
  project: 'lego-api',
  environment: 'prod',
  owner: 'team@example.com',
})

// Lambda-specific tags
const lambdaTags = createLambdaTags({
  project: 'lego-api',
  environment: 'prod',
  owner: 'team@example.com',
  endpoint: 'GetUser',
})

// S3 bucket tags
const s3Tags = createS3Tags({
  project: 'lego-api',
  environment: 'prod',
  owner: 'team@example.com',
  dataType: 'userData',
  retentionPeriod: '90days',
})

// Database tags
const dbTags = createDatabaseTags({
  project: 'lego-api',
  environment: 'prod',
  owner: 'team@example.com',
  dataType: 'UserData,Analytics',
})

// IAM role tags
const iamTags = createIAMTags({
  project: 'lego-api',
  environment: 'prod',
  owner: 'team@example.com',
  purpose: 'LambdaExecution',
  accessLevel: 'ReadWrite',
})
```

## Usage Examples

### Generate a New Lambda Function

```bash
pnpm turbo gen lambda
```

Follow the prompts:
```
? Lambda structure: Modular (lego-api-serverless/{domain}/{function}/)
? Domain/category: mocInstructions
? Lambda handler name: parse-moc-file
? Handler description: Parse uploaded MOC instruction files
? Project name (for AWS tags): lego-api
? Owner email (for AWS tags): engineering@bricklink.com
? Cost center (for AWS tags): Engineering
? Does this function need database access? Yes
? Authentication type: Enhanced JWT validation
? Cognito User Pool ID: us-east-1_ABC123
? Cognito Client ID: 1234567890abcdef
? AWS Region: us-east-1
? Include test files? Yes
? Include example schemas? Yes
? Add to SST configuration? No
```

**Result:**
```
✔ Generated Lambda function at:
  apps/api/lego-api-serverless/mocInstructions/parse-moc-file/

Files created:
  ✔ index.ts (Lambda handler with JWT auth)
  ✔ package.json
  ✔ README.md
  ✔ sst-config-example.ts (with AWS tags)

Next steps:
  1. Review the generated code
  2. Copy sst-config-example.ts to your sst.config.ts
  3. Update the SST configuration with your specific needs
  4. Implement your business logic in index.ts
  5. Run tests: pnpm test
```

### Generate an API Service

```bash
pnpm turbo gen api
```

Follow the prompts:
```
? API service name: user-service
? Package name: @repo/api-user-service
? Port number: 4000
? Project name (for AWS tags): lego-api
? Owner email (for AWS tags): engineering@bricklink.com
? Cost center (for AWS tags): Engineering
? Which database? PostgreSQL
? Include authentication middleware? Yes
? Include Docker configuration? Yes
```

### Generate a React Component

```bash
pnpm turbo gen component
```

Follow the prompts:
```
? Component name: UserAvatar
? Which package should this component be added to? ui
? Include Storybook story? Yes
? Include test file? Yes
```

## Best Practices

### Lambda Functions

1. **Always use modular structure** for new Lambdas in lego-api-serverless
2. **Include tests** for critical business logic
3. **Use enhanced authentication** for user-facing endpoints
4. **Review generated SST config** and copy to sst.config.ts
5. **Verify AWS tags** are present in deployed resources

### AWS Tagging

1. **Always provide accurate project name** - used for cost tracking
2. **Use team/group email for owner** - easier to maintain than individual emails
3. **Review generated sst-config-example.ts** before deployment
4. **Activate cost allocation tags** in AWS Billing Console:
   - Project
   - Component
   - Function
   - Environment
   - CostCenter
   - Owner

### Code Organization

1. **Keep domain logic in modular structure** (lego-api-serverless/{domain}/)
2. **Use standalone structure** only for legacy or special-purpose Lambdas
3. **Share utilities** via @monorepo packages, not copy-paste
4. **Document non-standard configurations** in README

## Troubleshooting

### Generator Not Found

```bash
# Ensure turbo is installed
pnpm install turbo -g

# Run from monorepo root
cd /path/to/monorepo
pnpm turbo gen
```

### Invalid Package Name

Generator validates package names. Ensure:
- No spaces
- No file extensions
- Kebab-case for Lambda/API names
- PascalCase for component names

### AWS Tag Validation Errors

If AWS Config reports missing tags:
1. Check `sst-config-example.ts` was copied to `sst.config.ts`
2. Verify tags are passed to resource constructor
3. Run `sst deploy` to apply tags
4. Wait 24 hours for tags to appear in Cost Explorer

### TypeScript Errors After Generation

```bash
# Install dependencies
pnpm install

# Run type check
pnpm check-types

# Common issue: Missing @monorepo packages
# Ensure all workspace dependencies are installed
```

## Contributing

### Adding a New Generator

1. Add generator configuration to `config.js`
2. Create templates in `templates/`
3. Add documentation to this README
4. Test generator with various inputs
5. Update examples

### Updating Templates

1. Edit `.hbs` files in `templates/`
2. Use Handlebars syntax for variables
3. Test with actual generator runs
4. Document new template variables

## Related Documentation

- [AWS Tagging Schema](/docs/aws-tagging-schema.md)
- [Lambda Development Guide](../../apps/api/lego-api-serverless/README.md)
- [SST Configuration](../../apps/api/lego-api-serverless/sst.config.ts)
- [Testing Guide](../../docs/testing.md)

## Support

For issues or questions:
1. Check this README for common issues
2. Review generator templates in `templates/`
3. Check [Turbo Generator Docs](https://turbo.build/repo/docs/core-concepts/monorepos/code-generation)
4. Contact DevOps team

---

**Last Updated**: 2025-01-23
**Maintainer**: DevOps Team
