# v0 Rules

Copy the content below into Settings → Rules in v0.

---

## Typography

- Use `font-heading` (Cormorant Garamond) for all headings and titles
- Use `font-body` (Lora) for body text, descriptions, and paragraphs
- Use `font-mono` (Geist Mono) for numbers, codes, and technical data
- Use `leading-relaxed` for body text readability

## Heading Scale

- H1: `text-3xl md:text-4xl lg:text-5xl font-bold font-heading`
- H2: `text-2xl md:text-3xl lg:text-4xl font-bold font-heading`
- H3: `text-xl md:text-2xl font-bold font-heading`
- H4: `text-lg md:text-xl font-semibold font-heading`

## Spacing (Responsive)

- Layout gaps: `gap-4 md:gap-6 lg:gap-8`
- Container: `max-w-7xl mx-auto px-4 md:px-6 lg:px-8`
- Sections: `py-12 md:py-16 lg:py-20`
- Card grids: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6`

## Colors

- Always use semantic tokens: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`
- Never use direct colors like `bg-white`, `text-black`, `bg-gray-*`

## Components

- Cards: Apply `font-heading` to CardTitle, `font-body` to CardDescription and CardContent
- Tables: Apply `font-heading font-bold` to TableHead, `font-body` to text cells, `font-mono` to numeric cells
- Always reference `/docs/STYLE_GUIDE.md` for detailed patterns
