# Dev Feasibility Review: WINT-0240 Configure Ollama Model Fleet

## Feasibility Summary

- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: This story produces shell scripts and markdown documentation — no TypeScript compilation, no database changes, no new runtime services. The patterns are well-established in the existing `packages/backend/orchestrator/setup-ollama.sh`. The WINT-0220-STRATEGY.yaml exists on disk at `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` providing the authoritative model list. Primary risks are model name accuracy and VRAM documentation precision, not implementation complexity.

**Note on blocking dependency**: The stories index marks WINT-0220 as `pending`, but `WINT-0220-STRATEGY.yaml` exists on disk (created 2026-02-15). The seed treats this as a provisional blocker pending formal story completion, but the required artifacts are available. Story should proceed to `ready-to-work` status contingent on WINT-0220 being formally marked `completed` or `uat` in the index.

---

## Likely Change Surface (Core Only)

**Files to create**:
- `scripts/setup-ollama-models.sh` — new monorepo-root setup script
- `scripts/check-ollama-health.sh` — new health check CLI script
- `docs/tech-stack/ollama-model-fleet.md` — new VRAM documentation

**Files to modify**:
- `packages/backend/orchestrator/setup-ollama.sh` — add deprecation notice or redirect; remove duplicate model pull logic

**Files to read (canonical references)**:
- `packages/backend/orchestrator/setup-ollama.sh` — existing script to extend/supersede
- `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` — authoritative model list
- `.claude/config/model-assignments.yaml` — agent-to-model mapping (all Ollama models must be present post-install)
- `packages/backend/orchestrator/src/providers/ollama.ts` — `OllamaConfigSchema` defines env var names and defaults

**No TypeScript, no database, no API Gateway changes required.**

---

## MVP-Critical Risks (Max 5)

### Risk 1: Model Name Discrepancy Between Sources

**Risk**: The stories index entry lists `deepseek-coder:33b` and `deepseek-r1:14b`, while `model-assignments.yaml` uses `deepseek-coder-v2:33b` (different namespace) and `WINT-0220-STRATEGY.yaml` specifies `deepseek-coder-v2:16b` (different size). If the setup script uses incorrect Ollama registry names, `ollama pull` will 404 and the post-install verification will fail.

**Why it blocks MVP**: The entire purpose of this story is to produce a working setup script. If model names are wrong, `ollama pull` fails and AC-2 (Full Fleet Pull) and AC-4 (Post-Install Verification) cannot pass.

**Required mitigation**:
- Use WINT-0220-STRATEGY.yaml Ollama tier models as authoritative source:
  - Tier 2: `deepseek-coder-v2:16b`, `codellama:13b`, `qwen2.5-coder:14b`
  - Tier 3: `qwen2.5-coder:7b`, `llama3.2:3b`
- Cross-reference against `model-assignments.yaml` Ollama models: `deepseek-coder-v2:33b`, `qwen2.5-coder:7b`, `codellama:13b`, `llama3.2:8b`
- Final model list must be verified against `https://ollama.com/library` before implementation
- Use exact Ollama registry tag names, not shorthand aliases

---

### Risk 2: Large Model VRAM Requirements Cause Silent Failures

**Risk**: `deepseek-coder-v2:33b` requires ~20GB VRAM. On a 16GB machine, `ollama pull` succeeds (model downloaded) but `ollama run` fails at runtime with OOM. The setup script could exit 0 while leaving an unusable model.

**Why it blocks MVP**: AC-4 requires exit code 0 only when all models are usable, not just downloaded. A model that crashes on first inference fails the health check post-setup.

**Required mitigation**:
- `--lite` flag (AC-3) must be the default path when VRAM is constrained; document VRAM threshold clearly
- The health check script (AC-5) should warn when a model's documented VRAM requirement exceeds available RAM
- For `deepseek-coder-v2:33b`: document in VRAM table that `:16b` is the lite alternative
- Avoid requiring `ollama run` in setup (it triggers model load); rely on `ollama list` for presence check

---

### Risk 3: Existing Script Divergence Causes Confusion

**Risk**: `packages/backend/orchestrator/setup-ollama.sh` currently exists and pulls a different model set (`deepseek-coder-v2:33b`, `qwen2.5-coder:7b`, `codellama:13b`, `llama3.2:8b`). If it is not superseded, two setup scripts with different model lists will coexist. Developers may run the old script and believe setup is complete.

**Why it blocks MVP**: AC-8 requires no duplication of model pull logic. Having two scripts violates this AC and creates maintenance debt that directly threatens the story's goal of "one-command setup."

**Required mitigation**:
- Either remove `packages/backend/orchestrator/setup-ollama.sh` or update it to contain only: a deprecation notice + call to `scripts/setup-ollama-models.sh`
- Never have two files that independently list the model fleet

---

## Missing Requirements for MVP

### MR-1: Authoritative Model List Must Be Explicitly Defined

The seed and index entry reference different model names. The story must explicitly commit to ONE authoritative model list derived from WINT-0220-STRATEGY.yaml Ollama tiers + model-assignments.yaml. The implementation decision:

**Recommended canonical fleet** (reconciled from WINT-0220-STRATEGY.yaml Tier 2/3 + model-assignments.yaml):
- `deepseek-coder-v2:16b` — Tier 2 Routine Work (use `:33b` as heavy option if >20GB VRAM)
- `codellama:13b` — Tier 2 Routine Work
- `qwen2.5-coder:14b` — Tier 2 Routine Work
- `qwen2.5-coder:7b` — Tier 3 Simple Tasks (lite-safe)
- `llama3.2:3b` or `llama3.2:8b` — Tier 3 general purpose (lite-safe)

**Lite mode** (≤10GB VRAM): `qwen2.5-coder:7b` + `llama3.2:3b` only.

**PM decision required**: Confirm this reconciled model list before implementation begins, or reference WINT-0220-STRATEGY.yaml as the live authority and document how to derive the list from it.

---

## MVP Evidence Expectations

1. `scripts/setup-ollama-models.sh` exists, is executable (`-rwxr-xr-x`), and has correct shebang (`#!/usr/bin/env bash` or `#!/bin/bash`)
2. Running `bash scripts/setup-ollama-models.sh --help` prints all 4 env vars without error
3. Running `bash scripts/check-ollama-health.sh` returns exit code 0 when all models are present and exit code 1 when any is missing
4. `docs/tech-stack/ollama-model-fleet.md` contains a table where all rows have non-empty VRAM entries
5. `packages/backend/orchestrator/setup-ollama.sh` either does not exist or contains a deprecation notice
6. Running `grep -r "ollama pull" scripts/` shows model names that match `ollama list` output on the test machine

---

## Proposed Subtask Breakdown

### ST-1: Research and Reconcile Canonical Model List

**Goal**: Produce a documented, verified list of Ollama models to include in the fleet, derived from WINT-0220-STRATEGY.yaml and model-assignments.yaml, with all names verified against the Ollama registry.

**Files to read**:
- `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` (canonical reference)
- `.claude/config/model-assignments.yaml`
- `packages/backend/orchestrator/setup-ollama.sh`

**Files to create/modify**:
- `docs/tech-stack/ollama-model-fleet.md` (initial draft — VRAM table)

**ACs covered**: AC-6, AC-7

**Depends on**: none

**Verification**:
```bash
# File exists and contains a markdown table
grep -c "|" docs/tech-stack/ollama-model-fleet.md
```

---

### ST-2: Create scripts/setup-ollama-models.sh

**Goal**: Write the main setup script that checks Ollama installation, server availability, pulls the full fleet (from ST-1's verified list), supports --lite flag, runs post-install verification, and prints env var instructions.

**Files to read**:
- `packages/backend/orchestrator/setup-ollama.sh` (canonical reference — copy structure)
- `docs/tech-stack/ollama-model-fleet.md` (from ST-1 — model list source)

**Files to create/modify**:
- `scripts/setup-ollama-models.sh` (new file)

**ACs covered**: AC-1, AC-2, AC-3, AC-4, AC-9

**Depends on**: ST-1

**Verification**:
```bash
bash scripts/setup-ollama-models.sh --help
# Must print --lite description and all 4 env vars
# Exit code must be 0
```

---

### ST-3: Create scripts/check-ollama-health.sh

**Goal**: Write the health check CLI script that queries `/api/tags`, verifies all models in `model-assignments.yaml` are present, prints a structured report, and returns exit code 0 (healthy) or 1 (unhealthy).

**Files to read**:
- `packages/backend/orchestrator/src/providers/ollama.ts` (canonical reference — checkAvailability pattern)
- `.claude/config/model-assignments.yaml` (model list to check)
- `scripts/setup-ollama-models.sh` (from ST-2 — env var handling reference)

**Files to create/modify**:
- `scripts/check-ollama-health.sh` (new file)

**ACs covered**: AC-5

**Depends on**: ST-2

**Verification**:
```bash
# With Ollama running and all models present:
bash scripts/check-ollama-health.sh
echo "Exit code: $?"   # Expected: 0

# With a model removed:
ollama rm qwen2.5-coder:7b
bash scripts/check-ollama-health.sh
echo "Exit code: $?"   # Expected: 1
```

---

### ST-4: Supersede Existing Script and Finalize Documentation

**Goal**: Update `packages/backend/orchestrator/setup-ollama.sh` with deprecation notice, complete VRAM documentation in `docs/tech-stack/ollama-model-fleet.md` (Environment Variables section, cross-references to WINT-0220), and verify no model pull logic is duplicated.

**Files to read**:
- `packages/backend/orchestrator/setup-ollama.sh` (to modify with deprecation)
- `docs/tech-stack/ollama-model-fleet.md` (from ST-1 — to add final sections)

**Files to create/modify**:
- `packages/backend/orchestrator/setup-ollama.sh` (add deprecation notice)
- `docs/tech-stack/ollama-model-fleet.md` (add Environment Variables section, Recommended Minimum section, WINT-0220 cross-reference)

**ACs covered**: AC-6, AC-7, AC-8, AC-9

**Depends on**: ST-3

**Verification**:
```bash
# Check deprecation notice is present
grep -i "deprecat" packages/backend/orchestrator/setup-ollama.sh
# Or verify file is removed
ls packages/backend/orchestrator/setup-ollama.sh 2>/dev/null || echo "removed"

# Check documentation completeness
grep "Environment Variables" docs/tech-stack/ollama-model-fleet.md
grep "VRAM" docs/tech-stack/ollama-model-fleet.md | wc -l  # Should be >5
```
