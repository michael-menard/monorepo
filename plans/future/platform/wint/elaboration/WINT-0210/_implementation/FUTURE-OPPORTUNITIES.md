# Future Opportunities - WINT-0210

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No versioning strategy for role pack evolution | Low | Low | Document in AC-5 README how to version role packs when patterns evolve (e.g., dev.v2.md or version field in YAML) |
| 2 | No role pack composition mechanism | Low | Medium | Future: Allow combining multiple role packs (e.g., Dev + Security for secure code generation) |
| 3 | No multi-language support for role packs | Low | High | Future i18n story: Create role packs in multiple languages for international teams |
| 4 | No dynamic role pack customization | Medium | High | Future ML story: Generate role packs tailored to story type (CRUD vs infrastructure vs refactor) |
| 5 | Token count validation only at creation time | Low | Low | Add pre-commit hook or CI check to validate token counts remain within budget after edits |
| 6 | No A/B testing framework for role pack effectiveness | Medium | Medium | Future: Test different role pack variations to optimize for fewer rework cycles |
| 7 | No role pack dependency graph | Low | Medium | Document which role packs reference/depend on others (e.g., PO references WINT-0200 schema) |
| 8 | No role pack retrieval performance metrics | Low | Low | Future: Track Role Pack Sidecar (WINT-2010) response times and cache hit rates |
| 9 | Example outputs lack schema validation automation | Medium | Medium | Create schema validation script to run against example JSON files in AC-7 |
| 10 | No role pack usage telemetry | Medium | Medium | Future: Track which role packs are loaded most frequently by which agents (requires WINT-3020 telemetry) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Pattern skeletons could include inline comments for guidance | Medium | Low | Enhance 10-25 line examples with /* IMPORTANT */ comments explaining key patterns |
| 2 | Role packs could include "common mistakes" section | Medium | Low | Add anti-patterns beyond the single negative example (e.g., "Don't do X because Y") |
| 3 | Hard caps could be runtime-configurable | Low | Medium | Allow hard caps (max 5 findings, max 2 blocking) to be adjusted per project via config file |
| 4 | Role packs could include "escalation triggers" | Medium | Medium | Document when to escalate from Haiku to Sonnet for complex cases (e.g., PO finding 5+ blocking gaps) |
| 5 | Example outputs could include "explanation" field | Medium | Low | Add explanatory comments to JSON examples showing why each field matters |
| 6 | README could include "integration patterns" code snippets | High | Medium | Show actual code examples of how agents load/consume role packs (not just prose description) |
| 7 | Dev role pack could include "file ordering rationale" | Low | Low | Explain WHY types→API→UI→tests→cleanup ordering reduces rework (fewer downstream breakages) |
| 8 | PO role pack could include "feature completeness checklist" | Medium | Low | Reference full CRUD capability matrix from graph schema (WINT-0060) |
| 9 | DA role pack could include "MVP definition framework" | High | Medium | Codify what constitutes MVP vs nice-to-have (e.g., "If removing it breaks core journey = MVP") |
| 10 | QA role pack could include "evidence type taxonomy" | Medium | Low | Define what counts as valid evidence: test output, .http response, screenshot, git diff, etc. |

## Categories

- **Edge Cases**: Token count edge cases (exactly 150 or 300 tokens), schema validation edge cases (malformed JSON examples)
- **UX Polish**: Better formatting for role pack markdown (syntax highlighting, collapsible sections for examples)
- **Performance**: Role Pack Sidecar caching strategy (WINT-2010), pre-warming role packs at agent spawn
- **Observability**: Telemetry for role pack usage patterns, A/B testing effectiveness metrics
- **Integrations**: KB MCP integration for role pack retrieval (alternative to filesystem), context-pack sidecar injection patterns

## Deferred to Specific Future Stories

- **Dynamic role pack customization per story type**: Defer to future ML story (mentioned in Non-Goals)
- **Role pack versioning and migration strategy**: Defer until usage data shows evolution patterns (mentioned in Non-Goals)
- **Multi-language role packs**: Defer to future i18n story (mentioned in Non-Goals)
- **Role pack composition**: Defer to future enhancement (combining multiple patterns)

## Dependencies on Other Stories

- **WINT-2010 (Role Pack Sidecar)**: Will implement HTTP endpoint for role pack retrieval - affects integration patterns in README
- **WINT-4070/4080/4090 (Prosecutor/Defender/Judge Agents)**: Will consume role packs - feedback loop for pattern refinement
- **WINT-3020 (Telemetry)**: Could track role pack effectiveness and load frequency
- **WINT-0180 (Examples Framework)**: Defines where examples live and storage strategy - critical dependency
- **WINT-0190 (Patch Queue Pattern)**: Provides Dev role pack schema and ordering constraints
- **WINT-0200 (User Flows Schema)**: Provides PO role pack constraints for cohesion checks

## Lessons for KB

**Lesson 1: Dependency Blocking Pattern**
- When a story depends on non-existent stories, fail elaboration immediately
- Don't elaborate stories with missing dependencies - creates false progress and rework
- Tag: `[dependency-management]`, `[elaboration]`

**Lesson 2: Schema-First Approach for JSON Outputs**
- Stories defining JSON output formats should create schemas first, examples second
- Validates that examples are structurally correct and complete
- Tag: `[schema-design]`, `[validation]`

**Lesson 3: Token Budget Enforcement**
- Token counting must be mechanical (tiktoken library), not estimated
- Include measurement methodology in AC to prevent subjective token counts
- Tag: `[token-budget]`, `[measurement]`

**Lesson 4: Output Format Schema Co-location**
- When role packs reference output formats (cohesion-findings.json), schema definition location must be explicit
- Either define inline, reference dependency story, or defer to implementation
- Tag: `[schema-design]`, `[dependencies]`
