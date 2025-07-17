```json
{
  "name": "auth-migration-backend",
  "description": "Generate tasks for the backend migration of the Auth Service from MongoDB to PostgreSQL using Kysely and Drizzle ORM.",
  "input_file": "packages/auth/prds/auth_migration_backend_prd.md",
  "output_dir": "packages/auth/tasks/backend",
  "task_categories": [
    "api",
    "database",
    "orm-integration",
    "migration-script",
    "auth-logic",
    "testing",
    "security",
    "deployment"
  ],
  "priority_levels": [
    "high",
    "medium",
    "low"
  ],
  "estimated_effort": [
    "<1 hour",
    "1-2 hours",
    "1 day",
    "2-3 days"
  ],
  "npm_packages": {
    "required": [
      "react",
      "react-dom",
      "react-hook-form",
      "zod",
      "framer-motion",
      "helmet",
      "tailwindcss",
      "shadcn-ui",
      "winston"
    ],
    "dev_only": [
      "typescript",
      "vitest",
      "supertest",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "ts-node",
      "nodemon",
      "eslint",
      "prettier",
      "eslint-plugin-prettier",
      "eslint-config-prettier"
    ]
  },
  "dependencies": true,
  "acceptance_criteria": true,
  "technical_details": true,
  "include_test_cases": true,
  "include_edge_cases": true,
  "output_format": "md",
  "group_tasks_by": "category",
  "routes": [
    { "method": "POST", "path": "/auth/signup", "description": "Create new user" },
    { "method": "POST", "path": "/auth/login", "description": "Authenticate user" },
    { "method": "POST", "path": "/auth/logout", "description": "Logout user" },
    { "method": "POST", "path": "/auth/verify-email", "description": "Verify user email" },
    { "method": "POST", "path": "/auth/forgot-password", "description": "Start reset flow" },
    { "method": "POST", "path": "/auth/reset-password", "description": "Submit new password" },
    { "method": "GET", "path": "/auth/refresh", "description": "Refresh JWT tokens" }
  ],
  "zod_schemas": [
    {
      "name": "SignupSchema",
      "schema": "z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(8) })"
    },
    {
      "name": "VerifyEmailSchema",
      "schema": "z.object({ token: z.string().min(1) })"
    },
    {
      "name": "ResetPasswordSchema",
      "schema": "z.object({ token: z.string().min(1), password: z.string().min(8), confirmPassword: z.string() }).refine(data => data.password === data.confirmPassword, { message: 'Passwords don\'t match', path: ['confirmPassword'] })"
    }
  ],
  "testing": {
    "test_runner": "vitest",
    "test_command": "pnpm run test",
    "mocks_required": true,
    "mocking_strategy": "stub-db-and-api",
    "mocking_libraries": ["vi.mock", "msw", "supertest"],
    "required_imports": [
      "import { describe, it, expect, vi } from 'vitest'",
      "import request from 'supertest'"
    ]
  },
  "app_structure": {
    "type": "standalone",
    "framework": "express",
    "entry_point": "src/index.ts",
    "routes_folder": "src/routes",
    "controllers_folder": "src/controllers",
    "middleware_folder": "src/middleware"
  }
}
```