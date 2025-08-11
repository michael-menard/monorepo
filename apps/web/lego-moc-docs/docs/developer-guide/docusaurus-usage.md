---
sidebar_position: 1
---

# Docusaurus Usage Guide

This guide covers how to use and maintain the Docusaurus documentation site for the LEGO MOC Instructions platform.

## Overview

Our documentation site is built with [Docusaurus](https://docusaurus.io/), a modern static website generator that's perfect for technical documentation. It provides:

- **Markdown Support**: Write content in Markdown with MDX support
- **React Components**: Embed interactive components
- **Versioning**: Support for multiple documentation versions
- **Search**: Built-in search functionality
- **Theming**: Customizable themes and styling
- **Internationalization**: Multi-language support

## Project Structure

```
lego-moc-docs/
├── docs/                    # Documentation pages (Markdown/MDX)
│   ├── intro.md            # Welcome page
│   ├── api.md              # API reference
│   ├── tutorials/          # Tutorial guides
│   ├── user-guide/         # User documentation
│   └── developer-guide/    # Developer documentation
├── blog/                   # Blog posts
├── src/
│   ├── css/               # Custom styles
│   │   └── custom.css     # LEGO-themed styling
│   ├── components/        # React components
│   │   └── HomepageFeatures/
│   └── pages/            # Custom pages
├── static/               # Static assets
│   └── img/             # Images and logos
├── docusaurus.config.ts  # Main configuration
├── sidebars.ts          # Sidebar structure
└── package.json         # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18.0 or above
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
   ```bash
   cd apps/web/lego-moc-docs
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm start
   ```

3. Open [http://localhost:3001](http://localhost:3001) in your browser.

### Available Scripts

```bash
# Development
pnpm start          # Start development server
pnpm build          # Build for production
pnpm serve          # Serve production build
pnpm clear          # Clear cache

# Content Management
pnpm write-translations    # Extract translatable strings
pnpm write-heading-ids     # Add heading IDs for linking

# Type Checking
pnpm typecheck      # Run TypeScript type checking
```

## Writing Documentation

### Creating New Pages

1. **Create a Markdown file** in the appropriate directory:
   ```bash
   # Example: Create a new tutorial
   touch docs/tutorials/new-tutorial.md
   ```

2. **Add frontmatter** at the top of the file:
   ```markdown
   ---
   sidebar_position: 2
   title: "My New Tutorial"
   description: "Learn how to do something amazing"
   ---
   ```

3. **Write your content** using Markdown:
   ```markdown
   # My New Tutorial

   This is a step-by-step guide for...

   ## Prerequisites

   Before you start, make sure you have...

   ## Step 1: Getting Started

   First, let's set up...
   ```

4. **Update the sidebar** in `sidebars.ts`:
   ```typescript
   tutorialSidebar: [
     'intro',
     'api',
     {
       type: 'category',
       label: 'Tutorials',
       items: [
         'tutorials/create-first-moc',
         'tutorials/new-tutorial', // Add your new page
       ],
     },
   ],
   ```

### Frontmatter Options

```markdown
---
sidebar_position: 1          # Position in sidebar (lower = higher)
title: "Page Title"          # Custom page title
description: "Description"   # Meta description
keywords: ["tag1", "tag2"]   # Meta keywords
image: "/img/og-image.png"   # Open Graph image
hide_table_of_contents: false # Hide TOC
---
```

### Markdown Features

#### Code Blocks

```markdown
# JavaScript
```javascript
function hello() {
  console.log('Hello, LEGO!');
}
```

# JSON
```json
{
  "name": "lego-moc",
  "version": "1.0.0"
}
```

# Shell commands
```bash
pnpm start
```
```

#### Admonitions

```markdown
:::tip
This is a helpful tip!
:::

:::info
This is informational content.
:::

:::warning
This is a warning message.
:::

:::danger
This is dangerous content!
:::

:::note
This is a note.
:::
```

#### Links

```markdown
# Internal links
[API Reference](/docs/api)
[Create MOC Tutorial](/docs/tutorials/create-first-moc)

# External links
[LEGO Official Site](https://lego.com)

# Link to specific sections
[Getting Started Section](/docs/intro#getting-started)
```

#### Images

```markdown
![Alt text](/img/example.png)

# With caption
![LEGO MOC Example](/img/moc-example.png)

*Figure 1: An amazing LEGO MOC creation*
```

## Custom Components

### Creating React Components

1. **Create a component** in `src/components/`:
   ```tsx
   // src/components/ExampleComponent.tsx
   import React from 'react';

   export default function ExampleComponent({ title, children }) {
     return (
       <div className="example-component">
         <h3>{title}</h3>
         {children}
       </div>
     );
   }
   ```

2. **Use in Markdown** (MDX files):
   ```mdx
   ---
   title: Using Custom Components
   ---

   import ExampleComponent from '@site/src/components/ExampleComponent';

   # Custom Components

   <ExampleComponent title="My Component">
     This content is passed as children to the component.
   </ExampleComponent>
   ```

### Available Components

#### LEGO Card
```mdx
<div className="lego-card">
  <h3>LEGO Card Title</h3>
  <p>This is a LEGO-themed card component.</p>
</div>
```

#### LEGO Button
```mdx
<a className="button button--lego" href="/docs/api">
  View API Reference
</a>
```

## Styling

### LEGO Theme Colors

The site uses a custom LEGO color palette defined in `src/css/custom.css`:

```css
:root {
  --lego-red: #e31e24;
  --lego-blue: #0055bf;
  --lego-yellow: #f7d117;
  --lego-green: #237841;
  --lego-orange: #ff8c00;
  --lego-purple: #6b3278;
  --lego-black: #1b1b1b;
  --lego-white: #ffffff;
  --lego-gray: #6b6b6b;
}
```

### Adding Custom Styles

1. **Global styles** - Edit `src/css/custom.css`
2. **Component styles** - Create CSS modules or styled components
3. **Inline styles** - Use style attributes for quick adjustments

### Responsive Design

The site is mobile-responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Configuration

### Main Configuration (`docusaurus.config.ts`)

Key configuration options:

```typescript
const config: Config = {
  title: 'LEGO MOC Instructions',
  tagline: 'Build, Share, and Discover Amazing LEGO Creations',
  url: 'https://lego-moc-instructions.com',
  baseUrl: '/',
  
  // GitHub pages deployment
  organizationName: 'michaelmenard',
  projectName: 'lego-moc-instructions',
  
  // Internationalization
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  
  // Plugins and presets
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/michaelmenard/lego-moc-instructions/tree/main/apps/web/lego-moc-docs/',
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
};
```

### Sidebar Configuration (`sidebars.ts`)

Organize your documentation structure:

```typescript
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'api',
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/create-first-moc',
        'tutorials/advanced-techniques',
      ],
    },
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/getting-started',
        'user-guide/account-management',
      ],
    },
  ],
};
```

## Content Management

### Documentation Guidelines

1. **Use clear, concise language**
2. **Include code examples** where relevant
3. **Add screenshots** for UI-related content
4. **Use consistent formatting**
5. **Include prerequisites** for tutorials
6. **Add troubleshooting sections**

### File Naming Conventions

- Use kebab-case for file names: `my-tutorial.md`
- Use descriptive names that reflect content
- Group related files in directories

### Content Organization

```
docs/
├── intro.md              # Welcome and overview
├── api.md                # API reference
├── tutorials/            # Step-by-step guides
│   ├── create-first-moc.md
│   └── advanced-techniques.md
├── user-guide/           # User documentation
│   ├── getting-started.md
│   └── account-management.md
└── developer-guide/      # Developer resources
    ├── installation.md
    ├── architecture.md
    └── contributing.md
```

## Deployment

### Local Development

```bash
# Start development server
pnpm start

# Build for production
pnpm build

# Serve production build
pnpm serve
```

### Production Deployment

1. **Build the site**:
   ```bash
   pnpm build
   ```

2. **Deploy to GitHub Pages**:
   ```bash
   pnpm deploy
   ```

3. **Other platforms**: Upload the `build/` directory to any static hosting service

### Environment Variables

Create a `.env` file for environment-specific configuration:

```bash
# .env
GIT_USER=your-github-username
USE_SSH=true
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
pnpm start -- --port 3002
```

#### Build Errors
```bash
# Clear cache and rebuild
pnpm clear
pnpm build
```

#### TypeScript Errors
```bash
# Run type checking
pnpm typecheck

# Fix type issues in your components
```

### Performance Optimization

1. **Optimize images** before adding to `static/img/`
2. **Use lazy loading** for heavy components
3. **Minimize bundle size** by removing unused dependencies
4. **Enable compression** on your hosting platform

## Best Practices

### Writing Documentation

1. **Start with an outline** before writing
2. **Use consistent terminology** throughout
3. **Include examples** for every concept
4. **Write for your audience** (beginners vs. experts)
5. **Keep content up to date** with code changes

### Code Examples

1. **Use syntax highlighting** for all code blocks
2. **Include complete, runnable examples**
3. **Add comments** to explain complex code
4. **Test all examples** before publishing

### Images and Media

1. **Optimize images** for web (compress, resize)
2. **Use descriptive alt text**
3. **Include captions** for complex images
4. **Use consistent image formats** (PNG for screenshots, SVG for icons)

## Resources

### Official Documentation
- [Docusaurus Documentation](https://docusaurus.io/docs)
- [MDX Documentation](https://mdxjs.com/)
- [Markdown Guide](https://www.markdownguide.org/)

### Community
- [Docusaurus Discord](https://discord.gg/docusaurus)
- [GitHub Discussions](https://github.com/facebook/docusaurus/discussions)

### Tools
- [Markdown Linter](https://github.com/DavidAnson/markdownlint)
- [Image Optimization](https://squoosh.app/)
- [Color Palette Generator](https://coolors.co/)

## Contributing 