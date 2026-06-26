// Recurring invoices · Halo Pro
// Invoice templates that auto-generate on a cadence. Split-pane: schedule list
// left, schedule detail right (cadence, next runs timeline, generated history,
// pause/resume/edit). Summary strip shows MRR and what's due in the next 30 days.
// Interactive: select a schedule, pause/resume it, watch the summary recompute.

// per-cycle amount + frequency → monthly-equivalent (for MRR)
const REC_PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, annually: 1 / 12 };

const REC_SEED = [
  { id: 'r1', customer: 'Stuudio Veski OÜ',     template: 'Brändi tugi · kuuretainer',   amount: 1200.00, freq: 'monthly',   next: '01.06.2026', delivery: 'auto',  started: '01.01.2026', ends: null,          generated: 5,  vat: 20, status: 'active' },
  { id: 'r2', customer: 'Tartu Tehnoloogia AS', template: 'Majutus + tugi',               amount: 420.00,  freq: 'monthly',   next: '01.06.2026', delivery: 'auto',  started: '01.09.2025', ends: null,          generated: 9,  vat: 20, status: 'active' },
  { id: 'r3', customer: 'Nordic Capital OÜ',    template: 'Nõustamine · kvartal',         amount: 2400.00, freq: 'quarterly', next: '01.07.2026', delivery: 'draft', started: '01.01.2026', ends: null,          generated: 2,  vat: 20, status: 'active' },
  { id: 'r4', customer: 'Helsinki Studio Oy',   template: 'Litsents · SaaS',              amount: 180.00,  freq: 'monthly',   next: '01.06.2026', delivery: 'auto',  started: '01.03.2026', ends: '31.12.2026', generated: 3,  vat: 0,  status: 'active' },
  { id: 'r5', customer: 'Pärnu Hotellid OÜ',    template: 'Hooldus · objektipõhine',      amount: 340.00,  freq: 'monthly',   next: '—',          delivery: 'draft', started: '01.11.2025', ends: null,          generated: 6,  vat: 20, status: 'paused' },
  { id: 'r6', customer: 'Stuudio Veski OÜ',     template: 'Serverimaja · aastane',        amount: 1440.00, freq: 'annually',  next: '01.01.2027', delivery: 'draft', started: '01.01.2026', ends: null,          generated: 1,  vat: 20, status: 'active' },
];

const REC_FREQ_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };
const REC_FREQ_PER = { weekly: '/wk', monthly: '/mo', quarterly: '/qtr', annually: '/yr' };

// days until a DD.MM.YYYY date, from frozen "today" = 25.05.2026
const REC_TODAY = new Date(2026, 4, 25);
const recDays = (d) => {
  if (!d || d === '—') return null;
  const [dd, mm, yy] = d.split('.');
  return Math.round((new Date(+yy, +mm - 1, +dd) - REC_TODAY) / 86400000);
};

function RecurringInvoicesA() {
  const [profiles, setProfiles] = React.useState(REC_SEED.map((p) => ({ ...p })));
  const [selectedId, setSelectedId] = React.useState('r1');
  const [tab, setTab] = React.useState('active');

  const selected = profiles.find((p) => p.id === selectedId);
  const toggle = (id) => setProfiles((ps) => ps.map((p) => p.id === id ? {
    ...p,
    status: p.status === 'active' ? 'paused' : 'active',
    next: p.status === 'active' ? '—' : '01.06.2026',
  } : p));

  // derived metrics
  const mrr = profiles.filter((p) => p.status === 'active').reduce((s, p) => s + (p.amount * REC_PER_MONTH[p.freq]), 0);
  const dueSoon = profiles.filter((p) => p.status === 'active' && recDays(p.next) !== null && recDays(p.next) <= 30);
  const dueSoonAmt = dueSoon.reduce((s, p) => s + p.amount, 0);
  const autoCount = profiles.filter((p) => p.status === 'active' && p.delivery === 'auto').length;
  const activeCount = profiles.filter((p) => p.status === 'active').length;

  const counts = {
    active: profiles.filter((p) => p.status === 'active').length,
    paused: profiles.filter((p) => p.status === 'paused').length,
    all: profiles.length,
  };
  const tabs = [
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'paused', label: 'Paused', count: counts.paused },
    { id: 'all', label: 'All schedules', count: counts.all },
  ];
  const visible = tab === 'all' ? profiles : profiles.filter((p) => p.status === tab);

  return (
    <PageA active="rec">
      <HaloProCommandBar
        crumbs={['Invoices', 'Recurring', tab === 'all' ? 'All' : REC_FREQ_LABEL[tab] || 'Active']}
        hints
        actions={
          <ButtonA variant="primary" icon={<I.plus size={13} />}>
            New schedule
            <kbd style={{ ...recKbd, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>N</kbd>
          </ButtonA>
        }
      />

      {/* Summary strip */}
      <div style={{ padding: '0 28px 16px 28px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderBottom: '1px solid var(--a-border)', paddingBottom: 18 }}>
        <RecStat label="Recurring revenue" value={fmtEUR(mrr)} sub={`${activeCount} active schedules`} accent />
        <RecStat label="Due next 30 days" value={fmtEUR(dueSoonAmt)} sub={`${dueSoon.length} invoices to issue`} />
        <RecStat label="Auto-send" value={`${autoCount}/${activeCount}`} sub="issue without review" />
        <RecStat label="Paused" value={counts.paused.toString()} sub="not generating" tone={counts.paused > 0 ? 'warn' : 'muted'} last />
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 28px 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tabs.map((t) => (
            <div key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '5px 11px', borderRadius: 6, cursor: 'pointer',
              background: t.id === tab ? 'var(--a-text)' : 'transparent',
              color: t.id === tab ? '#fff' : 'var(--a-text-2)', fontSize: 12.5, fontWeight: 500,
            }}>
              {t.label}<span style={{ fontSize: 11, fontWeight: 600, color: t.id === tab ? 'rgba(255,255,255,0.55)' : 'var(--a-text-3)' }}>{t.count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--a-text-3)' }}>
          <kbd style={recKbd}>J</kbd><kbd style={recKbd}>K</kbd> navigate · <kbd style={recKbd}>P</kbd> pause · <kbd style={recKbd}>E</kbd> edit
        </div>
      </div>

      {/* Split pane */}
      <div style={{ padding: '12px 28px 16px 28px', flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
        {/* LEFT — schedule list */}
        <div style={{ flex: 1.55, minWidth: 0, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 110px 120px 130px', gap: 10, padding: '9px 16px',
            borderBottom: '1px solid var(--a-border)', background: 'var(--a-surface-2)',
            fontSize: 10.5, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            <div>Customer · template</div><div>Cadence</div><div>Next issue</div><div style={{ textAlign: 'right' }}>Amount</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {visible.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--a-text-3)', fontSize: 13 }}>No schedules here.</div>
            )}
            {visible.map((p) => (
              <RecRow key={p.id} p={p} selected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
            ))}
          </div>
          <div className="mono" style={{ padding: '8px 16px', borderTop: '1px solid var(--a-border)', background: 'var(--a-surface-2)', display: 'flex', gap: 14, fontSize: 11, color: 'var(--a-text-3)' }}>
            <span><span style={{ color: 'var(--a-text-2)' }}>{visible.length}</span> shown</span>
            <span>MRR <span style={{ color: 'var(--a-accent)' }}>{fmtEUR(mrr)}</span></span>
            <span style={{ flex: 1 }} />
            <span>next run 01.06.2026</span>
          </div>
        </div>

        {/* RIGHT — schedule detail */}
        <RecDetailPane key={selectedId} p={selected} onToggle={toggle} />
      </div>
    </PageA>
  );
}

function RecStat({ label, value, sub, tone, accent }) {
  const color = accent ? 'var(--a-accent)' : tone === 'warn' ? 'var(--a-warn)' : 'var(--a-text)';
  return (
    <div style={{ paddingRight: 24 }}>
      <div style={{ fontSize: 11, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div className="display mono tnum" style={{ marginTop: 7, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color }}>{value}</div>
      <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--a-text-3)' }}>{sub}</div>
    </div>
  );
}

function RecRow({ p, selected, onSelect }) {
  const paused = p.status === 'paused';
  const days = recDays(p.next);
  const soon = days !== null && days <= 7;
  return (
    <div onClick={onSelect} style={{
      display: 'grid', gridTemplateColumns: '1fr 110px 120px 130px', gap: 10, padding: '11px 16px',
      borderBottom: '1px solid var(--a-border)', alignItems: 'center', cursor: 'pointer', fontSize: 13,
      background: selected ? 'var(--a-accent-soft-2)' : 'transparent',
      boxShadow: selected ? 'inset 2px 0 0 var(--a-accent)' : 'none',
      opacity: paused ? 0.62 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <RecAvatar name={p.customer} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--a-text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.customer}</div>
          <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.template}</div>
        </div>
      </div>
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--a-text-2)' }}>
          <I.refresh size={12} style={{ color: 'var(--a-text-3)' }} />{REC_FREQ_LABEL[p.freq]}
        </span>
        {p.delivery === 'auto'
          ? <div style={{ fontSize: 10.5, color: 'var(--a-pos)', marginTop: 2 }}>auto-send</div>
          : <div style={{ fontSize: 10.5, color: 'var(--a-text-3)', marginTop: 2 }}>draft first</div>}
      </div>
      <div>
        {paused ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--a-warn)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <I.pause size={11} /> Paused
          </span>
        ) : (
          <>
            <div className="mono tnum" style={{ fontSize: 12.5, color: 'var(--a-text)' }}>{p.next}</div>
            <div style={{ fontSize: 10.5, color: soon ? 'var(--a-accent)' : 'var(--a-text-3)', marginTop: 1 }}>{days === 0 ? 'today' : `in ${days}d`}</div>
          </>
        )}
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: 'var(--a-text)' }}>
        {fmtEUR(p.amount)}<span style={{ fontSize: 10.5, color: 'var(--a-text-3)', fontWeight: 400 }}>{REC_FREQ_PER[p.freq]}</span>
      </div>
    </div>
  );
}

function RecDetailPane({ p, onToggle }) {
  if (!p) return null;
  const paused = p.status === 'paused';
  const net = p.vat > 0 ? p.amount / (1 + p.vat / 100) : p.amount;
  const vatAmt = p.amount - net;

  // upcoming runs: next 3 cycle dates from p.next
  const upcoming = (() => {
    if (paused || p.next === '—') return [];
    const [dd, mm, yy] = p.next.split('.');
    const step = { weekly: [0, 0, 7], monthly: [0, 1, 0], quarterly: [0, 3, 0], annually: [1, 0, 0] }[p.freq];
    const out = [];
    let y = +yy, m = +mm, d = +dd;
    for (let i = 0; i < 3; i++) {
      out.push(`${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`);
      y += step[0]; m += step[1]; d += step[2];
      while (m > 12) { m -= 12; y += 1; }
    }
    return out;
  })();

  // generated history (synthetic from generated count)
  const history = Array.from({ length: Math.min(p.generated, 4) }).map((_, i) => {
    const statuses = ['paid', 'paid', 'open', 'paid'];
    return { num: `AR-2026-00${70 - i}`, date: ['01.05', '01.04', '01.03', '01.02'][i] + '.2026', status: statuses[i % 4] };
  });

  return (
    <div style={{ width: 400, flexShrink: 0, background: 'var(--a-surface)', borderRadius: 10, border: '1px solid var(--a-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '16px 18px 14px 18px', borderBottom: '1px solid var(--a-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <RecAvatar name={p.customer} size={30} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--a-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.customer}</div>
              <div style={{ fontSize: 12, color: 'var(--a-text-2)' }}>{p.template}</div>
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            background: paused ? 'var(--a-warn-soft)' : 'var(--a-pos-soft)', color: paused ? 'var(--a-warn)' : 'var(--a-pos)',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />{paused ? 'Paused' : 'Active'}
          </span>
        </div>
        <div className="display mono tnum" style={{ marginTop: 14, fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--a-text)' }}>
          {fmtEUR(p.amount)}<span style={{ fontSize: 14, color: 'var(--a-text-3)', fontWeight: 400 }}>{REC_FREQ_PER[p.freq]}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--a-text-3)', marginTop: 3 }}>
          {p.vat > 0 ? <><span className="mono">{fmtEUR(net)}</span> net + <span className="mono">{fmtEUR(vatAmt)}</span> VAT {p.vat}%</> : 'VAT 0% · reverse charge'}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {/* meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
          <RecMeta label="Cadence" value={REC_FREQ_LABEL[p.freq]} />
          <RecMeta label="Delivery" value={p.delivery === 'auto' ? 'Auto-send' : 'Draft for review'} tone={p.delivery === 'auto' ? 'pos' : null} />
          <RecMeta label="Started" value={p.started} mono />
          <RecMeta label="Ends" value={p.ends || 'No end date'} mono={!!p.ends} />
        </div>

        {/* upcoming runs */}
        <div className="micro" style={{ color: 'var(--a-text-3)', margin: '18px 0 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Upcoming runs</div>
        {paused ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--a-warn-soft)', borderRadius: 8, padding: '11px 13px', fontSize: 12.5, color: 'var(--a-text-2)' }}>
            <I.pause size={15} style={{ color: 'var(--a-warn)' }} /> Paused — no invoices will be generated until resumed.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 6 }}>
            {upcoming.map((d, i) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? 'var(--a-accent)' : 'var(--a-surface-2)', border: i === 0 ? 'none' : '1.5px solid var(--a-border-strong)', flexShrink: 0 }} />
                <span className="mono tnum" style={{ fontSize: 13, color: i === 0 ? 'var(--a-text)' : 'var(--a-text-2)', fontWeight: i === 0 ? 600 : 400, width: 90 }}>{d}</span>
                <span style={{ fontSize: 12, color: 'var(--a-text-3)' }}>{i === 0 ? `next · ${p.delivery === 'auto' ? 'auto-sends' : 'creates draft'}` : 'scheduled'}</span>
                <span style={{ flex: 1 }} />
                <span className="mono tnum" style={{ fontSize: 12, color: 'var(--a-text-3)' }}>{fmtEUR(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* generated history */}
        <div className="micro" style={{ color: 'var(--a-text-3)', margin: '18px 0 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Generated · {p.generated} invoices
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.map((h) => (
            <div key={h.num} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', border: '1px solid var(--a-border)', borderRadius: 7 }}>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--a-accent)', fontWeight: 500 }}>{h.num}</span>
              <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>{h.date}</span>
              <span style={{ flex: 1 }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: h.status === 'paid' ? 'var(--a-pos)' : 'var(--a-accent)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />{h.status}
              </span>
              <span className="mono tnum" style={{ fontSize: 12, color: 'var(--a-text)', fontWeight: 500 }}>{fmtEUR(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* footer actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--a-border)', background: 'var(--a-surface-2)', display: 'flex', gap: 8 }}>
        <ButtonA style={{ flex: 1, justifyContent: 'center' }} icon={paused ? <I.play size={13} /> : <I.pause size={13} />} onClick={() => onToggle(p.id)}>
          {paused ? 'Resume' : 'Pause'} <kbd style={{ ...recKbd, marginLeft: 4 }}>P</kbd>
        </ButtonA>
        <ButtonA style={{ flex: 1, justifyContent: 'center' }} icon={<I.edit size={13} />}>Edit <kbd style={{ ...recKbd, marginLeft: 4 }}>E</kbd></ButtonA>
        <ButtonA style={{ width: 32, justifyContent: 'center', padding: 0 }} icon={<I.more size={14} />} />
      </div>
    </div>
  );
}

function RecMeta({ label, value, mono, tone }) {
  return (
    <div>
      <div className="micro" style={{ color: 'var(--a-text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div className={mono ? 'mono' : ''} style={{ marginTop: 4, fontSize: 13, color: tone === 'pos' ? 'var(--a-pos)' : 'var(--a-text)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function RecAvatar({ name, size = 26 }) {
  const h = hueFromName(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: `oklch(0.92 0.04 ${h})`, color: `oklch(0.34 0.08 ${h})`,
      display: 'grid', placeItems: 'center', fontSize: size * 0.4, fontWeight: 600,
    }}>{initials(name)}</div>
  );
}

const recKbd = {
  fontFamily: 'Geist Mono, JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'var(--a-surface-2)', color: 'var(--a-text-2)', border: '1px solid var(--a-border)',
};

Object.assign(window, { RecurringInvoicesA });
