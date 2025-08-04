---
sidebar_position: 2
---

# Docusaurus Quick Reference

A quick reference guide for common Docusaurus tasks and commands.

## Quick Commands

### Development
```bash
# Start development server
pnpm start

# Build for production
pnpm build

# Serve production build
pnpm serve

# Clear cache
pnpm clear
```

### Content Management
```bash
# Extract translatable strings
pnpm write-translations

# Add heading IDs for linking
pnpm write-heading-ids

# Type checking
pnpm typecheck
```

## File Structure Quick Reference

```
lego-moc-docs/
├── docs/                    # 📄 Documentation pages
│   ├── intro.md            # 🏠 Welcome page
│   ├── api.md              # 🔌 API reference
│   ├── tutorials/          # 📚 Tutorial guides
│   ├── user-guide/         # 👤 User documentation
│   └── developer-guide/    # ⚙️ Developer docs
├── blog/                   # 📝 Blog posts
├── src/
│   ├── css/custom.css     # 🎨 Custom styles
│   ├── components/        # 🧩 React components
│   └── pages/            # 📄 Custom pages
├── static/img/           # 🖼️ Images and assets
├── docusaurus.config.ts  # ⚙️ Main config
└── sidebars.ts          # 📋 Sidebar structure
```

## Frontmatter Quick Reference

### Basic Frontmatter
```markdown
---
sidebar_position: 1
title: "Page Title"
description: "Page description"
---
```

### Advanced Frontmatter
```markdown
---
sidebar_position: 1
title: "Custom Title"
description: "Meta description"
keywords: ["tag1", "tag2"]
image: "/img/og-image.png"
hide_table_of_contents: false
---
```

## Markdown Quick Reference

### Headers
```markdown
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
```

### Links
```markdown
[Internal Link](/docs/api)
[External Link](https://lego.com)
[Section Link](/docs/intro#getting-started)
```

### Code Blocks
```markdown
`inline code`

```javascript
// JavaScript code block
function hello() {
  console.log('Hello!');
}
```

```bash
# Shell commands
pnpm start
```
```

### Lists
```markdown
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Another item
   1. Nested item
```

### Admonitions
```markdown
:::tip
Helpful tip!
:::

:::info
Information.
:::

:::warning
Warning message.
:::

:::danger
Dangerous content!
:::

:::note
Note.
:::
```

### Images
```markdown
![Alt text](/img/example.png)

![With caption](/img/example.png)
*Figure 1: Caption text*
```

### Tables
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

## React Components Quick Reference

### Using Components in MDX
```mdx
import MyComponent from '@site/src/components/MyComponent';

<MyComponent title="Hello" />
```

### Available LEGO Components
```mdx
{/* LEGO Card */}
<div className="lego-card">
  <h3>Title</h3>
  <p>Content</p>
</div>

{/* LEGO Button */}
<a className="button button--lego" href="/docs/api">
  View API
</a>
```

## CSS Variables Quick Reference

### LEGO Colors
```css
--lego-red: #e31e24;
--lego-blue: #0055bf;
--lego-yellow: #f7d117;
--lego-green: #237841;
--lego-orange: #ff8c00;
--lego-purple: #6b3278;
--lego-black: #1b1b1b;
--lego-white: #ffffff;
--lego-gray: #6b6b6b;
```

### Usage in CSS
```css
.my-component {
  background-color: var(--lego-red);
  color: var(--lego-white);
  border: 2px solid var(--lego-blue);
}
```

## Configuration Quick Reference

### Key Config Options
```typescript
const config: Config = {
  title: 'LEGO MOC Instructions',
  tagline: 'Build, Share, and Discover Amazing LEGO Creations',
  url: 'https://lego-moc-instructions.com',
  baseUrl: '/',
  organizationName: 'michaelmenard',
  projectName: 'lego-moc-instructions',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
};
```

### Sidebar Structure
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
        'tutorials/new-tutorial',
      ],
    },
  ],
};
```

## Common Tasks

### Adding a New Page
1. Create `.md` file in appropriate directory
2. Add frontmatter
3. Write content
4. Update `sidebars.ts`

### Creating a Custom Component
1. Create component in `src/components/`
2. Import in MDX file
3. Use component in content

### Changing Styles
1. Edit `src/css/custom.css`
2. Use LEGO color variables
3. Test on different screen sizes

### Deploying Changes
1. Build: `pnpm build`
2. Deploy: `pnpm deploy`
3. Or upload `build/` directory to hosting

## Troubleshooting Quick Reference

### Port Issues
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Use different port
pnpm start -- --port 3002
```

### Build Issues
```bash
# Clear cache
pnpm clear

# Rebuild
pnpm build
```

### TypeScript Issues
```bash
# Check types
pnpm typecheck

# Fix type errors in components
```

## URLs Quick Reference

- **Development**: http://localhost:3001
- **Production**: https://lego-moc-instructions.com
- **Main App**: http://localhost:3000
- **API Docs**: http://localhost:3001/docs/api
- **Tutorials**: http://localhost:3001/docs/tutorials

## Keyboard Shortcuts

- **Search**: `Ctrl/Cmd + K`
- **Toggle Sidebar**: `Ctrl/Cmd + Shift + S`
- **Toggle Dark Mode**: `Ctrl/Cmd + Shift + D`

## File Extensions

- **`.md`**: Standard Markdown files
- **`.mdx`**: Markdown with React components
- **`.tsx`**: React components
- **`.css`**: Stylesheets
- **`.ts`**: TypeScript configuration

## Best Practices Checklist

- [ ] Use descriptive file names
- [ ] Include frontmatter on all pages
- [ ] Update sidebar when adding pages
- [ ] Test on mobile devices
- [ ] Optimize images before adding
- [ ] Use consistent formatting
- [ ] Include code examples
- [ ] Add alt text to images
- [ ] Test all links
- [ ] Keep content up to date 