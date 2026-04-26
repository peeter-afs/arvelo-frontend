# Tegevus (Activity) — Screen spec

References: images 7, 8 (current state).

---

## 1. Problems with current

1. Two tabs (**Minu nädal** / **Üksuse järgi**) but the entity-grouped tab uses an English label "Entity" and English column "All" filter chip.
2. The "Minu nädal" view duplicates information: a `0,0h See nädal` headline and a chart titled "Minu nädal" — same data, two places.
3. The right side is wasted: the chart only fills the left half, with "Tegevusandmeid pole veel" floating in a void on the right.
4. Empty states are mixed languages and inconsistent with the rest of the app ("No data" in image 8 vs. "Tegevusandmeid pole veel" in image 7).
5. **Eksport CSV** is the only action — but should it always be available even with no data? Currently it appears active.

---

## 2. New layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tegevus                                  [Eksport CSV] [Uus seanss]    │
├─────────────────────────────────────────────────────────────────────────┤
│ Minu nädal | Üksuse järgi                                              │  ← tabs
│ ━━━━━━━━━                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─ See nädal ─────────────────────────────────────────────────────────┐│
│ │  Kokku   0,0h         Seansse  0         Keskmine  0,0h             ││  ← summary row
│ ├─────────────────────────────────────────────────────────────────────┤│
│ │  [bar chart, full width, 200px tall, days E T K N R L P]            ││  ← chart
│ ├─────────────────────────────────────────────────────────────────────┤│
│ │  ─ Tegevusandmeid pole veel ─                                       ││  ← empty
│ │    Alusta esimest seanssi, et siia midagi ilmuks.                   ││
│ │    [Uus seanss]                                                     ││
│ └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Section spec

### 3.1 Header

- Title: **Tegevus**
- Actions:
  - **Eksport CSV** (secondary, disabled when no data with tooltip "Pole midagi eksportida")
  - **Uus seanss** (primary) — start tracking time against an entity

### 3.2 Tabs

System §4.9 underline tabs. Estonian labels:

- **Minu nädal** (current week, current user)
- **Üksuse järgi** (grouped by linked entity — product / offer / order)

### 3.3 Minu nädal tab

#### 3.3.1 Summary row

Three metric cells in a single horizontal strip inside the card:

```
KOKKU              SEANSSE         KESKMINE
0,0h               0               0,0h
```

- Each cell: label `text-xs` uppercase tertiary, value `text-xl` weight 600 primary.
- Equal-width, vertical divider lines between (`border-left: 1px solid var(--border-subtle)` from second cell onward).
- 24px padding.

#### 3.3.2 Chart

- Full card width.
- Bar chart, days on X-axis (**E T K N R L P**, weight 500, tertiary color).
- Y-axis: hours, with grid lines every 1h, tertiary color.
- Bars: `--brand-600` fill. On hover: tooltip with day, total hours, click-through to filtered list.
- Height: 200px.
- When no data: chart still renders the empty grid but no bars; combine with the empty-state CTA below.

#### 3.3.3 Empty state (when applicable)

- Below the chart, centered card section.
- Per system §4.7 pattern.
- CTA: **Uus seanss**.

### 3.4 Üksuse järgi tab

A table replacing the current sparse layout:

**Filter chips above table**: `Kõik` `Toode` `Pakkumine` `Tellimus` (Estonian: **Kõik / Toode / Pakkumine / Tellimus**) — segmented control style.

**Columns**

| Column          | Width | Align | Notes                                |
|-----------------|-------|-------|--------------------------------------|
| Tüüp            | 100px | left  | small icon + label                   |
| Üksus           | flex  | left  | "Pakkumine #1043 — Acme"             |
| Kogu aeg        | 120px | right | "12,5h"                              |
| Seansse         | 100px | right |                                      |
| Keskmine        | 120px | right | per-session avg                      |
| Viimane tegevus | 160px | left  | relative time "2 t tagasi" / date    |

**Empty state** (per system §4.7):
- "Tegevusandmeid pole"
- "Salvestatud tegevus ilmub siia, kui hakkad seansse tegema."
- CTA: **Uus seanss**.

---

## 4. Detailed session list (drill-down)

Clicking a row in "Üksuse järgi" opens a side panel (system §4.6) with the full list of sessions for that entity:

- Header: entity name + total time.
- Each session row: date, start–end time, duration, optional notes.
- Footer: "Lisa seanss käsitsi" button.
