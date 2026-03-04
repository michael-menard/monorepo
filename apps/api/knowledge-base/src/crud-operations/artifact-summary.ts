/**
 * Artifact Summary Extraction Utility
 *
 * Pure utility module for extracting concise summary JSONB from artifact content.
 * Used by artifact_write to auto-populate the storyArtifacts.summary column.
 *
 * Summary fields per type are documented in KBAR-0140 Architecture Notes table.
 *
 * @see plans/future/platform/kb-artifact-migration/in-progress/KBAR-0140/KBAR-0140.md
 */

// ============================================================================
// Summary Extractor
// ============================================================================

/**
 * Extract a concise summary from artifact content for a given artifact type.
 *
 * Returns a JSONB-compatible object with 5–10 high-signal fields per artifact
 * type. For unknown types, returns up to 5 top-level scalar fields (strings,
 * numbers, booleans). Arrays and nested objects are excluded from the default
 * fallback.
 *
 * @param artifactType - One of the 13 canonical artifact types (or unknown)
 * @param content - Full artifact content JSONB
 * @returns Concise summary object suitable for the storyArtifacts.summary column
 */
export function extractArtifactSummary(
  artifactType: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  switch (artifactType) {
    case 'checkpoint':
      return {
        current_phase: content.current_phase,
        last_successful_phase: content.last_successful_phase,
        iteration: content.iteration,
        blocked: content.blocked,
      }

    case 'scope':
      return {
        touches: content.touches,
        risk_flags: content.risk_flags,
      }

    case 'plan':
      return {
        version: content.version,
        approved: content.approved,
        chunks_count: Array.isArray(content.chunks) ? content.chunks.length : 0,
        estimated_files: (content.estimates as Record<string, unknown>)?.files,
        estimated_tokens: (content.estimates as Record<string, unknown>)?.tokens,
      }

    case 'evidence':
      return {
        version: content.version,
        story_id: content.story_id,
        touched_files_count: Array.isArray(content.touched_files)
          ? content.touched_files.length
          : 0,
        commands_run_count: Array.isArray(content.commands_run) ? content.commands_run.length : 0,
        acceptance_criteria_count: Array.isArray(content.acceptance_criteria)
          ? content.acceptance_criteria.length
          : 0,
      }

    case 'verification':
      return {
        verdict: content.verdict,
        finding_count: content.finding_count,
        critical_count: content.critical_count,
      }

    case 'analysis':
      return {
        analysis_type: content.analysis_type,
        summary_text: content.summary_text,
      }

    case 'context':
      return {
        story_id: content.story_id,
        feature_dir: content.feature_dir,
        phase: content.phase,
      }

    case 'fix_summary':
      return {
        iteration: content.iteration,
        issues_fixed: content.issues_fixed,
        issues_remaining: content.issues_remaining,
      }

    case 'proof':
      return {
        completed_at: content.completed_at,
        summary_points: Array.isArray(content.summary) ? content.summary.length : 0,
        deliverables_count: Array.isArray(content.deliverables) ? content.deliverables.length : 0,
        tests_passed: content.tests_passed,
        all_acs_verified: content.all_acs_verified,
      }

    case 'elaboration':
      return {
        verdict: content.verdict,
        split_required: content.split_required,
        gaps_count: Array.isArray(content.gaps) ? content.gaps.length : 0,
        follow_ups_count: Array.isArray(content.follow_ups) ? content.follow_ups.length : 0,
      }

    case 'review':
      return {
        verdict: content.verdict,
        iteration: content.iteration,
        issues_count: Array.isArray(content.ranked_patches) ? content.ranked_patches.length : 0,
      }

    case 'qa_gate':
      return {
        decision: content.decision,
        reviewer: content.reviewer,
        finding_count: content.finding_count,
        blocker_count: content.blocker_count,
      }

    case 'completion_report':
      return {
        status: content.status,
        iterations_used: content.iterations_used,
      }

    default: {
      // Return first ≤5 top-level scalar fields (strings, numbers, booleans; not arrays or objects)
      const keys = Object.keys(content)
      const summary: Record<string, unknown> = {}
      let count = 0
      for (const key of keys) {
        if (count >= 5) break
        const value = content[key]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          summary[key] = value
          count++
        }
      }
      return summary
    }
  }
}
