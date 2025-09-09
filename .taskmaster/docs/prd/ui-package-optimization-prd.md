# PRD: @repo/ui Package Architecture Optimization

**Status:** Draft  
**Priority:** Medium  
**Scope:** packages/ui  
**Timeline:** 2-3 weeks  

---

## Problem Statement

The current centralized `@repo/ui` package, while well-structured with proper tree-shaking, creates several development and operational challenges:

1. **Large Dependency Surface**: Apps inherit ALL @radix-ui dependencies (18+ packages) even when using only a few components
2. **Development Bottleneck**: Every component change requires rebuilding the entire UI package, slowing cross-team development
3. **Version Coupling**: All consuming apps must update together, even for unrelated component changes
4. **Bundle Size Impact**: Heavy dependency tree affects initial bundle analysis and dependency resolution

## Current State Analysis

### ✅ What's Working Well
- Proper tree-shaking with individual component exports (`./button`, `./card`, etc.)
- Consistent design system enforcement
- Good TypeScript setup with `.d.ts` files per component
- Single source of truth for UI components
- `"sideEffects": false` for optimal bundling

### ⚠️ Current Issues
```json
// Current package.json shows ALL dependencies bundled together
"dependencies": {
  "@radix-ui/react-accordion": "^1.2.11",
  "@radix-ui/react-alert-dialog": "^1.1.14",
  "@radix-ui/react-avatar": "^1.1.10",
  // ... 18+ more @radix-ui packages
  "framer-motion": "^12.23.3",
  "react-dropzone": "^14.3.8",
  "react-easy-crop": "^5.5.0"
  // Apps get ALL of these even if they only use <Button />
}
```

### Impact Assessment
- **Bundle Analysis**: Apps show large dependency trees even for simple component usage
- **Development Speed**: UI package rebuilds block feature development
- **Maintenance Overhead**: Version conflicts affect all consumers simultaneously

---

## Proposed Solution: Hybrid Architecture

### Architecture Overview

**Phase 1: Core/Complex Split** (Recommended)
```
@repo/ui-core/          # Essential atoms (button, input, badge, card)
@repo/ui-complex/       # Heavy components (data tables, charts, dropzones)
@repo/ui/               # Facade package + design tokens
```

**Phase 2: Granular Packages** (Future optimization)
```
@repo/ui-button/        # Individual component packages
@repo/ui-form/          # Related component groups  
@repo/ui-data/          # Data display components
```

### Recommended Implementation: Phase 1

#### 1. **@repo/ui-core** Package
**Purpose**: Essential, lightweight components used across all apps
```json
{
  "name": "@repo/ui-core",
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-label": "^2.1.7", 
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "tailwind-merge": "^2.6.0"
  }
}
```

**Components**: Button, Input, Label, Badge, Card, Separator, Avatar (basic)

#### 2. **@repo/ui-complex** Package  
**Purpose**: Feature-rich components with heavy dependencies
```json
{
  "name": "@repo/ui-complex", 
  "dependencies": {
    "@repo/ui-core": "workspace:*",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-select": "^2.2.5",
    "framer-motion": "^12.23.3",
    "react-dropzone": "^14.3.8",
    "react-easy-crop": "^5.5.0"
  }
}
```

**Components**: Dialog, Dropdown, Select, Popover, Tabs, Form, Guided Tour

#### 3. **@repo/ui** Facade Package
**Purpose**: Maintain backward compatibility + design tokens
```json
{
  "name": "@repo/ui",
  "exports": {
    "./globals.css": "./src/globals.css",
    "./tokens": "./dist/design-tokens.js",
    ".": "./dist/index.js"  // Re-exports from ui-core + ui-complex
  },
  "dependencies": {
    "@repo/ui-core": "workspace:*",
    "@repo/ui-complex": "workspace:*" 
  }
}
```

---

## Implementation Plan

### Phase 1: Core/Complex Split (Weeks 1-2)

#### Week 1: Package Structure Setup
- [ ] Create `packages/ui-core` with lightweight components
- [ ] Create `packages/ui-complex` with heavy components  
- [ ] Update build configurations for both packages
- [ ] Implement proper TypeScript declarations
- [ ] Add individual component exports

#### Week 2: Migration & Testing
- [ ] Update `@repo/ui` to re-export from core/complex
- [ ] Migrate consuming apps to direct imports where beneficial
- [ ] Update documentation with new import patterns
- [ ] Verify bundle size improvements
- [ ] Test tree-shaking effectiveness

### Phase 2: App-Specific Optimization (Week 3)
- [ ] Analyze app-specific component usage patterns
- [ ] Migrate high-usage apps to `@repo/ui-core` only
- [ ] Move feature-specific components to feature packages
- [ ] Document optimization strategies for teams

---

## Expected Benefits

### Bundle Size Reduction
```typescript
// Before: Apps importing Button get ALL dependencies
import { Button } from '@repo/ui'  // ~500kb+ of dependencies

// After: Apps get only essential dependencies  
import { Button } from '@repo/ui-core'  // ~50kb dependencies
import { Dialog } from '@repo/ui-complex'  // Only when needed
```

### Development Velocity
- **Faster rebuilds**: Core components rebuild independently
- **Parallel development**: Teams can work on different component tiers
- **Selective updates**: Apps choose which component sets to update

### Operational Benefits
- **Clearer dependency boundaries**: Explicit distinction between essential vs. optional
- **Better tree-shaking**: Smaller, focused packages optimize better
- **Reduced version conflicts**: Apps can pin different tiers independently

---

## Migration Strategy

### Backward Compatibility
```typescript
// @repo/ui continues to work (facade pattern)
import { Button, Dialog } from '@repo/ui'  // Still works

// New optimized imports available
import { Button } from '@repo/ui-core'      // Lightweight
import { Dialog } from '@repo/ui-complex'   // When needed
```

### Gradual Migration Path
1. **Week 1-2**: New packages available, old package still works
2. **Week 3-4**: Teams migrate high-traffic apps to `ui-core`
3. **Week 5-6**: Feature packages adopt granular imports
4. **Future**: Consider deprecating facade package

---

## Success Criteria

### Performance Metrics
- [ ] **Bundle size reduction**: 40-60% for apps using only core components
- [ ] **Build time improvement**: 30-50% faster UI package rebuilds  
- [ ] **Dependency count**: Reduce from 18+ to 3-5 for typical app usage

### Developer Experience
- [ ] **Backward compatibility**: Zero breaking changes during migration
- [ ] **Clear documentation**: Import patterns well-documented
- [ ] **Team adoption**: 80% of apps migrate to optimized imports within 6 weeks

### Operational Goals
- [ ] **Reduced conflicts**: Version update conflicts decrease by 70%
- [ ] **Faster releases**: UI updates can ship independently per tier
- [ ] **Better tree-shaking**: Bundle analyzers show cleaner dependency graphs

---

## Risks & Mitigations

### Risk: Increased Complexity
- **Mitigation**: Maintain facade package for backward compatibility
- **Timeline**: Gradual migration prevents disruption

### Risk: Inconsistent Usage
- **Mitigation**: Clear documentation + linting rules for import patterns
- **Enforcement**: ESLint rules to guide proper package usage

### Risk: Maintenance Overhead  
- **Mitigation**: Shared build tools and testing infrastructure
- **Automation**: Consistent versioning via changesets

---

## Technical Implementation Details

### Package Structure
```
packages/
├── ui/                 # Facade package (re-exports + tokens)
│   ├── src/globals.css
│   ├── src/design-tokens.ts  
│   └── src/index.ts    # Re-exports from core + complex
├── ui-core/           # Lightweight essentials
│   ├── src/button/
│   ├── src/input/
│   └── src/badge/
└── ui-complex/        # Heavy components
    ├── src/dialog/
    ├── src/select/
    └── src/form/
```

### Build Configuration
```typescript
// Shared vite.config.lib.ts for consistent builds
export default defineConfig({
  build: {
    lib: { /* standard config */ },
    rollupOptions: {
      external: ['react', 'react-dom', '@repo/ui-core'] // ui-complex depends on ui-core
    }
  }
})
```

---

## Future Considerations

### Potential Phase 3: Component-Per-Package
If Phase 1 proves successful, consider granular packages:
- `@repo/ui-button` - Single component packages
- `@repo/ui-form` - Related component groups
- `@repo/ui-data` - Data display components

### Integration with Design System
- Design tokens remain in `@repo/ui` for consistency
- Consider Tailwind plugin for design token distribution
- Storybook integration across all UI packages

---

## Commands & Scripts

### Development Commands
```bash
# Build all UI packages
pnpm --filter "@repo/ui*" run build

# Test UI packages
pnpm --filter "@repo/ui*" run test

# Analyze bundle impact
pnpm --filter @repo/ui-core run build:analyze
```

### Migration Examples
```typescript
// Before (current)
import { Button, Dialog, Select } from '@repo/ui'

// After (optimized) 
import { Button } from '@repo/ui-core'           // Lightweight
import { Dialog, Select } from '@repo/ui-complex' // When needed

// Or maintain compatibility
import { Button, Dialog, Select } from '@repo/ui'  // Still works via facade
```

---

## Conclusion

This hybrid architecture provides immediate bundle size benefits while maintaining backward compatibility. The phased approach allows teams to migrate gradually while realizing performance improvements early.

**Recommendation**: Start with Phase 1 (Core/Complex split) as it provides 80% of the benefits with minimal migration overhead.
