# LEGO MOC Instructions App - Product Improvement Brief

## Current State Assessment

### Project Context

- **Type**: Personal portfolio project for job seeking
- **Users**: Primary user (developer) + small group of close friends
- **Tech Stack**: TypeScript, React, Zod, AWS S3/CloudFront, Tailwind, shadcn/ui
- **Backend**: AWS serverless architecture with Cognito authentication
- **Current Completion**: ~75% of MVP functionality implemented

### Core Value Proposition

A personal collection management tool for LEGO enthusiasts to organize purchased MOC instructions, track their physical collection, plan builds, and manage costs effectively. **Not a social platform** - focused on individual collection management.

### Primary User Persona

**The LEGO Collection Manager**: Adult LEGO enthusiast who regularly purchases MOC instructions from sites like Rebrickable, owns substantial LEGO collection, values organization and cost tracking, uses desktop for management and mobile for reference.

## Current Implementation Status

### ✅ Completed Features

- **MOC Creation**: Full-featured modal with file uploads (instructions, parts lists, images)
- **MOC Gallery**: Multiple view layouts (grid, list, masonry, table) with search/filter
- **MOC Detail View**: Comprehensive display with file management interface
- **Authentication**: Complete AWS Cognito integration
- **File Upload System**: Advanced upload with validation and progress tracking
- **UI/UX**: Professional interface with loading states, error handling, responsive design

### 🔧 Critical Gaps for MVP

1. **Download System**: Download buttons exist but lack functionality
2. **File Security**: Upload limits defined but not enforced
3. **MOC Editing**: Can create but cannot edit existing MOCs
4. **Projects System**: Key differentiator feature not implemented

## Recommended Product Improvements

### Priority 1: Core Download System

**Business Impact**: Essential for MVP - users cannot access their stored files
**Technical Scope**: Implement download functionality for individual files and bulk ZIP downloads
**User Story**: "As a user, I want to download my stored MOC files so I can access them while building"

### Priority 2: File Upload Security & Cost Control

**Business Impact**: Critical for cost management and preventing abuse
**Technical Scope**: Server-side validation, storage quotas, usage indicators
**User Story**: "As a system owner, I need to prevent file upload abuse to control AWS costs"

### Priority 3: MOC Management (Edit/Update)

**Business Impact**: Core functionality gap - users cannot maintain their collection
**Technical Scope**: Edit MOC metadata, add/remove files, update information
**User Story**: "As a user, I want to update my MOC information and files to keep my collection accurate"

### Priority 4: Projects System (Key Differentiator)

**Business Impact**: Major value-add that differentiates from simple file storage
**Technical Scope**: Project creation, MOC grouping, project-level analytics
**User Story**: "As a user, I want to group related MOCs into projects (like city builds) to organize themed collections"

## Technical Constraints & Requirements

### Performance Requirements

- File uploads: Support up to 50MB PDFs, 10MB images
- Storage limits: Prevent individual users from exceeding reasonable quotas
- Download speed: Efficient file serving via CloudFront CDN

### Security Requirements

- File type validation (PDF, CSV, images only)
- Size limits enforced server-side
- User isolation (users can only access their own files)
- No file sharing capabilities (legal compliance for purchased instructions)

### Scalability Considerations

- AWS serverless architecture handles scaling automatically
- Primary concern is cost control, not performance scaling
- Design for small user base (developer + friends)

## Success Metrics

### MVP Success Criteria

1. **Functional Completeness**: All core user stories from original workshop completed
2. **Cost Control**: AWS bills remain predictable and reasonable
3. **User Satisfaction**: Primary user (developer) uses system regularly for collection management
4. **Portfolio Value**: Demonstrates full-stack development capabilities for job interviews

### Feature-Specific Metrics

- **Downloads**: Users can successfully download 100% of uploaded files
- **Security**: Zero incidents of file upload abuse or cost overruns
- **Projects**: Users create and actively manage project groupings
- **Editing**: Users successfully update MOC information without data loss

## Business Context Notes

- **Not a commercial product**: No revenue model, no user acquisition strategy needed
- **Portfolio focus**: Features should demonstrate technical competency and product thinking
- **Legal compliance**: Respect intellectual property of purchased MOC instructions
- **Privacy-first**: Minimal data collection, user-centric privacy approach

## Integration Points

### Existing Systems

- **AWS S3**: File storage and serving
- **AWS Cognito**: User authentication and management
- **CloudFront**: CDN for file delivery
- **RTK Query**: API state management and caching

### Future Integrations (Stretch Goals)

- **Web scraping**: Automated pricing data from LEGO/alt-brick sites
- **Cost tracking**: Real-time pricing integration for build planning
- **Inventory management**: Track owned vs needed pieces

## Recommended PRD Generation Approach

For each priority improvement, the Product Owner should generate PRDs that include:

1. **Detailed user stories** with acceptance criteria
2. **Technical requirements** aligned with existing architecture
3. **UX specifications** consistent with current design system
4. **Security considerations** for file handling and cost control
5. **Testing requirements** to maintain code quality standards

The PRDs should assume the existing codebase foundation and focus on incremental improvements rather than architectural changes.
