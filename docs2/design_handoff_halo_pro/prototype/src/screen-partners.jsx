// Partners — customers, suppliers, and "both". The current implementation
// shows them in a flat table; both redesigns add: balance direction, payment
// behavior, last activity, type-aware grouping.

// ═════════════════════════════════════════════════════════════════════════════
// Variant A · Refined Default
// Split layout: list left, partner detail right. Type filter pills at top,
// balance/credit indicator inline, smart "needs attention" badges.
// ═════════════════════════════════════════════════════════════════════════════
function PartnersA() {
  const selected = DATA.partners[0]; // Stuudio Veski

  const customers = DATA.partners.filter((p) => p.type === 'customer' || p.type === 'both');
  const suppliers = DATA.partners.filter((p) => p.type === 'supplier');
  const recv = customers.reduce((s, p) => s + Math.max(0, p.balance), 0);
  const pay  = suppliers.reduce((s, p) => s + Math.max(0, -p.balance), 0);

  return (
    <PageA active="part">
      <HaloProCommandBar
        crumbs={['Partners', 'All', '11 contacts']}
        hints
        actions={
          <>
            <ButtonA icon={<I.refresh size={13} />}>Sync registry</ButtonA>
            <ButtonA variant="primary" icon={<I.plus size={13} />}>
              Add partner
              <kbd style={{ ...kbdHP, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>N</kbd>
            </ButtonA>
          </>
        }
      />

      <div style={{ padding: '0 28px 4px 28px' }}>
        <div style={{ fontSize: 11, color: 'var(--a-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          Customers, suppliers, employees
        </div>
        <h1 className="display" style={{ margin: 0, fontSize: 28, color: 'var(--a-text)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em' }}>Partners</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--a-text-2)' }}>
          {DATA.partners.length} contacts · {customers.length} customers · {suppliers.length} suppliers
        </div>
      </div>

      {/* Summary band */}
      <div style={{ padding: '14px 28px 14px 28px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatA label="Receivable from customers" value={`€${recv.toFixed(2)}`} subtle={`${customers.filter((p) => p.balance > 0).length} customers · oldest 18 days`} tone="pos" />
        <StatA label="Payable to suppliers"      value={`€${pay.toFixed(2)}`}  subtle={`${suppliers.filter((p) => p.balance < 0).length} suppliers · next pay run 26.05`} />
        <StatA label="Avg payment time"          value="11 days" subtle="customers · −3d vs Q1" trend={-21} />
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '0 28px 24px 28px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, overflow: 'hidden' }}>
        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <I.search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-text-3)' }} />
              <input
                placeholder="Search name, reg code, email…"
                style={{
                  width: '100%', padding: '7px 12px 7px 34px', height: 32,
                  border: '1px solid var(--a-border)', borderRadius: 7,
                  fontSize: 13, fontFamily: 'inherit',
                  background: 'var(--a-surface)', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { l: 'All',         n: 11, active: true },
                { l: 'Customers',   n: 5 },
                { l: 'Suppliers',   n: 5 },
                { l: 'Both',        n: 1 },
                { l: 'With balance',n: 8 },
              ].map((c) => (
                <button key={c.l} style={{
                  padding: '5px 10px', borderRadius: 6, border: '1px solid',
                  borderColor: c.active ? 'var(--a-text)' : 'var(--a-border)',
                  background: c.active ? 'var(--a-text)' : 'var(--a-surface)',
                  color: c.active ? '#fff' : 'var(--a-text-2)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {c.l} <span style={{ fontSize: 10.5, color: c.active ? 'rgba(255,255,255,0.6)' : 'var(--a-text-3)' }}>{c.n}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 100px 120px 90px 36px',
              padding: '10px 16px', background: 'var(--a-surface-2)',
              borderBottom: '1px solid var(--a-border)',
              fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              <div></div>
              <div>Partner</div>
              <div>Type</div>
              <div style={{ textAlign: 'right' }}>Balance</div>
              <div>Last</div>
              <div></div>
            </div>

            {DATA.partners.map((p) => <PartnerRowA key={p.code} p={p} active={p.code === selected.code} />)}
          </div>
        </div>

        {/* Detail panel */}
        <PartnerDetailA p={selected} />
      </div>
    </PageA>
  );
}

function PartnerRowA({ p, active }) {
  const isCustomer = p.type === 'customer' || p.type === 'both';
  const balanceDirection = (
    p.balance > 0
      ? { label: 'receivable', color: 'var(--a-pos)' }
      : p.balance < 0
      ? { label: 'payable', color: 'var(--a-warn)' }
      : { label: 'settled', color: 'var(--a-text-3)' }
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 1fr 100px 120px 90px 36px',
      padding: '11px 16px', borderBottom: '1px solid var(--a-border)',
      alignItems: 'center', fontSize: 13,
      background: active ? 'var(--a-accent-soft-2)' : 'transparent',
      borderLeft: active ? '2px solid var(--a-accent)' : '2px solid transparent',
    }}>
      <div><Avatar name={p.name} size={26} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--a-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>
          {p.vat || 'no VAT'} · {p.country}
        </div>
      </div>
      <div>
        <span style={{
          fontSize: 11, padding: '2px 7px', borderRadius: 4,
          background: p.type === 'customer' ? 'var(--a-accent-soft)' : p.type === 'supplier' ? '#fdf6e3' : '#f1ebff',
          color: p.type === 'customer' ? 'var(--a-accent)' : p.type === 'supplier' ? 'var(--a-warn)' : '#7c3aed',
          fontWeight: 600, textTransform: 'capitalize',
        }}>{p.type}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono tnum" style={{ fontWeight: 500, color: balanceDirection.color, fontSize: 13.5 }}>
          {p.balance === 0 ? '€0.00' : `€${Math.abs(p.balance).toFixed(2)}`}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--a-text-3)' }}>{balanceDirection.label}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-text-2)' }} className="mono tnum">{p.recent.slice(0, 5)}</div>
      <div style={{ color: 'var(--a-text-3)', display: 'flex', justifyContent: 'flex-end' }}>
        <I.more size={14} />
      </div>
    </div>
  );
}

function PartnerDetailA({ p }) {
  return (
    <div style={{
      background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '18px 18px 16px 18px',
        borderBottom: '1px solid var(--a-border)',
        background: 'linear-gradient(180deg, var(--a-accent-soft-2), var(--a-surface))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={p.name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--a-text)' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--a-text-2)' }}>
              {p.regCode} · {p.vat || 'No VAT'} · {p.country}
            </div>
          </div>
          <button style={{
            padding: 7, borderRadius: 6, border: '1px solid var(--a-border)',
            background: 'var(--a-surface)', cursor: 'pointer',
          }}>
            <I.edit size={14} style={{ color: 'var(--a-text-2)' }} />
          </button>
        </div>

        <div style={{
          marginTop: 14, padding: '12px 14px', background: 'var(--a-surface)',
          border: '1px solid var(--a-border)', borderRadius: 8,
        }}>
          <div className="micro" style={{ color: 'var(--a-text-3)' }}>Outstanding balance</div>
          <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, color: 'var(--a-pos)', marginTop: 4 }}>
            €{p.balance.toFixed(2)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', marginTop: 2 }}>
            Across 3 open invoices · oldest 4 days
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
        <Section label="Contact">
          <KV label="Email"     value={<a style={{ color: 'var(--a-accent)' }}>{p.email}</a>} />
          <KV label="Phone"     value={p.phone} />
          <KV label="Address"   value="Veski 12, 51005 Tartu, EE" />
        </Section>

        <Section label="Terms">
          <KV label="Payment terms" value={`${p.terms} days`} />
          <KV label="Default account" value="1210 · Nõuded ostjate vastu" mono />
          <KV label="Tax treatment"   value="Standard 20%" />
        </Section>

        <Section label="Activity">
          <KV label="Total invoices"  value={`${p.invoices} · €18,420.00`} />
          <KV label="Avg pay time"    value="7 days · on time" />
          <KV label="Last entry"      value={p.recent} mono />
        </Section>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ButtonA><I.file size={13} /> New invoice for this partner</ButtonA>
          <ButtonA><I.ledger size={13} /> Open partner ledger</ButtonA>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function KV({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--a-text-3)' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 12.5, color: 'var(--a-text)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Variant B · Ledger
// Two-column register: list on left as a "registry book" view, selected
// partner appears as a printed card on the right.
// ═════════════════════════════════════════════════════════════════════════════
function PartnersB() {
  const selected = DATA.partners[0];

  return (
    <PageB active="part">
      <TopBarB
        eyebrow="Subsidiary ledger"
        title="Partners"
        subtitle="Customers and suppliers. Every party your business owes or is owed by, in one register."
        actions={
          <>
            <ButtonB icon={<I.refresh size={14} />}>Sync registry</ButtonB>
            <ButtonB variant="accent" icon={<I.plus size={14} />}>Add partner</ButtonB>
          </>
        }
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--b-border)',
      }}>
        <StatB label="Receivable"          value="€16,624.00" hint="5 customers · oldest 18 days" />
        <StatB label="Payable"              value="€4,934.70"  hint="5 suppliers · next pay 26.05" tone="warn" />
        <StatB label="Avg collection"       value="11 days"    hint="−3 days vs Q1" />
        <StatB label="Open contacts"        value="11"         hint="1 archived · 0 duplicate" last />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden' }}>
        {/* List */}
        <div style={{
          padding: '20px 36px', overflowY: 'auto',
          borderRight: '1px solid var(--b-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, paddingBottom: 14, borderBottom: '1px solid var(--b-text)' }}>
            {[
              { l: 'All',       n: 11, active: true },
              { l: 'Customers', n: 5 },
              { l: 'Suppliers', n: 5 },
              { l: 'Both',      n: 1 },
            ].map((c) => (
              <div key={c.l} style={{
                paddingBottom: 4,
                borderBottom: c.active ? '1px solid var(--b-text)' : '1px solid transparent',
                marginBottom: -15,
                color: c.active ? 'var(--b-text)' : 'var(--b-text-2)',
                fontWeight: c.active ? 600 : 400, fontSize: 14,
              }}>
                {c.l} <span className="mono" style={{ fontSize: 11, color: 'var(--b-text-3)' }}>{c.n}</span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: 'var(--b-text-2)',
              paddingBottom: 4, borderBottom: '1px solid var(--b-border-strong)',
              marginBottom: -15,
            }}>
              <I.search size={13} /> Search…
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '70px 1fr 100px 140px 90px',
            padding: '12px 0', fontSize: 10.5,
            color: 'var(--b-text-3)',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            borderBottom: '1px solid var(--b-border)',
          }}>
            <div>Code</div>
            <div>Name</div>
            <div>Type</div>
            <div style={{ textAlign: 'right' }}>Balance</div>
            <div style={{ textAlign: 'right' }}>Last</div>
          </div>

          {DATA.partners.map((p) => <PartnerRowB key={p.code} p={p} active={p.code === selected.code} />)}
        </div>

        {/* Card */}
        <PartnerCardB p={selected} />
      </div>
    </PageB>
  );
}

function PartnerRowB({ p, active }) {
  const dir = p.balance > 0 ? 'receivable' : p.balance < 0 ? 'payable' : 'settled';
  const color = p.balance > 0 ? 'var(--b-accent)' : p.balance < 0 ? 'var(--b-warn)' : 'var(--b-text-3)';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '70px 1fr 100px 140px 90px',
      padding: '13px 0',
      borderBottom: '1px solid var(--b-border)',
      alignItems: 'center', fontSize: 13.5,
      background: active ? 'rgba(36,92,60,0.04)' : 'transparent',
    }}>
      <div className="mono" style={{ fontSize: 12, color: 'var(--b-text-3)' }}>{p.code}</div>
      <div style={{ minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 15, color: 'var(--b-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--b-text-3)', fontStyle: 'italic' }}>
          {p.vat || 'no VAT'} · {p.country}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--b-text-2)', textTransform: 'lowercase' }}>{p.type}</div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono tnum" style={{ color, fontWeight: 500 }}>
          €{Math.abs(p.balance).toFixed(2)}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--b-text-3)', textTransform: 'lowercase', letterSpacing: '0.04em' }}>{dir}</div>
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', fontSize: 12, color: 'var(--b-text-3)' }}>{p.recent}</div>
    </div>
  );
}

function PartnerCardB({ p }) {
  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto' }}>
      <div className="micro" style={{ color: 'var(--b-text-3)' }}>Partner card · No. {p.code}</div>
      <h2 className="serif" style={{ margin: '8px 0 4px 0', fontSize: 28, color: 'var(--b-text)', lineHeight: 1.05 }}>
        {p.name}
      </h2>
      <div style={{ fontSize: 13, color: 'var(--b-text-2)', fontStyle: 'italic' }}>
        Customer in good standing · {p.invoices} invoices since 2025
      </div>

      <div style={{
        marginTop: 20, padding: '18px 0', borderTop: '1px solid var(--b-text)', borderBottom: '1px solid var(--b-text)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
      }}>
        <div>
          <div className="micro" style={{ color: 'var(--b-text-3)' }}>Outstanding</div>
          <div className="serif" style={{ marginTop: 4, fontSize: 26, color: 'var(--b-accent)' }}>
            €{p.balance.toFixed(2)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--b-text-3)' }}>Receivable · 3 open invoices</div>
        </div>
        <div>
          <div className="micro" style={{ color: 'var(--b-text-3)' }}>Avg payment</div>
          <div className="serif" style={{ marginTop: 4, fontSize: 26, color: 'var(--b-text)' }}>7 days</div>
          <div style={{ fontSize: 11.5, color: 'var(--b-text-3)' }}>On time · 12 of last 12</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="micro" style={{ color: 'var(--b-text-3)' }}>Contact</div>
        <div style={{ marginTop: 10, fontSize: 13.5, color: 'var(--b-text)', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.mailNew size={14} style={{ color: 'var(--b-text-3)' }} /> {p.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.phone size={14} style={{ color: 'var(--b-text-3)' }} /> {p.phone}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.building size={14} style={{ color: 'var(--b-text-3)' }} /> Veski 12, 51005 Tartu, EE
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="micro" style={{ color: 'var(--b-text-3)' }}>Bookkeeping</div>
        <KvB label="Reg. code"        value={p.regCode} />
        <KvB label="VAT"              value={p.vat || '—'} />
        <KvB label="Payment terms"    value={`${p.terms} days`} />
        <KvB label="Default account"  value="1210 · Nõuded ostjate vastu" mono />
        <KvB label="Currency"         value="EUR · €" />
        <KvB label="Tax treatment"    value="Standard 20%" last />
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <ButtonB style={{ flex: 1, justifyContent: 'center' }}>Partner ledger</ButtonB>
        <ButtonB variant="accent" style={{ flex: 1, justifyContent: 'center' }}>New invoice</ButtonB>
      </div>
    </div>
  );
}

function KvB({ label, value, mono, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid var(--b-border)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--b-text-3)' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ color: 'var(--b-text)' }}>{value}</span>
    </div>
  );
}

Object.assign(window, { PartnersA, PartnersB });
