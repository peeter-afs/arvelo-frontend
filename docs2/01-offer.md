# Pakkumine (Offer detail) — Screen spec

> **This is the most critical screen.** It's where users spend the most time and where the current layout wastes the most space. Read alongside `00-design-system.md`.

References: image 9 (current state).

---

## 1. Problems with the current layout

1. **Left "Offer details" sidebar duplicates the header strip.** Customer, dates, payment terms, status, VAT rate appear in both places. Same data, two locations, inconsistent style.
2. **Notes & terms is buried** under a long stack of read-only summary fields.
3. **Configuration tabs don't communicate hierarchy.** "Põhikonfiguratsioon (4)" looks like a generic tab; the user needs to grasp that this is one of several sellable configurations of the same offer.
4. **Line items are visually heavy and low-density.** Each item takes ~80px of vertical space for what is essentially a name, qty, price. A 4-item config fills the visible viewport.
5. **Mixed languages.** "Klient valimata", "Offer date", "Valid until", "Payment terms" coexist.
6. **Toolbar buttons fight for attention.** "Salvesta" (disabled), "Sulge", "Saada pakkumine", "Toimingud", "Unsaved" indicator, total — six elements in the top-right.
7. **Total is shown inside a dark card** that visually competes with the content. Contrast is wrong direction — the total should be calm, not loud.
8. **"Ungrouped / By Type / By Machine" toggle** position implies it's a filter on the visible list, but it actually changes the grouping algorithm. Not labeled clearly.

---

## 2. New layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Pakkumised                                                            │  ← breadcrumb
│                                                                         │
│ Uus pakkumine  ● Mustand                       [Sulge] [Salvesta] [⋯]   │  ← title row
│ #1043 · loodud 26.04.2026                              [Saada pakkumine]│
├─────────────────────────────────────────────────────────────────────────┤
│ Toolbar                                                                 │
│ [👤 Klient: määramata] [📅 Tähtaeg: —] [📅 Kehtib kuni: —]              │
│ [💳 Maksetingimused: —] [% KM: 20%]                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─ Konfiguratsioonid ─────────────────────────────────────────────┐    │
│ │  Põhikonfiguratsioon ●4   Konfiguratsioon 2 ●1   +              │    │
│ │ ━━━━━━━━━━━━━━━━━━━                                              │    │
│ ├─────────────────────────────────────────────────────────────────┤    │
│ │ [🔍 Lisa toode — nimi või kood]              [Sirvi]             │    │
│ │                                                                  │    │
│ │ Grupeering: [Ei grupeeri] [Tüübi järgi*] [Masina järgi]  [Kopeeri]│   │
│ │                                                                  │    │
│ │ ▾ Masinad · 4 toodet                          Vahesumma 0,00 €  │    │
│ │ ┌──────────────────────────────────────────────────────────────┐│    │
│ │ │ NIMI         KOOD     KOGUS  HIND      KOKKU   TÜÜP      ⋯  ││    │
│ │ ├──────────────────────────────────────────────────────────────┤│    │
│ │ │ Toode 1      —        1      0,00 €    0,00 €  Masin     ⋯  ││    │
│ │ │   ▸ Üksikasjad                                              ││    │
│ │ │ Toode 2      —        1      0,00 €    0,00 €  Masin     ⋯  ││    │
│ │ │ ...                                                         ││    │
│ │ └──────────────────────────────────────────────────────────────┘│    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│ ┌─ Märkused ja tingimused ────────────────────────────────────────┐    │
│ │ [textarea, expandable]                                          │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│ ┌─ Kokkuvõte ─────────────────────────────────────────────────────┐    │
│ │                                                                  │    │
│ │   Toodete arv          4                                         │    │
│ │   Vahesumma         224,00 €                                     │    │
│ │   KM (20%)           44,80 €                                     │    │
│ │   ─────────────────────────                                      │    │
│ │   Kokku             268,80 €                                     │    │
│ └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

The left "Offer details" sidebar is **gone**. All of its data either moves into the toolbar (top), the side detail panel (right, on demand), or the summary card (bottom).

---

## 3. Section-by-section spec

### 3.1 Page header

Follows `00-design-system.md §3.3` exactly.

- **Breadcrumb row** (16px tall): `← Pakkumised` link, ghost button styling. Click returns to list.
- **Title**: offer name (`text-xl`, weight 600). Falls back to "Uus pakkumine" for new offers.
- **Status pill** (`§4.4`): inline next to title, vertical-center aligned. Mustand / Saadetud / Kinnitatud / Tühistatud.
- **Subtitle**: `#1043 · loodud 26.04.2026 · viimati muudetud 26.04.2026 14:23`. Tertiary text. Hide ID for unsaved offers.
- **Action cluster** (right):
  - Secondary: **Sulge** (close without saving — confirms if unsaved).
  - Secondary: **Salvesta** (disabled when nothing changed).
  - Primary: **Saada pakkumine** (only enabled when offer has a customer + ≥1 line + valid totals).
  - Ghost icon: **⋯** opens `Toimingud` menu (Duplicate, Convert to order, Export PDF, Delete).
- **Unsaved indicator**: replaces the current "● Unsaved" pill. When dirty, the **Salvesta** button gets a small dot prefix and a tooltip "Salvestamata muudatused". No separate floating pill.

### 3.2 Toolbar

The single most impactful change. Replaces the entire left sidebar.

Inspired by InvoicePortal's "Row Matching / Order Proposal / …" row — but each chip here is **a property of the offer**, clickable to edit inline.

```
[👤 Klient: Acme Corporation]   [📅 Tähtaeg: 30.04.2026]   [📅 Kehtib kuni: 30.05.2026]
[💳 Maksetingimused: 14 päeva]  [% KM: 20%]
```

- Each chip is a `Secondary` button (§4.2), 36px tall.
- Format: `[icon] Label: value`. Label is tertiary text, value is primary text, both inside the same button.
- **Empty values** show "määramata" (Estonian for "not set") in tertiary text.
- Click → opens an inline popover with the relevant input (combobox for customer, date picker for dates, etc.).
- **Customer chip** is special: when a customer is selected, click expands a tooltip with email, phone, address — same data the current right-side detail panel shows on Kliendid screen. "Vaheta" link in the popover to change customer.
- Wraps to a second line on narrow screens; never truncates a value.

### 3.3 Configurations card

The biggest functional area. Lives in its own card.

#### 3.3.1 Tab strip

- Underline-style tabs (§4.9).
- Each tab: `[Configuration name] ●[item count]`.
- Long names truncate with ellipsis at 200px max-width, full name in tooltip.
- **Right-click on a tab** opens: Rename, Duplicate, Delete (cannot delete the last one).
- **+** button at end of strip adds a new configuration, focuses the rename input.
- Optionally: drag-to-reorder.

#### 3.3.2 Add product row

```
┌──────────────────────────────────────────────────────────┐
│ 🔍 Lisa toode — nimi või kood…                  [Sirvi] │
└──────────────────────────────────────────────────────────┘
```

- Full-width search input (§4.3) with leading icon.
- **Sirvi** button on the right (renamed from "Browse"): opens a modal product picker.
- Typing fires an autocomplete dropdown showing top 8 matches with name, code, price.
- Enter on a match adds it as a line; Tab moves to qty.

#### 3.3.3 Grouping toggle

```
Grupeering:  [Ei grupeeri] [Tüübi järgi*] [Masina järgi]              [Kopeeri]
```

- Segmented control, not three separate buttons. 32px tall, `bg: var(--bg-subtle)`, active segment `bg: var(--bg-surface)` with subtle shadow.
- Estonian labels: **Ei grupeeri** / **Tüübi järgi** / **Masina järgi**.
- A small label "Grupeering:" sits to the left of the segmented control to remove ambiguity about what it does.
- **Kopeeri** moves to the far right — it copies all lines from the current configuration into the next one. Ghost button.

#### 3.3.4 Group section

For each group (e.g. "Masinad"):

```
▾ Masinad · 4 toodet                                  Vahesumma  0,00 €
```

- 40px tall row, `bg: var(--bg-subtle)`, weight 600.
- Click chevron to collapse the group.
- Subtotal right-aligned, tabular numerals.
- Spans the full width of the lines table below.

#### 3.3.5 Line items table

This is the biggest density improvement. Replace the current ~80px-tall card-per-line with a real table:

| Column     | Width   | Align  | Editable | Notes                              |
|------------|---------|--------|----------|------------------------------------|
| Nimi       | flex    | left   | yes      | Click to rename. Bold weight 500.  |
| Kood       | 120px   | left   | yes      | Tertiary if empty (`—`)            |
| Tüüp       | 100px   | left   | dropdown | Masin / Üksikasi / Teenus          |
| Kogus      | 80px    | right  | yes      | Numeric input, step 1              |
| Hind       | 120px   | right  | yes      | Currency input                     |
| Kokku      | 120px   | right  | computed | Bold, primary text                 |
| ⋯          | 48px    | center | —        | Action menu (delete, duplicate)    |

- Row height: 44px (slightly tighter than the standard 48px, since this is a high-density edit grid).
- **Üksikasjad** (sub-items / accessories): expand inline as nested rows under the parent, indented 24px, with a thin left border in `--border-subtle`. The current chevron `▸ Üksikasjad` becomes a column-1 icon on the parent row that toggles expansion.
- Inline editing: cell becomes an input on click; saves on blur or Enter.
- **Drag handle** on the leftmost edge of each row (visible on row hover) for reordering.

### 3.4 Märkused ja tingimused (Notes & terms)

- Own card, below configurations.
- Single textarea, auto-grows from 80px to 320px max.
- Placeholder: "Lisa märkused, tarnetingimused või muu info…".

### 3.5 Kokkuvõte (Summary) card

Replaces the dark "TOTAL EXCL. VAT" pill in the current header.

```
Toodete arv                4
Vahesumma            224,00 €
KM (20%)              44,80 €
─────────────────────────────
Kokku                268,80 €
```

- Right-aligned label/value pairs, label tertiary, value primary, tabular numerals.
- Subtotal divider: `border-top: 1px solid var(--border-subtle)`, 8px vertical padding before the total.
- Total row: `text-lg`, weight 700.
- Card width: 360px, right-aligned within the page (`margin-left: auto`).
- **Multi-config behavior**: when more than one configuration exists, the summary shows only the **active** configuration's totals, with a small note: "Näitab konfiguratsiooni: Põhikonfiguratsioon" with a link "Vaata kõiki" that expands to show per-config breakdown.

### 3.6 What happens to the old left sidebar?

| Old field             | New location                                                |
|-----------------------|-------------------------------------------------------------|
| Customer              | Toolbar chip (§3.2)                                         |
| Offer date            | Toolbar chip ("Tähtaeg")                                    |
| Valid until           | Toolbar chip ("Kehtib kuni")                                |
| Payment terms         | Toolbar chip                                                |
| VAT rate              | Toolbar chip                                                |
| Status (Mustand)      | Pill next to title (§3.1)                                   |
| Notes & terms         | Own card (§3.4)                                             |
| Total excl. VAT       | Summary card (§3.5)                                         |
| Items / Bundled count | Summary card "Toodete arv" line                             |

The detail panel pattern (§4.6 in design system) is kept available — clicking the customer chip can optionally open the right-side panel with full customer info, but it's no longer permanently mounted.

---

## 4. Interactions & states

### 4.1 New offer (no data)

- Header title shows "Uus pakkumine" placeholder (italic, tertiary). Click to rename inline.
- Toolbar chips all show "määramata".
- Configurations: one default tab "Põhikonfiguratsioon (0)".
- Empty line items area shows §4.7 empty state: icon + "Pakkumine on tühi" + "Otsi või sirvi tooteid, et lisada esimene rida."
- Summary card shows zeros.
- **Saada pakkumine** disabled with tooltip: "Vali klient ja lisa vähemalt üks toode."

### 4.2 Validation

When the user clicks **Saada pakkumine** with errors, scroll to the first invalid field and show inline error text below the relevant chip/input. Don't use a modal alert.

Errors:

- No customer: highlight customer chip with `border: 1px solid var(--danger-600)`, tooltip "Klient on nõutav".
- No items: highlight the configurations card border similarly.
- Item with qty 0 or price empty: highlight the row.

### 4.3 Saving state

- Auto-save draft every 10 seconds while dirty (background, no toast).
- **Salvesta** button: idle / loading (spinner replaces icon, label "Salvestab…") / saved (brief check icon for 1.5s, label "Salvestatud").
- On save error: toast at bottom-right with retry action.

### 4.4 Send offer flow

- Click **Saada pakkumine** → modal with: recipient (pre-filled from customer email), CC, subject (pre-filled "Pakkumine #1043"), message body (template), "Manusta PDF" toggle (on by default).
- After send: status pill changes to "Saadetud", Saada button changes to "Saada uuesti", a new "Saadetud {date}" line appears in the page header subtitle.

### 4.5 Multi-configuration

- Each tab is independent: own line items, own subtotal.
- Customer / dates / terms are shared at the offer level (toolbar).
- When converting to order, user picks which configuration to convert — a modal lists all configs with their totals and a radio selection.

---

## 5. Responsive behavior

- **≥ 1280px**: layout as drawn.
- **1024–1279px**: toolbar wraps to two rows. Summary card moves below the configurations card, full-width.
- **< 1024px**: stacked single column. Toolbar chips become a vertical list inside a collapsible "Pakkumise andmed" card. Tables become horizontally scrollable, with sticky first column (Nimi).

---

## 6. Component checklist for this screen

- [ ] Header (§3.3 of system) — title + status pill + subtitle + actions
- [ ] Toolbar chip (new pattern, see §3.2 of this doc)
- [ ] Tabs (§4.9 of system)
- [ ] Search input with autocomplete (§4.3 of system, plus dropdown)
- [ ] Segmented control (Grupeering)
- [ ] Group section header (new, see §3.3.4 of this doc)
- [ ] Editable table row (§4.5 of system, plus inline edit)
- [ ] Summary card (new, see §3.5 of this doc)
- [ ] Empty state (§4.7 of system)

---

## 7. Open questions

1. **Configuration semantics**: are configurations alternative offers (customer picks one) or additive (all are sold together)? UI implies additive (totals roll up?), but the per-config subtotal suggests alternative. **Confirm before final implementation.**
2. **VAT per line vs per offer**: currently shown as offer-level. Are line-level overrides needed?
3. **"Bundled 0" counter** in current header — what does this represent? Sub-items? Combined products? Need clarification before deciding whether to surface it in the new summary.
4. **Üksikasjad** — sub-items, accessories, or component lines? Affects whether the indented expansion or a side modal is the right pattern.
