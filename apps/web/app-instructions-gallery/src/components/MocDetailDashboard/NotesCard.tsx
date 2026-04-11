import { useCallback, useState } from 'react'
import { Card, CardContent, Button } from '@repo/app-component-library'
import { Pencil } from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import { TiptapEditor } from './DescriptionCard'

interface NotesCardProps {
  mocId: string
  notes?: string | null
}

export function NotesCard({ mocId, notes }: NotesCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updateMoc, { isLoading }] = useUpdateMocMutation()

  const handleEdit = useCallback(() => {
    setSaveError(null)
    setIsEditing(true)
  }, [])

  const handleCancel = useCallback(() => {
    setSaveError(null)
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(
    async (html: string) => {
      try {
        setSaveError(null)
        await updateMoc({ id: mocId, input: { notes: html || null } as any }).unwrap()
        setIsEditing(false)
      } catch (err) {
        logger.error('Failed to save notes', err)
        setSaveError('Failed to save. Please try again.')
      }
    },
    [mocId, updateMoc],
  )

  if (isEditing) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <TiptapEditor
            initialContent={notes ?? ''}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isLoading}
            saveError={saveError}
            placeholder="Write your notes..."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm group relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEdit}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit notes"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <CardContent className="p-6">
        {notes ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-prose text-foreground/80"
            dangerouslySetInnerHTML={{ __html: notes }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No notes yet. Click the pencil to add notes about this MOC.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
