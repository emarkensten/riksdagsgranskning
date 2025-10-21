# Design Guidelines - Riksdagsgranskning

## Overview
All UI components follow clean, minimal design principles using **shadcn/ui** with full **dark mode support**. This ensures a consistent, professional appearance across the application.

## Core Principles

### 1. **Dark Mode First**
- All components must support both light and dark modes seamlessly
- Use Tailwind CSS dark mode classes (`dark:` prefix)
- Test all components in both themes before shipping

### 2. **shadcn/ui Standard**
- Leverage shadcn/ui component library for consistency
- Use Radix UI primitives as foundation
- Maintain Tailwind CSS for all custom styling
- Never override component base styles without strong justification

### 3. **Accessibility (WCAG 2.1 AA)**
- All interactive elements must be keyboard accessible
- Use semantic HTML (`<button>`, `<a>`, `<form>`, etc.)
- Maintain proper color contrast (4.5:1 for text)
- Include proper ARIA labels where needed

### 4. **Clean & Minimal**
- Whitespace > decoration
- Clear information hierarchy
- No unnecessary visual elements
- Swedish language consistent throughout

## Color Palette

### Light Mode
- **Background**: `white` (#FFFFFF)
- **Surface**: `neutral-50` (#F9FAFB)
- **Border**: `neutral-200` (#E5E7EB)
- **Text Primary**: `neutral-900` (#111827)
- **Text Secondary**: `neutral-600` (#4B5563)
- **Accent**: `blue-600` (#2563EB)
- **Success**: `green-600` (#16A34A)
- **Warning**: `yellow-600` (#CA8A04)
- **Danger**: `red-600` (#DC2626)

### Dark Mode
- **Background**: `neutral-950` (#030712)
- **Surface**: `neutral-900` (#111827)
- **Border**: `neutral-800` (#1F2937)
- **Text Primary**: `neutral-50` (#F9FAFB)
- **Text Secondary**: `neutral-400` (#9CA3AF)
- **Accent**: `blue-500` (#3B82F6)
- **Success**: `green-500` (#22C55E)
- **Warning**: `yellow-500` (#EAB308)
- **Danger**: `red-500` (#EF4444)

## Typography

```typescript
// Headings
h1: text-4xl font-bold leading-tight
h2: text-3xl font-bold leading-tight
h3: text-2xl font-bold leading-snug
h4: text-xl font-semibold leading-snug

// Body
body: text-base font-normal leading-relaxed
small: text-sm font-normal leading-relaxed
```

## Spacing

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
```

Use consistent spacing for:
- **Padding**: p-4, p-6, p-8 (internal content)
- **Margin**: m-4, m-6, m-8 (spacing between sections)
- **Gap**: gap-4, gap-6 (flex/grid layouts)

## Components

### Navigation Header
- Background: `bg-white dark:bg-neutral-900`
- Border: `border-b border-neutral-200 dark:border-neutral-800`
- Logo: 32px height, left-aligned
- Menu items: Flex layout with 2rem gaps
- Active indicator: Bottom border in accent color

### Cards/Surfaces
- Background: `bg-neutral-50 dark:bg-neutral-800`
- Border: `border border-neutral-200 dark:border-neutral-700`
- Padding: `p-6`
- Corner radius: `rounded-lg` (8px)
- Shadow: `shadow-sm` light mode, subtle shadow in dark

### Forms
- Label: `text-sm font-medium text-neutral-700 dark:text-neutral-300`
- Input background: `bg-white dark:bg-neutral-800`
- Input border: `border-neutral-300 dark:border-neutral-600`
- Focus state: `ring-2 ring-blue-500`
- Error state: `ring-2 ring-red-500`

### Buttons
- **Primary**: `bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600`
- **Secondary**: `bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white`
- **Ghost**: `text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-neutral-800`
- **Disabled**: `opacity-50 cursor-not-allowed`

## Responsive Breakpoints

```
mobile:   < 640px
tablet:   640px - 1024px
desktop:  > 1024px
```

Use Tailwind responsive prefixes:
```
sm:  (640px)
md:  (768px)
lg:  (1024px)
xl:  (1280px)
2xl: (1536px)
```

## Implementation Examples

### Dark Mode Toggle (App Level)
```typescript
// In layout.tsx or root provider
<html lang="sv" suppressHydrationWarning>
  <head>...</head>
  <body>
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  </body>
</html>
```

### Component with Dark Mode
```typescript
export function MyComponent() {
  return (
    <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50">
      <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        Title
      </h1>
    </div>
  )
}
```

### Interactive Elements
```typescript
// Always include focus states for accessibility
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900">
  Click me
</button>
```

## Testing Checklist

Before shipping any component:
- [ ] Light mode appearance verified
- [ ] Dark mode appearance verified
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console warnings

## Tailwind CSS Configuration

Ensure `tailwind.config.js` includes:
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
}
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI](https://radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
