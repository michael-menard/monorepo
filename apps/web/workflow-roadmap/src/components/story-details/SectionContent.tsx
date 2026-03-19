import { sectionPrefix } from '../../utils/formatters'

export function SectionContent({
  content,
  sectionName,
}: {
  content: string | null
  sectionName?: string
}) {
  if (!content) return <p className="text-sm text-slate-600 italic">—</p>

  try {
    const parsed = JSON.parse(content)
    // Plain string array
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      const prefix = sectionName ? sectionPrefix(sectionName) : null
      return (
        <ul className="space-y-2">
          {(parsed as string[]).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="font-mono text-xs text-cyan-500/40 shrink-0 mt-0.5 w-10 text-right">
                {prefix ? `${prefix}-${i + 1}` : `${i + 1}.`}
              </span>
              <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )
    }
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      const first = parsed[0] as Record<string, unknown>
      // Subtask shape: { id, title, files? }
      if ('title' in first) {
        return (
          <ul className="space-y-2">
            {(parsed as Array<{ id?: string; title: string; files?: string[] }>).map((item, i) => (
              <li key={item.id ?? i} className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-cyan-500/40 shrink-0 mt-0.5 w-10 text-right">
                  {item.id ?? `${i + 1}.`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 leading-relaxed">{item.title}</p>
                  {item.files && item.files.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.files.map(f => (
                        <span
                          key={f}
                          className="font-mono text-xs text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5 break-all"
                        >
                          {f.split('/').pop()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      }
      // Generic array of objects with id+text
      if ('text' in first) {
        return (
          <ul className="space-y-1.5">
            {(parsed as Array<{ id?: string; text: string }>).map((item, i) => (
              <li key={item.id ?? i} className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-slate-600 shrink-0 mt-0.5 w-10 text-right">
                  {item.id ?? `${i + 1}.`}
                </span>
                <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        )
      }
    }
  } catch {
    // not JSON — fall through to plain text
  }

  return <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>
}
