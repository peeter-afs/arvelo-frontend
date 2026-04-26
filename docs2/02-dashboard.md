# Töölaud (Dashboard) — Screen spec

Reference: image 1 (current state).

---

## 1. Problems with current

1. The greeting card "Tere tulemast / Tere, peeter@autofutur.net" wastes a full row to repeat the user's email — which is also shown in the top-right pill.
2. "Tulevased ülesanded" card has nothing in it ("Ülesandeid pole") but takes half the screen.
3. Activity card shows `0.0h` and an empty week chart — visually loud zeros for a likely-fresh account, but no guidance on what to do next.
4. **Uus pakkumine** is the only meaningful action; everything else is empty or read-only.
5. Day labels are in English (Mon, Tue, …).

The dashboard's job is to: tell the user **what needs their attention**, **what's coming up**, and **let them start work fast**. Right now it does none of those well.

---

## 2. New layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Töölaud                                            [Uus pakkumine]      │
│ Tere hommikust, Peeter                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌── Vajab tähelepanu ───┐ ┌── See nädal ──────┐ ┌── Aktiivsus ───────┐ │
│ │  3                     │ │  Pakkumised:  2   │ │  0,0h              │ │
│ │  pakkumist mustandis   │ │  Tellimused:  0   │ │  See nädal         │ │
│ │  [Vaata]               │ │  Ülesanded:   0   │ │  [graph]           │ │
│ └────────────────────────┘ └───────────────────┘ └────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌── Tulevased ülesanded ─────────────┐ ┌── Viimased pakkumised ──────┐ │
│ │ • Helista Acme Corp.    Homme       │ │ #1043 Acme · Mustand · €224 │ │
│ │ • Saada pakkumine #1043 30.04.      │ │ #1042 Beta · Saadetud · €1k │ │
│ │ • ...                                │ │ #1041 Delta · Kinnitatud    │ │
│ │ [Vaata kõiki →]                     │ │ [Vaata kõiki →]             │ │
│ └──────────────────────────────────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Section spec

### 3.1 Header

- Title: **Töölaud**.
- Subtitle: **Tere hommikust, {firstname}** / **Tere päevast** / **Tere õhtust** (time-aware Estonian greeting). Tertiary text. **Use the user's first name, not their email.** If first name unavailable, use email's local part (`peeter` from `peeter@autofutur.net`).
- Right action: **Uus pakkumine** (primary).

### 3.2 Top metric row — three cards

Three equal-width cards, 16px gap.

**Card 1: Vajab tähelepanu**
- Big number (e.g. `3`) — `text-2xl`, weight 700.
- Description: "pakkumist mustandis" (singular/plural-aware).
- Secondary line: "2 ülesannet on hilinenud" if applicable, in `--warning-600`.
- Action: ghost link "Vaata".
- If nothing needs attention: show a check icon + "Kõik kontrolli all".

**Card 2: See nädal**
- Three count rows: Pakkumised, Tellimused, Ülesanded.
- Each row: label tertiary, count primary weight 600, optional delta `↑ 2` in success/danger color.

**Card 3: Aktiivsus**
- Big number `0,0h` — `text-2xl`.
- "See nädal" subtitle.
- Mini bar chart, days E T K N R L P (Estonian abbreviations), 60px tall.
- Click anywhere → navigates to Tegevus screen.

### 3.3 Two-column content row

Below the metrics, two equal cards.

**Card: Tulevased ülesanded**
- List of next 5 tasks, sorted by due date.
- Each row: bullet dot (color = status), task title, due date right-aligned (relative: "Homme", "Reedel", or absolute date if >7 days).
- Footer link: "Vaata kõiki →" navigates to Ülesanded.
- Empty state (per §4.7): "Tulevasi ülesandeid pole" + "Loo ülesanne" link.

**Card: Viimased pakkumised**
- Last 5 offers, newest first.
- Each row: `#1043` (tertiary), customer name (primary), status pill, total right-aligned.
- Click row → opens that offer.
- Empty state: "Pakkumisi pole veel" + "Uus pakkumine" CTA.

---

## 4. Behavior

- **Time-aware greeting**: refresh on page load.
- **All counts** update when user navigates back to dashboard (no live polling needed).
- **Skeleton loaders** for each card while loading — never flash empty state, then fill.
