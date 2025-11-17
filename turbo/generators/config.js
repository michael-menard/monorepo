/** @type {import('@turbo/gen').PlopTypes.NodePlopAPI} */
module.exports = function generator(plop) {
  // Package generator
  plop.setGenerator('package', {
    description: 'Generate a new package for the monorepo',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of the package?',
        validate: (input) => {
          if (input.includes('.')) {
            return 'Package name cannot include an extension'
          }
          if (input.includes(' ')) {
            return 'Package name cannot include spaces'
          }
          if (!input) {
            return 'Package name is required'
          }
          return true
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'What type of package is this?',
        choices: [
          { name: 'React Library', value: 'react-lib' },
          { name: 'Node.js Library', value: 'node-lib' },
          { name: 'Shared Utilities', value: 'shared' },
          { name: 'Feature Package', value: 'feature' },
        ],
      },
      {
        type: 'input',
        name: 'description',
        message: 'Package description:',
      },
      {
        type: 'confirm',
        name: 'includeStorybook',
        message: 'Include Storybook setup?',
        default: false,
        when: answers => answers.type === 'react-lib' || answers.type === 'feature',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/package.json',
        templateFile: 'templates/package.json.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/tsconfig.json',
        templateFile: 'templates/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/src/index.ts',
        templateFile: 'templates/index.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/README.md',
        templateFile: 'templates/README.md.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/vite.config.ts',
        templateFile: 'templates/vite.config.ts.hbs',
        skip: data =>
          data.type === 'node-lib' ? 'Skipping Vite config for Node.js library' : false,
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/vitest.config.ts',
        templateFile: 'templates/vitest.config.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/{{kebabCase name}}/.storybook/main.ts',
        templateFile: 'templates/storybook-main.ts.hbs',
        skip: data => (!data.includeStorybook ? 'Skipping Storybook setup' : false),
      },
    ],
  })

  // Component generator
  plop.setGenerator('component', {
    description: 'Generate a new React component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name:',
        validate: (input) => {
          if (!input) {
            return 'Component name is required'
          }
          if (input.includes(' ')) {
            return 'Component name cannot include spaces'
          }
          return true
        },
      },
      {
        type: 'list',
        name: 'package',
        message: 'Which package should this component be added to?',
        choices: [
          'ui',
          'auth',
          'gallery',
          'wishlist',
          'profile',
          'moc-instructions',
          'FileUpload',
          'ImageUploadModal',
        ],
      },
      {
        type: 'confirm',
        name: 'includeStory',
        message: 'Include Storybook story?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeTest',
        message: 'Include test file?',
        default: true,
      },
    ],
    actions: [
      {
        type: 'add',
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/{{pascalCase name}}.tsx",
        templateFile: 'templates/component.tsx.hbs',
      },
      {
        type: 'add',
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/index.ts",
        templateFile: 'templates/component-index.ts.hbs',
      },
      {
        type: 'add',
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/{{pascalCase name}}.stories.tsx",
        templateFile: 'templates/component.stories.tsx.hbs',
        skip: data => (!data.includeStory ? 'Skipping Storybook story' : false),
      },
      {
        type: 'add',
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/{{pascalCase name}}.test.tsx",
        templateFile: 'templates/component.test.tsx.hbs',
        skip: data => (!data.includeTest ? 'Skipping test file' : false),
      },
    ],
  })

  // API generator
  plop.setGenerator('api', {
    description: 'Generate a new API service',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'API service name:',
        validate: (input) => {
          if (!input) {
            return 'API service name is required'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'packageName',
        message: 'Package name (e.g., @repo/api-service-name):',
        default: (answers) => `@repo/api-${answers.name}`,
      },
      {
        type: 'input',
        name: 'port',
        message: 'Port number:',
        default: '4000',
        validate: (input) => {
          const port = parseInt(input)
          if (isNaN(port) || port < 1000 || port > 65535) {
            return 'Port must be a number between 1000 and 65535'
          }
          return true
        },
      },
      {
        type: 'list',
        name: 'database',
        message: 'Which database?',
        choices: [
          { name: 'PostgreSQL', value: 'postgres' },
          { name: 'MongoDB', value: 'mongodb' },
          { name: 'None', value: 'none' },
        ],
      },
      {
        type: 'confirm',
        name: 'includeAuth',
        message: 'Include authentication middleware?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeDocker',
        message: 'Include Docker configuration?',
        default: true,
      },
    ],
    actions: [
      // Core files
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/package.json',
        templateFile: 'templates/api-package.json.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/tsconfig.json',
        templateFile: 'templates/api-tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/tsconfig.build.json',
        templateFile: 'templates/tsconfig.build.json.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/README.md',
        templateFile: 'templates/api-README.md.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/.env.example',
        templateFile: 'templates/env.example.hbs',
      },
      // Source files
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/index.ts',
        templateFile: 'templates/src/index.ts.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/server.ts',
        templateFile: 'templates/src/server.ts.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/env.ts',
        templateFile: 'templates/src/env.ts.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/logger.ts',
        templateFile: 'templates/src/logger.ts.hbs',
      },
      // Routes
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/routes/health.ts',
        templateFile: 'templates/src/routes/health.ts.hbs',
      },
      // Middleware
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/middleware/validate.ts',
        templateFile: 'templates/src/middleware/validate.ts.hbs',
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/middleware/auth.ts',
        templateFile: 'templates/src/middleware/auth.ts.hbs',
        skip: data => (!data.includeAuth ? 'Skipping auth middleware' : false),
      },
      // Schemas
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/schemas/shared.ts',
        templateFile: 'templates/src/schemas/shared.ts.hbs',
      },
      // Documentation
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/docs/swagger.ts',
        templateFile: 'templates/src/docs/swagger.ts.hbs',
      },
      // Database files (conditional)
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/db/client.ts',
        templateFile: 'templates/src/db/client.ts.hbs',
        skip: data => (data.database === 'none' ? 'Skipping database client' : false),
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/src/db/schema.ts',
        templateFile: 'templates/src/db/schema.ts.hbs',
        skip: data => (data.database === 'none' ? 'Skipping database schema' : false),
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/drizzle.config.ts',
        templateFile: 'templates/drizzle.config.ts.hbs',
        skip: data => (data.database !== 'postgres' ? 'Skipping Drizzle config' : false),
      },
      // Docker files (conditional)
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/Dockerfile',
        templateFile: 'templates/Dockerfile.hbs',
        skip: data => (!data.includeDocker ? 'Skipping Dockerfile' : false),
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/docker-compose.yml',
        templateFile: 'templates/docker-compose.hbs',
        skip: data => (!data.includeDocker || data.database === 'none' ? 'Skipping docker-compose' : false),
      },
      {
        type: 'add',
        path: 'apps/api/{{kebabCase name}}/docker-compose.db.yml',
        templateFile: 'templates/docker-compose.db.hbs',
        skip: data => (!data.includeDocker || data.database === 'none' ? 'Skipping database docker-compose' : false),
      },
    ],
  })

  // Lambda handler generator
  plop.setGenerator('lambda', {
    description: 'Generate a new Lambda handler with JWT validation',
    prompts: [
      {
        type: 'list',
        name: 'structure',
        message: 'Lambda structure:',
        choices: [
          { name: 'Modular (lego-api-serverless/{domain}/{function}/) - Recommended', value: 'modular' },
          { name: 'Standalone (apps/api/lambda-{name}/) - Legacy', value: 'standalone' },
        ],
        default: 'modular',
      },
      {
        type: 'input',
        name: 'domain',
        message: 'Domain/category (e.g., mocInstructions, gallery, wishlist):',
        when: answers => answers.structure === 'modular',
        validate: (input) => {
          if (!input) {
            return 'Domain is required for modular structure'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'name',
        message: 'Lambda handler name (kebab-case):',
        validate: (input) => {
          if (!input) {
            return 'Lambda handler name is required'
          }
          if (input.includes(' ')) {
            return 'Lambda handler name cannot include spaces'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Handler description:',
        default: (answers) => `Lambda handler for ${answers.name}`,
      },
      {
        type: 'confirm',
        name: 'needsDatabase',
        message: 'Does this function need database access (@monorepo/db)?',
        default: true,
        when: answers => answers.structure === 'modular',
      },
      {
        type: 'list',
        name: 'authType',
        message: 'Authentication type:',
        choices: [
          { name: 'Basic JWT validation (API Gateway only)', value: 'basic' },
          { name: 'Enhanced JWT validation (with Cognito verification)', value: 'enhanced' },
          { name: 'Resource ownership validation (user can only access own resources)', value: 'ownership' },
          { name: 'No authentication', value: 'none' },
        ],
        default: 'enhanced',
      },
      {
        type: 'input',
        name: 'cognitoUserPoolId',
        message: 'Cognito User Pool ID (e.g., us-east-1_ABC123):',
        when: answers => answers.authType === 'enhanced' || answers.authType === 'ownership',
        validate: (input) => {
          if (!input) {
            return 'User Pool ID is required for enhanced authentication'
          }
          if (!/^[a-z0-9-]+_[A-Za-z0-9]+$/.test(input)) {
            return 'Invalid User Pool ID format (should be like us-east-1_ABC123)'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'cognitoClientId',
        message: 'Cognito Client ID:',
        when: answers => answers.authType === 'enhanced' || answers.authType === 'ownership',
        validate: (input) => {
          if (!input) {
            return 'Client ID is required for enhanced authentication'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'awsRegion',
        message: 'AWS Region:',
        default: 'us-east-1',
        when: answers => answers.authType === 'enhanced' || answers.authType === 'ownership',
      },
      {
        type: 'confirm',
        name: 'includeTests',
        message: 'Include test files?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeSchemas',
        message: 'Include example schemas?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'addToSst',
        message: 'Add Lambda to SST configuration (apps/api/lego-api-serverless/sst.config.ts)?',
        default: false,
      },
      {
        type: 'list',
        name: 'apiGatewayChoice',
        message: 'API Gateway configuration:',
        choices: [
          { name: 'Add to existing API Gateway (LegoApi)', value: 'existing' },
          { name: 'Create new API Gateway', value: 'new' },
          { name: 'No API Gateway (Lambda only)', value: 'none' },
        ],
        default: 'existing',
        when: answers => answers.addToSst,
      },
      {
        type: 'input',
        name: 'newApiGatewayName',
        message: 'New API Gateway name (PascalCase):',
        default: answers => `${answers.name.replace(/[^a-zA-Z0-9]/g, '')}Api`,
        when: answers => answers.addToSst && answers.apiGatewayChoice === 'new',
        validate: (input) => {
          if (!input) {
            return 'API Gateway name is required'
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'API Gateway name must be PascalCase (e.g., MyApi)'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'existingApiGatewayName',
        message: 'Existing API Gateway variable name:',
        default: 'api',
        when: answers => answers.addToSst && answers.apiGatewayChoice === 'existing',
        validate: (input) => {
          if (!input) {
            return 'API Gateway variable name is required'
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
            return 'Variable name must be camelCase (e.g., api, myApi)'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'apiRoute',
        message: 'API route path (e.g., /api/my-endpoint):',
        default: answers => `/api/${answers.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        when: answers => answers.addToSst && answers.apiGatewayChoice !== 'none',
        validate: (input) => {
          if (!input.startsWith('/')) {
            return 'Route must start with /'
          }
          if (input.includes(' ')) {
            return 'Route cannot contain spaces'
          }
          return true
        },
      },
      {
        type: 'checkbox',
        name: 'httpMethods',
        message: 'HTTP methods to support:',
        choices: [
          { name: 'GET', value: 'GET', checked: true },
          { name: 'POST', value: 'POST', checked: true },
          { name: 'PUT', value: 'PUT', checked: false },
          { name: 'PATCH', value: 'PATCH', checked: false },
          { name: 'DELETE', value: 'DELETE', checked: false },
        ],
        when: answers => answers.addToSst && answers.apiGatewayChoice !== 'none',
        validate: (input) => {
          if (input.length === 0) {
            return 'At least one HTTP method must be selected'
          }
          return true
        },
      },
    ],
    actions: (data) => {
      const isModular = data.structure === 'modular'
      const basePath = isModular
        ? `apps/api/lego-api-serverless/{{domain}}/{{kebabCase name}}`
        : `apps/api/lambda-{{kebabCase name}}`

      const actions = []

      // Modular structure (simplified - just index, package.json, README)
      if (isModular) {
        actions.push(
          {
            type: 'add',
            path: `${basePath}/index.ts`,
            templateFile: 'templates/lambda-modular-index.ts.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/package.json`,
            templateFile: 'templates/lambda-modular-package.json.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/README.md`,
            templateFile: 'templates/lambda-modular-README.md.hbs',
          }
        )
      } else {
        // Standalone structure (legacy - full structure)
        actions.push(
          {
            type: 'add',
            path: `${basePath}/package.json`,
            templateFile: 'templates/lambda-package.json.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/tsconfig.json`,
            templateFile: 'templates/lambda-tsconfig.json.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/README.md`,
            templateFile: 'templates/lambda-README.md.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/.env.example`,
            templateFile: 'templates/lambda-env.example.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/index.ts`,
            templateFile: 'templates/lambda-index.ts.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/schemas/request.ts`,
            templateFile: 'templates/lambda-schemas-request.ts.hbs',
            skip: () => (!data.includeSchemas ? 'Skipping schemas' : false),
          },
          {
            type: 'add',
            path: `${basePath}/schemas/response.ts`,
            templateFile: 'templates/lambda-schemas-response.ts.hbs',
            skip: () => (!data.includeSchemas ? 'Skipping schemas' : false),
          },
          {
            type: 'add',
            path: `${basePath}/utils/response.ts`,
            templateFile: 'templates/lambda-utils-response.ts.hbs',
          },
          {
            type: 'add',
            path: `${basePath}/__tests__/index.test.ts`,
            templateFile: 'templates/lambda-index.test.ts.hbs',
            skip: () => (!data.includeTests ? 'Skipping tests' : false),
          },
          {
            type: 'add',
            path: `${basePath}/vitest.config.ts`,
            templateFile: 'templates/lambda-vitest.config.ts.hbs',
            skip: () => (!data.includeTests ? 'Skipping test config' : false),
          }
        )
      }

      return actions
    },
  })

  // PRD generator
  plop.setGenerator('prd', {
    description: 'Generate a Product Requirements Document',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'PRD name (will be kebab-cased):',
        validate: (input) => {
          if (!input) {
            return 'PRD name is required'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'package',
        message: 'Package/app path (e.g., apps/web, packages/ui):',
        default: 'apps/web',
      },
      {
        type: 'list',
        name: 'area',
        message: 'Area:',
        choices: ['web', 'api', 'ui', 'infra', 'docs'],
        default: 'web',
      },
      {
        type: 'list',
        name: 'type',
        message: 'Type:',
        choices: ['feature', 'improvement', 'bugfix', 'refactor', 'docs'],
        default: 'feature',
      },
      {
        type: 'list',
        name: 'risk',
        message: 'Risk level:',
        choices: ['low', 'medium', 'high'],
        default: 'medium',
      },
      {
        type: 'input',
        name: 'owner',
        message: 'Owner (e.g., @username):',
        default: '@owner',
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{package}}/docs/prds/{{date}}-{{kebabCase name}}.md',
        templateFile: 'templates/prd.md.hbs',
        transform: (template, data) => {
          const now = new Date()
          const date = now.toISOString().split('T')[0] // YYYY-MM-DD
          const id = `${date}-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          const title = data.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

          return template
            .replace(/{{date}}/g, date)
            .replace(/{{id}}/g, id)
            .replace(/{{title}}/g, title)
        },
      },
      {
        type: 'add',
        path: '{{package}}/docs/prds/{{kebabCase name}}.task-config.md',
        templateFile: 'templates/task-config.md.hbs',
        transform: (template, data) => {
          const title = data.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          return template.replace(/{{title}}/g, title)
        },
      },
    ],
  })
}
