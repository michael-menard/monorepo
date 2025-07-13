import baseConfig from "@repo/eslint-config/base";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-namespace": "warn",
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    files: ["vitest.setup.ts"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },
]; 