<!-- Powered by BMAD™ Core -->

# Simplified Story Workflow Guide

## 🎯 The Easiest Way to Implement Stories

You asked for a simpler way to implement stories without remembering all the steps. Here it is!

## ⚡ Quick Start

### One Command to Rule Them All

```bash
/implement 1.1
```

That's it! This single command handles:
- ✅ Story validation
- ✅ Development (code + tests)
- ✅ QA review
- ✅ Issue fixing
- ✅ Pull request creation

**Total time: 23-39 minutes** (depending on complexity)

---

## 📋 Command Options

### Basic Usage

```bash
# Simple story (default single-agent mode)
/implement 1.2

# Complex story (parallel sub-agents - faster!)
/implement 1.1 --parallel

# Multiple stories at once
/implement 1.1,1.2,1.3 --parallel

# ✨ NEW: Entire epic at once
/implement epic:3 --parallel --deep-review
```

### Quality Assurance Options

```bash
# Deep multi-specialist review (recommended for production)
/implement 1.1 --parallel --deep-review

# Quick review (faster, less comprehensive)
/implement 1.2 --quick-review

# Skip review (not recommended, use only for dev/test)
/implement 1.3 --skip-review
```

---

## 🎨 Real-World Examples

### Example 1: Add a Button (Simple)

```bash
/implement 2.3

# What happens:
# ✅ Validates story 2.3
# 🔨 Implements button component
# ✅ Writes tests
# 🔍 Quick QA review
# 📝 Creates PR
# ⏱️  Total: ~15 minutes
```

### Example 2: Login Page (Complex)

```bash
/implement 1.1 --parallel --deep-review

# What happens:
# ✅ Validates story 1.1
# 🚀 Spawns 3 workers (frontend, backend, tests)
# ⚡ All work in parallel (6 min instead of 15 min)
# 🔍 Deep review by 3 specialists:
#     - Security specialist
#     - Performance specialist
#     - Accessibility specialist
# 🔧 Auto-fixes any issues found
# 📝 Creates PR
# ⏱️  Total: ~23 minutes
```

### Example 3: Complete Authentication System (Epic - Manual List)

```bash
/implement 1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8 --parallel --deep-review

# What happens:
# ✅ Validates all 8 stories
# 🚀 Spawns 24 workers (3 per story)
# ⚡ All stories implemented simultaneously
# 🔍 Deep review of entire auth system
# 🔧 Auto-fixes issues across all stories
# 📝 Creates 8 PRs
# ⏱️  Total: ~80 minutes (vs 640 minutes sequential = 8x faster!)
```

---

### Example 4: Complete Epic (Automatic Discovery) ✨ NEW

```bash
/implement epic:3 --parallel --deep-review

# What happens:
# 🔍 Discovers all 29 stories in Epic 3
# 📊 Analyzes dependencies between stories
# 📋 Creates execution plan with waves:
#     Wave 1: Story 3.0.1 (foundation)
#     Wave 2: Stories 3.0.2-3.0.10, 3.1.1-3.1.4, 3.2.1-3.2.6, 3.3.1-3.3.4, 3.4.1-3.4.5
# 🚀 Spawns 29 workers
# ⚡ Coordinates parallel execution with dependency management
# 🔍 Deep review by security, performance, and accessibility specialists
# 🔧 Auto-fixes issues across all stories
# 📝 Creates 29 PRs
# ⏱️  Total: ~45 minutes (vs 290 minutes sequential = 6.4x faster!)
```

---

## 🤔 Which Mode Should I Use?

### Use Default (No Flags)

**When:**
- Simple UI changes
- Documentation updates
- Small bug fixes
- Single-file changes

**Example:**
```bash
/implement 2.5  # Add "Forgot Password" link
```

**Time:** ~15 minutes

---

### Use --parallel

**When:**
- Multi-component features
- Full-stack implementations
- Complex business logic
- Multiple related changes

**Example:**
```bash
/implement 1.1 --parallel  # Login page with API + tests
```

**Time:** ~23 minutes (vs 39 minutes = 1.7x faster)

---

### Use --deep-review

**When:**
- Security-sensitive features (auth, payments)
- Public-facing features
- Performance-critical paths
- Accessibility-required features
- Production deployments

**Example:**
```bash
/implement 1.1 --parallel --deep-review  # Login with comprehensive security review
```

**Time:** ~23 minutes (includes security, performance, accessibility analysis)

---

### Use Multiple Stories

**When:**
- Implementing an epic (but you know the exact story numbers)
- Related features that can be done together
- Batch work

**Example:**
```bash
/implement 1.1,1.2,1.3,1.4 --parallel --deep-review  # Complete auth epic
```

**Time:** ~80 minutes for 8 stories (vs 640 minutes = 8x faster)

---

### Use Epic Mode ✨ NEW

**When:**
- Implementing an entire epic at once
- You want automatic story discovery
- Epic has many stories (10+)
- You want dependency analysis and coordination

**Example:**
```bash
/implement epic:3 --parallel --deep-review  # All of Epic 3
```

**Time:** ~45 minutes for 29 stories (vs 290 minutes = 6.4x faster)

**Benefits:**
- ✅ Automatic story discovery (no need to list all stories)
- ✅ Dependency analysis and coordination
- ✅ Optimal execution plan with waves
- ✅ Epic-level integration testing
- ✅ Comprehensive summary report

---

## 📊 Time Comparison

| Scenario | Old Way | New Way | Speedup |
|----------|---------|---------|---------|
| Simple feature | 15 min | 15 min | Same |
| Complex feature | 39 min | 23 min | **1.7x faster** |
| 3 stories | 117 min | 30 min | **3.9x faster** |
| 8 stories (epic) | 640 min | 80 min | **8x faster** |

---

## 🎯 Recommended Workflows

### Daily Development

```bash
# Morning: Check what's next
@sm
*draft story=1.1

# Implement it
/implement 1.1 --parallel

# Done! PR created automatically
```

### Sprint Planning

```bash
# Create all epic stories
@sm
*explode-epic epic=user-authentication

# Implement all stories in parallel
/implement 1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8 --parallel --deep-review

# Done! 8 PRs created, ready for review
```

### Hotfix

```bash
# Create bug story
@sm
*draft story=bug-42

# Quick fix and deploy
/implement bug-42 --quick-review

# Done! PR created
```

---

## 🚨 What You'll See

### Progress Updates

```
🚀 Starting parallel sub-agent development...
📊 Spawning 3 workers for story 1.1...

[Worker 1] Frontend Component - Progress: 0%
[Worker 2] Backend API - Progress: 0%
[Worker 3] Tests - Progress: 0%

⏱️  2 minutes elapsed...
[Worker 1] Frontend Component - Progress: 50%
[Worker 2] Backend API - Progress: 75%
[Worker 3] Tests - Progress: 25%

⏱️  4 minutes elapsed...
[Worker 1] Frontend Component - Progress: 100% ✅
[Worker 2] Backend API - Progress: 100% ✅
[Worker 3] Tests - Progress: 100% ✅

✨ Integration complete in 6 minutes!
```

### QA Review Results

```
🔍 Starting deep multi-specialist review...
📊 Spawning 3 specialists...

[Security Specialist] Analyzing...
  ✅ No SQL injection vulnerabilities
  ✅ Authentication properly implemented
  ⚠️  HIGH: Add rate limiting to prevent brute force

[Performance Specialist] Analyzing...
  ✅ API response time: 45ms (target: <100ms)
  ✅ Bundle size: 125KB (target: <200KB)
  ✅ All performance budgets met

[Accessibility Specialist] Analyzing...
  ✅ WCAG 2.1 AA compliance: 100%
  ✅ Keyboard navigation working
  ⚠️  MEDIUM: Add aria-live region for error announcements

🚨 Found 0 critical and 1 high-priority issues
Auto-fix issues in parallel? (y/n):
```

### Final Summary

```
═══════════════════════════════════════════════════════
✨ Story Implementation Complete!
═══════════════════════════════════════════════════════

Story: 1.1
Mode: parallel
Review: deep

📊 Results:
  - Files changed: 8 files, 342 insertions(+), 12 deletions(-)
  - Tests added: 24
  - Coverage: 94%

🔍 QA Status: APPROVED

📝 Pull Request: https://github.com/org/repo/pull/42

═══════════════════════════════════════════════════════

Next steps:
  1. Review PR: gh pr view
  2. Merge PR: gh pr merge --squash
  3. Deploy: (your deployment process)
```

---

## 💡 Pro Tips

1. **Start simple** - Use default mode first, add `--parallel` when you need speed
2. **Always use --deep-review for production** - Security matters!
3. **Batch related stories** - Implement epics all at once with parallel mode
4. **Let it auto-fix** - When QA finds issues, say "y" to auto-fix
5. **Trust the process** - The workflow handles everything automatically

---

## 🆘 Troubleshooting

### "Story file not found"

```bash
# Create the story first
@sm
*draft story=1.1

# Then implement it
/story 1.1
```

### "Story not approved"

```bash
# Review and approve the story
@sm
*approve story=1.1

# Then implement it
/story 1.1
```

### "Critical issues found"

```bash
# Let the system auto-fix them
Auto-fix issues in parallel? (y/n): y

# Or fix manually and re-run
/implement 1.1 --parallel --deep-review
```

---

## 📚 Full Command Reference

### Slash Commands (One-Shot)

```bash
/implement {number}                    # Complete story workflow
/implement {number} --parallel         # Use parallel sub-agents
/implement {number} --deep-review      # Deep QA review
/implement {numbers} --parallel        # Multiple stories
/implement epic:{number} --parallel    # ✨ NEW: Entire epic
```

### Agent Commands (Persistent)

```bash
@dev
*implement story=1.1               # Same as /implement 1.1
*implement story=1.1 mode=parallel # Same as /implement 1.1 --parallel
*implement stories=[1.1,1.2,1.3]   # Same as /implement 1.1,1.2,1.3
*implement epic=3 mode=parallel    # ✨ NEW: Same as /implement epic:3 --parallel
```

---

## 🎉 Summary

**Before:** You had to remember 7 steps and multiple commands
**Now:** One command does everything

**Before:** 39 minutes per story
**Now:** 23 minutes per story (1.7x faster)

**Before:** 640 minutes for 8 stories
**Now:** 80 minutes for 8 stories (8x faster)

**The new way:**
```bash
/implement 1.1 --parallel --deep-review
```

**That's it!** 🚀



---

## 🚀 Try It Now!

```bash
# Start with a simple story
/implement 1.2

# Then try a complex one
/implement 1.1 --parallel --deep-review

# Then do an entire epic
/implement 1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8 --parallel --deep-review
```

**Welcome to the future of story implementation!** 🎉
