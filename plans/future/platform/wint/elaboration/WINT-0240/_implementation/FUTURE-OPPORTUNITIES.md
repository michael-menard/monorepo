# Future Opportunities - WINT-0240

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `llama3.2:8b` (used by agents) vs `llama3.2:3b` (in strategy Tier 3) coexist without explicit reconciliation | Medium | Low | In a future story or WINT-0220 revision, formally decide which `llama3.2` variant is canonical. The fleet currently needs `llama3.2:8b` to satisfy `model-assignments.yaml`. Include `llama3.2:3b` as the lite-mode alternative. |
| 2 | `qwen2.5-coder:14b` included in fleet per strategy alignment but has no current agent consumer | Low | Low | Track for WINT-0230 (Unified Model Interface) — if WINT-0230 introduces a router that can select between `:7b` and `:14b` for Tier 2 tasks, `:14b` becomes valuable. For now, include with a clear comment. |
| 3 | Health check verifies model presence via `ollama list` but not model inference capability | Medium | Medium | Post-MVP: add optional `--verify-inference` flag to `check-ollama-health.sh` that runs a minimal prompt per model (e.g., `echo "1+1=" | ollama run <model>`). Required for VRAM-constrained machines where a model is downloaded but unrunnable. Tracked in FUTURE-RISKS.md as FR-2. |
| 4 | `OLLAMA_ENABLE_FALLBACK` env var is defined in `src/config/llm-provider.ts`, not `OllamaConfigSchema` | Low | Low | When WINT-0230 (Unified Model Interface) is elaborated, consider whether `OLLAMA_ENABLE_FALLBACK` should be promoted to `OllamaConfigSchema` for a single source of truth. Currently documented in multiple README files and code comments — not a gap for WINT-0240 but a minor technical debt. |
| 5 | No uninstall/fleet-reset script for testing setup idempotency | Low | Low | Add `scripts/reset-ollama-fleet.sh` that runs `ollama rm` for each fleet model. Useful for WINT-0270 benchmark setup to ensure clean state. See FR-5. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Auto-VRAM detection instead of manual `--lite` flag | High | Medium | Detect available VRAM using `nvidia-smi` (NVIDIA/Linux), `rocm-smi` (AMD), or `sysctl hw.memsize`/`system_profiler` (macOS Apple Silicon) and auto-select the appropriate fleet tier without requiring the user to pass `--lite`. Deferred to WINT-0250 (Escalation Triggers). See FR-4. |
| 2 | Model version pinning to prevent silent behavior changes on Ollama updates | Medium | Low | Allow specifying exact quantization tags (e.g., `deepseek-coder-v2:16b-instruct-q4_K_M`) in addition to the generic `deepseek-coder-v2:16b` tag. Add a `--pin-versions` flag that pulls specific quantization variants. Deferred to Q2 2026. See FR-1. |
| 3 | Parallel model pulls to reduce setup time | Medium | Medium | Current serial pull loop takes 30–60+ minutes for the full fleet. Implement background pulls with a job manager (e.g., multiple `ollama pull &` calls with `wait`). Caution: may saturate network bandwidth. Deferred post-MVP. |
| 4 | Fleet verification in CI as pre-job check | High | Medium | Integrate `check-ollama-health.sh` as a GitHub Actions / GitLab CI precondition before any workflow step that relies on local Ollama models. Currently out of scope per non-goals. Deferred to post-WINT-0250. See FR-3. |
| 5 | Model provenance tracking in VRAM documentation | Low | Low | Add quantization level (Q4_K_M, Q5_K_M, etc.), parameter count, and benchmark scores (HumanEval, MBPP) to the VRAM table in `docs/tech-stack/ollama-model-fleet.md`. Would make model selection more data-driven. Can be done in a documentation follow-up. |
| 6 | Model update notifications | Low | Low | Add a `check-ollama-updates.sh` script that compares the local model manifest digest against the Ollama registry to detect when newer versions are available. Useful for periodic maintenance. |
| 7 | `check-ollama-health.sh` integration as WINT-0270 benchmark precondition | High | Low | WINT-0270 (Benchmark Local Models) depends on WINT-0240. The benchmark story should explicitly run `check-ollama-health.sh` and require exit code 0 before any benchmark starts. This is a WINT-0270 elaboration concern, not a gap in WINT-0240. |

## Categories

- **Edge Cases**: Model list drift between `model-assignments.yaml` and `WINT-0220-STRATEGY.yaml` (items 1-2 in Gaps); `OLLAMA_ENABLE_FALLBACK` source consistency (item 4 in Gaps)
- **UX Polish**: Parallel pulls for faster setup (#3 in Enhancements); auto-VRAM detection (#1 in Enhancements)
- **Performance**: Parallel model pulls (#3 in Enhancements)
- **Observability**: Model update notifications (#6 in Enhancements); model provenance tracking (#5 in Enhancements)
- **Integrations**: CI health check integration (#4 in Enhancements); WINT-0270 precondition integration (#7 in Enhancements)
- **Safety**: Inference verification for VRAM-constrained machines (#3 in Gaps); version pinning (#2 in Enhancements)
