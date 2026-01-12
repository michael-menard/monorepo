import { AppBadge as Badge } from '@repo/app-component-library'
import { ExternalLink, Package, Truck, CheckCircle2, XCircle, Clock, ShoppingCart } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import type { MocOrder } from './__types__/moc'

interface OrdersCardProps {
  orders?: MocOrder[]
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  },
} as const

export function OrdersCard({ orders }: OrdersCardProps) {
  const safeOrders = orders ?? []

  const totalParts = safeOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.partsCount, 0)

  const totalSpent = safeOrders
    .filter(o => o.status !== 'cancelled' && o.totalPrice)
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatPrice = (price: number, currency = 'USD') => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(price)
  }

  return (
    <DashboardCard
      id="orders"
      title="Parts Orders"
      titleIcon={<ShoppingCart className="h-4 w-4 text-sky-500" />}
      badge={
        safeOrders.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {safeOrders.length}
          </Badge>
        ) : null
      }
    >
      {safeOrders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total Parts Ordered</p>
            <p className="text-lg font-semibold text-foreground">{totalParts.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-lg font-semibold text-foreground">{formatPrice(totalSpent)}</p>
          </div>
        </div>
      )}

      {safeOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parts orders linked yet.</p>
      ) : (
        <div className="space-y-3 mt-3">
          {safeOrders.map(order => {
            const status = statusConfig[order.status]
            const StatusIcon = status.icon

            return (
              <div
                key={order.id}
                className="flex items-start gap-4 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-sky-500/10 flex-shrink-0">
                  <Package className="h-5 w-5 text-sky-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {order.storeUrl ? (
                      <a
                        href={order.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                      >
                        {order.storeName}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="font-medium text-foreground">{order.storeName}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span>{formatDate(order.orderDate)}</span>
                    <span>•</span>
                    <span>{order.partsCount.toLocaleString()} parts</span>
                    {order.totalPrice && (
                      <>
                        <span>•</span>
                        <span>{formatPrice(order.totalPrice, order.currency)}</span>
                      </>
                    )}
                  </div>
                  {order.trackingUrl && order.status === 'shipped' && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                    >
                      <Truck className="h-3 w-3" aria-hidden="true" />
                      Track Shipment
                    </a>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={`flex-shrink-0 gap-1 border ${status.color}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}
