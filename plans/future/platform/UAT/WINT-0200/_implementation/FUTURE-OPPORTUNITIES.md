# Future Opportunities - WINT-0200

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No validation for flow step ordering/dependencies | Low | Medium | Add optional `dependencies: string[]` to step schema to enable validation of step prerequisites. Not needed for MVP cohesion checks. |
| 2 | No semantic validation of state/capability combinations | Low | Medium | Example: A flow with `permission_denied` state should probably not have `create` capability. Add cross-validation rules in separate schema if patterns emerge. |
| 3 | Missing transition validation between flow steps | Low | High | Story defines states but not valid transitions (e.g., `loading` → `empty` vs `loading` → `server_error`). State machine validation could be added in future. |
| 4 | No duration/time-to-complete tracking per step | Low | Medium | Future telemetry story could add estimated duration fields to enable UX optimization (e.g., show spinner vs skeleton vs empty state). |
| 5 | Example flow is artificial (not from real feature) | Low | Low | AC-6 creates synthetic example. Future story could extract real user flow from existing feature for more representative validation. |
| 6 | No versioning strategy for enum expansion | Medium | Low | AC-3/AC-4 document extensibility but don't define migration path for adding new states/capabilities. Future story could create migration tooling. |
| 7 | Missing validation for required vs optional capabilities | Low | Medium | All 7 capabilities are documented but not all are mandatory. Future story could define minimum capability requirements per feature type (e.g., CRUD features require create+view+delete). |
| 8 | No integration with existing artifact validation | Low | Medium | Story creates standalone schema but doesn't integrate with orchestrator's existing artifact validation pipeline. Future story could add user flows to artifact validation suite. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | UX polish: Interactive flow diagram generation | Medium | High | Generate visual flowcharts from user-flows.json for PM review. Could use Mermaid/PlantUML. Deferred to WINT-4xxx or future UX story. |
| 2 | UX polish: AI-generated flow suggestions | Low | High | Use LLM to suggest missing states/capabilities based on feature description. Interesting but not validated need. |
| 3 | Performance: Schema compilation caching | Low | Low | Zod schema compilation could be memoized if validation becomes performance bottleneck. Premature optimization for MVP. |
| 4 | Observability: Flow complexity metrics | Medium | Medium | Track metrics like "avg steps per flow", "most common state", "capability coverage %" for trends. Good Phase 3 telemetry story. |
| 5 | Observability: Flow validation error reporting | Medium | Low | AC-5 validates flows but doesn't specify error message quality. Future improvement: structured error types with suggested fixes. |
| 6 | Integration: Auto-sync flows with frontend code | High | Very High | Parse React components to infer states/capabilities and compare against user-flows.json. Ambitious but high-value for cohesion detection. |
| 7 | Integration: Generate test fixtures from flows | Medium | Medium | Auto-generate E2E test scenarios from user-flows.json (one test per flow, covering all states). Good QA automation story. |
| 8 | Integration: OpenAPI spec generation from flows | Low | Medium | Generate API endpoint specs based on capabilities (e.g., `create` → POST endpoint). Overlaps with existing API layer work. |
| 9 | Feature: Flow composition/reuse | Low | High | Allow flows to reference shared sub-flows (e.g., "auth flow" used by multiple features). Adds complexity, defer until proven need. |
| 10 | Feature: Conditional flow paths | Low | High | Support if/else branches in flows based on user permissions or feature flags. Complex, defer until use case emerges. |

## Categories

### Edge Cases
- **Gap #2** (semantic validation) - Rare invalid combinations like permission_denied + create capability
- **Gap #3** (transition validation) - Invalid state transitions (e.g., empty → server_error without intermediate loading)
- **Gap #7** (required capabilities) - Features missing mandatory CRUD operations

### UX Polish
- **Enhancement #1** (diagram generation) - Visual flow representation for PM/QA review
- **Enhancement #2** (AI suggestions) - LLM-powered flow completeness checker
- **Enhancement #5** (error reporting) - Better validation error messages with fix suggestions

### Performance
- **Enhancement #3** (schema caching) - Memoize compiled Zod schemas for faster validation

### Observability
- **Gap #4** (duration tracking) - Time-to-complete metrics per flow step
- **Enhancement #4** (complexity metrics) - Track flow complexity trends over time
- **Enhancement #5** (error reporting) - Structured validation error types

### Integrations
- **Gap #8** (artifact validation) - Add user flows to orchestrator's validation pipeline
- **Enhancement #6** (code sync) - Auto-infer flows from frontend code
- **Enhancement #7** (test generation) - Generate E2E tests from flows
- **Enhancement #8** (OpenAPI gen) - Generate API specs from capabilities

### Future-Proofing
- **Gap #1** (step dependencies) - Enable prerequisite validation for complex flows
- **Gap #6** (versioning) - Migration tooling for schema evolution
- **Enhancement #9** (flow composition) - Reusable sub-flows
- **Enhancement #10** (conditional paths) - Dynamic flow branching

---

## Prioritization Guidance

**High-Value, Low-Effort (Do Next):**
- Gap #6 (versioning strategy) - Medium impact, low effort, unblocks safe enum expansion
- Enhancement #5 (error reporting) - Medium impact, low effort, improves developer experience

**High-Value, Medium-Effort (Phase 3-4):**
- Enhancement #4 (complexity metrics) - Fits Phase 3 telemetry story (WINT-3xxx)
- Enhancement #7 (test generation) - Fits Phase 4 cohesion story (WINT-4xxx)
- Gap #8 (artifact validation) - Integrates with existing orchestrator patterns

**High-Value, High-Effort (Phase 5+):**
- Enhancement #6 (code sync) - Requires robust code parsing, high ROI for cohesion detection
- Enhancement #1 (diagram generation) - Visual tooling for non-technical stakeholders

**Low-Value / Defer Indefinitely:**
- Enhancement #2 (AI suggestions) - Interesting but unproven need, likely adds noise
- Enhancement #9 (flow composition) - Complex feature with no clear use case yet
- Enhancement #10 (conditional paths) - Scope creep risk, defer until proven necessary

**Validation Needed:**
- Gap #2 (semantic validation) - Wait for real examples of invalid combinations
- Gap #3 (transition validation) - Assess if PO cohesion checks need state machine enforcement
- Gap #7 (required capabilities) - Validate against existing features before adding rules

---

## Notes

- **WINT-0180 Impact**: Storage decision may unlock or block some integration opportunities (e.g., Gap #8 depends on artifact validation pipeline location)

- **Downstream Consumer Needs**: WINT-0210 (Role Pack Templates) and WINT-4070 (cohesion-prosecutor) should validate if they need any of the gaps/enhancements listed above for their MVP functionality

- **Schema Evolution**: Gaps #1, #6, and Enhancements #9-10 all relate to schema evolution. If multiple downstream stories request these, consider bundling into a single "User Flows Schema v2" story

- **Telemetry Alignment**: Enhancement #4 (metrics) and Gap #4 (duration tracking) should align with Phase 3 telemetry schema design (WINT-0040)

- **Test Generation**: Enhancement #7 overlaps with existing test patterns in orchestrator. Coordinate with test infrastructure owners before implementing
