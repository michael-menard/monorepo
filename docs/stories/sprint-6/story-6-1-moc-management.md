# Story 6.1: MOC Domain - Advanced MOC Management

**Sprint:** 6 (Weeks 11-12)  
**Story Points:** 34  
**Priority:** High  
**Dependencies:** Story 5.1  

## User Story
```
As a user
I want advanced MOC management features including categories, tags, and status tracking
So that I can organize and track my MOC collection effectively
```

## Acceptance Criteria

### Frontend Changes
- [ ] Create apps/web/moc-app with complete structure
  - [ ] Setup package.json with proper dependencies
  - [ ] Create src/ directory with App.tsx and main.tsx
  - [ ] Configure Vite build configuration for moc-app
  - [ ] Setup TypeScript configuration and routing
- [ ] Build MOC detail view with comprehensive information
  - [ ] Create detailed MOC page with all metadata
  - [ ] Add image gallery with zoom and navigation
  - [ ] Show piece count, price, and build status
  - [ ] Display tags, categories, and custom fields
  - [ ] Include build notes and personal ratings
- [ ] Implement MOC editing and management interface
  - [ ] Create MOC editing form with all fields
  - [ ] Add tag management with autocomplete
  - [ ] Implement category assignment and creation
  - [ ] Add status tracking (wishlist, owned, built, sold)
  - [ ] Include custom field creation and editing
- [ ] Build MOC organization features
  - [ ] Create collection organization with folders/groups
  - [ ] Add bulk operations (tag, categorize, delete)
  - [ ] Implement MOC comparison view
  - [ ] Add MOC sharing and export functionality
  - [ ] Include MOC duplicate detection and merging
- [ ] Create MOC analytics and insights
  - [ ] Build MOC statistics dashboard
  - [ ] Show collection value and piece count totals
  - [ ] Add build progress tracking and timelines
  - [ ] Display theme and category breakdowns
  - [ ] Include spending analysis and trends

### Backend Changes
- [ ] Create comprehensive MOC API endpoints
  - [ ] GET /api/mocs for MOC listing with filtering
  - [ ] GET /api/mocs/:id for detailed MOC information
  - [ ] PUT /api/mocs/:id for MOC updates
  - [ ] DELETE /api/mocs/:id for MOC deletion
  - [ ] POST /api/mocs/bulk for bulk operations
- [ ] Implement MOC categorization and tagging system
  - [ ] Create category hierarchy and management
  - [ ] Add tag creation, editing, and deletion
  - [ ] Implement tag suggestions and autocomplete
  - [ ] Add category and tag analytics
- [ ] Build MOC status and progress tracking
  - [ ] Implement status workflow (wishlist → owned → built)
  - [ ] Add build progress tracking with milestones
  - [ ] Create build time estimation and tracking
  - [ ] Add completion percentage calculations
- [ ] Create MOC analytics and reporting
  - [ ] Calculate collection statistics and metrics
  - [ ] Generate spending reports and trends
  - [ ] Create build progress analytics
  - [ ] Add collection value tracking over time
- [ ] Implement MOC sharing and collaboration
  - [ ] Create MOC sharing with privacy controls
  - [ ] Add MOC export in various formats
  - [ ] Implement MOC comparison functionality
  - [ ] Add collaborative features for shared collections

### Database Changes
- [ ] Enhance mocs table with advanced fields
  - [ ] Add status, build_progress, completion_date fields
  - [ ] Include custom_fields JSONB for user-defined data
  - [ ] Add sharing_settings and privacy controls
  - [ ] Create indexes for efficient querying
- [ ] Create moc_categories table for organization
  - [ ] Store category hierarchy and relationships
  - [ ] Add category metadata and descriptions
  - [ ] Include category usage statistics
  - [ ] Create category assignment tracking
- [ ] Add moc_tags table for flexible tagging
  - [ ] Store tag names, colors, and descriptions
  - [ ] Track tag usage frequency and popularity
  - [ ] Add tag relationships and hierarchies
  - [ ] Include tag creation and modification history
- [ ] Create moc_build_logs table for progress tracking
  - [ ] Store build session data and progress
  - [ ] Track time spent and milestones reached
  - [ ] Add build notes and photo documentation
  - [ ] Include build difficulty and satisfaction ratings
- [ ] Add moc_analytics table for performance metrics
  - [ ] Store collection statistics and trends
  - [ ] Track user engagement and activity
  - [ ] Add performance metrics and insights
  - [ ] Include predictive analytics data

### API Changes
- [ ] Create advanced MOC management endpoints
  - [ ] GET /api/mocs/categories for category management
  - [ ] POST /api/mocs/categories for category creation
  - [ ] GET /api/mocs/tags for tag management
  - [ ] POST /api/mocs/tags for tag creation
  - [ ] PUT /api/mocs/:id/status for status updates
- [ ] Add MOC analytics and reporting endpoints
  - [ ] GET /api/mocs/analytics/collection for collection stats
  - [ ] GET /api/mocs/analytics/spending for spending analysis
  - [ ] GET /api/mocs/analytics/progress for build progress
  - [ ] GET /api/mocs/analytics/trends for trend analysis
- [ ] Implement MOC sharing and collaboration endpoints
  - [ ] POST /api/mocs/:id/share for sharing MOCs
  - [ ] GET /api/mocs/shared for accessing shared MOCs
  - [ ] POST /api/mocs/export for data export
  - [ ] GET /api/mocs/compare for MOC comparison
- [ ] Create bulk operations endpoints
  - [ ] POST /api/mocs/bulk/tag for bulk tagging
  - [ ] POST /api/mocs/bulk/categorize for bulk categorization
  - [ ] POST /api/mocs/bulk/status for bulk status updates
  - [ ] DELETE /api/mocs/bulk for bulk deletion

### Testing & Quality
- [ ] Unit tests for MOC management components
  - [ ] Test MOC detail view and editing
  - [ ] Test tag and category management
  - [ ] Test status tracking and progress
  - [ ] Test analytics and reporting components
- [ ] Integration tests for MOC API endpoints
  - [ ] Test MOC CRUD operations
  - [ ] Test category and tag management
  - [ ] Test bulk operations and performance
  - [ ] Test analytics and reporting accuracy
- [ ] E2E tests for MOC management workflows
  - [ ] Test complete MOC management lifecycle
  - [ ] Test organization and categorization
  - [ ] Test sharing and collaboration features
  - [ ] Test analytics and insights generation
- [ ] Performance tests for large collections
  - [ ] Test MOC listing and filtering performance
  - [ ] Test analytics calculation performance
  - [ ] Test bulk operations efficiency
  - [ ] Test concurrent user operations
- [ ] Data integrity tests for MOC operations
  - [ ] Test data consistency across operations
  - [ ] Test referential integrity maintenance
  - [ ] Test data migration and cleanup
  - [ ] Test backup and recovery procedures
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied
  - [ ] TypeScript compilation successful

## Technical Implementation Notes

### MOC App Structure
```
apps/web/moc-app/
├── src/
│   ├── App.tsx                 # MOC app root
│   ├── main.tsx               # Entry point
│   ├── components/
│   │   ├── MOC/               # MOC components
│   │   │   ├── MOCDetail.tsx
│   │   │   ├── MOCEdit.tsx
│   │   │   └── MOCCard.tsx
│   │   ├── Organization/      # Organization components
│   │   │   ├── CategoryManager.tsx
│   │   │   ├── TagManager.tsx
│   │   │   └── BulkOperations.tsx
│   │   └── Analytics/         # Analytics components
│   │       ├── CollectionStats.tsx
│   │       ├── SpendingAnalysis.tsx
│   │       └── ProgressTracking.tsx
│   ├── routes/
│   │   └── pages/
│   │       ├── MOCDetailPage.tsx
│   │       ├── MOCEditPage.tsx
│   │       └── AnalyticsPage.tsx
│   └── services/
│       └── mocApi.ts          # MOC API client
```

### MOC Data Model
```typescript
interface MOC {
  id: string
  title: string
  description: string
  pieceCount: number
  currentPrice?: number
  status: 'wishlist' | 'owned' | 'building' | 'built' | 'sold'
  buildProgress: number
  categories: Category[]
  tags: Tag[]
  customFields: Record<string, any>
  buildLogs: BuildLog[]
  sharingSettings: SharingSettings
  analytics: MOCAnalytics
}

interface Category {
  id: string
  name: string
  color: string
  parentId?: string
  description?: string
}

interface Tag {
  id: string
  name: string
  color: string
  description?: string
}
```

### Database Schema
```sql
-- Enhanced mocs table
ALTER TABLE mocs ADD COLUMN status VARCHAR(20) DEFAULT 'wishlist';
ALTER TABLE mocs ADD COLUMN build_progress INTEGER DEFAULT 0;
ALTER TABLE mocs ADD COLUMN completion_date TIMESTAMP;
ALTER TABLE mocs ADD COLUMN custom_fields JSONB DEFAULT '{}';
ALTER TABLE mocs ADD COLUMN sharing_settings JSONB DEFAULT '{"public": false}';

-- Categories table
CREATE TABLE moc_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  parent_id INTEGER REFERENCES moc_categories(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tags table
CREATE TABLE moc_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7),
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MOC-Category relationships
CREATE TABLE moc_category_assignments (
  moc_id INTEGER REFERENCES mocs(id),
  category_id INTEGER REFERENCES moc_categories(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (moc_id, category_id)
);

-- MOC-Tag relationships
CREATE TABLE moc_tag_assignments (
  moc_id INTEGER REFERENCES mocs(id),
  tag_id INTEGER REFERENCES moc_tags(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (moc_id, tag_id)
);
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
- User domain completion from Story 5.1
- Advanced database features and indexing
- Analytics and reporting infrastructure

## Risks & Mitigation
- **Risk:** Complex MOC data model affecting performance
- **Mitigation:** Optimize database queries and implement caching
- **Risk:** Analytics calculations becoming slow with large datasets
- **Mitigation:** Implement background processing and pre-calculated metrics
