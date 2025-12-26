# Task: Review Pull Request

## Purpose
Comprehensive QA review of a GitHub Pull Request, validating code quality, tests, acceptance criteria, and quality gates.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated
- PR exists and is ready for review
- CodeRabbit CLI available (optional but recommended)
- Test environment configured

## Inputs
- `pr_number`: GitHub Pull Request number (e.g., 123)

## Steps

### Step 1: Fetch PR Details

```bash
# Get PR information
PR_INFO=$(gh pr view $PR_NUMBER --json title,body,files,reviews,checks,headRefName,number,url)

PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
PR_BODY=$(echo "$PR_INFO" | jq -r '.body')
PR_BRANCH=$(echo "$PR_INFO" | jq -r '.headRefName')
PR_URL=$(echo "$PR_INFO" | jq -r '.url')

echo "=== Reviewing PR #$PR_NUMBER ==="
echo "Title: $PR_TITLE"
echo "Branch: $PR_BRANCH"
echo "URL: $PR_URL"
```

### Step 2: Extract Story Information

```bash
# Extract story number from PR title (format: "Story X.Y.Z: Title")
STORY_NUM=$(echo "$PR_TITLE" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

if [ -z "$STORY_NUM" ]; then
  echo "⚠️  Warning: Could not extract story number from PR title"
  echo "Expected format: 'Story X.Y.Z: Title'"
  # Continue review but note this in findings
fi

# Find story file
STORY_FILE=$(find docs/stories -name "${STORY_NUM}*.md" -type f | head -1)

if [ -z "$STORY_FILE" ]; then
  echo "❌ Story file not found for story $STORY_NUM"
  exit 1
fi

echo "Story: $STORY_NUM"
echo "File: $STORY_FILE"
```

### Step 3: Checkout PR Branch

```bash
# Checkout the PR branch for testing
gh pr checkout $PR_NUMBER

echo "✅ Checked out PR branch: $PR_BRANCH"
```

### Step 4: Run CodeRabbit Analysis (Optional)

```bash
# If CodeRabbit CLI is available
if command -v coderabbit &> /dev/null; then
  echo "Running CodeRabbit analysis..."
  CODERABBIT_RESULTS=$(coderabbit review --plain --type uncommitted 2>&1 || echo "CodeRabbit analysis failed")
  echo "$CODERABBIT_RESULTS"
else
  echo "⚠️  CodeRabbit CLI not available, skipping"
  CODERABBIT_RESULTS="CodeRabbit not available"
fi
```

### Step 5: Run Test Suite

```bash
echo "Running full test suite..."

# Unit tests
echo "→ Running unit tests..."
UNIT_TEST_RESULT=$(pnpm test 2>&1)
UNIT_TEST_EXIT=$?

# E2E tests
echo "→ Running E2E tests..."
E2E_TEST_RESULT=$(pnpm test:e2e 2>&1)
E2E_TEST_EXIT=$?

# Linting
echo "→ Running linter..."
LINT_RESULT=$(pnpm lint 2>&1)
LINT_EXIT=$?

# Type checking
echo "→ Running type checker..."
TYPE_CHECK_RESULT=$(pnpm check-types 2>&1)
TYPE_CHECK_EXIT=$?

# Build
echo "→ Running build..."
BUILD_RESULT=$(pnpm build 2>&1)
BUILD_EXIT=$?
```

### Step 6: Verify Quality Gates

```bash
# Initialize gate status
GATE_PASS=true
GATE_FINDINGS=()

# Check unit tests
if [ $UNIT_TEST_EXIT -ne 0 ]; then
  GATE_PASS=false
  GATE_FINDINGS+=("❌ Unit tests failed")
else
  GATE_FINDINGS+=("✅ Unit tests pass")
fi

# Check E2E tests
if [ $E2E_TEST_EXIT -ne 0 ]; then
  GATE_PASS=false
  GATE_FINDINGS+=("❌ E2E tests failed")
else
  GATE_FINDINGS+=("✅ E2E tests pass")
fi

# Check linting
if [ $LINT_EXIT -ne 0 ]; then
  GATE_PASS=false
  GATE_FINDINGS+=("❌ Linting failed")
else
  GATE_FINDINGS+=("✅ Linting passes")
fi

# Check type checking
if [ $TYPE_CHECK_EXIT -ne 0 ]; then
  GATE_PASS=false
  GATE_FINDINGS+=("❌ Type checking failed")
else
  GATE_FINDINGS+=("✅ Type checking passes")
fi

# Check build
if [ $BUILD_EXIT -ne 0 ]; then
  GATE_PASS=false
  GATE_FINDINGS+=("❌ Build failed")
else
  GATE_FINDINGS+=("✅ Build succeeds")
fi

# Check CI/CD status
CI_CHECKS=$(echo "$PR_INFO" | jq -r '.checks[] | select(.conclusion != "success") | .name')
if [ -n "$CI_CHECKS" ]; then
  GATE_PASS=false
  GATE_FINDINGS+=("❌ CI/CD checks failed: $CI_CHECKS")
else
  GATE_FINDINGS+=("✅ All CI/CD checks pass")
fi
```

### Step 7: Review Acceptance Criteria

```bash
# Extract acceptance criteria from story file
echo "Reviewing acceptance criteria..."

# Read AC section from story file
AC_SECTION=$(sed -n '/## Acceptance Criteria/,/## /p' "$STORY_FILE" | head -n -1)

# Display AC for manual review
echo "--- Acceptance Criteria ---"
echo "$AC_SECTION"
echo ""

# Prompt QA agent to verify each AC
echo "QA Agent: Verify each acceptance criterion is met by testing the application"
```

### Step 8: Update Story File QA Results

```bash
# Create QA Results section content
QA_RESULTS="## QA Results

### PR Review #$PR_NUMBER
**Date:** $(date +%Y-%m-%d)
**Reviewer:** Quinn (QA Agent)
**PR:** $PR_URL

### Quality Gates
$(printf '%s\n' "${GATE_FINDINGS[@]}")

### CodeRabbit Analysis
\`\`\`
$CODERABBIT_RESULTS
\`\`\`

### Test Results
- Unit Tests: $([ $UNIT_TEST_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
- E2E Tests: $([ $E2E_TEST_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
- Linting: $([ $LINT_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
- Type Checking: $([ $TYPE_CHECK_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
- Build: $([ $BUILD_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")

### Overall Decision
$([ "$GATE_PASS" = true ] && echo "✅ **APPROVED** - All quality gates pass" || echo "❌ **CHANGES REQUESTED** - Quality gates failed")
"

# Update story file (append or replace QA Results section)
# Use sed or manual editing to update the QA Results section
```

### Step 9: Post Review on PR

```bash
# Create review message
if [ "$GATE_PASS" = true ]; then
  REVIEW_MESSAGE="## ✅ QA Review: APPROVED

All quality gates pass. This PR is ready to merge.

### Quality Gates
$(printf '%s\n' "${GATE_FINDINGS[@]}")

### Next Steps
- Merge PR when ready
- Status will automatically update to 'Done'
"
  
  # Approve PR
  gh pr review $PR_NUMBER --approve --body "$REVIEW_MESSAGE"
  
else
  REVIEW_MESSAGE="## ❌ QA Review: CHANGES REQUESTED

Quality gates failed. Please address the following issues:

### Failed Gates
$(printf '%s\n' "${GATE_FINDINGS[@]}" | grep "❌")

### Details
See full test output and CodeRabbit findings in story file QA Results section.

### Next Steps
- Fix failing tests/checks
- Address CodeRabbit findings
- Request re-review when ready
"
  
  # Request changes
  gh pr review $PR_NUMBER --request-changes --body "$REVIEW_MESSAGE"
fi

echo ""
echo "✅ Review posted to PR #$PR_NUMBER"
```

## Output

The task produces:

1. **Story File Update:** QA Results section with comprehensive review findings
2. **PR Review:** GitHub PR review (approve or request changes)
3. **Console Output:** Summary of all quality gate results

## Error Handling

**PR not found:**
```
❌ PR #123 not found
💡 Check PR number and try again
```

**Story file not found:**
```
❌ Story file not found for story 3.1.1
💡 Check that story file exists in docs/stories/
```

**Tests fail:**
```
❌ Quality gates failed
→ Posted review requesting changes
→ See PR for details
```

## Usage by QA Agent

When QA agent receives `*review-pr {pr_number}`:

1. Execute this task with the PR number
2. Display progress to user
3. Update story file with results
4. Post review on GitHub PR
5. Report final decision (APPROVED or CHANGES REQUESTED)

