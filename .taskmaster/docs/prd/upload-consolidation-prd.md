---
id: upload-consolidation-2025-01
title: File Upload Package Consolidation & Enhancement
owner: Development Team
area: packages
type: refactor
risk: medium
created: 2025-01-06
package: @monorepo/upload
---

# File Upload Package Consolidation & Enhancement

## Executive Summary
- **Problem**: Three separate packages (@monorepo/fileupload, @repo/features/ImageUploadModal, @repo/shared-image-utils) contain overlapping functionality for file and image uploads, creating code duplication, inconsistent APIs, and maintenance overhead
- **Audience**: Frontend developers using upload functionality, backend developers handling image processing, and end users experiencing inconsistent upload interfaces across the application
- **Opportunity**: Consolidating these packages will reduce bundle size, improve developer experience, create consistent UX patterns, and establish a single source of truth for upload functionality
- **Desired Outcome**: A unified, comprehensive upload system that handles all file/image upload scenarios with consistent API, reduced duplication, and enhanced capabilities

## Goals
- Consolidate FileUpload, ImageUploadModal, and shared-image-utils into a unified upload system
- Eliminate code duplication while preserving all existing functionality
- Create consistent API patterns across all upload scenarios
- Improve performance through better code organization and tree-shaking
- Enhance developer experience with simplified imports and unified documentation
- Maintain backward compatibility during migration period

## Constraints & Standards (Must-Follow)
- Design system: shadcn/ui, Tailwind tokens
- Types: TypeScript + Zod for all validation schemas
- State: RTK Query for upload API calls
- Testing: Vitest (unit), Playwright (e2e) with ≥90% coverage
- A11y: WCAG 2.2 AA, keyboard nav, axe clean, screen reader support
- Perf: Core Web Vitals budgets, lazy loading, tree-shaking optimization
- Security: no unsafe HTML, file type validation, size limits, sanitized uploads

## Acceptance Criteria
- Single package replaces three existing packages with feature parity
- All upload modes supported: inline, modal, avatar, drag-and-drop
- Unified API for file validation, processing, and upload progress
- Image processing integrated seamlessly with upload flows
- Backward compatibility maintained for existing consumers
- Bundle size reduced by at least 20% compared to importing all three packages
- Migration guide and automated migration scripts provided
- Zero accessibility regressions

## Vertical Slices

### Phase A — Compile + Storybook
- New consolidated package structure compiles successfully
- Core upload component renders in Storybook with all variants
- Basic file selection and validation working
- No build errors or TypeScript issues

### Phase B1 — Unit Tests
- File upload logic and validation covered
- Image processing integration tested
- Hook functionality validated
- Edge cases and error scenarios tested

### Phase B2 — E2E Smoke  
- Happy-path file upload flows working end-to-end
- Drag-and-drop functionality verified
- Modal and inline modes tested
- Progress tracking validated

### Phase C — Accessibility
- Axe violations: 0 across all upload variants
- Keyboard navigation through all focusable elements
- Screen reader announcements for upload states
- High contrast mode compatibility

### Phase D — Performance
- Bundle size reduction achieved and measured
- Lazy loading for heavy components implemented
- Tree-shaking optimization verified
- Core Web Vitals budget compliance

### Phase E — Security/Hardening
- File type validation enforced on both client and server
- File size limits properly implemented
- No unsafe HTML in file preview rendering
- Upload endpoint security headers verified

## Rollout / Risks
- **Migration Risk**: Breaking changes for existing consumers
  - **Mitigation**: Provide backward compatibility layer and automated migration scripts
- **Bundle Size Risk**: Consolidated package might be larger for simple use cases
  - **Mitigation**: Implement aggressive tree-shaking and optional feature imports
- **Performance Risk**: Merging complex packages might impact load times
  - **Mitigation**: Use dynamic imports and lazy loading for heavy features
- **Testing Risk**: Complex consolidation might introduce regressions
  - **Mitigation**: Comprehensive test coverage and feature flags for gradual rollout

## Appendix

### Current Package Analysis

#### @monorepo/fileupload (1.0.1)
**Features:**
- Drag & Drop interface
- File validation (type, size)
- Progress tracking
- Metadata support
- Multiple modes (modal, inline, avatar)
- Image cropping capability
- Error handling
- TypeScript + Zod validation

**Hooks:**
- useFileUpload
- useMetadataFields  
- useDragAndDrop
- useUploadProgress

#### @repo/features/ImageUploadModal
**Features:**
- Modal-specific image upload
- Drag & Drop support
- Image preview
- Progress tracking
- File validation
- Responsive design
- TypeScript support

**Hooks:**
- useImageUpload

#### @repo/shared-image-utils
**Features:**
- Backend image processing (Sharp)
- Frontend image processing (Canvas)
- Multiple format support (JPEG, PNG, WebP, AVIF)
- Predefined presets (avatar, thumbnail, gallery, hero, background)
- Responsive variants generation
- Image validation utilities
- Performance optimization

### Proposed Consolidated Architecture

```
@monorepo/upload/
├── components/
│   ├── UploadArea/          # Unified upload component
│   ├── UploadModal/         # Modal wrapper
│   ├── FilePreview/         # File preview components
│   └── ProgressIndicator/   # Progress tracking UI
├── hooks/
│   ├── useUpload/           # Main upload hook
│   ├── useFileValidation/   # Validation logic
│   ├── useImageProcessing/  # Image processing integration
│   └── useUploadProgress/   # Progress tracking
├── utils/
│   ├── validation/          # File validation utilities
│   ├── processing/          # Image processing utilities
│   └── presets/            # Predefined configurations
└── types/                  # TypeScript definitions
```

### Migration Strategy

1. **Phase 1**: Create new consolidated package structure
2. **Phase 2**: Migrate core functionality from existing packages
3. **Phase 3**: Add backward compatibility layer
4. **Phase 4**: Update consumers with migration scripts
5. **Phase 5**: Deprecate old packages after successful migration

### API Design

```typescript
// Unified Upload Component
<Upload
  mode="inline" | "modal" | "avatar"
  accept="image/*" | string[]
  multiple={boolean}
  onUpload={(files, metadata) => Promise<void>}
  processing={{
    enabled: boolean,
    preset: "avatar" | "thumbnail" | "gallery" | "hero" | "custom",
    config?: ImageProcessingConfig
  }}
  validation={{
    maxSize: number,
    allowedTypes: string[],
    maxFiles: number
  }}
  ui={{
    showPreview: boolean,
    showProgress: boolean,
    enableCropping: boolean,
    metadataFields: MetadataField[]
  }}
/>
```

### Performance Targets
- Bundle size: ≤80% of combined current packages
- First paint: <100ms for basic upload component
- Time to interactive: <200ms for modal with processing
- Memory usage: <50MB for image processing operations
- Tree-shaking: 100% unused code elimination
