# Workflow Roadmap

A React-based roadmap planning and visualization application for managing epics, plans, and stories.

## Quick Start (Running Locally)

### Prerequisites

- **Docker Desktop** running (for database)
- **Node.js 18+** and **pnpm 8+**
- **Bun** installed (for API)

### Steps

```bash
# 1. Start Docker Desktop first (required for knowledge-base database)

# 2. Install all dependencies (from monorepo root)
pnpm install

# 3. Initialize the knowledge-base database (one-time setup)
cd apps/api/knowledge-base
cp .env.example .env
# Edit .env with your OPENAI_API_KEY
pnpm db:init
cd ../..

# 4. Start the Roadmap API
cd apps/api/workflow-admin/roadmap-svc
cp .env.example .env
# Edit .env with KB_DB_PASSWORD (same as knowledge-base)
pnpm dev

# 5. In a new terminal, start the frontend
cd apps/web/workflow-roadmap
pnpm dev
```

- Frontend: **http://localhost:3002**
- API: **http://localhost:3004**

## Overview

The Workflow Roadmap app provides a visual interface for managing project roadmaps, plans, and stories. It allows users to view plans, explore linked stories, and navigate to detailed story information.

## Tech Stack

- **React 19** - UI framework
- **TanStack Router** - Routing and navigation
- **Redux Toolkit** - State management with RTK Query
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component primitives via `@repo/app-component-library`
- **Playwright** - E2E testing with Cucumber/Gherkin
- **Vitest** - Unit and integration testing

## Project Structure

```
apps/web/workflow-roadmap/
├── src/
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── pages/            # Route page components
│   │   ├── RoadmapPage.tsx       # Main roadmap view
│   │   ├── PlanDetailsPage.tsx   # Individual plan details
│   │   └── StoryDetailsPage.tsx  # Individual story details
│   ├── routes/           # Route definitions
│   ├── services/         # External service integrations
│   ├── store/            # Redux store and API slices
│   │   └── roadmapApi.ts         # RTK Query API definitions
│   ├── styles/           # Global styles
│   ├── test/             # Test setup and utilities
│   ├── App.tsx           # Root application component
│   └── main.tsx          # Application entry point
├── playwright/
│   ├── features/         # Gherkin feature files
│   │   └── story-details.feature
│   ├── step-definitions/ # Cucumber step definitions
│   │   └── story-details.steps.ts
│   └── utils/            # Test utilities and helpers
├── playwright.config.ts  # Playwright configuration
├── vite.config.ts        # Vite bundler configuration
├── vitest.config.ts     # Vitest configuration
└── package.json
```

## Routes

| Route             | Description                           |
| ----------------- | ------------------------------------- |
| `/`               | Main roadmap page - lists all plans   |
| `/plan/:slug`     | Plan details page with stories table  |
| `/story/:storyId` | Story details page with full metadata |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies (from monorepo root)
pnpm install
```

### Development

Start the development server:

```bash
cd apps/web/workflow-roadmap
pnpm dev
```

The app runs on `http://localhost:3002` by default.

### Building

```bash
# Production build
pnpm build

# Preview production build
pnpm serve
# or
pnpm preview
```

## Testing

### Unit & Integration Tests (Vitest)

Run Vitest tests:

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (development)
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

### E2E Tests (Playwright + Cucumber)

The app uses Playwright with Cucumber/Gherkin for BDD-style E2E testing.

#### Running E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests with visible browser
pnpm test:e2e:headed

# Run only smoke tests
pnpm test:e2e:smoke

# Run specific test file
pnpm exec playwright test --config=playwright.config.ts path/to/test.spec.ts

# Run tests with debugging
pnpm exec playwright test --config=playwright.config.ts --debug
```

#### E2E Test Structure

- **Features**: `playwright/features/*.feature` - Gherkin feature files
- **Step Definitions**: `playwright/step-definitions/*.steps.ts` - Cucumber step implementations
- **Test Utils**: `playwright/utils/` - Helper functions for tests

#### E2E Test Tags

| Tag           | Description                |
| ------------- | -------------------------- |
| `@smoke`      | Critical path smoke tests  |
| `@regression` | Full regression test suite |

### Type Checking

```bash
# Type check the code
pnpm check-types
# or
pnpm type-check
```

### Linting & Formatting

```bash
# Run ESLint with auto-fix
pnpm lint

# Format code with Prettier
pnpm format

# Run both
pnpm check
```

## API Integration

The app connects to the backend API at `/api/v1`. The API endpoints used:

| Endpoint                            | Description            |
| ----------------------------------- | ---------------------- |
| `GET /api/v1/roadmap`               | List all plans         |
| `GET /api/v1/roadmap/:slug`         | Get plan details       |
| `GET /api/v1/roadmap/:slug/stories` | Get stories for a plan |
| `GET /api/v1/stories/:storyId`      | Get story details      |
| `PATCH /api/v1/roadmap/:slug`       | Update plan            |
| `PATCH /api/v1/roadmap/reorder`     | Reorder plans          |

API definitions are in `src/store/roadmapApi.ts`.

## Environment Variables

Create a `.env` file in the app directory:

```env
# API base URL (defaults to relative /api)
VITE_API_URL=http://localhost:3004
```

## Deployment

### Docker

```bash
# Build Docker image
docker build -t workflow-roadmap .

# Run container
docker run -p 3002:3002 workflow-roadmap
```

### Nginx

The app includes `nginx.conf` for production deployment. Build the app first, then serve with nginx.

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/routes/` (TanStack Router)
3. Add navigation link if needed
4. Add E2E tests in `playwright/features/`

### Adding a New API Endpoint

1. Add endpoint to `src/store/roadmapApi.ts`
2. Export the new hook
3. Use in components

### Adding E2E Tests

1. Create or update feature file in `playwright/features/`
2. Add step definitions in `playwright/step-definitions/`
3. Run `pnpm test:e2e` to verify

## Troubleshooting

### Tests Fail to Start

Ensure dependencies are installed:

```bash
pnpm install
```

### Playwright Browser Not Installed

```bash
cd apps/web/workflow-roadmap
pnpm exec playwright install chromium
```

### API Requests Failing

- Verify backend is running
- Check API proxy in `vite.config.ts`
- Ensure correct port (default: 3002)

### Port Already in Use

The dev server defaults to port 3002. To use a different port:

```bash
pnpm dev -- --port 3003
```

## Scripts Reference

| Script                 | Description                  |
| ---------------------- | ---------------------------- |
| `pnpm dev`             | Start development server     |
| `pnpm build`           | Production build             |
| `pnpm serve`           | Serve production build       |
| `pnpm test`            | Run Vitest tests             |
| `pnpm test:watch`      | Run tests in watch mode      |
| `pnpm test:coverage`   | Run tests with coverage      |
| `pnpm test:e2e`        | Run Playwright E2E tests     |
| `pnpm test:e2e:headed` | Run E2E with visible browser |
| `pnpm test:e2e:smoke`  | Run smoke tests only         |
| `pnpm lint`            | Run ESLint                   |
| `pnpm format`          | Format code                  |
| `pnpm check`           | Lint and format              |
| `pnpm check-types`     | TypeScript check             |

## Related Documentation

- [Frontend Architecture](../docs/tech-stack/frontend.md)
- [Testing Strategy](../docs/testing/overview.md)
- [Monorepo Tooling](../docs/tech-stack/monorepo.md)
