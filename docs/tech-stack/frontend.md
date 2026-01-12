# Frontend Architecture

## Overview

This document describes the frontend stack and conventions for apps under `apps/web/*`.

## Technologies

- **React 19** for UI
- **TypeScript** in strict mode
- **Tailwind CSS** for styling
- **shadcn/ui** as base primitives, wrapped in our app component library

## Applications

- `apps/web/main-app` — primary user-facing app
- `apps/web/app-dashboard` — dashboard/admin experiences

## Component Libraries

- `packages/core/app-component-library` — shared primitives and app-level components

### Primitives

- Located under `_primitives/`
- Thin wrappers around shadcn/Radix components

### Feature Components

- Grouped by feature (e.g. `buttons/`, `cards/`, `selects/`)
- Compose primitives into opinionated, app-specific components

## Styling

- Tailwind CSS utility classes
- No hardcoded colors — use the design system tokens

## Testing

- Vitest + React Testing Library
- Components live alongside tests in `__tests__` directories

## Best Practices

- Functional components only
- Named exports preferred
- No barrel files — import from concrete paths
