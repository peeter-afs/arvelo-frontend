import type { Guide } from '../../types';

/**
 * Sõnastus järgib teadlikult lehel kuvatavaid `accounting.ob*` tekste — kui UI-s
 * muutub nupu või veeru nimi, muuda ka siin.
 */
export const algsaldodeImport: Guide = {
  slug: 'algsaldode-import',
  title: 'Algsaldode import',
  summary:
    'Kuidas tuua vana tarkvara saldod Arvelosse: impordiviisi valik, bilanss, käibeandmik, tasumata arved, kontrollbilanss ja lukustamine.',
  category: 'alustamine',
  minutes: 15,
  updatedAt: '2026-09-01',
  relatedRoutes: ['/accounting/opening-balances'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Algsaldod on see punkt, kust Arvelo raamatupidamine algab. Impordid vana tarkvara saldod ühe korra, ja edasi kirjendad kõik Arvelos. See juhend käib läbi kogu voo lehel **Pearaamat → Algsaldod**.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Kui palju aega kulub',
      text: 'Aastavahetuse import on tavaliselt 15–30 minutit. Kesk-aasta üleminek võtab kauem, sest dokumente on neli ja lõpus tuleb saldod vana tarkvara bilansiga kokku viia.',
    },

    { type: 'heading', text: 'Mida import tegelikult teeb' },
    {
      type: 'paragraph',
      text: 'Algsaldode import loob kahte liiki andmeid ja neil on erinev roll:',
    },
    {
      type: 'list',
      items: [
        '**Pearaamatu kanded** — bilansi ja käibeandmiku read postitatakse päris kannetena. Nendest tulevad aruanded: bilanss, kasumiaruanne, käibeandmik.',
        '**Avatud kirjed** — tasumata müügi- ja ostuarved luuakse arvetena, mille vastu saab hiljem laekumisi ja makseid sobitada. Ilma nendeta ei tea Arvelo, milline klient sulle mida võlgneb.',
      ],
    },
    {
      type: 'paragraph',
      text: 'Enamik segadust tuleb sellest, et **AR/AP saldo võib tulla mõlemast kohast**. Kui nõuete koondsumma on juba bilansis või käibeandmikus, siis ei tohi tasumata arved seda teist korda pearaamatusse lisada. Just selle vältimiseks pead alguses valima impordiviisi.',
    },

    { type: 'heading', text: 'Enne alustamist' },
    {
      type: 'steps',
      items: [
        {
          title: 'Kontoplaan',
          text: 'Kontoplaan võib olla tühi — puuduvad kontod luuakse impordi käigus. Ülevaatuse sammus märgitakse need „uus · luuakse kinnitamisel".',
        },
        {
          title: 'Majandusaasta',
          text: 'Vaikimisi 1.1–31.12. Mittekalendrilise majandusaasta puhul muuda üldise impordi ülevaatuses välja „Majandusaasta" lõppkuupäeva.',
        },
        {
          title: 'Dokumendid vana tarkvarast',
          text: 'Vaata alt tabelist, millised dokumendid sinu stsenaariumi jaoks vaja on. Kõige kindlam vorming on Merit Excel; muud PDF-id ja Excelid loeb AI-parser.',
        },
        {
          title: 'Kontrolli, et algsaldosid pole juba imporditud',
          text: 'Kui on, näitab leht „Algsaldod on juba imporditud". Enne uut importi lähtesta olemasolevad Seaded → Andmehaldus alt või impordi üks kiht uuesti (vt allpool).',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Faili üleslaadimisel saad valida välja **Impordi allikas**: „Automaatne tuvastus" (vaikeväärtus, sobib enamasti), „Merit" või „Muu (AI)". Vali käsitsi ainult siis, kui automaatne tuvastus loeb faili valesti.',
    },

    { type: 'heading', text: 'Vali impordiviis' },
    {
      type: 'paragraph',
      text: 'Esimesel korral küsib leht: **Kuidas algsaldod imporditakse?** Vastus sõltub sellest, mis dokumendid sul on ja mis kuupäeval üle lähed.',
    },
    {
      type: 'table',
      headers: ['Impordiviis', 'Millal valida', 'Mida impordid'],
      rows: [
        [
          'Käibeandmikuga',
          'Lähed üle majandusaasta alguses ja sul on pearaamatu algsaldod (bilanss / käibeandmik).',
          'Kõigepealt üldine pearaamat, seejärel nõuded ja kohustused.',
        ],
        [
          'Ilma käibeandmikuta',
          'Pearaamatu saldosid ei impordi — vajad ainult tasumata arvete nimekirja.',
          'Ainult nõuete ja kohustuste avatud kirjed. Käibeandmiku import lukustatakse, et vältida topeltkandeid.',
        ],
        [
          'Kesk-aasta üleminek',
          'Lähed üle keset majandusaastat (nt 1. juuli seisuga).',
          'Neli dokumenti: aasta lõpu bilanss, käibeandmik, tasumata arved, kontrollbilanss.',
        ],
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Impordiviisi saab muuta ainult enne esimest kinnitamist',
      text: 'Kuni midagi pole kinnitatud, on päises nupp „Muuda importimise viisi". Pärast esimest kinnitatud kihti see kaob — viisi vahetamiseks tuleb algsaldod täielikult lähtestada.',
    },

    { type: 'heading', text: 'Neli sammu igas impordis' },
    {
      type: 'paragraph',
      text: 'Iga dokument — bilanss, käibeandmik, nõuded, kohustused — käib läbi sama nelja sammu. Päises näed, kus parasjagu oled.',
    },
    {
      type: 'steps',
      items: [
        {
          title: '1. Üleslaadimine',
          text: 'Lohista fail kasti või vajuta „Vali fail". Kui faili pole, vali „Sisesta algsaldod käsitsi →" ja täida read ise.',
        },
        {
          title: '2. Töötlemine',
          text: 'Algab automaatselt, eraldi nuppu ei ole. Arvelo loeb failist kontod, pooled ja summad.',
        },
        {
          title: '3. Ülevaatus',
          text: 'Siin tehakse kogu töö: kontode sidumine, summade parandamine, ridade lisamine. Read, mis vajavad kontot, on esile tõstetud ja jäävad muidu bilansist välja.',
        },
        {
          title: '4. Kinnitamine',
          text: 'Enne kinnitamist tuleb teha eelvaade. Eelvaade näitab täpselt selle kande, mis postitatakse; „Kinnita algsaldod" postitab selle pearaamatusse.',
        },
      ],
    },
    {
      type: 'image',
      src: '/guides/algsaldode-import/02-uleslaadimine.png',
      alt: 'Üleslaadimise samm: lohistamise ala, nupp „Vali fail" ja valik „Impordi allikas".',
      caption: 'Üleslaadimise samm. Vaikimisi on „Impordi allikas" automaatne tuvastus.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Eelvaade on kohustuslik ja aegub',
      text: 'Kui muudad pärast eelvaadet kasvõi ühte rida, muutub eelvaade kehtetuks ja kuvatakse teade „Andmed on pärast eelvaadet muutunud — mine tagasi ja tee uus eelvaade". See on tahtlik: kinnitatakse ainult see, mida sa päriselt nägid.',
    },

    { type: 'heading', text: 'Ülevaatuse samm lähemalt' },
    {
      type: 'list',
      items: [
        '**Konto** — vali ripploendist olemasolev konto või kirjuta uus kood. Uued kontod märgitakse „uus · luuakse kinnitamisel" ja loendis tärniga; need luuakse alles kinnitamisel.',
        '**Pool ja Summa** — deebet või kreedit. Jälgi allservas olevat riba: „Deebet", „Kreedit" ja „Vahe".',
        '**Vahe peab olema 0.00.** Kuni pole, ei saa edasi — nupp on keelatud ja kuvatakse „Kanne ei ole tasakaalus".',
        '**Partner ja Kirjeldus** on üldise pearaamatu ridadel valikulised.',
        '**Bilansi kokkuvõte** paremal näitab varasid, kohustusi ja omakapitali ning tasakaalu kontrolli. Kontota read on sellest kokkuvõttest välja jäetud — sellepärast võib kokkuvõte enne kontode sidumist paigast ära olla.',
      ],
    },

    { type: 'heading', text: 'Aastavahetuse import (Käibeandmikuga)' },
    {
      type: 'steps',
      items: [
        {
          title: 'Vali vahekaart „Üldine" ja laadi üles bilanss',
          text: 'Bilanss või proovibilanss eelmise majandusaasta lõpu seisuga. Määra „Alguskuupäev" = bilansi kuupäev (nt 31.12).',
        },
        {
          title: 'Kontrolli majandusaastat',
          text: 'Väli „Majandusaasta" näitab avatava aasta algust (bilansi kuupäev + 1 päev, ei ole muudetav) ja lõppu. Mittekalendrilise või alustava ettevõtte puhul muuda lõppkuupäeva.',
        },
        {
          title: 'Seo read kontodega ja vii vahe nulli',
          text: 'Vt „Ülevaatuse samm lähemalt".',
        },
        {
          title: 'Eelvaade → Kinnita algsaldod',
        },
        {
          title: 'Impordi nõuded ja kohustused',
          text: 'Vaheta vahekaardile „Nõuded" ja seejärel „Kohustused". Need saab importida alles pärast üldist pearaamatut.',
        },
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Aruandeaasta tulem liigub automaatselt',
      text: 'Aastavahetuse bilansi puhul kantakse aruandeaasta tulem automaatselt eelmiste perioodide jaotamata kasumisse, kandega järgmise majandusaasta esimese päeva seisuga (bilansi kuupäev + 1 päev). Pärast kinnitamist näed teadet, milliselt kontolt millisele summa liikus — nii ei pea sa seda ise kirjendama.',
    },

    { type: 'heading', text: 'Kesk-aasta üleminek: neli kihti' },
    {
      type: 'paragraph',
      text: 'Kui lähed üle keset majandusaastat, ei piisa ühest bilansist — Arvelo peab teadma nii aasta alguse seisu kui ka selle, mis on aasta algusest üleminekuni juhtunud. Päises on nelja sammuga riba, mis näitab, mis on tehtud ja kuhu edasi minna. **Järjekord on kohustuslik.**',
    },
    {
      type: 'image',
      src: '/guides/algsaldode-import/01-sammuriba.png',
      alt: 'Kesk-aasta ülemineku sammuriba nelja kihiga ja parempoolne dokumendi sammunäidik.',
      caption: 'Vasakul neli kihti (roheline linnuke = tehtud), paremal käesoleva dokumendi samm. Kihi nimel klõpsates saad selle juurde tagasi.',
    },
    {
      type: 'steps',
      items: [
        {
          title: '1. Aasta lõpu bilanss',
          text: 'Eelmise majandusaasta lõpu bilanss. Postitatakse majandusaasta algsaldona, vastandiks omakapitali kontole 3900. Kuupäev = majandusaasta algus.',
        },
        {
          title: '2. Käibeandmik (käive)',
          text: 'Jooksva perioodi KÄIVE aasta algusest ülemineku kuupäevani — mitte lõppsaldo. Määra kõigepealt „Perioodi lõpp" (= ülemineku kuupäev), muidu importi ei alusta. Postitatakse ühe tasakaalus liikumiskandena ülemineku kuupäeval.',
        },
        {
          title: '3. Nõuded ja kohustused',
          text: 'Tasumata müügi- ja ostuarved avatud kirjetena. Uusi pearaamatu kandeid ei teki — saldo tuli juba käibeandmikust.',
        },
        {
          title: '4. Kontrollbilanss ja lukustus',
          text: 'Vana tarkvara bilanss ülemineku kuupäeval. Seda ei postitata — sellega kontrollitakse tulemust ja lukustatakse algsaldod.',
        },
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Käibeandmiku puhul sisesta käive, mitte lõppsaldo',
      text: 'Käive = lõppsaldo − algsaldo. Kui vana tarkvara käibeandmikul on eraldi algsaldo, käibe ja lõppsaldo veerud, kasuta käibe veergu. Kui sisestad lõppsaldo, tulevad saldod topelt (aasta algus on juba 1. kihist sees) ja kontroll ei klapi.',
    },
    {
      type: 'paragraph',
      text: 'Kui käibeandmiku algsaldo erineb 1. kihi bilansist, hoiatab Arvelo: „Kontroll: {n} kontol erineb käibeandmiku algsaldo aasta lõpu bilansist" ja näitab iga konto kohta mõlemad väärtused. Enamasti tähendab see, et üks kahest dokumendist on valest kuupäevast.',
    },

    { type: 'heading', text: 'Nõuded ja kohustused (avatud kirjed)' },
    {
      type: 'paragraph',
      text: 'Iga rida muutub pärast kinnitamist üheks arveks — nõuete puhul müügiarveks, kohustuste puhul ostuarveks. Nende vastu saab hiljem pangast laekumisi ja makseid sobitada.',
    },
    {
      type: 'list',
      items: [
        '**Vastaskonto** — kui bilanss või käibeandmik on juba imporditud (ehk sisaldab nõuete/kohustuste koondsummat), vali vastaskontoks AR/AP kontrollkonto, siis ei teki topeltarvestust. Muul juhul vali algsaldode omakapitali konto.',
        '**Kesk-aasta režiimis** luuakse arved ainult avatud kirjetena, pearaamatusse uusi kandeid ei teki. Vastaskonto valikut ei ole vaja.',
        '**Kreeditarved ja ettemaksed** imporditakse negatiivse summaga kirjetena — jäta need nimekirja alles, need on osa saldost.',
        '**Arve nr vs kande nr** — kui failis on nii vana tarkvara kande number (nt MA-198) kui ka päris arve number, läheb kande number viite väljale ja arve number arve numbriks.',
      ],
    },
    {
      type: 'paragraph',
      text: 'Partnerite puhul otsib Arvelo äriregistrist automaatselt need, kellel failis registrikoodi pole. Otsing käib eelvaate ajal, mitte kinnitamisel, ja päises näed edenemist. **Oota otsingu lõppu** — kinnitamise nupp on seni keelatud („Ootan äriregistri otsingu lõppu…"). Kui automaatne otsing vastet ei leidnud, vajuta registrikoodi lahtris luubi ikooni ja otsi käsitsi: seal näed kõiki kandidaate ja ka põhjust, miks automaatne vaste ei tekkinud.',
    },

    { type: 'heading', text: 'Kontroll ja lukustamine' },
    {
      type: 'paragraph',
      text: 'Kesk-aasta ülemineku viimane samm on tõestada, et Arvelo saldod ülemineku kuupäeval on samad, mis vanas tarkvaras. Laadi üles kontrollbilanss — kontroll käivitub kohe pärast faili lugemist, eraldi eelvaadet ega kinnitamist siin ei ole.',
    },
    {
      type: 'table',
      headers: ['Veerg', 'Mida näitab', 'Mida vahe reedab'],
      rows: [
        ['Kontrollbilanss', 'Vana tarkvara saldo — see, mis peab tulema.', 'Kui väärtus on 0.00, siis on konto Arvelos kirjendatud, aga vana tarkvara bilansis puudub.'],
        ['Algsaldo', 'Osa, mis tuli 1. kihist (aasta lõpu bilanss).', 'Viga aasta lõpu bilansis või selle sidumises.'],
        ['Käive', 'Osa, mis tuli 2. kihist (käibeandmik).', 'Viga käibeandmikus — tüüpiliselt lõppsaldo käibe asemel.'],
        ['Algbilanss + käive', 'Arvelo tegelik saldo (Algsaldo + Käive).', '—'],
        ['Vahe', 'Kontrollbilanss − Arvelo saldo.', 'Kuni vahe on üle 0.01, ei saa lukustada.'],
      ],
    },
    {
      type: 'paragraph',
      text: 'Võrdlusest on välja jäetud kasumiaruande kontod — kesk-aasta seisuga on need veel avatud ja jooksva aasta tulem rullitakse omakapitali reale kokku, nii nagu vana tarkvara bilansis.',
    },
    {
      type: 'paragraph',
      text: 'Kui kõik klapib, näed märget **Klapib** ja saad vajutada „Kinnita ja lukusta". Kui ei klapi, on kaks teed:',
    },
    {
      type: 'list',
      ordered: true,
      items: [
        '**Paranda allikas** — leia vahe põhjus ülalolevast tabelist ja impordi vastav kiht uuesti.',
        '**Võta kontrollbilanss õigeks** — vajuta „Kinnita kontrollbilansi saldod ja korrigeeri". Arvelo postitab ülemineku kuupäevaga ühe korrigeerimiskande, mis viib iga erineva konto kontrollbilansi saldole. Uuesti importi pole vaja.',
      ],
    },
    {
      type: 'image',
      src: '/guides/algsaldode-import/03-kontroll.png',
      alt: 'Kontrolli paneel märgisega „Lukustatud" ning nuppudega „Kontrolli uuesti" ja „Kinnita ja lukusta".',
      caption: 'Lukustatud algsaldod. Pärast lukustamist ei saa ühtki kihti enam uuesti importida — ainult täielik lähtestamine.',
    },
    {
      type: 'callout',
      tone: 'success',
      title: 'Imporditud kihid ei sõltu kontrollist',
      text: 'Kõik kinnitatud kihid on juba salvestatud. Nõudeid ja ostuarveid võid importida ka enne, kui kontroll klapib — kontroll on lõplik värav, mitte eeltingimus.',
    },

    { type: 'heading', text: 'Süsteemikontod' },
    {
      type: 'paragraph',
      text: 'Pärast kontoplaani importi küsib Arvelo, millised kontod täidavad süsteemi rolle (nõuded, kohustused, käibemaks, pank jne). Neid kasutavad arvete kinnitamine, pangaread ja käibemaksuarvestus. **Määramata roll peatab arvete kandmise pearaamatusse**, mistõttu jääb määramata rollide kohta püsiv hoiatusriba. Määramise saab edasi lükata („Määran hiljem"), aga mitte ära jätta.',
    },

    { type: 'heading', text: 'Kuidas viga parandada' },
    {
      type: 'table',
      headers: ['Olukord', 'Mida teha'],
      rows: [
        [
          'Üks kiht on vale, teised on õiged',
          'Ava see kiht ja vajuta „Impordi see kiht uuesti". Võetakse tagasi ainult selle kihi kanne; teised jäävad alles.',
        ],
        [
          'Hilisem kiht on juba kinnitatud',
          'Kihid sõltuvad üksteisest järjekorras bilanss → käibeandmik → nõuded/kohustused. Võta kõigepealt tagasi hilisem kiht.',
        ],
        [
          'Algsaldod on juba lukustatud',
          'Ühe kihi uuesti import ei ole enam lubatud. Vajalik on täielik lähtestamine.',
        ],
        [
          'Kõik tuleb otsast alustada',
          'Seaded → Andmehaldus → lähtesta algsaldod. See kustutab kõik kihid, loodud arved ja automaatselt loodud partnerid.',
        ],
      ],
    },

    { type: 'heading', text: 'Levinud vead' },
    {
      type: 'steps',
      items: [
        {
          title: '„Kanne ei ole tasakaalus"',
          text: 'Deebet ja kreedit ei ole võrdsed. Tavaline põhjus: mõni rida on ilma kontota (need jäetakse kokkuvõttest välja) või on pool valesti. Vaata riba „Deebet / Kreedit / Vahe".',
        },
        {
          title: 'Kontroll ei klapi täpselt jooksva aasta kasumi võrra',
          text: 'Vaata rida omakapitali kontodel 2970 / 2980. Eelmise aasta tulem kuulub uue aasta algul jaotamata kasumisse — Arvelo teeb selle ümberklassifitseerimise ise, aga kui andmed on juba imporditud, kasuta nuppu „Kinnita kontrollbilansi saldod ja korrigeeri".',
        },
        {
          title: 'Registrikoodi viga nõuete/kohustuste kinnitamisel',
          text: 'Eesti registrikood peab olema 8-kohaline. Kui failis on registrikoodi veerus KMKR-number (nt EE123456789), paranda see ülevaatuses või otsi partner luubi alt äriregistrist.',
        },
        {
          title: 'Suure faili puhul „aegus"',
          text: 'Lase äriregistri otsingul eelvaate ajal lõpuni käia — kinnitamine ise ei tee enam registripäringuid ja on kiire. Kui lähtestamine aegub, proovi uuesti; see võtab suure andmemahu juures kauem.',
        },
        {
          title: 'Käibeandmiku algsaldo ei klapi bilansiga',
          text: 'Hoiatus 2. kihis tähendab, et käibeandmiku algsaldo veerg ja 1. kihi bilanss on eri kuupäevast. Kontrolli, et bilanss on majandusaasta viimase päeva ja käibeandmik sama aasta algusest.',
        },
      ],
    },
  ],
};
