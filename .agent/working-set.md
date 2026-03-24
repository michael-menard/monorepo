# Working Set: WINT-5010

**Story**: Create HiTL Interview Sidecar
**Phase**: Implementation
**Iteration**: 0
**Status**: SETUP COMPLETE
**Timestamp**: 2026-03-21T20:30:00Z

---

## Current Context

Setup phase complete. Ready to begin implementation of the hitl-interview sidecar service.

### Story Overview

Create a sidecar service at `packages/backend/sidecars/hitl-interview/` that:
- Captures structured HiTL interview data during workflow decision points
- Transforms data into labeled training examples
- Exposes `hitlInterview` MCP tool on port 3093
- Reads from `workflow.hitl_decisions` (read-only)
- Writes to `workflow.training_data` via trainingDataIngest

### Scope Summary

- **Backend**: Sidecar HTTP service + MCP tool
- **Packages**: New `@repo/sidecar-hitl-interview` package
- **Database**: Read `hitl_decisions`, write `training_data` (no migrations)
- **Contracts**: Zod schemas for interview answers and feature vectors
- **Security Risk**: Training data sensitivity (labeled examples)

---

## Constraints

1. **Zod First** — All types must use Zod schemas with `z.infer<>`, never TypeScript interfaces
2. **No Barrel Files** — Import directly from source files, no index.ts re-exports
3. **Logger Only** — Use `@repo/logger`, never `console.log()`
4. **Test Coverage** — Minimum 45% coverage required
5. **Sidecar Pattern** — Follow role-pack sidecar structure (packages/backend/sidecars/role-pack/)
6. **HTTP Utils** — Use `@repo/sidecar-http-utils` for request/response handling
7. **Database Schema** — No migrations; use existing workflow.hitl_decisions and workflow.training_data
8. **Port 3093** — Reserved for this sidecar; coordinate with other sidecars
9. **MCP Exports** — hitlInterview tool must be exported from src/index.ts
10. **Training Data Format** — Coordinate with WINT-0140 (trainingDataIngest) on data format

## Decision Records

**None yet** — Implementation phase will capture decisions.

---

## Next Steps

1. **Scaffold sidecar directory structure**
   - Create `packages/backend/sidecars/hitl-interview/`
   - Copy pattern from `role-pack/`
   - Set up package.json, tsconfig, vitest config

2. **Define Zod schemas**
   - `InterviewAnswersSchema` (rationale, confidence, alternativesConsidered, riskAssessment)
   - `FeatureVectorSchema` (storyId, phase, decisionType, storyComplexityScore, agentPhase, decisionContext)
   - `InterviewQuestionSchema` (per decisionType)

3. **Implement HTTP server**
   - Extend sidecar-http-utils pattern
   - Bind to port 3093
   - Route interviews POST requests

4. **Implement MCP tool: hitlInterview**
   - Query workflow.hitl_decisions for context
   - Generate structured interview questions per decision_type
   - Validate responses against InterviewAnswersSchema

5. **Integrate with trainingDataIngest**
   - Call trainingDataIngest from ML pipeline
   - Transform interview responses into feature vectors
   - Write to workflow.training_data table

6. **Write tests**
   - Unit: Schema validation, question generation, feature vector generation
   - Integration: trainingDataIngest calls, database writes
   - Target: 45%+ coverage

7. **Code review & QA**
   - Lint, type check, test pass
   - Review sidecar integration pattern
   - Verify training data quality

---

## Artifacts

- **Checkpoint**: `/Users/michaelmenard/Development/monorepo/tree/story/WINT-5010/_implementation/CHECKPOINT.yaml`
- **Scope**: `/Users/michaelmenard/Development/monorepo/tree/story/WINT-5010/_implementation/SCOPE.yaml`

---

## References

- **Sidecar Pattern**: `packages/backend/sidecars/role-pack/src/`
- **HTTP Utils**: `packages/backend/sidecars/http-utils/`
- **Training Data**: `apps/api/knowledge-base/src/ml-pipeline/training-data-ingest.ts`
- **Database Schema**: `apps/api/knowledge-base/src/db/schema/workflow.ts` (hitlDecisions, trainingData)
- **Related Story**: WINT-0140 (trainingDataIngest, completed)
- **Related Story**: WINT-2010 (Role-pack sidecar, completed)

---

## Blockers

None identified. Dependencies (WINT-0140, WINT-2010) are completed.

---

## Autonomy

- **Mode**: implement
- **Autonomy Level**: aggressive
- **Batch Mode**: false
