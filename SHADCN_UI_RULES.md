# Shadcn/UI Component Installation Rules

## Rule: Always Install Shadcn/UI Components to `packages/ui`

When adding new shadcn/ui components to this monorepo, follow these guidelines:

### 1. Installation Location
- **ALWAYS** install components to `packages/ui/src/`
- **NEVER** install components directly in individual apps
- This ensures consistency and reusability across all apps in the monorepo

### 2. Installation Process
```bash
# Navigate to the UI package
cd packages/ui

# Install the component using shadcn/ui CLI
npx shadcn@latest add [component-name]

# Example:
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add dialog
```

### 3. Dependencies
- Add required dependencies to `packages/ui/package.json`
- Ensure all Radix UI primitives and other dependencies are listed
- Run `pnpm install` in the root to sync dependencies

### 4. Exports
- Update `packages/ui/package.json` exports to include new components
- Follow the pattern: `"./component-name": "./src/component-name.tsx"`

### 5. Usage in Apps
- Import components from `@repo/ui` in any app
- Example: `import { Button } from '@repo/ui/button'`

### 6. Component Structure
- Each component should be in its own file: `src/component-name.tsx`
- Follow shadcn/ui conventions and patterns
- Include proper TypeScript types and React.forwardRef

### 7. Testing
- Components should be tested in the UI package
- Apps can import and use components without additional testing

### 8. Styling
- Components use Tailwind CSS classes
- Ensure consistent theming across all components
- Use the `cn` utility from `./lib/utils` for class merging

### 9. Documentation
- Update this file when adding new components
- Document any special usage patterns or requirements

## Current Components
- Button (`./button`)
- Card (`./card`) 
- Code (`./code`)
- Input (`./input`)
- Label (`./label`)
- Form (`./form`)
- Toast (`./toast`)
- Dialog (`./dialog`)
- Separator (`./separator`)
- LoadingSpinner (`./loading-spinner`)

## Adding New Components
1. Navigate to `packages/ui`
2. Run `npx shadcn@latest add [component-name]`
3. Update package.json exports
4. Test the component
5. Update this documentation 