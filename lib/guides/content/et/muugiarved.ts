import type { Guide } from '../../types';

/**
 * Kirjeldab ainult seda, mida SalesInvoiceWorkspace / SalesInvoiceEditor / InvoicePreview
 * päriselt teevad (kontrollitud koodist 2026-09-30). Kui nupu nimi või voog muutub,
 * muuda ka siin — assistent vastab selle teksti põhjal.
 */
export const muugiarved: Guide = {
  slug: 'muugiarved',
  title: 'Müügiarved: koostamine, kinnitamine ja saatmine',
  summary:
    'Uue arve koostamine, kinnitamine ja kliendile saatmine, kinnitatud arve vaatamine ja kreediteerimine, eelvaade ning maksemeeldetuletused.',
  category: 'arved',
  minutes: 10,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/invoices/sales', '/invoices/reminders'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Müügiarved asuvad lehel **Arvete keskus → Müügiarved**. Vasakul on arvete nimekiri, paremal valitud arve kokkuvõte. Arve avamiseks tee reale topeltklõps, vajuta **Enter** või **Ava →** — nii uus kui ka olemasolev arve avaneb samas arve vaates.',
    },

    {
      type: 'image',
      src: '/guides/muugiarved/01-nimekiri.png',
      alt: 'Müügiarvete nimekiri: vahekaardid, filtrid ja otsing ülal, arvete loend vasakul ja valitud arve paremal.',
      caption: 'Ekraanipildil on kliendid ja summad hägustatud.',
    },

    { type: 'heading', text: 'Arve elukäik' },
    {
      type: 'steps',
      items: [
        { title: 'Mustand', text: 'Arvet saab vabalt muuta ja kustutada. Mustand **ei ole pearaamatus**.' },
        { title: 'Kinnita ja saada', text: 'Arve kinnitatakse (tekib pearaamatu kanne) ja saadetakse PDF-ina kliendile e-postiga.' },
        { title: 'Kinnitatud / saadetud', text: 'Arve on lukus — seda ei saa enam muuta ega kustutada. Viga parandatakse **kreeditarvega**.' },
        { title: 'Makstud', text: 'Arve märgitakse makstuks, kui laekumine seotakse arvega pangatehingute ülevaatuses.' },
      ],
    },

    { type: 'heading', text: 'Nimekiri' },
    {
      type: 'list',
      items: [
        '**Vahekaardid:** Kõik, Mustand, Saatmata, Tasumata, Üle tähtaja; menüüs **···** ka Saadetud, Makstud ja Tühistatud.',
        '**Periood** filtreerib arve kuupäeva järgi (vaikimisi viimased 90 päeva). **KM** filtreerib käibemaksukoodi järgi.',
        '**Otsing** (klahv **/**) otsib arve numbri ja kliendi nime järgi.',
        '**Veerud** — vali, milliseid veerge näidata. Kitsal ekraanil peidetakse vähem olulised veerud automaatselt ja menüüs on nende juures märge „ruumi pole".',
        'Kui nimekirjas on kinnitamata mustandeid, näitab kollane riba nende arvu ja summat. Nupp **Kinnita mustandid** kinnitab kõik valitud perioodi mustandid korraga — **see ei saada neid e-postiga**.',
        'Jaluses on summa ja tasumata summa kokku ning eksport Excelisse, CSV-sse või PDF-i (eksporditakse parajasti nähtavad read).',
      ],
    },
    {
      type: 'table',
      headers: ['Klahv', 'Tegevus'],
      rows: [
        ['/', 'Otsing'],
        ['U', 'Uus arve'],
        ['J / K või ↓ / ↑', 'Järgmine / eelmine arve'],
        ['Enter', 'Ava valitud arve'],
      ],
    },

    { type: 'heading', text: 'Uue arve koostamine' },
    {
      type: 'steps',
      items: [
        { title: 'Vali klient', text: 'Kirjuta nimi või registrikood väljale **Klient** (kiirklahv **⌘K**). Kliendi aadress, kontakt ja maksetingimus võetakse kliendikaardilt.' },
        { title: 'Kontrolli kuupäevi', text: 'Uue arve kuupäev on täna ja tähtaeg 14 päeva hiljem. Maksetingimuse saad valida nuppudega **7p / 14p / 30p** või menüüst **···**.' },
        { title: 'Lisa read', text: 'Kirjeldusse kirjutades pakutakse tooteid tootekataloogist; **Otsi teenust** avab kataloogi. Konto, kogus, ühik, hind ja allahindlus (**Ale %**) on real muudetavad. **Enter** viimasel real lisab uue rea.' },
        { title: 'Vaata üle Kontroll', text: 'Paremal paneelil **Kontroll** näitab vigu (nt klient valimata, rida kirjelduseta, tähtaeg enne arve kuupäeva). Vigadega arvet ei saa kinnitada.' },
        { title: 'Salvesta või kinnita', text: '**Salvesta mustand** (⌘S) salvestab ja annab arvele numbri seeriast. **Kinnita ja saada** kinnitab ja saadab arve kohe.' },
      ],
    },
    {
      type: 'list',
      items: [
        '**KM kood** kehtib kõigile arve ridadele. Kui ettevõte ei ole käibemaksukohustuslane, on see lukus „Maksuvaba käive" peal.',
        '**Märkused** on arvel nähtav tekst. **Sisemärkus** on nähtav ainult raamatupidajale — lülita see sisse nupust **+** päise kohal.',
        'Nupust **+** saad lisada ka **Kulukoha** ja **Projekti** — kas terve arve kohta või rea kaupa.',
        'Paneelil **Konteering** näed ette, milline kanne arve kinnitamisel tekib.',
      ],
    },

    {
      type: 'image',
      src: '/guides/muugiarved/02-uus-arve.png',
      alt: 'Uus müügiarve: päise väljad, read ja paremal kokkuvõte, kontroll ning konteering.',
    },

    { type: 'heading', text: 'Kinnita ja saada' },
    {
      type: 'paragraph',
      text: 'Arve kinnitatakse ja PDF saadetakse aadressile, mis on **Kontakt** vahekaardil (kui see on tühi, siis kliendikaardi e-postile). Kui saatmine ebaõnnestub — näiteks kliendil pole e-posti —, **jääb arve siiski kinnitatuks**; saad selle hiljem uuesti saata.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Kinnitatud arvet ei saa muuta',
      text: 'Kinnitatud, saadetud ja makstud arve avaneb vaatamiseks: väljad on lukus ja ülal on märge „Arve on kinnitatud — seda ei saa muuta". Vea parandamiseks tee **kreeditarve**.',
    },

    { type: 'heading', text: 'Kinnitatud arve' },
    {
      type: 'table',
      headers: ['Nupp', 'Mida teeb'],
      rows: [
        ['Saada uuesti', 'Saadab arve PDF-i uuesti kontaktile või kliendikaardi e-postile.'],
        ['Prindi', 'Avab arve eelvaate, kust saab printida, PDF-i alla laadida või saata.'],
        ['Kreediteeri', 'Avab uue kreeditarve, mis on seotud selle arvega.'],
        ['Maksed', 'Näitab selle arvega seotud makseid lehel Maksed.'],
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Kreeditarve',
      text: 'Kreeditarve on seotud algse arvega, kuid klienti ja ridu ei kopeerita — täida need ise. **Loo mustand** salvestab kreeditarve mustandina; kinnita see nimekirjast (valitud arve paneelil **Kinnita ja saada**).',
    },
    {
      type: 'paragraph',
      text: 'Laekumine märgitakse arvele siis, kui pangatehing seotakse arvega **Pank → Pangatehingud → Ülevaatus** vahekaardil. Vaata juhendit [Pangatehingud](/help/pangatehingud).',
    },

    { type: 'heading', text: 'Eelvaade ja PDF' },
    {
      type: 'list',
      items: [
        'Eelvaade näitab täpselt seda PDF-i, mis kliendile saadetakse ja mis alla laaditakse.',
        '**Laius** sobitab lehe laiusele, **Lehekülg** näitab terve lehe; suumida saab nuppudega **− / +**.',
        '**F** lülitab täisekraani, **Prindi** avab brauseri printimise, **Laadi PDF alla** laadib faili alla.',
        '**Saada** avab akna, kus saad muuta saaja e-posti ja lisada sõnumi. Kiri läheb kliendi keeles ja manuseks on sama PDF.',
        'Arve välimust (logo, värv, kujundus) muudad lehel **Seaded → Dokumendid** — vaata juhendit [Arve mallid](/help/arve-mallid).',
      ],
    },

    { type: 'heading', text: 'Maksemeeldetuletused' },
    {
      type: 'paragraph',
      text: 'Lehel **Arvete keskus → Meeldetuletused** on kõik tähtaja ületanud müügiarved. Iga rea juures saad saata meeldetuletuse kohe (**Saada**) või nupuga **Saada kõik tähtaegsed meeldetuletused** saata need kõigile, kellele seadete järgi on aeg saata (algusviivitus, sagedus ja maksimumarv).',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Automaatsed meeldetuletused',
      text: 'Kui seadetes on **Luba automaatsed meeldetuletused** sisse lülitatud, saadab Arvelo tähtaegsed meeldetuletused ise iga päev hommikul (umbes kell 9–10) samade reeglite järgi: algusviivitus, sagedus ja maksimumarv. Arvetele, mille kliendil pole e-posti aadressi, meeldetuletust ei saadeta — need näed lehel eraldi. **Kui viimane pangaväljavõte on üle 7 päeva vana (või seda pole imporditud), automaatseid meeldetuletusi ei saadeta**, sest siis ei pruugi laekumised olla veel kirjendatud.',
    },

    { type: 'heading', text: 'Projektimüük' },
    {
      type: 'paragraph',
      text: 'Kui müügiarvel on projekt, näed paremal paneelis projekti lõpetamata tööde jääki: saad valida, kui suur osa projekti ostudest arvega kuluks kanda, ja märkida projekti arve kinnitamisel lõpetatuks. Projekti saab lisada otse arve projekti valikust (**+ Lisa uus projekt…**). Täpsemalt juhendis [Projektid: kuluarvestus, lõpetamata tööd ja projektimüük](/help/projekti-kuluarvestus).',
    },
  ],
};
