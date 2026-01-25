---
title: User Flows Documentation
description: Index and conventions for documenting user flows
created: 2026-01-25
last-verified: 2026-01-25
author: michael
---

# User Flows Documentation

This directory contains Mermaid-based documentation of all user flows in the application. These docs serve three purposes:

1. **Developer onboarding** - Understand how features work end-to-end
2. **E2E test coverage** - Map tests to flows, identify gaps
3. **UX gap identification** - Track known issues and improvements

## Directory Structure

```
docs/flows/
  README.md                    # This file
  _templates/
    flow-template.md           # Standard template for new flows
  auth/
    login.md
    signup.md
    forgot-password.md
    password-reset.md
  moc-instructions/
    upload-moc.md
    edit-moc.md
    delete-moc.md
    view-moc.md
  galleries/
    wishlist-gallery.md
    sets-gallery.md
    inspiration-gallery.md
```

## Flow Index

### Auth
| Flow | Status | E2E Coverage |
|------|--------|--------------|
| [Login](./auth/login.md) | active | login.feature |
| [Signup](./auth/signup.md) | active | signup.feature, account-creation-e2e.feature |
| [Email Verification](./auth/email-verification.md) | active | email-verification.feature, account-creation-e2e.feature |
| [Forgot Password](./auth/forgot-password.md) | active | - |
| [Reset Password](./auth/reset-password.md) | active | - |
| [Logout](./auth/logout.md) | active | - |

### MOC Instructions
| Flow | Status | E2E Coverage |
|------|--------|--------------|
| [Upload MOC](./moc-instructions/upload-moc.md) | - | - |
| [Edit MOC](./moc-instructions/edit-moc.md) | - | - |
| [Delete MOC](./moc-instructions/delete-moc.md) | - | - |
| [View MOC](./moc-instructions/view-moc.md) | - | - |

### Galleries
| Flow | Status | E2E Coverage |
|------|--------|--------------|
| [Wishlist Gallery](./galleries/wishlist-gallery.md) | - | - |
| [Sets Gallery](./galleries/sets-gallery.md) | - | - |
| [Inspiration Gallery](./galleries/inspiration-gallery.md) | - | - |

## Conventions

### Frontmatter (Required)

Every flow document must include YAML frontmatter:

```yaml
---
title: Flow Name
description: One-line summary
status: active  # draft | active | deprecated
feature: feature-area
entry-points:
  - /route
related-stories:
  - STORY-ID
e2e-tests:
  - path/to/test.spec.ts
created: YYYY-MM-DD
last-verified: YYYY-MM-DD
author: name
tags:
  - tag1
  - tag2
---
```

### Mermaid Diagram Shapes

Use consistent shapes across all diagrams:

| Shape | Syntax | Usage |
|-------|--------|-------|
| Rectangle | `[text]` | Pages/screens |
| Rounded | `(text)` | User actions |
| Diamond | `{text}` | Decisions/conditionals |
| Stadium | `([text])` | API calls |
| Cylinder | `[(text)]` | Data/state changes |

Example:
```mermaid
flowchart TD
    A[/login page] --> B(Enter credentials)
    B --> C([POST /auth/login])
    C --> D{Valid?}
    D -->|Yes| E[(Store session)]
    E --> F[/dashboard]
    D -->|No| G[Show error]
```

### Status Definitions

- **draft** - Flow documented but not verified against current implementation
- **active** - Flow verified and matches current implementation
- **deprecated** - Flow no longer exists or has been replaced

### Changelog Format

Every flow document must end with a changelog table:

```markdown
## Changelog

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | name | Description of change |
```

## Creating a New Flow Document

1. Copy `_templates/flow-template.md` to the appropriate directory
2. Fill in all frontmatter fields
3. Create the Mermaid diagram
4. Document steps, error states, and UX gaps
5. Link any existing E2E tests
6. Add initial changelog entry
7. Update the index in this README

## Keeping Flows Current

- Update `last-verified` when confirming a flow matches implementation
- Add changelog entries for any modifications
- Set status to `deprecated` rather than deleting outdated flows
- Include flow doc updates in PR checklist for UI changes

## Knowledge Base Integration

These flow documents are designed for easy ingestion into knowledge base systems, RAG pipelines, or AI assistant contexts. The structured frontmatter and consistent format enable automated processing.

### Why This Format Works for Knowledge Bases

1. **YAML frontmatter** - Machine-readable metadata for filtering, categorization, and relationship mapping
2. **Consistent structure** - Predictable sections enable targeted extraction
3. **Explicit relationships** - `related-stories`, `e2e-tests`, and `entry-points` create a queryable graph
4. **Status tracking** - Filter out `deprecated` flows, prioritize `active` ones

### Ingestion Approaches

#### MCP Server Integration

Create an MCP server that exposes flow documentation as tools:

```typescript
// Example MCP tool schema
{
  name: "get_user_flow",
  description: "Retrieve user flow documentation by feature or route",
  parameters: {
    feature: { type: "string", enum: ["auth", "moc-instructions", "galleries"] },
    route: { type: "string", description: "Entry point route like /login" }
  }
}
```

The server can:
- Parse frontmatter to build a searchable index
- Return flows by feature area, route, or related story
- Include Mermaid diagrams as visual context for AI assistants

#### RAG / Vector Database

For semantic search over flows:

1. **Chunking strategy** - Split by section (Overview, Steps, Error States) while preserving frontmatter as metadata
2. **Embedding** - Include the Mermaid diagram text for flow structure understanding
3. **Metadata filters** - Use frontmatter fields (`status`, `feature`, `tags`) as filter dimensions

```python
# Example chunk structure for vector DB
{
  "content": "## Steps\n1. User navigates to /login...",
  "metadata": {
    "flow_title": "Login Flow",
    "feature": "auth",
    "status": "active",
    "entry_points": ["/login"],
    "section": "steps"
  }
}
```

#### AI Assistant Context Loading

For Claude Code or similar assistants, flows can be loaded as context:

```bash
# Load all active flows for a feature
cat docs/flows/auth/*.md | grep -v "status: deprecated"

# Extract just the Mermaid diagrams
grep -A 20 "```mermaid" docs/flows/**/*.md
```

Consider adding flows to `.claude/docs/` or a custom MCP server for automatic context injection when working on related features.

### Extraction Scripts

#### List All Flows with Metadata

```bash
# Extract frontmatter from all flow docs
for f in docs/flows/**/*.md; do
  echo "=== $f ==="
  sed -n '/^---$/,/^---$/p' "$f"
done
```

#### Generate Flow Index as JSON

```bash
# Requires yq (https://github.com/mikefarah/yq)
find docs/flows -name "*.md" ! -path "*/_templates/*" -exec yq --front-matter=extract '.' {} \; | jq -s '.'
```

#### Find Flows Missing E2E Coverage

```bash
# Flows with empty e2e-tests array
grep -l "e2e-tests: \[\]" docs/flows/**/*.md
```

### Sync Considerations

When integrating with external knowledge bases:

- **Trigger on commit** - Re-index flows when `docs/flows/**/*.md` changes
- **Include git metadata** - Last commit date can supplement `last-verified`
- **Validate freshness** - Flag flows where `last-verified` is older than related code changes
- **Bidirectional links** - If your KB supports it, link back from indexed flows to source files

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-25 | michael | Added all auth flow documentation |
| 2026-01-25 | michael | Initial structure and conventions |
