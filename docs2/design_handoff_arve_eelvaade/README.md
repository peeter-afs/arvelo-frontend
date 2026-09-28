# Handoff: Arve eelvaade (PDF vaade täisekraanil)

## Eesmärk
Praeguses eelvaates (`Arvete keskus › Kirje › Eelvaade`) on PDF kõige all ja võtab väikese osa ekraanist. Selle ees on murupuru kaart, suur pealkiri koos alapealkirjaga ja brauseri PDF-vaaturi tööriistariba (joonista, marker, kustukumm, pööra jne). Uues vaates on üks 48px päiserida ja kogu ülejäänud kõrgus on PDF-i jaoks.

## Failid
- `Arve eelvaade.html` on HTML-is tehtud disaini näidis, mitte tootmiskood. Ehita see koodibaasis (`peeter-afs/arvelo-frontend`, Next.js app router) olemasolevate komponentide ja tokenitega.
- `invoice-tpl/` sisaldab samu PDF-malle nagu `design_handoff_arve_mallid`. Näidises renderdatakse arve HTML-ina, et eelvaade oleks kohe nähtav. Tootmises näita serveris genereeritud PDF-i (vt „PDF-i kuvamine“).
- `screenshots/01-eelvaade.png` on tavavaade, `02-eelvaade.png` täisekraanirežiim.

## Täpsus
Hi-fi paigutus ja käitumine. Värvid, nupud ja fondid tulevad olemasolevast disainisüsteemist (`--bg #f6f4ee`, `--surface #fff`, `--border #e6e1d4`, `--accent #ff4e2c`, Inter 13px).

---

## Paigutus
```
┌rail 56┬──────────────────────────────────────────────────────────────┐
│       │ [‹] Arvete keskus › Kirje › Eelvaade   [− 104% +|Laius|Lehekülg|1 / 1]   [⛶][🖶][Saada][Laadi PDF alla] │ 48px
│       │ Arve 25930  Milworks OÜ  [SAATMATA]                            │
│       ├──────────────────────────────────────────────────────────────┤
│       │                      vaatur (#e9e6de)                        │ flex:1
│       │                   ┌──────── A4 ────────┐                     │
│       │                   │                    │                     │
├───────┴──────────────────────────────────────────────────────────────┤
│ olekuriba 24px                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Päiserida (`.bar`, 48px, valge, alumine joon `--border`)
1. **Tagasi-nupp**: 30×30, ikoon `‹`. Viib arve kirje juurde (sama sihtkoht, mis vanal nupul „Tagasi arvete juurde“). Kiirklahv `Esc`, kui täisekraanirežiim ei ole sees.
2. **Pealkiri kahel real**
   - murupuru 11px, `--text-3`: Arvete keskus › Kirje › Eelvaade (lingid)
   - `h1` 14px/650: `{Dokumendi tüüp} {nr}`, selle järel ostja nimi (450, `--text-2`) ja olekusilt (Saatmata / Saadetud / Tasutud, olemasoleva `.tag` stiiliga)
   - Vana pealkiri „Arve eelvaade“ ja alapealkiri „Vaata genereeritud PDF-i…“ **kaovad**.
3. **Vaaturi juhtnupud**: keskel, `--surface-2` pillis:
   - `−` / suumi % / `+` (samm 10%, vahemik 30–250%)
   - **Laius** (vaikimisi): sobitab lehe vaaturi laiusele, max 160%
   - **Lehekülg**: terve lehekülg mahub vaaturisse
   - `n / N`: praegune lehekülg / kokku. Uueneb kerimisel.
   - Aktiivne sobitusrežiim on valge ja varjuga (`.on`). Käsitsi suumimisel pole kumbki aktiivne.
4. **Tegevused** (paremal):
   - Täisekraan (ikoon, `F`)
   - Prindi (ikoon)
   - **Saada**: avab olemasoleva saatmise dialoogi
   - **Laadi PDF alla**: primary. Laeb alla sama PDF-faili, mida vaaturis näidatakse.

Brauseri PDF-tööriistariba **ei näidata**. Joonistamist, markerit ja annotatsioone raamatupidaja eelvaates vaja ei ole.

### Vaatur (`.viewer`)
- Taust `#e9e6de`. Kaarti ega raami ümber ei ole.
- Lehed on keskel üksteise all, vahe 16px, ääris 16px, vari `0 1px 3px rgba(0,0,0,.08), 0 6px 24px rgba(0,0,0,.06)`.
- `scrollbar-gutter: stable`, et kerimisriba ilmumine ei muudaks laiust ega käivitaks suumi uuesti.
- Mitmelehelise dokumendi kerimisel ilmub paremas alanurgas korraks (900ms) pill „Lk 2 / 3“.

### Täisekraanirežiim
- `F` või nupp lülitab sisse ja välja, `Esc` lülitab välja.
- Peidetakse rakenduse külgmenüü, olekuriba ja murupuru. Päiserida jääb, sest tegevusi on seal vaja.
- Sisse lülitamisel ilmub ülal keskel 1,8 s vihje „Täisekraan · Esc või F väljumiseks“.
- Pärast lülitamist arvutatakse sobitusrežiimi suum uuesti.

### Kiirklahvid
| Klahv | Tegevus |
|---|---|
| `F` | täisekraan sisse/välja |
| `Esc` | täisekraanist välja, kui see on sees; muidu tagasi kirje juurde |
| `+` / `=` | suurenda 10% |
| `−` | vähenda 10% |
| `0` | terve lehekülg |
| `W` | sobita laiusele |

Tekstiväljades kiirklahvid ei tööta. Kiirklahvide loend on olekuriba paremas servas.

### Kitsas ekraan (< 980px)
Murupuru, nuppude tekstid („Saada“, „Laadi PDF alla“) ja sobitusnuppude sildid peidetakse. Alles jäävad ainult ikoonid.

---

## Suumi loogika
```
width: z = min(1.6, (viewerW − 32) / 794)
page:  z = min((viewerW − 32) / 794, (viewerH − 32) / 1123)
manual: z = kasutaja valik
z = clamp(z, 0.3, 2.5)
```
- Arvuta suum `ResizeObserver`-i kaudu vaaturi elemendil. See käivitub kohe pärast `observe()` kutset ja iga suuruse muutuse järel. Käsitsi suumi (`manual`) ei tohi suuruse muutus üle kirjutada.
- **Kui vaaturi laius on alla 100px, jäta arvutus vahele** (element on peidetud või paigutus pole veel valmis). Muidu kinnitub suum 30% peale. See viga tuli prototüübis ette.
- Jäta viimane sobitusrežiim (`width` / `page`) meelde, prototüübis `localStorage` võtmega `arvelo-preview-zoom`. Käsitsi suumi ei salvestata.

## PDF-i kuvamine tootmises
- Näita serveris genereeritud PDF-i pdf.js abil (nt `react-pdf`), **mitte** brauseri `<iframe>`/`<embed>` vaaturiga. Nii jääb brauseri tööriistariba ära ja suum on meie kontrolli all.
- Renderda lehed canvas'ele laiusega `794 × z × devicePixelRatio`, et tekst oleks terav.
- Tekstikiht (`renderTextLayer`) peab olema sees, et teksti saaks valida ja kopeerida.
- Allalaadimine ja printimine kasutavad sama faili (sama URL või blob).
- Laadimise ajal näita A4-proportsioonis valget kohatäidet. Vea korral näita kohatäite sees teadet ja nuppu „Proovi uuesti“.

## Olekuriba
Ei muutu, see on rakenduse ühine olekuriba. Paremasse serva tuleb kiirklahvide vihje: `F täisekraan · +/− suum · Esc tagasi`.
