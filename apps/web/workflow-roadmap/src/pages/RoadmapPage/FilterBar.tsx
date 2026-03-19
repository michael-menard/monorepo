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
  setExcludeCompleted,
  setSearch,
} from '../../store/roadmapFiltersSlice'
import type { RootState } from '../../store'
import { ALL, STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS, fromSelect } from './constants'

export function FilterBar() {
  const dispatch = useDispatch()
  const { status, priority, type, excludeCompleted, search } = useSelector(
    (state: RootState) => state.roadmapFilters,
  )

  return (
    <section
      aria-label="Filters"
      className="mb-6 bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-4 flex flex-col gap-3"
    >
      <Input
        aria-label="Search plans"
        placeholder="Search plans..."
        value={search}
        onChange={e => dispatch(setSearch(e.target.value))}
        className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
      />

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
    </section>
  )
}
