import React from 'react'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from './index'

export interface AppCardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  showHeader?: boolean
  actions?: React.ReactNode
}

export const AppCard: React.FC<AppCardProps> = ({
  title,
  description,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  showHeader = true,
  actions,
}) => {
  return (
    <Card className={className}>
      {showHeader && (title || description || actions) ? (
        <CardHeader className={headerClassName}>
          <div className="flex items-center justify-between">
            <div>
              {title ? <CardTitle data-testid="app-card-title">{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
