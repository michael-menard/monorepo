import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'

interface SettingsCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  children: React.ReactNode
  className?: string
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  children,
  className = '',
}) => {
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export default SettingsCard
