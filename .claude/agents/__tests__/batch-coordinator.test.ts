/**
 * Unit tests for batch-coordinator agent file content
 *
 * Validates agent spec structure, routing table completeness, sequential
 * processing model, KB-native state management, retry budget, and token cap
 * handling by reading the agent markdown file directly.
 *
 * @see WINT-6010 AC-1 through AC-11
 * @see .claude/agents/batch-coordinator.agent.md
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const AGENT_PATH = resolve(__dirname, '..', 'batch-coordinator.agent.md')
const content = readFileSync(AGENT_PATH, 'utf-8')

describe('batch-coordinator.agent.md', () => {
  describe('AC-1: Agent file structure', () => {
    it('has valid YAML frontmatter', () => {
      expect(content).toMatch(/^---\n/)
      expect(content).toMatch(/\nname: batch-coordinator\n/)
      expect(content).toMatch(/\ntype: leader\n/)
      expect(content).toMatch(/\nmodel: sonnet\n/)
    })

    it('declares required KB tools', () => {
      expect(content).toContain('kb_list_stories')
      expect(content).toContain('kb_update_story_status')
      expect(content).toContain('kb_get_story')
    })

    it('references shared docs', () => {
      expect(content).toContain('kb-integration.md')
      expect(content).toContain('decision-handling.md')
    })

    it('has permission_level: orchestrator', () => {
      expect(content).toMatch(/\npermission_level: orchestrator\n/)
    })

    it('has version 1.0.0', () => {
      expect(content).toMatch(/\nversion: 1\.0\.0\n/)
    })

    it('declares Task and TaskOutput tools', () => {
      expect(content).toContain('Task')
      expect(content).toContain('TaskOutput')
    })
  })

  describe('AC-2 / AC-3: KB query for actionable stories', () => {
    it('defines all actionable states', () => {
      const actionableStates = [
        'backlog',
        'created',
        'elab',
        'ready',
        'in_progress',
        'needs_code_review',
        'failed_code_review',
      ]
      for (const state of actionableStates) {
        expect(content).toContain(state)
      }
    })

    it('lists excluded states', () => {
      expect(content).toContain('cancelled')
      expect(content).toContain('deferred')
      expect(content).toContain('blocked')
    })

    it('uses kb_list_stories for querying', () => {
      expect(content).toContain('kb_list_stories')
    })

    it('applies max_stories cap to queue', () => {
      expect(content).toMatch(/max_stories/)
    })
  })

  describe('AC-4: Inputs — plan_slugs, max_stories, dry_run', () => {
    it('declares plan_slugs as required input', () => {
      expect(content).toMatch(/plan_slugs/)
    })

    it('declares max_stories with default 20', () => {
      expect(content).toMatch(/max_stories/)
      expect(content).toMatch(/20/)
    })

    it('declares dry_run with default false', () => {
      expect(content).toMatch(/dry_run/)
      expect(content).toMatch(/false/)
    })

    it('defines invocation interface via Task tool', () => {
      expect(content).toContain('Task tool')
      expect(content).toContain('batch-coordinator.agent.md')
    })
  })

  describe('AC-5: Finish-started-first priority ordering', () => {
    it('prioritizes in_progress stories with state priority 0', () => {
      expect(content).toMatch(/finish.started/i)
      const inProgressIdx = content.indexOf('in_progress: 0')
      const readyIdx = content.indexOf('ready: 3')
      expect(inProgressIdx).toBeGreaterThan(-1)
      expect(readyIdx).toBeGreaterThan(-1)
      expect(inProgressIdx).toBeLessThan(readyIdx)
    })

    it('defines PRIORITY_ORDER constant with all states', () => {
      expect(content).toContain('PRIORITY_ORDER')
      expect(content).toMatch(/needs_code_review: 1/)
      expect(content).toMatch(/failed_code_review: 2/)
    })
  })

  describe('AC-6: State-to-agent routing table', () => {
    it('maps all required states to worker commands', () => {
      for (const state of [
        'backlog',
        'created',
        'elab',
        'ready',
        'in_progress',
        'needs_code_review',
        'failed_code_review',
      ]) {
        expect(content).toContain(state)
      }
    })

    it('routes to correct worker commands', () => {
      expect(content).toContain('/elab-story')
      expect(content).toContain('/dev-implement-story')
      expect(content).toContain('/dev-code-review')
      expect(content).toContain('/dev-fix-story')
    })

    it('uses --autonomous flag for elab worker', () => {
      expect(content).toContain('--autonomous')
    })

    it('uses --autonomous=aggressive for implement worker', () => {
      expect(content).toContain('--autonomous=aggressive')
    })

    it('uses --force-continue for in_progress resume', () => {
      expect(content).toContain('--force-continue')
    })
  })

  describe('AC-7: Sequential processing', () => {
    it('enforces sequential processing model', () => {
      expect(content).toMatch(/sequential/i)
      expect(content).toMatch(/one story at a time/i)
    })

    it('does NOT reference background spawning', () => {
      expect(content).not.toMatch(/run_in_background:\s*true/)
    })

    it('awaits each worker before starting next', () => {
      expect(content).toMatch(/await/i)
    })

    it('includes state guard in processing loop', () => {
      expect(content).toMatch(/state.*guard|guard.*state|STATE GUARD|re-read.*state|check.*state/i)
    })

    it('defines worker result parsing', () => {
      expect(content).toMatch(/parseWorkerResult|parse.*worker|worker.*result/i)
    })
  })

  describe('AC-8: KB-native state management + self-healing', () => {
    it('uses kb_update_story_status for state changes', () => {
      expect(content).toContain('kb_update_story_status')
    })

    it('does NOT use flat-file tracking', () => {
      expect(content).not.toContain('WORK-ORDER')
      expect(content).not.toContain('RESULT_DIR')
      expect(content).not.toContain('result-dir')
    })

    it('includes state guard before worker spawn', () => {
      expect(content).toMatch(/state.*guard|guard.*state|re-read.*state|STATE GUARD/i)
    })

    it('includes self-healing vocabulary', () => {
      expect(content).toMatch(/self.heal/i)
    })

    it('defines recovery state mapping', () => {
      expect(content).toMatch(/get_recovery_state|recovery_state/i)
    })

    it('moves story back to earlier stage on failure', () => {
      // Should revert implement failure to ready, not mark as failed
      expect(content).toMatch(/implement.*ready|ready.*revert|Revert.*ready/i)
    })
  })

  describe('AC-9: Happy-path smoke test', () => {
    it('defines completion signals', () => {
      expect(content).toContain('BATCH COMPLETE')
      expect(content).toContain('BATCH BLOCKED')
    })

    it('includes summary counts in completion signal', () => {
      expect(content).toMatch(/processed.*succeeded.*failed/i)
    })

    it('defines BLOCKED as terminal (no retry)', () => {
      expect(content).toMatch(/BLOCKED.*not.*retry|BLOCKED.*terminal|blocked.*do not retry/i)
    })
  })

  describe('AC-10: Failure-path — retry budget', () => {
    it('defines MAX_RETRIES constant as 2', () => {
      expect(content).toMatch(/MAX_RETRIES\s*=\s*2/)
    })

    it('defines run_with_retry function', () => {
      expect(content).toMatch(/run_with_retry/)
    })

    it('increments attempt counter on failure', () => {
      expect(content).toMatch(/attempts\+\+/)
    })

    it('stops after max retries exhausted', () => {
      expect(content).toMatch(/max retries exhausted|MAX_RETRIES.*exhausted|exhausted.*retries/i)
    })
  })

  describe('AC-11: Token cap simulation', () => {
    it('defines TOKEN_CAP_WAIT constant as 300', () => {
      expect(content).toMatch(/TOKEN_CAP_WAIT\s*=\s*300/)
    })

    it('includes token cap detection pattern', () => {
      expect(content).toMatch(/token.cap|rate.limit|429/i)
    })

    it('matches rate limit patterns in regex', () => {
      expect(content).toMatch(/rate\.?limit|token\.?limit|too many requests/i)
    })

    it('includes countdown wait during token cap', () => {
      expect(content).toMatch(/countdown|wait.*remaining|remaining.*s/i)
    })

    it('waits before retrying on token cap', () => {
      expect(content).toMatch(/wait_with_countdown|TOKEN_CAP_WAIT/)
    })
  })

  describe('Non-negotiables', () => {
    it('prohibits parallel spawning explicitly', () => {
      expect(content).toMatch(/sequential|one story at a time/i)
      expect(content).not.toMatch(/run_in_background:\s*true/)
    })

    it('requires token tracking', () => {
      expect(content).toContain('/token-log')
      expect(content).toMatch(/token.*tracking|token-log.*required/i)
    })

    it('declares KB as sole source of truth', () => {
      expect(content).toMatch(/sole source of truth|KB is the sole|KB.*only source/i)
    })

    it('documents dry_run safety', () => {
      expect(content).toMatch(/dry.run.*safe|dry_run.*true.*no.*spawn|dry_run.*no.*mutation/i)
    })
  })
})
