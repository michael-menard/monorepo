# Shared Tailwind CSS Configuration

This monorepo uses a **globally shared Tailwind CSS configuration** that combines the design system tokens with shadcn/ui components.

## 🌍 **Global Setup Status**

✅ **FULLY GLOBAL** - The Tailwind configuration is now set up globally across the entire monorepo:

- **Root Configuration**: `tailwind.config.js` serves as the single source of truth
- **All Packages**: Every package extends the root configuration
- **Shared Styles**: `src/styles/globals.css` contains all design system variables
- **Consistent Tokens**: All packages use the same design system tokens

## 📁 **File Structure**

```
├── tailwind.config.js                    # 🌍 GLOBAL ROOT CONFIG
├── postcss.config.js                     # 🌍 GLOBAL POSTCSS CONFIG
├── src/styles/globals.css               # 🌍 GLOBAL SHARED STYLES
├── packages/ui/tailwind.config.js       # ✅ Extends root config
├── packages/auth/tailwind.config.js     # ✅ Extends root config
├── packages/profile/tailwind.config.js  # ✅ Extends root config
├── packages/moc/tailwind.config.js      # ✅ Extends root config
├── packages/features/Gallery/tailwind.config.js # ✅ Extends root config
└── packages/shared/tailwind.config.js   # 📋 Template for new packages
```

## 🚀 **Quick Setup for New Packages**

### Option 1: Use the Setup Script (Recommended)

```bash
node scripts/setup-tailwind.js <package-name>
```

### Option 2: Manual Setup

1. Create a `tailwind.config.js` file in your package:

```javascript
import rootConfig from '../../tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [rootConfig],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  theme: {
    extend: {
      // Package-specific extensions can go here
    },
  },
  plugins: [],
};
```

2. Import the shared styles in your main CSS file:

```css
@import '../../src/styles/globals.css';
```

## 🎨 **Available Design Tokens**

### Colors

**Accent Colors:**
- `blue`, `green`, `violet`, `orange`, `yellow`, `indigo`, `emerald`, `fuchsia`, `red`, `sky`, `pink`, `neutral`

**Gray Scale:**
- `gray-0` through `gray-1100`

**Dark Mode Grays:**
- `gray-dark-0` through `gray-dark-1100`

**Background Colors:**
- `bg-1` through `bg-10`

**System Colors:**
- `color-brands`, `neutral-bg`, `dark-neutral-bg`, `dark-neutral-border`

### Typography

**Headers:**
- `text-header-1` through `text-header-7`

**Body Text:**
- `text-normal`, `text-subtitle`, `text-subtitle-semibold`

**Button Labels:**
- `text-btn-label`, `text-mini-btn-label`

**Descriptions:**
- `text-desc`, `text-mini-desc`

### Utility Classes

**Typography Components:**
- `.header-1` through `.header-7`
- `.subtitle`, `.subtitle-semibold`
- `.btn-label`, `.mini-btn-label`
- `.desc`, `.mini-desc`

**Filters:**
- `.filter-black`, `.filter-white`

### Screen Breakpoints

- `xs: 500px` (custom breakpoint)

## 💡 **Example Usage**

```tsx
import React from 'react';

export function ExampleComponent() {
  return (
    <div className="bg-neutral-bg p-4">
      <h1 className="header-1 text-blue">Main Title</h1>
      <p className="text-normal text-gray-600">
        This uses the shared design system tokens.
      </p>
      <button className="bg-blue text-white px-4 py-2 rounded">
        Button with Design Tokens
      </button>
    </div>
  );
}
```

## 🌙 **Dark Mode**

The configuration supports dark mode using the `dark` class. Dark mode variables are automatically applied when the `dark` class is present on the HTML element.

## 🔧 **Customization**

To add package-specific styles:

1. Extend the theme in your package's `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      'package-specific': '#your-color',
    },
    fontSize: {
      'custom-size': ['18px', '24px'],
    },
  },
},
```

2. Add custom utilities in your CSS file:

```css
@layer utilities {
  .custom-utility {
    /* Your custom styles */
  }
}
```

## 📦 **Dependencies**

Make sure your package has these dependencies:

```json
{
  "devDependencies": {
    "tailwindcss": "^4.1.11",
    "tailwindcss-animate": "^1.0.7",
    "@tailwindcss/typography": "^0.5.16",
    "@tailwindcss/forms": "^0.5.10",
    "@tailwindcss/aspect-ratio": "^0.4.2",
    "@tailwindcss/container-queries": "^0.1.1"
  }
}
```

## ✅ **Verification**

To verify your Tailwind configuration is working:

1. Use the design tokens in your components
2. Check that dark mode works correctly
3. Verify that custom utilities are applied
4. Test responsive breakpoints

## 🔍 **Troubleshooting**

**Styles not applying:**
- Check that your `content` paths include your component files
- Verify that the shared CSS is imported
- Ensure your package extends the root config correctly

**Dark mode not working:**
- Check that the `dark` class is applied to the HTML element
- Verify dark mode variables are defined in the CSS

**Custom styles not working:**
- Ensure your custom styles are in the correct `@layer`
- Check that your Tailwind config extends the root config properly

## 🌟 **Benefits of Global Setup**

- **Consistency**: All packages use the same design tokens
- **Maintainability**: Single source of truth for design system
- **Performance**: Shared configuration reduces bundle size
- **Developer Experience**: Familiar tokens across all packages
- **Scalability**: Easy to add new packages with consistent styling 