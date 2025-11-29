# 🎨 UX Migration Design System Specifications

## **LEGO MOC Enhanced Design Language**

### **🎯 Design Principles**

1. **LEGO-Inspired Modularity**: Components snap together like LEGO bricks
2. **Playful Professionalism**: Serious functionality with delightful interactions
3. **Builder-Centric**: Optimized for creators and builders
4. **Accessibility First**: WCAG 2.1 AA compliance throughout

### **🎨 Enhanced Color Palette**

```css
/* LEGO MOC Semantic Colors */
:root {
  /* Primary - Vibrant Teal (LEGO Classic) */
  --primary: hsl(178, 79%, 32%);
  --primary-hover: hsl(178, 79%, 28%);
  --primary-active: hsl(178, 79%, 24%);

  /* Secondary - Warm Cream (LEGO Baseplate) */
  --secondary: hsl(45, 67%, 90%);
  --secondary-hover: hsl(45, 67%, 85%);

  /* Accent - LEGO Brick Red */
  --accent-red: hsl(0, 85%, 55%);
  --accent-yellow: hsl(48, 100%, 50%);
  --accent-blue: hsl(220, 85%, 55%);
  --accent-green: hsl(120, 85%, 45%);
}
```

### **📐 Spacing System (LEGO Grid)**

```css
/* LEGO-Inspired 8px Grid System */
:root {
  --space-1: 0.5rem; /* 8px - LEGO stud */
  --space-2: 1rem; /* 16px - 2 studs */
  --space-3: 1.5rem; /* 24px - 3 studs */
  --space-4: 2rem; /* 32px - 4 studs */
  --space-6: 3rem; /* 48px - 6 studs */
  --space-8: 4rem; /* 64px - 8 studs */
}
```

### **🔤 Typography Hierarchy**

```css
/* Enhanced Typography Scale */
.text-hero {
  font-size: 3.5rem; /* 56px */
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.text-page-title {
  font-size: 2.25rem; /* 36px */
  font-weight: 700;
  line-height: 1.2;
}

.text-section-title {
  font-size: 1.5rem; /* 24px */
  font-weight: 600;
  line-height: 1.3;
}
```

## **🧩 Component Design Specifications**

### **📱 Page Layout Components**

#### **Enhanced Page Container**

```tsx
// Consistent page wrapper for all migrated pages
<div className="min-h-screen bg-background">
  <div className="container mx-auto px-4 py-6 max-w-7xl">
    <PageHeader />
    <PageContent />
    <PageFooter />
  </div>
</div>
```

#### **Page Header Pattern**

```tsx
<header className="mb-8 space-y-4">
  <EnhancedBreadcrumb />
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-page-title">Page Title</h1>
      <p className="text-muted-foreground">Page description</p>
    </div>
    <QuickActions />
  </div>
</header>
```

### **🎴 Gallery Components**

#### **Enhanced Gallery Grid**

```tsx
// Responsive masonry layout with LEGO-inspired cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {items.map(item => (
    <GalleryCard key={item.id} variant="lego-brick" hover="lift-shadow" {...item} />
  ))}
</div>
```

#### **LEGO Brick Card Design**

- **Border Radius**: `12px` (LEGO brick corners)
- **Shadow**: Layered shadows mimicking LEGO depth
- **Hover**: Subtle lift animation with enhanced shadow
- **Colors**: Semantic color variants for different content types

### **📋 Form Components**

#### **Enhanced Form Layout**

```tsx
<Card className="lego-form-card">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      Form Title
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <FormFields />
  </CardContent>
</Card>
```

## **🎭 Interaction Design Patterns**

### **Micro-Interactions**

1. **LEGO Snap Animation**: Form submissions with satisfying "snap" feedback
2. **Brick Stack Loading**: Loading states that build like LEGO towers
3. **Stud Hover Effects**: Buttons with LEGO stud-inspired hover states
4. **Modular Transitions**: Page transitions that feel like connecting bricks

### **Feedback Systems**

1. **Success States**: Green with LEGO checkmark animation
2. **Error States**: Red with gentle shake animation
3. **Loading States**: LEGO brick building animation
4. **Empty States**: Playful LEGO minifigure illustrations

## **📱 Responsive Design Strategy**

### **Breakpoint System**

```css
/* LEGO-Inspired Breakpoints */
:root {
  --breakpoint-sm: 640px; /* Mobile landscape */
  --breakpoint-md: 768px; /* Tablet portrait */
  --breakpoint-lg: 1024px; /* Tablet landscape */
  --breakpoint-xl: 1280px; /* Desktop */
  --breakpoint-2xl: 1536px; /* Large desktop */
}
```

### **Mobile-First Approach**

- **Touch Targets**: Minimum 44px for all interactive elements
- **Thumb-Friendly**: Important actions within thumb reach
- **Swipe Gestures**: Natural swipe navigation for galleries
- **Responsive Typography**: Fluid type scale across devices
