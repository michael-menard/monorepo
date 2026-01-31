# Future Opportunities - WISH-2011

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Playwright E2E MSW setup is explicitly out of scope | Medium | High | Story mentions browser-mode MSW for Playwright in Non-goals. This could be valuable for E2E tests but requires different MSW configuration (browser vs Node.js). Consider WISH-2014 for Playwright MSW integration. |
| 2 | Visual regression tests for upload progress out of scope | Low | Medium | Upload progress UI could benefit from Chromatic snapshots, but deferred to UX polish story. Not critical for MVP. |
| 3 | Real S3 integration tests against dev environment out of scope | Medium | Medium | End-to-end tests against actual S3 could catch integration issues MSW misses. Consider for staging/pre-prod verification. |
| 4 | Load testing with concurrent uploads out of scope | Low | High | Story only tests 2 concurrent uploads (AC8). Load testing with 10+ concurrent uploads deferred to performance story. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test utility: `createMockFile()` helper | Medium | Low | Story mentions considering this utility (line 269). Would reduce duplication across tests when creating File objects with specific MIME types and sizes. |
| 2 | Test utility: `mockS3Upload()` helper | Medium | Low | Story mentions considering this utility (line 270). Would simplify common upload test setups by wrapping MSW handler configuration and assertion patterns. |
| 3 | MSW handlers for additional S3 operations (DELETE, LIST) | Low | Medium | Current scope only covers presign GET and S3 PUT. Future stories might need DELETE (for cleanup) or LIST (for gallery features). |
| 4 | Error injection configuration API | Medium | Medium | ACs 3-4 mention error injection but don't specify how handlers should be configured for different error scenarios. Could benefit from a test utility like `configurePresignError('500')`. |
| 5 | S3 multipart upload mocking | Low | High | Current story only handles single PUT uploads. Large files (>5MB) might use multipart uploads in production. MSW handlers would need to mock CompleteMultipartUpload flow. Out of scope for MVP. |
| 6 | File content validation in MSW handlers | Low | Low | Current handlers accept any file content. Could add validation for image file signatures (magic numbers) to catch invalid uploads earlier in tests. |
| 7 | Progress callback testing utilities | Medium | Low | AC2 mentions simulating progress callbacks (0%, 50%, 100%) but doesn't provide a reusable way to verify progress tracking. Test helper could simplify assertions on progress state. |
| 8 | MSW request logging for debugging | Low | Low | AC14 requires verbose mode logs, but no guidance on enabling/disabling logging in tests. Environment variable or test utility could help debug MSW interception issues. |
| 9 | Fixture versioning and schema validation | Medium | Medium | AC12 adds fixture validation test, but no strategy for handling schema evolution. Future breaking changes to PresignResponseSchema might require fixture migration scripts. |
| 10 | TypeScript `satisfies` vs `as const` guidance | Low | Low | AC15 mandates `satisfies` for type safety, but doesn't explain when to use `as const` for readonly fixtures. Documentation could clarify best practices. |

## Categories

- **Edge Cases**: Load testing (#4), multipart uploads (#5), file content validation (#6)
- **UX Polish**: Visual regression tests (#2), progress callback utilities (#7)
- **Performance**: Load testing (#4), real S3 integration tests (#3)
- **Observability**: MSW request logging (#8), error injection config API (#4)
- **Integrations**: Playwright E2E MSW (#1), real S3 tests (#3), additional S3 operations (#3)
- **Developer Experience**: Test utilities (#1, #2, #4, #7, #8), documentation (#10), fixture versioning (#9)
