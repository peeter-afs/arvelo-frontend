# Handoff: Purchase invoices (Ostuarved) — dense list, approvals, payment order, detail panel

## Overview
A redesign of the purchase-invoice workspace in Arvelo. It follows the sales-invoice list
(`design_handoff_sales_invoices/`, **read that README first**) and uses the same shell, tokens, table
mechanics, period picker, panel resizing, full view and journal modal. This document covers only
**what differs**.

In this one screen the user can:
- see every supplier invoice regardless of source (e-invoice operator, PDF upload, manual, bank-created draft, CSV/Bolt import)
- approve or reject pending invoices in the list (this replaces a separate trip to `purchase-approvals`)
- tick invoices and build a payment order / bank file (pain.001) without leaving the list
- review the original PDF at a readable size, with zoom
- see which bank-created drafts are still missing an original and which reminders have gone out

UI language is **Estonian**. All copy in the prototype is final — reuse it verbatim.

## About the Design Files
The HTML file is a **design reference**, not production code. Recreate it in the existing
Next.js + React + TypeScript + `next-intl` codebase. Today the route is
`app/(dashboard)/invoices/purchase/page.tsx`, which renders `InvoiceListWorkspace` with
`invoiceType="purchase_invoice"`. Build it as a purchase-specific workspace, or extend the shared one,
whichever fits the codebase. The prototype's data generator, `toast()` and `prompt()` stubs,
`localStorage` keys and inline handlers are scaffolding only.

## Fidelity
**High-fidelity.** Every measurement below is taken from the prototype CSS. Where a value is not
listed, it is identical to the sales-invoice handoff.

## Status model
The prototype has 8 display statuses. Map them to the backend as follows:

| key | label | tag bg / text | backend status | notes |
|---|---|---|---|---|
| `draft` | Mustand | `--surface-2` / `--text-3` | `draft` | not validated; often created from a bank tx |
| `pend` | Ootab kinnitust | `--warn-soft` / `#7d5a13` | `pending_approval` | |
| `rej` | Tagasi lükatud | `--neg-soft` / `--neg` | `rejected` | carries a rejection reason |
| `ok` | Kinnitatud | `#eaf0ff` / `#2c5cf6` | `approved` **and** `payable` | merged: the user does not need the distinction |
| `part` | Osaliselt makstud | `#eaf0ff` / `#2c5cf6` | `partially_paid` | |
| `over` | Üle tähtaja | `--neg-soft` / `--neg` | derived: `approved/payable/partially_paid` + past due + open > 0 | |
| `paid` | Makstud | `--pos-soft` / `--pos` | `paid` | |
| `void` | Tühistatud | `--surface-2` / `--text-3`, line-through | `void` / cancelled | |

"Payable" (derived) = status in {ok, over, part} **and** open balance > 0.

## Screen layout
The shell is identical to sales, except that **min-width is 1180px** (fits a 14" laptop).
The default panel width is **420px** (min 380, max shell − 9 − 560), persisted in `arvelo.pinv.pw`.

### 1. Title row
- `h1` "Ostuarved", subline "04.06.2026 – 02.09.2026 · 56 arvet"
- **Metrics** (same style as sales): `Maksmisele` (sum of open balance of payable invoices) ·
  `Üle tähtaja` (payable + past due, value in `--neg`) · `7 päeva jooksul` (payable, due within the
  next 7 days). The last metric hides below 1420px.
- **Actions**: `Laadi üles` is **primary** (upload icon) and opens a 252px menu with three items. Each
  item has a 10.5px `--text-3` description:
  - `PDF või pilt` — "Tuvastame tarnija, summad ja read"
  - `E-arve XML` — "Kui arve ei tulnud operaatori kaudu"
  - `CSV / Bolt eksport` — "Mitu arvet korraga"
  - footer hint: "Faili võib lohistada ka otse nimekirjale"

  Next to it is `Uus ostuarve` (regular button, `kbd U`, shortcut `U`).

### 2. Filter row
- **Quick tabs**: `Kõik` · `Mustand` · `Ootab kinnitust` · `Maksmisele` · `Üle tähtaja`.
  The `···` menu holds `Makstud` · `Tagasi lükatud` · `Tühistatud`.
  When the `Ootab kinnitust` tab is not active and has items, its count pill is `--warn-soft` / `#7d5a13`.
  Predicates: `topay` = payable; `ok` = ok ∪ part; the rest match on status.
- Period picker: same as sales, filters on invoice date. **Exception:** payable invoices are **always
  shown regardless of period** so an unpaid bill never disappears from view.
- **Allikas** picker (same `.perbtn` pattern, 214px menu, each item has a description line and a count):
  `Kõik allikad` · `E-arve` (Operaatori kaudu) · `PDF` (Üles laaditud / skaneeritud) · `Käsitsi`
  (Sisestatud käsitsi) · `Pank` (Pangatehingust loodud mustand) · `CSV` (Bolt / CSV import).
- VAT-code picker: purchase codes `Siseriiklik 24%`, `Siseriiklik 9%`, `EU teenus (pöördmaks)`, `Maksuvaba`.
- Search: placeholder "Otsi arvet või tarnijat  /". Matches internal nr, supplier name and supplier invoice nr.

### 3. List card
**List header** (33px) has two states:
- default: "**N** arvet nähtaval · märgi read `x`, et koostada maksekorraldus" + `Veerud` button
- **selection** (≥1 ticked, background `--accent-soft-2`): "**3** valitud · maksmisele **2 840,50 €**
  (2 arvet)". The part in parentheses appears only when some ticked invoices are not payable.
  Buttons on the right: `Kinnita (N)` (only if ticked invoices include pending ones; approves them in bulk),
  primary `Koosta maksekorraldus` (disabled if no ticked invoice is payable), `✕` clear (also `Esc`).

**Warning strip** (warn-soft, same as sales): "**N** arvet ootab kinnitust summas X € — neid ei saa
enne kinnitamist maksta" + primary `Ava kinnitamiseks`, which switches to the pending tab. The strip is
hidden when the pending tab is active or rows are ticked.

**Columns** (grid template in `--cols`, resizable and hideable exactly like sales):

| id | label | width | default | content |
|---|---|---|---|---|
| `ck` | (checkbox) | 30px, locked | shown | row checkbox. The header checkbox ticks all **visible** rows. Clicking the checkbox does not change the selected row. |
| `nr` | Nr | 56 | shown | internal nr, `--accent` 500 |
| `sup` | Tarnija | flex `minmax(120px,1fr)` | shown | hashed avatar + name 600; second line 10.5px `--text-3`: "E-arve · 2 rida · 14p". Bank drafts add " · originaal puudub". |
| `sinv` | Tarnija arve | 112 | shown | supplier's invoice nr + 17px **paperclip** button. The clip is dimmed at 35% when there is no attachment. Clicking it selects the row and opens the panel on **Originaal**. |
| `acc` | Kulukonto | 140 | hidden | "4020 Side- ja IT-kulud", or "4020 + 1" when there are several accounts (title lists them all) |
| `ccp` | Kulukoht / projekt | 140 | hidden | first cost centre · first project, or `—` |
| `total` | Summa | 90 | shown | |
| `open` | Tasumata | 86 | shown | `—` when 0 or not payable |
| `issued` | Arve kp | 84 | hidden | |
| `due` | Tähtaeg | 112 | shown | date + `+12p` in `--neg` if payable and late, or days left in `--text-3` |
| `paydate` | Makstud | 84 | hidden | payment date. For batched invoices: planned date + "plaan" |
| `appr` | Kinnitaja | 92 | shown | 18px round initials + short name. The circle is dashed when approval is still pending. Title "Kinnitab / Kinnitas K. Tamm". |
| `st` | Staatus | 128 | shown | status tag + optional chips (below) |

Defaults hidden: `acc, ccp, issued, paydate` (persisted in `arvelo.pinv.hidden`). `Lähtesta` in the
columns menu restores these defaults.

**Status-cell chips** (9px/700, 1px 4px padding, 4px radius, margin-left 4px):
- `MP`: `--pos-soft` / `--pos`, the invoice is in a payment batch. Title "Maksepakis MP-2026-014 · 05.09.2026".
- bell icon + count: `--warn-soft` / `#7d5a13`, a bank draft with no original. Title
  "Originaal puudub · 3 meeldetuletust saadetud, viimane 01.09.2026 · peeter@autofutur.ee".

Ticked rows use `background:#fff8f4`. The selected row style is unchanged (`--accent-soft` + inset accent bar).

**Footer**: "Sorteeritud: …" · `Summa kokku` (hover shows net/VAT) · `Maksmisele` · export split button.

## Detail panel
### Header (compact, one row)
`.dhead`, `--surface-2`, padding 10px 13px (7px 10px in PDF mode).
- **Row 1** (`display:flex;gap:6px`): `h2` 15px/700 "**1837** · Office Day OÜ" (flex 1, ellipsis),
  then `↑` `↓` `⇱`/`⇲` (icon only, titles "Eelmine (k)", "Järgmine (j)", "Laienda paneel (tabel
  peitu)" / "Kitsenda paneel") and `Ava →`.
- **Status is shown as the colour of the invoice number**, with the status label as its `title`. There
  is no separate tag in the panel. Colours: draft/void `--text-3` (void also line-through), pend
  `--warn`, rej/over `--neg`, ok/part `#2c5cf6`, paid `--pos`.
- **Row 2** (hidden in PDF mode): 11.5px `--text-3` "OF-2607863 · E-arve", i.e. supplier invoice nr ·
  source. The journal number is **deliberately not shown** here. It lives in the full view.

### Read / Originaal toggle
A small segmented control (`.seg`: 2px padding, `--surface-2`, 7px radius; buttons 20px tall,
11px/600, `white-space:nowrap`; active = white + `0 1px 2px rgba(0,0,0,.07)`), labels
`Read · N` / `Originaal`. It is **always bottom-left** in both modes:
- Read mode: at the left of the lines totals row (`margin-right:auto;flex-shrink:0`)
- Originaal mode: at the left of the PDF toolbar

### Read mode
1. Rejected invoices only: 11px `--neg` line "Tagasi lükatud: <reason>".
2. **Lines** block (grows; only the rows scroll). Narrow panel grid `minmax(0,1fr) 44px 40px 74px` =
   Kirjeldus, Kogus, KM, Summa. Expanded panel (`⇱`) grid
   `minmax(0,1fr) 150px 44px 66px 46px 76px` adds Kulukonto and Hind. The row title shows cost centre
   and project. Totals row (`gap:10px`, nowrap): toggle · (`Neto` only when expanded) · `KM` ·
   `Kokku`, and `Kokku` has title "Neto … · KM …".
3. Two-column split:
   - **Andmed**: Tähtaeg (in `--neg` when late) · Viitenumber · IBAN · KM kood · Kulukonto ·
     Kulukoht / projekt
   - **Kinnitamine**: approval timeline (below), then **Pangatehing** (below)
4. **Action bar** (pinned), depending on status:

| status | primary | secondary | right |
|---|---|---|---|
| draft | `Saada kinnitamiseks` | `Saada meeldetuletus` (bank drafts) / `Muuda` | `···` |
| pend | `Kinnita` | `Lükka tagasi` (danger ghost; asks for a reason, default "Summa ei klapi tellimusega") | `···` |
| rej | `Paranda ja saada uuesti` | — | `···` |
| payable, not batched | `Lisa maksekorraldusse` | `Registreeri tasumine` | `Muuda`, `···` |
| payable, batched | `Maksepakis MP-2026-014` (regular) | `Registreeri tasumine` | `Muuda`, `···` |
| paid / void | `Ava arve` | — | `Muuda`, `···` |

`Kinnita` sets the status to ok (or over if already late), creates the journal entry and shows the toast
"Arve 1837 kinnitatud · kanne OA-2026-…".

### Approval timeline (`.tlrow`, 40px date · 12px bullet · text, 11px)
Bullet colours: done `--pos`, waiting `--warn`, bad `--neg`, future `--border-strong`.
1. origin: "Saabus e-arvena" / "PDF tuvastatud" / "Imporditud CSV-st" / "Loodud pangatehingust" /
   "Sisestatud", followed by "· <who entered>"
2. by status:
   - draft: one row per sent reminder, "Meeldetuletus N saadetud · <address>" (waiting); then
     "Järgmine meeldetuletus (automaatne)" with its date; then "Ootab originaali" or
     "Täienda ja saada kinnitamiseks"
   - pend: "Ootab kinnitust · K. Tamm" (waiting)
   - rej: "Tagasi lükatud · K. Tamm: <reason>" (bad)
   - approved and later: "Kinnitatud · K. Tamm" (done), then "Maksepakis MP-…" (waiting) if batched,
     then "Makstud 1 240,00 €" (done), or "Tähtaeg möödas N p" (bad) / "Maksmata"

### Pangatehing block (`.btx`, bordered 8px row)
- bank draft: "28.08 **−45,90 €** Swedbank · mustand loodud siit" + `Ava` → bank view
- paid: "05.09 **−1 240,00 €** Swedbank · MP-2026-012" + `Ava`
- batched: dashed "Makse ootab panka · MP-2026-014 · 05.09.2026"
- otherwise: dashed "Pangatehingut pole seotud"

### Originaal mode (the PDF takes the whole panel)
The header shrinks to row 1 only. **Everything else is hidden**: lines, Andmed, Kinnitamine and the action bar.
- Viewer: white background, **no frame, padding or shadow**. The page is rendered at a 600px design
  width and scaled with CSS `zoom`.
- **Toolbar** (`.pdfbar`, pinned at the bottom, `border-top`): toggle · file name (`flex:1`, ellipsis,
  title = full name) "arve_OF-2607863.pdf · 1 lk · E-arve" · zoom control · icon-only `Laadi alla`
  and `Asenda fail`.
- **Zoom control**: `−` · value (e.g. "63%") · `+` · `↔` (fit width, **default**) · `1:1`.
  The range is 30–300% in 25% steps. Fit width recomputes when the panel is resized.
  Keyboard: `+`/`=` zoom in, `−` zoom out, `0` fit width. **Ctrl/⌘ + mouse wheel** over the page zooms.
  The zoom level is kept while moving between invoices.
- In production, render real PDFs (e.g. pdf.js) with the same controls. Image originals use the same
  viewer.

### Originaal mode, no original (bank-created drafts)
This replaces the viewer (`.noorig`, padding 22px 20px, gap 12px):
- 38px warn-soft icon tile, `h4` "Originaal puudub", then the explanation "Mustand loodi
  pangatehingust 25.08.2026. Kviitungi või arve küsimiseks saadetakse automaatselt meeldetuletusi
  aadressile **peeter@autofutur.ee**."
- **Meeldetuletused · N** list (bordered). Each row has 78px date · "**Meeldetuletus N** · e-post" ·
  delivery state (`avatud` / `avamata`). The last row (`--row-alt`) is the next automatic reminder date.
- buttons: primary `Laadi originaal üles`, `Saada meeldetuletus kohe`, ghost `Originaali ei tule`
  (stops reminders; the entry is booked without an original)
- bottom toolbar: toggle + "Faili võib lohistada siia"

Reminder data: reminders go out every 3 days from creation. The next date is always in the future.
The template and cadence come from billing settings (`BillingTab.tsx` reminder e-mail). If the backend
does not track e-mail opens, drop the `avatud/avamata` column.

## Payment order modal ("Maksekorraldus")
Opened from the selection bar or from `Lisa maksekorraldusse`. It is the same modal shell as the journal
modal, `width:min(720px,100%)`.
- header: `h3` "Maksekorraldus", meta "3 arvet · 3 saajat · kokku 2 840,50 €"
- field row (3 columns `1.6fr 1fr 1fr`): **Maksja konto** select ("Swedbank · EE38 2200 2210 2014 5685",
  "LHV · …") · **Maksekuupäev** (`pp.kk.aaaa`, default today) · **Koondamine** ("Iga arve eraldi" /
  "Koonda saaja kaupa")
- if some ticked invoices were excluded: a warn strip "**N** valitud arvet jäid välja — need on
  mustandid, ootavad kinnitust või on juba maksepakis."
- table `minmax(0,1.2fr) 176px minmax(0,1fr) 84px 96px` = Saaja · IBAN · Selgitus / viide
  (reference · supplier invoice nr) · Tähtaeg (in `--neg` when late) · Summa (open balance)
- totals strip: "Makseid N · Kokku X"
- footer: hint "Arved märgitakse makstuks, kui pangatehing saabub ja seotakse" · `Loobu` ·
  `Salvesta maksepakina` · primary `Laadi pangafail (pain.001)`

Both save actions mark the invoices `inBatch` (`MP` chip, planned pay date) and clear them from the
selection. Invoices become **paid only when the bank transaction is matched**, never at export.
Use the existing payment-batch API (`app/(dashboard)/accounting/payment-batches/`).

## Full view
Same as sales, with these differences:
- meta line "Tarnija arve OF-… · 01.09.2026 → 15.09.2026 · 14 päeva · viide … · E-arve"
- left: the same `Read · N / Originaal` toggle row at the top; in Originaal the viewer fills the column
- lines `minmax(0,1fr) 54px 84px 52px 90px 90px` = Kirjeldus (sub-line "4020 Side- ja IT-kulud ·
  Tartu kontor · LT filiaal"), Kogus, Hind, KM, Neto, Kokku
- **Konteering**: D per expense account (net), D `1510 Sisendkäibemaks` (VAT), C `2110 Võlad
  tarnijatele` (total). Before approval it reads "eelvaade · kanne tekib kinnitamisel".
- right rail: **Maksmine** (open balance, bar, due date ± days, Saaja IBAN, Viitenumber, Maksepakk) ·
  **Tarnija** (+ `Partneri kaart`; Registrikood, KM kood, Vaikimisi kulukonto, Avatud kokku) ·
  **Kinnitamine** · **Pangatehing** · **Manused**
- journal modal: purchase entry, plus a payment entry (D 2110 / C 1010) when paid

## Keyboard
Same as sales (`/`, `j`/`k`, `Enter`, `Esc`), plus:
- `x` ticks or unticks the selected row
- `U` opens a new purchase invoice
- `Esc` order: modal → full view → clear ticks
- `+`/`−`/`0` zoom in Originaal mode

## State (additions to sales)
`src` (source filter) · `chk` (Set of ticked ids) · `ptab` (`lines | pdf`) · `zoom` (`'fit'` or a
number) · persisted `arvelo.pinv.pw`, `arvelo.pinv.cols`, `arvelo.pinv.hidden`.
Per invoice: supplier (name, reg code, IBAN, default account), supplier invoice nr, source,
attachment flag/URL, reference number, approver, entered by, rejection reason, batch id, planned or
actual pay date, reminders (dates, recipient, delivery state, next date), linked bank transaction,
lines (description, account, cost centre, project, qty, unit price, VAT rate, net).

## Design tokens
Identical to the sales handoff. Additions: ticked row `#fff8f4`; sent/approved blue `#eaf0ff` /
`#2c5cf6`. Numbers are **Inter with tabular-nums** (plain zero), not a monospace face.

## Files
- `Ostuarved - tihe vaade.html` — **the design to build.**
- Related: `design_handoff_sales_invoices/` (shared patterns), `design_handoff_sales_invoice_edit/`
  (editor patterns for the upcoming purchase-invoice editor).
- Repo references: `app/(dashboard)/invoices/purchase/page.tsx`, `components/invoices/InvoiceListWorkspace.tsx`,
  `app/(dashboard)/invoices/purchase-approvals/page.tsx`, `app/(dashboard)/accounting/payment-batches/page.tsx`,
  `app/(dashboard)/settings/_tabs/BillingTab.tsx` (reminder template).
