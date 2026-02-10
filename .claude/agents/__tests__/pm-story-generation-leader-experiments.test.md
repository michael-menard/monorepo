# Unit Tests: pm-story-generation-leader Experiment Traffic Routing

Test file for WKFL-008 traffic routing logic in pm-story-generation-leader.

---

## Test Suite 1: Traffic Routing Assignment

### Test 1.1: Treatment assignment (random < traffic)

**Given**: Active experiment with traffic=0.2
**And**: Math.random() returns 0.15 (< 0.2)
**When**: Traffic routing runs for eligible story
**Then**: Story assigned experiment_variant = "exp-fast-track"

```yaml
experiment:
  id: exp-fast-track
  status: active
  traffic: 0.2
  eligibility:
    all: true
random_value: 0.15
expected_variant: "exp-fast-track"
```

### Test 1.2: Control assignment (random >= traffic)

**Given**: Active experiment with traffic=0.2
**And**: Math.random() returns 0.25 (>= 0.2)
**When**: Traffic routing runs for eligible story
**Then**: Story assigned experiment_variant = "control"

```yaml
experiment:
  id: exp-fast-track
  status: active
  traffic: 0.2
  eligibility:
    all: true
random_value: 0.25
expected_variant: "control"
```

### Test 1.3: Boundary value - traffic=1.0 (always treatment)

**Given**: Experiment with traffic=1.0
**And**: Any random value [0.0, 1.0)
**When**: Traffic routing runs
**Then**: Always assigned to treatment

| Random Value | Expected Variant |
|-------------|-----------------|
| 0.0 | "exp-full-traffic" |
| 0.5 | "exp-full-traffic" |
| 0.99 | "exp-full-traffic" |

### Test 1.4: Boundary value - traffic=0.0 (always control)

**Given**: Experiment with traffic=0.0
**And**: Any random value
**When**: Traffic routing runs
**Then**: Always assigned to control

| Random Value | Expected Variant |
|-------------|-----------------|
| 0.0 | "control" |
| 0.5 | "control" |
| 0.99 | "control" |

---

## Test Suite 2: Eligibility Checking

### Test 2.1: ac_count_max filter

**Given**: Experiment with eligibility.ac_count_max = 3
**When**: Stories with varying AC counts evaluated
**Then**: Only stories with AC count <= 3 are eligible

| Story AC Count | Eligible? |
|---------------|-----------|
| 1 | Yes |
| 2 | Yes |
| 3 | Yes |
| 4 | No |
| 5 | No |
| 10 | No |

### Test 2.2: ac_count_min filter

**Given**: Experiment with eligibility.ac_count_min = 2
**When**: Stories with varying AC counts evaluated
**Then**: Only stories with AC count >= 2 are eligible

| Story AC Count | Eligible? |
|---------------|-----------|
| 1 | No |
| 2 | Yes |
| 3 | Yes |
| 5 | Yes |

### Test 2.3: Complexity filter

**Given**: Experiment with eligibility.complexity = "simple"
**When**: Stories with varying complexity evaluated
**Then**: Only simple stories eligible

| Story ACs | Scope Keywords | Computed Complexity | Eligible? |
|-----------|---------------|-------------------|-----------|
| 2 | none | simple | Yes |
| 1 | none | simple | Yes |
| 3 | none | medium | No |
| 5 | none | complex | No |
| 3 | auth, security | complex | No |

### Test 2.4: Domain filter

**Given**: Experiment with eligibility.domain = ["workflow-learning", "wishlist"]
**When**: Stories from various epics evaluated
**Then**: Only matching domain stories eligible

| Story Epic | Eligible? |
|-----------|-----------|
| workflow-learning | Yes |
| wishlist | Yes |
| auth | No |
| platform | No |

### Test 2.5: all=true eligibility

**Given**: Experiment with eligibility.all = true
**When**: Any story evaluated
**Then**: All stories eligible regardless of other attributes

| Story ACs | Story Epic | Eligible? |
|-----------|-----------|-----------|
| 1 | any | Yes |
| 10 | any | Yes |
| 3 | unknown | Yes |

### Test 2.6: Combined eligibility criteria (AND logic)

**Given**: Experiment with ac_count_max=3, complexity=simple, domain=["wishlist"]
**When**: Stories evaluated
**Then**: All criteria must match (AND)

| ACs | Complexity | Epic | Eligible? |
|-----|-----------|------|-----------|
| 2 | simple | wishlist | Yes |
| 4 | simple | wishlist | No (ACs exceed max) |
| 2 | complex | wishlist | No (wrong complexity) |
| 2 | simple | auth | No (wrong domain) |

---

## Test Suite 3: First-Match-Wins Logic

### Test 3.1: Multiple eligible experiments - first wins

**Given**: Two active experiments, both eligible for story
**And**: Math.random() returns 0.1 (within both traffic ranges)
**When**: Traffic routing runs
**Then**: Story assigned to first experiment only

```yaml
experiments:
  - id: exp-first
    status: active
    traffic: 0.5
    eligibility: { all: true }
  - id: exp-second
    status: active
    traffic: 0.5
    eligibility: { all: true }
random_value: 0.1
expected_variant: "exp-first"
```

### Test 3.2: First experiment not eligible, second is

**Given**: Two experiments, story only eligible for second
**When**: Traffic routing runs
**Then**: Second experiment evaluated and assigned

```yaml
experiments:
  - id: exp-simple-only
    status: active
    traffic: 0.5
    eligibility: { ac_count_max: 2 }
  - id: exp-all
    status: active
    traffic: 0.5
    eligibility: { all: true }
story_ac_count: 5
random_value: 0.1
expected_variant: "exp-all"
```

### Test 3.3: First experiment eligible but not selected (random >= traffic)

**Given**: Two experiments, story eligible for both
**And**: Random >= first experiment traffic, < second experiment traffic
**When**: Traffic routing runs
**Then**: First experiment: control path, second experiment: not evaluated (first match wins applies to eligibility, not assignment)

```yaml
experiments:
  - id: exp-first
    status: active
    traffic: 0.2
    eligibility: { all: true }
  - id: exp-second
    status: active
    traffic: 0.8
    eligibility: { all: true }
random_value: 0.5
expected_variant: "control"
note: "First-match-wins means first ELIGIBLE experiment is used for routing. Random 0.5 >= 0.2 traffic = control."
```

---

## Test Suite 4: Graceful Degradation

### Test 4.1: Missing experiments.yaml

**Given**: experiments.yaml does not exist
**When**: Traffic routing runs
**Then**: Story assigned experiment_variant = "control" (default)
**And**: Warning logged: "experiments.yaml not found, defaulting to control"

### Test 4.2: Malformed experiments.yaml

**Given**: experiments.yaml with invalid YAML syntax
**When**: Traffic routing runs
**Then**: Story assigned experiment_variant = "control" (default)
**And**: Warning logged: "experiments.yaml malformed, defaulting to control"

### Test 4.3: Empty experiments array

**Given**: experiments.yaml with `experiments: []`
**When**: Traffic routing runs
**Then**: Story assigned experiment_variant = "control" (no experiments to match)

### Test 4.4: Only paused experiments

**Given**: experiments.yaml with all experiments status=paused
**When**: Traffic routing runs
**Then**: Story assigned experiment_variant = "control" (no active experiments)

### Test 4.5: Only complete experiments

**Given**: experiments.yaml with all experiments status=complete
**When**: Traffic routing runs
**Then**: Story assigned experiment_variant = "control" (no active experiments)

---

## Test Suite 5: Story.yaml Integration

### Test 5.1: experiment_variant written to story.yaml

**Given**: Story assigned to experiment variant "exp-fast-track"
**When**: story.yaml is generated
**Then**: Contains `experiment_variant: "exp-fast-track"` in frontmatter

### Test 5.2: Control variant written to story.yaml

**Given**: Story assigned to control
**When**: story.yaml is generated
**Then**: Contains `experiment_variant: "control"` in frontmatter

### Test 5.3: Variant persisted through workflow

**Given**: story.yaml with experiment_variant set
**When**: Dev phases read story.yaml
**Then**: experiment_variant is available for propagation to OUTCOME.yaml

---

**Test File Version**: 1.0.0
**Created**: 2026-02-07
**Story**: WKFL-008
**Total Test Cases**: 21
