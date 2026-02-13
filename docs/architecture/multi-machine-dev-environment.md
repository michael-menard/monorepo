# Multi-Machine Development Environment

## Overview

A three-machine local development environment that separates concerns between developer workstation, AI orchestration, and model inference. Designed to eliminate subscription caps, minimize cloud API costs, and provide uncapped throughput for AI-assisted development workflows.

## Architecture

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  MacBook 18GB        │    │  Mac Studio 32GB     │    │  Mac Studio 64GB     │
│  "The Workstation"   │    │  "The Brain"         │    │  "The Engine"        │
│                      │    │                      │    │                      │
│  IDE / Editor        │    │  LangGraph runtime   │    │  Ollama server       │
│  Browser / DevTools  │    │  MCP servers         │    │  qwen2.5-coder:32b   │
│  Git operations      │    │  Tool execution      │    │  deepseek-r1:32b     │
│  Terminal            │    │  Agent orchestration  │    │                      │
│  SSH into Brain      │    │  OpenRouter routing   │    │  Headless            │
│                      │    │                      │    │  Always on           │
│  Portable            │    │  Always on           │    │                      │
└──────┬───────────────┘    └──────┬───────────────┘    └──────────────────────┘
       │                           │                            ▲
       │      SSH / API            │       Ollama API           │
       └──────────────────────────►│  ◄─────────────────────────┘
                                   │
                                   │       OpenRouter API
                                   ├──────────────────────────► Sonnet 4.5
                                   └──────────────────────────► Opus 4.6
```

## Machines

### MacBook 18GB - "The Workstation"

- **Role:** Developer interface. Where you write code, review output, interact with the system.
- **Runs:** IDE/editor, browser, terminal, git
- **Always on:** No. Open the lid and work from anywhere in the house.
- **Network:** Connects to The Brain via SSH or API calls over LAN
- **Why 18GB is enough:** No models, no orchestration. Just a thin client into the Brain.

### Mac Studio 32GB - "The Brain"

- **Role:** AI orchestration and tool execution. Runs the LangGraph workflows that coordinate local models and cloud APIs.
- **Runs:**
  - LangGraph runtime (workflow graphs, agent state management)
  - MCP servers (tool execution: git, file I/O, database, etc.)
  - OpenRouter API routing (decides which model handles each task)
  - Agent coordination (parallel sub-agents, result aggregation)
- **Always on:** Yes. Headless, tucked away with power and ethernet.
- **Why 32GB is enough:** Orchestration is CPU/network-bound, not memory-bound. LangGraph, MCP servers, and routing logic are lightweight.

### Mac Studio 64GB - "The Engine"

- **Role:** Dedicated local model inference. Serves models over Ollama's HTTP API.
- **Runs:**
  - Ollama server (`OLLAMA_HOST=0.0.0.0`, `OLLAMA_MAX_LOADED_MODELS=2`)
  - `qwen2.5-coder:32b` (~20GB) - coding tasks
  - `deepseek-r1:32b` (~20GB) - reasoning tasks
  - Both models loaded simultaneously (~40GB, 24GB headroom)
- **Always on:** Yes. Headless, no display/keyboard needed.
- **Why 64GB:** Fits two 32B models simultaneously with headroom. No model swapping delays. M4 Max provides 546 GB/s memory bandwidth for fast inference.

## Model Routing Strategy

### Tier 1 - Local (Free, Uncapped)

| Model | RAM | Tasks |
|---|---|---|
| qwen2.5-coder:32b | ~20GB | Code generation, test writing, boilerplate, lint/pattern checks, refactoring |
| deepseek-r1:32b | ~20GB | Story drafting, backlog grooming, bug hunting, exploration, elaboration (first pass) |

### Tier 2 - Sonnet 4.5 via OpenRouter (Cheap)

- **Pricing:** ~$3/M input tokens, ~$15/M output tokens
- **Tasks:** Elaboration (when local isn't sufficient), gap analysis, code review synthesis, decision gates, QA verification

### Tier 3 - Opus 4.6 via OpenRouter (Rare)

- **Pricing:** ~$15/M input tokens, ~$75/M output tokens
- **Tasks:** Architectural decisions, conflict resolution, ambiguous problems, novel challenges
- **Expected usage:** ~5% of total workflow calls

### Routing Logic

```
incoming task
│
├── Is it mechanical / code gen / pattern matching?
│   └── YES → Tier 1: Local (qwen2.5-coder:32b)
│
├── Is it reasoning / drafting / exploration?
│   └── YES → Tier 1: Local (deepseek-r1:32b)
│
├── Is it judgment / synthesis / structured analysis?
│   └── YES → Tier 2: Sonnet 4.5 (OpenRouter)
│
├── Is it genuinely ambiguous / architectural / novel?
│   └── YES → Tier 3: Opus 4.6 (OpenRouter)
│
└── Fallback: Start at lowest viable tier, escalate if quality insufficient
```

## Workflow Task Mapping

| Workflow Task | Model | Tier |
|---|---|---|
| Code generation | qwen2.5-coder:32b | Local |
| Test generation | qwen2.5-coder:32b | Local |
| Lint / style / pattern checks | qwen2.5-coder:32b | Local |
| Commit message generation | qwen2.5-coder:32b | Local |
| Story drafting | deepseek-r1:32b | Local |
| Backlog grooming | deepseek-r1:32b | Local |
| Bug hunting / exploration | deepseek-r1:32b | Local |
| Elaboration (first pass) | deepseek-r1:32b | Local |
| Elaboration (escalated) | Sonnet 4.5 | OpenRouter |
| Gap analysis | Sonnet 4.5 | OpenRouter |
| Code review synthesis | Sonnet 4.5 | OpenRouter |
| Decision gates | Sonnet 4.5 | OpenRouter |
| QA verification | Sonnet 4.5 | OpenRouter |
| Architectural decisions | Opus 4.6 | OpenRouter |
| Conflict resolution | Opus 4.6 | OpenRouter |

## Cost Estimates

### One-Time

| Item | Cost |
|---|---|
| Mac Studio M4 Max 64GB | ~$2,800 |
| MacBook (if not already owned) | Varies |
| Mac Studio 32GB | Already owned |

### Monthly Operating

| Item | Estimated Cost |
|---|---|
| Electricity (two Mac Studios, always on) | $10-15 |
| OpenRouter - Sonnet 4.5 | $30-60 |
| OpenRouter - Opus 4.6 | $10-30 |
| Claude subscription | $0 |
| **Total** | **$50-105/mo** |

### Compared to Current Setup

| | Current | New |
|---|---|---|
| Claude Max 20x subscription | $200/mo | $0 |
| Rate limited | Yes (5-hour windows, weekly caps) | No |
| OpenRouter | $0 | $40-90/mo |
| Local inference | None | Free, uncapped |
| **Monthly total** | **$200 + cap frustration** | **$50-105, no caps** |

## Network Configuration

### The Engine (Mac Studio 64GB)

```bash
# /etc/launchd configuration or ~/.zshrc
export OLLAMA_HOST=0.0.0.0
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_MAX_LOADED_MODELS=2

# Ollama API available at http://<engine-ip>:11434
```

### The Brain (Mac Studio 32GB)

```bash
# LangGraph config points to local Engine for inference
OLLAMA_BASE_URL=http://<engine-ip>:11434

# OpenRouter for cloud models
OPENROUTER_API_KEY=<key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### The Workstation (MacBook)

```bash
# SSH config for easy access
# ~/.ssh/config
Host brain
  HostName <brain-ip>
  User michael

Host engine
  HostName <engine-ip>
  User michael
```

## Setup Checklist

### The Engine (Mac Studio 64GB)

- [ ] Purchase Mac Studio M4 Max 64GB
- [ ] Install Ollama
- [ ] Pull models: `ollama pull qwen2.5-coder:32b && ollama pull deepseek-r1:32b`
- [ ] Configure `OLLAMA_HOST=0.0.0.0` for network access
- [ ] Configure `OLLAMA_MAX_LOADED_MODELS=2`
- [ ] Set up as headless (auto-login, Ollama as launch daemon)
- [ ] Assign static IP or hostname on local network

### The Brain (Mac Studio 32GB)

- [ ] Install LangGraph runtime
- [ ] Configure MCP servers
- [ ] Set up OpenRouter API key with budget alerts
- [ ] Configure model routing (Ollama base URL + OpenRouter base URL)
- [ ] Build/adapt workflow graphs to route tasks by tier
- [ ] Set up as headless (auto-login, services as launch daemons)
- [ ] Assign static IP or hostname on local network

### The Workstation (MacBook)

- [ ] Configure SSH access to Brain and Engine
- [ ] Set up IDE with remote development capabilities
- [ ] Configure git to work against repos on Brain (or shared via network)

### OpenRouter

- [ ] Create OpenRouter account
- [ ] Add payment method
- [ ] Set monthly budget alert ($100 or preferred ceiling)
- [ ] Generate API key

## Future Upgrades

| Upgrade | When | Impact |
|---|---|---|
| Swap Engine to 96GB M3 Ultra | When budget allows or 64GB feels limiting | Run 70B reasoning models locally, 45% faster inference |
| Add second Engine | Heavy parallel workloads | Dedicate one to coding, one to reasoning |
| Better local models | As they release | Drop-in replacement, just `ollama pull` |
| Reduce OpenRouter tier | As local models improve | More tasks move to free tier over time |
