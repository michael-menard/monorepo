# Development Workflow Spawn Patterns

Standard patterns for /dev-implement-story command.

---

## Phase Spawns

### Setup Leader (haiku)

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Setup {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-setup-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    mode: implement

    Signal: SETUP COMPLETE or SETUP BLOCKED: reason
```

### Plan Leader (sonnet)

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Plan {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-plan-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    Signal: PLANNING COMPLETE or PLANNING BLOCKED: reason
```

### Execute Leader (sonnet)

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Execute {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-execute-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    Signal: EXECUTION COMPLETE or EXECUTION BLOCKED: reason
```

### Proof Leader (haiku)

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Proof {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-proof-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    Signal: PROOF COMPLETE or PROOF BLOCKED: reason
```

---

## Review/Fix Loop

### Review Workers (haiku, parallel)

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Review {STORY_ID} (iter {iteration})"
  prompt: |
    Read EVIDENCE.yaml for touched_files and SCOPE.yaml for scope.

    Spawn review workers IN PARALLEL (haiku model):
    - code-review-lint
    - code-review-style-compliance
    - code-review-syntax
    - code-review-security
    - code-review-typecheck
    - code-review-build

    Aggregate results into REVIEW.yaml.

    Signal: REVIEW PASS or REVIEW FAIL
```

### Fix Agent (sonnet)

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Fix {STORY_ID} (iter {iteration})"
  prompt: |
    Read: .claude/agents/dev-fix-fix-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    iteration: {iteration}

    Read REVIEW.yaml for ranked_patches (top 3 issues).
    Fix issues, update EVIDENCE.yaml.

    Signal: FIX COMPLETE
```

---

## CHECKPOINT.yaml Schema

```yaml
schema: 1
story_id: "{STORY_ID}"
feature_dir: "{FEATURE_DIR}"
timestamp: "<ISO timestamp>"

current_phase: setup | plan | execute | proof | review | fix | done
last_successful_phase: null | setup | plan | execute | proof | review

iteration: 0
max_iterations: 3

blocked: false
blocked_reason: null

forced: false
warnings: []

completed_at: null
e2e_gate: null | passed | exempt
```
