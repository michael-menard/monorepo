# Implementation Plan - WKFL-003: Emergent Heuristic Discovery

**Generated**: 2026-02-07
**Story**: WKFL-003 - Emergent Heuristic Discovery
**Scope**: Agent/config-only story (no app code)

---

## Scope Surface

- **backend/API**: No
- **frontend/UI**: No
- **infra/config**: Yes (agent definitions, schemas, config output location)
- **packages**: No
- **notes**: This is a pure workflow infrastructure story. All deliverables are agent definitions, schemas, and config files. No production application code.

---

## Acceptance Criteria Checklist

- [ ] **AC-1**: Track decision outcomes (pattern, auto_accepted, user_outcome, tier, story_id, decision_id, timestamp)
  - KB entries have all required fields and are queryable by pattern

- [ ] **AC-2**: Compute success rate per pattern with minimum 5 samples
  - Only patterns with 5+ samples have computed success rates

- [ ] **AC-3**: Propose promotion when success rate > 95%
  - HEURISTIC-PROPOSALS.yaml contains promotion entries with rationale

- [ ] **AC-4**: Propose demotion when success rate < 80%
  - HEURISTIC-PROPOSALS.yaml contains demotion entries with rationale

- [ ] **AC-5**: All changes are proposals, not auto-applied
  - decision-classification.yaml unchanged after agent run

---

## Files To Touch (Expected)

### New Files to Create

1. `.claude/agents/heuristic-evolver.agent.md`
   - Agent definition for heuristic evolution analysis
   - Sonnet 4.5 model (analytical work)

2. `.claude/schemas/decision-outcome-schema.md`
   - Schema definition for decision outcome tracking
   - Documents fields, validation rules, KB integration

3. `.claude/config/HEURISTIC-PROPOSALS.yaml`
   - Output location for tier promotion/demotion proposals
   - Created by heuristic-evolver agent (example/template only in this story)

### Existing Files to Reference (No Modifications)

- `.claude/config/decision-classification.yaml` - existing tier definitions
- `.claude/agents/_shared/autonomy-tiers.md` - tier system (1-5)
- `.claude/agents/_shared/decision-handling.md` - decision protocol

---

## Reuse Targets

### Existing Patterns to Follow

1. **Agent Structure**
   - Reference: `.claude/agents/dev-implement-planner.agent.md`
   - Follow same frontmatter format (created, updated, version, type, permission_level)
   - Use same section structure (Mission, Inputs, Non-negotiables, Output, etc.)

2. **Schema Structure**
   - Reference: `.claude/schemas/gap-schema.md`
   - Follow same frontmatter and documentation patterns
   - Include Overview, Structure, Examples, Integration Points, Evolution Notes

3. **Config File Structure**
   - Reference: `.claude/config/decision-classification.yaml`
   - Use same YAML structure conventions
   - Include version, updated_at, comments for clarity

### KB Integration Patterns

- Use existing KB search/write patterns from other agents
- Follow decision logging patterns from decision-handling.md
- Query format: `kb_search({ query: "decision_outcome pattern_name", tags: ["tier-N"], limit: 10 })`

---

## Architecture Notes (Ports & Adapters)

### N/A - Agent/Config Story

This story does not involve ports & adapters architecture as it creates workflow infrastructure (agent definitions and schemas) rather than application code.

### Tier System Clarification

**IMPORTANT**: Use the full 1-5 tier system as defined in `.claude/agents/_shared/autonomy-tiers.md`:

- **Tier 1**: Clarification (highest autonomy, auto-accept candidates)
- **Tier 2**: Preference (notify-only candidates)
- **Tier 3**: Ambiguous Scope (require approval)
- **Tier 4**: Destructive/Irreversible (always escalate)
- **Tier 5**: External Dependency (escalate based on risk)

**Promotion Logic**: Move toward Tier 1 (higher autonomy)
**Demotion Logic**: Move toward Tier 4-5 (lower autonomy, higher oversight)

---

## Step-by-Step Plan (Small Steps)

### Step 1: Create decision-outcome-schema.md
**Objective**: Define the schema for tracking decision outcomes in KB

**Files**:
- Create: `.claude/schemas/decision-outcome-schema.md`

**Details**:
- Document all required fields from AC-1:
  - `type: decision_outcome`
  - `pattern: string` (regex pattern from decision-classification.yaml)
  - `story_id: string`
  - `decision_id: string`
  - `tier: number` (1-5)
  - `auto_accepted: boolean`
  - `user_outcome: enum` (confirmed | overridden)
  - `timestamp: ISO datetime`
- Include example KB entry
- Document KB integration (how to query by pattern, tier)
- Add validation rules and evolution notes

**Verification**:
- Schema file exists at correct path
- All AC-1 fields documented
- Example entry is complete and valid YAML

---

### Step 2: Create HEURISTIC-PROPOSALS.yaml template
**Objective**: Define output format for tier promotion/demotion proposals

**Files**:
- Create: `.claude/config/HEURISTIC-PROPOSALS.yaml`

**Details**:
- Include frontmatter: `generated_at`, `analyzed_stories`, `total_decisions`
- Define `promotions` section:
  - pattern
  - current_tier
  - proposed_tier
  - success_rate
  - samples
  - rationale
  - example_stories
- Define `demotions` section (same structure)
- Add comments explaining each field
- Include placeholder examples for reference

**Verification**:
- YAML is valid and well-formatted
- Includes both promotions and demotions sections
- Example entries demonstrate the expected format

---

### Step 3: Create heuristic-evolver.agent.md (Part 1: Mission & Inputs)
**Objective**: Define agent mission and input sources

**Files**:
- Create: `.claude/agents/heuristic-evolver.agent.md`

**Details**:
- Frontmatter:
  - created: 2026-02-07
  - version: 1.0.0
  - type: worker
  - permission_level: read-only (KB queries only, writes to proposals file)
  - model: sonnet-4.5
- Mission statement: Analyze decision outcome data to propose tier adjustments based on success rates
- Inputs section:
  - Read from `.claude/config/decision-classification.yaml` for current tier definitions
  - Query KB for decision_outcome entries
  - Read from `.claude/schemas/decision-outcome-schema.md` for field definitions
- Non-negotiables:
  - Do NOT modify decision-classification.yaml (proposals only)
  - Minimum 5 samples required for success rate calculation
  - Use thresholds: >95% promote, <80% demote

**Verification**:
- Agent file exists with proper frontmatter
- Mission is clear and concise
- Inputs are well-defined with file paths

---

### Step 4: Create heuristic-evolver.agent.md (Part 2: Success Rate Logic)
**Objective**: Document success rate calculation and tier adjustment logic

**Files**:
- Edit: `.claude/agents/heuristic-evolver.agent.md`

**Details**:
- Add "Success Rate Calculation" section:
  - Formula: `success_rate = confirmed_decisions / total_decisions`
  - Minimum sample size: 5 decisions
  - Group decisions by pattern regex
- Add "Promotion Logic" section:
  - If success_rate > 0.95 AND samples >= 5 AND current_tier > 1:
    - Propose: current_tier - 1 (move one tier toward higher autonomy)
  - Safety: Never promote directly to Tier 1 unless already at Tier 2
  - Cap initial promotions at Tier 2; Tier 1 requires human override
- Add "Demotion Logic" section:
  - If success_rate < 0.80 AND samples >= 5 AND current_tier < 5:
    - Propose: current_tier + 1 (move one tier toward lower autonomy)
  - If success_rate < 0.50 (severe underperformance):
    - Propose: current_tier + 2 (skip a tier for critical failures)
  - Safety: Never demote Tier 4 patterns (always require escalation)

**Verification**:
- Success rate formula is clear
- Promotion/demotion logic has safety bounds
- Single-step tier changes (not multi-step jumps except for severe failures)

---

### Step 5: Create heuristic-evolver.agent.md (Part 3: KB Queries & Output)
**Objective**: Document KB query patterns and output generation

**Files**:
- Edit: `.claude/agents/heuristic-evolver.agent.md`

**Details**:
- Add "KB Query Protocol" section:
  - Query all decision_outcome entries
  - Group by pattern field
  - Filter for minimum sample size (5)
  - Compute success rates per pattern
- Add "Output Generation" section:
  - Write to `.claude/config/HEURISTIC-PROPOSALS.yaml`
  - Include metadata: generated_at, analyzed_stories, total_decisions
  - Format promotions: pattern, current_tier, proposed_tier, success_rate, samples, rationale, example_stories
  - Format demotions: same structure
  - Rationale examples:
    - Promotion: "Users consistently accept [pattern] decisions across X stories"
    - Demotion: "Users frequently override [pattern] auto-decisions, indicating need for human review"
- Add "Verification" section:
  - Verify decision-classification.yaml unchanged
  - Log all proposals for human review

**Verification**:
- KB query pattern is documented
- Output format matches HEURISTIC-PROPOSALS.yaml template
- No auto-apply logic present

---

### Step 6: Add tier system reference to heuristic-evolver.agent.md
**Objective**: Document the full 1-5 tier system for agent reference

**Files**:
- Edit: `.claude/agents/heuristic-evolver.agent.md`

**Details**:
- Add "Tier System Reference" section:
  - Link to `.claude/agents/_shared/autonomy-tiers.md`
  - Document tier meanings:
    - Tier 1: Clarification (auto-accept)
    - Tier 2: Preference (notify-only)
    - Tier 3: Ambiguous Scope (require approval)
    - Tier 4: Destructive/Irreversible (always escalate)
    - Tier 5: External Dependency (escalate based on risk)
  - Note: Tier 4 patterns never get promoted or demoted (always require escalation)
  - Movement examples:
    - Promotion: Tier 3 → Tier 2 (require-approval → notify-only)
    - Demotion: Tier 2 → Tier 3 (notify-only → require-approval)

**Verification**:
- Tier definitions match autonomy-tiers.md
- Movement examples are correct
- Safety constraints documented

---

### Step 7: Add example KB entries to decision-outcome-schema.md
**Objective**: Provide concrete examples for developer reference

**Files**:
- Edit: `.claude/schemas/decision-outcome-schema.md`

**Details**:
- Add "Example Entries" section with 3 examples:
  1. **Confirmed auto-accept** (Tier 3, success case):
     - pattern: "loading.*state|skeleton"
     - auto_accepted: true
     - user_outcome: confirmed
     - tier: 3
  2. **Overridden auto-accept** (Tier 2, failure case):
     - pattern: "breaking.*api"
     - auto_accepted: true
     - user_outcome: overridden
     - tier: 2
  3. **Escalated decision later confirmed** (Tier 5, baseline):
     - pattern: "npm.*install|add.*dependency"
     - auto_accepted: false
     - user_outcome: confirmed
     - tier: 5
- Add notes explaining each scenario

**Verification**:
- Examples cover different tiers and outcomes
- YAML is valid
- Scenarios are realistic

---

### Step 8: Document integration points in decision-outcome-schema.md
**Objective**: Explain how decision outcomes flow into heuristic evolution

**Files**:
- Edit: `.claude/schemas/decision-outcome-schema.md`

**Details**:
- Add "Integration Points" section:
  - **Produced By**: Decision-handling agents (when decisions are made and user confirms/overrides)
  - **Consumed By**: heuristic-evolver.agent.md (queries KB for outcome data)
  - **Storage**: Knowledge Base (via kb_add_decision or similar)
  - **Query Pattern**: `kb_search({ query: "decision_outcome [pattern]", tags: ["tier-N"], limit: 100 })`
- Add "Data Flow" diagram (text-based):
  1. Decision made → outcome logged to KB
  2. User confirms/overrides → KB entry updated
  3. Heuristic evolver queries KB → computes success rates
  4. Proposals generated → written to HEURISTIC-PROPOSALS.yaml
  5. Human reviews proposals → manually updates decision-classification.yaml if approved

**Verification**:
- Integration points are clear
- Data flow is end-to-end
- No auto-apply step present

---

### Step 9: Add evolution notes to all deliverables
**Objective**: Document how schemas and agents can evolve in the future

**Files**:
- Edit: `.claude/schemas/decision-outcome-schema.md`
- Edit: `.claude/agents/heuristic-evolver.agent.md`

**Details**:
- In decision-outcome-schema.md:
  - Add "Evolution Notes" section
  - Document potential future fields: quality_score, time_to_confirm, rework_needed
  - Note schema versioning approach (increment version, document migration)
- In heuristic-evolver.agent.md:
  - Add "Future Enhancements" section
  - Reference deferred KB entries from DECISIONS.yaml:
    - Configurable thresholds (gap-4)
    - Recency weighting (gap-3)
    - Confidence intervals (gap-1)
    - Pattern versioning (gap-5)
  - Note that agent logic can be extended without breaking existing proposals

**Verification**:
- Evolution notes present in both files
- Future enhancements are logged, not implemented
- Versioning approach documented

---

### Step 10: Add documentation headers and metadata
**Objective**: Ensure all files have proper frontmatter and documentation

**Files**:
- Edit: `.claude/schemas/decision-outcome-schema.md`
- Edit: `.claude/agents/heuristic-evolver.agent.md`
- Edit: `.claude/config/HEURISTIC-PROPOSALS.yaml`

**Details**:
- decision-outcome-schema.md:
  - Frontmatter: created, updated, version, doc_type: schema
  - Add overview paragraph explaining purpose
- heuristic-evolver.agent.md:
  - Verify frontmatter is complete
  - Add usage examples section
- HEURISTIC-PROPOSALS.yaml:
  - Add header comment explaining file purpose
  - Note that file is generated by heuristic-evolver agent
  - Include version and schema reference

**Verification**:
- All files have proper frontmatter
- Purpose is clear in each file
- Metadata is consistent

---

### Step 11: Create example proposal scenarios
**Objective**: Demonstrate heuristic evolver output with realistic examples

**Files**:
- Edit: `.claude/config/HEURISTIC-PROPOSALS.yaml`

**Details**:
- Add commented-out example scenarios:
  1. **Promotion scenario**:
     - Pattern: "loading.*state|skeleton"
     - Success rate: 97% (23 samples)
     - Current tier: 3 → Proposed tier: 2
     - Rationale: "Users consistently accept loading state additions across UI stories"
     - Example stories: [WISH-2045, WISH-2046, DASH-301]
  2. **Demotion scenario**:
     - Pattern: "breaking.*api"
     - Success rate: 12% (8 samples)
     - Current tier: 2 → Proposed tier: 3
     - Rationale: "Users frequently override API breaking change auto-decisions"
     - Example stories: [API-042, API-055]
  3. **No action scenario** (commented note):
     - Pattern with success rate between 80-95% → no proposal generated

**Verification**:
- Examples are commented out (not active proposals)
- Scenarios cover promotion, demotion, and no-action cases
- Rationale text is informative

---

### Step 12: Final review and consistency check
**Objective**: Verify all deliverables are consistent and complete

**Files**:
- Read: All created files

**Details**:
- Verify AC-1 fields are documented in decision-outcome-schema.md
- Verify AC-2 minimum sample logic is in heuristic-evolver.agent.md
- Verify AC-3 promotion logic (>95%) is documented
- Verify AC-4 demotion logic (<80%) is documented
- Verify AC-5 no-auto-apply is emphasized in both agent and schema
- Check cross-references between files are correct
- Ensure tier system (1-5) is consistent across all files
- Verify file paths are absolute and correct

**Verification**:
- All ACs have corresponding implementation details
- No contradictions between files
- All paths and references are valid

---

## Test Plan

### Manual Verification (No Unit Tests for Agent Definitions)

**Test 1: Schema Completeness (AC-1)**
```bash
# Verify decision-outcome-schema.md exists and has all required fields
cat .claude/schemas/decision-outcome-schema.md
# Check for: pattern, auto_accepted, user_outcome, tier, story_id, decision_id, timestamp
```

**Test 2: Agent Logic Documentation (AC-2, AC-3, AC-4)**
```bash
# Verify heuristic-evolver.agent.md has documented logic
cat .claude/agents/heuristic-evolver.agent.md
# Check for:
# - Minimum 5 samples requirement
# - Promotion threshold >95%
# - Demotion threshold <80%
# - Single-step tier changes with safety bounds
```

**Test 3: Proposal Output Format (AC-3, AC-4)**
```bash
# Verify HEURISTIC-PROPOSALS.yaml has correct structure
cat .claude/config/HEURISTIC-PROPOSALS.yaml
# Check for:
# - promotions section with all fields
# - demotions section with all fields
# - Example scenarios are commented out
```

**Test 4: No Auto-Apply (AC-5)**
```bash
# Verify decision-classification.yaml is not modified
git status .claude/config/decision-classification.yaml
# Should show: unchanged

# Verify heuristic-evolver.agent.md emphasizes proposals-only
grep -i "do not modify\|proposals only\|human review" .claude/agents/heuristic-evolver.agent.md
# Should find multiple mentions
```

**Test 5: Tier System Consistency**
```bash
# Verify tier references are 1-5 (not 1-3)
grep -i "tier 1\|tier 2\|tier 3\|tier 4\|tier 5" .claude/agents/heuristic-evolver.agent.md
# Should reference full 1-5 system

# Verify no references to incorrect 1-3 tier system
grep -i "tier 1-3" .claude/agents/heuristic-evolver.agent.md
# Should return no matches
```

**Test 6: Cross-Reference Validation**
```bash
# Verify file paths in agent references are correct
cat .claude/agents/heuristic-evolver.agent.md | grep "\.claude/"
# Check all paths exist:
# - .claude/config/decision-classification.yaml
# - .claude/schemas/decision-outcome-schema.md
# - .claude/agents/_shared/autonomy-tiers.md
```

**Test 7: Documentation Quality**
```bash
# Verify all files have proper frontmatter
head -n 10 .claude/schemas/decision-outcome-schema.md
head -n 10 .claude/agents/heuristic-evolver.agent.md

# Check for version, created, updated fields
```

### Integration Test (Post-Implementation)

When WKFL-002 and WKFL-004 are complete, validate end-to-end flow:

1. WKFL-002 generates decision outcome data in KB
2. WKFL-004 captures user feedback (confirm/override)
3. Run heuristic-evolver agent manually
4. Verify HEURISTIC-PROPOSALS.yaml is generated
5. Check that decision-classification.yaml remains unchanged
6. Review proposals for accuracy and rationale quality

---

## Stop Conditions / Blockers

### Dependencies (Known, Not Blocking for Config/Agent Creation)

1. **WKFL-002**: Provides calibration data and initial decision tracking
   - Status: In-progress (forced continuation approved)
   - Impact: Cannot test agent execution until WKFL-002 completes
   - Mitigation: Create agent definition and schema now, test later

2. **WKFL-004**: Provides user feedback mechanism
   - Status: Not started
   - Impact: Cannot capture user_outcome (confirmed/overridden) until WKFL-004 completes
   - Mitigation: Schema and agent are ready when feedback system is available

### No Current Blockers

All deliverables (agent definition, schema, config template) can be created without dependencies being complete. Testing will require dependencies but definition work can proceed.

---

## Architectural Decisions

### Decision 1: Single-Step vs Multi-Step Tier Changes

**Question**: Should tier promotions/demotions move one tier at a time or allow multi-tier jumps?

**Options**:
- A) Single-step only (e.g., Tier 3 → Tier 2)
- B) Multi-step allowed (e.g., Tier 3 → Tier 1 if success rate is 99%)
- C) Single-step default, multi-step only for severe failures (<50% success)

**Recommendation**: **Option C** (documented in DECISIONS.yaml, Clarification #2)

**Rationale**:
- Single-step changes are safer and allow for intermediate calibration
- Severe failures (<50% success rate) warrant faster demotion to prevent damage
- Gradual promotion prevents over-correction from limited sample sizes

**Resolution**: Auto-resolved in autonomous mode with sensible defaults per DECISIONS.yaml.

---

### Decision 2: Configurable Thresholds (Quick Win Opportunity)

**Question**: Should promotion/demotion thresholds (95%, 80%) be configurable?

**Options**:
- A) Hard-code thresholds in agent
- B) Make thresholds configurable in HEURISTIC-PROPOSALS.yaml frontmatter
- C) Make thresholds configurable per tier in decision-classification.yaml

**Recommendation**: **Option A** for MVP, document Option C as gap-4 enhancement

**Rationale**:
- Hard-coded thresholds are simpler to implement and validate for MVP
- Gap-4 is logged in DECISIONS.yaml as a quick win for future enhancement
- If time permits during implementation, Option C can be added

**Resolution**: Use hard-coded thresholds initially per scope constraints.

---

### Decision 3: KB Entry Type for Decision Outcomes

**Question**: How should decision outcomes be stored in KB?

**Options**:
- A) Use existing kb_add_decision function
- B) Create new kb_add_decision_outcome function
- C) Store as generic KB entries with type: decision_outcome

**Recommendation**: **Option A** (use existing kb_add_decision)

**Rationale**:
- Reuses existing KB patterns
- Decision outcomes are a type of decision, fits existing schema
- Avoids creating new KB functions for minimal benefit

**Resolution**: Document in decision-outcome-schema.md to use kb_add_decision with type field.

---

## Worker Token Summary

**Estimated Token Usage**:

- **Input**: ~15,000 tokens
  - Story files (WKFL-003.md, story.yaml, ELAB-WKFL-003.md): ~8,000 tokens
  - Reference files (autonomy-tiers.md, decision-handling.md, decision-classification.yaml): ~4,000 tokens
  - Existing agent/schema examples: ~3,000 tokens

- **Output**: ~8,000 tokens
  - IMPLEMENTATION-PLAN.md (this file): ~8,000 tokens

- **Total**: ~23,000 tokens (well within 60,000 budget)

**Remaining Budget**: ~37,000 tokens for implementation phase

---

## Plan Summary

This implementation plan creates three deliverables:

1. **heuristic-evolver.agent.md**: Agent definition with success rate calculation, promotion/demotion logic, and KB query patterns
2. **decision-outcome-schema.md**: Schema defining decision outcome tracking fields and KB integration
3. **HEURISTIC-PROPOSALS.yaml**: Output template for tier adjustment proposals

All deliverables are agent/config files (no app code). The plan follows a logical progression:
- Schema definition first (establishes data structure)
- Output format second (defines agent output contract)
- Agent implementation last (builds on schema and output format)

Each step is small, verifiable, and contributes to one or more acceptance criteria. The plan emphasizes proposals-only approach (AC-5) and includes safety bounds for tier changes.

**Next Phase**: Execute implementation following the 12 steps outlined above.
