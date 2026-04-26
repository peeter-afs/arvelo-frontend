# List screens — Tooted, Kliendid, Tellimused, Ülesanded

These four screens share the same shape: a filter bar, a table, an optional side detail panel. This spec covers all four together to enforce consistency.

References: images 2, 3, 5, 6 (current state).

---

## 1. Shared layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tooted                                                  [Uus toode]     │  ← page header
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─ Card ──────────────────────────────────────────────────────────────┐│
│ │ [🔍 Otsi tooteid…]    [Bränd ▾] [Kategooria ▾] [Tarnija ▾] [Filter]││  ← filter bar
│ │ [☐ Ainult laos]  Hind: [min]–[max]                                  ││
│ ├─────────────────────────────────────────────────────────────────────┤│
│ │ NIMI ↑     KOOD     TÜÜP        HIND       TEGEVUS                  ││  ← table header
│ │ ─────────────────────────────────────────────────────────────────── ││
│ │ 09         0999     Masin       9,00 €        ⋯                      ││
│ │ 1          55       Masin      68,00 €        ⋯                      ││  ← rows
│ │ ...                                                                  ││
│ │                                                                      ││
│ │ Lehekülg 1/3 · 47 toodet                  [‹ Eelmine] [Järgmine ›] ││  ← pagination
│ └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

When a row is clicked, the side detail panel (system §4.6) slides in from the right at 400px wide, covering the rightmost portion of the table. On screens ≥1600px, the table simply shrinks; below that, the panel overlays.

---

## 2. Per-screen specifics

### 2.1 Tooted (Products)

**Page header**
- Title: **Tooted**
- Right action: **Uus toode** (primary)

**Tabs** (currently "Tooted / Jagatud kataloog")
- Use the §4.9 underline tabs, directly below header, above the filter bar.
- Estonian labels: **Minu tooted** / **Jagatud kataloog**.

**Filter bar**
- Search: "Otsi nime või koodi järgi…"
- Filters: **Bränd**, **Kategooria**, **Tarnija** (dropdowns with multiselect)
- Range: **Hind**: two number inputs separated by an en-dash
- Toggle: **Ainult laos** as a switch, not a checkbox

Replace the current "Muuda veerge / Peida täpsemad filtrid / Tühjenda" button row with:
- "Tühjenda" → small `Ghost` link, only visible when filters are active, right-aligned in the filter bar
- "Muuda veerge" → moves to a `⋯` menu next to the table header
- "Peida täpsemad filtrid" → not needed; filters live in a single bar that wraps cleanly

**Columns**
| Column      | Width | Align | Notes                          |
|-------------|-------|-------|--------------------------------|
| Nimi        | flex  | left  | sortable, default sort         |
| Kood        | 120px | left  | tertiary if empty (`—`)        |
| Tüübikood   | 120px | left  | tertiary if empty              |
| Tüüp        | 100px | left  | sortable                       |
| Hind        | 120px | right | sortable, formatted "9,00 €"   |
| ⋯           | 48px  | center| row actions menu               |

Detail panel uses the existing **Andmed / Varustus / Statistika** tabs, but:
- "Andmed" → **Üldandmed**
- "Varustus" → **Laoseis**
- "Statistika" stays
- Field labels become uppercase tertiary (system §4.3).
- "Puudub" displays for empty fields stay, but consider `—` em-dash for visual consistency with the table.

### 2.2 Kliendid (Customers)

**Page header**
- Title: **Kliendid**
- Right action: **Uus klient** (primary) — currently missing.

**Filter bar**
- Search: "Otsi nime, e-posti või telefoni järgi…"
- Right-side meta moves into the filter bar: **`7 klienti`** as a small tertiary chip rather than floating above the table.

**Columns**
| Column   | Width | Align | Notes                                |
|----------|-------|-------|--------------------------------------|
| Nimi     | 280px | left  | with `#7` ID inline tertiary         |
| E-post   | flex  | left  | clickable, opens mailto              |
| Telefon  | 160px | left  | clickable, opens tel                 |
| Aadress  | 280px | left  | truncated with ellipsis, full in tip |
| ⋯        | 48px  | center| row actions                          |

The current "Toimingud" empty column header is removed — the `⋯` action menu is the only thing it ever held.

Detail panel (currently shows fully expanded by default):
- Slides in only when a row is clicked (consistent with Tooted).
- "Muuda" button moves to the panel footer as a primary button, alongside a "Sulge" secondary.
- Field rows follow system §4.6 styling.

### 2.3 Tellimused (Orders)

**Page header**
- Title: **Tellimused**
- Right action: **Uus tellimus** (primary).

**Filter bar**
- Search: "Otsi tellimust…"
- Filter: **Staatus** dropdown — replaces the current "All statuses" English dropdown
  - Values: Kõik staatused / Mustand / Kinnitatud / Töös / Tarnitud / Tühistatud
- Date range: **Periood** — single button opens a date range popover

**Columns**
| Column      | Width | Align | Notes                                  |
|-------------|-------|-------|----------------------------------------|
| Number      | 100px | left  | `#2401` tertiary prefix, primary number|
| Klient      | flex  | left  |                                        |
| Kuupäev     | 120px | left  | "26.04.2026"                           |
| Staatus     | 140px | left  | status pill (system §4.4)              |
| Tarne       | 140px | left  | delivery method                        |
| Kokku       | 140px | right | currency, tabular numerals             |
| ⋯           | 48px  | center| row actions                            |

**Empty state** (currently "No orders found"):
- Icon, "Tellimusi pole" / "Tellimusi ei leitud praeguste filtritega".
- If filters active: secondary action "Tühjenda filtrid".
- If no filters: primary action "Uus tellimus".

### 2.4 Ülesanded (Tasks)

**Page header**
- Title: **Ülesanded** (currently shows English "Tasks" — fix)
- Right action: **Uus ülesanne** (primary)

**Tabs** (currently `All / Pending / In Progress / Completed` pill-buttons)
- Convert to underline tabs (system §4.9).
- Estonian labels: **Kõik** / **Ootel** / **Töös** / **Valmis**
- Each tab shows count: **Kõik (12)** etc.
- Default tab: **Ootel**.

**Filter bar (below tabs)**
- Search: "Otsi ülesandeid…"
- Filters: **Tähtaeg** (today / this week / overdue / all), **Vastutav** (assignee), **Seotud** (linked entity)

**Columns**
| Column      | Width | Align | Notes                                        |
|-------------|-------|-------|----------------------------------------------|
| ☐           | 32px  | center| Checkbox to mark complete inline             |
| Pealkiri    | flex  | left  | weight 500                                   |
| Seotud      | 200px | left  | "Pakkumine #1043" or "Klient Acme" with icon |
| Vastutav    | 160px | left  | avatar + name                                |
| Tähtaeg     | 120px | right | relative ("Homme") or absolute, red if overdue|
| Staatus     | 100px | left  | pill                                         |
| ⋯           | 48px  | center| actions                                      |

**Empty state**:
- "Ülesandeid pole" / "Ülesandeid pole praeguses vaates"
- Primary action: "Uus ülesanne"

---

## 3. Aruanded (Reports) — placeholder note

Not in screenshots, but listed in the sidebar. When designed, follow the same shell:
- Page header with title.
- Filter bar at top with date range, entity selectors.
- Either a list of reports as cards (each with a chart preview) or a single configurable report viewer.

---

## 4. Seaded (Settings) — placeholder note

Settings deserves its own spec when content is known. The shell pattern is:
- Page header.
- Left-aligned secondary nav (settings groups: Profiil, Ettevõte, Maksetingimused, Integratsioonid, …).
- Content panel on the right.
