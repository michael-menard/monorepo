# WKFL Execution Guidelines

## Artifact Naming Conventions

| Artifact Type | Pattern | Example |
|---------------|---------|---------|
| Story files | `WKFL-{NNN}.md` | `WKFL-001.md` |
| Agent files | `{function}.agent.md` | `workflow-retro.agent.md` |
| Config files | `{feature}.yaml` | `experiments.yaml` |
| Output files | `{TYPE}-{date/id}.yaml` | `RETRO-WKFL-001.yaml` |
| Schema files | `{name}.schema.yaml` | `outcome.schema.yaml` |

## Package Locations

| Component | Location |
|-----------|----------|
| Agents | `.claude/agents/` |
| Commands | `.claude/commands/` |
| Schemas | `.claude/schemas/` |
| Config | `.claude/config/` |
| KB Tools | `apps/api/knowledge-base/src/` |
| Orchestrator | `packages/backend/orchestrator/src/` |

## Coding Standards

### Agent Files

```markdown
---
name: workflow-retro
version: 1.0.0
description: Analyzes story outcomes and proposes workflow improvements
model: sonnet
triggers:
  - story_completed
  - manual: /workflow-retro
inputs:
  - OUTCOME.yaml
  - VERIFICATION.yaml
outputs:
  - RETRO-{story-id}.yaml
  - WORKFLOW-RECOMMENDATIONS.md (append)
kb_integration:
  reads:
    - tags: ["lesson", "pattern"]
  writes:
    - type: lesson
      tags: ["retro", "pattern"]
---

# Workflow Retrospective Agent

## Purpose
...
```

### KB Entries

All KB writes must include:
- `story_id` tag
- `category` tag (one of: retro, calibration, pattern, feedback, proposal)
- `date:YYYY-MM` tag
- `source:wkfl-{component}` tag

Example:
```javascript
kb_add_lesson({
  title: "Pattern: routes.ts always fails lint on first review",
  story_id: "WKFL-001",
  category: "pattern",
  tags: ["retro", "pattern", "date:2026-02", "source:wkfl-001"]
})
```

### Config Files

Use YAML with clear comments:

```yaml
# .claude/config/experiments.yaml
# Schema version: 1.0
# Last updated: 2026-02-06

experiments:
  - id: exp-fast-track
    # Fast-track stories with <3 ACs, skip elaboration
    description: "Skip elaboration for trivial stories"
    enabled: true
    traffic: 0.2  # 20% of eligible stories
    eligibility:
      ac_count_max: 2
      complexity: simple
    metrics:
      - gate_pass_rate
      - cycle_time
      - rework_rate
    created_at: 2026-02-06
    created_by: WKFL-008
```

## Reuse Gates

### Must Reuse
- KB tools (`kb_search`, `kb_add`, etc.)
- Existing agent patterns from `.claude/agents/_shared/`
- Token logging via `/token-log`
- Status updates via `/story-update`

### May Create New
- New agents for learning functions
- New commands for learning triggers
- New schemas for learning data
- New config files for learning configuration

### Must Not
- Duplicate existing KB functionality
- Create parallel logging systems
- Bypass existing workflow phases
- Modify core workflow without proposal

## Testing Requirements

### Agent Testing
- Each agent must have test fixtures in `__tests__/fixtures/`
- Run with `--dry-run` before live testing
- Verify KB writes with `kb_search` queries

### Integration Testing
- Test full learning loop on completed story
- Verify data flows: outcome → retro → KB → pattern → proposal
- Use harness story (WKFL-000) for integration validation

### Calibration Testing
- Inject known good/bad findings
- Verify calibration scores compute correctly
- Test threshold adjustment recommendations

## Quality Gates

### Per-Story
- [ ] Agent has proper frontmatter
- [ ] KB integration uses standard patterns
- [ ] Schema defined for new data types
- [ ] Tests exist and pass
- [ ] Documentation updated

### Per-Phase
- [ ] Phase 1 complete: All 3 stories pass QA
- [ ] Phase 2 complete: Learning loop demonstrated on 10+ stories
- [ ] Phase 3 complete: First auto-adjustment proposed
- [ ] Phase 4 complete: First experiment completes with results

## Rollback Procedures

### Agent Rollback
```bash
git revert HEAD~1 -- .claude/agents/workflow-retro.agent.md
```

### Config Rollback
```bash
git checkout HEAD~1 -- .claude/config/experiments.yaml
```

### KB Cleanup
```sql
-- Mark entries from failed component as deprecated
UPDATE kb_entries
SET deprecated = true
WHERE tags @> ARRAY['source:wkfl-001']
AND created_at > '2026-02-06';
```

## Observability

### Metrics to Track

| Metric | Source | Dashboard |
|--------|--------|-----------|
| Retro runs | RETRO-*.yaml count | Weekly |
| Feedback entries | KB query | Weekly |
| Calibration drift | CALIBRATION-*.yaml | Weekly |
| Pattern discovery rate | PATTERNS-*.yaml | Monthly |
| Proposal acceptance | Proposal tracking | Monthly |

### Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Retro fails 3x | Warning | Check outcome schema |
| Calibration accuracy < 80% | Critical | Review agent prompts |
| No patterns in 2 weeks | Warning | Check data volume |
| Proposal rejection > 90% | Warning | Review proposal quality |

## Definition of Done

A WKFL story is done when:

1. **Agent/command implemented** and passing tests
2. **KB integration working** (reads and writes verified)
3. **Schema documented** in `.claude/schemas/`
4. **FULL_WORKFLOW.md updated** (or doc-sync running)
5. **Tested on real story** (not just fixtures)
6. **Metrics flowing** (observable in expected location)
7. **QA gate PASS**
