# Test Plan: WINT-0240 Configure Ollama Model Fleet

## Scope Summary

- **Endpoints touched**: `GET $OLLAMA_BASE_URL/api/tags` (health check only — no new endpoints created)
- **UI touched**: no
- **Data/storage touched**: no (filesystem only — shell scripts and markdown docs)
- **Artifacts under test**:
  1. `scripts/setup-ollama-models.sh` — one-command model fleet setup
  2. `scripts/check-ollama-health.sh` — CLI health check script
  3. `docs/tech-stack/ollama-model-fleet.md` — VRAM documentation

**ADR-005 Compliance**: All UAT verification MUST run against a real Ollama instance. No mocks or simulated server responses.

---

## Happy Path Tests

### Test HP-1: Full Fleet Setup on Clean Machine

**Setup**:
- Machine with Ollama installed but no models pulled
- Ollama server running (`ollama serve`)
- `OLLAMA_BASE_URL` not set (use default)

**Action**:
```bash
chmod +x scripts/setup-ollama-models.sh
bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- Script detects Ollama is installed (no error on `command -v ollama`)
- Script verifies Ollama server is reachable at `http://127.0.0.1:11434/api/tags`
- All required models are pulled with progress output
- Post-pull verification runs `ollama list` and shows all models present
- Script exits with code 0
- Final output lists env var configuration instructions (OLLAMA_BASE_URL, OLLAMA_TEMPERATURE, OLLAMA_TIMEOUT_MS, OLLAMA_ENABLE_FALLBACK)

**Evidence to capture**:
- Terminal output showing each model pull success
- `ollama list` output showing all models post-setup
- Script exit code: `echo $?` → `0`

---

### Test HP-2: Lite Mode Setup (--lite flag)

**Setup**:
- Machine with Ollama installed but no models pulled
- Machine with <10GB VRAM available

**Action**:
```bash
bash scripts/setup-ollama-models.sh --lite
```

**Expected outcome**:
- Script pulls only models requiring ≤10GB VRAM (no `deepseek-coder-v2:33b` or `qwen2.5-coder:32b`)
- Models pulled include at minimum: `qwen2.5-coder:7b`, small general models
- Post-pull verification succeeds for the lite set
- Script exits with code 0
- Output confirms "lite mode" was active

**Evidence to capture**:
- Terminal output showing lite mode activation message
- `ollama list` output — must NOT include models above VRAM threshold
- Script exit code: `0`

---

### Test HP-3: Health Check — All Models Present (Healthy)

**Setup**:
- All required models pulled and available (`ollama list` shows them all)
- Ollama server running

**Action**:
```bash
bash scripts/check-ollama-health.sh
```

**Expected outcome**:
- Script queries `GET $OLLAMA_BASE_URL/api/tags` successfully
- Script checks each model in `model-assignments.yaml` against `ollama list`
- All models show status: `present`
- Output is a structured report listing each model and its status
- Script exits with code 0

**Evidence to capture**:
- Full stdout output showing structured model status report
- Script exit code: `echo $?` → `0`

---

### Test HP-4: Health Check with Custom OLLAMA_BASE_URL

**Setup**:
- Ollama running on non-default port (e.g., `http://127.0.0.1:11435`)
- Models pulled

**Action**:
```bash
export OLLAMA_BASE_URL="http://127.0.0.1:11435"
bash scripts/check-ollama-health.sh
```

**Expected outcome**:
- Script uses the custom `OLLAMA_BASE_URL` value
- Health check targets `http://127.0.0.1:11435/api/tags`
- All models report present
- Exit code 0

**Evidence to capture**:
- Output confirming custom URL used
- Exit code: `0`

---

### Test HP-5: Setup Script --help Output

**Setup**: N/A

**Action**:
```bash
bash scripts/setup-ollama-models.sh --help
```

**Expected outcome**:
- Help text includes `--lite` flag description
- Help text lists all supported env vars: `OLLAMA_BASE_URL`, `OLLAMA_TEMPERATURE`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_ENABLE_FALLBACK`
- Help text explains what each env var does and its default value
- Exit code 0

**Evidence to capture**:
- Full `--help` output captured to file

---

### Test HP-6: Documentation File Structure

**Setup**: N/A (file review)

**Action**:
```bash
# Review docs/tech-stack/ollama-model-fleet.md
cat docs/tech-stack/ollama-model-fleet.md
```

**Expected outcome**:
- File exists at `docs/tech-stack/ollama-model-fleet.md`
- Contains a table with columns: Model Name, Tier, Ollama Registry Tag, VRAM Required, Use Cases, Notes
- All models in `model-assignments.yaml` and `WINT-0220-STRATEGY.yaml` have VRAM entries
- Contains "Recommended Minimum" section for Tier 3 fast fleet
- Contains "Environment Variables" section listing all 4 env vars with defaults
- Cross-references WINT-0220 tier assignments

**Evidence to capture**:
- Rendered markdown table screenshot or `cat` output
- Verification that all models from `model-assignments.yaml` appear in the table

---

## Error Cases

### Test EC-1: Ollama Not Installed

**Setup**:
- Ollama binary not in PATH (simulate with `PATH=/tmp bash scripts/setup-ollama-models.sh`)

**Action**:
```bash
env PATH=/usr/bin bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- Script detects missing Ollama via `command -v ollama`
- Error message includes install instructions (macOS: `brew install ollama`, Linux: `curl -fsSL https://ollama.com/install.sh | sh`)
- Script exits with non-zero exit code (1)

**Evidence to capture**:
- Error message output
- Exit code: `echo $?` → `1`

---

### Test EC-2: Ollama Server Not Running

**Setup**:
- Ollama installed but server not started (`pkill ollama`)

**Action**:
```bash
bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- Script checks `/api/tags` health endpoint
- Curl returns non-zero or connection refused
- Error message instructs user to run `ollama serve`
- Script exits with code 1

**Evidence to capture**:
- Error message output
- Exit code: `echo $?` → `1`

---

### Test EC-3: Health Check — One Model Missing (Unhealthy)

**Setup**:
- All models present EXCEPT one (e.g., manually remove `qwen2.5-coder:7b` via `ollama rm qwen2.5-coder:7b`)

**Action**:
```bash
bash scripts/check-ollama-health.sh
```

**Expected outcome**:
- Script reports `qwen2.5-coder:7b` as status: `missing`
- Output includes the pull command to fix: `ollama pull qwen2.5-coder:7b`
- Script exits with code 1 (unhealthy)

**Evidence to capture**:
- Full stdout report showing missing model and repair command
- Exit code: `echo $?` → `1`

---

### Test EC-4: Health Check — Ollama Server Down

**Setup**:
- Ollama server stopped

**Action**:
```bash
bash scripts/check-ollama-health.sh
```

**Expected outcome**:
- Script fails on `/api/tags` curl request
- Clear error message: "Ollama server unreachable at $OLLAMA_BASE_URL"
- Exit code 1

**Evidence to capture**:
- Error message output
- Exit code: `1`

---

### Test EC-5: Invalid Model Name in Setup Script

**Setup**:
- Test by temporarily modifying a model name to an invalid one (e.g., `invalid-model:99b`)

**Action**:
```bash
# (test with patched script)
bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- `ollama pull invalid-model:99b` returns non-zero exit code
- Script reports pull failure for that model
- Script exits with non-zero code (because `set -e` or explicit error check)

**Evidence to capture**:
- Error output from failed pull attempt
- Exit code: non-zero

---

## Edge Cases

### Test EG-1: Models Already Pulled (Re-run Idempotency)

**Setup**:
- All models already pulled and present

**Action**:
```bash
bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- Script detects models already present (ollama pull is idempotent — returns quickly if up-to-date)
- No duplicate download
- Script exits 0
- Post-verification confirms all models still present

**Evidence to capture**:
- Timing: second run should be much faster than first
- Exit code: `0`

---

### Test EG-2: Partial Fleet Installed (Some Models Missing)

**Setup**:
- Only 2 of 5 expected models are pulled

**Action**:
```bash
bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- Script pulls only the missing models
- Post-verification shows all models present
- Exit code 0

**Evidence to capture**:
- Output showing selective pull (existing models skip quickly, missing ones pull fully)
- `ollama list` after completion

---

### Test EG-3: Custom OLLAMA_BASE_URL in Setup Script

**Setup**:
- Ollama running on custom URL

**Action**:
```bash
export OLLAMA_BASE_URL="http://127.0.0.1:11435"
bash scripts/setup-ollama-models.sh
```

**Expected outcome**:
- Setup script respects `OLLAMA_BASE_URL` for server check
- All model pulls proceed via configured URL
- Exit code 0

**Evidence to capture**:
- Output confirming custom URL was used for server check

---

### Test EG-4: Verify Existing Script Superseded

**Setup**:
- Check `packages/backend/orchestrator/setup-ollama.sh`

**Action**:
```bash
cat packages/backend/orchestrator/setup-ollama.sh
```

**Expected outcome** (one of three acceptable states):
1. File removed (preferred)
2. File contains deprecation notice pointing to `scripts/setup-ollama-models.sh`
3. File delegates to `scripts/setup-ollama-models.sh` internally

**Evidence to capture**:
- File contents or `ls` showing file removed

---

### Test EG-5: VRAM Documentation Accuracy Check

**Setup**: Review `docs/tech-stack/ollama-model-fleet.md` and cross-reference against Ollama registry

**Action**:
Manually verify VRAM figures against:
- https://ollama.com/library/qwen2.5-coder (check 7b, 14b model details)
- https://ollama.com/library/deepseek-coder-v2 (check 16b model)
- https://ollama.com/library/codellama (check 13b)
- `model-assignments.yaml` model list

**Expected outcome**:
- VRAM figures within 10% of official Ollama registry values
- All models listed in `model-assignments.yaml` appear in the documentation table
- No model names differ from official Ollama registry names

**Evidence to capture**:
- Side-by-side comparison of documented VRAM vs Ollama registry values

---

### Test EG-6: Model Names Aligned with WINT-0220-STRATEGY.yaml

**Setup**: Read `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` and `model-assignments.yaml`

**Action**:
```bash
# Compare model names in setup script vs strategy YAML
grep -E "^\s*(model:|ollama pull)" scripts/setup-ollama-models.sh
grep "model:" packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml | grep -v "anthropic\|claude"
```

**Expected outcome**:
- Model names in `scripts/setup-ollama-models.sh` match exactly those in `WINT-0220-STRATEGY.yaml` Ollama tier models
- No phantom models in the script that aren't in the strategy
- Any discrepancy is documented with rationale in the script or documentation

**Evidence to capture**:
- Diff output or manual comparison list

---

## Required Tooling Evidence

### Backend
- No new API endpoints are created by this story
- Health check verification via direct `curl` calls:
  ```bash
  curl -s http://127.0.0.1:11434/api/tags | python3 -m json.tool
  # Expected: JSON object with "models" array listing installed models
  ```

### Frontend
- Not applicable — no UI surface

### Script Execution Evidence (Required for UAT)
For each script test:
```bash
# Capture full output + exit code
bash scripts/setup-ollama-models.sh 2>&1 | tee /tmp/setup-output.txt
echo "Exit code: $?"

bash scripts/check-ollama-health.sh 2>&1 | tee /tmp/health-output.txt
echo "Exit code: $?"
```

---

## Risks to Call Out

1. **Hardware dependency**: Tests EC-1 through HP-3 require a real Ollama installation. ADR-005 prohibits mock Ollama servers for UAT. Testers must have Ollama installed.

2. **VRAM availability**: Tests HP-1 (full fleet) require ~20GB VRAM for `deepseek-coder-v2:33b`. On constrained machines, use Test HP-2 (lite mode) as the primary full-fleet test.

3. **Download time**: Large models (16b, 33b) take 10-30+ minutes to pull. Allow adequate time for tests HP-1 and HP-2.

4. **WINT-0220 status**: The model list in the setup script should be validated against `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` (which exists on disk as of 2026-02-20). If WINT-0220 is formally completed and the YAML is updated, re-run Test EG-6 to verify alignment.

5. **Model name accuracy**: Ollama model names are version-sensitive. `deepseek-coder-v2:16b` and `deepseek-coder-v2:33b` are different from `deepseek-coder:33b`. Test EG-6 guards against this.

6. **Ollama version drift**: Ollama API at `/api/tags` may change structure between versions. Health check script should parse with null-safety.
