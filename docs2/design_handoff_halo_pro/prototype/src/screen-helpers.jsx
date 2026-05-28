// Shared screen helpers used across multiple screens (A and B variants).
// Restored after the Transactions rewrite — these are referenced by
// AccountsA/B, InvoicesA/B, PartnersA/B and TransactionEditA/B.
//
// Updated visually to match the new Halo / Quire identities.

// ─── A · Halo helpers ───────────────────────────────────────────────────────

// Dashed-border filter pill used in A toolbars
const pillBtnA = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 10px', borderRadius: 7,
  border: '1px solid var(--a-border)', background: 'var(--a-surface)',
  color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
};

// Pagination button used in A footers
const pageBtnA = {
  minWidth: 28, height: 28, padding: '0 8px', borderRadius: 6,
  border: '1px solid var(--a-border)', background: 'var(--a-surface)',
  color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

// Stat card — sits above tables in Partners, etc.
function StatA({ label, value, subtle, trend, tone, check }) {
  const trendColor = trend > 0 ? 'var(--a-pos)' : 'var(--a-neg)';
  return (
    <div style={{
      background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--a-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
        {trend !== undefined && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            padding: '1px 6px', borderRadius: 4, fontSize: 11,
            background: trend > 0 ? 'var(--a-pos-soft)' : 'var(--a-neg-soft)',
            color: trendColor, fontWeight: 600,
          }}>
            {trend > 0 ? <I.arrowUR size={10} /> : <I.arrowDR size={10} />}
            {Math.abs(trend)}%
          </div>
        )}
        {check && <I.check size={14} style={{ color: 'var(--a-pos)' }} />}
      </div>
      <div className="display tnum" style={{
        marginTop: 10, fontSize: 24, fontWeight: 600,
        color: tone === 'warn' ? 'var(--a-warn)' : tone === 'pos' ? 'var(--a-text)' : 'var(--a-text)',
        letterSpacing: '-0.025em',
      }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--a-text-3)' }}>{subtle}</div>
    </div>
  );
}


// ─── B · Quire helpers ──────────────────────────────────────────────────────

// Stat block used along the top of B screens.
function StatB({ label, value, hint, tone, last }) {
  const valueColor = tone === 'warn' ? 'var(--b-warn)' : tone === 'accent' ? 'var(--b-accent)' : tone === 'sage' ? 'var(--b-sage)' : 'var(--b-text)';
  return (
    <div style={{
      padding: '22px 32px',
      borderRight: last ? 'none' : '1px solid var(--b-border)',
    }}>
      <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 10 }}>{label}</div>
      <div className="display tnum" style={{ fontSize: 30, lineHeight: 0.95, color: valueColor }}>{value}</div>
      <div className="italic-sans" style={{ marginTop: 6, fontSize: 12, color: 'var(--b-text-3)' }}>{hint}</div>
    </div>
  );
}

// Underline-only dropdown used in B toolbars.
function DropB({ label, icon }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRight: '1px solid var(--b-border)',
      fontSize: 13, color: 'var(--b-text-2)', cursor: 'pointer',
    }}>
      {I[icon] ? I[icon]({ size: 13 }) : null}{label}
      <I.chevD size={10} style={{ color: 'var(--b-text-3)' }} />
    </div>
  );
}

// ─── Halo Pro shared primitives ─────────────────────────────────────────────
//
// These are the pro-tool moves that distinguish Halo Pro from plain Halo:
//   · command bar pill (breadcrumb + slash filter + ⌘K)
//   · terminal-style status footer (mono, muted, on light surface)
//   · keyboard chip
// Reused across every Halo Pro screen so the chrome feels coherent.

const kbdHP = {
  fontFamily: 'Geist Mono, JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'var(--a-surface-2)', color: 'var(--a-text-2)',
  border: '1px solid var(--a-border)',
};

function HaloProCommandBar({ crumbs, hints, actions }) {
  return (
    <div style={{
      padding: '18px 28px 12px 28px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderRadius: 10,
        background: 'var(--a-surface)', border: '1px solid var(--a-border)',
        fontSize: 13, color: 'var(--a-text-2)',
      }}>
        <I.cmd size={14} style={{ color: 'var(--a-accent)' }} />
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <I.chevR size={11} style={{ color: 'var(--a-text-3)' }} />}
            <span style={{
              color: i === 0 ? 'var(--a-text)' : 'var(--a-text-2)',
              fontWeight: i === 0 ? 500 : 400,
            }}>{c}</span>
          </React.Fragment>
        ))}
        <span style={{ flex: 1 }} />
        {hints && (
          <>
            <span style={{ color: 'var(--a-text-3)' }}>Press</span>
            <kbd style={kbdHP}>/</kbd>
            <span style={{ color: 'var(--a-text-3)' }}>to filter</span>
            <span style={{ width: 1, height: 14, background: 'var(--a-border)', margin: '0 6px' }} />
          </>
        )}
        <kbd style={kbdHP}>⌘</kbd><kbd style={kbdHP}>K</kbd>
      </div>
      {actions}
    </div>
  );
}

function HaloProStatusFooter({ items }) {
  // items: [{ label, value, color? } | { spacer: true } | { dot: true, label, color? }]
  return (
    <div style={{
      padding: '8px 14px', borderTop: '1px solid var(--a-border)',
      background: 'var(--a-surface-2)',
      display: 'flex', alignItems: 'center', gap: 14,
      fontSize: 11, color: 'var(--a-text-3)',
    }} className="mono">
      {items.map((it, i) => {
        if (it.spacer) return <span key={i} style={{ flex: 1 }} />;
        if (it.dot) return (
          <span key={i} style={{ color: it.color || 'var(--a-pos)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {it.label}
          </span>
        );
        return (
          <span key={i}>
            {it.label && <span>{it.label} </span>}
            <span style={{ color: it.color || 'var(--a-text)' }}>{it.value}</span>
          </span>
        );
      })}
    </div>
  );
}

Object.assign(window, { pillBtnA, pageBtnA, StatA, StatB, DropB, HaloProCommandBar, HaloProStatusFooter, kbdHP });
