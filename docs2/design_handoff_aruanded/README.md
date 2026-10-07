# Handoff: Aruanded (reports) — one shell, own rail, search, drill panel, saved views, print

## Overview
The report pages under `app/(dashboard)/reports/*` each have their own header, filter card, buttons and
table style. Some use the old `--text-primary` / `.card` variables and some use `--a-*`. This redesign gives
every report **one shell** with the same visual language as Ostuarved / Maksed
(`design_handoff_purchase_invoices/`, `design_handoff_maksed/`). Read those first: tokens, metrics,
`.perbtn`, `.seg`, panel gutter, `note`, `kv` and compact mode are identical.

The prototype builds **4 reports** completely: Kasumiaruanne, Bilanss, Aegumisaruanne, Kulukohad ja
projektid. The other 6 appear in the rail greyed out. They get the same shell in a follow-up.

UI language is **Estonian**. All copy in the prototype is final — reuse it verbatim (`i18n/messages/et.json`, `reports.*`).

## About the design files
`Aruanded - ühtne vaade.html` + `aruanded-app.js` + `aruanded-data.js` are a **design reference**, not
production code. Recreate them in Next.js + React + TS + `next-intl`. The data generator, the period
"factor" scaling, the `ledger()` generator and the `toast()` stubs are scaffolding. The dark icon sidebar
in the prototype only illustrates the collapsed state. **Do not restyle the real `Sidebar.tsx`**; see
`SIDEBAR_AUTO_COLLAPSE.md` §7.

## Fidelity
High-fidelity. Values below come from the prototype CSS. Unlisted values = purchase-invoice handoff.

---

## 1. Navigation (decided)
- **Main sidebar:** the `reports` group becomes **one link** "Aruanded" → `/reports`, with no children
  and no chevron. It is active on all `/reports/*` routes. It has no hover flyout in the icon rail.
- `/reports` redirects to the last opened report (`localStorage arvelo.reports.last`) or `/reports/profit-loss`.
- `/reports/*` is a task route, so the sidebar **auto-collapses to the `w-16` icon rail** (existing
  mechanism). If the user turned auto-collapse off, the sidebar stays wide. That is fine because there is no duplicate list anymore.
- Rule for the whole portal (documented in `SIDEBAR_AUTO_COLLAPSE.md` §7): a module with **> 5 subpages**
  gets its own rail and a single sidebar link.

## 2. Shell layout
```
[sidebar w-16] [report rail 206px] [ main: topbar · filter row · body (report card | 9px gutter | drill panel) ]
```
- Page padding 12px 16px, gap 9px (compact: 8px 12px / 6px). Rail 206px (compact 184px). Main `min-width:880px`.
- Shared component suggestion: `components/reports/ReportShell.tsx` (rail + topbar + filter slot + body),
  `ReportTable.tsx` (row model below), `ReportDrillPanel.tsx`, `PeriodPicker.tsx`, `CompareMenu.tsx`,
  `SavedViews.ts`, `PrintSheet.tsx`. Every report page then only supplies a `build()` → row model + a drill renderer.

### 2.1 Report rail (`.rail`, card)
- Header 41px "Aruanded" (15px/700).
- **Search** (`.rsearch`): 29px input, placeholder "Otsi aruannet", 13px search icon left, `kbd /` right
  (hidden while focused). Margin 8px 8px 2px.
  - Matches report name, group name **and keywords**, diacritic-insensitive (`normalize('NFD')`, strip
    combining marks). Keywords per report:
    `pl` kasum kahjum tulud kulud · `bs` bilanss varad kohustised omakapital · `tb` proovibilanss saldod ·
    `to` käibeandmik käive deebet kreedit · `gl` pearaamat konto kanded · `kmd` kmd käibemaks km inf deklaratsioon emta ·
    `aging` aegumine võlg võlgnevused laekumata ostjad tarnijad tähtaeg · `ps` partner kontokaart väljavõte saldokinnitus ·
    `dim` kulukoht projekt dimensioon tulem marginaal · `ar` majandusaasta aruanne aastaaruanne.
  - Also searches saved view names.
  - The matched substring is wrapped in `<mark>` (`--accent-soft` bg, 2px radius). Groups with no hits disappear.
  - The keyboard-highlighted item has `box-shadow: inset 0 0 0 1px var(--accent)`.
  - No results: "Aruannet „<q>“ ei leitud" (12px `--text-3`).
  - Keys: `/` focuses (when no input has focus), `↑/↓` move, `Enter` opens and clears, `Esc` clears + blurs.
- Groups (9.5px/700 uppercase, `--text-3`) and items. **Names = existing sidebar names, in this order:**
  - **Finants:** Kasumiaruanne · Bilanss
  - **Raamat:** Proovibilanss · Käibeandmik · Pearaamat
  - **Maksud:** KMD aruanne
  - **Partnerid:** Aegumisaruanne · Partneri kontokaart
  - **Juhtimine:** Kulukohad ja projektid · Majandusaasta aruanne
- Item: 28px, 12.5px/500 `--text-2`, radius 7px; hover `--surface-2`; active `--accent-soft` / `#b8330f` 600.
- **Salvestatud vaated** group below: each item is two lines (name 12px + 10.5px "<report> · kõigile | ainult mina",
  ellipsis). An active view uses the same active style.
- Footer 11px `--text-3`: "<company> · aruandeaasta 2026".

### 2.2 Top bar (29px)
- `h1` = report name, or the saved view name when a view is active. `sub` (12px `--text-3`): "seisuga 07.10.2026",
  or the period range. With a view: "<report> · <period>". Hidden < 1320px.
- **Metrics** (max 3, third hides < 1440px):
  - Kasumiaruanne: `Tulud` · `Kulud` · `Kasum` (`--pos` / `--neg`)
  - Bilanss: `Varad` · `Kohustised` · `Omakapital`
  - Aegumisaruanne: `Avatud` · `Üle tähtaja` (`--warn`) · `Üle 90 p` (`--neg`)
  - Kulukohad ja projektid: `Tulud` · `Kulud` · `Tulem`
- Actions: `★ Salvesta vaade` (`★ Vaade` when a view is active) · `Prindi` · `Ekspordi ▾`.
  - Export menu: `Excel (.xlsx)` "Valemid ja vahesummad säilivad" · `CSV` "Ainult read, ilma vormindamiseta" ·
    `PDF` "Sama mis prindivaade" (opens the print view).

### 2.3 Filter row (36px)
In order:
1. **Period button** (`.perbtn` + calendar icon). As-of reports: "Seisuga **Täna**", range reports:
   "Periood **Aasta algusest**". The popover (300px) has presets in a 2-col grid plus custom date inputs (`pp.kk.aaaa`) and `Rakenda`.
   - As-of presets: Täna · Eelmise kuu lõpp · Eelmise kvartali lõpp · Eelmise aasta lõpp.
   - Range presets: Aasta algusest · Jooksev kuu · Eelmine kuu · Jooksev kvartal · Eelmine kvartal · Eelmine aasta.
   - The preset's real dates go in `title` and in the footer hint. Fiscal-year aware: "Aasta algusest" = fiscal year start.
2. **Võrdlus** button (Bilanss, Kasumiaruanne). Off: "Võrdlus". On (`.perbtn.on`, accent): "vs **31.12.2025**". The menu (250px) has a date sub-line per option:
   - Bilanss: Võrdlus puudub · Eelmise aasta lõpp · Sama kuupäev eelmisel aastal · Kohandatud kuupäev…
   - Kasumiaruanne: Võrdlus puudub · Sama periood eelmisel aastal · Eelmine periood (same length, immediately before) · Kohandatud periood…
   - Default: Bilanss = Eelmise aasta lõpp, Kasumiaruanne = Sama periood eelmisel aastal.
3. Report-specific:
   - Bilanss / Kasumiaruanne: checkbox "Näita nullsaldoga kontosid" (default off; rows where both values are 0 are hidden).
   - Aegumisaruanne: segment `Ostjad | Tarnijad` + checkbox "Ainult üle tähtaja".
   - Kulukohad ja projektid: segment `Projektid | Kulukohad`. For projects also `Kõik | Pooleli | Lõpetatud`
     (`project_status`). Checkbox "Kaasa mustandarved" (`include_drafts`).
4. When a saved view is active and the filters differ from it, the right side shows "Vaade muudetud · **Salvesta** · **Taasta**" (11px).

Only **one** popover or menu is open at a time. An outside click or `Esc` closes it.

---

## 3. Report table (one row model for screen, print and export)
`build()` returns `{ cols, rows, … }`:
- `cols`: `{ l: label, n?: numeric, w?: width, pct?: percent }`. The first column is `minmax(240px,1fr)` and numeric columns default to `128px`.
- `rows`: `{ t: 'sec'|'grp'|'ln'|'tot'|'gr'|'res', key, c?: code, n: name, v: number[], zero?: bool, … }`

| type | use | style |
|---|---|---|
| `sec` | top section ("Varad", "Kohustised ja omakapital") | `--row-alt` bg, 10px/700 uppercase .1em `--text-2`, bottom border |
| `grp` | group heading ("Käibevara") | 600 `--text`, padding-top 8px, no values |
| `ln` | account / partner / dimension line | 12.5px; first cell indented 16px; code 11.5px `--text-3` 34px wide; **clickable** (hover `--accent-soft-2`, selected `--accent-soft` + inset 2px accent bar) |
| `tot` | group subtotal ("Käibevara kokku") | 600, top border `--border-strong` |
| `gr` | grand total ("Varad kokku", "Kokku") | 700 13px, top border **1.5px `--text`**, `--row-alt` bg, padding 8px 0 |
| `res` | P&L result lines ("Ärikasum (-kahjum)") | 700 13px, `--surface-2` bg, top border 1.5px `--text`, padding 9px 0 |

- Sticky header 32px `--surface-2`, 9.5px/700 uppercase.
- Numbers: et-EE, 2 decimals, tabular-nums, **no € in cells** (the listhead says "Summad eurodes").
  Negative = `−` (U+2212). Zero = `–` in `--text-3`.
- Comparison adds `Võrdlus` (header = compare date), `Muutus` and `%` (64px). The % cell is `--pos` if > 0, `--neg` if < 0,
  "+12,4%" with 1 decimal, and `–` when the base is 0. **Do not colour Muutus.** Whether up is good depends on the account type.
- **Column auto-hide** on narrow widths: drop `%` first, then `Muutus`. Measure the card width minus the scrollbar (~14px)
  and observe the card with `ResizeObserver`. Never scroll horizontally at ≥ 880px main width.
- Listhead (33px) per report:
  - Bilanss / Kasumiaruanne: "**Bilanss** · seisuga … · võrdlus …" + right "Klõps kontol avab pearaamatu · Summad eurodes"
  - Aegumisaruanne: "**N partnerit**" + an 8px stacked **bucket bar** (max 420px) + legend dots + "Summad eurodes"
  - Kulukohad ja projektid: "**N projekti** · pearaamatu kannete dimensioonidest" + right "sh mustandid: tulud X €, kulud Y €" (`#7d5a13`, only with drafts)

### 3.1 Kasumiaruanne (`/reports/profit-loss`, `reportsApi.getProfitLoss(start,end,compare)`)
Estonian schema 1 grouping. Revenue is positive and expenses are **negative**:
Müügitulu · Muud äritulud · Kaubad, toore, materjal ja teenused · Mitmesugused tegevuskulud · Tööjõukulud ·
Põhivara kulum → **res** "Ärikasum (-kahjum)" → Finantstulud ja -kulud → **res** "Kasum (kahjum) enne tulumaksu" →
Tulumaks → **res** "Aruandeaasta kasum (kahjum)". Groups with > 1 line get a `tot` row "<group> kokku".
> **Backend:** `ProfitLossLine` needs a `report_group` (schema line key) so the frontend can group. Today only revenue/expenses exist.

### 3.2 Bilanss (`/reports/balance-sheet`, `getBalanceSheet(asOf, compareAsOf)`)
`sec` Varad → groups Käibevara / Põhivara (each `grp` + lines + `tot`) → `gr` "Varad kokku".
`sec` Kohustised ja omakapital → Lühiajalised / Pikaajalised kohustised → `tot` "Kohustised kokku" →
Omakapital (`special` lines get the suffix " (arvutuslik)") → `gr` "Kohustised ja omakapital kokku".
**Balance check** bar under the table (`.check`, 11.5px): ✓ "Bilanss on tasakaalus: varad = kohustised + omakapital"
or ⚠ in `--neg` "Bilanss ei ole tasakaalus · vahe X €". Right side: "Aruandeaasta kasum tuleb kasumiaruandest · ava".
> **Backend:** needs a `report_group` (käibevara/põhivara/lühiajalised/pikaajalised) on `BalanceSheetLine`.

### 3.3 Aegumisaruanne (`/reports/aging`, `getAgingReport(direction, asOf)`)
Columns: Ostja / Tarnija · Tähtaeg ees (112) · 1–30 p · 31–60 p · 61–90 p · Üle 90 p (104 each) · Kokku (120).
The partner name is 600 + small "N arvet". Bucket colours (cells > 0 and the bar): `--b0 #0e7b5a` · `--b1 #c99a2e` ·
`--b2 #d9732b` · `--b3 #c0392b` · `--b4 #7f1d1d`. Sorted by total desc. `gr` "Kokku".
"Ainult üle tähtaja" hides partners whose total equals the current bucket.

### 3.4 Kulukohad ja projektid (`/reports/dimensions`, `getDimensionReport`)
Columns: Projekt / Kulukoht (code 44px mono + name + small partner + status tag `Pooleli` info / `Lõpetatud dd.mm` ok) ·
Tulud · Kulud (negative) · Tulem (`--neg` if < 0) · Marginaal (84px, %) · Lõpetamata tööd (projects only, `wip_balance`).
With drafts, add `draft_revenue` / `draft_costs` to the values. `gr` "Kokku".

---

## 4. Drill panel (row click)
Same panel shell as Maksed: 9px gutter, default width 400px (min 340, main ≥ 620), `dhead` / scrolling `dbody` / pinned `dfoot`.
When nothing is selected the panel and gutter are **`display:none`**, not just empty. Clicking the same row again closes it.
`Esc` closes, and `↑/↓` move to the next/previous visible `ln` row (the list scrolls to keep it in view).

| report | header | content | footer |
|---|---|---|---|
| Bilanss / Kasumiaruanne | `h2` "<code> <name>" · line "Pearaamat · <period> · <group>" · ✕ | 4-cell strip Algsaldo · Deebet · Kreedit · Lõppsaldo; **Kanded · N** (link "Ava pearaamatus ↗") with table `66px 1fr 74px 74px 80px` = Kuupäev · Dokument (link + description sub-line) · Deebet · Kreedit · Saldo, plus Algsaldo / Lõppsaldo rows (`--row-alt`, 600) | hint "↑↓ järgmine konto · Esc sulgeb" · `Ava pearaamatus` |
| Aegumisaruanne | partner · "Ostja · seisuga … · N avatud arvet" | 3-cell strip Avatud · Üle tähtaja (`--warn`) · Vanim (N p, `--neg` > 90); **Avatud arved** table Arve (link + date) · Tähtaeg · Üle (bucket colour) · Avatud | `Partneri kontokaart` · primary `Saada meeldetuletus` (receivables, overdue > 0) / `Lisa maksepaketti` (payables, overdue > 0) |
| Kulukohad ja projektid | "<code> <name>" · "partner · period · pooleli / lõpetatud dd.mm.yyyy" | strip Tulud · Kulud · Tulem (· Lõpet. tööd); drafts note; **Kontode kaupa** (`by_account`, Tulud / Kulud sub-headers); **Dokumendid · N** (`lines`: date · invoice link + partner · ±amount) | `Ava pearaamatus` |

Data: account drill → `reportsApi.getGeneralLedger(accountId, start, end)`. For Bilanss, start = fiscal year start
(or the opening balance up to the as-of date). Aging uses `partner.invoices` (already in the response). Dimensions use `by_account` + `lines`.
> **Backend:** `BalanceSheetLine` / `ProfitLossLine` need `account_id` for the drill call.
"Ava pearaamatus" → `/reports/general-ledger?account_id=…&start_date=…&end_date=…` (existing params).
"Lisa maksepaketti" → Maksepaketid modal with those invoices preselected.

---

## 5. Saved views
- Stored: `{ id, name, report, filters (period preset or dates, compare, toggles, segments), shared, owner }`.
- Saving does not store data, only filters. Relative presets stay relative ("Eelmise kuu lõpp" moves each month).
- `★ Salvesta vaade` popover (270px): "Uus vaade" · name input (placeholder "nt Kuu lõpu bilanss") · checkbox
  "Näita kõigile kasutajatele" · hint "Salvestab perioodi, võrdluse ja filtrid" · `Salvesta` (Enter).
- With an active view: name editable, `Kustuta` (danger ghost) · `Salvesta muudatused`.
- Opening a view sets the report + filters and makes the view active in the rail. The title shows the view name.
- Persistence: personal views can start in localStorage (`arvelo.reports.views`), but **shared views need an API**,
  e.g. `GET/POST/PUT/DELETE /api/report-views` (company-scoped, `shared` flag, `owner_user_id`). Build the API.
- Prototype defaults (seed examples only): "Kvartali bilanss" (Bilanss, Eelmise kvartali lõpp vs sama kuupäev eelmisel aastal, kõigile),
  "Ostjad üle tähtaja" (Aegumisaruanne, ostjad, ainult üle tähtaja), "Pooleli projektid + mustandid".

## 6. Print view (`Prindi`, `Ekspordi → PDF`, `Ctrl/⌘+P`)
- Full-screen overlay: bar 46px with "Prindivaade · <report> · A4", checkboxes `Kontokoodid` and `Allkirjaväljad`
  (Bilanss/Kasumiaruanne, default on) · `Sulge` `kbd Esc` · primary `Prindi / salvesta PDF` (`window.print()`).
- Sheet 794px (A4 @96dpi), padding 56/60/48:
  - company block (name 13px bold, registrikood, KMKR, address) left; "Koostatud dd.mm.yyyy · <user>" right; 1.5px black rule.
  - `h2` 20px report title (+ " · ostjad" / " · projektid") · line "Seisuga … / Periood … · võrdlus … · summad eurodes".
  - Table from the **same row model**. sec 8.5px uppercase; grp 600; ln indented 16px; tot 600 + top rule; gr/res 700 with 1.5px top/bottom rules.
    Zero rows follow the screen toggle.
  - Signature lines "Juhatuse liige" / "Raamatupidaja" (2 cols, gap 40px).
  - Footer "Arvelo · <company>" / "lk N / M".
- `@media print`: hide everything except the sheet, no shadow, auto width. Long reports must paginate:
  repeat `thead`, avoid breaking inside `tot`/`gr`/`res`. Implement on `<doc-page>`-like print CSS or the existing print util.

## 7. Excel export
- `.xlsx` mirrors the row model: one sheet named after the report. Rows 1–3 hold company / report / period.
  Header row bold, `sec`/`grp` bold, numeric cells as **numbers** with `#,##0.00` format (not strings),
  `tot`/`gr`/`res` as **SUM formulas** over their lines, so edits in Excel recalc. Freeze panes below the header.
- Filename: `<report-slug>_<period>.xlsx`, e.g. `bilanss_2026-10-07.xlsx`.
- CSV stays as today (`downloadCsv`), with lines only.
- Library: `exceljs` client-side, or a backend endpoint if one is preferred. Pick one and use it for all reports.

## 8. Remove from current pages
- Centered in-card report title blocks ("BILANSS / seisuga…") → the topbar shows it.
- The big filter `card` with labelled inputs → the filter row.
- `formatCurrency` with € on every cell, `toUpperCase()` section titles, 3px black total borders, `#eab308`-style hex colours.
- Per-page `SummaryCard`s (Aegumisaruanne has 6) → 3 metrics + bucket bar.
- Mobile card variants can stay, using the same row model below `sm`.

## 9. Keyboard
`/` report search · `↑/↓` in the search results or the drill panel · `Enter` open · `Esc` popover → drill → search ·
`Ctrl/⌘+P` print view.

## 10. Acceptance
- [ ] Sidebar has a single "Aruanded" link and the report rail is the only report navigation.
- [ ] All 4 reports use `ReportShell` + `ReportTable` with the row types above. No report-specific header/filter markup remains.
- [ ] No `--text-primary`, `--surface-elevated`, `.card p-8` or hex colours in report pages; `--a-*` tokens only.
- [ ] Search finds "käibemaks" → KMD aruanne, "kaibeandmik" → Käibeandmik, and saved views by name.
- [ ] Row click opens the drill panel; ↑/↓ moves; the panel is hidden when nothing is selected.
- [ ] Saved views: create, update, delete, share. A shared view appears for another user.
- [ ] Print view: A4, multi-page with repeated header, toggles work.
- [ ] Excel: numbers are numeric, totals are formulas.
- [ ] 1536×730: no horizontal scroll, ≥ 18 rows visible on Bilanss.

## Files
- `Aruanded - ühtne vaade.html`, `aruanded-app.js`, `aruanded-data.js`: **the design to build.**
- `SIDEBAR_AUTO_COLLAPSE.md` §7: the sidebar change.
- Repo: `app/(dashboard)/reports/{profit-loss,balance-sheet,aging,dimensions,general-ledger}/page.tsx`,
  `lib/api/reports.api.ts`, `components/layout/Sidebar.tsx`, `lib/stores/sidebar.store.ts`, `lib/utils/csvExport.ts`.
