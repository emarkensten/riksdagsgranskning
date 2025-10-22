# Design Guidelines - Riksdagsgranskning

## Design Philosophy

Every app should feel like it was designed by a professional team, not thrown together. These guidelines ensure consistency, readability, and usability across the entire application.

**Core Principle:** Substance over style. Professionalism through discipline.

## Core Principles

### 1. **Color with Discipline**
- **Maximum 3-5 colors total** - never more
- 1 primary color (brand), 2-3 neutral tones, 1-2 accent colors
- Use semantic design tokens (`bg-background`, `text-foreground`) instead of hardcoded colors
- **Avoid purple/violet** unless explicitly requested
- **No gradients** unless specifically requested - solid colors look more professional
- All components must support both light and dark modes seamlessly

### 2. **Typography that Breathes**
- Maximum 2 typefaces: one for headings, one for body text
- Use `leading-relaxed` or `leading-6` for readability (1.4-1.6 line-height minimum)
- Apply `text-balance` or `text-pretty` to headings for better breaks
- Never use decorative typefaces for body text or text under 14px
- Use semantic HTML heading tags (`<h1>`, `<h2>`, etc.) - never style `<p>` as headings

### 3. **Layout with Flexbox First**
- Flexbox for 95% of layouts: `flex items-center justify-between`
- CSS Grid only for complex 2D layouts
- Use `gap-4`, `gap-x-2` for spacing - never use `space-*` classes
- Mobile-first approach: design for mobile, enhance for desktop
- No margin/padding on same element that has gap

### 4. **Tailwind CSS Precision**
- Use Tailwind's spacing scale: `p-4`, `mx-2` (never `p-[16px]`)
- Semantic classes: `items-center`, `justify-between`
- Responsive prefixes: `md:grid-cols-2`, `lg:text-xl`
- Never hardcode pixel values - use the scale
- Consistent spacing through entire app

### 5. **Accessibility (WCAG 2.1 AA)**
- All interactive elements must be keyboard accessible
- Use semantic HTML (`<button>`, `<a>`, `<form>`, `<header>`, `<nav>`, etc.)
- Maintain proper color contrast (4.5:1 for text)
- Include proper ARIA labels and roles
- Use `sr-only` for screen reader text
- Alt-text for all meaningful images (except decorative)

### 6. **Components That Scale**
- Break everything into small, reusable components
- Never create giant `page.tsx` files - extract separate components
- Use shadcn/ui components as foundation (Button, Card, Dialog, etc.)
- Server Components as default, Client Components only when necessary
- Prop-based configuration for flexibility

### 7. **Images and Icons with Purpose**
- Use real images to create engagement (not blurry stock photos)
- Consistent icon sizes: 16px, 20px, or 24px - no in-between
- Never use emojis as UI icons
- Real icons from icon libraries (lucide-react, etc.)
- Decorative vs functional - always intentional

### 8. **Whitespace is Design**
- Generous padding and margins
- Let content breathe - tight = unprofessional
- Consistent spacing throughout the app
- No "floating" elements without context

### 9. **Interaction Feels Good**
- Hover-states on all clickable elements
- Loading-states for async operations
- Smooth transitions: `transition-colors`, `transition-transform`
- Feedback on user interactions (no silent failures)
- Clear focus indicators for keyboard navigation

### 10. **Interesting Over Boring**
- Be creative within the framework
- Professional doesn't mean boring
- But always prioritize usability
- Polish every detail - ship quality, not MVP

## Color Palette

**Maximum 3-5 total colors. Stick to it.**

### Light Mode
- **Background**: `white` (#FFFFFF)
- **Surface**: `neutral-50` (#F9FAFB)
- **Border**: `neutral-200` (#E5E7EB)
- **Text Primary**: `neutral-900` (#111827)
- **Text Secondary**: `neutral-600` (#4B5563)
- **Accent (Primary)**: `blue-600` (#2563EB)
- **Success**: `green-600` (#16A34A)
- **Warning**: `yellow-600` (#CA8A04)
- **Danger**: `red-600` (#DC2626)

### Dark Mode
- **Background**: `neutral-950` (#030712)
- **Surface**: `neutral-900` (#111827)
- **Border**: `neutral-800` (#1F2937)
- **Text Primary**: `neutral-50` (#F9FAFB)
- **Text Secondary**: `neutral-400` (#9CA3AF)
- **Accent (Primary)**: `blue-500` (#3B82F6)
- **Success**: `green-500` (#22C55E)
- **Warning**: `yellow-500` (#EAB308)
- **Danger**: `red-500` (#EF4444)

**No other colors. Ever.**

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
