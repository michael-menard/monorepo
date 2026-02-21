#!/bin/bash
#
# DEPRECATED: This script is superseded by scripts/setup-ollama-models.sh
#
# Please use the canonical setup script instead:
#
#   ./scripts/setup-ollama-models.sh           # Full fleet
#   ./scripts/setup-ollama-models.sh --lite    # Tier 3 minimum only
#   ./scripts/setup-ollama-models.sh --help    # Options and environment variables
#
# The canonical script provides:
#   - --lite flag for Tier 3 minimum fleet (qwen2.5-coder:7b + llama3.2:8b)
#   - Post-install verification (exit 1 if required models missing)
#   - OLLAMA_BASE_URL env var support (no hardcoded URL)
#   - Structured --help output documenting all 4 env vars
#   - ARCH-001/ARCH-002 reconciliation of deepseek :16b/:33b and llama3.2 :8b/:3b
#
# This file is retained for reference only and will be removed in a future cleanup.
# WINT-0240: Introduced scripts/setup-ollama-models.sh as canonical replacement.
#
# Setup script for Ollama models
# Downloads all models specified in model-assignments.yaml
#

set -e

echo "=== Ollama Model Setup ==="
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed."
    echo ""
    echo "Install with:"
    echo "  macOS:   brew install ollama"
    echo "  Linux:   curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    exit 1
fi

echo "✓ Ollama is installed"

# Check if Ollama is running
if ! curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo ""
    echo "⚠️  Ollama server is not running"
    echo ""
    echo "Start with: ollama serve"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ Ollama server is running"
echo ""

# List of models from model-assignments.yaml
# NOTE: deepseek-coder-v2:33b is the best coding model but requires ~20GB RAM
# Use deepseek-coder-v2:16b if you have memory constraints
MODELS=(
    "deepseek-coder-v2:33b"
    "qwen2.5-coder:7b"
    "codellama:13b"
    "llama3.2:8b"
)

echo "Will pull ${#MODELS[@]} models:"
for model in "${MODELS[@]}"; do
    echo "  - $model"
done
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "=== Pulling Models ==="
echo ""

for model in "${MODELS[@]}"; do
    echo "Pulling $model..."
    ollama pull "$model"
    echo ""
done

echo "=== Setup Complete ==="
echo ""
echo "Installed models:"
ollama list
echo ""
echo "✓ All models ready!"
echo ""
echo "Next steps:"
echo "  1. Ensure Ollama is running: ollama serve"
echo "  2. Verify in code:"
echo ""
echo "     import { isOllamaAvailable } from '@repo/orchestrator'"
echo "     const available = await isOllamaAvailable()"
echo "     console.log('Ollama ready:', available)"
echo ""
