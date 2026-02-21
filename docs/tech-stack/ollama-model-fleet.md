# Ollama Model Fleet

> **Cross-reference**: `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml`  
> **Runtime assignments**: `.claude/config/model-assignments.yaml`  
> **Last updated**: 2026-02-20  

This document describes the local Ollama model fleet used by the LangGraph orchestrator for cost-efficient, low-latency AI inference on routine and code-generation tasks.

---

## Model Tiers

Tiers are defined in `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml`. Tiers 0–1 use cloud Claude models (not documented here). This fleet covers the local Ollama models for Tiers 2–3.

| Tier | Name | Description |
|------|------|-------------|
| 2 | Routine Work | Code generation, refactoring, test writing |
| 3 | Simple Tasks | Lint, formatting, status updates, simple validation |

---

## VRAM Requirements Table

| Model Name | Tier | Ollama Registry Tag | VRAM Required | Use Cases | Notes |
|------------|------|---------------------|---------------|-----------|-------|
| DeepSeek Coder V2 (16b) | 2 | `deepseek-coder-v2:16b` | ~10 GB | Complex code generation, refactoring, multi-file edits | **Required**. Tier 2 primary per WINT-0220-STRATEGY.yaml. See ARCH-001. |
| DeepSeek Coder V2 (33b) | 2 | `deepseek-coder-v2:33b` | ~20 GB | Best-quality code generation for memory-rich machines | **Optional heavy variant**. model-assignments.yaml uses :33b for `dev-implement-backend-coder` / `dev-implement-frontend-coder`. Only pull if you have ≥24 GB VRAM. See ARCH-001. |
| CodeLlama (13b) | 2 | `codellama:13b` | ~8 GB | Mid-complexity code tasks, structural validation, plan validation | **Required**. Used by `story-gap-hygiene`, `pm-dev-feasibility-review`, `dev-implement-plan-validator`, `dev-implement-verifier`, `elab-epic-engineering`, `elab-epic-platform`. |
| Qwen 2.5 Coder (14b) | 2 | `qwen2.5-coder:14b` | ~9 GB | Routine code generation, Tier 2 secondary | **Required for full fleet**. Tier 2 secondary per WINT-0220-STRATEGY.yaml. |
| Qwen 2.5 Coder (7b) | 3 | `qwen2.5-coder:7b` | ~5 GB | Lint, syntax validation, type checking, simple codegen, setup validation | **Required**. Tier 3 primary. Used by setup leaders, code-review workers, `dev-implement-playwright`, `dev-implement-contracts`. |
| Llama 3.2 (8b) | 3 | `llama3.2:8b` | ~6 GB | General purpose analysis, documentation writing, learnings extraction | **Required**. model-assignments.yaml runtime truth. See ARCH-002. |
| Llama 3.2 (3b) | 3 | `llama3.2:3b` | ~2 GB | Ultra-lean Tier 3 alternative for memory-constrained machines | **Not pulled by default**. WINT-0220-STRATEGY.yaml Tier 3 preferred lean variant, but no agent currently references :3b in model-assignments.yaml. See ARCH-002. |

---

## Reconciled Discrepancies

The following discrepancies were identified between `WINT-0220-STRATEGY.yaml` and `model-assignments.yaml` and resolved per architectural decisions:

### ARCH-001: DeepSeek Coder V2 — :16b vs :33b

- **WINT-0220-STRATEGY.yaml** lists `deepseek-coder-v2:16b` as the Tier 2 primary (~10 GB VRAM)
- **model-assignments.yaml** assigns `deepseek-coder-v2:33b` to `dev-implement-backend-coder` and `dev-implement-frontend-coder` (~20 GB VRAM)

**Resolution**: Include both. `:16b` is **required** (Tier 2 primary, health-check required). `:33b` is **optional** (labeled as heavy variant with VRAM warning in setup script). `--lite` skips both. Health check requires `:16b` and marks `:33b` as optional.

### ARCH-002: Llama 3.2 — :8b vs :3b

- **WINT-0220-STRATEGY.yaml** lists `llama3.2:3b` as Tier 3 primary (~2 GB VRAM)
- **model-assignments.yaml** assigns `llama3.2:8b` to `pm-uiux-recommendations`, `dev-implement-proof-writer`, `dev-implement-learnings`, etc.

**Resolution**: Pull `llama3.2:8b` only — it is the runtime truth that agents actually call. Document `llama3.2:3b` as the strategy doc's preferred lean alternative for memory-constrained machines (not pulled by default).

### ARCH-003: OLLAMA_ENABLE_FALLBACK — documentation only

- `OLLAMA_ENABLE_FALLBACK` is required by AC-9 but does not appear in `OllamaConfigSchema` in `packages/backend/orchestrator/src/providers/ollama.ts`

**Resolution**: Document with caveat. `OLLAMA_ENABLE_FALLBACK` is a runtime orchestration env var (not part of `OllamaConfigSchema`). It controls whether Tier 2/3 tasks fall back to Claude Haiku when Ollama is unavailable. Consult the orchestrator configuration for authoritative defaults.

---

## Recommended Minimum Hardware

For Tier 3 fast fleet (minimum viable Ollama setup):

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| VRAM | 8 GB (covers qwen2.5-coder:7b + llama3.2:8b) | 16 GB (covers full Tier 2 + 3) |
| RAM | 16 GB | 32 GB |
| Storage | 15 GB free | 60 GB free (for full fleet) |
| GPU | Apple M1 / NVIDIA RTX 3060 | Apple M2 Pro / NVIDIA RTX 3090 |

Use `scripts/setup-ollama-models.sh --lite` to pull only the Tier 3 minimum models (`qwen2.5-coder:7b` + `llama3.2:8b`) on machines with limited VRAM.

---

## Environment Variables

These environment variables control Ollama provider behavior. Set them in your shell or `.env.local` before running the orchestrator.

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama server URL. Change if running Ollama remotely or on a non-default port. Defined in `OllamaConfigSchema`. |
| `OLLAMA_TEMPERATURE` | `0` | Sampling temperature (0–2). Lower = more deterministic. Defined in `OllamaConfigSchema`. |
| `OLLAMA_TIMEOUT_MS` | `60000` | Request timeout in milliseconds. Increase for large models on slow hardware. Defined in `OllamaConfigSchema`. |
| `OLLAMA_ENABLE_FALLBACK` | _(not in OllamaConfigSchema)_ | Runtime orchestration flag. When set, Tier 2/3 tasks fall back to Claude Haiku if Ollama is unavailable. This is a runtime orchestration variable, not part of `OllamaConfigSchema` — consult the orchestrator configuration for authoritative defaults and behavior. |

---

## Quick Start

```bash
# Pull full fleet (requires ~50+ GB storage, 16 GB+ VRAM recommended)
./scripts/setup-ollama-models.sh

# Pull lite fleet only (Tier 3 minimum: qwen2.5-coder:7b + llama3.2:8b)
./scripts/setup-ollama-models.sh --lite

# Check health of required models
./scripts/check-ollama-health.sh
```

---

## See Also

- `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` — Model-per-task tier strategy
- `.claude/config/model-assignments.yaml` — Agent-to-model runtime assignments
- `packages/backend/orchestrator/src/providers/ollama.ts` — `OllamaProvider` and `OllamaConfigSchema`
- `scripts/setup-ollama-models.sh` — Fleet setup script (canonical, replaces `packages/backend/orchestrator/setup-ollama.sh`)
- `scripts/check-ollama-health.sh` — Health check CLI
