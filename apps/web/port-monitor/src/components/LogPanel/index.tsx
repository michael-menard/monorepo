import { useRef, useEffect, useState } from 'react'
import { X, Trash2, ArrowDown } from 'lucide-react'
import { useLogStream, type LogLine } from '../../hooks/useLogStream'

export function LogPanel({
  serviceKey,
  onClose,
}: {
  serviceKey: string | null
  onClose: () => void
}) {
  const { lines } = useLogStream(serviceKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filteredLines, setFilteredLines] = useState<LogLine[]>([])

  useEffect(() => {
    setFilteredLines(lines)
  }, [lines])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredLines, autoScroll])

  function handleScroll() {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(isAtBottom)
  }

  function handleClear() {
    setFilteredLines([])
  }

  if (!serviceKey) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[600px] flex flex-col border-l border-slate-700 bg-slate-950 shadow-2xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 font-mono">
            {serviceKey}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              onClick={handleClear}
              aria-label="Clear logs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              onClick={onClose}
              aria-label="Close log panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Log output */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 font-mono text-sm leading-relaxed"
        >
          {filteredLines.length === 0 ? (
            <p className="text-slate-600 text-center mt-8">No logs yet. Start the service to see output.</p>
          ) : (
            filteredLines.map((line, i) => (
              <div
                key={`${line.timestamp}-${i}`}
                className={`whitespace-pre-wrap break-all ${
                  line.stream === 'stderr' ? 'text-red-400' : 'text-green-400'
                }`}
              >
                <span className="text-slate-600 mr-2 select-none">
                  {new Date(line.timestamp).toLocaleTimeString()}
                </span>
                {line.text}
              </div>
            ))
          )}
        </div>

        {/* Scroll lock indicator */}
        {!autoScroll && (
          <button
            type="button"
            className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1.5 text-xs text-white shadow-lg hover:bg-cyan-500"
            onClick={() => {
              setAutoScroll(true)
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
          >
            <ArrowDown className="h-3 w-3" /> Scroll to bottom
          </button>
        )}
      </div>
    </>
  )
}
