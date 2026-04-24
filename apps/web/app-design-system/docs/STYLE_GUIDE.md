# Style Guide

## Typography

| Use Case                | Font               | Class          |
| ----------------------- | ------------------ | -------------- |
| Headings, titles        | Cormorant Garamond | `font-heading` |
| Body text, descriptions | Lora               | `font-body`    |
| Numbers, codes, data    | Geist Mono         | `font-mono`    |

### Heading Scale (Responsive)

```
H1: text-3xl md:text-4xl lg:text-5xl font-bold font-heading
H2: text-2xl md:text-3xl lg:text-4xl font-bold font-heading
H3: text-xl md:text-2xl font-bold font-heading
H4: text-lg md:text-xl font-semibold font-heading
```

### Body Text

```
Large:   text-lg md:text-xl font-body leading-relaxed
Base:    text-base font-body leading-relaxed
Small:   text-sm font-body
XSmall:  text-xs font-body
Data:    text-sm font-mono
```

Default line-height: 1.6 (set on body)

---

## Spacing & Layout

### Breakpoint Scale

| Element           | Mobile | Tablet (md) | Desktop (lg) |
| ----------------- | ------ | ----------- | ------------ |
| Layout Gap        | gap-4  | gap-6       | gap-8        |
| Container Padding | px-4   | px-6        | px-8         |
| Section Spacing   | py-12  | py-16       | py-20        |
| Card Gap          | gap-4  | gap-6       | gap-6        |

### Common Patterns

```
Container:  max-w-7xl mx-auto px-4 md:px-6 lg:px-8
Section:    py-12 md:py-16 lg:py-20
Card Grid:  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6
Flex Row:   flex items-center gap-4 md:gap-6
Stack:      flex flex-col gap-4 md:gap-6
```

---

## Colors

Use semantic design tokens, never direct colors like `bg-white` or `text-black`.

### Core Tokens

```
Background:   bg-background / text-background
Foreground:   bg-foreground / text-foreground
Primary:      bg-primary / text-primary / text-primary-foreground
Secondary:    bg-secondary / text-secondary-foreground
Muted:        bg-muted / text-muted-foreground
Accent:       bg-accent / text-accent-foreground
Destructive:  bg-destructive / text-destructive-foreground
Border:       border-border
```

### Usage

- Cards: `bg-card text-card-foreground`
- Inputs: `bg-input` with `border-input`
- Hover states: `hover:bg-muted` or `hover:bg-primary/90`
- Subtle backgrounds: `bg-primary/10`, `bg-muted/50`

---

## Components

### Buttons

```tsx
<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
```

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle className="font-heading">Title</CardTitle>
    <CardDescription className="font-body">Description</CardDescription>
  </CardHeader>
  <CardContent className="font-body">Content here</CardContent>
</Card>
```

### Tables

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="font-heading font-bold">Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-body">Text data</TableCell>
      <TableCell className="font-mono">1,234</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Form Fields

```tsx
<FieldGroup>
  <Field>
    <FieldLabel>Label</FieldLabel>
    <Input />
  </Field>
</FieldGroup>
```

---

## Quick Reference

### Do

- Use `font-heading` for all headings and titles
- Use `font-body` for descriptions, paragraphs, labels
- Use `font-mono` for numbers, codes, part numbers, technical data
- Use `leading-relaxed` for body text
- Use responsive spacing: `gap-4 md:gap-6 lg:gap-8`
- Use semantic color tokens: `bg-background`, `text-foreground`, `bg-primary`

### Don't

- Don't use `font-sans` for body text (use `font-body` instead)
- Don't use direct colors: `bg-white`, `text-black`, `bg-gray-100`
- Don't use fixed spacing without responsive variants
- Don't skip heading hierarchy (H1 → H3)
