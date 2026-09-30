import type { Guide } from '../../types';

/**
 * Kontrollitud koodist 2026-09-30 (InvoiceTemplatesSettings, invoiceTemplate.service,
 * invoiceDocument.service, documentLink.service). Päriselt kasutatakse malli ainult
 * müügiarvel ja kreeditarvel; teised dokumenditüübid on ainult eelvaates.
 */
export const arveMallid: Guide = {
  slug: 'arve-mallid',
  title: 'Arve mallid (PDF-i välimus)',
  summary:
    'Arve PDF-i kujundus, logo ja värv, eri mallid eri klientidele, dokumendi keel ning püsilingid arvetele.',
  category: 'arved',
  minutes: 6,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/settings/documents'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Arve PDF-i välimust muudad lehel **Seaded → Dokumendid**. Mall määrab, kuidas müügiarve ja kreeditarve välja näevad nii allalaadimisel, e-kirja manusena kui ka korduva arve eelvaates.',
    },

    {
      type: 'image',
      src: '/guides/arve-mallid/01-seaded.png',
      alt: 'Arve mallide leht: mallid, kujundus ja bränd vasakul, eelvaade paremal.',
    },

    { type: 'heading', text: 'Malli seaded' },
    {
      type: 'list',
      items: [
        '**Kujundus**: „Standard" (selge ja neutraalne) või „Modernne" (värviline päis, rõhutatud kogusumma).',
        '**Logo**: lohista fail või vali arvutist (PNG, JPEG, WebP või SVG, kuni 1 MB). Ilma logota kasutatakse ettevõtte nime algustähte.',
        '**Värv**: Sinine, Roheline, Punane, Ploom või Grafiit.',
        '**Varasemad tasumata arved** — arvele lisatakse sama kliendi teised tasumata arved; iga numbri taga on link PDF-ile.',
        '**Lisamärkus** — arve märkus trükitakse PDF-ile.',
      ],
    },
    {
      type: 'paragraph',
      text: 'Paremal on **eelvaade** näidisandmetega (see ei salvestu): saad vaadata eri keelte ja olukordade (allahindlus, mitu KM määra, pöördkäibemaks, mitu lehekülge) välimust. Muudatused jõustuvad alles nupuga **Salvesta**.',
    },

    { type: 'heading', text: 'Mitu malli' },
    {
      type: 'steps',
      items: [
        { title: 'Loo mall', text: '**+ Uus mall** teeb valitud mallist koopia, mida saad muuta.' },
        { title: 'Määra kliendid', text: 'Lisa mallile kliendid (**+ Lisa klient**). Üks klient saab kuuluda ainult ühte malli — teise lisamisel tõstetakse ta ümber.' },
        { title: 'Korduvad arved', text: 'Korduva arve malli valid korduva arve seadetes väljal **PDF mall**.' },
      ],
    },
    {
      type: 'table',
      headers: ['Järjekord', 'Millist malli kasutatakse'],
      rows: [
        ['1', 'Korduva arve mall, kui see on valitud'],
        ['2', 'Kliendi mall'],
        ['3', 'Vaikimisi mall'],
      ],
    },
    {
      type: 'list',
      items: [
        'Vaikimisi malli ei saa kustutada ega ümber nimetada.',
        'Malli kustutamisel lähevad selle kliendid tagasi vaikimisi mallile.',
      ],
    },

    { type: 'heading', text: 'Dokumendi keel' },
    {
      type: 'paragraph',
      text: 'Kliendikaardil (**Partnerid**, osa „Arveldus") saad valida kliendi **PDF malli** ja **Dokumendi keele** — eesti, inglise, soome või rootsi. Keel määrab nii PDF-i kui ka e-kirja keele.',
    },

    { type: 'heading', text: 'Saadetud arve ei muutu' },
    {
      type: 'callout',
      tone: 'info',
      text: 'Arve kinnitamisel või esmakordsel saatmisel „külmutatakse" selle mall, keel ning müüja ja ostja andmed. Hilisemad malli muudatused **ei muuda juba kinnitatud või saadetud arveid**. Mustandid kasutavad alati malli viimast versiooni.',
    },

    { type: 'heading', text: 'Püsilingid arvetele' },
    {
      type: 'paragraph',
      text: 'Varasemate tasumata arvete numbrid ja kreeditarvel krediteeritava arve number on PDF-il lingid kujul `arvelo.ee/d/…`. Link avab arve PDF-i ilma sisselogimiseta ja kehtib püsivalt. Mustandi või tühistatud arve lingiga dokumenti ei avata.',
    },
  ],
};
