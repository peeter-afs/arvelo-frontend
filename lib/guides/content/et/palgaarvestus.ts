import type { Guide } from '../../types';

/**
 * Sõnastus järgib `payroll` tekste — kui UI-s muutub nupu nimi, muuda ka siin.
 * Arvutus: backend services/payroll/payrollCalculator.ts; TSD: tsdXbrl.ts (migratsioon 109).
 */
export const palgaarvestus: Guide = {
  slug: 'palgaarvestus',
  title: 'Palgaarvestus ja TSD',
  summary:
    'Töötajad ja lepingud, kuu palgaarvestus, maksud ja kanne, palga ja maksude väljamaksed ning andmepõhine TSD e-MTA-sse.',
  category: 'raamatupidamine',
  minutes: 11,
  updatedAt: '2026-10-06',
  relatedRoutes: ['/payroll'],
  blocks: [
    {
      type: 'paragraph',
      text:
        'Palgaarvestus on mõeldud väikesele ettevõttele: töölepingud, juhatuse liikme tasud ja võlaõiguslikud lepingud Eesti residentidele. Arvelo arvutab maksud, teeb raamatupidamiskande, koostab maksekorralduse ja TSD faili.',
    },

    { type: 'heading', text: 'Töötajad ja lepingud' },
    {
      type: 'steps',
      items: [
        { title: 'Ava Palgaarvestus → Töötajad → Lisa töötaja', text: 'Vali olemasolev partner (nt sama inimene, kes esitab kuluaruandeid) või sisesta uus nimi.' },
        { title: 'Sisesta isikukood ja IBAN', text: 'Isikukood on vajalik TSD jaoks ja salvestatakse krüpteeritult. IBAN-ile makstakse netopalk.' },
        { title: 'Märgi maksuandmed', text: '**II sammas** (0, 2, 4 või 6%), kas töötaja on esitanud **maksuvaba tulu avalduse** (ja millises summas), kas ta on **vanaduspensionieas**.' },
        { title: 'Lisa leping', text: 'Lepingu liik määrab maksud ja TSD väljamakse liigi. Kuupalk või tunnitasu, vajadusel oma kulukonto, kulukoht ja projekt.' },
      ],
    },
    {
      type: 'table',
      headers: ['Leping', 'TSD liik', 'Sotsiaalmaks', 'Töötuskindlustus', 'II sammas'],
      rows: [
        ['Tööleping', '10', '33%, vähemalt kuumäära pealt', '1,6% + 0,8%', 'jah'],
        ['Juhatuse liige', '21', '33%, miinimumita', 'ei', 'jah'],
        ['Võlaõiguslik leping', '17', '33%, miinimumita', 'ei', 'jah'],
        ['Haigushüvitis (tööandja)', '24', 'ei', 'ei', 'ei'],
      ],
    },

    { type: 'heading', text: 'Kuu palgaarvestus' },
    {
      type: 'steps',
      items: [
        { title: 'Uus palgaarvestus', text: 'Vali töökuu. Mustandisse tulevad kõik lepingud, mis sel kuul kehtivad. Väljamakse kuupäev on vaikimisi järgmise kuu palgapäev.' },
        { title: 'Kontrolli ja täienda', text: 'Põhipalk, puhkusetasu ja haigushüvitis arvutatakse lepingu ja puudumiste põhjal (✦ märgiga read). Klõpsa töötaja real, et lisada preemia või muuta summasid — muudetud rida jääb käsitsi reaks. Iga muudatuse järel arvutatakse kogu arvestus uuesti.' },
        { title: 'Kinnita', text: 'Summad lukustuvad. Vajadusel saab **Ava muutmiseks**.' },
        { title: 'Konteeri', text: 'Tehakse üks kanne töökuu viimase kuupäevaga.' },
      ],
    },
    {
      type: 'table',
      headers: ['Kanne', 'Deebet', 'Kreedit'],
      rows: [
        ['Brutopalk', '4210 Palgakulu', ''],
        ['Sotsiaalmaks', '4220 Sotsiaalmaks', '2410 Sotsiaalmaks'],
        ['Töötuskindlustus (tööandja)', '4230 Töötuskindlustusmakse', '2430 Töötuskindlustusmakse'],
        ['Netopalk', '', '2300 Võlad töövõtjatele (töötaja kaupa)'],
        ['Kinnipeetud tulumaks', '', '2420 Üksikisiku tulumaks'],
        ['Töötuskindlustus (töötaja)', '', '2430 Töötuskindlustusmakse'],
        ['Kogumispension', '', '2440 Kohustuslik kogumispension'],
      ],
    },
    {
      type: 'paragraph',
      text: 'Kontosid saab muuta **Palgaarvestus → Seaded** all; lepingul valitud kulukonto ja dimensioonid lähevad palgakulu reale.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Kuidas maksud arvutatakse',
      text:
        'Brutost peetakse kinni kogumispension ja töötuskindlustus, seejärel arvatakse maha maksuvaba tulu (2026: kuni 700 €, vanaduspensionieas kuni 776 €) ja ülejäänult tulumaks 22%. Maksuvaba tulu on inimese kohta kuus üks — mitme lepingu puhul jagatakse see lepingute vahel. Sotsiaalmaksu miinimum (2026: 886 € kuumäär) lisatakse tööle­pingule automaatselt; kui sel kuul kehtib seaduses toodud erand, lülita see töötaja real välja.',
    },

    { type: 'heading', text: 'Väljamaksed' },
    {
      type: 'paragraph',
      text:
        'Konteeritud arvestuses vajuta **Koosta maksed**: iga töötaja netopalk läheb tema IBAN-ile ja soovi korral maksud ühe maksekorraldusena Rahandusministeeriumi kontole sinu pangas, viitenumbriks ettevõtte ettemaksukonto viitenumber (lisa see seadetes). Maksekorraldus tekib **Pank → Maksekorraldused** alla, kust saad selle panka saata või failina alla laadida.',
    },
    {
      type: 'paragraph',
      text: 'Kui pangaväljavõttes on hiljem makse Maksu- ja Tolliametile, pakub Arvelo selle jaotuse maksukontode vahel ette.',
    },

    { type: 'heading', text: 'TSD (andmepõhine, alates oktoobrist 2026)' },
    {
      type: 'paragraph',
      text:
        'Alates oktoobri 2026 väljamaksetest esitatakse TSD lisa 1 andmed uues XBRL GL failivormingus. TSD esitatakse **väljamakse kuu** järgi: septembri palk, mis makstakse 10. oktoobril, läheb oktoobri TSD-sse (tähtaeg 10. november).',
    },
    {
      type: 'steps',
      items: [
        { title: 'Laadi fail alla', text: '**Palgaarvestus → TSD fail**, vali väljamakse kuu ja vorming — või arvestuse lehel nupp **TSD**.' },
        { title: 'Laadi üles e-MTA-s', text: 'e-MTA TSD palgaväljamaksete vaates vali faili üleslaadimine.' },
        { title: 'Kontrolli ja kinnita', text: 'e-MTA koostab andmetest deklaratsiooni; kontrolli summasid ja kinnita deklaratsioon e-MTA-s.' },
      ],
    },
    {
      type: 'table',
      headers: ['Vorming', 'Mida sisaldab', 'Millal kasutada'],
      rows: [
        ['Andmepõhine TSD — väljamakse kaupa', 'iga väljamakse (kuupäev + liik) eraldi kirjena', 'EMTA uus põhivorming'],
        ['Andmepõhine TSD — kuu koond', 'inimese kuu väljamaksed liigi kaupa üheks kirjeks (nt palk 1. ja boonus 20. kuupäeval)', 'kui soovid kuu kaupa kokkuvõtet uues vormingus'],
        ['CSV — vana lisa 1', 'üks rida inimese ja liigi kohta', 'e-MTA võtab vastu kuni 2027. aasta lõpuni'],
      ],
    },
    {
      type: 'paragraph',
      text:
        'Käsitsi sisestamiseks ava **Palgaarvestus → TSD**: näed sama kuu ridu inimese ja liigi kaupa kokku võetuna, iga väärtus on ühe klõpsuga kopeeritav. Sisesta read e-MTA palgaväljamaksete vaates ja võrdle e-MTA arvutatud maksusummasid tabeli kokkuvõttega. Eri inimesi ühele reale kokku võtta ei saa — maksuvaba tulu, kogumispension ja sotsiaalmaksu miinimum on inimesepõhised.',
    },
    {
      type: 'paragraph',
      text: 'XBRL-faili jäävad vaikimisi välja kirjed, mis olid juba varasemas failis (e-MTA ei võta sama kirjet uuesti uuena vastu). Kui laadisid faili alla, aga ei saatnud seda, märgi „Kaasa ka varem alla laaditud kirjed“.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Parandused pärast esitamist',
      text:
        'Iga väljamakse saadetakse püsiva tunnusega ja sama tunnust ei saa uuesti „uue“ väljamaksena saata. Kui esitatud arvestus on vale: **Tühista** arvestus (tehakse stornokanne), laadi alla **TSD tühistusfail** ja laadi see e-MTA-sse, seejärel koosta uus arvestus ja uus TSD fail.',
    },

    { type: 'heading', text: 'Puudumised: puhkus ja haigusleht' },
    {
      type: 'paragraph',
      text:
        'Sisesta puudumised **Palgaarvestus → Puudumised** all. Puudumise põhjal arvutab Arvelo kuupalga töötatud tööpäevade järgi, puhkusetasu ja tööandja makstava haigushüvitise. Kui sama kuu palgaarvestus on mustandis, uuendatakse see automaatselt; käsitsi lisatud read jäävad alles.',
    },
    {
      type: 'table',
      headers: ['Puudumine', 'Kuupalk', 'Makstakse'],
      rows: [
        ['Põhipuhkus', 'väheneb puhkuse tööpäevade võrra', 'puhkusetasu = keskmine päevatasu × puhkusepäevad (riigipühad ei ole puhkusepäevad)'],
        ['Haigusleht', 'väheneb haiguse tööpäevade võrra', '4.–8. päev 70% keskmisest päevatasust (haigushüvitis, TSD liik 24); 1.–3. päeva eest ei maksta, alates 9. päevast maksab Tervisekassa'],
        ['Palgata puhkus', 'väheneb', '—'],
      ],
    },
    {
      type: 'paragraph',
      text:
        '**Keskmine päevatasu** = puudumisele eelnenud 6 kalendrikuu töötasu (ilma puhkusetasu ja haigushüvitiseta) jagatud nende kuude kalendripäevadega, millest on maha arvatud puudumise päevad. Riigipühi maha ei arvata. Lühema töösuhte puhul arvestatakse töötatud aega; kui palgaajalugu Arvelos puudub, võetakse aluseks lepingujärgne tasu. Vajadusel saab keskmise päevatasu puudumise juures käsitsi sisestada (nt kui ajalugu on vanas palgaprogrammis).',
    },
    {
      type: 'steps',
      items: [
        { title: 'Vali puhkusetasu maksmise viis', text: '**Enne puhkust eraldi maksena** (seaduse vaikimisi viis) või **koos palgaga** (kokkuleppel). Ettevõtte vaikimisi valik on seadetes; iga puhkuse juures saab seda muuta. Hiljem tuleb see valik otse töötaja puhkuseavalduselt.' },
        { title: 'Eraldi makse', text: 'Puudumiste loendis või palgaarvestuse hoiatuses vajuta **Maksa puhkusetasu**. Tekib lisamakse-arvestus väljamaksega puhkusele eelneval tööpäeval: kinnita, konteeri, koosta maksed. Maksuvaba tulu ja sotsiaalmaksu miinimum jagatakse sama väljamaksekuu arvestuste vahel.' },
        { title: 'Koos palgaga', text: 'Puhkusetasu tuleb automaatselt selle kuu palgaarvestusse, mil puhkus algab.' },
      ],
    },
    {
      type: 'paragraph',
      text: '**Puhkusejääk** on töötaja kaardil: 28 päeva aastas (lepingus muudetav) teenitakse kalendripäevade järgi. Kui palgaarvestus tuleb teisest programmist, sisesta lepingule kasutamata päevade algjääk ja selle kuupäev.',
    },

    { type: 'heading', text: 'Puhkuseavaldused' },
    {
      type: 'steps',
      items: [
        { title: 'Töötaja taotleb', text: 'Iseteeninduses (**/minu**) näeb töötaja oma puhkusejääki ja vajutab **Taotle puhkust**: põhipuhkus või palgata puhkus, kuupäevad ning põhipuhkuse puhul, kas puhkusetasu makstakse **enne puhkust** või **koos palgaga**. Otsustamata avalduse saab ta tagasi võtta.' },
        { title: 'Kinnitaja otsustab', text: 'Kinnitajad saavad e-kirja; avaldused ootavad **Palgaarvestus → Puudumised** lehe ülaosas. Kinnitamisel saab puhkusetasu maksmise viisi veel muuta.' },
        { title: 'Kinnitamisel tekib puudumine', text: 'Puudumine arvestatakse palka (kuupalk, puhkusetasu) nagu käsitsi lisatud puudumine. Tagasilükkamine ei mõjuta palka. Töötaja saab otsuse kohta e-kirja.' },
      ],
    },
    {
      type: 'paragraph',
      text: 'Kinnitajad valitakse **Palgaarvestus → Seaded** all. Kui kedagi pole valitud, saavad kinnitada kõik omanikud, administraatorid ja raamatupidajad. Puhkust saab taotleda töötaja, kes on palgaarvestuses töölepinguga ja kellel on iseteeninduse ligipääs.',
    },

    { type: 'heading', text: 'Töötaja palgaleht' },
    {
      type: 'paragraph',
      text:
        'Kui töötajal on iseteeninduse ligipääs (Kuluaruanded → Töötajate iseteenindus), näeb ta lehel **/minu** oma konteeritud palgalehti: tasud, kinnipidamised, netopalk ja tööandja makstud maksud. Palgalehe saab printida.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Mida palgaarvestus veel ei tee',
      text:
        'Mitteresidendid, erisoodustused, kinnipidamised (nt täitmisteated) ja töötamise register (TÖR). Tööõnnetuse, kutsehaiguse ja rasedusega seotud haigushüvitis sisestatakse käsitsi.',
    },
  ],
};
