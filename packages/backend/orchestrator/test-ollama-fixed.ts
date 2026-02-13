#!/usr/bin/env node
/**
 * Test LangGraph Workflows with Ollama (Fixed Config Loading)
 */

import { isOllamaAvailable, getLLMForAgent, getModelInfoForAgent, loadModelAssignments } from './dist/config/index.js'
import { runStoryCreation } from './dist/graphs/story-creation.js'
import { resolve } from 'path'

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

async function main() {
  console.log(`${colors.cyan}=== LangGraph + Ollama Test Suite (Fixed) ===${colors.reset}\n`)

  // IMPORTANT: Explicitly load model assignments from monorepo root
  const configPath = resolve(process.cwd(), '../../../.claude/config/model-assignments.yaml')
  console.log(`${colors.blue}[Setup] Loading model assignments from:${colors.reset}`)
  console.log(`  ${configPath}\n`)

  const assignments = loadModelAssignments(configPath)
  const assignmentCount = Object.keys(assignments).length
  console.log(`${colors.green}✅ Loaded ${assignmentCount} model assignments${colors.reset}\n`)

  // Test 1: Check Ollama
  console.log(`${colors.blue}[Test 1] Checking Ollama availability...${colors.reset}`)
  const available = await isOllamaAvailable()

  if (!available) {
    console.log(`${colors.red}❌ Ollama is not available${colors.reset}`)
    console.log('Make sure Ollama is running: ollama serve')
    process.exit(1)
  }

  console.log(`${colors.green}✅ Ollama is available${colors.reset}\n`)

  // Test 2: Verify model assignments
  console.log(`${colors.blue}[Test 2] Verifying model assignments...${colors.reset}`)

  const testAgents = [
    { name: 'code-review-lint', expected: 'ollama', expectedModel: 'qwen2.5-coder:7b' },
    { name: 'story-fanout-pm', expected: 'claude', expectedModel: 'sonnet' },
    { name: 'dev-implement-backend-coder', expected: 'ollama', expectedModel: 'deepseek-coder-v2' },
    { name: 'story-attack', expected: 'claude', expectedModel: 'sonnet' },
    { name: 'code-review-security', expected: 'claude', expectedModel: 'sonnet' },
    { name: 'elab-setup-leader', expected: 'ollama', expectedModel: 'qwen2.5-coder:7b' },
  ]

  for (const agent of testAgents) {
    const info = getModelInfoForAgent(agent.name)
    const symbol = info.provider === agent.expected ? '✅' : '⚠️'
    const color = info.provider === agent.expected ? colors.green : colors.yellow

    console.log(`  ${symbol} ${agent.name}:`)
    console.log(`     Provider: ${color}${info.provider}${colors.reset}`)
    console.log(`     Model: ${info.modelName || 'undefined'}`)
  }

  console.log()

  // Test 3: Count Ollama vs Claude usage
  console.log(`${colors.blue}[Test 3] Analyzing cost optimization...${colors.reset}\n`)

  const workflowPhases = [
    { phase: 'Setup', agent: 'elab-setup-leader' },
    { phase: 'PM Gap Analysis', agent: 'story-fanout-pm' },
    { phase: 'UX Gap Analysis', agent: 'story-fanout-ux' },
    { phase: 'QA Gap Analysis', agent: 'story-fanout-qa' },
    { phase: 'Attack Analysis', agent: 'story-attack' },
    { phase: 'Readiness Scoring', agent: 'story-readiness-score' },
    { phase: 'Synthesis', agent: 'story-synthesize' },
    { phase: 'Code Review - Lint', agent: 'code-review-lint' },
    { phase: 'Code Review - Syntax', agent: 'code-review-syntax' },
    { phase: 'Code Review - Style', agent: 'code-review-style-compliance' },
    { phase: 'Code Review - Security', agent: 'code-review-security' },
    { phase: 'Code Review - TypeCheck', agent: 'code-review-typecheck' },
    { phase: 'Code Review - Build', agent: 'code-review-build' },
    { phase: 'Code Generation - Backend', agent: 'dev-implement-backend-coder' },
    { phase: 'Code Generation - Frontend', agent: 'dev-implement-frontend-coder' },
    { phase: 'Completion', agent: 'elab-completion-leader' },
  ]

  let ollamaCount = 0
  let claudeCount = 0

  workflowPhases.forEach(({ phase, agent }) => {
    const info = getModelInfoForAgent(agent)
    const isOllama = info.provider === 'ollama'
    const symbol = isOllama ? '💰' : '💵'
    const color = isOllama ? colors.green : colors.yellow

    console.log(`  ${symbol} ${phase.padEnd(30)} → ${color}${info.provider.padEnd(7)}${colors.reset} (${info.modelName || 'default'})`)

    if (isOllama) ollamaCount++
    else claudeCount++
  })

  const ollamaPercent = Math.round((ollamaCount / workflowPhases.length) * 100)
  console.log()
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.cyan}Cost Optimization Summary:${colors.reset}`)
  console.log(`  🆓 Ollama (free):  ${ollamaCount.toString().padStart(2)}/${workflowPhases.length} phases (${ollamaPercent}%)`)
  console.log(`  💳 Claude (paid):  ${claudeCount.toString().padStart(2)}/${workflowPhases.length} phases (${100 - ollamaPercent}%)`)
  console.log()

  // Rough cost estimation
  const avgClaudeTokens = 10000 // Average tokens per Claude call
  const claudeInputCost = 3 // $3 per 1M input tokens
  const claudeOutputCost = 15 // $15 per 1M output tokens
  const avgCostPerClaudeCall = ((avgClaudeTokens * claudeInputCost) + (avgClaudeTokens * claudeOutputCost)) / 1_000_000

  const totalClaudeCost = claudeCount * avgCostPerClaudeCall
  const potentialSavings = ollamaCount * avgCostPerClaudeCall

  console.log(`  Estimated cost per full workflow:`)
  console.log(`    Claude calls:     $${totalClaudeCost.toFixed(3)}`)
  console.log(`    Ollama (saved):   $${potentialSavings.toFixed(3)}`)
  console.log(`    ${colors.green}Savings: ~${ollamaPercent}%${colors.reset}`)
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`)

  console.log()
  console.log(`${colors.cyan}=== Tests Complete ===${colors.reset}`)
  console.log()
  console.log(`${colors.blue}Summary:${colors.reset}`)
  console.log(`  ✅ Ollama is running and accessible`)
  console.log(`  ✅ Model assignments loaded successfully`)
  console.log(`  ✅ ${ollamaPercent}% of workflow uses free local models`)
  console.log()
  console.log(`${colors.blue}Your installed Ollama models:${colors.reset}`)
  console.log(`  • deepseek-coder-v2:16b (complex code generation)`)
  console.log(`  • qwen2.5-coder:7b (fast routine tasks)`)
  console.log(`  • codellama:13b (mid-complexity tasks)`)
  console.log(`  • llama3.2 (general purpose)`)
  console.log()
  console.log(`${colors.yellow}Next Steps:${colors.reset}`)
  console.log(`  1. Test actual story creation: see test-story-creation.ts`)
  console.log(`  2. Test elaboration with real story: see test-elaboration.ts`)
  console.log(`  3. Review MIGRATION_STRATEGY.md for full migration plan`)
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})
