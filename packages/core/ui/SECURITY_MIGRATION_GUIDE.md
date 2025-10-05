# Security Migration Guide: DOMPurify Integration

This guide explains how to migrate from regular UI components to secure App components that automatically sanitize user input using DOMPurify.

## 🔒 Why Use Secure Components?

The App-prefixed components provide automatic XSS protection by sanitizing all user input using DOMPurify. This ensures that malicious scripts and HTML cannot be injected through user inputs.

## 📦 Available Secure Components

| Regular Component | Secure Component | Purpose |
|------------------|------------------|---------|
| `Input` | `AppInput` | Text inputs with automatic sanitization |
| `Textarea` | `AppTextarea` | Multi-line text inputs with sanitization |
| `Select` | `AppSelect` | Select dropdowns with sanitized options |
| `Label` | `AppLabel` | Form labels with sanitized text |
| `form` | `AppForm` | Forms with automatic data sanitization |
| N/A | `AppSafeContent` | Display user-generated content safely |

## 🚀 Quick Migration Examples

### Input Components

**Before:**
```tsx
import { Input } from '@repo/ui';

<Input 
  type="text" 
  placeholder="Enter your name"
  onChange={(e) => setName(e.target.value)}
/>
```

**After:**
```tsx
import { AppInput } from '@repo/ui';

<AppInput
  type="text"
  placeholder="Enter your name"
  onChange={(e) => setName(e.target.value)} // Value is automatically sanitized
  showSanitizationWarnings={process.env.NODE_ENV === 'development'}
  debounceMs={300} // Optional: debounce onChange events
/>
```

### Textarea Components

**Before:**
```tsx
import { Textarea } from '@repo/ui';

<Textarea 
  placeholder="Enter your message"
  onChange={(e) => setMessage(e.target.value)}
/>
```

**After:**
```tsx
import { AppTextarea, SANITIZATION_PROFILES } from '@repo/ui';

<AppTextarea
  placeholder="Enter your message"
  onChange={(e) => setMessage(e.target.value)}
  sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT} // Allows basic formatting
  debounceMs={500} // Optional: debounce for better performance on long text
/>
```

### Select Components

**Before:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui';

<Select onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**After:**
```tsx
import { AppSelect } from '@repo/ui';

<AppSelect 
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  placeholder="Select option"
  onValueChange={setValue} // Values are automatically sanitized
/>
```

### Form Components

**Before:**
```tsx
<form onSubmit={handleSubmit}>
  <Input name="email" type="email" />
  <Textarea name="message" />
  <button type="submit">Submit</button>
</form>
```

**After:**
```tsx
import { AppForm, AppInput, AppTextarea, SANITIZATION_PROFILES } from '@repo/ui';

<AppForm 
  onSubmit={(e, sanitizedData) => handleSubmit(sanitizedData)}
  fieldSanitizationConfigs={{
    message: SANITIZATION_PROFILES.BASIC_TEXT,
    email: SANITIZATION_PROFILES.STRICT
  }}
>
  <AppInput name="email" type="email" />
  <AppTextarea name="message" />
  <button type="submit">Submit</button>
</AppForm>
```

## 🛡️ Sanitization Profiles

Choose the appropriate sanitization level for your use case:

### `SANITIZATION_PROFILES.STRICT`
- **Use for:** Email, passwords, search inputs, IDs
- **Allows:** Plain text only
- **Removes:** All HTML tags and attributes

```tsx
<AppInput 
  type="email"
  sanitizationConfig={SANITIZATION_PROFILES.STRICT}
/>
```

### `SANITIZATION_PROFILES.BASIC_TEXT`
- **Use for:** Comments, descriptions, short messages
- **Allows:** Basic formatting (`<b>`, `<i>`, `<em>`, `<strong>`, `<u>`, `<br>`)
- **Removes:** Scripts, links, complex HTML

```tsx
<AppTextarea 
  sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT}
/>
```

### `SANITIZATION_PROFILES.RICH_TEXT`
- **Use for:** Blog posts, articles, rich content
- **Allows:** Headings, paragraphs, lists, links, formatting
- **Removes:** Scripts, dangerous attributes, unsafe elements

```tsx
<AppSafeContent 
  content={userBlogPost}
  sanitizationConfig={SANITIZATION_PROFILES.RICH_TEXT}
/>
```

### `SANITIZATION_PROFILES.SEARCH`
- **Use for:** Search queries
- **Allows:** Plain text with search-safe characters
- **Removes:** All HTML and special characters

```tsx
<AppInput 
  type="search"
  sanitizationConfig={SANITIZATION_PROFILES.SEARCH}
/>
```

## ⚙️ Advanced Configuration

### Custom Sanitization Config

```tsx
import { AppInput, SanitizationConfig } from '@repo/ui';

const customConfig: SanitizationConfig = {
  allowBasicHTML: true,
  allowLinks: false,
  customConfig: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
};

<AppInput 
  sanitizationConfig={customConfig}
  showSanitizationWarnings
  onSanitizationWarning={(warnings) => console.warn(warnings)}
/>
```

### Sanitization Timing

```tsx
// Sanitize on every keystroke (default)
<AppInput sanitizeOnChange={true} />

// Sanitize only when user leaves the field
<AppInput sanitizeOnChange={false} />
```

### Debouncing for Performance

App components include optional debouncing to improve performance and user experience:

```tsx
// Basic debouncing - delays onChange calls
<AppInput
  debounceMs={300} // Wait 300ms after user stops typing
  onChange={(e) => handleSearch(e.target.value)}
/>

// Search input with longer debounce
<AppInput
  type="search"
  debounceMs={500} // Wait 500ms for search queries
  onChange={(e) => performSearch(e.target.value)}
/>

// Textarea with debouncing for long content
<AppTextarea
  debounceMs={1000} // Wait 1 second for auto-save
  onChange={(e) => autoSave(e.target.value)}
/>

// Disable debouncing for immediate feedback
<AppInput
  debounceMs={0} // No debouncing
  onChange={(e) => setPassword(e.target.value)}
/>

// Debounce onChange but not sanitization
<AppInput
  debounceMs={300}
  debounceSanitization={false} // Sanitize immediately, debounce onChange
/>
```

**When to use debouncing:**
- ✅ Search inputs (300-500ms)
- ✅ Auto-save functionality (500-1000ms)
- ✅ API calls triggered by input (300-500ms)
- ✅ Expensive validation (200-300ms)
- ❌ Password fields (immediate feedback needed)
- ❌ Critical form fields (immediate validation needed)

## 🧪 Testing Your Migration

### 1. Test with Malicious Input

```tsx
// Test these inputs to verify sanitization works:
const testInputs = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(1)">',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(1)"></iframe>',
];
```

### 2. Enable Development Warnings

```tsx
<AppInput 
  showSanitizationWarnings={process.env.NODE_ENV === 'development'}
  onSanitizationWarning={(warnings) => {
    // Log or handle sanitization warnings
    console.warn('Input was sanitized:', warnings);
  }}
/>
```

## 📋 Migration Checklist

- [ ] Replace `Input` with `AppInput` for all user inputs
- [ ] Replace `Textarea` with `AppTextarea` for multi-line inputs  
- [ ] Replace `Select` with `AppSelect` for dropdowns with user data
- [ ] Replace `Label` with `AppLabel` for labels with dynamic content
- [ ] Wrap forms with `AppForm` for automatic data sanitization
- [ ] Use `AppSafeContent` for displaying user-generated HTML content
- [ ] Choose appropriate sanitization profiles for each use case
- [ ] Enable sanitization warnings in development
- [ ] Test with malicious input to verify protection
- [ ] Update TypeScript imports and types

## 🔧 Troubleshooting

### Content Being Over-Sanitized?

If legitimate content is being removed, try a less strict profile:

```tsx
// Too strict - removes all formatting
<AppTextarea sanitizationConfig={SANITIZATION_PROFILES.STRICT} />

// Better for formatted text
<AppTextarea sanitizationConfig={SANITIZATION_PROFILES.BASIC_TEXT} />
```

### SSR Issues?

The components are SSR-safe and will fall back to basic string cleaning:

```tsx
import { isDOMPurifyAvailable } from '@repo/ui';

if (!isDOMPurifyAvailable()) {
  // DOMPurify not available (SSR environment)
  // Components will use fallback sanitization
}
```

### Performance Concerns?

For high-frequency inputs, consider sanitizing only on blur:

```tsx
<AppInput 
  sanitizeOnChange={false} // Only sanitize when user leaves field
/>
```

## 🎯 Best Practices

1. **Always use App components** for user inputs
2. **Choose the least restrictive profile** that still provides security
3. **Enable warnings in development** to catch over-sanitization
4. **Test with malicious input** to verify protection works
5. **Document your sanitization choices** for team members
6. **Use TypeScript** to catch migration issues early

## 📚 Additional Resources

- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention](https://owasp.org/www-community/xss-filter-evasion-cheatsheet)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
