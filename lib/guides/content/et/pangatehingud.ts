import type { Guide } from '../../types';

/**
 * Sõnastus järgib teadlikult lehel kuvatavaid `accounting` tekste (bankTab*, route*,
 * markReconciled jne) — kui UI-s muutub nupu või vahekaardi nimi, muuda ka siin.
 */
export const pangatehingud: Guide = {
  slug: 'pangatehingud',
  title: 'Pangatehingud: import, ülevaatus, vastavus',
  summary:
    'Igapäevane töö pangaga: väljavõtte import, tehingute sobitamine arvetega või kontole kandmine ja vastavusse viimine pangasaldoga.',
  category: 'pank',
  minutes: 14,
  updatedAt: '2026-09-01',
  relatedRoutes: ['/accounting/bank'],
  blocks: [
    {
      type: 'paragraph',
      text: 'Kogu pangatöö käib ühel lehel — **Pank → Pangatehingud** — ja jaguneb kolmeks vahekaardiks: **Import**, **Ülevaatus** ja **Vastavus**. Sama tehing liigub neist läbi vasakult paremale.',
    },

    { type: 'heading', text: 'Kolm sammu' },
    {
      type: 'steps',
      items: [
        {
          title: 'Import',
          text: 'Loed pangafaili sisse ja kontrollid read üle. **Siin ei teki veel ühtki raamatupidamiskannet** — import ainult toob read süsteemi.',
        },
        {
          title: 'Ülevaatus',
          text: 'Otsustad iga tehingu kohta, kuhu see kuulub: millise arvega seotakse või millisele kontole kantakse. Kanne tekib alles siin.',
        },
        {
          title: 'Vastavus',
          text: 'Kontrollid, et Arvelo read klapiksid pangaväljavõtte saldoga. See samm ei muuda kandeid — see on kontroll.',
        },
      ],
    },
    {
      type: 'image',
      src: '/guides/pangatehingud/01-vahekaardid.png',
      alt: 'Pangatehingute päis vahekaartidega Import, Ülevaatus ja Vastavus.',
      caption: 'Vahekaardi nime kõrval olev arv näitab, mitu rida seal ootab. Ekraanipiltidel on tehingute andmed hägustatud.',
    },
    {
      type: 'callout',
      tone: 'info',
      text: 'Pärast impordi kinnitamist viib Arvelo su ise Ülevaatuse vahekaardile.',
    },

    { type: 'heading', text: 'Enne alustamist' },
    {
      type: 'list',
      items: [
        '**Toetatud vormingud on CSV ja CAMT.053 XML.** MT940 praegu ei toetata.',
        '**CAMT.053 puhul** loetakse konto IBAN failist — kontot ei pea valima.',
        '**CSV puhul** tuleb pangakonto ise valida, sest failis IBAN-i ei ole.',
        'Kontoplaanis peavad olema pangakonto ja süsteemikontod määratud, muidu ei saa kannet luua.',
      ],
    },

    { type: 'heading', text: '1. samm: import' },
    {
      type: 'steps',
      items: [
        {
          title: 'Vali pangafail',
          text: 'Lohista fail kasti või vali see arvutist. Vorming ja konto tuvastatakse failist ning lugemine algab kohe — eraldi „Loe sisse" nuppu ei ole.',
        },
        {
          title: 'Vaata read üle',
          text: 'Read ilmuvad tabelisse. Filtririba kohal saab piirata: **Kõik**, **Valmis**, **Vajab ülevaatust**, **Duplikaat**.',
        },
        {
          title: 'Kinnita ja saada ülevaatusesse',
          text: 'Nupp näitab, mitu rida kinnitatakse. Duplikaadid jäetakse automaatselt vahele.',
        },
      ],
    },
    {
      type: 'image',
      src: '/guides/pangatehingud/02-import.png',
      alt: 'Impordi vahekaart: kolme sammu riba, faili lohistamise ala ja pangakonto valik.',
      caption: 'Kolme sammu riba üleval, lohistamise ala keskel ja pangakonto valik all servas.',
    },
    {
      type: 'paragraph',
      text: 'Hoiatusi on **kahte liiki** ja see vahe on oluline:',
    },
    {
      type: 'table',
      headers: ['Liik', 'Näide', 'Mida saad teha'],
      rows: [
        [
          'Pehme hoiatus',
          'Duplikaat, kahtlane väärtuspäev.',
          'Real on nupp **„Kinnita siiski"** — rida läheb ülevaatusesse. Korraga kõik: „Kinnita kõik ülevaadatavad".',
        ],
        [
          'Blokeeriv viga',
          'Puuduv või vigane kuupäev, puuduv summa, määramata pangakonto.',
          'Reale kuvatakse „Ei saa kinnitada". Paranda fail ja impordi uuesti — sellist rida süsteemi kanda ei saa.',
        ],
      ],
    },
    {
      type: 'paragraph',
      text: 'Arvelo kontrollib ka **väljavõtte perioodi** varem imporditu vastu ja hoiatab, kui periood kattub varasema väljavõttega (võimalik topeltimport) või kui kahe väljavõtte vahele jääb lünk (mõni väljavõte on importimata). Kui kõik on korras, näed rohelist teadet, et kattuvust ega lünka ei tuvastatud.',
    },

    { type: 'heading', text: 'Mis juhtub kohe pärast kinnitamist' },
    {
      type: 'paragraph',
      text: 'Arvelo proovib iga tehingu automaatselt avatud arvetega kokku viia. Õnnestunud vasted saavad järjekorras rohelise märgise **„VASTE → arve nr"** (või „VASTE → n arvet", kui makse katab mitut arvet) — need on ühe klõpsuga kinnitatavad.',
    },
    {
      type: 'paragraph',
      text: 'Kui rida jääb ilma automaatvasteta, näitab Arvelo põhjust. Neid on neli:',
    },
    {
      type: 'list',
      items: [
        '**Sobivat avatud arvet ei leitud** — arve puudub, on juba tasutud või pole veel kinnitatud.',
        '**Summa ei võrdu arve jäägiga** — vaja on jaotust mitme arve vahel või osalist tasumist.',
        '**Mitu sarnast kandidaati** — vali õige arve käsitsi.',
        '**Vaste on liiga nõrk** — viide või partneri andmed ei anna kindlust.',
      ],
    },

    { type: 'heading', text: '2. samm: ülevaatus' },
    {
      type: 'paragraph',
      text: 'Vasakul on tehingute järjekord, paremal valitud tehingu tegevuste paneel. Järjekord näitab vaikimisi olekut **Ootel** — need tehingud, mis alles ootavad otsust. Filtriga (**Kõik / Ootel / Üle vaadatud**) leiad ka juba läbi vaadatud read ja lülitiga **„Ainult automaatvalmis"** näed ainult neid, millel on valmis vaste.',
    },
    {
      type: 'image',
      src: '/guides/pangatehingud/03-ulevaatus.png',
      alt: 'Ülevaatuse vahekaart: vasakul tehingute järjekord, paremal marsruutide paneel, all massitoimingute riba.',
      caption: 'Vasakul järjekord koos märkeruutudega, paremal valitud tehingu marsruudid, all massitoimingud.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Vastavaks märgitud rida kaob ülevaatusest',
      text: 'Ülevaatuse järjekorda satuvad ainult sobitamata JA vastavusse viimata tehingud. Kui märgid rea Vastavuse vahekaardil vastavaks enne, kui oled selle kirjendanud, kaob see ülevaatuse nimekirjast. Otsusta esimesena, vii vastavusse alles siis.',
    },

    { type: 'heading', text: 'Viis marsruuti' },
    {
      type: 'paragraph',
      text: 'Tehingul on täpselt viis võimalikku lõppu. Need välistavad teineteist, seega valid paneeli ülaosast ühe marsruudi ja vajutad selle nuppu.',
    },
    {
      type: 'table',
      headers: ['Marsruut', 'Millal', 'Nupp', 'Mis tekib'],
      rows: [
        [
          'Automaatvaste',
          'Arvelo leidis kindla vaste (nähtav ainult siis).',
          'Kinnita vaste',
          'Kanne + arve märgitakse tasutuks.',
        ],
        [
          'Seo arvega',
          'Tead ise, millise arvega tehing seotud on.',
          'Seo valitud arvega',
          'Sama mis automaatvaste, aga arve valid sina. Otsi arve numbri või partneri järgi.',
        ],
        [
          'Kanna kontole',
          'Arvet ei ole — nt pangateenustasu, palk, maks, kaardiost.',
          'Loo kanne',
          'Kanne pangakonto ja valitud vastaskonto vahel.',
        ],
        [
          'Dokument puudub',
          'Väljaminev makse, mille kuludokument on veel saamata.',
          'Loo mustand',
          'Mustand-ostuarve, mis ootab päris arvet. Ainult väljaminevatel tehingutel.',
        ],
        [
          'Jäta tähelepanuta',
          'Rida ei kuulu raamatupidamisse (nt oma kontode vaheline ülekanne, mis on juba kirjendatud).',
          'Ignoreeri tehingut',
          'Kannet ei looda, rida kaob järjekorrast.',
        ],
      ],
    },
    {
      type: 'image',
      src: '/guides/pangatehingud/04-marsruudid.png',
      alt: 'Marsruutide rida: Seo arvega, Kanna kontole, Dokument puudub, Jäta tähelepanuta.',
      caption: '„Automaatvaste" ilmub ritta esimesena ainult siis, kui Arvelo on kindla vaste leidnud.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: '„Jäta tähelepanuta" on praktikas lõplik',
      text: 'Ignoreeritud tehing kaob ülevaatuse järjekorrast ja järjekorra filtris („Kõik / Ootel / Üle vaadatud") ei ole valikut, mis selle tagasi tooks. Kasuta seda ainult ridade puhul, mida sa kindlasti kirjendada ei taha.',
    },
    {
      type: 'paragraph',
      text: 'Kui makse katab mitut arvet või ainult osa arvest, kasuta marsruudi „Seo arvega" all valikut **„Jaga mitme arve vahel"** ja lisa read nupuga „Lisa jaotus".',
    },

    { type: 'heading', text: 'Massikinnitus' },
    {
      type: 'paragraph',
      text: 'Ühekaupa klõpsimine ei ole ainus tee. Järjekorra ees on märkeruudud ja jaluses massitoimingud:',
    },
    {
      type: 'steps',
      items: [
        {
          title: 'Vali kõik automaatvalmis',
          text: 'Jalus näitab, mitu tehingut on automaatvastega valmis. Üks klõps valib need kõik.',
        },
        {
          title: 'Vaata ja kinnita',
          text: 'Avaneb massikinnituse vaade: iga rida koos arvega, mille külge see läheb, ja vaste tugevus protsendina. Eemalda linnuke real, mida ei taha kinnitada.',
        },
        {
          title: 'Kinnita sobitused',
          text: 'Kinnitamine loob iga rea kohta kande. Iga kande saab hiljem eraldi tagasi võtta.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Sama loogika kehtib puuduvate kuludokumentide kohta: kui valid mitu väljaminevat tehingut, ilmub jalusesse nupp **„Loo mustandid"**.',
    },

    { type: 'heading', text: 'Vastaspool ja partner' },
    {
      type: 'paragraph',
      text: 'Marsruudil „Kanna kontole" saad lisaks kontole valida ka **partneri**. Tee seda — ilma partnerita tekib kanne vastaspooleta ja aruannetes ei rühmitata seda kellegi alla. Kui pank vastaspoolt ei edastanud, hoiatab Arvelo sellest eraldi.',
    },
    {
      type: 'paragraph',
      text: 'Kaardimaksete puhul ei saada pank vastaspoole nime üldse — see on ainult tehingu kirjelduses. Arvelo püüab kaupmehe sealt tuletada ja märgib sellised read tekstiga **„Tuletatud kaardimakse kirjeldusest"**. Kontrolli need üle: sularaha väljavõtted, teenustasud ja tagasikanded jäetakse teadlikult tuletamata.',
    },

    { type: 'heading', text: 'Kui kuludokument puudub' },
    {
      type: 'paragraph',
      text: 'Marsruut „Dokument puudub" loob mustand-ostuarve ja seob selle tehinguga. Nii ei jää makse rippuma ja on näha, milline kviitung on veel saamata. Mustand ilmub arvete nimekirja eraldi vaatesse.',
    },
    {
      type: 'paragraph',
      text: 'Tehing on sellega üle vaadatud: rida läheb **Ootel**-vaatest ära ja kannab filtrites **Üle vaadatud** märgist **MUSTAND**. Kannet veel ei ole, seega Vastavuse vahekaardil on rida endiselt lahtise makse all. Kui mustand kustutada või kohatäide tühistada, tuleb rida ülevaatusse tagasi.',
    },
    {
      type: 'paragraph',
      text: 'Kui päris arve hiljem saabub, täida mustand ära ja kinnita — kinnitamisel tehakse kanne ja pangatehing seotakse automaatselt, ilma et peaksid ülevaatusse tagasi minema. Kui arve summa erineb pangatehingust, tuleb rida märkusega ülevaatusse tagasi; väikese ümardusvahe saab lasta automaatselt kanda (**Seaded → Andmehaldus → Ümardusvahe automaatne kandmine**). Sama reegel kehtib ka ülevaatuses käsitsi sidumisel — ümarduskonto valimata nõutakse igal pool täpset summat. Kviitungi meeldetuletuste seadistus (vastutaja e-post, sagedus, nädalapäev) on **Seaded → Arveldus** all.',
    },

    { type: 'heading', text: '3. samm: vastavus' },
    {
      type: 'paragraph',
      text: 'Vastavus vastab ühele küsimusele: kas Arvelos olevad read klapivad pangaväljavõttega? See **ei muuda kandeid ega arveseoseid** — rida võib olla sobitamata, aga siiski vastavuses.',
    },
    {
      type: 'steps',
      items: [
        {
          title: 'Vali pangakonto ja periood',
        },
        {
          title: 'Kontrolli algsaldot ja lõppsaldot',
          text: 'CAMT.053 väljavõttest loetakse need automaatselt ja tabelis on nende jaoks eraldi ankurread. Vahe arvutatakse ise.',
        },
        {
          title: 'Märgi read vastavaks',
          text: 'Nupp „Märgi vastavaks" töötab nii üksiku rea kui ka valitud ridade hulga peal; „Eemalda vastavus" võtab märke maha. Filtritega Vastavuses / Vastavuseta näed, mis on veel tegemata.',
        },
      ],
    },
    {
      type: 'image',
      src: '/guides/pangatehingud/05-vastavus.png',
      alt: 'Vastavuse vahekaart: filtrid, panga lõppsaldo ja vahe ülal, tehingute tabel all.',
      caption: 'Ülal panga lõppsaldo, raamatu vastavuses summa ja nende vahe; all read, mida vastavaks märkida.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Vanadel importidel puudub pangasaldo',
      text: 'Alg- ja lõppsaldo hakati väljavõttest lugema hiljem, seega varem imporditud väljavõtetel need puuduvad. Sel juhul sisesta lõppsaldo käsitsi vastavasse lahtrisse — vahe arvutatakse edasi samamoodi.',
    },

    { type: 'heading', text: 'Levinud olukorrad' },
    {
      type: 'steps',
      items: [
        {
          title: 'Sama väljavõte imporditi kaks korda',
          text: 'Duplikaatread tuvastatakse ja jäetakse kinnitamisel vahele — topeltkandeid ei teki. Kui rida on siiski õige (nt kaks identset ühesuurust makset samal päeval), kasuta „Kinnita siiski".',
        },
        {
          title: 'CSV ei lähe sisse',
          text: 'CSV-s ei ole IBAN-i, seega pead pangakonto ise valima. Ilma selleta on rida blokeeriva veaga ja seda kinnitada ei saa.',
        },
        {
          title: 'Tehingu summa ei võrdu arve jäägiga',
          text: 'Automaatvastet ei teki. Kasuta „Seo arvega" ja „Jaga mitme arve vahel", või seo osalise tasumisena ühe arvega.',
        },
        {
          title: 'Vastaspool on „Tundmatu"',
          text: 'Pank ei edastanud nime. Vali marsruudil „Kanna kontole" partner käsitsi või lisa uus — muidu jääb kanne vastaspooleta.',
        },
        {
          title: 'Väljavõtete vahel on lünk',
          text: 'Impordi hoiatus ütleb, mitu päeva puudu jääb. Impordi puuduv periood ära, muidu ei klapi vastavus kunagi.',
        },
      ],
    },
  ],
};
