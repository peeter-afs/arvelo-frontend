import type { Guide } from '../../types';

/**
 * Sõnastus järgib `paymentMethods` tekste (Registreeri laekumine / tasumine,
 * Vaikimisi pangakonto) — kui UI-s muutub nupu nimi, muuda ka siin.
 */
export const makseviisid: Guide = {
  slug: 'makseviisid',
  title: 'Makseviisid ja käsitsi laekumised',
  summary:
    'Sularaha, kaardimaksed ja veebipood: makseviiside seadistamine ja arvel laekumise või tasumise registreerimine ilma pangaväljavõtteta.',
  category: 'arved',
  minutes: 6,
  updatedAt: '2026-09-26',
  relatedRoutes: ['/invoices/sales', '/invoices/purchase'],
  blocks: [
    {
      type: 'paragraph',
      text:
        'Kui klient maksab sularahas, kaardiga või veebipoes, ei tule raha kohe sinu pangakontole. Makseviis ütleb Arvelole, ' +
        '**millisele kontole** selline laekumine konteerida: sularaha kassasse, kaardimaksed ja veebipood vahekontole.',
    },

    { type: 'heading', text: 'Makseviisi lisamine' },
    {
      type: 'steps',
      items: [
        { title: 'Ava Seaded → Ettevõte', text: 'Makseviisid on pangakontode all.' },
        { title: 'Anna nimi ja liik', text: 'Liigid: pangaülekanne, sularaha, kaardimakse, veebipood / veebimakse, muu. Nimi on vaba, nt „Kaardimakse (SumUp)".' },
        { title: 'Vali konto', text: 'Valida saab ainult **varakontosid**. Sularaha → kassa; kaardi- ja veebimaksed → vahekonto, kust makseteenuse pakkuja raha hiljem panka kannab.' },
        { title: 'Vajuta „Lisa makseviis"', text: 'Makseviis on kohe arvetel valitav.' },
      ],
    },
    {
      type: 'action',
      label: 'Seadista makseviisid minu eest',
      prompt: 'Aita mul seadistada makseviisid: sularaha, kaardimakse ja veebipood. Vaata kontoplaanist sobivad kontod ja paku puuduvad vahekontod.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Kustutamise asemel deaktiveeri',
      text: 'Makseviisi ei saa kustutada, sest varasemad maksed viitavad sellele. Deaktiveeritud makseviis kaob valikust, aga vanad maksed jäävad alles.',
    },

    { type: 'heading', text: 'Laekumise registreerimine' },
    {
      type: 'steps',
      items: [
        { title: 'Ava kinnitatud arve', text: 'Müügiarvel on nupp **Registreeri laekumine**, ostuarvel **Registreeri tasumine**. Mustandil ja täielikult tasutud arvel nuppu kasutada ei saa.' },
        { title: 'Vali makseviis', text: 'Kui makseviise pole või valid „Vaikimisi pangakonto", läheb makse süsteemses seadistuses määratud vaikimisi pangakontole.' },
        { title: 'Kontrolli summat ja kuupäeva', text: 'Summa on vaikimisi arve tasumata osa. Osamakse puhul muuda summat — arve jääb osaliselt tasutuks.' },
        { title: 'Vajuta „Registreeri"', text: 'Makse ja kanne tehakse kohe.' },
      ],
    },
    {
      type: 'table',
      headers: ['Arve', 'Deebet', 'Kreedit'],
      rows: [
        ['Müügiarve (laekumine)', 'makseviisi konto', 'ostjate nõuded'],
        ['Ostuarve (tasumine)', 'tarnijate võlad', 'makseviisi konto'],
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      text:
        'Kui makset ei saa kanda — periood on suletud või summa ületab tasumata osa —, ei salvestata midagi. Paranda põhjus ja registreeri uuesti.',
    },

    { type: 'heading', text: 'Kaardimaksete väljamakse ja teenustasu' },
    {
      type: 'paragraph',
      text:
        'Makseteenuse pakkuja (nt SumUp, Stripe, Montonio) kannab kogunenud kaardimaksed hiljem panka, **teenustasu võrra väiksemana**. ' +
        'Arvelo tunneb sellise väljamakse pangaväljavõttel ära, leiab maksed, mida see katab, ja konteerib teenustasu ise.',
    },
    {
      type: 'steps',
      items: [
        { title: 'Seadista makseviis', text: 'Kaardimakse või veebipoe makseviisil täida **Väljamaksed ja teenustasu**: väljamakse tunnus (sõna, mis on pangaväljavõttel saaja nimes või selgituses, nt „SumUp"), teenustasu kulukonto ning oodatav tasu (% ja/või fikseeritud summa makse kohta).' },
        { title: 'Impordi pangaväljavõte', text: 'Väljamakse ilmub ülevaatusse märgiga **Kaardi väljamakse** ja avaneb samanimelisel vahekaardil: näed, mitu makset ja mis ajavahemikust see katab, laekumiste summat, teenustasu ja tekkivat kannet.' },
        { title: 'Kinnita', text: 'Vajuta **Konteeri väljamakse**. Kui teenustasu klapib oodatavaga, on väljamakse valitud ka hulgi-automaatsobitamisel ja konteeritakse koos arvetega.' },
      ],
    },
    {
      type: 'table',
      headers: ['Konto', 'Deebet', 'Kreedit'],
      rows: [
        ['Pangakonto', 'pangas laekunud summa', ''],
        ['Teenustasu kulukonto', 'teenustasu', ''],
        ['Makseviisi vahekonto', '', 'kaetud maksete summa'],
      ],
    },
    {
      type: 'paragraph',
      text:
        'Maksed arveldatakse **vanimast alates**: väljamakse katab järjest vanimad arveldamata kaardimaksed kuni väljamakse kuupäevani, ' +
        'ja valitakse see hulk, mille puhul teenustasu (laekumised − pangasumma) on kõige lähemal oodatavale. Nii jõuab vahekonto pärast iga väljamakset õige saldoni.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Kui teenustasu ei klapi',
      text:
        'Kui oodatav tasu pole seadistatud või arvutatud tasu erineb sellest rohkem kui 10%, näitab Arvelo hoiatust ega konteeri väljamakset hulgi. ' +
        'Kontrolli pakkuja väljamakse aruandest, kas summa katab samad maksed. Kui mitte, konteeri väljamakse **Kanna kontole** kaudu käsitsi (vastaskontoks vahekonto ja teenustasu kulukonto).',
    },
    {
      type: 'paragraph',
      text: 'Kui väljamakse sidumise tühistad, vabanevad selle maksed ja järgmine väljamakse saab need uuesti katta. Teenustasu kandel ei ole käibemaksurida.',
    },
    {
      type: 'action',
      label: 'Seadista kaardimaksete väljamaksed',
      prompt: 'Aita mul seadistada kaardimaksete väljamaksete automaatne konteerimine: teenustasu kulukonto, oodatav tasu ja väljamakse tunnus. Küsi minult, milline on mu makseteenuse pakkuja ja tema tasumäärad.',
    },
    {
      type: 'paragraph',
      text: 'Registreeritud makseid näed ja vajadusel tühistad lehel **Pank → Maksed**.',
    },
  ],
};
