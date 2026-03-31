import { useRef, useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, X } from 'lucide-react'
import { clearAll, selectNotifications, selectUnreadCount } from '../../store/notificationsSlice'

const TYPE_STYLES: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  warning: 'text-yellow-400',
  success: 'text-emerald-400',
  info: 'text-cyan-400',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function NotificationBell() {
  const dispatch = useDispatch()
  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleToggle() {
    setOpen(prev => !prev)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleToggle}
        className="relative text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-cyan-500 text-black text-[10px] font-bold leading-none"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/60 z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <span className="text-sm font-semibold text-slate-200">Notifications</span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  aria-label="Clear all notifications"
                  onClick={() => dispatch(clearAll())}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <ul
            className="overflow-y-auto max-h-80 divide-y divide-slate-800/60"
            aria-live="polite"
            aria-label="Notification list"
          >
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications</li>
            ) : (
              notifications.map(n => (
                <li
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 text-sm transition-colors ${
                    n.read ? 'opacity-60' : 'bg-slate-800/30'
                  }`}
                >
                  {!n.read && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-500"
                    />
                  )}
                  {n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`break-words ${TYPE_STYLES[n.type] ?? 'text-slate-300'}`}>
                      {n.message}
                    </p>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatTime(n.receivedAt)}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
