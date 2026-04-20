import { Radar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { AddJobForm } from '../components/AddJobForm'
import { JobList } from '../components/JobList'
import { QueueHealth } from '../components/QueueHealth'

export function MainPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Radar className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Scrape Queue</h1>
      </div>

      {/* Queue Health */}
      <QueueHealth />

      {/* Add Job */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add to Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <AddJobForm />
        </CardContent>
      </Card>

      {/* Job List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <JobList />
        </CardContent>
      </Card>
    </div>
  )
}
