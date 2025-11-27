# Story 4.2: Import Review and Confirmation System

**Sprint:** 4 (Weeks 7-8)  
**Story Points:** 29  
**Priority:** High  
**Dependencies:** Story 4.1  

## User Story
```
As a user
I want to review and edit imported MOC data before saving
So that I can ensure accuracy and add personal notes
```

## Acceptance Criteria

### Frontend Changes
- [ ] Create comprehensive import review interface
  - [ ] Build review page with imported MOC data display
  - [ ] Show side-by-side comparison of original vs imported data
  - [ ] Add edit functionality for all MOC fields
  - [ ] Include image gallery with reordering capability
  - [ ] Apply design system styling with clear visual hierarchy
- [ ] Build MOC data editing form with validation
  - [ ] Create editable fields for title, description, piece count
  - [ ] Add theme/category selection with autocomplete
  - [ ] Include tags input with suggestions
  - [ ] Add personal notes and rating fields
  - [ ] Implement real-time validation and error display
- [ ] Implement image management (add, remove, reorder)
  - [ ] Create image gallery with drag-and-drop reordering
  - [ ] Add image upload functionality for additional photos
  - [ ] Implement image removal with confirmation
  - [ ] Add image editing tools (crop, rotate, brightness)
  - [ ] Show image metadata and optimization status
- [ ] Add confidence indicators for AI-extracted data
  - [ ] Display confidence scores for each extracted field
  - [ ] Use color coding for high/medium/low confidence
  - [ ] Add tooltips explaining confidence levels
  - [ ] Highlight fields that need manual review
  - [ ] Show data source indicators (AI vs manual)
- [ ] Create save/cancel/retry import actions
  - [ ] Add "Save to Collection" button with loading states
  - [ ] Implement "Cancel Import" with confirmation dialog
  - [ ] Add "Retry Import" for failed extractions
  - [ ] Include "Save as Draft" for partial completion
  - [ ] Show save progress and success confirmation

### Backend Changes
- [ ] Create import review data structure and API
  - [ ] Design review data schema with confidence scores
  - [ ] Create API endpoints for review data retrieval
  - [ ] Implement review data validation and sanitization
  - [ ] Add review session management and expiration
- [ ] Implement confidence scoring for extracted data
  - [ ] Create confidence scoring algorithm for AI extractions
  - [ ] Score based on data source reliability and completeness
  - [ ] Add manual override capabilities for confidence scores
  - [ ] Track confidence score accuracy over time
- [ ] Build data validation and enrichment pipeline
  - [ ] Validate extracted data against known patterns
  - [ ] Enrich data with additional metadata and suggestions
  - [ ] Cross-reference with existing MOC database
  - [ ] Add duplicate detection and merging suggestions
- [ ] Create draft saving functionality
  - [ ] Implement draft MOC storage with user association
  - [ ] Add draft expiration and cleanup policies
  - [ ] Create draft retrieval and continuation functionality
  - [ ] Track draft editing history and changes
- [ ] Implement final MOC creation from review data
  - [ ] Create final MOC record from reviewed data
  - [ ] Handle image processing and storage finalization
  - [ ] Update import job status and completion tracking
  - [ ] Add MOC creation audit trail and logging

### Database Changes
- [ ] Create import_reviews table for review session data
  - [ ] Store review session ID, user ID, import job ID
  - [ ] Include review data, confidence scores, user edits
  - [ ] Add session expiration and status tracking
  - [ ] Create indexes for efficient review retrieval
- [ ] Add confidence_scores table for AI extraction quality
  - [ ] Store field-level confidence scores and sources
  - [ ] Track confidence score accuracy and feedback
  - [ ] Include manual override and validation data
  - [ ] Add confidence score analytics and reporting
- [ ] Create moc_drafts table for temporary storage
  - [ ] Store draft MOC data with user association
  - [ ] Include draft status, expiration, and edit history
  - [ ] Add draft sharing and collaboration features
  - [ ] Implement draft cleanup and archival policies
- [ ] Update mocs table with review metadata
  - [ ] Add review_completed, review_date fields
  - [ ] Include confidence_score summary field
  - [ ] Add manual_edits flag and edit count
  - [ ] Track data source and extraction method

### API Changes
- [ ] Create /api/import/review/:id endpoint
  - [ ] GET endpoint for retrieving import review data
  - [ ] Include extracted data, confidence scores, suggestions
  - [ ] Return review session information and status
  - [ ] Add review expiration and renewal handling
- [ ] Create /api/import/review/:id/save endpoint
  - [ ] POST endpoint for saving reviewed and edited data
  - [ ] Validate all user edits and modifications
  - [ ] Handle image processing and finalization
  - [ ] Return final MOC creation status and ID
- [ ] Create /api/import/review/:id/draft endpoint
  - [ ] POST endpoint for saving review as draft
  - [ ] Store partial review data for later completion
  - [ ] Handle draft expiration and cleanup
  - [ ] Return draft ID and continuation information
- [ ] Add /api/import/review/:id/retry endpoint
  - [ ] POST endpoint for retrying failed data extraction
  - [ ] Re-run AI extraction with updated parameters
  - [ ] Handle retry limits and cooldown periods
  - [ ] Return updated extraction results and confidence

### Testing & Quality
- [ ] Unit tests for review interface components
  - [ ] Test review form validation and editing
  - [ ] Test image management functionality
  - [ ] Test confidence score display and interactions
  - [ ] Test save/cancel/retry action handling
- [ ] Integration tests for review API endpoints
  - [ ] Test review data retrieval and formatting
  - [ ] Test draft saving and retrieval functionality
  - [ ] Test final MOC creation from review data
  - [ ] Test retry functionality and limits
- [ ] E2E tests for complete review workflow
  - [ ] Test full import-to-save user journey
  - [ ] Test review editing and validation
  - [ ] Test image management and reordering
  - [ ] Test draft saving and continuation
- [ ] Usability tests for review interface
  - [ ] Test review interface with real users
  - [ ] Validate confidence indicator clarity
  - [ ] Test editing workflow efficiency
  - [ ] Gather feedback on review process
- [ ] Performance tests for review data processing
  - [ ] Test review data loading performance
  - [ ] Test image processing and upload performance
  - [ ] Test concurrent review session handling
  - [ ] Validate memory usage during review
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied
  - [ ] TypeScript compilation successful

## Technical Implementation Notes

### Review Data Structure
```typescript
interface ImportReview {
  id: string
  importJobId: string
  userId: string
  extractedData: MOCData
  confidenceScores: ConfidenceScores
  userEdits: UserEdits
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  expiresAt: Date
}

interface ConfidenceScores {
  title: number
  description: number
  pieceCount: number
  images: number
  overall: number
}

interface UserEdits {
  title?: string
  description?: string
  pieceCount?: number
  tags?: string[]
  personalNotes?: string
  rating?: number
  imageOrder?: string[]
}
```

### Review API Structure
```typescript
// Review endpoints
GET    /api/import/review/:id
POST   /api/import/review/:id/save
POST   /api/import/review/:id/draft
POST   /api/import/review/:id/retry
DELETE /api/import/review/:id/cancel
```

### Database Schema
```sql
CREATE TABLE import_reviews (
  id SERIAL PRIMARY KEY,
  import_job_id INTEGER REFERENCES moc_imports(id),
  user_id INTEGER REFERENCES users(id),
  extracted_data JSONB NOT NULL,
  confidence_scores JSONB NOT NULL,
  user_edits JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE moc_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  review_id INTEGER REFERENCES import_reviews(id),
  draft_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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
- BrickLink import functionality from Story 4.1
- Image processing and storage infrastructure
- Review session management system

## Risks & Mitigation
- **Risk:** Complex review interface overwhelming users
- **Mitigation:** Progressive disclosure and user testing
- **Risk:** Review session data storage and cleanup complexity
- **Mitigation:** Implement robust cleanup policies and monitoring
