# Dev Feasibility Review: WINT-0250 — Define Escalation Rules for Multi-Model Routing

## Summary

**Feasibility Verdict:** FEASIBLE — LOW EFFORT
**Estimated Effort:** 1–2 hours
**Split Risk:** LOW (0.1)
**Story Type:** Documentation/Configuration only. No TypeScript source files. No database migrations. No HTTP endpoints.

---

## Scope Confirmation

The sole deliverable is `.claude/config/escalation-rules.yaml`. This is a declarative YAML configuration file with four top-level sections:

1. `meta` — version, created date, owner story, tier definitions source reference
2. `graduated_chain` — 3 threshold-based escalation rules
3. `hard_bypass` — 2 immediate-escalation rules for critical/security paths
4. `escalation_log_schema` — structured field definitions for escalation event records

No TypeScript, no migrations, no infrastructure provisioning. The `.claude/config/` directory may need to be created if WINT-0220 has not yet run.

---

## Dependency Analysis

| Dependency | Status | Impact |
|------------|--------|--------|
| WINT-0220 (model-strategy.yaml) | pending | Provides tier names. If not yet complete, use index-documented tier names with a TODO comment for alignment. Non-blocking. |
| WINT-0230 (llm-router) | elaboration | Runtime enforcer of these rules. Not needed to author the YAML spec. Non-blocking. |
| WINT-0240 (Ollama model fleet) | pending | Defines Local tier models. Escalation rules reference tiers, not model names. Non-blocking. |
| WINT-0260 (cost tracking) | pending | Downstream consumer of escalation logs. Log schema must expose `from_tier`, `to_tier`, `task_type`, `reason`, `timestamp`. Non-blocking for authoring. |
| WINT-0270 (benchmark results) | pending | Future tuning trigger. Threshold comments must reference WINT-0270 as the expected calibration source. Non-blocking. |

No hard blockers. All dependencies are either non-blocking or can be addressed with documented TODO comments.

---

## Implementation Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Tier name mismatch with WINT-0220 | Medium | Author with index-documented names; add TODO comment for alignment review when WINT-0220 lands |
| Log schema incompatible with WINT-0260 | Low | Seed specifies all 8 required fields; include them verbatim |
| `.claude/config/` directory conflict with WINT-0220 | Low | Check for directory existence before creating; do not overwrite any existing files |
| Escalation thresholds too aggressive or too lenient | Medium | Thresholds are the primary tuning knobs (failure_count: 2, confidence: 0.70); document tuning guidance in inline comments |
| Scope creep into enforcement logic | Low | Explicitly out of scope per non-goals; YAML spec only |

---

## Reuse Opportunities

| Candidate | How to Apply |
|-----------|-------------|
| Tier naming convention from WINT-0220 index entry | `Local-Small`, `Local-Large`, `API-Cheap`, `API-Mid`, `API-High` — adopt verbatim as the `from`/`to` values in rule definitions |
| LangGraph audit node structured event pattern | `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` — structured JSON fields with explicit `verdict`, `confidence`, `reasoning`; mirrors the structured `escalation_log_schema` required by AC-4 |
| Config directory convention | `.claude/config/` alongside `model-strategy.yaml` — co-locate without inventing new directory structure |

---

## Proposed Subtask Breakdown

### ST-1: Environment Check and Directory Setup

**Canonical Reference:** `.claude/config/` directory (to be established by WINT-0220)

**Steps:**
1. Check whether `.claude/config/model-strategy.yaml` exists.
   - If yes: read it, extract tier name identifiers for use in ST-2.
   - If no: note that index-documented tier names (`Local-Small`, `Local-Large`, `API-Cheap`, `API-Mid`, `API-High`) will be used, and a TODO comment will mark the alignment requirement.
2. Check whether `.claude/config/` directory exists. If not, create it with `mkdir -p .claude/config/`.
3. Verify no other files in `.claude/config/` will be affected by this story.

**Acceptance Criteria Covered:** AC-5 (tier alignment), AC-7 (directory creation)
**Estimated time:** 10–15 minutes

---

### ST-2: Author escalation-rules.yaml

**Canonical Reference:** `packages/backend/orchestrator/src/nodes/audit/devils-advocate.ts` (structured event pattern)

**Steps:**
1. Create `.claude/config/escalation-rules.yaml`.
2. Add `meta` block: `version`, `created` (ISO 8601), `owner_story: WINT-0250`, `tier_definitions_source: .claude/config/model-strategy.yaml`.
3. Add `graduated_chain` section with exactly 3 rules:
   - Rule 1: Local (both Local-Small and Local-Large) → API-Cheap on `failure_count >= 2`
   - Rule 2: API-Cheap → API-Mid on `confidence_below 0.70`
   - Rule 3: API-Mid → API-High on `failure_or_uncertainty`
4. Add `hard_bypass` section with exactly 2 rules:
   - Bypass 1: `task_decision_type == security_or_architecture` → API-High directly
   - Bypass 2: `task_label == critical` → API-High directly
5. Add `escalation_log_schema` section defining all 8 fields:
   `from_tier` (string, required), `to_tier` (string, required), `task_type` (string, required),
   `reason` (string, required), `failure_count` (integer, optional), `confidence_score` (float, optional),
   `timestamp` (ISO 8601 datetime, required), `bypass_rule` (boolean, required).
6. Add inline YAML comments on `failure_count: 2` and `confidence_threshold: 0.70` per AC-6 requirements.

**Acceptance Criteria Covered:** AC-1, AC-2, AC-3, AC-4, AC-6
**Estimated time:** 45–60 minutes

---

### ST-3: Add README Comment Block and Validate

**Canonical Reference:** YAML comment conventions from `.claude/config/` pattern

**Steps:**
1. Add top-of-file YAML comment block (lines starting with `#`) covering:
   - Purpose of the file
   - Which component reads it: llm-router (WINT-0230)
   - How to tune thresholds (failure_count, confidence_threshold)
   - What to do when WINT-0270 benchmarks are available
2. Validate YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('.claude/config/escalation-rules.yaml').read())"` — must exit 0.
3. Final content audit: count rules in each section, verify all 8 log schema fields present, confirm tier names consistent.

**Acceptance Criteria Covered:** AC-8, and final validation of all ACs
**Estimated time:** 15–20 minutes

---

## Architecture Notes

- **No runtime coupling in this story.** The YAML file is read by the llm-router (WINT-0230) at route-time. WINT-0250 only defines the rules; it does not wire them in.
- **Tier abstraction is intentional.** Rules reference tier names (`API-Cheap`, `API-Mid`, etc.) not specific model names. When WINT-0270 causes model swaps within a tier, escalation rules remain unchanged.
- **Two rule classes, not one.** The `graduated_chain` and `hard_bypass` sections are structurally distinct to allow the llm-router to apply them via separate code paths. Mixing them would create ambiguity.
- **Log schema is a specification, not a migration.** The `escalation_log_schema` section describes what the llm-router should emit per escalation event. It does not create a database table — that is WINT-0040's responsibility.

---

## Implementation Checklist

- [ ] ST-1: Check for `model-strategy.yaml`; document tier names or TODO comment; create `.claude/config/` if absent
- [ ] ST-2: Author `escalation-rules.yaml` with all 4 sections and all required fields
- [ ] ST-3: Add README comment block; validate YAML syntax; final content audit
- [ ] Verify no files outside `.claude/config/escalation-rules.yaml` were modified
- [ ] Confirm tier names are consistent throughout the file
- [ ] Confirm `failure_count: 2` and `confidence_threshold: 0.70` comments reference WINT-0270

---

## Feasibility Conclusion

This story is a straightforward YAML authoring task with clear specifications for every section, field, and comment. There are no runtime dependencies to satisfy during implementation. The only coordination risk is tier name alignment with WINT-0220, which is explicitly handled by the AC-5 conditional logic (read `model-strategy.yaml` if present; use documented defaults with a TODO if not). Recommend proceeding directly to implementation.
