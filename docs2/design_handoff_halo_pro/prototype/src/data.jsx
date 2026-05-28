// Realistic Estonian-flavoured placeholder data for an SME bookkeeping app.
// Numbers are in EUR. Dates use DD.MM.YYYY (Estonian convention).

const DATA = {
  tenant: { name: 'Stuudio Lillemets OÜ', fiscalYear: '2026', vat: 'EE101482739' },
  user: { name: 'Peeter Lillemets', role: 'Owner · Accountant', avatar: 'PL' },

  // --- Chart of accounts (selected rows; Estonian-style numbering) ---
  accounts: [
    { code: '1010', name: 'Sularaha',                                type: 'asset',     balance:     1240.50, ytdMove:   1240.50, is_active: true,  is_system: true,  group: 'Käibevara' },
    { code: '1100', name: 'Arvelduskonto · Swedbank EUR',             type: 'asset',     balance:    48720.55, ytdMove:  61410.00, is_active: true,  is_system: false, group: 'Käibevara' },
    { code: '1110', name: 'Arvelduskonto · LHV EUR',                  type: 'asset',     balance:    12150.10, ytdMove:  18920.00, is_active: true,  is_system: false, group: 'Käibevara' },
    { code: '1210', name: 'Nõuded ostjate vastu',                     type: 'asset',     balance:    24840.00, ytdMove:  92140.00, is_active: true,  is_system: true,  group: 'Käibevara' },
    { code: '1220', name: 'Maksude ettemaksed',                       type: 'asset',     balance:      830.00, ytdMove:    830.00, is_active: true,  is_system: false, group: 'Käibevara' },
    { code: '1310', name: 'Tooraine ja materjalid',                   type: 'asset',     balance:     3420.00, ytdMove:   7180.00, is_active: true,  is_system: false, group: 'Varud' },
    { code: '1500', name: 'Põhivara · Arvutid ja IT-seadmed',         type: 'asset',     balance:     8920.00, ytdMove:   2400.00, is_active: true,  is_system: false, group: 'Põhivara' },
    { code: '1505', name: 'Akumuleeritud kulum · IT',                 type: 'asset',     balance:    -3120.00, ytdMove:  -1840.00, is_active: true,  is_system: false, group: 'Põhivara' },
    { code: '2110', name: 'Võlad tarnijatele',                        type: 'liability', balance:   -14260.40, ytdMove: -58420.00, is_active: true,  is_system: true,  group: 'Lühiajalised kohustused' },
    { code: '2200', name: 'Käibemaks tasumiseks',                     type: 'liability', balance:    -3214.20, ytdMove: -22100.00, is_active: true,  is_system: true,  group: 'Maksud' },
    { code: '2210', name: 'Tulumaks tasumiseks',                      type: 'liability', balance:    -1840.00, ytdMove:  -6920.00, is_active: true,  is_system: false, group: 'Maksud' },
    { code: '2310', name: 'Tasumata töötasud',                        type: 'liability', balance:    -8420.00, ytdMove: -64480.00, is_active: true,  is_system: false, group: 'Tööjõukulud' },
    { code: '3100', name: 'Osakapital',                               type: 'equity',    balance:    -2500.00, ytdMove:      0.00, is_active: true,  is_system: true,  group: 'Omakapital' },
    { code: '3200', name: 'Eelmise aasta jaotamata kasum',            type: 'equity',    balance:   -18420.00, ytdMove:      0.00, is_active: true,  is_system: true,  group: 'Omakapital' },
    { code: '4000', name: 'Müügitulu · Teenused',                     type: 'revenue',   balance:   -88420.00, ytdMove: -88420.00, is_active: true,  is_system: false, group: 'Põhitegevuse tulud' },
    { code: '4010', name: 'Müügitulu · Kaubad',                       type: 'revenue',   balance:    -3680.00, ytdMove:  -3680.00, is_active: true,  is_system: false, group: 'Põhitegevuse tulud' },
    { code: '5000', name: 'Rendi- ja kommunaalkulud',                 type: 'expense',   balance:     6420.00, ytdMove:   6420.00, is_active: true,  is_system: false, group: 'Üldhalduskulud' },
    { code: '5100', name: 'Kontorikulud ja side',                     type: 'expense',   balance:     1480.20, ytdMove:   1480.20, is_active: true,  is_system: false, group: 'Üldhalduskulud' },
    { code: '5200', name: 'Tarkvara ja teenused',                     type: 'expense',   balance:     8920.55, ytdMove:   8920.55, is_active: true,  is_system: false, group: 'Üldhalduskulud' },
    { code: '5300', name: 'Reklaam ja turundus',                      type: 'expense',   balance:     2840.00, ytdMove:   2840.00, is_active: true,  is_system: false, group: 'Müügikulud' },
    { code: '5500', name: 'Tööjõukulud · Palgad',                     type: 'expense',   balance:    52400.00, ytdMove:  52400.00, is_active: true,  is_system: false, group: 'Tööjõukulud' },
    { code: '5510', name: 'Tööjõukulud · Sotsiaalmaks',               type: 'expense',   balance:    17292.00, ytdMove:  17292.00, is_active: true,  is_system: true,  group: 'Tööjõukulud' },
    { code: '5800', name: 'Kulum',                                    type: 'expense',   balance:     1840.00, ytdMove:   1840.00, is_active: true,  is_system: true,  group: 'Põhivara' },
    { code: '5900', name: 'Pangateenused ja vahetuskursi vahed',      type: 'expense',   balance:      284.30, ytdMove:    284.30, is_active: true,  is_system: false, group: 'Finantskulud' },
  ],

  // --- Journal entries (transactions) ---
  transactions: [
    { id: 'JE-0142', date: '20.05.2026', number: 'JE-2026-0142', ref: 'AR-2026-0091', type: 'sales_invoice', status: 'posted',  description: 'Müük · Brändi disain (faas 1)',          partner: 'Stuudio Veski OÜ',     debit:  { code: '1210', name: 'Nõuded ostjate vastu',       amount: 4284.00 }, credit: { code: '4000', name: 'Müügitulu · Teenused',    amount: 3570.00 }, vat: 714.00,  amount: 4284.00 },
    { id: 'JE-0141', date: '20.05.2026', number: 'JE-2026-0141', ref: 'OST-1842',     type: 'purchase',      status: 'posted',  description: 'AWS pilveteenused · mai',                  partner: 'Amazon Web Services',  debit:  { code: '5200', name: 'Tarkvara ja teenused',       amount: 412.50  }, credit: { code: '2110', name: 'Võlad tarnijatele',       amount: 412.50  }, vat: 0.00,    amount: 412.50  },
    { id: 'JE-0140', date: '19.05.2026', number: 'JE-2026-0140', ref: 'PAY-0091',     type: 'payment',       status: 'posted',  description: 'Laekumine · arve AR-2026-0088',            partner: 'Tartu Tehnoloogia AS', debit:  { code: '1100', name: 'Arvelduskonto · Swedbank',   amount: 2160.00 }, credit: { code: '1210', name: 'Nõuded ostjate vastu',    amount: 2160.00 }, vat: 0.00,    amount: 2160.00 },
    { id: 'JE-0139', date: '18.05.2026', number: 'JE-2026-0139', ref: 'OST-1841',     type: 'purchase',      status: 'posted',  description: 'Kontoriüür · mai',                         partner: 'Maakri Ärihaldus OÜ',  debit:  { code: '5000', name: 'Rendi- ja kommunaalkulud',   amount: 1100.00 }, credit: { code: '2110', name: 'Võlad tarnijatele',       amount: 1100.00 }, vat: 220.00,  amount: 1320.00 },
    { id: 'JE-0138', date: '17.05.2026', number: 'JE-2026-0138', ref: 'AR-2026-0090', type: 'sales_invoice', status: 'posted',  description: 'Müük · Konsultatsioon · 8h',               partner: 'Nordic Capital OÜ',    debit:  { code: '1210', name: 'Nõuded ostjate vastu',       amount: 960.00  }, credit: { code: '4000', name: 'Müügitulu · Teenused',    amount: 800.00  }, vat: 160.00,  amount: 960.00  },
    { id: 'JE-0137', date: '15.05.2026', number: 'JE-2026-0137', ref: 'PAY-0090',     type: 'payment',       status: 'posted',  description: 'Maksed tarnijatele · partii',              partner: '— · partii (4)',       debit:  { code: '2110', name: 'Võlad tarnijatele',          amount: 3840.00 }, credit: { code: '1100', name: 'Arvelduskonto · Swedbank', amount: 3840.00 }, vat: 0.00,    amount: 3840.00 },
    { id: 'JE-0136', date: '14.05.2026', number: 'JE-2026-0136', ref: 'PAY-PAL-0042', type: 'payment',       status: 'draft',   description: 'Palgad · mai · 1. pool',                   partner: '— · töötajad (4)',     debit:  { code: '2310', name: 'Tasumata töötasud',          amount: 8420.00 }, credit: { code: '1100', name: 'Arvelduskonto · Swedbank', amount: 8420.00 }, vat: 0.00,    amount: 8420.00 },
    { id: 'JE-0135', date: '14.05.2026', number: 'JE-2026-0135', ref: 'OST-1840',     type: 'purchase',      status: 'posted',  description: 'Sülearvuti · Macbook Pro 14"',             partner: 'iDeal AS',             debit:  { code: '1500', name: 'Põhivara · IT',              amount: 2400.00 }, credit: { code: '2110', name: 'Võlad tarnijatele',       amount: 2400.00 }, vat: 480.00,  amount: 2880.00 },
    { id: 'JE-0134', date: '13.05.2026', number: 'JE-2026-0134', ref: 'AR-2026-0089', type: 'sales_invoice', status: 'posted',  description: 'Müük · Tellimuse arendus · faas 2',        partner: 'Stuudio Veski OÜ',     debit:  { code: '1210', name: 'Nõuded ostjate vastu',       amount: 6420.00 }, credit: { code: '4000', name: 'Müügitulu · Teenused',    amount: 5350.00 }, vat: 1070.00, amount: 6420.00 },
    { id: 'JE-0133', date: '12.05.2026', number: 'JE-2026-0133', ref: 'JR-MANUAL',    type: 'manual',        status: 'draft',   description: 'Kuubaaki: amortisatsioon · mai',           partner: '—',                    debit:  { code: '5800', name: 'Kulum',                       amount: 312.00  }, credit: { code: '1505', name: 'Akum. kulum · IT',         amount: 312.00  }, vat: 0.00,    amount: 312.00  },
    { id: 'JE-0132', date: '11.05.2026', number: 'JE-2026-0132', ref: 'OST-1839',     type: 'purchase',      status: 'posted',  description: 'Linde gaas · kontor',                      partner: 'Eesti Energia AS',     debit:  { code: '5000', name: 'Rendi- ja kommunaalkulud',   amount: 184.50  }, credit: { code: '2110', name: 'Võlad tarnijatele',       amount: 184.50  }, vat: 36.90,   amount: 221.40  },
    { id: 'JE-0131', date: '10.05.2026', number: 'JE-2026-0131', ref: 'OST-1838',     type: 'purchase',      status: 'posted',  description: 'Domeen + SSL · arvelo.ee',                 partner: 'Zone Media OÜ',        debit:  { code: '5200', name: 'Tarkvara ja teenused',       amount: 84.00   }, credit: { code: '2110', name: 'Võlad tarnijatele',       amount: 84.00   }, vat: 16.80,   amount: 100.80  },
  ],

  // --- Partners ---
  partners: [
    { code: 'P-0142', name: 'Stuudio Veski OÜ',        regCode: '12345678', vat: 'EE101234567', email: 'arved@stuudioveski.ee',     phone: '+372 5123 4567', type: 'customer', balance:  10704.00, terms: 14, active: true,  recent: '20.05.2026', invoices: 12, country: 'EE' },
    { code: 'P-0141', name: 'Tartu Tehnoloogia AS',    regCode: '11234990', vat: 'EE100872311', email: 'finants@tartu-tek.ee',      phone: '+372 7456 1100', type: 'customer', balance:   3120.00, terms: 30, active: true,  recent: '19.05.2026', invoices: 8,  country: 'EE' },
    { code: 'P-0140', name: 'Nordic Capital OÜ',       regCode: '13412009', vat: 'EE102810443', email: 'p.kask@nordiccapital.ee',   phone: '+372 5566 4421', type: 'customer', balance:    960.00, terms: 14, active: true,  recent: '17.05.2026', invoices: 5,  country: 'EE' },
    { code: 'P-0139', name: 'Pärnu Hotellid OÜ',       regCode: '14201882', vat: 'EE103012775', email: 'office@parnuhotellid.ee',   phone: '+372 4423 1900', type: 'customer', balance:      0.00, terms: 14, active: true,  recent: '02.05.2026', invoices: 3,  country: 'EE' },
    { code: 'P-0138', name: 'Helsinki Studio Oy',      regCode: 'FI 2890421-5', vat: 'FI28904215', email: 'invoices@helsinkistudio.fi', phone: '+358 50 442 1100', type: 'customer', balance: 1840.00, terms: 30, active: true, recent: '08.05.2026', invoices: 4, country: 'FI' },
    { code: 'V-0204', name: 'Maakri Ärihaldus OÜ',     regCode: '10982314', vat: 'EE100221033', email: 'office@maakri.ee',          phone: '+372 6644 0021', type: 'supplier', balance:  -1320.00, terms: 7,  active: true,  recent: '18.05.2026', invoices: 14, country: 'EE' },
    { code: 'V-0203', name: 'Amazon Web Services',     regCode: 'LU 25400123', vat: 'LU25400123', email: 'billing@aws.com',         phone: '—',              type: 'supplier', balance:  -412.50,  terms: 14, active: true,  recent: '20.05.2026', invoices: 12, country: 'LU' },
    { code: 'V-0202', name: 'iDeal AS',                regCode: '10884720', vat: 'EE100884720', email: 'arved@ideal.ee',            phone: '+372 6660 8900', type: 'supplier', balance:  -2880.00, terms: 30, active: true,  recent: '14.05.2026', invoices: 6,  country: 'EE' },
    { code: 'V-0201', name: 'Eesti Energia AS',        regCode: '10421629', vat: 'EE100421629', email: 'arved@energia.ee',          phone: '+372 7717 7000', type: 'supplier', balance:  -221.40,  terms: 14, active: true,  recent: '11.05.2026', invoices: 11, country: 'EE' },
    { code: 'V-0200', name: 'Zone Media OÜ',           regCode: '10577820', vat: 'EE100577820', email: 'arved@zone.ee',             phone: '+372 6884 144',  type: 'supplier', balance:  -100.80,  terms: 14, active: true,  recent: '10.05.2026', invoices: 24, country: 'EE' },
    { code: 'B-0042', name: 'Tõnis Käärma',            regCode: '38211204221', vat: '',          email: 'tonis@studiolillemets.ee', phone: '+372 5122 4400', type: 'both',     balance:    -420.00, terms: 0,  active: true,  recent: '14.05.2026', invoices: 2, country: 'EE' },
  ],

  // --- Invoices (sales) ---
  invoices: [
    { number: 'AR-2026-0091', partner: 'Stuudio Veski OÜ',     date: '20.05.2026', due: '03.06.2026', amount: 4284.00, paid:    0.00, status: 'open',     currency: 'EUR', items: 1 },
    { number: 'AR-2026-0090', partner: 'Nordic Capital OÜ',    date: '17.05.2026', due: '31.05.2026', amount:  960.00, paid:    0.00, status: 'open',     currency: 'EUR', items: 1 },
    { number: 'AR-2026-0089', partner: 'Stuudio Veski OÜ',     date: '13.05.2026', due: '27.05.2026', amount: 6420.00, paid:    0.00, status: 'open',     currency: 'EUR', items: 3 },
    { number: 'AR-2026-0088', partner: 'Tartu Tehnoloogia AS', date: '05.05.2026', due: '19.05.2026', amount: 2160.00, paid: 2160.00, status: 'paid',     currency: 'EUR', items: 2 },
    { number: 'AR-2026-0087', partner: 'Pärnu Hotellid OÜ',    date: '02.05.2026', due: '16.05.2026', amount: 1840.00, paid:    0.00, status: 'overdue',  currency: 'EUR', items: 1 },
    { number: 'AR-2026-0086', partner: 'Helsinki Studio Oy',   date: '28.04.2026', due: '28.05.2026', amount: 1840.00, paid:    0.00, status: 'open',     currency: 'EUR', items: 1 },
    { number: 'AR-2026-0085', partner: 'Tartu Tehnoloogia AS', date: '24.04.2026', due: '08.05.2026', amount:  960.00, paid:    0.00, status: 'overdue',  currency: 'EUR', items: 1 },
    { number: 'AR-2026-0084', partner: 'Stuudio Veski OÜ',     date: '20.04.2026', due: '04.05.2026', amount: 3420.00, paid: 3420.00, status: 'paid',     currency: 'EUR', items: 2 },
    { number: 'AR-2026-0083', partner: 'Nordic Capital OÜ',    date: '15.04.2026', due: '29.04.2026', amount: 1240.00, paid: 1240.00, status: 'paid',     currency: 'EUR', items: 1 },
    { number: 'AR-2026-0082-D', partner: 'Stuudio Veski OÜ',   date: '20.05.2026', due: '03.06.2026', amount:    0.00, paid:    0.00, status: 'draft',    currency: 'EUR', items: 0 },
  ],
};

// --- Helpers ---
const fmtEUR = (n, opts = {}) => {
  const { sign = false, abs = false } = opts;
  const v = abs ? Math.abs(n) : n;
  const s = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sign && n > 0) return `+€${s}`;
  if (sign && n < 0) return `−€${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 && !abs ? `−€${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `€${s}`;
};

const initials = (name) => {
  const parts = name.replace(/[·,].*/, '').split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
};

// Stable colour for an avatar dot from a name string
const hueFromName = (s) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
};

Object.assign(window, { DATA, fmtEUR, initials, hueFromName });
