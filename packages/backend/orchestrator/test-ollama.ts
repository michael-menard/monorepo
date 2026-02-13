#!/usr/bin/env node
/**
 * Test LangGraph Workflows with Ollama
 *
 * This script demonstrates:
 * 1. Ollama availability check
 * 2. Model assignment verification
 * 3. Simple story creation workflow
 * 4. Elaboration workflow with actual story file
 */

import { isOllamaAvailable, getLLMForAgent, getModelInfoForAgent } from './dist/config/index.js'
import { runStoryCreation } from './dist/graphs/story-creation.js'
import * as fs from 'fs'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

async function main() {
  console.log(`${colors.cyan}=== LangGraph + Ollama Test Suite ===${colors.reset}\n`)

  // Test 1: Check Ollama availability
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
    { name: 'code-review-lint', expected: 'ollama' },
    { name: 'story-fanout-pm', expected: 'claude' },
    { name: 'dev-implement-backend-coder', expected: 'ollama' },
    { name: 'story-attack', expected: 'claude' },
  ]

  for (const agent of testAgents) {
    const info = getModelInfoForAgent(agent.name)
    const symbol = info.provider === agent.expected ? '✅' : '⚠️'
    const color = info.provider === agent.expected ? colors.green : colors.yellow

    console.log(`  ${symbol} ${agent.name}:`)
    console.log(`     Provider: ${color}${info.provider}${colors.reset}`)
    console.log(`     Model: ${info.modelName}`)
  }

  console.log()

  // Test 3: Simple story creation (minimal)
  console.log(`${colors.blue}[Test 3] Testing story creation workflow...${colors.reset}`)
  console.log('Creating a minimal test story to verify workflow execution...\n')

  try {
    const result = await runStoryCreation(
      {
        domain: 'test/ollama',
        description: 'Test story to validate LangGraph + Ollama integration',
        stakeholder: 'Engineering',
        priority: 'low' as const,
      },
      null, // No baseline
      {
        // Minimal config for quick test
        autoApprovalThreshold: 0, // Force through even if low score
        minReadinessScore: 0,
        maxAttackIterations: 1,
        requireHiTL: false, // Skip human approval
        parallelFanout: true,
        nodeTimeoutMs: 60000, // 60 second timeout
        persistToDb: false,
      }
    )

    if (result.success) {
      console.log(`${colors.green}✅ Story creation successful!${colors.reset}`)
      console.log(`   Story ID: ${result.storyId}`)
      console.log(`   Readiness Score: ${result.readinessScore}/100`)
      console.log(`   Duration: ${result.durationMs}ms`)

      if (result.synthesizedStory) {
        console.log(`\n   Title: ${result.synthesizedStory.title}`)
        console.log(`   Priority: ${result.synthesizedStory.priority}`)

        if (result.synthesizedStory.acceptanceCriteria && result.synthesizedStory.acceptanceCriteria.length > 0) {
          console.log(`\n   Acceptance Criteria:`)
          result.synthesizedStory.acceptanceCriteria.slice(0, 3).forEach((ac, i) => {
            console.log(`     ${i + 1}. ${ac}`)
          })
          if (result.synthesizedStory.acceptanceCriteria.length > 3) {
            console.log(`     ... and ${result.synthesizedStory.acceptanceCriteria.length - 3} more`)
          }
        }
      }
    } else {
      console.log(`${colors.red}❌ Story creation failed${colors.reset}`)
      console.log(`   Phase: ${result.phase}`)
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors:`)
        result.errors.forEach(err => {
          console.log(`     - [${err.code}] ${err.message}`)
        })
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Story creation threw error:${colors.reset}`)
    console.log(error)
  }

  console.log()

  // Test 4: Model usage analysis
  console.log(`${colors.blue}[Test 4] Analyzing model usage for cost estimation...${colors.reset}`)
  console.log('Estimating which models would be used in a full workflow:\n')

  const workflowAgents = [
    { phase: 'Setup', agent: 'elab-setup-leader' },
    { phase: 'PM Gap Analysis', agent: 'story-fanout-pm' },
    { phase: 'UX Gap Analysis', agent: 'story-fanout-ux' },
    { phase: 'QA Gap Analysis', agent: 'story-fanout-qa' },
    { phase: 'Attack Analysis', agent: 'story-attack' },
    { phase: 'Readiness Scoring', agent: 'story-readiness-score' },
    { phase: 'Synthesis', agent: 'story-synthesize' },
    { phase: 'Code Review - Lint', agent: 'code-review-lint' },
    { phase: 'Code Review - Security', agent: 'code-review-security' },
    { phase: 'Code Generation', agent: 'dev-implement-backend-coder' },
  ]

  let ollamaCount = 0
  let claudeCount = 0

  workflowAgents.forEach(({ phase, agent }) => {
    const info = getModelInfoForAgent(agent)
    const isOllama = info.provider === 'ollama'
    const symbol = isOllama ? '💰' : '💵'
    const color = isOllama ? colors.green : colors.yellow

    console.log(`  ${symbol} ${phase.padEnd(25)} → ${color}${info.provider}${colors.reset} (${info.modelName})`)

    if (isOllama) ollamaCount++
    else claudeCount++
  })

  const ollamaPercent = Math.round((ollamaCount / workflowAgents.length) * 100)
  console.log()
  console.log(`${colors.cyan}Cost Optimization:${colors.reset}`)
  console.log(`  Ollama (free): ${ollamaCount}/${workflowAgents.length} phases (${ollamaPercent}%)`)
  console.log(`  Claude (paid): ${claudeCount}/${workflowAgents.length} phases (${100 - ollamaPercent}%)`)
  console.log()

  const estimatedSavings = Math.round((ollamaCount / workflowAgents.length) * 100)
  console.log(`  Estimated cost reduction: ~${estimatedSavings}%`)

  console.log()
  console.log(`${colors.cyan}=== Tests Complete ===${colors.reset}`)
  console.log()
  console.log('Next steps:')
  console.log('  1. Review model assignments in .claude/config/model-assignments.yaml')
  console.log('  2. Test with real story: import { runElaboration } from "./dist/graphs/elaboration.js"')
  console.log('  3. Build file adapter bridge (see MIGRATION_STRATEGY.md)')
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})
