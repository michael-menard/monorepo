# Story Schema Migration Guide

## Overview

This guide documents the migration from StoryArtifactSchema v1 to v2 (backward compatible).

**Version**: 2.0
**Date**: 2026-02-13
**Breaking Changes**: None (fully backward compatible)
**Migration Required**: No (optional)

## What Changed

### Problem

The original `StoryArtifactSchema` (v1) defined a strict schema for new story files, but 50+ existing story files in production used a different format with different field names and structure. This caused the Story File Adapter (LNGG-0010) to fail validation when reading existing files.

### Solution

Created a backward-compatible schema (v2) that supports BOTH formats:
- **New format**: `schema: 1`, `state`, `feature`, `acs`, etc.
- **Legacy format**: `status`, `epic`, `acceptance_criteria`, etc.

## Field Mapping

### State/Status Fields

| Legacy Field | New Field | Migration |
|--------------|-----------|-----------|
| `status: "uat"` | `state: "uat"` | Auto-normalized by `getStoryState()` |
| `phase: "foundation"` | *(removed)* | Preserved via `.passthrough()` |

### Feature/Epic Fields

| Legacy Field | New Field | Migration |
|--------------|-----------|-----------|
| `epic: "workflow-learning"` | `feature: "workflow-learning"` | Auto-normalized by `getStoryFeature()` |
| `prefix: "WKFL"` | *(removed)* | Preserved via `.passthrough()` |

### Acceptance Criteria Fields

| Legacy Field | New Field | Migration |
|--------------|-----------|-----------|
| `acceptance_criteria: [...]` | `acs: [...]` | Auto-normalized by `getStoryAcceptanceCriteria()` |
| `acceptance_criteria[].verification` | `acs[].verification` | Now optional in both |

### Dependencies Fields

| Legacy Field | New Field | Migration |
|--------------|-----------|-----------|
| `dependencies: [...]` | `depends_on: [...]` | Auto-normalized by `getStoryDependencies()` |
| `blocks: [...]` | *(removed)* | Preserved via `.passthrough()` |

### Scope Fields

| Legacy Field | New Field | Migration |
|--------------|-----------|-----------|
| `scope.in: [...]` | `scope.packages: [...]` | Manual mapping required |
| `scope.out: [...]` | *(removed)* | Preserved via `.passthrough()` |

### Additional Legacy Fields

These fields exist in legacy files and are preserved:

- `owner` - Who's working on the story
- `estimated_tokens` - Budget estimate
- `tags` - Categorization tags
- `summary` - Brief description
- `technical_notes` - Implementation details
- `reuse_plan` - Reuse strategy
- `local_testing` - Testing notes
- `token_budget` - Budget tracking
- `experiment_variant` - A/B testing variant

All are preserved via `.passthrough()` and remain accessible.

## Usage Examples

### Reading Legacy Files

```typescript
import { StoryArtifactSchema, getStoryState, getStoryFeature } from './story-v2-compatible'

// Read a legacy file
const legacyStory = StoryArtifactSchema.parse(yamlData)

// Access fields using compatibility helpers
const state = getStoryState(legacyStory) // Returns status or state
const feature = getStoryFeature(legacyStory) // Returns epic or feature
const acs = getStoryAcceptanceCriteria(legacyStory) // Returns acceptance_criteria or acs
```

### Writing New Files

```typescript
import { createStoryArtifact } from './story-v2-compatible'

// Create a new story in v1 format
const newStory = createStoryArtifact(
  'LNGG-0020',
  'platform',
  'Index Management Adapter',
  'Create adapter for managing story index files',
  {
    type: 'infrastructure',
    state: 'draft',
    points: 3,
    priority: 'high',
    scope: {
      packages: ['packages/backend/orchestrator'],
      surfaces: ['packages', 'testing'],
    },
    acs: [
      {
        id: 'AC-1',
        description: 'Adapter reads index files',
        testable: true,
        automated: true,
      },
    ],
  }
)
```

### Normalizing Legacy Stories

```typescript
import { normalizeStoryArtifact, isLegacyFormat } from './story-v2-compatible'

// Check if a story uses legacy format
if (isLegacyFormat(story)) {
  console.log('Story uses legacy format')

  // Normalize to v1 format (maps fields, adds schema: 1)
  const normalized = normalizeStoryArtifact(story)

  // Normalized story now has:
  // - state (instead of status)
  // - feature (instead of epic)
  // - acs (instead of acceptance_criteria)
  // - depends_on (instead of dependencies)
  // - schema: 1
}
```

## Migration Strategy

### Phase 1: Read Compatibility (✅ Complete)

- Schema accepts both old and new formats
- No validation errors on existing files
- Helper functions normalize field access

### Phase 2: Write Compatibility (Current)

- Adapter reads both formats
- Adapter can write either format (configurable)
- Gradual migration to new format over time

### Phase 3: Deprecation Warnings (Planned)

- Log warnings when legacy fields are used
- Encourage migration to new format
- Track migration progress

### Phase 4: Migration (Future)

- Create migration script to convert all files
- Run migration on all 50+ legacy files
- Deprecate legacy field support

## Backward Compatibility Guarantees

✅ **All existing files continue to work** - No changes required
✅ **No data loss** - All fields preserved via `.passthrough()`
✅ **Helper functions** - Normalize field access across formats
✅ **Logging** - Deprecation warnings for legacy fields
✅ **Future-proof** - Unknown fields preserved for forward compatibility

## Testing

See `story-v2-compatible.test.ts` for comprehensive tests covering:
- Legacy file parsing
- New file creation
- Field normalization
- Helper functions
- Round-trip fidelity

## Questions?

Contact: Platform Team
Slack: #platform-engineering
Story: LNGG-0010 (Story File Adapter)
