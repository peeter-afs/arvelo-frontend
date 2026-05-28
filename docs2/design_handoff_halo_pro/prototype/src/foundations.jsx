// Foundations — token cards for each variant. These tell the user "this is
// the system" at a glance: type pairing, color roles, spacing, component shapes.

function FoundationsA() {
  return (
    <div className="v-a" style={{ width: '100%', height: '100%', padding: 32, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="micro" style={{ color: 'var(--a-text-3)' }}>Variant A</div>
          <h2 className="display" style={{ margin: '6px 0 4px 0', fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em' }}>Halo</h2>
          <div style={{ fontSize: 13.5, color: 'var(--a-text-2)', maxWidth: 460 }}>
            Modern minimalist. Bone canvas, near-black sidebar, electric coral accent, hairline borders, tight Inter. Linear / Mercury energy — makes Merit look like a 2012 ERP.
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', textAlign: 'right' }}>
          Inter · JetBrains Mono<br />
          8-px grid · 6–10px radii<br />
          Hairline borders · no shadows
        </div>
      </div>

      {/* Type */}
      <Card title="Type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 8 }}>Display · Inter 600</div>
            <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>Transactions</div>
            <div style={{ marginTop: 12, fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>Section heading</div>
            <div style={{ marginTop: 10, fontSize: 14, color: 'var(--a-text-2)' }}>Body · 14px regular for descriptions and form helpers.</div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--a-text-3)' }}>Small · 12.5px for meta and table headers.</div>
          </div>
          <div>
            <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 8 }}>Numerals · JetBrains Mono tabular</div>
            <div className="mono tnum" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>€124,820.50</div>
            <div className="mono tnum" style={{ marginTop: 8, fontSize: 14, color: 'var(--a-text-2)' }}>
              <div>JE-2026-0142 &nbsp; 20.05.2026</div>
              <div>+€4,284.00 &nbsp; −€1,320.00</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Color */}
      <Card title="Color">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            ['Bg', 'var(--a-bg)', '#f6f7f9'],
            ['Surface', 'var(--a-surface)', '#ffffff'],
            ['Border', 'var(--a-border)', '#e4e7ec'],
            ['Text', 'var(--a-text)', '#0c111d'],
            ['Text-2', 'var(--a-text-2)', '#51596b'],
            ['Text-3', 'var(--a-text-3)', '#8b93a4'],
            ['Accent', 'var(--a-accent)', '#2c5cf6'],
            ['Accent-soft', 'var(--a-accent-soft)', '#eaf0ff'],
            ['Positive', 'var(--a-pos)', '#0c6e58'],
            ['Warning', 'var(--a-warn)', '#b7791f'],
            ['Danger', 'var(--a-neg)', '#c0392b'],
            ['Sidebar', 'var(--a-side-bg)', '#0c111d'],
          ].map(([name, css, hex]) => (
            <div key={name}>
              <div style={{ background: css, height: 48, borderRadius: 8, border: '1px solid var(--a-border)' }} />
              <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--a-text)' }}>{name}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--a-text-3)' }}>{hex}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Components */}
      <Card title="Components">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 10 }}>Buttons & inputs</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <ButtonA variant="primary" icon={<I.plus size={13} />}>New entry</ButtonA>
              <ButtonA icon={<I.download size={13} />}>Export</ButtonA>
              <ButtonA variant="plain">Cancel</ButtonA>
            </div>
            <div style={{
              padding: '8px 12px', border: '1px solid var(--a-border)', borderRadius: 8,
              background: 'var(--a-surface)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <I.search size={14} style={{ color: 'var(--a-text-3)' }} />
              <input placeholder="Search…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', background: 'transparent' }} />
            </div>
          </div>
          <div>
            <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 10 }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
              <Tag dot="#0c6e58" label="Posted" />
              <Tag dot="#b7791f" label="Draft" soft="#fdf6e3" />
              <Tag dot="#c0392b" label="Overdue · 13d" soft="#fbeaea" />
              <Tag dot="#2c5cf6" label="Open" soft="#eaf0ff" />
              <Tag dot="#7c3aed" label="Reversed" soft="#f1ebff" />
            </div>
            <div style={{ marginTop: 14 }} className="micro" >
              <span style={{ color: 'var(--a-text-3)' }}>Type badges</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => (
                <span key={t} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: typeSoft(t), color: typeColor(t), fontWeight: 600, textTransform: 'capitalize',
                }}>{labelOfType(t)}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FoundationsB() {
  return (
    <div className="v-b" style={{ width: '100%', height: '100%', padding: 32, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="micro" style={{ color: 'var(--b-text-3)' }}>Variant B</div>
          <h2 className="display" style={{ margin: '6px 0 4px 0', fontSize: 44, color: 'var(--b-text)', lineHeight: 1 }}>Quire</h2>
          <div style={{ fontSize: 13.5, color: 'var(--b-text-2)', maxWidth: 460 }}>
            Editorial restraint, modernised. Warm cream canvas, Bricolage Grotesque display (no serif), deep plum primary with sage accents, T-accounts and underline inputs preserved. Mercury / Notion polish.
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--b-text-3)', textAlign: 'right' }}>
          Bricolage Grotesque · Inter · JetBrains Mono<br />
          Editorial scale · plum + sage<br />
          Generous whitespace, no boxes
        </div>
      </div>

      <CardB title="Type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 8 }}>Display · Bricolage Grotesque 500</div>
            <div className="display" style={{ fontSize: 50, color: 'var(--b-text)', lineHeight: 0.95 }}>Transactions</div>
            <div className="display" style={{ marginTop: 14, fontSize: 28, color: 'var(--b-text)' }}>20 May 2026</div>
            <div style={{ marginTop: 10, fontSize: 14, color: 'var(--b-text-2)' }}>Body · Inter 14px for descriptions.</div>
            <div className="italic-sans" style={{ marginTop: 6, fontSize: 13, color: 'var(--b-text-2)' }}>
              Italic Instrument Sans for notes, captions, "for the record" content.
            </div>
            <div className="micro" style={{ marginTop: 10, color: 'var(--b-text-3)' }}>Small caps · uppercase 11px</div>
          </div>
          <div>
            <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 8 }}>Numerals · JetBrains Mono tabular</div>
            <div className="mono tnum" style={{ fontSize: 30, color: 'var(--b-text)' }}>€124,820.50</div>
            <div className="mono tnum" style={{ marginTop: 8, fontSize: 14, color: 'var(--b-text-2)' }}>
              <div>JE-2026-0142 &nbsp; 20.05.2026</div>
              <div>€4,284.00 &nbsp; €1,320.00</div>
            </div>
          </div>
        </div>
      </CardB>

      <CardB title="Color">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            ['Paper',        'var(--b-bg)',           '#f1ede2'],
            ['Surface',      'var(--b-surface)',      '#faf6ec'],
            ['Border',       'var(--b-border)',       '#ddd6c3'],
            ['Ink',          'var(--b-text)',         '#1a1612'],
            ['Ink-2',        'var(--b-text-2)',       '#58524a'],
            ['Muted',        'var(--b-text-3)',       '#8e877b'],
            ['Plum',         'var(--b-accent)',       '#5a1e3a'],
            ['Plum-soft',    'var(--b-accent-soft)',  '#f0e3ea'],
            ['Sage',         'var(--b-sage)',         '#4d6a52'],
            ['Sage-soft',    'var(--b-sage-soft)',    '#e1e8dd'],
            ['Ochre',        'var(--b-warn)',         '#92581c'],
            ['Burgundy',     'var(--b-neg)',          '#8b2a2a'],
          ].map(([name, css, hex]) => (
            <div key={name}>
              <div style={{ background: css, height: 48, border: '1px solid var(--b-border)' }} />
              <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--b-text)' }}>{name}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--b-text-3)' }}>{hex}</div>
            </div>
          ))}
        </div>
      </CardB>

      <CardB title="Components">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 10 }}>Buttons</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <ButtonB variant="accent" icon={<I.plus size={13} />}>New entry</ButtonB>
              <ButtonB icon={<I.download size={13} />}>Export</ButtonB>
              <ButtonB variant="primary">Post entry</ButtonB>
            </div>
            <div className="micro" style={{ marginTop: 14, color: 'var(--b-text-3)' }}>Inputs · paper-like, underline-only</div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                padding: '6px 0', borderBottom: '1px solid var(--b-border-strong)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <I.search size={14} style={{ color: 'var(--b-text-3)' }} />
                <span style={{ fontSize: 13, color: 'var(--b-text-2)' }}>Search invoices, partners, references…</span>
              </div>
            </div>
          </div>
          <div>
            <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 10 }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13 }}>
              <span style={{ color: 'var(--b-accent)' }}>posted</span>
              <span style={{ color: 'var(--b-warn)', fontStyle: 'italic' }}>draft</span>
              <span style={{ color: 'var(--b-neg)' }}>13 days overdue</span>
              <span style={{ color: 'var(--b-text-2)' }}>due in 4 days</span>
              <span style={{ color: 'var(--b-text-3)', textDecoration: 'line-through' }}>reversed</span>
            </div>
            <div className="micro" style={{ marginTop: 18, color: 'var(--b-text-3)' }}>T-account</div>
            <div style={{ marginTop: 8, maxWidth: 200 }}>
              <TAccount code="1210" name="AR" debit={4284} credit={0} side="debit" />
            </div>
          </div>
        </div>
      </CardB>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 12,
      padding: 22, marginBottom: 16,
    }}>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function CardB({ title, children }) {
  return (
    <div style={{
      background: 'var(--b-surface)', border: '1px solid var(--b-border)',
      padding: 22, marginBottom: 16,
    }}>
      <div className="micro" style={{ color: 'var(--b-text-3)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Tag({ dot, label, soft }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999,
      background: soft || 'transparent',
      border: soft ? 'none' : '1px solid var(--a-border)',
      color: 'var(--a-text-2)', fontSize: 11.5, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
      {label}
    </span>
  );
}

Object.assign(window, { FoundationsA, FoundationsB });
