// ═════════════════════════════════════════════════════════════════════════════
// VARIANT A+ · HALO PRO
// A's foundation (bone canvas, dark sidebar, coral accent, light surfaces)
// with C's pro-tool moves grafted in:
//   · command bar at top with ⌘K
//   · always-on split-pane: list left, light-surface detail right
//   · visible keyboard shortcuts in row chrome
//   · terminal-style status footer (mono, muted) on a LIGHT surface
//   · tighter density without going to dark mode
//
// The goal: makes Merit look like the legacy option without the dark-mode eye
// fatigue of C. Sustainable for 8h/day.
// ═════════════════════════════════════════════════════════════════════════════

function TransactionsAP() {
  const tabs = [
    { label: 'All',        count: 142, active: true },
    { label: 'Sales',      count: 38 },
    { label: 'Purchases',  count: 64 },
    { label: 'Payments',   count: 28 },
    { label: 'Manual',     count: 12 },
    { label: 'Drafts',     count: 2,  warn: true },
  ];
  const [selectedId, setSelectedId] = React.useState('JE-0142');
  const selected = DATA.transactions.find(t => t.id === selectedId);
  const draftsTotal = DATA.transactions.filter(t => t.status === 'draft').length;

  return (
    <PageA active="tx">
      {/* Command bar — light surface pill, coral ⌘ glyph, full breadcrumb */}
      <div style={{
        padding: '20px 28px 12px 28px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderRadius: 10,
          background: 'var(--a-surface)', border: '1px solid var(--a-border)',
          fontSize: 13, color: 'var(--a-text-2)',
        }}>
          <I.cmd size={14} style={{ color: 'var(--a-accent)' }} />
          <span style={{ color: 'var(--a-text)', fontWeight: 500 }}>Transactions</span>
          <I.chevR size={11} style={{ color: 'var(--a-text-3)' }} />
          <span>May 2026</span>
          <I.chevR size={11} style={{ color: 'var(--a-text-3)' }} />
          <span>All entries</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--a-text-3)' }}>Press</span>
          <kbd style={apKbd}>/</kbd>
          <span style={{ color: 'var(--a-text-3)' }}>to filter</span>
          <span style={{ width: 1, height: 14, background: 'var(--a-border)', margin: '0 6px' }} />
          <kbd style={apKbd}>⌘</kbd><kbd style={apKbd}>K</kbd>
        </div>
        <ButtonA icon={<I.upload size={13} />}>Import</ButtonA>
        <ButtonA variant="primary" icon={<I.plus size={13} />}>
          New entry
          <kbd style={{ ...apKbd, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>N</kbd>
        </ButtonA>
      </div>

      {/* Stat strip — typographic, no card chrome */}
      <div style={{ padding: '0 28px 16px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid var(--a-border)', paddingBottom: 18 }}>
        <HaloStat label="Posted · May" value="€124,820.50" delta="+8.4%" subtle="vs €115,140 in April" />
        <HaloStat label="Drafts to review" value={draftsTotal.toString()} subtle="oldest 4 days ago" tone="warn" />
        <HaloStat label="VAT collected · Q2" value="€18,420.00" subtle="due 20.07.2026" />
        <HaloStat label="Book balance" value="Balanced" subtle="140 entries reconciled" tone="pos" check last />
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 28px 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tabs.map((t) => (
            <div key={t.label} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              background: t.active ? 'var(--a-text)' : 'transparent',
              color: t.active ? '#fff' : 'var(--a-text-2)',
              fontSize: 12.5, fontWeight: 500,
            }}>
              {t.label}
              <span style={{ fontSize: 11, color: t.active ? 'rgba(255,255,255,0.55)' : t.warn ? 'var(--a-accent)' : 'var(--a-text-3)', fontWeight: 500 }}>{t.count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--a-text-3)' }}>
          <kbd style={apKbd}>J</kbd><kbd style={apKbd}>K</kbd> to navigate · <kbd style={apKbd}>E</kbd> edit · <kbd style={apKbd}>D</kbd> duplicate
        </div>
      </div>

      {/* Split-pane: list left, detail right (both LIGHT surfaces) */}
      <div style={{ padding: '12px 28px 16px 28px', flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
        {/* LEFT: list */}
        <div style={{
          flex: 1.6, minWidth: 0,
          background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Column header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 70px 100px 1fr 130px 90px',
            padding: '9px 14px', gap: 8,
            borderBottom: '1px solid var(--a-border)',
            background: 'var(--a-surface-2)',
            fontSize: 10.5, color: 'var(--a-text-3)',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            alignItems: 'center',
          }}>
            <div></div>
            <div>Date</div>
            <div>Ref</div>
            <div>Description</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
            <div style={{ textAlign: 'right' }}>Status</div>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {DATA.transactions.map((t, idx) => (
              <HaloProTxRow key={t.id} t={t} idx={idx + 1} selected={t.id === selectedId} onSelect={() => setSelectedId(t.id)} />
            ))}
          </div>

          {/* Status line — mono, muted, on light */}
          <div style={{
            padding: '8px 14px', borderTop: '1px solid var(--a-border)',
            background: 'var(--a-surface-2)',
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 11, color: 'var(--a-text-3)',
          }} className="mono">
            <span><span style={{ color: 'var(--a-text-2)' }}>12</span> shown · <span style={{ color: 'var(--a-text-2)' }}>142</span> total</span>
            <span>Σ Dr <span style={{ color: 'var(--a-text)' }}>€32,160.40</span></span>
            <span>Σ Cr <span style={{ color: 'var(--a-text)' }}>€32,160.40</span></span>
            <span style={{ color: 'var(--a-pos)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              balanced
            </span>
            <span style={{ flex: 1 }} />
            <span>Synced 2m ago</span>
          </div>
        </div>

        {/* RIGHT: detail pane (light surface, coral active accent) */}
        <HaloProDetailPane t={selected} />
      </div>
    </PageA>
  );
}

function HaloProTxRow({ t, idx, selected, onSelect }) {
  const isDraft = t.status === 'draft';
  return (
    <div onClick={onSelect} style={{
      display: 'grid',
      gridTemplateColumns: '24px 70px 100px 1fr 130px 90px',
      padding: '11px 14px', gap: 8,
      borderBottom: '1px solid var(--a-border)',
      background: selected ? 'var(--a-accent-soft-2)' : 'transparent',
      borderLeft: selected ? '2px solid var(--a-accent)' : '2px solid transparent',
      marginLeft: -2, paddingLeft: 14,
      alignItems: 'center', cursor: 'pointer', fontSize: 13,
    }}>
      <div className="mono" style={{ color: selected ? 'var(--a-accent)' : 'var(--a-text-3)', fontSize: 10.5, fontWeight: selected ? 600 : 400 }}>
        {idx.toString().padStart(2, '0')}
      </div>
      <div className="mono tnum" style={{ color: 'var(--a-text-2)', fontSize: 11.5 }}>{t.date.slice(0, 5)}</div>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--a-accent)', fontWeight: 500 }}>{t.ref.slice(0, 14)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--a-text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.partner} · <span className="mono">{t.debit.code}</span> → <span className="mono">{t.credit.code}</span>
        </div>
      </div>
      <div className="mono tnum" style={{
        textAlign: 'right', fontWeight: 500, fontSize: 13.5,
        color: isDraft ? 'var(--a-warn)' : 'var(--a-text)',
      }}>
        {fmtEUR(t.amount)}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: isDraft ? 'var(--a-warn)' : 'var(--a-pos)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
          {t.status}
        </span>
      </div>
    </div>
  );
}

function HaloProDetailPane({ t }) {
  if (!t) return null;
  return (
    <div style={{
      width: 380, flexShrink: 0,
      background: 'var(--a-surface)', borderRadius: 10,
      border: '1px solid var(--a-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px 18px', borderBottom: '1px solid var(--a-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>{t.number}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 4,
            background: t.status === 'draft' ? 'var(--a-warn-soft)' : 'var(--a-pos-soft)',
            color: t.status === 'draft' ? 'var(--a-warn)' : 'var(--a-pos)',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {t.status}
          </span>
        </div>
        <div className="display" style={{ marginTop: 8, fontSize: 17, color: 'var(--a-text)', fontWeight: 600, letterSpacing: '-0.02em' }}>
          {t.description}
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--a-text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{t.partner}</span><span>·</span><span className="mono">{t.date}</span>
        </div>
      </div>

      {/* Amount block — subtle bone background */}
      <div style={{ padding: '18px 18px 14px 18px', background: 'var(--a-bg)', borderBottom: '1px solid var(--a-border)' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
        <div className="display mono tnum" style={{ marginTop: 6, fontSize: 34, color: 'var(--a-text)', fontWeight: 600, letterSpacing: '-0.03em' }}>
          {fmtEUR(t.amount)}
        </div>
        {t.vat > 0 && (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--a-text-3)' }}>
            <span className="mono">{fmtEUR(t.amount - t.vat)}</span> net + <span className="mono">{fmtEUR(t.vat)}</span> VAT (20%)
          </div>
        )}
      </div>

      {/* Journal posting */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--a-border)' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
          Posting
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <HaloProPostingLine side="Dr" code={t.debit.code} name={t.debit.name} amount={t.debit.amount} />
          <HaloProPostingLine side="Cr" code={t.credit.code} name={t.credit.name} amount={t.credit.amount} />
        </div>
      </div>

      {/* Activity trail */}
      <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { who: 'Peeter L.', what: 'Posted to ledger', when: '20.05 · 14:22', color: 'var(--a-pos)' },
            { who: 'Peeter L.', what: 'Created from invoice AR-2026-0091', when: '20.05 · 14:21', color: 'var(--a-text-3)' },
            { who: 'System',    what: 'VAT (20%) auto-calculated · €714.00', when: '20.05 · 14:21', color: 'var(--a-text-3)' },
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--a-text)' }}><span style={{ fontWeight: 600 }}>{e.who}</span> · {e.what}</div>
                <div className="mono" style={{ color: 'var(--a-text-3)', fontSize: 11 }}>{e.when}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '10px 14px', borderTop: '1px solid var(--a-border)',
        background: 'var(--a-surface-2)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <ButtonA style={{ flex: 1, justifyContent: 'center', height: 30, fontSize: 12.5 }} icon={<I.edit size={12} />}>
          Edit <kbd style={{ ...apKbd, marginLeft: 4 }}>E</kbd>
        </ButtonA>
        <ButtonA style={{ flex: 1, justifyContent: 'center', height: 30, fontSize: 12.5 }} icon={<I.duplicate size={12} />}>
          Copy <kbd style={{ ...apKbd, marginLeft: 4 }}>D</kbd>
        </ButtonA>
        <ButtonA style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }} icon={<I.more size={14} />} />
      </div>
    </div>
  );
}

function HaloProPostingLine({ side, code, name, amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
      <span className="mono" style={{
        fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
        background: side === 'Dr' ? 'var(--a-surface-2)' : 'var(--a-accent-soft)',
        color: side === 'Dr' ? 'var(--a-text)' : 'var(--a-accent)',
        letterSpacing: '0.05em',
      }}>{side.toUpperCase()}</span>
      <span className="mono" style={{ color: 'var(--a-text-3)', fontSize: 11.5 }}>{code}</span>
      <span style={{ color: 'var(--a-text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      <span className="mono tnum" style={{ fontWeight: 500 }}>€{amount.toFixed(2)}</span>
    </div>
  );
}

const apKbd = {
  fontFamily: 'Geist Mono, JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'var(--a-surface-2)', color: 'var(--a-text-2)',
  border: '1px solid var(--a-border)',
};

Object.assign(window, { TransactionsAP });
