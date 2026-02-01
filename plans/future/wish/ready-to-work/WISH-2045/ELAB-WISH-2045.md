# Elaboration Report - WISH-2045

**Date**: 2026-01-31
**Verdict**: CONDITIONAL PASS

## Summary

WISH-2045 (HEIC/HEIF Image Format Support) is well-structured with clear scope and comprehensive test coverage. Story provides a complete user journey for HEIC detection, conversion to JPEG, and integration with existing compression workflow. Four clarification issues identified regarding heic2any return type handling, MIME type fallback, transparency handling, and large file warning thresholds—all resolvable during implementation refinement.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md exactly: HEIC detection, conversion via heic2any, progress indicators, fallback handling, browser compatibility |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals align, AC matches scope, test plan covers all AC |
| 3 | Reuse-First | PASS | — | Builds on existing imageCompression.ts structure from WISH-2022, leverages useS3Upload hook, uses heic2any library (MIT, 2M+ weekly downloads) |
| 4 | Ports & Adapters | PASS | — | Frontend-only story, no API endpoints. Properly isolated client-side conversion logic in utils layer |
| 5 | Local Testability | PASS | — | Unit tests specified for HEIC detection/conversion/filename, integration tests for conversion workflow, Playwright E2E for happy path and error cases |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Open Questions section states "None - all requirements are clear and non-blocking" |
| 7 | Risk Disclosure | PASS | — | Comprehensive risk disclosure: browser memory limits, conversion quality loss, browser compatibility (WebAssembly), conversion latency, EXIF metadata loss, file size increase before compression |
| 8 | Story Sizing | PASS | — | 16 ACs is high but appropriate for format support. Single-purpose (HEIC support), focused scope, 3 points reasonable. Not too large - conversion + integration with existing workflow |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | heic2any return type handling incomplete | Medium | Story mentions "The heic2any library returns a Blob or Blob[], handle both cases" but AC and architecture notes don't specify handling strategy. Should clarify if multi-image HEIC returns array and how to handle it. | Not Reviewed |
| 2 | MIME type fallback risk | Low | AC mentions HEIC files may have MIME type `application/octet-stream` from some apps, but this isn't reflected in AC or validation logic. Should clarify if validation should accept octet-stream for .heic/.heif files. | Not Reviewed |
| 3 | Transparency handling detail missing | Low | Edge case #1 mentions "convert transparency to white background" but doesn't specify if this is automatic behavior of heic2any or requires configuration. Should verify library behavior. | Not Reviewed |
| 4 | Large file warning threshold | Low | Edge case #3 mentions "> 10MB may cause browser memory issues; show warning before conversion" but MAX_FILE_SIZE is already 10MB in useS3Upload. Contradictory - should clarify if warning threshold is lower (e.g., 5MB) or if max size should be increased. | Not Reviewed |

## Split Recommendation

Not applicable - story is appropriately sized at 3 points and well-scoped for single implementation effort.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | heic2any return type handling incomplete | Not Reviewed | Requires PM/dev discussion on multi-image HEIC strategy |
| 2 | MIME type fallback risk | Not Reviewed | Validation logic needs clarification for non-standard MIME types |
| 3 | Transparency handling detail missing | Not Reviewed | Library behavior verification required before implementation |
| 4 | Large file warning threshold | Not Reviewed | Contradicts existing MAX_FILE_SIZE constant; needs alignment |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| — | — | — | None identified during audit |

### Follow-up Stories Suggested

- [ ] Server-side HEIC conversion fallback (if client-side conversion fails in production)
- [ ] HEIC telemetry tracking for conversion success/failure rates

### Items Marked Out-of-Scope

- HEIC native storage (convert to JPEG for compatibility)
- HEIC display in browsers (rely on JPEG conversion)
- Other exotic image formats (focus on HEIC/HEIF only)
- Server-side HEIC conversion (client-side conversion for MVP)

## Proceed to Implementation?

**YES** - Story may proceed with standard refinement process. The four clarification issues are implementation-level details that should be resolved by dev team during backlog refinement before sprint commitment. These are not blocking issues—they represent expected discovery work that will occur naturally during implementation planning.

**Recommendation**: Schedule quick PM/dev sync to clarify:
1. Multi-image HEIC handling (take first image vs. error vs. convert separately)
2. MIME type validation against octet-stream
3. Transparency handling verification with heic2any library
4. Large file warning threshold (5MB vs. 10MB alignment)

Once clarified, story is ready for implementation assignment.
