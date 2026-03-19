import { type Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import type { Plan } from '../../store/roadmapApi'

export function PaginationControls({ table }: { table: Table<Plan> }) {
  const totalPages = table.getPageCount()
  if (totalPages <= 1) return null

  const pageIndex = table.getState().pagination.pageIndex

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="text-sm text-muted-foreground">
        Page {pageIndex + 1} of {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 text-slate-400 hover:text-slate-100"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 text-slate-400 hover:text-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) {
            pageNum = i
          } else if (pageIndex <= 2) {
            pageNum = i
          } else if (pageIndex >= totalPages - 3) {
            pageNum = totalPages - 5 + i
          } else {
            pageNum = pageIndex - 2 + i
          }

          const isActive = pageIndex === pageNum
          return (
            <Button
              key={pageNum}
              variant={isActive ? 'default' : 'ghost'}
              size="icon"
              onClick={() => table.setPageIndex(pageNum)}
              className={`h-8 w-8 text-sm ${isActive ? '' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {pageNum + 1}
            </Button>
          )
        })}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 text-slate-400 hover:text-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.setPageIndex(totalPages - 1)}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 text-slate-400 hover:text-slate-100"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
