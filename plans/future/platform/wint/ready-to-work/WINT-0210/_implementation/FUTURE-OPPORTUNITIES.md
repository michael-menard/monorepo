# Future Opportunities - WINT-0210

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No versioning strategy for role pack evolution | Low | Low | Document how to version role packs when patterns evolve (e.g., YAML version field increment, dev.v2.md naming). AC-5 README should address this. |
| 2 | No role pack composition mechanism | Low | Medium | Future: Allow combining multiple role packs (e.g., Dev + Security for secure-code generation stories). |
| 3 | No multi-language support | Low | High | Future i18n story: Create role packs in multiple languages for international teams. Explicitly deferred in Non-Goals. |
| 4 | No dynamic role pack customization per story type | Medium | High | Future ML story: Generate role packs tailored to story type (CRUD vs infrastructure vs refactor). Explicitly deferred in Non-Goals. |
| 5 | Token count validation only at creation time | Low | Low | Add pre-commit hook or CI check to validate token counts remain within 150-300 budget after any future edits to role pack files. |
| 6 | No A/B testing framework for role pack effectiveness | Medium | Medium | Future: Test different role pack phrasings to optimize for fewer rework cycles per story. Requires WINT-3020 telemetry. |
| 7 | No role pack dependency graph | Low | Medium | Document which role packs reference or depend on other artifacts (e.g., po.md depends on user-flows.schema.json from WINT-0200). |
| 8 | Example outputs lack automated schema validation | Medium | Medium | Create a schema validation script to run example JSON files (patch-plan.json, cohesion-findings.json, etc.) against their schemas as part of AC-7 testing. |
| 9 | No role pack usage telemetry | Medium | Medium | Future: Track which role packs are loaded most frequently by which agents. Requires WINT-3020 telemetry infrastructure. |
| 10 | tiktoken library dependency not formally declared | Low | Low | AC-6 requires tiktoken with cl100k_base encoding — this dependency should be documented in a dev-dependencies or scripts README so validators can install and run it consistently. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Pattern skeletons could include inline guidance comments | Medium | Low | Enhance 10-25 line examples with short comments (e.g., `// types first — no circular deps`) to explain ordering rationale without exceeding token budget. |
| 2 | Role packs could include a "common mistakes" section | Medium | Low | Add anti-patterns beyond the single required negative example (e.g., "Don't patch UI and DB in same diff"). |
| 3 | Hard caps could be runtime-configurable | Low | Medium | Allow max-findings and max-blocking caps to be overridden per project via a config file, rather than hardcoded in the role pack files. |
| 4 | Role packs could document "escalation triggers" | Medium | Medium | Document when to escalate from Haiku to Sonnet (e.g., PO role finding 5 blocking gaps — escalate to human review). Aligns with WINT-0250 (Escalation Triggers). |
| 5 | README could include real code snippets for consumption | High | Medium | Show actual TypeScript/bash examples of how agents load role packs (sidecar call vs direct file injection vs context-pack), not just prose description. |
| 6 | Dev role pack could explain Patch Queue ordering rationale | Low | Low | A one-line comment per ordering step (types→API→UI→tests→cleanup) explaining why that order reduces downstream breakage improves agent understanding. |
| 7 | PO role pack could reference full CRUD capability matrix | Medium | Low | Link to graph.feature_capabilities from WINT-0060 for a complete feature completeness checklist beyond the hard caps. |
| 8 | DA role pack could include an MVP definition framework | High | Medium | Codify the decision rule: "If removing this AC breaks the core user journey, it is MVP. Otherwise, defer." Removes subjectivity from scope challenges. |
| 9 | QA role pack could define an evidence type taxonomy | Medium | Low | Enumerate what counts as valid evidence: test output, .http response, database query result, git diff, screenshot. Reduces vibes-based approvals more precisely. |
| 10 | All role packs could include "signals to escalate" | Medium | Low | Define when a role should stop and request human input rather than proceeding autonomously (e.g., PO finds conflicting requirements). |

## Categories

- **Edge Cases**: Token count edge cases (exactly 150 or 300 tokens), schema validation edge cases (malformed JSON in examples), empty role pack directory at startup
- **UX Polish**: Better markdown formatting for role packs (code-fenced JSON examples, ordered lists vs tables), collapsible sections in README
- **Performance**: Role Pack Sidecar caching strategy (WINT-2010), pre-warming role packs at agent spawn, file read latency for direct injection
- **Observability**: Telemetry for role pack load frequency by agent (WINT-3020), A/B testing role pack variants for rework reduction
- **Integrations**: KB MCP integration for role pack retrieval (alternative to filesystem), context-pack sidecar injection (WINT-2020), future composition mechanism

## Deferred to Specific Future Stories

- **Dynamic role pack customization per story type**: Future ML story (explicitly in Non-Goals)
- **Role pack versioning and migration strategy**: After usage data accumulates (explicitly in Non-Goals)
- **Multi-language role packs**: Future i18n story (explicitly in Non-Goals)
- **Role pack composition (combining patterns)**: Future enhancement story
- **Escalation triggers in role packs**: WINT-0250 (Define Escalation Triggers) is the right vehicle

## Dependencies on Other Stories

- **WINT-2010 (Role Pack Sidecar)**: Will expose HTTP endpoint for role pack retrieval — integration patterns in README will be consumed by this story
- **WINT-4070 (cohesion-prosecutor)**: Loads po.md role pack for feature completeness checks — feedback loop for PO pattern refinement
- **WINT-4080 (scope-defender)**: Loads da.md role pack for scope challenges — feedback loop for DA pattern refinement
- **WINT-4090 (evidence-judge)**: Loads qa.md role pack for AC→Evidence validation — feedback loop for QA pattern refinement
- **WINT-3020 (Telemetry)**: Required before role pack usage frequency can be tracked
- **WINT-0250 (Escalation Triggers)**: Complements role pack escalation trigger enhancement opportunity

## Lessons for KB

**Lesson 1: Dependency Status Must Be Verified Against Authoritative Source**
- Story body claimed WINT-0200 was "UAT complete" but stories.index.md showed "pending"
- Always cross-reference story dependency status against stories.index.md, not story narrative text
- Tag: `[dependency-management]`, `[elaboration]`, `[data-integrity]`

**Lesson 2: "Accepted Risk" Requires Explicit Fallback Definition**
- WINT-0190 pending risk was marked "Accepted" with mitigation "create inline example"
- Accepted risks that affect schema correctness should explicitly define inline fallback in the AC itself, not just in Risks section
- Tag: `[risk-management]`, `[elaboration]`, `[acceptance-criteria]`

**Lesson 3: Schema-First for JSON Output Formats**
- Stories defining JSON output formats (cohesion-findings.json, scope-challenges.json, ac-trace.json) should create or reference schemas first
- If no upstream story defines the schema, scope the inline schema definition into this story's ACs explicitly
- Tag: `[schema-design]`, `[validation]`, `[elaboration]`

**Lesson 4: Token Counting Must Specify Tool Setup**
- Mechanical token counting (tiktoken) requires a specific library and encoding — installation steps must be part of the test plan, not assumed
- Tag: `[token-budget]`, `[measurement]`, `[test-plan]`
