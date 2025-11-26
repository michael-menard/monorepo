import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { Images, Upload, Search, Filter } from 'lucide-react'

export function GalleryModule() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Images className="h-8 w-8 text-primary" />
          Gallery
        </h1>
        <p className="text-muted-foreground">
          Browse and discover amazing LEGO MOC designs
        </p>
      </div>

      <div className="text-center p-12 border-2 border-dashed border-muted rounded-lg">
        <Images className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Gallery Module</h3>
        <p className="text-muted-foreground mb-6">
          This will load the existing InspirationGallery page with enhanced serverless API integration
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="pb-3">
              <Search className="h-6 w-6 text-primary mx-auto" />
              <CardTitle className="text-sm">Advanced Search</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Filter className="h-6 w-6 text-primary mx-auto" />
              <CardTitle className="text-sm">Smart Filtering</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <Upload className="h-6 w-6 text-primary mx-auto" />
              <CardTitle className="text-sm">Batch Upload</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
