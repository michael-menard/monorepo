# DEV-FEASIBILITY: wrkf-1010

**Story:** wrkf-1010: GraphState Schema
**Date:** 2026-01-23
**Reviewer:** pm-dev-feasibility-review

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Schema design affects all downstream nodes | High | Define extensible base schema with clear versioning; add schema migration utilities |
| LangGraph Annotation API has specific patterns | Medium | Follow LangGraph v1.x Annotation patterns; validate against LangGraph docs |
| State field definitions may be incomplete | Medium | Start with core fields; add `z.passthrough()` or extension points |
| Circular dependency between state and node types | Low | Keep state schemas separate from node implementations; use dependency injection |
| Zod runtime overhead on hot paths | Low | Use `.parse()` at boundaries only; internal mutations skip validation |

---

## Change Surface

| Path | Action | Notes |
|------|--------|-------|
| `packages/orchestrator/src/state/index.ts` | CREATE | Main exports for state module |
| `packages/orchestrator/src/state/graph-state.ts` | CREATE | Core GraphState Zod schema |
| `packages/orchestrator/src/state/fields/epic-prefix.ts` | CREATE | `epicPrefix` field schema |
| `packages/orchestrator/src/state/fields/story-id.ts` | CREATE | `storyId` field schema |
| `packages/orchestrator/src/state/fields/artifact-paths.ts` | CREATE | `artifactPaths` map schema |
| `packages/orchestrator/src/state/fields/routing-flags.ts` | CREATE | `routingFlags` schema for control flow |
| `packages/orchestrator/src/state/fields/evidence-refs.ts` | CREATE | `evidenceRefs` references schema |
| `packages/orchestrator/src/state/fields/gate-decisions.ts` | CREATE | `gateDecisions` QA gate schema |
| `packages/orchestrator/src/state/validators.ts` | CREATE | State validation utility functions |
| `packages/orchestrator/src/state/__tests__/graph-state.test.ts` | CREATE | Unit tests for schema validation |
| `packages/orchestrator/src/state/__tests__/validators.test.ts` | CREATE | Unit tests for validation utilities |
| `packages/orchestrator/src/index.ts` | MODIFY | Re-export state module |

---

## Missing AC / Gaps

| # | Gap | Recommendation |
|---|-----|----------------|
| 1 | **State mutability pattern undefined** — LangGraph nodes mutate state. Should schemas validate full state or partial updates? | Add AC: "Schema supports both full state validation and partial update validation" |
| 2 | **LangGraph Annotation integration unclear** — LangGraph uses `Annotation.Root()` pattern for state definition. Is Zod-only sufficient or do we need Annotation wrappers? | Add AC: "State schema integrates with LangGraph Annotation API" or clarify that Zod is used independently |
| 3 | **State versioning not specified** — Schema changes across stories could break compatibility | Add AC: "Schema includes version field for future migration support" |
| 4 | **Default values unclear** — What are sensible defaults for `routingFlags`, `gateDecisions`, etc.? | Add AC: "All optional fields have documented default values" |
| 5 | **Error state not listed** — What happens when a node fails? Should there be an `errors` or `nodeErrors` field? | Consider adding `errors: z.array(NodeErrorSchema).default([])` to state fields |
| 6 | **Artifact paths schema undefined** — What keys are expected in the map? (story doc, elaboration, proof, etc.) | Add AC: "artifactPaths uses typed enum keys for known artifact types" |
| 7 | **Routing flags enum undefined** — What routing decisions exist? (proceed, retry, escalate, skip, etc.) | Add AC: "routingFlags uses typed enum values for known routing decisions" |

---

## Mitigations for PM

- [ ] **Clarify LangGraph Annotation integration** — Determine if `Annotation.Root()` wrapper is required or if pure Zod schemas suffice. If Annotation is needed, add AC for LangGraph-compatible state definition.

- [ ] **Define artifact path keys** — Enumerate expected artifact types in AC:
  - `storyDoc`, `elaboration`, `implementationPlan`, `proof`, `codeReview`, `qaVerify`, `qaGate`

- [ ] **Define routing flag enum values** — Enumerate expected routing decisions in AC:
  - `proceed`, `retry`, `escalate`, `blocked`, `skip`, `complete`

- [ ] **Add error handling to state** — Consider adding an `errors` array field to capture node-level failures without crashing the graph.

- [ ] **Specify partial update validation** — Clarify whether nodes receive/return full state or partial updates. This affects whether `.partial()` schemas are needed.

- [ ] **Add schema version field** — Include `schemaVersion: z.literal('1.0.0')` to enable future migrations.

- [ ] **Reference LangGraph TypeScript examples** — Link to LangGraph TS docs for state patterns:
  - https://langchain-ai.github.io/langgraphjs/
  - Ensure AC aligns with actual LangGraph API

---

## Verdict

**NEEDS_CLARIFICATION**

**Reason:** The story index provides a good high-level description of state fields, but several implementation-critical details are missing:

1. **LangGraph Annotation vs pure Zod** — The meta plan says "nodes are pure functions: `(state) => state`" but doesn't clarify if LangGraph's `Annotation.Root()` is required. LangGraph TypeScript has specific patterns for state channels that may not align with pure Zod schemas.

2. **State field enums** — `routingFlags` and `gateDecisions` need defined enum values before implementation can proceed. Without these, the schema design is speculative.

3. **Partial vs full state** — Node implementations depend on knowing whether they receive/return complete state objects or partial updates.

**Recommendation:** Generate the full story document with:
- Explicit AC for LangGraph Annotation integration (or clarify that it's not needed)
- Defined enum values for `routingFlags` and `gateDecisions`
- Clarification on state mutation patterns (full vs partial)

Once these are addressed, the story is **CAN_IMPLEMENT** — the technical work is straightforward Zod schema definition following existing `packages/backend/*-core/src/__types__/index.ts` patterns.

---

## Reference Patterns

### Existing Zod Schema Pattern (gallery-core)

```typescript
// packages/backend/gallery-core/src/__types__/index.ts
import { z } from 'zod'

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  // ...
})

export type Album = z.infer<typeof AlbumSchema>
```

### Proposed GraphState Pattern

```typescript
// packages/orchestrator/src/state/graph-state.ts
import { z } from 'zod'

export const GraphStateSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  epicPrefix: z.string().min(1),
  storyId: z.string().regex(/^[a-z]+-\d+$/i),
  artifactPaths: z.record(ArtifactTypeSchema, z.string()),
  routingFlags: z.record(RoutingFlagSchema, z.boolean()),
  evidenceRefs: z.array(EvidenceRefSchema),
  gateDecisions: z.record(GateTypeSchema, GateDecisionSchema),
  errors: z.array(NodeErrorSchema).default([]),
})

export type GraphState = z.infer<typeof GraphStateSchema>
```

---

*Generated by pm-dev-feasibility-review agent | 2026-01-23*
