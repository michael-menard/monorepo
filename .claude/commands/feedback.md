---
created: 2026-02-07
updated: 2026-02-07
version: 1.0.0
type: utility
permission_level: docs-only
---

/feedback {FINDING-ID} [--false-positive | --helpful | --missing | --severity-wrong] "{note}" [--suggested-severity {severity}]

Capture human feedback on agent findings for calibration and heuristic improvement.

## Usage

```bash
# Mark finding as false positive
/feedback SEC-042 --false-positive "This is intentional behavior for admin users"

# Mark finding as helpful
/feedback ARCH-015 --helpful "Good catch, would have missed this boundary issue"

# Mark finding as missing context
/feedback QA-001 --missing "Should also check empty array case"

# Mark severity as wrong (requires --suggested-severity)
/feedback SEC-003 --severity-wrong "Should be medium, not high - defense in depth exists" --suggested-severity medium
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FINDING-ID` | Yes | Finding identifier from VERIFICATION.yaml (e.g., SEC-042) |
| `--false-positive` | One of these required | Finding was incorrect or not applicable |
| `--helpful` | One of these required | Finding was accurate and valuable |
| `--missing` | One of these required | Finding should have caught more issues |
| `--severity-wrong` | One of these required | Finding severity was inaccurate |
| `note` | Yes | Human explanation/context for the feedback |
| `--suggested-severity` | Conditional | Required when using --severity-wrong. One of: critical, high, medium, low |

---

## Implementation

### Step 1: Validate Arguments

Extract finding ID and feedback type from arguments. Ensure exactly one feedback type flag is provided.

```typescript
// Pseudo-code for parsing
const args = parseCommandArgs(input)
const findingId = args.positional[0]
const note = args.positional[1]
const feedbackType = determineFeedbackType(args.flags) // --false-positive | --helpful | --missing | --severity-wrong
const suggestedSeverity = args.flags['suggested-severity']

// Validation
if (!findingId) error('Finding ID required')
if (!note) error('Note/reason required')
if (!feedbackType) error('Must specify one feedback type flag')
if (feedbackType === 'severity_wrong' && !suggestedSeverity) {
  error('--suggested-severity required when using --severity-wrong')
}
```

### Step 2: Parse VERIFICATION.yaml

Search for VERIFICATION.yaml in the current story's _implementation directory.

```typescript
// Find VERIFICATION.yaml
const verificationPath = findVerificationFile() // Search in _implementation/

if (!verificationPath) {
  error('VERIFICATION.yaml not found. Run this command from a story directory.')
}

// Parse YAML
const verification = parseYAML(verificationPath)

// Search for finding across all sections
const finding = findFindingById(verification, findingId)
/*
  Search paths:
  - verification.code_review.security.findings[]
  - verification.code_review.architecture.findings[]
  - verification.qa_verify.findings[]
  - verification.findings[] (flat array for some stories)
*/

if (!finding) {
  error(`Finding ${findingId} not found in VERIFICATION.yaml`)
}
```

### Step 3: Extract Finding Metadata

```typescript
// Extract agent_id from verification section
const agentId = determineAgentFromSection(finding)
/*
  Examples:
  - code_review.security.findings → 'code-review-security'
  - code_review.architecture.findings → 'code-review-architecture'
  - qa_verify.findings → 'qa-verify'
*/

// Extract original severity
const originalSeverity = finding.severity // 'critical' | 'high' | 'medium' | 'low'

// Extract story_id from current directory or VERIFICATION.yaml
const storyId = extractStoryId() // From pwd or verification.story_id
```

### Step 4: Build Feedback Entry

```typescript
import { FeedbackContentSchema } from '@repo/knowledge-base/__types__'

const feedbackContent = {
  finding_id: findingId,
  agent_id: agentId,
  story_id: storyId,
  feedback_type: feedbackType,
  original_severity: originalSeverity,
  suggested_severity: suggestedSeverity, // only if severity_wrong
  note: note,
  created_at: new Date().toISOString(),
}

// Validate with Zod
const validated = FeedbackContentSchema.parse(feedbackContent)
```

### Step 5: Create KB Entry

```typescript
// Build tags for filtering
const tags = [
  'feedback',
  `agent:${agentId}`,
  `story:${storyId}`,
  `type:${feedbackType}`,
  `date:${new Date().toISOString().slice(0, 7)}`, // YYYY-MM
]

if (originalSeverity) {
  tags.push(`severity:${originalSeverity}`)
}

// Add to KB via kb_add
const kbEntry = await kb_add({
  content: JSON.stringify(validated, null, 2),
  role: 'dev', // Feedback is for dev/calibration
  entry_type: 'feedback',
  story_id: storyId,
  tags: tags,
})
```

### Step 5.5: Create Calibration Entry (WKFL-002)

After capturing feedback, also create a calibration entry to track confidence vs outcomes.

```typescript
import { CalibrationEntrySchema } from '@repo/knowledge-base/__types__'

// Map feedback type to calibration outcome
function mapFeedbackToOutcome(feedbackType: string): string | null {
  const mapping = {
    'helpful': 'correct',          // Finding was accurate
    'false_positive': 'false_positive',  // Finding was incorrect
    'severity_wrong': 'severity_wrong',  // Severity was wrong
    'missing': null,               // Skip - doesn't validate confidence
  }
  return mapping[feedbackType] || null
}

const calibrationOutcome = mapFeedbackToOutcome(feedbackType)

// Only create calibration entry for helpful, false_positive, severity_wrong
// Skip for 'missing' - doesn't validate the finding's stated confidence
if (calibrationOutcome) {
  const calibrationEntry = {
    agent_id: agentId,
    finding_id: findingId,
    story_id: storyId,
    stated_confidence: finding.confidence || 'medium', // From VERIFICATION.yaml
    actual_outcome: calibrationOutcome,
    timestamp: new Date().toISOString(),
  }

  // Validate with Zod
  const validatedCalibration = CalibrationEntrySchema.parse(calibrationEntry)

  // Build tags for efficient querying
  const calibrationTags = [
    'calibration',
    `agent:${agentId}`,
    `confidence:${validatedCalibration.stated_confidence}`,
    `outcome:${calibrationOutcome}`,
    `date:${new Date().toISOString().slice(0, 7)}`, // YYYY-MM
  ]

  // Write calibration entry to KB
  const calibrationKbEntry = await kb_add({
    content: JSON.stringify(validatedCalibration, null, 2),
    role: 'dev',
    entry_type: 'calibration',
    story_id: storyId,
    tags: calibrationTags,
  })

  logger.info('Calibration entry created', {
    finding_id: findingId,
    agent_id: agentId,
    stated_confidence: validatedCalibration.stated_confidence,
    actual_outcome: calibrationOutcome,
    calibration_kb_entry_id: calibrationKbEntry.id,
  })
}
```

**Outcome Mapping Logic:**

| Feedback Type | Calibration Outcome | Rationale |
|--------------|---------------------|-----------|
| `helpful` | `correct` | Finding was accurate and valuable |
| `false_positive` | `false_positive` | Finding was incorrect or not applicable |
| `severity_wrong` | `severity_wrong` | Finding was correct but severity assessment was wrong |
| `missing` | *(skip)* | Doesn't validate the finding's stated confidence |

**Note:** The `missing` feedback type indicates the agent should have caught MORE issues, but doesn't provide calibration data on whether the stated confidence for existing findings was accurate. Therefore, no calibration entry is created for `missing` feedback.

---

### Step 6: Confirm to User

```typescript
import { logger } from '@repo/logger'

// Log structured feedback capture
logger.info('Feedback captured', {
  findingId,
  feedbackType,
  agentId,
  storyId,
  suggestedSeverity,
  note,
  kbEntryId: kbEntry.id,
  tags
})

// Output confirmation message
output(`
Feedback captured for ${findingId}

Type: ${feedbackType}
Agent: ${agentId}
Story: ${storyId}
${suggestedSeverity ? `Suggested Severity: ${suggestedSeverity}` : ''}

Note: ${note}

KB Entry ID: ${kbEntry.id}
Tags: ${tags.join(', ')}
`)
```

---

## Finding ID Resolution

Finding IDs come from VERIFICATION.yaml structure:

```yaml
code_review:
  security:
    findings:
      - id: SEC-042  # This is the finding_id
        agent: code-review-security
        severity: high
        description: "No Zod validation on request body"
        file: apps/api/lego-api/routes.ts
        line: 42

  architecture:
    findings:
      - id: ARCH-015
        agent: code-review-architecture
        severity: medium
        description: "API boundary issue"

qa_verify:
  findings:
    - id: QA-001
      agent: qa-verify
      severity: low
      description: "Missing edge case test"
```

The command should search all sections and extract the agent from the section path.

---

## Error Handling

| Error | Message |
|-------|---------|
| No finding ID | "Finding ID required. Usage: /feedback {FINDING-ID} ..." |
| No feedback type | "Must specify one feedback type: --false-positive, --helpful, --missing, --severity-wrong" |
| Multiple feedback types | "Only one feedback type allowed per command" |
| No note | "Note/reason required" |
| severity_wrong without suggested | "--suggested-severity required when using --severity-wrong" |
| Finding not found | "Finding {ID} not found in VERIFICATION.yaml" |
| VERIFICATION.yaml not found | "VERIFICATION.yaml not found. Run from story directory with completed verification." |
| Invalid severity | "Invalid severity. Must be: critical, high, medium, low" |

---

## Example VERIFICATION.yaml Parsing

```typescript
function findFindingById(verification: any, findingId: string) {
  // Search code_review.security.findings
  if (verification.code_review?.security?.findings) {
    const found = verification.code_review.security.findings.find(f => f.id === findingId)
    if (found) return { ...found, section: 'code_review.security' }
  }

  // Search code_review.architecture.findings
  if (verification.code_review?.architecture?.findings) {
    const found = verification.code_review.architecture.findings.find(f => f.id === findingId)
    if (found) return { ...found, section: 'code_review.architecture' }
  }

  // Search qa_verify.findings
  if (verification.qa_verify?.findings) {
    const found = verification.qa_verify.findings.find(f => f.id === findingId)
    if (found) return { ...found, section: 'qa_verify' }
  }

  // Search flat findings array (legacy)
  if (verification.findings && Array.isArray(verification.findings)) {
    const found = verification.findings.find(f => f.id === findingId)
    if (found) return { ...found, section: 'findings' }
  }

  return null
}

function determineAgentFromSection(finding: any) {
  const section = finding.section
  if (section.includes('security')) return 'code-review-security'
  if (section.includes('architecture')) return 'code-review-architecture'
  if (section.includes('qa_verify')) return 'qa-verify'
  // Fallback to agent field if present
  return finding.agent || 'unknown'
}
```

---

## Queryable via KB Search

After feedback is captured, it can be queried:

```typescript
// Find all false positives for security agent
kb_search({
  query: 'false positive security findings',
  tags: ['feedback', 'agent:code-review-security', 'type:false_positive'],
  role: 'dev',
  limit: 10
})

// Find all severity corrections
kb_search({
  query: 'severity corrections',
  tags: ['feedback', 'type:severity_wrong'],
  role: 'dev',
  limit: 10
})

// Find feedback for specific story
kb_search({
  query: 'feedback',
  tags: ['feedback', 'story:WISH-2045'],
  role: 'dev',
  limit: 10
})
```

---

## Notes

- This command is for post-hoc feedback only (not during workflow execution)
- Feedback entries use entry_type='feedback' in the KB
- All feedback is role='dev' since it's for agent calibration
- Tags enable aggregation and analysis for WKFL-002 and WKFL-003
- Finding IDs should be unique within a story's VERIFICATION.yaml
- The command can be run multiple times for different findings
