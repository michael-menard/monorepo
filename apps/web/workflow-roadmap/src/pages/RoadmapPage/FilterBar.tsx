import { useSelector, useDispatch } from 'react-redux'
import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
} from '@repo/app-component-library'
import {
  setStatus,
  setPriority,
  setType,
  setTag,
  setExcludeCompleted,
  setSearch,
  resetFilters,
} from '../../store/roadmapFiltersSlice'
import type { RootState } from '../../store'
import { ALL, STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS, fromSelect } from './constants'

export function FilterBar() {
  const dispatch = useDispatch()
  const { status, priority, type, tag, excludeCompleted, search } = useSelector(
    (state: RootState) => state.roadmapFilters,
  )

  const hasActiveFilter = !!status || !!priority || !!type || !!tag || !!search || !excludeCompleted

  return (
    <section
      aria-label="Filters"
      className="mb-6 bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-4 flex flex-col gap-3"
    >
      <div className="relative">
        <Input
          aria-label="Search plans"
          placeholder="Search plans..."
          value={search}
          onChange={e => dispatch(setSearch(e.target.value))}
          className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50 pr-8"
        />
        {search ? (
          <button
            type="button"
            onClick={() => dispatch(setSearch(''))}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Select value={status || ALL} onValueChange={v => dispatch(setStatus(fromSelect(v)))}>
          <SelectTrigger
            aria-label="Filter by status"
            className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
            {STATUS_OPTIONS.map(opt => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="focus:bg-slate-700 focus:text-slate-100"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority || ALL} onValueChange={v => dispatch(setPriority(fromSelect(v)))}>
          <SelectTrigger
            aria-label="Filter by priority"
            className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
          >
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
            {PRIORITY_OPTIONS.map(opt => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="focus:bg-slate-700 focus:text-slate-100"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type || ALL} onValueChange={v => dispatch(setType(fromSelect(v)))}>
          <SelectTrigger
            aria-label="Filter by type"
            className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
          >
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
            {TYPE_OPTIONS.map(opt => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="focus:bg-slate-700 focus:text-slate-100"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Checkbox
            id="exclude-completed"
            checked={excludeCompleted}
            onCheckedChange={checked => dispatch(setExcludeCompleted(checked === true))}
          />
          <Label
            htmlFor="exclude-completed"
            className="text-sm text-slate-400 cursor-pointer select-none"
          >
            Hide completed
          </Label>
        </div>
      </div>

      {tag || hasActiveFilter ? (
        <div className="flex items-center gap-2">
          {tag ? (
            <>
              <span className="text-xs text-slate-500">Tag:</span>
              <button
                type="button"
                onClick={() => dispatch(setTag(''))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
                aria-label={`Remove tag filter: ${tag}`}
              >
                {tag}
                <span aria-hidden="true">{'\u00D7'}</span>
              </button>
            </>
          ) : null}
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={() => dispatch(resetFilters())}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
