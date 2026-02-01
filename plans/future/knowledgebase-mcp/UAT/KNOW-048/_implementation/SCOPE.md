# Scope - KNOW-048

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | New chunking module and CLI script in apps/api/knowledge-base |
| frontend | false | No UI changes - CLI utility only |
| infra | false | No infrastructure changes required |

## Scope Summary

This story implements a markdown-aware document chunking utility for the knowledge base. It adds a new chunking module that splits long documents on semantic boundaries (## headers) while respecting token limits, plus a CLI tool (`kb:chunk`) for processing markdown files. The chunked output integrates with the existing `kb_bulk_import` workflow.
