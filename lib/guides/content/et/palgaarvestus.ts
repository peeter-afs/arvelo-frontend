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
  minutes: 8,
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
        { title: 'Kontrolli ja täienda', text: 'Klõpsa töötaja real, et lisada preemia, puhkusetasu, haigushüvitis või muuta põhipalka (nt kui leping algas kuu keskel). Iga muudatuse järel arvutatakse kogu arvestus uuesti.' },
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
        { title: 'Laadi fail alla', text: '**Palgaarvestus → TSD fail**, vali väljamakse kuu — või arvestuse lehel nupp **TSD**.' },
        { title: 'Laadi üles e-MTA-s', text: 'e-MTA TSD palgaväljamaksete vaates vali faili üleslaadimine (XBRL GL).' },
        { title: 'Kontrolli ja kinnita', text: 'e-MTA koostab andmetest deklaratsiooni; kontrolli summasid ja kinnita deklaratsioon e-MTA-s.' },
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Parandused pärast esitamist',
      text:
        'Iga väljamakse saadetakse püsiva tunnusega ja sama tunnust ei saa uuesti „uue“ väljamaksena saata. Kui esitatud arvestus on vale: **Tühista** arvestus (tehakse stornokanne), laadi alla **TSD tühistusfail** ja laadi see e-MTA-sse, seejärel koosta uus arvestus ja uus TSD fail.',
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
        'Puhkusetasu keskmise töötasu arvutus ja haigushüvitise päevade arvestus (summa sisestatakse praegu käsitsi), mitteresidendid, erisoodustused, kinnipidamised (nt täitmisteated) ja töötamise register (TÖR).',
    },
  ],
};
