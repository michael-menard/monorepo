# Test Utilities

This directory contains shared test utility functions used across the app-wishlist-gallery test suite.

## Coverage Requirements

Test utilities are held to a **higher coverage standard** than the rest of the codebase:

- **Minimum coverage: 80%** for all metrics (lines, functions, branches, statements)
- Global project coverage remains at 45%
- This two-tier strategy ensures critical test infrastructure maintains high quality

## Running Coverage Checks

### Full test suite with coverage

```bash
pnpm --filter app-wishlist-gallery test:coverage
```

### Test utilities only

```bash
pnpm --filter app-wishlist-gallery vitest run src/test/utils --coverage
```

### All tests with coverage

```bash
pnpm --filter app-wishlist-gallery vitest run --coverage
```

## Viewing Coverage Reports

Coverage reports are generated in HTML format for detailed inspection:

1. Run any coverage command above
2. Open `coverage/index.html` in your browser
3. Navigate to `src/test/utils/` to see per-file breakdown

The HTML report provides:
- Line-by-line coverage highlighting
- Branch coverage details
- Function coverage metrics
- Per-directory summaries

## Maintaining Coverage

When adding new test utilities:

1. **Write tests first** - Consider edge cases and error conditions
2. **Run coverage locally** - Verify 80% threshold before committing
3. **Review HTML report** - Check for untested branches and edge cases
4. **CI enforcement** - Tests will fail if coverage drops below 80%

### Example: Adding a new utility

```typescript
// src/test/utils/myNewUtility.ts
export function myNewUtility(param: string): string {
  if (!param) {
    throw new Error('param is required')
  }
  return param.toUpperCase()
}
```

```typescript
// src/test/utils/__tests__/myNewUtility.test.ts
import { describe, it, expect } from 'vitest'
import { myNewUtility } from '../myNewUtility'

describe('myNewUtility', () => {
  it('transforms input to uppercase', () => {
    expect(myNewUtility('hello')).toBe('HELLO')
  })

  it('throws error for empty string', () => {
    expect(() => myNewUtility('')).toThrow('param is required')
  })

  it('handles special characters', () => {
    expect(myNewUtility('hello-world!')).toBe('HELLO-WORLD!')
  })
})
```

## Current Utilities

- **createMockFile** - Creates mock File objects for upload testing
- **mockS3Upload** - Mocks AWS S3 upload functionality for integration tests

All utilities are re-exported from `index.ts` for convenient importing.
