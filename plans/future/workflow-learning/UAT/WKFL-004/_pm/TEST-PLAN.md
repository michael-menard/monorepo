# Test Plan: WKFL-004 - Human Feedback Capture

## Test Strategy

This story introduces a new `/feedback` command that captures human feedback on agent findings and persists them to the Knowledge Base. Testing focuses on command parsing, VERIFICATION.yaml integration, KB persistence, and query capabilities.

## Test Categories

### 1. Command Argument Parsing

**Objective:** Verify command correctly parses finding IDs and feedback flags

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid false-positive | `/feedback SEC-042 --false-positive "reason"` | Parses successfully, feedback_type='false_positive' |
| Valid helpful | `/feedback ARCH-015 --helpful "note"` | Parses successfully, feedback_type='helpful' |
| Valid helpful (no note) | `/feedback QA-001 --helpful` | Parses successfully, note is optional for helpful |
| Valid missing | `/feedback SEC-042 --missing "context"` | Parses successfully, feedback_type='missing' |
| Valid severity-wrong | `/feedback SEC-042 --severity-wrong --suggested-severity medium "reason"` | Parses successfully with suggested_severity |
| Missing feedback flag | `/feedback SEC-042 "note"` | ERROR: Must specify exactly one feedback type flag |
| Multiple feedback flags | `/feedback SEC-042 --helpful --false-positive` | ERROR: Mutually exclusive flags |
| severity-wrong without suggested | `/feedback SEC-042 --severity-wrong "reason"` | ERROR: --severity-wrong requires --suggested-severity |
| Invalid suggested severity | `/feedback SEC-042 --severity-wrong --suggested-severity invalid` | ERROR: Severity must be: critical, high, medium, low |
| Empty finding ID | `/feedback "" --helpful` | ERROR: Finding ID required |

### 2. VERIFICATION.yaml Integration

**Objective:** Verify command correctly parses VERIFICATION.yaml and extracts finding metadata

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| Valid security finding | Finding `SEC-042` exists in code_review.security.findings | Extracts agent='code-review-security', severity='high' |
| Valid architecture finding | Finding `ARCH-015` exists in code_review.architecture.findings | Extracts agent='code-review-architecture', severity='medium' |
| Valid QA finding | Finding `QA-001` exists in qa_verify.findings | Extracts agent='qa-verify-completion-leader', severity='low' |
| Finding not found | Finding `SEC-999` does not exist | ERROR: "Finding SEC-999 not found in VERIFICATION.yaml" |
| No VERIFICATION.yaml | Story has no _implementation/VERIFICATION.yaml | ERROR: "Story has no VERIFICATION.yaml yet" |
| Malformed YAML | VERIFICATION.yaml is invalid YAML | ERROR: "Failed to parse VERIFICATION.yaml: {error}" |
| Missing findings section | VERIFICATION.yaml exists but has no findings | ERROR: "No findings in VERIFICATION.yaml" |
| Finding across multiple sections | Same ID in multiple sections (edge case) | Uses first match found, or ERRORs if ambiguous |

**Test Data Required:**
- Mock VERIFICATION.yaml with findings from security, architecture, QA sections
- Malformed YAML test fixtures
- Empty VERIFICATION.yaml

### 3. KB Persistence

**Objective:** Verify feedback entries are correctly written to Knowledge Base

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| Basic KB write | Run `/feedback SEC-042 --false-positive "reason"` | KB entry created with type='feedback' |
| Required fields present | Check KB entry content | Contains: finding_id, agent_id, story_id, feedback_type, note, created_at |
| Tags correct | Check KB entry tags | Includes: ['feedback', 'agent:code-review-security', 'story:WKFL-004', 'type:false_positive', 'date:2026-02'] |
| Timestamp auto-populated | KB entry created_at | ISO 8601 timestamp is current time |
| Original severity captured | Feedback on high severity finding | original_severity='high' in content |
| Suggested severity captured | `/feedback SEC-042 --severity-wrong --suggested-severity medium` | suggested_severity='medium' in content |
| KB write failure | KB unavailable or write fails | ERROR: "Failed to capture feedback: {error}" |
| Correlation ID | KB write includes correlation ID | Logged for traceability |

**KB Schema Validation:**
```typescript
{
  type: 'feedback',
  content: {
    finding_id: string,
    agent_id: string,
    story_id: string,
    feedback_type: 'false_positive' | 'helpful' | 'missing' | 'severity_wrong',
    original_severity?: 'critical' | 'high' | 'medium' | 'low',
    suggested_severity?: 'critical' | 'high' | 'medium' | 'low',
    note: string,
    created_at: string (ISO 8601)
  },
  tags: string[]
}
```

### 4. KB Query Integration

**Objective:** Verify feedback entries are queryable via kb_search

| Test Case | Query | Expected Result |
|-----------|-------|-----------------|
| Query by feedback tag | `kb_search({tags: ['feedback']})` | Returns all feedback entries |
| Query by agent tag | `kb_search({tags: ['feedback', 'agent:code-review-security']})` | Returns only security agent feedback |
| Query by story tag | `kb_search({tags: ['feedback', 'story:WKFL-004']})` | Returns only WKFL-004 feedback |
| Query by feedback type | `kb_search({tags: ['feedback', 'type:false_positive']})` | Returns only false positive feedback |
| Query by date tag | `kb_search({tags: ['feedback', 'date:2026-02']})` | Returns feedback from February 2026 |
| Combined tag query | `kb_search({tags: ['feedback', 'agent:code-review-security', 'type:false_positive']})` | Returns security false positives |
| Text search | `kb_search({query: 'intentional behavior', tags: ['feedback']})` | Returns feedback with matching text |
| Empty results | `kb_search({tags: ['feedback', 'agent:nonexistent']})` | Returns empty array |

**Test Data Required:**
- Pre-populated KB with diverse feedback entries for query testing
- Entries from multiple agents, stories, types, dates

### 5. Edge Cases

**Objective:** Handle boundary conditions and error states gracefully

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| Empty note string | `/feedback SEC-042 --false-positive ""` | Accepts empty string (note is text field) |
| Very long note | Note with 10,000+ characters | Accepts up to reasonable limit, truncates or errors beyond |
| Special characters in note | Note contains quotes, newlines, unicode | Properly escaped and stored |
| Duplicate feedback | Same finding ID, same user, same session | Allow (use case: user changes mind, adds context) |
| Duplicate feedback (different type) | SEC-042 gets both --helpful and --false-positive | Allow (may evolve understanding over time) |
| Finding from different story | User gives feedback on SEC-042 from WISH-2045 while in WKFL-004 context | ERROR or WARNING: Finding not in current story |
| Concurrent feedback writes | Multiple feedback commands run simultaneously | All succeed, no race conditions |
| KB quota exceeded | KB storage limit reached | ERROR: "KB write failed: quota exceeded" |

### 6. Integration with WKFL-002 and WKFL-003

**Objective:** Ensure feedback data is usable by downstream calibration and heuristic stories

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| Calibration query | WKFL-002 queries for feedback on specific agent | Returns all feedback for that agent |
| False positive rate | Query for `type:false_positive` by agent | Computes % of findings marked false positive |
| Helpful rate | Query for `type:helpful` by agent | Computes % of findings marked helpful |
| Severity adjustment analysis | Query for `type:severity_wrong` | Analyzes patterns in severity mismatches |
| Time-based analysis | Query feedback from last 30 days | Returns recent feedback for trend analysis |

## Test Execution Strategy

### Local Testing (Developer)

1. **Unit Tests**: Test command parsing, argument validation, schema validation
   - Mock VERIFICATION.yaml parsing
   - Mock KB write operations
   - Test all error paths

2. **Integration Tests**: Test KB write and query roundtrips
   - Use test KB instance
   - Verify write → query → result pipeline
   - Test tag filtering

### UAT Testing (Post-Implementation)

1. **Smoke Test**: Run all basic feedback types on a real story
2. **Query Test**: Verify kb_search returns expected feedback entries
3. **Error Test**: Test graceful failures (missing YAML, invalid args)
4. **Regression Test**: Ensure existing KB functionality not impacted

## Test Data Fixtures

### Mock VERIFICATION.yaml

```yaml
code_review:
  security:
    findings:
      - id: SEC-042
        agent: code-review-security
        severity: high
        description: "No Zod validation on request body"
      - id: SEC-043
        agent: code-review-security
        severity: medium
        description: "Potential XSS in user input"
  architecture:
    findings:
      - id: ARCH-015
        agent: code-review-architecture
        severity: medium
        description: "API boundary issue - missing error handling"
qa_verify:
  findings:
    - id: QA-001
      agent: qa-verify-completion-leader
      severity: low
      description: "Edge case not tested: empty array"
```

### Mock KB Feedback Entries

```yaml
- type: feedback
  content:
    finding_id: SEC-042
    agent_id: code-review-security
    story_id: WISH-2045
    feedback_type: false_positive
    original_severity: high
    note: "This is intentional behavior for admin users"
    created_at: "2026-02-06T15:30:00Z"
  tags:
    - feedback
    - agent:code-review-security
    - story:WISH-2045
    - type:false_positive
    - date:2026-02

- type: feedback
  content:
    finding_id: ARCH-015
    agent_id: code-review-architecture
    story_id: WISH-2045
    feedback_type: helpful
    original_severity: medium
    note: "Good catch, added error handling"
    created_at: "2026-02-06T16:00:00Z"
  tags:
    - feedback
    - agent:code-review-architecture
    - story:WISH-2045
    - type:helpful
    - date:2026-02
```

## Acceptance Criteria Mapping

| AC | Test Coverage |
|----|---------------|
| AC-1: `/feedback {FINDING-ID} --false-positive 'reason'` captures to KB | Command Parsing (1.1), KB Persistence (3.1-3.7), VERIFICATION.yaml (2.1) |
| AC-2: `/feedback {FINDING-ID} --helpful 'note'` captures to KB | Command Parsing (1.2-1.3), KB Persistence (3.1-3.7) |
| AC-3: Feedback linked to agent, story, and finding | KB Persistence (3.2), VERIFICATION.yaml (2.1-2.3) |
| AC-4: Queryable via kb_search with feedback tags | KB Query Integration (4.1-4.8) |
| AC-5: Multiple feedback types supported | Command Parsing (1.1-1.10), Feedback Types (all 4 types tested) |

## Success Criteria

- All command parsing tests pass (100% coverage)
- All VERIFICATION.yaml integration tests pass
- All KB write operations succeed with correct schema
- All KB query tests return expected results
- All edge cases handled gracefully
- No regressions in existing KB functionality

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| VERIFICATION.yaml format varies | Test with multiple VERIFICATION.yaml examples from different stories |
| Finding ID collisions | Scope feedback to story_id in queries |
| KB write failures | Implement retry logic and clear error messages |
| Query performance | Index tags appropriately, test with large datasets |

## Test Deliverables

- Unit test suite for command parsing
- Integration test suite for KB operations
- Mock VERIFICATION.yaml fixtures
- Mock KB feedback data for query tests
- UAT test script for manual verification
