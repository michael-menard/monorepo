# Components & Patterns - LEGO MOC Organization App

## Component Philosophy

### Design Approach

**"LEGO Cyberpunk Components"** - Every UI component should feel like a premium futuristic control panel element:

- **Translucent Surfaces** - Glassmorphism with backdrop blur
- **Glowing Borders** - Subtle colored accents on interactive states
- **Stable & Grounded** - No bouncy transforms, cards stay in place
- **Technical Precision** - Monospace fonts for data, clean typography

## Button Components

### Primary Button (Cyberpunk Style)

```css
.button-primary {
  @apply bg-sky-500 text-white px-6 py-3 rounded-md;
  @apply font-medium text-sm tracking-wide;
  @apply transition-colors duration-200;
  @apply hover:bg-sky-400;
  @apply focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-slate-900;
  /* NO transform on hover - buttons stay stable */
}

.button-primary:active {
  @apply bg-sky-600;
}
```

### Button Variants

```css
/* Secondary Button */
.button-secondary {
  @apply bg-slate-700 text-slate-100 hover:bg-slate-600;
}

/* Outline Button (Glow Border) */
.button-outline {
  @apply bg-transparent text-sky-400 border border-sky-500/50;
  @apply hover:bg-sky-500/10 hover:border-sky-400;
}

/* Ghost Button */
.button-ghost {
  @apply bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50;
}

/* Accent Button */
.button-accent {
  @apply bg-amber-500 text-slate-900 hover:bg-amber-400;
}

/* Button Sizes */
.button-sm {
  @apply px-4 py-2 text-xs;
}

.button-lg {
  @apply px-8 py-4 text-base;
}
```

## Card Components

### MOC Card (Glassmorphism - Hero Component)

```css
.moc-card {
  @apply bg-slate-900/50 backdrop-blur-sm rounded-lg overflow-hidden;
  @apply border border-slate-700/50;
  @apply transition-colors duration-200;
  /* NO box-shadow, NO transform - clean flat design */
}

/* IMPORTANT: Cards do NOT move on hover. Only border glow changes. */
.moc-card:hover {
  @apply border-sky-500/40;
  /* NO transform: translateY() */
  /* NO box-shadow changes */
}

/* Featured/Active Card Variant */
.moc-card-featured {
  @apply border-sky-500/30;
}

.moc-card-image {
  @apply w-full h-48 object-cover;
  @apply bg-slate-800;
}

.moc-card-content {
  @apply p-4;
}

.moc-card-title {
  @apply font-semibold text-lg text-slate-100;
  @apply mb-2 leading-tight;
}

.moc-card-meta {
  @apply flex justify-between items-center mb-3;
}

/* Technical data uses monospace */
.moc-card-pieces {
  @apply font-mono text-xs uppercase tracking-wider;
  @apply text-slate-400 bg-slate-800/50;
  @apply px-2 py-1 rounded;
}
```

### Tags (Pill Style)

```css
.moc-card-tags {
  @apply flex flex-wrap gap-1;
}

.moc-card-tag {
  @apply text-xs font-mono uppercase tracking-wider;
  @apply text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full;
}
```

### Stats Card (Metric Card - Cyberpunk)

```css
.stats-card {
  @apply bg-slate-800/50 rounded-lg p-4 relative overflow-hidden;
  @apply border border-slate-700/50;
}

/* Optional: Corner blur glow for emphasis */
.stats-card::after {
  content: '';
  @apply absolute -bottom-6 -right-6 h-16 w-16;
  @apply rounded-full bg-gradient-to-r from-sky-500 to-teal-500;
  @apply opacity-20 blur-xl;
}

.stats-number {
  @apply text-3xl font-bold text-slate-100;
  @apply bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text;
  @apply mb-1;
}

.stats-label {
  @apply font-mono text-xs uppercase tracking-wider;
  @apply text-slate-400;
}

.stats-icon {
  @apply h-5 w-5 text-sky-500;
}
```

## Form Components

### Input Fields (Cyberpunk Style)

```css
.input-field {
  @apply w-full px-4 py-3 rounded-md;
  @apply bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm;
  @apply text-slate-100 placeholder:text-slate-500;
  @apply transition-colors duration-200;
}

.input-field:focus {
  @apply outline-none;
  @apply border-sky-500/50 ring-1 ring-sky-500/30;
}

/* Input with Icon */
.input-with-icon {
  @apply relative;
}

.input-with-icon input {
  @apply pl-10;
}

.input-icon {
  @apply absolute left-3 top-1/2 -translate-y-1/2;
  @apply text-slate-500 w-4 h-4;
}
```

### Labels and Form Groups

```css
.form-label {
  @apply block text-sm font-medium text-slate-300;
  @apply mb-1.5;
}

.form-group {
  @apply mb-4;
}

.form-help-text {
  @apply text-xs text-slate-500 mt-1;
}

.form-error {
  @apply text-xs text-red-400 mt-1;
}
```

## Navigation Components

### Breadcrumbs

```css
.breadcrumbs {
  @apply flex items-center gap-2 text-sm text-slate-500 mb-4;
}

.breadcrumb-link {
  @apply text-sky-400 hover:text-sky-300 transition-colors;
}

.breadcrumb-separator {
  @apply text-slate-600;
}

.breadcrumb-current {
  @apply text-slate-300 font-medium;
}
```

### Tab Navigation

```css
.tab-nav {
  @apply flex border-b border-slate-700/50 mb-6;
}

.tab-button {
  @apply px-4 py-3 text-sm font-medium text-slate-500;
  @apply border-b-2 border-transparent;
  @apply transition-colors duration-200;
  @apply hover:text-slate-300;
}

.tab-button.active {
  @apply text-sky-400 border-sky-400;
}
```

## Badge and Tag Components

### Tags (Cyberpunk Style)

```css
.tag {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full;
  @apply text-xs font-mono uppercase tracking-wider;
}

/* Theme-based tag colors with glow borders */
.tag-castle {
  @apply bg-amber-500/10 text-amber-400 border border-amber-500/30;
}

.tag-space {
  @apply bg-slate-500/10 text-slate-300 border border-slate-500/30;
}

.tag-city {
  @apply bg-blue-500/10 text-blue-400 border border-blue-500/30;
}

.tag-creator {
  @apply bg-emerald-500/10 text-emerald-400 border border-emerald-500/30;
}

/* Status badges with glow effect */
.badge-success {
  @apply bg-emerald-500/10 text-emerald-400 border border-emerald-500/30;
}

.badge-warning {
  @apply bg-amber-500/10 text-amber-400 border border-amber-500/30;
}

.badge-error {
  @apply bg-red-500/10 text-red-400 border border-red-500/30;
}

/* Live status badge with pulsing dot */
.badge-live {
  @apply bg-slate-800/50 text-sky-400 border border-sky-500/50;
  @apply flex items-center gap-1.5;
}

.badge-live-dot {
  @apply h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse;
}
```

## Loading and State Components

### Loading Spinner (Cyberpunk Multi-Ring)

```css
/* Nested spinning rings - inspired by futuristic dashboard */
.loading-spinner-cyber {
  @apply relative w-16 h-16;
}

.loading-ring-1 {
  @apply absolute inset-0 border-4 border-sky-500/30 rounded-full animate-ping;
}

.loading-ring-2 {
  @apply absolute inset-2 rounded-full animate-spin;
  border: 4px solid transparent;
  border-top-color: theme('colors.sky.500');
}

.loading-ring-3 {
  @apply absolute inset-4 rounded-full;
  border: 4px solid transparent;
  border-right-color: theme('colors.violet.500');
  animation: spin-slow 3s linear infinite;
}

.loading-ring-4 {
  @apply absolute inset-6 rounded-full;
  border: 4px solid transparent;
  border-bottom-color: theme('colors.teal.500');
  animation: spin-slower 6s linear infinite reverse;
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-slower {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

/* Simple spinner for inline use */
.loading-spinner {
  @apply w-5 h-5 rounded-full animate-spin;
  border: 2px solid theme('colors.slate.700');
  border-top-color: theme('colors.sky.500');
}
```

### Progress Bar (Gradient Style)

```css
.progress-bar {
  @apply w-full h-2 bg-slate-800 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full rounded-full transition-all duration-300;
  @apply bg-gradient-to-r from-sky-400 to-teal-600;
}

/* Accent variant */
.progress-fill-accent {
  @apply bg-gradient-to-r from-amber-400 to-orange-500;
}

/* Success variant */
.progress-fill-success {
  @apply bg-gradient-to-r from-emerald-400 to-green-600;
}
```

## Component Usage Guidelines

### Consistency Rules

- ✅ Use `rounded-lg` (8px) for cards, `rounded-md` (6px) for buttons/inputs
- ✅ Apply glow border changes on hover, NOT transforms
- ✅ Use Tailwind color classes with opacity modifiers (e.g., `sky-500/30`)
- ✅ Include focus states with ring utilities for accessibility
- ✅ Use `backdrop-blur-sm` on all card surfaces

### Animation Principles

**✅ DO:**

- **Micro-animations** - SVG path reveals, checkmarks, icon transitions
- **State feedback** - Pulsing dots for live status, progress bar fills
- **Quick transitions** - 0.2s color/opacity changes
- **Framer Motion springs** - For success states and confirmations

**❌ DON'T:**

- **NO translateY on hover** - Cards stay grounded
- **NO rotate transforms** - Feels gimmicky, not premium
- **NO animated backgrounds** - Blobs, particles are too distracting
- **NO continuous ambient motion** - Only animate on interaction or state change

### Framer Motion Pattern (Success Animation)

```tsx
// Use for checkmarks, success states, icon reveals
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.2, type: 'spring', duration: 1.5, bounce: 0.2 },
      opacity: { delay: i * 0.2, duration: 0.2 },
    },
  }),
}
```
