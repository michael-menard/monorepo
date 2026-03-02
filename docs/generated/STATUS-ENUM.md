# Story Status Enum

> **Auto-generated from TypeScript schema**
> Source: `packages/backend/orchestrator/src/state/story-state-machine.ts`

## Status Values

| Status | Description |
|--------|-------------|
| `// Backlog statuses
  pending` | — |
| `// Not yet generated` | — |
| `just an entry in index
  generated` | — |
| `// Story file created by PM

  // Elaboration statuses
  in-elaboration` | — |
| `// QA audit in progress
  needs-refinement` | — |
| `// Failed elab` | — |
| `needs PM fixes
  needs-split` | — |
| `// Too large` | — |
| `requires splitting

  // Ready for development
  ready-to-work` | — |
| `// Passed elab` | — |
| `awaiting development

  // Development statuses
  in-progress` | — |
| `// Dev actively implementing
  ready-for-code-review` | — |
| `// Implementation done` | — |
| `awaiting review
  code-review-failed` | — |
| `// Code review failed` | — |
| `needs fixes

  // QA statuses
  ready-for-qa` | — |
| `// Dev complete` | — |
| `awaiting QA verification
  in-qa` | — |
| `// QA verification in progress
  needs-work` | — |
| `// QA failed` | — |
| `needs dev fixes
  uat` | — |
| `// QA passed` | — |
| `awaiting gate

  // Terminal statuses
  completed` | — |
| `// QA gate passed` | — |
| `merged
  blocked` | — |
| `// Waiting on external dependency
  cancelled` | — |
| `// No longer needed
  superseded` | — |
| `// Replaced by split stories` | — |



## Usage

```typescript
import { StoryStatusSchema, canTransition } from '@repo/orchestrator'

// Validate a status
const status = StoryStatusSchema.parse('pending')

// Check if transition is valid
const canMove = canTransition('pending', 'generated') // true
const invalid = canTransition('pending', 'completed') // false
```
