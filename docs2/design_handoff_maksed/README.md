# Handoff: Maksed + Maksepaketid (payments and payment batches)

## Overview
A redesign of two pages that today look different from the rest of Arvelo:
- `app/(dashboard)/accounting/payments/page.tsx` (**Maksed**)
- `app/(dashboard)/accounting/payment-batches/page.tsx` (**Maksepaketid**)

Both move to the dense list + resizable detail panel shell already used by sales and purchase invoices.
**Read `design_handoff_sales_invoices/README.md` and `design_handoff_purchase_invoices/README.md`
first.** This document covers only what is specific to payments.

UI language is **Estonian**. All copy in the prototype is final, so reuse it verbatim (add it to
`i18n/messages/et.json`, keys under `accounting.*`).

## About the design files
`Maksed - tihe vaade.html` (with `maksed-app.js`, `maksed-data.js`) is a **design reference**, not
production code. Recreate it in Next.js + React + TypeScript + `next-intl`. The data generator,
`toast()` stubs and inline handlers are scaffolding. Open `#maksed` or `#paketid` to land on a tab.

## Fidelity
**High-fidelity.** Tokens, type scale, table mechanics, tags, the period picker, panel gutter and
compact mode are identical to the purchase-invoice handoff. Where a value is not listed here, use
that one. Compact mode follows `SCREEN_125_COMPACT_MODE.md`.

## What to remove from the current pages
- All `slate-*`, `blue-*`, `emerald-*`, `amber-*`, `red-*` classes → `--a-*` tokens only.
- The 5 KPI cards → 3 inline metrics in the title row.
- Success/error cards at the top → `toast()`; blocking errors go into the panel as a `note bad`.
- Raw enum values in the UI (`posted`, `paid`, `draft`) → translated tags.
- `InfoBox` tiles and the journal UUID → `kv` rows and the entry number as a link.
- The always-open batch creation form → the **Uus maksepakett** modal.
- A column of 6 mostly-disabled buttons → only the actions the current status allows.

## Shared shell
```
h1  [Maksed · 4 | Maksepaketid · 2]            METRIC  METRIC  METRIC   [action]
[search /] [status tabs + counts] [segment] [period] [filter chip]
┌ listhead · warnstrip · thead · rows · tfoot ┐ 9px gutter ┌ dhead · dbody (scrolls) · dfoot (pinned) ┐
```
- **Module tabs** (`.modtab`) next to the `h1` link the two routes. Badge (`--warn-soft`):
  Maksed = draft payments, Maksepaketid = draft + rejected batches. Use `<Link>`, the routes stay separate.
- Panel width default 440px, min 360, list keeps ≥ 520px. Persist in `arvelo.pay.pw` / `arvelo.batch.pw`.
- **Column auto-hide**: measure the scroll container (`.tscroll`), **not** the rows element. The
  rows element grows to content width (`min-width:fit-content`) so it never reports less than the
  column sum. Observe the container with `ResizeObserver` and only re-render when its width changes.
- Money: `toLocaleString('et-EE',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'`, Inter
  tabular-nums. Incoming `+` in `--pos`, outgoing `−` in `--text`.
- Keyboard: `↑/↓` or `j/k` move the selection, `/` focuses search, `Esc` closes the modal or blurs the input.

---

## 1. Maksed
### Title row
Metrics: `Sissetulev` (`--pos`) · `Väljaminev` · `Ootab konteerimist` (count, `--warn` when > 0;
hides below 1420px). Action: `Registreeri makse` (regular button), which opens the existing
`components/invoices/RegisterPaymentDialog.tsx` after an invoice search.

### Filter row
Search is the **first** item on the left, before the tabs (both tabs).
- Tabs: `Kõik` · `Mustand` · `Konteeritud` · `Tühistatud`, each with a count. The Mustand pill is
  `--warn-soft` when > 0. Backend `cancelled` is shown under Tühistatud.
- Segment: `Kõik suunad` · `Sissetulev` · `Väljaminev` → `direction` param.
- Period picker (payment date), default "Viimased 90 päeva".
- `?invoice_id=` → blue filter chip `Arve 25833 ×` (`.fchip`, `--info-soft`/`--info`). Removing it
  clears the param.
- Search: placeholder "Otsi partnerit, arvet, summat  /". Matches partner, invoice nr, reference, amount.

### List
- listhead: "**N makset** · sorteeritud kuupäeva järgi", right side "Sisse **X €**  Välja **Y €**"
  (reversed payments excluded).
- warnstrip (hidden on the Mustand tab): "N pangast imporditud makset ootab konteerimist · X €" +
  primary `Vaata mustandeid`.

| id | label | width | content |
|---|---|---|---|
| d | Kuupäev | 84 | `payment_date` dd.mm.yyyy |
| p | Partner · arve | `minmax(200px,1.7fr)` | avatar + `partner_name` 600; sub-line "Müügiarve 25833" / "Ostuarve AR-4411" (`invoice_type`) |
| dir | Suund | 106 | 17px tile (down-arrow `--pos-soft` / up-arrow `--surface-2`) + Sissetulev / Väljaminev |
| src | Allikas | `minmax(140px,1fr)` | "Pangaimport · Swedbank põhikonto", "Käsitsi registreeritud · kaart", "Maksepakett" |
| a | Summa | 112, right | signed amount; reversed = `.num.mut` |
| s | Staatus | 118 | tag |

Auto-hide order: `src` → `dir`.
Status tags: draft `Mustand` (pend style), posted `Konteeritud` (ok), reversed / cancelled `Tühistatud` (void).
tfoot: hint "↑↓ liigu · Enter konteeri mustand", ghost `Ekspordi Excel`.

> **Backend:** `src` needs a field on `PaymentListItem`, e.g. `source: 'bank_import' | 'manual' | 'payment_batch' | 'card_settlement'`
> plus `bank_account_name` and `payment_method_name`. Until then, hide the column.

### Detail panel
**Header**: `h2` partner · line "Sissetulev · 10.07.2026 · Swedbank põhikonto" · amount right
(17px/700, signed, coloured) · row 2 = status tag + `↑` `↓`.

**Seotud arve** (link right: `Kõik selle arve maksed`, which sets the invoice chip):
- 3-cell strip `Arve kokku` · `Tasutud` · `Avatud` (Avatud in `--pos` when 0) + 5px progress bar.
- kv: `Arve` (link "Müügiarve 25833 ↗" → `/invoices/{id}/preview`) · `Arve olek` (translated) ·
  `Tähtaeg` (+ "· makstud N p hiljem" in `--warn` if paid after due) · `Viitenumber` · `Selgitus`.

**Kanne** (link right: entry number `MK-3410 ↗` → journal entry):
- D/K table `minmax(0,1fr) 88px 88px`. Incoming: D bank account / C 1210. Outgoing: D 2110 / C bank.
- Draft: `note mut` "Kanne luuakse konteerimisel. Eelvaade:" + the table at 60% opacity.
- Reversed: second block "Tühistav kanne" (swapped D/K, link to reversal entry) + `note bad`
  "<reason>. Arve on uuesti avatud summas X €."

> **Backend:** expose `journal_entry_number`, `reversal_journal_entry_number` and the journal lines
> (or fetch them via the journal API). Never show the UUID.

**Ajalugu**: timeline (`76px date · bullet · text`): bank date → imported / posted by user → reversed + reason.

**Action bar** (pinned):
| status | left hint | buttons |
|---|---|---|
| draft | "Konteerimisel märgitakse arve tasutuks" (or "osaliselt tasutuks") | `Seo teise arvega` · primary `Konteeri` `kbd Enter` |
| posted | "Tühistamine loob vastupidise kande ja avab arve uuesti" | danger `Tühista makse` |
| posted, reversing | — | inline input "Tühistamise põhjus (nähtav kandes)" · `Loobu` · danger `Tühista` (Enter submits) |
| reversed | "Tühistatud dd.mm.yyyy · <reason>" | — |

Toasts: "Makse konteeritud · MK-3411", "Makse tühistatud · arve avatud".
`Seo teise arvega` reuses the bank review candidate picker (out of scope, so keep the button and wire it later).

---

## 2. Maksepaketid
### Where batches come from
A batch has one of three **origins**. The list, filter and detail treat them the same way. Only the
source link and the editing rules differ.

| origin | created from | API today | lines |
|---|---|---|---|
| `purchase_invoices` | Ostuarved → tick invoices → **Koosta maksekorraldus** (`PurchaseInvoiceWorkspace.tsx`), or the **Uus maksepakett** modal on this page | `bankingApi.createPaymentBatch` | one per invoice (or per `transfer_group` when grouped by payee) |
| `payroll` | Palk → run → **Loo maksepakett** (`payroll/runs/[id]/page.tsx`, `include_taxes` checkbox) | `payrollApi.createPaymentBatch(runId, …)`; run stores `payment_batch_id` | one per employee net salary + optionally one to Maksu- ja Tolliamet (taxes) |
| `manual` | Uus maksepakett modal with only manual lines | `bankingApi.createPaymentBatch` | free lines with `counterpart_account_id` |

> **Backend (required):** `PaymentBatchListItem` has no origin today. Add
> `origin: 'purchase_invoices' | 'payroll' | 'manual'` and, for payroll,
> `payroll_run_id` + `payroll_run_label` ("Palgaarvestus 09/2026"). Set it in both create endpoints.
> Backfill: batches referenced by `payroll_runs.payment_batch_id` → `payroll`, batches with any
> `invoice_id` line → `purchase_invoices`, the rest → `manual`. Also add `origin` to the
> `listPaymentBatches` filter params.

### Title row
Metrics: `Maksmisele` (open balance of payable purchase invoices) · `Pangas ootel` (sum of
generated/uploaded/sent, `--warn`) · `Täidetud 30 p` (`--pos`). Action: primary
`Uus maksepakett` `kbd N` (shortcut `N`).

### Filter row
- Tabs: `Pooleli` (draft, generated, uploaded, sent, rejected; **default**) · `Täidetud` · `Tühistatud` · `Kõik`.
- Segment **Allikas**: `Kõik allikad` · `Ostuarved` · `Palk` · `Käsitsi`.
- `Konto: kõik` picker (bank account).
- Search: "Otsi paketti või saajat  /" (matches batch name, bank account, payee names).

### Status labels
| backend | label | tag |
|---|---|---|
| draft | Mustand | draft |
| generated | Fail loodud | info (`--info-soft`/`--info`) |
| uploaded | Panka üles laaditud | pend |
| sent / submitted | Saadetud panka | pend |
| confirmed | Täidetud | ok |
| `bank_status = rejected` (any status) | Pank keeldus | bad |
| voided | Tühistatud | void |

### List
- listhead "**N paketti**" · right "Kokku **X €**".
- warnstrip when any batch is rejected: "Pank lükkas tagasi paketi „<name>“ · <bank_status_reason>" + primary `Ava pakett`.

| id | label | width | content |
|---|---|---|---|
| n | Pakett | `minmax(200px,1.6fr)` | name 600; sub-line "Ostuarvetest · Kadri Tamm · loodud 07.10.2026" (Palgast / Käsitsi) |
| o | Allikas | 96 | `.otag`: 11px icon + `Ostuarved` (file icon `--info`) / `Palk` (person icon `#6b3fc4`) / `Käsitsi` (plus icon) |
| bk | Pangakonto | `minmax(130px,1fr)` | bank account name |
| ex | Täitmine | 90 | execution date |
| ln | Ridu | 52, right | line count |
| a | Summa | 112, right | total |
| s | Staatus | 150 | tag |

Auto-hide order: `bk` → `ln` → `o` (the origin stays in the sub-line, which compact mode hides, so `o` goes last).
tfoot: "↑↓ liigu · N uus pakett" · right "14 ostuarvet ootab maksmist · koosta pakett" (link opens the modal).

### Detail panel
**Header**: `h2` name · line "Swedbank põhikonto · EE38 … 5685 · täitmine 08.10.2026" · total right ·
status tag + `↑` `↓`.

**Steps** (4 equal columns, 4px bars): `Mustand` → `Fail loodud` → `Pangas` → `Täidetud`.
Past steps `--pos`, current `--accent`, rejected = 3rd step `--neg` labelled `Tagasi lükatud`, voided = all grey.

**Status note** under the steps (`.note`):
- sent + accepted, `ok`: "Pank võttis vastu dd.mm.yyyy hh:mm · LHV Connect. Täidetuks märgitakse automaatselt, kui väljavõttel on read olemas."
- uploaded, `warn`: "Fail laaditi internetipanka käsitsi üles. Kinnita täidetuks, kui pank on maksed teinud – siis luuakse N makset."
- rejected, `bad`: "**Pank keeldus dd.mm.yyyy.** <bank_status_reason>"
- confirmed, `ok`: "Täidetud dd.mm.yyyy · N makset loodi ja seoti arvetega. Vaata maksetes" (link → Maksed tab)
- voided, `mut`: "Tühistatud · <reason>"
- draft + payroll, `mut`: "Read tulevad palgaarvestusest. Summa muutmiseks paranda palgaarvestust ja koosta pakett uuesti."
- draft + warnings, `warn`: "N real on hoiatus. Kontrolli enne panka saatmist."

**Andmed** kv:
- `Allikas`: purchase → link "Ostuarved · N arvet ↗" (opens Ostuarved filtered to this batch's
  invoices); payroll → link "Palgaarvestus 09/2026 ↗" (→ `/payroll/runs/{payroll_run_id}`); manual → "Koostatud siin".
- `Pangakonto` (full IBAN, grouped by 4) · `Ühendus` (LHV Connect / Swedbank Gateway, from
  `submitted_via` or the bank account's integration) · `Faili vorming` (`exported_file_format`, or
  grey "luuakse saatmisel") · `Koostas` (`created_by_email` → name · date).

**Read · N** (link `Muuda` only on editable drafts), table `minmax(0,1.3fr) minmax(0,1fr) 92px`:
- Saaja: `payee_name` + sub-line IBAN shortened `EE38 … 5685`.
- Arve · viide: purchase → invoice nr link; payroll → `Töötasu` (employee lines) / `Tööjõumaksud`
  (MTA line); manual → grey "Käsirida · 2310 KM võlg". Sub-line: reference, or the first
  `warning_flag` in `#7d5a13`, or the description.
- Summa + sub-line line status tag (`Makstud` / `Tagasi`).
- A row with warnings or `status = rejected` gets `background:#fffaf0`.
- Total row: "N rida · Kokku X €".

> **Payroll privacy:** employee net salaries are visible here. Show payroll batch lines only to users
> with payroll permission. Others see the batch, total and status, with the lines replaced by
> "N töötajat · read nähtavad palgaõigusega".

**Action bar.** Only allowed actions are rendered, never disabled buttons. `⋯` (ghost, left) opens a menu above the bar.
| status | right side | `⋯` menu |
|---|---|---|
| draft | `Lae alla ▾` (menu: `pain.001 XML` "Laadi internetipanka üles", `CSV` "Tabelina ülevaatamiseks") · primary `Saada panka` | `Muuda ridu` (payroll: `Ava palgaarvestus`) · `Vaata faili` · — · danger `Tühista pakett` |
| generated | `Märgi üles laaditud` · primary `Saada panka` | `Vaata faili` · `Lae alla uuesti` · — · `Tühista pakett` |
| uploaded / sent | primary `Kinnita täidetuks` | `Vaata faili` · — · `Tühista pakett` |
| rejected | primary `Paranda ja koosta uuesti` (payroll: `Paranda palgaarvestuses`) | `Vaata faili` · — · `Tühista pakett` |
| confirmed | — | `Vaata faili` |
| voided | — | — |

Mapping: `Saada panka` → `submitPaymentBatchToBank`; `Lae alla` pain.001 → `generatePaymentBatchPain001`
(draft → generated) then download; CSV → `generatePaymentBatch`; `Märgi üles laaditud` →
`confirmPaymentBatchUploaded`; `Kinnita täidetuks` → `confirmPaymentBatchExecuted` (toast "N makset
loodud ja seotud arvetega"); `Paranda ja koosta uuesti` → open the Uus maksepakett modal pre-filled with
the same lines and the failing line flagged.

**Origin rules**
- Payroll batches are **not editable** here (lines come from the run). `Muuda ridu` becomes
  `Ava palgaarvestus`. Voiding a payroll batch clears `payroll_runs.payment_batch_id` so the run can
  be sent again (toast "Palgaarvestus 09/2026 vabanes uue paketi jaoks").
- Purchase-invoice batches: voiding frees the invoices (the `MP` chip disappears in Ostuarved).
- Confirming a payroll batch creates payments against 2410 / 2330, not invoices. The "Vaata maksetes" link still applies.

**Tühista pakett** modal (460px): title "Tühista „<name>“?", meta "N rida · X €. Arved vabanevad
uuesti maksmiseks." (payroll: "Palgaarvestuse saab seejärel uuesti panka saata."), `Põhjus` input,
`warn` note for sent/uploaded: "Pakett on juba pangas. Tühista see kindlasti ka internetipangas."
Buttons: `Loobu` · danger `Tühista pakett`.

**Vaata faili** modal: title `<name>.xml`, meta "pain.001.001.09 · N makset · X €", `<pre>` of
`exported_file_content` (11px mono, `--row-alt`), footer `Sulge` · primary `Lae alla`.

### Uus maksepakett modal
Same modal shell (`min(880px,100%)`, `max-height:86vh`, scrolling body, pinned footer).
- Header: "Uus maksepakett" · "Vali makstavad ostuarved. Summad, saaja ja viitenumber tulevad arvelt."
- Fields `1.6fr 1.2fr .8fr`: `Pangakonto` (select "Swedbank põhikonto · EE38 … 5685") · `Nimi`
  (default "Ostuarved nädal NN") · `Täitmise kuupäev` (default tomorrow). Currency stays EUR and is not shown.
- Table `22px minmax(0,1.3fr) 190px 150px 70px 96px`, sticky header: ☐ (select all eligible) · Saaja
  · arve (sub-line "AR-4411 · Kinnitatud") · IBAN (or `IBAN puudub` in `#7d5a13`) · Tähtaeg (late:
  `--neg` 600 + "+N p") · Viide (✓ `--pos` or `puudub`) · Tasumata.
- Source rows: purchase invoices in approved / payable / partially_paid, sorted by due date.
- **Preselected**: due ≤ today + 7 and IBAN present. **Disabled** (55% opacity, reason in sub-line):
  no IBAN, or already in an open batch ("juba paketis „Ostuarved nädal 41“", from `listOpenPaymentBatchLines`).
- `+ Lisa käsirida (maks, palk, rent)` appends an editable row: payee · IBAN · counter-account select · amount.
- Prefill (`getPaymentBatchPrefillLines`) runs in the background when the selection changes. **There is no separate "Täida read" step.**
- Footer: "Valitud **N** · **X €**" · warning summary "N ilma viitenumbrita – kasutatakse selgitust"
  · `Loobu` · `Salvesta mustandina` · primary `Loo ja saada panka`.
- Payroll batches are **not** created here. They come from the payroll run.

---

## Files
- `Maksed - tihe vaade.html`, `maksed-app.js`, `maksed-data.js`: **the design to build.**
- `PAYMENTS_HARMONIZATION.md`: short Estonian summary + acceptance criteria.
- Repo: `app/(dashboard)/accounting/payments/page.tsx`, `app/(dashboard)/accounting/payment-batches/page.tsx`,
  `lib/api/payments.api.ts`, `lib/api/banking.api.ts` (`PaymentBatch*`), `lib/api/payroll.api.ts`
  (`createPaymentBatch`, `payment_batch_id`), `app/(dashboard)/payroll/runs/[id]/page.tsx`,
  `components/invoices/PurchaseInvoiceWorkspace.tsx` (purchase → batch), `components/invoices/RegisterPaymentDialog.tsx`.

## Acceptance
- [ ] No hard-coded Tailwind colour classes in either page; `--a-*` tokens only.
- [ ] All statuses, directions and origins are translated.
- [ ] Journal entries are shown by number and link to the ledger.
- [ ] 1536×730: title + filters take 2 rows, ≥ 14 list rows visible, no horizontal scroll, action bar visible without scrolling.
- [ ] Batch detail renders only status-allowed actions; payroll batches show the run link and are not editable.
- [ ] Batch origin is visible in the list and filterable; batches made from Ostuarved and Palk appear here immediately.
- [ ] A batch can be created in one modal without a separate prefill step.
