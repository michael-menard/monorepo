# Local Tailwind CSS and shadcn/ui Configuration

This monorepo uses **local Tailwind CSS and shadcn/ui configurations** for each package and app that needs them.

## 🌍 **Local Setup Status**

✅ **LOCAL CONFIGURATION** - Each package and app manages its own Tailwind CSS and shadcn/ui setup:

- **Individual Configurations**: Each package has its own `tailwind.config.js`
- **Local Dependencies**: Each package installs its own Tailwind and shadcn dependencies
- **Independent Styles**: Each package manages its own CSS and design tokens
- **Flexible Setup**: Packages can choose their own styling approach

## 📁 **File Structure**

```
├── packages/ui/tailwind.config.js       # ✅ Local UI package config
├── packages/auth/tailwind.config.js     # ✅ Local auth package config
├── packages/features/gallery/tailwind.config.js # ✅ Local gallery config
├── packages/features/profile/tailwind.config.js # ✅ Local profile config
├── apps/web/lego-moc-instructions-app/tailwind.config.js # ✅ Local app config
└── [other packages with local configs]  # ✅ Each package manages its own setup
```

## 🚀 **Setup for New Packages**

### Step 1: Install Local Dependencies

```bash
cd packages/your-new-package
pnpm add -D tailwindcss
pnpm add -D @tailwindcss/typography @tailwindcss/forms @tailwindcss/aspect-ratio
```

### Step 2: Install shadcn/ui Dependencies (if needed)

```bash
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-label
# Add other Radix UI components as needed
```

### Step 3: Create Tailwind Configuration

Create a `tailwind.config.js` file in your package:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Add paths to other packages you want to include
  ],
  theme: {
    extend: {
      colors: {
        // Your package-specific colors
      },
      // Other theme extensions
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
```

### Step 4: No PostCSS Required

Tailwind CSS v4 does not require PostCSS configuration. The CSS processing is handled internally by Tailwind CSS v4.

### Step 5: Create CSS File

Create a `src/styles.css` or `src/globals.css` file:

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* Add your design tokens */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* Dark mode tokens */
  }
}
```

## 🎨 **shadcn/ui Setup**

### Step 1: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

### Step 2: Configure components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "src/components",
    "utils": "src/lib/utils"
  }
}
```

### Step 3: Add Components

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
# Add other components as needed
```

## 💡 **Example Usage**

```tsx
import React from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

export function ExampleComponent() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Local Package Component</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          This component uses local Tailwind and shadcn/ui setup.
        </p>
        <Button>Local Button</Button>
      </CardContent>
    </Card>
  );
}
```

## 🌙 **Dark Mode**

Each package can implement its own dark mode strategy:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

## 🔧 **Customization**

Each package can customize its own design system:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        'package-primary': '#your-color',
        'package-secondary': '#another-color',
      },
      fontSize: {
        'custom-size': ['18px', '24px'],
      },
    },
  },
};
```

## 📦 **Required Dependencies**

For Tailwind CSS:
```json
{
  "devDependencies": {
    "tailwindcss": "^4.1.11",
    "@tailwindcss/typography": "^0.5.16",
    "@tailwindcss/forms": "^0.5.10",
    "@tailwindcss/aspect-ratio": "^0.4.2"
  }
}
```

For shadcn/ui:
```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "lucide-react": "^0.468.0",
    "@radix-ui/react-slot": "^1.0.2"
  }
}
```

## ✅ **Verification**

To verify your local configuration is working:

1. Check that Tailwind classes are applied correctly
2. Verify that shadcn/ui components render properly
3. Test dark mode functionality
4. Ensure custom utilities work as expected

## 🔍 **Troubleshooting**

**Styles not applying:**
- Check that your `content` paths include your component files
- Verify that CSS is imported in your main entry point
- Ensure Tailwind CSS v4 is properly configured

**shadcn/ui components not working:**
- Check that all Radix UI dependencies are installed
- Verify the `components.json` configuration
- Ensure the utils file is properly set up

**Build issues:**
- Check that all dependencies are in the correct package
- Verify that Vite configuration is correct
- Ensure TypeScript types are properly configured

## 🌟 **Benefits of Local Setup**

- **Independence**: Each package manages its own styling
- **Flexibility**: Packages can use different styling approaches
- **Performance**: Only install dependencies where needed
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add new packages without affecting others 