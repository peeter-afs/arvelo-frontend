# Handoff: Arvelo · Halo Pro redesign

> For **Claude Code working in this same project**. The prototype source and the target codebase are both in this repo — you can read them directly:
>
> - **Design reference (source of truth for look/feel):** `src/*.jsx` (live) and a frozen snapshot in `design_handoff_halo_pro/prototype/src/*.jsx`. Open `Redesign Explorations.html` to see every screen on the design canvas.
> - **Target codebase (where the redesign ships):** `app/` (Next.js App Router) + `components/` (Tailwind v4 + lucide-react + next-intl + Zustand stores).
>
> Your job is to recreate the **Halo Pro** look inside the existing codebase using its established patterns — not to port the prototype's inline-style JSX verbatim, and **not** to change routing, data, i18n or state.

---

## 0. Decisions log (read this first)

These were open in earlier drafts. They are now **decided** — implement to these, don't re-ask:

| # | Question | Decision |
|---|---|---|
| D1 | ⌘K command palette | **In scope.** Build it for real — full spec in §8.1. New component `components/layout/CommandPalette.tsx`, mounted in the dashboard layout. |
| D2 | Mobile screens | **Out of scope.** Desktop-first. Keep `components/layout/MobileNav.tsx` and `Sidebar`'s mobile branch as-is; they inherit the new tokens automatically. Do **not** build new mobile layouts this pass. |
| D3 | Status-footer copy | **Derived, not literal.** Every footer value is computed from live data — see §5.3 for the formula per item. The strings in the prototype are illustrative samples, not copy to hardcode. |
| D4 | Coral on bone (contrast) | Coral `#ff4e2c` is used for **non-text** UI only (fills, 2–3px markers, focus rings, icons ≥16px) — those don't need AA text contrast. **Never** set coral as the colour of body/label text on the bone canvas. Text *on* a coral fill is white (`--a-accent-on`). Primary buttons are white text on coral (passes AA). |
| D5 | Sidebar IA | **Restyle the existing nav, do not replace it.** The real `Sidebar.tsx` has the full route tree (Accounting, Invoices, Reports, Fixed Assets, Settings) with i18n labels, a collapse store and expandable sections. Keep all of that; only change chrome (colours, active treatment, search/⌘K row, brand mark). The prototype's shorter nav list is illustrative of *styling*, not the IA. See §5.1. |
| D6 | Tenant switcher | Use the existing `useAuthStore().tenant`. Render the current tenant name + FY chip as a non-functional display row for now (matches today's behaviour — there is no multi-tenant switcher in the codebase yet). Don't build switching UI. |
| D7 | Format | One README (this file), refined in place, with per-screen acceptance checklists in §6 and a primitives spec in §7. |

---

## 1. Overview

Arvelo is an SME bookkeeping app (Estonian-flavoured: EUR, DD.MM.YYYY dates, Estonian chart-of-accounts numbering). The existing UI uses a generic blue-on-white SaaS look (`--primary: #2563EB`, slate sidebar, Tailwind defaults).

The redesign — codenamed **Halo Pro** — replaces that with a calmer, denser, pro-tool aesthetic for bookkeepers who live in the app 8 hours a day:

- **Bone canvas** (`#f6f4ee`) instead of cold white
- **Near-black sidebar** with a coral active-row marker
- **Electric coral accent** (`#ff4e2c`) used very sparingly (D4)
- **Always-on split-pane** on list screens: list left, detail pane right (no drawer modals)
- **Command bar** pill at the top of every screen with breadcrumbs + `/`-filter + `⌘K`
- **Terminal-style mono status footer** at the bottom of every screen (D3)
- **Visible keyboard-shortcut chips** in chrome (`J/K` navigate, `E` edit, `N` new, `D` duplicate)
- **Tabular mono numerals** (Geist Mono) for every amount, code and date

Close to Linear / Mercury / Ramp; intentionally far from QuickBooks / Xero / Merit. **It is a chrome + layout overhaul, not a data-model change.**

## 2. How to use the prototype

The `*.jsx` files are React-in-the-browser, Babel-transpiled mockups using inline styles + CSS custom properties, rendered inside an infinite design canvas. **They are the visual spec, not shippable code.** When a measurement isn't in this README, read the exact value off the prototype source (`src/<file>.jsx`) — every padding, radius and colour is literal there.

Translation rules:

- Inline-style colour values → Tailwind theme tokens / CSS custom properties on `:root` (§4).
- Inline-style layout → Tailwind utility classes / CSS modules following existing component conventions.
- Hand-rolled SVGs in `src/icons.jsx` → **`lucide-react`** (already a dependency). Icon-name map in §7.4.
- Keep all data-fetching, state, routing, i18n and API calls exactly as they are.

## 3. Fidelity

**High-fidelity.** Colours, typography, spacing and interactions are locked. Hex, font sizes, padding, radii and shadow values in this document (and in the prototype source) are the spec — match them.

---

## 4. The system (design tokens)

### 4.1 Where tokens live today

`app/globals.css` is **Tailwind v4** (`@import "tailwindcss"`). It has:
- a `:root` block of raw design variables (`--primary`, `--surface`, `--sidebar-bg`, …)
- an `@theme inline` block exposing fonts to Tailwind (`--font-sans`, `--font-display`, `--font-mono`)

Fonts are loaded in `app/layout.tsx` via `next/font/google` (Inter → `--font-inter`, Plus Jakarta → `--font-jakarta`).

### 4.2 Step 1 — add Geist Mono in `app/layout.tsx`

```ts
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-geist-mono',
});

// add to <html className>:
<html lang={locale}
  className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable}`}>
```

### 4.3 Step 2 — replace the `:root` block in `app/globals.css`

The cleanest migration is to **remap the existing semantic variables to Halo Pro values** (so every component that already reads `--primary`, `--border`, `--text-primary`, `--sidebar-bg`, etc. shifts automatically), then **add** the new tokens that have no existing equivalent. Drop-in replacement:

```css
:root {
  /* ── Accent (was blue → coral). Non-text use only, see D4. ── */
  --primary:        #ff4e2c;
  --primary-hover:  #e63d1c;
  --accent-on:      #ffffff;   /* text/icon colour on a coral fill */
  --accent-soft:    #ffe7df;   /* selected-row tint */
  --accent-soft-2:  #fff3ee;   /* even softer tint */

  /* ── Surfaces (cold white → warm bone) ── */
  --surface:          #ffffff;  /* cards, rows, inputs */
  --surface-elevated: #f6f4ee;  /* page canvas (body bg reads this) */
  --surface-2:        #f0ede5;  /* status footer, kbd chips, subtle fills */

  /* ── Borders (hairlines only — no shadows) ── */
  --border:        #e6e1d4;
  --border-hover:  #d4cebe;     /* = border-strong */

  /* ── Text ── */
  --text-primary:   #0a0a0a;
  --text-secondary: #4a4946;
  --text-muted:     #8e8c84;

  /* ── Status ── */
  --success:      #0e7b5a;  --success-soft: #e2efe9;   /* posted / balanced / positive */
  --warning:      #b07d1f;  --warning-soft: #f5ecd6;   /* draft */
  --danger:       #c84b3e;  --danger-soft:  #fbe7e3;   /* overdue / negative */

  /* ── Sidebar (slate → near-black) ── */
  --sidebar-bg:     #0a0a0a;
  --sidebar-text:   #d4d1c8;
  --sidebar-muted:  #6b6964;                 /* group headings, icons */
  --sidebar-border: rgba(255,255,255,0.06);
  --sidebar-active: rgba(255,255,255,0.06);  /* hover + active fill */

  /* ── Account-type badges (soft bg / fg) ── */
  --type-asset-bg: #e4ecf4;     --type-asset-fg: #2c4a6e;
  --type-liability-bg: #f4e8e0; --type-liability-fg: #7a4a1f;
  --type-equity-bg: #ece4f0;    --type-equity-fg: #5a3974;
  --type-revenue-bg: #e0eee6;   --type-revenue-fg: #0e7b5a;
  --type-expense-bg: #f0e4e2;   --type-expense-fg: #8a3a30;

  /* keep the existing safe-area-inset-* variables unchanged */
}
```

> The prototype prefixes these `--a-*` (`--a-bg`, `--a-accent`, …). In the codebase use the **existing semantic names** above so current components inherit the change with zero edits. When you read a prototype value like `var(--a-accent-soft)`, map it via the table in §4.5.

### 4.4 Step 3 — expose to Tailwind in `@theme inline`

Add Halo Pro to the existing `@theme inline` block so utilities like `bg-accent`, `text-muted`, `border-default`, `font-mono` exist:

```css
@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, …;
  --font-display: var(--font-jakarta), ui-sans-serif, system-ui;
  --font-mono: var(--font-geist-mono), ui-monospace, 'SF Mono', Menlo, monospace;

  --color-accent: var(--primary);
  --color-accent-soft: var(--accent-soft);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-canvas: var(--surface-elevated);
  --color-border-default: var(--border);
  --color-ink: var(--text-primary);
  --color-ink-2: var(--text-secondary);
  --color-ink-3: var(--text-muted);
  --color-pos: var(--success);
  --color-warn: var(--warning);
  --color-neg: var(--danger);
}
```

> **Display font note:** the codebase uses Plus Jakarta as `--font-display`; Halo Pro uses **Inter 600** for display/large numbers. Either re-point `--font-display` to `var(--font-inter)`, or just use `font-sans` with `font-semibold` for titles. Don't introduce Jakarta into Halo Pro screens.

### 4.5 Prototype → codebase token map

| Prototype (`--a-*`) | Codebase token |
|---|---|
| `--a-bg` | `--surface-elevated` |
| `--a-surface` | `--surface` |
| `--a-surface-2` | `--surface-2` |
| `--a-border` | `--border` |
| `--a-border-strong` | `--border-hover` |
| `--a-text` / `-2` / `-3` | `--text-primary` / `-secondary` / `-muted` |
| `--a-accent` | `--primary` |
| `--a-accent-on` | `--accent-on` |
| `--a-accent-soft` / `-2` | `--accent-soft` / `--accent-soft-2` |
| `--a-pos` / `--a-pos-soft` | `--success` / `--success-soft` |
| `--a-neg` / `--a-neg-soft` | `--danger` / `--danger-soft` |
| `--a-warn` / `--a-warn-soft` | `--warning` / `--warning-soft` |
| `--a-side-bg` / `-text` / `-muted` / `-border` / `-active` | `--sidebar-bg` / `-text` / `-muted` / `-border` / `-active` |

### 4.6 Typography

```html
<!-- already handled by next/font once §4.2 is done -->
Inter:      UI / body — font-feature-settings: 'cv11','ss01','ss03'; letter-spacing: -0.01em
Inter 600:  display / large numbers — letter-spacing: -0.03em
Geist Mono: numerals, codes, dates, kbd — font-feature-settings: 'tnum' 1; letter-spacing: -0.02em
```

Wrap every numeric cell / JE code / date in `font-mono tabular-nums` (or a `.mono` helper).

Type scale:

| Use | Size | Weight |
|---|---|---|
| Page hero number | 24 / 28px | 600 |
| Section heading | 22px | 600 |
| Subhead | 16px | 500 |
| Body | 14px | 400 |
| Body emphasis | 13.5px | 500 |
| Meta / column header | 12.5px | 400 |
| Small | 11.5px | 500 |
| Micro (uppercase label) | 10.5–11px | 600, `letter-spacing: 0.08em`, uppercase |
| Kbd chip | 10px | Geist Mono |

### 4.7 Spacing, radius, shadow

- 8px base grid. Internal card padding 14–22px.
- Radii: **6px** (kbd, buttons), **8–10px** (inputs, cards, command bar), **999px** (status pills).
- **No drop shadows anywhere in chrome.** Depth = hairline borders + the bone/white surface contrast only. (The existing `.card` utility has a `box-shadow` — drop it for Halo Pro surfaces, or override with `shadow-none`.)
- Detail pane sits on `--surface` against the `--surface-elevated` canvas; the gap + border do the separation.
- Motion: **120–150ms ease-out** on hover fills only. No springs, no long transitions. (The global `transition-duration: 150ms` in `globals.css` is fine; remove any `card-hover` shadow transitions.)

---

## 5. The shell (every authenticated screen)

Three zones, same on every screen:

```
┌──────────────┬───────────────────────────────────────────┐
│              │  Command bar (breadcrumbs + / + ⌘K)        │
│   Sidebar    ├───────────────────────────────────────────┤
│   (dark)     │   Screen content                          │
│              ├───────────────────────────────────────────┤
│              │  Status footer (mono, derived)            │
└──────────────┴───────────────────────────────────────────┘
```

**Where it mounts:** `app/(dashboard)/layout.tsx` already renders `<Sidebar/>` + `<main>{children}</main>`. Add `<CommandBar/>` above `{children}` and `<StatusFooter/>` below it, *inside* `<main>`, and switch `<main>` to a column flex so the footer pins to the bottom:

```tsx
<main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--surface-elevated)]">
  <CommandBar />                                  {/* per-route crumbs via usePathname */}
  <div className="flex-1 overflow-y-auto">{children}</div>
  <StatusFooter />
</main>
```

> Today `<main>` has `p-4 sm:p-6 lg:p-8 xl:px-10`. Move that page padding **into each page/screen** (the command bar and footer need to sit flush to the edges; the prototype gives the command bar its own `18px 28px 12px` padding and the footer `8px 14px`).

### 5.1 Sidebar — restyle `components/layout/Sidebar.tsx` (D5)

**Keep** the entire existing structure: `navigation` array, i18n labels (`useTranslations`), `useSidebarStore` collapse, expandable sections (`expandedSections`), `usePathname` active detection, `MobileNav` branch, logout. **Change only chrome:**

- Width 240–248px; background `var(--sidebar-bg)`; full height. (Existing `w-64` ≈ 256px is fine, or tighten to `w-60`.)
- **Brand:** swap the plain wordmark for a **coral 28×28 rounded square** (`bg-[var(--primary)]`, radius 8, white "A", weight 700) + "Arvelo" in Inter 600, 17px white. Drop the Jakarta display font here.
- **Tenant row** (below brand): uppercase 11px muted "TENANT" label + `tenant.name` + a `chevron-down`. Display-only (D6). On a `rgba(255,255,255,0.04)` fill, radius 8.
- **Search / ⌘K row** (new, below tenant): full-width pill, `rgba(255,255,255,0.04)` fill, `search` icon + "Search" + a `⌘K` chip on the right. Clicking it opens the command palette (§8.1).
- **Group headings:** uppercase 10.5px, weight 600, `letter-spacing 0.1em`, colour `var(--sidebar-muted)`, padding `14px 12px 6px`.
- **Nav item:** radius 7, padding `7px 10px`, font 13.5px. Default text `var(--sidebar-text)`, icon `var(--sidebar-muted)`.
- **Hover:** `var(--sidebar-active)` fill, no marker.
- **Active** (`pathname === href`): `var(--sidebar-active)` fill + white text/icon + a **2–3px coral left bar** (16px tall, radius 2, inset at the row's left edge — `border-l-2 border-[var(--primary)]` or an absolutely-positioned bar). Replaces today's `border-primary` blue bar.
- **Badge** (e.g. unread counts, if present): 11px, on `rgba(255,255,255,0.05)`; when the row is active use `bg-[var(--accent-soft)] text-[var(--primary)]`.
- **Expandable section caret:** keep the `ChevronRight` rotate-90 behaviour; colour it `var(--sidebar-muted)`.
- **Footer:** keep the user block + `LanguageSwitcher` + logout; restyle avatar to a **coral rounded-square with initials** (not the blue→indigo gradient), name white, role `var(--sidebar-muted)`.

The prototype's `SidebarA` (`src/sidebar.jsx`) shows the exact paddings/sizes — match its chrome, but onto the codebase's richer nav tree.

### 5.2 Command bar — new `components/layout/CommandBar.tsx`

Single pill row at the top of `<main>`. Container padding `18px 28px 12px 28px`.

- **Pill:** `bg-[var(--surface)]`, `border border-[var(--border)]`, `rounded-[10px]`, padding `8px 14px`, font 13.
  - Left: coral `Command` icon (lucide, 14px, `text-[var(--primary)]`).
  - Breadcrumbs: derive from `usePathname()` (route → crumb map). First crumb `--text-primary` weight 500; separators `ChevronRight` 11px `--text-muted`; rest `--text-secondary` weight 400.
  - Right: `flex-1` spacer, then optional "Press `/` to filter" hint + a vertical `1px` divider, then `⌘` `K` kbd chips. Clicking the pill (or pressing ⌘K) opens the palette.
- After the pill: optional action buttons passed as props (e.g. `Import`, `+ New entry` with an `N` chip).

Props: `crumbs: {label, href?}[]`, `hints?: boolean`, `actions?: ReactNode`. A `usePathname`-driven default crumb map covers the standard routes; pages can override via a context or layout slot.

### 5.3 Status footer — new `components/layout/StatusFooter.tsx` (D3)

Mono terminal line pinned to the bottom of `<main>`.

- `bg-[var(--surface-2)]`, `border-t border-[var(--border)]`, padding `8px 14px`, **Geist Mono 11px**, colour `var(--text-muted)`.
- Item types: `{label, value, color?}` (label muted, value `--text-primary`), `{dot:true,label,color?}` (5px coloured circle + label), `{spacer:true}` (flex spacer).
- **Values are derived, never hardcoded** — each screen computes them:

| Item | Derived from |
|---|---|
| `BOOKS <period>` | active fiscal period from store |
| `VIEWING <n> entries` | current filtered list length |
| `• Balanced` / `• Unbalanced` | sum(debits) === sum(credits) over the visible set; dot `--success` / `--danger` |
| `POSTED €<total>` | sum of posted amounts in view, formatted EUR |
| right side: `⌘K Search`, `↵ Open`, `J K navigate` | static keyboard hints |

Props: `items: FooterItem[]`. Build per-screen in the page component from real data.

### 5.4 Kbd chip — new `components/ui/Kbd.tsx`

```
font-mono, 10px, padding 1px 5px, rounded 3px,
bg var(--surface-2), color var(--text-secondary), border 1px solid var(--border)
```

On dark surfaces (sidebar) use the dark variant: `bg rgba(255,255,255,0.06)`, `color var(--sidebar-muted)`, `border rgba(255,255,255,0.05)`.

---

## 6. Screens (each with an acceptance checklist)

Screen IDs match the design-canvas sections in `src/app.jsx`. Read the matching `src/screen-*.jsx` for exact values.

### 6.1 Foundations — internal token reference

`src/foundations.jsx` (`FoundationsA`). Don't ship as a user page — use it to verify token migration renders correctly.

### 6.2 Transactions list (hero) — `src/screen-transactions-pro.jsx` ⭐

Target route: `app/(dashboard)/accounting/journal/page.tsx`. This is what bookkeepers see all day — get it right first.

Layout: command bar → stat strip (4 cols) → tabs row → split-pane (list `flex 1.6` + detail pane `flex 1`) → status footer.

- **Stat strip** (`HaloStat`, no card chrome): 11px uppercase label + 24px mono value + 11.5px subtle line. Col 1 carries a mini delta chip (`+8.4%` on `--success-soft`). Drafts col value uses `--warning`; a "Balanced ✓" col uses `--success` + check icon.
- **Tabs:** active = `--text-primary` filled pill, white text, count-chip at 55% white. Inactive = transparent, `--text-secondary` text, `--text-muted` count. Draft tab count uses coral when > 0. Right-aligned kbd hints: `J K to navigate · E edit · D duplicate`.
- **List row** (`TxRowAP`): grid `24 · 96 · 88 · 1fr · 110 · 120 · 130 · 90` px (checkbox · JE code mono · date mono · description+partner · debit code · credit code · amount mono right · status pill). Row ≈52px, hairline separators. Hover `--surface-2`. **Selected:** `--accent-soft` fill + 2px coral left **inset** border (no content shift). Status pill: posted = green dot no fill; draft = `--warning-soft`/`--warning`; reversed = strikethrough.
- **Detail pane** (sticky right): `--surface` card, border, radius 10, padding 20. Header = JE code (mono 16) + status pill. Date + reference below. T-account block (Debit | Credit, each row code · name · amount; totals row underlined). Description (13.5, 1.45). Attachments (56×56 `--surface-2` tiles, paperclip). Audit row (avatar + "Posted by Peeter · 20.05.2026 · 14:32", mono 11.5). Footer buttons: `Edit (E)` coral primary, `Duplicate (D)`, `Reverse` plain.

**✅ Acceptance**
- [ ] Command bar crumbs reflect `Transactions › <period> › <tab>` from route/state.
- [ ] 4 stat columns render from real aggregates; delta chip sign-coloured.
- [ ] Tabs filter the list; counts are live; draft count coral when > 0.
- [ ] Clicking a row selects it (coral inset + `--accent-soft`) and updates the detail pane; no layout shift.
- [ ] `J/K` move selection; `E` opens edit; `N` new entry; `D` duplicate; `↵` opens; `/` focuses search. (§8)
- [ ] Detail pane debits/credits sum equal; totals underlined; status pill correct.
- [ ] Status footer shows derived period, count, balanced dot, posted total (§5.3).
- [ ] No drop shadows; numerals are Geist Mono tabular; coral never used as text.

### 6.3 New / edit transaction — `src/screen-transaction-edit.jsx`

Journal-entry composer. Full-width form on `--surface`, no split-pane.

- Command bar crumbs: `Transactions › New entry › JE-2026-0143 · draft`. Actions: `[Save draft]` `[Post entry ⌘⏎]`.
- Two columns: **left** sticky meta card (date mono input, auto JE number mono read-only, type select Sales/Purchase/Payment/Manual, reference, partner combo); **right** lines table (account picker code+name · description · debit mono · credit mono · vat code · vat amount) + `+ Add line`.
- Totals row: Debit, Credit, Difference. Difference `--success` when 0, `--danger` otherwise.
- Below: description textarea (autogrow), attachments dropzone (`--surface-2`, dashed border), keyboard hint footer `⌘⏎ post · ⌘S save draft · ⌘D duplicate line`.

**✅ Acceptance**
- [ ] Lines add/remove; debit/credit columns mono.
- [ ] Difference recomputes live and is sign-coloured; **Post entry disabled until Difference = 0**.
- [ ] `⌘⏎` posts (only when balanced), `⌘S` saves draft, `⌘D` duplicates focused line, `Esc` cancels.
- [ ] JE number is read-only; date input mono; partner combo wired to existing partner data.

### 6.4 Chart of accounts — `src/screen-accounts.jsx`

Target route: `app/(dashboard)/accounting/accounts/page.tsx`.

- Command bar crumbs: `Accounts › FY <year> › All types`. Action: `[+ New account]`.
- 3-col `StatA` row: Total assets · Total liabilities · Net equity (mono values).
- Table grouped by class (Käibevara, Põhivara, … from data): group heading row (micro uppercase label + count + collapse caret, **sticky on scroll**); columns `80 code mono · 1fr name · 100 type badge · 130 balance mono right · 130 YTD movement mono right signed`.
- Type badges use the `--type-*` token pairs (§4.3).

**✅ Acceptance**
- [ ] Groups collapse/expand; headings sticky; counts correct.
- [ ] Type badges use the correct soft/fg pair per account type.
- [ ] Balances + YTD movement are mono tabular, right-aligned, YTD signed (neg = `--danger`).
- [ ] Status footer: `Showing <n> · 5 types · • balanced` + key hints (derived).

### 6.5 Invoices — `src/screen-invoices.jsx`

Target route: `app/(dashboard)/invoices/page.tsx` (+ existing `InvoiceListWorkspace.tsx`).

- Crumbs: `Invoices › <period> › All`. Action: `[+ New invoice]`.
- Tabs: All · Draft · Sent · Paid · Overdue · Cancelled (same tab style as Transactions).
- Stats: Total outstanding · Overdue · Paid this month · Average DSO.
- Columns: `24 check · 110 number mono · 88 date mono · 1fr partner+description · 110 due mono · 120 amount mono right · 100 status pill`.
- Status pills: Draft (warn), Sent (`--text-secondary` outlined), Paid (pos), Overdue (neg + "13d" days-past chip).

**✅ Acceptance**
- [ ] Tabs filter; counts live; overdue chip shows days past due.
- [ ] Reuses existing invoice data/state from `InvoiceListWorkspace`; only chrome changes.
- [ ] Status pills mapped to the right tone; amounts mono right-aligned.

### 6.6 Partners — `src/screen-partners.jsx`

Target route: `app/(dashboard)/accounting/partners/page.tsx`.

- Crumbs: `Partners › All › <n> contacts`. Tabs: All · Customers · Suppliers · Employees.
- Split-pane like Transactions: list left, partner detail right.
- List columns: avatar (24, initials, `--surface-2`) · name + tagline · type badge · outstanding mono · last-activity date mono.
- Detail pane: avatar 56 · name · type chip · contact rows (email/phone/vat) · outstanding (T-account-style block) · 5 recent transactions.

**✅ Acceptance**
- [ ] Row select updates detail pane (same selection pattern as Transactions).
- [ ] Tabs filter by partner type; type badges correct.
- [ ] Detail contact rows + recent-transactions list render from real partner data.

---

## 7. Components / primitives inventory

### 7.1 Map prototype → codebase

| Prototype | Codebase target |
|---|---|
| `PageA` shell | existing `app/(dashboard)/layout.tsx` + restyled `Sidebar.tsx` |
| `HaloProCommandBar` | new `components/layout/CommandBar.tsx` |
| `HaloProStatusFooter` | new `components/layout/StatusFooter.tsx` |
| `CommandPalette` (⌘K) | new `components/layout/CommandPalette.tsx` (§8.1) |
| `ButtonA` (primary / ghost / plain) | new `components/ui/Button.tsx` |
| `Tag` (status pill + dot) | new `components/ui/StatusPill.tsx` |
| account-type badge | new `components/ui/TypeBadge.tsx` |
| `StatA` / `HaloStat` | new `components/ui/Stat.tsx` |
| split-pane container | new `components/layout/SplitPane.tsx` |
| `kbdHP` chip | new `components/ui/Kbd.tsx` |

### 7.2 Button — `components/ui/Button.tsx`

Variants (from `ButtonA` in `src/sidebar.jsx`): height **34px**, radius **8px**, padding `0 12px`, font 13/500, gap 7, inline-flex; supports leading `icon` and trailing `suffix` (used for the `N` kbd chip).

| variant | bg | text | border |
|---|---|---|---|
| `primary` | `var(--primary)` | `#fff` | `var(--primary)` |
| `ghost` (default) | `var(--surface)` | `var(--text-primary)` | `1px var(--border)` |
| `plain` | transparent | `var(--text-secondary)` | transparent |

States: hover = darken bg one step (`--primary-hover` for primary; `--surface-2` for ghost/plain); focus-visible = 2px coral ring (already global). No shadow.

### 7.3 StatusPill — `components/ui/StatusPill.tsx`

Props `tone: 'posted'|'draft'|'sent'|'paid'|'overdue'|'reversed'`, optional `meta` (e.g. days-past). Posted/paid = green **dot, no fill**. Draft = `--warning-soft`/`--warning`. Sent = outlined `--text-secondary`. Overdue = `--danger-soft`/`--danger` + meta chip. Reversed = strikethrough label. Radius 999px, font 11.5/500.

### 7.4 Icons — lucide-react map

`src/icons.jsx` is a hand-rolled fallback for the standalone HTML. **In the codebase use lucide-react directly.** Key mappings used by the prototype:

| Prototype icon | lucide-react |
|---|---|
| `cmd` | `Command` |
| `chevR` / `chevD` | `ChevronRight` / `ChevronDown` |
| `search` | `Search` |
| `arrowUR` / `arrowDR` | `ArrowUpRight` / `ArrowDownRight` |
| `check` | `Check` |
| `ledger` | `BookText` |
| `scale` | `Scale` |
| `building` | `Building2` |
| `bank` | `Landmark` |
| `file` | `FileText` |
| `trending` | `TrendingUp` |
| `more` | `MoreHorizontal` |

Default stroke-width **1.6**, `stroke-linecap/linejoin: round`.

---

## 8. Interactions & keyboard

Global shortcuts (wire in the dashboard layout or a `useKeyboardShortcuts` hook). Ignore when focus is in an input/textarea except where noted.

| Key | Scope | Behaviour |
|---|---|---|
| `⌘K` / `Ctrl+K` | global | Open command palette (§8.1). |
| `/` | list screens | Focus the search input filtered to the current tab. |
| `J` / `K` | list screens | Move selection down / up. Wraps at ends; scrolls the selected row into view **without** `scrollIntoView` (use container `scrollTop` math). |
| `↵` | list screens | Open the selected row (→ detail / edit). |
| `E` | list screens | Edit the selected row. |
| `N` | list screens | New entity for this screen (entry / invoice / account / partner). |
| `D` | list screens | Duplicate the selected row. |
| `⌘⏎` | entry composer | Post the entry (only if Difference = 0). |
| `⌘S` | entry composer | Save as draft. |
| `⌘D` | entry composer | Duplicate the focused line. |
| `Esc` | global | Close palette/modal; clear `/` filter focus. |

Selection: row click selects (highlight + detail update); double-click opens edit. Selection persists across tab switches when the row is still in the filtered set. Animations 120–150ms ease-out, no springs.

### 8.1 ⌘K Command palette — `components/layout/CommandPalette.tsx` (D1)

Build it for real. Centered modal over a dimmed backdrop.

**Shell**
- Backdrop: `rgba(10,10,10,0.32)`, fades in 120ms. Click or `Esc` closes.
- Panel: centered, `560px` wide, top-offset ~`18vh`. `bg-[var(--surface)]`, `border border-[var(--border)]`, `rounded-[12px]`. **One soft shadow is permitted here** (it's an overlay, not chrome): `0 16px 48px rgba(10,10,10,0.18)`.

**Search row**
- `Command` icon (coral, 16px) + text input (font 15, no border, placeholder "Search or jump to…"). Right: a `Esc` kbd chip.
- Hairline divider below.

**Results** (grouped, scrollable, max-height ~`50vh`)
- Group heading: micro uppercase `--text-muted`, padding `10px 14px 4px`.
- Groups, in order:
  1. **Navigation** — every route from `Sidebar.tsx`'s `navigation` tree (reuse it; don't duplicate). Each item: icon + i18n label + breadcrumb hint on the right. Selecting routes via `router.push`.
  2. **Actions** — context actions: New entry, New invoice, New account, New partner, Import bank statement, etc.
  3. **Recent** (optional) — last few visited routes from a small store, if cheap; otherwise omit.
- Row: padding `9px 14px`, font 13.5, gap 10, icon `--text-muted`. **Active row** (keyboard cursor): `--accent-soft` fill + 2px coral left inset + `--text-primary`. Trailing: a faint `↵` chip on the active row.
- Fuzzy filter across label + group; empty state: "No results" centered muted.

**Keyboard**
- Opens on `⌘K`; input autofocuses. `↑/↓` move the cursor across the flat filtered list (skip headings). `↵` activates. `Esc` closes. Typing refilters live.

**Acceptance**
- [ ] Opens/closes on `⌘K` / `Esc` / backdrop click; input autofocuses.
- [ ] Navigation group is generated from the real `navigation` tree (i18n labels), routes via `router.push`.
- [ ] `↑/↓/↵` work; active row uses coral inset + `--accent-soft`; fuzzy filter live.
- [ ] No body scroll behind the modal; focus trapped within the panel.

---

## 9. Density mode (optional, nice-to-have)

The prototype has a `density: 'comfortable' | 'compact'` tweak. In `compact`: row 52→40px, card padding 22→14px, stat strip 22→16px vertical, command bar `18px 28px 12px`→`12px 24px 8px`. If you implement it, wire as a user preference in the existing settings store; otherwise ship `comfortable` only and leave a TODO.

## 10. State management

No new state shapes beyond the existing codebase. Selection state for split-pane screens (one selected row id per list) is local to the page component. The redesign only changes presentation.

## 11. Assets

- **Fonts:** Inter, Geist Mono via `next/font` (§4.2). Plus Jakarta stays loaded but is **not** used on Halo Pro screens.
- **Icons:** `lucide-react` (existing). §7.4 has the map.
- **No images** in chrome. Avatars are letter-initials over `--surface-2` (or coral square for the user/brand).
- **No logo file:** wordmark "Arvelo" in Inter 600 + a coral 28×28 square with a white "A".

## 12. Files in this bundle

```
design_handoff_halo_pro/
├── README.md                          ← this file
└── prototype/
    ├── Redesign Explorations.html     ← open to see all screens on the canvas
    └── src/
        ├── app.jsx                    ← mounts the design canvas + tweaks
        ├── data.jsx                   ← sample Estonian SME data
        ├── icons.jsx                  ← inline SVG fallback (use lucide in prod)
        ├── foundations.jsx            ← token reference cards
        ├── sidebar.jsx                ← PageA shell + SidebarA + ButtonA  ⭐ chrome spec
        ├── screen-helpers.jsx         ← CommandBar, StatusFooter, Stat, kbd  ⭐
        ├── screen-transactions-pro.jsx ← Halo Pro transactions hero  ⭐
        ├── screen-transaction-edit.jsx
        ├── screen-accounts.jsx
        ├── screen-invoices.jsx
        ├── screen-partners.jsx
        ├── screen-transactions.jsx / screens-c.jsx  ← REJECTED alt directions (B/C), reference only
        ├── design-canvas.jsx / tweaks-panel.jsx     ← viewer plumbing, no production value
```

> ⭐ = read these first. The committed direction is **Halo Pro** (the `*A` / `*AP` components). The B (Quire) and C (Aktiv) components in `screen-transactions.jsx` / `screens-c.jsx` are kept only to show what was rejected — **do not ship them.** Halo Pro borrows C's command bar + status footer + split-pane onto A's calmer light surface.

## 13. Implementation order

1. **Tokens** — §4.2–4.4 (`layout.tsx` font + `globals.css` `:root`/`@theme`). App should still render (looks wrong but no crash). Verify against `FoundationsA`.
2. **Shell** — restyle `Sidebar.tsx` (§5.1); add `CommandBar` + `StatusFooter` to the dashboard layout (§5, 5.2, 5.3).
3. **Primitives** — `Button`, `Kbd`, `StatusPill`, `TypeBadge`, `Stat`, `SplitPane` (§7).
4. **Transactions list** (§6.2) — the hero. Get it right first.
5. **Command palette** (§8.1).
6. **Transaction edit, Accounts, Invoices, Partners** (§6.3–6.6) — same patterns.
7. **Keyboard shortcuts** (§8) across list screens + composer.
8. *(optional)* Density mode (§9).

## 14. Pre-ship checks

- [ ] Coral `#ff4e2c` appears only as non-text UI (D4) — grep for it as a `color:` on text and remove.
- [ ] No `box-shadow` on chrome surfaces (only the command-palette overlay is allowed one).
- [ ] All amounts/codes/dates are Geist Mono tabular and right-aligned where numeric.
- [ ] Status-footer values are derived from live data, not hardcoded (D3 / §5.3).
- [ ] Existing routes, i18n labels, auth/sidebar stores and API calls are unchanged.
- [ ] `MobileNav` still works and inherits the new tokens (D2) — no new mobile layouts shipped.
- [ ] Confirm final footer item strings + period source with product before launch.
