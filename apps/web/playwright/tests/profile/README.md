# Profile Page Playwright Tests

Comprehensive end-to-end tests for the new RTK-powered Profile page with enhanced LEGO-themed layout.

## Test Suites

### 1. **profile-rtk-layout.spec.ts** - Layout & Structure Tests
Tests the new ProfileLayout architecture with RTK integration:

- ✅ **Layout Structure** - ProfileLayout, sidebar, main content
- ✅ **LEGO-themed Gradient** - Orange/yellow/red gradient background
- ✅ **Navigation** - Back button functionality
- ✅ **Sidebar Content** - ProfileAvatar, user info, badges, bio, social links
- ✅ **Main Content** - ProfileMain with title and LegoProfileContent
- ✅ **Interactive Features** - Avatar upload, edit modal, tab navigation
- ✅ **Responsive Design** - Adapts to different screen sizes
- ✅ **Accessibility** - ARIA attributes, keyboard navigation
- ✅ **Performance** - Fast loading and smooth interactions

### 2. **profile-rtk-integration.spec.ts** - RTK Redux Integration Tests
Tests the Redux state management integration:

- ✅ **RTK State Integration** - Real-time statistics from Redux store
- ✅ **Recent Activities** - Activity feed from RTK state
- ✅ **Wishlist Preview** - Wishlist items from RTK state
- ✅ **MOC Instructions** - MOC grid with RTK data
- ✅ **Profile Data** - User statistics and preferences
- ✅ **Real-time Updates** - State updates without page refresh
- ✅ **Error Handling** - Loading states and error recovery
- ✅ **Performance** - Efficient rendering with RTK state

### 3. **profile-avatar-enhanced.spec.ts** - Enhanced Avatar Upload Tests
Tests the enhanced avatar upload functionality:

- ✅ **Avatar Display** - Correct image properties and styling
- ✅ **Hover Effects** - Overlay with pencil icon on hover
- ✅ **Status Indicators** - Online status and verification badges
- ✅ **File Upload** - Click-to-upload functionality
- ✅ **File Validation** - Type and size validation
- ✅ **Edit Modal Integration** - Avatar uploader in edit modal
- ✅ **Accessibility** - Keyboard navigation and screen reader support
- ✅ **Responsive Design** - Adapts to different screen sizes
- ✅ **UX Feedback** - Loading states and error handling

### 4. **profile-lego-content.spec.ts** - LEGO-Themed Content Tests
Tests the LEGO-specific content and branding:

- ✅ **LEGO Workshop Welcome** - Welcome message and branding
- ✅ **LEGO-themed Tabs** - MOCs, Instructions, Favorites, Achievements
- ✅ **Tab Navigation** - Smooth switching between tabs
- ✅ **MOCs Content** - MOC gallery and statistics
- ✅ **Instructions Content** - Building instructions and downloads
- ✅ **Favorites Content** - Favorite LEGO sets and MOCs
- ✅ **Achievements Content** - LEGO building achievements and badges
- ✅ **LEGO Terminology** - Proper use of LEGO-specific terms
- ✅ **Brand Consistency** - Consistent LEGO branding throughout

## Running the Tests

### Run All Profile Tests
```bash
npx playwright test tests/profile/
```

### Run Individual Test Suites
```bash
# From e2e app directory
cd apps/e2e

# Layout and structure tests
pnpm test tests/profile/profile-rtk-layout.spec.ts

# RTK integration tests
pnpm test tests/profile/profile-rtk-integration.spec.ts

# Enhanced avatar upload tests
pnpm test tests/profile/profile-avatar-enhanced.spec.ts

# LEGO-themed content tests
pnpm test tests/profile/profile-lego-content.spec.ts
```

### Run Tests with UI Mode
```bash
cd apps/e2e
pnpm test tests/profile/ --ui
```

### Run Tests in Debug Mode
```bash
cd apps/e2e
pnpm test tests/profile/ --debug
```

### Generate Test Report
```bash
cd apps/e2e
pnpm test tests/profile/
npx playwright show-report
```

## Test Configuration

The tests use the existing Playwright configuration with:

- **Browsers**: Chromium, Firefox, WebKit
- **Viewports**: Desktop (1280x720), Mobile (375x667)
- **Authentication**: Uses TEST_USERS.STANDARD from auth helpers
- **Timeouts**: 30 seconds for test timeout, 10 seconds for expect timeout
- **Retries**: 2 retries on CI, 0 locally

## Test Data and Fixtures

### Test Users
- Uses `TEST_USERS.STANDARD` for authentication
- Profile data: John Doe, john.doe@example.com, @johndoe

### Test Fixtures
- `test-avatar.jpg` - Test image for avatar upload functionality
- Mock RTK data for MOCs, wishlist, and profile statistics

### Expected Test Data
The tests expect the following mock data from RTK:

**MOC Instructions:**
- Custom Batmobile (156 downloads, 4.8 rating)
- Medieval Castle (234 downloads, 4.6 rating)  
- Space Station Alpha (89 downloads, 4.7 rating)

**Wishlist Items:**
- LEGO Creator Expert 10242
- LEGO Technic 42115

**User Profile:**
- Name: John Doe
- Email: john.doe@example.com
- Username: @johndoe
- Title: LEGO Builder
- Location: San Francisco, CA
- Bio: LEGO enthusiast and MOC creator

## Test Coverage

### Functional Coverage
- ✅ **Layout Rendering** - All components render correctly
- ✅ **User Interactions** - Clicks, hovers, form submissions
- ✅ **Navigation** - Tab switching, back button, modal opening
- ✅ **File Upload** - Avatar upload with validation
- ✅ **State Management** - RTK integration and updates
- ✅ **Error Handling** - Loading states and error recovery

### Cross-Browser Coverage
- ✅ **Chromium** - Primary testing browser
- ✅ **Firefox** - Cross-browser compatibility
- ✅ **WebKit** - Safari compatibility

### Device Coverage
- ✅ **Desktop** - 1920x1080, 1280x720
- ✅ **Tablet** - 768x1024
- ✅ **Mobile** - 375x667

### Accessibility Coverage
- ✅ **Keyboard Navigation** - Tab order and focus management
- ✅ **Screen Readers** - ARIA attributes and semantic HTML
- ✅ **Color Contrast** - LEGO-themed colors meet accessibility standards
- ✅ **Focus Indicators** - Visible focus states

## Debugging Tips

### Common Issues
1. **Authentication Failures** - Check if user is properly logged in
2. **Element Not Found** - Verify test IDs match component implementation
3. **Timing Issues** - Add appropriate waits for dynamic content
4. **File Upload Failures** - Ensure test fixtures exist

### Debug Commands
```bash
# Run with headed browser
npx playwright test tests/profile/ --headed

# Run specific test with debug
npx playwright test tests/profile/profile-rtk-layout.spec.ts --debug

# Generate trace for failed tests
npx playwright test tests/profile/ --trace on
```

### Useful Selectors
```typescript
// Layout elements
page.getByTestId('profile-layout')
page.getByTestId('profile-layout-sidebar')
page.getByTestId('profile-layout-content')

// Avatar elements
page.getByTestId('profile-avatar')
page.getByTestId('avatar-container')
page.getByTestId('avatar-hover-overlay')

// Content elements
page.getByTestId('lego-profile-content')
page.getByTestId('content-tabs')
page.getByTestId('tab-mocs')

// Interactive elements
page.getByTestId('button-default') // Edit button
page.getByTestId('back-button')
page.getByTestId('avatar-file-input')
```

## Contributing

When adding new tests:

1. **Follow Naming Convention** - Use descriptive test names
2. **Use Test IDs** - Prefer `data-testid` over CSS selectors
3. **Add Proper Waits** - Use `waitForLoadState` and `waitForTimeout`
4. **Test Error States** - Include negative test cases
5. **Document Expected Data** - Update this README with new test data requirements

## Maintenance

### Regular Updates Needed
- Update test data when mock data changes
- Update selectors when component structure changes
- Update expected text when copy changes
- Update styling checks when design changes

### Performance Monitoring
- Monitor test execution time
- Check for flaky tests and add stability improvements
- Update timeouts as needed for slower environments
