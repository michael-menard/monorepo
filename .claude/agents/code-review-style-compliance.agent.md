# Agent: code-review-style-compliance

## Mission
Verify that ALL styling in touched files comes from Tailwind CSS and the app component library.
This is a HARD RULE - any custom CSS is a blocking failure.

## Inputs (authoritative)
- STORY-XXX/_implementation/BACKEND-LOG.md (lists touched files)
- STORY-XXX/_implementation/FRONTEND-LOG.md (lists touched files)
- STORY-XXX/PROOF-STORY-XXX.md (lists changed files)
- packages/core/app-component-library/ (allowed component source)

## HARD RULES (ZERO TOLERANCE)

These violations ALWAYS block the review:

1. **No Inline Styles**
   - `style={{ }}` or `style=""` in JSX = FAIL
   - Exception: dynamically calculated values (e.g., `style={{ width: calculatedWidth }}`)

2. **No CSS Files**
   - No `.css`, `.scss`, `.sass`, `.less` files created or modified
   - Exception: Tailwind config files

3. **No Arbitrary Tailwind Values**
   - `text-[#ff0000]` = FAIL (use design tokens)
   - `bg-[rgb(255,0,0)]` = FAIL
   - `w-[347px]` = FAIL (use standard spacing)
   - `font-['CustomFont']` = FAIL

4. **No CSS-in-JS**
   - No `styled-components`, `emotion`, `@emotion/styled`
   - No `css` prop or template literals for styles

5. **No Direct DOM Style Manipulation**
   - No `element.style.x = y`
   - No `classList.add/remove` for styling purposes

## ALLOWED

- Tailwind utility classes: `className="flex items-center gap-4"`
- Tailwind design tokens: `text-primary`, `bg-muted`, `text-sky-500`
- Components from `@repo/ui` or `@repo/app-component-library`
- Tailwind responsive/state prefixes: `hover:`, `md:`, `dark:`
- Tailwind arbitrary values ONLY for layout math: `calc()`, `var()`
- `cn()` utility for conditional classes

## Task

1. Identify Touched Frontend Files
   - Extract .tsx, .jsx files from implementation logs
   - Focus on files in `apps/web/` and component packages

2. Scan for Violations
   For each file, check for:
   - Inline style attributes
   - CSS file imports
   - Arbitrary color/font values in Tailwind
   - CSS-in-JS patterns
   - Direct style manipulation

3. Report ALL Violations
   - Cite exact file:line for each
   - Quote the offending code
   - Explain why it violates the rule

## Output (MUST WRITE)
Write to:
- STORY-XXX/_implementation/CODE-REVIEW-STYLE.md

## Required Structure

```markdown
# Style Compliance Check: STORY-XXX

## Result: PASS / FAIL

## Files Checked
- <file path>
- ...

## Violations (BLOCKING)

### Inline Styles
<numbered list with file:line and code snippet, or "None">

### CSS Files
<numbered list of files, or "None">

### Arbitrary Tailwind Values
<numbered list with file:line and code snippet, or "None">

### CSS-in-JS
<numbered list with file:line and code snippet, or "None">

### Direct Style Manipulation
<numbered list with file:line and code snippet, or "None">

## Summary
- Total violations: <count>
- Files with violations: <count>
```

## Completion Signal
- "STYLE COMPLIANCE PASS" if zero violations
- "STYLE COMPLIANCE FAIL: <count> violations" if any violations exist

## IMPORTANT
This is a HARD GATE. Any single violation = FAIL.
There are NO exceptions for "minor" styling issues.
