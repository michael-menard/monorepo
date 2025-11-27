# Typography - LEGO MOC Organization App

## Font Philosophy

### Design Approach
**"Clear, Friendly, and Systematic"** - Typography should feel like well-organized LEGO instruction manuals:
- **Highly Readable** - Easy to scan and read for long periods
- **Friendly but Professional** - Approachable without being childish
- **Systematic Hierarchy** - Clear information architecture
- **Technical Precision** - Accurate for inventory and technical details

## Primary Typeface

### Inter (Primary Font)
**Usage:** Body text, UI elements, data display, forms

**Characteristics:**
- Excellent readability at all sizes
- Designed specifically for user interfaces
- Great number legibility (important for piece counts, prices)
- Wide language support
- Variable font with precise weight control

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Font Weights:**
- **300 (Light)** - Subtle text, captions
- **400 (Regular)** - Body text, descriptions
- **500 (Medium)** - Emphasized text, labels
- **600 (Semi-Bold)** - Subheadings, important UI text
- **700 (Bold)** - Headings, strong emphasis
- **800 (Extra-Bold)** - Large headings, hero text

## Display Typeface

### Poppins (Display Font)
**Usage:** Headings, hero text, branding elements

**Characteristics:**
- Friendly, approachable personality
- Excellent for large sizes
- Geometric construction (echoes LEGO brick precision)
- Good contrast with Inter for hierarchy

```css
font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Font Weights:**
- **400 (Regular)** - Standard headings
- **500 (Medium)** - Emphasized headings
- **600 (Semi-Bold)** - Important headings
- **700 (Bold)** - Hero text, page titles

## Typography Scale

### Heading Hierarchy
```css
/* Hero Text */
.text-hero {
  font-family: 'Poppins', sans-serif;
  font-size: 3.75rem;    /* 60px */
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.025em;
}

/* H1 - Page Titles */
.text-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 3rem;       /* 48px */
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

/* H2 - Section Headings */
.text-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 2.25rem;    /* 36px */
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

/* H3 - Subsection Headings */
.text-h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 1.875rem;   /* 30px */
  font-weight: 500;
  line-height: 1.3;
}

/* H4 - Component Headings */
.text-h4 {
  font-family: 'Inter', sans-serif;
  font-size: 1.5rem;     /* 24px */
  font-weight: 600;
  line-height: 1.4;
}

/* H5 - Small Headings */
.text-h5 {
  font-family: 'Inter', sans-serif;
  font-size: 1.25rem;    /* 20px */
  font-weight: 600;
  line-height: 1.4;
}

/* H6 - Micro Headings */
.text-h6 {
  font-family: 'Inter', sans-serif;
  font-size: 1.125rem;   /* 18px */
  font-weight: 600;
  line-height: 1.4;
}
```

### Body Text Styles
```css
/* Large Body Text */
.text-lg {
  font-family: 'Inter', sans-serif;
  font-size: 1.125rem;   /* 18px */
  font-weight: 400;
  line-height: 1.6;
}

/* Regular Body Text */
.text-base {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;       /* 16px */
  font-weight: 400;
  line-height: 1.6;
}

/* Small Body Text */
.text-sm {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;   /* 14px */
  font-weight: 400;
  line-height: 1.5;
}

/* Extra Small Text */
.text-xs {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;    /* 12px */
  font-weight: 400;
  line-height: 1.4;
}
```

### Specialized Text Styles
```css
/* Labels and Form Text */
.text-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;   /* 14px */
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

/* Captions and Meta Text */
.text-caption {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;    /* 12px */
  font-weight: 400;
  line-height: 1.4;
  color: var(--color-neutral-600);
}

/* Numbers and Data */
.text-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;   /* 14px */
  font-weight: 400;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

/* Button Text */
.text-button {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;   /* 14px */
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.025em;
}
```

## Monospace Font (Technical Data)

### JetBrains Mono
**Usage:** Piece counts, prices, technical specifications, code

**Characteristics:**
- Excellent number alignment
- Clear distinction between similar characters
- Good for tabular data
- Maintains readability at small sizes

```css
font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
```

## Typography Usage Guidelines

### Content Hierarchy
1. **Hero/Page Title** - Poppins Bold, largest size
2. **Section Headings** - Poppins Semi-Bold, decreasing sizes
3. **Body Content** - Inter Regular, comfortable reading size
4. **UI Elements** - Inter Medium, optimized for interface
5. **Data/Numbers** - JetBrains Mono, tabular alignment

### Responsive Typography
```css
/* Mobile First Approach */
@media (max-width: 640px) {
  .text-hero { font-size: 2.5rem; }    /* 40px */
  .text-h1 { font-size: 2rem; }        /* 32px */
  .text-h2 { font-size: 1.75rem; }     /* 28px */
  .text-h3 { font-size: 1.5rem; }      /* 24px */
}

@media (min-width: 1024px) {
  .text-hero { font-size: 4rem; }      /* 64px */
  .text-h1 { font-size: 3.5rem; }      /* 56px */
}
```

### Accessibility Considerations
- **Minimum font size:** 14px for body text
- **Line height:** 1.5 minimum for readability
- **Color contrast:** 4.5:1 minimum for normal text
- **Font weight:** Avoid thin weights (100-200) for body text
- **Letter spacing:** Slight positive spacing for labels and buttons
 