# Story 2.1: Migrate Gallery Feature - Complete End-to-End

**Sprint:** 2 (Weeks 3-4)  
**Story Points:** 34  
**Priority:** High  
**Dependencies:** Sprint 1 completion  

## User Story
```
As a user
I want to view and manage my MOC gallery with all existing functionality
So that I can browse my collection within the new app architecture
```

## Acceptance Criteria

### Frontend Changes
- [ ] Create apps/web/gallery-app with complete structure
  - [ ] Setup package.json with proper dependencies (@repo/ui, @repo/cache, etc.)
  - [ ] Create src/ directory with App.tsx and main.tsx
  - [ ] Configure Vite build configuration for gallery-app
  - [ ] Setup TypeScript configuration
- [ ] Move MocCard, GalleryControls, GridView, ListView components
  - [ ] Move MocCard component from main-app to gallery-app/src/components/
  - [ ] Move GalleryControls component with filtering and sorting
  - [ ] Move GridView component for grid layout display
  - [ ] Move ListView component for list layout display
  - [ ] Update all imports and component references
- [ ] Move GalleryLayout component to gallery-app
  - [ ] Move gallery-specific layout components
  - [ ] Update layout to work within shell MainArea
  - [ ] Ensure responsive behavior is maintained
- [ ] Setup TanStack Router for gallery routes (/gallery, /gallery/search)
  - [ ] Configure gallery-specific routing
  - [ ] Create route definitions for gallery pages
  - [ ] Setup route parameters and query handling
  - [ ] Implement proper route guards and loading states
- [ ] Configure RTK store for gallery state management
  - [ ] Move gallerySlice from main-app to gallery-app
  - [ ] Setup gallery-specific Redux store
  - [ ] Configure RTK Query for gallery API calls
  - [ ] Update state selectors and actions
- [ ] Implement gallery filtering and sorting UI
  - [ ] Rebuild filtering interface with design system components
  - [ ] Implement sorting controls (name, date, pieces, price)
  - [ ] Add view toggle (grid/list) functionality
  - [ ] Create filter chips for active filters
- [ ] Integrate gallery-app with shell layout
  - [ ] Ensure gallery renders within shell MainArea
  - [ ] Update navigation to point to gallery-app routes
  - [ ] Test cross-app navigation functionality

### Backend/Data Changes
- [ ] Create gallery API endpoints (/api/gallery/mocs, /api/gallery/search)
  - [ ] GET /api/gallery/mocs for fetching MOC collection
  - [ ] GET /api/gallery/search for search functionality
  - [ ] POST /api/gallery/mocs for adding new MOCs
  - [ ] PUT /api/gallery/mocs/:id for updating MOCs
  - [ ] DELETE /api/gallery/mocs/:id for removing MOCs
- [ ] Implement MOC data models and database schema
  - [ ] Create or update mocs table with all required fields
  - [ ] Add indexes for efficient querying and sorting
  - [ ] Create relationships for tags, categories, images
- [ ] Create gallery filtering and sorting logic
  - [ ] Implement backend filtering by theme, piece count, price
  - [ ] Add sorting logic for multiple criteria
  - [ ] Create efficient database queries for large collections
- [ ] Setup image storage and retrieval for MOC images
  - [ ] Configure image upload and storage system
  - [ ] Implement image optimization and resizing
  - [ ] Create image serving with proper caching headers
- [ ] Implement pagination for large collections
  - [ ] Add pagination parameters to API endpoints
  - [ ] Implement cursor-based pagination for performance
  - [ ] Create pagination metadata in API responses

### Infrastructure Changes
- [ ] Add gallery-app to Turbo build pipeline
  - [ ] Update turbo.json to include gallery-app
  - [ ] Configure build dependencies and caching
  - [ ] Setup development and production build scripts
- [ ] Configure Vite build for gallery-app
  - [ ] Setup Vite configuration for gallery-app
  - [ ] Configure build optimization and code splitting
  - [ ] Setup development server configuration
- [ ] Setup gallery-app deployment configuration
  - [ ] Configure deployment scripts for gallery-app
  - [ ] Setup environment variables and configuration
  - [ ] Configure routing for single-page app deployment

### Testing & Quality
- [ ] Unit tests for all gallery components (>90% coverage)
  - [ ] Test MocCard component rendering and interactions
  - [ ] Test GalleryControls filtering and sorting
  - [ ] Test GridView and ListView display logic
  - [ ] Test gallery state management and reducers
- [ ] Integration tests for gallery API endpoints
  - [ ] Test MOC CRUD operations
  - [ ] Test filtering and sorting API functionality
  - [ ] Test pagination and large dataset handling
  - [ ] Test image upload and retrieval
- [ ] E2E tests for gallery user journeys (browse, filter, sort)
  - [ ] Test complete gallery browsing experience
  - [ ] Test filtering by different criteria
  - [ ] Test sorting and view switching
  - [ ] Test navigation between gallery and other apps
- [ ] Performance tests (gallery loads in <2s with 100+ MOCs)
  - [ ] Test gallery loading performance with large datasets
  - [ ] Test image loading and lazy loading performance
  - [ ] Test filtering and sorting performance
- [ ] Accessibility tests pass
  - [ ] Test keyboard navigation through gallery
  - [ ] Test screen reader compatibility
  - [ ] Test color contrast and visual accessibility
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied
  - [ ] TypeScript compilation successful

## Technical Implementation Notes

### Gallery App Structure
```
apps/web/gallery-app/
├── src/
│   ├── App.tsx                 # Gallery app root
│   ├── main.tsx               # Entry point
│   ├── components/
│   │   ├── Gallery/           # Gallery components
│   │   │   ├── MocCard.tsx
│   │   │   ├── GalleryControls.tsx
│   │   │   ├── GridView.tsx
│   │   │   └── ListView.tsx
│   │   └── Layout/
│   │       └── GalleryLayout.tsx
│   ├── routes/
│   │   ├── index.ts           # Gallery routing
│   │   └── pages/
│   │       ├── GalleryPage.tsx
│   │       └── SearchPage.tsx
│   ├── store/
│   │   ├── index.ts           # Gallery store
│   │   └── slices/
│   │       └── gallerySlice.ts
│   └── services/
│       └── galleryApi.ts      # Gallery API
```

### API Endpoint Structure
```typescript
// Gallery API endpoints
GET    /api/gallery/mocs?page=1&limit=20&sort=name&filter=theme:castle
POST   /api/gallery/mocs
GET    /api/gallery/mocs/:id
PUT    /api/gallery/mocs/:id
DELETE /api/gallery/mocs/:id
GET    /api/gallery/search?q=castle&filters=...
```

## Definition of Done Checklist
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Integration tests passing
- [ ] **Linter runs and passes (ESLint + Prettier)**
- [ ] Accessibility requirements met
- [ ] Performance requirements met
- [ ] Documentation updated
- [ ] QA testing completed
- [ ] Product Owner acceptance

## Dependencies
- Shell layout implementation from Story 1.1
- Design system components from Story 1.2
- Code quality standards from Story 1.3

## Risks & Mitigation
- **Risk:** Complex state migration causing data loss
- **Mitigation:** Thorough testing and gradual migration approach
- **Risk:** Performance issues with large MOC collections
- **Mitigation:** Implement pagination and lazy loading from the start
