# Frontend Style Guide

## UI/UX Conventions
- Use consistent spacing, colors, and typography
- Follow Material/modern design principles
- Prioritize clarity and usability

## Component Structure
- Each component in its own directory named after the component
- Main file: `index.tsx`
- Place tests in `__tests__` subdirectory

## Naming Conventions
- Use PascalCase for components
- Use camelCase for props and variables
- Use kebab-case for CSS class names

## Theming
- Use a central theme file for colors, spacing, and typography
- Support dark mode if possible

## Accessibility
- Use semantic HTML elements
- Ensure all interactive elements are keyboard accessible
- Add `aria` attributes where appropriate
- Test with screen readers 