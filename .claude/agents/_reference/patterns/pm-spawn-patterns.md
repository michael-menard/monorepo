# PM Worker Spawn Patterns

Standard patterns for spawning PM workers.

---

## Test Plan Writer

```
Task tool:
  subagent_type: "general-purpose"
  description: "Draft {STORY_ID} test plan"
  run_in_background: true
  prompt: |
    Read: .claude/agents/pm-draft-test-plan.agent.md

    STORY CONTEXT:
    Index path: {INDEX_PATH}
    Story ID: {STORY_ID}
    Index entry: <paste from index>
    Output file: {OUTPUT_DIR}/_pm/TEST-PLAN.md

    SEED CONTEXT (from Phase 0):
    Seed file: {OUTPUT_DIR}/_pm/STORY-SEED.md
    Test Plan recommendations: <paste recommendations.test_plan>

    Reality context:
    - Related endpoints: <from seed.retrieved_context>
    - Established patterns: <from seed.reality_context>
    - Constraints: <from seed.reality_context.changed_constraints>
```

---

## UI/UX Advisor

Only spawn if UI touched.

```
Task tool:
  subagent_type: "general-purpose"
  description: "Draft {STORY_ID} UI/UX notes"
  run_in_background: true
  prompt: |
    Read: .claude/agents/pm-uiux-recommendations.agent.md

    STORY CONTEXT:
    Index path: {INDEX_PATH}
    Story ID: {STORY_ID}
    Output file: {OUTPUT_DIR}/_pm/UIUX-NOTES.md

    SEED CONTEXT:
    - Related components: <from seed.retrieved_context.related_components>
    - Reuse candidates: <from seed.retrieved_context.reuse_candidates>
    - Established patterns: <from seed.reality_context.established_patterns>
```

---

## Dev Feasibility

```
Task tool:
  subagent_type: "general-purpose"
  description: "Review {STORY_ID} feasibility"
  run_in_background: true
  prompt: |
    Read: .claude/agents/pm-dev-feasibility-review.agent.md

    STORY CONTEXT:
    Index path: {INDEX_PATH}
    Story ID: {STORY_ID}
    Output file: {OUTPUT_DIR}/_pm/DEV-FEASIBILITY.md

    SEED CONTEXT:
    - Reuse candidates: <from seed.retrieved_context.reuse_candidates>
    - Relevant packages: <from seed.retrieved_context.relevant_packages>
    - Active work: <from seed.reality_context.active_stories>
    - Constraints: <from seed.reality_context.changed_constraints>
```

---

## Story File Structure

Required sections in `{STORY_ID}.md`:

1. YAML frontmatter (`status: backlog`)
2. Title
3. Context (grounded in reality baseline)
4. Goal
5. Non-goals (include protected features)
6. Scope (endpoints, packages)
7. Acceptance Criteria
8. Reuse Plan
9. Architecture Notes
10. Infrastructure Notes (if applicable)
11. HTTP Contract Plan (if API)
12. Seed Requirements (if applicable)
13. Test Plan
14. UI/UX Notes (if applicable)
15. Reality Baseline
