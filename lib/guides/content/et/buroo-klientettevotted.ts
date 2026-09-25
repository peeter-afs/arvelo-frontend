import type { Guide } from '../../types';

export const burooKlientettevotted: Guide = {
  slug: 'buroo-klientettevotted',
  title: 'Büroo: klientettevõtete lisamine ja haldamine',
  summary:
    'Kuidas raamatupidamisbüroo lisab oma alla klientettevõtteid äriregistri andmetega, liigub nende vahel ja kuidas arveldus töötab.',
  category: 'alustamine',
  minutes: 4,
  updatedAt: '2026-09-25',
  relatedRoutes: ['/clients'],
  blocks: [
    {
      type: 'paragraph',
      text:
        'Raamatupidamisbüroo saab hallata mitut ettevõtet ühe kasutajakontoga. Iga klientettevõte on eraldi ' +
        'raamatupidamine (oma kontoplaan, arved, pank ja aruanded), aga see on seotud büroo ettevõttega ning ' +
        'selle eest tasub büroo.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Kes saab kliente lisada',
      text:
        'Kliente saab lisada büroo ettevõtte **omanik** või **administraator**. Klientettevõte ise ei saa omakorda ' +
        'kliente lisada – büroo ja kliendi seos on alati ühetasandiline.',
    },
    { type: 'heading', text: 'Klientettevõtte lisamine' },
    {
      type: 'steps',
      items: [
        {
          title: 'Ava büroo ettevõte',
          text: 'Kontrolli külgriba ülaosas olevast ettevõtte menüüst, et aktiivne on sinu büroo, mitte mõni klient.',
        },
        {
          title: 'Vali „Lisa klientettevõte"',
          text: 'Ettevõtte menüüst või lehelt [Klientettevõtted](/clients) nupuga **Lisa ettevõte**.',
        },
        {
          title: 'Otsi äriregistrist',
          text:
            'Sisesta ettevõtte nimi või registrikood ja vali tulemus. Nimi, registrikood, KMKR number, õiguslik vorm ' +
            'ja aadress täidetakse automaatselt. Kui ettevõttel on KMKR number, märgitakse see ka ' +
            'käibemaksukohustuslaseks. Eestist leidmata ettevõtet otsitakse ka Soome registrist.',
        },
        {
          title: 'Kontrolli andmeid ja loo ettevõte',
          text:
            'Täienda vajadusel e-posti ja telefoni ning vajuta **Loo ettevõte**. Kui ettevõtet registrist ei leia, ' +
            'vali **Sisesta andmed käsitsi**.',
        },
        {
          title: 'Ava kohe või jää bürooks',
          text: 'Pärast loomist saad kohe kliendi raamatupidamisse liikuda või jätkata büroos.',
        },
      ],
    },
    {
      type: 'paragraph',
      text:
        'Uuele ettevõttele luuakse kohe jooksva aasta majandusaasta koos 12 perioodiga, žurnaalid, KM-määrad ' +
        '(0%, 9%, 22%) ja süsteemikontod. Sina lisatakse ettevõtte omanikuks.',
    },
    { type: 'heading', text: 'Ettevõtete vahel liikumine' },
    {
      type: 'paragraph',
      text:
        'Klõpsa külgriba ülaosas ettevõtte nimel. Menüüs on su enda ettevõtted ning büroo kliendid rühmitatud ' +
        'pealkirja „<büroo> kliendid" alla. Kui ettevõtteid on palju, saad menüüs nime või registrikoodi järgi otsida. ' +
        'Pärast vahetust avaneb valitud ettevõtte töölaud.',
    },
    { type: 'heading', text: 'Kolleegide lisamine kliendi juurde' },
    {
      type: 'paragraph',
      text:
        'Klientettevõtte juurde pääsevad ainult selle liikmed. Büroo teised töötajad ei saa klienti automaatselt ' +
        'näha – ava klientettevõte ja kutsu kolleegid **Seaded → Meeskond** alt, valides neile sobiva rolli. ' +
        'Klientettevõtete lehel on ettevõtted, kus sa ise liige ei ole, märgitud „pole liige" ja neid avada ei saa.',
    },
    { type: 'heading', text: 'Arveldus' },
    {
      type: 'list',
      items: [
        'Klientettevõttel ei ole oma tellimust – selle eest tasub büroo.',
        'Büroo tellimuses on ettevõtete arv: büroo ise + kõik klientettevõtted. Arv uueneb kliendi lisamisel ja kustutamisel.',
        'Klientettevõtte ligipääs järgib büroo oma: kui büroo tellimus on peatatud või ainult lugemiseks, kehtib sama ka klientidele.',
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      text:
        'Büroo ettevõtet ei saa kustutada, kuni selle all on klientettevõtteid.',
    },
  ],
};
