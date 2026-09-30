import type { Guide } from '../../types';

/**
 * Kontrollitud koodist 2026-09-30 (migratsioon 103, ProjectWipService, SalesWipPanel,
 * /accounting/projects/wip, /reports/dimensions). Nupunimed: „LT", „Kanna arve kinnitamisel kuluks",
 * „Näita ridu", „Kanna kuluks", „Tühista" — kui UI-s muutub, muuda ka siin.
 */
export const projektiKuluarvestus: Guide = {
  slug: 'projekti-kuluarvestus',
  title: 'Projektipõhine kuluarvestus (lõpetamata tööd)',
  summary:
    'Projekti ostud kogutakse bilansikontole „Lõpetamata tööd" ja kantakse kuluks alles siis, kui samale projektile tehakse müügiarve. Nii on projekti tulu ja kulu samas kuus.',
  category: 'raamatupidamine',
  minutes: 7,
  updatedAt: '2026-09-30',
  relatedRoutes: ['/accounting/projects/wip', '/reports/dimensions', '/invoices/purchase', '/invoices/sales'],
  blocks: [
    {
      type: 'paragraph',
      text:
        'Näide: ostad projektile „Kaseküla maja" klaasid ja profiilid ning müüd hiljem kliendile **klaaside paigalduse**. ' +
        'Ostetud ja müüdud artiklid on erinevad, neid seob ainult **projekt**. Ostuarve ei lähe kohe kuluks, vaid konto ' +
        '**1420 Lõpetamata tööd** saldosse. Müügiarve kinnitamisel valid, kui suur osa sellest kuluks kanda.',
    },

    { type: 'heading', text: 'Seadistamine' },
    {
      type: 'steps',
      items: [
        { title: 'Ava Seaded → Andmehaldus', text: 'Plokis **Lõpetamata tööd** on kaks kontot: kogumiskonto (vaikimisi 1420 Lõpetamata tööd) ja mahakandmise kulukonto (vaikimisi 4000). Konto 1420 luuakse ise, kui seda veel pole.' },
        { title: 'Lülita projektil sisse „LT"', text: 'Kulukohtade ja projektide plokis on iga projekti real nupp **LT**. Kui see on sees, pakub ostuarve selle projekti ridadele automaatselt lõpetamata tööde kontot.' },
      ],
    },

    { type: 'heading', text: 'Ostuarve: read projektile' },
    {
      type: 'steps',
      items: [
        { title: 'Lülita sisse rea veerud', text: 'Ostuarve editoris vali **Kulukoht** ja **Projekt** ridadel (väljade valik päises). Kulukohta ja projekti saab määrata igale reale eraldi.' },
        { title: 'Vali real projekt', text: 'LT-projekti valimisel muutub rea konto lõpetamata tööde kontoks. Kontot saab ka ise valida: see on nimekirjas grupis „Lõpetamata tööd".' },
        { title: 'Kinnita arve', text: 'Kanne: Dr 1420 Lõpetamata tööd (projekt, kulukoht) / Kr võlad tarnijale. Lõpetamata tööde real peab projekt olema, muidu kinnitamine ei õnnestu.' },
      ],
    },

    { type: 'heading', text: 'Müügiarve: kuluks kandmine' },
    {
      type: 'paragraph',
      text:
        'Kui müügiarvel on projekt (päises või kõigil ridadel sama), ilmub parempoolsesse paneeli plokk **Lõpetamata tööd**. ' +
        'Vaikimisi kantakse kuluks **kogu jääk** ja iga ostuarve rida loetakse 100% lõpetatuks.',
    },
    {
      type: 'table',
      headers: ['Valik', 'Mis juhtub'],
      rows: [
        ['Kogu jääk', 'Kõik projekti ostuarve read kantakse kuluks 100%.'],
        ['Protsent', 'Iga rida saab sama protsendi, nt 50% → pool igast reast.'],
        ['Summa', 'Summa teisendatakse protsendiks ja jagatakse ridadele (ümardus läheb viimasele reale).'],
      ],
    },
    {
      type: 'list',
      items: [
        '**Näita ridu** avab ostuarve read. Real saab protsenti muuta: see rida jääb oma protsendile, teised järgivad üldist protsenti või summat.',
        'Paneel näitab, kui palju kuluks läheb, ja arve **marginaali** (neto miinus kulu).',
        'Kui mahakandmist ei soovi, eemalda linnuke **Kanna arve kinnitamisel kuluks**.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Kanne tehakse kinnitamisel',
      text: 'Arve kinnitamisel tehakse eraldi kanne arve kuupäevaga: Dr 4000 kulu / Kr 1420 Lõpetamata tööd, mõlemal real projekt. Kui kanne ebaõnnestub (nt periood on suletud), jääb arve kinnitatuks ja paneelis on nupp **Proovi uuesti**.',
    },

    { type: 'heading', text: 'Käsitsi kuluks kandmine ja tühistamine' },
    {
      type: 'steps',
      items: [
        { title: 'Ava Pearaamat → Lõpetamata tööd', text: 'Vasakul on projektid ja nende jäägid, paremal valitud projekti ostuarve read ja mahakandmised.' },
        { title: 'Kanna kuluks', text: 'Vali kogu jääk, protsent või summa, kuupäev ja selgitus (nt „projekt lõpetatud") ning vajuta **Kanna kuluks**.' },
        { title: 'Tühista', text: 'Mahakandmise real vajuta **Tühista**. Tehakse stornokanne ja summa läheb tagasi projekti jääki.' },
      ],
    },
    {
      type: 'paragraph',
      text: 'Kui müügiarve krediteeritakse, saab kreeditarvel märkida **Taasta kuluks kantud lõpetamata tööd**. Siis tühistatakse arvega tehtud mahakandmine kreeditarve kinnitamisel.',
    },

    { type: 'heading', text: 'Aruanne' },
    {
      type: 'paragraph',
      text:
        '**Aruanded → Kulukohad ja projektid** näitab projekti tulu, kulu, tulemit, marginaali ja lõpetamata tööde jääki perioodi lõpus. ' +
        'Aruanne põhineb pearaamatul, seega on seal ka käsikanded, millel on projekt. Enne selle funktsiooni kasutuselevõttu kinnitatud arved ' +
        'võetakse arve ridadelt ja märgitakse sildiga „arvelt".',
    },
    {
      type: 'callout',
      tone: 'success',
      title: 'Bilanss klapib',
      text: 'Kõigi projektide lõpetamata tööde jääkide summa võrdub konto 1420 saldoga bilansis samal kuupäeval.',
    },
  ],
};
