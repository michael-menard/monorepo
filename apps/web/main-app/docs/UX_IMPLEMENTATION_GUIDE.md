# UX Implementation Guidelines & Design Tokens

## LEGO Design System Specifications

### 🎨 **Design Tokens**

#### **Color Palette**
```css
/* Primary LEGO Colors */
--color-primary: #0ea5e9;           /* LEGO Teal */
--color-primary-foreground: #ffffff;
--color-primary-hover: #0284c7;
--color-primary-active: #0369a1;

/* Secondary Colors */
--color-secondary: #64748b;         /* LEGO Gray */
--color-secondary-foreground: #ffffff;
--color-accent: #f59e0b;            /* LEGO Yellow */
--color-accent-foreground: #1f2937;

/* Status Colors */
--color-success: #10b981;           /* LEGO Green */
--color-warning: #f59e0b;           /* LEGO Yellow */
--color-error: #ef4444;             /* LEGO Red */
--color-info: #3b82f6;              /* LEGO Blue */
```

#### **Typography Scale**
```css
/* Font Family */
--font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes (8px base scale) */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### **Spacing System (8px Grid)**
```css
/* Base unit: 8px */
--space-1: 0.125rem;   /* 2px */
--space-2: 0.25rem;    /* 4px */
--space-4: 0.5rem;     /* 8px */
--space-6: 0.75rem;    /* 12px */
--space-8: 1rem;       /* 16px */
--space-12: 1.5rem;    /* 24px */
--space-16: 2rem;      /* 32px */
--space-20: 2.5rem;    /* 40px */
--space-24: 3rem;      /* 48px */
--space-32: 4rem;      /* 64px */
```

#### **Border Radius (LEGO Brick Inspired)**
```css
--radius-sm: 0.125rem;   /* 2px - Subtle curves */
--radius-md: 0.375rem;   /* 6px - Standard LEGO brick */
--radius-lg: 0.5rem;     /* 8px - Larger elements */
--radius-xl: 0.75rem;    /* 12px - Cards and containers */
--radius-full: 9999px;   /* Full circle - LEGO studs */
```

### 🧱 **LEGO Micro-Interaction Patterns**

#### **LEGO Snap Feedback**
```typescript
// Button click animation
const legoSnapAnimation = {
  scale: [1, 0.95, 1.02, 1],
  transition: { duration: 0.2, ease: "easeInOut" }
}

// Usage in components
<Button
  whileTap={legoSnapAnimation}
  className="bg-primary hover:bg-primary-hover"
>
  Add to Wishlist
</Button>
```

#### **LEGO Brick Hover Animation**
```css
.lego-brick-hover {
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.lego-brick-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}
```

#### **LEGO Building Loading Animation**
```css
@keyframes lego-build {
  0% { transform: translateY(20px); opacity: 0; }
  50% { transform: translateY(-5px); opacity: 0.8; }
  100% { transform: translateY(0); opacity: 1; }
}

.lego-build-animation {
  animation: lego-build 0.6s ease-out forwards;
}
```

### 📱 **Mobile UX Patterns**

#### **Touch Target Standards**
```css
/* Minimum touch target size */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

/* Touch-friendly spacing */
.touch-spacing {
  margin: 8px 0;
  gap: 16px;
}
```

#### **Swipe Gesture Implementation**
```typescript
// Gallery swipe navigation
const swipeHandlers = useSwipeable({
  onSwipedLeft: () => nextImage(),
  onSwipedRight: () => previousImage(),
  trackMouse: true,
  delta: 50
})

<div {...swipeHandlers} className="gallery-container">
  {/* Gallery content */}
</div>
```

### ♿ **Accessibility Implementation Checklist**

#### **WCAG 2.1 AA Requirements**
- [ ] **Color Contrast** - 4.5:1 for normal text, 3:1 for large text
- [ ] **Focus Indicators** - Visible focus rings on all interactive elements
- [ ] **Keyboard Navigation** - Tab order logical, all functions accessible
- [ ] **Screen Reader Support** - Proper ARIA labels and landmarks
- [ ] **Alternative Text** - Descriptive alt text for all images
- [ ] **Form Labels** - Associated labels for all form inputs
- [ ] **Error Messages** - Clear, descriptive error messaging

#### **ARIA Implementation Patterns**
```tsx
// Navigation landmark
<nav aria-label="Main navigation" role="navigation">
  <ul role="menubar">
    <li role="none">
      <a href="/gallery" role="menuitem" aria-current="page">
        Gallery
      </a>
    </li>
  </ul>
</nav>

// Loading states
<div role="status" aria-live="polite" aria-label="Loading gallery">
  <LoadingSpinner />
  <span className="sr-only">Loading gallery items...</span>
</div>

// Form validation
<input
  aria-describedby="email-error"
  aria-invalid={hasError}
  aria-required="true"
/>
{hasError && (
  <div id="email-error" role="alert" className="text-error">
    Please enter a valid email address
  </div>
)}
```

### 🎯 **Component Implementation Examples**

#### **LEGO-Inspired Button Component**
```tsx
interface LegoButtonProps {
  variant: 'primary' | 'secondary' | 'accent'
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
}

export function LegoButton({ variant, size, children, onClick }: LegoButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={cn(
        'font-medium rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'shadow-sm hover:shadow-md active:shadow-sm',
        {
          'bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary': variant === 'secondary',
          'bg-accent text-accent-foreground hover:bg-accent/80 focus:ring-accent': variant === 'accent',
          'px-3 py-2 text-sm min-h-[36px]': size === 'sm',
          'px-4 py-3 text-base min-h-[44px]': size === 'md',
          'px-6 py-4 text-lg min-h-[52px]': size === 'lg',
        }
      )}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}
```

#### **LEGO Priority Indicator Component**
```tsx
interface LegoPriorityProps {
  priority: 'high' | 'medium' | 'low'
  size?: 'sm' | 'md' | 'lg'
}

export function LegoPriorityIndicator({ priority, size = 'md' }: LegoPriorityProps) {
  const colors = {
    high: 'bg-error',
    medium: 'bg-warning', 
    low: 'bg-success'
  }
  
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  }

  return (
    <div
      className={cn(
        'rounded-full border-2 border-white shadow-sm',
        colors[priority],
        sizes[size]
      )}
      role="img"
      aria-label={`${priority} priority`}
      title={`Priority: ${priority}`}
    />
  )
}
```

### 📐 **Layout Grid System**
```css
/* 8px Grid Container */
.lego-grid {
  display: grid;
  gap: 16px; /* 2 * 8px */
  padding: 24px; /* 3 * 8px */
}

/* Responsive Grid */
.lego-grid-responsive {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

/* Card Layout */
.lego-card {
  padding: 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}
```

---

**UX Implementation Guidelines Complete** - Comprehensive design system specifications, accessibility patterns, and component examples ready for migration implementation.
