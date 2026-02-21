#!/usr/bin/env bash
#
# setup-ollama-models.sh
#
# Pull the Ollama model fleet required by the LangGraph orchestrator.
# Models sourced from:
#   - packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml (tier 2/3 assignments)
#   - .claude/config/model-assignments.yaml (agent runtime assignments)
#
# Usage:
#   ./scripts/setup-ollama-models.sh         # Pull full fleet
#   ./scripts/setup-ollama-models.sh --lite  # Pull Tier 3 minimum only
#   ./scripts/setup-ollama-models.sh --help  # Show this help
#
# See also: docs/tech-stack/ollama-model-fleet.md
#

set -e

# ==============================================================================
# Constants
# ==============================================================================

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"

# ------------------------------------------------------------------------------
# Full fleet models
# Source: packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml tier 2/3
#
# Tier 2 — Routine Work (code generation, refactoring, test writing):
#   deepseek-coder-v2:16b  — Required Tier 2 primary (~10 GB VRAM)
#   deepseek-coder-v2:33b  — Optional heavy variant (~20 GB VRAM); only pull if ≥24 GB VRAM available
#                            (model-assignments.yaml uses :33b for dev-implement-backend/frontend-coder)
#   codellama:13b           — Required Tier 2 secondary (~8 GB VRAM)
#   qwen2.5-coder:14b      — Required Tier 2 secondary (~9 GB VRAM)
#
# Tier 3 — Simple Tasks (lint, validation, formatting, docs):
#   qwen2.5-coder:7b       — Required Tier 3 primary (~5 GB VRAM)
#   llama3.2:8b            — Required Tier 3 general purpose (~6 GB VRAM)
#                            (runtime truth: model-assignments.yaml uses :8b; WINT-0220 suggests :3b as
#                             lean alternative — see ARCH-002 in docs/tech-stack/ollama-model-fleet.md)
# ------------------------------------------------------------------------------
FULL_MODELS=(
  "deepseek-coder-v2:16b"
  "deepseek-coder-v2:33b"
  "codellama:13b"
  "qwen2.5-coder:14b"
  "qwen2.5-coder:7b"
  "llama3.2:8b"
)

# Required models (subset of full fleet — health check uses this list)
REQUIRED_MODELS=(
  "deepseek-coder-v2:16b"
  "codellama:13b"
  "qwen2.5-coder:14b"   # Tier 2 secondary — no agent consumer yet but required per WINT-0220 strategy alignment (AC-7)
  "qwen2.5-coder:7b"
  "llama3.2:8b"
)

# Heavy optional variant (pulled with full fleet, skipped in --lite)
OPTIONAL_HEAVY_MODELS=(
  "deepseek-coder-v2:33b"
)

# ------------------------------------------------------------------------------
# Lite fleet models (Tier 3 minimum — satisfies lite-mode requirements from
# WINT-0220-STRATEGY.yaml integration.ollama_requirements tier_3)
# Source: packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml tier 2/3
# ------------------------------------------------------------------------------
LITE_MODELS=(
  "qwen2.5-coder:7b"
  "llama3.2:8b"
)

# ==============================================================================
# Functions
# ==============================================================================

print_help() {
  cat <<HELP
Usage: $(basename "$0") [OPTIONS]

Pull the Ollama model fleet required by the LangGraph orchestrator.

OPTIONS:
  --lite    Pull only the Tier 3 minimum models (qwen2.5-coder:7b + llama3.2:8b).
            Suitable for machines with limited VRAM (8 GB+). Skips Tier 2 models.
  --help    Show this help message and exit.

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL         Ollama server URL.
                          Default: http://127.0.0.1:11434
                          Defined in OllamaConfigSchema (packages/backend/orchestrator/src/providers/ollama.ts)

  OLLAMA_TEMPERATURE      Sampling temperature (0-2). Lower = more deterministic.
                          Default: 0
                          Defined in OllamaConfigSchema.

  OLLAMA_TIMEOUT_MS       Request timeout in milliseconds.
                          Default: 60000
                          Defined in OllamaConfigSchema.

  OLLAMA_ENABLE_FALLBACK  Runtime orchestration flag. When set, Tier 2/3 tasks fall
                          back to Claude Haiku if Ollama is unavailable. NOTE: This
                          variable is NOT part of OllamaConfigSchema — it is a runtime
                          orchestration env var. Consult the orchestrator configuration
                          for authoritative defaults and behavior.

EXAMPLES:
  ./scripts/setup-ollama-models.sh           # Full fleet
  ./scripts/setup-ollama-models.sh --lite    # Tier 3 minimum only

SEE ALSO:
  docs/tech-stack/ollama-model-fleet.md      # VRAM table, env vars, hardware requirements
  scripts/check-ollama-health.sh             # Health check for required models
HELP
}

check_ollama_installed() {
  if ! command -v ollama > /dev/null 2>&1; then
    echo "ERROR: Ollama is not installed."
    echo ""
    echo "Install instructions:"
    echo "  macOS:  brew install ollama"
    echo "  Linux:  curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    echo "After installation, start the server with: ollama serve"
    exit 1
  fi
  echo "OK: ollama is installed ($(ollama --version 2>/dev/null || echo 'version unknown'))"
}

check_ollama_server() {
  echo "Checking Ollama server at ${OLLAMA_BASE_URL} ..."
  if ! curl -sf "${OLLAMA_BASE_URL}/api/tags" > /dev/null 2>&1; then
    echo "ERROR: Ollama server is not reachable at ${OLLAMA_BASE_URL}"
    echo ""
    echo "Start the server with: ollama serve"
    echo ""
    echo "If running on a non-default port, set: export OLLAMA_BASE_URL=http://127.0.0.1:<port>"
    exit 1
  fi
  echo "OK: Ollama server is running at ${OLLAMA_BASE_URL}"
}

pull_models() {
  local models=("$@")
  local total="${#models[@]}"
  local idx=0

  echo ""
  echo "Pulling ${total} model(s)..."
  echo ""

  for model in "${models[@]}"; do
    idx=$((idx + 1))
    echo "[${idx}/${total}] Pulling ${model} ..."
    if [ "${model}" = "deepseek-coder-v2:33b" ]; then
      echo "  NOTE: deepseek-coder-v2:33b requires ~20 GB VRAM. This is an optional heavy variant."
      echo "  See ARCH-001 in docs/tech-stack/ollama-model-fleet.md for rationale."
    fi
    ollama pull "${model}"
    echo ""
  done
}

verify_models() {
  local required_models=("$@")
  local installed_list
  installed_list=$(ollama list 2>/dev/null || echo "")

  echo ""
  echo "=== Post-Install Verification ==="
  echo ""

  local missing=()
  for model in "${required_models[@]}"; do
    # Match model name prefix (ollama list may include digest suffix)
    if echo "${installed_list}" | grep -q "^${model}"; then
      echo "  PRESENT  ${model}"
    else
      echo "  MISSING  ${model}  (run: ollama pull ${model})"
      missing+=("${model}")
    fi
  done

  echo ""

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "ERROR: ${#missing[@]} required model(s) are missing after pull:"
    for m in "${missing[@]}"; do
      echo "  - ${m}"
    done
    echo ""
    echo "Re-run this script or pull manually: ollama pull <model>"
    exit 1
  fi

  echo "OK: All required models are present."
}

print_env_instructions() {
  cat <<ENV

=== Environment Variable Instructions ===

Set these in your shell profile or .env.local before running the orchestrator:

  export OLLAMA_BASE_URL="http://127.0.0.1:11434"
    Ollama server URL. Change if running remotely or on a non-default port.
    (Defined in OllamaConfigSchema)

  export OLLAMA_TEMPERATURE="0"
    Sampling temperature (0-2). Lower = more deterministic.
    (Defined in OllamaConfigSchema)

  export OLLAMA_TIMEOUT_MS="60000"
    Request timeout in milliseconds. Increase for large models on slow hardware.
    (Defined in OllamaConfigSchema)

  export OLLAMA_ENABLE_FALLBACK="true"
    Runtime orchestration flag. Enables Tier 2/3 fallback to Claude Haiku when
    Ollama is unavailable. CAVEAT: This is NOT part of OllamaConfigSchema —
    consult the orchestrator configuration for authoritative defaults.

See also: docs/tech-stack/ollama-model-fleet.md
ENV
}

# ==============================================================================
# Main
# ==============================================================================

LITE_MODE=false

# Parse arguments
for arg in "$@"; do
  case "${arg}" in
    --help|-h)
      print_help
      exit 0
      ;;
    --lite)
      LITE_MODE=true
      ;;
    *)
      echo "ERROR: Unknown option: ${arg}"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

echo "=== Ollama Model Fleet Setup ==="
echo ""

check_ollama_installed
check_ollama_server

if [ "${LITE_MODE}" = "true" ]; then
  echo ""
  echo "Mode: --lite (Tier 3 minimum fleet)"
  echo "Models to pull:"
  for m in "${LITE_MODELS[@]}"; do
    echo "  - ${m}"
  done

  pull_models "${LITE_MODELS[@]}"
  verify_models "${LITE_MODELS[@]}"
else
  echo ""
  echo "Mode: full fleet"
  echo "Models to pull:"
  for m in "${FULL_MODELS[@]}"; do
    if [ "${m}" = "deepseek-coder-v2:33b" ]; then
      echo "  - ${m}  [optional heavy variant, ~20 GB VRAM]"
    else
      echo "  - ${m}"
    fi
  done

  pull_models "${FULL_MODELS[@]}"
  verify_models "${REQUIRED_MODELS[@]}"
fi

echo ""
echo "Installed models:"
ollama list

print_env_instructions

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify health:  ./scripts/check-ollama-health.sh"
echo "  2. Start Ollama:   ollama serve  (if not already running)"
echo "  3. Run orchestrator normally — Tier 2/3 tasks will use local models."
echo ""
