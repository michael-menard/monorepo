# Story 4.1: BrickLink MOC Import - Complete Integration

**Sprint:** 4 (Weeks 7-8)  
**Story Points:** 34  
**Priority:** High  
**Dependencies:** Story 3.2  

## User Story
```
As a user
I want to import MOCs from BrickLink URLs with pricing information
So that I can track MOCs from multiple platforms with cost data
```

## Acceptance Criteria

### Frontend Changes
- [ ] Extend URL input to support BrickLink URL validation
  - [ ] Update URL validation to recognize BrickLink URL patterns
  - [ ] Add BrickLink URL format examples and help text
  - [ ] Show platform detection indicator (Rebrickable vs BrickLink)
  - [ ] Update URL preview to show BrickLink-specific information
  - [ ] Handle BrickLink authentication requirements in UI
- [ ] Add BrickLink-specific import progress indicators
  - [ ] Create BrickLink-specific progress steps (auth, fetch, pricing, process)
  - [ ] Show pricing data extraction progress
  - [ ] Add BrickLink API rate limiting indicators
  - [ ] Display authentication status during import
- [ ] Create pricing display components for imported MOCs
  - [ ] Build price display component with currency formatting
  - [ ] Show current price, original price, and price history
  - [ ] Add price change indicators (up/down arrows)
  - [ ] Display price per piece calculations
  - [ ] Show price comparison between platforms
- [ ] Add platform indicator badges (Rebrickable vs BrickLink)
  - [ ] Create platform badges with distinctive styling
  - [ ] Show platform logos and colors
  - [ ] Add platform-specific metadata display
  - [ ] Include platform reliability indicators
- [ ] Implement platform-specific error handling UI
  - [ ] Create BrickLink-specific error messages
  - [ ] Show BrickLink authentication errors clearly
  - [ ] Add BrickLink API limit exceeded handling
  - [ ] Provide platform-specific troubleshooting guidance

### Backend Changes
- [ ] Implement BrickLink URL parsing and validation
  - [ ] Create BrickLink URL parser for various URL formats
  - [ ] Extract MOC/set IDs from BrickLink URLs
  - [ ] Validate BrickLink URL accessibility and format
  - [ ] Handle BrickLink catalog vs store URLs
- [ ] Integrate with BrickLink API for MOC and pricing data
  - [ ] Setup BrickLink API client with OAuth authentication
  - [ ] Implement MOC metadata extraction from BrickLink
  - [ ] Extract pricing data from BrickLink marketplace
  - [ ] Get availability and seller information
  - [ ] Handle BrickLink API rate limiting and quotas
- [ ] Create BrickLink authentication handling
  - [ ] Implement OAuth flow for BrickLink API access
  - [ ] Store and refresh BrickLink access tokens
  - [ ] Handle BrickLink authentication errors and renewal
  - [ ] Add BrickLink permission validation
- [ ] Implement pricing data extraction and storage
  - [ ] Extract current pricing from BrickLink marketplace
  - [ ] Store price history and trends
  - [ ] Calculate price statistics (min, max, average)
  - [ ] Handle multiple currency support
  - [ ] Implement price update scheduling
- [ ] Add BrickLink-specific image processing
  - [ ] Download images from BrickLink with proper attribution
  - [ ] Handle BrickLink image formats and sizes
  - [ ] Process BrickLink catalog images vs user images
  - [ ] Implement BrickLink image optimization
- [ ] Create platform-agnostic import pipeline
  - [ ] Refactor import pipeline to support multiple platforms
  - [ ] Create platform-specific adapters and processors
  - [ ] Implement unified MOC data format
  - [ ] Add platform-specific validation and enrichment

### Database Changes
- [ ] Add pricing fields to mocs table (current_price, original_price)
  - [ ] Add current_price, original_price, currency fields
  - [ ] Include price_per_piece calculated field
  - [ ] Add price_last_updated timestamp
  - [ ] Create indexes for price-based queries
- [ ] Create platform_sources table for tracking import sources
  - [ ] Store platform name, URL, import metadata
  - [ ] Track platform-specific identifiers and references
  - [ ] Add platform reliability and quality scores
  - [ ] Include platform-specific configuration
- [ ] Add price_history table for tracking price changes
  - [ ] Store historical pricing data with timestamps
  - [ ] Track price changes and trends over time
  - [ ] Include seller information and availability
  - [ ] Add price source and reliability indicators
- [ ] Update moc_imports table to handle multiple platforms
  - [ ] Add platform field to import tracking
  - [ ] Store platform-specific import metadata
  - [ ] Track platform-specific errors and issues
  - [ ] Add platform performance metrics

### API Changes
- [ ] Extend /api/import/start to handle BrickLink URLs
  - [ ] Update import endpoint to detect and route BrickLink URLs
  - [ ] Add BrickLink-specific validation and preprocessing
  - [ ] Handle BrickLink authentication requirements
  - [ ] Return platform-specific import job metadata
- [ ] Create /api/pricing/update endpoint for price refreshes
  - [ ] Implement manual price update functionality
  - [ ] Add bulk price update for collections
  - [ ] Schedule automatic price updates
  - [ ] Handle pricing API failures and retries
- [ ] Add platform detection to import status responses
  - [ ] Include platform information in status updates
  - [ ] Show platform-specific progress and metrics
  - [ ] Add platform-specific error details
  - [ ] Include platform performance indicators
- [ ] Implement BrickLink rate limiting and error handling
  - [ ] Add BrickLink API rate limiting compliance
  - [ ] Implement exponential backoff for API calls
  - [ ] Handle BrickLink API errors and quotas
  - [ ] Add BrickLink service health monitoring

### Testing & Quality
- [ ] Unit tests for BrickLink URL parsing and API integration
  - [ ] Test various BrickLink URL formats and edge cases
  - [ ] Test BrickLink API client functionality
  - [ ] Test OAuth authentication flow
  - [ ] Test error handling for API failures
- [ ] Integration tests for pricing data extraction
  - [ ] Test pricing data accuracy and completeness
  - [ ] Test price history tracking and updates
  - [ ] Test multi-currency support
  - [ ] Test pricing API rate limiting
- [ ] E2E tests for BrickLink import flow
  - [ ] Test complete BrickLink import workflow
  - [ ] Test platform detection and routing
  - [ ] Test pricing display and updates
  - [ ] Test error recovery and retry mechanisms
- [ ] Performance tests for dual-platform support
  - [ ] Test concurrent imports from multiple platforms
  - [ ] Test platform switching and comparison
  - [ ] Test pricing update performance
  - [ ] Validate memory usage with multiple platforms
- [ ] Error handling tests for BrickLink API failures
  - [ ] Test authentication failures and renewal
  - [ ] Test API rate limiting scenarios
  - [ ] Test network failures and timeouts
  - [ ] Test malformed data handling
- [ ] Linter runs and passes
  - [ ] ESLint passes with no errors
  - [ ] Prettier formatting applied
  - [ ] TypeScript compilation successful

## Technical Implementation Notes

### BrickLink API Integration
```typescript
interface BrickLinkClient {
  authenticate(): Promise<AuthResult>
  getMOCData(mocId: string): Promise<BrickLinkMOC>
  getPricingData(itemId: string): Promise<PricingData>
  searchItems(query: string): Promise<SearchResult[]>
}

interface PricingData {
  currentPrice: number
  originalPrice: number
  currency: string
  pricePerPiece: number
  availability: 'available' | 'out_of_stock' | 'discontinued'
  sellers: SellerInfo[]
  priceHistory: PricePoint[]
}
```

### Platform-Agnostic Import Pipeline
```typescript
interface PlatformAdapter {
  platform: 'rebrickable' | 'bricklink'
  parseURL(url: string): ParsedURL
  extractMOCData(id: string): Promise<MOCData>
  validateCredentials(): Promise<boolean>
  getRateLimit(): RateLimitInfo
}

interface UnifiedMOCData {
  title: string
  description: string
  pieceCount: number
  images: string[]
  pricing?: PricingData
  platform: string
  sourceUrl: string
  metadata: Record<string, any>
}
```

### Database Schema Updates
```sql
-- Add pricing fields to mocs table
ALTER TABLE mocs ADD COLUMN current_price DECIMAL(10,2);
ALTER TABLE mocs ADD COLUMN original_price DECIMAL(10,2);
ALTER TABLE mocs ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE mocs ADD COLUMN price_per_piece DECIMAL(10,4);
ALTER TABLE mocs ADD COLUMN price_last_updated TIMESTAMP;

-- Create platform_sources table
CREATE TABLE platform_sources (
  id SERIAL PRIMARY KEY,
  moc_id INTEGER REFERENCES mocs(id),
  platform VARCHAR(50) NOT NULL,
  platform_id VARCHAR(100) NOT NULL,
  source_url TEXT NOT NULL,
  import_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(moc_id, platform)
);

-- Create price_history table
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  moc_id INTEGER REFERENCES mocs(id),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
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
- Credential management system from Story 3.2
- BrickLink API access and OAuth setup
- Pricing data storage infrastructure

## Risks & Mitigation
- **Risk:** BrickLink API complexity and rate limiting
- **Mitigation:** Implement robust rate limiting and caching strategies
- **Risk:** OAuth authentication complexity
- **Mitigation:** Use proven OAuth libraries and thorough testing
