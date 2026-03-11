# Future Risks: WINT-0240 Configure Ollama Model Fleet

## Non-MVP Risks

### Risk FR-1: Model List Becomes Stale as Ollama Registry Evolves

**Risk**: Ollama model names and versions change. `deepseek-coder-v2:16b` may be superseded by `:v2:16b-instruct-q4_K_M` or similar versioned tags. The setup script pulling generic `model:size` tags will always get the latest quantization, which may change behavior.

**Impact (if not addressed post-MVP)**: Model performance may change after Ollama updates; hard-coded model names in the script may 404 if Ollama deprecates tags.

**Recommended timeline**: Q2 2026 — add version pinning option or automatic tag verification step before pull.

---

### Risk FR-2: Health Check Does Not Validate Model Inference Capability

**Risk**: `ollama list` confirms a model is downloaded but not that it can successfully run inference. On VRAM-constrained machines, a model may be listed but fail at runtime with OOM.

**Impact (if not addressed post-MVP)**: Health check returns false-positive (exit 0) on machines where large models are downloaded but unrunnable.

**Recommended timeline**: WINT-0270 (Benchmark) — add optional inference smoke-test to health check using a minimal prompt (e.g., `echo "1+1=" | ollama run qwen2.5-coder:7b`).

---

### Risk FR-3: No CI Integration for Health Check

**Risk**: `scripts/check-ollama-health.sh` can be used as a pre-workflow gate, but no CI pipeline integration exists. Workflows could start without Ollama being available.

**Impact (if not addressed post-MVP)**: Agents will fail mid-workflow with cryptic connection errors rather than failing fast at start.

**Recommended timeline**: Post-WINT-0250 (Escalation Triggers) — add health check as a precondition to workflow start scripts.

---

### Risk FR-4: VRAM Detection Not Automated

**Risk**: The `--lite` flag requires manual selection. No automated detection of available VRAM is implemented. On a 16GB machine, a developer who forgets to use `--lite` will attempt to pull `deepseek-coder-v2:33b` and fail after a partial download.

**Impact (if not addressed post-MVP)**: Wasted download time; confusing failure messages; developer frustration.

**Recommended timeline**: WINT-0250 (Escalation Triggers) — auto-detect VRAM using `nvidia-smi` or Metal stats (macOS) and suggest `--lite` automatically.

---

### Risk FR-5: No Uninstall or Fleet Reset Script

**Risk**: No mechanism to remove all Ollama models and reset to clean state. Useful for testing setup script idempotency or switching from full fleet to lite fleet.

**Impact (if not addressed post-MVP)**: Developers must manually `ollama rm` each model; no clean way to test the setup script on a "fresh" machine without wiping all models.

**Recommended timeline**: Nice-to-have for WINT-0270 benchmark setup.

---

## Scope Tightening Suggestions

1. **OUT OF SCOPE**: Any modification to `OllamaProvider` TypeScript code. This story is scripting/docs only. If env var defaults need updating in the TypeScript layer, that is WINT-0230 scope.

2. **OUT OF SCOPE**: `model-strategy.yaml` creation or modification. That YAML is the output of WINT-0220, not WINT-0240.

3. **OUT OF SCOPE**: CI/CD pipeline integration of the health check script. Consuming the script in CI is a follow-up task.

4. **OUT OF SCOPE**: Automated VRAM detection. The `--lite` flag is sufficient for Phase 0.

5. **DEFER TO WINT-0270**: Any benchmark or performance testing of the pulled models. The setup script just needs to pull them reliably.

---

## Future Requirements

1. **Auto-VRAM detection**: Parse `nvidia-smi` (NVIDIA), `rocm-smi` (AMD), or `sysctl hw.memsize` (macOS) to auto-select fleet tier without `--lite` flag

2. **Model update notifications**: Check for new versions of installed models and notify developers when updates are available

3. **Parallel model pulls**: Pull multiple models concurrently to reduce setup time (current `ollama pull` is serial)

4. **Fleet verification in CI**: Pre-job check in GitHub Actions / GitLab CI to verify Ollama availability before spawning local-model-dependent jobs

5. **Model provenance tracking**: Document quantization level, parameter count, and benchmark scores for each model in the VRAM documentation table
