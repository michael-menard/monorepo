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
