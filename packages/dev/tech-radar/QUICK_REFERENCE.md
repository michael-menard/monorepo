# Tech Radar Quick Reference

## Adding a New Technology

### 1. Open the data file
```bash
# Edit the radar data
code packages/tech-radar/radar.json
```

### 2. Add your entry to the `entries` array
```json
{
  "name": "Technology Name",
  "quadrant": "Tools",
  "ring": "Trial", 
  "description": "What it is and why we're using it.",
  "moved": "in"
}
```

### 3. Save and test
```bash
cd packages/tech-radar
pnpm dev
```

## Valid Values

### Quadrants
- `"Techniques"` - Processes, practices, ways of working
- `"Tools"` - Software that helps you do your job  
- `"Platforms"` - Infrastructure and platforms
- `"Languages & Frameworks"` - Programming languages and frameworks

### Rings
- `"Adopt"` - High confidence, use for new projects
- `"Trial"` - Worth pursuing, use for non-critical projects
- `"Assess"` - Promising, investigate further
- `"Hold"` - Not recommended, avoid for new development

### Movement
- `"in"` - Moving closer to center (increased confidence)
- `"out"` - Moving away from center (decreased confidence)  
- `"none"` - No movement (default)

## Example Entries

### New Technology
```json
{
  "name": "Svelte",
  "quadrant": "Languages & Frameworks",
  "ring": "Trial",
  "description": "Modern JavaScript framework for building user interfaces. Considering for performance-critical applications.",
  "moved": "in"
}
```

### Moving to Adopt
```json
{
  "name": "TypeScript",
  "quadrant": "Languages & Frameworks", 
  "ring": "Adopt",
  "description": "Strongly typed programming language. Provides better developer experience and catches errors at compile time.",
  "moved": "in"
}
```

### Being Phased Out
```json
{
  "name": "jQuery",
  "quadrant": "Languages & Frameworks",
  "ring": "Hold", 
  "description": "JavaScript library for DOM manipulation. Being replaced by modern frameworks and native browser APIs.",
  "moved": "out"
}
```

## Tips

- **Be specific** in descriptions - explain what it is and why it's being used
- **Use official names** for technologies
- **Include context** about why the technology was chosen
- **Update regularly** - review and update every 3-4 months
- **Track movement** - document why technologies move between rings 