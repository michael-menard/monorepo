# GitHub Project View Filters Configuration

## Project Information
- **Project Name**: LEGO MOC Instructions App
- **Project Number**: 4
- **Project ID**: `PVT_kwHOABuWLs4BJVcx`
- **Project URL**: https://github.com/users/michael-menard/projects/4

## Views Configuration

### 1. Kan Ban View
- **View ID**: `PVTV_lAHOABuWLs4BJVcxzgIz2vM`
- **Layout**: Board
- **Filter**: (none - shows all statuses)
- **Purpose**: Active work board showing Todo → In Progress → QA → Done
- **Columns**: Grouped by Workflow Status field

### 2. Road Map View
- **View ID**: `PVTV_lAHOABuWLs4BJVcxzgIz2yA`
- **Layout**: Roadmap
- **Filter**: `-status:Done` ⚠️ **NEEDS TO BE SET MANUALLY**
- **Purpose**: Timeline view of upcoming and in-progress work
- **Why filter Done**: Completed items clutter the roadmap view

### 3. Backlog View
- **View ID**: `PVTV_lAHOABuWLs4BJVcxzgIz2zU`
- **Layout**: Table
- **Filter**: `-status:Done` ⚠️ **NEEDS TO BE SET MANUALLY**
- **Purpose**: Prioritized list of work not yet started
- **Why filter Done**: Backlog should only show future work

## How to Apply Filters (Manual UI Steps)

### Update Roadmap View Filter

1. Go to: https://github.com/users/michael-menard/projects/4
2. Click on the **"Road Map"** tab
3. Click the **Filter** button (funnel icon) in the top right
4. Type: `-status:Done`
5. Press Enter
6. The filter will automatically save

### Update Backlog View Filter

1. Go to: https://github.com/users/michael-menard/projects/4
2. Click on the **"Backlog"** tab
3. Click the **Filter** button (funnel icon) in the top right
4. Type: `-status:Done`
5. Press Enter
6. The filter will automatically save

## Filter Syntax Reference

### Common Filters

```
# Exclude Done items
-status:Done

# Show only Backlog items
status:Backlog

# Show only active work (not Backlog or Done)
-status:Backlog -status:Done

# Show items with story points
has:story-points

# Show items without story points
-has:story-points

# Combine filters (AND logic)
-status:Done has:story-points

# Show specific statuses
status:Todo,In Progress,QA
```

### Status Values
- `Backlog` - Not yet pulled into active work
- `Todo` - Ready to work on
- `Blocked` - Waiting on something
- `In Progress` - Currently working
- `QA` - In review/testing
- `UAT` - User acceptance testing
- `Done` - Completed

## Why GitHub API Can't Update View Filters

The GitHub GraphQL API does not currently expose a mutation to update view filters programmatically. View configuration (filters, sorting, grouping) must be done through the GitHub UI.

**Attempted mutations that don't exist:**
- ❌ `updateProjectV2View` - Does not exist
- ❌ `updateProjectV2ViewFilter` - Does not exist

**What the API CAN do:**
- ✅ Query view information (ID, name, layout, current filter)
- ✅ Create/delete views
- ✅ Update project settings
- ✅ Update item field values

## Verification

After applying filters manually, verify with:

```bash
gh api graphql -f query='
query {
  node(id: "PVT_kwHOABuWLs4BJVcx") {
    ... on ProjectV2 {
      views(first: 20) {
        nodes {
          id
          name
          filter
          layout
        }
      }
    }
  }
}'
```

Expected output:
```json
{
  "data": {
    "node": {
      "views": {
        "nodes": [
          {
            "id": "PVTV_lAHOABuWLs4BJVcxzgIz2vM",
            "name": "Kan Ban",
            "filter": "",
            "layout": "BOARD_LAYOUT"
          },
          {
            "id": "PVTV_lAHOABuWLs4BJVcxzgIz2yA",
            "name": "Road Map",
            "filter": "-status:Done",
            "layout": "ROADMAP_LAYOUT"
          },
          {
            "id": "PVTV_lAHOABuWLs4BJVcxzgIz2zU",
            "name": "Backlog",
            "filter": "-status:Done",
            "layout": "TABLE_LAYOUT"
          }
        ]
      }
    }
  }
}
```

## Maintenance

- **When to update**: If you add new status values that should be excluded from Roadmap/Backlog
- **How to update**: Manually edit filters in GitHub UI
- **Documentation**: Update this file when filters change

---

**Last Updated**: 2025-12-21  
**Status**: ⚠️ Filters need to be applied manually in GitHub UI

