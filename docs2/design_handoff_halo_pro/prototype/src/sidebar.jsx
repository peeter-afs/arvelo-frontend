// Sidebar primitives for both variants. These are static mocks — the active
// state is set per screen via the `active` prop.

const NAV_A = [
  { kind: 'item', id: 'home',  label: 'Dashboard',          icon: 'home' },
  { kind: 'head', label: 'Accounting' },
  { kind: 'item', id: 'tx',    label: 'Transactions',       icon: 'ledger', badge: '142' },
  { kind: 'item', id: 'acc',   label: 'Chart of accounts',  icon: 'scale' },
  { kind: 'item', id: 'part',  label: 'Partners',           icon: 'building' },
  { kind: 'item', id: 'bank',  label: 'Bank import',        icon: 'bank' },
  { kind: 'head', label: 'Invoicing' },
  { kind: 'item', id: 'inv',   label: 'Invoices',           icon: 'file', badge: '7' },
  { kind: 'item', id: 'rec',   label: 'Recurring',          icon: 'refresh' },
  { kind: 'item', id: 'rem',   label: 'Reminders',          icon: 'mailNew' },
  { kind: 'head', label: 'Reports' },
  { kind: 'item', id: 'pl',    label: 'P&L',                icon: 'trending' },
  { kind: 'item', id: 'bs',    label: 'Balance sheet',      icon: 'scale' },
  { kind: 'item', id: 'vat',   label: 'VAT report',         icon: 'file' },
];

// ─── Variant A · Refined Default ─────────────────────────────────────────────
function SidebarA({ active = 'tx' }) {
  return (
    <aside style={{
      width: 248, background: 'var(--a-side-bg)', color: 'var(--a-side-text)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100%', overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 18px 16px 18px', borderBottom: '1px solid var(--a-side-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--a-accent)', color: 'var(--a-accent-on)',
            display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
            letterSpacing: '-0.02em',
          }}>A</div>
          <div style={{ fontWeight: 600, fontSize: 17, color: '#fff', letterSpacing: '-0.015em' }}>Arvelo</div>
        </div>
        <div style={{ marginTop: 14, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
          <div style={{ fontSize: 11, color: 'var(--a-side-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Tenant</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{DATA.tenant.name}</div>
            <I.chevD size={14} style={{ color: 'var(--a-side-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Search / Cmd-K hint */}
      <div style={{ padding: '12px 12px 4px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
          color: 'var(--a-side-muted)', fontSize: 13,
        }}>
          <I.search size={14} />
          <div style={{ flex: 1 }}>Search</div>
          <kbd style={{
            fontFamily: 'inherit', fontSize: 11, color: 'var(--a-side-muted)',
            background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4,
          }}>⌘K</kbd>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {NAV_A.map((n, i) => {
          if (n.kind === 'head') {
            return (
              <div key={i} style={{
                fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--a-side-muted)', padding: '14px 12px 6px 12px',
              }}>{n.label}</div>
            );
          }
          const isActive = n.id === active;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 7,
              cursor: 'pointer',
              background: isActive ? 'var(--a-side-active)' : 'transparent',
              color: isActive ? '#fff' : 'var(--a-side-text)',
              fontSize: 13.5, fontWeight: isActive ? 500 : 450,
              position: 'relative',
            }}>
              {isActive && <div style={{
                position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                width: 3, height: 16, borderRadius: 2, background: 'var(--a-accent)',
              }} />}
              <span style={{ color: isActive ? '#fff' : 'var(--a-side-muted)' }}>{I[n.icon]({ size: 16 })}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && (
                <span style={{
                  fontSize: 11, padding: '1px 6px', borderRadius: 4,
                  background: isActive ? 'var(--a-accent-soft)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? 'var(--a-accent)' : 'var(--a-side-muted)',
                  fontWeight: isActive ? 600 : 400,
                }}>{n.badge}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: 12, borderTop: '1px solid var(--a-side-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'var(--a-accent)', color: 'var(--a-accent-on)',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12,
        }}>{DATA.user.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{DATA.user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--a-side-muted)' }}>{DATA.user.role}</div>
        </div>
        <I.more size={16} style={{ color: 'var(--a-side-muted)' }} />
      </div>
    </aside>
  );
}

// ─── Variant B · Ledger ──────────────────────────────────────────────────────
// Warm dark sidebar, serif logo, tighter; nav items use a left rule + small caps section labels.
function SidebarB({ active = 'tx' }) {
  return (
    <aside style={{
      width: 244, background: 'var(--b-side-bg)', color: 'var(--b-side-text)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100%', overflow: 'hidden',
      borderRight: '1px solid rgba(0,0,0,0.05)',
    }}>
      {/* Brand */}
      <div style={{ padding: '22px 22px 18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="serif" style={{ fontSize: 26, color: '#f1e9d6', lineHeight: 1 }}>Arvelo</div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--b-side-muted)', letterSpacing: '0.06em' }}>
          Estonian bookkeeping · since 2025
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: 'var(--b-side-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tenant</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ fontSize: 13, color: '#f1e9d6' }}>{DATA.tenant.name}</div>
            <I.chevD size={13} style={{ color: 'var(--b-side-muted)' }} />
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--b-side-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            FY {DATA.tenant.fiscalYear}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
        {NAV_A.map((n, i) => {
          if (n.kind === 'head') {
            return (
              <div key={i} style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--b-side-muted)', padding: '16px 8px 6px 8px',
              }}>— {n.label}</div>
            );
          }
          const isActive = n.id === active;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 8px', borderRadius: 6,
              cursor: 'pointer',
              background: isActive ? 'var(--b-side-active)' : 'transparent',
              color: isActive ? '#f1e9d6' : 'var(--b-side-text)',
              fontSize: 13.5,
              position: 'relative',
            }}>
              {isActive && <div style={{
                position: 'absolute', left: -14, top: 6, bottom: 6,
                width: 2, background: 'var(--b-accent)',
              }} />}
              <span style={{ color: isActive ? '#f1e9d6' : 'var(--b-side-muted)' }}>{I[n.icon]({ size: 15 })}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && (
                <span className="mono" style={{
                  fontSize: 10.5, color: 'var(--b-side-muted)',
                }}>{n.badge}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: user + actions, no avatar gradient */}
      <div style={{ padding: '14px 18px 16px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 10, color: 'var(--b-side-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Signed in</div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13.5, color: '#f1e9d6' }}>{DATA.user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--b-side-muted)' }}>{DATA.user.role}</div>
          </div>
          <I.logout size={14} style={{ color: 'var(--b-side-muted)' }} />
        </div>
      </div>
    </aside>
  );
}

// ─── Topbars ─────────────────────────────────────────────────────────────────

function TopBarA({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '24px 32px 18px 32px', gap: 24,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--a-text)', letterSpacing: '-0.015em' }}>{title}</h1>
        {subtitle && <div style={{ marginTop: 4, fontSize: 13.5, color: 'var(--a-text-2)' }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

function TopBarB({ title, subtitle, eyebrow, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '28px 36px 22px 36px', gap: 24,
      borderBottom: '1px solid var(--b-border)',
    }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 8 }}>{eyebrow}</div>}
        <h1 className="serif" style={{ margin: 0, fontSize: 34, color: 'var(--b-text)', lineHeight: 1 }}>{title}</h1>
        {subtitle && <div style={{ marginTop: 8, fontSize: 13.5, color: 'var(--b-text-2)' }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

// Outer page chrome — provides the dark sidebar, a content frame, etc.
function PageA({ active, children }) {
  return (
    <div className="v-a" style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--a-bg)' }}>
      <SidebarA active={active} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}

function PageB({ active, children }) {
  return (
    <div className="v-b" style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--b-bg)' }}>
      <SidebarB active={active} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}

// ─── Button primitives ──────────────────────────────────────────────────────

function ButtonA({ variant = 'ghost', children, icon, suffix, style = {}, ...rest }) {
  const v = {
    primary: { background: 'var(--a-accent)', color: '#fff', border: '1px solid var(--a-accent)' },
    ghost:   { background: 'var(--a-surface)', color: 'var(--a-text)', border: '1px solid var(--a-border)' },
    plain:   { background: 'transparent', color: 'var(--a-text-2)', border: '1px solid transparent' },
  }[variant];
  return (
    <button {...rest} style={{
      ...v, padding: '0 12px', height: 34, borderRadius: 8,
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      ...style,
    }}>
      {icon}{children}{suffix}
    </button>
  );
}

function ButtonB({ variant = 'ghost', children, icon, suffix, style = {}, ...rest }) {
  const v = {
    primary: { background: 'var(--b-text)',     color: 'var(--b-surface)', border: '1px solid var(--b-text)' },
    ghost:   { background: 'var(--b-surface)',  color: 'var(--b-text)',    border: '1px solid var(--b-border-strong)' },
    plain:   { background: 'transparent',       color: 'var(--b-text-2)',  border: '1px solid transparent' },
    accent:  { background: 'var(--b-accent)',   color: 'var(--b-accent-on)', border: '1px solid var(--b-accent)' },
  }[variant];
  return (
    <button {...rest} style={{
      ...v, padding: '0 14px', height: 36, borderRadius: 6,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      ...style,
    }}>
      {icon}{children}{suffix}
    </button>
  );
}

// ─── Variant C · Aktiv ──────────────────────────────────────────────────────
// Dark slim sidebar with lime accent. Logo mark only at top, dense keyboard hints.

const NAV_C = NAV_A; // same IA, different chrome

function SidebarC({ active = 'tx' }) {
  return (
    <aside style={{
      width: 224, background: 'var(--c-side-bg)', color: 'var(--c-on-dark)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100%', overflow: 'hidden',
    }}>
      {/* Brand block */}
      <div style={{ padding: '16px 14px 14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--c-accent)', color: 'var(--c-accent-on)',
          display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.04em',
        }}>A</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Arvelo</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--c-on-dark-3)' }}>v2.0 · ee</div>
        </div>
      </div>

      {/* Tenant selector */}
      <div style={{ padding: '0 10px 10px 10px' }}>
        <div style={{
          padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tenant</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 12.5, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{DATA.tenant.name}</div>
            <I.chevD size={12} style={{ color: 'var(--c-on-dark-3)', flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 10px 10px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 7,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
          color: 'var(--c-on-dark-2)', fontSize: 12.5,
        }}>
          <I.cmd size={12} style={{ color: 'var(--c-accent)' }} />
          <div style={{ flex: 1 }}>Jump to…</div>
          <kbd style={akKbdSide}>⌘K</kbd>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 6px', overflowY: 'auto' }}>
        {NAV_C.map((n, i) => {
          if (n.kind === 'head') {
            return (
              <div key={i} className="mono" style={{
                fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--c-on-dark-3)', padding: '12px 10px 4px 10px',
              }}>{n.label}</div>
            );
          }
          const isActive = n.id === active;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '6px 10px', borderRadius: 6,
              cursor: 'pointer',
              background: isActive ? 'var(--c-accent)' : 'transparent',
              color: isActive ? 'var(--c-accent-on)' : 'var(--c-on-dark)',
              fontSize: 13, fontWeight: isActive ? 600 : 450,
            }}>
              <span style={{ color: isActive ? 'var(--c-accent-on)' : 'var(--c-on-dark-3)' }}>{I[n.icon]({ size: 14 })}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && (
                <span className="mono" style={{
                  fontSize: 10, padding: '0 5px', borderRadius: 3,
                  background: isActive ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? 'var(--c-accent-on)' : 'var(--c-on-dark-2)',
                }}>{n.badge}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--c-accent)', color: 'var(--c-accent-on)',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11,
        }}>{DATA.user.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{DATA.user.name}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--c-on-dark-3)' }}>online · {DATA.tenant.vat.slice(2, 6)}</div>
        </div>
        <I.bell size={13} style={{ color: 'var(--c-on-dark-3)' }} />
      </div>
    </aside>
  );
}

const akKbdSide = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'rgba(255,255,255,0.06)', color: 'var(--c-on-dark-2)',
  border: '1px solid rgba(255,255,255,0.08)',
};

function TopBarC({ title, subtitle, eyebrow, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '20px 24px 16px 24px', gap: 24,
      borderBottom: '1px solid var(--c-frame)',
    }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{eyebrow}</div>}
        <h1 className="display" style={{ margin: 0, fontSize: 26, fontWeight: 600, color: 'var(--c-text)' }}>{title}</h1>
        {subtitle && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--c-text-2)' }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

function PageC({ active, children }) {
  return (
    <div className="v-c" style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--c-bg)' }}>
      <SidebarC active={active} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}

function ButtonC({ variant = 'ghost', children, icon, suffix, style = {}, ...rest }) {
  const v = {
    accent: { background: 'var(--c-accent)', color: 'var(--c-accent-on)', border: '1px solid var(--c-accent)' },
    primary: { background: 'var(--c-text)',  color: '#fff',               border: '1px solid var(--c-text)' },
    ghost:  { background: 'var(--c-surface)', color: 'var(--c-text)',     border: '1px solid var(--c-frame)' },
    dark:   { background: 'var(--c-dark)',    color: 'var(--c-on-dark)',  border: '1px solid var(--c-dark-border)' },
    plain:  { background: 'transparent',      color: 'var(--c-text-2)',   border: '1px solid transparent' },
  }[variant];
  return (
    <button {...rest} style={{
      ...v, padding: '0 11px', height: 32, borderRadius: 7,
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      letterSpacing: '-0.005em',
      ...style,
    }}>
      {icon}{children}{suffix}
    </button>
  );
}

Object.assign(window, {
  SidebarA, SidebarB, SidebarC, TopBarA, TopBarB, TopBarC, PageA, PageB, PageC, ButtonA, ButtonB, ButtonC,
});
