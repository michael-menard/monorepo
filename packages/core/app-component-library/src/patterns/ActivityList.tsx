import { Clock, ArrowUpRight, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../_primitives/card'
import { Avatar, AvatarFallback } from '../_primitives/avatar'
import { Button } from '../_primitives/button'
import type { ActivityListProps, ActivityListItem, TimelineGroup } from './__types__'

// ---------------------------------------------------------------------------
// Image variant
// ---------------------------------------------------------------------------

function ImageActivityItem({ item }: { item: ActivityListItem }) {
  return (
    <div data-slot="activity-item" className="flex items-start gap-3">
      {item.img ? (
        <img
          src={item.img}
          alt={item.item}
          className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-foreground">
          <span className="font-medium">{item.action}:</span>{' '}
          <span className="text-foreground">{item.item}</span>
        </p>
        <p className="font-sans text-xs text-muted-foreground">{item.time}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avatar variant
// ---------------------------------------------------------------------------

function AvatarActivityItem({ item }: { item: ActivityListItem }) {
  return (
    <div data-slot="activity-item" className="flex items-start gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/20 text-xs text-primary">
          {item.avatar ?? item.user?.slice(0, 2) ?? '??'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm">
          <span className="font-medium text-foreground">{item.user}</span>{' '}
          <span className="text-muted-foreground">{item.action}</span>{' '}
          <span className="font-medium text-foreground">{item.item}</span>
        </p>
        <p className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {item.time}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline variant
// ---------------------------------------------------------------------------

function TimelineGroupSection({ group }: { group: TimelineGroup }) {
  return (
    <div data-slot="timeline-group" className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <div className="h-2 w-2 rounded-full bg-primary-foreground" />
        </div>
        <p className="font-heading text-sm font-semibold text-foreground">{group.date}</p>
      </div>
      <div className="ml-9 space-y-2">
        {group.items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
          >
            <p className="font-body text-sm">
              <span className="text-muted-foreground">{item.action}</span>{' '}
              <span className="font-medium text-foreground">{item.item}</span>
            </p>
            <p className="font-sans text-xs text-muted-foreground">{item.time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityList(props: ActivityListProps) {
  if (props.variant === 'timeline') {
    return (
      <Card data-slot="activity-list">
        <CardContent className="pt-6">
          <div className="relative">
            <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border" />
            <div className="space-y-6">
              {props.groups.map(group => (
                <TimelineGroupSection key={group.date} group={group} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const title = props.title
  const items = props.items
  const variant = props.variant

  return (
    <Card data-slot="activity-list">
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-4">
        {items.map((item, i) =>
          variant === 'avatar' ? (
            <AvatarActivityItem key={i} item={item} />
          ) : (
            <ImageActivityItem key={i} item={item} />
          ),
        )}
      </CardContent>
    </Card>
  )
}
