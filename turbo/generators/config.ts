import type { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // Package generator
  plop.setGenerator("package", {
    description: "Generate a new package for the monorepo",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the package?",
        validate: (input: string) => {
          if (input.includes(".")) {
            return "Package name cannot include an extension";
          }
          if (input.includes(" ")) {
            return "Package name cannot include spaces";
          }
          if (!input) {
            return "Package name is required";
          }
          return true;
        },
      },
      {
        type: "list",
        name: "type",
        message: "What type of package is this?",
        choices: [
          { name: "React Library", value: "react-lib" },
          { name: "Node.js Library", value: "node-lib" },
          { name: "Shared Utilities", value: "shared" },
          { name: "Feature Package", value: "feature" },
        ],
      },
      {
        type: "input",
        name: "description",
        message: "Package description:",
      },
      {
        type: "confirm",
        name: "includeStorybook",
        message: "Include Storybook setup?",
        default: false,
        when: (answers) => answers.type === "react-lib" || answers.type === "feature",
      },
    ],
    actions: [
      {
        type: "add",
        path: "packages/{{kebabCase name}}/package.json",
        templateFile: "templates/package.json.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/tsconfig.json",
        templateFile: "templates/tsconfig.json.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/src/index.ts",
        templateFile: "templates/index.ts.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/README.md",
        templateFile: "templates/README.md.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/vite.config.ts",
        templateFile: "templates/vite.config.ts.hbs",
        skip: (data) => data.type === "node-lib" ? "Skipping Vite config for Node.js library" : false,
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/vitest.config.ts",
        templateFile: "templates/vitest.config.ts.hbs",
      },
      {
        type: "add",
        path: "packages/{{kebabCase name}}/.storybook/main.ts",
        templateFile: "templates/storybook-main.ts.hbs",
        skip: (data) => !data.includeStorybook ? "Skipping Storybook setup" : false,
      },
    ],
  });

  // Component generator
  plop.setGenerator("component", {
    description: "Generate a new React component",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Component name:",
        validate: (input: string) => {
          if (!input) {
            return "Component name is required";
          }
          if (input.includes(" ")) {
            return "Component name cannot include spaces";
          }
          return true;
        },
      },
      {
        type: "list",
        name: "package",
        message: "Which package should this component be added to?",
        choices: [
          "ui",
          "auth",
          "gallery",
          "wishlist",
          "profile",
          "moc-instructions",
          "FileUpload",
          "ImageUploadModal",
        ],
      },
      {
        type: "confirm",
        name: "includeStory",
        message: "Include Storybook story?",
        default: true,
      },
      {
        type: "confirm",
        name: "includeTest",
        message: "Include test file?",
        default: true,
      },
    ],
    actions: [
      {
        type: "add",
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/{{pascalCase name}}.tsx",
        templateFile: "templates/component.tsx.hbs",
      },
      {
        type: "add",
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/index.ts",
        templateFile: "templates/component-index.ts.hbs",
      },
      {
        type: "add",
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/{{pascalCase name}}.stories.tsx",
        templateFile: "templates/component.stories.tsx.hbs",
        skip: (data) => !data.includeStory ? "Skipping Storybook story" : false,
      },
      {
        type: "add",
        path: "packages/{{#eq package 'ui'}}ui{{else}}features/{{package}}{{/eq}}/src/components/{{pascalCase name}}/{{pascalCase name}}.test.tsx",
        templateFile: "templates/component.test.tsx.hbs",
        skip: (data) => !data.includeTest ? "Skipping test file" : false,
      },
    ],
  });

  // API generator
  plop.setGenerator("api", {
    description: "Generate a new API service",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "API service name:",
        validate: (input: string) => {
          if (!input) {
            return "API service name is required";
          }
          return true;
        },
      },
      {
        type: "list",
        name: "database",
        message: "Which database?",
        choices: [
          { name: "PostgreSQL", value: "postgres" },
          { name: "MongoDB", value: "mongodb" },
          { name: "None", value: "none" },
        ],
      },
      {
        type: "confirm",
        name: "includeAuth",
        message: "Include authentication middleware?",
        default: true,
      },
    ],
    actions: [
      {
        type: "add",
        path: "apps/api/{{kebabCase name}}/package.json",
        templateFile: "templates/api-package.json.hbs",
      },
      {
        type: "add",
        path: "apps/api/{{kebabCase name}}/tsconfig.json",
        templateFile: "templates/api-tsconfig.json.hbs",
      },
      {
        type: "add",
        path: "apps/api/{{kebabCase name}}/src/index.ts",
        templateFile: "templates/api-index.ts.hbs",
      },
      {
        type: "add",
        path: "apps/api/{{kebabCase name}}/README.md",
        templateFile: "templates/api-README.md.hbs",
      },
    ],
  });
}
