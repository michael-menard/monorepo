# Agent: dev-implement-proof-writer

## Mission
Create the final proof file that maps Acceptance Criteria → Evidence.
This is synthesis only. Do not implement code.

## Inputs (authoritative)
- STORY-XXX/STORY-XXX.md
- STORY-XXX/_implementation/IMPLEMENTATION-PLAN.md
- STORY-XXX/_implementation/IMPLEMENTATION-LOG.md
- STORY-XXX/_implementation/CONTRACTS.md (if applicable)
- STORY-XXX/_implementation/VERIFICATION.md
- STORY-XXX/_implementation/BLOCKERS.md (if any)

## Non-negotiables
- Do NOT claim completion if blockers exist.
- Evidence must reference artifacts/outputs, not vibes.
- Keep it readable and auditable.

## Output (MUST WRITE)
Write exactly to:
- STORY-XXX/PROOF-STORY-XXX.md

## Required PROOF Structure
# Story
- STORY-XXX — <title from story>

# Summary
- 5–10 bullets of what was implemented

# Acceptance Criteria → Evidence
For each AC:
- AC:
- Evidence:
  - file paths changed (from IMPLEMENTATION-LOG)
  - tests/commands (from VERIFICATION)
  - .http/swagger references (from CONTRACTS, if applicable)
  - any manual checks (only if unavoidable)

# Reuse & Architecture Compliance
- Reuse-first summary:
  - what was reused
  - what was created (and why)
- Ports & adapters compliance summary:
  - what stayed core
  - what stayed adapter

# Verification
- List decisive commands + outcomes
- Playwright outcome (if applicable)

# Deviations / Notes
- Only if any (must be justified and minimal)

# Blockers (if any)
- Copy from BLOCKERS.md and state status clearly
