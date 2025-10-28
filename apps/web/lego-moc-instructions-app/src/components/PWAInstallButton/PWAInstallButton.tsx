// PWA Install Button component (currently disabled)
// Uncomment and import dependencies when ready to use:
// import { Button } from '@repo/ui'
// import { Download } from 'lucide-react'
// import { usePWA } from '../PWAProvider'

// interface PWAInstallButtonProps {
//   variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
//   size?: 'default' | 'sm' | 'lg' | 'icon'
//   className?: string
//   children?: React.ReactNode
// }

// export const PWAInstallButton = ({
//   variant = 'default',
//   size = 'default',
//   className = '',
//   children
// }: PWAInstallButtonProps) => {
//   const { canInstall, installPrompt } = usePWA()

//   if (!canInstall) {
//     return null
//   }

//   return (
//     <Button
//       variant={variant}
//       size={size}
//       onClick={installPrompt}
//       className={className}
//     >
//       <Download className="h-4 w-4 mr-2" />
//       {children || 'Install App'}
//     </Button>
//   )
// }
