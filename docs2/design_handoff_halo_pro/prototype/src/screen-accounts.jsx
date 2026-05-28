// Chart of accounts — the master list of every account.
// Big improvements over current implementation: grouped by type, live balances,
// activity indicators, hierarchy display, faster scanning.

// ═════════════════════════════════════════════════════════════════════════════
// Variant A · Refined Default
// Sectioned tree (one section per type), live balance column, traffic-light
// activity, search + type filter.
// ═════════════════════════════════════════════════════════════════════════════
function AccountsA() {
  const grouped = groupByType(DATA.accounts);

  return (
    <PageA active="acc">
      <HaloProCommandBar
        crumbs={['Accounts', `FY ${DATA.tenant.fiscalYear}`, 'All types']}
        hints
        actions={
          <>
            <ButtonA icon={<I.upload size={13} />}>Import CSV</ButtonA>
            <ButtonA variant="primary" icon={<I.plus size={13} />}>
              New account
              <kbd style={{ ...kbdHP, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>N</kbd>
            </ButtonA>
          </>
        }
      />

      <div style={{ padding: '0 28px 4px 28px' }}>
        <div style={{ fontSize: 11, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          Chart of accounts
        </div>
        <h1 className="display" style={{ margin: 0, fontSize: 28, color: 'var(--a-text)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em' }}>Accounts</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--a-text-2)' }}>
          {DATA.accounts.length} accounts · 24 active · last reviewed 12.05.2026
        </div>
      </div>

      {/* Top summary band — net balance per type */}
      <div style={{ padding: '14px 28px 14px 28px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {[
          { type: 'asset',     label: 'Assets',      total:  86701.15, n: 8, color: '#2c5cf6', soft: '#eaf0ff' },
          { type: 'liability', label: 'Liabilities', total: -27734.60, n: 4, color: '#b7791f', soft: '#fdf6e3' },
          { type: 'equity',    label: 'Equity',      total: -20920.00, n: 2, color: '#7c3aed', soft: '#f1ebff' },
          { type: 'revenue',   label: 'Revenue',     total: -92100.00, n: 2, color: '#0c6e58', soft: '#e6f4f0' },
          { type: 'expense',   label: 'Expenses',    total:  91760.45, n: 8, color: '#c0392b', soft: '#fbeaea' },
        ].map((g) => (
          <div key={g.type} style={{
            background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color }} />
              <span style={{ fontSize: 11.5, color: 'var(--a-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{g.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--a-text-3)' }}>{g.n}</span>
            </div>
            <div className="mono tnum" style={{ marginTop: 6, fontSize: 16, fontWeight: 600, color: 'var(--a-text)' }}>
              {fmtEUR(Math.abs(g.total), {})}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        padding: '0 28px 12px 28px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <I.search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-text-3)' }} />
          <input
            placeholder="Search code or name…"
            style={{
              width: '100%', padding: '8px 12px 8px 34px', height: 34,
              border: '1px solid var(--a-border)', borderRadius: 8,
              fontSize: 13.5, fontFamily: 'inherit',
              background: 'var(--a-surface)', outline: 'none',
            }}
          />
        </div>
        <button style={pillBtnA}>Type: All ⏷</button>
        <button style={pillBtnA}>Status: Active ⏷</button>
        <button style={pillBtnA}>Activity ⏷</button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 7, padding: 2 }}>
          <button style={{ ...segBtnA, background: 'var(--a-text)', color: '#fff' }}>Tree</button>
          <button style={segBtnA}>Flat</button>
        </div>
      </div>

      {/* Account list */}
      <div style={{ padding: '0 28px 24px 28px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
          overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px 92px 1fr 120px 130px 110px 130px 60px',
            padding: '10px 18px', background: 'var(--a-surface-2)',
            borderBottom: '1px solid var(--a-border)',
            fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <div><input type="checkbox" /></div>
            <div>Code</div>
            <div>Account name</div>
            <div>Type</div>
            <div style={{ textAlign: 'right' }}>Balance</div>
            <div style={{ textAlign: 'right' }}>YTD activity</div>
            <div>Last used</div>
            <div></div>
          </div>

          {grouped.map((g, gi) => (
            <div key={g.type}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 18px', background: 'var(--a-surface-2)',
                borderTop: gi === 0 ? 'none' : '1px solid var(--a-border)',
                borderBottom: '1px solid var(--a-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <I.chevD size={14} style={{ color: 'var(--a-text-2)' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(g.type) }} />
                  <span style={{ fontSize: 12.5, color: 'var(--a-text)', fontWeight: 600, textTransform: 'capitalize' }}>{labelOfType(g.type)}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>· {g.rows.length} accounts</span>
                </div>
                <div className="mono tnum" style={{ fontSize: 12.5, color: 'var(--a-text-2)' }}>
                  Net {fmtEUR(g.total)}
                </div>
              </div>

              {g.rows.map((a) => <AccountRowA key={a.code} a={a} />)}
            </div>
          ))}
        </div>

        <HaloProStatusFooter items={[
          { label: 'Showing', value: `${DATA.accounts.length}` },
          { value: '5 types', label: '·' },
          { dot: true, label: 'balanced', color: 'var(--a-pos)' },
          { spacer: true },
          { label: 'Press', value: 'J K' },
          { label: 'navigate ·', value: '↵' },
          { value: 'open ledger' },
        ]} />
      </div>
    </PageA>
  );
}

function AccountRowA({ a }) {
  const activity = Math.min(100, Math.abs(a.ytdMove) / 1000);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 92px 1fr 120px 130px 110px 130px 60px',
      padding: '11px 18px', borderBottom: '1px solid var(--a-border)',
      alignItems: 'center', fontSize: 13.5,
    }}>
      <div><input type="checkbox" /></div>
      <div className="mono" style={{ color: 'var(--a-text-2)', fontSize: 13 }}>{a.code}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--a-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>{a.group}</div>
      </div>
      <div>
        <span style={{
          fontSize: 11.5, padding: '2px 8px', borderRadius: 4,
          background: typeSoft(a.type), color: typeColor(a.type),
          fontWeight: 500,
        }}>{labelOfType(a.type)}</span>
      </div>
      <div className="mono tnum" style={{
        textAlign: 'right', fontSize: 13.5, fontWeight: 500,
        color: a.balance < 0 ? 'var(--a-text)' : 'var(--a-text)',
      }}>
        {fmtEUR(Math.abs(a.balance))}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono tnum" style={{ fontSize: 12, color: 'var(--a-text-2)' }}>
          {fmtEUR(Math.abs(a.ytdMove))}
        </div>
        <div style={{
          marginTop: 3, marginLeft: 'auto', width: '80%', height: 3, background: 'var(--a-surface-2)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${activity}%`, height: '100%',
            background: typeColor(a.type), opacity: 0.5,
          }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--a-text-3)' }}>
        <div>20.05.2026</div>
        <div style={{ fontSize: 11 }}>3 entries this month</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, color: 'var(--a-text-3)' }}>
        <I.edit size={14} />
        <I.more size={14} />
      </div>
    </div>
  );
}

function typeColor(t) {
  return { asset: '#2c5cf6', liability: '#b7791f', equity: '#7c3aed', revenue: '#0c6e58', expense: '#c0392b' }[t];
}
function typeSoft(t) {
  return { asset: '#eaf0ff', liability: '#fdf6e3', equity: '#f1ebff', revenue: '#e6f4f0', expense: '#fbeaea' }[t];
}
function labelOfType(t) {
  return { asset: 'Asset', liability: 'Liability', equity: 'Equity', revenue: 'Revenue', expense: 'Expense' }[t];
}

function groupByType(accs) {
  const order = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  return order.map((t) => {
    const rows = accs.filter((a) => a.type === t);
    return { type: t, rows, total: rows.reduce((s, a) => s + a.balance, 0) };
  });
}

const segBtnA = {
  padding: '4px 10px', borderRadius: 5, border: 'none', background: 'transparent',
  color: 'var(--a-text-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
};

// ═════════════════════════════════════════════════════════════════════════════
// Variant B · Ledger
// Treated like the table of contents in a bound ledger book. Big serif type,
// running balances at right, single column.
// ═════════════════════════════════════════════════════════════════════════════
function AccountsB() {
  const grouped = groupByType(DATA.accounts);
  return (
    <PageB active="acc">
      <TopBarB
        eyebrow="Master register"
        title="Chart of accounts"
        subtitle="A bound table of every account in the books, organised by class. Tap any row to open its ledger."
        actions={
          <>
            <ButtonB icon={<I.upload size={14} />}>Import CSV</ButtonB>
            <ButtonB variant="accent" icon={<I.plus size={14} />}>New account</ButtonB>
          </>
        }
      />

      {/* Top index — five types as plates */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        borderBottom: '1px solid var(--b-border)',
      }}>
        {[
          { t: 'asset',     label: 'Assets',      total:  86701.15, n: 8 },
          { t: 'liability', label: 'Liabilities', total: -27734.60, n: 4 },
          { t: 'equity',    label: 'Equity',      total: -20920.00, n: 2 },
          { t: 'revenue',   label: 'Revenue',     total: -92100.00, n: 2 },
          { t: 'expense',   label: 'Expenses',    total:  91760.45, n: 8 },
        ].map((g, i, arr) => (
          <div key={g.t} style={{
            padding: '20px 24px',
            borderRight: i === arr.length - 1 ? 'none' : '1px solid var(--b-border)',
          }}>
            <div className="micro" style={{ color: 'var(--b-text-3)' }}>{g.label}</div>
            <div className="serif" style={{ marginTop: 6, fontSize: 24, color: 'var(--b-text)', lineHeight: 1 }}>
              €{Math.abs(g.total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--b-text-3)' }}>
              {g.n} accounts · {g.t === 'expense' || g.t === 'asset' ? 'debit balance' : 'credit balance'}
            </div>
          </div>
        ))}
      </div>

      {/* Quick toolbar */}
      <div style={{
        padding: '14px 36px', borderBottom: '1px solid var(--b-border)',
        display: 'flex', alignItems: 'center', gap: 18, fontSize: 13,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4,
          borderBottom: '1px solid var(--b-border-strong)', color: 'var(--b-text-2)',
        }}>
          <I.search size={13} /> Search…
        </div>
        <DropB label="All types" icon="scale" />
        <DropB label="Active" icon="check" />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11.5, color: 'var(--b-text-3)' }}>Showing {DATA.accounts.length} accounts</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 36px 36px 36px' }}>
        {grouped.map((g) => (
          <section key={g.type} style={{ marginTop: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              paddingBottom: 10, borderBottom: '1px solid var(--b-text)',
            }}>
              <div className="serif" style={{ fontSize: 24, color: 'var(--b-text)' }}>
                {labelOfType(g.type)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, fontSize: 12, color: 'var(--b-text-3)' }}>
                <span>{g.rows.length} accounts</span>
                <span className="mono tnum" style={{ color: 'var(--b-text)', fontWeight: 500 }}>
                  Net €{Math.abs(g.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 220px 140px 140px',
              padding: '10px 0', fontSize: 10.5, color: 'var(--b-text-3)',
              letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
              borderBottom: '1px solid var(--b-border)',
            }}>
              <div>Code</div>
              <div>Account</div>
              <div>Group</div>
              <div style={{ textAlign: 'right' }}>Balance</div>
              <div style={{ textAlign: 'right' }}>YTD activity</div>
            </div>

            {g.rows.map((a) => <AccountRowB key={a.code} a={a} />)}
          </section>
        ))}
      </div>
    </PageB>
  );
}

function AccountRowB({ a }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 1fr 220px 140px 140px',
      padding: '12px 0', borderBottom: '1px solid var(--b-border)',
      alignItems: 'center', fontSize: 14,
    }}>
      <div className="mono" style={{ color: 'var(--b-text-2)', fontSize: 13 }}>{a.code}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span style={{ color: 'var(--b-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
        {a.is_system && (
          <span style={{
            fontSize: 9.5, padding: '1px 5px', color: 'var(--b-text-3)',
            border: '1px solid var(--b-border-strong)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>system</span>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--b-text-2)', fontStyle: 'italic' }}>{a.group}</div>
      <div className="mono tnum" style={{
        textAlign: 'right', color: 'var(--b-text)', fontWeight: 500,
      }}>
        €{Math.abs(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="mono tnum" style={{
        textAlign: 'right', fontSize: 13, color: 'var(--b-text-3)',
      }}>
        €{Math.abs(a.ytdMove).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

Object.assign(window, { AccountsA, AccountsB });
