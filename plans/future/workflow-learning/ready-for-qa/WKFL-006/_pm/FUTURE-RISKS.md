# Future Risks: WKFL-006 - Cross-Story Pattern Mining

## Non-MVP Risks

### Risk 1: Embedding-Based Clustering Accuracy

**Risk:**
Text similarity (Levenshtein distance) used in MVP may produce less accurate clustering than embedding-based similarity (AC-4 requirement: 0.85).

**Impact (if not addressed post-MVP):**
- False positive clustering (unrelated findings grouped)
- False negative clustering (related findings split)
- Pattern recommendations less actionable
- Noise in AGENT-HINTS.yaml output

**Recommended timeline:**
After 2-3 pattern mining runs with text similarity, evaluate:
- Clustering quality (manual review of grouped findings)
- False positive/negative rates
- If problematic, prioritize embedding upgrade story

### Risk 2: Pattern Stability Across Time Windows

**Risk:**
Patterns detected in Month 1 may not recur in Month 2 (seasonal variance, story type variance). No mechanism to track pattern lifecycle (emerging, stable, declining).

**Impact (if not addressed post-MVP):**
- Pattern thrashing (agent hints updated frequently)
- Unclear which patterns are durable vs transient
- Difficulty prioritizing pattern-based improvements

**Recommended timeline:**
After 3 months of pattern mining data:
- Implement pattern tracking (first_detected, last_detected, frequency)
- Add pattern lifecycle states (emerging, stable, declining, obsolete)
- Filter AGENT-HINTS.yaml to stable patterns only

### Risk 3: Agent Hint Injection Not Automated

**Risk:**
AGENT-HINTS.yaml generated but not automatically injected into agent prompts. Requires manual integration by devs.

**Impact (if not addressed post-MVP):**
- Pattern learning not closed-loop (insights don't improve agents)
- Manual overhead to update agent prompts
- Insights may be ignored or forgotten

**Recommended timeline:**
After pattern mining stabilizes (2-3 months):
- Design agent prompt injection mechanism
- Create agent-loader that merges hints into prompts
- Automate hint updates when AGENT-HINTS.yaml changes

### Risk 4: Cross-Project Pattern Mining

**Risk:**
Pattern mining scoped to single monorepo. Patterns from other projects not captured.

**Impact (if not addressed post-MVP):**
- Insights limited to one codebase
- Cross-project patterns (e.g., "React hooks cause issues") not detected
- Learning slower than multi-project approach

**Recommended timeline:**
If additional projects adopt workflow system (6+ months):
- Design cross-project pattern aggregation
- Federated pattern mining (per-project + global)
- Privacy considerations for cross-project sharing

### Risk 5: Pattern Recommendation Priority

**Risk:**
All patterns weighted equally in AGENT-HINTS.yaml. No priority/severity scoring to guide which patterns to address first.

**Impact (if not addressed post-MVP):**
- Unclear which patterns are most impactful
- Risk of low-value pattern noise
- Difficult to justify effort on pattern-based improvements

**Recommended timeline:**
After 1 month of pattern mining:
- Add impact scoring (correlation × frequency × severity)
- Prioritize high-impact patterns in AGENT-HINTS.yaml
- Track pattern remediation effectiveness (before/after metrics)

### Risk 6: ANTI-PATTERNS.md Maintenance

**Risk:**
ANTI-PATTERNS.md regenerated each run. Old patterns deleted if no longer detected. No historical archive.

**Impact (if not addressed post-MVP):**
- Loss of historical pattern context
- Can't track which anti-patterns were resolved
- No success metrics (anti-pattern elimination rate)

**Recommended timeline:**
After 2 months of pattern mining:
- Implement ANTI-PATTERNS-ARCHIVE.md (cumulative history)
- Track pattern resolution dates
- Add "resolved patterns" section (patterns that disappeared)

## Scope Tightening Suggestions

### 1. Weekly Cron Execution

**Current scope:** Story mentions "weekly cron or on-demand"
**Suggested tightening:** Manual command only for MVP
**Rationale:** No cron infrastructure exists yet; command provides same functionality with manual trigger
**Future iteration:** Create separate infrastructure story for weekly cron setup

### 2. Semantic Code Analysis

**Current scope:** Non-goal in story.yaml
**Suggested emphasis:** Reinforce that pattern mining is file/path/text patterns only, not code semantics
**Rationale:** Semantic analysis (e.g., "detect unused variables") requires AST parsing, out of scope
**Future iteration:** If desired, create separate code quality analysis story

### 3. Real-Time Pattern Detection

**Current scope:** Non-goal in story.yaml
**Suggested emphasis:** Pattern mining is batch-only (not per-story)
**Rationale:** Real-time detection requires different architecture (event streaming)
**Future iteration:** If desired, create streaming pattern detection story (different model)

### 4. Pattern-Based Workflow Changes

**Current scope:** Non-goal (generate proposals, not auto-apply)
**Suggested emphasis:** Patterns are recommendations only; human review required
**Rationale:** Automated workflow changes are high-risk (covered by WKFL-010 improvement proposals)
**Future iteration:** WKFL-010 consumes pattern mining output for improvement proposals

## Future Requirements

### 1. Pattern Confidence Intervals

**Requirement:**
Pattern correlations should include confidence intervals (e.g., "routes.ts fails lint 78% ± 5%").

**Rationale:**
- Statistical rigor for pattern credibility
- Helps distinguish strong patterns (narrow CI) from weak patterns (wide CI)
- Guides sample size requirements

**Recommended addition:**
After 3 months of pattern mining, add statistical confidence calculation to pattern detection logic.

### 2. Pattern Feedback Loop

**Requirement:**
Track when patterns lead to agent/workflow improvements, and measure impact (did failure rate decrease?).

**Rationale:**
- Validates pattern mining value
- Identifies which patterns are actionable vs noise
- Closes learning loop (detect → improve → measure)

**Recommended addition:**
Integrate with WKFL-001 (retro agent) and WKFL-010 (improvement proposals) to track pattern → improvement → outcome.

### 3. Interactive Pattern Exploration

**Requirement:**
Command to query patterns by type, agent, file pattern, etc. (e.g., `/pattern-query --agent security --type lint`).

**Rationale:**
- Bulk PATTERNS-{month}.yaml file hard to navigate
- Enables ad-hoc pattern exploration
- Supports hypothesis testing (e.g., "Do auth stories have more security findings?")

**Recommended addition:**
Create `/pattern-query` command in future story, leveraging KB pattern storage.

### 4. Pattern Explainability

**Requirement:**
For each pattern, include sample story links and specific finding examples.

**Rationale:**
- Makes patterns concrete and understandable
- Enables manual validation of pattern accuracy
- Helps developers understand context behind recommendations

**Recommended addition:**
Enhance PATTERNS-{month}.yaml schema to include samples array with story_id + finding_id references.

### 5. Multi-Repo Pattern Aggregation

**Requirement:**
If workflow system adopted across multiple repos, aggregate patterns across repos (with privacy controls).

**Rationale:**
- Accelerates learning (larger sample size)
- Detects patterns invisible in single repo
- Enables cross-team knowledge sharing

**Recommended addition:**
Design federated pattern mining architecture (6+ months out, depends on multi-repo adoption).

### 6. Pattern Deprecation

**Requirement:**
Mark patterns as "resolved" when correlation drops below threshold, track pattern lifecycle.

**Rationale:**
- Celebrate wins (anti-patterns eliminated)
- Avoid stale recommendations
- Measure workflow improvement effectiveness

**Recommended addition:**
Add pattern lifecycle tracking (first_seen, last_seen, status: active/declining/resolved) in future enhancement.
