// Core components
export { Button, buttonVariants } from './button'
export { CustomButton, customButtonVariants } from './custom-button'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export { Input } from './input'
export { Label } from './label'

// Form components
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './form'

// Enhanced form error message components
export {
  FormErrorMessage,
  EnhancedFormMessage,
  FieldErrorMessage,
  FormLevelErrorMessage,
} from './form-error-message'

export type { ErrorMessageType, FormErrorMessageProps } from './form-error-message'

// Validation utilities
export {
  validationMessages,
  createEnhancedSchemas,
  validatePasswordStrength,
  validateFile,
  getNetworkErrorMessage,
  createFormValidationHelpers,
} from './validation-messages'

// Dialog components
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

// Select components
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select'

// MultiSelect component
export { MultiSelect } from './multi-select'

// Avatar components
export { Avatar, AvatarFallback, AvatarImage } from './avatar'

// Badge component
export { Badge, badgeVariants } from './badge'

// Accordion components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'

// Alert Dialog components
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog'

// Checkbox component
export { Checkbox } from './checkbox'

// Collapsible components
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'

// Command components
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'

// Context Menu components
export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './context-menu'

// Dropdown Menu components
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu'

// Hover Card components
export { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'

// Menubar components
export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from './menubar'

// Navigation Menu components
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from './navigation-menu'

// Popover components
export { Popover, PopoverContent, PopoverTrigger } from './popover'

// Progress component
export { Progress } from './progress'

// Radio Group components
export { RadioGroup, RadioGroupItem } from './radio-group'

// Scroll Area component
export { ScrollArea, ScrollBar } from './scroll-area'

// Separator component
export { Separator } from './separator'

// Sheet components
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

// Slider components
export { Slider } from './slider'

// Switch component
export { Switch } from './switch'

// Table components
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

// Tabs components
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { default as TabsWithBadgeDemo } from './tabs-with-badge-demo'
export { default as TabsWithBadgeDemoExample } from './tabs-with-badge-demo.example'

// Textarea component
export { Textarea } from './textarea'

// Sonner component (replaces toast)
export { Toaster } from './sonner'

// Toast utilities
export {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  getErrorMessage,
} from './toast-utils'
export type { ApiError, ToastType } from './toast-utils'

// Toggle components
export { Toggle, toggleVariants } from './toggle'

// Toggle Group components
export { ToggleGroup, ToggleGroupItem } from './toggle-group'

// Tooltip components
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

// Utils
export { cn } from './lib/utils'

// Showcase component
export { ComponentShowcase } from './ComponentShowcase'

// Composite components
export { AppCard } from './AppCard'
export { AppAvatar } from './AppAvatar'
export { AppDataTable } from './AppDataTable'
export { ConfirmationDialog } from './ConfirmationDialog'
export { FormSection } from './FormSection'
export { PageHeader } from './PageHeader'
export { TabPanel } from './TabPanel'

// Guided Tour components
export { TourProvider, TourStep, TourTrigger, useTour } from './guided-tour'

// Error Boundary components
export {
  ErrorBoundary,
  useErrorHandler,
  generateErrorReport,
  sendErrorReport,
} from './error-boundary'

export type { ErrorInfo } from './error-boundary'
export { ErrorInfoSchema } from './error-boundary'

export {
  ApiErrorBoundary,
  FormErrorBoundary,
  DataErrorBoundary,
  ComponentErrorBoundary,
  withErrorBoundary,
  useAsyncError,
  ApiErrorSchema,
} from './error-boundary-specialized'

export type { ApiError } from './error-boundary-specialized'

// Error Boundary example
export { ErrorBoundaryExample } from './error-boundary.example'

// Loading Spinner components
export {
  LoadingSpinner,
  PulseSpinner,
  DotsSpinner,
  spinnerVariants,
  pulseVariants,
  dotsVariants,
} from './loading-spinner'

// Skeleton components
export {
  Skeleton,
  CardSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  skeletonVariants,
} from './skeleton'

// Progress Indicator components
export {
  ProgressIndicator,
  CircularProgress,
  LoadingOverlay,
  progressVariants,
  progressBarVariants,
} from './progress-indicator'

// Loading States Hook
export { useLoadingStates, useMultipleLoadingStates } from './hooks/useLoadingStates'

export type {
  LoadingType,
  LoadingState,
  UseLoadingStatesOptions,
  UseLoadingStatesReturn,
} from './hooks/useLoadingStates'

// Loading States Example
export { LoadingStatesExample } from './loading-states-example'

// Form Error Example
export { FormErrorExample } from './form-error-example'

// Theme components
export { ThemeProvider, useTheme } from './providers/ThemeProvider'
export { ThemeToggle } from './components/ThemeToggle'

// Secure App Components (with DOMPurify sanitization)
export { AppInput } from './AppInput'
export { AppTextarea } from './AppTextarea'
export { AppSelect } from './AppSelect'
export { AppLabel } from './AppLabel'
export { AppForm } from './AppForm'
export { AppSafeContent } from './AppSafeContent'

// Sanitization utilities
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
export type { AppInputProps } from './AppInput'
export type { AppTextareaProps } from './AppTextarea'
export type { AppSelectProps, AppSelectOption } from './AppSelect'
export type { AppLabelProps } from './AppLabel'
export type { AppFormProps } from './AppForm'
export type { AppSafeContentProps } from './AppSafeContent'
