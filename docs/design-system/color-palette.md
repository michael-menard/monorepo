# Color Palette - LEGO MOC Organization App

## Primary Color Palette

### LEGO Brick Red (Primary)
```css
--color-primary-50:  #fef2f2   /* Lightest tint */
--color-primary-100: #fee2e2   /* Light tint */
--color-primary-200: #fecaca   /* Soft tint */
--color-primary-300: #fca5a5   /* Medium tint */
--color-primary-400: #f87171   /* Light */
--color-primary-500: #ef4444   /* Base - Classic LEGO Red */
--color-primary-600: #dc2626   /* Medium */
--color-primary-700: #b91c1c   /* Dark */
--color-primary-800: #991b1b   /* Darker */
--color-primary-900: #7f1d1d   /* Darkest */
```

**Usage:** Primary actions, important buttons, brand elements, active states

### LEGO Brick Blue (Secondary)
```css
--color-secondary-50:  #eff6ff   /* Lightest tint */
--color-secondary-100: #dbeafe   /* Light tint */
--color-secondary-200: #bfdbfe   /* Soft tint */
--color-secondary-300: #93c5fd   /* Medium tint */
--color-secondary-400: #60a5fa   /* Light */
--color-secondary-500: #3b82f6   /* Base - Classic LEGO Blue */
--color-secondary-600: #2563eb   /* Medium */
--color-secondary-700: #1d4ed8   /* Dark */
--color-secondary-800: #1e40af   /* Darker */
--color-secondary-900: #1e3a8a   /* Darkest */
```

**Usage:** Secondary actions, links, informational elements, navigation

## LEGO-Inspired Accent Colors

### Bright Yellow (Highlight)
```css
--color-yellow-50:  #fefce8   /* Lightest */
--color-yellow-100: #fef3c7   /* Light */
--color-yellow-200: #fde68a   /* Soft */
--color-yellow-300: #fcd34d   /* Medium */
--color-yellow-400: #fbbf24   /* Light */
--color-yellow-500: #f59e0b   /* Base - LEGO Yellow */
--color-yellow-600: #d97706   /* Medium */
--color-yellow-700: #b45309   /* Dark */
--color-yellow-800: #92400e   /* Darker */
--color-yellow-900: #78350f   /* Darkest */
```

**Usage:** Highlights, warnings, featured content, AI-powered features

### LEGO Green (Success)
```css
--color-green-50:  #f0fdf4   /* Lightest */
--color-green-100: #dcfce7   /* Light */
--color-green-200: #bbf7d0   /* Soft */
--color-green-300: #86efac   /* Medium */
--color-green-400: #4ade80   /* Light */
--color-green-500: #22c55e   /* Base - LEGO Green */
--color-green-600: #16a34a   /* Medium */
--color-green-700: #15803d   /* Dark */
--color-green-800: #166534   /* Darker */
--color-green-900: #14532d   /* Darkest */
```

**Usage:** Success states, completed actions, positive feedback

### LEGO Orange (Energy)
```css
--color-orange-50:  #fff7ed   /* Lightest */
--color-orange-100: #ffedd5   /* Light */
--color-orange-200: #fed7aa   /* Soft */
--color-orange-300: #fdba74   /* Medium */
--color-orange-400: #fb923c   /* Light */
--color-orange-500: #f97316   /* Base - LEGO Orange */
--color-orange-600: #ea580c   /* Medium */
--color-orange-700: #c2410c   /* Dark */
--color-orange-800: #9a3412   /* Darker */
--color-orange-900: #7c2d12   /* Darkest */
```

**Usage:** Call-to-action elements, energy/excitement, upload features

## Neutral Palette (Foundation)

### Warm Grays (LEGO Baseplate Inspired)
```css
--color-neutral-50:  #fafaf9   /* Almost white */
--color-neutral-100: #f5f5f4   /* Light gray */
--color-neutral-200: #e7e5e4   /* Soft gray */
--color-neutral-300: #d6d3d1   /* Medium light */
--color-neutral-400: #a8a29e   /* Medium */
--color-neutral-500: #78716c   /* Base gray */
--color-neutral-600: #57534e   /* Medium dark */
--color-neutral-700: #44403c   /* Dark */
--color-neutral-800: #292524   /* Darker */
--color-neutral-900: #1c1917   /* Almost black */
```

**Usage:** Text, backgrounds, borders, subtle UI elements

## Semantic Colors

### Error/Danger
```css
--color-error-50:  #fef2f2
--color-error-500: #ef4444   /* Same as primary red */
--color-error-600: #dc2626
--color-error-700: #b91c1c
```

### Warning
```css
--color-warning-50:  #fefce8
--color-warning-500: #f59e0b   /* Same as yellow */
--color-warning-600: #d97706
--color-warning-700: #b45309
```

### Info
```css
--color-info-50:  #eff6ff
--color-info-500: #3b82f6   /* Same as secondary blue */
--color-info-600: #2563eb
--color-info-700: #1d4ed8
```

### Success
```css
--color-success-50:  #f0fdf4
--color-success-500: #22c55e   /* Same as green */
--color-success-600: #16a34a
--color-success-700: #15803d
```

## Special Use Colors

### AI/Technology Features
```css
--color-ai-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--color-tech-purple: #8b5cf6
--color-tech-cyan: #06b6d4
```

### LEGO Theme Colors (for categorization)
```css
--color-castle-brown: #92400e
--color-space-silver: #6b7280
--color-city-blue: #1e40af
--color-creator-green: #059669
--color-technic-black: #1f2937
```

## Usage Guidelines

### Color Hierarchy
1. **Primary Red** - Most important actions and brand elements
2. **Secondary Blue** - Secondary actions and navigation
3. **Accent Colors** - Highlights, categories, and special features
4. **Neutrals** - Text, backgrounds, and structural elements

### Accessibility Requirements
- **Text on Primary:** Use white text (contrast ratio 4.8:1)
- **Text on Secondary:** Use white text (contrast ratio 4.6:1)
- **Text on Light Backgrounds:** Use neutral-800 or darker
- **Text on Dark Backgrounds:** Use neutral-100 or lighter

### Color Combinations
**Recommended Pairings:**
- Primary Red + Neutral backgrounds
- Secondary Blue + Yellow accents
- Green success + Neutral text
- Orange energy + Blue secondary

**Avoid:**
- Red + Green (accessibility issues)
- Yellow text on white backgrounds
- Multiple bright colors together
