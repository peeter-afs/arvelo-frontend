// ═════════════════════════════════════════════════════════════════════════════
// Variant C · Aktiv — secondary screens
//
// Establishes the same visual DNA as TransactionsC across the rest of the app:
// bone canvas frame, dark inset data panel, acid-lime accent, mono-heavy
// numerals, split panes where it adds value. These are leaner than the A/B
// equivalents — the goal is to show "yes, the system holds across the app",
// not to fully spec every interaction.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Foundations C ──────────────────────────────────────────────────────────
function FoundationsC() {
  return (
    <div className="v-c" style={{ width: '100%', height: '100%', padding: 28, overflowY: 'auto', background: 'var(--c-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Variant C</div>
          <h2 className="display" style={{ margin: '6px 0 4px 0', fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em' }}>Aktiv</h2>
          <div style={{ fontSize: 13.5, color: 'var(--c-text-2)', maxWidth: 460 }}>
            Bold pro-tool. Dark inset data panels in a light bone frame, acid-lime accent, always-on detail pane, keyboard-first. Makes Merit look like a 2012 ERP.
          </div>
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--c-text-3)', textAlign: 'right', letterSpacing: '0.04em' }}>
          INTER · JETBRAINS MONO<br />
          4-PX GRID · 6–12PX RADII<br />
          DUAL-SURFACE · KBD-FIRST
        </div>
      </div>

      {/* Type */}
      <CardC title="Type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Display · Inter 600 tight</div>
            <div className="display" style={{ fontSize: 36, letterSpacing: '-0.035em', fontWeight: 600 }}>Transactions</div>
            <div style={{ marginTop: 12, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em' }}>Section heading</div>
            <div style={{ marginTop: 10, fontSize: 13.5, color: 'var(--c-text-2)' }}>Body · 13.5px regular. Dense, scannable.</div>
            <div className="mono" style={{ marginTop: 6, fontSize: 11, color: 'var(--c-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>MONO LABELS · CAPS · 11PX</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Numerals · JetBrains Mono tabular</div>
            <div className="mono tnum" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>€124,820.50</div>
            <div className="mono tnum" style={{ marginTop: 10, fontSize: 13, color: 'var(--c-text-2)' }}>
              <div>JE-2026-0142 → 20.05.2026</div>
              <div style={{ color: 'var(--c-pos)' }}>+€4,284.00</div>
              <div style={{ color: 'var(--c-neg)' }}>−€1,320.00</div>
            </div>
          </div>
        </div>
      </CardC>

      {/* Color */}
      <CardC title="Color">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[
            ['Bg',          'var(--c-bg)',      '#ECEBE5'],
            ['Frame',       'var(--c-frame)',   '#D6D2C4'],
            ['Surface',     'var(--c-surface)', '#FFFFFF'],
            ['Dark panel',  'var(--c-dark)',    '#111113'],
            ['Dark border', 'var(--c-dark-border)', '#2A2A30'],
            ['On dark',     'var(--c-on-dark)', '#EBE9E0'],
            ['Text',        'var(--c-text)',    '#0A0A0A'],
            ['Text-2',      'var(--c-text-2)',  '#4A4946'],
            ['Text-3',      'var(--c-text-3)',  '#8E8C84'],
            ['Lime ⚡',     'var(--c-accent)',  '#C5F02C'],
            ['Positive',    'var(--c-pos)',     '#0E7B5A'],
            ['Warning',     'var(--c-warn)',    '#FFC34A'],
          ].map(([name, css, hex]) => (
            <div key={name}>
              <div style={{ background: css, height: 44, borderRadius: 6, border: '1px solid var(--c-frame)' }} />
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--c-text)' }}>{name}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)' }}>{hex}</div>
            </div>
          ))}
        </div>
      </CardC>

      {/* Numerals — readability of the mono face at working size */}
      <CardC title="Numerals · readability check">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>0 vs O · 1 vs l · 5 vs S · 8 vs B</div>
            <div className="mono tnum" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: 'var(--c-text)' }}>
              <div>0 O · 1 l I · 5 S · 8 B</div>
              <div>0123456789</div>
            </div>
            <div className="mono" style={{ marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)' }}>
              Plain zero · tabular figures · Geist Mono default
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Working sizes — at a glance</div>
            <div className="mono tnum" style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--c-text)' }}>
              <div>JE-2026-0142    20.05.2026    €4,284.00</div>
              <div>AR-2026-0091    01.06.2026    €960.00</div>
              <div>OST-1840        14.05.2026    €2,400.00</div>
              <div>PAY-PAL-0042    14.05.2026    €8,420.00</div>
              <div>EE101482739     ‒    Stuudio Lillemets OÜ</div>
            </div>
            <div className="italic-sans" style={{ marginTop: 10, fontSize: 12, color: 'var(--c-text-3)' }}>
              Try the Mono font tweak in the panel → swap between JetBrains, Geist, and IBM Plex live.
            </div>
          </div>
        </div>
      </CardC>

      {/* Components */}
      <CardC title="Components">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Buttons</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              <ButtonC variant="accent" icon={<I.plus size={12} />}>New entry</ButtonC>
              <ButtonC icon={<I.download size={12} />}>Export</ButtonC>
              <ButtonC variant="dark">Filter</ButtonC>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6, marginTop: 10 }}>Command bar</div>
            <div style={{
              padding: '8px 12px', borderRadius: 8, background: 'var(--c-dark)',
              color: 'var(--c-on-dark)', display: 'flex', alignItems: 'center', gap: 10,
              border: '1px solid var(--c-dark-border)',
            }}>
              <I.cmd size={13} style={{ color: 'var(--c-accent)' }} />
              <span style={{ flex: 1, fontSize: 12.5 }}>Jump to invoice, partner, account…</span>
              <kbd style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '1px 5px', borderRadius: 3,
                background: 'rgba(255,255,255,0.06)', color: 'var(--c-on-dark-2)', border: '1px solid rgba(255,255,255,0.08)',
              }}>⌘K</kbd>
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { l: 'POSTED', c: 'var(--c-pos)' },
                { l: 'DRAFT',  c: 'var(--c-warn)' },
                { l: 'OVERDUE 13D', c: 'var(--c-neg)' },
                { l: 'OPEN',   c: 'var(--c-text-2)' },
                { l: 'REVERSED', c: 'var(--c-text-3)' },
              ].map((s) => (
                <span key={s.l} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                  color: s.c,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                  {s.l}
                </span>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Selected row</div>
            <div style={{
              background: 'var(--c-dark)', borderRadius: 8, padding: '10px 12px',
              border: '1px solid var(--c-dark-border)', borderLeft: '2px solid var(--c-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, color: 'var(--c-on-dark)',
            }}>
              <span className="mono" style={{ color: 'var(--c-accent)' }}>JE-2026-0142</span>
              <span className="mono tnum" style={{ fontWeight: 500 }}>€4,284.00</span>
            </div>
          </div>
        </div>
      </CardC>
    </div>
  );
}

function CardC({ title, children }) {
  return (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 12,
      padding: 20, marginBottom: 14,
    }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}


// ─── Transaction Editor C ────────────────────────────────────────────────────
function TransactionEditC() {
  return (
    <PageC active="tx">
      <TopBarC
        eyebrow="JE-2026-0143 · DRAFT"
        title="New journal entry"
        subtitle="Compose, balance, and post in one pane. Cmd+Enter to post."
        actions={
          <>
            <ButtonC>Cancel</ButtonC>
            <ButtonC variant="dark">Save draft</ButtonC>
            <ButtonC variant="accent" icon={<I.check size={12} />}>Post entry</ButtonC>
          </>
        }
      />

      <div style={{ padding: '20px 24px', flex: 1, minHeight: 0, display: 'flex', gap: 12, overflow: 'hidden' }}>
        {/* LEFT: form */}
        <div style={{ flex: 1.4, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Meta */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Field label="Date"        value="20.05.2026" mono />
              <Field label="Reference"   value="AR-2026-0091" mono />
              <Field label="Currency"    value="EUR" mono />
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Description" value="Müük · Brändi disain (faas 1)" />
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Partner"     value="Stuudio Veski OÜ" suffix={<span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>EE101234567 · 14d terms</span>} />
            </div>
          </div>

          {/* Lines table — dark inset */}
          <div style={{
            background: 'var(--c-dark)', borderRadius: 10,
            border: '1px solid var(--c-dark-border)', overflow: 'hidden',
            flex: 1, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Postings</div>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--c-on-dark-3)' }}>
                <kbd style={akKbdC}>⇥</kbd> next field · <kbd style={akKbdC}>⌘ ↵</kbd> post
              </span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 80px 1fr 130px 130px 24px',
              padding: '8px 14px', borderBottom: '1px solid var(--c-dark-border)',
              fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.08em',
              textTransform: 'uppercase', fontWeight: 600,
            }}>
              <div>#</div><div>Side</div><div>Account</div>
              <div style={{ textAlign: 'right' }}>Debit</div>
              <div style={{ textAlign: 'right' }}>Credit</div>
              <div></div>
            </div>
            <PostingRow n={1} side="Dr" code="1210" name="Nõuded ostjate vastu" debit="4284.00" credit="" highlighted />
            <PostingRow n={2} side="Cr" code="4000" name="Müügitulu · Teenused" debit="" credit="3570.00" />
            <PostingRow n={3} side="Cr" code="2200" name="Käibemaks tasumiseks" debit="" credit="714.00" />
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)' }}>
              <button style={{
                background: 'transparent', border: '1px dashed var(--c-dark-border)',
                color: 'var(--c-on-dark-2)', fontFamily: 'inherit', fontSize: 12,
                padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <I.plus size={12} /> Add line
              </button>
            </div>
            {/* Totals */}
            <div style={{
              padding: '12px 14px',
              display: 'grid', gridTemplateColumns: '40px 80px 1fr 130px 130px 24px',
              fontSize: 13, color: 'var(--c-on-dark)',
              background: 'var(--c-dark-2)',
            }}>
              <div></div><div></div>
              <div className="mono" style={{ color: 'var(--c-on-dark-3)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Totals</div>
              <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>€4,284.00</div>
              <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>€4,284.00</div>
              <div></div>
            </div>
            <div style={{
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 11.5, color: 'var(--c-on-dark-3)', background: 'var(--c-dark-2)',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--c-accent)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                Balanced · debits = credits
              </span>
              <span style={{ flex: 1 }} />
              <span>VAT 20% auto-calculated from line 1</span>
            </div>
          </div>
        </div>

        {/* RIGHT: summary + attachments */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 10, padding: 16 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Summary</div>
            <div className="display mono tnum" style={{ marginTop: 8, fontSize: 32, fontWeight: 600 }}>€4,284.00</div>
            <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--c-text-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Net</span><span className="mono tnum">€3,570.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>VAT (20%)</span><span className="mono tnum">€714.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--c-frame)', marginTop: 4, paddingTop: 8, fontWeight: 600, color: 'var(--c-text)' }}>
                <span>Total</span><span className="mono tnum">€4,284.00</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 10, padding: 16, flex: 1, minHeight: 0 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Attachments</div>
            <div style={{
              marginTop: 10, padding: '14px 12px', borderRadius: 8,
              border: '1px dashed var(--c-frame)', textAlign: 'center',
              fontSize: 12, color: 'var(--c-text-3)',
            }}>
              <I.paperclip size={16} style={{ color: 'var(--c-text-3)', marginBottom: 6 }} />
              <div>Drop invoice PDF here</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>or paste <kbd style={{ ...akKbdC, color: 'var(--c-text-2)', background: 'var(--c-bg)', border: '1px solid var(--c-frame)' }}>⌘V</kbd></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Linked</div>
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--c-bg)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <I.file size={13} style={{ color: 'var(--c-accent)' }} />
                <span style={{ flex: 1, color: 'var(--c-text)' }}>AR-2026-0091.pdf</span>
                <span className="mono" style={{ color: 'var(--c-text-3)', fontSize: 11 }}>142 KB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageC>
  );
}

function PostingRow({ n, side, code, name, debit, credit, highlighted }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 80px 1fr 130px 130px 24px',
      padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
      fontSize: 13, alignItems: 'center',
      background: highlighted ? 'var(--c-accent-soft)' : 'transparent',
      borderLeft: highlighted ? '2px solid var(--c-accent)' : '2px solid transparent',
      marginLeft: -2, paddingLeft: 14,
    }}>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--c-on-dark-3)' }}>{n.toString().padStart(2, '0')}</div>
      <div>
        <span className="mono" style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
          background: side === 'Dr' ? 'rgba(255,255,255,0.08)' : 'rgba(197,240,44,0.12)',
          color: side === 'Dr' ? 'var(--c-on-dark)' : 'var(--c-accent)',
          letterSpacing: '0.05em',
        }}>{side.toUpperCase()}</span>
      </div>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--c-on-dark-3)' }}>{code}</span>
        <span style={{ color: 'var(--c-on-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', color: debit ? 'var(--c-on-dark)' : 'var(--c-on-dark-3)', fontWeight: debit ? 500 : 400 }}>
        {debit ? `€${debit}` : '—'}
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', color: credit ? 'var(--c-on-dark)' : 'var(--c-on-dark-3)', fontWeight: credit ? 500 : 400 }}>
        {credit ? `€${credit}` : '—'}
      </div>
      <div style={{ color: 'var(--c-on-dark-3)' }}>
        <I.x size={11} />
      </div>
    </div>
  );
}

function Field({ label, value, mono, suffix }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className={mono ? 'mono' : ''} style={{
          fontSize: 14, color: 'var(--c-text)', fontWeight: 500,
        }}>{value}</div>
        {suffix}
      </div>
      <div style={{ marginTop: 6, height: 1, background: 'var(--c-frame)' }} />
    </div>
  );
}

const akKbdC = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10, padding: '1px 5px', borderRadius: 3,
  background: 'rgba(255,255,255,0.06)', color: 'var(--c-on-dark-2)',
  border: '1px solid rgba(255,255,255,0.08)',
};


// ─── Accounts C ──────────────────────────────────────────────────────────────
function AccountsC() {
  const groups = [
    { type: 'asset',     label: 'Assets',      accounts: DATA.accounts.filter(a => a.type === 'asset') },
    { type: 'liability', label: 'Liabilities', accounts: DATA.accounts.filter(a => a.type === 'liability') },
    { type: 'equity',    label: 'Equity',      accounts: DATA.accounts.filter(a => a.type === 'equity') },
    { type: 'revenue',   label: 'Revenue',     accounts: DATA.accounts.filter(a => a.type === 'revenue') },
    { type: 'expense',   label: 'Expenses',    accounts: DATA.accounts.filter(a => a.type === 'expense') },
  ];
  const totals = {
    asset:     groups[0].accounts.reduce((s, a) => s + a.balance, 0),
    liability: groups[1].accounts.reduce((s, a) => s + a.balance, 0),
    equity:    groups[2].accounts.reduce((s, a) => s + a.balance, 0),
    revenue:   groups[3].accounts.reduce((s, a) => s + a.balance, 0),
    expense:   groups[4].accounts.reduce((s, a) => s + a.balance, 0),
  };

  return (
    <PageC active="acc">
      <TopBarC
        eyebrow={`Chart of accounts · FY ${DATA.tenant.fiscalYear}`}
        title="Accounts"
        subtitle="The map of every account in the books. Filter, group, drill into postings."
        actions={
          <>
            <ButtonC>Import COA</ButtonC>
            <ButtonC variant="accent" icon={<I.plus size={12} />}>New account</ButtonC>
          </>
        }
      />

      {/* Totals strip */}
      <div style={{ padding: '14px 24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {[
          { l: 'ASSETS',      v: totals.asset,     pos: true },
          { l: 'LIABILITIES', v: -totals.liability },
          { l: 'EQUITY',      v: -totals.equity },
          { l: 'REVENUE',     v: -totals.revenue,  pos: true },
          { l: 'EXPENSES',    v: totals.expense },
        ].map((s) => (
          <div key={s.l} style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 8, padding: '10px 12px',
          }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', fontWeight: 600 }}>{s.l}</div>
            <div className="display mono tnum" style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: s.pos ? 'var(--c-text)' : 'var(--c-text)' }}>
              €{Math.abs(s.v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
      </div>

      {/* Dark table panel */}
      <div style={{ padding: '0 24px 24px 24px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: 'var(--c-dark)', borderRadius: 12,
          border: '1px solid var(--c-dark-border)', overflow: 'hidden',
          flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          {/* Filter bar */}
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {['All 24', 'Active 23', 'System 7', 'Custom 17'].map((label, i) => (
              <div key={label} style={{
                padding: '5px 10px', borderRadius: 6,
                background: i === 0 ? 'var(--c-accent)' : 'transparent',
                color: i === 0 ? 'var(--c-accent-on)' : 'var(--c-on-dark-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{label}</div>
            ))}
            <span style={{ flex: 1 }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--c-dark-border)',
              color: 'var(--c-on-dark-2)', fontSize: 12,
            }}>
              <I.search size={12} />
              <span>Search code or name…</span>
            </div>
          </div>

          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 110px 140px 140px 80px',
            padding: '8px 14px', borderBottom: '1px solid var(--c-dark-border)',
            fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            <div>Code</div>
            <div>Account</div>
            <div>Type</div>
            <div style={{ textAlign: 'right' }}>Balance</div>
            <div style={{ textAlign: 'right' }}>YTD movement</div>
            <div style={{ textAlign: 'right' }}>Entries</div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {groups.map((g) => (
              <div key={g.type}>
                <div style={{
                  padding: '10px 14px', background: 'var(--c-dark-2)',
                  fontSize: 11, color: 'var(--c-accent)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderTop: '1px solid var(--c-dark-border)',
                  borderBottom: '1px solid var(--c-dark-border)',
                }} className="mono">
                  <span>▸ {g.label} · {g.accounts.length}</span>
                  <span className="tnum" style={{ color: 'var(--c-on-dark)' }}>
                    €{Math.abs(g.accounts.reduce((s, a) => s + a.balance, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {g.accounts.map((a) => (
                  <div key={a.code} style={{
                    display: 'grid', gridTemplateColumns: '70px 1fr 110px 140px 140px 80px',
                    padding: '8px 14px', borderBottom: '1px solid var(--c-dark-border)',
                    fontSize: 12.5, alignItems: 'center',
                  }}>
                    <div className="mono" style={{ color: 'var(--c-accent)', fontSize: 11.5 }}>{a.code}</div>
                    <div style={{ color: 'var(--c-on-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                      {a.is_system && <span className="mono" style={{ fontSize: 9.5, color: 'var(--c-on-dark-3)', marginLeft: 6, padding: '1px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: 2, letterSpacing: '0.05em' }}>SYS</span>}
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{a.type}</div>
                    <div className="mono tnum" style={{ textAlign: 'right', color: a.balance < 0 ? 'var(--c-neg)' : 'var(--c-on-dark)' }}>
                      {a.balance < 0 ? '−' : ''}€{Math.abs(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mono tnum" style={{ textAlign: 'right', color: 'var(--c-on-dark-2)', fontSize: 12 }}>
                      €{Math.abs(a.ytdMove).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ textAlign: 'right', color: 'var(--c-on-dark-3)', fontSize: 11.5 }} className="mono">
                      {Math.floor(Math.abs(a.ytdMove / Math.max(a.balance || 1, 1) * 12) + 3)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageC>
  );
}


// ─── Invoices C ──────────────────────────────────────────────────────────────
function InvoicesC() {
  const open = DATA.invoices.filter(i => i.status === 'open').reduce((s, i) => s + i.amount, 0);
  const overdue = DATA.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = DATA.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  return (
    <PageC active="inv">
      <TopBarC
        eyebrow="Sales invoices"
        title="Invoices"
        subtitle="Issued invoices, payments, and the gap between."
        actions={
          <>
            <ButtonC>Recurring</ButtonC>
            <ButtonC variant="accent" icon={<I.plus size={12} />}>New invoice</ButtonC>
          </>
        }
      />

      {/* Pipeline */}
      <div style={{ padding: '14px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <AktivPipelineCard label="OPEN"     count={DATA.invoices.filter(i=>i.status==='open').length}    amount={open}    tone="default" />
        <AktivPipelineCard label="OVERDUE"  count={DATA.invoices.filter(i=>i.status==='overdue').length} amount={overdue} tone="neg" />
        <AktivPipelineCard label="DRAFTS"   count={DATA.invoices.filter(i=>i.status==='draft').length}   amount={0}       tone="warn" />
        <AktivPipelineCard label="PAID · MAY" count={DATA.invoices.filter(i=>i.status==='paid').length}    amount={paidThisMonth} tone="pos" />
      </div>

      {/* Dark table */}
      <div style={{ padding: '0 24px 24px 24px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: 'var(--c-dark)', borderRadius: 12, border: '1px solid var(--c-dark-border)',
          overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {['All 10', 'Open 4', 'Overdue 2', 'Paid 3', 'Drafts 1'].map((label, i) => (
              <div key={label} style={{
                padding: '5px 10px', borderRadius: 6,
                background: i === 0 ? 'var(--c-accent)' : 'transparent',
                color: i === 0 ? 'var(--c-accent-on)' : i === 2 ? 'var(--c-neg)' : 'var(--c-on-dark-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{label}</div>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 100px 100px 130px 130px 90px',
            padding: '8px 14px', borderBottom: '1px solid var(--c-dark-border)',
            fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            <div>Number</div>
            <div>Customer</div>
            <div>Issued</div>
            <div>Due</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
            <div style={{ textAlign: 'right' }}>Paid</div>
            <div style={{ textAlign: 'right' }}>Status</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {DATA.invoices.map((inv, i) => {
              const isOverdue = inv.status === 'overdue';
              const isDraft = inv.status === 'draft';
              const isPaid = inv.status === 'paid';
              const statusColor = isOverdue ? 'var(--c-neg)' : isDraft ? 'var(--c-warn)' : isPaid ? 'var(--c-pos)' : 'var(--c-on-dark-2)';
              return (
                <div key={inv.number} style={{
                  display: 'grid', gridTemplateColumns: '140px 1fr 100px 100px 130px 130px 90px',
                  padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
                  fontSize: 13, alignItems: 'center',
                  background: i === 0 ? 'var(--c-accent-soft)' : 'transparent',
                  borderLeft: i === 0 ? '2px solid var(--c-accent)' : '2px solid transparent',
                  marginLeft: -2, paddingLeft: 14,
                }}>
                  <div className="mono" style={{ color: 'var(--c-accent)', fontSize: 11.5 }}>{inv.number}</div>
                  <div style={{ color: 'var(--c-on-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.partner}</div>
                  <div className="mono tnum" style={{ fontSize: 11.5, color: 'var(--c-on-dark-2)' }}>{inv.date}</div>
                  <div className="mono tnum" style={{ fontSize: 11.5, color: isOverdue ? 'var(--c-neg)' : 'var(--c-on-dark-2)' }}>{inv.due}</div>
                  <div className="mono tnum" style={{ textAlign: 'right', color: 'var(--c-on-dark)', fontWeight: 500 }}>{fmtEUR(inv.amount)}</div>
                  <div className="mono tnum" style={{ textAlign: 'right', color: inv.paid > 0 ? 'var(--c-pos)' : 'var(--c-on-dark-3)' }}>
                    {inv.paid > 0 ? fmtEUR(inv.paid) : '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: statusColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                      {inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageC>
  );
}

function AktivPipelineCard({ label, count, amount, tone }) {
  const color = tone === 'neg' ? 'var(--c-neg)' : tone === 'warn' ? 'var(--c-warn)' : tone === 'pos' ? 'var(--c-pos)' : 'var(--c-text)';
  return (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-frame)', borderRadius: 10, padding: '12px 14px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="mono" style={{ fontSize: 10, color, letterSpacing: '0.1em', fontWeight: 700 }}>{label}</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{count}</div>
      </div>
      <div className="display mono tnum" style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: 'var(--c-text)' }}>
        {amount > 0 ? fmtEUR(amount) : '—'}
      </div>
    </div>
  );
}


// ─── Partners C ──────────────────────────────────────────────────────────────
function PartnersC() {
  const [selected, setSelected] = React.useState(DATA.partners[0]);

  return (
    <PageC active="part">
      <TopBarC
        eyebrow="Customers, suppliers, employees"
        title="Partners"
        subtitle="One register for every party your books touch."
        actions={
          <>
            <ButtonC>Import CSV</ButtonC>
            <ButtonC variant="accent" icon={<I.plus size={12} />}>New partner</ButtonC>
          </>
        }
      />

      <div style={{ padding: '14px 24px 24px 24px', flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
        {/* Dark list */}
        <div style={{
          flex: 1.4, minWidth: 0, background: 'var(--c-dark)', borderRadius: 12,
          border: '1px solid var(--c-dark-border)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {['All 11', 'Customers 5', 'Suppliers 5', 'Both 1'].map((l, i) => (
              <div key={l} style={{
                padding: '5px 10px', borderRadius: 6,
                background: i === 0 ? 'var(--c-accent)' : 'transparent',
                color: i === 0 ? 'var(--c-accent-on)' : 'var(--c-on-dark-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{l}</div>
            ))}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 120px 130px 70px',
            padding: '8px 14px', borderBottom: '1px solid var(--c-dark-border)',
            fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            <div>Code</div>
            <div>Partner</div>
            <div>Type</div>
            <div style={{ textAlign: 'right' }}>Balance</div>
            <div style={{ textAlign: 'right' }}>Recent</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {DATA.partners.map((p) => (
              <div key={p.code} onClick={() => setSelected(p)} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 120px 130px 70px',
                padding: '10px 14px', borderBottom: '1px solid var(--c-dark-border)',
                fontSize: 13, alignItems: 'center', cursor: 'pointer',
                background: p.code === selected.code ? 'var(--c-accent-soft)' : 'transparent',
                borderLeft: p.code === selected.code ? '2px solid var(--c-accent)' : '2px solid transparent',
                marginLeft: -2, paddingLeft: 14,
              }}>
                <div className="mono" style={{ color: 'var(--c-accent)', fontSize: 11 }}>{p.code}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: p.code === selected.code ? '#fff' : 'var(--c-on-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-on-dark-3)' }} className="mono">{p.vat || p.regCode}</div>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--c-on-dark-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.type}</div>
                <div className="mono tnum" style={{
                  textAlign: 'right', color: p.balance > 0 ? 'var(--c-on-dark)' : p.balance < 0 ? 'var(--c-warn)' : 'var(--c-on-dark-3)',
                  fontWeight: 500,
                }}>
                  {p.balance === 0 ? '—' : (p.balance < 0 ? '−' : '') + '€' + Math.abs(p.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mono" style={{ textAlign: 'right', fontSize: 11, color: 'var(--c-on-dark-3)' }}>{p.recent.slice(0, 5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail card (light) */}
        <div style={{
          width: 360, flexShrink: 0,
          background: 'var(--c-surface)', borderRadius: 12, border: '1px solid var(--c-frame)',
          padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{selected.code}</span>
              <span className="mono" style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: 'var(--c-bg)', color: 'var(--c-text-2)',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>{selected.type}</span>
            </div>
            <div className="display" style={{ marginTop: 8, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em' }}>{selected.name}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--c-text-3)' }} className="mono">{selected.vat || selected.regCode}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', fontWeight: 600 }}>OUTSTANDING</div>
              <div className="display mono tnum" style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: selected.balance > 0 ? 'var(--c-pos)' : selected.balance < 0 ? 'var(--c-warn)' : 'var(--c-text)' }}>
                €{Math.abs(selected.balance).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', fontWeight: 600 }}>TERMS</div>
              <div className="display" style={{ marginTop: 4, fontSize: 20, fontWeight: 600 }}>{selected.terms}d</div>
            </div>
          </div>

          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>CONTACT</div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><I.mailNew size={12} style={{ color: 'var(--c-text-3)' }} />{selected.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><I.phone size={12} style={{ color: 'var(--c-text-3)' }} />{selected.phone}</div>
            </div>
          </div>

          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>ACTIVITY · 12 MO</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div>
                <div className="display mono tnum" style={{ fontSize: 18, fontWeight: 600 }}>{selected.invoices}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>invoices</div>
              </div>
              <div>
                <div className="display mono tnum" style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-pos)' }}>7d</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>avg pay</div>
              </div>
              <div>
                <div className="display mono tnum" style={{ fontSize: 18, fontWeight: 600 }}>{selected.recent.slice(0, 5)}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>last entry</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <ButtonC style={{ flex: 1, justifyContent: 'center' }} icon={<I.file size={12} />}>New invoice</ButtonC>
            <ButtonC style={{ flex: 1, justifyContent: 'center' }} icon={<I.edit size={12} />}>Edit</ButtonC>
          </div>
        </div>
      </div>
    </PageC>
  );
}

Object.assign(window, { FoundationsC, TransactionEditC, AccountsC, InvoicesC, PartnersC });
