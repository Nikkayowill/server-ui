# Session Handoff — February 9, 2026

## Current State
Production is live at cloudedbasement.ca and stable. No code changes were pushed this session — everything that follows is local direction for the next agent.

---

## 🔥 Priority 1: Fix Horizontal Scroll on Mobile

**Bug:** On mobile devices, the page scrolls horizontally (left-right). It should only scroll vertically. Other professional sites lock the viewport to prevent this. Something is overflowing the viewport width.

**Likely culprits:**
- The hero rainbow stripe animation (`.hero-stripes` in `public/css/global.css`) — check if it creates elements wider than 100vw
- Any element with fixed pixel widths, negative margins, or `overflow` issues
- The hero section itself (`min-h-screen` wrapper)
- Check if `<body>` or `<html>` needs `overflow-x: hidden`

**Fix approach:**
- Add `overflow-x: hidden` to the body/html as a global fix in `global.css`
- Then find and fix the actual overflowing element so the overflow-x isn't just a band-aid
- Test on Chrome DevTools mobile emulator AND real mobile device

**Files to check:**
- `public/css/global.css` — hero animation styles (lines ~140-250)
- `helpers.js` — `getHTMLHead()` generates the `<head>` and `<body>` opening tags
- `controllers/pages/homeController.js` — hero section markup

---

## 🔥 Priority 2: Landing Page Layout Rework (Structure Only)

### The Problem
The landing page (`controllers/pages/homeController.js`, 464 lines) needs a structural layout rework — spacing, padding, typography scale, and vertical rhythm. The visual design (colors, gradients, component styles, hover effects, rainbow hero stripes) is GOOD and must NOT change.

The page was assembled section-by-section over time. Each section works in isolation but the overall flow feels inconsistent — cramped gaps, narrow containers on wide screens, inconsistent section padding, and typography that doesn't scale cleanly across breakpoints.

### What to Fix (STRUCTURE ONLY)
1. **Container widths** — every section uses `max-w-3xl` (768px). Content-heavy sections (6-card grids, comparison columns, pricing) need wider containers appropriate to their content density. Hero text can stay narrow for focus.
2. **Grid gaps** — all grids use `gap-3` (12px). Cards feel packed together. Needs intentional gap scaling per breakpoint.
3. **Section vertical padding** — inconsistent across page. Social proof is `py-8`, most sections are `py-16`, CTA is `py-12`. Needs a consistent vertical rhythm.
4. **Typography scale** — heading sizes work but subtext/body doesn't scale between mobile and desktop. Use responsive font sizing.
5. **Horizontal padding** — missing `lg:px-8` on containers. No scaling between tablet and desktop.
6. **"What You Get" grid** — uses `sm:col-span-2 lg:col-span-1` and `lg:col-span-2` hacks that create uneven rows. Should be a clean 4-col grid on desktop (8 items ÷ 4 = 2 rows).
7. **Footer** — shares container constraints with everything else. Needs its own appropriate width.

### What NOT to Touch
- Colors, gradients, brand utilities (`.text-brand`, `.bg-brand`, etc.)
- Rainbow stripe hero animation (`.hero-wrapper`, `.hero-stripes` in global.css)
- Hover effects, transitions, border colors
- Card visual styles (rounded-xl, bg-gray-900/50, borders)
- Copy/content — do not change any text
- Component markup structure — only adjust layout classes
- SVG icons, badges, CTAs

### The Rule
If you're changing a `bg-`, `text-color`, `border-color`, `hover:`, `shadow-`, `font-family`, or any visual property — **stop, you're doing it wrong.** Only touch: `max-w-*`, `px-*`, `py-*`, `gap-*`, `grid-cols-*`, `text-size`, `mb-*`, `mt-*`, `space-y-*`, `leading-*`, container classes, and breakpoint modifiers.

### Current Section Structure (homeController.js)
```
Line 18  — Hero (min-h-screen, max-w-3xl, pt-32 pb-16)
Line 55  — Social Proof (py-8 md:py-12, max-w-3xl)
Line 82  — Why Choose - 6 cards (py-16 md:py-24, max-w-3xl, grid 1/2/3 col, gap-3)
Line 190 — How It Works - 3 steps (py-16 md:py-24, max-w-3xl, grid 1/3 col, gap-3)
Line 218 — What You Get - 8 items (py-16 md:py-24, max-w-3xl, grid 1/2/3 col, gap-3)
Line 289 — How We Compare - 3 columns (py-16 md:py-24, max-w-3xl, grid 1/3 col, gap-3)
Line 340 — Pricing - 3 cards (py-16 md:py-24, max-w-3xl, grid 1/3 col, gap-3)
Line 400 — CTA + Footer (py-12 md:py-16, max-w-xl / max-w-3xl)
```

### Design System Reference
- **Brand color:** `#2DA7DF` (cyan)
- **Dark background:** `#0a0812` / black
- **Font:** JetBrains Mono
- **Tailwind + Flowbite CDN** (no build step for CSS)
- **global.css:** Brand utilities, nav styles, hero animation (~1330 lines)
- **Desktop is primary viewport.** Tablet and mobile must be clean but desktop is what matters most.

### Previous Attempt (REVERTED — DO NOT REPEAT)
An earlier attempt tried to redesign everything at once — changing visual styles, adding new gradient backgrounds, new border treatments, new card structures, and layout simultaneously. It looked worse and was reverted. **Do NOT repeat this.** Change layout classes only, one section at a time, and verify each before moving on.

---

## Development Notes

- **Multiple node processes:** When restarting the server, kill ALL node.exe processes first (`taskkill //F //IM node.exe` on Windows). Stale processes serve old code and cause confusion.
- **Git workflow:** Do NOT commit directly to main. Use feature branches.
- **Testing:** Always hard refresh (Ctrl+Shift+R) after server restart. Test mobile via Chrome DevTools AND compare against production (cloudedbasement.ca) on a real phone.
- **Production server:** 68.183.203.226 — deploy via `git pull origin main && sudo systemctl restart cloudedbasement.service`

---

## Key Files
- `controllers/pages/homeController.js` — Landing page (464 lines, the main file to work on)
- `public/css/global.css` — Brand utilities, hero animation (~1330 lines)
- `helpers.js` — HTML generators (head, nav, footer, scripts)
- `.github/copilot-instructions.md` — Full project conventions and architecture
