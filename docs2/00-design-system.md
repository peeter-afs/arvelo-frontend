# Forss ERP — Design System

Shared foundation for all screens. Every screen spec references back to this file.

Inspired by the InvoicePortal style (clean tables, soft status pills, outlined action toolbars, card-on-gray layout) but adapted for an ERP with deeper navigation.

---

## 1. Principles

1. **Clarity over decoration.** Internal tool used daily — every pixel earns its place.
2. **Consistency beats novelty.** Same patterns, same components, same language across screens.
3. **Estonian-first.** All UI strings in Estonian. Eliminate mixed fragments like "All statuses", "No tasks", "No orders found", "No data".
4. **Density with breathing room.** Show a lot at once, but keep it scannable.
5. **Predictable interactions.** Same actions live in the same place on every screen.

---

## 2. Tokens

### 2.1 Colors

```css
/* Surfaces */
--bg-app:        #F5F6F8;   /* page background — slightly cooler than current */
--bg-surface:    #FFFFFF;   /* cards, panels, table rows */
--bg-subtle:     #F1F3F6;   /* table headers, hover, muted blocks */
--bg-inset:      #ECEFF3;   /* nested panels */

/* Borders */
--border-subtle: #E4E7EC;   /* dividers, table borders, card outlines */
--border-strong: #CDD2DA;   /* input borders */
--border-focus:  #2563EB;   /* focus rings */

/* Text */
--text-primary:   #0F1419;  /* headings, key data */
--text-secondary: #4A5260;  /* body */
--text-tertiary:  #7A828F;  /* meta, labels, placeholders */
--text-disabled:  #B0B5BD;

/* Brand (used for primary actions, active nav, links) */
--brand-600: #2563EB;
--brand-700: #1D4ED8;
--brand-50:  #EFF4FF;
--brand-100: #DCE7FF;

/* Top nav (InvoicePortal-style dark bar — optional, see §3.1) */
--nav-bg:    #0F172A;       /* slate-900 */
--nav-text:  #E2E8F0;
--nav-text-muted: #94A3B8;

/* Semantic */
--success-600: #16A34A;  --success-50: #F0FDF4;
--warning-600: #D97706;  --warning-50: #FFFBEB;
--danger-600:  #DC2626;  --danger-50:  #FEF2F2;
--info-600:    #0891B2;  --info-50:    #ECFEFF;
```

### 2.2 Typography

Inter, with system fallback. **Always enable tabular numerals** — every number column in this app should align.

```css
font-family: "Inter", -apple-system, "Segoe UI", Roboto, sans-serif;
font-feature-settings: "cv11", "ss01", "tnum";
```

| Token       | Size | Line | Weight | Usage                              |
|-------------|------|------|--------|------------------------------------|
| `text-xs`   | 12px | 16px | 500    | Labels, meta, ID chips             |
| `text-sm`   | 13px | 18px | 400    | Table cells, inputs, body          |
| `text-base` | 14px | 20px | 400    | Default body text                  |
| `text-md`   | 15px | 22px | 500    | Card titles, list items            |
| `text-lg`   | 17px | 24px | 600    | Section headings                   |
| `text-xl`   | 20px | 28px | 600    | Page titles                        |
| `text-2xl`  | 28px | 36px | 700    | Hero numbers (dashboard, totals)   |

**Table headers**: `text-xs`, weight 600, `letter-spacing: 0.04em`, UPPERCASE, `color: var(--text-tertiary)`.

**Numbers in tables**: always `font-variant-numeric: tabular-nums`, right-aligned for currency/quantity columns.

### 2.3 Spacing

4px base grid. No arbitrary values.

```
--space-1: 4px    --space-2: 8px    --space-3: 12px
--space-4: 16px   --space-5: 20px   --space-6: 24px
--space-8: 32px   --space-10: 40px  --space-12: 48px
```

### 2.4 Radii

```
--radius-sm:   6px     /* chips, badges, small buttons */
--radius-md:   8px     /* inputs, buttons */
--radius-lg:   10px    /* cards, panels */
--radius-xl:   14px    /* modals */
--radius-full: 9999px
```

### 2.5 Elevation

Most surfaces rely on borders, not shadows.

```
--shadow-sm: 0 1px 2px rgba(15, 20, 25, 0.04);
--shadow-md: 0 4px 12px rgba(15, 20, 25, 0.06), 0 1px 2px rgba(15, 20, 25, 0.04);
--shadow-lg: 0 12px 32px rgba(15, 20, 25, 0.10);  /* modals, popovers only */
```

---

## 3. Layout

### 3.1 App shell

Two options — pick one and apply globally.

**Option A — Sidebar (current Forss pattern, recommended)**: 9 nav items justify a sidebar over a top nav.

```
┌──────────┬──────────────────────────────────────────────┐
│ Forss    │  [Page header]                               │
│          ├──────────────────────────────────────────────┤
│ Töölaud  │                                              │
│ Tooted   │  [Page content]                              │
│ Kliendid │  max-width 1440px, centered when ≥1600px     │
│ ...      │                                              │
│          │                                              │
│ ⚙ User   │                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Option B — Top nav (InvoicePortal-style)**: only viable if nav can be reduced to ≤5 top-level items + a "More" menu.

I recommend **Option A**, refined as follows.

### 3.2 Sidebar specifics

- **Width**: 240px expanded, 64px collapsed.
- **Background**: `var(--bg-surface)`. Right border: `1px solid var(--border-subtle)`.
- **Brand block (top)**: 56px tall, "Forss" wordmark + small chevron-collapse button on the right edge. No "Menüü" label — the wordmark is the label.
- **Nav items**: 40px tall, 12px padding. Icon (20px) + label, gap 12px. Hover: `bg: var(--bg-subtle)`. Active: `bg: var(--brand-50)`, `color: var(--brand-600)`, font-weight 600, 3px brand-colored bar on the left edge.
- **Sections**: optionally group with a 12px-tall section label (`text-xs`, uppercase, tertiary color). For Forss, no grouping needed yet — 9 items is fine flat.
- **User block (bottom)**: avatar circle + email truncated + chevron, opens a popover with Settings / Logout. **Replaces the email pill currently floating in the top-right of every screen.**

### 3.3 Page header

Every screen has this exact structure:

```
┌──────────────────────────────────────────────────────────┐
│  [Title]   [optional ID/status]        [Primary action]  │
│  [Optional subtitle/breadcrumb]        [Secondary]       │
└──────────────────────────────────────────────────────────┘
```

- **Title**: `text-xl`, weight 600.
- **Subtitle/meta**: `text-sm`, `color: var(--text-tertiary)`, on a second line. Used for IDs, dates, contextual info.
- **Actions**: right-aligned, primary button rightmost.
- **Padding**: 24px horizontal, 20px top, 16px bottom.
- **Border-bottom**: `1px solid var(--border-subtle)`.

The current "hamburger ☰ + Title" + floating email-pill pattern is **replaced**. Hamburger only appears on mobile (≤768px) for sidebar toggle.

### 3.4 Page content area

- Background: `var(--bg-app)`.
- Padding: 24px on all sides.
- Content lives inside one or more **cards** (see §4.1).

---

## 4. Components

### 4.1 Card

The default container for any block of content.

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-lg);
padding: 20px 24px;
```

- Cards do **not** stack borders directly against each other — minimum 16px gap between cards.
- Card header (when present): `text-md`, weight 600, with optional right-aligned actions, separated from body by 16px gap (no divider line by default).

### 4.2 Buttons

Three variants, three sizes. **Buttons always have label text** — icon-only buttons are reserved for table row actions (`⋯`) and toolbar toggles.

| Variant   | Background        | Text              | Border                       | Use                          |
|-----------|-------------------|-------------------|------------------------------|------------------------------|
| Primary   | `--brand-600`     | white             | none                         | One per screen, max          |
| Secondary | `--bg-surface`    | `--text-primary`  | `1px var(--border-strong)`   | Most actions                 |
| Ghost     | transparent       | `--text-secondary`| none                         | Tertiary actions, table rows |
| Danger    | `--bg-surface`    | `--danger-600`    | `1px var(--danger-600)`      | Destructive (delete, cancel) |

Sizes:

| Size | Height | Padding-x | Font     |
|------|--------|-----------|----------|
| sm   | 28px   | 10px      | text-xs  |
| md   | 36px   | 14px      | text-sm  |
| lg   | 40px   | 18px      | text-base|

- **Icons**: 16px for sm/md, 18px for lg. Always 8px gap to label.
- **Disabled**: 50% opacity, `cursor: not-allowed`, no hover.
- **Loading**: replace icon with 14px spinner; label stays.

### 4.3 Inputs

```css
height: 36px;
padding: 0 12px;
border: 1px solid var(--border-strong);
border-radius: var(--radius-md);
background: var(--bg-surface);
font-size: 13px;

/* Focus */
border-color: var(--border-focus);
box-shadow: 0 0 0 3px var(--brand-100);
outline: none;
```

- **Search input**: same as above, with a leading 16px search icon at 12px left padding (input padding-left becomes 36px).
- **Labels**: `text-xs`, weight 500, uppercase, `letter-spacing: 0.04em`, `color: var(--text-tertiary)`, 6px gap below to input.
- **Placeholders**: `color: var(--text-tertiary)`. Use real placeholders, not labels-as-placeholders. Current screens overuse the latter (e.g. "Bränd", "Kategooria" sitting inside empty inputs with no actual label).

### 4.4 Status pill

Inspired by InvoicePortal's `● Needs Review` pill.

```
┌─────────────────────┐
│ ● Vajab ülevaatust  │
└─────────────────────┘
```

- Height: 24px. Padding: 4px 10px. Radius: full.
- 6px dot + label, gap 6px.
- Font: `text-xs`, weight 500.

Status palette:

| Status        | Dot color       | Background      | Text            |
|---------------|-----------------|-----------------|-----------------|
| Mustand       | `--text-tertiary` | `--bg-subtle`   | `--text-secondary` |
| Saadetud      | `--info-600`    | `--info-50`     | `--info-600`    |
| Vajab vaadet  | `--warning-600` | `--warning-50`  | `--warning-600` |
| Kinnitatud    | `--success-600` | `--success-50`  | `--success-600` |
| Tühistatud    | `--danger-600`  | `--danger-50`   | `--danger-600`  |

### 4.5 Tables

**The single most important component in this app.** Get this right and everything else follows.

```
┌────────────────────────────────────────────────────────────┐
│ NIMI ↑          KOOD       TÜÜP        HIND        TEGEVUS │  ← header
├────────────────────────────────────────────────────────────┤
│ Acme Corp.      #7         klient      —              ⋯    │
│ Beta Solutions  #8         klient      —              ⋯    │
└────────────────────────────────────────────────────────────┘
```

- **Header**: 40px tall, `bg: var(--bg-subtle)`, `text-xs`, uppercase, weight 600, tertiary color, `letter-spacing: 0.04em`. Sortable columns show ↑/↓ arrow with 4px gap; default state shows a faint ↕.
- **Row**: 48px tall, `text-sm`, separated by `border-bottom: 1px solid var(--border-subtle)`. Last row has no border.
- **Hover row**: `bg: var(--bg-subtle)`, cursor: pointer (if row is clickable).
- **Selected row**: `bg: var(--brand-50)`, 3px brand left border (matches sidebar active treatment).
- **Empty cells**: render `—` (em dash) in `var(--text-tertiary)`. Never blank.
- **Numeric columns**: right-aligned, tabular numerals.
- **Action column**: rightmost, fixed width 48px, `⋯` button visible on row hover (or always, if usability demands).
- **First column padding**: 24px (matches card padding). Other columns: 16px.
- **Checkbox column** (when bulk actions exist): 40px wide, leftmost.

**Empty state inside table** — see §4.7.

**ID badges** like `#7`, `#13` from the Kliendid screen: render as muted inline text, not as pill chips. `color: var(--text-tertiary)`, `font-size: 12px`, prefixed with thin space.

### 4.6 Side detail panel

Used in Tooted and Kliendid (and recommended for any list → detail flow).

```
┌─────────────┬──────────────────────────┐
│             │ Title              [×]   │
│  List/table │ ─────────────────────    │
│             │ ▾ Üldine                 │
│             │   Label                  │
│             │   Value                  │
│             │ ▾ Hinnastamine           │
│             │   ...                    │
│             │ ─────────────────────    │
│             │           [Sulge] [Muuda]│
└─────────────┴──────────────────────────┘
```

- **Width**: 400px. Slides in from the right; overlays content on screens <1280px.
- **Header**: 56px, title `text-md` weight 600, close `×` button right.
- **Sections**: collapsible, header `text-xs` uppercase weight 600, with chevron. Same treatment as field-group labels.
- **Field rows**: label above value, label `text-xs` tertiary uppercase, value `text-sm` primary. 12px vertical gap between fields.
- **Footer**: sticky bottom, `bg: var(--bg-surface)`, `border-top: 1px solid var(--border-subtle)`, primary action right.

### 4.7 Empty state

**Replace all current variations** ("No tasks", "No orders found", "No data", "Tegevusandmeid pole veel", "Ülesandeid pole", "Viga"). One pattern, in Estonian, always.

```
        [icon, 48px, tertiary color]

        Pakkumisi pole veel
        Loo esimene pakkumine, et alustada.

        [Primary CTA: Uus pakkumine]
```

- Vertically centered in container, 320px max-width.
- Icon: 48px, `color: var(--text-tertiary)`.
- Title: `text-md`, weight 600.
- Description: `text-sm`, secondary color, 4px gap below title.
- CTA: 16px gap below description. Optional — only if there's a clear primary action.

**Error state** (replaces the current red "Viga" on Pakkumised):

```
        [warning-triangle icon, danger-600]

        Pakkumiste laadimine ebaõnnestus
        Kontrolli ühendust ja proovi uuesti.

        [Secondary: Proovi uuesti]
```

### 4.8 Filter bar

Standard pattern above any list/table.

```
┌────────────────────────────────────────────────────────────┐
│ [🔍 Otsi…]              [Staatus ▾] [Kuupäev ▾]  [Filter] │
└────────────────────────────────────────────────────────────┘
```

- Search input takes flex-grow on the left.
- Filter dropdowns sit to the right, `Secondary` button styling, with a count chip when active (`Staatus · 2`).
- "Show drafts" / "Ainult laos" style toggles use a switch component, not a checkbox — easier scanning.
- Bar height: 56px, 16px vertical padding, lives inside the main card or directly under the page header.

### 4.9 Tabs

Used on the offer screen (Põhikonfiguratsioon, Konfiguratsioon 2) and could replace the segmented filter on Ülesanded.

```
┌────────────────────────────┐
│ Põhikonfiguratsioon ●4  +  │
└────────────────────────────┘
       ━━━━━━━━━━━━
```

- Underline style, not pill style.
- Active tab: `color: var(--text-primary)`, weight 600, 2px brand underline.
- Inactive: `color: var(--text-secondary)`, no underline.
- Count badge: 18px circle, `bg: var(--brand-50)`, `color: var(--brand-600)`, weight 600, 4px gap right of label.
- "+" button for adding tabs: ghost, 32px square, last in the tab strip.

### 4.10 Toolbar (action group above content)

Inspired by the InvoicePortal "Row Matching / Order Proposal / …" row.

```
┌──────────────────────────────────────────────────────────┐
│ [icon] Vali klient   [icon] Tähtaeg   [icon] Maksetingim │
└──────────────────────────────────────────────────────────┘
```

- Outlined buttons (`Secondary` variant), 36px tall.
- 12px gap between buttons.
- Icon + label, where the label may include the current value (`Tähtaeg: 30.04.2026` or `Tähtaeg: määramata`).
- Lives directly under the page header on detail screens (offer screen uses this heavily — see screen-specific spec).

### 4.11 Number / metric block

Used on dashboard and totals.

```
0,0h
SEE NÄDAL
```

- Number: `text-2xl`, weight 700.
- Label below: `text-xs`, uppercase, weight 500, tertiary, `letter-spacing: 0.04em`.
- Use **comma decimal separators** (Estonian convention): `224,00 €`, not `224.00`. **Currency symbol after the number**, with non-breaking space.

---

## 5. Localization & copy rules

1. **All UI strings in Estonian.** No exceptions. Replace today's English fragments:
   - "Tasks" → "Ülesanded"
   - "Pending / In Progress / Completed" → "Ootel / Töös / Valmis"
   - "All statuses" → "Kõik staatused"
   - "No orders found" → "Tellimusi pole"
   - "No tasks" → "Ülesandeid pole"
   - "No data" → "Andmed puuduvad"
   - "Mon/Tue/Wed/…" → "E / T / K / N / R / L / P"
   - "Draft" → "Mustand"
   - "Browse" → "Sirvi"
   - "Unsaved" → "Salvestamata"
   - "Üksikasjad" — keep, but ensure consistent casing.
2. **Numbers**: Estonian formatting — `1 234,56 €`, dates `26.04.2026`, times `14:30`.
3. **Sentence case**, not Title Case, for buttons and headings: "Uus pakkumine", not "Uus Pakkumine".
4. **Error messages** are full sentences with a period and propose a next step. "Viga" alone is not acceptable.

---

## 6. Accessibility baseline

- Contrast: all text ≥ WCAG AA (4.5:1 for body, 3:1 for ≥18px).
- Focus: visible focus ring (`box-shadow: 0 0 0 3px var(--brand-100)`) on every interactive element. Never `outline: none` without a replacement.
- Keyboard: tab order matches visual order. `Esc` closes panels and modals.
- Hit targets: ≥ 32×32 px. Icon-only buttons need accessible labels (`aria-label`).
- Status is never conveyed by color alone — pills always have a label.

---

## 7. Cross-screen consistency checklist

When building or reviewing any screen, verify:

- [ ] Page header matches §3.3 structure exactly.
- [ ] Primary action lives in the page header, top-right.
- [ ] Search + filters use the §4.8 bar pattern.
- [ ] Tables follow §4.5 (header style, row height, em-dash empties, tabular numerals).
- [ ] Empty state uses §4.7, in Estonian, with optional CTA.
- [ ] All strings in Estonian, all numbers in Estonian format.
- [ ] No floating email pill in top-right — moved to sidebar bottom.
- [ ] Spacing uses tokens from §2.3.
- [ ] Status uses pill component from §4.4.
