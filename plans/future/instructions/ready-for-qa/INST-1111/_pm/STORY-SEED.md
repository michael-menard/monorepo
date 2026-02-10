# INST-1111: E2E Tests for File Upload Stories

## Summary

Implement Playwright E2E tests for the file upload functionality covered by INST-1103 (Thumbnail Upload) and INST-1104 (Instructions Upload).

## Context

The upload stories (INST-1103, INST-1104) were implemented with unit and backend tests, but E2E tests were deferred due to test data setup complexity:

1. **Test User Data Mismatch**: The Cognito test user (stan.marsh@southpark.test) has a different user_id than the MOCs seeded in the database
2. **MOC Ownership**: E2E tests need MOCs owned by the test user to test upload functionality
3. **Dependency on INST-1102**: The Create MOC flow needs to work in E2E to set up test data

## Requirements

### Test Data Setup
- Either seed MOCs for the Cognito test users, OR
- Use the Create MOC flow (INST-1102) to create MOCs before testing uploads
- Ensure test user can access their own MOC detail pages

### E2E Tests to Implement

**From INST-1104 (Instructions Upload):**
- AC65: Upload single 5MB PDF successfully
- AC66: File appears in instructions list after upload
- AC67: Upload multiple PDFs (2-3 files) sequentially
- AC68: All files appear in list after upload
- AC69: Reject 15MB PDF with error message (upgrade hint)
- AC70: Reject JPEG file with error "Only PDF files allowed"
- AC71: Download button functional for uploaded files

**From INST-1103 (Thumbnail Upload):**
- Verify existing E2E tests work with proper test data

### Test Infrastructure
- Create appropriate PDF fixtures (5MB valid, 15MB oversized)
- Set up test user data seeding or dynamic MOC creation
- Ensure graceful skipping if preconditions not met

## Technical Notes

- Tests should use Playwright BDD (Gherkin/Cucumber) format
- Follow existing patterns from inst-1107-download.steps.ts
- Use graceful test.skip() for missing preconditions
- Consider adding chromium-spec project for non-BDD tests if needed

## Blocked By

- INST-1102: Create Basic MOC (for dynamic test data creation)

## Points Estimate

2 story points (test implementation + data setup)
