/**
 * Centralized color definitions for workflow tags.
 * Pure data — no React dependencies.
 */

// ---------------------------------------------------------------------------
// Story state colors
// ---------------------------------------------------------------------------

type ColorFormats = {
  badge: string
  dot: string
  hex: string
  text: string
}

const state = (badge: string, dot: string, hex: string, text: string): ColorFormats => ({
  badge,
  dot,
  hex,
  text,
})

export const STORY_STATE_COLORS: Record<string, ColorFormats> = {
  backlog: state(
    '!bg-slate-700/40 !border-slate-600/40 !text-slate-300/70',
    'bg-slate-400',
    '#64748b',
    'text-slate-400',
  ),
  created: state(
    '!bg-slate-600/30 !border-slate-500/40 !text-slate-300/70',
    'bg-slate-400',
    '#94a3b8',
    'text-slate-400',
  ),
  elab: state(
    '!bg-purple-500/20 !border-purple-500/30 !text-purple-300/70',
    'bg-purple-400',
    '#a78bfa',
    'text-purple-400',
  ),
  ready: state(
    '!bg-cyan-500/20 !border-cyan-500/30 !text-cyan-300/70',
    'bg-cyan-400',
    '#38bdf8',
    'text-cyan-400',
  ),
  ready_to_work: state(
    '!bg-cyan-500/20 !border-cyan-500/30 !text-cyan-300/70',
    'bg-cyan-400',
    '#38bdf8',
    'text-cyan-400',
  ),
  in_progress: state(
    '!bg-blue-500/20 !border-blue-500/30 !text-blue-300/70',
    'bg-blue-400',
    '#22d3ee',
    'text-blue-400',
  ),
  needs_code_review: state(
    '!bg-violet-500/20 !border-violet-500/30 !text-violet-300/70',
    'bg-violet-400',
    '#facc15',
    'text-violet-400',
  ),
  ready_for_review: state(
    '!bg-violet-500/20 !border-violet-500/30 !text-violet-300/70',
    'bg-violet-400',
    '#facc15',
    'text-violet-400',
  ),
  in_review: state(
    '!bg-violet-500/20 !border-violet-500/30 !text-violet-300/70',
    'bg-violet-400',
    '#fb923c',
    'text-violet-400',
  ),
  failed_code_review: state(
    '!bg-red-500/20 !border-red-500/30 !text-red-300/70',
    'bg-red-500',
    '#dc2626',
    'text-red-400',
  ),
  ready_for_qa: state(
    '!bg-amber-500/20 !border-amber-500/30 !text-amber-300/70',
    'bg-amber-400',
    '#f472b6',
    'text-amber-400',
  ),
  in_qa: state(
    '!bg-amber-500/20 !border-amber-500/30 !text-amber-300/70',
    'bg-amber-400',
    '#f472b6',
    'text-amber-400',
  ),
  failed_qa: state(
    '!bg-red-500/20 !border-red-500/30 !text-red-300/70',
    'bg-red-500',
    '#b91c1c',
    'text-red-400',
  ),
  uat: state(
    '!bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300/70',
    'bg-emerald-400',
    '#a3e635',
    'text-emerald-400',
  ),
  UAT: state(
    '!bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300/70',
    'bg-emerald-400',
    '#a3e635',
    'text-emerald-400',
  ),
  completed: state(
    '!bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300/70',
    'bg-emerald-500',
    '#4ade80',
    'text-emerald-400',
  ),
  blocked: state(
    '!bg-red-500/20 !border-red-500/30 !text-red-300/70',
    'bg-red-500/80',
    '#ef4444',
    'text-red-400',
  ),
  cancelled: state(
    '!bg-slate-600/20 !border-slate-500/30 !text-slate-400/70',
    'bg-slate-500',
    '#6b7280',
    'text-slate-500',
  ),
  deferred: state(
    '!bg-stone-500/20 !border-stone-500/30 !text-stone-300/70',
    'bg-stone-500',
    '#78716c',
    'text-stone-400',
  ),
}

const DEFAULT_STATE_COLOR: ColorFormats = state(
  '!bg-slate-700/40 !border-slate-600/40 !text-slate-300/70',
  'bg-slate-500/80',
  '#475569',
  'text-slate-500',
)

export function getStoryStateColor(
  stateValue: string | null | undefined,
  format: keyof ColorFormats = 'badge',
): string {
  return (STORY_STATE_COLORS[stateValue ?? ''] ?? DEFAULT_STATE_COLOR)[format]
}

// ---------------------------------------------------------------------------
// Priority colors
// ---------------------------------------------------------------------------

type PriorityFormats = {
  badge: string
  dot: string
  hex: string
  text: string
  bar: string
}

export const PRIORITY_COLORS: Record<string, PriorityFormats> = {
  P0: {
    badge: '!bg-red-600/50 !border-red-500/40 !text-white/80',
    dot: 'bg-red-500',
    hex: '#ef4444',
    text: 'text-red-400',
    bar: 'bg-red-600',
  },
  P1: {
    badge: '!bg-red-500/40 !border-red-500/30 !text-white/60',
    dot: 'bg-red-400',
    hex: '#f87171',
    text: 'text-red-400/70',
    bar: 'bg-red-500',
  },
  P2: {
    badge: '!bg-orange-500/40 !border-orange-500/30 !text-white/60',
    dot: 'bg-orange-400',
    hex: '#fb923c',
    text: 'text-orange-400/70',
    bar: 'bg-orange-500',
  },
  P3: {
    badge: '!bg-amber-400/40 !border-amber-400/30 !text-white/60',
    dot: 'bg-amber-400',
    hex: '#fbbf24',
    text: 'text-amber-400/70',
    bar: 'bg-amber-400',
  },
  P4: {
    badge: '!bg-teal-500/40 !border-teal-500/30 !text-white/60',
    dot: 'bg-teal-400',
    hex: '#2dd4bf',
    text: 'text-teal-400/70',
    bar: 'bg-teal-500',
  },
  P5: {
    badge: '!bg-blue-500/40 !border-blue-500/30 !text-white/60',
    dot: 'bg-blue-400',
    hex: '#60a5fa',
    text: 'text-blue-400/70',
    bar: 'bg-blue-500',
  },
}

const DEFAULT_PRIORITY: PriorityFormats = {
  badge: '!bg-blue-500/40 !border-blue-500/30 !text-white/60',
  dot: 'bg-slate-400',
  hex: '#94a3b8',
  text: 'text-slate-400',
  bar: 'bg-blue-500',
}

export function getPriorityColor(
  priority: string | null | undefined,
  format: keyof PriorityFormats = 'badge',
): string {
  return (PRIORITY_COLORS[priority ?? ''] ?? DEFAULT_PRIORITY)[format]
}

// ---------------------------------------------------------------------------
// Plan status colors
// ---------------------------------------------------------------------------

export const PLAN_STATUS_COLORS: Record<string, string> = {
  draft: '!bg-slate-700/40 !border-slate-600/40 !text-slate-300/70',
  active: '!bg-blue-500/20 !border-blue-500/30 !text-blue-300/70',
  accepted: '!bg-cyan-500/20 !border-cyan-500/30 !text-cyan-300/70',
  'stories-created': '!bg-teal-500/20 !border-teal-500/30 !text-teal-300/70',
  'in-progress': '!bg-violet-500/20 !border-violet-500/30 !text-violet-300/70',
  implemented: '!bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300/70',
  superseded: '!bg-orange-500/20 !border-orange-500/30 !text-orange-300/70',
  archived: '!bg-slate-600/20 !border-slate-500/30 !text-slate-400/70',
  blocked: '!bg-red-500/20 !border-red-500/30 !text-red-300/70',
}

const DEFAULT_PLAN_STATUS = '!border-slate-600/50 !text-slate-400/70'

export function getPlanStatusColor(status: string | null | undefined): string {
  return PLAN_STATUS_COLORS[status ?? ''] ?? DEFAULT_PLAN_STATUS
}

// ---------------------------------------------------------------------------
// Generic tag palette (hash-based cycling for arbitrary labels)
// ---------------------------------------------------------------------------

export const GENERIC_TAG_PALETTE = [
  'bg-cyan-500/20 text-cyan-300/70 border-cyan-500/30',
  'bg-violet-500/20 text-violet-300/70 border-violet-500/30',
  'bg-emerald-500/20 text-emerald-300/70 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300/70 border-amber-500/30',
  'bg-pink-500/20 text-pink-300/70 border-pink-500/30',
  'bg-sky-500/20 text-sky-300/70 border-sky-500/30',
  'bg-orange-500/20 text-orange-300/70 border-orange-500/30',
  'bg-teal-500/20 text-teal-300/70 border-teal-500/30',
]

export function getGenericTagColor(label: string): string {
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  return GENERIC_TAG_PALETTE[hash % GENERIC_TAG_PALETTE.length]
}

// ---------------------------------------------------------------------------
// Pipeline stages — shared stage groupings
// ---------------------------------------------------------------------------

export const PIPELINE_STAGES: readonly {
  id: string
  label: string
  states: readonly string[]
  color: string
  text: string
}[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    states: ['backlog', 'created'],
    color: 'bg-slate-400',
    text: 'text-slate-400',
  },
  {
    id: 'ready',
    label: 'Ready',
    states: ['ready_to_work'],
    color: 'bg-cyan-400',
    text: 'text-cyan-400',
  },
  {
    id: 'progress',
    label: 'In Progress',
    states: ['in_progress'],
    color: 'bg-blue-400',
    text: 'text-blue-400',
  },
  {
    id: 'review',
    label: 'Review',
    states: ['needs_code_review', 'ready_for_review', 'failed_code_review'],
    color: 'bg-violet-400',
    text: 'text-violet-400',
  },
  {
    id: 'qa',
    label: 'QA',
    states: ['ready_for_qa', 'in_qa'],
    color: 'bg-amber-400',
    text: 'text-amber-400',
  },
  {
    id: 'uat',
    label: 'UAT',
    states: ['uat'],
    color: 'bg-emerald-400',
    text: 'text-emerald-400',
  },
  {
    id: 'done',
    label: 'Done',
    states: ['completed'],
    color: 'bg-emerald-500',
    text: 'text-emerald-400',
  },
]
