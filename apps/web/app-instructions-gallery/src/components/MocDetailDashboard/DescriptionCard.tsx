import { useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import { Card, CardContent, Button } from '@repo/app-component-library'
import {
  Pencil,
  Check,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
} from 'lucide-react'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'

interface DescriptionCardProps {
  mocId: string
  description?: string
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}

function TiptapEditor({
  initialContent,
  onSave,
  onCancel,
  isLoading,
  saveError,
  placeholder,
}: {
  initialContent: string
  onSave: (html: string) => void
  onCancel: () => void
  isLoading: boolean
  saveError: string | null
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Write a description…' }),
      Link.configure({ openOnClick: false }),
      Youtube.configure({ inline: false, ccLanguage: 'en' }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-48 focus:outline-none px-1 py-2 text-foreground/80',
      },
    },
  })

  const handleSave = useCallback(() => {
    if (!editor) return
    onSave(editor.isEmpty ? '' : editor.getHTML())
  }, [editor, onSave])

  const handleSetLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  const handleAddYoutube = useCallback(() => {
    if (!editor) return
    const url = window.prompt('YouTube URL')
    if (!url) return
    editor.commands.setYoutubeVideo({ src: url })
  }, [editor])

  if (!editor) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0.5 border border-border rounded-md px-2 py-1 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          label="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          label="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Horizontal rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleSetLink} active={editor.isActive('link')} label="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleAddYoutube} label="YouTube video">
          <YoutubeIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="border border-border rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 focus-within:border-ring transition-[color,box-shadow]">
        <EditorContent editor={editor} />
      </div>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isLoading}>
          <Check className="h-4 w-4 mr-1" />
          {isLoading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export { TiptapEditor }

export function DescriptionCard({ mocId, description }: DescriptionCardProps) {
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
        await updateMoc({ id: mocId, input: { description: html || null } }).unwrap()
        setIsEditing(false)
      } catch (err) {
        logger.error('Failed to save description', err)
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
            initialContent={description ?? ''}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isLoading}
            saveError={saveError}
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
        aria-label="Edit description"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <CardContent className="p-6">
        {description ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-prose text-foreground/80"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No description provided.</p>
        )}
      </CardContent>
    </Card>
  )
}
