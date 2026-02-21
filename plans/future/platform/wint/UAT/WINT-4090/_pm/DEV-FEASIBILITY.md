# Dev Feasibility Review: WINT-4090 — Create evidence-judge Agent

## Feasibility Summary

- **Feasible for MVP:** yes
- **Confidence:** high
- **Why:** This story produces a single `.agent.md` documentation/instruction file. There is no TypeScript code, no DB migration, no new MCP tools, and no infrastructure change. Complexity is entirely in the design of the evidence strength evaluation rules and the `ac-verdict.json` schema — both are spec-authoring tasks, not implementation risks. The sister agent WINT-4080 (scope-defender) provides a direct structural template to replicate.

---

## Likely Change Surface (Core Only)

- **Files to create:**
  - `.claude/agents/evidence-judge.agent.md` (primary deliverable — new file)
- **Files to read for reference:**
  - `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` (structural template)
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/_reference/schemas/evidence-yaml.md` (input schema)
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/_shared/FRONTMATTER.md` (frontmatter standard)
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/story-attack-agent.agent.md` (BOUNDS table pattern)
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/qa-verify-verification-leader.agent.md` (existing QA agent — do not modify)
- **Critical deploy touchpoints:** none (agent file, no deployment required)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Evidence strength rules are ambiguous, allowing haiku model to misapply them

- **Why it blocks MVP:** The entire value of this agent is its ability to classify evidence as STRONG or WEAK mechanically. If the rules are underspecified, a haiku-class model will make inconsistent verdicts — defeating the "no vibes" mandate.
- **Required mitigation:** Rules must enumerate exact patterns (keyword lists, presence/absence of specific fields per type) without leaving room for interpretation. Keyword blocklist for subjective descriptions (appears, seems, should, looks, etc.) must be explicit and exhaustive. Per-type STRONG criteria must be binary checks, not judgment calls.

### Risk 2: CHALLENGE vs REJECT boundary is unclear

- **Why it blocks MVP:** Downstream consumers (WINT-4120, WINT-4140) use `overall_verdict` to gate QA decisions. If CHALLENGE and REJECT are confused, the gate produces wrong signals.
- **Required mitigation:** The boundary must be unambiguous in the agent spec: zero evidence_items = REJECT; at least one WEAK item (no STRONG) = CHALLENGE; at least one STRONG item = ACCEPT. These thresholds must be documented as explicit decision rules, not prose descriptions.

### Risk 3: ac-verdict.json schema instability breaks WINT-4120/WINT-4140 consumer contract

- **Why it blocks MVP:** WINT-4120 (workflow integration) and WINT-4140 (Round Table) depend on parsing `ac-verdict.json`. If the schema changes after implementation, both downstream stories must be updated.
- **Required mitigation:** Document the schema as a provisional v1 contract. Keep field names simple and stable. Design conservatively (additive changes only in WINT-4150). Mark it clearly as interim in the agent file's schema section.

---

## Missing Requirements for MVP

None identified. The seed ACs (AC-1 through AC-8) fully specify the implementation. The conflict warning (ac-verdict.json schema not formally defined) is non-blocking and addressed by defining a provisional schema in AC-5.

**One clarification recommended (non-blocking):** The stories index WINT-9050 lists "Depends On: WINT-4070" but the description says "evidence-judge". Implementer should note this as a potential index typo and surface it to the PM when starting WINT-9050. This does not block WINT-4090.

---

## MVP Evidence Expectations

- File exists at `.claude/agents/evidence-judge.agent.md`
- Frontmatter validates: `model: haiku`, `type: worker`, `version: 1.0.0`, description ≤ 80 chars
- Agent file contains all 8 AC sections: Inputs, Execution Phases, Evidence Strength Rules, ac-verdict.json Schema, Completion Signals, LangGraph Porting Notes, Non-Negotiables, Non-Goals
- Functional invocation against sample EVIDENCE.yaml:
  - Strong test evidence → ACCEPT verdict in ac-verdict.json
  - Weak command evidence (subjective) → CHALLENGE verdict
  - Empty evidence_items → REJECT verdict
  - Missing EVIDENCE.yaml → COMPLETE WITH WARNINGS + all-REJECT output

---

## Proposed Subtask Breakdown

### ST-1: Design ac-verdict.json Schema and Confirm Consumer Requirements

- **Goal:** Produce the definitive provisional `ac-verdict.json` schema, verified against WINT-4120 and WINT-4140 downstream consumption needs, and the WINT-4080 scope-challenges.json schema as a structural model.
- **Files to read:**
  - `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` (scope-challenges.json schema pattern)
  - `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/backlog/WINT-4090/_pm/STORY-SEED.md` (AC-5 schema requirements)
- **Files to create/modify:** Design notes only (inline, no separate file required)
- **ACs covered:** AC-5
- **Depends on:** none
- **Verification:** Schema design reviewed for all required fields (story_id, generated_at, overall_verdict, ac_verdicts array, counts); confirmed additive-extension compatible

---

### ST-2: Write Agent Frontmatter + Role + Mission + Inputs Sections

- **Goal:** Create `.claude/agents/evidence-judge.agent.md` with valid WINT standard frontmatter, Role, Mission, and Inputs sections including graceful degradation documentation.
- **Files to read:**
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/_shared/FRONTMATTER.md`
  - `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` (structural template)
- **Files to create/modify:** `.claude/agents/evidence-judge.agent.md` (new file, initial sections)
- **ACs covered:** AC-1, AC-2
- **Depends on:** none (can start simultaneously with ST-1; merge after ST-1 schema design)
- **Verification:** Frontmatter YAML is valid; `model: haiku`, `type: worker`, `version: 1.0.0`; description ≤ 80 chars; Inputs section documents all 4 inputs with graceful degradation

---

### ST-3: Write Evidence Strength Evaluation Rules + Execution Phases

- **Goal:** Add the Evidence Strength Evaluation section (per-type STRONG/WEAK criteria, subjective language blocklist) and the 4-phase Execution Flow section to the agent file.
- **Files to read:**
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/_reference/schemas/evidence-yaml.md` (evidence_items types and fields)
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/story-attack-agent.agent.md` (BOUNDS table hard cap pattern)
  - ST-2 output: `.claude/agents/evidence-judge.agent.md` (append to existing file)
- **Files to create/modify:** `.claude/agents/evidence-judge.agent.md` (append Evidence Strength + Phases sections)
- **ACs covered:** AC-3, AC-4
- **Depends on:** ST-2
- **Verification:** Evidence type rules cover all 5 types (test, command, e2e, http, any); subjective language blocklist defined; ACCEPT/CHALLENGE/REJECT thresholds are binary decision rules; 4 phases defined with input/output contracts

---

### ST-4: Write Output Schema + Completion Signals + LangGraph Porting Notes

- **Goal:** Add the Output section (ac-verdict.json schema from ST-1), Completion Signals section (3 exact signals), and LangGraph Porting Notes section to the agent file.
- **Files to read:**
  - `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/ready-to-work/WINT-4080/WINT-4080.md` (completion signals and LangGraph porting notes pattern)
  - ST-1 schema design output
  - ST-2/ST-3 output: `.claude/agents/evidence-judge.agent.md` (append)
- **Files to create/modify:** `.claude/agents/evidence-judge.agent.md` (append Output + Completion Signals + LangGraph sections)
- **ACs covered:** AC-5, AC-6, AC-7
- **Depends on:** ST-3
- **Verification:** ac-verdict.json schema fully documented with all required fields; 3 completion signals documented exactly; LangGraph section documents canonical inputs/outputs/phases/no-MCP-tools note/WINT-9010 relationship

---

### ST-5: Write Non-Negotiables + Non-Goals Sections

- **Goal:** Add Non-Negotiables (enforcement rules that must never be violated) and Non-Goals (explicit out-of-scope items) sections to complete the agent file.
- **Files to read:**
  - `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/backlog/WINT-4090/_pm/STORY-SEED.md` (AC-8 non-goals, protected features)
  - ST-4 output: `.claude/agents/evidence-judge.agent.md` (append)
- **Files to create/modify:** `.claude/agents/evidence-judge.agent.md` (append Non-Negotiables + Non-Goals sections)
- **ACs covered:** AC-8
- **Depends on:** ST-4
- **Verification:** Non-Goals lists all 6 out-of-scope items from AC-8; protected features listed; Non-Negotiables include: no test re-execution, no DB writes, no qa-verify replacement, output must be machine-readable JSON, WINT-0210 conditional handling

---

### ST-6: Functional Verification Against Sample EVIDENCE.yaml Fixtures

- **Goal:** Invoke the completed evidence-judge agent against at least 3 sample EVIDENCE.yaml fixtures (strong, weak, missing evidence) and confirm correct verdicts in produced ac-verdict.json.
- **Files to read:**
  - `.claude/agents/evidence-judge.agent.md` (completed agent)
  - `/Users/michaelmenard/Development/monorepo/.claude/agents/_reference/schemas/evidence-yaml.md` (use examples for fixture construction)
- **Files to create/modify:** Test fixture EVIDENCE.yaml files (temporary, in story implementation dir)
- **ACs covered:** AC-1 through AC-8 (functional verification of all)
- **Depends on:** ST-5
- **Verification:**
  - Strong evidence fixture → `overall_verdict: PASS`, ACCEPT verdict for AC
  - Weak evidence fixture → `overall_verdict: CHALLENGE`, CHALLENGE verdict
  - Empty evidence fixture → `overall_verdict: FAIL`, REJECT verdict
  - Missing EVIDENCE.yaml → `EVIDENCE-JUDGE COMPLETE WITH WARNINGS` signal

