// Invoices — sales invoices with status pipeline. Both variants add what the
// current implementation lacks: payment status visualization, due-date urgency,
// pipeline view, partner aggregation.

// ═════════════════════════════════════════════════════════════════════════════
// Variant A · Refined Default
// Pipeline header with status tabs that show counts + open amounts, table with
// progress bars for partial payments, due-date urgency indicators.
// ═════════════════════════════════════════════════════════════════════════════
function InvoicesA() {
  const sorted = [...DATA.invoices].sort((a, b) =>
    a.status === 'draft' ? -1 : b.status === 'draft' ? 1 : 0
  );

  return (
    <PageA active="inv">
      <HaloProCommandBar
        crumbs={['Invoices', 'May 2026', 'All']}
        hints
        actions={
          <>
            <ButtonA icon={<I.send size={13} />}>Reminders</ButtonA>
            <ButtonA variant="primary" icon={<I.plus size={13} />}>
              New invoice
              <kbd style={{ ...kbdHP, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>N</kbd>
            </ButtonA>
          </>
        }
      />

      <div style={{ padding: '0 28px 4px 28px' }}>
        <div style={{ fontSize: 11, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          Sales invoices · accounts receivable
        </div>
        <h1 className="display" style={{ margin: 0, fontSize: 28, color: 'var(--a-text)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em' }}>Invoices</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--a-text-2)' }}>
          {DATA.invoices.length} invoices · €13,164.00 outstanding across 4 customers
        </div>
      </div>

      {/* Pipeline / funnel */}
      <div style={{ padding: '14px 28px 14px 28px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
          gap: 1, background: 'var(--a-border)', borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--a-border)',
        }}>
          <PipelineCellA label="Drafts" count={1} amount="—" tone="muted" dot="#94a3b8" />
          <PipelineCellA label="Open"        count={4} amount="€13,504.00" tone="ok"    dot="#2c5cf6" />
          <PipelineCellA label="Overdue"     count={2} amount="€2,800.00"  tone="danger" dot="#c0392b" badge="urgent" />
          <PipelineCellA label="Paid (MTD)"  count={3} amount="€6,820.00"  tone="pos"    dot="#0c6e58" />
          <PipelineCellA label="Avg DSO"     count="14d" amount="−2d vs Q1" tone="muted" arrow="down" last />
        </div>
      </div>

      {/* Toolbar with tabs */}
      <div style={{
        padding: '0 28px 12px 28px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          display: 'flex', background: 'var(--a-surface)', border: '1px solid var(--a-border)',
          borderRadius: 8, padding: 3,
        }}>
          {[
            { label: 'All',     n: 10, active: true },
            { label: 'Open',    n: 4 },
            { label: 'Overdue', n: 2 },
            { label: 'Paid',    n: 3 },
            { label: 'Drafts',  n: 1 },
          ].map((t) => (
            <button key={t.label} style={{
              padding: '5px 12px', borderRadius: 5, border: 'none',
              background: t.active ? 'var(--a-text)' : 'transparent',
              color: t.active ? '#fff' : 'var(--a-text-2)',
              fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                fontSize: 10.5,
                color: t.active ? 'rgba(255,255,255,0.6)' : 'var(--a-text-3)',
              }}>{t.n}</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <I.search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-text-3)' }} />
          <input
            placeholder="Search invoice or customer…"
            style={{
              width: '100%', padding: '7px 12px 7px 34px', height: 32,
              border: '1px solid var(--a-border)', borderRadius: 7,
              fontSize: 13, fontFamily: 'inherit',
              background: 'var(--a-surface)', outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button style={pillBtnA}><I.calendar size={13} /> May 2026 ⏷</button>
        <button style={pillBtnA}><I.filter size={13} /> More filters</button>
      </div>

      {/* Table */}
      <div style={{ padding: '0 28px 24px 28px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
          overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px 130px 1fr 100px 110px 140px 1fr 60px',
            padding: '10px 16px', background: 'var(--a-surface-2)',
            borderBottom: '1px solid var(--a-border)',
            fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <div><input type="checkbox" /></div>
            <div>Invoice</div>
            <div>Customer</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
            <div>Issued</div>
            <div>Due</div>
            <div>Payment</div>
            <div></div>
          </div>

          {sorted.map((inv) => <InvoiceRowA key={inv.number} inv={inv} />)}
        </div>

        <HaloProStatusFooter items={[
          { label: 'Showing', value: `${sorted.length}` },
          { value: 'invoices', label: '·' },
          { value: '€13,504', label: 'open ·' },
          { dot: true, label: '€2,800 overdue', color: 'var(--a-neg)' },
          { spacer: true },
          { label: 'Sync', value: '2m ago' },
        ]} />
      </div>
    </PageA>
  );
}

function PipelineCellA({ label, count, amount, tone, dot, badge, arrow, last }) {
  const dotEl = dot ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} /> : null;
  return (
    <div style={{
      background: 'var(--a-surface)', padding: '14px 16px',
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {dotEl}
        <span style={{ fontSize: 11.5, color: 'var(--a-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
        {badge && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: '#fbeaea', color: '#c0392b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{badge}</span>
        )}
      </div>
      <div className="mono tnum" style={{
        fontSize: 22, fontWeight: 600,
        color: tone === 'danger' ? 'var(--a-neg)' : tone === 'pos' ? 'var(--a-pos)' : 'var(--a-text)',
        letterSpacing: '-0.015em',
      }}>{count}</div>
      <div style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>{amount}</div>
    </div>
  );
}

function InvoiceRowA({ inv }) {
  const today = new Date(2026, 4, 22); // 22.05.2026 — frozen "today"
  const [dd, mm, yyyy] = inv.due.split('.');
  const dueDate = new Date(+yyyy, +mm - 1, +dd);
  const daysToDue = Math.round((dueDate - today) / 86400000);
  const paidPct = inv.amount > 0 ? (inv.paid / inv.amount) * 100 : 0;

  const statusInfo = (() => {
    if (inv.status === 'draft')   return { label: 'Draft',   color: '#94a3b8', soft: '#f1f3f6' };
    if (inv.status === 'paid')    return { label: 'Paid',    color: '#0c6e58', soft: '#e6f4f0' };
    if (inv.status === 'overdue') return { label: `${Math.abs(daysToDue)}d overdue`, color: '#c0392b', soft: '#fbeaea' };
    if (daysToDue <= 7) return { label: `${daysToDue}d to due`, color: '#b7791f', soft: '#fdf6e3' };
    return { label: 'Open', color: '#2c5cf6', soft: '#eaf0ff' };
  })();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 130px 1fr 100px 110px 140px 1fr 60px',
      padding: '12px 16px', borderBottom: '1px solid var(--a-border)',
      alignItems: 'center', fontSize: 13,
      borderLeft: inv.status === 'overdue' ? '2px solid #c0392b' : inv.status === 'draft' ? '2px solid #94a3b8' : '2px solid transparent',
    }}>
      <div><input type="checkbox" /></div>
      <div className="mono" style={{ color: 'var(--a-accent)', fontSize: 12.5, fontWeight: 500 }}>{inv.number}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Avatar name={inv.partner} size={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--a-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.partner}</div>
          <div style={{ fontSize: 11, color: 'var(--a-text-3)' }}>{inv.items} {inv.items === 1 ? 'line' : 'lines'} · EUR</div>
        </div>
      </div>
      <div className="mono tnum" style={{
        textAlign: 'right', fontWeight: 500, color: 'var(--a-text)',
      }}>{inv.amount > 0 ? `€${inv.amount.toFixed(2)}` : '—'}</div>
      <div className="mono tnum" style={{ color: 'var(--a-text-2)', fontSize: 12.5 }}>{inv.date}</div>
      <div>
        <div className="mono tnum" style={{ color: 'var(--a-text-2)', fontSize: 12.5 }}>{inv.due}</div>
        <div style={{ fontSize: 10.5, color: statusInfo.color, fontWeight: 500, marginTop: 1 }}>{statusInfo.label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {inv.status === 'draft' ? (
          <span style={{ fontSize: 12, color: 'var(--a-text-3)', fontStyle: 'italic' }}>Not issued yet</span>
        ) : (
          <>
            <div style={{
              flex: 1, height: 4, background: 'var(--a-surface-2)', borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: `${paidPct}%`, height: '100%',
                background: paidPct >= 100 ? '#0c6e58' : '#2c5cf6',
                borderRadius: 2,
              }} />
            </div>
            <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--a-text-2)', width: 40, textAlign: 'right' }}>
              {Math.round(paidPct)}%
            </span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, color: 'var(--a-text-3)' }}>
        <I.eye size={14} />
        <I.more size={14} />
      </div>
    </div>
  );
}

function Avatar({ name, size = 30 }) {
  const h = hueFromName(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: `oklch(0.92 0.04 ${h})`,
      color: `oklch(0.34 0.08 ${h})`,
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0,
    }}>{initials(name)}</div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Variant B · Ledger
// Each invoice rendered as a "receipt slip" entry: number, customer, line of
// dots from issue to due date, amount on the right. Drafts as italic ghost rows.
// ═════════════════════════════════════════════════════════════════════════════
function InvoicesB() {
  const today = new Date(2026, 4, 22);
  const sorted = [...DATA.invoices].sort((a, b) => {
    const order = { draft: 0, overdue: 1, open: 2, paid: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <PageB active="inv">
      <TopBarB
        eyebrow="Accounts receivable"
        title="Sales invoices"
        subtitle="Every invoice raised, paid, or pending. Drafts at the top, paid below."
        actions={
          <>
            <ButtonB icon={<I.send size={14} />}>Send reminders</ButtonB>
            <ButtonB variant="accent" icon={<I.plus size={14} />}>New invoice</ButtonB>
          </>
        }
      />

      {/* Top counters with vertical rules */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--b-border)',
      }}>
        <StatB label="Open & outstanding" value="€13,504.00" hint="4 invoices · across 4 customers" />
        <StatB label="Overdue" value="€2,800.00" hint="2 invoices · oldest 13 days" tone="warn" />
        <StatB label="Paid this month" value="€6,820.00" hint="3 invoices · on time" />
        <StatB label="Average DSO" value="14 days" hint="−2 days vs. Q1" last />
      </div>

      {/* Tabs */}
      <div style={{
        padding: '16px 36px', display: 'flex', alignItems: 'center', gap: 18,
        borderBottom: '1px solid var(--b-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          {[
            { l: 'All',     n: 10, active: true },
            { l: 'Open',    n: 4 },
            { l: 'Overdue', n: 2, warn: true },
            { l: 'Paid',    n: 3 },
            { l: 'Drafts',  n: 1 },
          ].map((t) => (
            <div key={t.l} style={{
              paddingBottom: 4,
              borderBottom: t.active ? '1px solid var(--b-text)' : '1px solid transparent',
              color: t.active ? 'var(--b-text)' : 'var(--b-text-2)',
              fontWeight: t.active ? 600 : 400, fontSize: 14, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
            }}>
              {t.l} <span className="mono" style={{ fontSize: 11, color: t.warn ? 'var(--b-warn)' : 'var(--b-text-3)' }}>{t.n}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <DropB label="May 2026" icon="calendar" />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderBottom: '1px solid var(--b-border-strong)',
          fontSize: 13, color: 'var(--b-text-2)',
        }}>
          <I.search size={13} /> Search…
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 36px 40px 36px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '110px 220px 1fr 140px 100px',
          padding: '14px 0 8px 0',
          fontSize: 10.5, color: 'var(--b-text-3)',
          letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
          borderBottom: '1px solid var(--b-text)',
        }}>
          <div>Number</div>
          <div>Customer</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Amount</div>
          <div style={{ textAlign: 'right' }}>Due</div>
        </div>

        {sorted.map((inv) => <InvoiceRowB key={inv.number} inv={inv} today={today} />)}
      </div>
    </PageB>
  );
}

function InvoiceRowB({ inv, today }) {
  const [dd, mm, yyyy] = inv.due.split('.');
  const dueDate = new Date(+yyyy, +mm - 1, +dd);
  const daysToDue = Math.round((dueDate - today) / 86400000);
  const paidPct = inv.amount > 0 ? (inv.paid / inv.amount) * 100 : 0;

  const statusText = (() => {
    if (inv.status === 'draft')   return { text: 'draft · unissued',         tone: 'muted' };
    if (inv.status === 'paid')    return { text: 'paid in full',              tone: 'pos' };
    if (inv.status === 'overdue') return { text: `${Math.abs(daysToDue)} days overdue`,    tone: 'warn' };
    if (daysToDue <= 7)           return { text: `due in ${daysToDue} days`, tone: 'warn-soft' };
    return { text: `due in ${daysToDue} days`, tone: 'muted' };
  })();

  const toneColor = {
    muted: 'var(--b-text-3)', pos: 'var(--b-accent)', warn: 'var(--b-warn)', 'warn-soft': 'var(--b-text-2)',
  }[statusText.tone];

  const isDraft = inv.status === 'draft';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 220px 1fr 140px 100px',
      padding: '14px 0', borderBottom: '1px solid var(--b-border)',
      alignItems: 'center', fontSize: 14,
      fontStyle: isDraft ? 'italic' : 'normal',
      color: isDraft ? 'var(--b-text-2)' : 'var(--b-text)',
    }}>
      <div className="mono" style={{ fontSize: 13, color: isDraft ? 'var(--b-text-3)' : 'var(--b-text-2)' }}>{inv.number}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span className="serif" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15 }}>{inv.partner}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 12.5, color: toneColor, textTransform: 'lowercase', letterSpacing: '0.02em' }}>
          {statusText.text}
        </span>
        {!isDraft && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 320 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--b-text-3)' }}>{inv.date.slice(0, 5)}</span>
            <div style={{ flex: 1, position: 'relative', height: 1, background: 'var(--b-border-strong)' }}>
              <div style={{
                position: 'absolute', left: 0, top: -2, height: 5, width: `${Math.min(100, paidPct)}%`,
                background: paidPct >= 100 ? 'var(--b-accent)' : 'var(--b-text)',
              }} />
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--b-text-3)' }}>{inv.due.slice(0, 5)}</span>
          </div>
        )}
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 500 }}>
        {inv.amount > 0 ? `€${inv.amount.toFixed(2)}` : '—'}
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--b-text-2)' }} className="mono">
        {inv.due}
      </div>
    </div>
  );
}

Object.assign(window, { InvoicesA, InvoicesB });
