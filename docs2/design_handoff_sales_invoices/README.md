# Handoff: Sales invoices (Müügiarved) — dense list + detail panel

## Overview
A redesign of the sales-invoice workspace in Arvelo (Estonian accounting app). The screen replaces a
tall KPI-card header with a two-row header, adds a date-range constraint, and pairs a resizable
invoice list with a right-hand detail panel plus a full-width single-invoice view.

Goals the design solves:
- header consumed too much vertical space; invoice details were not all visible at once
- no date-range filter existed
- the table had unused horizontal space; users want to size columns themselves
- the detail panel must not duplicate what the list row already shows

UI language is **Estonian**. All copy in the prototype is final — reuse it verbatim.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show intended
look and behaviour. They are not production code to copy. The task is to **recreate these designs in
the target codebase's existing environment** (this project is Next.js + React + TypeScript with
`next-intl`; see `app/(dashboard)/invoices/`) using its established components, styling approach and
i18n. If no environment exists yet, pick the most appropriate framework and implement there.

The prototype's data generator, `localStorage` keys and inline event handlers are scaffolding for the
mock only — replace with real data, app state and the codebase's component library.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, density and interaction behaviour. Recreate
pixel-accurately with the codebase's primitives. Every measurement below is taken from the prototype
CSS; where the codebase has an equivalent token, prefer the token.

## Screens / Views

### 1. Invoice workspace (default view)

**Purpose.** Scan, filter and triage sales invoices; review one invoice in the side panel without
leaving the list; act on it (confirm, send reminder, credit).

**Layout.** Full-viewport, non-scrolling shell:
`.shell{height:100vh;min-width:1240px;padding:12px 16px;display:flex;flex-direction:column;gap:9px}`
The page scrolls horizontally below 1240px (`body{overflow-x:auto}`) rather than stacking columns —
the detail panel must always stay to the right of the list.

Rows, top to bottom:
1. **Title row** (`height:29px`) — `h1` "Müügiarved" 17px/700, letter-spacing −0.03em; a 12px
   `--text-3` subline "04.06.2026 – 02.09.2026 · 21 arvet"; then metrics (right-aligned via
   `margin-left:auto`); then actions.
2. **Filter row** (`height:36px`) — quick-filter tabs, period picker, VAT-code picker, search.
3. **Body** — CSS grid `minmax(0,1fr) 9px var(--pw,430px)`, i.e. list, drag gutter, detail panel.

**Metrics** (title row, right). Inline stat pairs separated by `1px solid var(--border)` left borders,
`padding:0 12px`: label 9.5px/700 uppercase letter-spacing .1em `--text-3`; value 14.5px/700
letter-spacing −0.03em. Three metrics: `Laekumata` (sum of open balances of confirmed invoices),
`Üle tähtaja` (sum of overdue open balances, value in `--neg`), `Keskm. viivitus` (mean overdue days,
e.g. "68p"). `Keskm. viivitus` hides below 1420px.

**Actions** (title row, far right). `Uus arve` (primary, plus icon, trailing `kbd` "U"),
`Värskenda` (ghost, refresh icon). There is deliberately **no "Uus kreeditarve" button** — credit
notes are created from an invoice via `Kreediteeri`.

**Quick-filter tabs.** Segmented control: container `.tabs{padding:3px;background:var(--surface-2);
border:1px solid var(--border);border-radius:9px;gap:3px}`; tab `height:26px;padding:0 10px;
border-radius:7px;font-size:12.5px;font-weight:600`; active tab `background:var(--surface)` +
`box-shadow:0 1px 2px rgba(0,0,0,.07)`. Each tab carries a count pill (10.5px/700, `background:
var(--border)`; on the active tab `background:var(--accent);color:#fff`). Pills hide below 1300px.

Visible tabs: `Kõik`, `Mustand`, `Saatmata`, `Tasumata`, `Üle tähtaja`.
A trailing `···` button opens a 186px menu with `Saadetud`, `Makstud`, `Tühistatud`; when one of
those is active, the `···` button shows that label plus its count.

Filter predicates (period + search always apply on top):
- `Kõik` — everything
- `Mustand` — `status === 'draft'`
- `Saatmata` — not cancelled and e-invoice not delivered (`!eInvoiceSent`), drafts included
- `Tasumata` — confirmed (not draft/cancelled) and `openBalance > 0`
- `Üle tähtaja` — `status === 'overdue'`
- `Saadetud` / `Makstud` / `Tühistatud` — `status === 'sent' | 'paid' | 'void'`

**Period picker.** Button `.perbtn` (29px, 8px radius); when a non-default period is active it turns
`border-color:var(--accent);background:var(--accent-soft-2);color:#b8330f;font-weight:600`. Opens a
294px popover: section label "Arve kuupäev", 2-column preset grid — `Käesolev kuu`, `Eelmine kuu`,
`Käesolev kvartal`, `Viimased 90 päeva` (default), `Käesolev aasta`, `Kõik ajad` — then
"Kohandatud vahemik" with two `pp.kk.aaaa` text inputs, then a hint showing the resolved range and
`Eemalda` / `Rakenda`. Filters on **invoice date** (`issued`). Tabs, metrics, VAT counts, subline
and footer totals all recompute against the selected period.

**VAT-code picker.** Same `.perbtn` pattern, label `KM: kõik` / `KM: 24%` etc. Menu (224px) lists
`Kõik käibemaksukoodid` plus the defined codes with counts:

| key | label | short | rate |
|-----|-------|-------|------|
| `d24` | Siseriiklik 24% | 24% | 24 |
| `d9` | Siseriiklik 9% | 9% | 9 |
| `eug` | EU kauba müük 0% | EU kaup | 0 |
| `eus` | EU teenus 0% (pöördmaks) | EU teenus | 0 |
| `exp` | Eksport 0% | Eksport | 0 |
| `ex` | Maksuvaba käive | Maksuvaba | 0 |

Counts respect the active period and quick filter. In production these codes come from the app's VAT
configuration; the rate drives the invoice's VAT amount (0-rated codes produce `vat = 0`,
`total = net`).

**Search.** 190px fixed-width input (29px, 8px radius, 27px left padding for the icon), placeholder
"Otsi arvet või klienti  /". `/` focuses it from anywhere. Matches invoice number or customer name.

**List card.** `.card` (white, `1px solid var(--border)`, `border-radius:11px`,
`box-shadow:0 1px 2px rgba(0,0,0,.03)`), column flex, four bands:

1. **List header** (33px): "N arvet nähtaval" (count in 600 weight) and a ghost `Veerud` button whose
   210px menu holds one checkbox per hideable column plus `Lähtesta laiused`.
2. **Draft warning strip** (31px, only when the period contains drafts):
   `background:var(--warn-soft);border-bottom:1px solid #e8dcbc;color:#7d5a13`, file icon, text
   "**N** kinnitamata mustandit summas X € — need ei ole pearaamatus", right-aligned primary
   `Kinnita mustandid`.
3. **Table** — see below.
4. **Footer** (30px, `border-top`, 11.5px `--text-3`, single line always): left "Sorteeritud: klient ↓"
   (truncates with ellipsis under pressure); right `Summa kokku <b>19 146,12 €</b>` — dotted-underline,
   `cursor:help`, `title="Käibemaksuta 16 552,82 € · KM 2593,30 €"` — then `Tasumata kokku <b>…</b>`, then
   the export split button.

**Export split button** (footer right). `Ekspordi Excel` (default action) joined to a caret button;
caret opens a 168px menu upward: `Excel (.xlsx)`, `CSV (.csv)`, `PDF`.

**Table.** CSS-grid rows; the grid template is a runtime custom property `--cols` so header and rows
stay aligned. Header `.thead` 32px, `background:var(--surface-2)`, labels 9.5px/700 uppercase
letter-spacing .09em `--text-3`, `border-radius:11px 11px 0 0`. Rows: `padding:6px 0`,
`border-bottom:1px solid #f1eee7`, 12.5px; zebra `--row-alt` on even rows; hover `--accent-soft-2`;
selected `background:var(--accent-soft)` + `box-shadow:inset 2px 0 0 var(--accent)`. Header and body
share one horizontal scroll container (`.tscroll`, `min-width:fit-content` on children).

Columns (default widths; `Klient` is the flexible one, `minmax(96px,1fr)`):

| id | label | width | align | content |
|----|-------|-------|-------|---------|
| `idx` | — | 30px (locked, not hideable/resizable) | right | row ordinal, 10.5px `#c3bfb2` |
| `nr` | Arve | 62px | left | invoice number, `--accent`, 500 |
| `cust` | Klient | flex | left | 20px 5px-radius avatar with 2 initials (`background:oklch(0.92 0.045 H)`, `color:oklch(0.36 0.09 H)`, H hashed from the name) + name (600, ellipsis) + second line 10.5px `--text-3` "Reg 14582301 · 2 rida · 7p" |
| `total` | Summa | 92px | right | invoice total, 600 |
| `open` | Tasumata | 88px | right | open balance; `—` in `--text-3` weight 500 when 0 |
| `issued` | Väljastatud | 92px | left | `pp.kk.aaaa`, 11.5px `--text-2` |
| `due` | Tähtaeg | 124px | left | due date + delta: overdue `+75p` in `--neg`, otherwise days remaining in `--text-3` |
| `st` | Staatus | 118px | left | status tag |

**Status tags.** 9.5px/700 uppercase letter-spacing .06em, `padding:2px 6px`, `border-radius:5px`,
5px leading dot in `currentColor`:

| status | label | background / colour |
|--------|-------|---------------------|
| `draft` | Mustand | `--surface-2` / `--text-3` |
| `sent` | Saadetud | `#eaf0ff` / `#2c5cf6` |
| `paid` | Makstud | `--pos-soft` / `--pos` |
| `overdue` | Üle tähtaja | `--neg-soft` / `--neg` |
| `void` | Tühistatud | `--surface-2` / `--text-3`, line-through |

Wording note: the overdue label is **"Üle tähtaja"** everywhere — list tag, quick filter, metric and
detail panel — deliberately unified.

**Column sizing (user-controlled).** Clicking a header sorts (toggles direction, arrow shown in
`--accent`). A 7px grip on each header's right edge drags the column width (min 56px; an accent hair
line shows while dragging); double-clicking the grip resets that column; the `Veerud` menu hides
columns and resets all widths. Widths persist in `localStorage['arvelo.inv.cols']`, hidden columns in
`arvelo.inv.hidden`. This is an *enhancement* — defaults must already be right.

### 2. Detail panel (right column, resizable)

**Purpose.** Review the selected invoice without leaving the list; it shows what the row does **not**
— the invoice lines and the accounting context. It deliberately omits totals, dates and payment terms
that the list already displays.

**Resizing.** A 9px gutter between list and panel drags the panel width (`--pw`, default 430px,
min 410px, max `shellWidth − 9 − 560` so the table keeps ≥560px). Double-click resets to 430px. The
width persists in `localStorage['arvelo.inv.pw']`; window resizes clamp the applied value but must
**not** overwrite the stored one. Clamp against the shell width (min 1240px), not the window.

**Header** (`background:var(--surface-2)`, two stacked rows, 10px/13px padding):
- row 1: `h2` "25930 · Milworks OÜ" 15px/700; meta line 11.5px `--text-3` "2593000250 · PR-2026-1400 · 3 rida",
  where the journal number is a link
- row 2 (right-aligned): status tag, `↑`, `↓`, `⇱ Laienda` / `⇲ Kitsenda`, `Ava →`

**Body.** Only the lines block grows; everything below stays visible.
1. **Invoice lines** — bordered 8px-radius block; header row 9px/700 uppercase on `--surface-2`;
   grid `minmax(0,1fr) 40px 62px 74px` = Kirjeldus, Kogus, Hind, Summa (KM and Ale columns appear only
   in the expanded panel: `minmax(0,1fr) 44px 66px 52px 46px 76px`). The list body scrolls internally.
   `Hind` shows the **list price**; when a line has a discount the `Summa` cell is `#b8330f`, dotted
   underline, `cursor:help`, `title="Allahindlus 15% · nimihind 395,67 € · soodustus −59,35 €"`.
   Footer strip on `--row-alt`: `Neto … · KM … · Kokku …`.
2. **Andmed** — key/value rows (`.kv`: label `--text-2` left, value right, 1px dashed `#ece8dd`
   separator): Makseviide, Registrikood, Maksetingimus, Valuuta, E-arve, KM kood, Viivis. Truncatable
   values carry a `title`.
3. **Klient** (+ `Kliendikaart` link) — Registrikood, E-post, Avatud saldo, Krediidilimiit,
   Laekumisaeg.
4. **Ajajoon** — one row per event: date (11px `--text-3`), 7px bullet (`--pos` when done, else
   `--border-strong`), label. Events: invoice created; sent as e-invoice; payment received (amount);
   overdue/reminder not sent; awaiting confirmation (drafts).

**Action bar** (bottom, pinned, `background:rgba(255,255,255,.96)`, single line, no wrap):
`Kinnita ja saada` (drafts) / `Ava arve` as primary; `Saada meeldetuletus` **only when overdue**;
right-aligned ghost `Kreediteeri` and `···`.

**Expand.** `Laienda` hides the list column (`.body.wide`) and gives the panel the full width; the
same button then reads `Kitsenda`.

### 3. Full invoice view

**Purpose.** The lines are the subject: full-width review with per-line accounting detail, the journal
entry, and metadata in a fixed right rail.

Opens on double-click of a row, `Enter`, or `Ava →`. Replaces the body and hides the filter row.
Closes with `Esc`, `Sulge`, or the breadcrumb `← Müügiarved`. `↑`/`↓` move through the same filtered
list without leaving the view.

**Header.** Breadcrumb (`← Müügiarved / 25930`), `h2` "25930 · Milworks OÜ", meta line
"01.09.2026 → 08.09.2026 · 7 päeva · viide 2593000250 · PR-2026-1400"; right: status tag, `↑`, `↓`, `Sulge`.

**Split.** `minmax(0,1fr) 330px`.

Left column:
- line table, grid `minmax(0,1fr) 54px 74px 118px 52px 82px 82px` = Kirjeldus (with a 10.5px
  `--text-3` sub-line "Konto 3110 · tk"), Kogus, Hind, Allahindlus (`−15% · −59,35 €` in `#b8330f`,
  else `—`), KM, Neto, Kokku; sticky 9.5px header; zebra rows
- totals strip: `Neto … · Käibemaks 24% … · Kokku …`
- **Konteering** — debit/credit table (`60px minmax(0,1fr) 90px 90px`): 1210 Nõuded ostjate vastu /
  3110 Müügitulu / 2130 Käibemaksukohustus. Drafts show "Kanne tekib arve kinnitamisel".

Right rail (`--row-alt` background): **Maksmine** (open balance 22px/700, share + paid amount, 4px
progress bar in `--pos`, due date, days over/until, interest), **Klient**, **Ajajoon**, **Manused**
(`arve_25930.pdf`, `e-arve XML`).

**Action bar.** `Kinnita ja saada` / `Saada uuesti` (primary), `Muuda`, `Registreeri laekumine`;
right: `Kreediteeri`, `Prindi`, `···`.

### 4. Journal-entry modal ("Arvega seotud kanded")

Opened from the journal (PR-…) link in the panel header or the full view's Konteering block.
Overlay `rgba(20,18,14,.34)`, centred box `width:min(660px,100%)`, `max-height:86vh`, 12px radius,
`box-shadow:0 22px 60px rgba(0,0,0,.24)`.

- header: `h3` "Arvega seotud kanded", meta "Arve 25899 · MB Star OÜ · 2 kannet", `Sulge`
- per entry: a group strip (`--row-alt`) with document number, date, description and an
  `Ava päevaraamatus` link; then a 4-column table `60px minmax(0,1fr) 104px 104px`
  (Konto, Nimetus, Deebet, Kreedit) and a bold totals row
- entries: the sales entry (1210 / 3110 / 2130) and, when money has been received, the receipt entry
  (1010 Pangakonto / 1210 Nõuded ostjate vastu)
- footer: "Kanded on tasakaalus", `Sulge`, primary `Ava pearaamatus →`

Closes on `Esc`, `Sulge`, or backdrop click. Drafts have no link (no journal entry).

## Interactions & Behavior
- **Selection** — single click selects a row and renders the panel; `j`/`k` move the selection and
  keep it in view; `↑`/`↓` in the panel header do the same.
- **Open** — double-click, `Enter`, or `Ava →` opens the full view; `Enter` toggles back.
- **Sorting** — click a header; second click reverses. Default: invoice number descending.
- **Column resize** — drag the header grip (min 56px), double-click resets, persisted.
- **Panel resize** — drag the gutter (410px … shell − 569px), double-click resets to 430px, persisted;
  gutter hairline is `--border-strong` on hover, `--accent` while dragging, and the body takes
  `cursor:col-resize;user-select:none` during the drag.
- **Menus** — period, columns, `···` filters, VAT codes and export all close on outside click; only
  one needs to be open at a time.
- **Keyboard** — `/` focus search, `j`/`k` prev/next, `Enter` open/close, `Esc` closes modal, then
  full view.
- **Hover disclosures** — discounted line amounts, `Summa kokku` (VAT-free breakdown), truncated
  reference/registry/e-mail/timeline values.
- **Conditional UI** — draft warning strip only with drafts in range; `Saada meeldetuletus` only when
  overdue; journal link only when a journal entry exists; `Ale`/`KM` line columns only in the
  expanded panel and full view.
- **Transitions** — only the gutter hairline (`background .12s`). No entrance animation anywhere.
- **Responsive** — desktop-only: the shell keeps `min-width:1240px` and the page scrolls horizontally;
  columns never stack. Progressive hiding: `Keskm. viivitus` <1420px, tab count pills <1300px.
- **Empty state** — "Selles vahemikus arveid pole" centred in the rows area, 12.5px `--text-3`;
  the panel shows "Vali arve" when nothing is selected.

## State Management
Client state:
- `tab` — quick filter key (`all | draft | unsent | unpaid | overdue | sent | paid | void`)
- `q` — search string
- `sort`, `dir` — column id + 1/−1
- `sel` — selected invoice number
- `per` — period preset key or `custom`; `d1`, `d2` — custom range dates
- `vatc` — VAT-code key or `all`
- `mode` — `list | open` (full view)
- `wide` — panel expanded (list hidden)
- `pw` — panel width px (persisted, `arvelo.inv.pw`)
- `widths` — per-column widths (persisted, `arvelo.inv.cols`)
- `hidden` — hidden column ids (persisted, `arvelo.inv.hidden`)
- transient: which menu/popover is open; active drag (column or gutter)

Derived: filtered+sorted list (period ∧ tab ∧ VAT code ∧ search, then sort); tab and VAT counts;
metrics; footer totals (total / net / VAT / open balance).

Data needed per invoice: number, customer (name, registry code, e-mail, open balance, credit limit,
average days to pay), issue date, due date, payment terms, VAT code, net, VAT, total, paid, open
balance, status, days overdue, payment reference, journal document number, e-invoice delivered flag,
lines (description, account, quantity, list price, discount %, VAT rate, net, total), timeline events,
attachments. Journal entries are fetched per invoice for the modal.

## Design Tokens

Colours (`:root`):
`--bg:#f6f4ee` · `--surface:#fff` · `--surface-2:#f0ede5` · `--border:#e6e1d4` ·
`--border-strong:#d4cebe` · `--text:#0a0a0a` · `--text-2:#4a4946` · `--text-3:#8e8c84` ·
`--accent:#ff4e2c` (hover `#e8431f`, text-on-tint `#b8330f`) · `--accent-soft:#ffe7df` ·
`--accent-soft-2:#fff3ee` · `--pos:#0e7b5a` · `--pos-soft:#e2efe9` · `--warn:#b07d1f` ·
`--warn-soft:#f5ecd6` (border `#e8dcbc`, text `#7d5a13`) · `--neg:#c0392b` · `--neg-soft:#fbeaea` ·
`--row-alt:#faf8f3`. Row separators `#f1eee7`; dashed key/value separators `#ece8dd`;
sent tag `#eaf0ff` / `#2c5cf6`; ordinal `#c3bfb2`; scrollbar thumb `#dcd6c8`;
modal backdrop `rgba(20,18,14,.34)`. Customer avatars are generated:
`oklch(0.92 0.045 H)` background, `oklch(0.36 0.09 H)` text, H = hash(name) mod 360.

Typography: **Inter** (400/450/500/600/700/800) throughout; body 13px, letter-spacing −0.01em,
`-webkit-font-smoothing:antialiased`. Scale: 22px/700 (full-view open balance), 18px/700, 17px/700
(page title), 15px/700 (panel title, modal title), 14.5px/700 (metrics), 12.5px (table rows, tabs),
12px (fields, menus), 11.5px (dates, footers, timeline), 11px (hints), 10.5px (secondary row line,
count pills), 9.5px/700 uppercase letter-spacing .09–.11em (all small caps labels), 9px (line-table
header). Negative tracking on large text: −0.025em … −0.035em.
Numbers use a `.mono` class that is **Inter with `font-variant-numeric:tabular-nums`** — not a
monospaced face; the earlier mono font was dropped because its slashed zero clashed with the rest of
the UI. Amounts are formatted `et-EE` with two decimals and a **non-breaking space** before `€`.

Spacing: shell padding 12px 16px, gap 9px; card padding 10px 13px (panel sections), 14px (full view);
control gaps 6–10px; row padding 6px 0; cell padding 0 8px.

Radii: 11px cards, 12px modal, 9px segmented container, 8px buttons/inputs/line block, 7px menu items
and tabs, 5px status tags and avatars, 99px pills.

Elevation: cards `0 1px 2px rgba(0,0,0,.03)`; active tab `0 1px 2px rgba(0,0,0,.07)`;
popovers/menus `0 10px 28px rgba(0,0,0,.13)`; modal `0 22px 60px rgba(0,0,0,.24)`.

Control sizes: buttons 29px (small 25px), inputs 29px, tabs 26px, table header 32px, list header 33px,
warning strip 31px, footer 30px, gutter 9px, column grip 7px.

## Assets
None. Icons are inline 24×24 stroke SVGs (`stroke-width:1.8`, round caps/joins, `currentColor`):
plus, refresh, calendar, search, hamburger (columns), chevron-down, document. Replace with the
codebase's icon set — match the 1.8px stroke weight and 1em sizing. Fonts load from Google Fonts in
the prototype; use the app's own Inter setup. Avatar colours are computed, not assets.

## Files
- `Müügiarved - tihe vaade v2.html` — **the design to build.** Detail panel carries no duplicate
  summary band; includes resizable panel, VAT-code filter, footer totals, export split button,
  journal modal, discount hover.
- `Müügiarved - tihe vaade v1 (varasem).html` — earlier iteration that keeps a four-metric summary
  band at the top of the panel. Reference only; v2 supersedes it.

Existing code in the repository that this design replaces: `app/(dashboard)/invoices/page.tsx`.
Related patterns worth reusing: the bank module's dense review layout
(`Ulevaatus - tihe vaade.html`, `Import - tihe vaade.html`, `ReviewTab.tsx`, `BankWorkspace.tsx`) —
this screen was built to match its density, tokens and header rhythm.
