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

export function StoryFilters({
  storySearch,
  setStorySearch,
  storyStateFilter,
  setStoryStateFilter,
  storyPriorityFilter,
  setStoryPriorityFilter,
  hideCompleted,
  setHideCompleted,
}: {
  storySearch: string
  setStorySearch: (v: string) => void
  storyStateFilter: string
  setStoryStateFilter: (v: string) => void
  storyPriorityFilter: string
  setStoryPriorityFilter: (v: string) => void
  hideCompleted: boolean
  setHideCompleted: (v: boolean) => void
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <Input
        placeholder="Search by ID or title..."
        value={storySearch}
        onChange={e => setStorySearch(e.target.value)}
        className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
      />
      <div className="flex items-center gap-3">
        <Select
          value={storyStateFilter || '_all'}
          onValueChange={v => setStoryStateFilter(v === '_all' ? '' : v)}
        >
          <SelectTrigger
            aria-label="Filter by state"
            className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
          >
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
            <SelectItem value="_all" className="focus:bg-slate-700 focus:text-slate-100">
              All States
            </SelectItem>
            <SelectItem value="backlog" className="focus:bg-slate-700 focus:text-slate-100">
              Backlog
            </SelectItem>
            <SelectItem value="ready_to_work" className="focus:bg-slate-700 focus:text-slate-100">
              Ready to Work
            </SelectItem>
            <SelectItem value="in_progress" className="focus:bg-slate-700 focus:text-slate-100">
              In Progress
            </SelectItem>
            <SelectItem
              value="needs_code_review"
              className="focus:bg-slate-700 focus:text-slate-100"
            >
              Needs Code Review
            </SelectItem>
            <SelectItem
              value="ready_for_review"
              className="focus:bg-slate-700 focus:text-slate-100"
            >
              Ready for Review
            </SelectItem>
            <SelectItem
              value="failed_code_review"
              className="focus:bg-slate-700 focus:text-slate-100"
            >
              Failed Code Review
            </SelectItem>
            <SelectItem value="ready_for_qa" className="focus:bg-slate-700 focus:text-slate-100">
              Ready for QA
            </SelectItem>
            <SelectItem value="in_qa" className="focus:bg-slate-700 focus:text-slate-100">
              In QA
            </SelectItem>
            <SelectItem value="uat" className="focus:bg-slate-700 focus:text-slate-100">
              UAT
            </SelectItem>
            <SelectItem value="completed" className="focus:bg-slate-700 focus:text-slate-100">
              Completed
            </SelectItem>
            <SelectItem value="blocked" className="focus:bg-slate-700 focus:text-slate-100">
              Blocked
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={storyPriorityFilter || '_all'}
          onValueChange={v => setStoryPriorityFilter(v === '_all' ? '' : v)}
        >
          <SelectTrigger
            aria-label="Filter by priority"
            className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
          >
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
            <SelectItem value="_all" className="focus:bg-slate-700 focus:text-slate-100">
              All Priorities
            </SelectItem>
            <SelectItem value="P0" className="focus:bg-slate-700 focus:text-slate-100">
              P0
            </SelectItem>
            <SelectItem value="P1" className="focus:bg-slate-700 focus:text-slate-100">
              P1
            </SelectItem>
            <SelectItem value="P2" className="focus:bg-slate-700 focus:text-slate-100">
              P2
            </SelectItem>
            <SelectItem value="P3" className="focus:bg-slate-700 focus:text-slate-100">
              P3
            </SelectItem>
            <SelectItem value="P4" className="focus:bg-slate-700 focus:text-slate-100">
              P4
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <Checkbox
            id="hide-completed"
            checked={hideCompleted}
            onCheckedChange={checked => setHideCompleted(checked === true)}
          />
          <Label
            htmlFor="hide-completed"
            className="text-sm text-slate-400 cursor-pointer select-none"
          >
            Hide completed
          </Label>
        </div>
      </div>
    </div>
  )
}
