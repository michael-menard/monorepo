export const ALL = '_all'

export const STATUS_OPTIONS = [
  { label: 'All Statuses', value: ALL },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Stories Created', value: 'stories-created' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Implemented', value: 'implemented' },
  { label: 'Superseded', value: 'superseded' },
  { label: 'Archived', value: 'archived' },
  { label: 'Blocked', value: 'blocked' },
]

export const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: ALL },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
  { label: 'P4', value: 'P4' },
  { label: 'P5', value: 'P5' },
]

export const TYPE_OPTIONS = [
  { label: 'All Types', value: ALL },
  { label: 'Feature', value: 'feature' },
  { label: 'Refactor', value: 'refactor' },
  { label: 'Migration', value: 'migration' },
  { label: 'Infra', value: 'infra' },
  { label: 'Tooling', value: 'tooling' },
  { label: 'Workflow', value: 'workflow' },
  { label: 'Audit', value: 'audit' },
  { label: 'Spike', value: 'spike' },
]

export const fromSelect = (v: string) => (v === ALL ? '' : v)
