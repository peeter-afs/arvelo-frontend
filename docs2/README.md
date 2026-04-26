# Forss ERP — Design spec

Modernization spec for the Forss ERP UI. Adopts visual patterns inspired by InvoicePortal (clean tables, soft status pills, outlined toolbars, card-on-gray layout) while keeping the left-sidebar navigation that suits a deeper ERP.

## Files

| File                       | Covers                                                  |
|----------------------------|---------------------------------------------------------|
| `00-design-system.md`      | Tokens, components, patterns shared by every screen     |
| `01-offer.md`              | **Pakkumine (offer detail)** — the most critical screen |
| `02-dashboard.md`          | Töölaud                                                 |
| `03-list-screens.md`       | Tooted, Kliendid, Tellimused, Ülesanded                 |
| `04-activity.md`           | Tegevus                                                 |

## How to use

1. Start with `00-design-system.md`. Implement the tokens and core components first — every screen depends on them.
2. Then build screens in this order, by impact:
   1. **Offer** (`01`) — biggest pain point, biggest user time spent.
   2. **List screens** (`03`) — high reuse, fixes 4 screens at once.
   3. **Dashboard** (`02`) — first impression every login.
   4. **Activity** (`04`) — lower priority.
3. Aruanded and Seaded specs are deliberately not yet written — see `03-list-screens.md` §3, §4 for shell guidance only.

## Cross-cutting fixes (apply everywhere)

These show up so often they're worth calling out separately:

- **Estonian-only UI strings.** Replace all English fragments listed in `00-design-system.md` §5.
- **Em-dash `—` for empty cells**, never blank.
- **Status pills**, never bare text, for any status field.
- **Tabular numerals** on every numeric column.
- **Estonian number formatting**: `224,00 €`, `26.04.2026`.
- **Move the floating email pill** from the top-right of every screen into the sidebar bottom user block.
- **Empty states with helpful CTAs**, not just "No X found".
- **Single error pattern**: never just "Viga" — describe what failed, offer a retry.

## Open questions

These need answers before implementation locks down (full list in `01-offer.md` §7):

1. Are configurations on an offer **alternatives** (customer chooses one) or **additive** (all delivered together)? Affects whether the summary card aggregates or shows per-config.
2. What does "Bundled" count on the offer header represent today?
3. What is the semantic of "Üksikasjad" — sub-items, accessories, or component lines?
4. Are line-level VAT overrides needed, or is VAT always offer-level?

## Out of scope (for now)

- Mobile UX beyond the responsive notes in each spec.
- Dark theme — token structure supports it, but a separate pass.
- Print/PDF templates for offers and orders.
- Notifications / activity feed UI.
