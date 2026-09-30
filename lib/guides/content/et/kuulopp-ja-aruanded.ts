import type { Guide } from '../../types';

/**
 * Kontrollitud koodist 2026-09-30 (month-end, fiscal-years, reports/*, kmdExport).
 * Kuulõpus on praegu ainult amortisatsiooni reegel; perioodi sulgemine on
 * Majandusaastate lehel. KMD-d e-MTA-sse otse ei saadeta (XML laaditakse ise üles).
 */
export const kuuloppJaAruanded: Guide = {
  slug: 'kuulopp-ja-aruanded',
  title: 'Kuulõpp, perioodi sulgemine ja aruanded',
  summary:
    'Kuulõpu automaatkanded (amortisatsioon), kuu sulgemine, KMD koostamine ja põhiaruanded: kasumiaruanne, bilanss, käibeandmik ja teised.',
  category: 'raamatupidamine',
  minutes: 10,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/accounting/month-end', '/accounting/fiscal-years', '/reports'],
  blocks: [
    { type: 'heading', text: 'Kuulõpp' },
    {
      type: 'paragraph',
      text: 'Lehel **Pearaamat → Kuulõpp** teed kuu lõpu automaatkanded. Töölaual on ka kuu lõpu bänner („Kuu … on sulgemata"), mis viib samale lehele.',
    },
    {
      type: 'steps',
      items: [
        { title: 'Vali kuu', text: 'Kuu peab kuuluma olemasolevasse majandusaastasse ja olema avatud.' },
        { title: 'Käivita kuulõpp', text: '**Käivita kuulõpp** teeb **amortisatsiooni** kande: põhivarade kulum arvestatakse kuu lõpuni ja konteeritakse ühe kandega kuu viimase päevaga (koos varasemate vahele jäänud kuudega). Kanne kinnitatakse kohe.' },
        { title: 'Vaata valmisolekut', text: 'Kast „Valmis sulgemiseks / Sulgemist segab" loetleb, mis on veel pooleli: kinnitamata kanded ja arved, töötlemata sisenddokumendid, läbi vaatamata pangatehingud.' },
      ],
    },
    {
      type: 'list',
      items: [
        'Korduv käivitamine ei tee topeltkannet — tulemus on „Juba olemas" või „Pole midagi teha".',
        '**Storneeri** teeb kandele vastupidise kande (põhjus on valikuline) ja lubab kuulõpu uuesti käivitada.',
        'Praegu on kuulõpus ainult amortisatsiooni reegel.',
      ],
    },

    {
      type: 'image',
      src: '/guides/kuulopp-ja-aruanded/01-kuulopp.png',
      alt: 'Kuulõpu leht: kuu valik, nupp Käivita kuulõpp ja sulgemist segavad asjad.',
    },

    { type: 'heading', text: 'Kuu sulgemine' },
    {
      type: 'paragraph',
      text: 'Kuu suletakse lehel **Pearaamat → Majandusaastad**: vajuta perioodi real **Sulge**. Kui kuus on veel lahtisi asju, näed nende loetelu ja saad otsustada, kas sulgeda siiski. **Ava** avab perioodi uuesti; **Sulge aasta** ja **Ava aasta** kehtivad kogu aastale.',
    },
    {
      type: 'callout',
      tone: 'info',
      text: 'Suletud perioodi ei saa kandeid lisada: seal ei saa käivitada kuulõppu ega kinnitada maksepaketi täitmist.',
    },

    { type: 'heading', text: 'Käibedeklaratsioon (KMD)' },
    {
      type: 'steps',
      items: [
        { title: 'Vali kuu', text: 'Lehel **Aruanded → KMD aruanne** vali ühe kalendrikuu periood.' },
        { title: 'Vaata read üle', text: 'Aruanne järgib KMD vormi ridu. Arvesse lähevad ainult kinnitatud arved. Hallid read (nt 5.1–5.4, 7–11) Arvelo arvetelt ei tulene — täida need vajadusel e-MTA-s käsitsi.' },
        { title: 'Kontrolli', text: 'Plokk **Kontrolli enne esitamist** näitab hoiatusi. KMD INF A- ja B-osa loendab partnerid alates 1000 eurost (käibemaksuta).' },
        { title: 'Ekspordi ja esita', text: '**Ekspordi KMD XML** laadib alla deklaratsiooni koos INF lisadega; **Ekspordi KMD INF** ainult lisa. Laadi XML ise e-MTA-sse üles.' },
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      text: 'Arvelo ei saada KMD-d otse e-MTA-sse. XML-i eksport eeldab, et ettevõtte registrikood on seadetes olemas.',
    },

    {
      type: 'image',
      src: '/guides/kuulopp-ja-aruanded/02-kmd.png',
      alt: 'KMD aruanne: periood, ekspordinupud ja deklaratsiooni read.',
      caption: 'Summad on hägustatud.',
    },

    { type: 'heading', text: 'Aruanded' },
    {
      type: 'table',
      headers: ['Aruanne', 'Mida näitab', 'Võrdlus / eksport'],
      rows: [
        ['Kasumiaruanne', 'Tulud ja kulud valitud perioodil', 'Võrdlus eelmise perioodi, eelmise aasta sama perioodi või enda valitud perioodiga; CSV'],
        ['Bilanss', 'Varad, kohustused ja omakapital kuupäeva seisuga', 'Võrdlus eelmise aasta lõpu või sama kuupäevaga eelmisel aastal; CSV'],
        ['Proovibilanss', 'Kõigi kontode saldod kuupäeva seisuga', 'CSV'],
        ['Käibeandmik', 'Algsaldo, perioodi käive ja lõppsaldo konto kaupa', 'CSV'],
        ['Kulukohad ja projektid', 'Arveridade summad kulukoha või projekti kaupa (soovi korral koos mustanditega)', 'CSV'],
        ['Pearaamat', 'Ühe konto kõik kanded perioodil', '—'],
        ['Aegumisaruanne', 'Nõuded ostjate vastu või kohustused tarnijatele tähtaja ületamise järgi (jooksev, 1–30, 31–60, 61–90, 90+ päeva)', 'CSV'],
      ],
    },
    {
      type: 'paragraph',
      text: 'CSV-failid avanevad Excelis õigete täpitähtedega.',
    },
  ],
};
