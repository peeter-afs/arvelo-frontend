import type { Guide } from '../../types';

/**
 * Kirjeldab ainult seda, mida PurchaseInvoiceWorkspace / PurchaseInvoiceEditor / ostuarvete
 * import päriselt teevad (kontrollitud koodist 2026-09-30). NB: backend võtab vastu ainult
 * PDF-i ja CSV-d; failist tekib import, mitte arve (v.a pangamustandiga sidumine).
 */
export const ostuarved: Guide = {
  slug: 'ostuarved',
  title: 'Ostuarved: import, kinnitamine ja maksmine',
  summary:
    'Kuidas ostuarve Arvelosse jõuab (PDF, Bolt CSV, pangatehingust), kuidas see kinnitatakse ja konteeritakse ning kuidas koostada maksekorraldus.',
  category: 'arved',
  minutes: 12,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/invoices/purchase', '/invoices/purchase-imports', '/invoices/purchase-approvals'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Ostuarved asuvad lehel **Arvete keskus → Ostuarved**. Vasakul on arvete nimekiri, paremal valitud arve read ja originaal (PDF). Arve avamiseks tee topeltklõps, vajuta **Enter** või **Ava →**.',
    },

    {
      type: 'image',
      src: '/guides/ostuarved/01-nimekiri.png',
      alt: 'Ostuarvete nimekiri: otsing, vahekaardid ja filtrid, arvete loend ning valitud arve paneel.',
      caption: 'Ekraanipildil on tarnijad ja summad hägustatud.',
    },

    { type: 'heading', text: 'Arve elukäik' },
    {
      type: 'steps',
      items: [
        { title: 'Mustand', text: 'Arve andmed on sisestatud või PDF-ist tuvastatud. Mustandit saab muuta ja kustutada.' },
        { title: 'Ootab kinnitust', text: 'Pärast **Saada kinnitamiseks** saab valitud kinnitaja e-kirja ja arve ootab tema otsust.' },
        { title: 'Kinnitatud', text: '**Kinnita** kinnitab arve ja teeb pearaamatu kande. Nüüd saab arve maksekorraldusse lisada.' },
        { title: 'Makstud', text: 'Arve märgitakse makstuks, kui maksepakett täidetakse või pangatehing seotakse arvega.' },
      ],
    },

    { type: 'heading', text: 'Kuidas arve Arvelosse jõuab' },
    {
      type: 'table',
      headers: ['Viis', 'Mis juhtub'],
      rows: [
        ['PDF nimekirja lohistamine või **Laadi üles**', 'Arvelo tuvastab PDF-ist tarnija, summad ja read ning loob **impordi**. Arve mustandi lood lehel **Ostuarvete import**.'],
        ['PDF uue ostuarve lehele lohistamine', 'Kui tarnija tuvastati, luuakse mustand kohe ja see avaneb. Muul juhul avaneb impordi ülevaatus, kus saad tarnija valida.'],
        ['CSV (Bolt eksport)', 'Iga faili rea arvelink laaditakse alla ja töödeldakse nagu PDF. Fail peab sisaldama veergu `user_invoice_link`.'],
        ['Käsitsi', '**Uus ostuarve** (klahv **U**) — sisesta andmed ise.'],
        ['Pangatehingust', 'Kui pangatehingul pole arvet, saad selle ülevaatuses märkida „originaal puudub". Tekib pangamustand, mis ootab originaali.'],
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Toetatud failid',
      text: 'Arvelo töötleb **PDF-faile** ja **Bolt CSV-d**. Pilte ja e-arve XML-i praegu ei toetata.',
    },
    {
      type: 'list',
      items: [
        '**Sama faili ei impordita kaks korda** — Arvelo tunneb faili ära ka siis, kui see on üles laaditud teise kanali kaudu.',
        '**Pangamustandiga sidumine:** kui üleslaaditud PDF-i summa klapib ootel pangamustandiga, seotakse PDF sellega automaatselt originaaliks ja meeldetuletused peatuvad.',
        'Kui uue arve vormis on juba andmeid, seotakse lohistatud PDF selle arve **originaaliks**, mitte ei impordita uueks arveks.',
      ],
    },

    { type: 'heading', text: 'Ostuarvete import' },
    {
      type: 'steps',
      items: [
        { title: 'Vali import', text: 'Lehel **Arvete keskus → Ostuarvete import** on vasakul impordijärjekord.' },
        { title: 'Kontrolli tuvastatud andmeid', text: 'Paranda vajadusel tarnija, arve number, kuupäevad, summad ja read. **Dokumendi tüüp** eristab ostuarvet ja kreeditarvet.' },
        { title: 'Seo tarnija', text: 'Kinnita pakutud tarnija või vali see käsitsi. Ilma tarnijata mustandit ei looda.' },
        { title: 'Loo mustand', text: '**Loo ostuarve mustand** loob arve. Kui Arvelo kahtlustab duplikaati, pead selle enne kinnitama. Seejärel leiad mustandi lehelt Ostuarved.' },
      ],
    },

    { type: 'heading', text: 'Arve täitmine ja kinnitamine' },
    {
      type: 'list',
      items: [
        '**Tarnija** — otsi nime järgi (**⌘K**). Tarnija maksetingimus ja IBAN võetakse partnerikaardilt.',
        '**Tarnija arve nr** — Arvelo hoiatab, kui sama tarnija sama numbriga arve on juba sisestatud.',
        '**Saaja IBAN** kontrollitakse; hoiatus, kui see erineb partnerikaardist.',
        '**Kulukonto** igal real. Paneelil **Konteering → Muuda kontosid** saad muuta sisendkäibemaksu ja võlgade kontot ning käibemaksu mahaarvamise protsenti (100 / 50 / 0%).',
        '**Kinnitaja** saab arve kinnitamiseks saatmisel e-kirja lingiga.',
        'Paneel **Originaal** näitab PDF-i kõrvuti arvega; **Kontroll** hoiatab, kui summa erineb originaalist.',
      ],
    },
    {
      type: 'paragraph',
      text: '**Saada kinnitamiseks** muudab arve olekuks „Ootab kinnitust". Kinnitaja avab arve ja vajutab **Kinnita** (arve kinnitatakse ja konteeritakse) või **Lükka tagasi** koos põhjusega. Tagasi lükatud arve saab parandada ja uuesti saata. Mitu ootel arvet saad kinnitada korraga: märgi read ja vajuta **Kinnita (n)**.',
    },
    {
      type: 'callout',
      tone: 'warning',
      text: 'Kinnitatud ja makstud ostuarve on lukus. Vea parandamiseks koosta **kreeditarve**.',
    },

    {
      type: 'image',
      src: '/guides/ostuarved/02-uus-arve.png',
      alt: 'Uus ostuarve: tarnija, kuupäevad, IBAN, kinnitaja, read ja paremal kontroll ning konteering.',
    },

    { type: 'heading', text: 'Maksmine' },
    {
      type: 'steps',
      items: [
        { title: 'Märgi arved', text: 'Märgi nimekirjas makstavad arved (linnuke või klahv **x**) ja vajuta **Koosta maksekorraldus**. Ainult kinnitatud ja veel maksepakki lisamata arved lähevad kaasa.' },
        { title: 'Vali maksja konto ja kuupäev', text: '**Koondamine** — „Iga arve eraldi" või „Koonda saaja kaupa" (ühe tarnija arved üheks maksuks).' },
        { title: 'Salvesta või laadi fail', text: '**Salvesta maksepakina** loob maksepaketi. **Laadi pangafail (pain.001)** loob paketi ja laadib alla faili, mille saad internetipanka üles laadida.' },
        { title: 'Kinnita täitmine', text: 'Kui pank on maksed teinud, ava **Pank → Maksepaketid** ja vajuta **Kinnita täitmine** — alles siis märgitakse arved makstuks.' },
      ],
    },
    {
      type: 'paragraph',
      text: 'Lähemalt: [Maksed ja maksepaketid](/help/maksed-ja-maksepaketid).',
    },

    { type: 'heading', text: 'Pangamustand ja puuduv originaal' },
    {
      type: 'paragraph',
      text: 'Pangatehingust loodud mustandil on märge „originaal puudub". Vahekaardil **Originaal** saad originaali üles laadida, saata meeldetuletuse kohe (**Saada meeldetuletus kohe**) või märkida, et originaali ei tule (**Originaali ei tule**). Meeldetuletuste sagedus ja saaja on seadetes.',
    },

    { type: 'heading', text: 'Kiirklahvid' },
    {
      type: 'table',
      headers: ['Klahv', 'Tegevus'],
      rows: [
        ['/', 'Otsing (arve number, tarnija, viitenumber)'],
        ['U', 'Uus ostuarve'],
        ['J / K või ↓ / ↑', 'Järgmine / eelmine arve'],
        ['X', 'Märgi rida'],
        ['Enter', 'Ava valitud arve'],
        ['⌘O (editoris)', 'Näita / peida originaal'],
      ],
    },
  ],
};
