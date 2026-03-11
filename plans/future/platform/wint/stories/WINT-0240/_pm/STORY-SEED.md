---
generated: "2026-02-20"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: WINT-0240

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No knowledge base lessons loaded (KB lesson migration not yet complete). ADR-LOG.md consulted but no ADRs cover local model fleet configuration.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Existing `setup-ollama.sh` script | `packages/backend/orchestrator/setup-ollama.sh` | **Direct Overlap** - Pulls 4 Ollama models with health check pattern; WINT-0240 must extend or supersede this |
| OllamaProvider adapter | `packages/backend/orchestrator/src/providers/ollama.ts` | **Foundational** - Uses `http://127.0.0.1:11434` as base URL; health check targets `/api/tags` endpoint |
| `model-assignments.yaml` | `.claude/config/model-assignments.yaml` | **Foundational** - Defines which Ollama models are expected (`qwen2.5-coder:7b`, `codellama:13b`, `deepseek-coder-v2:33b`, `deepseek-coder-v2:16b`, `llama3.2:8b`) |
| `MODEL_STRATEGY.md` | `packages/backend/orchestrator/MODEL_STRATEGY.md` | **Reference** - Documents model VRAM requirements and pull commands for existing fleet |
| WINT-0220 Strategy | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | **Foundational Dependency** - Defines the 4-tier model strategy that specifies WHICH models the Ollama fleet must host |
| WINT-0220 Strategy YAML | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` | **Machine-readable spec** - Canonical tier-to-model mappings that WINT-0240 scripts must align with |
| Docker Compose setup | `infra/compose.lego-app.yaml` | **Pattern Reference** - Demonstrates the project's infrastructure scripting style (healthcheck patterns) |
| Monorepo scripts directory | `scripts/` | **Canonical location** - Existing shell scripts live at `scripts/*.sh`; new setup script should follow this pattern |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| WINT-0220 | Define Model-per-Task Strategy | pending | **BLOCKING DEPENDENCY** - WINT-0240 depends on WINT-0220; until WINT-0220 is complete, the definitive model list is undefined |
| WINT-0230 | Create Unified Model Interface | elaboration | **Downstream consumer** - WINT-0230 will assume Ollama models from this story are installed; coordination required on model name format |

### Constraints to Respect

1. **Blocking Dependency (WINT-0220)**: The story index marks WINT-0240 as depending on WINT-0220. WINT-0220 is still `pending`. The definitive model selection (which models to pull, VRAM budgets, tier assignments) cannot be finalized until WINT-0220 is complete. This is a **blocking conflict** — see Conflict Analysis.

2. **Existing `setup-ollama.sh` Divergence**: The existing script at `packages/backend/orchestrator/setup-ollama.sh` pulls `deepseek-coder-v2:33b` and `codellama:13b`, while the WINT-0240 index entry specifies `qwen2.5-coder:32b` and `deepseek-r1:14b`. These are different model fleets. WINT-0240 must reconcile these or supersede the existing script.

3. **Model Name Discrepancy**: The WINT-0240 index lists `deepseek-coder:33b` and `deepseek-r1:14b`, while `model-assignments.yaml` and `MODEL_STRATEGY.md` use `deepseek-coder-v2:33b` (different namespace). The canonical model names must align with Ollama's model registry and with what WINT-0230's unified interface expects.

4. **VRAM Reality**: `qwen2.5-coder:32b` requires approximately 20GB VRAM. `deepseek-coder-v2:33b` also requires ~20GB. Running multiple large models simultaneously may require model swapping. The health check and switching logic must account for this.

5. **Script Location Convention**: The monorepo uses `scripts/*.sh` for top-level orchestration scripts. The story index specifies `scripts/setup-ollama-models.sh`. This aligns with the existing convention.

6. **No Code Implementation**: WINT-0240 is a documentation and scripting story. Do NOT implement TypeScript/Node.js code. The output is shell scripts and documentation files only.

---

## Retrieved Context

### Related Endpoints

- **Ollama health endpoint**: `http://127.0.0.1:11434/api/tags` — used by `OllamaProvider.checkAvailability()` and the existing `setup-ollama.sh` script. This is the canonical health check URL.
- **Ollama generate endpoint**: `http://127.0.0.1:11434/api/generate` — used for inference; health check should verify the server can serve models, not just respond.
- **OLLAMA_BASE_URL env var**: Configurable via `process.env.OLLAMA_BASE_URL` (defaults to `http://127.0.0.1:11434`). The setup script should document and respect this variable.

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| `OllamaProvider` | `packages/backend/orchestrator/src/providers/ollama.ts` | TypeScript adapter — health check and model invocation; setup script must produce models this adapter expects |
| `OllamaConfigSchema` | `packages/backend/orchestrator/src/providers/ollama.ts` | Zod schema — defines `baseUrl`, `temperature`, `timeoutMs`; script should document compatible env vars |
| `model-assignments.yaml` | `.claude/config/model-assignments.yaml` | YAML — agent→model mappings; script must ensure all models listed here are available post-install |
| `setup-ollama.sh` (existing) | `packages/backend/orchestrator/setup-ollama.sh` | Existing script — directly overlaps with WINT-0240 scope; must be reconciled |
| WINT-0220-STRATEGY.yaml | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` | YAML — canonical model tier spec; should be the source of truth for which models the fleet needs |

### Reuse Candidates

1. **Existing `setup-ollama.sh`**: Contains working Ollama installation check, server running check, model pull loop, and verification display. WINT-0240 should extend rather than duplicate this script, or supersede it with a more comprehensive version at `scripts/setup-ollama-models.sh`.

2. **`OllamaProvider.checkAvailability()` pattern**: Uses `GET /api/tags` with a configurable timeout. The health check script should mirror this approach.

3. **Docker Compose healthcheck pattern**: `infra/compose.lego-app.yaml` uses `test:`, `interval:`, `timeout:`, `retries:` patterns. The health check script could adopt a similar structure.

4. **`model-assignments.yaml` model list**: The existing YAML already documents the deployed Ollama model set. WINT-0240 VRAM documentation should cross-reference these exact model names.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Shell script with install check, server check, and model pull loop | `packages/backend/orchestrator/setup-ollama.sh` | Direct predecessor — same structure WINT-0240's new script should extend; demonstrates the `set -e`, `command -v`, `curl` availability check pattern |
| YAML model strategy with tier definitions | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | Source of truth for which models belong in each tier — WINT-0240 documentation must reference this |
| Zod-validated YAML config pattern | `packages/backend/orchestrator/src/providers/ollama.ts` | Shows how Ollama connection is configured via env vars; VRAM docs should mention these same vars |
| Infrastructure documentation in Compose | `infra/compose.lego-app.yaml` | Demonstrates service/healthcheck documentation style this monorepo uses |

---

## Knowledge Context

### Lessons Learned

KB lessons are not yet migrated to YAML artifacts. Using codebase analysis only.

### Blockers to Avoid (from past stories)

- **Model name mismatches**: WINT-0220's STORY-SEED warns about Ollama model availability varying by machine. The setup script must use exact Ollama registry model names (e.g., `deepseek-coder-v2:33b` not `deepseek-coder:33b`). Verify names against `https://ollama.com/library` before documenting.
- **Assuming uniform hardware**: `MODEL_STRATEGY.md` explicitly calls out the `deepseek-coder-v2:33b` vs `:16b` choice based on available RAM. The WINT-0240 setup script must offer a memory-constrained path.
- **Divergence from actual agent assignments**: If the script pulls models not listed in `model-assignments.yaml`, the health check will pass but agents may still fail. The health check must validate against the SAME model list agents expect.
- **Over-engineering the health endpoint**: WINT-0230's STORY-SEED notes that `checkAvailability()` uses a simple `/api/tags` GET. The health check script should match this simplicity — avoid implementing a separate HTTP server for Phase 0 scripting work.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any UAT verification of this story must run against a real Ollama instance, not a mock. Health check validation is production-equivalent verification. |

ADRs 001-004 and 006 do not apply to this infrastructure scripting story.

### Patterns to Follow

- **Shell script conventions**: Use `set -e`, check for `ollama` binary with `command -v`, check server with `curl`, confirm model presence with `ollama list`.
- **Memory-constrained alternatives**: Document lite variants (`:16b` instead of `:33b`) as first-class options, not footnotes.
- **Align with WINT-0220**: The model list in `scripts/setup-ollama-models.sh` must be derived from or reference `WINT-0220-STRATEGY.yaml`, not specified independently.
- **Documented env vars**: The setup script should echo the env vars consumers need (`OLLAMA_BASE_URL`, `OLLAMA_TEMPERATURE`, `OLLAMA_TIMEOUT_MS`) as part of its "next steps" output.

### Patterns to Avoid

- **Hardcoding model lists in two places**: If `model-assignments.yaml` and `scripts/setup-ollama-models.sh` both enumerate models independently, they will drift. The script should ideally derive from or reference the YAML as the authoritative source.
- **Implementing a runtime health endpoint**: WINT-0240 scope is scripting — not a running service. A "health check endpoint" in the story index means a CLI health check script, not an HTTP server.
- **Pulling all models unconditionally**: Large models (32B+) should be opt-in, with the script defaulting to a minimal fleet (7B models) and requiring explicit flags for large models.

---

## Conflict Analysis

### Conflict: Blocking Dependency — WINT-0220 Not Yet Complete

- **Severity**: blocking
- **Description**: WINT-0240 is explicitly marked `Depends On: WINT-0220` in the stories index. WINT-0220 ("Define Model-per-Task Strategy") is currently `pending`. The Ollama fleet that WINT-0240 must configure is defined by WINT-0220's output artifacts (`WINT-0220-STRATEGY.yaml`). Without a final, approved model strategy, the list of models to pull, the VRAM budget targets, and the tier assignments are all potentially subject to change.

  **Current State**: WINT-0220's STORY-SEED is in UAT status but the story index shows it as `pending`. The dependency is not yet satisfied.

- **Resolution Hint**: This story should not be moved to `ready-to-work` until WINT-0220 reaches `completed` or `uat` status with a verified `WINT-0220-STRATEGY.yaml`. The elaboration and implementation phases of WINT-0240 should reference the final strategy YAML, not independently enumerate models.

  For seed generation purposes, we use the currently-available model list from `model-assignments.yaml` and `MODEL_STRATEGY.md` as a working baseline, clearly flagging that this is subject to revision once WINT-0220 is finalized.

---

## Story Seed

### Title

Configure Ollama Model Fleet

### Description

**Context**

The WINT system's local-first model strategy (WINT-0220) requires a fleet of Ollama-hosted models to be available on the developer's machine before any workflow agents can execute without incurring cloud API costs. Currently, a partial setup script exists at `packages/backend/orchestrator/setup-ollama.sh` that pulls four models (`deepseek-coder-v2:33b`, `qwen2.5-coder:7b`, `codellama:13b`, `llama3.2:8b`), but this script:

- Is scoped to the orchestrator package rather than the monorepo root
- Does not match the model set specified in the WINT-0240 story index (`qwen2.5-coder:32b`, `deepseek-r1:14b`)
- Does not provide a memory-constrained path for machines with less than 20GB VRAM
- Does not include a standalone health check script
- Does not document VRAM requirements per model in a structured format
- Does not implement model selection logic based on available resources

**Problem**

Without a comprehensive, one-command setup process for the Ollama model fleet:

- Developers must manually determine which models to pull
- Agents that depend on local models fail silently or fall back to expensive cloud APIs
- No standard health check exists to verify the fleet is ready before running workflows
- Large models (32B+) may be pulled on machines without sufficient VRAM, causing OOM failures
- The model fleet described in `model-assignments.yaml` and the models actually available diverge over time

**Proposed Solution**

Produce three artifacts:

1. **`scripts/setup-ollama-models.sh`** — One-command setup script that:
   - Checks Ollama is installed and running
   - Pulls the full model fleet defined by WINT-0220's strategy
   - Offers a `--lite` flag for memory-constrained machines (7B/14B models only)
   - Verifies all models in `model-assignments.yaml` are available post-install
   - Prints environment variable configuration instructions
   - Replaces or supersedes `packages/backend/orchestrator/setup-ollama.sh`

2. **`docs/tech-stack/ollama-model-fleet.md`** — Documentation that:
   - Lists each model with VRAM requirements, use case, and Ollama registry name
   - Explains the tiered model selection strategy (cross-referencing WINT-0220)
   - Provides troubleshooting guidance for common VRAM and availability issues

3. **`scripts/check-ollama-health.sh`** — Health check script that:
   - Verifies Ollama server responds at `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
   - Confirms each model in `model-assignments.yaml` is loaded (`ollama list`)
   - Reports missing models and the pull command to fix
   - Returns exit code 0 (healthy) or 1 (unhealthy) for use in CI or workflow preconditions

### Initial Acceptance Criteria

- [ ] **AC-1: Setup Script Exists and Is Executable**
  - `scripts/setup-ollama-models.sh` exists, is executable (`chmod +x`), and has a shebang line
  - Script begins with `set -e` and validates Ollama installation before any pull
  - Script validates Ollama server is running at `OLLAMA_BASE_URL` (defaulting to `http://127.0.0.1:11434`)
  - Failure messages include install/start instructions

- [ ] **AC-2: Full Fleet Pull**
  - Script pulls all models required by the current model-assignments (at minimum: `qwen2.5-coder:7b`, `codellama:13b`, `llama3.2:8b`, and the large coding model)
  - Model names are valid Ollama registry names (verified against `ollama.com/library`)
  - Script confirms each pull with a progress indicator

- [ ] **AC-3: Memory-Constrained Path**
  - Script accepts a `--lite` flag that skips models requiring >10GB VRAM
  - `--lite` flag is documented in the script's `--help` output
  - The lite model set still satisfies the Tier 3 (simple tasks) requirements from WINT-0220

- [ ] **AC-4: Post-Install Verification**
  - After pulling, script runs `ollama list` and checks each required model is present
  - Script reports any missing models with their pull command
  - Script exits with code 0 only if all required models are present (or `--lite` set is complete)

- [ ] **AC-5: Health Check Script Exists and Is Correct**
  - `scripts/check-ollama-health.sh` exists, is executable, and returns exit code 0 when healthy
  - Health check queries `GET $OLLAMA_BASE_URL/api/tags` (matching `OllamaProvider.checkAvailability()` logic)
  - Health check verifies each model in `model-assignments.yaml` appears in `ollama list` output
  - Health check outputs a structured report (model name, status: present/missing) to stdout

- [ ] **AC-6: VRAM Documentation**
  - `docs/tech-stack/ollama-model-fleet.md` exists and is structured as a table with columns: Model Name, Tier, Ollama Registry Tag, VRAM Required, Use Cases, Notes
  - All models referenced in `model-assignments.yaml` have VRAM entries
  - Documentation distinguishes between full-precision and quantized variants where relevant
  - A "Recommended Minimum" section states the minimum hardware to run the Tier 3 fast fleet

- [ ] **AC-7: Alignment with WINT-0220 Strategy**
  - The model list in `scripts/setup-ollama-models.sh` matches the models prescribed by the WINT-0220 strategy output (once WINT-0220 is complete)
  - Any discrepancy between the script's model list and `model-assignments.yaml` is documented with rationale
  - The VRAM documentation cross-references WINT-0220-STRATEGY.yaml tier assignments

- [ ] **AC-8: Existing Script Superseded**
  - `packages/backend/orchestrator/setup-ollama.sh` is either removed, updated to delegate to `scripts/setup-ollama-models.sh`, or contains a deprecation notice pointing to the new location
  - No duplication of model pull logic across two scripts

- [ ] **AC-9: Environment Variable Documentation**
  - Setup script `--help` output lists all relevant Ollama env vars: `OLLAMA_BASE_URL`, `OLLAMA_TEMPERATURE`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_ENABLE_FALLBACK`
  - Documentation file includes an "Environment Variables" section with the same list and their defaults

### Non-Goals

- **Implementing the TypeScript unified model interface**: That is WINT-0230 scope
- **Creating a runtime HTTP health endpoint (always-on server)**: The health check is a CLI script, not a service
- **Model fine-tuning or custom model creation**: Pulling pre-trained models from Ollama registry only
- **Automated VRAM detection and model switching during inference**: That is WINT-0250 (escalation triggers) and future ML pipeline scope
- **Modifying `OllamaProvider` TypeScript code**: This story is scripting and documentation only
- **Adding new models not referenced in WINT-0220 strategy**: Fleet composition is dictated by WINT-0220, not independently decided here
- **CI/CD integration of health check**: Consuming the health check in CI pipelines is a follow-up task
- **Implementing `model-strategy.yaml` creation**: That artifact is produced by WINT-0220, not WINT-0240

### Reuse Plan

- **Components**:
  - `packages/backend/orchestrator/setup-ollama.sh` — Direct reuse of: Ollama install check, server running check, model pull loop structure, and installed model verification display
  - `infra/compose.lego-app.yaml` — Pattern reference for healthcheck structure

- **Patterns**:
  - `set -e` + `command -v ollama` installation check
  - `curl -s $OLLAMA_BASE_URL/api/tags` server availability check (mirrors `OllamaProvider.checkAvailability()`)
  - Confirmation prompt before pulling large models
  - `ollama list` for post-install verification

- **Packages**:
  - Standard POSIX shell — no additional dependencies
  - `curl` — already available in all CI environments and development machines
  - `WINT-0220-STRATEGY.yaml` — canonical source of truth for model selection (reference, do not duplicate)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a scripting and documentation story. Traditional unit tests do not apply. The test plan should focus on:

- **Manual verification checklist**: Run `scripts/setup-ollama-models.sh` on a clean machine, verify all models download successfully
- **`--lite` flag verification**: Confirm lite mode skips models above the VRAM threshold
- **Health check verification**: Run `scripts/check-ollama-health.sh` with models present (expect exit 0) and with a model removed (expect exit 1 with clear error message)
- **Documentation accuracy**: Cross-reference VRAM figures against Ollama's official model registry and WINT-0220-STRATEGY.yaml
- **Model name accuracy**: Each model name in scripts must be verifiable via `ollama pull <name>` without 404
- **Supersession verification**: Confirm `packages/backend/orchestrator/setup-ollama.sh` no longer contains duplicated pull logic
- **ADR-005 compliance**: UAT verification must use a real Ollama instance, not a mock

Key risk: WINT-0220 is blocking. If tests are run before WINT-0220 finalizes the model list, the model set pulled by the script may change. Pin UAT to post-WINT-0220-completion.

### For UI/UX Advisor

Not applicable. This story has no UI surface. All output is shell scripts and markdown documentation.

### For Dev Feasibility

**Implementation risks**:

1. **Model name discrepancy**: The WINT-0240 story index specifies `qwen2.5-coder:32b` and `deepseek-r1:14b`, while the existing `model-assignments.yaml` uses `deepseek-coder-v2:33b` and does not mention `deepseek-r1:14b`. Before scripting, verify which names are valid Ollama registry tags. `qwen2.5-coder:32b` does exist on ollama.com; `deepseek-r1:14b` should be verified.
   - **Mitigation**: Run `ollama search qwen2.5-coder` and `ollama search deepseek-r1` before writing the script to confirm exact tag names.

2. **Blocking dependency**: Cannot finalize the model list until WINT-0220 is complete. Implementation should wait or proceed with the existing `model-assignments.yaml` set as a temporary baseline.
   - **Mitigation**: If proceeding before WINT-0220 is done, clearly mark the model list in the script as `# Provisional — will be updated to match WINT-0220-STRATEGY.yaml`.

3. **`deepseek-coder-v2:33b` VRAM**: This model requires ~20GB VRAM. On a 16GB machine, `ollama pull` will succeed but `ollama run` will fail or OOM. The health check must verify the model can be loaded, not just that it was downloaded.
   - **Mitigation**: After `ollama pull`, run a minimal inference test (`ollama run <model> "1+1="`) and capture exit code as part of the health check for large models.

4. **Script location decision**: Two locations exist — `scripts/` (monorepo root, existing convention for orchestration scripts) vs `packages/backend/orchestrator/` (existing script location). The story index specifies `scripts/setup-ollama-models.sh` which is the monorepo root. The existing script at `packages/backend/orchestrator/setup-ollama.sh` should either be removed or redirected.

**Canonical references for implementation**:

- Pattern: `packages/backend/orchestrator/setup-ollama.sh` — copy the `set -e`, binary check, curl check, and pull loop structure directly
- Env vars: `packages/backend/orchestrator/src/providers/ollama.ts` — `OllamaConfigSchema` defines `OLLAMA_BASE_URL`, `OLLAMA_TEMPERATURE`, `OLLAMA_TIMEOUT_MS` defaults
- Model authority: `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` (once available post-WINT-0220) — use as the source of truth for model names and tier assignments

**Time estimate**:
- `scripts/setup-ollama-models.sh`: 1-2 hours (extend existing script)
- `scripts/check-ollama-health.sh`: 1 hour
- `docs/tech-stack/ollama-model-fleet.md`: 1-2 hours (research VRAM per model, write table)
- Reconcile existing script + verify model names: 30 min
- Total: ~4-6 hours

**Coordination points**:
- **WINT-0220**: Must be complete before this story moves to `ready-to-work`. The model list in the script will change based on WINT-0220's output.
- **WINT-0230**: Will consume the Ollama models installed by this story. Coordinate on model name format — WINT-0230's unified interface uses `ollama:qwen2.5-coder:7b` (colon-prefixed) format.
- **WINT-0270**: Benchmark story depends on WINT-0240. The setup script must produce a stable, reproducible model fleet for benchmarking to be comparable across runs.

---

**Story Seed Generated**: 2026-02-20
**Baseline Reality**: 2026-02-13
**Knowledge Base**: Not migrated — relying on codebase analysis
**Blocking Dependencies**: WINT-0220 (pending — must complete before this story is ready-to-work)
**Blocked Stories**: WINT-0270 (benchmark depends on fleet being configured)
