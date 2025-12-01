# App Sets Gallery

App Sets Gallery application

## Module Application

This is a feature module that plugs into the shell application (main-app). It provides:

- **Feature-specific Components** - UI components for this module
- **Module State Management** - Local state with shared auth from shell
- **API Integration** - Uses shell's authentication for API calls
- **Lazy Loading** - Dynamically loaded by the shell application

## Integration

This module is registered in the shell app's routing configuration and loaded on-demand.


## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type checking
pnpm type-check
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

### Module Configuration

- `VITE_MODULE_NAME` - Module identifier
- `VITE_SHELL_APP_URL` - Shell application URL for development


## Scripts

- `pnpm dev` - Start development server on port 3006
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm lint` - Lint code
- `pnpm type-check` - TypeScript type checking


## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling with shared design system
- **TanStack Router** - Type-safe routing


- **@repo/ui** - Shared component library
- **@repo/api-client** - Serverless API client
- **Vitest** - Testing framework

## Project Structure

```
src/
├── components/          # Module components
├── pages/               # Module pages
├── hooks/               # Module-specific hooks
└── Module.tsx           # Module entry point
```

## Contributing

1. Follow the established patterns in the codebase
2. Use TypeScript for all new code
3. Write tests for new functionality
4. Follow the component and naming conventions
5. Update documentation as needed
