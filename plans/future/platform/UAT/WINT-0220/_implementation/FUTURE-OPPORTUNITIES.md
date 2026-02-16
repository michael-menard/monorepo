# Future Opportunities - WINT-0220

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No telemetry data for cost validation | Medium | High | Current cost analysis relies on estimates from MODEL_STRATEGY.md. After INFR-0040 (Workflow Events Table) complete, revise strategy with actual usage data. Document revision date in strategy frontmatter. |
| 2 | Ollama model availability varies by environment | Medium | Medium | Strategy assumes minimum Ollama models available (deepseek-coder-v2:16b, qwen2.5-coder:7b, etc.). Add environment validation script that checks local Ollama for required models and suggests alternatives. |
| 3 | No A/B testing framework for tier assignments | Low | High | Strategy provides static tier assignments. Future: implement A/B testing where 10% of tasks use alternate tier to measure quality/cost trade-offs. Defer to MODL-0030/0040 (Quality Evaluator/Leaderboards). |
| 4 | Task type taxonomy minimum (6 types) may be insufficient | Medium | Medium | Story defines "minimum: Setup, Analysis, Generation, Validation, Decision, Completion" but existing agents show 20+ distinct task patterns (code review, synthesis, attack analysis, etc.). During AC-2 execution, expand taxonomy to cover edge cases. |
| 5 | No conflict resolution for competing tier assignments | Low | Low | If multiple criteria apply (e.g., analysis task with >10 files), strategy should define precedence rules. Add "Tier Selection Priority" section to strategy doc. |
| 6 | Strategy version-controlled but no approval workflow | Low | Medium | Strategy changes could affect costs significantly. Add approval gate requirement (product owner sign-off) before strategy version updates. Defer to governance epic. |
| 7 | No rollback mechanism for failed strategy updates | Low | Medium | If new strategy degrades quality, no automated rollback. Add "Strategy Rollback Procedure" section with quality metrics thresholds that trigger revert. Defer to MODL-0030. |
| 8 | Escalation triggers defined but not quantified | Medium | Medium | AC-5 defines triggers conceptually (confidence <70%, gate failure, etc.) but doesn't specify how to measure confidence or gate scores. WINT-0250 should quantify these with concrete metrics. |
| 9 | No multi-language model support | Low | High | Strategy focuses on English-language tasks. Future: add language detection and route non-English to specialized models (e.g., Qwen for Chinese). Defer to international epic. |
| 10 | Agent migration plan lacks risk assessment | Medium | Low | AC-4 creates migration plan for misaligned agents but doesn't assess blast radius (which agents are high-volume/critical). Add criticality scoring to migration plan. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Real-time strategy hot-reload | High | High | Current strategy requires process restart to apply changes. Future: implement file watcher that reloads strategy YAML on change, clears model assignment cache, logs reload event. Enables rapid experimentation. |
| 2 | Strategy A/B testing dashboard | Medium | High | Build dashboard showing tier assignment distributions, cost per tier, quality metrics per tier. Helps validate strategy effectiveness. Requires INFR-0040 + TELE-0010 integration. |
| 3 | Model performance leaderboard integration | High | Medium | Once MODL-0040 (Leaderboards) exists, auto-update strategy based on empirical model rankings. Example: if Ollama qwen2.5-coder:14b outperforms 7b on validation tasks, auto-promote to Tier 2. |
| 4 | Context-aware tier escalation | High | High | Current strategy uses static rules. Future: analyze task context (file count, complexity metrics, urgency flags) to dynamically adjust tier. Defer to WINT-0230 (Unified Model Interface). |
| 5 | Cost budget enforcement | High | Medium | Strategy defines cost estimates but doesn't enforce budgets. Add per-workflow budget limits with automatic tier downgrade when approaching threshold. Requires telemetry integration. |
| 6 | Multi-model ensembles for critical decisions | Medium | High | For Tier 0 critical decisions, run same task on 2-3 models and synthesize responses. Increases confidence but 3x cost. Defer to research epic. |
| 7 | Model fine-tuning recommendations | Low | Very High | After collecting 1000+ task examples per type, identify candidates for task-specific fine-tuning (e.g., fine-tune Llama for gap hygiene). Massive effort, defer to ML epic. |
| 8 | Automated tier assignment validation | Medium | Medium | Add CI check that validates new agent assignments against strategy rules. Prevents manual assignment drift. Requires strategy rule parser. |
| 9 | Strategy versioning with changelog | Medium | Low | Track strategy versions with semantic versioning (1.0.0, 1.1.0, etc.). Auto-generate changelog from Git history. Improves governance and rollback capability. |
| 10 | Provider failover chains | High | Medium | Current strategy defines single fallback per tier (e.g., Ollama → Haiku). Future: define multi-level chains (Ollama → OpenRouter → Anthropic) for maximum availability. Defer to WINT-0240. |
| 11 | Task complexity scoring | High | High | Build ML model that scores task complexity from description text. Auto-routes complex tasks to higher tiers. Requires training data from 500+ tasks. Defer to LERN epic. |
| 12 | Interactive strategy playground | Medium | High | Build UI where users can simulate task assignments, see predicted costs/quality, adjust tier rules interactively. Requires React dashboard + cost simulator. Defer to WINT-5000+ (UI epic). |
| 13 | Batch task optimization | Medium | Medium | Current strategy optimizes per-task. For batch workflows (100 stories), optimize globally (use cheap models for 90%, reserve Opus budget for 10% critical). Defer to WINT-6000+ (Batch epic). |
| 14 | Multi-provider load balancing | Low | High | If multiple providers support same model (e.g., Claude via OpenRouter + Anthropic), load balance based on rate limits. Defer to MODL-0020. |
| 15 | Strategy export/import for sharing | Low | Low | Enable exporting strategy as shareable artifact (JSON/YAML bundle). Useful for team collaboration or open-sourcing strategy patterns. Add export command to validate-strategy.ts. |

## Categories

### Edge Cases
- Escalation trigger quantification (Gap #8)
- Multi-language support (Gap #9)
- Conflict resolution for competing tiers (Gap #5)
- Strategy rollback on quality degradation (Gap #7)

### UX Polish
- Real-time hot-reload (Enhancement #1)
- Interactive playground (Enhancement #12)
- Strategy export/import (Enhancement #15)
- A/B testing dashboard (Enhancement #2)

### Performance
- Context-aware tier escalation (Enhancement #4)
- Batch task optimization (Enhancement #13)
- Multi-provider load balancing (Enhancement #14)
- Cost budget enforcement (Enhancement #5)

### Observability
- A/B testing framework (Gap #3)
- Performance leaderboard integration (Enhancement #3)
- Automated tier validation (Enhancement #8)
- Strategy versioning with changelog (Enhancement #9)

### Integrations
- Telemetry data for cost validation (Gap #1)
- Ollama model validation script (Gap #2)
- Provider failover chains (Enhancement #10)
- Model fine-tuning pipelines (Enhancement #7)

### Research & ML
- Multi-model ensembles (Enhancement #6)
- Task complexity scoring (Enhancement #11)
- Leaderboard auto-updates (Enhancement #3)
- Fine-tuning recommendations (Enhancement #7)

---

## Implementation Notes

**When to revisit**: After INFR-0040 (telemetry), MODL-0030 (quality evaluation), and WINT-0250 (escalation triggers) complete.

**High-value quick wins**:
1. Strategy versioning with changelog (Enhancement #9) - Low effort, improves governance
2. Ollama model validation script (Gap #2) - Medium effort, reduces environment issues
3. Automated tier validation in CI (Enhancement #8) - Medium effort, prevents drift

**Long-term strategic bets**:
1. Real-time hot-reload (Enhancement #1) - Enables rapid experimentation
2. Context-aware tier escalation (Enhancement #4) - Maximizes quality/cost ratio
3. Task complexity scoring (Enhancement #11) - Unlocks autonomous optimization

---

**Total Opportunities**: 25 (10 gaps + 15 enhancements)
**Categories**: 6 (Edge Cases, UX Polish, Performance, Observability, Integrations, Research & ML)
**Estimated Effort**: 185 story points (based on effort labels: Low=3, Medium=5, High=8, Very High=13)
