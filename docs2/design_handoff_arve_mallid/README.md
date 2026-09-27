# Handoff: Arve PDF mallid (Standard, Modernne) + salvestatud mallid kliendi / korduva arve kaupa + e-kirja eelvaade

## Ülevaade
Arvelo müügidokumentide PDF mallid ja seadete vaade, kus ettevõte valib malli, laeb üles logo ja valib aktsentvärvi. Üks mall kehtib kõigile viiele dokumendi tüübile:

| Tüüp | Võti | Pealkiri (ET / EN / FI / SV) |
|---|---|---|
| Arve | `invoice` | Arve / Invoice / Lasku / Faktura |
| Kreeditarve | `credit` | Kreeditarve / Credit note / Hyvityslasku / Kreditfaktura |
| Ettemaksuarve | `prepay` | Ettemaksuarve / Prepayment invoice / Ennakkolasku / Förskottsfaktura |
| Hinnapakkumine | `quote` | Hinnapakkumine / Quotation / Tarjous / Offert |
| Meeldetuletus | `reminder` | Meeldetuletus / Payment reminder / Maksumuistutus / Betalningspåminnelse |

Ettevõttel võib olla **mitu salvestatud malli** (nt „Vaikimisi“, „Põhjamaade kliendid“, „Hooldusleping“). Malli saab määrata **kliendile** ja **korduvale arvele**. Vt osa *Salvestatud mallid ja valiku järjekord*.

Dokumendi keel (ET, EN, FI, SV) tuleb kliendi seadetest, mitte kasutaja UI keelest. Seadete vaates on keel ainult eelvaate valik.

Kaks malli:
- **Standard** (`bal`): Inter, neutraalne. Ülal ainult ostja andmed. Müüja rekvisiidid on jaluses kolmes veerus.
- **Modernne** (`mod`): Schibsted Grotesk, aktsentvärvi täislaiuses päis, suur dokumendi pealkiri ja aktsentkastis kogusumma.

Prototüübis on ka kolmas mall, Klassikaline (`cls`). Selle CSS on alles, aga valikust on see eemaldatud. **Ära seda ehita.**

## Disainifailidest
Selle kausta failid on **HTML-is tehtud disaini näidised**, mitte tootmiskood. Ülesanne on teha need Arvelo koodibaasis (`peeter-afs/arvelo-frontend`, Next.js app router) olemasolevate mustrite järgi. Seadete vaate kest (topbar, kaardid, nupud, lülitid) järgib sama visuaalset keelt nagu `Müügiarve muutmine` ja `Korduvad arved`. Kasuta olemasolevaid komponente.

PDF mallide kohta vaata allpool osa **PDF genereerimine**: mallid (`templates.css` + `render.js` loogika) on mõeldud serveris HTML→PDF renderdamiseks. Seetõttu on nende HTML/CSS struktuur lähedane sellele, mida tootmises vaja läheb.

## Täpsus
**Hi-fi.** PDF mallide mõõdud, fondid, värvid ja vahed on lõplikud. Tee need järele pikslitäpselt (A4 = 794 × 1123 CSS px @ 96 dpi). Seadete vaates kasuta koodibaasi komponente, kui need on lähedased.

---

## Failid
| Fail | Sisu |
|---|---|
| `Arve mallid.html` | Seadete vaade: salvestatud mallide nimekiri, kujunduse valik, bränd, sisu lülitid, eelvaate valikud, PDF/E-kirja vahelehed, zoom, lingi popover |
| `Korduva arve mall.html` | Korduva arve seaded. Uus väli **PDF mall** (vt allpool). Faili `kogused.js` see kaust ei sisalda (see on `design_handoff_korduvad_arved` kaustas), nii et siin avaneb vaade ilma koguste osata. |
| `screenshots/` | 01 Standard vs Modernne (arve), 02 Meeldetuletus (Standard) ja pakkumine (Modernne, EN), 03 seadete vaade |
| `invoice-tpl/templates.css` | Kõigi mallide CSS. Ühine osa `.pg …`, malli spetsiifika `.t-bal …` ja `.t-mod …` |
| `invoice-tpl/render.js` | Andmemudel (`model`), plokkide ehitamine (`blocks`), mõõtmisega lehekülgedeks jagamine (`paginate`), e-kirja tekst (`email`) |
| `invoice-tpl/i18n.js` | Kõik PDF-i ja e-kirja tekstid neljas keeles (`key: [et, en, fi, sv]`) |

Näidisandmed (müüja Stuudio Lillemets OÜ, ostjad Stuudio Veski OÜ / Kivi Design Oy, read, pangad) on `render.js` alguses kõvakodeeritud. Tootmises tulevad need dokumendist ja ettevõtte seadetest.

---

## Salvestatud mallid ja valiku järjekord

### Mõiste
**Mall** = nimega salvestatud seadete komplekt: kujundus (`standard` / `modern`), aktsentvärv, logo, „Varasemad tasumata arved“ sees/väljas, „Lisamärkus“ sees/väljas. Üks mall on alati **vaikimisi** (`isDefault`): seda ei saa kustutada ega ümber nimetada ja sellele ei määrata kliente.

### Valiku järjekord (dokumendi renderdamisel)
1. **Korduva arve mall**: kui dokument on genereeritud korduvast arvest ja sellele on valitud konkreetne mall.
2. **Kliendi mall**: kui ostja on määratud mõnele mallile.
3. **Vaikimisi mall**.

Järjekord kehtib kõigile dokumendi tüüpidele. Kreeditarve, meeldetuletus jne kasutavad ostja malli. Korduvast arvest tehtud kreeditarve kasutab sama malli kui algne arve.

**Kinnitatud dokumendi PDF on muutumatu** (R2). Malli hilisem muutmine, kliendi ümbertõstmine või malli kustutamine mõjutab ainult uusi dokumente. Dokumendile salvesta `templateId` + malli versioon/snapshot, mille järgi PDF tehti.

### Reeglid
- Klient saab kuuluda **ainult ühte** malli. Kui klient lisatakse teise malli, eemaldatakse ta eelmisest. Rippmenüüs on see näha märgiga `(praegu: <malli nimi>)` ja pärast lisamist ilmub teade „<Klient> tõsteti mallist „<nimi>“.“ (11px, `#7d5a13`).
- Malli kustutamisel lähevad selle kliendid tagasi vaikimisi malli. Selle malliga korduvad arved lähevad seadele „Kliendi mall“. Tootmises küsi enne kinnitust, kui mall on kasutusel.
- „+ Uus mall“ kopeerib valitud malli kujunduse, värvi, logo ja lülitid, aga mitte kliente ega korduvaid arveid. Nimi on „Uus mall“, „Uus mall 2“, … ja nimeväli saab fookuse ning teksti valiku.
- Malli nimi on ainult sisekasutuseks (vihje „ei ole arvel“).
- „Salvesta“ salvestab kogu mallide nimekirja korraga. „Tühista muudatused“ taastab viimati salvestatud nimekirja.

### Seadete vaate vasak paneel (ülalt alla)
1. **Salvestatud mallid** (päises paremal mallide arv): read grid `10px | 1fr | auto`, padding `7px 9px`, radius 8.
   - 10×10 ruut (radius 3) malli aktsentvärviga, nimi (12.5px 600), alarida (11px `--text-3`): `Standard · kõik teised` (vaikimisi) / `Modernne · 3 klienti · 1 korduv arve` / `kasutamata`.
   - Vaikimisi mallil silt „Vaikimisi“.
   - Valitud rida: taust `#fff3ee`, piir `#ffc9b8`. Hover: `#f0ede5`.
   - All nupp „+ Uus mall“ (täislaius, dashed piir).
2. **Malli nimi**: sisend (29px). Vaikimisi mallil on see keelatud ja vihje on „vaikemall“.
3. **Kujundus**: Standard / Modernne kaardid pisipiltidega (endine „Mall“).
4. **Bränd**, 5. **Sisu**: nagu varem, kehtivad valitud mallile.
6. **Kasutus**:
   - Vaikimisi: „Kasutatakse kõigile klientidele ja korduvatele arvetele, millele pole muud malli määratud.“
   - Muu mall: **Kliendid** (pillid × eemaldamisega + rippmenüü „+ Lisa klient“), **Korduvad arved** (ainult loetelu, lingid korduva arve vaatesse) + vihje „Korduva arve PDF-malli saab valida korduva arve seadetest.“
   - Järjekorra kast (taust `#f0ede5`, radius 8, 11px): „Kui dokumendile valitakse mall, kehtib esimene sobiv: 1. **Korduva arve** mall 2. **Kliendi** mall 3. **Vaikimisi** mall“.
   - „Kustuta mall“ (ghost, punane `#c0392b`, hover `#fbeaea`). Vaikimisi mallil seda pole.
7. **Eelvaade**: nagu varem.

Kliendi mall peaks olema valitav ka **kliendi kaardil** (väli „PDF mall“, vaikimisi „Vaikimisi“). See on sama seos teisest suunast. Prototüübis seda vaadet pole.

### Korduva arve mall: väli „PDF mall“
`Korduva arve mall.html` vormi viimases reas: Märkused (3 veergu) · KM kood (1) · Koostaja (1, varem 2) · **PDF mall** (1).
- Silt „PDF mall“, paremal link „Muuda“ → malli seadete vaade.
- Valikud: **„Kliendi mall“** (`null`, vaikimisi: kasuta järjekorda kliendi mall → vaikimisi) + kõik salvestatud mallid nime järgi.
- Kui mallil on mitu klienti, kehtib valitud mall kõigile selle korduva arve klientidele.

### Andmemudel
```ts
type InvoiceTemplate = {
  id: string;
  name: string;
  isDefault: boolean;
  layout: 'standard' | 'modern';
  accentColor: string;
  logo: { url: string; width: number; height: number } | null;
  showUnpaidInvoices: boolean;
  showNote: boolean;
  version: number;              // tõsta igal salvestusel; dokument viitab versioonile
};
// seosed
Client.invoiceTemplateId: string | null;             // null = vaikimisi
RecurringInvoice.invoiceTemplateId: string | null;   // null = kliendi mall
Document.templateId + Document.templateVersion;      // millega PDF tehti

function resolveTemplate(doc) {
  return doc.recurring?.invoiceTemplateId
      ?? doc.buyer.invoiceTemplateId
      ?? templates.find(t => t.isDefault).id;
}
```

---

## PDF mall: struktuur

### Leht
- A4, `794 × 1123px`, valge, `overflow:hidden`.
- `.pg-in` on `position:absolute; inset:0; display:flex; flex-direction:column`.
- `.flow` (`flex:1; min-height:0; overflow:hidden`) sisaldab plokke, `.pfoot` on alati lehe allservas.
- Aktsentvärv tuleb CSS muutujast `--ac` lehe elemendil. `--tint = color-mix(in oklab, var(--ac) 8%, #fff)`.

### Plokkide järjekord (ülalt alla)
1. **`.b-head`**: logo või monogramm + müüja nimi + tagline | dokumendi pealkiri + number.
2. **`.b-info`**: ostja (`.buyer`), meta (`.meta`: 2–4 välja). Müüja (`.seller`) on DOM-is olemas, aga mõlemas mallis peidetud.
3. **`.b-note`**: lisamärkus (kui sisse lülitatud). **Enne tooteridu.**
4. Meeldetuletusel `.b-intro` (sissejuhatav tekst).
5. **`.b-tbl`**: tooteread või meeldetuletuse arvete tabel.
6. **`.b-tot`**: kokkuvõte + `.gr` (tasumisele kuuluv summa).
7. **`.b-rc`**: pöördmaksustamise märge (kui kehtib).
8. **`.b-acc`**: pakkumise kinnituse allkirjaread (ainult `quote`).
9. **`.b-txt`**: dokumendi tüübi lõputekst (tänu / tagastus / ettemaks / pakkumise kehtivus).
10. **Allosa grupp** (`bottom`): `.b-unpaid` (varasemad tasumata arved), `.b-pay` (makseinfo). Grupi esimene plokk saab `margin-top:auto`, nii et grupp on alati viimase lehe allosas, kohe jaluse kohal. Vaba ruum jääb kokkuvõtte ja allosa grupi vahele.
11. **`.pfoot`**: jalus (igal lehel).

### Meta väljad dokumendi tüübi järgi
| Tüüp | Väljad (esiletõstetud väli *kaldkirjas*) |
|---|---|
| invoice | Kuupäev, *Maksetähtaeg*, Viitenumber, Maksetingimus (14 päeva) |
| credit | Kuupäev, *Krediteeritav arve* (link), Põhjus |
| prepay | Kuupäev, *Maksetähtaeg*, Viitenumber, Maksetingimus (7 päeva) |
| quote | Kuupäev, *Kehtib kuni*, Tarneaeg |
| reminder | Kuupäev, *Tasuda hiljemalt* |

Standardis on esiletõstetud välja väärtus `color:var(--ac); font-weight:600`.

### Tabeli veerud
Tooteread: `#` (22px) · Kirjeldus (vaba) · Kogus (64) · Ühiku hind (88) · [Ale (46), ainult kui mõnel real on allahindlus] · KM (42) · Summa (100).
- Kirjeldus ja täpsustus on **samal real**: `<span class="ds">Nimi</span> <span class="sub">täpsustus</span>`. Tekst murdub teisele reale ainult siis, kui see ei mahu.
- Kogus koos ühikuga (`12 h`, `1 tk`). Ühikud on i18n-is (`u_h`, `u_pcs`).
- Negatiivsed summad kasutavad miinusmärki `−` (U+2212), mitte sidekriipsu.

Meeldetuletus: Arve nr (link) · Kuupäev (96) · Maksetähtaeg (96) · Päevi üle (96, punane `#b3261e`) · Tasumata (110).

### Kokkuvõtte read
- Allahindlusega: *Summa enne allahindlust*, *Allahindlus* (negatiivne).
- *Summa ilma KM-ta*.
- Iga KM määra kohta eraldi rida: `Käibemaks 24%`. Kui määrasid on üle ühe või kehtib pöördmaksustamine, lisandub rea lõppu väiksemalt `summalt 3 610,00 €`.
- Ettemaksuarvel: *Kokku*, *Ettemaks 50%*, suur summa = *Tasuda ettemaksuna*.
- Meeldetuletusel: *Võlgnevus kokku*, *Viivis 0,15% päevas* (arvutatakse iga arve kohta: summa × 0,0015 × päevi üle).
- Suure summa silt: invoice *Tasumisele kuulub*, credit *Tagastatav summa*, prepay *Tasuda ettemaksuna*, quote *Pakkumine kokku*, reminder *Tasumisele kuulub*.

KM määrad on Eesti 2025. aasta 1. juulist kehtivad määrad: 24% ja 9%. Pöördmaksustamisel (EL B2B ostja) on kõigi ridade KM 0% ja lisandub plokk `.b-rc`: „**Pöördmaksustamine.** Käibemaksu tasub ostja. Nõukogu direktiiv 2006/112/EÜ, artikkel 196.“

### Plokkide kehtivus
| Plokk | invoice | credit | prepay | quote | reminder |
|---|---|---|---|---|---|
| Varasemad tasumata arved | ✓ | | ✓ | | |
| Allahindlus rea kaupa | ✓ | ✓ | ✓ | ✓ | |
| Mitu KM määra | ✓ | ✓ | ✓ | ✓ | |
| Pöördkäibemaks | ✓ | ✓ | ✓ | ✓ | |
| Lisamärkus | ✓ | ✓ | ✓ | ✓ | ✓ |
| Makseinfo (`.b-pay`) | ✓ | | ✓ | | ✓ |
| Kinnituse allkirjad | | | | ✓ | |

Allahindlus, mitu KM määra ja pöördkäibemaks **ei ole seaded**. Need tulenevad dokumendi andmetest. Seadete vaates on need ainult eelvaate näidisandmete lülitid.

### Varasemad tasumata arved
- Päis: silt vasakul, paremal väike vihje „Klõpsa arve numbril, et PDF uuesti avada“ (`link_hint`, 9.5px, `--ink3`).
- Tabel: Arve nr (link) · Kuupäev · Maksetähtaeg · Tasumata. Tähtaja ületanud real on tähtaeg punane ja selle järel `· 8 p üle`.
- Jalus: „Tasumata kokku (ei sisaldu käesoleva arve summas)“ + summa.
- Andmed: ostja kõik teised avatud arved seisuga dokumendi kuupäev, välja arvatud käesolev arve.

### Makseinfo
Saaja, iga pangakonto kohta rida `Pank → IBAN · BIC`, Viitenumber, Summa (aktsentvärvis, 600). QR-koodi pole.

### Jalus
- **Standard**: `.fcols`, 3 veergu (`1.1fr 1.1fr 1.3fr`, gap 20px, 9.5px, line-height 1.55):
  1. **Müüja nimi** (600, `--ink2`) / Reg. kood / KMKR
  2. Tänav / Postiindeks linn, riik / e-post · telefon
  3. Iga pank: `Pank IBAN` / `BIC X / Y`
  Paremal lehekülje number. Ülal `1px solid --ln`, padding-top 10px.
- **Modernne**: `.f1`, üks rida `Nimi · Reg. kood … · KMKR … · aadress · e-post · telefon`, paremal lehekülje number (600, `--ink`).
- Lehekülje number: `Lk 1 / 2` (`Page`, `Sivu`, `Sida`).

### Klikitavad dokumendinumbrid (R2)
Varasemate arvete numbrid (tasumata arvete plokis, meeldetuletuse tabelis ja kreeditarve väljal „Krediteeritav arve“) on `<a class="dl" href="…">` lingid. Chrome'i PDF-väljund säilitab need klikitavate linkidena.

- Stiil: `color:inherit; text-decoration:underline; text-decoration-color:color-mix(in oklab, var(--ac) 55%, #fff); text-underline-offset:2px; text-decoration-thickness:1px`.
- **URL peab olema püsiv.** R2 presigned URL aegub kõige rohkem 7 päeva pärast, aga PDF jääb kliendile aastateks. Seega aseta PDF-i Arvelo enda aadress, näiteks `https://arvelo.ee/d/<doc-no>-<token>`. See route:
  1. leiab tokeni järgi dokumendi (token on juhuslik ja arvamatu, ≥ 128 bitti, mitte räsi numbrist nagu prototüübis),
  2. kontrollib, et link pole tühistatud,
  3. suunab (302) lühiajalisele R2 presigned GET URL-ile (nt 5 min) **selle konkreetse, kliendile saadetud PDF-i** faili juurde.
- PDF salvestatakse R2-sse dokumendi kinnitamise/saatmise hetkel ja on muutumatu. Hilisem malli või andmete muutus ei muuda juba saadetud faili. Soovituslik võti: `docs/<companyId>/<docType>/<docNo>/<sha256>.pdf`.
- Seadete eelvaates ava lingil klõpsamisel popover (lingi URL + „Kopeeri link“), mitte navigeerimine.

---

## Malli tokenid

### Ühised (`.pg`)
| Token | Väärtus |
|---|---|
| `--ink` | `#151515` |
| `--ink2` | `#4b4b4b` |
| `--ink3` | `#767676` |
| `--ln` | `#e3e3e3` |
| `--ac` | valitud aktsentvärv |
| `--tint` | `color-mix(in oklab, var(--ac) 8%, #fff)` |
| negatiivne | `#b3261e` |
| põhitekst | 11.5px / 1.45 |
| silt `.lb` | 9.5px, 600, uppercase, letter-spacing .1em, `--ink3` |
| numbrid | `font-variant-numeric: tabular-nums` |

### Aktsentvärvid (valik seadetes)
| Nimi | Hex |
|---|---|
| Sinine (vaikimisi) | `#2849d6` |
| Roheline | `#0b6e50` |
| Punane | `#c8391a` |
| Ploom | `#6b3fa0` |
| Grafiit | `#2b2b2b` |
Kõigil on valge tekstiga kontrast ≥ 4.5:1 (Modernne päis ja summakast).

### Standard (`.t-bal`)
- Font Inter 400/500/600, letter-spacing −.005em.
- `.pg-in` padding `46px 56px 26px`; plokkide vahe 18px.
- Päis: flex space-between, allservas `1px --ln`, padding-bottom 18px. Monogramm 40×40, radius 9, taust `--ac`, valge 19px 700. Logo pilt `max-height:46px; max-width:180px; object-fit:contain`. Nimi 16px 600, tagline 10.5px `--ink3`. Pealkiri 26px 600 uppercase, line-height 1. Number 13px `--ink2`, väärtus 600 `--ink`.
- Info: ostja üleval (nimi 14px 600), meta 4 veerus (gap 24px, ülal `1px --ln`, padding-top 16px, väärtus 13.5px).
- Tabel: th 9.5px 600 uppercase .08em `--ink3`, padding `0 0 7px 8px`, all `1px --ink`. td 12px / 1.35, padding `5px 0 5px 8px`, all `1px --ln`. Esimesel veerul padding-left 0.
- Kokkuvõte: laius 330px, paremal. Read 4px 0. `.gr`: margin-top 8px, padding-top 12px, ülal `2px --ink`. Silt 12px 600, summa 22px 600 `--ac` −.02em.
- Tasumata arved: `1px --ln`, radius 10, padding `9px 16px`, read padding 1px 0 / 1.35, jaluse padding-top 5px.
- Makseinfo: `1px --ln`, radius 10, padding `12px 16px`, taust `#fafafa`, grid `auto 1fr`, gap `3px 20px`.
- Pöördmaksustamine: taust `--tint`, radius 8, padding `8px 12px`, 10.5px.

### Modernne (`.t-mod`)
- Font Schibsted Grotesk 400/500/600/700.
- `.pg-in` padding `0 0 26px`; `.flow` padding `0 52px`, plokkide vahe 16px.
- Päis: täislaius (`margin:0 -52px`), padding `26px 52px 22px`, taust `--ac`, valge tekst, grid gap 26px. Rida 1: logo/monogramm + nimi (13.5px 600) + tagline (10.5px, opacity .88). Monogramm 36×36 ring, valge taust, `--ac` täht. Logo pilt valgel kiibil (padding `6px 10px`, radius 8, max-height 34px). Rida 2: pealkiri 44px 700 −.035em line-height .9 vasakul, number paremal (silt 13px, väärtus 17px 600).
- Info: ostja (nimi 18px 600), meta 4 veerus, gap 18px, iga väli ülal `2px --ink`, padding-top 7px, väärtus 13px 600. Päises **ei ole** eraldi summakasti.
- Tabel: th 9.5px 600 uppercase `--ink3`, padding `0 8px 8px`. td 12px / 1.35, padding `6px 8px`, ülal `1px --ln`. Esimene ja viimane veerg ilma välise paddinguta, nii et Summa veerg joondub lehe sisu paremasse serva.
- Kokkuvõte: read `4px 0` (joondus tabeli Summa veeruga). `.gr`: taust `--ac`, valge, radius 8, padding `8px 14px`, **margin `6px -14px 0`** (kast ulatub 14px üle, et tekst joonduks ridadega). Silt 11.5px 600, summa 16px 700.
- Tasumata arved / makseinfo: taust `#f5f5f3`, radius 12, padding `11px 16px`, tabeli read 2px 0.
- Jätkulehel `.b-cont` margin-top 40px.

---

## Lehekülgedeks jagamine
Leheküljed jagatakse **mõõtmise järgi**, mitte CSS paged media abil (vt `paginate()` failis `render.js`):
1. Loo leht ja lisa plokid järjest `.flow` sisse.
2. Pärast igat lisamist kontrolli `flow.scrollHeight > flow.clientHeight + 1`.
3. Kui mahtu ei jätku:
   - **tabeli rida**: eemalda rida, alusta uut lehte, lisa uuele lehele jätkupäis `.b-cont` + tabel uuesti koos `thead`-iga ja pane rida sinna;
   - **muu plokk**: tõsta terve plokk järgmisele lehele (plokke ei poolitata).
4. Jätkupäis `.b-cont`: `ARVE 2026-0091 · Ostja nimi · järg` (9.5px uppercase `--ink3`, all `1px --ln`).
5. Lõpus kirjuta igale lehele `Lk i / N`.

Kriteerium: 3 reaga arve koos märkuse, tasumata arvete ja makseinfoga mahub mõlemas mallis ühele lehele.

## PDF genereerimine (soovitus)
- Renderda PDF serveris headless Chromiumiga (Playwright/Puppeteer) samast HTML/CSS mallist. `page.pdf({ format:'A4', printBackground:true, margin:0, preferCSSPageSize:true })`, CSS-is `@page{size:A4;margin:0}` ja `.pg{break-after:page}`.
- Oota enne mõõtmist ja PDF-i tegemist `document.fonts.ready`. Fondid (Inter, Schibsted Grotesk) peavad olema serveris lokaalselt või self-hosted, mitte Google CDN-ist.
- Sama renderdusfunktsioon peab töötama seadete eelvaates (brauseris) ja serveris, nii et eelvaade = lõplik PDF.
- Faili nimi: `<Pealkiri>_<number>.pdf`, tühikud alakriipsuks (`Arve_2026-0091.pdf`, `Maksumuistutus_M-2026-0003.pdf`).

---

## Seadete vaade (`Arve mallid.html`)

### Paigutus
- Topbar (27px): crumb `Seaded / Dokumendid`, pealkiri „Arve mallid“ (14.5px 700, nowrap), paremal olek (`Salvestatud` / `Salvestamata muudatused`, peidetud < 1100px), „Tühista muudatused“ (ghost), „Salvesta“ (primary `#ff4e2c`).
- Põhikaart: grid `clamp(260px, 28vw, 318px) | minmax(0,1fr)`.
- **Vasak paneel** (taust `#fbfaf6`, sektsioonid padding `12px 14px`):
  1. **Mall**: 2 kaarti (84px pisipilt = päris renderdatud 1. leht zoomiga .1058, nimi, kirjeldus, silt „Kasutusel“ salvestatud mallil). Valitud kaardil piir `#ff4e2c` + `0 0 0 2px #ffe7df`. Vihje: „Mall kehtib kõigile dokumenditüüpidele: …“
     - Standard: „Selge ja neutraalne, rekvisiidid jaluses“
     - Modernne: „Värviline päis, rõhutatud kogusumma“
  2. **Bränd**: logo drop-zone (52px, dashed; drag&drop või failivalik, `image/*`), eemaldamise nupp (ainult kui logo on), vihje „PNG või SVG, läbipaistva taustaga. Logota kasutatakse ettevõtte algustähte.“ 5 värvivalikut (30×30, radius 8) + nimi.
  3. **Sisu** (salvestatavad seaded): lülitid „Varasemad tasumata arved“ (Lisatakse arvele ja ettemaksuarvele), „Lisamärkus“ (Arve märkuse väli trükitakse PDF-ile).
  4. **Eelvaade** (paremal märge „ei salvestu“): dokumendi tüübi chipid, keele chipid (ET EN FI SV), näidisandmete lülitid (Allahindlus rea kaupa, Mitu KM määra: 24% ja 9%, Pöördkäibemaks: EL ostja, KM 0%, Mitu lehekülge: 30 rida). Kui lüliti antud tüübile ei kehti, on see `opacity:.45` ja alltekst on „Ei kehti: <Tüüp>“.
- **Parem paneel** (taust `#ece8de`):
  - Tööriistariba: vahelehed PDF | E-kiri, info `Arve · ET · A4 · 1 lk` (ellipsis), zoom − / % / + / Mahuta, „Laadi PDF“.
  - PDF: lehed üksteise all, gap 22px, padding 24px, vari `0 6px 30px rgba(40,30,10,.12)`. Keskel joondus `align-items: safe center`, et suurendades jääks vasak serv keritavaks.
  - E-kiri: kaart max 660px. Saatja / Saaja / Teema, tekst dokumendi keeles, allkiri, manuse kiip (54×72 pisipilt + failinimi + `PDF · N lk`). Manusel klõpsamine avab PDF vahelehe.

### Käitumine
- Iga muudatus renderdab eelvaate, pisipildid ja e-kirja kohe uuesti.
- Zoom: vaikimisi „Mahuta“ (laius / 794, sammuga 5%, vahemikus 30–100%). Kasuta `ResizeObserver`-it kerimisalal. Kui kasutaja on zoomi käsitsi muutnud, ära automaatselt enam mahuta, kuni ta vajutab „Mahuta“.
- „Salvesta“ salvestab kogu mallide nimekirja. „Tühista muudatused“ taastab viimati salvestatud nimekirja. Eelvaate valikud ei salvestu serverisse (prototüübis localStorage).
- Lingil klõpsamine eelvaates avab popoveri (300px): „Arve <nr> PDF“, selgitus, URL, vihje püsiva lingi kohta, „Kopeeri link“ / „Sulge“. Välja klõpsates sulgub.

### E-kirja tekstid
Mallid on `i18n.js` võtmetes `m_invoice`, `m_credit`, `m_prepay`, `m_quote`, `m_reminder` kohatäidetega `{n}`, `{sum}`, `{due}`. Lisaks `m_hello` ja `m_bye`. Teema: `<Pealkiri> <nr> · <Müüja>`.

## Olek / andmed
Malli andmemudel on osas *Salvestatud mallid*. Prototüübis on `tpl` väärtused `bal` = standard ja `mod` = modern.

Dokumendi PDF-i renderdamiseks on vaja: müüja rekvisiidid + pangakontod, ostja andmed (+ riik, KMKR, pöördmaksustamise tunnus), read (nimi, täpsustus, kogus, ühik, hind, ale %, KM %), meta (tüübi järgi), märkus, ostja avatud arved (id, nr, kuupäev, tähtaeg, jääk, püsiv link), dokumendi keel.

## Vormindus
- Raha: `Intl.NumberFormat(loc, {style:'currency', currency:'EUR'})`, `loc` = `et-EE` / `en-IE` / `fi-FI` / `sv-SE`. Miinus asendatakse märgiga `−`.
- Kuupäev: et/fi `20.05.2026`, en `20 May 2026`, sv `2026-05-20`.

## Fondid
- Inter 400/500/600/700 (Standard + seadete UI)
- Schibsted Grotesk 400/500/600/700 (Modernne)
