# Component Library / Design System

**Design System Approach:** Build upon existing Tailwind CSS v4 foundation and `@repo/ui` components, creating a comprehensive design system that extends current patterns while introducing modern, accessible components for enhanced user experience.

## Core Components

### Button Component

**Purpose:** Primary interaction element for all user actions throughout the application

**Variants:**

- Primary (solid background, high contrast)
- Secondary (outline style, medium emphasis)
- Ghost (text-only, low emphasis)
- Icon (icon-only with tooltip)

**States:** Default, hover, active, disabled, loading (with spinner)

**Usage Guidelines:** Use primary for main actions, secondary for alternative actions, ghost for tertiary actions. Maintain consistent sizing (small, medium, large) across modules.

### Card Component

**Purpose:** Container for MOC displays, content grouping, and information hierarchy

**Variants:**

- MOC Card (image, title, metadata, actions)
- Info Card (icon, title, description)
- Interactive Card (hover effects, clickable)
- Compact Card (reduced padding, smaller text)

**States:** Default, hover, selected, loading (skeleton), error

**Usage Guidelines:** Use consistent spacing and typography. Include proper alt text for images. Ensure touch targets meet accessibility requirements (44px minimum).

### Modal/Dialog Component

**Purpose:** Overlay interface for focused tasks, confirmations, and detailed views

**Variants:**

- Confirmation Dialog (small, action-focused)
- Content Modal (medium, scrollable content)
- Full-Screen Modal (large content, mobile-friendly)
- Image Viewer (optimized for image display)

**States:** Opening animation, open, closing animation, closed

**Usage Guidelines:** Include proper focus management and keyboard navigation. Provide clear close actions. Use backdrop click to close for non-critical modals.

### Form Components

**Purpose:** Comprehensive form elements for user input across all modules

**Variants:**

- Text Input (single line, validation states)
- Textarea (multi-line, auto-resize)
- Select Dropdown (single/multi-select)
- File Upload (drag-drop, progress indicators)
- Checkbox/Radio (custom styled, accessible)

**States:** Default, focused, filled, error, disabled, loading

**Usage Guidelines:** Include proper labels and error messages. Implement real-time validation feedback. Ensure keyboard navigation works correctly.

### Navigation Components

**Purpose:** Consistent navigation patterns across all modular applications

**Variants:**

- Top Navigation Bar (primary navigation)
- Sidebar Navigation (secondary navigation)
- Breadcrumb Navigation (hierarchical navigation)
- Tab Navigation (section switching)

**States:** Default, active, hover, disabled

**Usage Guidelines:** Maintain consistent active states. Include proper ARIA labels. Ensure mobile-responsive behavior.
