import { useCallback, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, showSuccessToast, showErrorToast } from '@repo/app-component-library'
import { createLogger } from '@repo/logger'
import { useAddScrapeJobMutation } from '@repo/api-client/rtk/scraper-api'
import { useIsAdmin } from '@repo/auth-hooks'

const logger = createLogger('app-instructions-gallery:ScrapeButton')

const DEBOUNCE_MS = 500
const THROTTLE_MS = 5000

const SOURCE_LABELS: Record<string, string> = {
  rebrickable: 'Rebrickable',
}

const SOURCE_JOB_TYPES: Record<string, string> = {
  rebrickable: 'rebrickable-moc-single',
}

interface ScrapeButtonProps {
  mocNumber: string
  source: string
}

export function ScrapeButton({ mocNumber, source }: ScrapeButtonProps) {
  const isAdmin = useIsAdmin()
  const [addScrapeJob, { isLoading: isAdding }] = useAddScrapeJobMutation()
  const [isThrottled, setIsThrottled] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const jobType = SOURCE_JOB_TYPES[source]
  const sourceLabel = SOURCE_LABELS[source] ?? source

  const handleScrape = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      if (isThrottled) return
      setIsThrottled(true)
      setTimeout(() => setIsThrottled(false), THROTTLE_MS)

      try {
        // Backend handles cancel-and-requeue for duplicate MOC jobs
        await addScrapeJob({
          url: mocNumber,
          type: jobType as any,
        }).unwrap()

        showSuccessToast('Scrape queued', 'Check the scraper queue for progress')
        logger.info('MOC scrape job enqueued', undefined, { mocNumber, source })
      } catch (error) {
        showErrorToast(error, 'Failed to queue scrape')
        logger.error('Failed to enqueue MOC scrape', error, { mocNumber, source })
      }
    }, DEBOUNCE_MS)
  }, [addScrapeJob, mocNumber, jobType, source, isThrottled])

  // TODO: restore admin guard after testing
  // if (!isAdmin) return null
  if (!jobType) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleScrape}
      disabled={isAdding || isThrottled}
      data-testid="scrape-button"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isAdding ? 'animate-spin' : ''}`} />
      Scrape from {sourceLabel}
    </Button>
  )
}
