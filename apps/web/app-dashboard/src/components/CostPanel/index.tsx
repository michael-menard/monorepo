/**
 * CostPanel Component
 *
 * Displays per-story token cost summary table.
 *
 * AC-2: SUM(total_tokens) grouped by story_id and phase
 * AC-7: loading skeleton, error state with retry
 * AC-8: ARIA labels, table caption, aria-live region
 *
 * Story: APIP-2020
 */

import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { TrendingUp } from 'lucide-react'
import type { CostSummaryRow } from '../../hooks/usePipelineMonitor'

// ============================================================================
// Zod Schemas
// ============================================================================

const CostPanelPropsSchema = z.object({
  costSummary: z.array(
    z.object({
      story_id: z.string(),
      phase: z.string(),
      total_tokens: z.number(),
      tokens_input: z.number(),
      tokens_output: z.number(),
    }),
  ),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onRetry: z.function(),
})

export type CostPanelProps = {
  costSummary: CostSummaryRow[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ============================================================================
// Component
// ============================================================================

/**
 * CostPanel
 *
 * Renders per-story token cost rows grouped by story_id and phase.
 */
export function CostPanel({ costSummary, isLoading, error, onRetry }: CostPanelProps) {
  // Loading skeleton (AC-7)
  if (isLoading) {
    return (
      <Card
        className="bg-card border-border dark:backdrop-blur-sm"
        aria-label="Cost summary loading"
        aria-busy="true"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state (AC-7)
  if (error) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Cost summary error">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Token Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div
            className="flex flex-col items-center gap-3 py-8 text-destructive"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm">{error}</p>
            <button
              onClick={onRetry}
              className="rounded-md bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
              aria-label="Retry loading cost summary"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (costSummary.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Token cost summary">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Token Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No token usage data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Data state (AC-2, AC-8)
  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Token cost summary">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Token Cost Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div aria-live="polite" aria-atomic="false">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-labelledby="cost-panel-caption">
              <caption id="cost-panel-caption" className="sr-only">
                Per-story token usage grouped by story and phase
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Story
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Phase
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Total Tokens
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Input
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Output
                  </th>
                </tr>
              </thead>
              <tbody>
                {costSummary.map((row, i) => (
                  <tr
                    key={`${row.story_id}-${row.phase}-${i}`}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {row.story_id}
                    </td>
                    <td className="py-2 pr-4 text-card-foreground capitalize">{row.phase}</td>
                    <td className="py-2 pr-4 text-right font-medium text-card-foreground">
                      {formatTokens(row.total_tokens)}
                    </td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">
                      {formatTokens(row.tokens_input)}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatTokens(row.tokens_output)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Validate props schema usage
export const _propsSchema = CostPanelPropsSchema
