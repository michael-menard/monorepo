---
created: 2026-03-09
updated: 2026-03-09
version: 1.0.0
name: telemetry-decision
description: Log a human-in-the-loop (HiTL) decision with semantic embedding to workflow.hitl_decisions. Called by operators during story review, QA gate, and sign-off phases to capture structured decisions for preference learning and semantic similarity search.
kb_tools:
  - mcp__knowledge-base__workflow_log_decision
---

# /telemetry-decision - Log HiTL Decision with Embedding

## Usage

```
/telemetry-decision
  decisionType: approve|reject|request_changes|escalate
  decisionText: "Human-readable description of the decision and rationale"
  storyId: WINT-3040
  operatorId: ops-michael
  [invocationId: <uuid>]
  [context: { key: "value" }]
```

## Arguments

| Argument       | Type        | Required | Description                                                                                                                                            |
| -------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `decisionType` | enum        | Yes      | One of: `approve`, `reject`, `request_changes`, `escalate`                                                                                             |
| `decisionText` | string      | Yes      | Human-readable rationale for the decision                                                                                                              |
| `storyId`      | string      | Yes      | Story this decision is associated with (e.g., `WINT-3040`). Plain text — no FK validation against the stories table                                    |
| `operatorId`   | string      | Yes      | Identifier for the human making the decision (e.g., `ops-michael`)                                                                                     |
| `invocationId` | UUID string | No       | Agent invocation ID if this decision occurred within an invocation context. Nullable — omit when logging a decision outside an active agent invocation |
| `context`      | JSON object | No       | Free-form context snapshot at time of decision (e.g., `{ stage: "QA gate", testRunId: "tr-001" }`)                                                     |

## Task

1. **Construct embedding input text:** Concatenate `decisionText` and the JSON-stringified `context` (if provided), separated by a newline:

   ```
   embeddingInput = decisionText + "\n" + JSON.stringify(context)
   ```

   If `context` is not provided, use only `decisionText` as the embedding input.

2. **Generate embedding BEFORE calling the MCP tool:** Call OpenAI `text-embedding-3-small` with `dimensions: 1536` on the embedding input text to produce a 1536-dimensional vector:

   ```javascript
   const embedding = await openai.embeddings.create({
     model: 'text-embedding-3-small',
     input: embeddingInput,
     dimensions: 1536,
   })
   ```

3. **If embedding succeeds:** Call `mcp__knowledge-base__workflow_log_decision` with all provided arguments plus the `embedding` array:

   ```javascript
   mcp__knowledge -
     base__workflow_log_decision({
       decisionType,
       decisionText,
       storyId,
       operatorId,
       invocationId, // omit if not provided
       context, // omit if not provided
       embedding, // the 1536-dim float array
     })
   ```

4. **If embedding fails (OpenAI unavailable or returns error):** Do NOT block the decision log. Call `mcp__knowledge-base__workflow_log_decision` WITHOUT the `embedding` field, then report a warning to the operator:

   ```javascript
   mcp__knowledge -
     base__workflow_log_decision({
       decisionType,
       decisionText,
       storyId,
       operatorId,
       invocationId, // omit if not provided
       context, // omit if not provided
       // embedding intentionally omitted
     })
   ```

   Report to operator: `"Warning: embedding generation failed (OpenAI unavailable). Decision was logged without embedding."`

5. **Report result** to operator (see Output section).

## Output

**Success (with embedding):**

```
Decision logged for <storyId>:
  Type: <decisionType>
  Operator: <operatorId>
  Row ID: <uuid>
  Embedding: generated (1536-dim)
```

**Success (degraded — without embedding):**

```
Warning: embedding generation failed (OpenAI unavailable). Decision was logged without embedding.

Decision logged for <storyId>:
  Type: <decisionType>
  Operator: <operatorId>
  Row ID: <uuid>
  Embedding: none (degraded path)
```

## Error Handling

**OpenAI embedding failure (graceful degradation):**

- Do NOT block the decision log on embedding failure.
- Call `workflow_log_decision` without the `embedding` field.
- Report a warning to the operator before the success summary.
- The decision text is the primary data; embedding adds semantic search capability but is not required for the row to be inserted.

**`workflow_log_decision` MCP tool returns an error:**

- Report the full error text to the operator. Do NOT silently fail.
- Example: `"Error: workflow_log_decision failed: <full error message from MCP tool>"`
- Do not attempt to retry automatically — surface the error and let the operator decide next steps.

**DB not running (lego_dev on port 5432):**

- The `hitl_decisions` table lives in the `wint` schema of the `lego_dev` database on **port 5432** — NOT the KB database (port 5433).
- If the MCP tool returns a connection error, remind the operator: `"Ensure lego_dev is running on port 5432. The hitl_decisions table is NOT in the KB database (port 5433)."`

## Examples

### Example 1 — Happy path (approve with full context and embedding)

Operator invokes the skill during QA gate sign-off:

```
/telemetry-decision
  decisionType: approve
  decisionText: "All ACs verified. Implementation matches spec. No regressions detected in test suite."
  storyId: WINT-3040
  operatorId: ops-michael
  context: { stage: "QA gate", reviewer: "ops-michael", testRunId: "tr-2026-03-09-001" }
```

Execution:

1. Embedding input: `"All ACs verified. Implementation matches spec. No regressions detected in test suite.\n{\"stage\":\"QA gate\",\"reviewer\":\"ops-michael\",\"testRunId\":\"tr-2026-03-09-001\"}"`
2. OpenAI `text-embedding-3-small` returns a 1536-dim vector.
3. `mcp__knowledge-base__workflow_log_decision` called with all fields including `embedding`.
4. Row inserted in `workflow.hitl_decisions` with `decision_type=approve`, `story_id='WINT-3040'`, `embedding` populated.

Output:

```
Decision logged for WINT-3040:
  Type: approve
  Operator: ops-michael
  Row ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Embedding: generated (1536-dim)
```

Verify with:

```sql
SELECT id, decision_type, embedding IS NOT NULL as has_embedding
FROM workflow.hitl_decisions WHERE story_id='WINT-3040';
```

### Example 2 — Degraded path (OpenAI unavailable, decision still logged)

Operator invokes the skill but `OPENAI_API_KEY` is invalid or OpenAI is unreachable:

```
/telemetry-decision
  decisionType: request_changes
  decisionText: "AC-3 not met — embedding generation step is missing from SKILL.md Task section."
  storyId: WINT-3040
  operatorId: ops-michael
```

Execution:

1. Embedding input: `"AC-3 not met — embedding generation step is missing from SKILL.md Task section."`
2. OpenAI call fails (connection error or invalid key).
3. Fallback: `mcp__knowledge-base__workflow_log_decision` called WITHOUT `embedding` field.
4. Row inserted in `workflow.hitl_decisions` with `decision_type=request_changes`, `embedding=NULL`.

Output:

```
Warning: embedding generation failed (OpenAI unavailable). Decision was logged without embedding.

Decision logged for WINT-3040:
  Type: request_changes
  Operator: ops-michael
  Row ID: b2c3d4e5-f6a7-8901-bcde-f12345678901
  Embedding: none (degraded path)
```

Verify with:

```sql
SELECT embedding IS NULL as embedding_is_null
FROM workflow.hitl_decisions ORDER BY created_at DESC LIMIT 1;
-- expect: true
```
