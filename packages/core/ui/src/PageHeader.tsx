import React from 'react'
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from './index'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  avatarUrl?: string
  avatarFallback?: string
  badges?: Array<{ label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>
  onBack?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onAdd?: () => void
  showBackButton?: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  showAddButton?: boolean
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  avatarUrl,
  avatarFallback,
  badges = [],
  onBack,
  onEdit,
  onDelete,
  onAdd,
  showBackButton = false,
  showEditButton = false,
  showDeleteButton = false,
  showAddButton = false,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex items-start gap-4">
        {showBackButton ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="mt-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        ) : null}

        <div className="flex items-start gap-4">
          {avatarUrl ? (
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} alt={title} />
              <AvatarFallback>{avatarFallback || title.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : null}

          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {subtitle ? <p className="text-lg text-gray-600 mt-1">{subtitle}</p> : null}
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <Badge key={index} variant={badge.variant || 'secondary'}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showAddButton ? (
          <Button onClick={onAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        ) : null}

        {showEditButton ? (
          <Button variant="outline" onClick={onEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        ) : null}

        {showDeleteButton ? (
          <Button variant="destructive" onClick={onDelete} className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  )
}
