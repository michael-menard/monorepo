#!/usr/bin/env node
/**
 * Test Story Creation Workflow
 *
 * Demonstrates creating a new story using LangGraph with Ollama hybrid approach.
 *
 * Usage:
 *   node test-story-creation.ts
 */

import { runStoryCreation, loadModelAssignments } from './dist/index.js'
import { resolve } from 'path'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║        LangGraph Story Creation Test (Ollama Hybrid)      ║${colors.reset}`)
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`)

  // Load model assignments
  const configPath = resolve(process.cwd(), '../../../.claude/config/model-assignments.yaml')
  loadModelAssignments(configPath)
  console.log(`${colors.gray}📋 Config loaded: ${configPath}${colors.reset}\n`)

  // Story request (similar to INST-1008 example)
  const storyRequest = {
    domain: 'feat/api-integration',
    description: `
      Wire RTK Query Mutations for File Upload API.

      The backend has complete file upload endpoints with multipart support,
      but the frontend only has GET queries for listing files. Need to add
      RTK Query mutations for:
      - Uploading files (POST /api/files)
      - Updating file metadata (PATCH /api/files/:id)
      - Deleting files (DELETE /api/files/:id)

      Must include Zod validation, cache invalidation, optimistic updates,
      and error handling with rollback.
    `,
    stakeholder: 'Frontend Engineering Team',
    priority: 'high' as const,
  }

  console.log(`${colors.blue}📝 Story Request:${colors.reset}`)
  console.log(`   Domain: ${storyRequest.domain}`)
  console.log(`   Priority: ${storyRequest.priority}`)
  console.log(`   Stakeholder: ${storyRequest.stakeholder}`)
  console.log()

  // Workflow configuration
  const config = {
    autoApprovalThreshold: 0, // Force through for testing (no HiTL needed)
    minReadinessScore: 0,
    maxAttackIterations: 2, // Reduce for faster testing
    requireHiTL: false, // Skip human approval for demo
    parallelFanout: true, // Run PM/UX/QA in parallel (faster)
    nodeTimeoutMs: 90000, // 90 second timeout per node
    persistToDb: false, // No DB for demo
  }

  console.log(`${colors.yellow}⚙️  Configuration:${colors.reset}`)
  console.log(`   Parallel fanout: ${config.parallelFanout}`)
  console.log(`   Attack iterations: ${config.maxAttackIterations}`)
  console.log(`   Node timeout: ${config.nodeTimeoutMs}ms`)
  console.log()

  console.log(`${colors.cyan}🚀 Starting story creation workflow...${colors.reset}\n`)
  console.log(`${colors.gray}This will take ~60-90 seconds...${colors.reset}\n`)

  const startTime = Date.now()

  try {
    const result = await runStoryCreation(storyRequest, null, config)

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    if (result.success) {
      console.log(`\n${colors.green}✅ Story creation successful!${colors.reset}`)
      console.log(`${colors.gray}─────────────────────────────────────────────────────────${colors.reset}`)
      console.log(`   📌 Story ID: ${colors.cyan}${result.storyId}${colors.reset}`)
      console.log(`   📊 Readiness Score: ${colors.cyan}${result.readinessScore}/100${colors.reset}`)
      console.log(`   ⏱️  Duration: ${colors.cyan}${duration}s${colors.reset}`)
      console.log(`   🎯 Phase: ${colors.cyan}${result.phase}${colors.reset}`)

      if (result.synthesizedStory) {
        const story = result.synthesizedStory

        console.log(`\n${colors.blue}📄 Story Details:${colors.reset}`)
        console.log(`${colors.gray}─────────────────────────────────────────────────────────${colors.reset}`)
        console.log(`   Title: ${story.title || 'N/A'}`)
        console.log(`   Priority: ${story.priority || 'N/A'}`)
        console.log(`   Type: ${story.type || 'N/A'}`)

        if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
          console.log(`\n${colors.blue}✓ Acceptance Criteria (${story.acceptanceCriteria.length}):${colors.reset}`)
          story.acceptanceCriteria.slice(0, 5).forEach((ac, i) => {
            console.log(`   ${i + 1}. ${ac}`)
          })
          if (story.acceptanceCriteria.length > 5) {
            console.log(`   ${colors.gray}... and ${story.acceptanceCriteria.length - 5} more${colors.reset}`)
          }
        }

        if (story.pmGaps) {
          console.log(`\n${colors.yellow}📊 PM Analysis:${colors.reset}`)
          console.log(`   Gaps identified: ${story.pmGaps.gaps?.length || 0}`)
          if (story.pmGaps.recommendations && story.pmGaps.recommendations.length > 0) {
            console.log(`   Recommendations: ${story.pmGaps.recommendations.length}`)
            console.log(`     → ${story.pmGaps.recommendations[0]?.text || 'N/A'}`)
          }
        }

        if (story.uxGaps) {
          console.log(`\n${colors.yellow}🎨 UX Analysis:${colors.reset}`)
          console.log(`   Gaps identified: ${story.uxGaps.gaps?.length || 0}`)
          if (story.uxGaps.recommendations && story.uxGaps.recommendations.length > 0) {
            console.log(`   Recommendations: ${story.uxGaps.recommendations.length}`)
          }
        }

        if (story.qaGaps) {
          console.log(`\n${colors.yellow}🧪 QA Analysis:${colors.reset}`)
          console.log(`   Gaps identified: ${story.qaGaps.gaps?.length || 0}`)
          if (story.qaGaps.testScenarios && story.qaGaps.testScenarios.length > 0) {
            console.log(`   Test scenarios: ${story.qaGaps.testScenarios.length}`)
          }
        }
      }

      console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`)
      console.log(`${colors.green}SUCCESS - Story ready for elaboration${colors.reset}`)
      console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`)

    } else {
      console.log(`\n${colors.red}❌ Story creation failed${colors.reset}`)
      console.log(`   Phase: ${result.phase}`)
      console.log(`   Duration: ${duration}s`)

      if (result.errors && result.errors.length > 0) {
        console.log(`\n${colors.red}Errors:${colors.reset}`)
        result.errors.forEach(err => {
          console.log(`   • [${err.code || 'UNKNOWN'}] ${err.message || 'No message'}`)
        })
      }
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n${colors.red}❌ Workflow threw exception after ${duration}s${colors.reset}`)
    console.error(error)
  }

  console.log()
  console.log(`${colors.gray}Next: Try test-elaboration.ts to test story refinement${colors.reset}`)
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})
