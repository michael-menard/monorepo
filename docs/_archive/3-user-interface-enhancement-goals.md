# 3. User Interface Enhancement Goals

## 3.1 Design System Integration

All apps SHALL implement the **LEGO MOC Enhanced Design Language** documented in:

- `docs/ux-design/ux-migration-design-system.md` - Component specs, interactions
- `docs/ux-design/ux-page-designs.md` - Page layouts
- `docs/front-end-spec/branding-style-guide.md` - Colors, typography
- `docs/front-end-spec/component-library-design-system.md` - Core components

## 3.2 Design Foundation

| Aspect             | Specification                      |
| ------------------ | ---------------------------------- |
| **Component Base** | `@repo/ui` (shadcn/ui)             |
| **Styling**        | Tailwind CSS 4                     |
| **Grid System**    | 8px grid spacing (LEGO stud = 8px) |
| **Icons**          | Lucide React (exclusively)         |

## 3.3 Color Palette

| Token                | Value                | Usage                                  |
| -------------------- | -------------------- | -------------------------------------- |
| Primary              | `hsl(178, 79%, 32%)` | Vibrant Teal - buttons, links, accents |
| Secondary            | `hsl(45, 67%, 90%)`  | Warm Cream - backgrounds, cards        |
| Accent (LEGO Red)    | `hsl(4, 90%, 45%)`   | Emphasis, notifications                |
| Accent (LEGO Yellow) | `hsl(51, 100%, 50%)` | Highlights, badges                     |
| Accent (LEGO Blue)   | `hsl(213, 76%, 42%)` | Links, info states                     |

## 3.4 Typography

| Element        | Font            | Sizes                        |
| -------------- | --------------- | ---------------------------- |
| Headings       | Inter (Bold)    | H1: 32px, H2: 24px, H3: 20px |
| Body           | Inter (Regular) | 16px base, 14px small        |
| Code/Technical | JetBrains Mono  | 14px                         |

## 3.5 Micro-Interactions

| Interaction         | Description                               |
| ------------------- | ----------------------------------------- |
| LEGO Snap Animation | Click feedback with subtle "snap" motion  |
| Brick Stack Loading | Loading animation with stacking bricks    |
| Stud Hover Effects  | Buttons show subtle depth change on hover |

## 3.6 Responsive Breakpoints

| Breakpoint | Width      | Layout Behavior                                     |
| ---------- | ---------- | --------------------------------------------------- |
| Mobile     | <768px     | Single column, hamburger nav, stacked cards         |
| Tablet     | 768-1024px | Two columns, collapsible sidebar                    |
| Desktop    | >1024px    | Full layout, persistent sidebar, multi-column grids |

## 3.7 Accessibility

- WCAG 2.1 AA compliance required
- Minimum 4.5:1 contrast ratio for text
- Focus indicators on all interactive elements
- Keyboard navigation support throughout
- ARIA labels on interactive components
- 44px minimum touch target on mobile

---
