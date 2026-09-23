# Handoff: Sales invoice editor (Müügiarve muutmine)

## Overview
The editor for a single sales invoice in Arvelo. It opens from the sales-invoice list
(`Müügiarved - tihe vaade v2`, see `design_handoff_sales_invoices/`) with `Muuda`. The same screen is
used for new invoices and for editing drafts, including drafts imported from Futursoft.

Goals the design solves:
- the header was tall and repeated information: page title, client name and import source appeared twice
- every invoice line column had to stay visible on a 14" laptop (≥1180px wide) when the summary panel is closed
- optional fields (internal note, cost centre, project) should not take space until the user needs them
- billing address, delivery address and contact share one slot instead of three stacked fields
- totals, validation and the journal preview should be visible while editing lines

UI language is **Estonian**. All copy in the prototype is final — reuse it verbatim.

## About the Design Files
The files in this bundle are **design references created in HTML**. They are prototypes that show the
intended look and behaviour, not production code to copy. Recreate the design in the target codebase
(Next.js + React + TypeScript + `next-intl`; invoices live under `app/(dashboard)/invoices/`) with its
existing components, styling approach and i18n. The prototype's sample data, `localStorage` keys,
`toast()` stubs and inline handlers are scaffolding only. Replace them with real data, app state and
API calls.

## Fidelity
**High-fidelity.** Colours, typography, spacing, density and interactions are final. Every measurement
below comes from the prototype CSS. Where the codebase has an equivalent token, use the token.

## Layout
Full-viewport shell that does not scroll:
`.shell{height:100vh;min-width:1180px;padding:9px 14px 10px;display:flex;flex-direction:column;gap:7px}`
Below 1180px the page scrolls horizontally. Columns never stack.

Top to bottom:
1. **Top bar** (27px, one line)
2. **Body card**: CSS grid `minmax(0,1fr) 9px var(--pw,330px)`, i.e. editor, drag gutter, summary panel.
   With the panel closed (`.norail`) it is a single `minmax(0,1fr)` column.

### 1. Top bar
Left to right. Nothing is repeated elsewhere on the page.
- breadcrumb `← Müügiarved /` (11.5px, link `--text-2` 500) → returns to the list
- `h1` = **invoice number with series**, e.g. `MA-2026 25930` (14.5px/700, −0.025em, tabular). It updates
  live when the number changes. There is deliberately no "Muuda arvet" title and no client name here.
- status tag `MUSTAND` (`.tag.draft`)
- source tag `FUTURSOFTI IMPORT` (`.tag.info`, `#eaf0ff`/`#2c5cf6`) only for imported invoices;
  `title="Imporditud Futursoftist · tx 5851"`
- right-aligned actions (`margin-left:auto`, gap 6px):
  - save state as **plain text**, no pill: 6px dot + 11.5px text. Dirty: `--warn` dot, `#7d5a13`
    text "Salvestamata muudatused". Clean: `--pos` dot, `--text-3` text "Salvestatud 11:49".
  - `Loobu` ghost + `kbd Esc`
  - `Salvesta mustand` + `kbd ⌘S` (disabled when clean)
  - `Kinnita ja saada` primary
  - panel toggle, ghost, split-panel icon + label `Peida kokkuvõte` / `Näita kokkuvõtet`. **The label
    hides at ≤1440px** and only the icon stays. At ≤1440px the shell padding also becomes `8px 10px`
    and the top-bar gap 7px.

Status-dependent (proposal, not built): once an invoice is confirmed, the status tag becomes
`SAADETUD`/`MAKSTUD` and the actions switch accordingly (e.g. `Kreediteeri`).

### 2. Editor (left column)
Background `#f9f7f1`. Two sections: the invoice form and the lines. There is a footer bar at the bottom.

#### 2a. Invoice form (`.sec.form`)
`padding:8px 13px 9px`, `max-height:46vh`, scrolls internally if needed. **There is no section title
row.** The form starts directly with the fields.

**Form toolbar** (`.fbar`): absolutely positioned `top:4px;right:13px`, two 18×18 icon buttons (5px
radius, `1px solid --border`, white) in the label row of the top-right field:
- `+` = **Lisa välju** (title). Opens a 214px menu:
  - "Ainult arvel": ☐ Sisemärkus
  - "Arvel ja ridadel": ☐ Kulukoht, ☐ Projekt (turning one on adds the header field AND the line column)
  - "Ainult ridadel": ☐ Kulukoht real, ☐ Projekt real
  - persisted per user (`arvelo.inv.edit.extra`)
- `▾` / `▸` = collapse / expand the form (title "Ahenda arve andmed" / "Ava arve andmed"). Persisted
  (`arvelo.inv.edit.coll`). Collapsed, the grid hides and one summary line (`.csum`, 12px, 22px high)
  shows: **client** · `MA-2026 25930` · `01.09.2026 → 08.09.2026` · VAT short code · author.
The `Valuuta` label has `padding-right:46px` so the toolbar never overlaps it.

**Field grid**: `repeat(6,minmax(0,1fr))`, gap `9px 10px`. `.wide` = span 3, `.mid` = span 2.
Labels 9px/700 uppercase .09em `--text-3`; optional right-hand hint 10.5px/500 not uppercase.
Inputs are 29px high, 8px radius, 12.5px; focus = `--accent` border + `0 0 0 2px --accent-soft`.

| Row | Field | Span | Notes |
|---|---|---|---|
| 1 | **Klient** | 3 | partner picker: 19px avatar (initials, oklch hash colour) + name input + `Vaheta ⌘K`. Label hint: `Reg 14582301 · avatud saldo 1 240,00 €` |
| 1 | **Arve number** | 2 | read-only, dashed, `#f1eee6`: series prefix `MA-2026` + number `25930`. Hint `seeriast` |
| 1 | **Valuuta** | 1 | select EUR/USD/SEK |
| 2 | **Address tabs** | 3 | see below |
| 2 | **Arve kuupäev** | 1 | `pp.kk.aaaa` |
| 2 | **Maksetähtaeg** | 1 | `pp.kk.aaaa` |
| 2 | **Maksetingimus** | 1 | chips `7p` `14p` `30p` `···`. A chip sets due = issue date + N days. The active chip is derived from the dates. `···` opens the full term list (Kohe, 7, 10, 14, 21, 30, 45, 60 päeva) + "+ Lisa maksetingimus…". A non-preset term shows as `45p` on the `···` chip. |
| 3 | **Märkused** | 3 | hint `nähtav arvel`, printed on the invoice; placeholder "Näiteks tänusõnad või tellimuse viide" |
| 3 | **KM kood** | 1 | select; codes as in the list handoff (d24, d9, eug, eus, exp, ex) |
| 3 | **Koostaja** | 2 | select; hint `arvel` |
| 4 | Sisemärkus | 3 | optional; hint `ei ole arvel`; placeholder "Nähtav ainult raamatupidajale" |
| 4 | Kulukoht | 1 | optional; hint `ridadel`, acts as the default for new lines |
| 4 | Projekt | 1 | optional; hint `ridadel`, acts as the default for new lines |

**Sisemärkus is also shown automatically when it has a value**, even if the user has not enabled it.
**Import rule:** the Futursoft import text (e.g. "Imported from Futursoft (tx 5851, status STANDARD)")
goes into **Sisemärkus**, not Märkused, so it never prints on the invoice.

**Address tabs** (one slot, one input height):
The label row is a tab strip: `Arve aadress · Tarne aadress · Kontakt` (label typography, gap 12px).
Active tab = `--text` + `inset 0 -1.5px 0 --accent` underline. Inactive = `--text-3`, hover `--text-2`.
The right-hand link changes with the tab (`white-space:nowrap`):

| Tab | Content | Right link |
|---|---|---|
| Arve aadress | auto-growing textarea, **1 line by default**, grows to max 96px (`field-sizing:content`, JS fallback), user-resizable | `Taasta` (title "Taasta kliendikaardilt") |
| Tarne aadress | same textarea, empty by default, placeholder "Sama mis arve aadress". When filled, a 5px `--accent` dot appears on the tab. | `Kopeeri arve aadress` copies billing into delivery |
| Kontakt | 3 inputs in one row, grid `1fr 1.3fr 1fr` gap 6px: Kontaktisik, E-post, Telefon | `Taasta` (title "Taasta kliendikaardilt") |

Empty delivery address = deliver to the billing address. Switching tabs focuses the first input.
Hidden panes must really be `display:none`. `[hidden]` loses to `display:grid`, so enforce it.

#### 2b. Invoice lines (`.sec.linesec`)
Fills the remaining height. Bordered block (9px radius, `#fdfcf9`, `overflow-x:auto` as a safety net).
Only the rows scroll vertically. Header, add-row and totals stay put.

**Column grid** (runtime `--lcols`, shared by header and rows):

| Column | Width | Notes |
|---|---|---|
| (index) | 22px | row no. 10.5px `#c3bfb2`, **drag handle** for reordering |
| Kood | 74px | service code |
| Kirjeldus | `minmax(150px,1fr)` | empty value → `.miss` (`#ecd7b4` border, `#fdf8ec`) |
| Konto | 76px | revenue account select |
| Kulukoht | **76px** | only when enabled |
| Projekt | **84px** | only when enabled |
| Kogus | 52px | right |
| Ühik | 46px | tk / h / kuu / km / kmpl |
| Ühikuhind | 84px | right, et-EE format |
| Ale % | 50px | right |
| KM | 74px | read-only rate from the invoice VAT code, 11.5px `--text-3` |
| Rea summa | 92px | right 600; with a discount, a second 10px line `−59,35` in `#b8330f` |
| (actions) | 46px | `⧉` copy, `✕` delete; visible on row hover/focus |

With both optional columns the table is 926px wide. It fits the 1180px shell with the panel closed.

Header 28px `--surface-2`, 9px/700 uppercase. Rows min 32px, zebra `#f8f6f0`, hover `--accent-soft-2`.
Cells are borderless inputs (25px) that show a border on hover and an accent ring on focus.

**Add row** (30px): `+ Lisa rida`, `Otsi teenust` (service catalogue search), right hint
`⏎ viimasel real lisab uue · ⌥⌫ kustutab rea`. A new line inherits account, unit, cost centre and
project from the previous line (or from the header defaults).

**Totals strip** (`#f2efe6`): left "4 rida". Right: cells separated by left borders, `Neto`,
`Allahindlus` (only if any discount, `#b8330f`), `KM 24%`, `Kokku` (15px/700).

#### 2c. Footer bar (32px, `#f4f1e9`)
Left: keyboard hints `⌘S salvesta · ⏎ uus rida · Esc loobu`. Right: `Eelvaade` (PDF preview),
`Kustuta mustand` (danger ghost, confirms first).

### 3. Summary panel (right, `#f4f1e9`, resizable, closable)
Sections (`.sec`, padding 9px 13px, section header 9.5px/700 uppercase .11em):
1. **Kokkuvõte** + `✕` close. Total 20px/700; sub "4 rida · Siseriiklik 24%"; "Koostaja M. Sepp";
   key/value rows: Ridade summa, Allahindlus (if any), Maksustatav käive, Käibemaks 24%,
   **Kokku tasumisele**; then Makseviide (= number + `00` + sequence, same rule as the list).
2. **Kontroll**: live validation. 13px round marks: ✓ `--pos`, ! `--warn`, ! `--neg`. The rules:
   - client linked · number from series
   - no lines → err "Arvel pole ridu"; lines without description → err; zero-sum lines → warn
   - account set on all lines
   - date format `pp.kk.aaaa` (err) · due before issue date (err) · otherwise "Maksetingimus N päeva"
   - lines without cost centre / project (warn, only when those columns are on)
   - credit limit would be exceeded (warn) · 0% VAT → "kontrolli KM koodi põhjendust" (warn)
   `Kinnita ja saada` is blocked while any **err** exists: toast "Paranda kontrolli vead enne kinnitamist".
3. **Konteering** (`eelvaade`): D 1210 Nõuded ostjate vastu = total; C per revenue account = net;
   C 2130 Käibemaksukohustus = VAT. Note "Kanne tekib arve kinnitamisel."
4. **Klient** (+ `Kliendikaart`): Registrikood, Aadress (mirrors the billing address), E-post,
   Avatud saldo, Krediidilimiit, Keskm. laekumisaeg.
5. **Ajalugu**: timeline with a 7px bullet (`--pos` done). Events: Imporditud Futursoftist ·
   Mustand loodud · M. Sepp · Salvestamata muudatused / Mustand salvestatud 11:49 · Ootab kinnitamist.

**Resize**: 9px gutter, drag changes `--pw` (default 330px, min 260px, max `shell − 9 − 620`, where
the shell is at least 1180px). Double-click resets. Width persisted in `arvelo.inv.edit.pw`, open state
in `arvelo.inv.edit.rail`. The hairline is `--border-strong` on hover and `--accent` while dragging.

## Interactions & Behavior
- **Dirty tracking**: any field, line, tab or option change marks the invoice dirty. Save clears it.
  `Loobu` with changes asks for confirmation.
- **Keyboard**: `⌘/Ctrl+S` save · `⌘/Ctrl+K` focus client picker · `Esc` cancel · in lines `Enter`
  goes to the next row's description, and on the last row it adds a line · `⌥+Backspace` deletes the row.
- **Line reordering**: drag the index cell. The drop target shows a 2px accent line on top.
- **Payment terms**: chips and the menu both write the due date. The active term is always recomputed
  from issue and due dates, so typing a date also updates the chip.
- **VAT code**: changes the rate on all lines and every total, the check list and the journal preview.
- **Menus** (Lisa välju, payment terms) close on outside click; only one is open at a time.
- **Transitions**: only the gutter hairline (`.12s`) and row-action opacity (`.1s`).
- **Toasts** in the prototype stand in for real flows (confirm dialogs, service search, PDF preview).

## State
- invoice: client, series + number, currency, billing address, delivery address, contact (name,
  e-mail, phone), issue date, due date, VAT code, author, note (on invoice), internal note, header
  cost centre, header project, source (`futursoft` + tx id), status
- lines[]: code, description, account, cost centre, project, quantity, unit, unit price, discount %
- UI (persisted per user): optional-field toggles, form collapsed, panel open, panel width
- UI (transient): active address tab, open menu, drag state, dirty flag
- derived: net, discount, VAT, total, reference number, checks, journal preview

## Design Tokens
Same as the sales-invoice list handoff (`:root` in the HTML):
`--bg:#f6f4ee` `--surface:#fff` `--surface-2:#f0ede5` `--border:#e6e1d4` `--border-strong:#d4cebe`
`--text:#0a0a0a` `--text-2:#4a4946` `--text-3:#8e8c84` `--accent:#ff4e2c` (hover `#e8431f`, on tint
`#b8330f`) `--accent-soft:#ffe7df` `--accent-soft-2:#fff3ee` `--pos:#0e7b5a` `--pos-soft:#e2efe9`
`--warn:#b07d1f` `--warn-soft:#f5ecd6` (text `#7d5a13`) `--neg:#c0392b` `--neg-soft:#fbeaea`.
Editor-specific surfaces: editor `#f9f7f1`, panel/footer `#f4f1e9`, lines `#fdfcf9`, zebra `#f8f6f0`,
totals `#f2efe6`, read-only `#f1eee6`, row separators `#efece4`, dashed kv `#ece8dd`.

Type: **Inter** only. Numbers use `font-variant-numeric:tabular-nums`, **not a monospace font**,
so zero is a plain `0` with no dot or slash. Amounts: `et-EE`, two decimals, non-breaking space before `€`.
Sizes: 20px/700 panel total · 15px/700 grand total · 14.5px/700 title · 13px body · 12.5px inputs and rows ·
11.5px meta · 10.5px hints · 9–9.5px/700 uppercase labels.
Radii: 11px card · 9px lines block · 8px inputs · 7px buttons · 6px chips · 5px tags and toolbar buttons.
Sizes: buttons 27px (sm 25px), inputs 29px, line cells 25px, chips 20px, toolbar buttons 18px.

## Assets
None. Inline 24×24 stroke icons (`stroke-width:1.8`, round caps): plus, search, split-panel. Use the
codebase's icon set at the same weight.

## Files
- `Müügiarve muutmine.html` — **the design to build.**
- Related: `design_handoff_sales_invoices/` (the list this editor opens from; same tokens, status tags,
  VAT codes and reference-number rule).
