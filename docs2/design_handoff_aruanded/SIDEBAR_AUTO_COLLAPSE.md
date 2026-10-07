# Sidebar · automaatne minimeerimine + vaikimisi suletud puu

Handoff CLI-le. Referentsprototüüp: `Menüü käitumine - prototüüp.html` (avaneb brauseris, klikitav).

## 0. Kõige tähtsam piirang

**Prototüübi disaini EI porditata.** See on eraldi HTML oma CSS-iga (teine scroll, teised värvid, teine tüpograafia, teised raadiused) ainult käitumise näitamiseks. Toote menüü peab jääma **visuaalselt täpselt selliseks nagu ta praegu on** — `components/layout/Sidebar.tsx` olemasolevad Tailwind-klassid, `--sidebar-*` tokenid `app/globals.css`-is, olemasolev scroll-käitumine, ikoonid ja tühik.

Muuda ainult:
1. **loogikat** (millal menüü minimeerub, millised grupid on avatud),
2. **üht uut kontrolli** (lüliti brändi real) — vormistatud olemasolevas stiilis.

Keelatud: uued värvid/tokenid, `overflow`/scrollbar'i stiilimine, fondimuudatused, komponendi struktuuri ümbertegemine, uued sõltuvused.

---

## 1. Mida ehitame

1. **Toimingusse minnes minimeerub menüü ikooniribaks** (olemasolev `w-16` kollapsi-olek). Vaikimisi sees, kasutaja saab välja lülitada.
2. **Grupid on vaikimisi kinni** — nähtaval on ainult peafunktsioonid (Töölaud, Arvete keskus, Pank, Pearaamat, Aruanded, Põhivara, Seaded). Grupp avaneb klikkides.
3. **Grupi päisele klikkimine EI minimeeri** menüüd — see ainult avab puu. Minimeerib alles konkreetse toimingu (lehe) valimine.

---

## 2. Olek ja püsivus

Laienda `useSidebarStore` (`lib/stores/sidebar.store.ts`), zustand + `persist` (localStorage):

```ts
{
  isCollapsed: boolean;            // olemasolev
  toggleSidebar: () => void;       // olemasolev — käsitsi
  autoCollapseOnTask: boolean;     // UUS, default true, persisteeritud
  setAutoCollapse: (v: boolean) => void;
  expandedSection: string | null;  // UUS, üks avatud grupp korraga, persisteeritud
  setExpandedSection: (id: string | null) => void;
  manualOverrides: string[];       // UUS, pathname'id kus kasutaja avas menüü käsitsi; EI persisteerita (sessioon)
}
```

`components/layout/Sidebar.tsx` praegune `useState<string[]>(['accounting','invoices','reports'])` **kaob** — asendub `expandedSection`-iga store'is (muidu läheb olek iga navigeerimisega kaotsi).

---

## 3. Millised marsruudid on „toiming“

```ts
const TASK_ROUTES = [
  '/accounting/bank-review',
  '/accounting/bank-import',
  '/accounting/opening-balances',
  '/accounting/journal/new',
  '/accounting/journal/[id]',
  '/accounting/payments',
  '/accounting/payment-batches',
  '/invoices/sales/new', '/invoices/sales/[id]',
  '/invoices/purchase/new', '/invoices/purchase/[id]',
  '/invoices/purchase-approvals',
  '/invoices/purchase-imports',
  '/invoices/recurring',
  '/invoices/reminders',
  '/reports',            // + kõik /reports/* (vt §7)
];
```

**Ei ole toiming** (registri-/nimekirjavaated, menüü jääb laiaks): `/`, `/accounting/accounts`, `/accounting/partners`, `/accounting/fiscal-years`, `/accounting/exchange-rates`, `/invoices` (ülevaade), `/invoices/sales` ja `/invoices/purchase` nimekirjad, `/assets`, `/settings/*`.

Hoia list ühes failis (`lib/nav/task-routes.ts`) koos abifunktsiooniga:

```ts
export function isTaskRoute(pathname: string): boolean
```
Match: täpne vaste või prefiks + `/` (nii katab `/invoices/sales/123`). Tähelepanu: `/invoices/sales` (nimekiri) EI ole toiming, `/invoices/sales/123` on — järjesta kontroll nii, et täpne vaste võidab prefiksi.

---

## 4. Käitumisreeglid

**R1 — sisenemine.** `pathname` muutumisel: kui `autoCollapseOnTask && isTaskRoute(pathname) && !manualOverrides.includes(pathname)` → `isCollapsed = true`. Muidu, kui eelmine leht oli toiming ja uus ei ole → `isCollapsed = false` (taasta).

**R2 — käsitsi võidab.** Kui kasutaja toimingu lehel menüü ise avab (chevron või hover-flyout'ist väljumine), lisa `pathname` `manualOverrides`-i → sellel lehel enam automaatselt kinni ei panda kuni lehe värskenduseni.

**R3 — grupi päis ei minimeeri.** `toggleSection` muudab ainult `expandedSection`-i. Kui menüü on minimeeritud ja kasutaja klikib ikooniriba grupi-ikoonile, siis (nagu praegu) avaneb hover-flyout — riba ise ei laiene.

**R4 — akordion.** Korraga on avatud **üks** grupp. Uue avamine sulgeb eelmise. Sama grupi päisele klikk sulgeb selle.

**R5 — aktiivne grupp avaneb alati.** Lehe laadimisel / navigeerimisel seatakse `expandedSection` = aktiivse lehe grupp, et kasutaja näeks, kus ta on. (Minimeeritud olekus alammenüüd ei renderdata — see kehtib laia oleku kohta.)

**R6 — mobiil.** Ei muutu midagi: `isMobile` puhul `effectiveCollapsed = false`, auto-minimeerimist ei rakendata (slide-over sulgub nagunii `handleNavClick`-iga). Lüliti mobiilivaates peidus.

---

## 5. Lüliti (ainus uus UI)

Asukoht: **brändi real, kollapsi-chevroni vasakul** (`{/* Logo Section */}` div, enne olemasolevat `toggleSidebar` nuppu).

- Väike switch, ~26×14 px, olemasolevate värvidega: väljas `bg-slate-700` + `bg-slate-400` nupp; sees `bg-primary/20` + `bg-primary` nupp. Mitte suur ega värviline plokk.
- Peidetud kui `effectiveCollapsed` või `isMobile`.
- Hover/focus tooltip (kasutage olemasolevat tooltip-mustrit või `title`-i, kui muud pole):
  **„Minimeeri toimingus · vaikimisi sees“** — „Toimingu avamisel (nt Pangatehingud) tõmbub menüü ikooniribaks. Lülita välja, kui soovid menüü alati laiana hoida.“
- A11y: `role="switch"`, `aria-checked={autoCollapseOnTask}`, `aria-label="Minimeeri menüü toimingus"`, klaviatuuriga fokuseeritav, Space/Enter lülitab.
- i18n: uued võtmed `navigation.autoCollapse`, `navigation.autoCollapseHint` (et + en).

Jaluses ega navigatsioonis eraldi menüüpunkti **ei ole**.

---

## 7. Moodulid oma loendiga (Aruanded) · lisatud 07.10.2026

Referents: `Aruanded - ühtne vaade.html`.

**Reegel:** kui moodulil on **üle 5 alamlehe**, ei näidata neid külgmenüü alammenüüna. Külgmenüüs on **üks link** ja moodul näitab oma vasakut loendit (rühmad + salvestatud vaated). Esimesena rakendub see **Aruannetele**. Hiljem vaadata üle Seaded, Palgaarvestus ja Pearaamat.

**Aruanded**
- `Sidebar.tsx`: `reports` grupp → üks `NavItem` "Aruanded", `href="/reports"`, ilma `children`-ita ja chevronita. Aktiivne kõigil `/reports/*` lehtedel.
- `/reports` suunab viimati avatud aruandele (localStorage `arvelo.reports.last`), vaikimisi `/reports/profit-loss`.
- `/reports/*` on toiming (`isTaskRoute` prefiksiga `/reports`), seega **menüü ahendub automaatselt ikooniribaks** ja aruannete loend asub kohe selle kõrval. Kui kasutaja on lüliti välja lülitanud (`autoCollapseOnTask=false`), jääb külgmenüü laiaks. See on lubatud, sest alammenüüd enam ei ole ja topeltloendit ei teki.
- Ikooniribal "Aruanded" ikoonil **pole hover-flyout'i** (pole alamlehti). Klikk = navigeeri.
- Aruannete loendi nimed = senised külgmenüü nimed: Kasumiaruanne, Bilanss, Proovibilanss, Käibeandmik, Kulukohad ja projektid, Pearaamat, KMD aruanne, Aegumisaruanne, Partneri kontokaart, Majandusaasta aruanne. Rühmad: Finants · Raamat · Maksud · Partnerid · Juhtimine.
- R5 (aktiivne grupp avaneb) Aruannetele ei kehti, sest gruppi pole.

## 6. Vastuvõtu kontrollnimekiri

- [ ] Grupid on esmakordsel laadimisel kinni; nähtaval ainult peafunktsioonid.
- [ ] „Arvete keskus“ klikk avab puu, menüü jääb laiaks.
- [ ] „Müügiarve avamine/loomine“, „Pangatehingud“ jne → menüü tõmbub `w-16` ikooniribaks, animatsioon olemasolev `transition-all duration-300`.
- [ ] Ikooniribal töötab hover-flyout alammenüüga (olemasolev kood, ei muutu).
- [ ] Toimingu sees menüü käsitsi avamine → samal lehel ei minimeeru enam; teisele toimingule minnes minimeerub taas.
- [ ] Lüliti välja → ükski toiming ei minimeeri; valik püsib pärast lehe värskendamist.
- [ ] Registrilehed (Kontoplaan, Partnerid, Seaded) ei minimeeri kunagi.
- [ ] Mobiilis käitumine muutumatu.
- [ ] Külgmenüüs on "Aruanded" üks link ilma alammenüüta; `/reports/*` lehtedel ahendub menüü ja aruannete loend on ainus aruannete navigatsioon.
- [ ] `/reports` avab viimati vaadatud aruande.
- [ ] Visuaalne diff: peale uue lüliti pole menüüs ühtegi muud pikslimuutust (võrdle enne/pärast ekraanipilte laia ja minimeeritud olekus).
