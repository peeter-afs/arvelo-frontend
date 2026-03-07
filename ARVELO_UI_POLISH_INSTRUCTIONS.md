# Arvelo Frontend — UI Polish Instructions

> Comprehensive screen-by-screen modernization guide.
> Feed each section to Claude Code CLI as a standalone task.
> **Every section includes mobile/responsive behavior — do not skip it.**

---

## 0. Global Foundation (run first)

### 0A. Design System — globals.css + Tailwind config

```
Rewrite `app/globals.css` to establish a refined design system for a modern SaaS accounting app.

Requirements:
- Import Inter for body text and "DM Sans" or "Plus Jakarta Sans" for headings via Google Fonts <link> in app/layout.tsx
- Define CSS custom properties for a professional blue-tinted palette:
  --primary: #2563EB (blue-600), --primary-hover: #1D4ED8
  --surface: #FFFFFF, --surface-elevated: #F8FAFC
  --border: #E2E8F0, --border-hover: #CBD5E1
  --text-primary: #0F172A, --text-secondary: #64748B, --text-muted: #94A3B8
  --success: #059669, --warning: #D97706, --danger: #DC2626
  --sidebar-bg: #0F172A, --sidebar-text: #CBD5E1, --sidebar-active: rgba(59,130,246,0.15)
- Remove the dark-mode media query (we'll handle dark mode later)
- Add smooth scroll behavior, improved focus ring styles (ring-2 ring-primary/40 ring-offset-2), and subtle transition defaults
- Add utility classes:
  .card — bg-white rounded-xl border border-[--border] shadow-sm
  .badge — inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium

Mobile foundation:
- Set base font-size: 16px (prevents iOS zoom on input focus)
- Add -webkit-tap-highlight-color: transparent globally
- Add touch-action: manipulation on buttons/links to remove 300ms delay
- Add safe-area insets for notched devices:
  padding-env: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)
- Define breakpoint reference comment:
  sm: 640px, md: 768px, lg: 1024px, xl: 1280px
```

### 0B. Root Layout — app/layout.tsx

```
Update `app/layout.tsx`:
- Add Google Fonts link for "Plus Jakarta Sans" (weights 500,600,700) and "Inter" (400,500,600)
- Set metadata title to "Arvelo — Estonian Bookkeeping" and description to "Modern bookkeeping software for Estonian businesses"
- Add <meta name="theme-color" content="#0F172A" />
- Add <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
- Apply font-family: 'Inter', sans-serif to the body
```

### 0C. Mobile Shell — Shared Mobile Navigation Component

```
Create a new component: `components/layout/MobileNav.tsx`

This component renders only on screens < lg (1024px) and provides:

1. Top bar (fixed, z-30):
   - Height: h-14 (56px)
   - Background: white, border-b border-slate-200
   - Left: hamburger button (Menu icon from lucide, h-5 w-5)
   - Center: "Arvelo" in Plus Jakarta Sans text-lg font-bold
   - Right: user avatar circle (32x32, gradient bg, user initial)
   - On mobile add pb-[env(safe-area-inset-bottom)] awareness

2. Slide-over sidebar:
   - Triggered by hamburger tap
   - Backdrop: fixed inset-0 bg-black/50 z-40, animate fade-in (150ms)
   - Sidebar panel: fixed left-0 top-0 bottom-0 w-72 z-50, animate slide-in from left (250ms ease-out)
   - Close on backdrop tap, close on X button inside panel, close on nav item tap
   - Contains the full <Sidebar /> component with onClose and isMobile props
   - Trap focus inside when open (optional but nice)
   - Prevent body scroll when open (add overflow-hidden to body)

3. Bottom safe area padding:
   - Add pb-[env(safe-area-inset-bottom)] to prevent content hiding behind home indicator on iPhone

Export a useMobileNav() hook or use useState in the layout to manage open/close state.
Hide this component entirely on lg+ screens with a "hidden lg:hidden" approach or conditional rendering based on a useMediaQuery hook.
```

---

## 1. Auth Layout — `app/(auth)/layout.tsx`

```
Modernize `app/(auth)/layout.tsx`:

Current: Basic blue-to-indigo gradient background with centered card.

Desktop (md and above):
- Split layout: left 55% = branding panel, right 45% = form area
- Left panel:
  - Background: deep navy (#0F172A) with a subtle geometric pattern or soft mesh gradient overlay (CSS only, no images)
  - Centered content: Arvelo logo (text "Arvelo" in Plus Jakarta Sans 3xl bold white), tagline "Modern bookkeeping for Estonian businesses" in slate-300, and 2-3 small feature highlights with lucide icons (Shield, TrendingUp, Globe) in a vertical stack with text-sm slate-400
  - Bottom: "Trusted by 500+ Estonian companies" in text-xs slate-500
- Right panel:
  - Light background (#F8FAFC), vertically centered
  - Max-width: 420px with px-8
  - {children} renders here

Mobile (below md):
- Hide the left branding panel entirely (hidden md:flex)
- Full-width light background (#F8FAFC)
- Show a compact Arvelo logo bar at top: text-xl font-bold text-slate-900 centered, with tagline text-xs text-slate-500 below, py-8
- Form area: px-5 (tighter padding on small screens), max-w-sm mx-auto
- {children} renders below the logo
- Smooth fade-in animation on mount (CSS @keyframes, 300ms)

Tablet (md to lg):
- Same split layout but 50/50 ratio
- Left panel: hide the feature highlights, keep only logo + tagline
```

## 2. Login Page — `app/(auth)/login/page.tsx`

```
Polish `app/(auth)/login/page.tsx`:

Current: White card with shadow, basic form inputs.

Changes:
- Remove the outer card wrapper (the auth layout now provides structure)
- Add a "Welcome back" heading (text-2xl font-semibold text-slate-900) and "Sign in to continue" subtext (text-sm text-slate-500 mb-8)
- Style form inputs:
  - Taller inputs: h-11 px-4
  - Border: border-slate-200, on focus: border-primary ring-4 ring-primary/10
  - Labels: text-sm font-medium text-slate-700 mb-1.5
  - Rounded-lg
- Submit button:
  - h-11 rounded-lg bg-primary text-white font-medium
  - Hover: bg-primary-hover with subtle shadow-lg shadow-primary/25
  - Loading state: spinner icon (lucide Loader2 with animate-spin) replacing text
- "Forgot password" link: text-sm text-primary hover:text-primary-hover, right-aligned
- Divider: "or" with horizontal lines on each side, text-slate-400 text-xs
- "Don't have an account? Sign up" at bottom: text-sm, link in font-medium text-primary
- Remove demo credentials section (or collapse it into an expandable "Demo access" disclosure)
- Remove all console.log statements and the 2000ms artificial delay
- Error/success alerts: rounded-lg with left colored border (4px), icon on left (AlertCircle for error, CheckCircle for success)

Mobile specifics:
- Heading: text-xl on mobile (text-2xl on md+)
- Inputs must be 16px font-size minimum to prevent iOS auto-zoom
- Submit button: full-width on all screens, h-12 on mobile (bigger tap target)
- "Forgot password" + "Sign up" links: ensure min 44px tap target height
- Add spacing at bottom (pb-8) so the sign-up link doesn't sit against the screen edge
```

## 3. Register Page — `app/(auth)/register/page.tsx`

```
Polish `app/(auth)/register/page.tsx`:

Same input/button styling as login page. Additional changes:
- Heading: "Create your account" + "Start managing your finances in minutes"
- Group "Password" and "Confirm password" visually (adjacent, no extra spacing)
- Add password strength indicator below password field:
  - 4 small bars that fill with color (red→orange→yellow→green) based on length/complexity
  - Text hint below: "Use 8+ characters with a mix of letters and numbers"
- Company name field: add a subtle info tooltip icon that shows "You can always add this later" on hover
- Terms text at bottom: smaller, text-slate-400
- Remove console.log and artificial delays

Mobile specifics:
- The form is longer, so ensure smooth scrolling — no fixed-height containers
- Password strength bars: use flex-1 in a row (not fixed widths)
- Company name tooltip: on mobile, show as inline helper text below the label instead of hover tooltip (touch devices can't hover)
- Submit button: h-12 for larger tap target
- Terms text: increase line-height for readability (leading-relaxed)
```

## 4. Verify Email & Resend Verification Pages

```
Polish `app/(auth)/verify-email/page.tsx` and `app/(auth)/resend-verification/page.tsx`:

verify-email:
- Replace the SVG checkmark/X with lucide icons: CheckCircle2 (text-emerald-500, h-16 w-16) for success, XCircle for failure
- Add a subtle scale+fade entrance animation (CSS keyframes)
- Verifying state: use a more refined loader — three bouncing dots or a pulsing ring, not a spinning border

resend-verification:
- Same input styling as login
- Success state: show a mail icon (lucide Mail) above the success message
- Add "Didn't receive it? Check your spam folder" hint in text-xs text-slate-400 below the success message

Mobile specifics:
- Both pages: content centered vertically using min-h-[calc(100vh-120px)] flex items-center (account for auth layout header)
- Icons: h-14 w-14 on mobile (slightly smaller than desktop h-16)
- Buttons: full-width, h-12
- On verify-email success, the auto-redirect countdown should show clearly: "Redirecting in 3s..." with a visible timer
```

## 5. Dashboard Layout — `app/(dashboard)/layout.tsx`

```
Rewrite `app/(dashboard)/layout.tsx` to support both desktop sidebar and mobile navigation:

Desktop (lg and above):
- Same structure: flex h-screen, <Sidebar /> on left, main content on right
- bg-slate-50 (not bg-gray-50) for the main area
- Main content: className="flex-1 overflow-y-auto"
- Inner padding: p-6 lg:p-8 xl:px-10

Mobile (below lg):
- Hide the desktop <Sidebar /> completely (hidden lg:block)
- Render <MobileNav /> (the component from step 0C)
- Main content: add pt-14 (top padding to clear the fixed mobile top bar, 56px)
- Inner padding: p-4 sm:p-6
- Add pb-6 for breathing room at bottom (+ safe area)

The layout should use a React state for sidebar open/close, passed as context or props to MobileNav.
Wrap in <ProtectedRoute> as before.
```

## 6. Sidebar — `components/layout/Sidebar.tsx`

```
Modernize `components/layout/Sidebar.tsx`:

Current: Dark gray sidebar with basic styling.

Accept new props: onClose?: () => void, isMobile?: boolean

Desktop appearance:
- Background: var(--sidebar-bg) (#0F172A)
- Width: w-64 (keep)
- Logo section:
  - "Arvelo" in Plus Jakarta Sans, text-xl font-bold text-white
  - Tenant name in text-xs text-slate-400 tracking-wide uppercase
  - Subtle bottom border: border-slate-800
- User section:
  - Avatar: gradient background (from-blue-500 to-indigo-600) rounded-full
  - Name: text-sm font-medium text-slate-200
  - Role: text-xs text-slate-500, capitalize
  - On hover: subtle bg-slate-800/50 rounded-lg transition
- Navigation:
  - Section headers (Accounting, Reports): text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-6 mb-2 px-3
  - Nav items: rounded-lg px-3 py-2 text-sm text-slate-400
  - Active state: bg-[--sidebar-active] text-white with a 2px left border accent in primary blue (border-l-2 border-primary)
  - Hover: bg-slate-800/50 text-slate-200
  - Icons: h-[18px] w-[18px] with mr-3, stroke-width 1.5
  - Sub-items: ml-9 (not ml-8), smaller text (text-[13px]), no icons, with a subtle left dotted border line
  - Expandable sections: ChevronRight icon that rotates 90° on expand, with transition-transform duration-200
- Logout button: text-slate-500 hover:text-slate-300, separated by border-t border-slate-800
- Language switcher: style to match sidebar (dark theme dropdown)
- Add subtle transition-all duration-200 to all interactive elements

Mobile behavior (when isMobile=true):
- Width: w-72 (slightly wider for easier touch targets)
- Show a close button (X icon) in the header area, top-right
- Nav items: py-2.5 (taller for touch — min 44px tap targets)
- Sub-items: py-2 (also taller)
- When a nav link is tapped, call onClose() to dismiss the sidebar
- Add padding-bottom: env(safe-area-inset-bottom) at the very bottom
- Scrollable: overflow-y-auto with -webkit-overflow-scrolling: touch
```

## 7. Dashboard Home — `app/(dashboard)/page.tsx`

```
Modernize `app/(dashboard)/page.tsx`:

Current: Basic stat cards and a plain table.

New design:

Header:
  - "Welcome back, {name}" in text-2xl font-semibold text-slate-900
  - Subtitle with current date: "Here's your overview for {formattedDate}" in text-slate-500 text-sm
  - Right side (desktop): Quick actions — "New Invoice" (primary) and "New Entry" (outlined) buttons
  - Mobile: hide header buttons, OR move them into a single "+" FAB in bottom-right (fixed, z-20, 56x56, rounded-full, bg-primary, shadow-xl) that opens a small action menu

Stats cards (4-column grid):
  - Use the .card utility class (white, rounded-xl, border, shadow-sm)
  - Remove the colored left border — use a small colored icon container (40x40 rounded-lg with light tinted bg)
  - Stat value: text-2xl font-semibold text-slate-900
  - Label: text-sm text-slate-500 above the value
  - Change indicator: small pill badge with arrow icon (ArrowUpRight/ArrowDownRight), colored green/red
  - Subtle hover: shadow-md transition-shadow duration-200
  - GRID BREAKPOINTS:
    - xl+: grid-cols-4
    - md to xl: grid-cols-2
    - below md: grid-cols-2 with smaller padding (p-4 instead of p-5)
    - below sm (< 640px): grid-cols-1
  - Mobile cards: stat value text-xl (slightly smaller), icon container 36x36

Recent Transactions:
  - Wrap in .card
  - Header row: "Recent Transactions" left, "View all →" link right (text-sm text-primary)

  Desktop table (visible sm+):
    - No uppercase headers — text-xs font-medium text-slate-500, normal case
    - Row hover: hover:bg-slate-50/50
    - Amount: font-mono tabular-nums, credit = text-emerald-600 "+€1,250.00", debit = text-red-500 "−€145.00"
    - Date: format as "28 Feb 2024" not "2024-02-28"
    - Description: primary text with partner name as secondary text-xs text-slate-400 below

  Mobile list (visible below sm):
    - Replace the table with a vertical list of transaction items
    - Each item: flex justify-between, py-3, border-b border-slate-100
    - Left: description (text-sm font-medium) + partner · date (text-xs text-slate-400)
    - Right: amount, color-coded, font-mono font-semibold
    - No table headers needed

Quick Insights row (below transactions):
  - 3 cards: Cash Position, Receivables, Payables Due
  - Each: .card with a colored dot indicator (h-2 w-2 rounded-full), label, value, hint
  - Desktop: grid-cols-3
  - Mobile: grid-cols-1 with gap-3, or horizontal scroll with snap-x snap-mandatory
```

## 8. Chart of Accounts — `app/(dashboard)/accounting/accounts/page.tsx`

```
Polish `app/(dashboard)/accounting/accounts/page.tsx`:

Standardize the data table pattern that will be reused across all list pages:

Page header: text-2xl font-semibold text-slate-900, subtitle text-sm text-slate-500

Actions bar:
  Desktop:
    - Search input: h-10 w-72 rounded-lg border-slate-200 with Search icon
    - Filter button: ghost style (border-slate-200 hover:bg-slate-50)
    - Export button: ghost style with Download icon
    - "New Account" button: bg-primary text-white rounded-lg h-10 px-4, with Plus icon
    - All buttons: h-10, consistent spacing gap-3
  Mobile (below md):
    - Search: full-width, h-11 (larger tap target)
    - Filter + Export: collapse into a single "..." (MoreHorizontal) icon button that opens a dropdown/bottom sheet with the options
    - "New Account": show as a floating action button (FAB) — fixed bottom-right, 52x52, rounded-full, bg-primary, shadow-lg, z-20
    - Or: keep inline but full-width below the search, as a row of icon-only buttons + the primary CTA

Table (inside .card):
  Desktop:
    - Header: bg-slate-50/80, text-xs font-medium text-slate-500 (no uppercase, no tracking-wider)
    - Rows: border-b border-slate-100
    - Account code: font-mono text-sm text-slate-600
    - Account name: font-medium text-slate-900
    - Type badges: rounded-md, softer colors:
      Asset: bg-blue-50 text-blue-700, Liability: bg-amber-50 text-amber-700,
      Equity: bg-violet-50 text-violet-700, Revenue: bg-emerald-50 text-emerald-700,
      Expense: bg-rose-50 text-rose-700
    - Balance: font-mono tabular-nums text-right
    - Status: tiny dot (h-1.5 w-1.5 rounded-full) + text
    - Actions: icon buttons with p-1.5 rounded-md hover:bg-slate-100
    - Row hover: hover:bg-slate-50/50

  Mobile (below md) — card list view:
    - Replace the table with a vertical stack of cards
    - Each card: .card with p-4, mb-2
    - Top row: account code (font-mono text-xs text-slate-500) + type badge (small, right-aligned)
    - Middle: account name (font-medium text-base)
    - Bottom row: balance (font-mono) left, status dot right, actions (edit/delete) far right
    - Tap entire card to view/edit (make it a clickable area)

Pagination:
  - Desktop: "Showing 1-10 of 10" left, page buttons right
  - Mobile: simplified — just "Page 1 of 1" centered, with < > arrow buttons
  - Buttons: h-8 px-3 rounded-md border text-sm, disabled with opacity-50
```

## 9. Journal Entries — `app/(dashboard)/accounting/journal/page.tsx`

```
Polish `app/(dashboard)/accounting/journal/page.tsx`:

Apply the same table/card pattern from Chart of Accounts. Additional specifics:

Desktop table:
- Reference/number column: font-mono text-sm text-primary (clickable, underline on hover)
- Debit/Credit account: show as "1000 · Cash" format (interpunct, not dash)
- Amounts: font-mono tabular-nums, right-aligned
- Status badges:
  posted: small dot (bg-emerald-500) + "Posted" text
  draft: small dot (bg-amber-500) + "Draft" text
  reversed: small dot (bg-red-500) + "Reversed" text
- Draft entries: subtle left border (border-l-2 border-amber-300) on the row
- Fix: the mock data uses `entry.debit.code` but the type has `account` — fix to use `entry.debit.account`

Mobile card view (below md):
- Each entry as a card:
  - Header: entry number (font-mono text-primary) left, status dot+text right
  - Body: description (text-sm font-medium), date (text-xs text-slate-400)
  - Footer: two columns — "Debit: 1000 · Cash  €5,000.00" / "Credit: 1100 · AR  €5,000.00"
  - Draft cards: left border-l-2 border-amber-300
- Tap card to expand/view full details
```

## 10. Business Partners — `app/(dashboard)/accounting/partners/page.tsx`

```
Polish `app/(dashboard)/accounting/partners/page.tsx`:

Apply standard table/card pattern. Additional:

Desktop table:
- Partner name: font-medium, with a small avatar circle (initials) on the left
- Contact column: stack email and phone vertically:
  - Email: text-sm text-slate-600 (plain text, no icon)
  - Phone: text-xs text-slate-400
- Balance: color-code with direction:
  - Negative (they owe us): text-emerald-600 "€1,250.00 receivable"
  - Positive (we owe them): text-amber-600 "€2,300.00 payable"

Summary cards at bottom: .card style, 4-column grid with icons

Mobile (below md):
- Card view per partner:
  - Header: avatar circle + name (font-medium) left, type badge right ("Customer" / "Vendor")
  - Body: email text-sm, phone text-xs text-slate-400
  - Footer: balance with direction label, status dot
- Summary cards: 2x2 grid on mobile (grid-cols-2 gap-3)
- Contact info: make email and phone tappable (mailto: and tel: links) on mobile — even though desktop shows plain text, mobile should support tap-to-call/email
```

## 11. Invoices — `app/(dashboard)/invoices/page.tsx`

```
Polish `app/(dashboard)/invoices/page.tsx`:

Apply standard table/card pattern. Additional:

Tab filters above the table: "All", "Pending", "Paid", "Overdue"
  - Desktop: horizontal tabs with border-b-2 border-primary on active, show count badges
  - Mobile: horizontal scroll with snap-x, or use a <select> dropdown instead of tabs

Summary cards: Total Outstanding, Total Overdue, Paid This Month — 3 cards
  - Desktop: grid-cols-3
  - Mobile: horizontal scroll row (flex overflow-x-auto gap-3 snap-x), each card min-w-[200px]

Desktop table:
- Invoice number: font-mono text-primary (clickable)
- Customer: with small avatar initials
- Amount: font-mono tabular-nums font-medium
- Status badges with dots
- Actions: View (Eye), Send (Send), Download (Download) icon buttons

Mobile card view (below md):
- Each invoice as a card:
  - Header row: invoice number (font-mono text-primary) left, amount (font-mono font-semibold) right
  - Middle: customer name with avatar initials, date text-xs text-slate-400
  - Footer: status dot+text left, action icons right (View, Send, Download as small icon buttons)
- "New Invoice" button: FAB on mobile (fixed bottom-right, 52x52, rounded-full)
```

## 12. Reports — Balance Sheet, P&L, Trial Balance, General Ledger

```
Polish all four report pages with a consistent report template:

Shared report chrome:
  Desktop:
  - Date range selector: card with inline date pickers
  - Segmented control for presets: "This Month", "This Quarter", "This Year", "Custom"
  - Date inputs: h-10 rounded-lg, side by side with "to" text between
  - Filter and Export buttons right-aligned

  Mobile:
  - Segmented control: horizontal scroll or 2x2 grid of small buttons
  - Date inputs: stack vertically (full-width each, "From" label above first, "To" above second)
  - Filter and Export: row of two equal-width buttons below the dates
  - The entire date selector card should be collapsible on mobile — show "Feb 2024" as a summary, tap to expand the full date picker

Report title: centered, company name above in text-sm text-slate-500 uppercase tracking-wider

Balance Sheet (`reports/balance-sheet/page.tsx`):
- Section headers: text-sm font-semibold uppercase tracking-wider text-slate-500 with bottom border
- Line items: clean rows with subtle hover
- Subtotals: font-medium with border-t border-slate-200
- Grand totals: bg-slate-50 rounded-lg p-4 font-semibold text-lg
- Balance check: small badge (green "Balanced" / red "Imbalanced")
- Mobile: line items render fine as-is (label left, amount right), reduce padding to px-3 py-2

Profit & Loss (`reports/profit-loss/page.tsx`):
- Highlight rows (Gross Profit, Operating Income, Net Income): bg-slate-50 rounded-lg
- Net Income: larger font, green/red
- Key metrics cards at bottom: grid-cols-3 desktop, grid-cols-1 mobile
- Mobile: same row structure works, just tighter padding

Trial Balance (`reports/trial-balance/page.tsx`):
- Desktop: clean table with sticky footer row (bg-slate-50)
- Mobile: card list — each account shows code, name, debit OR credit amount (whichever is non-zero)
- Balance status: prominent card/badge

General Ledger (`reports/general-ledger/page.tsx`):
- Accordion accounts with ChevronRight → ChevronDown rotation
- Expanded: 4 metric cards (opening, debits, credits, closing) + transaction table
- Mobile:
  - Metric cards inside accordion: 2x2 grid (grid-cols-2 gap-2)
  - Transaction list inside accordion: simplified list (date, description, amount) instead of full table
  - Accordion tap targets: full width, min h-12
- Remove the blue info box (or make it a collapsible "About this report" section)
```

## 13. Fixed Assets — `app/(dashboard)/assets/page.tsx`

```
Polish `app/(dashboard)/assets/page.tsx`:

Apply standard table/card pattern. Additional:

Desktop table:
- Depreciation progress bar for each asset:
  - Small bar (h-1.5 rounded-full) showing depreciation % of cost
  - Color: from emerald (low) to amber (high)
- Category: subtle badges (like account type badges)
- Net Value: font-medium, slightly larger
- Summary cards: .card with icons, grid-cols-3

Mobile (below md):
- Card view per asset:
  - Header: asset name (font-medium) + category badge
  - Body: purchase date, depreciation progress bar (full-width, h-2 for easier visibility)
  - Footer row: "Cost €150,000" / "Net €123,000" in two columns, font-mono text-sm
  - Status dot in top-right corner
- Summary cards: stack vertically (grid-cols-1) or 3-across with smaller text
```

## 14. Settings — `app/(dashboard)/settings/page.tsx`

```
Polish `app/(dashboard)/settings/page.tsx`:

Current: Side tabs + content area, basic form inputs.

Desktop layout:
- Settings navigation (left):
  - Width: w-56
  - Items: rounded-lg px-3 py-2.5 text-sm
  - Active: bg-primary/5 text-primary font-medium
  - Icons: h-[18px] w-[18px] text-slate-400, active: text-primary
  - Subtle category separators between groups

- Content area (right):
  - Wrap in .card (rounded-xl border shadow-sm)
  - Section title: text-lg font-semibold text-slate-900 mb-1
  - Section description: text-sm text-slate-500 mb-6
  - Form inputs: h-11, rounded-lg, focus ring
  - Labels: text-sm font-medium text-slate-700 mb-1.5
  - Select dropdowns: h-11, rounded-lg
  - Save button: bg-primary, bottom of each section
  - Textarea: min-h-[100px] resize-y

- Notifications tab: toggle switches, grouped by category
- Security tab: outlined cards with icon, title, description, action button

Mobile layout (below md):
- Replace side navigation with a horizontal scrollable tab bar at top:
  - Sticky below the mobile top bar (top-14, z-10)
  - Horizontal scroll with overflow-x-auto, flex gap-1, bg-white border-b
  - Each tab: px-4 py-3 text-sm whitespace-nowrap, active has border-b-2 border-primary
  - Icons hidden on mobile tabs (text only for space)
- Content area: full-width, no side margin
- Form inputs: full-width, h-12 (larger tap targets)
- Save button: sticky at bottom on mobile? Or just at end of form
- Two-column form fields (like date format + timezone): stack to single column on mobile
- Notifications toggles: full-width rows, min-h-[48px] tap target per toggle
- Security cards: stack vertically, full-width
```

## 15. Protected Route & Loading States

```
Polish `components/auth/ProtectedRoute.tsx`:

Desktop loading:
- Show a skeleton layout: sidebar (dark rectangle w-64) + main area with pulsing blocks
  - 4 stat card skeletons (rounded-xl, h-28, bg-slate-100 animate-pulse)
  - 1 table skeleton below (rounded-xl, h-64, bg-slate-100 animate-pulse)
- Or: centered loader — Arvelo logo text + subtle pulsing ring animation

Mobile loading:
- Show the mobile top bar skeleton (h-14 bg-white) + content area with pulse blocks
- No sidebar skeleton on mobile (since sidebar is hidden)
- 2 stat card skeletons in a row, 1 table skeleton below

Both:
- Remove all console.log statements
- Add a timeout: if loading > 5s, show "Taking longer than expected..." text with a "Try refreshing" link
- The skeleton should match the actual layout structure so there's no layout shift when content loads
```

---

## Execution Order

Run these in sequence for best results:

1. **0A + 0B + 0C** — Global foundation (CSS vars, fonts, mobile nav shell)
2. **6** — Sidebar (with mobile props support)
3. **5** — Dashboard layout (integrates sidebar + mobile nav)
4. **7** — Dashboard home (stat cards, tables, mobile list)
5. **1 + 2 + 3 + 4** — Auth pages (split layout + mobile-first forms)
6. **8** — Chart of Accounts (establishes table → card pattern for mobile)
7. **9, 10, 11, 13** — Other list pages (reuse table/card pattern)
8. **12** — Report pages (collapsible date pickers, mobile-friendly reports)
9. **14** — Settings (horizontal tabs on mobile)
10. **15** — Protected route / loading skeletons

---

## General Rules for All Changes

### Visual consistency
- Use `text-slate-*` instead of `text-gray-*` throughout (warmer, more modern)
- Remove ALL `console.log` and `console.error` debug statements
- Consistent border radius: rounded-lg for inputs/buttons, rounded-xl for cards
- Consistent shadow: shadow-sm for cards, shadow-md on hover
- Consistent spacing: gap-6 between cards, p-6 for card padding (p-4 on mobile)
- All transitions: `transition-all duration-200` or `transition-colors duration-150`
- Icons: h-4 w-4 inline, h-5 w-5 buttons, stroke-width 1.5
- No more `text-3xl font-bold` headers — use `text-2xl font-semibold` (text-xl on mobile)
- Amounts: always `font-mono tabular-nums`
- Status indicators: dot + text over full pill badges
- Empty states: icon + message + action button

### Mobile rules (apply to every component)
- All interactive elements: minimum 44x44px tap target (per Apple HIG / WCAG 2.5.5)
- Inputs: min font-size 16px to prevent iOS zoom
- No hover-only interactions — anything on hover must also work via tap/click
- Tables with 4+ columns: convert to card-based list view below md (768px)
- Tables with 2-3 columns: keep as table but reduce padding (px-3 py-2)
- Action bars (search + filter + buttons): stack or collapse on mobile
- Primary CTA on list pages: FAB (fixed bottom-right) on mobile when inline button is hidden
- Date pickers: full-width, stacked vertically on mobile
- Modals/dialogs: full-screen on mobile (inset-0 or bottom sheet inset-x-0 bottom-0)
- Side-by-side layouts (settings tabs, split auth): stack vertically on mobile
- Horizontal scrollable elements: add -webkit-overflow-scrolling: touch and scroll-snap-type: x mandatory
- Test all screens at: 320px, 375px, 414px, 768px, 1024px, 1440px

### Breakpoint reference
- sm: 640px — small phones → larger phones
- md: 768px — phones → tablets (table ↔ card switch point)
- lg: 1024px — tablets → desktop (sidebar visibility switch point)
- xl: 1280px — desktop → wide desktop (max-width containers)
