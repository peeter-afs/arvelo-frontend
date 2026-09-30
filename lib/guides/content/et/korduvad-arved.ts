import type { Guide } from '../../types';

/**
 * Kontrollitud koodist 2026-09-30 (RecurringWorkspace / RecurringTemplateEditor /
 * RecurringQuantities + backend recurringInvoice.service). Tunnine cron, ettevõtte
 * saatmistund 10–18; muutuva kogusega mall ei loo arvet enne koguste kinnitamist.
 */
export const korduvadArved: Guide = {
  slug: 'korduvad-arved',
  title: 'Korduvad arved',
  summary:
    'Mall, millest Arvelo loob regulaarselt arved ühele või mitmele kliendile — sagedus, edastamine, muutuvad kogused ja saatmise kellaaeg.',
  category: 'arved',
  minutes: 9,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/invoices/recurring'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Korduv arve on **mall**: samad read, mis lähevad valitud sagedusega igale mallile lisatud kliendile. Mallid asuvad lehel **Arvete keskus → Korduvad arved**.',
    },

    {
      type: 'image',
      src: '/guides/korduvad-arved/01-nimekiri.png',
      alt: 'Korduvate arvete nimekiri ja malli paneel: sagedus, edastamine, tulevased jooksud ja genereeritud arved.',
      caption: 'Ekraanipildil on andmed hägustatud.',
    },

    { type: 'heading', text: 'Uus mall' },
    {
      type: 'steps',
      items: [
        { title: 'Nimi ja kliendid', text: '**+ Uus mall**. Anna mallile nimi (arvel seda ei ole) ja lisa kliendid nupuga **+ Lisa klient** (⌘K). Üks mall võib minna mitmele kliendile.' },
        { title: 'Sagedus ja päev', text: '**Sagedus**: igakuine, iga 2 kuu järel, kvartaalne, poolaastane või aastane. **Väljastamise päev**: 1.–28. kuupäev või kuu viimane päev. **Alates** — esimese arve kuupäev; **Kuni** on valikuline.' },
        { title: 'Edastamine', text: '**Ülevaatusele** loob arve mustandina, mille kinnitad ja saadad ise. **Saada automaatselt** kinnitab arve ja saadab selle kohe kliendile.' },
        { title: 'Read', text: 'Vahekaardil **Tooted** lisa read nagu tavaarvel. Samad read lähevad igale kliendile.' },
        { title: 'Salvesta ja aktiveeri', text: '**Kontroll** paremal näitab puudusi (nt pole kliente või ridu). **Salvesta ja aktiveeri** paneb malli tööle.' },
      ],
    },
    {
      type: 'list',
      items: [
        '**Arveldusperiood** — kas arve on jooksva, eelmise või järgmise perioodi eest.',
        'Rea kirjelduses ja märkustes saad kasutada kohatäiteid, nt **{periood}** → „jaanuar 2026" ja **{kuu}**.',
        'Vahekaardil **Kliendid** vali iga kliendi kanal: **E-post**, **E-arve** või **Ei saada**, ning saad kliendi peatada või mallilt eemaldada.',
        '**PDF mall** — millise arve kujundusega saadetakse (vaikimisi kliendi mall).',
        '**Eelvaade** näitab järgmist arvet PDF-ina (arvet ei looda). **Genereeri kohe** loob järgmise perioodi arve kohe.',
      ],
    },

    { type: 'heading', text: 'Millal arved tehakse' },
    {
      type: 'paragraph',
      text: 'Arvelo kontrollib malle kord tunnis ja teeb arved ettevõtte **saatmistunnil**. Saatmistunni valid nimekirja päises (**Saadetakse kell …**, vahemikus 10:00–18:00 Eesti aja järgi). Arve kuupäevaks saab malli järgmise arve kuupäev; kui mõni kuupäev jäi vahele, tehakse arved järele.',
    },
    {
      type: 'list',
      items: [
        'Iga klient saab iga perioodi eest ainult ühe arve.',
        'Peatatud mall või peatatud klient arvet ei saa.',
        'Kui arve loomine ebaõnnestub, näed seda malli paneelil **Genereeritud** olekuga „Ebaõnnestus". Seda perioodi automaatselt uuesti ei proovita.',
        'Kui **Kuni** kuupäev on möödas, muutub mall mitteaktiivseks.',
      ],
    },

    { type: 'heading', text: 'Muutuva kogusega read' },
    {
      type: 'paragraph',
      text: 'Kui kogus on iga kord erinev (nt tunnid või tarbimine), tee real nupuga **±** kogus muutuvaks. Sellise malli puhul **ei looda arvet enne, kui kogused on sisestatud ja kinnitatud**.',
    },
    {
      type: 'steps',
      items: [
        { title: 'Ava Kogused', text: '**Sisesta kogused** nimekirja päises (märk näitab, mitu klienti ootab).' },
        { title: 'Sisesta kogused', text: 'Iga kliendi real sisesta kogused; need salvestuvad ise. **Kopeeri eelmise perioodi kogused** täidab eelmise kuu väärtustega. Rida saab ka vahele jätta.' },
        { title: 'Kinnita', text: '**Kinnita valmis arved** — kui arve kuupäev on käes, luuakse arve kohe; tulevase kuupäevaga arve luuakse sel päeval.' },
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      text: 'Kui mall on seatud **Saada automaatselt**, siis kinnitatud kogustega arved ka kinnitatakse ja saadetakse. Rida kogusega 0 arvele ei lähe.',
    },

    { type: 'heading', text: 'Nimekiri ja kiirklahvid' },
    {
      type: 'list',
      items: [
        'Filtrid: Kõik, Aktiivsed, Ootab kogust, Vigadega, Peatatud.',
        'Malli paneelil on tulevased jooksud ja viimati loodud arved (lingiga arvele).',
        '**Kopeeri** teeb mallist koopia ilma klientideta; koopia on alguses peatatud.',
        'Malli kustutamisel juba loodud arved jäävad alles.',
        'Kiirklahvid: **↑ / ↓** vali, **Enter** või **M** ava, **P** peata / aktiveeri, **/** otsing.',
      ],
    },
  ],
};
