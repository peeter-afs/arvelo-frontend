# Handoff: Korduvad arved (mallid, muutuvad kogused, koguste sisestamine)

## Ülevaade
Arvelo korduvate arvete moodul. See koosneb kolmest vaatest:

1. **Korduvad arved**: kõigi mallide nimekiri ja paremal valitud malli kokkuvõte.
2. **Korduva arve mall**: malli muutmine. Vaade on üles ehitatud nagu tavaline müügiarve. Arve kuupäeva asemel on sagedus ja väljastamise päev. Tooted ja kliendid on eraldi vahelehtedel. Ühele mallile saab lisada mitu klienti ja iga klient saab samade ridadega eraldi arve.
3. **Kogused**: globaalne, kõigi mallide ülene vaade. Siin sisestatakse iga perioodi eest muutuva kogusega ridade kogused (tunnid, tükid, GB) ja kinnitatakse arved.

Uus äriloogika: arve rea saab märkida **muutuva kogusega** reaks (`variableQty`). Kui mallis on vähemalt üks selline rida, ei saadeta selle malli arveid automaatselt. Arved luuakse mustandina (`awaiting_quantity`) ja ootavad, kuni kogused Kogused vaates sisestatakse ja kinnitatakse.

## Disainifailidest
Selle kausta failid on **HTML-is tehtud disaini näidised**. Need on prototüübid, mis näitavad soovitud välimust ja käitumist, mitte tootmiskood. Ülesanne on **teha need vaated sihtkoodibaasi olemasolevas keskkonnas** (React, Vue vms), kasutades selle mustreid, komponente ja teeke. Kui keskkonda veel pole, vali projektile sobivaim raamistik. Andmed on prototüübis kõvakodeeritud näidisandmed. Päris rakenduses tulevad need API-st.

## Täpsus
**Hi-fi.** Värvid, tüpograafia, vahed ja interaktsioonid on lõplikud. Tee need võimalikult täpselt järele, kasutades koodibaasi olemasolevaid komponente (nupud, sisendid, tabelid, sildid). Kui koodibaasis on oma disainisüsteem, eelista selle tokeneid, kui need on lähedased.

---

## Disaini tokenid

### Värvid
| Token | Hex | Kasutus |
|---|---|---|
| `--bg` | `#f6f4ee` | lehe taust |
| `--surface` | `#ffffff` | kaardid, sisendid |
| `--surface-2` | `#f0ede5` | tabeli päis, segmendi taust, neutraalne silt |
| `--border` | `#e6e1d4` | tavaline piirjoon |
| `--border-strong` | `#d4cebe` | kbd, tugevam piir |
| rea eraldaja | `#efece4` | tabeliridade vaheline joon |
| sekundaarne pind | `#f9f7f1` | plokkide päised, lisamise ribad |
| jaluse pind | `#f4f1e9` | parem paneel malli vaates, jalused |
| `--text` | `#0a0a0a` | põhitekst |
| `--text-2` | `#4a4946` | sekundaarne tekst |
| `--text-3` | `#8e8c84` | sildid, vihjed |
| `--accent` | `#ff4e2c` | põhinupp, valitud rea marker, järgmise jooksu täpp |
| accent hover | `#e8431f` | |
| `--accent-soft` | `#ffe7df` | |
| valitud rida | `#fff5f1` | nimekirja valitud rida |
| `--pos` / `--pos-soft` | `#0e7b5a` / `#e2efe9` | Aktiivne, Valmis, Saadetud |
| `--neg` / `--neg-soft` | `#c0392b` / `#fbeaea` | Hilinenud, Ebaõnnestus, kustuta |
| muutuv kogus: tekst | `#8a5a0c` | „iga kord”, „Ootab kogust” |
| muutuv kogus: taust | `#fbefd6` (silt), `#fdf8ec` (tühi lahter, riba) | |
| muutuv kogus: piir | `#e2c48c` (katkendlik), `#ecd7b4` | |

### Tüpograafia
- Font: **Inter** (400/500/600/700), `letter-spacing: -0.01em`, `-webkit-font-smoothing: antialiased`
- Põhitekst 13px. Tabeli lahtrid 12.5px. Vihjed 11–11.5px.
- Lehe pealkiri (h1): 17px / 700 / `-0.03em`
- Välja ja veeru sildid: 9px / 700 / UPPERCASE / `letter-spacing: .09em` / `--text-3`
- Suur summa (kokkuvõte): 26px / 700 / `-0.04em`. Malli paremal paneelil 20px.
- Numbrid: `font-variant-numeric: tabular-nums` (klass `.mono`). Formaat on `et-EE`, 2 kohta (`1 334,24 €`), `€` eelneb püsitühik.

### Mõõdud
- Raadiused: kaart 11px, nupp ja sisend 7px, silt 5–6px, avatar 5px (paneelis 7px), modaal 13px
- Nupu kõrgus 27px (sm: 25px), sisendi kõrgus 28–29px, koguse sisend 28px × 78px
- Tabeli rida: nimekiri 48px, Kogused 42px, malli read 32px
- Kaardi vari: `0 1px 2px rgba(0,0,0,.03)`. Menüü vari: `0 10px 28px rgba(0,0,0,.13)`
- Fookus: `border-color: --text` ja `box-shadow: 0 0 0 3px rgba(0,0,0,.06)`

### Olekusildid
Kõrgus 21px, padding `0 7px`, raadius 6px, 10.5px / 600. Ees on 5px värviline täpp (`currentColor`).
| Olek | Klass | Värvid |
|---|---|---|
| Aktiivne / Valmis / Saadetud | ok | `--pos` `--pos-soft` peal |
| Ootab kogust / Ootab | w | `#8a5a0c` `#fbefd6` peal |
| Hilinenud / Ebaõnnestus / N viga | bad | `--neg` `--neg-soft` peal |
| Peatatud / Vahele | off | `--text-3` `--surface-2` peal |

---

## Vaade 1: Korduvad arved (`Korduvad arved.html`)

**Eesmärk:** leida mall, näha kõigi mallide olekut ja avada või hallata üht malli.

### Paigutus
- **Ülariba** (sticky, taust `--bg`, alumine piir), padding `12px 20px 10px`, kaks rida:
  - Rida 1: rada `Müük /` + h1 „Korduvad arved”. Paremal nupp **Sisesta kogused**, mille märgis näitab ootavate arvete arvu, ja põhinupp **+ Uus mall**.
  - Rida 2: otsing (260px, placeholder „Otsi malli, klienti või koodi”), segmendifilter ja paremal kokkuvõte „**7** aktiivset malli · **18** arvet jooksu kohta”.
- **Sisu:** `display:grid; grid-template-columns: minmax(0,1fr) 340px; gap:12px`, max-width 1500px.
  - Alla 1000px on üks veerg ja paneel liigub tabeli alla.
- **Parem paneel:** 340px, `position: sticky; top:104px`, `max-height: calc(100vh - 120px)`. Sisu keritakse, jalus on fikseeritud.

### Filtrid (segment)
`Kõik` · `Aktiivsed` (st ≠ paused) · `Ootab kogust` (wait või late) · `Vigadega` (on viga või late) · `Peatatud`. Iga nupu järel on loendur. Nuppudel on `white-space: nowrap`.

### Tabeli veerud
| Veerg | Sisu |
|---|---|
| Mall | nimi (600) ja kirjeldus (11px `--text-3`) |
| Kliendid | kuni 3 initsiaaliga avatari (21px, kattuvad −4px, valge 2px rõngas), vajadusel `+N` ja „aktiivsed / kokku” |
| Sagedus | Igakuine / Kvartaalne / Aastane |
| Järgmine arve | kuupäev ja alla „periood 01.10–31.10” |
| Arve kohta | neto, muutuva osaga mallil lisaks „+muutuv” |
| Jooksu summa | neto × aktiivsed kliendid × (1 + KM), 600 |
| Edastamine | Mustand (muutuva reaga) / Automaatne / Ülevaatusele |
| Olek | olekusilt, eelmise jooksu vea korral lisaks punane „1 viga” |
| (tegevused) | hoveril: **Kogused** (ainult muutuva reaga), **Kopeeri**, **Peata/Aktiveeri** |

- Päisel klõps sorteerib veeru järgi, teine klõps pöörab järjekorra (↑/↓). Vaikimisi sorteeritakse järgmise arve järgi kasvavalt.
- Peatatud rida on `--text-3` värvi.
- Jalus (38px): „Näidatud **8** / 8” ja paremal „Oktoobris väljastatakse **11** arvet · püsiosa **7 005,31 €** km-ga”.

### Rea valik
- **Klõps** valib rea: taust `#fff5f1` ja esimesel lahtril `inset 3px 0 0 --accent`. Paneel näitab valitud malli.
- **Topeltklõps** avab malli.
- Kui filter peidab valitud rea, valitakse automaatselt esimene nähtav rida.

### Kokkuvõtte paneel
Sektsioonid on eraldatud 1px piiriga, padding `13px 14px`:
1. **Päis:** 30px avatar (malli initsiaalid), nimi (13.5px/700), kirjeldus, olekusilt. Allpool suur summa „827,23 € / arve” ja rida „KM 24% · neto 667,12 € + muutuv osa”.
2. **2×2 võrk:** Sagedus, Edastamine (muutuva reaga „Mustand · ootab kogust” `#8a5a0c`, automaatne `--pos`), Alustatud, Lõpeb.
3. **Kliendid:** „X / Y aktiivset”. Kuni 4 rida avatari ja nimega (peatatud hallid), vajadusel „+N veel”.
4. **Tulevased jooksud:** 3 rida võrguga `10px 82px 1fr auto`: täpp (järgmisel `--accent` ja kuupäev 700), kuupäev, kirjeldus („ootab kogust” / „järgmine · saadetakse” / „planeeritud”) ja summa.
5. **Genereeritud:** kaardid „periood + olekusilt” (Ebaõnnestus / Saadetud).
6. **Jalus** (`#f9f7f1`): **Peata** `P`, **Muuda** `M` ja kustuta (32px ruut, `--neg` `--neg-soft` peal).

### Kiirklahvid
`/` otsing · `↑ ↓` valik · `Enter`/`M` ava · `P` peata või aktiveeri. Klahvid ei tööta, kui fookus on otsingus.

---

## Vaade 2: Korduva arve mall (`Korduva arve mall.html`)

**Eesmärk:** muuta ühe malli andmeid, ridu, kliente ja ajakava.

### Paigutus
- `.shell` võtab kogu kõrguse (100vh), min-width 1180px. Ülevalt alla: ülariba, keha ja jalus.
- **Ülariba:** „← Korduvad /” + malli nimi, olekusilt „Aktiivne”, silt „Korduv mall”. Paremal „Salvestamata muudatused”, **Loobu** `Esc`, **Kopeeri mall** (menüüs „koos klientidega” / „ilma klientideta”), **Salvesta**, põhinupp **Salvesta ja aktiveeri**.
- **Keha:** vasakul kaart ja paremal paneel (lohistatav eraldaja, paneeli saab peita).
  - **Andmete plokk** (6 veeru võrk, ahendatav): Malli nimi (3 veergu, „ei ole arvel”), **Kliendid** (ainult nupp „+ Lisa klient ⌘K”), Valuuta, Arve number (seeria `MA-2026` + „auto”). Järgmisena Sagedus (chips Kuu/Kvartal/Aasta/…), Väljastamise päev, Alates, Kuni (valikuline), Maksetingimus (7p/14p/30p). Lõpuks Edastamine (segment „Saada automaatselt” / „Ülevaatusele”), Arveldusperiood (jooksev / eelmine / järgmine), Märkused, KM kood, Koostaja.
  - **Vahelehed:** `Tooted N` (vaikimisi) ja `Kliendid N`. Aktiivse vahelehe tähistus on `inset 0 -2px 0 --accent`. Paremal on kontekstivihje.
  - **Tooted:** veerud #, Kood, Kirjeldus, Konto, **Kogus (76px)**, Ühik, Ühikuhind, Ale %, KM, Rea summa ja tegevused (kopeeri, kustuta). Tabeli all on „+ Lisa rida” ja vihje kohatäidete `{periood}` `{kuu}` kohta, mis lisatakse kirjeldusse klõpsuga. Summade ribal on Neto, KM ja Arve kokku.
  - **Kliendid:** read avatari, nime ja registrikoodiga, e-post, kanal (E-arve / E-post / Ei saada), järgmine arve, summa ja olekunupp Aktiivne/Peatatud. All on „+ Lisa klient”.
- **Parem paneel:** Kokkuvõte (summa kuus, neto/KM/kokku, korduvtulu), Perioodilisus (väljade kokkuvõte), Tulevased jooksud (4), Kontroll (✓ / ! read) ja Genereeritud.
- **Jalus:** kiirklahvide vihjed. Paremal Eelvaade, **Sisesta kogused** (ainult muutuva reaga), Genereeri kohe, Peata mall, Kustuta mall.

### Muutuva kogusega rida (UUS)
- Koguse lahtris on sisend ja selle kõrval 18px nupp **±**. Nupp on nähtav hoveril või kui rida on märgitud.
- Märgitud reas (`line.variableQty = true`):
  - koguse sisendi asemel on silt **„iga kord”**: katkendlik piir `#e2c48c`, taust `#fdf8ec`, tekst `#8a5a0c`, 10.5px/600;
  - nupp ± on aktiivne (`#fbefd6` / `#8a5a0c`);
  - rea summa veerus on „muutuv” (`--text-3`) ja rida ei lähe malli summasse;
  - reanumber on värviga `#c9962f`.
- Märgistuse eemaldamisel saab kogus väärtuseks 1, kui see oli 0.
- Teade (toast): „Kogus sisestatakse iga kord · automaatne saatmine peatub”.
- **Mõju mallile**, kui `lines.some(l => l.variableQty)`:
  - Kontrollis on hoiatus „**N** rida vajab igal perioodil kogust. Arved luuakse mustandina ja ootavad sisestamist”.
  - Rida „Arved saadetakse ilma ülevaatuseta” kaob.
  - Perioodilisuse väli Edastamine = „Mustand · ootab kogust” (`#8a5a0c`).
  - Tulevaste jooksude päises on „· ootavad kogust” ja üleval kollane riba „**N** arvet ootab kogust · 03.10.2026”, millel on nupp **Sisesta kogused**. Nupp avab `Kogused?mall=<malli nimi>`.

### Kliendi lisamine
- `⌘K` või „+ Lisa klient” avab otsingumenüü (280px, `position: fixed`, ankurdatud nupu juurde). Otsida saab nime või registrikoodi järgi, `Enter` valib esimese tulemuse ja `Esc` sulgeb.
- Juba lisatud kliendid menüüs ei kuvata.

### Malli kopeerimine
„Kopeeri mall” → „koos klientidega” või „ilma klientideta”. Nimele lisatakse „ (koopia)” ja koopia on peatatud. Ilma klientideta koopia avab kohe kliendi otsingu.

---

## Vaade 3: Kogused (`Kogused.html`)

**Eesmärk:** sisestada ühes kohas kõigi mallide muutuvad kogused valitud perioodiks ja kinnitada arved.

### Paigutus
- **Ülariba** (sticky): rada `Müük / Korduvad arved /` + h1 „Kogused”. Paremal perioodivalik `‹ Oktoober 2026 ›` (silt min 124px, keskel).
  - Rida 2: otsing „Otsi klienti või malli”, segment `Kõik N · Ootab N · Valmis N` ja paremal „**4** malli · **9** arvet”.
- **Sisu:** max-width 1320px, `gap: 12px`. Üks kaart iga malli kohta, millel on sel perioodil muutuva kogusega jooks.
  - **Kaardi päis** (`#f9f7f1`): malli nimi (link mallile), meta-rida „Igakuine · arve 03.10.2026 · periood 01.10–31.10.2026 · saadetakse automaatselt / ülevaatusele”. Mahajäänud jooksul on punane silt **HILINENUD**. Paremal „**1** / 2 valmis”, **Kopeeri eelmise perioodi kogused** ja **Kinnita (N)** (keelatud, kui N = 0).
  - Kui leht avatakse `?mall=`-iga, on see kaart esile tõstetud (`border-color: --text` ja 3px vari), leht keritakse selleni ja fookus on esimesel tühjal lahtril.
  - **Tabel:** Klient (26%) | üks veerg iga muutuva rea kohta (päises „KOGUS”, rea kirjeldus ilma kohatäideteta ja „55,00 € / h”) | Püsiread | Arve kokku (km-ga) | Olek | tegevus.
  - **Koguse lahter:** sisend 78×28, joondatud paremale. Tühjal lahtril on katkendlik piir `#e2c48c` ja taust `#fdf8ec`. Kõrval on ühik ja „eelm. 10” (eelmise perioodi kogus).
  - Olek on **Valmis**, kui kõik muutuvad read on täidetud, muidu **Ootab**. Vahele jäetud kliendil on **Vahele** ja kinnitatud kliendil **Kinnitatud**.
  - Rea tegevus on **Jäta vahele** / **Taasta**. Vahele jäetud rida on hall ja sisendid on keelatud.
- **Jalus** (fixed, `#f4f1e9`): „**3** / 9 valmis · **6** ootab kogust”, „Kinnitatav summa **X €**”, kiirklahvide vihjed (peidetud alla 1100px), **Salvesta mustandina** ja põhinupp **Kinnita valmis arved (N)**. Kui kõik on valmis, on põhinupu tekst „Kinnita kõik N arvet”. Nupp on keelatud, kui N = 0.

### Käitumine
- Sisestamisel arvutatakse arve summa ja olek kohe ümber (ilma kogu vaadet uuesti joonistamata, et fookus säiliks). Decimal-eraldaja võib olla nii „,” kui ka „.”.
- `Enter` viib samas veerus järgmisele kliendile. Ploki lõpus liigub fookus järgmise malli esimesele lahtrile. `Shift+Enter` viib eelmisele ja `Tab` järgmisele väljale.
- **Kopeeri eelmise perioodi kogused** täidab malli kõik mitte-vahele-jäetud read eelmise perioodi väärtustega.
- **Kinnita (N)** / **Kinnita valmis arved** märgib valmis arved kinnitatuks. Seejärel saadetakse need malli `delivery` järgi (auto → saada, review → ülevaatusele). Ülejäänud jäävad ootele. Teade: „AFS_kuutasu: 1 arvet kinnitatud ja saadetud”.
- Filtrid Ootab/Valmis peidavad ridu. Kaart, milles ridu ei jää, peidetakse.
- Kui perioodil ridu pole, on tühi olek: „Sellel perioodil pole koguseid sisestada”.

---

## Andmemudel (soovitus)

```ts
type Frequency = 1 | 2 | 3 | 6 | 12;            // kuud
type Delivery = 'auto' | 'review';

interface RecurringTemplate {
  id: string; name: string; description?: string;
  frequencyMonths: Frequency;
  issueDay: number;                              // 1–28 või 31 = kuu viimane päev
  startDate: string; endDate?: string;
  billingPeriodOffset: -1 | 0 | 1;               // eelmine / jooksev / järgmine
  paymentTermDays: number;
  delivery: Delivery;
  vatCode: string; currency: string; author: string; note?: string;
  status: 'active' | 'paused';
  lines: TemplateLine[];
  clients: TemplateClient[];
}
interface TemplateLine {
  code: string; description: string;             // võib sisaldada {periood}, {kuu}
  account: string; unit: string;
  quantity: number;                              // ignoreeritakse, kui variableQty
  unitPrice: number; discountPct: number;
  variableQty: boolean;                          // UUS
}
interface TemplateClient { clientId: string; email: string; channel: 'e-invoice'|'email'|'none'; active: boolean }

// Üks rida iga (mall × klient × jooks) kohta, kui mallis on variableQty ridu
interface PendingInvoice {
  templateId: string; clientId: string; runDate: string; period: { from: string; to: string };
  quantities: Record<number /*line index*/, number | null>;
  status: 'awaiting_quantity' | 'ready' | 'skipped' | 'confirmed';
}
```

**Tuletatud olekud:**
- Malli olek nimekirjas: `paused`, `late` (runDate < täna ja mõni PendingInvoice on awaiting), `wait` (on variableQty ridu) või `ok`.
- `PendingInvoice.status = 'ready'`, kui kõik variableQty indeksid on täidetud.
- Scheduler: mall ilma variableQty ridadeta genereerib arve ja saadab selle `delivery` järgi. Mall variableQty ridadega loob PendingInvoice kirjed ja arve genereeritakse alles kinnitamisel.

**API vajadus (orienteeruv):**
- `GET /recurring-templates`
- `GET/PUT /recurring-templates/:id`
- `POST /recurring-templates/:id/copy {withClients}`
- `GET /pending-quantities?period=2026-10`
- `PUT /pending-quantities/:id`
- `POST /pending-quantities/confirm {ids[]}`
- `GET .../previous-quantities`

---

## Failid
- `Korduvad arved.html`: mallide nimekiri ja kokkuvõtte paneel
- `Korduva arve mall.html` + `kogused.js`: malli vaade. `kogused.js` lisab malli vaatesse „Sisesta kogused” nupu ja kollase riba.
- `Kogused.html`: globaalne koguste sisestamine

Näidisandmed on iga faili `<script>`-plokis (`M`, `T`, `S`, `DIR`).
