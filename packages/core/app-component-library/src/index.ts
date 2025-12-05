// =============================================================================
// APP COMPONENTS (Customized components extending base)
// =============================================================================

// Utilities (re-exported from internal)
export { cn } from './_lib/utils'

// Providers (re-exported from internal)
export { ThemeProvider, useTheme } from './_providers/ThemeProvider'

// Inputs
export { AppInput } from './inputs/AppInput'
export type { AppInputProps } from './inputs/AppInput'

export { AppTextarea } from './inputs/AppTextarea'
export type { AppTextareaProps } from './inputs/AppTextarea'

export { AppLabel } from './inputs/AppLabel'
export type { AppLabelProps } from './inputs/AppLabel'

export { AppSelect } from './inputs/AppSelect'
export type { AppSelectProps, AppSelectOption } from './inputs/AppSelect'

export { AppCheckbox } from './inputs/AppCheckbox'
export type { AppCheckboxProps } from './inputs/AppCheckbox'

// Forms
export { AppForm } from './forms/AppForm'
export type { AppFormProps } from './forms/AppForm'

export {
  FormErrorMessage,
  EnhancedFormMessage,
  FieldErrorMessage,
  FormLevelErrorMessage,
} from './forms/form-error-message'
export type { ErrorMessageType, FormErrorMessageProps } from './forms/form-error-message'

export { FormSection } from './forms/FormSection'

export {
  validationMessages,
  createEnhancedSchemas,
  validatePasswordStrength,
  validateFile,
  getNetworkErrorMessage,
  createFormValidationHelpers,
} from './forms/validation-messages'

// Cards
export { StatsCards } from './cards/stats-cards'
export type { StatsCardsProps, StatItem } from './cards/stats-cards'

// Avatars
export { AppAvatar } from './avatars/AppAvatar'

// Content
export { AppSafeContent } from './content/AppSafeContent'
export type { AppSafeContentProps } from './content/AppSafeContent'
export { PageHeader } from './content/PageHeader'

// Buttons
export { CustomButton, customButtonVariants } from './buttons/custom-button'

// Feedback
export {
  Skeleton,
  CardSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  MocCardSkeleton,
  MocCardCompactSkeleton,
  GalleryGridSkeleton,
  skeletonVariants,
} from './feedback/skeleton'

export type {
  GalleryGridSkeletonProps,
  GalleryGridSkeletonColumns,
} from './feedback/skeleton'

export {
  ProgressIndicator,
  CircularProgress,
  LoadingOverlay,
  progressVariants,
  progressBarVariants,
} from './feedback/progress-indicator'

export {
  LoadingSpinner,
  PulseSpinner,
  DotsSpinner,
  spinnerVariants,
  pulseVariants,
  dotsVariants,
} from './feedback/loading-spinner'

export { AppProgress } from './feedback/AppProgress'
export type { AppProgressProps, ProgressVariant } from './feedback/AppProgress'

// Alerts
export { AppAlert, AppAlertTitle, AppAlertDescription } from './alerts/AppAlert'
export type { AppAlertProps, AlertVariant } from './alerts/AppAlert'

// Badges
export { AppBadge } from './badges/AppBadge'
export type { AppBadgeProps, AppBadgeVariant } from './badges/AppBadge'

// Errors
export {
  ErrorBoundary,
  useErrorHandler,
  generateErrorReport,
  sendErrorReport,
} from './errors/error-boundary'
export type { ErrorInfo } from './errors/error-boundary'
export { ErrorInfoSchema } from './errors/error-boundary'

export {
  ApiErrorBoundary,
  FormErrorBoundary,
  DataErrorBoundary,
  ComponentErrorBoundary,
  withErrorBoundary,
  useAsyncError,
  ApiErrorSchema,
} from './errors/error-boundary-specialized'
export type { ApiError } from './errors/error-boundary-specialized'

// Notifications
export { Toaster } from './notifications/sonner'
export type { ToasterProps } from './notifications/sonner'

export {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  getErrorMessage,
} from './notifications/toast-utils'
export type { ToastApiError, ToastType } from './notifications/toast-utils'

// Selects
export { MultiSelect } from './selects/multi-select'

// Dialogs
export { ConfirmationDialog } from './dialogs/ConfirmationDialog'

export {
  AppDialog,
  AppDialogTrigger,
  AppDialogContent,
  AppDialogHeader,
  AppDialogFooter,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogClose,
} from './dialogs/AppDialog'
export type { AppDialogProps, AppDialogContentProps, DialogSize } from './dialogs/AppDialog'

export {
  AppAlertDialog,
  AppAlertDialogTrigger,
  AppAlertDialogContent,
  AppAlertDialogHeader,
  AppAlertDialogFooter,
  AppAlertDialogTitle,
  AppAlertDialogDescription,
  AppAlertDialogAction,
  AppAlertDialogCancel,
} from './dialogs/AppAlertDialog'
export type { AppAlertDialogProps, AppAlertDialogContentProps, AlertDialogVariant } from './dialogs/AppAlertDialog'

// Menus
export {
  AppDropdownMenu,
  AppDropdownMenuTrigger,
  AppDropdownMenuContent,
  AppDropdownMenuGroup,
  AppDropdownMenuLabel,
  AppDropdownMenuItem,
  AppDropdownMenuCheckboxItem,
  AppDropdownMenuRadioGroup,
  AppDropdownMenuRadioItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuShortcut,
  AppDropdownMenuSub,
  AppDropdownMenuSubTrigger,
  AppDropdownMenuSubContent,
} from './menus/AppDropdownMenu'
export type { AppDropdownMenuProps } from './menus/AppDropdownMenu'

// Navigation
export {
  AppTabs,
  AppTabsList,
  AppTabsTrigger,
  AppTabsContent,
} from './navigation/AppTabs'
export type { AppTabsProps, AppTabsListProps, AppTabsTriggerProps, TabsVariant } from './navigation/AppTabs'

export {
  AppAccordion,
  AppAccordionItem,
  AppAccordionTrigger,
  AppAccordionContent,
} from './navigation/AppAccordion'
export type { AppAccordionProps, AppAccordionItemProps, AccordionVariant } from './navigation/AppAccordion'

// Data
export { AppDataTable } from './data/AppDataTable'
export { TabPanel } from './data/TabPanel'

export {
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableFooter,
  AppTableHead,
  AppTableRow,
  AppTableCell,
  AppTableCaption,
} from './data/AppTable'
export type { AppTableProps, TableVariant } from './data/AppTable'

// Tour
export { TourProvider, TourStep, TourTrigger, useTour } from './tour/guided-tour'

// =============================================================================
// HOOKS
// =============================================================================

export { useLoadingStates, useMultipleLoadingStates } from './hooks/useLoadingStates'
export type {
  LoadingType,
  LoadingState,
  UseLoadingStatesOptions,
  UseLoadingStatesReturn,
} from './hooks/useLoadingStates'

export { useToast } from './hooks/useToast'
export type { ToastOptions, UseToastReturn } from './hooks/useToast'

// =============================================================================
// UTILITIES
// =============================================================================

export {
  sanitizeInput,
  sanitizeByInputType,
  sanitizeFormData,
  createSanitizationHook,
  validateSanitizedInput,
  isDOMPurifyAvailable,
  safeSanitizeInput,
  SANITIZATION_PROFILES,
  INPUT_TYPE_PROFILES,
} from './lib/sanitization'
export type { SanitizationConfig } from './lib/sanitization'

// =============================================================================
// RAW PRIMITIVES (Re-exported for backward compatibility)
// Apps should prefer using App* components above, but these are available
// for cases where raw primitives are needed
// =============================================================================

// Button
export { Button, buttonVariants } from './_primitives/button'
export type { ButtonProps } from './_primitives/button'

// Input
export { Input } from './_primitives/input'
export type { InputProps } from './_primitives/input'

// Label
export { Label } from './_primitives/label'
export type { LabelProps } from './_primitives/label'

// Textarea
export { Textarea } from './_primitives/textarea'
export type { TextareaProps } from './_primitives/textarea'

// Checkbox
export { Checkbox } from './_primitives/checkbox'

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './_primitives/card'

// Avatar
export { Avatar, AvatarImage, AvatarFallback } from './_primitives/avatar'

// Badge
export { Badge, badgeVariants } from './_primitives/badge'
export type { BadgeProps } from './_primitives/badge'

// Alert
export { Alert, AlertTitle, AlertDescription } from './_primitives/alert'

// Progress
export { Progress } from './_primitives/progress'

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './_primitives/table'

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from './_primitives/tabs'

// Accordion
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './_primitives/accordion'

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './_primitives/dialog'

// AlertDialog
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './_primitives/alert-dialog'

// DropdownMenu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './_primitives/dropdown-menu'

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './_primitives/select'
export type { SelectProps } from './_primitives/select'

// Form
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './_primitives/form'

