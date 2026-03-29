export function AgentActiveBadge({
  agentName: _agentName,
  phase,
}: {
  agentName: string | null
  phase: string | null
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 rounded px-1.5 py-0.5"
      title={`Agent active${phase ? `: ${phase}` : ''}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      {phase ? `Agent · ${phase}` : 'Agent'}
    </span>
  )
}
