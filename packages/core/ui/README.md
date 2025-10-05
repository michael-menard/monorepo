# UI Package - Design System Components

This package contains all shadcn/ui components styled with our custom Tailwind design system. All components are built on top of Radix UI primitives and styled using our design tokens.

## 🎨 Design System Integration

All components use our custom design system tokens defined in `src/styles/globals.css`:

- **Colors**: Custom color palette with semantic naming
- **Typography**: Consistent font scales and weights
- **Spacing**: Unified spacing system
- **Shadows**: Consistent elevation system
- **Border Radius**: Unified border radius values

## 📦 Available Components

### Core Components
- `Button` - Various button styles and variants
- `Card` - Container components for content organization
- `Input` - Text input fields
- `Label` - Form labels with proper accessibility
- `Badge` - Status indicators and tags
- `Avatar` - User profile images

### Form Components
- `Form` - Form wrapper with validation integration
- `Checkbox` - Checkbox input
- `RadioGroup` - Radio button groups
- `Select` - Dropdown select components
- `Switch` - Toggle switches
- `Textarea` - Multi-line text input
- `Slider` - Range slider input
- `Toggle` - Toggle buttons
- `ToggleGroup` - Grouped toggle buttons

### Interactive Components
- `Dialog` - Modal dialogs
- `AlertDialog` - Confirmation dialogs
- `DropdownMenu` - Dropdown menus
- `Popover` - Popover overlays
- `Tooltip` - Tooltip overlays
- `HoverCard` - Hover-triggered cards
- `Sheet` - Side panel overlays
- `ContextMenu` - Right-click context menus

### Navigation Components
- `NavigationMenu` - Main navigation menus
- `Menubar` - Application menu bars
- `Tabs` - Tabbed interfaces
- `Accordion` - Collapsible content sections
- `Collapsible` - Collapsible content

### Data Display Components
- `Table` - Data tables
- `Progress` - Progress indicators
- `Separator` - Visual separators
- `ScrollArea` - Custom scrollable areas

### Command Components
- `Command` - Command palette interface
- `Sonner` - Toast notifications (replaces deprecated toast)

## 🚀 Usage

### Basic Import
```tsx
import { Button, Card, Input } from '@your-org/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button>Click me</Button>
    </Card>
  );
}
```

### Component Showcase
To see all components in action, import and use the `ComponentShowcase`:

```tsx
import { ComponentShowcase } from '@your-org/ui';

function App() {
  return <ComponentShowcase />;
}
```

## 🎯 Design System Features

### Color Variants
All components support our design system color variants:
- `default` - Primary brand colors
- `secondary` - Secondary brand colors
- `destructive` - Error and warning states
- `outline` - Bordered variants
- `ghost` - Transparent variants
- `link` - Link-style variants

### Size Variants
Most components support multiple sizes:
- `sm` - Small
- `default` - Default size
- `lg` - Large
- `icon` - Icon-only (where applicable)

### Accessibility
All components are built with accessibility in mind:
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## 🔧 Customization

### Using Design Tokens
All components use CSS custom properties that can be customized:

```css
:root {
  --primary: #2775ff;
  --primary-foreground: #ffffff;
  --secondary: #f5f5fa;
  --secondary-foreground: #1a1a1a;
  /* ... more tokens */
}
```

### Extending Components
You can extend any component with additional styles:

```tsx
<Button className="bg-blue-500 hover:bg-blue-600">
  Custom Button
</Button>
```

### Dark Mode
All components support dark mode out of the box using the `dark` class:

```tsx
<div className="dark">
  <Button>Dark Mode Button</Button>
</div>
```

## 📚 Dependencies

This package depends on:
- `@radix-ui/react-*` - UI primitives
- `class-variance-authority` - Component variants
- `clsx` - Class name utilities
- `tailwind-merge` - Tailwind class merging
- `tailwindcss-animate` - Animation utilities

## 🧪 Testing

All components include comprehensive tests in the `__tests__` directory. Run tests with:

```bash
pnpm test
```

## 📖 Documentation

For detailed component documentation, visit:
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)

## 🤝 Contributing

When adding new components:
1. Use `npx shadcn@latest add <component-name>` to install
2. Update the exports in `src/index.ts`
3. Add tests in `__tests__/`
4. Update this README with component documentation 