// Transactions list — the general journal. The hero screen where bookkeepers
// live, so we use it to establish each variant's visual DNA at full force.

// Shared utility — group entries by date for date-bucketed rendering.
function groupByDate(txs) {
  const map = new Map();
  txs.forEach((t) => {
    if (!map.has(t.date)) map.set(t.date, []);
    map.get(t.date).push(t);
  });
  return [...map.entries()].map(([date, rows]) => ({
    date, rows,
    net: rows.reduce((sum, r) => sum + (r.type === 'sales_invoice' ? r.amount : r.type === 'payment' ? 0 : -r.amount), 0),
  }));
}

function prettyDateLong(s) {
  // 20.05.2026 -> "20 May 2026"
  const [d, m, y] = s.split('.');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}
function prettyDateShort(s) {
  const [d, m] = s.split('.');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT A · HALO — modern minimalist (Linear / Mercury energy)
// Hairline borders, bone canvas, coral accent, tight Inter, near-black sidebar.
// ═════════════════════════════════════════════════════════════════════════════
function TransactionsA() {
  const tabs = [
    { label: 'All',        count: 142, active: true },
    { label: 'Sales',      count: 38 },
    { label: 'Purchases',  count: 64 },
    { label: 'Payments',   count: 28 },
    { label: 'Manual',     count: 12 },
    { label: 'Drafts',     count: 2,  warn: true },
  ];
  const txGrouped = groupByDate(DATA.transactions);
  const draftsTotal = DATA.transactions.filter(t => t.status === 'draft').length;

  return (
    <PageA active="tx">
      {/* Header — restrained, large title, supporting meta */}
      <div style={{ padding: '32px 40px 8px 40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
            General journal · FY {DATA.tenant.fiscalYear}
          </div>
          <h1 className="display" style={{ margin: 0, fontSize: 36, color: 'var(--a-text)', fontWeight: 600, lineHeight: 1 }}>Transactions</h1>
          <div style={{ marginTop: 8, fontSize: 13.5, color: 'var(--a-text-2)' }}>
            142 entries posted this period · synced 2 minutes ago · debits = credits across the book
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ButtonA icon={<I.upload size={13} />}>Import</ButtonA>
          <ButtonA icon={<I.download size={13} />}>Export</ButtonA>
          <ButtonA variant="primary" icon={<I.plus size={13} />}>New entry</ButtonA>
        </div>
      </div>

      {/* Stat strip — typographic, no card chrome, thin underlines */}
      <div style={{ padding: '24px 40px 20px 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid var(--a-border)' }}>
        <HaloStat label="Posted · May" value="€124,820.50" delta="+8.4%" subtle="vs €115,140 in April" />
        <HaloStat label="Drafts to review" value={draftsTotal.toString()} subtle="oldest 4 days ago" tone="warn" />
        <HaloStat label="VAT collected · Q2" value="€18,420.00" subtle="due 20.07.2026" />
        <HaloStat label="Book balance" value="Balanced" subtle="140 entries reconciled" tone="pos" check last />
      </div>

      {/* Tabs + filters row */}
      <div style={{ padding: '14px 40px 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tabs.map((t) => (
            <div key={t.label} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
              background: t.active ? 'var(--a-text)' : 'transparent',
              color: t.active ? '#fff' : 'var(--a-text-2)',
              fontSize: 13, fontWeight: 500,
            }}>
              {t.label}
              <span style={{ fontSize: 11, color: t.active ? 'rgba(255,255,255,0.55)' : t.warn ? 'var(--a-accent)' : 'var(--a-text-3)', fontWeight: 500 }}>{t.count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HaloFilter icon="calendar" label="May 2026" />
          <HaloFilter icon="building" label="All partners" />
          <HaloFilter icon="scale" label="All accounts" />
          <div style={{ width: 1, height: 18, background: 'var(--a-border)', margin: '0 4px' }} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 7, border: '1px solid var(--a-border)',
            background: 'var(--a-surface)', fontSize: 12.5, color: 'var(--a-text-3)',
            minWidth: 220,
          }}>
            <I.search size={13} />
            <span style={{ flex: 1 }}>Search reference, partner, amount…</span>
            <kbd style={{
              fontFamily: 'inherit', fontSize: 10.5, padding: '1px 5px', borderRadius: 3,
              background: 'var(--a-surface-2)', color: 'var(--a-text-3)', border: '1px solid var(--a-border)',
            }}>⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Table — hairline borders, no card wrap, full width */}
      <div style={{ padding: '14px 40px 36px 40px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{
          borderTop: '1px solid var(--a-border)',
          borderBottom: '1px solid var(--a-border)',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '28px 80px 110px 1fr 220px 130px 110px 32px',
            padding: '10px 4px',
            borderBottom: '1px solid var(--a-border)',
            fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            alignItems: 'center',
          }}>
            <div><input type="checkbox" /></div>
            <div>Date</div>
            <div>Reference</div>
            <div>Description</div>
            <div>Accounts</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
            <div>Status</div>
            <div></div>
          </div>

          {txGrouped.map((group, gIdx) => (
            <div key={group.date}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                padding: '12px 4px 8px 4px',
                fontSize: 12, color: 'var(--a-text-3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="display" style={{ fontSize: 14, color: 'var(--a-text)', fontWeight: 600 }}>{prettyDateLong(group.date)}</span>
                  <span>{group.rows.length} {group.rows.length === 1 ? 'entry' : 'entries'}</span>
                </div>
                <span className="mono tnum">Net {fmtEUR(group.net, { sign: true })}</span>
              </div>
              {group.rows.map((t, idx) => (
                <HaloTxRow key={t.id} t={t} selected={gIdx === 0 && idx === 0} />
              ))}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, color: 'var(--a-text-3)',
        }}>
          <div>Showing 12 of 142 entries</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button style={haloPageBtn}><I.chevL size={13} /></button>
            <button style={{ ...haloPageBtn, background: 'var(--a-text)', color: '#fff', border: '1px solid var(--a-text)' }}>1</button>
            <button style={haloPageBtn}>2</button>
            <button style={haloPageBtn}>3</button>
            <span style={{ padding: '0 6px' }}>…</span>
            <button style={haloPageBtn}>12</button>
            <button style={haloPageBtn}><I.chevR size={13} /></button>
          </div>
        </div>
      </div>
    </PageA>
  );
}

function HaloTxRow({ t, selected }) {
  const status = {
    posted: { label: 'Posted', color: 'var(--a-pos)',  bg: 'var(--a-pos-soft)'  },
    draft:  { label: 'Draft',  color: 'var(--a-warn)', bg: 'var(--a-warn-soft)' },
  }[t.status];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 80px 110px 1fr 220px 130px 110px 32px',
      padding: '11px 4px',
      borderBottom: '1px solid var(--a-border)',
      background: selected ? 'var(--a-accent-soft-2)' : 'transparent',
      borderLeft: selected ? '2px solid var(--a-accent)' : '2px solid transparent',
      marginLeft: -2,
      alignItems: 'center', fontSize: 13,
    }}>
      <div><input type="checkbox" defaultChecked={selected} /></div>
      <div className="mono tnum" style={{ color: 'var(--a-text-2)', fontSize: 12 }}>{t.date.slice(0, 5)}</div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--a-accent)', fontWeight: 500 }}>{t.ref}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--a-text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', marginTop: 1 }}>{t.partner}</div>
      </div>
      <div style={{ minWidth: 0, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="mono" style={{ color: 'var(--a-text-2)', minWidth: 0 }}>
          <div style={{ whiteSpace: 'nowrap' }}><span style={{ color: 'var(--a-text-3)' }}>Dr</span> {t.debit.code} <span style={{ color: 'var(--a-text-3)' }}>·</span> <span style={{ fontFamily: 'Inter', fontSize: 11.5 }}>{t.debit.name.slice(0, 22)}</span></div>
          <div style={{ whiteSpace: 'nowrap', marginTop: 1 }}><span style={{ color: 'var(--a-text-3)' }}>Cr</span> {t.credit.code} <span style={{ color: 'var(--a-text-3)' }}>·</span> <span style={{ fontFamily: 'Inter', fontSize: 11.5 }}>{t.credit.name.slice(0, 22)}</span></div>
        </div>
      </div>
      <div className="mono tnum" style={{
        textAlign: 'right', fontWeight: 500, fontSize: 13.5,
        color: t.status === 'draft' ? 'var(--a-warn)' : 'var(--a-text)',
      }}>
        {fmtEUR(t.amount)}
      </div>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '2px 8px', borderRadius: 4,
          background: status.bg, color: status.color,
          fontSize: 11.5, fontWeight: 500,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.color }} />
          {status.label}
        </span>
      </div>
      <div style={{ color: 'var(--a-text-3)', display: 'flex', justifyContent: 'flex-end' }}>
        <I.more size={14} />
      </div>
    </div>
  );
}

function HaloStat({ label, value, delta, subtle, tone, check, last }) {
  return (
    <div style={{
      padding: '0 24px 0 0',
      borderRight: last ? 'none' : '1px solid var(--a-border)',
      marginRight: 0,
    }}>
      <div style={{ fontSize: 11, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div className="display tnum" style={{
          fontSize: 28, fontWeight: 600,
          color: tone === 'warn' ? 'var(--a-warn)' : tone === 'pos' ? 'var(--a-pos)' : 'var(--a-text)',
        }}>{value}</div>
        {delta && (
          <span style={{ fontSize: 11.5, color: 'var(--a-pos)', fontWeight: 600 }}>{delta}</span>
        )}
        {check && <I.check size={14} style={{ color: 'var(--a-pos)' }} />}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--a-text-3)' }}>{subtle}</div>
    </div>
  );
}

function HaloFilter({ icon, label }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 7,
      border: '1px solid var(--a-border)', background: 'var(--a-surface)',
      color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {I[icon]({ size: 13 })}
      {label}
      <I.chevD size={10} style={{ color: 'var(--a-text-3)' }} />
    </button>
  );
}

const haloPageBtn = {
  minWidth: 28, height: 28, padding: '0 8px', borderRadius: 6,
  border: '1px solid var(--a-border)', background: 'var(--a-surface)',
  color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};


// ═════════════════════════════════════════════════════════════════════════════
// VARIANT B · QUIRE — modernised editorial (Mercury / Notion energy)
// Bricolage Grotesque display, no serif, generous whitespace, plum + sage,
// T-account format preserved.
// ═════════════════════════════════════════════════════════════════════════════
function TransactionsB() {
  const txGrouped = groupByDate(DATA.transactions);
  return (
    <PageB active="tx">
      {/* Hero */}
      <div style={{ padding: '40px 48px 28px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
          <div style={{ minWidth: 0 }}>
            <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 16 }}>
              General journal · FY {DATA.tenant.fiscalYear} · {DATA.tenant.vat}
            </div>
            <h1 className="display" style={{ margin: 0, fontSize: 56, color: 'var(--b-text)', lineHeight: 0.95 }}>
              Transactions
            </h1>
            <div className="italic-sans" style={{ marginTop: 14, fontSize: 15, color: 'var(--b-text-2)', maxWidth: 580 }}>
              Every entry posted to your books, in chronological order. Drafts wait at the top until you confirm them.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ButtonB icon={<I.upload size={13} />}>Import</ButtonB>
            <ButtonB variant="accent" icon={<I.plus size={13} />}>New entry</ButtonB>
          </div>
        </div>
      </div>

      {/* Stat ribbon */}
      <div style={{ padding: '0 48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, borderBottom: '1px solid var(--b-border)', paddingBottom: 28 }}>
        <QuireStat label="Period balance"      value="€124,820.50" hint="20 entries · debits ≡ credits" tone="accent" />
        <QuireStat label="Drafts to review"    value="2"            hint="oldest 4 days ago"           tone="warn" />
        <QuireStat label="VAT outstanding"     value="€18,420.00"   hint="due 20.07.2026" />
        <QuireStat label="Last reconciliation" value="18.05.2026"   hint="Swedbank · matched"        tone="sage" />
      </div>

      {/* Filter strip */}
      <div style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', gap: 22, borderBottom: '1px solid var(--b-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
          {[
            { l: 'All',       n: 142, active: true },
            { l: 'Sales',     n: 38 },
            { l: 'Purchases', n: 64 },
            { l: 'Payments',  n: 28 },
            { l: 'Drafts',    n: 2, warn: true },
          ].map((t) => (
            <div key={t.l} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 8,
              paddingBottom: 6,
              borderBottom: t.active ? '2px solid var(--b-accent)' : '2px solid transparent',
              color: t.active ? 'var(--b-text)' : 'var(--b-text-2)',
              fontWeight: t.active ? 600 : 450, fontSize: 14, cursor: 'pointer',
            }}>
              {t.l}
              <span className="mono" style={{ fontSize: 11.5, color: t.warn ? 'var(--b-warn)' : 'var(--b-text-3)' }}>{t.n}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <QuireDrop label="May 2026"     icon="calendar" />
        <QuireDrop label="All partners" icon="building" />
        <QuireDrop label="All accounts" icon="scale" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--b-border-strong)', fontSize: 13, color: 'var(--b-text-2)', minWidth: 200 }}>
          <I.search size={13} />
          <span style={{ color: 'var(--b-text-3)' }}>Search…</span>
        </div>
      </div>

      {/* Ledger table */}
      <div style={{ padding: '0 48px 48px 48px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '88px 110px 1fr 1fr 130px 130px 100px',
          padding: '20px 4px 12px 4px',
          borderBottom: '1px solid var(--b-text)',
          fontSize: 10.5, color: 'var(--b-text-3)',
          letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          <div>Date</div>
          <div>Ref.</div>
          <div>Debit account</div>
          <div>Credit account</div>
          <div style={{ textAlign: 'right' }}>Debit</div>
          <div style={{ textAlign: 'right' }}>Credit</div>
          <div style={{ textAlign: 'right' }}>Status</div>
        </div>

        {txGrouped.map((group, gIdx) => (
          <div key={group.date}>
            <div style={{ padding: '20px 4px 8px 4px', marginTop: gIdx === 0 ? 4 : 12, display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span className="display" style={{ fontSize: 26, color: 'var(--b-text)', lineHeight: 1 }}>{prettyDateLong(group.date)}</span>
              <span style={{ fontSize: 12, color: 'var(--b-text-3)' }}>{group.rows.length} {group.rows.length === 1 ? 'entry' : 'entries'}</span>
              <div style={{ flex: 1, height: 1, borderBottom: '1px dotted var(--b-border-strong)', marginLeft: 8 }} />
              <span className="mono tnum" style={{ fontSize: 12, color: 'var(--b-text-2)' }}>Net {fmtEUR(group.net, { sign: true })}</span>
            </div>
            {group.rows.map((t) => <QuireTxRow key={t.id} t={t} />)}
          </div>
        ))}

        {/* Bottom totals */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '88px 110px 1fr 1fr 130px 130px 100px',
          padding: '18px 4px 16px 4px',
          borderTop: '1px solid var(--b-text)',
          marginTop: 16, fontSize: 13,
        }}>
          <div></div><div></div>
          <div className="micro" style={{ color: 'var(--b-text-3)' }}>Page total</div>
          <div></div>
          <div className="mono tnum" style={{ textAlign: 'right', color: 'var(--b-text)', fontWeight: 600 }}>€32,160.40</div>
          <div className="mono tnum" style={{ textAlign: 'right', color: 'var(--b-text)', fontWeight: 600 }}>€32,160.40</div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--b-sage)' }}>Balanced ✓</div>
        </div>
      </div>
    </PageB>
  );
}

function QuireTxRow({ t }) {
  const isDraft = t.status === 'draft';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '88px 110px 1fr 1fr 130px 130px 100px',
      padding: '14px 4px', borderBottom: '1px solid var(--b-border)',
      fontSize: 13.5, alignItems: 'center',
      color: isDraft ? 'var(--b-text-2)' : 'var(--b-text)',
    }}>
      <div className="mono tnum" style={{ color: 'var(--b-text-2)', fontSize: 12 }}>{t.date.slice(0, 5)}</div>
      <div className="mono" style={{ fontSize: 12, color: 'var(--b-text-2)' }}>{t.ref}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="mono" style={{ color: 'var(--b-text-3)', fontSize: 11.5 }}>{t.debit.code}</span>
          <span style={{ color: 'var(--b-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{t.debit.name}</span>
        </div>
        <div className="italic-sans" style={{ marginTop: 3, fontSize: 12.5, color: 'var(--b-text-3)' }}>{t.description}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="mono" style={{ color: 'var(--b-text-3)', fontSize: 11.5 }}>{t.credit.code}</span>
          <span style={{ color: 'var(--b-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{t.credit.name}</span>
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--b-text-3)' }}>{t.partner}</div>
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 500, fontSize: 14 }}>€{t.debit.amount.toFixed(2)}</div>
      <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 500, fontSize: 14 }}>€{t.credit.amount.toFixed(2)}</div>
      <div style={{ textAlign: 'right', fontSize: 12, color: isDraft ? 'var(--b-warn)' : 'var(--b-text-3)', textTransform: 'lowercase', letterSpacing: '0.04em' }}>
        {t.status}
      </div>
    </div>
  );
}

function QuireStat({ label, value, hint, tone }) {
  const valueColor = tone === 'warn' ? 'var(--b-warn)' : tone === 'accent' ? 'var(--b-accent)' : tone === 'sage' ? 'var(--b-sage)' : 'var(--b-text)';
  return (
    <div>
      <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 14 }}>{label}</div>
      <div className="display tnum" style={{ fontSize: 38, lineHeight: 0.95, color: valueColor }}>{value}</div>
      <div className="italic-sans" style={{ marginTop: 8, fontSize: 12.5, color: 'var(--b-text-3)' }}>{hint}</div>
    </div>
  );
}

function QuireDrop({ label, icon }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 0', borderBottom: '1px solid var(--b-border-strong)',
      fontSize: 13, color: 'var(--b-text-2)', cursor: 'pointer',
    }}>
      {I[icon]({ size: 13 })}{label}
      <I.chevD size={10} style={{ color: 'var(--b-text-3)' }} />
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// VARIANT C · AKTIV — bold split-pane pro-tool (Ramp / Superhuman energy)
// Bone canvas with DARK INSET data panel + acid-lime accent. Always-on detail
// pane on the right. Command bar at top. Mono-heavy. Keyboard-first.
// ═════════════════════════════════════════════════════════════════════════════
function TransactionsC() {
  const txGrouped = groupByDate(DATA.transactions);
  const [selectedId, setSelectedId] = React.useState('JE-0142');
  const selected = DATA.transactions.find(t => t.id === selectedId);

  return (
    <PageC active="tx">
      {/* Command palette pill / context bar */}
      <div style={{
        padding: '16px 24px 12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderRadius: 10,
          background: 'var(--c-dark)', color: 'var(--c-on-dark-2)',
          fontSize: 13, fontFamily: 'inherit',
          border: '1px solid var(--c-dark-border)',
        }}>
          <I.cmd size={14} style={{ color: 'var(--c-accent)' }} />
          <span style={{ color: 'var(--c-on-dark)' }}>Transactions</span>
          <I.chevR size={12} style={{ color: 'var(--c-on-dark-3)' }} />
          <span>May 2026</span>
          <I.chevR size={12} style={{ color: 'var(--c-on-dark-3)' }} />
          <span>All entries</span>
          <span style={{ flex: 1 }}></span>
          <span style={{ color: 'var(--c-on-dark-3)' }}>Type</span>
          <kbd style={akKbd}>/</kbd>
          <span style={{ color: 'var(--c-on-dark-3)' }}>to filter</span>
          <span style={{ width: 1, height: 14, background: 'var(--c-dark-border)', margin: '0 6px' }} />
          <kbd style={akKbd}>⌘</kbd><kbd style={akKbd}>K</kbd>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ButtonC>Import</ButtonC>
          <ButtonC variant="accent" icon={<I.plus size={13} />}>New entry <kbd style={{ ...akKbd, marginLeft: 4 }}>N</kbd></ButtonC>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ padding: '0 24px 14px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <AktivStat label="POSTED · MAY"        value="€124,820.50" delta="+8.4" />
        <AktivStat label="DRAFTS"              value="2"            sub="oldest 4d" tone="warn" />
        <AktivStat label="VAT · Q2"            value="€18,420.00"  sub="due 20.07" />
        <AktivStat label="BOOK STATUS"         value="BALANCED"    tone="accent" check />
      </div>

      {/* Split layout — list left, detail right */}
      <div style={{ padding: '0 24px 24px 24px', flex: 1, minHeight: 0, display: 'flex', gap: 10 }}>
        {/* LEFT: dark inset table */}
        <div style={{
          flex: 1.6, minWidth: 0,
          background: 'var(--c-dark)', borderRadius: 12,
          border: '1px solid var(--c-dark-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Tab strip */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 4,
            borderBottom: '1px solid var(--c-dark-border)',
          }}>
            {['All 142','Sales 38','Purchases 64','Payments 28','Drafts 2'].map((label, i) => {
              const active = i === 0;
              const isDraftTab = label.startsWith('Drafts');
              return (
                <div key={label} style={{
                  padding: '5px 10px', borderRadius: 6,
                  background: active ? 'var(--c-accent)' : 'transparent',
                  color: active ? 'var(--c-accent-on)' : isDraftTab ? 'var(--c-warn)' : 'var(--c-on-dark-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '-0.005em',
                }}>{label}</div>
              );
            })}
            <span style={{ flex: 1 }} />
            <div style={{ fontSize: 11, color: 'var(--c-on-dark-3)' }}>
              <kbd style={akKbd}>J</kbd> <kbd style={akKbd}>K</kbd> to navigate
            </div>
          </div>

          {/* Column header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 70px 100px 1fr 130px 90px',
            padding: '8px 14px', gap: 8,
            borderBottom: '1px solid var(--c-dark-border)',
            fontSize: 10.5, color: 'var(--c-on-dark-3)',
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
              <AktivTxRow key={t.id} t={t} idx={idx + 1} selected={t.id === selectedId} onSelect={() => setSelectedId(t.id)} />
            ))}
          </div>

          {/* Footer — terminal-style status line */}
          <div style={{
            padding: '8px 14px', borderTop: '1px solid var(--c-dark-border)',
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 11, color: 'var(--c-on-dark-3)',
          }}>
            <span><span style={{ color: 'var(--c-on-dark-2)' }}>12</span> shown · <span style={{ color: 'var(--c-on-dark-2)' }}>142</span> total</span>
            <span>Σ Dr <span className="mono" style={{ color: 'var(--c-on-dark)' }}>€32,160.40</span></span>
            <span>Σ Cr <span className="mono" style={{ color: 'var(--c-on-dark)' }}>€32,160.40</span></span>
            <span style={{ color: 'var(--c-accent)' }}>● balanced</span>
            <span style={{ flex: 1 }} />
            <span>Synced 2m ago</span>
          </div>
        </div>

        {/* RIGHT: detail pane (light surface inside the bone frame) */}
        <AktivDetailPane t={selected} />
      </div>
    </PageC>
  );
}

function AktivTxRow({ t, idx, selected, onSelect }) {
  const isDraft = t.status === 'draft';
  return (
    <div onClick={onSelect} style={{
      display: 'grid',
      gridTemplateColumns: '24px 70px 100px 1fr 130px 90px',
      padding: '10px 14px', gap: 8,
      borderBottom: '1px solid var(--c-dark-border)',
      background: selected ? 'var(--c-accent-soft)' : 'transparent',
      borderLeft: selected ? '2px solid var(--c-accent)' : '2px solid transparent',
      marginLeft: -2, paddingLeft: 14,
      alignItems: 'center', cursor: 'pointer', fontSize: 13,
    }}>
      <div className="mono" style={{ color: selected ? 'var(--c-accent)' : 'var(--c-on-dark-3)', fontSize: 10.5 }}>
        {idx.toString().padStart(2, '0')}
      </div>
      <div className="mono tnum" style={{ color: 'var(--c-on-dark-2)', fontSize: 11.5 }}>{t.date.slice(0, 5)}</div>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--c-accent)', fontWeight: 500 }}>{t.ref.slice(0, 14)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: selected ? '#fff' : 'var(--c-on-dark)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
        <div style={{ fontSize: 11.5, color: 'var(--c-on-dark-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.partner} · <span className="mono">{t.debit.code}</span> → <span className="mono">{t.credit.code}</span>
        </div>
      </div>
      <div className="mono tnum" style={{
        textAlign: 'right', fontWeight: 500, fontSize: 13.5,
        color: isDraft ? 'var(--c-warn)' : selected ? '#fff' : 'var(--c-on-dark)',
      }}>
        {fmtEUR(t.amount)}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: isDraft ? 'var(--c-warn)' : 'var(--c-pos)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
          {t.status}
        </span>
      </div>
    </div>
  );
}

function AktivDetailPane({ t }) {
  if (!t) return null;
  return (
    <div style={{
      width: 380, flexShrink: 0,
      background: 'var(--c-surface)', borderRadius: 12,
      border: '1px solid var(--c-frame)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px 18px', borderBottom: '1px solid var(--c-frame)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{t.number}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 4,
            background: t.status === 'draft' ? '#fef3d6' : '#dff5e8',
            color: t.status === 'draft' ? '#a25e0e' : '#1f7548',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{t.status}</span>
        </div>
        <div className="display" style={{ marginTop: 8, fontSize: 17, color: 'var(--c-text)', fontWeight: 600, letterSpacing: '-0.02em' }}>
          {t.description}
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--c-text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{t.partner}</span><span>·</span><span className="mono">{t.date}</span>
        </div>
      </div>

      {/* Amount block */}
      <div style={{ padding: '18px 18px 14px 18px', background: 'var(--c-bg)', borderBottom: '1px solid var(--c-frame)' }}>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
        <div className="display mono tnum" style={{ marginTop: 6, fontSize: 34, color: 'var(--c-text)', fontWeight: 600 }}>
          {fmtEUR(t.amount)}
        </div>
        {t.vat > 0 && (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--c-text-3)' }}>
            <span className="mono">{fmtEUR(t.amount - t.vat)}</span> net + <span className="mono">{fmtEUR(t.vat)}</span> VAT (20%)
          </div>
        )}
      </div>

      {/* Journal posting */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-frame)' }}>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
          Posting
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PostingLine side="Dr" code={t.debit.code} name={t.debit.name} amount={t.debit.amount} />
          <PostingLine side="Cr" code={t.credit.code} name={t.credit.name} amount={t.credit.amount} />
        </div>
      </div>

      {/* Trail */}
      <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { who: 'Peeter L.', what: 'Posted to ledger', when: '20.05 · 14:22', color: 'var(--c-pos)' },
            { who: 'Peeter L.', what: 'Created from invoice AR-2026-0091', when: '20.05 · 14:21', color: 'var(--c-text-3)' },
            { who: 'System',    what: 'VAT (20%) auto-calculated · €714.00', when: '20.05 · 14:21', color: 'var(--c-text-3)' },
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--c-text)' }}><span style={{ fontWeight: 600 }}>{e.who}</span> · {e.what}</div>
                <div className="mono" style={{ color: 'var(--c-text-3)', fontSize: 11 }}>{e.when}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '10px 14px', borderTop: '1px solid var(--c-frame)',
        background: 'var(--c-bg)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <ButtonC style={{ flex: 1, justifyContent: 'center' }} icon={<I.edit size={12} />}>Edit</ButtonC>
        <ButtonC style={{ flex: 1, justifyContent: 'center' }} icon={<I.duplicate size={12} />}>Copy</ButtonC>
        <ButtonC icon={<I.more size={14} />} />
      </div>
    </div>
  );
}

function PostingLine({ side, code, name, amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
      <span className="mono" style={{
        fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
        background: side === 'Dr' ? '#e4e7ec' : '#f0e3ea',
        color: side === 'Dr' ? 'var(--c-text)' : '#5a1e3a',
        letterSpacing: '0.04em',
      }}>{side.toUpperCase()}</span>
      <span className="mono" style={{ color: 'var(--c-text-3)', fontSize: 11.5 }}>{code}</span>
      <span style={{ color: 'var(--c-text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      <span className="mono tnum" style={{ fontWeight: 500 }}>€{amount.toFixed(2)}</span>
    </div>
  );
}

function AktivStat({ label, value, delta, sub, tone, check }) {
  const valueColor = tone === 'warn' ? 'var(--c-warn)' : tone === 'accent' ? 'var(--c-text)' : 'var(--c-text)';
  return (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</div>
        {check && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-accent)', boxShadow: '0 0 0 3px var(--c-accent-soft)' }} />}
      </div>
      <div className="display tnum" style={{ marginTop: 8, fontSize: 22, fontWeight: 600, color: valueColor, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--c-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {delta && <span style={{ color: 'var(--c-pos)', fontWeight: 600 }}>↑ {delta}%</span>}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

const akKbd = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'rgba(255,255,255,0.06)', color: 'var(--c-on-dark-2)',
  border: '1px solid rgba(255,255,255,0.08)',
};

Object.assign(window, { TransactionsA, TransactionsB, TransactionsC });
