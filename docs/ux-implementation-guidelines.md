# 🛠️ UX Implementation Guidelines

## **🎯 Development Team Guidelines**

### **Design System Integration**

#### **Component Usage Standards**
```tsx
// ✅ CORRECT: Use design system components
import { Button, Card, Input } from '@repo/ui'
import { cn } from '@repo/ui/lib/utils'

// Apply LEGO-inspired styling
<Button
  variant="primary"
  size="lg"
  className="lego-brick-shadow hover:lego-lift"
>
  Build MOC
</Button>

// ❌ INCORRECT: Custom styling that breaks design system
<button className="bg-blue-500 px-4 py-2 rounded">
  Build MOC
</button>
```

#### **Consistent Spacing Application**
```tsx
// ✅ CORRECT: Use design system spacing
<div className="space-y-6 p-8">  {/* LEGO grid: 48px, 64px */}
  <section className="mb-4">     {/* 32px */}
    <h2 className="mb-2">Title</h2>  {/* 16px */}
  </section>
</div>

// ❌ INCORRECT: Random spacing values
<div className="space-y-5 p-7">  {/* Breaks 8px grid */}
```

### **Responsive Implementation**

#### **Mobile-First Approach**
```tsx
// ✅ CORRECT: Mobile-first responsive design
<div className="
  grid grid-cols-1           // Mobile: 1 column
  md:grid-cols-2            // Tablet: 2 columns
  lg:grid-cols-3            // Desktop: 3 columns
  xl:grid-cols-4            // Large: 4 columns
  gap-4 md:gap-6            // Responsive gaps
">
```

#### **Touch-Friendly Interactions**
```tsx
// ✅ CORRECT: Minimum 44px touch targets
<Button
  size="lg"                 // Ensures 44px minimum
  className="min-h-[44px] min-w-[44px]"
>
  <Icon className="h-5 w-5" />
</Button>
```

## **🎨 Visual Design Implementation**

### **LEGO-Inspired Animations**
```css
/* LEGO Brick Lift Effect */
.lego-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.lego-lift:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.1);
}

/* LEGO Snap Animation */
@keyframes lego-snap {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.lego-snap {
  animation: lego-snap 0.3s ease-in-out;
}
```

### **Loading States**
```tsx
// LEGO Brick Building Animation
<div className="flex items-center gap-2">
  <div className="flex gap-1">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="w-3 h-3 bg-primary rounded-sm animate-pulse"
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
  <span>Building your MOC...</span>
</div>
```

## **♿ Accessibility Implementation**

### **ARIA Labels & Roles**
```tsx
// ✅ CORRECT: Proper ARIA implementation
<button
  aria-label="Add MOC to wishlist"
  aria-describedby="wishlist-help"
  role="button"
>
  <Heart className="h-4 w-4" />
</button>
<div id="wishlist-help" className="sr-only">
  Click to save this MOC to your personal wishlist
</div>
```

### **Keyboard Navigation**
```tsx
// ✅ CORRECT: Keyboard accessible components
<div
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
  className="focus:ring-2 focus:ring-primary focus:outline-none"
>
  Interactive Element
</div>
```

### **Screen Reader Support**
```tsx
// ✅ CORRECT: Screen reader friendly
<img
  src={moc.imageUrl}
  alt={`${moc.title} - LEGO MOC with ${moc.partCount} parts, difficulty level ${moc.difficulty}`}
  loading="lazy"
/>

// Status announcements
<div aria-live="polite" className="sr-only">
  {saveStatus && `MOC saved successfully`}
</div>
```

## **🔄 State Management Integration**

### **Navigation State Integration**
```tsx
// ✅ CORRECT: Integrate with navigation system
import { useNavigation } from '@/components/Navigation'

function MOCDetailPage() {
  const { trackNavigation, setContextualItems } = useNavigation()

  useEffect(() => {
    // Set contextual navigation for MOC detail
    setContextualItems([
      { id: 'edit-moc', label: 'Edit MOC', href: `/moc/${id}/edit` },
      { id: 'duplicate-moc', label: 'Duplicate', href: `/moc/${id}/duplicate` }
    ])

    // Track page view
    trackNavigation('moc-detail-view', { mocId: id })
  }, [id])
}
```

### **Form State Management**
```tsx
// ✅ CORRECT: Consistent form patterns
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
})

function MOCEditForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '' }
  })

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>MOC Title</FormLabel>
            <FormControl>
              <Input {...field} className="lego-input" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}
```

## **📱 Performance Guidelines**

### **Image Optimization**
```tsx
// ✅ CORRECT: Optimized image loading
<img
  src={moc.imageUrl}
  alt={moc.title}
  loading="lazy"
  className="aspect-video object-cover rounded-lg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### **Code Splitting**
```tsx
// ✅ CORRECT: Lazy load heavy components
const MOCEditor = lazy(() => import('./MOCEditor'))
const WishlistManager = lazy(() => import('./WishlistManager'))

function MOCDetailPage() {
  return (
    <div>
      <MOCHeader />
      <Suspense fallback={<MOCEditorSkeleton />}>
        <MOCEditor />
      </Suspense>
    </div>
  )
}
```

## **🧪 Testing Integration**

### **Component Testing**
```tsx
// ✅ CORRECT: Test user interactions
import { render, screen, fireEvent } from '@testing-library/react'
import { MOCCard } from './MOCCard'

test('MOC card shows wishlist button for authenticated users', () => {
  render(<MOCCard moc={mockMOC} isAuthenticated={true} />)

  const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i })
  expect(wishlistButton).toBeInTheDocument()

  fireEvent.click(wishlistButton)
  expect(mockAddToWishlist).toHaveBeenCalledWith(mockMOC.id)
})
```

### **Accessibility Testing**
```tsx
// ✅ CORRECT: Test accessibility
import { axe, toHaveNoViolations } from 'jest-axe'

test('MOC detail page has no accessibility violations', async () => {
  const { container } = render(<MOCDetailPage />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## **🎯 Quality Checklist**

### **Before Code Review**
- [ ] Uses design system components consistently
- [ ] Follows LEGO 8px grid spacing system
- [ ] Implements proper ARIA labels and roles
- [ ] Includes keyboard navigation support
- [ ] Has loading and error states
- [ ] Optimizes images with lazy loading
- [ ] Tests accessibility with axe-core
- [ ] Validates responsive design on mobile
- [ ] Integrates with navigation system
- [ ] Follows performance best practices

## **🧪 Testing Integration**

### **Component Testing**
```tsx
// ✅ CORRECT: Test user interactions
import { render, screen, fireEvent } from '@testing-library/react'
import { MOCCard } from './MOCCard'

test('MOC card shows wishlist button for authenticated users', () => {
  render(<MOCCard moc={mockMOC} isAuthenticated={true} />)
  
  const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i })
  expect(wishlistButton).toBeInTheDocument()
  
  fireEvent.click(wishlistButton)
  expect(mockAddToWishlist).toHaveBeenCalledWith(mockMOC.id)
})
```

### **Accessibility Testing**
```tsx
// ✅ CORRECT: Test accessibility
import { axe, toHaveNoViolations } from 'jest-axe'

test('MOC detail page has no accessibility violations', async () => {
  const { container } = render(<MOCDetailPage />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```
