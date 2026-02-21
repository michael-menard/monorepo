#!/usr/bin/env bash
#
# check-ollama-health.sh
#
# Health check for the Ollama model fleet required by the LangGraph orchestrator.
# Mirrors OllamaProvider.checkAvailability() pattern from:
#   packages/backend/orchestrator/src/providers/ollama.ts
#
# Queries ${OLLAMA_BASE_URL:-http://127.0.0.1:11434}/api/tags, checks each
# required model from .claude/config/model-assignments.yaml is present, and
# prints a structured report.
#
# Exit codes:
#   0 — Server reachable and all required models present
#   1 — Server unreachable OR one or more required models missing
#
# Usage:
#   ./scripts/check-ollama-health.sh
#

set -e

# ==============================================================================
# Configuration
# ==============================================================================

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"

# ------------------------------------------------------------------------------
# Required models
# Source: .claude/config/model-assignments.yaml (agent runtime assignments)
# Source: packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml tier 2/3
#
# Required (exit 1 if missing):
#   qwen2.5-coder:7b       — Tier 3 primary; used by setup leaders, code-review workers
#   codellama:13b          — Tier 2 secondary; used by plan-validator, gap-hygiene, etc.
#   deepseek-coder-v2:16b  — Tier 2 primary (required variant per ARCH-001)
#   llama3.2:8b            — Tier 3 general purpose; runtime truth per model-assignments.yaml
#
# Optional (reported but does not affect exit code):
#   deepseek-coder-v2:33b  — Optional heavy variant; model-assignments.yaml uses for
#                            dev-implement-backend/frontend-coder (~20 GB VRAM)
#                            See ARCH-001 in docs/tech-stack/ollama-model-fleet.md
# ------------------------------------------------------------------------------
REQUIRED_MODELS=(
  "qwen2.5-coder:7b"
  "codellama:13b"
  "deepseek-coder-v2:16b"
  "qwen2.5-coder:14b"   # Tier 2 secondary — no agent consumer yet but required per WINT-0220 strategy alignment (AC-7)
  "llama3.2:8b"
)

OPTIONAL_MODELS=(
  "deepseek-coder-v2:33b"
)

# ==============================================================================
# Functions
# ==============================================================================

check_server() {
  if ! curl -sf "${OLLAMA_BASE_URL}/api/tags" > /dev/null 2>&1; then
    echo "FAIL  server  UNREACHABLE  ${OLLAMA_BASE_URL}/api/tags"
    return 1
  fi
  echo "OK    server  REACHABLE    ${OLLAMA_BASE_URL}/api/tags"
  return 0
}

get_installed_models() {
  curl -sf "${OLLAMA_BASE_URL}/api/tags" 2>/dev/null \
    | grep -o '"name":"[^"]*"' \
    | sed 's/"name":"//;s/"//'
}

check_model() {
  local model="$1"
  local installed_list="$2"

  # Match from start of line for exactness (installed list has one model per line)
  if echo "${installed_list}" | grep -qF "${model}"; then
    echo "OK    ${model}  PRESENT"
    return 0
  else
    echo "FAIL  ${model}  MISSING  (pull: ollama pull ${model})"
    return 1
  fi
}

# ==============================================================================
# Main
# ==============================================================================

echo "=== Ollama Fleet Health Check ==="
echo "Server: ${OLLAMA_BASE_URL}"
echo ""
echo "Model Name                    | Status   | Action"
echo "------------------------------|----------|----------------------------------"

# Check server reachability (mirrors OllamaProvider.checkAvailability())
SERVER_OK=true
if ! check_server; then
  SERVER_OK=false
fi

if [ "${SERVER_OK}" = "false" ]; then
  echo ""
  echo "Cannot reach Ollama server. Start with: ollama serve"
  echo "If running on a non-default port, set: export OLLAMA_BASE_URL=http://127.0.0.1:<port>"
  echo ""
  echo "RESULT: UNHEALTHY (server unreachable)"
  exit 1
fi

# Get installed model list from /api/tags
INSTALLED_LIST=$(get_installed_models)

echo ""

# Check required models
MISSING_COUNT=0
for model in "${REQUIRED_MODELS[@]}"; do
  if ! check_model "${model}" "${INSTALLED_LIST}"; then
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

# Check optional models (informational only)
echo ""
echo "Optional models:"
for model in "${OPTIONAL_MODELS[@]}"; do
  if echo "${INSTALLED_LIST}" | grep -q "${model}"; then
    echo "OK    ${model}  PRESENT  [optional]"
  else
    echo "INFO  ${model}  MISSING  [optional — pull: ollama pull ${model}]"
    echo "      NOTE: deepseek-coder-v2:33b requires ~20 GB VRAM. Only pull if available."
    echo "      See ARCH-001 in docs/tech-stack/ollama-model-fleet.md"
  fi
done

echo ""

# Final result
if [ "${MISSING_COUNT}" -gt 0 ]; then
  echo "RESULT: UNHEALTHY — ${MISSING_COUNT} required model(s) missing"
  echo ""
  echo "To pull all required models:"
  echo "  ./scripts/setup-ollama-models.sh"
  echo ""
  echo "To pull lite fleet only (Tier 3 minimum):"
  echo "  ./scripts/setup-ollama-models.sh --lite"
  exit 1
else
  echo "RESULT: HEALTHY — server reachable, all required models present"
  exit 0
fi
