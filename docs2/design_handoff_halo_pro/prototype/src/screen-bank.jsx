// Bank import / reconcile · Halo Pro
// The reconciliation workbench — a bank statement feed on the left, a
// per-line reconcile panel on the right. Full workflow: confirm a suggested
// match, categorize to an account (+ create a rule), split one line across
// several accounts, or record a transfer. Interactive where it matters:
// tab switching, confirm → status change, split-remainder math, rule toggle.

// ─── Sample statement (Swedbank EUR · May 2026) ──────────────────────────────
// kind: 'in' (money in) | 'out' (money out)
// status: 'matched' | 'suggested' | 'review'
// suggest: { type:'match'|'categorize', confidence, ... }
const BANK_LINES_SEED = [
  { id: 'b1',  date: '20.05', narrative: 'STUUDIO VESKI OU', detail: 'Viitenumber 991 · arve AR-2026-0091', kind: 'in',  amount: 4284.00, status: 'suggested',
    suggest: { type: 'match', confidence: 98, doc: 'AR-2026-0091', label: 'Stuudio Veski OÜ · sales invoice', sub: 'Exact amount + reference match', account: '1210' } },
  { id: 'b2',  date: '20.05', narrative: 'AMAZON WEB SERVICES', detail: 'Card 4400 · AWS EMEA', kind: 'out', amount: 412.50, status: 'suggested',
    suggest: { type: 'categorize', confidence: 95, account: '5200', label: 'Tarkvara ja teenused', sub: 'Rule: AWS → 5200 (used 11×)', rule: true } },
  { id: 'b3',  date: '19.05', narrative: 'TARTU TEHNOLOOGIA AS', detail: 'Viitenumber 884 · laekumine', kind: 'in',  amount: 2160.00, status: 'matched',
    suggest: { type: 'match', confidence: 100, doc: 'AR-2026-0088', label: 'Tartu Tehnoloogia AS · paid', sub: 'Reconciled 19.05', account: '1210' } },
  { id: 'b4',  date: '18.05', narrative: 'MAAKRI ARIHALDUS OU', detail: 'Kontoriüür · mai 2026', kind: 'out', amount: 1320.00, status: 'suggested',
    suggest: { type: 'match', confidence: 92, doc: 'OST-1841', label: 'Maakri Ärihaldus OÜ · supplier bill', sub: 'Amount match · rent', account: '5000' } },
  { id: 'b5',  date: '15.05', narrative: 'PALK MAI 1. POOL', detail: 'Koondmakse · 4 töötajat', kind: 'out', amount: 8420.00, status: 'review',
    suggest: { type: 'split', confidence: 0, label: 'Looks like a payroll batch', sub: 'Split across employees / wages' } },
  { id: 'b6',  date: '14.05', narrative: 'PARNU HOTELLID OU', detail: 'Viitenumber 877', kind: 'in',  amount: 1840.00, status: 'suggested',
    suggest: { type: 'match', confidence: 88, doc: 'AR-2026-0087', label: 'Pärnu Hotellid OÜ · overdue invoice', sub: 'Amount match · was 13d overdue', account: '1210' } },
  { id: 'b7',  date: '14.05', narrative: 'SWEDBANK TEENUSTASU', detail: 'Kuutasu + tehingud', kind: 'out', amount: 54.30, status: 'suggested',
    suggest: { type: 'categorize', confidence: 99, account: '5900', label: 'Pangateenused', sub: 'Rule: bank fees → 5900 (used 5×)', rule: true } },
  { id: 'b8',  date: '13.05', narrative: 'NORDIC CAPITAL OU', detail: 'Viitenumber 890', kind: 'in',  amount: 960.00, status: 'review',
    suggest: { type: 'match', confidence: 61, doc: 'AR-2026-0090', label: 'Nordic Capital OÜ · open invoice', sub: 'Partner match, amount differs slightly', account: '1210' } },
  { id: 'b9',  date: '11.05', narrative: 'EESTI ENERGIA AS', detail: 'Elekter · kontor', kind: 'out', amount: 221.40, status: 'suggested',
    suggest: { type: 'match', confidence: 90, doc: 'OST-1839', label: 'Eesti Energia AS · supplier bill', sub: 'Amount + partner match', account: '5000' } },
  { id: 'b10', date: '10.05', narrative: 'ZONE MEDIA OU', detail: 'Domeen + SSL · arvelo.ee', kind: 'out', amount: 100.80, status: 'review',
    suggest: { type: 'categorize', confidence: 40, account: '5200', label: 'Tarkvara ja teenused', sub: 'No rule yet · low confidence' } },
];

const bankAcct = (code) => (window.DATA ? DATA.accounts.find((a) => a.code === code) : null);

function BankReconcileA() {
  const [lines, setLines] = React.useState(BANK_LINES_SEED.map((l) => ({ ...l })));
  const [selectedId, setSelectedId] = React.useState('b1');
  const [tab, setTab] = React.useState('review');

  const selected = lines.find((l) => l.id === selectedId);

  const setStatus = (id, status) => setLines((ls) => ls.map((l) => l.id === id ? { ...l, status } : l));
  const confirmLine = (id) => {
    setStatus(id, 'matched');
    // auto-advance to next unreconciled
    const idx = lines.findIndex((l) => l.id === id);
    const next = lines.slice(idx + 1).find((l) => l.status !== 'matched');
    if (next) setSelectedId(next.id);
  };

  const counts = {
    review: lines.filter((l) => l.status === 'review').length,
    suggested: lines.filter((l) => l.status === 'suggested').length,
    matched: lines.filter((l) => l.status === 'matched').length,
    all: lines.length,
  };
  const tabs = [
    { id: 'review', label: 'To review', count: counts.review, warn: true },
    { id: 'suggested', label: 'Suggested', count: counts.suggested },
    { id: 'matched', label: 'Matched', count: counts.matched },
    { id: 'all', label: 'All lines', count: counts.all },
  ];
  const visible = tab === 'all' ? lines : lines.filter((l) => l.status === tab);

  const totalIn = lines.filter((l) => l.kind === 'in').reduce((s, l) => s + l.amount, 0);
  const totalOut = lines.filter((l) => l.kind === 'out').reduce((s, l) => s + l.amount, 0);
  const opening = 46436.85;
  const closing = opening + totalIn - totalOut;
  const pct = Math.round((counts.matched / counts.all) * 100);

  return (
    <PageA active="bank">
      <HaloProCommandBar
        crumbs={['Bank', 'Swedbank · EE EUR', 'May 2026']}
        hints
        actions={
          <>
            <ButtonA icon={<I.upload size={13} />}>Import statement</ButtonA>
            <ButtonA variant="primary" icon={<I.check size={13} />}>
              Reconcile all suggested
              <kbd style={{ ...bnkKbd, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>A</kbd>
            </ButtonA>
          </>
        }
      />

      {/* Statement summary strip */}
      <div style={{ padding: '0 28px 16px 28px', display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1.1fr 1.6fr', gap: 0, borderBottom: '1px solid var(--a-border)', paddingBottom: 18, alignItems: 'end' }}>
        <BnkStat label="Opening balance" value={fmtEUR(opening)} sub="01.05.2026" />
        <BnkStat label="Money in" value={fmtEUR(totalIn)} sub={`${lines.filter((l) => l.kind === 'in').length} credits`} tone="pos" />
        <BnkStat label="Money out" value={fmtEUR(totalOut)} sub={`${lines.filter((l) => l.kind === 'out').length} debits`} tone="neg" />
        <BnkStat label="Closing balance" value={fmtEUR(closing)} sub="statement · matches bank" check />
        {/* progress */}
        <div style={{ paddingLeft: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 11, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Reconciliation</span>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--a-text)', fontWeight: 600 }}>{counts.matched}/{counts.all} · {pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--a-surface-2)', overflow: 'hidden', border: '1px solid var(--a-border)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--a-pos)' : 'var(--a-accent)', transition: 'width 200ms' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--a-text-3)' }}>
            {counts.review > 0 ? `${counts.review} need review · ${counts.suggested} ready to confirm` : `${counts.suggested} ready to confirm`}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 28px 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tabs.map((t) => (
            <div key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              padding: '5px 11px', borderRadius: 6, cursor: 'pointer',
              background: t.id === tab ? 'var(--a-text)' : 'transparent',
              color: t.id === tab ? '#fff' : 'var(--a-text-2)',
              fontSize: 12.5, fontWeight: 500,
            }}>
              {t.label}
              <span style={{ fontSize: 11, fontWeight: 600, color: t.id === tab ? 'rgba(255,255,255,0.55)' : (t.warn && t.count > 0) ? 'var(--a-accent)' : 'var(--a-text-3)' }}>{t.count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--a-text-3)' }}>
          <kbd style={bnkKbd}>J</kbd><kbd style={bnkKbd}>K</kbd> navigate · <kbd style={bnkKbd}>↵</kbd> confirm · <kbd style={bnkKbd}>C</kbd> categorize
        </div>
      </div>

      {/* Split pane */}
      <div style={{ padding: '12px 28px 12px 28px', flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
        {/* LEFT — statement feed */}
        <div style={{ flex: 1.5, minWidth: 0, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '52px 1fr 150px 130px', gap: 10, padding: '9px 16px',
            borderBottom: '1px solid var(--a-border)', background: 'var(--a-surface-2)',
            fontSize: 10.5, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            <div>Date</div><div>Bank line</div><div>Suggestion</div><div style={{ textAlign: 'right' }}>Amount</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {visible.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--a-text-3)', fontSize: 13 }}>
                <I.check size={22} style={{ color: 'var(--a-pos)' }} />
                <div style={{ marginTop: 8 }}>Nothing here — all caught up.</div>
              </div>
            )}
            {visible.map((l) => (
              <BankLineRow key={l.id} l={l} selected={l.id === selectedId} onSelect={() => setSelectedId(l.id)} />
            ))}
          </div>
          {/* mono status line */}
          <div className="mono" style={{ padding: '8px 16px', borderTop: '1px solid var(--a-border)', background: 'var(--a-surface-2)', display: 'flex', gap: 14, fontSize: 11, color: 'var(--a-text-3)' }}>
            <span><span style={{ color: 'var(--a-text-2)' }}>{visible.length}</span> shown</span>
            <span>in <span style={{ color: 'var(--a-pos)' }}>{fmtEUR(totalIn)}</span></span>
            <span>out <span style={{ color: 'var(--a-neg)' }}>{fmtEUR(totalOut)}</span></span>
            <span style={{ flex: 1 }} />
            <span style={{ color: pct === 100 ? 'var(--a-pos)' : 'var(--a-text-3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {pct === 100 ? 'fully reconciled' : `${pct}% reconciled`}
            </span>
          </div>
        </div>

        {/* RIGHT — reconcile workbench */}
        <BankReconcilePanel key={selectedId} line={selected} onConfirm={confirmLine} onUnmatch={(id) => setStatus(id, 'suggested')} />
      </div>
    </PageA>
  );
}

// ─── Statement summary cell ───────────────────────────────────────────────────
function BnkStat({ label, value, sub, tone, check }) {
  const color = tone === 'pos' ? 'var(--a-pos)' : tone === 'neg' ? 'var(--a-neg)' : 'var(--a-text)';
  return (
    <div style={{ paddingRight: 24 }}>
      <div style={{ fontSize: 11, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div className="display mono tnum" style={{ marginTop: 7, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color, display: 'flex', alignItems: 'center', gap: 7 }}>
        {tone === 'pos' && '+'}{tone === 'neg' && '−'}{value.replace(/^[+−-]/, '')}
        {check && <I.check size={15} style={{ color: 'var(--a-pos)' }} />}
      </div>
      <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--a-text-3)' }}>{sub}</div>
    </div>
  );
}

// ─── Statement feed row ───────────────────────────────────────────────────────
function BankLineRow({ l, selected, onSelect }) {
  const inflow = l.kind === 'in';
  const statusMeta = {
    matched:   { color: 'var(--a-pos)',    label: 'Matched' },
    suggested: { color: 'var(--a-accent)', label: 'Suggested' },
    review:    { color: 'var(--a-warn)',   label: 'Review' },
  }[l.status];
  return (
    <div onClick={onSelect} style={{
      display: 'grid', gridTemplateColumns: '52px 1fr 150px 130px', gap: 10, padding: '11px 16px',
      borderBottom: '1px solid var(--a-border)', alignItems: 'center', cursor: 'pointer', fontSize: 13,
      background: selected ? 'var(--a-accent-soft-2)' : 'transparent',
      boxShadow: selected ? 'inset 2px 0 0 var(--a-accent)' : 'none',
    }}>
      <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>{l.date}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--a-text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.narrative}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.detail}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: statusMeta.color }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />{statusMeta.label}
        </span>
        <div style={{ fontSize: 11, color: 'var(--a-text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.suggest.type === 'match' ? l.suggest.doc : l.suggest.type === 'categorize' ? l.suggest.account + ' ' + l.suggest.label : 'Split'}
        </div>
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: inflow ? 'var(--a-pos)' : 'var(--a-text)' }}>
        {inflow ? '+' : '−'}{fmtEUR(l.amount).replace(/^[+−-]/, '')}
      </div>
    </div>
  );
}

// ─── Reconcile workbench (right pane) ─────────────────────────────────────────
function BankReconcilePanel({ line, onConfirm, onUnmatch }) {
  if (!line) return null;
  const inflow = line.kind === 'in';
  const defaultMode = line.suggest.type === 'split' ? 'split' : line.suggest.type === 'categorize' ? 'categorize' : 'match';
  const [mode, setMode] = React.useState(defaultMode);
  const matched = line.status === 'matched';

  const modes = [
    { id: 'match', label: 'Match' },
    { id: 'categorize', label: 'Categorize' },
    { id: 'split', label: 'Split' },
    { id: 'transfer', label: 'Transfer' },
  ];

  return (
    <div style={{ width: 420, flexShrink: 0, background: 'var(--a-surface)', borderRadius: 10, border: '1px solid var(--a-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header — the bank line */}
      <div style={{ padding: '16px 18px 14px 18px', borderBottom: '1px solid var(--a-border)', background: 'var(--a-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>{line.date}.2026 · Swedbank</span>
          {matched ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: 'var(--a-pos-soft)', color: 'var(--a-pos)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <I.check size={11} /> Reconciled
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: line.status === 'review' ? 'var(--a-warn)' : 'var(--a-accent)' }}>
              {line.status === 'review' ? 'Needs review' : `${line.suggest.confidence}% confident`}
            </span>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: 'var(--a-text)' }}>{line.narrative}</div>
        <div style={{ fontSize: 12.5, color: 'var(--a-text-2)', marginTop: 2 }}>{line.detail}</div>
        <div className="display mono tnum" style={{ marginTop: 12, fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: inflow ? 'var(--a-pos)' : 'var(--a-text)' }}>
          {inflow ? '+' : '−'}{fmtEUR(line.amount).replace(/^[+−-]/, '')}
        </div>
      </div>

      {matched ? (
        <BankMatchedState line={line} onUnmatch={onUnmatch} />
      ) : (
        <>
          {/* mode tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '10px 14px 0 14px', borderBottom: '1px solid var(--a-border)' }}>
            {modes.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '7px 12px 9px 12px', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                background: 'transparent', border: 'none',
                color: m.id === mode ? 'var(--a-text)' : 'var(--a-text-3)',
                borderBottom: m.id === mode ? '2px solid var(--a-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}>{m.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {mode === 'match' && <BankMatchTab line={line} />}
            {mode === 'categorize' && <BankCategorizeTab line={line} />}
            {mode === 'split' && <BankSplitTab line={line} />}
            {mode === 'transfer' && <BankTransferTab line={line} />}
          </div>

          {/* sticky confirm */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--a-border)', background: 'var(--a-surface-2)', display: 'flex', gap: 8 }}>
            <ButtonA style={{ flex: 1, justifyContent: 'center' }} icon={<I.search size={13} />}>Find more</ButtonA>
            <ButtonA variant="primary" style={{ flex: 1.4, justifyContent: 'center' }} icon={<I.check size={14} />} onClick={() => onConfirm(line.id)}>
              Confirm <kbd style={{ ...bnkKbd, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>↵</kbd>
            </ButtonA>
          </div>
        </>
      )}
    </div>
  );
}

// ── Match tab ──
function BankMatchTab({ line }) {
  const s = line.suggest;
  const isMatch = s.type === 'match';
  const conf = isMatch ? s.confidence : 60;
  const confColor = conf >= 85 ? 'var(--a-pos)' : conf >= 60 ? 'var(--a-warn)' : 'var(--a-neg)';
  return (
    <div>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 10, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Best match</div>
      {isMatch ? (
        <div style={{ border: '1px solid var(--a-accent)', background: 'var(--a-accent-soft-2)', borderRadius: 9, padding: '13px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--a-accent)', fontWeight: 600 }}>{s.doc}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: confColor }}>{conf}% match</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--a-text)', fontWeight: 500, marginTop: 6 }}>{s.label}</div>
          <div style={{ fontSize: 12, color: 'var(--a-text-2)', marginTop: 3 }}>{s.sub}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--a-border)' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--a-text-3)' }}>posts to</span>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--a-text)', background: 'var(--a-surface-2)', padding: '2px 7px', borderRadius: 4 }}>{s.account}</span>
            <span style={{ fontSize: 12, color: 'var(--a-text-2)' }}>{bankAcct(s.account)?.name}</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--a-text-2)', padding: '8px 0' }}>No document match found — try Categorize, or search the ledger.</div>
      )}

      <div className="micro" style={{ color: 'var(--a-text-3)', margin: '16px 0 8px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Other candidates</div>
      {[
        { doc: 'AR-2026-0089', label: 'Stuudio Veski OÜ · open', amt: '€6,420.00', conf: 42 },
        { doc: 'AR-2026-0086', label: 'Helsinki Studio Oy · open', amt: '€1,840.00', conf: 28 },
      ].map((c) => (
        <div key={c.doc} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid var(--a-border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--a-text-2)' }}>{c.doc}</span>
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--a-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
          <span className="mono tnum" style={{ fontSize: 12, color: 'var(--a-text-3)' }}>{c.amt}</span>
        </div>
      ))}
    </div>
  );
}

// ── Categorize tab ──
function BankCategorizeTab({ line }) {
  const [account, setAccount] = React.useState(line.suggest.type === 'categorize' ? line.suggest.account : '');
  const [rule, setRule] = React.useState(!!(line.suggest.type === 'categorize' && line.suggest.confidence >= 95));
  const net = (line.amount / 1.2);
  const vat = line.amount - net;
  return (
    <div>
      {line.suggest.type === 'categorize' && line.suggest.rule && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--a-accent-soft-2)', border: '1px solid var(--a-accent)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <I.sparkle size={15} style={{ color: 'var(--a-accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--a-text)' }}>{line.suggest.sub}</span>
        </div>
      )}
      <label className="micro" style={{ display: 'block', color: 'var(--a-text-3)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Account</label>
      <select value={account} onChange={(e) => setAccount(e.target.value)} style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, border: account ? '1px solid var(--a-border)' : '1px solid var(--a-warn)', background: 'var(--a-surface)', color: 'var(--a-text)' }}>
        <option value="">Select account…</option>
        {(window.DATA ? DATA.accounts : []).map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="micro" style={{ display: 'block', color: 'var(--a-text-3)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>VAT</label>
          <select defaultValue="20" style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--a-border)', background: 'var(--a-surface)', color: 'var(--a-text)' }}>
            <option value="20">Standard 20%</option>
            <option value="0">0% / exempt</option>
            <option value="9">Reduced 9%</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="micro" style={{ display: 'block', color: 'var(--a-text-3)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Partner</label>
          <select defaultValue="" style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--a-border)', background: 'var(--a-surface)', color: 'var(--a-text-2)' }}>
            <option value="">Optional</option>
            {(window.DATA ? DATA.partners.slice(0, 6) : []).map((p) => <option key={p.code}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* VAT breakdown */}
      <div style={{ marginTop: 14, background: 'var(--a-surface-2)', borderRadius: 8, padding: '11px 13px', fontSize: 12.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--a-text-2)' }}><span>Net</span><span className="mono tnum">{fmtEUR(net)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--a-text-2)', marginTop: 5 }}><span>VAT 20%</span><span className="mono tnum">{fmtEUR(vat)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--a-text)', fontWeight: 600, marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--a-border)' }}><span>Gross</span><span className="mono tnum">{fmtEUR(line.amount)}</span></div>
      </div>

      {/* create rule */}
      <button onClick={() => setRule((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '11px 13px', border: '1px solid var(--a-border)', borderRadius: 8, background: rule ? 'var(--a-accent-soft-2)' : 'var(--a-surface)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, border: rule ? 'none' : '1.5px solid var(--a-border-strong)', background: rule ? 'var(--a-accent)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {rule && <I.check size={12} style={{ color: '#fff' }} />}
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--a-text)', fontWeight: 500 }}>Create a rule for "{line.narrative.split(' ').slice(0, 2).join(' ')}"</span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--a-text-3)', marginTop: 1 }}>Auto-categorize future matches to {account || '—'}</span>
        </span>
      </button>
    </div>
  );
}

// ── Split tab ──
function BankSplitTab({ line }) {
  const [rows, setRows] = React.useState(
    line.suggest.type === 'split'
      ? [
          { id: 1, account: '5500', amount: 6420.00 },
          { id: 2, account: '5510', amount: 2000.00 },
        ]
      : [{ id: 1, account: '', amount: line.amount }]
  );
  const allocated = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const remainder = line.amount - allocated;
  const balanced = Math.abs(remainder) < 0.005;

  const update = (id, patch) => setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));
  const addRow = () => setRows((rs) => [...rs, { id: Date.now(), account: '', amount: Math.max(0, remainder) }]);
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  return (
    <div>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 10, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Split across accounts</div>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 28px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <select value={r.account} onChange={(e) => update(r.id, { account: e.target.value })} style={{ height: 34, padding: '0 9px', borderRadius: 7, fontFamily: 'inherit', fontSize: 12.5, border: r.account ? '1px solid var(--a-border)' : '1px solid var(--a-warn)', background: 'var(--a-surface)', color: 'var(--a-text)' }}>
            <option value="">Account…</option>
            {(window.DATA ? DATA.accounts : []).map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
          <input value={r.amount} onChange={(e) => update(r.id, { amount: e.target.value })} className="mono tnum" style={{ height: 34, padding: '0 9px', borderRadius: 7, fontFamily: 'Geist Mono, monospace', fontSize: 12.5, border: '1px solid var(--a-border)', background: 'var(--a-surface)', color: 'var(--a-text)', textAlign: 'right', width: '100%' }} />
          <button onClick={() => removeRow(r.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--a-text-3)', display: 'grid', placeItems: 'center' }}><I.trash size={13} /></button>
        </div>
      ))}
      <button onClick={addRow} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', border: '1px dashed var(--a-border-strong)', borderRadius: 7, background: 'transparent', color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
        <I.plus size={12} /> Add split
      </button>

      <div style={{ marginTop: 16, background: 'var(--a-surface-2)', borderRadius: 8, padding: '11px 13px', fontSize: 12.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--a-text-2)' }}><span>Bank line</span><span className="mono tnum">{fmtEUR(line.amount)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--a-text-2)', marginTop: 5 }}><span>Allocated</span><span className="mono tnum">{fmtEUR(allocated)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--a-border)', color: balanced ? 'var(--a-pos)' : 'var(--a-neg)' }}>
          <span>{balanced ? 'Fully allocated' : 'Remainder'}</span>
          <span className="mono tnum">{balanced ? '€0.00 ✓' : fmtEUR(remainder)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Transfer tab ──
function BankTransferTab({ line }) {
  return (
    <div>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 10, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Bank transfer</div>
      <div style={{ fontSize: 12.5, color: 'var(--a-text-2)', marginBottom: 14 }}>Record this as a transfer between your own accounts — no income or expense is posted.</div>
      <label className="micro" style={{ display: 'block', color: 'var(--a-text-3)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{line.kind === 'in' ? 'From account' : 'To account'}</label>
      <select defaultValue="" style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--a-border)', background: 'var(--a-surface)', color: 'var(--a-text)' }}>
        <option value="">Select account…</option>
        {(window.DATA ? DATA.accounts.filter((a) => a.code.startsWith('1') && a.type === 'asset') : []).map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
      </select>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: 'var(--a-surface-2)', borderRadius: 8 }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--a-text-2)' }}>1100</span>
        <span style={{ fontSize: 12.5, color: 'var(--a-text)' }}>Swedbank</span>
        <I.chevR size={13} style={{ color: 'var(--a-text-3)' }} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--a-text-3)' }}>→ select</span>
        <span style={{ flex: 1 }} />
        <span className="mono tnum" style={{ fontSize: 13, color: 'var(--a-text)', fontWeight: 600 }}>{fmtEUR(line.amount)}</span>
      </div>
    </div>
  );
}

// ── Matched state ──
function BankMatchedState({ line, onUnmatch }) {
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--a-pos-soft)', border: '1px solid #b9dccb', borderRadius: 9, padding: '13px 14px' }}>
          <I.check size={18} style={{ color: 'var(--a-pos)' }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-pos)' }}>Reconciled</div>
            <div style={{ fontSize: 12, color: 'var(--a-text-2)' }}>{line.suggest.type === 'match' ? `Matched to ${line.suggest.doc}` : 'Posted to ledger'}</div>
          </div>
        </div>
        <div className="micro" style={{ color: 'var(--a-text-3)', margin: '16px 0 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Posting</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <HaloProPostingLine side={line.kind === 'in' ? 'Dr' : 'Dr'} code="1100" name="Arvelduskonto · Swedbank" amount={line.kind === 'in' ? line.amount : 0} />
          <HaloProPostingLine side="Cr" code={line.suggest.account || '—'} name={bankAcct(line.suggest.account)?.name || '—'} amount={line.amount} />
        </div>
        <div className="micro" style={{ color: 'var(--a-text-3)', margin: '18px 0 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Activity</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--a-pos)', marginTop: 5, flexShrink: 0 }} />
          <div><div style={{ color: 'var(--a-text)' }}><span style={{ fontWeight: 600 }}>Peeter L.</span> · Reconciled this line</div><div className="mono" style={{ color: 'var(--a-text-3)', fontSize: 11 }}>just now</div></div>
        </div>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--a-border)', background: 'var(--a-surface-2)', display: 'flex', gap: 8 }}>
        <ButtonA style={{ flex: 1, justifyContent: 'center' }} icon={<I.x size={13} />} onClick={() => onUnmatch(line.id)}>Unmatch</ButtonA>
        <ButtonA style={{ flex: 1, justifyContent: 'center' }} icon={<I.link size={13} />}>View entry</ButtonA>
      </div>
    </>
  );
}

const bnkKbd = {
  fontFamily: 'Geist Mono, JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'var(--a-surface-2)', color: 'var(--a-text-2)', border: '1px solid var(--a-border)',
};

Object.assign(window, { BankReconcileA });
