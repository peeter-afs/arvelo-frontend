import type { Guide } from '../../types';

/**
 * Sõnastus järgib `cash`, `expenseReports`, `selfService` ja `auth.loginLink` tekste — kui UI-s
 * muutub nupu nimi, muuda ka siin. Töötaja iseteenindus: migratsioon 107, /minu, EmployeeAccessDialog.
 */
export const kassaJaKuluaruanded: Guide = {
  slug: 'kassa-ja-kuluaruanded',
  title: 'Kassa, kuluaruanded ja partneri kontokaart',
  summary:
    'Sularaha kassaorderitega ja kassaraamat; töötaja oma rahaga tehtud kulud kuluaruandega; partneri kontokaart ja saldoteatis.',
  category: 'raamatupidamine',
  minutes: 9,
  updatedAt: '2026-10-01',
  relatedRoutes: ['/accounting/cash', '/accounting/expense-reports', '/reports/partner-statement'],
  blocks: [
    { type: 'heading', text: 'Kassa' },
    {
      type: 'paragraph',
      text:
        'Kassa on makseviis liigiga **Sularaha**, mis on seotud kassakontoga (nt 1010 Kassa). Lisa see **Seaded → Ettevõte → Makseviisid** alt. Kassasid võib olla mitu (nt eri kauplustes).',
    },
    {
      type: 'action',
      label: 'Seadista kassa minu eest',
      prompt: 'Seadista mulle kassa: lisa makseviis „Kassa“ liigiga sularaha ja seo see kassakontoga.',
    },
    {
      type: 'steps',
      items: [
        { title: 'Ava Pank → Kassa', text: 'Näed kassaraamatut: algsaldo, kõik liikumised jooksva saldoga ja lõppsaldo.' },
        { title: 'Loo order', text: '**Sissetulekuorder** (KSO), kui raha tuleb kassasse, **väljaminekuorder** (KVO), kui läheb välja. Numbrid antakse automaatselt aasta kaupa, nt KSO-2026-0001.' },
        { title: 'Vali alus', text: '**Müügiarve/ostuarve tasumine** seob orderi tasumata arvega — arve märgitakse tasutuks ja see paistab partneri kontokaardil. **Muu (konto)** konteerib vabalt valitud kontole: nt sularaha viimine panka, omaniku sissemakse või ettemaks töötajale (konto „Aruandvad isikud“, partneriks töötaja).' },
        { title: 'Prindi ja allkirjasta', text: 'Orderi numbril klõpsates avaneb prinditav order kassapidaja ja maksja/saaja allkirjaga.' },
      ],
    },
    {
      type: 'table',
      headers: ['Order', 'Deebet', 'Kreedit'],
      rows: [
        ['Sissetulekuorder', 'kassa', 'vastaskonto (või ostjate nõuded)'],
        ['Väljaminekuorder', 'vastaskonto (või tarnijate võlad)', 'kassa'],
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Kassa ei tohi minna miinusesse',
      text: 'Kui väljaminek viiks kassa orderi kuupäeval miinusesse, küsib Arvelo kinnitust („Salvesta siiski“). Enamasti tähendab see, et mõni sissetulek on sisestamata või vale kuupäevaga.',
    },
    {
      type: 'paragraph',
      text: 'Vigast orderit ei kustutata: **Tühista** teeb kandele storno, order jääb numbriga alles ja on kassaraamatus läbi kriipsutatud.',
    },

    { type: 'heading', text: 'Kuluaruanded' },
    {
      type: 'paragraph',
      text:
        'Kuluaruanne on töötaja (aruandva isiku) oma rahaga tehtud firma kulude kogum — kütus, parkimine, lähetus. Iga tšekk salvestatakse **ostuarvena** tegelikult müüjalt, nii et sisendkäibemaks jõuab KMD-sse ja KMD INF-i nagu iga teise ostu puhul.',
    },
    {
      type: 'steps',
      items: [
        { title: 'Loo kuluaruanne', text: '**Arvete keskus → Kuluaruanded → Uus kuluaruanne**. Vali töötaja; kui teda partnerite hulgas pole, lisatakse ta partnerina — nii saab talle tehtud väljamakse pangas temaga siduda.' },
        { title: 'Lisa tšekid', text: 'Iga tšeki kohta: kuupäev, müüja, tšeki nr, selgitus, kulukonto, **kogusumma koos käibemaksuga** ja KM määr. Neto ja KM arvutatakse määra järgi. Lisa tšeki pilt või PDF — see säilitatakse 7 aastat.' },
        { title: 'Esita ja kinnita', text: '**Kinnita ja konteeri** konteerib kõik tšekid ning kannab summa töötaja ees võlaks kontole „Aruandvad isikud“ (vaikimisi 1240).' },
        { title: 'Hüvita', text: 'Pangast: pangatehingute ülevaatuses **Kanna kontole**, konto „Aruandvad isikud“ ja partneriks töötaja. Kassast: nupp **Maksa kassast** koostab väljaminekuorderi. Seejärel **Märgi hüvitatuks**.' },
      ],
    },
    {
      type: 'table',
      headers: ['Samm', 'Deebet', 'Kreedit'],
      rows: [
        ['Tšekk konteeritakse', 'kulukonto + sisendkäibemaks', 'tarnijate võlad (müüja)'],
        ['Kuluaruanne kinnitatakse', 'tarnijate võlad (müüja)', 'aruandvad isikud (töötaja)'],
        ['Töötajale makstakse', 'aruandvad isikud (töötaja)', 'pank või kassa'],
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      text:
        '„Võlg töötajale“ kuluaruande päises on töötaja saldo aruandvate isikute kontol kõigi tema kuluaruannete ja ettemaksude peale kokku. Kui töötajale anti enne ettemaks kassast, väheneb see võlg vastavalt.',
    },

    { type: 'heading', text: 'Töötaja sisestab kuluaruanded ise' },
    {
      type: 'paragraph',
      text:
        'Töötaja saab tšekid ise telefonis sisestada. Ta ei vaja parooli ega näe raamatupidamist — ainult oma kuluaruandeid.',
    },
    {
      type: 'steps',
      items: [
        { title: 'Saada kutse', text: '**Kuluaruanded → Töötajate iseteenindus**: vali töötaja (partner), sisesta tema e-post ja vajuta **Saada kutse**. Kuluaruande lehelt avaneb sama aken juba valitud töötajaga. Kutse kehtib 7 päeva.' },
        { title: 'Töötaja liitub', text: 'Töötaja avab e-kirjast lingi ja vajutab **Liitu ja logi sisse**. Ta jõuab otse vaatesse **Minu kuluaruanded**. Telefonis pakutakse kohe **pääsuvõtit**: järgmine sisselogimine käib sõrmejälje või näotuvastusega.' },
        { title: 'Töötaja lisab tšekid', text: '**Uus → Lisa tšekk**: pildista tšekk, sisesta müüja, mille eest, summa koos käibemaksuga ja KM määr. Kulukontoks pannakse ettevõtte vaikimisi ostukulu konto. Lõpuks **Esita kinnitamiseks**.' },
        { title: 'Raamatupidaja kinnitab', text: 'Esitamisel saavad teavitatud kasutajad e-kirja lingiga kuluaruandele. Esitatud kuluaruanne on nimekirjas olekuga „Esitatud“. Kontrolli tšekke, vajadusel muuda kulukontot ja vajuta **Kinnita ja konteeri**. Pärast esitamist töötaja aruannet enam muuta ei saa.' },
      ],
    },
    {
      type: 'list',
      items: [
        'Sisselogimiseks valib töötaja sisselogimislehel **Logi sisse pääsuvõtmega** või **Saada sisselogimislink e-postile**. Link kehtib 15 minutit ja ühe korra.',
        'Kui link on aegunud, saab samal lehel kohe uue tellida.',
        'Kui töötaja on juba ettevõtte kasutaja (nt raamatupidaja), seotakse tema konto töötajaga ja ta näeb oma kuluaruandeid aadressil /minu.',
        '**Kuluaruanded → Kinnitajad** määrab, kes saavad kuluaruandeid kinnitada ja kes saavad esitamise kohta e-kirja. Kui kedagi pole valitud, kinnitavad kõik raamatupidajad, administraatorid ja omanik ning teavituse saavad kinnitajad. Muuta saavad omanik ja administraatorid.',
        '**Eemalda ligipääs** samas aknas võtab iseteeninduse ära; töötaja varasemad kuluaruanded jäävad alles.',
      ],
    },

    { type: 'heading', text: 'Partneri kontokaart ja saldoteatis' },
    {
      type: 'paragraph',
      text:
        '**Aruanded → Partneri kontokaart** (või partneri kaardilt link „Partneri kontokaart →“) näitab partneri arveid, kreeditarveid ja laekumisi/tasumisi jooksva saldoga, eraldi nõuded ostjale ja võlad tarnijale.',
    },
    {
      type: 'list',
      items: [
        '**Kontokaart**: vali periood; algsaldo arvutatakse kõigist varasematest dokumentidest.',
        '**Saldoteatis**: vali seisu kuupäev — näed tasumata dokumente ja kinnitamise palvet allkirjaväljadega. Prindi või salvesta PDF-ina ja saada partnerile aastalõpu kinnituseks.',
        'Kui saldo erineb arvete tasumata jäägist (nt panga ümardus kanti maha), näitab kontokaart vahet hoiatusena.',
      ],
    },
  ],
};
