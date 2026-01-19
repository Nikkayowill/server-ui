# Flowbite Component Reference

Flowbite is now integrated via CDN. All components work with your existing Tailwind CSS setup.

## Quick Start

Browse components at: https://flowbite.com/docs/getting-started/introduction/

## Priority Components for Your Site

### 1. **Navigation** (Navbar)
- Docs: https://flowbite.com/docs/components/navbar/
- Replace current nav in `helpers.js` `getResponsiveNav()`
- Mobile-responsive with dropdown support built-in

### 2. **Cards** 
- Docs: https://flowbite.com/docs/components/card/
- Use for: Pricing plans, server status displays, dashboard widgets
- Pre-styled with hover effects and layouts

### 3. **Buttons**
- Docs: https://flowbite.com/docs/components/buttons/
- Replace inline button styles across all pages
- Gradient, outline, icon, and loading states available

### 4. **Forms**
- Docs: https://flowbite.com/docs/components/forms/
- Use for: Login, signup, contact, server creation forms
- Includes validation states, helper text, icons

### 5. **Tables**
- Docs: https://flowbite.com/docs/components/tables/
- Perfect for admin dashboard (users, servers, payments)
- Striped, hoverable, with actions column

### 6. **Alerts & Toast**
- Docs: https://flowbite.com/docs/components/alerts/
- Replace error/success messages
- Dismissible with icons and actions

### 7. **Modals**
- Docs: https://flowbite.com/docs/components/modal/
- Use for: Delete confirmations, server details, payment flows
- Backdrop, centered, with actions

### 8. **Badges**
- Docs: https://flowbite.com/docs/components/badge/
- Server status indicators (running/stopped)
- User roles (admin/user)
- Payment status

### 9. **Dropdowns**
- Docs: https://flowbite.com/docs/components/dropdowns/
- User profile menu
- Action menus in tables
- Filter options

### 10. **Tabs** (if you want them back)
- Docs: https://flowbite.com/docs/components/tabs/
- Dashboard sections (but we went scroll layout to avoid issues)

## Implementation Pattern

### Step 1: Copy component HTML from Flowbite docs
### Step 2: Paste into your template literal in controller
### Step 3: Replace static text with template variables `${...}`
### Step 4: Adjust colors to match your brand (green glow theme)

## Example: Button Conversion

**Before (inline styles):**
```javascript
<button style="background: var(--glow); color: var(--bg); padding: 12px 24px; border-radius: 4px;">
  Click Me
</button>
```

**After (Flowbite + custom colors):**
```javascript
<button class="text-gray-900 bg-lime-400 hover:bg-lime-500 focus:ring-4 focus:ring-lime-300 font-medium rounded-lg text-sm px-5 py-2.5">
  Click Me
</button>
```

## Next Steps

1. **Landing Page Hero**: Use Flowbite hero sections with CTA buttons
2. **Pricing Cards**: Replace current pricing with Flowbite card grid
3. **Dashboard Tables**: Admin tables for users/servers/payments
4. **Forms**: Login, signup, contact form redesign
5. **Navigation**: Mobile-responsive navbar replacement

## Custom Color Mapping

Your brand colors to Flowbite classes:
- Primary green glow (`#88fe00`) → `bg-lime-400` or custom class
- Dark background → `bg-gray-900`, `bg-gray-800`
- Borders → `border-lime-400`, `border-lime-500`
- Text → `text-lime-400` for highlights

## Testing Strategy

1. Test one component at a time
2. Check desktop and mobile layouts
3. Verify interactivity (dropdowns, modals, tabs)
4. Commit after each working component
5. Deploy incrementally to production
