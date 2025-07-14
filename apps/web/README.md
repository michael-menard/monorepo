# Web Applications

This directory contains React applications built with Vite.

## Applications

### Auth UI Example (`auth-ui-example/`)
A React application demonstrating authentication components and flows.
- **Port**: 5173 (default Vite port)
- **Scripts**: `pnpm dev`, `pnpm build`, `pnpm preview`

### Lego Projects UI (`lego-projects-ui/`)
A React application for managing Lego projects.
- **Port**: 5174 (configured in vite.config.ts)
- **Scripts**: `pnpm dev`, `pnpm build`, `pnpm preview`

## Development

Each application can be run independently:

```bash
# Run auth UI example
cd apps/web/auth-ui-example
pnpm dev

# Run lego projects UI
cd apps/web/lego-projects-ui
pnpm dev
```

## Structure

```
apps/web/
├── auth-ui-example/          # Authentication UI demo
├── lego-projects-ui/         # Lego projects management
└── README.md                 # This file
```

Each application is self-contained with its own:
- `package.json` with dependencies
- `src/` directory with React components
- `vite.config.ts` for build configuration
- `tsconfig.json` for TypeScript configuration 