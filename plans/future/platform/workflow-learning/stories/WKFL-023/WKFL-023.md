---
story_id: WKFL-023
title: Developer Onboarding Guide for the AI Workflow System
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: documentation
priority: medium
depends_on:
  - LNGG-006  # blocked until LangGraph migration completes
---

# WKFL-023: Developer Onboarding Guide for the AI Workflow System

## Context

The AI agent workflow system is well-documented — 4,300+ lines across `docs/workflow/`, 21 shared protocol files in `.claude/agents/_shared/`, 11 phase-specific reference docs in `.claude/docs/`, 40+ command definitions, and 61 catalogued agents. The content quality is high.

The problem is discoverability and entry point. A new developer faces:

- **4 conflicting starting points**: `docs/workflow/README.md`, `docs/FEATURE-DEVELOPMENT-WORKFLOW.md`, `docs/AGENTS.md`, `CLAUDE.md` — none of which clearly says "start here if you're new"
- **No reading order** for the 21 shared protocol files in `_shared/`
- **No conceptual model primer** — what is a leader vs. worker? What is the KB? Why do agents escalate decisions?
- **No command decision tree** — 40+ commands with no guide to which one to run when
- **No worked example** — no "here is a story from creation to completion" walkthrough
- **No troubleshooting guide** — nothing for "what does AUTONOMY ESCALATION REQUIRED mean?"

The result: new developers learn by trial and error, repeatedly asking questions that have answers buried in the existing documentation. Experienced developers spend time explaining the system verbally rather than pointing to a guide.

## Goal

Create a single entry-point developer guide at `.claude/DEVELOPER-ONBOARDING.md` that acts as a navigational hub — teaching the conceptual model, providing a reading path through existing docs, and explaining common scenarios. This is a guide, not a replacement for existing documentation.

## Non-goals

- Rewriting or duplicating existing documentation (link and summarize, don't copy)
- Covering the monorepo codebase itself (CLAUDE.md handles that)
- Automating onboarding (just documentation)
- Covering all 61 agents or 40+ commands exhaustively

## Scope

### `.claude/DEVELOPER-ONBOARDING.md` Structure

**Section 1: What Is This? (1 page)**

Plain-language explanation of the workflow system:
- The 8-phase story lifecycle (PM → Elaboration → Implementation → Review → QA → Complete)
- What "agents" are and why they exist
- The human's role: approve, escalate, review — not write code from scratch
- The Knowledge Base: a shared memory that accumulates lessons across stories

```markdown
## The One-Paragraph Version

This project uses a structured AI agent workflow to develop features. Instead of asking
Claude to "write this feature", you describe a story, let a chain of specialized agents
elaborate it, plan it, implement it, review it, and verify it — each checking the previous
stage's work. You review and approve at checkpoints. The Knowledge Base remembers what
worked and what didn't across all stories.
```

**Section 2: Quick Start — Your First Story (1 page)**

Step-by-step from zero to a story in the backlog:

```markdown
## Your First 10 Minutes

1. Find the next unblocked story:
   /next-actions

2. Create a new worktree for it:
   /wt-new FEATURE_DIR STORY_ID

3. Elaborate the story (let agents audit and fill in gaps):
   /elab-story FEATURE_DIR STORY_ID

4. Review the elaboration output in _implementation/ELAB.yaml
   Check: does the story make sense? Are the gaps addressed?

5. If ready, implement:
   /dev-implement-story FEATURE_DIR STORY_ID

That's the core loop. Everything else is either setup (Sections 3-4) or edge cases (Section 7).
```

**Section 3: Conceptual Model — Agents 101 (2 pages)**

- Orchestrator → Leader → Worker hierarchy with one-sentence description of each
- How agent spawning works (Task tool, `run_in_background`, signals)
- The three autonomy tiers and when decisions escalate to the human
- Permission levels: what each level can and cannot do

Cross-references to existing docs:
- "Deep dive: `docs/workflow/agent-system.md`"
- "Autonomy tiers: `.claude/agents/_shared/autonomy-tiers.md`"

**Section 4: Reading Path for Shared Protocols (1 page)**

An ordered reading guide for `.claude/agents/_shared/`:

| Order | File | Why Read It |
|-------|------|-------------|
| 1 | `FRONTMATTER.md` | Understand agent file structure before reading any agent |
| 2 | `autonomy-tiers.md` | The single most important concept — when agents escalate |
| 3 | `decision-handling.md` | How decisions are classified and routed |
| 4 | `kb-integration.md` | When agents query vs. write to the KB |
| 5 | `completion-signals.md` | How to read agent output signals |
| 6 | `expert-personas.md` | Only needed when debugging specialist agent behavior |
| 7+ | Others | Read on demand when relevant to your current task |

**Section 5: Command Taxonomy (1 page)**

Commands grouped by intent with one-line descriptions and when to use each:

```markdown
## When you want to...

CREATE WORK:
  /pm-story generate FEATURE_DIR     — generate a new story from a seed
  /pm-story refine FEATURE_DIR STORY_ID — refine an existing draft

DO WORK:
  /elab-story FEATURE_DIR STORY_ID   — elaborate (audit + fill gaps)
  /dev-implement-story FEAT STORY    — implement the story
  /qa-verify-story FEAT STORY        — run QA verification

REVIEW WORK:
  /dev-code-review FEAT STORY        — specialist code review
  /architect-review                  — architecture-level review

MANAGE WORKTREES:
  /wt-new, /wt-switch, /wt-status, /wt-list, /wt-finish

INSPECT THE SYSTEM:
  /next-actions                      — what should I work on next?
  /story-status FEAT STORY           — what state is this story in?
  /calibration-report                — how accurate are agent confidence levels?
```

**Section 6: Phase Quick Reference (2 pages)**

One paragraph + key artifacts for each of the 8 phases. Output: "What files/KB entries exist after this phase?" input: "What does the agent need to begin?"

Cross-references to `.claude/docs/{phase}-reference.md` for each phase.

**Section 7: Troubleshooting Common Scenarios (2 pages)**

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| `AUTONOMY ESCALATION REQUIRED` | Agent hit a decision it's not authorized to make | Read the escalation message, make the decision, re-run with `--approve` |
| `COMMITMENT-GATE BLOCKED` | MVP-blocking gaps remain open | Address gaps in ELAB.yaml and re-run elaboration |
| Story stuck in `in_progress` | Workflow interrupted mid-phase | Check CHECKPOINT.yaml, re-run with `--from=N` |
| KB write fails | KB unavailable | Check DEFERRED-KB-WRITES.yaml for queued writes |
| Agent times out | Phase too complex | Check if story needs to be split |

**Section 8: Knowledge Base — When and How (1 page)**

- The three entry types developers interact with: lessons, decisions, constraints
- When to query manually: before starting a new epic, when debugging a pattern
- How to query: `kb_search({ query: "...", entry_type: "lesson" })`
- The deferred-writes pattern: what to do when the KB is unavailable

Cross-reference: `.claude/agents/_shared/kb-integration.md`

**Section 9: Reference Index (1 page)**

Master table of all documentation:

| What You Need | Where It Is |
|---|---|
| Full command list | `docs/COMMANDS.md` |
| All agents | `docs/AGENTS.md` |
| Phase deep-dives | `docs/workflow/phases.md` |
| Phase-specific how-tos | `.claude/docs/{phase}-reference.md` |
| Shared protocols | `.claude/agents/_shared/` |
| Agent spawn patterns | `.claude/agents/_reference/patterns/` |
| Config + autonomy | `.claude/config/` |
| Workflow changelog | `docs/workflow/changelog.md` |

### Register the Guide

Add a reference to `.claude/DEVELOPER-ONBOARDING.md` in `CLAUDE.md` under an "AI Workflow System" section so it's discoverable from the primary developer reference.

### Packages Affected

- `.claude/DEVELOPER-ONBOARDING.md` — new file
- `CLAUDE.md` — add one-line reference to the onboarding guide under a new "AI Workflow System" heading

## Acceptance Criteria

- [ ] `.claude/DEVELOPER-ONBOARDING.md` exists with all 9 sections above
- [ ] Section 1 explains the system in plain language without assuming prior knowledge
- [ ] Section 2 provides a runnable 5-step quick start that produces a real artifact
- [ ] Section 4 provides a numbered reading order for `.claude/agents/_shared/` files
- [ ] Section 5 groups all commands by developer intent, not alphabetically
- [ ] Section 7 covers at least 5 common error scenarios with actionable resolution steps
- [ ] Every section links to the existing deeper documentation rather than duplicating it
- [ ] `CLAUDE.md` contains a reference to `.claude/DEVELOPER-ONBOARDING.md` under an "AI Workflow System" heading
- [ ] A developer with no prior workflow knowledge can complete the Section 2 quick start in under 15 minutes using only the onboarding guide and existing referenced docs
- [ ] Total guide length is ≤ 500 lines (navigational hub, not exhaustive reference)
