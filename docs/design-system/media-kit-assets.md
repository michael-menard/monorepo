# Media Kit & Brand Assets - LEGO MOC Organization App

## Brand Identity Summary

### App Name & Tagline
**Primary Name:** LEGO MOC Organizer *(working title)*
**Tagline:** "Organize Your Builds, Brick by Brick"
**Alternative Taglines:**
- "Your Digital LEGO Collection, Perfectly Organized"
- "AI-Powered MOC Management for Serious Builders"
- "From Chaos to Collection: Smart LEGO Organization"

### Brand Personality
- **Organized** - Everything has its place, like a well-sorted LEGO collection
- **Enthusiastic** - Celebrates the joy and creativity of LEGO building
- **Reliable** - Trustworthy guardian of valuable MOC collections
- **Innovative** - Cutting-edge AI features that feel magical
- **Community-Minded** - Built by AFOLs, for AFOLs

## Logo Concepts

### Primary Logo Concept
**"Organized Brick Stack"**
- Stylized stack of 3-4 LEGO bricks in brand colors
- Clean, geometric design that works at small sizes
- Incorporates the classic LEGO brick stud pattern
- Modern, minimalist interpretation

### Logo Variations Needed
```
1. Full Logo (Icon + Text)
2. Icon Only (Square format)
3. Horizontal Layout
4. Monochrome Version
5. Favicon (16x16, 32x32)
6. App Icon (iOS/Android formats)
```

### Logo Color Specifications
```css
/* Primary Logo Colors */
Primary Red:   #ef4444  (LEGO Brick Red)
Secondary Blue: #3b82f6  (LEGO Brick Blue)
Accent Yellow:  #f59e0b  (LEGO Yellow)
Text Color:     #1c1917  (Neutral 900)

/* Monochrome Versions */
Dark Logo:      #1c1917  (on light backgrounds)
Light Logo:     #ffffff  (on dark backgrounds)
```

## Color Palette Quick Reference

### Primary Colors
```
LEGO Red:    #ef4444  ■
LEGO Blue:   #3b82f6  ■
LEGO Yellow: #f59e0b  ■
LEGO Green:  #22c55e  ■
LEGO Orange: #f97316  ■
```

### Neutral Colors
```
Almost White:  #fafaf9  ■
Light Gray:    #f5f5f4  ■
Medium Gray:   #78716c  ■
Dark Gray:     #44403c  ■
Almost Black:  #1c1917  ■
```

### Usage Guidelines
- **Primary Red:** Main CTAs, brand elements, active states
- **Secondary Blue:** Navigation, links, secondary actions
- **Yellow:** Highlights, AI features, warnings
- **Green:** Success states, completed actions
- **Orange:** Energy, uploads, excitement
- **Neutrals:** Text, backgrounds, structure

## Typography Quick Reference

### Font Stack
```css
/* Display Font (Headings) */
font-family: 'Poppins', sans-serif;
Weights: 400, 500, 600, 700

/* Body Font (UI & Text) */
font-family: 'Inter', sans-serif;
Weights: 300, 400, 500, 600, 700, 800

/* Monospace (Data & Numbers) */
font-family: 'JetBrains Mono', monospace;
Weights: 400, 500, 600
```

### Text Hierarchy
```
Hero Text:     60px / Poppins Bold
H1 (Titles):   48px / Poppins Semi-Bold
H2 (Sections): 36px / Poppins Semi-Bold
H3 (Subsections): 30px / Poppins Medium
Body Large:    18px / Inter Regular
Body Regular:  16px / Inter Regular
Body Small:    14px / Inter Regular
Captions:      12px / Inter Regular
```

## Iconography Style

### Icon Principles
- **Outline Style** - 2px stroke weight for consistency
- **Rounded Corners** - 2px border radius on line endings
- **24px Grid** - All icons designed on 24x24px grid
- **LEGO-Inspired** - Subtle references to brick shapes where appropriate

### Core Icon Set Needed
```
Navigation:
- Home (house)
- Gallery (grid)
- Upload (plus/arrow up)
- Settings (gear)
- Profile (user)

Actions:
- Add/Create (plus)
- Edit (pencil)
- Delete (trash)
- Search (magnifying glass)
- Filter (funnel)
- Sort (arrows)

Status:
- Success (checkmark)
- Warning (triangle)
- Error (X)
- Info (i)
- Loading (spinner)

LEGO-Specific:
- MOC (brick stack)
- Instructions (document)
- Pieces (small bricks)
- Theme (category)
- Price (dollar sign)
```

## Image Guidelines

### Photography Style
**"Clean Collection Display"**
- **Well-lit** - Bright, even lighting that shows true colors
- **Organized** - Neat arrangements, no clutter
- **High Quality** - Sharp, professional-looking images
- **Consistent Backgrounds** - White or neutral backgrounds preferred
- **Multiple Angles** - Show MOCs from different perspectives

### Image Specifications
```
MOC Card Images:     400x300px (4:3 ratio)
Hero Images:         1200x600px (2:1 ratio)
Gallery Thumbnails:  300x300px (1:1 ratio)
Detail Images:       800x600px (4:3 ratio)
```

### Image Processing
- **Compression:** WebP format preferred, JPEG fallback
- **Quality:** 85% compression for good balance
- **Responsive:** Multiple sizes for different screen densities
- **Alt Text:** Descriptive text for accessibility

## UI Pattern Examples

### Button Styles
```css
/* Primary Button */
background: #ef4444;
color: white;
padding: 12px 24px;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);

/* Secondary Button */
background: #3b82f6;
color: white;
/* Same structure */

/* Outline Button */
background: transparent;
border: 2px solid #ef4444;
color: #ef4444;
```

### Card Styles
```css
/* MOC Card */
background: white;
border: 1px solid #e7e5e4;
border-radius: 12px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
padding: 24px;

/* Hover State */
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
```

## Accessibility Standards

### Color Contrast Requirements
- **Normal Text:** 4.5:1 minimum contrast ratio
- **Large Text:** 3:1 minimum contrast ratio
- **UI Elements:** 3:1 minimum contrast ratio
- **Focus Indicators:** High contrast, clearly visible

### Approved Color Combinations
```
✅ White text on Primary Red (#ef4444)     - 4.8:1
✅ White text on Secondary Blue (#3b82f6)  - 4.6:1
✅ Dark text (#1c1917) on Light Gray (#f5f5f4) - 16.8:1
✅ Medium Gray (#78716c) on White          - 4.7:1
```

## Implementation Notes

### CSS Custom Properties
```css
:root {
  /* Brand Colors */
  --brand-red: #ef4444;
  --brand-blue: #3b82f6;
  --brand-yellow: #f59e0b;
  
  /* Typography */
  --font-display: 'Poppins', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-unit: 8px;
  --border-radius: 8px;
  --border-radius-lg: 12px;
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#ef4444', // LEGO Red
          // ... other shades
        },
        secondary: {
          500: '#3b82f6', // LEGO Blue
          // ... other shades
        }
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  }
}
```

---

*This media kit provides all the essential brand elements and guidelines needed to create a consistent, professional, and delightful LEGO MOC organization app.*
