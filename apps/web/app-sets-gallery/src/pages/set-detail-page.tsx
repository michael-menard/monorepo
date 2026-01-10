/**
 * Set Detail Page
 * Displays detailed information about a specific set
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { z } from 'zod'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@repo/app-component-library'
import { mockGetSetById, mockDeleteSet, type BrickSet } from '../api/mock-sets-api'

const SetDetailPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type SetDetailPageProps = z.infer<typeof SetDetailPagePropsSchema>

/**
 * Format build status for display
 */
const formatBuildStatus = (status?: string) => {
  if (!status) return 'Not Started'
  return status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Build status variant mapping
 */
const buildStatusVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  complete: 'default',
  'in-progress': 'secondary',
  planned: 'outline',
}

/**
 * Set Detail Page Component
 */
export function SetDetailPage({ className }: SetDetailPageProps = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [set, setSet] = useState<BrickSet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchSet = async () => {
      if (!id) return
      
      setIsLoading(true)
      try {
        const data = await mockGetSetById(id)
        setSet(data)
      } catch (error) {
        console.error('Failed to fetch set:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSet()
  }, [id])

  const handleDelete = async () => {
    if (!set || !window.confirm('Are you sure you want to delete this set?')) return

    setIsDeleting(true)
    try {
      await mockDeleteSet(set.id)
      navigate('/')
    } catch (error) {
      console.error('Failed to delete set:', error)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className || ''}`}>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!set) {
    return (
      <div className={`container mx-auto py-8 ${className || ''}`}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Set not found</h2>
          <p className="text-muted-foreground mb-4">
            The set you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`container mx-auto py-8 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Collection
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/sets/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{set.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="font-mono">
                    #{set.setNumber}
                  </Badge>
                  <Badge
                    variant={
                      set.buildStatus
                        ? buildStatusVariantMap[set.buildStatus] || 'outline'
                        : 'outline'
                    }
                  >
                    {formatBuildStatus(set.buildStatus)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image */}
            {set.thumbnail && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={set.thumbnail}
                  alt={set.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <hr className="my-4" />

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pieces:</span>
                <span className="font-medium tabular-nums">
                  {set.pieceCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Theme:</span>
                <span className="font-medium">{set.theme}</span>
              </div>
              {set.purchaseDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Date:</span>
                  <span className="font-medium">
                    {new Date(set.purchaseDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {set.purchasePrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <span className="font-medium">
                    {set.purchaseCurrency || 'USD'} {set.purchasePrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {set.tags.length > 0 && (
              <>
                <hr className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {set.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {set.notes && (
              <>
                <hr className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{set.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-sm">
                  {new Date(set.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="text-sm">
                  {new Date(set.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Linked MOCs (placeholder) */}
            {set.linkedMocs.length > 0 && (
              <>
                <hr className="my-4" />
                <div>
                  <p className="text-sm font-medium mb-2">Linked MOCs</p>
                  <div className="space-y-2">
                    {set.linkedMocs.map(moc => (
                      <div
                        key={moc.id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {moc.thumbnail && (
                            <img
                              src={moc.thumbnail}
                              alt={moc.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">{moc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {moc.pieceCount} pieces
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SetDetailPage