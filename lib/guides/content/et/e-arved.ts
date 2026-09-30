import type { Guide } from '../../types';

/** Sõnastus järgib `rikEinvoice` tekste ja müügiarve nuppu „Saada e-arvena“. */
export const eArved: Guide = {
  slug: 'e-arved',
  title: 'E-arvete saatmine ja vastuvõtt',
  summary: 'Müügiarved e-arvena otse ostja raamatupidamisse ja tarnijate e-arved ostuarve mustanditeks — RIK e-arveldaja kaudu.',
  category: 'arved',
  minutes: 4,
  updatedAt: '2026-09-27',
  relatedRoutes: ['/invoices/sales'],
  blocks: [
    {
      type: 'paragraph',
      text:
        'Alates 1. juulist 2025 võib ettevõtja nõuda, et talle saadetaks e-arve. Arvelo saadab ja võtab e-arveid vastu RIK-i e-arveldaja kaudu: e-arve jõuab ostja raamatupidamistarkvarasse, mitte e-postkasti.',
    },
    { type: 'heading', text: 'Sisselülitamine' },
    {
      type: 'steps',
      items: [
        { title: 'Ava Seaded → Integratsioonid → E-arved (RIK e-arveldaja)', text: 'Vali režiim: **Ainult saatmine** või **Saatmine ja vastuvõtt**.' },
        { title: 'Vajuta „Lülita sisse“', text: 'Arvelo sõlmib RIK-iga sinu ettevõtte e-arvete edastamise lepingu. Ettevõtte registrikood peab seadetes olemas olema.' },
        { title: 'Vastuvõtu korral kinnita RIK-is', text: 'Kinnita 7 päeva jooksul ettevõtjaportaalis (ettevotjaportaal.rik.ee) RIK oma e-arvete vastuvõtjana. Muidu leping aegub ja e-arved ei jõua sinuni.' },
      ],
    },
    { type: 'heading', text: 'E-arve saatmine' },
    {
      type: 'list',
      items: [
        'Ava kinnitatud müügiarve ja vajuta **Saada e-arvena**. Arvega läheb kaasa ka PDF.',
        'Ostjal peab partneri kaardil olema **8-kohaline Eesti registrikood** — selle järgi RIK e-arve adresseerib.',
        'Saatmise olekut kontrollitakse automaatselt iga 30 minuti järel (saadetud → kohale toimetatud või ebaõnnestunud).',
      ],
    },
    { type: 'heading', text: 'E-arvete vastuvõtt' },
    {
      type: 'list',
      items: [
        'Sulle saadetud e-arved tuuakse iga 30 minuti järel (või kohe nupuga **Kontrolli uusi e-arveid**) ja neist tehakse **ostuarvete mustandid** allikaga „E-arve“.',
        'Tarnija leitakse registrikoodi järgi; kui teda pole, lisatakse ta partnerina. Arve PDF säilitatakse 7 aastat.',
        'Mustand läheb tavapärasesse ostuarvete kinnitusvoogu — kontrolli kulukontod ja kinnita.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      text: 'Pangapõhine e-arve (esitlus ostja internetipangas) on eraldi kanal ja käib pangaliidese kaudu (Seaded → Pangaühendused).',
    },
  ],
};
