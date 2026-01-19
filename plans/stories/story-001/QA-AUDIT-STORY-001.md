---
doc_type: qa_audit
story_id: STORY-001
title: "QA Audit - STORY-001: Health Check & Upload Config"
status: conditional_pass
created_at: "2026-01-17T20:15:00-07:00"
auditor: QA Agent
version: 2
tags:
  - qa-audit
  - story-001
  - vercel-migration
---

# QA Audit - STORY-001: Health Check & Upload Config

## Overall Verdict: CONDITIONAL PASS

The story is **nearly ready for implementation** but contains **2 Critical issues** and **1 High issue** that MUST be resolved before a developer can safely implement without inventing requirements.

The story demonstrates strong technical detail with comprehensive Decisions, Acceptance Criteria, and Local Testing Plan sections. However, there are contradictions between the scope definition (stories.index.md), non-goals, and implementation decisions that create blocking ambiguities.

---

## Critical Issues (MUST FIX)

### Issue C1: Scope Misalignment with stories.index.md
**Severity:** CRITICAL
**Location:** stories.index.md line 16 vs STORY-001.md Scope section

**Problem:**
The `stories.index.md` (authoritative scope document) explicitly states for STORY-001:
> "Risk Notes: Minimal risk - no auth, **no database**, no external services"

However, STORY-001.md includes extensive database dependencies:
- AC1 requires "Function tests PostgreSQL connection using Neon serverless driver" (line 158)
- Decision D3 specifies Neon serverless driver installation (line 84)
- DATABASE_URL environment variable required (line 230)
- Local Testing includes database connection tests (lines 291-327)

The story acknowledges this inconsistency in the Notes section (lines 465-469):
> "IMPORTANT: The `plans/stories/stories.index.md` file currently states 'no database' for STORY-001. This is a documentation inconsistency."

However, acknowledging the inconsistency does NOT resolve it.

**Required Fix:**
PM MUST make an explicit decision:

**Option A (Recommended):** Update `stories.index.md` STORY-001 entry to state:
```markdown
**Risk Notes:** Minimal risk - no auth, **database read-only (health checks only)**, no writes, no S3
```

**Option B:** Remove PostgreSQL from STORY-001 entirely and defer to STORY-002 (which already includes Aurora PostgreSQL). Replace health check with static response:
```json
{ "status": "healthy", "version": "1.0.0", "timestamp": "..." }
```

**Rationale:**
The scope index is the authoritative source. Developer cannot choose between conflicting requirements. Option A is recommended because health checks without database monitoring provide limited value.

---

### Issue C2: Non-Goals vs. Decision D2 Contradiction
**Severity:** CRITICAL
**Location:** Non-Goals line 15 vs Decision D2 lines 74-80

**Problem:**
Direct contradiction between two authoritative sections:

**Non-Goals states:**
> "**Not** creating shared adapter infrastructure (will be addressed in future stories)"

**Decision D2 states:**
> "**Decision:** Create shared `packages/backend/vercel-adapter` package with reusable wrappers
> **Rationale:** Only 2 endpoints in this story, but foundation supports future stories (15+ more stories planned)"

A developer cannot simultaneously avoid creating AND create the vercel-adapter package.

**Required Fix:**
PM MUST choose one approach:

**Option A:** Remove the non-goal, accept that `vercel-adapter` package is IN SCOPE
- Update Non-Goals to remove line 15
- Keep Decision D2
- Add to AC4:
  - [ ] Vercel adapter package created at `packages/backend/vercel-adapter`
  - [ ] Adapter exports reusable wrappers for GET/POST/PUT/DELETE methods

**Option B:** Remove Decision D2, defer shared adapter to future story
- Keep Non-Goals line 15
- Remove Decision D2
- Update AC1 and AC2 to state: "Inline adapter logic in function file (no shared package)"
- Add to Deferred Questions: When to extract shared adapter package

**Rationale:**
Option A aligns with the 19-story migration plan and avoids duplication. Option B is simpler but will require refactoring in STORY-002. Both are valid - PM must decide.

---

## High Issues (MUST FIX)

### Issue H1: OpenSearch Removal - Client Contract Ambiguity
**Severity:** HIGH
**Location:** Decision D7 lines 136-148, Risk 3 lines 408-410

**Problem:**
The story removes OpenSearch monitoring and Risk 3 acknowledges:
> "Clients expecting `services.opensearch` field will see it missing"

However, the story does NOT specify:
1. Whether the response shape must maintain backward compatibility
2. Whether existing clients will break
3. Whether a placeholder field is needed

**Current AC1 response format (lines 162):**
```json
{
  "status": "healthy",
  "services": {
    "postgres": "connected"
  },
  "timestamp": "...",
  "version": "..."
}
```

Is this breaking change intentional?

**Required Fix:**
PM MUST specify the exact contract:

**Option A - Breaking Change (Clean response):**
```json
{
  "status": "healthy",
  "services": {
    "postgres": "connected"
  },
  "timestamp": "2026-01-17T12:00:00.000Z",
  "version": "1.0.0"
}
```
Add to Risks section:
- **Risk 9:** Frontend clients expecting `services.opensearch` will receive undefined. Mitigation: Update frontend to handle missing field before deploying backend.

**Option B - Backward Compatible (Include placeholder):**
```json
{
  "status": "healthy",
  "services": {
    "postgres": "connected",
    "opensearch": "not_monitored"
  },
  "timestamp": "2026-01-17T12:00:00.000Z",
  "version": "1.0.0"
}
```
Add to AC1:
- [ ] OpenSearch field included with value `"not_monitored"` to maintain backward compatibility

**Rationale:**
Without this decision, developer may make wrong choice and break existing clients. Verify if any frontend code depends on `services.opensearch` field.

---

## Medium Issues (SHOULD FIX)

### Issue M1: Vague Acceptance Criteria - "Structured Logs"
**Severity:** MEDIUM
**Location:** AC1 line 164, AC2 line 174, AC5 lines 197-200

**Problem:**
Multiple ACs reference "structured logs" without defining:
- Required log fields (requestId? stage? environment?)
- Log format (JSON? key-value?)
- Log levels to use (info, error, warn, debug?)

Examples of vague requirements:
- "Logger outputs structured logs with request context" (AC1)
- "Logger outputs structured logs" (AC2)
- "Structured logging format maintained (JSON)" (AC5)

**Suggested Fix:**
Add to AC5 or create example log output:
```markdown
### Structured Log Format
All logs must use JSON format with required fields:
```json
{
  "level": "info",
  "timestamp": "2026-01-17T12:00:00.000Z",
  "requestId": "abc-123",
  "stage": "development",
  "message": "Health check succeeded",
  "context": {
    "status": "healthy",
    "durationMs": 45
  }
}
```

Required fields: `level`, `timestamp`, `requestId`, `stage`, `message`
Optional field: `context` (additional data)
```

**Impact if not fixed:**
Developer will have to guess log structure. Not blocking but reduces clarity and testability of AC5.

---

### Issue M2: Coverage Targets - Enforcement Unclear
**Severity:** MEDIUM
**Location:** Automated Testing section lines 390-393

**Problem:**
Story specifies:
- Core logic: 80% minimum
- Adapters: 60% minimum
- Note: "These targets apply to new packages created in this story. Existing codebase maintains 45% global minimum per CLAUDE.md."

Ambiguity:
- Are 80%/60% hard requirements that will fail CI, or aspirational targets?
- What happens if developer achieves 70% on core logic - does the story fail QA?
- Is this enforced by automated tools or manual review?

**Suggested Fix:**
Clarify enforcement:

**Option A - Hard Requirements:**
```markdown
**Coverage Requirements (ENFORCED):**
- Core logic: 80% minimum - CI will fail below this threshold
- Adapters: 60% minimum - CI will fail below this threshold
- Rationale: New code sets quality baseline for migration. Higher bar than global 45%.
```

**Option B - Aspirational Targets:**
```markdown
**Coverage Requirements (TARGET):**
- Core logic: 80% target (minimum 60% to pass)
- Adapters: 60% target (minimum 45% to pass)
- Rationale: Aim high for new code, but maintain global 45% minimum per CLAUDE.md
```

**Rationale:**
Developer needs to know if spending 2 hours to go from 75% to 80% is required or optional.

---

## Low Issues (NICE TO FIX)

### Issue L1: vercel.json File Location Not Specified
**Severity:** LOW
**Location:** Routing Configuration lines 259-268

**Problem:**
The story shows `vercel.json` content but doesn't specify:
- Does this file already exist?
- Where should it be created? (`apps/api/vercel.json`?)
- Should existing content be replaced or merged?

**Suggested Fix:**
Add to AC3:
```markdown
- [ ] `vercel.json` created (or updated) at `apps/api/vercel.json`
- [ ] Routes configured for `/api/health` and `/api/config/upload`
```

**Impact if not fixed:**
Minor confusion - developer will likely infer correct location from Vercel docs.

---

### Issue L2: Version Field Source Ambiguity
**Severity:** LOW
**Location:** AC1 line 163

**Problem:**
AC1 states:
> "Version sourced from package.json or environment variable (`npm_package_version`, fallback to 'unknown')"

Ambiguities:
- Which package.json? (Root monorepo? `apps/api/package.json`?)
- Does `npm_package_version` exist in Vercel environment? (This is npm-specific, may not exist)
- How to access package.json version in Vercel function?

**Suggested Fix:**
Be explicit:

**Option A - Hardcode for now:**
```markdown
- [ ] Version hardcoded to "1.0.0" for STORY-001
- [ ] Dynamic version sourcing deferred to future story
```

**Option B - Use specific package.json:**
```markdown
- [ ] Version read from `apps/api/package.json` version field
- [ ] Implementation uses `import pkg from '../package.json'` with `resolveJsonModule: true`
- [ ] Fallback to "unknown" if import fails
```

**Rationale:**
Removes ambiguity about implementation approach.

---

## Positive Observations

### ✅ Strengths of STORY-001.md:
1. **Excellent Decisions Section:** All major architectural questions answered with rationale (D1-D7)
2. **Comprehensive Local Testing Plan:** Concrete curl commands with expected responses (lines 269-388)
3. **Clear Acceptance Criteria:** AC1-AC5 provide specific, testable checkboxes
4. **Explicit Dependencies:** Environment variables fully specified with example values
5. **Risk Analysis:** 8 risks identified with mitigations and edge cases (lines 395-437)
6. **No Hidden Dependencies:** All infrastructure requirements explicitly documented
7. **Deferred Questions:** Properly scoped as non-blocking (Q1-Q2, lines 438-460)

### ✅ What Works Well:
- Ports & adapters architecture clearly defined (AC4)
- CORS requirements explicit with test cases (D6, Test 4)
- Database choice justified with clear rationale (D3)
- Error response format standardized (D4)
- Unit vs integration test split clearly defined (lines 373-388)
- Neon database setup explicit (D5)

---

## Summary of Required Actions

### CRITICAL (Must fix before implementation):
1. **Resolve C1:** Update `stories.index.md` OR remove PostgreSQL from STORY-001
2. **Resolve C2:** Choose whether `vercel-adapter` package is in-scope or deferred
3. **Resolve H1:** Specify exact health check response format (with/without opensearch field)

### RECOMMENDED (Should fix before implementation):
4. Add structured log format example (M1)
5. Clarify coverage target enforcement (M2)

### OPTIONAL (Nice to have):
6. Specify `vercel.json` file location (L1)
7. Clarify version field source (L2)

---

## What Is Acceptable As-Is

The following aspects are **ready for implementation**:

✅ Upload config endpoint scope and behavior
✅ Neon serverless driver choice and rationale
✅ CORS configuration requirements and test cases
✅ Local testing setup and manual test procedures
✅ Error handling patterns
✅ Environment variable requirements (comprehensive list)
✅ Logging infrastructure (pending format clarification)
✅ Risk analysis completeness
✅ Deferred questions appropriately non-blocking
✅ Ports & adapters architecture definition
✅ Acceptance criteria structure (mostly specific and testable)

---

## Approval Conditions

This story will be **APPROVED for implementation** after:
- ✅ Issues C1, C2, H1 are resolved (3 required fixes)
- ⚠️ Issues M1, M2 are addressed (2 recommended clarifications)

Once the 3 critical/high issues are fixed, the story will be unambiguous and safe to implement.

**Estimated fix time:** 20-30 minutes (documentation updates only, no code)

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Notes |
|---|---|---|---|
| 2026-01-17T19:32:00-07:00 | QA Agent | Initial audit of STORY-001.md (v1) | Verdict: CONDITIONAL PASS - 4 Critical, 2 Medium, 2 Low issues |
| 2026-01-17T19:38:00-07:00 | PM Agent | Updated STORY-001.md with Decisions section | Resolved: Open Questions → Decisions (Issues 3, 4 from v1 audit) |
| 2026-01-17T20:15:00-07:00 | QA Agent | Re-audit of STORY-001.md (v2) | Verdict: CONDITIONAL PASS - 2 Critical, 1 High, 2 Medium, 2 Low issues remaining |
