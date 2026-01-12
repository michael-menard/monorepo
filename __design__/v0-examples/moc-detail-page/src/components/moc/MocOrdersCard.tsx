"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Package, Truck, CheckCircle2, XCircle, Clock } from "lucide-react"
import type { MocOrder } from "./mocTypes"

interface MocOrdersCardContentProps {
  orders: MocOrder[]
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "bg-primary/10 text-primary border-primary/20",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
}

export function MocOrdersCardContent({ orders }: MocOrdersCardContentProps) {
  const [localOrders] = useState<MocOrder[]>(orders)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatPrice = (price: number, currency = "USD") => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(price)
  }

  // Calculate totals
  const totalParts = localOrders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.partsCount, 0)
  const totalSpent = localOrders
    .filter((o) => o.status !== "cancelled" && o.totalPrice)
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0)

  return (
    <>
      {/* Summary stats */}
      {localOrders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg animate-in fade-in duration-300">
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

      {/* Orders list */}
      {localOrders.length === 0 ? (
        // Skeleton placeholder
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-border bg-muted/30"
            >
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {localOrders.map((order, index) => {
            const status = statusConfig[order.status]
            const StatusIcon = status.icon

            return (
              <div
                key={order.id}
                className="flex items-start gap-4 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all duration-200 hover:translate-x-1 hover:shadow-sm animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Store icon */}
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 transition-transform hover:scale-110">
                  <Package className="h-5 w-5 text-primary" />
                </div>

                {/* Order details */}
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
                        <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                  {order.trackingUrl && order.status === "shipped" && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline group"
                    >
                      <Truck className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      Track Shipment
                    </a>
                  )}
                </div>

                {/* Status badge */}
                <Badge
                  variant="outline"
                  className={`flex-shrink-0 gap-1 transition-all hover:scale-105 ${status.color}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
