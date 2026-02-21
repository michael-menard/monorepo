# Story Seed: WINT-9010

**Story ID:** WINT-9010
**Title:** Create Shared Business Logic Package
**Phase:** 9 (LangGraph Parity)
**Priority:** P2
**Points:** 5 (estimate)

## Origin

Defined in `wint/stories.index.md` as the Phase 9 foundation story. Manually seeded from index entry on 2026-02-17.

## Problem Statement

Business logic is currently duplicated between Claude Code MCP tools and LangGraph nodes. When the same operation (e.g., story status transitions, directory → status mapping) is needed in both execution paths, it must be implemented twice, creating drift risk and maintenance overhead.

## Proposed Solution

Create `packages/backend/workflow-logic/` — a shared TypeScript package with no runtime-specific dependencies — and extract the minimal set of business logic functions needed to unblock LangGraph parity stories (WINT-9020–9050).

## Key Constraints

- Zero runtime-specific dependencies (pure TypeScript + Zod)
- Zod-first types per CLAUDE.md
- 80%+ test coverage
- Must be importable by both `packages/backend/mcp-tools` and `packages/backend/orchestrator`

## Seeded By

Orchestrator (elab-story autonomous flow), 2026-02-17
