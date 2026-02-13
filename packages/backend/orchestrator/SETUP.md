# Setup Guide - Hybrid Ollama/Claude Orchestrator

Complete setup guide for running LangGraph workflows with hybrid Ollama (local) and Claude (external) models.

## Quick Start

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull Models

Run the setup script (recommended):

```bash
cd packages/backend/orchestrator
./setup-ollama.sh
```

Or manually:

```bash
ollama serve  # In one terminal

# In another terminal, pull models
ollama pull deepseek-coder-v2:33b    # Best coding model you can run (~20GB RAM)
ollama pull qwen2.5-coder:7b         # Fast routine tasks
ollama pull codellama:13b            # Mid-complexity tasks
ollama pull llama3.2:8b              # General purpose

# If memory constrained (<20GB available):
# ollama pull deepseek-coder-v2:16b  # Lighter alternative to :33b (~10GB RAM)
```

### 3. Configure Environment

Create `.env` in your project root:

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TEMPERATURE=0
OLLAMA_TIMEOUT_MS=60000

# Fallback to Claude when Ollama unavailable
OLLAMA_ENABLE_FALLBACK=true
OLLAMA_FALLBACK_MODEL=haiku
```

### 4. Verify Setup

```typescript
import { isOllamaAvailable, getLLMForAgent } from '@repo/orchestrator'

// Check Ollama
const available = await isOllamaAvailable()
console.log('Ollama available:', available)  // Should be true

// Check model assignments
const lintLLM = await getLLMForAgent('code-review-lint')
console.log('Lint model:', lintLLM.provider, lintLLM.model)
// Output: Lint model: ollama { model: 'qwen2.5-coder', tag: '7b', ... }

const gapLLM = await getLLMForAgent('story-fanout-pm')
console.log('PM gap model:', gapLLM.provider, gapLLM.model)
// Output: PM gap model: claude sonnet
```

### 5. Run a Workflow

```typescript
import { runStoryCreation } from '@repo/orchestrator'

const result = await runStoryCreation({
  domain: 'feat/user-auth',
  description: 'Add password reset functionality',
  stakeholder: 'Product Team',
  priority: 'high',
})

console.log('Story ID:', result.storyId)
console.log('Success:', result.success)
```

## Model Assignment Strategy

### Ollama (Local, Fast, Free)

Used for **routine, pattern-based tasks**:

- ✅ Code review (lint, syntax, style)
- ✅ Simple validation
- ✅ Status updates
- ✅ Documentation
- ✅ Template filling
- ✅ Code generation (with deepseek-coder-v2:33b, or :16b for constrained systems)

### Claude Sonnet (External, Reasoning)

Used for **gap analysis and decision making**:

- ✅ PM gap analysis (`story-fanout-pm`)
- ✅ UX gap analysis (`story-fanout-ux`)
- ✅ QA gap analysis (`story-fanout-qa`)
- ✅ Attack analysis (`story-attack`)
- ✅ Readiness scoring (`story-readiness-score`)
- ✅ Synthesis (`story-synthesize`)
- ✅ Security analysis
- ✅ Strategic planning

See [MODEL_STRATEGY.md](./MODEL_STRATEGY.md) for detailed rationale.

## Configuration Files

### Model Assignments

`.claude/config/model-assignments.yaml`:

```yaml
# Gap Analysis - KEEP ON CLAUDE
story-fanout-pm: sonnet
story-fanout-ux: sonnet
story-fanout-qa: sonnet
story-attack: sonnet
story-readiness-score: sonnet
story-synthesize: sonnet

# Routine Tasks - USE OLLAMA
code-review-lint: ollama:qwen2.5-coder:7b
code-review-syntax: ollama:qwen2.5-coder:7b
dev-implement-backend-coder: ollama:deepseek-coder-v2:33b  # or :16b if <20GB RAM
```

See the full file for all assignments.

## Cost Comparison

| Task | Ollama | Claude Sonnet |
|------|--------|---------------|
| Code lint review | Free | ~$0.003 |
| PM gap analysis | Not recommended | ~$0.015 |
| Code generation | Free | ~$0.010 |
| Synthesis | Not recommended | ~$0.020 |

**Estimated monthly savings**: ~50% (based on 100 stories/month)

## Workflow Guide

See documentation:

1. **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - How to run the workflows
2. **[MODEL_STRATEGY.md](./MODEL_STRATEGY.md)** - Model assignment rationale
3. **[README.md](./README.md)** - Architecture and concepts
4. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Syntax cheat sheet

## Troubleshooting

### Ollama Not Available

```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# If not, start it
ollama serve
```

### Model Not Found

```bash
# List installed models
ollama list

# Pull missing model
ollama pull qwen2.5-coder:7b
```

### Slow Performance

```bash
# Check system resources
top

# If memory constrained, use smaller models:
# - Switch deepseek-coder-v2:33b → deepseek-coder-v2:16b (first choice)
# - Or switch deepseek-coder-v2:16b → codellama:13b (more aggressive)
# - Or reduce concurrent workflows
```

### Fallback to Claude

If Ollama is unavailable, the system automatically falls back to Claude (haiku by default).

Check logs:
```
INFO: Ollama is not available
INFO: Falling back to Claude model: haiku
```

## Running Workflows

### Story Creation

```typescript
import { runStoryCreation } from '@repo/orchestrator'

const result = await runStoryCreation(
  {
    domain: 'feat/notifications',
    description: 'Email notifications for account activity',
    stakeholder: 'Security Team',
    priority: 'high',
  },
  null, // baseline (optional)
  {
    autoApprovalThreshold: 90,
    requireHiTL: false,
    parallelFanout: true,
  }
)
```

### Elaboration

```typescript
import { runElaboration } from '@repo/orchestrator'

const result = await runElaboration({
  storyId: 'FEAT-001',
  currentVersion: storyYaml,
})
```

### Metrics Collection

```typescript
import { runMetricsCollection } from '@repo/orchestrator'

const result = await runMetricsCollection({
  storyId: 'FEAT-001',
  metricsType: 'gap-analytics',
})
```

## Development

### Build

```bash
cd packages/backend/orchestrator
pnpm build
```

### Test

```bash
pnpm test
```

### Type Check

```bash
pnpm type-check
```

## Next Steps

1. ✅ Install Ollama: `brew install ollama`
2. ✅ Pull models: `./setup-ollama.sh`
3. ✅ Configure `.env`
4. ✅ Verify setup (code example above)
5. ✅ Run your first workflow
6. 📚 Read [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed examples

## Support

- **Model strategy questions**: See [MODEL_STRATEGY.md](./MODEL_STRATEGY.md)
- **Workflow usage**: See [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Architecture**: See [README.md](./README.md)
- **Quick syntax**: See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
