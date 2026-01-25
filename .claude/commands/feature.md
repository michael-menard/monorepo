---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
---

/feature <action> [args]

Manage the future features/ideas list. Use this to capture ideas while working on other tasks.

-------------------------------------------------------------------------------
ARGUMENT HANDLING
-------------------------------------------------------------------------------

This command requires ONE action argument and optional additional arguments:

Actions:
- `add <title>` — Add a new feature idea
- `list` — Show all features (default if no action provided)
- `show <ID>` — Show details of a specific feature
- `update <ID> <field> <value>` — Update a feature's field
- `delete <ID>` — Remove a feature
- `promote <ID>` — Mark a feature as ready for story generation

-------------------------------------------------------------------------------
DATA FILE
-------------------------------------------------------------------------------

All features are stored in: `plans/future/FEATURES.md`

If the file doesn't exist, create it with the template structure shown below.

-------------------------------------------------------------------------------
FILE FORMAT
-------------------------------------------------------------------------------

The FEATURES.md file uses this structure:

```markdown
# Future Features & Ideas

Quick capture for feature ideas. Use `/feature add <title>` to add new items.

---

## Pending Ideas

### FEAT-001: <title>
- **Status:** pending | promoted | archived
- **Priority:** low | medium | high
- **Added:** <ISO date>
- **Category:** <optional category>

<description - can be multiple lines>

---

### FEAT-002: <another title>
...

---

## Promoted (Ready for Stories)

<!-- Features moved here when promoted -->

---

## Archived

<!-- Completed or abandoned features -->
```

-------------------------------------------------------------------------------
BEHAVIOR: ADD
-------------------------------------------------------------------------------

`/feature add <title>`

1. Read FEATURES.md (or create if missing)
2. Find the highest FEAT-XXX ID and increment
3. Prompt for optional details:
   - Priority (default: medium)
   - Category (default: none)
   - Description (default: empty, can add later)
4. Insert new feature in "## Pending Ideas" section
5. Report: "Added FEAT-XXX: <title>"

Example:
```
/feature add Keyboard shortcuts for common actions
```

Output:
```
Added FEAT-007: Keyboard shortcuts for common actions
Priority: medium
Status: pending
```

-------------------------------------------------------------------------------
BEHAVIOR: LIST
-------------------------------------------------------------------------------

`/feature list` or `/feature`

1. Read FEATURES.md
2. Display summary table of all features:

```
=== Future Features ===

| ID       | Status   | Priority | Title                                    |
|----------|----------|----------|------------------------------------------|
| FEAT-001 | pending  | high     | Dark mode support                        |
| FEAT-002 | pending  | medium   | Keyboard shortcuts for common actions    |
| FEAT-003 | promoted | high     | Export to PDF                            |
| FEAT-004 | archived | low      | Legacy browser support                   |

Total: 4 features (2 pending, 1 promoted, 1 archived)
```

-------------------------------------------------------------------------------
BEHAVIOR: SHOW
-------------------------------------------------------------------------------

`/feature show <ID>`

1. Find the feature by ID (case-insensitive: feat-001 = FEAT-001)
2. Display full details including description

```
=== FEAT-001: Dark mode support ===

Status: pending
Priority: high
Added: 2024-01-15
Category: UI/UX

Description:
Add a dark mode toggle that persists user preference.
Should respect system preference by default.
Consider using CSS custom properties for easy theming.
```

-------------------------------------------------------------------------------
BEHAVIOR: UPDATE
-------------------------------------------------------------------------------

`/feature update <ID> <field> <value>`

Fields that can be updated:
- `title` — The feature title
- `status` — pending | promoted | archived
- `priority` — low | medium | high
- `category` — Any string
- `description` — Replace the description (use quotes for multi-word)

Examples:
```
/feature update FEAT-001 priority high
/feature update FEAT-001 status promoted
/feature update FEAT-001 description "Add dark mode with system preference detection"
```

When status changes to "promoted", move the feature to the "## Promoted" section.
When status changes to "archived", move to the "## Archived" section.

-------------------------------------------------------------------------------
BEHAVIOR: DELETE
-------------------------------------------------------------------------------

`/feature delete <ID>`

1. Find the feature by ID
2. Ask for confirmation: "Delete FEAT-XXX: <title>? (y/n)"
3. If confirmed, remove the feature entry entirely
4. Report: "Deleted FEAT-XXX"

-------------------------------------------------------------------------------
BEHAVIOR: PROMOTE
-------------------------------------------------------------------------------

`/feature promote <ID>`

Shorthand for `/feature update <ID> status promoted`

1. Find the feature
2. Change status to "promoted"
3. Move to "## Promoted (Ready for Stories)" section
4. Report: "Promoted FEAT-XXX - ready for story generation"

-------------------------------------------------------------------------------
QUICK ADD (MINIMAL INPUT)
-------------------------------------------------------------------------------

For fast capture while working, the add command should work with just a title:

```
/feature add Remember scroll position on navigation
```

This creates a minimal entry:
- Status: pending
- Priority: medium
- Added: current date
- Category: (empty)
- Description: (empty)

The user can update details later with `/feature update`.

-------------------------------------------------------------------------------
OUTPUT FORMAT
-------------------------------------------------------------------------------

- Use markdown tables for list view
- Use clear headers for show view
- Keep confirmations brief
- Always show the feature ID in responses

-------------------------------------------------------------------------------
NOTES
-------------------------------------------------------------------------------

- Feature IDs are sequential and never reused
- Deleting a feature doesn't renumber others
- The file is human-readable and can be edited directly
- Categories are freeform - common ones: UI/UX, API, Performance, DX, Testing
- Promoted features are candidates for `/pm-generate-story`
