// Required dependency: sonner
// Note: This component uses next-themes useTheme. For non-Next.js apps,
// you may need to provide your own theme context or pass the theme prop directly.
import * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const SonnerToaster = ({ theme = 'system', ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { SonnerToaster }
