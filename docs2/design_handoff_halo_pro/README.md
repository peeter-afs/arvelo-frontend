# Handoff: Arvelo · Halo Pro redesign

> Hand this folder to Claude Code (or any developer). Everything they need to recreate the redesign in the existing Next.js + Tailwind codebase is in here.

---

## 1. Overview

Arvelo is an SME bookkeeping app (Estonian-flavoured: EUR, DD.MM.YYYY dates, Estonian chart-of-accounts numbering). The existing UI under `app/` and `components/` uses a generic blue-on-white SaaS look (`--primary: #2563EB`, slate sidebar, Tailwind defaults).

The redesign — codenamed **Halo Pro** — replaces that with a calmer, denser, pro-tool aesthetic aimed at bookkeepers who use the app 8 hours a day:

- **Bone canvas** (`#f6f4ee`) instead of cold white
- **Near-black sidebar** with a coral active-row
- **Electric coral accent** (`#ff4e2c`) used very sparingly
- **Always-on split-pane**: list left, detail pane right (no more drawer modals)
- **Command bar** at the top of every screen with `⌘K`, breadcrumbs, slash-filter
- **Terminal-style mono status footer** at the bottom of every screen
- **Visible keyboard shortcut chips** in row chrome (`J/K` navigate, `E` edit, `N` new, etc.)
- **Tabular mono numerals** (Geist Mono) for every amount, code and date

It is intentionally close to Linear / Mercury / Ramp in feel, and intentionally far from QuickBooks / Xero / Merit.

## 2. About the files in this bundle

**The HTML files in `prototype/` are design references — not production code to ship.** They are React-in-the-browser, Babel-transpiled mockups rendered inside an infinite design canvas so the team can compare screens side-by-side. They use inline styles, CSS custom properties and a single `Redesign Explorations.html` shell.

**Your job is to recreate these designs inside the existing codebase** (Next.js App Router + Tailwind v4 + the components in `components/`) using its established patterns:

- Translate inline-style colour values into Tailwind theme tokens / CSS custom properties on `:root` (replacing the current `--primary`, `--sidebar-bg`, etc. in `app/globals.css`).
- Translate inline-style layout into Tailwind utility classes / CSS modules following existing component conventions (`components/layout/Sidebar.tsx`, `components/invoices/InvoiceListWorkspace.tsx`, etc.).
- Reuse `lucide-react` icons — the prototype's `src/icons.jsx` is a hand-rolled SVG fallback; in the real codebase use Lucide directly.
- Keep all data-fetching, state, routing and API calls as they are in the current codebase. The redesign is a chrome + layout overhaul, not a data-model change.

## 3. Fidelity

**High-fidelity.** Final colours, typography, spacing, and interactions are all locked. Hex values, font sizes, padding, radii and shadow values in this document are the spec — match them.

## 4. The system (design tokens)

These belong on `:root` in `app/globals.css`, replacing the current variables. The token names below are the ones used throughout the prototype source.

### Colour

| Token | Hex | Used for |
|---|---|---|
| `--a-bg` | `#f6f4ee` | Page canvas (warm bone) |
| `--a-surface` | `#ffffff` | Cards, list rows, inputs |
| `--a-surface-2` | `#f0ede5` | Status footer, kbd chips, subtle fills |
| `--a-border` | `#e6e1d4` | Hairline borders (default) |
| `--a-border-strong` | `#d4cebe` | Emphasised borders |
| `--a-text` | `#0a0a0a` | Primary text |
| `--a-text-2` | `#4a4946` | Secondary text |
| `--a-text-3` | `#8e8c84` | Tertiary / meta / placeholders |
| `--a-accent` | `#ff4e2c` | Coral accent (primary buttons, focus rings, active markers) |
| `--a-accent-on` | `#ffffff` | Text on accent background |
| `--a-accent-soft` | `#ffe7df` | Selected row tint, very subtle accent fills |
| `--a-accent-soft-2` | `#fff3ee` | Even softer accent tint |
| `--a-pos` | `#0e7b5a` | Posted / positive / balanced |
| `--a-pos-soft` | `#e2efe9` | Positive tag background |
| `--a-neg` | `#c84b3e` | Overdue / danger / negative trend |
| `--a-neg-soft` | `#fbe7e3` | Danger tag background |
| `--a-warn` | `#b07d1f` | Draft / warning |
| `--a-warn-soft` | `#f5ecd6` | Warning tag background |
| `--a-side-bg` | `#0a0a0a` | Sidebar background |
| `--a-side-text` | `#d4d1c8` | Sidebar default text |
| `--a-side-muted` | `#6b6964` | Sidebar group headings |
| `--a-side-border` | `rgba(255,255,255,0.06)` | Sidebar dividers |
| `--a-side-active` | `rgba(255,255,255,0.06)` | Sidebar hover / active row fill |

Account-type badges use these soft/strong pairs (see `src/screen-helpers.jsx` → `typeSoft / typeColor`):

| Type | Soft bg | Foreground |
|---|---|---|
| asset | `#e4ecf4` | `#2c4a6e` |
| liability | `#f4e8e0` | `#7a4a1f` |
| equity | `#ece4f0` | `#5a3974` |
| revenue | `#e0eee6` | `#0e7b5a` |
| expense | `#f0e4e2` | `#8a3a30` |

### Typography

Load via Google Fonts. The prototype uses:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

| Role | Family | Notes |
|---|---|---|
| UI / body | **Inter** | `font-feature-settings: 'cv11', 'ss01', 'ss03'`, `letter-spacing: -0.01em` |
| Display (page titles, large numbers) | Inter 600 | `letter-spacing: -0.03em` |
| Numerals, codes, dates, kbd | **Geist Mono** | `font-feature-settings: 'tnum' 1`, `letter-spacing: -0.02em` |

The codebase already loads Inter via `next/font`. Add Geist Mono the same way and expose it as `--font-mono`. Wrap every numeric cell / JE code / date in a `.mono` class (or Tailwind `font-mono`) with `tabular-nums`.

Type scale (used throughout the screens):

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
| Kbd chip | 10px | mono, Geist Mono |

### Spacing, radius, shadow

- 8px base grid. Internal card padding is 14–22px.
- Border radii: **6px** (kbd, buttons), **8–10px** (inputs, cards, command bar), **999px** (status pills).
- **No drop shadows** anywhere in chrome. Depth comes from hairline borders only.
- The detail pane in split-pane screens sits on `--a-surface` against the `--a-bg` canvas — the gap and border do the visual separation.

## 5. The shell (every screen)

Every authenticated screen has the same three-zone structure (see `src/sidebar.jsx` and `src/screen-helpers.jsx`).

```
┌──────────────┬───────────────────────────────────────────┐
│              │  Command bar (breadcrumbs + ⌘K)           │
│   Sidebar    ├───────────────────────────────────────────┤
│   (dark)     │                                           │
│              │   Screen content                          │
│              │                                           │
│              ├───────────────────────────────────────────┤
│              │  Status footer (mono, muted)              │
└──────────────┴───────────────────────────────────────────┘
```

### 5.1 Sidebar — `<PageA>` shell, source in `src/sidebar.jsx`

- 240px wide, `--a-side-bg`, full-height
- Logo at top: small coral square + wordmark "Arvelo" in Inter 600
- Tenant switcher row below logo: avatar circle (initials) + tenant name + fiscal-year chip (`2026`)
- Sections (group heading in `--a-side-muted` uppercase 10.5px):
  - **Workspace**: Inbox, Transactions, Invoices, Bills, Bank
  - **Books**: Chart of accounts, Journals, Reports, VAT
  - **Settings**: Partners, Settings, Team
- Active row: `--a-side-active` background + 2px coral left bar inset 0
- Hover: `--a-side-active` only, no bar
- Bottom: user avatar + name + role, with a `⌘K` kbd chip on the right

### 5.2 Command bar — `HaloProCommandBar` (`src/screen-helpers.jsx`)

A single pill-shaped row at the top of the content area. Padding `18px 28px 12px 28px` from the content edges.

- Pill: `var(--a-surface)`, `1px solid var(--a-border)`, `border-radius: 10px`, padding `8px 14px`, font-size 13
- Left: coral `cmd` glyph (Lucide `Command`, 14px, `var(--a-accent)`)
- Breadcrumbs: first crumb `--a-text` weight 500, separators `chevron-right` 11px `--a-text-3`, subsequent crumbs `--a-text-2` weight 400
- Right: optional "Press `/` to filter" hint, vertical divider, `⌘K` kbd chips
- After the pill, optional action buttons (e.g. "Import", "New entry")

### 5.3 Status footer — `HaloProStatusFooter` (`src/screen-helpers.jsx`)

Mono terminal-style line stuck to the bottom of every screen.

- Background `var(--a-surface-2)`, border-top `1px solid var(--a-border)`, padding `8px 14px`
- Font: Geist Mono, 11px, colour `var(--a-text-3)`
- Items: `label value` pairs (label muted, value `--a-text`), `dot` items (coloured 5px circle + label), and `spacer` flex items
- Example: `BOOKS  May 2026   VIEWING  142 entries   • Balanced   POSTED  €124,820.50   ⌘K Search   ⏎ Open`

### 5.4 Kbd chip — `kbdHP` token

```
font-family: Geist Mono;
font-size: 10px;
padding: 1px 5px;
border-radius: 3px;
background: var(--a-surface-2);
color: var(--a-text-2);
border: 1px solid var(--a-border);
```

Used inside the command bar, action buttons (`N` next to "New entry"), under the tabs row (`J K to navigate · E edit · D duplicate`), and inside row chrome.

## 6. Screens

Each screen below maps to one file in `prototype/src/`. The screen IDs match the design-canvas section IDs in `prototype/src/app.jsx`.

### 6.1 Foundations — `Foundations` page (token reference)

Source: `prototype/src/foundations.jsx` (`FoundationsA`). Internal reference only — don't ship as a user-facing page, but use it to verify token migration.

### 6.2 Transactions list (hero) — `prototype/src/screen-transactions-pro.jsx`

The hero screen. This is what bookkeepers see all day.

**Layout**

```
Command bar  [ Cmd  Transactions › May 2026 › All entries     /  ⌘K ]   [Import] [+ New entry  N]
Stat strip   4 columns: Posted · May | Drafts to review | VAT collected · Q2 | Book balance · ✓
Tabs row     All 142 · Sales 38 · Purchases 64 · Payments 28 · Manual 12 · Drafts 2(coral)
             right-aligned: kbd hints "J K to navigate · E edit · D duplicate"
Split-pane   LEFT: list (flex 1.6)             RIGHT: detail pane (flex 1)
             ─ column header row              ─ JE code + status pill
             ─ row · row · row · …            ─ partner + reference
                                              ─ debit/credit T-account
                                              ─ description, attachments
                                              ─ audit trail
Status footer (mono)
```

**Stat strip** (`HaloStat`): no card chrome, just typography. Each column has:
- 11px uppercase label, `--a-text-3`, letter-spacing 0.08em
- 24px tabular-mono value (`--a-text`; `--a-warn` for the Drafts column; `--a-pos` + check icon for "Balanced")
- 11.5px subtle line below in `--a-text-3`
- Right-side mini delta chip on column 1: e.g. `+8.4%`, on a `--a-pos-soft` pill, `--a-pos` text, 11px, with up-arrow icon

**Tabs**: active tab is `--a-text` filled pill with white text + a count-chip with 55% white. Inactive tabs are transparent with `--a-text-2` text and `--a-text-3` count. Draft tab's count uses `--a-accent` (coral) when > 0.

**List row** (TxRowAP):
- Grid columns: 24px (checkbox) · 96px (JE code, mono) · 88px (date, mono) · 1fr (description + partner stack) · 110px (debit code, mono small) · 120px (credit code, mono small) · 130px (amount, mono right-aligned) · 90px (status pill)
- Row height ~52px, separators `1px solid var(--a-border)` between rows
- Hover: `var(--a-surface-2)` fill
- Selected: `var(--a-accent-soft)` fill + 2px `var(--a-accent)` left border (no shift in content — use inset)
- Status pill: posted = green dot (no fill); draft = `--a-warn-soft` fill with `--a-warn` text; reversed = strikethrough

**Detail pane** (right side, sticky to top of content area):
- Card: `var(--a-surface)`, `1px solid var(--a-border)`, radius 10, padding 20
- Header row: JE code (mono 16) + status pill on right
- Date + reference number below in `--a-text-3` 12
- T-account block: two columns (Debit | Credit), each row = account code · name · amount (mono right). Totals row underlined with `border-top: 1px solid var(--a-border)` and tabular mono.
- Description block: 13.5 body, 1.45 line-height
- Attachments: 1–2 thumbnail tiles, 56×56, `--a-surface-2` bg, paperclip icon overlay
- Audit row: avatar + "Posted by Peeter · 20.05.2026 · 14:32" in 11.5 mono
- Footer button row: "Edit (E)" primary coral, "Duplicate (D)", "Reverse" plain

### 6.3 New / edit transaction — `prototype/src/screen-transaction-edit.jsx`

Journal-entry composer. Full-width form on `--a-surface`, no split-pane (replaces the right detail).

- Top: command bar with crumbs `Transactions › New entry › JE-2026-0143 · draft`
- Actions right of crumbs: `[Save draft]  [Post entry  ⌘⏎]`
- Two-column form:
  - Left (sticky meta card): date input (mono), JE number (auto-assigned, mono, read-only), type select (Sales · Purchase · Payment · Manual), reference, partner combo
  - Right (lines): table of debit/credit lines. Columns = account picker (code + name) · description · debit (mono) · credit (mono) · vat code · vat amount. "+ Add line" button at the bottom.
  - Below lines: totals row showing Debit, Credit, Difference. Difference goes `--a-pos` when zero, `--a-neg` when not.
- Below totals: description textarea (1 row, expands), attachments dropzone (`--a-surface-2` dashed border), keyboard hint footer (`⌘⏎ post · ⌘S save draft · ⌘D duplicate line`)

### 6.4 Chart of accounts — `prototype/src/screen-accounts.jsx`

- Command bar crumbs: `Accounts › All › 24 accounts`
- Action right: `[+ New account]`
- Stats: 3-column StatA row (Total assets · Total liabilities · Net equity), mono values
- Table grouped by class (Käibevara, Põhivara, etc. — see `src/data.jsx`):
  - Group heading row: micro uppercase label `--a-text-3` + count + collapse caret
  - Columns: 80px code (mono) · 1fr name · 100px type (badge) · 130px balance (mono right) · 130px YTD movement (mono right, signed)
  - Sticky group headings on scroll

### 6.5 Invoices — `prototype/src/screen-invoices.jsx`

- Command bar crumbs: `Invoices › Sales › 38 issued`
- Action right: `[+ New invoice]`
- Tabs: All · Draft · Sent · Paid · Overdue · Cancelled (same tab style as Transactions)
- Stats: Total outstanding · Overdue · Paid this month · Average DSO
- List columns: 24px check · 110px invoice number (mono) · 88px date (mono) · 1fr partner + description · 110px due (mono) · 120px amount (mono right) · 100px status pill
- Status pills: Draft (warn), Sent (text-2 outlined), Paid (pos), Overdue (neg with "13d" days-past chip)

### 6.6 Partners — `prototype/src/screen-partners.jsx`

- Command bar crumbs: `Partners › All › 11 contacts`
- Tabs: All · Customers · Suppliers · Employees
- Same split-pane as Transactions: list left, partner detail right
- List columns: avatar (24, initials, `--a-surface-2`) · name + tagline · type badge · outstanding (mono) · last activity date (mono)
- Detail pane: avatar 56 · name · type chip · contact rows (email/phone/vat) · outstanding T-account-style block · recent transactions list (5 newest)

## 7. Components inventory (what to build / wire up)

Map of prototype components → suggested codebase location:

| Prototype | Codebase target |
|---|---|
| `PageA` shell | Replace `components/layout/Sidebar.tsx` + dashboard layout in `app/(dashboard)/layout.tsx` |
| `HaloProCommandBar` | New `components/layout/CommandBar.tsx`; mount in dashboard layout above `{children}` |
| `HaloProStatusFooter` | New `components/layout/StatusFooter.tsx`; mount in dashboard layout below `{children}` |
| `ButtonA` (variants: primary, default, plain) | New `components/ui/Button.tsx` |
| `Tag` (status pill with dot) | New `components/ui/StatusPill.tsx` |
| Account-type badge | New `components/ui/TypeBadge.tsx` |
| `HaloStat` (no-card stat block) | New `components/ui/Stat.tsx` |
| `TxRowAP` (transactions row) | Lives inside the transactions page |
| Split-pane container | New `components/layout/SplitPane.tsx` (flex container, sticky right) |
| Kbd chip | New `components/ui/Kbd.tsx` |

## 8. Interactions & behaviour

- **`⌘K`**: opens a command palette (out of scope for the redesign; wire to existing palette if any, or stub for now).
- **`/`** on a list screen: focus a search input filtered to the current tab.
- **`J / K`**: move selection down / up in the current list.
- **`E`**: open edit view for the selected row.
- **`N`**: new entry on the current screen (transaction / invoice / account / partner).
- **`D`**: duplicate the selected row.
- **`⌘⏎`** on the entry composer: post the entry (validation must pass).
- **`⌘S`** on the entry composer: save as draft.
- **`Esc`**: close any modal, clear the slash-filter focus.
- Row click → selects (highlights + updates right detail pane). Double-click → opens the edit screen.
- Selection persists across tab switches when possible.
- Animations: 120–150ms `ease-out` on hover fills; no longer transitions anywhere. No spring / bounce.

## 9. Density mode

There is a tweakable `density: 'comfortable' | 'compact'` toggle in the prototype. In `compact` mode:
- Row heights drop from 52 → 40 px
- Card padding from 22 → 14 px
- Stat strip from 22 → 16 px vertical
- Command bar padding from `18px 28px 12px` → `12px 24px 8px`

Wire as a user preference in the existing settings store.

## 10. State management

No new state shapes required beyond what's in the existing codebase. The redesign only changes presentation. Selection state for split-pane screens (one selected row id per list) is local to the page component.

## 11. Assets

- **Fonts**: Inter, Geist Mono via Google Fonts / `next/font`.
- **Icons**: `lucide-react` (the existing codebase already uses it). The prototype's `src/icons.jsx` is a hand-rolled fallback for the standalone HTML — ignore in production.
- **No images** are used in the chrome. Partner avatars are letter-initials over `--a-surface-2`.
- **No logo file**: the wordmark "Arvelo" is plain Inter 600 + a coral 16×16 square.

## 12. Files in this bundle

```
design_handoff_halo_pro/
├── README.md                          ← this file
└── prototype/
    ├── Redesign Explorations.html     ← open this in a browser to see all screens
    ├── src/
    │   ├── app.jsx                    ← mounts the design canvas + tweaks panel
    │   ├── data.jsx                   ← sample data (Estonian SME bookkeeping)
    │   ├── icons.jsx                  ← inline SVG icon set
    │   ├── foundations.jsx            ← token reference cards
    │   ├── sidebar.jsx                ← PageA shell + sidebar
    │   ├── screen-helpers.jsx         ← CommandBar, StatusFooter, Stat, kbd, etc.
    │   ├── screen-transactions-pro.jsx  ← Halo Pro transactions hero screen ⭐
    │   ├── screen-transactions.jsx    ← (alternative directions, for reference)
    │   ├── screen-transaction-edit.jsx
    │   ├── screen-accounts.jsx
    │   ├── screen-invoices.jsx
    │   ├── screen-partners.jsx
    │   ├── screens-c.jsx              ← (alternative direction C, for reference)
    │   ├── design-canvas.jsx          ← infinite-canvas viewer (no production value)
    │   └── tweaks-panel.jsx           ← in-design tweak controls (no production value)
```

The committed direction is **Halo Pro** (`screen-transactions-pro.jsx` + every other screen except the `*-c.jsx` files and the `TransactionsB` / `TransactionsC` references in `screen-transactions.jsx`). The reference files for variants B (Quire) and C (Aktiv) are kept so you can see what was rejected and why — Halo Pro borrows C's command bar / status footer / split-pane moves onto A's calmer light surface.

## 13. Implementation order (suggested)

1. **Tokens**: replace `app/globals.css` `:root` block with the Halo Pro tokens. Verify the whole app still renders (it will look wrong, but should not crash).
2. **Shell**: rewrite `Sidebar.tsx` to match section 5.1. Add `CommandBar` + `StatusFooter` to `app/(dashboard)/layout.tsx`.
3. **Primitives**: build `Button`, `Kbd`, `StatusPill`, `TypeBadge`, `Stat`, `SplitPane`.
4. **Transactions list** (`app/(dashboard)/accounting/journal/page.tsx` or equivalent): rebuild with the new shell + primitives. This is the hero — get it right first.
5. **Transaction edit**, **Accounts**, **Invoices**, **Partners**: apply the same pattern.
6. **Keyboard shortcuts**: wire `J/K/E/N/D/⌘K/⌘⏎/⌘S` per section 8.

## 14. Things to double-check with the designer before shipping

- Confirm coral `#ff4e2c` passes WCAG AA on bone background for non-text use; for text on coral surface use white.
- The status-footer mono items are placeholder copy — confirm exact strings with product.
- Tenant switcher in sidebar header: behaviour for multi-tenant users is not designed.
- Mobile: redesign is desktop-first. The current `MobileNav.tsx` should keep working with the new sidebar tokens; full mobile screens are out of scope.
