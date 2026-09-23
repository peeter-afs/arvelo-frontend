# Handoff: Purchase invoice editor (Ostuarve muutmine)

## Overview
This is the editor for one purchase invoice. It opens from the purchase list
(`design_handoff_purchase_invoices/`) through `Muuda`, `Ava arve`, or by opening a draft. The same screen
handles new invoices, drafts (PDF import, bank-created, CSV, manual) and rejected invoices that are being fixed.

The layout, tokens, form grid, optional fields, collapse, line editing, keyboard behaviour and resizable
right panel are **identical to the sales-invoice editor**. Read `design_handoff_sales_invoice_edit/README.md`
first. This document lists only what differs.

What the purchase editor adds:
- the **original (PDF) beside the form** as an optional tab of the right panel, with zoom. The panel remembers
  whether it was open, which tab was active and how wide it was.
- a **comparison against the original**: the line total is checked against the recognised total
- **supplier-side checks**: duplicate supplier invoice number, and IBAN compared with the partner card
- **editable general-ledger accounts** in the journal preview: VAT account, VAT deduction %, payables account

UI language is **Estonian**. All copy in the prototype is final — reuse it verbatim.

## About the Design Files
`Ostuarve muutmine.html` is a **design reference**, not production code. Recreate it in the Next.js + React +
TypeScript + `next-intl` codebase (`components/invoices/InvoiceEditor.tsx` already supports
`purchase_invoice`). The OCR values, sample lines, `toast()` stubs and `localStorage` keys are scaffolding
only.

## Fidelity
High-fidelity. Where a measurement is not given here, it matches the sales editor.

## Top bar
- breadcrumb `← Ostuarved /` → purchase list
- `h1` = **internal invoice number** (e.g. `1838`), 14.5px/700, tabular
- status tag `MUSTAND` (draft). Other states use the purchase status tags from the list handoff.
- source tag, e.g. `PDF IMPORT` (`.tag.info`), with title "PDF üles laaditud 28.08.2026 · andmed tuvastatud
  automaatselt". The source varies: E-arve / PDF import / Pank / CSV / Käsitsi.
- right side: save-state text · `Loobu` `Esc` · `Salvesta mustand` `⌘S` · primary **`Saada kinnitamiseks`** ·
  panel toggle (`Peida paneel` / `Näita paneeli`; the label is hidden at ≤1440px)
- `Saada kinnitamiseks` is blocked while the check list contains an error. The toast reads
  "Paranda kontrolli vead enne saatmist". On success the toast reads "Saadetud kinnitamiseks · K. Tamm".
- When the invoice is opened by the **approver** (status pending), the primary becomes `Kinnita` with
  `Lükka tagasi` beside it, the same as in the list panel. This state is not built in the prototype.

## Form (6-column grid, same mechanics)
| Row | Field | Span | Notes |
|---|---|---|---|
| 1 | **Tarnija** | 3 | partner picker (`Vaheta ⌘K`). Label hint `Reg 10712838 · avatud 0,00 €` |
| 1 | **Tarnija arve nr** | 2 | editable. Label hint `unikaalne` (`--pos`) or `juba sisestatud` (`--neg`; the input also gets the warn style) |
| 1 | **Valuuta** | 1 | `padding-right:46px` on the label leaves room for the form toolbar |
| 2 | **Arve kuupäev** | 1 | |
| 2 | **Maksetähtaeg** | 1 | |
| 2 | **Maksetingimus** | 1 | chips `7p 14p 30p ···`, same behaviour as the sales editor |
| 2 | **Saaja IBAN** | 2 | label hint `kehtiv · partneri kaardilt` (`--pos`) or `erineb partneri kaardist` (`--neg`) |
| 2 | **Viitenumber** | 1 | |
| 3 | **Selgitus** | 3 | hint `maksekorraldusele`; used as the payment description when no reference number is given |
| 3 | **KM kood** | 1 | Siseriiklik 24% · 9% · EU teenus (pöördmaks) · Maksuvaba |
| 3 | **Kinnitaja** | 2 | hint `saab teavituse`; defaults from the supplier or cost centre |
| 4 | Sisemärkus / Kulukoht / Projekt | 3/1/1 | optional through `Lisa välju` (+), same as sales. Persisted in `arvelo.pinv.edit.extra`. |

The collapsed summary reads: **supplier** · supplier invoice nr · dates · VAT short · "kinnitab K. Tamm".
Persisted in `arvelo.pinv.edit.coll`.

**There is no billing/delivery/contact address block.** That block is sales-only.

## Lines
Column grid (`--lcols`):

| Column | Width | Notes |
|---|---|---|
| (index) | 22px | drag handle |
| Kirjeldus | `minmax(130px,1fr)` | |
| **Kulukonto** | 136px | select showing "4010 Kontorikulud" with ellipsis; the full name is in the `title` |
| Kulukoht | 96px | optional |
| Projekt | 104px | optional |
| Kogus | 52px | |
| Ühik | 50px | tk / pk / h / kuu / km / l |
| Ühikuhind | 86px | |
| KM | 50px | read-only rate from the VAT code |
| Rea summa | 92px | net |
| (actions) | 46px | copy / delete on hover |

Compared with the sales editor there is **no Kood column and no Ale %**.
Widths are chosen so that the table fits at a 1180px shell with the original panel open at its default
460px width.

Below the rows: `+ Lisa rida` · `Jaga kontodele` (splits one amount across several expense accounts by share;
the flow itself is not designed yet) · hint.

**Totals strip**: on the left "3 rida" + an **original-match chip**:
- equal → `✓ klapib originaaliga` (`--pos-soft` / `--pos`)
- different → `originaalist +12,40 €` (`--warn-soft` / `#7d5a13`), with title "Originaalil 224,94 €"

On the right: `Neto` · `KM 24%` · `Kokku`.

The footer bar holds the hints `⌘S salvesta · ⌘O originaal · Esc loobu` and `Kustuta mustand` (danger ghost).

## Right panel: `Kokkuvõte | Originaal`
The panel header (`.rhead`, 6px padding) contains a segmented control (`.seg`, buttons 21px, 11.5px/600) and
a close `✕`. The `Kokkuvõte` button carries a 5px status dot: `--pos` all checks pass, `--warn` warnings,
`--neg` errors. This lets the user notice problems while the PDF tab is active.

**Persistence**, all per user:
- `arvelo.pinv.edit.rtab`: `sum` | `pdf`. **The next invoice opens on the tab chosen last.** This is how the
  user decides whether the original opens automatically.
- `arvelo.pinv.edit.rail`: panel open or closed
- `arvelo.pinv.edit.pw.sum` / `arvelo.pinv.edit.pw.pdf`: **a separate width for each tab**. Defaults are
  330px and 460px; the minimum is 260px (summary) and 360px (PDF); the maximum is shell − 9 − 620.
  Double-clicking the gutter resets the current tab's width.
- Choosing a tab while the panel is closed opens the panel. `⌘O` toggles between Originaal and Kokkuvõte.

### Kokkuvõte tab (top to bottom)
1. **Tarnija** (+ `Partneri kaart`): Registrikood · Vaikimisi kulukonto · Varasemad arved ("14 · keskm.
   186,20 €") · Avatud kokku. It sits first so it is visible without scrolling.
2. **Kokku tasuda**: section header on the right shows "tähtaeg 11.09.2026"; 20px/700 total with the
   original-match chip on the right; sub-line "3 rida · Siseriiklik 24% · kinnitab K. Tamm".
   Net and VAT are **not repeated** here because the totals strip under the lines already shows them.
3. **Kontroll**: live checks, same visual as sales:
   - supplier linked
   - supplier invoice nr: missing → err · already entered → err "Arve **OF-…** on juba sisestatud (1791)" ·
     otherwise ok "pole varem sisestatud"
   - total vs original: ok "Summa klapib originaaliga **224,94 €**" / warn "Summa erineb originaalist **+X**"
   - lines present / descriptions present / expense account on all lines
   - IBAN: invalid format → err · differs from partner card → warn "IBAN erineb partneri kaardist — kontrolli"
     · ok "IBAN klapib partneri kaardiga"
   - date format / due date before invoice date → err
   - lines without cost centre or project → warn (only when those columns are on)
   - reverse charge → warn "Pöördmaks — KM arvestatakse deklaratsioonis (KMD lisa)"
4. **Konteering**: see below
5. **Ajalugu**: PDF üles laaditud · M. Sepp / Andmed tuvastatud · 3 rida / save state / Kinnitamine · K. Tamm

### Konteering: editable general-ledger accounts
The preview is D expense accounts (net, grouped by account) · D VAT account · C payables account (total).

- **Expense rows** come from the lines and are **not edited here**. Hovering highlights the row. Clicking it
  focuses the account select of the first matching line and flashes that line's top border.
- The header link `Muuda kontosid` switches to edit mode:
  - the VAT row becomes a select: `1510 Sisendkäibemaks` · `1515 Sisendkäibemaks impordilt` ·
    `1516 Sisendkäibemaks (sõiduauto)`
  - the payables row becomes a select: `2110 Võlad tarnijatele` · `2111 Võlad välistarnijatele` ·
    `2120 Aruandvad isikud` · `2190 Muud võlad`
  - **KM mahaarvamine** chips `100% · 50% · 0%` appear below the table (only when VAT > 0)
  - the link becomes `Valmis`
- **Non-deductible VAT** (50% or 0%) is added to the expense accounts in proportion to their net amounts,
  with the last account taking the rounding. Expense rows then show `+ KM`, and the note reads
  "Maha arvamata KM 21,77 € lisatud kulukontodele. Kanne tekib arve kinnitamisel." The entry must always balance.
- When anything differs from the defaults, the header shows `muudetud` (`#b8330f`, 600) · `Taasta` · `Muuda`,
  and changed account codes are shown in `#b8330f`. `Taasta` restores the defaults. The edit toggle is always
  available.
- **Defaults come from the supplier card** (VAT account, deduction %, payables account). The prototype
  hard-codes 1510 / 100% / 2110.

### Originaal tab
The PDF takes the whole panel below `.rhead`. The viewer and zoom are the same as in the purchase-list
handoff: 600px design width scaled with CSS `zoom`, default fit to width, `−` · % · `+` · `↔` · `1:1`,
range 30–300%, `+`/`−`/`0` keys, Ctrl/⌘ + wheel. The toolbar holds the file name (ellipsis) and icon-only
`Laadi alla` / `Asenda fail`. In fit mode the zoom recomputes while the gutter is being dragged.
When there is no original, use the no-original state from the list handoff (reminders, `Laadi originaal üles`).

Recommended later step (not in the prototype): highlight the recognised field on the PDF when the matching
form field has focus.

## Keyboard
Same as sales (`⌘S`, `⌘K` supplier, `Esc`, `Enter` / `⌥⌫` in lines), plus `⌘O` to toggle the original and
`+ − 0` to zoom while the original tab is active and focus is not in a field.

## State (differences from sales)
- invoice: supplier, **supplier invoice nr**, **IBAN**, **reference number**, **description**, approver, source,
  attachment, recognised values (OCR total, recognised lines), **GL overrides** `{vat, ap, ded}`
- line: description, **expense account**, cost centre, project, qty, unit, unit price (no code, no discount)
- UI (persisted): optional fields, collapsed, panel open, **active tab**, **width per tab**
- UI (transient): zoom, `gledit`, dirty
- derived: net / VAT / total, deductible vs non-deductible VAT, journal lines, checks, original-match diff

## Tokens
The same as the sales editor. Additional chip colours: match `--pos-soft`/`--pos`, mismatch
`--warn-soft`/`#7d5a13`; changed GL account `#b8330f`.

## Files
- `Ostuarve muutmine.html` — **the design to build.**
- Related handoffs: `design_handoff_sales_invoice_edit/` (base editor), `design_handoff_purchase_invoices/`
  (list, statuses, PDF viewer, no-original state, payment order).
