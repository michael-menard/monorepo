# Story 3.1: Basic AI MOC Import - Rebrickable URL to Database

**Sprint:** 3 (Weeks 5-6)  
**Story Points:** 34  
**Priority:** High  
**Dependencies:** Sprint 2 completion  

## User Story
```
As a user
I want to paste a Rebrickable URL and have the MOC automatically imported
So that I can quickly add MOCs to my collection without manual data entry
```

## Acceptance Criteria

### Frontend Changes
- [ ] Create URL input form with Rebrickable URL validation
  - [ ] Build URL input component with paste detection
  - [ ] Implement real-time Rebrickable URL validation
  - [ ] Show URL format examples and help text
  - [ ] Add URL preview with detected MOC information
  - [ ] Apply design system styling and accessibility
- [ ] Build import progress indicator with status updates
  - [ ] Create multi-step progress indicator (parsing, fetching, processing)
  - [ ] Implement LEGO brick loading animation
  - [ ] Show current step and estimated time remaining
  - [ ] Add cancel import functionality
  - [ ] Display detailed progress messages
- [ ] Create basic success/error states
  - [ ] Design success state with imported MOC preview
  - [ ] Create error states for different failure types
  - [ ] Add retry functionality for failed imports
  - [ ] Show partial success states when some data fails
- [ ] Add "Import with AI" button with loading states
  - [ ] Implement primary button with loading spinner
  - [ ] Disable button during import process
  - [ ] Show button state changes during import
  - [ ] Add keyboard shortcuts for import action
- [ ] Show imported MOC preview before saving
  - [ ] Display extracted MOC title and description
  - [ ] Show imported images in gallery format
  - [ ] Display piece count and basic metadata
  - [ ] Add "Save to Collection" and "Cancel" actions

### Backend Changes
- [ ] Setup MCP server with Node.js and TypeScript
  - [ ] Create new MCP server project structure
  - [ ] Configure TypeScript, ESLint, and build pipeline
  - [ ] Setup Express.js server with proper middleware
  - [ ] Configure environment variables and secrets management
  - [ ] Add health check and monitoring endpoints
- [ ] Implement Rebrickable URL parsing and validation
  - [ ] Create URL parser for Rebrickable MOC URLs
  - [ ] Extract MOC ID from various Rebrickable URL formats
  - [ ] Validate URL format and accessibility
  - [ ] Handle edge cases and malformed URLs
- [ ] Integrate with Rebrickable API for MOC data extraction
  - [ ] Setup Rebrickable API client with authentication
  - [ ] Implement MOC metadata extraction (title, description, etc.)
  - [ ] Extract MOC images and download URLs
  - [ ] Get piece count and parts list information
  - [ ] Handle API rate limiting and error responses
- [ ] Create MOC data processing pipeline
  - [ ] Implement data validation and sanitization
  - [ ] Create standardized MOC data format
  - [ ] Add data enrichment and categorization
  - [ ] Implement duplicate detection logic
- [ ] Implement image downloading and storage
  - [ ] Download MOC images from Rebrickable
  - [ ] Implement image optimization and resizing
  - [ ] Store images in organized file structure
  - [ ] Generate thumbnails and different sizes
  - [ ] Add image metadata and alt text
- [ ] Build import status tracking system
  - [ ] Create import job tracking in database
  - [ ] Implement real-time status updates
  - [ ] Add import history and logging
  - [ ] Create import analytics and metrics

### Database Changes
- [ ] Create moc_imports table for tracking import status
  - [ ] Design import tracking schema with status, progress, errors
  - [ ] Add user_id, source_url, import_data fields
  - [ ] Include timestamps for import lifecycle tracking
  - [ ] Add indexes for efficient status queries
- [ ] Add import_source field to mocs table
  - [ ] Add source tracking (rebrickable, bricklink, manual)
  - [ ] Include original_url field for reference
  - [ ] Add import_date and import_metadata fields
  - [ ] Create indexes for source-based queries
- [ ] Create imported_images table for image metadata
  - [ ] Store image URLs, file paths, and metadata
  - [ ] Link images to MOCs and import jobs
  - [ ] Include image processing status and thumbnails
  - [ ] Add image optimization metadata
- [ ] Setup database triggers for import completion
  - [ ] Create triggers for import status changes
  - [ ] Implement automatic cleanup of failed imports
  - [ ] Add data integrity checks and constraints

### API Changes
- [ ] Create /api/import/start endpoint
  - [ ] POST endpoint to initiate MOC import from URL
  - [ ] Validate URL and user permissions
  - [ ] Create import job and return job ID
  - [ ] Handle duplicate URL detection
- [ ] Create /api/import/status/:id endpoint
  - [ ] GET endpoint for import job status
  - [ ] Return progress, current step, and estimated time
  - [ ] Include error details and partial results
  - [ ] Support real-time updates via polling
- [ ] Create /api/import/complete endpoint
  - [ ] POST endpoint to finalize import and save MOC
  - [ ] Validate imported data before saving
  - [ ] Handle user modifications to imported data
  - [ ] Return saved MOC with generated ID
- [ ] Implement real-time status updates via WebSocket/SSE
  - [ ] Setup WebSocket connection for real-time updates
  - [ ] Send progress updates during import process
  - [ ] Handle connection management and reconnection
  - [ ] Add authentication for WebSocket connections

### Testing & Quality
- [ ] Unit tests for URL validation and parsing
  - [ ] Test various Rebrickable URL formats
  - [ ] Test URL validation edge cases
  - [ ] Test MOC ID extraction accuracy
- [ ] Integration tests for Rebrickable API integration
  - [ ] Test API authentication and rate limiting
  - [ ] Test MOC data extraction accuracy
  - [ ] Test image downloading and processing
  - [ ] Test error handling for API failures
- [ ] E2E tests for complete import flow
  - [ ] Test full import workflow from URL to saved MOC
  - [ ] Test import cancellation and retry
  - [ ] Test real-time status updates
  - [ ] Test import with various MOC types
- [ ] Error handling tests for API failures
  - [ ] Test network failures and timeouts
  - [ ] Test API rate limiting scenarios
  - [ ] Test malformed data handling
  - [ ] Test partial import recovery
- [ ] Performance tests (import completes in <30s)
  - [ ] Benchmark import speed for various MOC sizes
  - [ ] Test concurrent import handling
  - [ ] Test image processing performance
  - [ ] Validate memory usage during imports
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied
  - [ ] TypeScript compilation successful

## Technical Implementation Notes

### MCP Server Structure
```
mcp-server/
├── src/
│   ├── server.ts              # Express server setup
│   ├── services/
│   │   ├── rebrickable.ts     # Rebrickable API client
│   │   ├── imageProcessor.ts  # Image download/processing
│   │   └── importProcessor.ts # Import pipeline
│   ├── models/
│   │   ├── Import.ts          # Import job model
│   │   └── MOC.ts            # MOC data model
│   └── routes/
│       └── import.ts          # Import API routes
```

### Import Flow Architecture
```typescript
interface ImportJob {
  id: string
  userId: string
  sourceUrl: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: string
  extractedData?: MOCData
  errors?: string[]
}

interface MOCData {
  title: string
  description: string
  pieceCount: number
  images: string[]
  sourceUrl: string
  metadata: Record<string, any>
}
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
- Gallery app completion from Sprint 2
- Rebrickable API access and documentation
- Image storage infrastructure setup

## Risks & Mitigation
- **Risk:** Rebrickable API changes or rate limiting
- **Mitigation:** Implement robust error handling and fallback mechanisms
- **Risk:** Image processing performance issues
- **Mitigation:** Implement async processing and optimization
