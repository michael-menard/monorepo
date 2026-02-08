/**
 * Parts Table Component
 * Table showing MOCs that need parts with coverage percentage
 */

import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AppBadge,
} from '@repo/app-component-library'
import { formatDistanceToNow } from 'date-fns'
import type { PartialMoc } from '../../__types__'

interface PartsTableProps {
  data: PartialMoc[]
  isLoading?: boolean
}

function getCoverageColor(coverage: number): string {
  if (coverage >= 80) return 'bg-emerald-500'
  if (coverage >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getCoverageBadgeVariant(coverage: number): 'success' | 'warning' | 'destructive' {
  if (coverage >= 80) return 'success'
  if (coverage >= 50) return 'warning'
  return 'destructive'
}

export function PartsTable({ data, isLoading }: PartsTableProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-28 md:w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
            <AlertTriangle
              className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground"
              aria-hidden="true"
            />
            Needs Parts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            All MOCs have complete parts inventory!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
          <AlertTriangle
            className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground"
            aria-hidden="true"
          />
          Needs Parts
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs md:text-sm min-w-[200px] pl-4">MOC Name</TableHead>
                <TableHead className="text-xs md:text-sm min-w-[120px]">Theme</TableHead>
                <TableHead className="text-xs md:text-sm text-right min-w-[100px] pr-4">Coverage</TableHead>
                <TableHead className="text-xs md:text-sm text-right hidden sm:table-cell min-w-[120px] pr-4">
                  Last Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(moc => (
                <TableRow key={moc.id} className="group">
                  <TableCell className="text-xs md:text-sm font-medium pl-4">
                    <Link
                      to="/mocs/$mocId"
                      params={{ mocId: moc.id }}
                      className="hover:text-primary hover:underline"
                    >
                      {moc.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm text-muted-foreground">
                    {moc.theme}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden md:block">
                        <div
                          className={`h-full rounded-full ${getCoverageColor(moc.coverage)}`}
                          style={{ width: `${moc.coverage}%` }}
                        />
                      </div>
                      <AppBadge variant={getCoverageBadgeVariant(moc.coverage)}>
                        {moc.coverage}%
                      </AppBadge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm text-muted-foreground text-right hidden sm:table-cell pr-4">
                    {formatDistanceToNow(new Date(moc.lastUpdated), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <Link to="/parts" className="text-sm text-primary hover:underline font-medium">
            View all parts needs
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
