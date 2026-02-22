# Test Plan: WINT-0250 — Define Escalation Rules for Multi-Model Routing

## Overview

**Story Type:** Configuration/Documentation
**Primary Deliverable:** `.claude/config/escalation-rules.yaml`
**No TypeScript source files.** Verification is documentation QA — YAML syntax validation and content audit against the 8 acceptance criteria.

---

## Test Strategy

This story has no runtime code to unit test. The test strategy consists of:

1. **YAML syntax validation** — The file must parse as valid YAML without errors.
2. **Structural content audit** — Each required section and field is verified against the AC specifications.
3. **Cross-reference naming audit** — Tier names in `escalation-rules.yaml` must match those in `model-strategy.yaml` once WINT-0220 is complete (or correctly reference index-documented names with a TODO comment).
4. **Comment quality audit** — Inline comments on threshold values must be actionable and reference WINT-0270 as the tuning trigger.

No E2E Playwright tests, no HTTP endpoint tests, no database tests. ADR-005 (real services for UAT) is not applicable.

---

## Test Cases

### TC-1: YAML Syntax Validity (AC-1)

**Type:** Static analysis
**Tool:** `python3 -c "import yaml; yaml.safe_load(open('.claude/config/escalation-rules.yaml').read())"` or equivalent YAML linter
**Pass Criteria:**
- File parses without error
- No YAML syntax warnings

---

### TC-2: Meta Block Completeness (AC-1)

**Type:** Content audit
**Pass Criteria:**
- `meta.version` field present (e.g., `"1.0.0"`)
- `meta.created` field present (ISO 8601 date)
- `meta.owner_story` field equals `"WINT-0250"`
- `meta.tier_definitions_source` field equals `".claude/config/model-strategy.yaml"`

---

### TC-3: Graduated Chain — Exactly 3 Rules (AC-2)

**Type:** Content audit
**Pass Criteria:**
- `graduated_chain` section exists at the top level
- Exactly 3 rules present in `graduated_chain`
- Rule 1: `from: Local` (covers Local-Small and Local-Large), `trigger: failure_count`, `threshold: 2`, `to: API-Cheap`
- Rule 2: `from: API-Cheap`, `trigger: confidence_below`, `threshold: 0.70`, `to: API-Mid`
- Rule 3: `from: API-Mid`, `trigger: failure_or_uncertainty`, `to: API-High`

---

### TC-4: Hard Bypass — Exactly 2 Rules (AC-3)

**Type:** Content audit
**Pass Criteria:**
- `hard_bypass` section exists at the top level
- Exactly 2 rules present in `hard_bypass`
- Bypass 1: `condition: task_decision_type`, `value: security_or_architecture`, `to: API-High`
- Bypass 2: `condition: task_label`, `value: critical`, `to: API-High`

---

### TC-5: Escalation Log Schema — 8 Required Fields (AC-4)

**Type:** Content audit
**Pass Criteria:**
- `escalation_log_schema` section exists at the top level
- `from_tier` field: type string, marked required
- `to_tier` field: type string, marked required
- `task_type` field: type string, marked required
- `reason` field: type string, marked required
- `failure_count` field: type integer, marked optional
- `confidence_score` field: type float, marked optional
- `timestamp` field: ISO 8601 datetime format, marked required
- `bypass_rule` field: type boolean, marked required

---

### TC-6: Tier Name Consistency Audit (AC-5)

**Type:** Cross-file naming audit
**Condition A (WINT-0220 complete):** `.claude/config/model-strategy.yaml` exists
- Extract tier names from `model-strategy.yaml`
- Verify all tier references in `escalation-rules.yaml` (`from`, `to` fields) match exactly

**Condition B (WINT-0220 not yet complete):** `model-strategy.yaml` does not exist
- Verify tier names in `escalation-rules.yaml` match: `Local-Small`, `Local-Large`, `API-Cheap`, `API-Mid`, `API-High`
- Verify a YAML comment is present noting alignment is required when WINT-0220 completes

**Pass Criteria (both conditions):** No mismatched tier names.

---

### TC-7: Threshold Comments — Actionable and Reference WINT-0270 (AC-6)

**Type:** Comment audit
**Pass Criteria:**
- `failure_count: 2` has an inline YAML comment explaining: 2 consecutive failures before assuming local tier cannot handle the task; includes guidance to tune down to 1 for fast-fail tasks, up to 3 for flaky tasks; references WINT-0270 as the benchmark-driven tuning trigger
- `confidence_threshold: 0.70` (or equivalent field) has an inline YAML comment explaining: API-Cheap models must exceed 70% to be trusted; explains hallucination risk below threshold; references task criticality as a tuning guide

---

### TC-8: Directory Creation (AC-7)

**Type:** File system audit
**Pass Criteria:**
- `.claude/config/` directory exists
- `escalation-rules.yaml` is present in `.claude/config/`
- No other files in `.claude/config/` were modified by this story (if `model-strategy.yaml` exists from WINT-0220, it is unchanged)

---

### TC-9: Top-of-File README Comment Block (AC-8)

**Type:** Content audit
**Pass Criteria:**
The file begins with a YAML comment block (lines starting with `#`) that covers all 4 required topics:
1. Purpose of the file
2. Which component reads it (llm-router, WINT-0230)
3. How to tune thresholds
4. What to do when WINT-0270 benchmarks are available

---

## Integration Regression Note

When WINT-0230 (unified model interface / llm-router) is implemented, a separate integration concern applies:
- The llm-router must read `escalation-rules.yaml` and correctly apply `graduated_chain` rules (retry-based and confidence-based) and `hard_bypass` rules.
- This integration test **belongs to WINT-0230**, not to WINT-0250.
- WINT-0250 QA verifies only that the declarative specification is correct and complete.

When WINT-0260 (model cost tracking) is implemented:
- Verify that escalation log records emitted by the llm-router conform to the `escalation_log_schema` defined in this story.
- This cross-story schema compatibility concern **belongs to WINT-0260**, not WINT-0250.

---

## UAT Acceptance Checklist

| AC | Test Cases | Pass Criteria |
|----|------------|---------------|
| AC-1: meta block | TC-1, TC-2 | YAML valid + meta fields present |
| AC-2: graduated_chain (3 rules) | TC-3 | Exactly 3 rules with correct structure |
| AC-3: hard_bypass (2 rules) | TC-4 | Exactly 2 bypass rules to API-High |
| AC-4: escalation_log_schema (8 fields) | TC-5 | All 8 fields with correct types |
| AC-5: tier name alignment | TC-6 | Names match model-strategy.yaml or use documented defaults with TODO |
| AC-6: threshold comments | TC-7 | Actionable comments reference WINT-0270 |
| AC-7: directory creation | TC-8 | .claude/config/ exists, no unintended changes |
| AC-8: README comment block | TC-9 | 4 required topics covered |

---

## Effort Notes

All test cases are manual content audits or simple command-line YAML validation. No test framework setup required. Estimated QA effort: 15-30 minutes for a thorough review of a single YAML file.
