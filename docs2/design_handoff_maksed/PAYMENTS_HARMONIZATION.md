# Maksed ja maksepaketid: ühtlustamine

Näidis: `Maksed - tihe vaade.html` (+ `maksed-app.js`, `maksed-data.js`). Visuaalne keel on sama mis `Ostuarved - tihe vaade.html`: `--a-*` tokenid, 13px põhikiri, 9.5px suurtähtedega sildid, tabular-nums summad, nimekiri + lohistatav detailipaneel, kinnitatud toimingute riba. Tihe režiim vastavalt `SCREEN_125_COMPACT_MODE.md`.

Repo: `app/(dashboard)/accounting/payments/page.tsx`, `app/(dashboard)/accounting/payment-batches/page.tsx`.

## Mis praegu valesti on
- `slate-*` / `blue-50` / `emerald-*` Tailwindi värvid otse koodis, mitte `--a-*` tokenid. Valitud rida on sinine, mujal rakenduses oranž.
- 5 suurt KPI-kaarti (Mustand 0, Konteeritud 43…) võtavad ~110px kõrgust. Summad `toFixed(2)` ilma tuhandeeraldajata ja ilma valuutata.
- Staatused toorelt inglise keeles (`posted`, `paid`), ei läbi i18n-i.
- Pearaamatu kanne näidatakse UUID-na (`25d930fa-505e-…`), mitte kande numbrina lingiga.
- InfoBox-kaardid (ümarad kastid kastides) iga välja jaoks.
- Maksepakettides on loomise vorm (4 välja + arvete nimekiri + mustandread 12-veerulise gridina) alati lehe vasakul pool, olemasolevad paketid parempoolses kitsas veerus. 6 toimingunuppu on alati üksteise all, enamik disabled.
- Edu-/veateated on suured kaardid lehe ülaosas, nihutavad sisu.

## Ühine kest (mõlemal lehel)
```
[Maksed | Maksepaketid]  ······  SISSETULEV 22 803,20 €  VÄLJAMINEV …  OOTAB KONTEERIMIST 4   [toiming]
[Staatuse sakid + arv] [Suund] [Periood] [Filtri kiip] [Otsing /]
┌ nimekiri (listhead · hoiatusriba · tabel · jalus) ┐┃┌ detail (päis · keritav sisu · toimingute riba) ┐
```
- Mooduli vahetus (`Maksed` / `Maksepaketid`) pealkirja kõrval. Need on eraldi route'id, link hoiab mõlemat ühes kohas. Badge: maksete mustandite arv / pakettide (mustand + tagasi lükatud) arv.
- Näitajad on päises (`metric`), mitte kaartidena. Max 3.
- Teated → **toast** (all keskel, 2,4 s). Viga, mis takistab toimingut, on paneelis `note bad` plokina toimingu kõrval.
- Summad: `toLocaleString('et-EE', {min/max 2}) + ' €'`, alati tabular-nums. Sissetulev roheline `+`, väljaminev `−`.
- Staatused `tag`-komponendiga (sama mis ostuarvetel): punkt + suurtähed.

## Maksed
**Sakid:** Kõik · Mustand (kollane badge) · Konteeritud · Tühistatud. **Suund:** segment Kõik / Sissetulev / Väljaminev (API toetab `direction`).
`?invoice_id=` → sinine filtrikiip „Arve 25833 ×“, mitte peidetud tekst.

**Tabel:** Kuupäev · Partner (avatar + nimi, alarida „Müügiarve 25833“) · Suund · Allikas · Summa · Staatus. Veergude peitmine kitsal laiusel: Allikas → Suund.

**Hoiatusriba:** „N pangast imporditud makset ootab konteerimist · summa“ + „Vaata mustandeid“.

**Detailipaneel:**
1. Päis: partner, „Sissetulev · kuupäev · pangakonto“, summa paremal, staatus + ↑/↓ navigeerimine.
2. *Seotud arve*: kolmene riba Arve kokku / Tasutud / Avatud + edenemisriba; kv-read: Arve (link eelvaatele), Arve olek, Tähtaeg (+ „makstud N p hiljem“), Viitenumber, Selgitus. Link „Kõik selle arve maksed“ paneb filtrikiibi.
3. *Kanne*: kande number lingina (`MK-3410`), D/K tabel. Mustandil eelvaade poolläbipaistvana + märkus „Kanne luuakse konteerimisel“. Tühistatul ka tühistav kanne ja põhjus.
4. *Ajalugu*: ajajoon (import → konteeritud → tühistatud).
5. Toimingute riba (alati nähtav):
   - mustand: vihje „Konteerimisel märgitakse arve tasutuks“ · `Seo teise arvega` · **`Konteeri`** (Enter)
   - konteeritud: `Tühista makse` → riba muutub põhjuse väljaks + Loobu / Tühista (põhjuse väli ei ole enam alati nähtaval)
   - tühistatud: ainult info.

`Registreeri makse` (päises) kasutab olemasolevat `RegisterPaymentDialog`-i.

## Maksepaketid
**Sakid:** Pooleli (draft, generated, uploaded, sent, rejected) · Täidetud · Tühistatud · Kõik. Filter: pangakonto.

**Tabel:** Pakett (nimi, alarida „koostaja · loodud“) · Pangakonto · Täitmine · Ridu · Summa · Staatus. Peitmine: Pangakonto → Ridu.

**Staatused (et):** draft Mustand · generated Fail loodud · uploaded Panka üles laaditud · sent Saadetud panka · confirmed Täidetud · rejected Pank keeldus · voided Tühistatud. `bank_status=rejected` → näita kui „Pank keeldus“ ka siis, kui `status` on sent.

**Hoiatusriba:** tagasi lükatud pakett + panga põhjus + „Ava pakett“.

**Detailipaneel:**
1. Päis: nimi, „konto · IBAN lühend · täitmine kuupäev“, kogusumma, staatus + ↑/↓.
2. Sammud: Mustand → Fail loodud → Pangas → Täidetud (tagasi lükatud = punane 3. samm). Alla olekumärkus: panga vastus (`bank_status`, `bank_status_at`, `bank_status_reason`), käsitsi üleslaadimise juhis, hoiatuste arv mustandil.
3. Andmed: Pangakonto (täis-IBAN), Ühendus (LHV Connect / Swedbank Gateway), Faili vorming, Koostas.
4. Read: Saaja (+ IBAN) · Arve + viide (või käsirida + konto) · Summa (+ rea staatus). `warning_flags` → rida kollase taustaga, hoiatus viite asemel. Kokku-rida.
5. Toimingute riba, ainult staatusele sobivad nupud:
   - draft: `Lae alla ▾` (pain.001 XML / CSV) · **`Saada panka`**
   - generated: `Märgi üles laaditud` · **`Saada panka`**
   - uploaded / sent: **`Kinnita täidetuks`**
   - rejected: **`Paranda ja koosta uuesti`** (uus mustand samade ridadega, vigane rida märgitud)
   - `⋯` menüü: Muuda ridu (draft), Vaata faili, Tühista pakett (punane, kinnitusaken põhjusega; sent/uploaded puhul hoiatus „tühista ka internetipangas“).
   - Disabled nuppe ei näidata.
6. Ekspordifaili eelvaade (`exported_file_content`) → modaal „Vaata faili“, mitte alati lahti `<pre>`.

**Uus maksepakett** = modaal (`max-height:86vh`, keritav sisu, kinnitatud jalus):
- Väljad ühes reas: Pangakonto · Nimi · Täitmise kuupäev. Valuuta EUR vaikimisi, peidetud.
- Tabel: maksmisele ootavad ostuarved (approved / payable / partially_paid), sorteeritud tähtaja järgi. Veerud: ☐ · Saaja + arve nr · IBAN · Tähtaeg (üle tähtaja punane „+N p“) · Viide (✓ / puudub) · Tasumata.
- Eelvalitud: tähtaeg ≤ 7 päeva ja IBAN olemas. Ilma IBAN-ita või juba teises paketis olevad read on disabled koos põhjusega.
- „+ Lisa käsirida“: saaja, IBAN, vastaskonto (select), summa, otse tabelis.
- Prefill (`getPaymentBatchPrefillLines`) jookseb taustal valiku muutmisel; eraldi „Täida read“ samm kaob.
- Jalus: „Valitud N · summa“, hoiatuste kokkuvõte · Loobu · Salvesta mustandina · **Loo ja saada panka**.

## Klaviatuur
↑/↓ (j/k) rida · `/` otsing · Enter konteerib maksete mustandi · N uus pakett · Esc sulgeb modaali.

## Vastuvõtukriteeriumid
- [ ] Ükski `slate-*`, `blue-*`, `emerald-*`, `red-*` klass neis kahes failis; ainult `--a-*` tokenid.
- [ ] Kõik staatused ja suunad tõlgitud, toorväärtust UI-s pole.
- [ ] Summad et-EE vormingus valuutaga, tabular-nums.
- [ ] Kanne kuvatakse numbrina ja lingib pearaamatusse.
- [ ] 1536×730 juures: päis + filtrid 2 rida, nimekirjas ≥ 14 rida, toimingute riba nähtav ilma kerimata.
- [ ] Maksepaketi detailis on ainult staatusele lubatud toimingud.
- [ ] Uue paketi saab luua ühe modaaliga ilma eraldi „Täida read“ sammuta.
