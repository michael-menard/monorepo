---
created: 2026-01-28
updated: 2026-01-28
version: 1.0.0
type: worker
permission_level: read-only
model: haiku
spawned_by: [architect-frontend-leader]
---

# Agent: architect-component-worker

**Model**: haiku

Check component directory structure compliance per CLAUDE.md.

## Required Structure

```
MyComponent/
  index.tsx              # Main component file
  __tests__/
    MyComponent.test.tsx # Component tests
  __types__/
    index.ts             # Zod schemas (if component has types)
  utils/
    index.ts             # Component-specific utilities (if needed)
```

## Input

From leader:
- `apps_paths`: List of frontend app paths to check

## Checks

### 1. Directory Structure

Each component directory should follow the pattern:

```bash
# Find all component directories
Glob: pattern="apps/web/*/src/components/*/"

# For each, check structure
ls ComponentName/
  - index.tsx           # REQUIRED
  - __tests__/          # REQUIRED
  - __types__/          # OPTIONAL (if types exist)
  - utils/              # OPTIONAL
```

### 2. Test Co-location

Tests must be in `__tests__/` directory, not alongside component:

```
# CORRECT
MyComponent/
  index.tsx
  __tests__/
    MyComponent.test.tsx

# VIOLATION
MyComponent/
  index.tsx
  MyComponent.test.tsx  # Wrong location
```

### 3. Functional Components Only

No class components allowed:

```typescript
// VIOLATION
class MyComponent extends React.Component { }

// CORRECT
function MyComponent() { }
const MyComponent = () => { }
```

## Scanning Strategy

```bash
# Find component directories
Glob: pattern="apps/web/*/src/components/*"

# Check for index.tsx
Glob: pattern="apps/web/*/src/components/*/index.tsx"

# Check for __tests__ directories
Glob: pattern="apps/web/*/src/components/*/__tests__"

# Find class components
Grep: pattern="class .+ extends (React\.)?Component"
      path="apps/web/*/src/components/"

# Find misplaced test files
Glob: pattern="apps/web/*/src/components/*/*.test.tsx"
```

## Output Format (YAML only)

```yaml
component_check:
  status: COMPLETE
  verdict: PASS | FAIL

  apps_analyzed: <n>
  components_analyzed: <n>
  structure_compliant: <n>
  structure_violations: <n>

  app_breakdown:
    - app: "main-app"
      path: "apps/web/main-app"
      components: <n>
      compliant: <n>
      compliance_rate: <percentage>

    - app: "app-wishlist-gallery"
      path: "apps/web/app-wishlist-gallery"
      components: <n>
      compliant: <n>
      compliance_rate: <percentage>

  component_analysis:
    - component: "WishlistCard"
      app: "app-wishlist-gallery"
      path: "apps/web/app-wishlist-gallery/src/components/WishlistCard"
      has_index: true
      has_tests_dir: true
      has_types_dir: false
      misplaced_tests: []
      status: PASS

    - component: "Header"
      app: "main-app"
      path: "apps/web/main-app/src/components/Header"
      has_index: true
      has_tests_dir: false
      has_types_dir: false
      misplaced_tests:
        - "Header.test.tsx"
      status: FAIL

  violations:
    - id: COMP-001
      severity: medium
      rule: "Test co-location"
      location: "apps/web/main-app/src/components/Header"
      issue: "Missing __tests__ directory"
      found_tests: ["Header.test.tsx"]
      fix: "Move Header.test.tsx to __tests__/Header.test.tsx"

    - id: COMP-002
      severity: medium
      rule: "Functional components"
      location: "apps/web/main-app/src/components/Legacy/index.tsx:15"
      issue: "Class component detected"
      code: "class Legacy extends React.Component"
      fix: "Convert to functional component with hooks"

  tokens:
    in: <n>
    out: <n>
```

## Completion Signal

- `COMPONENT CHECK COMPLETE: PASS`
- `COMPONENT CHECK COMPLETE: FAIL`

## Non-Negotiables

- Do NOT modify any files
- MUST check all component directories
- MUST verify __tests__ directory existence
- MUST identify misplaced test files
- MUST detect class components
