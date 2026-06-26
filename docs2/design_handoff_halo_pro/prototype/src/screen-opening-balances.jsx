// Opening balances · redesigned
// Fixes the "chaotic" flow: a clear Upload → Review → Confirm progression,
// auto-parse on file select, a dense review table with full-width account
// pickers, the "will be created" wall collapsed into one compact notice, a
// STICKY action bar (Preview/Confirm always visible) that surfaces the blocking
// issue, and Recent batches demoted to an on-demand History drawer.

const OB_COA = new Set(window.DATA ? DATA.accounts.map((a) => a.code) : []);

// account label "code · name" for resolved accounts
const obAcctName = (code) => {
  const a = (window.DATA ? DATA.accounts : []).find((x) => x.code === code);
  return a ? a.name : null;
};

// Parsed rows from a sample balance PDF. `code` is what the parser read off the
// PDF; if it's not in the chart of accounts it will be created on confirm.
// `account: null` means the parser couldn't map it — the user MUST pick one.
const OB_PARSED = [
  { id: 1,  code: '1010', name: 'Swedbank',                          desc: '1010 Swedbank',                      side: 'D', amount: 4454.72 },
  { id: 2,  code: '1000', name: 'Kassa',                             desc: '1000 Kassa',                         side: 'D', amount: 29.69  },
  { id: 3,  code: '1200', name: 'Ostjatelt laekumata arved',        desc: '1200 Ostjatelt laekumata arved',     side: 'D', amount: 9381.35 },
  { id: 4,  code: '1210', name: 'Nõuded ostjate vastu',             desc: '1210 Nõuded ostjate vastu',          side: 'D', amount: 1240.00 },
  { id: 5,  code: '1310', name: 'Tooraine ja materjalid',           desc: '1310 Tooraine ja materjalid',        side: 'D', amount: 3420.00 },
  { id: 6,  code: '1500', name: 'Põhivara · Arvutid ja IT-seadmed', desc: '1500 Põhivara · IT-seadmed',         side: 'D', amount: 8920.00 },
  { id: 7,  code: '2110', name: 'Võlad tarnijatele',                desc: '2110 Võlad tarnijatele',             side: 'C', amount: 14260.40 },
  { id: 8,  code: '2200', name: 'Käibemaks tasumiseks',             desc: '2200 Käibemaks tasumiseks',          side: 'C', amount: 3214.20 },
  { id: 9,  code: '3100', name: 'Osakapital',                       desc: '3100 Osakapital',                    side: 'C', amount: 2500.00 },
  { id: 10, code: null,   name: null,                               desc: 'Eelmiste perioodide jaotamata kasum', side: 'C', amount: 6.14   },
  { id: 11, code: null,   name: null,                               desc: 'Aruandeaasta kasum / kahjum',          side: 'C', amount: 7465.02 },
];

function OpeningBalancesA() {
  const [step, setStep] = React.useState('upload');     // upload · parsing · review · preview
  const [rows, setRows] = React.useState([]);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showPartner, setShowPartner] = React.useState(false);

  // assign an account code to a row
  const assign = (id, code) => setRows((rs) => rs.map((r) => r.id === id ? { ...r, code, name: obAcctName(code) || r.name } : r));
  const remove = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  const startParse = () => {
    setStep('parsing');
    setTimeout(() => { setRows(OB_PARSED.map((r) => ({ ...r }))); setStep('review'); }, 1100);
  };
  const reset = () => { setStep('upload'); setRows([]); setShowCreate(false); };

  // derived
  const debit  = rows.filter((r) => r.side === 'D').reduce((s, r) => s + r.amount, 0);
  const credit = rows.filter((r) => r.side === 'C').reduce((s, r) => s + r.amount, 0);
  const diff = debit - credit;
  const missing = rows.filter((r) => !r.code).length;
  const willCreate = rows.filter((r) => r.code && !OB_COA.has(r.code));
  const balanced = Math.abs(diff) < 0.005;
  const canConfirm = balanced && missing === 0 && rows.length > 0;

  return (
    <PageA active="open">
      <HaloProCommandBar
        crumbs={['Books', 'Opening balances', 'General']}
        actions={
          <ButtonA onClick={() => setShowHistory(true)}>
            <I.history size={13} /> History <span style={{ color: 'var(--a-text-3)', fontSize: 12 }}>6</span>
          </ButtonA>
        }
      />

      {/* Stepper */}
      <OBStepper step={step} hasFile={rows.length > 0 || step !== 'upload'} />

      {/* Scroll body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 28px 24px 28px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>

          {/* Mode segmented control — was 3 big cards, now one compact row */}
          <OBModeRow />

          {/* ── STEP 1 · UPLOAD ─────────────────────────────────────────── */}
          {step !== 'review' && step !== 'preview' && (
            <OBUpload step={step} onPick={startParse} />
          )}

          {/* ── STEP 2 · REVIEW ─────────────────────────────────────────── */}
          {step === 'review' && (
            <>
              {/* source summary + re-upload */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginTop: 16,
                background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, padding: '12px 16px',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: '#fbeaea', display: 'grid', placeItems: 'center', color: '#c0392b', fontSize: 8.5, fontWeight: 700 }}>PDF</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-text)' }}>AutoFutur Systems OÜ · Bilanss.pdf</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>Merit · deterministic parser · detected date 2026-04-30 · {rows.length} rows</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--a-pos)' }}>
                  <I.check size={13} /> Parsed
                </span>
                <ButtonA onClick={reset} style={{ height: 30, fontSize: 12 }}><I.upload size={12} /> Replace</ButtonA>
              </div>

              {/* compact notices: blocking error first, then the create-list as a quiet expandable */}
              {missing > 0 && (
                <div style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--a-neg-soft)', border: '1px solid #f0c8c0', borderRadius: 9, padding: '11px 14px',
                  color: 'var(--a-neg)', fontSize: 13,
                }}>
                  <I.alert size={16} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}><strong>{missing} row{missing > 1 ? 's' : ''} need an account.</strong> Pick or create an account for the highlighted rows below — they're excluded from the balance until then.</span>
                </div>
              )}
              {willCreate.length > 0 && (
                <div style={{ marginTop: 10, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 9 }}>
                  <button onClick={() => setShowCreate((v) => !v)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <I.info size={15} style={{ color: 'var(--a-warn)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--a-text-2)' }}>
                      <strong style={{ color: 'var(--a-text)' }}>{willCreate.length} new accounts</strong> will be created on confirm. This is expected for a first import.
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--a-text-3)' }}>{showCreate ? 'Hide' : 'Review'}</span>
                    <I.chevD size={14} style={{ color: 'var(--a-text-3)', transform: showCreate ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
                  </button>
                  {showCreate && (
                    <div style={{ padding: '0 14px 12px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {willCreate.map((r) => (
                        <span key={r.id} className="mono" style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 5, background: 'var(--a-surface-2)', color: 'var(--a-text-2)', border: '1px solid var(--a-border)' }}>
                          {r.code} · {r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* meta inline */}
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <OBMeta label="Opening date" value="30.04.2026" mono icon={<I.calendar size={13} />} />
                <OBMeta label="Currency" value="EUR" mono />
                <OBMeta label="Source document" value="427ae7f2…35869" mono grow />
              </div>

              {/* rows table */}
              <div style={{ marginTop: 16, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--a-border)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-text)' }}>General ledger rows</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setShowPartner((v) => !v)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                      border: '1px solid var(--a-border)', background: showPartner ? 'var(--a-accent-soft-2)' : 'transparent', color: showPartner ? 'var(--a-accent)' : 'var(--a-text-2)',
                    }}>
                      <span style={{ width: 26, height: 15, borderRadius: 99, background: showPartner ? 'var(--a-accent)' : 'var(--a-border-strong)', position: 'relative', transition: 'background 120ms', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 2, left: showPartner ? 13 : 2, width: 11, height: 11, borderRadius: '50%', background: '#fff', transition: 'left 120ms' }} />
                      </span>
                      Partner column
                    </button>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px dashed var(--a-border-strong)', borderRadius: 6, background: 'transparent', color: 'var(--a-text-2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <I.plus size={12} /> Add row
                    </button>
                  </div>
                </div>
                {/* column headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: OB_COLS(showPartner),
                  gap: 14, padding: '8px 18px', background: 'var(--a-surface-2)',
                  fontSize: 10.5, fontWeight: 600, color: 'var(--a-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  <div></div><div>Account</div>{showPartner && <div>Partner</div>}<div>Description</div><div>Side</div><div style={{ textAlign: 'right' }}>Amount</div><div></div>
                </div>
                {rows.map((r, i) => (
                  <OBRow key={r.id} r={r} idx={i + 1} showPartner={showPartner} onAssign={assign} onRemove={remove} />
                ))}
              </div>

              {/* balance summary strip */}
              <OBBalanceSummary rows={rows} missing={missing} />
            </>
          )}

          {/* ── STEP 3 · PREVIEW ───────────────────────────────────────── */}
          {step === 'preview' && (
            <OBPreview rows={rows} debit={debit} credit={credit} onBack={() => setStep('review')} />
          )}
        </div>
      </div>

      {/* ── STICKY ACTION BAR — always visible ─────────────────────────── */}
      {(step === 'review' || step === 'preview') && (
        <div style={{
          flexShrink: 0, borderTop: '1px solid var(--a-border)', background: 'var(--a-surface)',
          padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {/* live totals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <OBTotal label="Debit" value={debit} />
            <OBTotal label="Credit" value={credit} />
            <div style={{ width: 1, height: 30, background: 'var(--a-border)' }} />
            <div>
              <div className="micro" style={{ color: 'var(--a-text-3)', fontSize: 10 }}>Difference</div>
              <div className="mono tnum" style={{ fontSize: 17, fontWeight: 600, color: balanced ? 'var(--a-pos)' : 'var(--a-neg)' }}>
                {balanced ? '€0.00 ✓' : `€${Math.abs(diff).toFixed(2)}`}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* blocking reason inline, right where the buttons are */}
          {!canConfirm && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--a-neg)' }}>
              <I.alert size={14} />
              {missing > 0 ? `${missing} row${missing > 1 ? 's' : ''} need an account` : !balanced ? 'Entry is not balanced' : 'Add at least one row'}
            </div>
          )}

          {step === 'review' ? (
            <ButtonA variant="primary" disabled={!canConfirm}
              onClick={() => canConfirm && setStep('preview')}
              style={{ opacity: canConfirm ? 1 : 0.45, cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
              <I.eye size={14} /> Preview
            </ButtonA>
          ) : (
            <>
              <ButtonA onClick={() => setStep('review')}><I.chevL size={13} /> Back to edit</ButtonA>
              <ButtonA variant="primary"><I.check size={14} /> Confirm opening balances</ButtonA>
            </>
          )}
        </div>
      )}

      {/* History drawer */}
      {showHistory && <OBHistoryDrawer onClose={() => setShowHistory(false)} />}
    </PageA>
  );
}

// ─── Stepper ────────────────────────────────────────────────────────────────
function OBStepper({ step }) {
  const idx = step === 'upload' || step === 'parsing' ? 0 : step === 'review' ? 1 : 2;
  const steps = [
    { n: 1, label: 'Upload', sub: 'Balance PDF' },
    { n: 2, label: 'Review', sub: 'Map & balance rows' },
    { n: 3, label: 'Confirm', sub: 'Post opening entry' },
  ];
  return (
    <div style={{ padding: '8px 28px 14px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 1020, margin: '0 auto' }}>
        {steps.map((s, i) => {
          const state = i < idx ? 'done' : i === idx ? 'active' : 'todo';
          return (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                  background: state === 'active' ? 'var(--a-accent)' : state === 'done' ? 'var(--a-pos)' : 'var(--a-surface)',
                  color: state === 'todo' ? 'var(--a-text-3)' : '#fff',
                  border: state === 'todo' ? '1px solid var(--a-border-strong)' : 'none',
                }} className="mono">
                  {state === 'done' ? <I.check size={14} /> : s.n}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: state === 'active' ? 600 : 500, color: state === 'todo' ? 'var(--a-text-3)' : 'var(--a-text)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--a-text-3)' }}>{s.sub}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 1, margin: '0 16px', background: i < idx ? 'var(--a-pos)' : 'var(--a-border)' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mode row (was 3 large cards) ─────────────────────────────────────────────
function OBModeRow() {
  const [mode, setMode] = React.useState('general');
  const modes = [
    { id: 'general',     label: 'General',     sub: 'Balanced GL opening entry' },
    { id: 'receivables', label: 'Receivables', sub: 'Open customer items' },
    { id: 'payables',    label: 'Payables',    sub: 'Open supplier items' },
  ];
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 8, background: 'var(--a-surface-2)', padding: 4, borderRadius: 10, border: '1px solid var(--a-border)' }}>
      {modes.map((m) => {
        const on = m.id === mode;
        return (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            flex: 1, textAlign: 'left', padding: '9px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
            background: on ? 'var(--a-surface)' : 'transparent',
            border: on ? '1px solid var(--a-border)' : '1px solid transparent',
            boxShadow: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'var(--a-accent)' : 'var(--a-text-3)' }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? 'var(--a-text)' : 'var(--a-text-2)' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--a-text-3)', marginTop: 3, marginLeft: 15 }}>{m.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Upload step ──────────────────────────────────────────────────────────────
function OBUpload({ step, onPick }) {
  const parsing = step === 'parsing';
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        background: 'var(--a-surface)', border: '1px dashed var(--a-border-strong)', borderRadius: 12,
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto', background: 'var(--a-accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--a-accent)' }}>
          {parsing ? <I.spinner size={22} className="ob-spin" /> : <I.upload size={22} />}
        </div>
        <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: 'var(--a-text)' }}>
          {parsing ? 'Parsing balance PDF…' : 'Drop a balance PDF to import'}
        </div>
        <div style={{ marginTop: 5, fontSize: 13, color: 'var(--a-text-2)', maxWidth: 440, marginInline: 'auto' }}>
          {parsing
            ? 'Reading accounts, sides and amounts. Parsing starts automatically — no extra step.'
            : 'Balance sheet, trial balance, receivables or payables. We detect the source and convert it into editable opening rows.'}
        </div>
        {!parsing && (
          <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
            <ButtonA variant="primary" onClick={onPick}><I.upload size={14} /> Choose file</ButtonA>
            <span style={{ fontSize: 12.5, color: 'var(--a-text-3)' }}>or drag it here · auto-detect source</span>
          </div>
        )}
      </div>
      {/* manual alternative, quiet */}
      {!parsing && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--a-text-3)' }}>
          No PDF? <span style={{ color: 'var(--a-accent)', cursor: 'pointer', fontWeight: 500 }}>Enter opening balances manually →</span>
        </div>
      )}
    </div>
  );
}

// shared grid template so header + rows line up; partner column optional
const OB_COLS = (showPartner) =>
  showPartner
    ? '34px minmax(320px,2fr) 160px minmax(220px,1.3fr) 70px 150px 36px'
    : '34px minmax(360px,2.2fr) minmax(240px,1.4fr) 70px 150px 36px';

// ─── Review row ──────────────────────────────────────────────────────────────
function OBRow({ r, idx, showPartner, onAssign, onRemove }) {
  const missing = !r.code;
  const willCreate = r.code && !OB_COA.has(r.code);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: OB_COLS(showPartner),
      gap: 14, padding: '9px 18px', borderBottom: '1px solid var(--a-border)', alignItems: 'center',
      background: missing ? 'var(--a-neg-soft)' : 'transparent',
      boxShadow: missing ? 'inset 2px 0 0 var(--a-neg)' : 'none',
    }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--a-text-3)' }}>{idx}</div>

      {/* account picker — shows code · name; one subtle "new" badge, no repeated text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <select
          value={r.code || ''}
          onChange={(e) => onAssign(r.id, e.target.value)}
          style={{
            flex: 1, minWidth: 0, height: 34, padding: '0 10px', borderRadius: 7, fontFamily: 'inherit', fontSize: 13,
            border: missing ? '1px solid var(--a-neg)' : '1px solid var(--a-border)',
            background: 'var(--a-surface)', color: missing ? 'var(--a-neg)' : 'var(--a-text)', cursor: 'pointer',
          }}>
          <option value="">{missing ? 'Select account…' : ''}</option>
          {willCreate && <option value={r.code}>{r.code} · {r.name}</option>}
          {(window.DATA ? DATA.accounts : []).map((a) => (
            <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
          ))}
        </select>
        {missing && (
          <span style={{ color: 'var(--a-accent)', cursor: 'pointer', fontWeight: 500, fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0 }}>+ New</span>
        )}
        {willCreate && (
          <span title="New account — created on confirm" style={{
            flexShrink: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--a-warn)', background: 'var(--a-warn-soft)', border: '1px solid #e8d3a8',
            padding: '2px 7px', borderRadius: 5,
          }}>New</span>
        )}
      </div>

      {showPartner && (
        <select defaultValue="" style={{ height: 34, padding: '0 8px', borderRadius: 7, fontFamily: 'inherit', fontSize: 12.5, border: '1px solid var(--a-border)', background: 'var(--a-surface)', color: 'var(--a-text-2)', minWidth: 0 }}>
          <option value="">Optional</option>
          {(window.DATA ? DATA.partners.slice(0, 6) : []).map((p) => <option key={p.code}>{p.name}</option>)}
        </select>
      )}

      <div style={{ fontSize: 12.5, color: 'var(--a-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</div>

      {/* side toggle */}
      <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--a-border)' }}>
        {['D', 'C'].map((s) => (
          <span key={s} style={{
            padding: '5px 0', width: 30, textAlign: 'center', fontSize: 12, fontWeight: 600, fontFamily: 'Geist Mono, monospace',
            background: r.side === s ? (s === 'D' ? 'var(--a-text)' : 'var(--a-text-2)') : 'transparent',
            color: r.side === s ? '#fff' : 'var(--a-text-3)', cursor: 'pointer',
          }}>{s}</span>
        ))}
      </div>

      <div className="mono tnum" style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: 'var(--a-text)' }}>{r.amount.toFixed(2)}</div>

      <button onClick={() => onRemove(r.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--a-text-3)', display: 'grid', placeItems: 'center', padding: 4 }}>
        <I.trash size={14} />
      </button>
    </div>
  );
}

function OBMeta({ label, value, mono, icon, grow }) {
  return (
    <div style={{ flex: grow ? 1 : 'none', minWidth: 150 }}>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 5, fontSize: 10 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '8px 11px', border: '1px solid var(--a-border)', borderRadius: 7, background: 'var(--a-surface)',
        fontSize: 13.5,
      }}>
        <span className={mono ? 'mono' : ''} style={{ color: 'var(--a-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        {icon && <span style={{ color: 'var(--a-text-3)' }}>{icon}</span>}
      </div>
    </div>
  );
}

function OBTotal({ label, value }) {
  return (
    <div>
      <div className="micro" style={{ color: 'var(--a-text-3)', fontSize: 10 }}>{label}</div>
      <div className="mono tnum" style={{ fontSize: 17, fontWeight: 600, color: 'var(--a-text)' }}>€{value.toFixed(2)}</div>
    </div>
  );
}

// ─── Balance summary strip ────────────────────────────────────────────────────
function OBBalanceSummary({ rows, missing }) {
  const typeOf = (code) => (window.DATA ? DATA.accounts.find((a) => a.code === code) : null)?.type;
  const sumType = (t) => rows.filter((r) => typeOf(r.code) === t).reduce((s, r) => s + (r.side === 'D' ? r.amount : -r.amount), 0);
  const assets = sumType('asset');
  const liab = -sumType('liability');
  const equity = -sumType('equity');
  const check = assets - liab - equity;
  const ok = Math.abs(check) < 0.005 && missing === 0;
  const cells = [
    { label: 'Total assets', value: assets, tone: 'var(--a-text)' },
    { label: 'Total liabilities', value: liab, tone: 'var(--a-text)' },
    { label: 'Total equity', value: equity, tone: 'var(--a-text)' },
    { label: 'Balance check', value: ok ? 0 : check, tone: ok ? 'var(--a-pos)' : 'var(--a-neg)', check: true, ok },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      <div className="micro" style={{ color: 'var(--a-text-3)', marginBottom: 8 }}>Balance sheet summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {cells.map((c) => (
          <div key={c.label} style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 9, padding: '12px 14px' }}>
            <div className="micro" style={{ color: 'var(--a-text-3)', fontSize: 10 }}>{c.label}</div>
            <div className="mono tnum" style={{ fontSize: 18, fontWeight: 600, color: c.tone, marginTop: 6 }}>
              {c.check && c.ok ? '€0.00 ✓' : `€${Math.abs(c.value).toFixed(2)}`}
            </div>
          </div>
        ))}
      </div>
      {missing > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--a-text-3)' }}>{missing} row(s) without an account are excluded from this summary.</div>
      )}
    </div>
  );
}

// ─── Preview step ──────────────────────────────────────────────────────────────
function OBPreview({ rows, debit, credit, onBack }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <I.eye size={16} style={{ color: 'var(--a-accent)' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--a-text)' }}>Preview · this is exactly what will be posted</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--a-text-2)', marginBottom: 16 }}>Backend-normalized opening entry with resolved accounts. Editing after preview re-validates before you can confirm.</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <OBPreviewTotal label="Debit total" value={debit} />
        <OBPreviewTotal label="Credit total" value={credit} />
        <div style={{ flex: 1, background: 'var(--a-pos-soft)', border: '1px solid #b9dccb', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <I.check size={18} style={{ color: 'var(--a-pos)' }} />
          <div>
            <div className="micro" style={{ color: 'var(--a-pos)', fontSize: 10 }}>Status</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--a-pos)' }}>Balanced · ready to post</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--a-border)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-text-3)' }}>Normalized lines · {rows.length}</div>
        {rows.map((r) => {
          const willCreate = r.code && !OB_COA.has(r.code);
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 200px', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--a-border)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--a-text-2)', background: 'var(--a-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{r.code}</span>
                <span style={{ fontSize: 13.5, color: 'var(--a-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                {willCreate && <span style={{ fontSize: 10.5, color: 'var(--a-warn)', flexShrink: 0 }}>new</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--a-text-3)' }}>—</div>
              <div className="mono tnum" style={{ textAlign: 'right', fontSize: 13 }}>
                <span style={{ color: r.side === 'D' ? 'var(--a-text)' : 'var(--a-text-3)' }}>D {r.side === 'D' ? r.amount.toFixed(2) : '0.00'}</span>
                <span style={{ color: 'var(--a-text-3)' }}> / </span>
                <span style={{ color: r.side === 'C' ? 'var(--a-text)' : 'var(--a-text-3)' }}>C {r.side === 'C' ? r.amount.toFixed(2) : '0.00'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OBPreviewTotal({ label, value }) {
  return (
    <div style={{ flex: 1, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, padding: '14px 18px' }}>
      <div className="micro" style={{ color: 'var(--a-text-3)', fontSize: 10 }}>{label}</div>
      <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, color: 'var(--a-text)', marginTop: 4 }}>€{value.toFixed(2)}</div>
    </div>
  );
}

// ─── History drawer (was a permanent right column) ────────────────────────────
function OBHistoryDrawer({ onClose }) {
  const batches = [
    { mode: 'General', date: '2026-04-30', cur: 'EUR', link: 'JE-2026-0004' },
    { mode: 'General', date: '2026-04-30', cur: 'EUR', link: null },
    { mode: 'Receivables', date: '2026-04-30', cur: 'EUR', link: 'JE-2026-0003' },
    { mode: 'Payables', date: '2026-04-30', cur: 'EUR', link: 'JE-2026-0002' },
    { mode: 'General', date: '2026-01-01', cur: 'EUR', link: 'JE-2026-0001' },
    { mode: 'General', date: '2025-01-01', cur: 'EUR', link: 'JE-2025-0001' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.28)', display: 'flex', justifyContent: 'flex-end', zIndex: 40 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 380, height: '100%', background: 'var(--a-surface)', borderLeft: '1px solid var(--a-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--a-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--a-text)' }}>Recent batches</div>
            <div style={{ fontSize: 12, color: 'var(--a-text-3)' }}>Previously confirmed opening batches</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--a-text-2)', padding: 4 }}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {batches.map((b, i) => (
            <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--a-border)', borderRadius: 9, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="micro" style={{ color: 'var(--a-text-2)', background: 'var(--a-surface-2)', padding: '2px 7px', borderRadius: 4, fontSize: 10 }}>{b.mode.toUpperCase()}</span>
                <span style={{ fontSize: 11.5, color: 'var(--a-accent)', cursor: 'pointer', fontWeight: 500 }}>Reset</span>
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-text)', marginTop: 8 }}>{b.date}</div>
              <div style={{ fontSize: 12, color: 'var(--a-text-3)', marginTop: 2 }}>
                {b.cur} · {b.link
                  ? <span style={{ color: 'var(--a-accent)', cursor: 'pointer' }}>{b.link} →</span>
                  : <span>journal link pending</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// spinner keyframes
(() => {
  if (document.getElementById('ob-spin-css')) return;
  const s = document.createElement('style');
  s.id = 'ob-spin-css';
  s.textContent = '@keyframes ob-spin{to{transform:rotate(360deg)}} .ob-spin{animation:ob-spin 0.8s linear infinite}';
  document.head.appendChild(s);
})();

Object.assign(window, { OpeningBalancesA });
