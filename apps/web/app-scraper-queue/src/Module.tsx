import { z } from 'zod'
import { MainPage } from './pages/main-page'

const AppScraperQueueModulePropsSchema = z.object({
  className: z.string().optional(),
})

export type AppScraperQueueModuleProps = z.infer<typeof AppScraperQueueModulePropsSchema>

export function AppScraperQueueModule({ className }: AppScraperQueueModuleProps) {
  return (
    <div className={className}>
      <MainPage />
    </div>
  )
}

export default AppScraperQueueModule
