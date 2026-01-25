---
schema: 2
command: pm-bootstrap-workflow
feature_dir: "plans/future/knowledgebase-mcp"
prefix: "KNOW"
project_name: "knowledgebase-mcp"
created: "2026-01-24T23:50:00Z"

raw_plan_file: "plans/future/knowledgebase-mcp/PLAN.md"
raw_plan_summary: |
  # Knowledgebase MCP Server - Implementation Plan

  **Version:** 1.3.0
  **Created:** 2026-01-24
  **Status:** Ready for Implementation

  A pgvector-based MCP server that provides institutional memory to AI agents during the development workflow. Agents can query for relevant patterns, lessons learned, and architectural decisions based on their role and current context.

  ## Goals
  1. **Learning from mistakes** - Agents avoid repeating errors documented in LESSONS-LEARNED
  2. **Institutional memory** - Store decisions, patterns, and rationale across stories
  3. **Context efficiency** - Reduce token usage by pre-loading relevant knowledge instead of re-reading large files

  ## Key Design Decisions
  - Location: `apps/api/knowledge-base/`
  - Tool Set: All 10 tools (comprehensive feature set)
  - Embedding Model: `text-embedding-3-small` (OpenAI)
  - Seed Strategy: Hybrid (Parsers → YAML → Seed Script)
  - Error Handling: Retry 3x with exponential backoff + keyword fallback
  - Workflow Integration: Direct KB writes from learnings agent with graceful degradation

  ## Implementation Phases
  8 phases total, from infrastructure (Phase 1) through workflow integration (Phase 8)

validation:
  directory_exists: true
  plan_file_exists: true
  plan_file_size_bytes: 44312
  plan_file_line_count: 1353
  prefix_derivation:
    input: "knowledgebase-mcp"
    steps:
      - "Remove hyphens: knowledgebaseemcp"
      - "Take first 4 chars: know"
      - "Uppercase: KNOW"
    result: "KNOW"
---
