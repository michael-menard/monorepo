# Shadcn/UI Component Installation Rules

This guide outlines the rules and best practices for managing UI components in the LEGO MOC Instructions monorepo.

## Core Rule: Centralized UI Component Management

**All UI components—including shadcn/ui components and custom UI components—must be centralized in the `packages/ui` package. Never install, duplicate, or re-implement UI components in individual apps or other packages.**

## Installation Guidelines

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

### 3. Dependencies Management
- Required dependencies are automatically added to `packages/ui/package.json`
- All Radix UI primitives and other dependencies are centrally managed
- Run `pnpm install` in the root to sync dependencies across the monorepo

### 4. Export Configuration
- Update `packages/ui/package.json` exports to include new components
- Follow the pattern: `"./component-name": "./src/component-name.tsx"`
- Also update `packages/ui/src/index.ts` to export the component

### 5. Usage in Apps
- Import components from `@repo/ui` in any app
- Example: `import { Button } from '@repo/ui/button'`
- For multiple components: `import { Button, Input, Card } from '@repo/ui'`

### 6. Component Structure
- Each component should be in its own file: `src/component-name.tsx`
- Follow shadcn/ui conventions and patterns
- Include proper TypeScript types and React.forwardRef
- Use the `cn` utility from `./lib/utils` for class merging

### 7. Testing
- Components should be tested in the UI package (`packages/ui/src/__tests__/`)
- Apps can import and use components without additional testing
- Use Vitest and React Testing Library for component tests

### 8. Styling
- Components use Tailwind CSS classes
- Ensure consistent theming across all components
- Use the `cn` utility from `./lib/utils` for class merging
- Follow the design system defined in `tailwind.config.js`

## Current Component Inventory

### Core shadcn/ui Components
- **Accordion** (`./accordion`) - Collapsible content sections
- **Alert Dialog** (`./alert-dialog`) - Modal dialogs for important actions
- **Avatar** (`./avatar`) - User profile images and fallbacks
- **Badge** (`./badge`) - Status indicators and labels
- **Button** (`./button`) - Interactive buttons with variants
- **Card** (`./card`) - Content containers with header, content, footer
- **Checkbox** (`./checkbox`) - Form checkboxes
- **Collapsible** (`./collapsible`) - Expandable content areas
- **Command** (`./command`) - Command palette and search interfaces
- **Context Menu** (`./context-menu`) - Right-click context menus
- **Dialog** (`./dialog`) - Modal dialogs
- **Dropdown Menu** (`./dropdown-menu`) - Dropdown navigation menus
- **Form** (`./form`) - Form components with validation
- **Hover Card** (`./hover-card`) - Hover-triggered information cards
- **Input** (`./input`) - Text input fields
- **Label** (`./label`) - Form labels
- **Menubar** (`./menubar`) - Application menu bars
- **Navigation Menu** (`./navigation-menu`) - Navigation components
- **Popover** (`./popover`) - Floating content containers
- **Progress** (`./progress`) - Progress indicators
- **Radio Group** (`./radio-group`) - Radio button groups
- **Scroll Area** (`./scroll-area`) - Custom scrollable areas
- **Select** (`./select`) - Dropdown select components
- **Separator** (`./separator`) - Visual separators
- **Sheet** (`./sheet`) - Side panel dialogs
- **Slider** (`./slider`) - Range sliders
- **Switch** (`./switch`) - Toggle switches
- **Table** (`./table`) - Data tables
- **Tabs** (`./tabs`) - Tabbed interfaces
- **Textarea** (`./textarea`) - Multi-line text inputs
- **Toast** (`./sonner`) - Toast notifications (using Sonner)
- **Toggle** (`./toggle`) - Toggle buttons
- **Toggle Group** (`./toggle-group`) - Groups of toggle buttons
- **Tooltip** (`./tooltip`) - Hover tooltips

### Custom Composite Components
- **AppAvatar** (`./AppAvatar`) - Enhanced avatar with user management
- **AppCard** (`./AppCard`) - Application card component
- **AppDataTable** (`./AppDataTable`) - Advanced data table with features
- **ComponentShowcase** (`./ComponentShowcase`) - Component demonstration
- **ConfirmationDialog** (`./ConfirmationDialog`) - Confirmation dialogs
- **FormSection** (`./FormSection`) - Form section containers
- **PageHeader** (`./PageHeader`) - Page header components
- **TabPanel** (`./TabPanel`) - Tab panel containers

### Loading Components
- **LoadingSpinner** (`./loading-spinner`) - Loading indicators

### Utilities
- **Utils** (`./utils`) - Utility functions including `cn` for class merging

## Feature-Specific Components

**Note:** Some components like FileUpload and ImageUploadModal are located in `packages/features/` rather than `packages/ui/`. This is intentional for feature-specific components that include business logic.

- **FileUpload** (`packages/features/FileUpload`) - File upload functionality
- **ImageUploadModal** (`packages/features/ImageUploadModal`) - Image upload modal

## Adding New Components

### Step-by-Step Process
1. **Navigate to UI package**: `cd packages/ui`
2. **Install component**: `npx shadcn@latest add [component-name]`
3. **Update exports**: Add to `package.json` exports if needed
4. **Update index**: Add export to `src/index.ts`
5. **Test component**: Create tests in `src/__tests__/`
6. **Update documentation**: Update this file with new component

### Example: Adding a New Component
```bash
# 1. Navigate to UI package
cd packages/ui

# 2. Install the component
npx shadcn@latest add calendar

# 3. The component is automatically added to package.json exports
# 4. Add to src/index.ts
export { Calendar } from './calendar';

# 5. Test the component
# 6. Update this documentation
```

## Import Patterns

### Recommended Import Patterns
```tsx
// Import individual components (tree-shaking friendly)
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';

// Import multiple components
import { Button, Input, Card } from '@repo/ui';

// Import utilities
import { cn } from '@repo/ui/utils';
```

### Avoid These Patterns
```tsx
// ❌ Don't import from individual files
import { Button } from '../../components/ui/button';

// ❌ Don't import from shadcn/ui directly
import { Button } from 'shadcn/ui/button';

// ❌ Don't duplicate components in apps
// components/ui/button.tsx (in app directory)
```

## Testing Guidelines

### Component Testing
- All components should have tests in `packages/ui/src/__tests__/`
- Use Vitest and React Testing Library
- Test component variants, props, and interactions
- Mock external dependencies appropriately

### Example Test Structure
```tsx
// packages/ui/src/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

## Best Practices

### Component Development
- **Consistency**: Follow shadcn/ui patterns and conventions
- **TypeScript**: Use proper TypeScript types and interfaces
- **Accessibility**: Ensure components meet accessibility standards
- **Performance**: Optimize for performance with proper memoization
- **Documentation**: Document complex components and usage patterns

### Styling Guidelines
- **Tailwind CSS**: Use Tailwind classes for styling
- **Design System**: Follow the established design system
- **Responsive**: Ensure components work across all screen sizes
- **Theming**: Support light/dark mode where appropriate

### Version Management
- **Single Source**: All UI components in one package
- **Version Control**: Track changes in the UI package
- **Breaking Changes**: Communicate breaking changes clearly
- **Migration**: Provide migration guides for major updates

## Troubleshooting

### Common Issues
1. **Component not found**: Ensure it's exported from `packages/ui/src/index.ts`
2. **Styling issues**: Check Tailwind configuration and class names
3. **Type errors**: Verify TypeScript types are properly defined
4. **Import errors**: Use correct import paths from `@repo/ui`

### Getting Help
- Check the shadcn/ui documentation for component-specific issues
- Review existing component implementations in `packages/ui/src/`
- Consult the testing examples in `packages/ui/src/__tests__/` 