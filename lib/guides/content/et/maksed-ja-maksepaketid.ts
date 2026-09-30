import type { Guide } from '../../types';

/**
 * Kontrollitud koodist 2026-09-30 (payment-batches, payments, BankGatewaysTab,
 * paymentBatch.service, migratsioon 079). NB: ainult „Kinnita täitmine" konteerib ja
 * märgib arved makstuks; „Kinnita üleslaadimine" on ainult olekumärge.
 */
export const maksedJaMaksepaketid: Guide = {
  slug: 'maksed-ja-maksepaketid',
  title: 'Väljaminevad maksed, maksepaketid ja pangaliidesed',
  summary:
    'Ostuarvete tasumine maksepaketiga: paketi koostamine, pangafail (pain.001), saatmine panka LHV või Swedbanki liidesega ning täitmise kinnitamine.',
  category: 'pank',
  minutes: 10,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/accounting/payments', '/accounting/payment-batches'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Tarnijatele maksmiseks koostad **maksepaketi** — nimekirja makseid, millest tehakse pangafail või mis saadetakse otse panka. Maksepaketid asuvad lehel **Pank → Maksepaketid**; kiireim tee on aga ostuarvete nimekirjast (**Koosta maksekorraldus**, vaata [Ostuarved](/help/ostuarved)).',
    },

    {
      type: 'image',
      src: '/guides/maksed-ja-maksepaketid/01-maksepaketid.png',
      alt: 'Maksepakettide leht: uue paketi koostamine vasakul ja olemasolevad paketid paremal.',
    },

    { type: 'heading', text: 'Paketi olekud' },
    {
      type: 'table',
      headers: ['Olek', 'Tähendus'],
      rows: [
        ['Mustand', 'Pakett on loodud, ridu saab veel muuta.'],
        ['Genereeritud', 'Pangafail (CSV või PAIN.001) on tehtud.'],
        ['Üles laaditud', 'Oled märkinud, et laadisid faili internetipanka. See on ainult märge.'],
        ['Kinnitatud', '**Kinnita täitmine** on tehtud: maksed on konteeritud ja arved märgitud makstuks.'],
        ['Tühistatud', 'Pakett tühistati; kandeid ei tehtud.'],
      ],
    },

    { type: 'heading', text: 'Paketi koostamine' },
    {
      type: 'steps',
      items: [
        { title: 'Vali konto ja kuupäev', text: 'Ava **Loo pakett**: vali pangakonto, soovi korral paketi nimi ja täitmise kuupäev.' },
        { title: 'Vali arved', text: 'Loendis **Tasumisele kuuluvad arved** on kinnitatud ostuarved, millel on veel tasumata summa. Märgi arved ja vajuta **Eeltäida read** — saaja, IBAN, viitenumber ja summa täidetakse arvelt.' },
        { title: 'Lisa muud maksed', text: '**Lisa käsitsi makse** — nt maks või üür, mida arvena pole. Sellele reale vali kulu- või kohustusekonto.' },
        { title: 'Loo pakett', text: '**Loo pakett** salvestab paketi mustandina.' },
      ],
    },

    { type: 'heading', text: 'Pangafail või otse panka' },
    {
      type: 'list',
      items: [
        '**Genereeri PAIN.001** või **Genereeri CSV** teeb paketist pangafaili; failisisu näed eelvaates. Faili allalaadimiseks kasuta ostuarvete nimekirjas **Laadi pangafail (pain.001)**.',
        '**Saada panka** saadab paketi otse panka, kui maksja konto on LHV-s või Swedbankis ja pangaliides on seadistatud (vt allpool). Paketi juures näed **panga olekut** (saadetud, vastu võetud, täidetud, tagasi lükatud).',
        'CSV-na eksporditud paketti panka saata ei saa — tühista see ja koosta uus.',
      ],
    },

    { type: 'heading', text: 'Kinnita täitmine' },
    {
      type: 'paragraph',
      text: 'Kui pank on maksed teinud, vajuta paketil **Kinnita täitmine**. Alles see samm:',
    },
    {
      type: 'list',
      items: [
        'loob iga arverea kohta makse ja konteerib selle (deebet: võlad tarnijatele, kreedit: pank);',
        'konteerib käsitsi read valitud kulu- või kohustuskontole;',
        'märgib arved makstuks või osaliselt makstuks.',
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Enne kinnitamist',
      text: 'Vajuta **Kinnita täitmine** alles siis, kui raha on päriselt liikunud. Kannete kuupäev on paketi täitmise kuupäev — see periood peab olema avatud. Kinnitatud paketti tühistada ei saa; üksiku makse saad vajadusel tühistada lehel **Maksed**.',
    },

    { type: 'heading', text: 'Maksed' },
    {
      type: 'paragraph',
      text: 'Lehel **Pank → Maksed** on kõik arvetega seotud sissetulevad ja väljaminevad maksed. Makse juures näed arve tasaarveldust (arve summa, tasutud, avatud). **Konteeri makse** konteerib mustandmakse; **Tühista makse** teeb konteeritud maksele vastupidise kande ja avab arve summa uuesti. Uut makset sellel lehel ei looda — makse tekib maksepaketi täitmisel või pangatehingu sidumisel arvega.',
    },

    { type: 'heading', text: 'Pangaliidesed (LHV ja Swedbank)' },
    {
      type: 'paragraph',
      text: 'Lehel **Seaded → Pangaühendused** ([ava](/settings?tab=bank-connections)) saad ühendada LHV Connecti ja Swedbank Gateway. Ühenduse kaudu tulevad pangaväljavõtted automaatselt tavapärasesse pangatehingute ülevaatusse ja maksepakette saab saata otse panka.',
    },
    {
      type: 'list',
      items: [
        '**LHV:** ettevõte peab olema LHV klient ja sõlmima Connecti lepingu. **Alusta LHV lepingut** saadab allkirjastamiseks konteineri; lepingu olek on kaardil näha. Maksete otse täitmiseks peab leping lubama makseid ilma eraldi allkirjata.',
        '**Swedbank:** sõlmi Gateway leping internetipangas ja sisesta **Gateway lepingu ID**. Panka saadetud maksed kinnitad Swedbanki internetipangas.',
        '**Testi ühendust** ja **Sünkrooni kohe** töötavad, kui ühendus on lubatud ja Arvelo pangasertifikaat on seadistatud (märk „Sertifikaat seadistatud").',
        'Väljavõte tellitakse pangalt ja see saabub veidi hiljem. Kui näed teadet, et väljavõte on tellitud, käivita sünkroonimine minuti pärast uuesti.',
      ],
    },
  ],
};
