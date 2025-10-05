# Tech Radar Component Usage Guide

This guide explains how to use the Tech Radar component in your applications and how to add new technologies to the radar.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Adding New Technologies](#adding-new-technologies)
- [Understanding the Radar Structure](#understanding-the-radar-structure)
- [Advanced Configuration](#advanced-configuration)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

## Installation

### As a Package Dependency

The Tech Radar component is available as a package in your monorepo:

```bash
# If you need to install it in a specific app
pnpm add @monorepo/tech-radar
```

### Standalone Development

To run the Tech Radar as a standalone application:

```bash
cd packages/tech-radar
pnpm install
pnpm dev
```

This will start the development server at `http://localhost:5173` (or the next available port).

## Basic Usage

### Import and Use the Component

```tsx
import React from 'react'
import { TechRadar } from '@monorepo/tech-radar'

function App() {
  return (
    <div>
      <h1>Our Technology Stack</h1>
      <TechRadar />
    </div>
  )
}

export default App
```

### With Custom Styling

```tsx
import React from 'react'
import { TechRadar } from '@monorepo/tech-radar'
import '@monorepo/tech-radar/dist/style.css' // Import styles if needed

function App() {
  return (
    <div style={{ height: '100vh', padding: '20px' }}>
      <TechRadar />
    </div>
  )
}
```

## Adding New Technologies

### Step 1: Edit the Radar Data

Open `packages/tech-radar/radar.json` and add your new technology to the `entries` array:

```json
{
  "name": "Your Technology Name",
  "quadrant": "Tools",
  "ring": "Trial",
  "description": "A brief description of what this technology is and why it's being considered.",
  "moved": "in"
}
```

### Step 2: Required Fields

Each technology entry must include these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | The name of the technology |
| `quadrant` | string | ✅ | One of: "Techniques", "Tools", "Platforms", "Languages & Frameworks" |
| `ring` | string | ✅ | One of: "Adopt", "Trial", "Assess", "Hold" |
| `description` | string | ✅ | Detailed description of the technology and its purpose |
| `moved` | string | ❌ | Movement indicator: "in", "out", or "none" (defaults to "none") |

### Step 3: Example Entries

Here are examples of different types of technology entries:

#### New Technology to Trial
```json
{
  "name": "Svelte",
  "quadrant": "Languages & Frameworks",
  "ring": "Trial",
  "description": "Modern JavaScript framework for building user interfaces. Considering for performance-critical applications.",
  "moved": "in"
}
```

#### Technology Moving to Adopt
```json
{
  "name": "TypeScript",
  "quadrant": "Languages & Frameworks",
  "ring": "Adopt",
  "description": "Strongly typed programming language that builds on JavaScript. Provides better developer experience and catches errors at compile time.",
  "moved": "in"
}
```

#### Technology Being Phased Out
```json
{
  "name": "jQuery",
  "quadrant": "Languages & Frameworks",
  "ring": "Hold",
  "description": "JavaScript library for DOM manipulation. Being replaced by modern frameworks and native browser APIs.",
  "moved": "out"
}
```

#### Technology Under Assessment
```json
{
  "name": "WebAssembly",
  "quadrant": "Languages & Frameworks",
  "ring": "Assess",
  "description": "Binary instruction format for web browsers. Investigating for performance-critical applications.",
  "moved": "none"
}
```

## Understanding the Radar Structure

### Quadrants

The radar is divided into four quadrants:

1. **Techniques** - Processes, practices, and ways of working
   - Examples: Monorepo Structure, CI/CD, Code Review, Pair Programming

2. **Tools** - Software that helps you do your job
   - Examples: Vite, Drizzle ORM, Vitest, Tailwind CSS

3. **Platforms** - Infrastructure and platforms that applications are built on
   - Examples: AWS Lambda, PostgreSQL, Docker, Kubernetes

4. **Languages & Frameworks** - Programming languages and frameworks
   - Examples: TypeScript, React, Node.js, Python

### Rings

Technologies are positioned in one of four rings from center to edge:

1. **Adopt** (Green) - Technologies we have high confidence in to serve our purpose
   - Use for new projects
   - Well-tested and proven in our environment

2. **Trial** (Blue) - Technologies worth pursuing with the goal of understanding how it will affect your architecture
   - Use for non-critical projects
   - Monitor and evaluate performance

3. **Assess** (Yellow) - Technologies that are promising and have clear potential value-add for us
   - Investigate further
   - Consider for future projects

4. **Hold** (Red) - Technologies not recommended to be used for new projects
   - Avoid for new development
   - Plan migration away from existing usage

### Movement Indicators

The `moved` field indicates how a technology's position has changed:

- **"in"** - Technology has moved closer to the center (increased confidence)
- **"out"** - Technology has moved further from the center (decreased confidence)
- **"none"** - No movement (default)

## Advanced Configuration

### Custom Data Source

You can load radar data from a custom source by modifying the `TechRadar.tsx` component:

```tsx
// In TechRadar.tsx, modify the loadRadarData function
const loadRadarData = async () => {
  try {
    // Load from your custom API endpoint
    const response = await fetch('/api/tech-radar')
    const data = await response.json()
    
    // Process the data...
    setRadarData(data)
  } catch (error) {
    console.error('Failed to load radar data:', error)
  }
}
```

### Custom Styling

You can customize the appearance by overriding CSS variables or modifying the styles:

```css
/* Custom colors for rings */
.radar-entry-fill {
  --adopt-color: #22c55e;
  --trial-color: #0ea5e9;
  --assess-color: #f59e0b;
  --hold-color: #ef4444;
}

/* Custom font */
.tech-radar {
  font-family: 'Your Custom Font', sans-serif;
}
```

## Customization

### Modifying Quadrants

To change the quadrants, edit the `quadrants` array in `radar.json`:

```json
{
  "quadrants": [
    { "name": "Your Custom Quadrant" },
    { "name": "Another Quadrant" }
  ]
}
```

### Modifying Rings

To change the rings or their colors, edit the `rings` array:

```json
{
  "rings": [
    { "name": "Production Ready", "color": "#22c55e" },
    { "name": "Beta Testing", "color": "#0ea5e9" },
    { "name": "Research", "color": "#f59e0b" },
    { "name": "Deprecated", "color": "#ef4444" }
  ]
}
```

### Adding Custom Fields

To add custom fields to technology entries, modify the `Entry` interface in `src/types.ts`:

```typescript
export interface Entry {
  name: string
  quadrant: string
  ring: string
  description: string
  moved?: 'in' | 'out' | 'none'
  // Add your custom fields
  version?: string
  lastUpdated?: string
  team?: string
}
```

## Best Practices

### Writing Good Descriptions

1. **Be specific** - Explain what the technology is and what problem it solves
2. **Include context** - Why is it being considered or used?
3. **Mention alternatives** - What other options were considered?
4. **Include examples** - How is it being used in your projects?

### Regular Reviews

1. **Schedule quarterly reviews** - Update the radar every 3-4 months
2. **Track movement** - Document why technologies move between rings
3. **Involve the team** - Get input from different stakeholders
4. **Document decisions** - Keep a record of why changes were made

### Naming Conventions

1. **Use official names** - Use the official product/technology name
2. **Be consistent** - Use the same naming across all documentation
3. **Include versions** - If relevant, include version information in descriptions

## Troubleshooting

### Common Issues

#### Technology Not Appearing
- Check that the `quadrant` and `ring` values match exactly (case-sensitive)
- Verify the JSON syntax is valid
- Ensure the entry is properly added to the `entries` array

#### Styling Issues
- Make sure the CSS is properly imported
- Check for CSS conflicts with parent applications
- Verify that the component has sufficient space to render

#### Performance Issues
- Large numbers of entries (>50) may impact performance
- Consider pagination or filtering for very large datasets
- Optimize images or assets referenced in descriptions

### Getting Help

1. **Check the console** - Look for JavaScript errors in the browser console
2. **Validate JSON** - Use a JSON validator to check `radar.json`
3. **Test incrementally** - Add one technology at a time to isolate issues
4. **Review examples** - Look at existing entries for reference

## Examples

### Complete Technology Entry

```json
{
  "name": "Next.js",
  "quadrant": "Languages & Frameworks",
  "ring": "Hold",
  "description": "React framework with SSR/SSG capabilities. Previously used for SEO optimization, but we've moved to pure React with Vite for better performance and simpler architecture. Existing projects will be migrated gradually.",
  "moved": "out"
}
```

### Technology Assessment Entry

```json
{
  "name": "GraphQL",
  "quadrant": "Languages & Frameworks",
  "ring": "Assess",
  "description": "Query language for APIs that provides a complete description of the data in your API. Considering for future features that require flexible data fetching and real-time updates. Need to evaluate performance impact and complexity trade-offs.",
  "moved": "none"
}
```

This guide should help you effectively use and maintain your Tech Radar component. For additional support, refer to the main README.md file or the component source code. 