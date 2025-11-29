import { Card, CardHeader, CardTitle } from '@repo/ui/card'
import { BookOpen, FileText, Video, Download } from 'lucide-react'

export function InstructionsModule() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          MOC Instructions
        </h1>
        <p className="text-muted-foreground">Step-by-step building guides for LEGO MOCs</p>
      </div>

      <div className="text-center p-12 border-2 border-dashed border-muted rounded-lg">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Instructions Module Loading</h3>
        <p className="text-muted-foreground mb-6">
          This will load the existing MOC Instructions functionality with enhanced features
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="pb-3">
              <FileText className="h-6 w-6 text-primary mx-auto" />
              <CardTitle className="text-sm">PDF Instructions</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Video className="h-6 w-6 text-primary mx-auto" />
              <CardTitle className="text-sm">Video Guides</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Download className="h-6 w-6 text-primary mx-auto" />
              <CardTitle className="text-sm">Parts Lists</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
