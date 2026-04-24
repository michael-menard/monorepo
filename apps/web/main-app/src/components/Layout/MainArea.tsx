/**
 * MainArea — Thin wrapper around the shared ContentArea component.
 *
 * Preserves the existing API so no changes needed in RootLayout or other consumers.
 * The actual implementation lives in @repo/app-component-library/layout/ContentArea.
 */

import { ContentArea, ContentSection, ContentHeader } from '@repo/app-component-library'

export interface MainAreaProps {
  className?: string
  isPageTransitioning?: boolean
  currentPath?: string
  fillViewport?: boolean
  children?: React.ReactNode
}

export function MainArea({
  className,
  isPageTransitioning = false,
  currentPath = '/',
  fillViewport = false,
  children,
}: MainAreaProps) {
  return (
    <ContentArea
      className={className}
      isTransitioning={isPageTransitioning}
      currentPath={currentPath}
      fillViewport={fillViewport}
    >
      {children}
    </ContentArea>
  )
}

/** @deprecated Use ContentSection from @repo/app-component-library directly */
export const MainAreaContainer = ContentSection

/** @deprecated Use ContentHeader from @repo/app-component-library directly */
export const MainAreaHeader = ContentHeader
