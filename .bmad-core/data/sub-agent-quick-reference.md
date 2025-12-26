<!-- Powered by BMAD™ Core -->

# Sub-Agent System Quick Reference

## 🚀 Ready-to-Use Commands

### Dev Agent (`@dev`)

```bash
# Implement 3 stories in parallel (instead of sequentially)
*parallel-develop stories=[1.1,1.2,1.3]
# Result: ~20 min instead of ~60 min (3x faster)

# Fix multiple bugs in parallel
*auto-fix issues=[bug-1,bug-2,bug-3]
# Result: All bugs fixed simultaneously

# Multi-specialist refactoring analysis
*swarm-refactor target=auth-system
# Spawns: architecture, security, performance specialists
```

### SM Agent (`@sm`)

```bash
# Create all epic stories in parallel
*explode-epic epic=user-authentication
# Result: 8 stories in ~15 min instead of ~2 hours (8x faster)

# Create multiple stories in parallel
*batch-create stories=[story-1,story-2,story-3]

# Validate epic completeness
*validate-epic epic=user-authentication
```

### QA Agent (`@qa`)

```bash
# Multi-specialist code review
*deep-review target=auth-system
# Spawns: security, performance, accessibility specialists
# Result: Comprehensive review in ~10 min instead of ~90 min (9x faster)

# Run test suites in parallel
*parallel-test suites=[unit,integration,e2e]

# Start background quality monitoring
*continuous-watch
```

## 📊 Agent Types

### Coordinators
- **dev-coordinator** - Orchestrates parallel development
- **sm-coordinator** - Orchestrates parallel story creation
- **qa-coordinator** - Orchestrates multi-specialist reviews

### Workers
- **dev-worker** - Implements individual stories autonomously
- **sm-story-worker** - Creates individual stories autonomously

### Specialists
- **security-specialist** - Security vulnerability analysis (OWASP, CWE)
- **performance-specialist** - Performance optimization (API, DB, frontend)
- **accessibility-specialist** - WCAG 2.1 AA compliance

## 🎯 Coordination Patterns

### 1. Coordinator-Worker (Parallel Tasks)
```
Coordinator
├── Worker 1 (Story 1.1)
├── Worker 2 (Story 1.2)
└── Worker 3 (Story 1.3)
```
**Use for:** Multiple similar tasks

### 2. Specialist Swarm (Multi-Perspective)
```
Coordinator
├── Security Specialist
├── Performance Specialist
└── Accessibility Specialist
```
**Use for:** Comprehensive analysis

### 3. Pipeline (Multi-Stage)
```
Stage 1: Analysis (parallel)
   ↓
Stage 2: Implementation (parallel)
   ↓
Stage 3: Testing (parallel)
```
**Use for:** Complex workflows

### 4. Persistent Watchers (Background)
```
Watcher Agent (continuous)
├── Monitors codebase
├── Detects issues
└── Reports findings
```
**Use for:** Continuous monitoring

## ⚡ Performance Gains

| Task | Sequential | Parallel | Speedup |
|------|-----------|----------|---------|
| 3 Stories | 60 min | 20 min | **3x** |
| 10 Stories | 150 min | 15 min | **10x** |
| Epic (8 stories) | 120 min | 15 min | **8x** |
| Deep Review | 90 min | 10 min | **9x** |

## 🔄 How It Works

1. **Initialization** - Coordinator analyzes request, identifies dependencies
2. **Spawning** - Coordinator spawns worker/specialist sub-agents
3. **Execution** - Workers execute autonomously, report progress
4. **Monitoring** - Coordinator tracks progress, resolves conflicts
5. **Aggregation** - Coordinator collects results, validates integration

## 📁 File Locations

```
.bmad-core/
├── agents/
│   ├── coordinators/     # Coordinator agents
│   ├── workers/          # Worker agents
│   └── specialists/      # Specialist agents
├── tasks/sub-agents/     # Coordination tasks
├── templates/sub-agents/ # Message templates
├── workflows/parallel/   # Parallel workflows
└── data/
    ├── sub-agent-architecture.md          # Technical architecture
    ├── sub-agent-usage-guide.md           # Detailed usage guide
    ├── sub-agent-implementation-status.md # Implementation tracker
    └── sub-agent-quick-reference.md       # This file

.bmad-state/
├── coordinators/  # Active coordinator state
├── workers/       # Active worker state
├── messages/      # Inter-agent messages
└── locks/         # Resource locks
```

## 🎓 Best Practices

### ✅ Good Use Cases
- Multiple independent stories
- Epic explosion (creating many stories)
- Large refactoring needing multi-perspective analysis
- Batch operations
- Time-sensitive deliveries

### ❌ Poor Use Cases
- Single story implementation
- Highly interdependent tasks
- Exploratory work requiring frequent user input
- Tasks requiring deep context sharing

### 💡 Tips
1. **Minimize Dependencies** - Independent work parallelizes better
2. **Clear Acceptance Criteria** - Reduces worker blockers
3. **Avoid Resource Conflicts** - Don't modify same files in parallel
4. **Trust the System** - Let workers work autonomously
5. **Monitor Progress** - Check dashboard periodically

## 🔍 Monitoring

Real-time dashboard shows:
- Worker status and progress
- Estimated time remaining
- Conflicts detected
- Quality metrics
- Overall completion percentage

## 🛠️ Troubleshooting

**Worker stuck?**
- Check `*monitor` for blocker reason
- Coordinator will escalate if needed

**Integration failures?**
- Run `*aggregate` manually
- Review integration report
- Fix conflicts and retry

**Performance issues?**
- Reduce `max_parallel_workers` in coordinator config
- Increase `progress_check_interval`

## 📚 Learn More

- **Architecture:** `.bmad-core/data/sub-agent-architecture.md`
- **Usage Guide:** `.bmad-core/data/sub-agent-usage-guide.md`
- **Status:** `.bmad-core/data/sub-agent-implementation-status.md`

