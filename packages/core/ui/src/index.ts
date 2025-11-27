// Core UI Components
export { Button, buttonVariants } from './button'
export { CustomButton, customButtonVariants } from './custom-button'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export { Input } from './input'
export { Label } from './label'

// Form Components
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

export {
  FormErrorMessage,
  EnhancedFormMessage,
  FieldErrorMessage,
  FormLevelErrorMessage,
} from './form-error-message'
export type { ErrorMessageType, FormErrorMessageProps } from './form-error-message'

// Validation
export {
  validationMessages,
  createEnhancedSchemas,
  validatePasswordStrength,
  validateFile,
  getNetworkErrorMessage,
  createFormValidationHelpers,
} from './validation-messages'

// Dialog Components
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

// Select Components
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

export { MultiSelect } from './multi-select'

// Avatar & Badge
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Badge, badgeVariants } from './badge'

// Accordion
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'

// Alert
export { Alert, AlertTitle, AlertDescription } from './alert'

// Alert Dialog
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

// Checkbox & Collapsible
export { Checkbox } from './checkbox'
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'

// Command
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

// Context Menu
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

// Dropdown Menu
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

// Hover Card
export { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'

// Menubar
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

// Navigation Menu
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

// Popover & Progress
export { Popover, PopoverContent, PopoverTrigger } from './popover'
export { Progress } from './progress'

// Radio Group & Scroll Area
export { RadioGroup, RadioGroupItem } from './radio-group'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Separator } from './separator'

// Sheet
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

// Slider & Switch
export { Slider } from './slider'
export { Switch } from './switch'

// Table
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

// Tabs
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { default as TabsWithBadgeDemo } from './tabs-with-badge-demo'
export { default as TabsWithBadgeDemoExample } from './tabs-with-badge-demo.example'

// Textarea & Toast
export { Textarea } from './textarea'
export { Toaster } from './sonner'

// Toggle
export { Toggle, toggleVariants } from './toggle'
export { ToggleGroup, ToggleGroupItem } from './toggle-group'

// Tooltip
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

// Utils
export { cn } from './lib/utils'

// App Components
export { ComponentShowcase } from './ComponentShowcase'
export { AppCard } from './AppCard'
export { AppAvatar } from './AppAvatar'
export { AppDataTable } from './AppDataTable'
export { ConfirmationDialog } from './ConfirmationDialog'
export { FormSection } from './FormSection'
export { PageHeader } from './PageHeader'
export { TabPanel } from './TabPanel'

// Guided Tour
export { TourProvider, TourStep, TourTrigger, useTour } from './guided-tour'

// Error Boundary
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
export { ErrorBoundaryExample } from './error-boundary.example'

// Loading Components
export {
  LoadingSpinner,
  PulseSpinner,
  DotsSpinner,
  spinnerVariants,
  pulseVariants,
  dotsVariants,
} from './loading-spinner'

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

export {
  ProgressIndicator,
  CircularProgress,
  LoadingOverlay,
  progressVariants,
  progressBarVariants,
} from './progress-indicator'

// Hooks
export { useLoadingStates, useMultipleLoadingStates } from './hooks/useLoadingStates'
export type {
  LoadingType,
  LoadingState,
  UseLoadingStatesOptions,
  UseLoadingStatesReturn,
} from './hooks/useLoadingStates'

// Examples
export { LoadingStatesExample } from './loading-states-example'
export { FormErrorExample } from './form-error-example'

// Theme
export { ThemeProvider, useTheme } from './providers/ThemeProvider'
export { ThemeToggle } from './components/ThemeToggle'

// Enhanced App Components
export { AppInput } from './AppInput'
export { AppTextarea } from './AppTextarea'
export { AppSelect } from './AppSelect'
export { AppLabel } from './AppLabel'
export { AppForm } from './AppForm'
export { AppSafeContent } from './AppSafeContent'

// Sanitization
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

// Types
export type { SanitizationConfig } from './lib/sanitization'
export type { AppInputProps } from './AppInput'
export type { AppTextareaProps } from './AppTextarea'
export type { AppSelectProps, AppSelectOption } from './AppSelect'
export type { AppLabelProps } from './AppLabel'
export type { AppFormProps } from './AppForm'
export type { AppSafeContentProps } from './AppSafeContent'
