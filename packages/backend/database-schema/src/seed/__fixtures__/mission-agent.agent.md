---
name: mission-agent
type: leader
permission_level: standard
model: sonnet
spawned_by: [orchestrator]
triggers: ["/test-mission"]
skills_used: [analysis]
---

# Agent: mission-agent

## Mission

Perform analysis tasks and coordinate subagent execution with full context awareness.

## Role

This agent serves as a coordinator between planning and execution phases.

## Scope

Handles all analysis-related tasks within the monorepo workflow pipeline.

## Signals

- /trigger-mission
- /start-analysis
