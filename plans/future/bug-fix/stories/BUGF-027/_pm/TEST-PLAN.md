# Test Plan: BUGF-027

## Scope Summary

- **Endpoints touched**: None (documentation story)
- **UI touched**: No
- **Data/storage touched**: No
- **Deliverable**: Implementation guide document at `docs/guides/password-reset-rate-limiting.md`

## Happy Path Tests

### Test 1: Documentation Completeness

**Setup**:
- Fresh checkout of main branch
- Read guide document at `docs/guides/password-reset-rate-limiting.md`

**Action**:
- Verify all required sections are present per AC-1 through AC-6

**Expected Outcome**:
- Guide includes:
  - Cognito rate limiting behavior documentation (AC-1)
  - Frontend state management specification (AC-2)
  - UI/UX patterns for rate limit feedback (AC-3)
  - Component reuse strategy (AC-4)
  - Architectural boundaries documentation (AC-5)
  - Testing strategy for rate limiting (AC-6)

**Evidence**:
- Manual review checklist with all sections marked complete
- Cross-reference with BUGF-019 to confirm guide provides sufficient implementation guidance

### Test 2: Code Snippet Validity

**Setup**:
- Extract all code examples from guide document
- Create temporary TypeScript file with examples

**Action**:
- Run TypeScript compiler on extracted code snippets
- Verify imports resolve correctly (Amplify SDK, sessionStorage APIs)

**Expected Outcome**:
- All code snippets compile without type errors
- Import statements reference actual packages (aws-amplify, @aws-amplify/auth)

**Evidence**:
- TypeScript compilation output with 0 errors
- Validated against actual Amplify v6 API signatures

### Test 3: Pattern Consistency with Existing Code

**Setup**:
- Read guide's recommended patterns
- Read existing ForgotPasswordPage and ResendCodeButton implementations

**Action**:
- Compare guide patterns with actual codebase implementations
- Verify guide does not contradict existing working patterns

**Expected Outcome**:
- sessionStorage pattern matches ResendCodeButton implementation
- Error handling pattern matches ForgotPasswordPage exception handling
- Account enumeration prevention pattern preserved

**Evidence**:
- Side-by-side comparison table showing alignment
- No conflicting recommendations

## Error Cases

### Error Case 1: Incomplete Cognito Documentation

**Setup**:
- Review AC-1 requirements for Cognito rate limiting behavior

**Action**:
- Verify guide documents LimitExceededException response format
- Verify guide explains lack of Retry-After header

**Expected**:
- Guide clearly states Cognito does not provide retry-after metadata
- Guide specifies frontend must estimate cooldown duration

**Evidence**:
- AC-1 section includes explicit statement about missing Retry-After
- Guide provides fallback estimation algorithm

### Error Case 2: ADR Compliance Gaps

**Setup**:
- Read ADR-004 (Authentication Architecture) and ADR-005 (Testing Strategy)
- Review guide's architectural boundaries (AC-5) and testing strategy (AC-6)

**Action**:
- Verify guide states password reset is Cognito-managed (ADR-004)
- Verify guide references ADR-005 for UAT real service requirement

**Expected**:
- AC-5 section explicitly references ADR-004
- AC-6 section explicitly references ADR-005 for UAT constraints

**Evidence**:
- ADR references present in guide
- No architectural contradictions

### Error Case 3: Missing Security Guidance

**Setup**:
- Review guide's AC-5 section on security considerations

**Action**:
- Verify guide addresses account enumeration prevention
- Verify guide explains why backend API is not needed

**Expected**:
- Account enumeration prevention explicitly documented
- Security rationale for Cognito-only architecture included

**Evidence**:
- Security section present with enumeration prevention pattern
- Architectural justification included

## Edge Cases (Reasonable)

### Edge Case 1: Guide Usability for BUGF-019 Implementation

**Setup**:
- Assume developer reading guide to implement BUGF-019

**Action**:
- Validate guide provides all information needed to:
  - Implement countdown timer
  - Track forgotPassword attempts in sessionStorage
  - Calculate cooldown duration
  - Integrate RateLimitBanner component

**Expected**:
- Developer can implement BUGF-019 without additional research
- Guide includes concrete examples for all required patterns

**Evidence**:
- QA reviewer confirms guide sufficiency
- No open questions requiring PM clarification

### Edge Case 2: RateLimitBanner Relocation Guidance

**Setup**:
- Review AC-4 component reuse strategy

**Action**:
- Verify guide documents move from `packages/core/upload` to `packages/core/app-component-library`
- Verify guide explains adaptation needed for auth flows

**Expected**:
- Migration path documented
- Styling/messaging changes for auth context specified

**Evidence**:
- AC-4 section includes relocation instructions
- Component adaptation guidance present

### Edge Case 3: Cognito Rate Limit Triggering in Tests

**Setup**:
- Review AC-6 testing strategy section

**Action**:
- Verify guide explains how to trigger Cognito rate limiting
- Verify guide provides MSW mock examples for LimitExceededException

**Expected**:
- Unit test approach with MSW documented
- E2E/UAT approach for real Cognito triggering documented

**Evidence**:
- MSW handler example present
- UAT rate limit triggering instructions included

## Required Tooling Evidence

### Backend

**Not Applicable** - No backend endpoints touched (documentation story).

### Frontend

**Playwright**:
- No Playwright tests required for guide document itself
- Guide should reference Playwright tests for BUGF-019 implementation validation

**Manual QA**:
- QA reviewer reads guide and confirms:
  - All 6 ACs addressed
  - Code snippets compile
  - Patterns align with existing code
  - Guide provides sufficient implementation guidance for BUGF-019
  - ADR compliance (ADR-004, ADR-005)
  - Security considerations documented

**Required Artifacts**:
- QA review checklist (markdown)
- TypeScript compilation output for code snippets
- Cross-reference validation with BUGF-019 ACs

## Risks to Call Out

### Test Fragility

- **Risk**: Guide document quality is subjective
- **Mitigation**: Use explicit checklist tied to ACs 1-6, cross-reference with BUGF-019 to ensure implementation clarity

### Missing Prerequisites

- **Risk**: No formal documentation review process defined
- **Mitigation**: QA reviewer should have familiarity with:
  - AWS Cognito rate limiting behavior
  - Amplify v6 API
  - Existing password reset code (ForgotPasswordPage, ResendCodeButton)

### Ambiguity Detection

- **Risk**: Guide may be technically correct but unclear for implementers
- **Mitigation**: Include "developer walkthrough" test where QA reviewer attempts to draft BUGF-019 implementation plan using only the guide (without reading codebase)

## Non-Blocking Observations

- Guide document may benefit from diagrams (e.g., sequence diagram for password reset with rate limiting), but not MVP-critical
- Future enhancement: interactive examples with CodeSandbox or similar, deferred to post-MVP
