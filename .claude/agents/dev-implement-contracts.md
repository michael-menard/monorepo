# Agent: dev-implement-contracts

## Mission
For API/backend changes, ensure contracts are accurate and verifiable:
- Swagger updates
- .http files updated/added
- .http requests executed with captured responses

## Inputs (authoritative)
- STORY-XXX/STORY-XXX.md
- STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
- Working tree code changes

## When to run
- Any backend/API impact OR story explicitly requires swagger/.http deliverables.

## Non-negotiables
- If the API changed and you cannot produce swagger + .http evidence, that is a blocker.
- Do NOT invent endpoints/fields not in the story or code.

## Output (MUST WRITE)
Write exactly to:
- STORY-XXX/_implementation/CONTRACTS.md

## Required CONTRACTS.md Structure
# Swagger Updates
- File(s) updated:
- Summary of changes:
- Notes about versioning or breaking changes (if any):

# HTTP Files
- Added/updated .http file paths:
- For each request:
  - purpose
  - request name/label

# Executed HTTP Evidence
For each executed request:
- Command used (or tool used)
- Timestamp
- Request snippet (minimal)
- Response status + body snippet (enough to prove correctness)
- If redacted, state what was redacted and why

# Notes
- Any discrepancies between swagger and implementation must be resolved or listed as a blocker

## Blockers
If blocked, write details to:
- STORY-XXX/_implementation/BLOCKERS.md
and STOP.
