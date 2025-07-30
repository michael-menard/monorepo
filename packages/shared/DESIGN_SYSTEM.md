# Design System Setup

This monorepo uses a centralized design system with a beautiful, nature-inspired color palette to maintain consistent styling across all apps and packages.

## Color Palette

The design system features a carefully crafted color palette inspired by natural elements:

### Primary Colors
- **Primary**: Forest Green (`#47624E` / `hsl(120 15% 33%)`) - Represents growth and stability
- **Secondary**: Warm Brown (`#B07E5B` / `hsl(25 40% 52%)`) - Represents earth and warmth
- **Tertiary**: Ocean Blue (`#487D85` / `hsl(190 30% 40%)`) - Represents depth and calm

### Semantic Colors
- **Success**: Emerald Green (`#3D9B74` / `hsl(160 50% 40%)`) - For positive actions
- **Warning**: Golden Yellow (`#E0B64A` / `hsl(45 70% 60%)`) - For caution states
- **Error**: Coral Red (`#B14D4D` / `hsl(0 50% 50%)`) - For error states
- **Info**: Steel Blue (`#567D99` / `hsl(210 30% 45%)`) - For informational content

### Surface Colors
- **Background**: Warm Cream (`#F7F5F2` / `hsl(40 20% 97%)`) - Main background
- **Foreground**: Deep Charcoal (`#1A1A1A` / `hsl(0 0% 10%)`) - Main text
- **Muted**: Soft Beige (`#DCD3C2` / `hsl(35 25% 85%)`) - Subtle backgrounds

## Structure

```
packages/shared/
├── src/
│   ├── design-tokens.css    # Centralized CSS custom properties
│   ├── tailwind-preset.js   # Shared Tailwind configuration
│   └── design-system.ts     # TypeScript exports
```

## How It Works

### 1. Centralized Design Tokens
All CSS custom properties (CSS variables) are defined in `packages/shared/src/design-tokens.css`. This includes:
- Color tokens (light and dark themes)
- Border radius values
- Typography settings
- Utility classes

### 2. Apps Import Design Tokens
Each app imports the design tokens in their main CSS file:

```css
@import "tailwindcss";
@import "../../../packages/shared/src/design-tokens.css";
```

### 3. Apps Use Shared Tailwind Preset
Each app's `tailwind.config.js` extends the shared preset:

```javascript
import sharedPreset from '../../../packages/shared/src/tailwind-preset.js';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
    '../../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [sharedPreset],
  plugins: [],
};
```

### 4. Packages Inherit from Apps
Packages (like `packages/ui`) also use the shared preset, but they automatically inherit the design tokens from whatever app is consuming them. This means:
- No hardcoded values in packages
- Packages automatically use the app's theme
- Consistent styling across the entire monorepo

## Benefits

1. **Single Source of Truth**: Design tokens are defined once in `packages/shared`
2. **No Duplication**: Apps and packages don't need to duplicate theme configurations
3. **Easy Updates**: Change design tokens in one place to update the entire system
4. **App Flexibility**: Apps can override tokens if needed while packages inherit automatically
5. **Consistent Theming**: All components use the same design tokens

## Usage

### Adding New Design Tokens
1. Add the token to `packages/shared/src/design-tokens.css`
2. Add the corresponding Tailwind configuration to `packages/shared/src/tailwind-preset.js`
3. All apps and packages will automatically have access to the new token

### Overriding Tokens in an App
If an app needs custom tokens, it can override them in its CSS file:

```css
@import "tailwindcss";
@import "../../../packages/shared/src/design-tokens.css";

/* Override specific tokens for this app */
:root {
  --primary: 220 14% 96%; /* Custom primary color */
}
```

### Adding New Apps
1. Create the app's CSS file and import the design tokens
2. Create `tailwind.config.js` that uses the shared preset
3. The app will automatically have access to all design tokens

## File Locations

- **Design Tokens**: `packages/shared/src/design-tokens.css`
- **Tailwind Preset**: `packages/shared/src/tailwind-preset.js`
- **TypeScript Exports**: `packages/shared/src/design-system.ts` 