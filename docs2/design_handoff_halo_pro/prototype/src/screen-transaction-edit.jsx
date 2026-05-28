// Add / edit transaction (journal entry composer)
// This is the form a bookkeeper hits dozens of times a day. Both variants
// share the same core data model (double-entry lines, totals, balance check),
// but render it very differently.

// ═════════════════════════════════════════════════════════════════════════════
// Variant A · Refined Default
// A focused workspace: header form on top, line grid in the middle, sticky
// totals + actions footer. Smart helpers (suggested accounts, balance warning).
// ═════════════════════════════════════════════════════════════════════════════
function TransactionEditA() {
  const lines = [
    { account: { code: '1210', name: 'Nõuded ostjate vastu' },     desc: 'Brändi disain · faas 1',                    debit: 4284.00, credit: 0,       tax: '—' },
    { account: { code: '4000', name: 'Müügitulu · Teenused' },      desc: 'Brändi disain · faas 1 (netosumma)',        debit: 0,       credit: 3570.00, tax: '20% käibemaks' },
    { account: { code: '2200', name: 'Käibemaks tasumiseks' },      desc: 'Käibemaks 20%',                              debit: 0,       credit: 714.00,  tax: '—' },
  ];
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const diff = totalDebit - totalCredit;

  return (
    <PageA active="tx">
      <HaloProCommandBar
        crumbs={['Transactions', 'New entry', 'JE-2026-0143 · draft']}
        actions={
          <>
            <ButtonA><I.trash size={13} /> Discard</ButtonA>
            <ButtonA>
              Save draft <kbd style={{ ...kbdHP, marginLeft: 4 }}>⌘S</kbd>
            </ButtonA>
            <ButtonA variant="primary" icon={<I.check size={13} />}>
              Post entry <kbd style={{ ...kbdHP, marginLeft: 4, background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.24)', color: '#fff' }}>⌘↵</kbd>
            </ButtonA>
          </>
        }
      />

      {/* Auto-save indicator */}
      <div style={{
        padding: '0 28px 6px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11.5, color: 'var(--a-text-3)',
      }}>
        <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--a-pos)' }} />
          auto-saved 12s ago
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <kbd style={kbdHP}>⇥</kbd> next field · <kbd style={kbdHP}>↵</kbd> add line · <kbd style={kbdHP}>⌘ K</kbd> jump
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 28px 60px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Title + meta form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginBottom: 28 }}>
            <div>
              <input
                defaultValue="Müük · Brändi disain (faas 1)"
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 24, fontWeight: 600, color: 'var(--a-text)', letterSpacing: '-0.015em',
                  padding: 0,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--a-text-2)' }}>
                Describe what this entry records. This text appears on the partner ledger and PDF receipt.
              </div>
            </div>
            <div style={{
              background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
              padding: 16, fontSize: 12.5,
            }}>
              <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 10 }}>Entry meta</div>
              <Row label="Number"     value={<span className="mono" style={{ color: 'var(--a-accent)' }}>JE-2026-0143</span>} />
              <Row label="Type"       value="Sales invoice ⏷" />
              <Row label="Period"     value="May 2026" />
              <Row label="Currency"   value="EUR · €" />
            </div>
          </div>

          {/* Two-column meta */}
          <div style={{
            background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
            padding: 18, marginBottom: 20,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18,
          }}>
            <Field label="Date" value="20.05.2026" suffix={<I.calendar size={14} />} />
            <Field label="Reference" value="AR-2026-0091" mono />
            <Field label="Partner" value="Stuudio Veski OÜ" badge="Customer" />
            <Field label="Linked document" value="AR-2026-0091.pdf" link />
          </div>

          {/* Line items */}
          <div style={{
            background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--a-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-text)' }}>Lines</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--a-text-2)' }}>
                <span>3 lines</span>
                <span style={{ color: 'var(--a-text-3)' }}>·</span>
                <span style={{ color: diff === 0 ? 'var(--a-pos)' : 'var(--a-warn)', fontWeight: 500 }}>
                  {diff === 0 ? '✓ Balanced' : `Imbalanced by €${Math.abs(diff).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '24px 220px 1fr 140px 120px 120px 32px',
              padding: '8px 16px', background: 'var(--a-surface-2)',
              fontSize: 11, fontWeight: 600, color: 'var(--a-text-3)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              <div></div>
              <div>Account</div>
              <div>Description</div>
              <div>Tax</div>
              <div style={{ textAlign: 'right' }}>Debit</div>
              <div style={{ textAlign: 'right' }}>Credit</div>
              <div></div>
            </div>

            {lines.map((l, i) => <LineRowA key={i} l={l} idx={i + 1} />)}

            {/* Add line affordances */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--a-border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', border: '1px dashed var(--a-border-strong)', borderRadius: 6,
                background: 'transparent', color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
              }}><I.plus size={12} /> Add line</button>
              <div style={{ fontSize: 12, color: 'var(--a-text-3)' }}>or press <kbd style={kbdA}>↵</kbd> on the last row</div>
            </div>

            {/* Totals footer */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '24px 220px 1fr 140px 120px 120px 32px',
              padding: '14px 16px', background: 'var(--a-surface-2)',
              borderTop: '1px solid var(--a-border)',
              alignItems: 'center',
            }}>
              <div></div>
              <div></div>
              <div className="micro" style={{ color: 'var(--a-text-3)' }}>Totals</div>
              <div></div>
              <div className="mono tnum" style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--a-text)' }}>€{totalDebit.toFixed(2)}</div>
              <div className="mono tnum" style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--a-text)' }}>€{totalCredit.toFixed(2)}</div>
              <div></div>
            </div>
          </div>

          {/* Helper / suggestion panel */}
          <div style={{
            marginTop: 16,
            background: 'var(--a-accent-soft-2)', border: '1px solid var(--a-accent-soft)', borderRadius: 10,
            padding: '14px 18px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--a-accent-soft)',
              display: 'grid', placeItems: 'center', color: 'var(--a-accent)', flexShrink: 0,
            }}>
              <I.starsmall size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-text)' }}>Detected: sales invoice pattern</div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--a-text-2)' }}>
                Lines look like the last 6 entries for <strong>Stuudio Veski OÜ</strong>. Apply default tax split (20% VAT) and link to invoice AR-2026-0091?
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <ButtonA variant="primary" style={{ height: 28, padding: '0 10px', fontSize: 12 }}>Apply suggestion</ButtonA>
                <ButtonA style={{ height: 28, padding: '0 10px', fontSize: 12 }}>Dismiss</ButtonA>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div style={{
            marginTop: 16,
            background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-text)' }}>Attachments</div>
              <button style={{
                ...pillBtnA, padding: '4px 8px',
              }}><I.paperclip size={12} /> Add file</button>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <FileChipA name="AR-2026-0091.pdf" meta="184 KB · linked" />
              <FileChipA name="Stuudio_Veski_PO.pdf" meta="92 KB" />
            </div>
          </div>
        </div>
      </div>
    </PageA>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: '1px solid var(--a-border)', fontSize: 12.5,
    }}>
      <span style={{ color: 'var(--a-text-3)' }}>{label}</span>
      <span style={{ color: 'var(--a-text)' }}>{value}</span>
    </div>
  );
}

function Field({ label, value, suffix, mono, badge, link }) {
  return (
    <div>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '7px 10px', border: '1px solid var(--a-border)', borderRadius: 7,
        background: 'var(--a-bg)', fontSize: 13.5,
      }}>
        <span className={mono ? 'mono' : ''} style={{ color: link ? 'var(--a-accent)' : 'var(--a-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        {badge && (
          <span style={{
            fontSize: 10.5, padding: '1px 6px', borderRadius: 4,
            background: 'var(--a-accent-soft)', color: 'var(--a-accent)', fontWeight: 600,
          }}>{badge}</span>
        )}
        {suffix}
      </div>
    </div>
  );
}

function LineRowA({ l, idx }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 220px 1fr 140px 120px 120px 32px',
      padding: '10px 16px', borderBottom: '1px solid var(--a-border)',
      alignItems: 'center', fontSize: 13,
    }}>
      <div style={{ fontSize: 11, color: 'var(--a-text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{idx}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--a-text-2)', background: 'var(--a-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{l.account.code}</span>
        <span style={{ color: 'var(--a-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.account.name}</span>
      </div>
      <div style={{ color: 'var(--a-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</div>
      <div style={{ fontSize: 12, color: 'var(--a-text-2)' }}>{l.tax}</div>
      <div className="mono tnum" style={{ textAlign: 'right', color: l.debit > 0 ? 'var(--a-text)' : 'var(--a-text-3)', fontWeight: l.debit > 0 ? 500 : 400 }}>
        {l.debit > 0 ? `€${l.debit.toFixed(2)}` : '—'}
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', color: l.credit > 0 ? 'var(--a-text)' : 'var(--a-text-3)', fontWeight: l.credit > 0 ? 500 : 400 }}>
        {l.credit > 0 ? `€${l.credit.toFixed(2)}` : '—'}
      </div>
      <div style={{ color: 'var(--a-text-3)', display: 'flex', justifyContent: 'flex-end', cursor: 'pointer' }}>
        <I.x size={14} />
      </div>
    </div>
  );
}

function FileChipA({ name, meta }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', border: '1px solid var(--a-border)', borderRadius: 8,
      background: 'var(--a-bg)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4, background: '#fbeaea',
        display: 'grid', placeItems: 'center', color: '#c0392b',
        fontSize: 9, fontWeight: 700,
      }}>PDF</div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--a-text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--a-text-3)' }}>{meta}</div>
      </div>
    </div>
  );
}

const kbdA = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10.5, padding: '1px 5px',
  border: '1px solid var(--a-border)', borderRadius: 4,
  background: 'var(--a-surface)', color: 'var(--a-text-2)',
};

// ═════════════════════════════════════════════════════════════════════════════
// Variant B · Ledger
// Designed to feel like a journal voucher you'd fill in on paper. Bigger type,
// serif headings, T-account visualization on the right, footnotes at bottom.
// ═════════════════════════════════════════════════════════════════════════════
function TransactionEditB() {
  const lines = [
    { account: { code: '1210', name: 'Nõuded ostjate vastu' },     desc: 'Brändi disain · faas 1',                debit: 4284.00, credit: 0,       tax: '—' },
    { account: { code: '4000', name: 'Müügitulu · Teenused' },      desc: 'Brändi disain · faas 1 (netosumma)',    debit: 0,       credit: 3570.00, tax: '20%' },
    { account: { code: '2200', name: 'Käibemaks tasumiseks' },      desc: 'Käibemaks 20% müügilt',                  debit: 0,       credit: 714.00,  tax: '—' },
  ];
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return (
    <PageB active="tx">
      {/* Header strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 36px', borderBottom: '1px solid var(--b-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--b-text-2)' }}>
          <span style={{ cursor: 'pointer' }}>← Transactions</span>
          <span style={{ color: 'var(--b-text-3)' }}>·</span>
          <span className="mono" style={{ color: 'var(--b-text-2)', fontSize: 12 }}>auto-saved 12s ago</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ButtonB><I.trash size={13} /> Discard</ButtonB>
          <ButtonB>Save draft</ButtonB>
          <ButtonB variant="accent" icon={<I.check size={13} />}>Post entry</ButtonB>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px' }}>
          {/* Left — the "voucher" */}
          <div style={{ padding: '36px 36px 60px 36px', borderRight: '1px solid var(--b-border)' }}>
            <div className="micro" style={{ color: 'var(--b-text-3)' }}>Journal entry · No. JE-2026-0143</div>
            <h2 className="serif" style={{ margin: '8px 0 6px 0', fontSize: 36, color: 'var(--b-text)', lineHeight: 1.05 }}>
              Müük · Brändi disain <span style={{ fontStyle: 'italic' }}>faas 1</span>
            </h2>
            <div style={{ fontSize: 13.5, color: 'var(--b-text-2)' }}>
              Recorded against <em>Stuudio Veski OÜ</em> for the period of May 2026, in euros.
            </div>

            {/* Meta strip */}
            <div style={{
              marginTop: 28,
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              borderTop: '1px solid var(--b-border)', borderBottom: '1px solid var(--b-border)',
            }}>
              <MetaB label="Date"      value="20 May 2026" />
              <MetaB label="Reference" value="AR-2026-0091" mono />
              <MetaB label="Type"      value="Sales invoice" />
              <MetaB label="Period"    value="May 2026" last />
            </div>

            {/* Ledger lines */}
            <div style={{ marginTop: 32 }}>
              <div className="micro" style={{ color: 'var(--b-text-3)' }}>Lines</div>
              <div style={{
                marginTop: 8,
                borderTop: '1px solid var(--b-text)', borderBottom: '1px solid var(--b-text)',
              }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '20px 1.5fr 1fr 80px 120px 120px',
                  padding: '8px 0', fontSize: 10.5,
                  letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
                  color: 'var(--b-text-3)', borderBottom: '1px solid var(--b-border)',
                }}>
                  <div></div>
                  <div>Account</div>
                  <div>Description</div>
                  <div>Tax</div>
                  <div style={{ textAlign: 'right' }}>Debit</div>
                  <div style={{ textAlign: 'right' }}>Credit</div>
                </div>
                {lines.map((l, i) => <LineRowB key={i} l={l} idx={i + 1} />)}

                {/* Add line */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '20px 1.5fr 1fr 80px 120px 120px',
                  padding: '10px 0', borderBottom: '1px solid var(--b-border)',
                  fontSize: 13, color: 'var(--b-text-3)', fontStyle: 'italic',
                }}>
                  <div style={{ fontSize: 11 }} className="mono">{lines.length + 1}</div>
                  <div>Type to add account…</div>
                  <div></div><div></div><div></div><div></div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '20px 1.5fr 1fr 80px 120px 120px',
                  padding: '14px 0',
                  fontSize: 14,
                }}>
                  <div></div>
                  <div className="micro" style={{ color: 'var(--b-text-3)' }}>Totals</div>
                  <div></div><div></div>
                  <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>€{totalDebit.toFixed(2)}</div>
                  <div className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>€{totalCredit.toFixed(2)}</div>
                </div>
              </div>
              <div style={{
                marginTop: 8, fontSize: 12, color: 'var(--b-accent)', fontStyle: 'italic',
              }}>
                ✓ Debits equal credits. Entry is balanced.
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: 36 }}>
              <div className="micro" style={{ color: 'var(--b-text-3)' }}>Notes for the record</div>
              <div style={{
                marginTop: 8, fontSize: 13.5, color: 'var(--b-text-2)',
                fontStyle: 'italic', lineHeight: 1.6,
                borderLeft: '2px solid var(--b-border-strong)', paddingLeft: 14,
              }}>
                First milestone of the 2026 brand refresh. Per contract Annex A, 60% on delivery, 40% on
                acceptance. Acceptance pending — invoice will close once partner confirms.
              </div>
            </div>
          </div>

          {/* Right — T-account preview + meta + attachments */}
          <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* T-accounts */}
            <div>
              <div className="micro" style={{ color: 'var(--b-text-3)' }}>Effect on the books</div>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <TAccount code="1210" name="AR" debit={4284.00} credit={0} side="debit" />
                <TAccount code="4000" name="Sales" debit={0} credit={3570.00} side="credit" />
                <TAccount code="2200" name="VAT pay." debit={0} credit={714.00} side="credit" small />
              </div>
            </div>

            <div>
              <div className="micro" style={{ color: 'var(--b-text-3)' }}>Linked</div>
              <div style={{ marginTop: 10 }}>
                <FileChipB icon={I.file} name="AR-2026-0091.pdf" meta="Invoice · 184 KB" />
                <FileChipB icon={I.building} name="Stuudio Veski OÜ" meta="Customer ledger →" />
                <FileChipB icon={I.calendar} name="Period: May 2026" meta="Open for posting" />
              </div>
            </div>

            <div>
              <div className="micro" style={{ color: 'var(--b-text-3)' }}>Keyboard</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--b-text-2)' }}>
                <KbdRowB keys={['⌘', '↵']} label="Post entry" />
                <KbdRowB keys={['⌘', 'S']} label="Save draft" />
                <KbdRowB keys={['↵']} label="New line" />
                <KbdRowB keys={['⌘', 'K']} label="Quick search" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageB>
  );
}

function MetaB({ label, value, mono, last }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderRight: last ? 'none' : '1px solid var(--b-border)',
    }}>
      <div className="micro" style={{ color: 'var(--b-text-3)' }}>{label}</div>
      <div className={mono ? 'mono' : ''} style={{ marginTop: 4, fontSize: 14, color: 'var(--b-text)' }}>{value}</div>
    </div>
  );
}

function LineRowB({ l, idx }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1.5fr 1fr 80px 120px 120px',
      padding: '12px 0', borderBottom: '1px solid var(--b-border)',
      alignItems: 'center', fontSize: 13.5,
    }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--b-text-3)' }}>{idx}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--b-text-3)' }}>{l.account.code}</span>
        <span style={{ color: 'var(--b-text)' }}>{l.account.name}</span>
      </div>
      <div style={{ color: 'var(--b-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{l.desc}</div>
      <div style={{ fontSize: 12, color: 'var(--b-text-2)' }}>{l.tax}</div>
      <div className="mono tnum" style={{ textAlign: 'right', color: l.debit > 0 ? 'var(--b-text)' : 'var(--b-text-3)', fontWeight: l.debit > 0 ? 500 : 400 }}>
        {l.debit > 0 ? `€${l.debit.toFixed(2)}` : '—'}
      </div>
      <div className="mono tnum" style={{ textAlign: 'right', color: l.credit > 0 ? 'var(--b-text)' : 'var(--b-text-3)', fontWeight: l.credit > 0 ? 500 : 400 }}>
        {l.credit > 0 ? `€${l.credit.toFixed(2)}` : '—'}
      </div>
    </div>
  );
}

function TAccount({ code, name, debit, credit, side, small }) {
  return (
    <div style={{ border: '1px solid var(--b-border-strong)', background: 'var(--b-surface)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--b-text-3)' }}>{code}</span>
        <span className="serif" style={{ fontSize: 16, color: 'var(--b-text)' }}>{name}</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1px 1fr', minHeight: small ? 56 : 80,
      }}>
        <div style={{ paddingRight: 8 }}>
          <div className="micro" style={{ color: 'var(--b-text-3)', fontSize: 9.5 }}>Dr</div>
          {debit > 0 ? (
            <div className={side === 'debit' ? '' : ''} style={{ marginTop: 6 }}>
              <div className="mono tnum" style={{
                fontSize: 13, color: side === 'debit' ? 'var(--b-pos)' : 'var(--b-text-2)',
                fontWeight: 600,
              }}>€{debit.toFixed(2)}</div>
            </div>
          ) : null}
        </div>
        <div style={{ background: 'var(--b-text)', width: 1 }} />
        <div style={{ paddingLeft: 8 }}>
          <div className="micro" style={{ color: 'var(--b-text-3)', fontSize: 9.5 }}>Cr</div>
          {credit > 0 ? (
            <div style={{ marginTop: 6 }}>
              <div className="mono tnum" style={{
                fontSize: 13, color: side === 'credit' ? 'var(--b-pos)' : 'var(--b-text-2)',
                fontWeight: 600,
              }}>€{credit.toFixed(2)}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FileChipB({ icon: IconC, name, meta }) {
  return (
    <div style={{
      padding: '10px 0', borderBottom: '1px solid var(--b-border)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <IconC size={14} style={{ color: 'var(--b-text-3)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--b-text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--b-text-3)' }}>{meta}</div>
      </div>
      <I.chevR size={12} style={{ color: 'var(--b-text-3)' }} />
    </div>
  );
}

function KbdRowB({ keys, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {keys.map((k, i) => (
          <span key={i} className="mono" style={{
            fontSize: 11, padding: '1px 6px', minWidth: 18, textAlign: 'center',
            border: '1px solid var(--b-border-strong)',
            background: 'var(--b-surface)', color: 'var(--b-text)',
          }}>{k}</span>
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}

Object.assign(window, { TransactionEditA, TransactionEditB });
