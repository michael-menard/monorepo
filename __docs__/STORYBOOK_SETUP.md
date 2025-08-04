# Storybook Setup Documentation

## Overview

This project has been configured with Storybook for isolated component development and documentation. Storybook provides a development environment for UI components that allows you to:

- Develop components in isolation
- View all component variants and states
- Test component interactions
- Document component usage and props
- Share component libraries with your team

## Getting Started

### Running Storybook

To start the Storybook development server:

```bash
pnpm storybook
```

This will start Storybook on `http://localhost:6006` by default.

### Building Storybook

To build Storybook for production:

```bash
pnpm build-storybook
```

This creates a static build in the `storybook-static` directory.

## Configuration

### Main Configuration (`.storybook/main.ts`)

The main configuration file sets up:

- **Story locations**: Automatically finds stories in:
  - `packages/ui/src/**/*.stories.@(js|jsx|ts|tsx)`
  - `packages/auth/src/**/*.stories.@(js|jsx|ts|tsx)`
  - `features/profile/src/**/*.stories.@(js|jsx|ts|tsx)`
  - `features/mock-instructions/src/**/*.stories.@(js|jsx|ts|tsx)`

- **Addons**: 
  - `@chromatic-com/storybook` - Visual testing
  - `@storybook/addon-docs` - Documentation
  - `@storybook/addon-a11y` - Accessibility testing

- **Path aliases**: Configured for monorepo packages:
  - `@repo/ui` → `packages/ui/src`
  - `@repo/auth` → `packages/auth/src`
  - `@repo/profile` → `features/profile/src`

### Preview Configuration (`.storybook/preview.ts`)

The preview configuration includes:

- **Global CSS**: Imports the UI package's global styles
- **Backgrounds**: Light, dark, and gray background options
- **Layout**: Centered layout by default
- **Theme toggle**: Global theme switching between light and dark

## Available Stories

### Core Components

- **Button** (`packages/ui/src/button.stories.tsx`)
  - All variants (default, secondary, destructive, outline, ghost, link)
  - All sizes (sm, default, lg, icon)
  - Disabled state
  - Interactive examples

- **Input** (`packages/ui/src/input.stories.tsx`)
  - All input types (text, email, password, number, tel, url, search)
  - With labels
  - Disabled and required states
  - All types showcase

- **Card** (`packages/ui/src/card.stories.tsx`)
  - Complete card with header, content, and footer
  - With actions and badges
  - Content-only, header-only, footer-only variations
  - Interactive cards with hover effects
  - Multiple cards in grid layout

- **Dialog** (`packages/ui/src/dialog.stories.tsx`)
  - Simple dialogs
  - Forms within dialogs
  - Confirmation dialogs
  - Large content dialogs

- **Select** (`packages/ui/src/select.stories.tsx`)
  - Basic select with options
  - With labels
  - Grouped options
  - Disabled state
  - Multiple selects

### Advanced Components

- **MultiSelect** (`packages/ui/src/multi-select.stories.tsx`)
  - Multiple selection with various data sets
  - With labels and default values
  - Maximum selection limits
  - Search functionality
  - Different sizes

- **AppAvatar** (`packages/ui/src/AppAvatar.stories.tsx`)
  - User avatars with images and fallbacks
  - Different sizes (sm, md, lg, xl)
  - Status indicators (online, offline, away, busy)
  - Editable avatars
  - Long names and edge cases

- **Form** (`packages/ui/src/form.stories.tsx`)
  - Simple forms with validation
  - Complex forms with multiple field types
  - Zod schema validation
  - Form descriptions and help text

### Utility Components

- **Skeleton** (`packages/ui/src/skeleton.stories.tsx`)
  - Loading state placeholders
  - Avatar, text, card, table, list, and form skeletons
  - Multiple skeleton combinations
  - Different sizes

- **ErrorBoundary** (`packages/ui/src/error-boundary.stories.tsx`)
  - Error catching and fallback UI
  - Custom fallback components
  - Error callbacks
  - Nested error boundaries
  - Interactive error triggering

- **Badge** (`packages/ui/src/badge.stories.tsx`)
  - All variants (default, secondary, destructive, outline)
  - Status indicators
  - Count badges

- **Checkbox** (`packages/ui/src/checkbox.stories.tsx`)
  - Basic checkboxes with labels
  - Checked, disabled, and required states
  - Multiple checkboxes
  - With descriptions

### Showcase

- **ComponentShowcase** (`packages/ui/src/ComponentShowcase.stories.tsx`)
  - Comprehensive display of all components
  - Full-screen layout
  - Complete design system overview

## Creating New Stories

### Basic Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { YourComponent } from './YourComponent'

const meta: Meta<typeof YourComponent> = {
  title: 'UI/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Description of your component.',
      },
    },
  },
  argTypes: {
    // Define controls for your component props
    variant: {
      control: { type: 'select' },
      options: ['option1', 'option2'],
      description: 'Description of the variant prop',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Default props
  },
}

export const Variant: Story = {
  args: {
    variant: 'option1',
  },
}
```

### Best Practices

1. **Use descriptive titles**: Group related components under meaningful categories
2. **Include all variants**: Show every possible state and variation of your component
3. **Add documentation**: Use the `docs` parameter to explain component usage
4. **Use argTypes**: Define controls for interactive props
5. **Include examples**: Show real-world usage patterns
6. **Test interactions**: Use the `actions` addon to test event handlers

### Story Organization

- **UI/**: Core UI components
- **Features/**: Feature-specific components
- **Layout/**: Layout and structural components
- **Forms/**: Form-related components
- **Navigation/**: Navigation components
- **Feedback/**: Loading, error, and success states

## Addons and Features

### Accessibility Testing

The `@storybook/addon-a11y` addon automatically tests your components for accessibility issues and provides recommendations for improvement.

### Visual Testing

The `@chromatic-com/storybook` addon enables visual regression testing to catch UI changes across different browsers and viewports.

### Documentation

The `@storybook/addon-docs` addon automatically generates documentation from your component props and stories.

## Troubleshooting

### Common Issues

1. **Missing dependencies**: If you see import errors, make sure all required dependencies are installed in the UI package
2. **Path resolution**: Check that path aliases are correctly configured in `.storybook/main.ts`
3. **CSS not loading**: Ensure the global CSS is imported in `.storybook/preview.ts`

### Version Compatibility

- Storybook: 9.0.18
- React: 19.1.0
- TypeScript: 5.8.3

Note: There's a known compatibility warning with `@storybook/test@8.6.14` and Storybook 9.0.18, but this doesn't affect functionality.

## Contributing

When adding new components to the UI package:

1. Create a story file alongside your component
2. Include all variants and states
3. Add proper documentation
4. Test the story in Storybook
5. Update this documentation if needed

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Storybook Addons](https://storybook.js.org/addons)
- [Component Story Format](https://storybook.js.org/docs/formats/component-story-format) 