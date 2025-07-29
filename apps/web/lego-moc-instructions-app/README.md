# LEGO MOC Instructions App

A React application for managing and viewing LEGO MOC (My Own Creation) instructions, built with TanStack Start, Vite, and modern web technologies.

## Features

- **Authentication**: Integrated with the shared auth package using RouteGuard
- **MOC Instructions Management**: Create, read, update, and delete MOC instructions
- **Search & Filtering**: Advanced search capabilities with filtering options
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Testing**: Comprehensive test suite with Vitest and Testing Library
- **API Integration**: RTK Query for efficient data fetching and caching

## Tech Stack

- **Framework**: React 19 with TanStack Start
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Redux Toolkit with RTK Query
- **Type Safety**: TypeScript with Zod schemas
- **Testing**: Vitest, Testing Library, MSW
- **Routing**: React Router DOM
- **Authentication**: Shared auth package with RouteGuard
- **Backend API**: Integrates with lego-projects-api

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- lego-projects-api running on localhost:3001 (for development)

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development

- **Build**: `pnpm build`
- **Test**: `pnpm test:run`
- **Lint**: `pnpm lint`
- **Format**: `pnpm format`
- **Type Check**: `pnpm type-check`

### Backend API

This frontend app integrates with the `lego-projects-api` backend service:

1. **Development**: Ensure lego-projects-api is running on `http://localhost:3001`
2. **Production**: Configure the API endpoint in your deployment environment
3. **API Documentation**: See the lego-projects-api documentation for endpoint details

## Project Structure

```
src/
├── components/          # React components
├── services/           # API services (RTK Query)
├── store/              # Redux store configuration
├── test/               # Test setup and mocks
│   ├── mocks/          # MSW handlers
│   └── setup.ts        # Test configuration
└── App.tsx             # Main application component
```

## API Integration

The app uses RTK Query for API calls and integrates with the `lego-projects-api` backend service. The API endpoints are automatically configured based on the environment:

- **Development**: `http://localhost:3001/api`
- **Production**: `/api` (relative to the deployed frontend)

The app expects the following endpoints from the lego-projects-api:
- `GET /api/moc-instructions` - Get all MOC instructions
- `GET /api/moc-instructions/:id` - Get a specific MOC instruction
- `POST /api/moc-instructions` - Create a new MOC instruction
- `PUT /api/moc-instructions/:id` - Update an existing MOC instruction
- `DELETE /api/moc-instructions/:id` - Delete a MOC instruction
- `GET /api/moc-instructions/search` - Search MOC instructions

## Authentication

The app integrates with the shared auth package and uses RouteGuard for protected routes. Users must be authenticated to access the application.

## Testing

The app includes comprehensive testing with:

- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API integration tests with MSW
- **E2E Tests**: Full user journey tests

Run tests with:
```bash
pnpm test:run          # Run all tests
pnpm test:ui           # Run tests with UI
pnpm test:coverage     # Run tests with coverage
```

## Contributing

1. Follow the project's coding standards
2. Write tests for new features
3. Ensure all tests pass before submitting
4. Use conventional commit messages

## License

This project is part of the monorepo and follows the same licensing terms.
