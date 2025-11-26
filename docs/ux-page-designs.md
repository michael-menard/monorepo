# 🎨 Page-Specific UX Design Specifications

## **🏗️ MOC Detail Page - Enhanced Design**

### **Current Issues Identified**
- **Complex 1,300+ line component** with mixed responsibilities
- **Inconsistent editing patterns** across different sections
- **File upload UX** needs streamlining
- **Tabbed interface** could be more intuitive

### **🎯 Enhanced MOC Detail Design**

#### **Page Structure**
```tsx
<PageContainer>
  <MOCDetailHeader>
    <EnhancedBreadcrumb />
    <MOCTitleSection editable={true} />
    <MOCActionBar />
  </MOCDetailHeader>
  
  <MOCDetailContent>
    <MOCHeroSection />
    <MOCTabNavigation />
    <MOCTabContent />
  </MOCDetailContent>
</PageContainer>
```

#### **Hero Section Design**
- **Large Cover Image**: 16:9 aspect ratio with lazy loading
- **Quick Stats**: Parts count, difficulty, build time in LEGO brick cards
- **Action Buttons**: Edit, Share, Download, Add to Wishlist
- **Author Info**: Avatar, name, build date with LEGO minifigure styling

#### **Enhanced Tabbed Interface**
```tsx
<Tabs defaultValue="overview" className="lego-tabs">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="overview">📋 Overview</TabsTrigger>
    <TabsTrigger value="instructions">📖 Instructions</TabsTrigger>
    <TabsTrigger value="parts">🧩 Parts List</TabsTrigger>
    <TabsTrigger value="gallery">🖼️ Gallery</TabsTrigger>
  </TabsList>
</Tabs>
```

#### **Inline Editing Pattern**
- **Click to Edit**: Seamless transition from display to edit mode
- **Auto-save**: Real-time saving with visual feedback
- **Validation**: Inline validation with LEGO-themed error messages
- **Cancel/Save**: Clear action buttons with confirmation

### **File Management Enhancement**
- **Drag & Drop Zone**: LEGO brick-styled drop area
- **Progress Indicators**: LEGO brick building animation
- **File Preview**: Thumbnail generation for PDFs and .io files
- **Bulk Operations**: Select multiple files with LEGO checkbox styling

## **🖼️ Gallery Pages - Modern Design**

### **Current Issues**
- **Basic grid layout** without advanced filtering
- **Limited search functionality**
- **Inconsistent card designs** across different galleries

### **🎯 Enhanced Gallery Design**

#### **Gallery Header**
```tsx
<GalleryHeader>
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-page-title">MOC Gallery</h1>
      <p className="text-muted-foreground">Discover amazing LEGO creations</p>
    </div>
    <GalleryViewToggle />
  </div>
  <GalleryFilters />
  <GallerySearch />
</GalleryHeader>
```

#### **Advanced Filtering System**
- **Category Filters**: LEGO themes (City, Space, Castle, etc.)
- **Difficulty Levels**: Visual difficulty indicators
- **Part Count Range**: Slider with LEGO brick visualization
- **Sort Options**: Newest, Popular, Most Liked, Difficulty

#### **Enhanced Gallery Cards**
```tsx
<GalleryCard className="lego-brick-card">
  <CardImage />
  <CardContent>
    <CardTitle />
    <CardStats />
    <CardActions />
  </CardContent>
  <CardHover>
    <QuickActions />
  </CardHover>
</GalleryCard>
```

#### **Masonry Layout with Infinite Scroll**
- **Responsive Columns**: 1-2-3-4 columns based on screen size
- **Lazy Loading**: Images load as user scrolls
- **Skeleton Loading**: LEGO brick-shaped loading placeholders
- **Smooth Animations**: Framer Motion for card entrance

## **❤️ Wishlist Page - Priority Management**

### **Current Issues**
- **Complex 1,300+ line component** with multiple view modes
- **Priority management** could be more visual
- **Drag & drop** needs better feedback
- **Real-time saving** status unclear

### **🎯 Enhanced Wishlist Design**

#### **Wishlist Header with Stats**
```tsx
<WishlistHeader>
  <WishlistStats>
    <StatCard icon="🎯" label="High Priority" count={highPriorityCount} />
    <StatCard icon="💰" label="Total Value" count={totalValue} />
    <StatCard icon="📦" label="Total Items" count={totalItems} />
  </WishlistStats>
  <WishlistActions />
</WishlistHeader>
```

#### **Enhanced Priority System**
- **Visual Priority Indicators**: LEGO brick colors (Red=High, Yellow=Medium, Green=Low)
- **Drag & Drop Reordering**: Smooth animations with drop zones
- **Bulk Priority Changes**: Select multiple items and change priority
- **Priority Filtering**: Quick filter by priority level

#### **Multiple View Modes**
1. **List View**: Compact rows with all details visible
2. **Grid View**: Card-based layout with images
3. **Gallery View**: Image-focused with minimal text
4. **Kanban View**: Priority-based columns (High/Medium/Low)

#### **Real-time Save Indicators**
```tsx
<SaveStatus>
  {saving && <Spinner />}
  {lastSaved && <CheckIcon />}
  {error && <ErrorIcon />}
  <span>Last saved: {formatTime(lastSaved)}</span>
</SaveStatus>
```

## **👤 Profile Page - User-Centric Design**

### **Enhanced Profile Layout**
```tsx
<ProfileContainer>
  <ProfileHeader>
    <ProfileAvatar size="large" />
    <ProfileInfo />
    <ProfileActions />
  </ProfileHeader>
  
  <ProfileContent>
    <ProfileTabs>
      <Tab>My MOCs</Tab>
      <Tab>Wishlist</Tab>
      <Tab>Settings</Tab>
      <Tab>Activity</Tab>
    </ProfileTabs>
    <ProfileTabContent />
  </ProfileContent>
</ProfileContainer>
```

#### **Profile Statistics Dashboard**
- **Build Statistics**: MOCs created, downloads, likes
- **Activity Timeline**: Recent builds and interactions
- **Achievement Badges**: LEGO-themed accomplishments
- **Building Streaks**: Consecutive days of activity

## **🔐 Authentication Pages - Welcoming Design**

### **Enhanced Auth Layout**
```tsx
<AuthContainer>
  <AuthBranding>
    <LEGOLogo />
    <WelcomeMessage />
  </AuthBranding>
  
  <AuthCard>
    <AuthForm />
    <AuthAlternatives />
  </AuthCard>
  
  <AuthFooter />
</AuthContainer>
```

#### **LEGO-Themed Auth Elements**
- **Loading States**: LEGO minifigure building animation
- **Success States**: LEGO brick "snap" confirmation
- **Error States**: Gentle shake with helpful messaging
- **Social Login**: LEGO brick-styled social buttons
