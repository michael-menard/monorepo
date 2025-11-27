# Components & Patterns - LEGO MOC Organization App

## Component Philosophy

### Design Approach
**"LEGO Brick Components"** - Every UI component should feel like a well-designed LEGO element:
- **Modular & Reusable** - Components combine like LEGO bricks
- **Consistent Connections** - Predictable interaction patterns
- **Quality Construction** - Robust, accessible, and delightful
- **Systematic Variations** - Size and color variants like LEGO sets

## Button Components

### Primary Button (LEGO Brick Inspired)
```css
.button-primary {
  background: var(--color-primary-500);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* LEGO brick-like shadow */
  box-shadow: 
    0 2px 4px rgba(239, 68, 68, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.1);
}

.button-primary:hover {
  background: var(--color-primary-600);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 8px rgba(239, 68, 68, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.15);
}

.button-primary:active {
  transform: translateY(0);
  box-shadow: 
    0 1px 2px rgba(239, 68, 68, 0.2),
    0 1px 1px rgba(0, 0, 0, 0.1);
}
```

### Button Variants
```css
/* Secondary Button */
.button-secondary {
  background: var(--color-secondary-500);
  color: white;
  /* Same structure as primary */
}

/* Outline Button */
.button-outline {
  background: transparent;
  color: var(--color-primary-500);
  border: 2px solid var(--color-primary-500);
}

/* Ghost Button */
.button-ghost {
  background: transparent;
  color: var(--color-neutral-700);
  border: none;
  box-shadow: none;
}

/* Button Sizes */
.button-sm {
  padding: var(--space-2) var(--space-4);
  font-size: 0.75rem;
}

.button-lg {
  padding: var(--space-4) var(--space-8);
  font-size: 1rem;
}
```

## Card Components

### MOC Card (Hero Component)
```css
.moc-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--color-neutral-200);
  
  /* Subtle LEGO brick elevation */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
}

.moc-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-200);
}

.moc-card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: var(--color-neutral-100);
}

.moc-card-content {
  padding: var(--space-4);
}

.moc-card-title {
  font-family: 'Poppins', sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-2);
  line-height: 1.3;
}

.moc-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.moc-card-pieces {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
}

.moc-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
```

### Stats Card
```css
.stats-card {
  background: white;
  padding: var(--space-6);
  border-radius: 12px;
  border: 1px solid var(--color-neutral-200);
  text-align: center;
}

.stats-number {
  font-family: 'Poppins', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-primary-500);
  line-height: 1;
  margin-bottom: var(--space-2);
}

.stats-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## Form Components

### Input Fields
```css
.input-field {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-neutral-300);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-field::placeholder {
  color: var(--color-neutral-500);
}

/* Input with Icon */
.input-with-icon {
  position: relative;
}

.input-with-icon input {
  padding-left: var(--space-10); /* Space for icon */
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-500);
  width: 16px;
  height: 16px;
}
```

### Labels and Form Groups
```css
.form-label {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
  margin-bottom: var(--space-1);
  letter-spacing: 0.025em;
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-help-text {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  margin-top: var(--space-1);
  line-height: 1.4;
}

.form-error {
  color: var(--color-error-600);
  font-size: 0.75rem;
  margin-top: var(--space-1);
}
```

## Navigation Components

### Breadcrumbs
```css
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin-bottom: var(--space-4);
}

.breadcrumb-link {
  color: var(--color-primary-500);
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: var(--color-primary-600);
}

.breadcrumb-separator {
  color: var(--color-neutral-400);
}

.breadcrumb-current {
  color: var(--color-neutral-900);
  font-weight: 500;
}
```

### Tab Navigation
```css
.tab-nav {
  display: flex;
  border-bottom: 2px solid var(--color-neutral-200);
  margin-bottom: var(--space-6);
}

.tab-button {
  padding: var(--space-3) var(--space-4);
  border: none;
  background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--color-neutral-900);
}

.tab-button.active {
  color: var(--color-primary-500);
  border-bottom-color: var(--color-primary-500);
}
```

## Badge and Tag Components

### Tags (LEGO Color-Coded)
```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Theme-based tag colors */
.tag-castle {
  background: rgba(146, 64, 14, 0.1);
  color: var(--color-castle-brown);
}

.tag-space {
  background: rgba(107, 114, 128, 0.1);
  color: var(--color-space-silver);
}

.tag-city {
  background: rgba(30, 64, 175, 0.1);
  color: var(--color-city-blue);
}

.tag-creator {
  background: rgba(5, 150, 105, 0.1);
  color: var(--color-creator-green);
}

/* Status badges */
.badge-success {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.badge-warning {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.badge-error {
  background: var(--color-error-100);
  color: var(--color-error-700);
}
```

## Loading and State Components

### Loading Spinner (LEGO Brick Inspired)
```css
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-neutral-200);
  border-top: 3px solid var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* LEGO brick loading animation */
.loading-bricks {
  display: flex;
  gap: var(--space-1);
}

.loading-brick {
  width: 8px;
  height: 8px;
  background: var(--color-primary-500);
  border-radius: 2px;
  animation: brick-bounce 1.4s ease-in-out infinite both;
}

.loading-brick:nth-child(1) { animation-delay: -0.32s; }
.loading-brick:nth-child(2) { animation-delay: -0.16s; }
.loading-brick:nth-child(3) { animation-delay: 0s; }

@keyframes brick-bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
```

### Progress Bar
```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, 
    var(--color-primary-500) 0%, 
    var(--color-secondary-500) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}
```

## Component Usage Guidelines

### Consistency Rules
- ✅ Use consistent border-radius (8px for most, 12px for cards)
- ✅ Apply consistent hover states (slight elevation + color change)
- ✅ Use semantic color variables, not hardcoded values
- ✅ Include focus states for accessibility
- ✅ Test components at different sizes

### Animation Principles
- **Subtle Movement** - Small transforms (1-2px) for hover states
- **Quick Transitions** - 0.2s for most interactions
- **Easing** - Use `ease` or `ease-out` for natural feel
- **Purpose-Driven** - Animations should provide feedback or guide attention
