---
story_id: KNOW-026
title: Automated Lesson Extraction from Completed Stories
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-023  # KB must be authoritative source for lessons before extraction agent writes to it
---

# KNOW-026: Automated Lesson Extraction from Completed Stories

## Context

The `knowledge_entries` table stores lessons learned so agents can avoid past pitfalls during elaboration. However, the feedback loop that populates it is currently manual — a human must notice something worth recording and write it explicitly.

Every completed story already contains rich structured evidence of what went wrong and what worked:
- `verifications` — QA verdicts with `blocking_issues` lists
- `story_artifacts` (type `review`) — code review failures with `ranked_patches` and severity
- `story_state_transitions` — how many times the story regressed and why (after KNOW-024)
- `feedback` — free-text story feedback with semantic embeddings
- `proofs` — what was shipped and how it was verified

None of this flows automatically into `knowledge_entries`. As a result, the KB's lessons are sparse, reflecting only what humans explicitly chose to write rather than the full signal from completed work.

## Goal

Add an automated (or semi-automated) lesson extraction step to the story completion workflow. When a story reaches `done`, a lesson-extraction agent synthesizes the story's outcome artifacts into one or more `knowledge_entries` with `entry_type: 'lesson'`.

## Non-goals

- Replacing manual lesson writing — the auto-extracted lessons supplement, not replace, explicit human entries
- Extracting lessons for stories that did not complete (abandoned, cancelled)
- Real-time extraction during story execution (only at completion)

## Scope

### New Agent: `lesson-extractor`

A focused agent that:
1. Reads `verifications`, `review` artifacts, `story_state_transitions`, and `feedback` for a given story
2. Identifies patterns worth preserving:
   - Any QA `blocking_issues` that caused a regression
   - Any code review `ranked_patches` with severity `high` or `critical`
   - Any churn (multiple regressions) indicating a systemic issue
   - Any `feedback` entries marked as `helpful`
3. For each pattern, writes a `knowledge_entries` row with:
   - `entry_type: 'lesson'`
   - `content`: synthesized natural-language lesson ("When implementing X, always Y because Z failed in story KNOW-NNN")
   - `tags`: derived from story epic, feature, and failure type
   - `source_story_id`: foreign key back to the story
   - `confidence`: `low` | `medium` | `high` based on recurrence (single-story lesson = low, seen in 3+ stories = high)

### Trigger Point

Called by `qa-verify-completion-leader` after a PASS verdict as a final step, before token logging.

### MCP Tool

Extend `kb_add_lesson` (or create `kb_extract_lessons`) to accept a `source_story_id` and write entries in batch.

### Packages Affected

- `.claude/agents/lesson-extractor.agent.md` — new agent
- `.claude/agents/qa-verify-completion-leader.agent.md` — call lesson-extractor on PASS
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — extend `kb_add_lesson` with `source_story_id` and `confidence`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement batch write

### Confidence Escalation (follow-up)

A separate background job (future story) can scan `knowledge_entries` for lessons that appear across multiple stories and upgrade their `confidence` from `low` to `medium` or `high`. This story only handles single-story extraction.

## Acceptance Criteria

- [ ] A `lesson-extractor` agent exists and can be called with a `story_id`
- [ ] The agent reads `verifications`, review artifacts, and `story_state_transitions` for that story
- [ ] For each identified pattern, it writes at least one `knowledge_entries` row with `entry_type: 'lesson'`, `source_story_id`, and `confidence`
- [ ] `qa-verify-completion-leader` calls the lesson-extractor after a PASS verdict
- [ ] A lesson extracted from a story includes a reference back to that story (queryable via `source_story_id`)
- [ ] Stories with zero regressions and no high-severity review findings produce zero lessons (no noise)
- [ ] Existing elaboration agents that query `knowledge_entries` for lessons automatically benefit without code changes
