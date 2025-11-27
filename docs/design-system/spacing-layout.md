# Spacing & Layout - LEGO MOC Organization App

## Spacing Philosophy

### Design Approach
**"8px Grid System"** - Like LEGO bricks that connect on a systematic grid, all spacing should follow consistent mathematical relationships:
- **Predictable Rhythm** - Consistent spacing creates visual harmony
- **Scalable System** - Works from mobile to desktop
- **LEGO-Inspired** - Spacing feels like organized LEGO brick arrangements
- **Breathing Room** - Generous whitespace for comfortable viewing

## Base Spacing Scale

### 8px Grid System
All spacing values are multiples of 8px for perfect alignment and consistency:

```css
/* Spacing Scale */
--space-0:   0px      /* 0 */
--space-1:   4px      /* 0.25rem */
--space-2:   8px      /* 0.5rem */  ← Base unit
--space-3:   12px     /* 0.75rem */
--space-4:   16px     /* 1rem */
--space-5:   20px     /* 1.25rem */
--space-6:   24px     /* 1.5rem */
--space-8:   32px     /* 2rem */
--space-10:  40px     /* 2.5rem */
--space-12:  48px     /* 3rem */
--space-16:  64px     /* 4rem */
--space-20:  80px     /* 5rem */
--space-24:  96px     /* 6rem */
--space-32:  128px    /* 8rem */
--space-40:  160px    /* 10rem */
--space-48:  192px    /* 12rem */
--space-64:  256px    /* 16rem */
```

### Semantic Spacing
```css
/* Component Spacing */
--space-xs:    4px    /* Tight spacing within components */
--space-sm:    8px    /* Small gaps, related elements */
--space-md:    16px   /* Standard spacing, most common */
--space-lg:    24px   /* Larger gaps, section separation */
--space-xl:    32px   /* Large spacing, major sections */
--space-2xl:   48px   /* Extra large, page sections */
--space-3xl:   64px   /* Hero sections, major breaks */
```

## Layout Grid System

### Container Widths
```css
/* Container Sizes */
--container-sm:   640px   /* Small screens */
--container-md:   768px   /* Medium screens */
--container-lg:   1024px  /* Large screens */
--container-xl:   1280px  /* Extra large screens */
--container-2xl:  1536px  /* 2X large screens */

/* Content Widths */
--content-narrow:  65ch   /* Optimal reading width */
--content-wide:    85ch   /* Wider content areas */
```

### Grid Layouts
```css
/* Gallery Grid (MOC Cards) */
.grid-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

/* Dashboard Grid */
.grid-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-8);
}

/* Form Grid */
.grid-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid-form {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
}
```

## Component Spacing

### Card Spacing
```css
.card {
  padding: var(--space-6);        /* 24px internal padding */
  margin-bottom: var(--space-4);  /* 16px between cards */
  border-radius: 12px;            /* Rounded like LEGO bricks */
}

.card-compact {
  padding: var(--space-4);        /* 16px for smaller cards */
}

.card-spacious {
  padding: var(--space-8);        /* 32px for feature cards */
}
```

### Button Spacing
```css
.button {
  padding: var(--space-3) var(--space-6);  /* 12px vertical, 24px horizontal */
  margin-right: var(--space-2);            /* 8px between buttons */
}

.button-sm {
  padding: var(--space-2) var(--space-4);  /* 8px vertical, 16px horizontal */
}

.button-lg {
  padding: var(--space-4) var(--space-8);  /* 16px vertical, 32px horizontal */
}
```

### Form Spacing
```css
.form-group {
  margin-bottom: var(--space-4);   /* 16px between form fields */
}

.form-section {
  margin-bottom: var(--space-8);   /* 32px between form sections */
}

.form-label {
  margin-bottom: var(--space-1);   /* 4px between label and input */
}
```

## Page Layout Structure

### Standard Page Layout
```css
.page-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  gap: 0;
}

.page-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-neutral-200);
}

.page-content {
  padding: var(--space-6);
  max-width: var(--container-xl);
  margin: 0 auto;
  width: 100%;
}

.page-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-neutral-200);
}
```

### Shell Layout (Main App)
```css
.shell-layout {
  display: grid;
  grid-template-areas: 
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.shell-header {
  grid-area: header;
  padding: var(--space-4) var(--space-6);
}

.shell-sidebar {
  grid-area: sidebar;
  padding: var(--space-6);
  background: var(--color-neutral-50);
}

.shell-main {
  grid-area: main;
  padding: var(--space-6);
  overflow-y: auto;
}

.shell-footer {
  grid-area: footer;
  padding: var(--space-4) var(--space-6);
}

/* Mobile Layout */
@media (max-width: 768px) {
  .shell-layout {
    grid-template-areas: 
      "header"
      "main"
      "footer";
    grid-template-columns: 1fr;
  }
  
  .shell-sidebar {
    display: none; /* Hidden on mobile, shown via overlay */
  }
}
```

## Responsive Spacing

### Mobile-First Approach
```css
/* Base (Mobile) Spacing */
.section-spacing {
  padding: var(--space-4);        /* 16px on mobile */
  margin-bottom: var(--space-6);  /* 24px between sections */
}

/* Tablet Spacing */
@media (min-width: 768px) {
  .section-spacing {
    padding: var(--space-6);       /* 24px on tablet */
    margin-bottom: var(--space-8); /* 32px between sections */
  }
}

/* Desktop Spacing */
@media (min-width: 1024px) {
  .section-spacing {
    padding: var(--space-8);       /* 32px on desktop */
    margin-bottom: var(--space-10); /* 40px between sections */
  }
}
```

### Content Spacing
```css
/* Text Content Spacing */
.content-spacing h1,
.content-spacing h2,
.content-spacing h3 {
  margin-top: var(--space-8);     /* 32px above headings */
  margin-bottom: var(--space-4);  /* 16px below headings */
}

.content-spacing p,
.content-spacing ul,
.content-spacing ol {
  margin-bottom: var(--space-4);  /* 16px between paragraphs */
}

.content-spacing li {
  margin-bottom: var(--space-1);  /* 4px between list items */
}
```

## Special Layout Patterns

### MOC Card Grid
```css
.moc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
  padding: var(--space-6);
}

@media (max-width: 640px) {
  .moc-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: var(--space-4);
  }
}
```

### Dashboard Stats
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}
```

## Spacing Guidelines

### Do's
- ✅ Use multiples of 8px for all spacing
- ✅ Be consistent with spacing patterns
- ✅ Use semantic spacing variables
- ✅ Test spacing on different screen sizes
- ✅ Provide generous whitespace for readability

### Don'ts
- ❌ Use arbitrary spacing values
- ❌ Cram too much content together
- ❌ Ignore mobile spacing needs
- ❌ Mix different spacing systems
- ❌ Forget about touch target sizes (44px minimum)
