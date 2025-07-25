# Storybook Setup

This monorepo uses a **centralized Storybook** setup to showcase and test all UI components across different packages.

## 🚀 Quick Start

### Start Storybook
```bash
pnpm storybook
```
Storybook will be available at: http://localhost:6006

### Build Storybook for Production
```bash
pnpm build-storybook
```

## 📁 Structure

The centralized Storybook is configured to find stories in:
- `packages/web/*/src/**/*.stories.@(js|jsx|ts|tsx)` - All web packages
- `packages/ui/src/**/*.stories.@(js|jsx|ts|tsx)` - UI components
- `packages/auth/src/**/*.stories.@(js|jsx|ts|tsx)` - Auth components
- `stories/**/*.stories.@(js|jsx|ts|tsx)` - Root-level stories

## 📝 Adding Stories

### For a New Component
1. Create a story file in your component's directory: `ComponentName.stories.tsx`
2. Use the following template:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import YourComponent from './index';

const meta: Meta<typeof YourComponent> = {
  title: 'Components/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    // Define your props here
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Your default props
  },
};
```

### Available Addons
- **@storybook/addon-docs** - Automatic documentation
- **@storybook/addon-a11y** - Accessibility testing
- **@chromatic-com/storybook** - Visual testing (optional)

## 🎨 Best Practices

1. **Component Organization**: Group related components under meaningful titles
2. **Props Documentation**: Use `argTypes` to document and control props
3. **Accessibility**: Use the a11y addon to test accessibility
4. **Visual Testing**: Consider using Chromatic for visual regression testing

## 🔧 Configuration

Storybook configuration is in `.storybook/`:
- `main.ts` - Story discovery and addon configuration
- `preview.ts` - Global parameters and decorators

## 📦 Included Packages

Currently configured to include stories from:
- `packages/web/avatar-uploader/` - Avatar upload component
- `packages/web/file-upload/` - File upload components
- `packages/ui/` - Shared UI components
- `packages/auth/` - Authentication components

## 🚨 Troubleshooting

If Storybook fails to start:
1. Check that all dependencies are installed: `pnpm install`
2. Verify the `.storybook/main.ts` configuration
3. Check for TypeScript errors in your stories
4. Ensure your component exports are correct 