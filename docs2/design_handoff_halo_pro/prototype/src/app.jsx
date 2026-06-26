// Mounts the design canvas with all artboards.
// Halo Pro is the committed direction. B (Quire) and C (Aktiv) are kept as
// reference / fallback at the bottom of the canvas.

const SCREEN_W = 1440;
const SCREEN_H = 920;
const TALL_H = 1080;

function App() {
  return (
    <DesignCanvas>
      {/* ── PRIMARY DIRECTION ─────────────────────────────────────────────── */}
      <DCSection
        id="hp-foundations"
        title="Halo Pro · the system"
        subtitle="Bone canvas + dark sidebar + coral accent + Geist Mono numerals. Light surfaces everywhere for 8h/day eye comfort, pro-tool moves (command bar, ⌘K, kbd shortcuts, terminal status footer, always-on detail pane) for speed."
      >
        <DCArtboard id="hp-fnd" label="Foundations" width={1200} height={780}>
          {window.FoundationsA && <FoundationsA />}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="hp-transactions"
        title="Transactions · the hero screen"
        subtitle="Where bookkeepers spend most of their time. Split-pane: list left, detail pane right, mono status footer."
      >
        <DCArtboard id="hp-tx" label="Transactions" width={SCREEN_W} height={TALL_H}>
          {window.TransactionsAP && <TransactionsAP />}
        </DCArtboard>
      </DCSection>

      <DCSection id="hp-tx-edit" title="Add / edit transaction" subtitle="Journal entry composer with double-entry validation, keyboard-first">
        <DCArtboard id="hp-txe" label="New journal entry" width={SCREEN_W} height={SCREEN_H}>
          {window.TransactionEditA && <TransactionEditA />}
        </DCArtboard>
      </DCSection>

      <DCSection id="hp-accounts" title="Chart of accounts" subtitle="Master list of every account, grouped by class with live balances">
        <DCArtboard id="hp-acc" label="Accounts" width={SCREEN_W} height={SCREEN_H}>
          {window.AccountsA && <AccountsA />}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="hp-opening"
        title="Opening balances · redesigned"
        subtitle="Clear Upload → Review → Confirm flow. Auto-parse on file select, full-width account pickers, the 'will be created' wall collapsed into one notice, a sticky always-visible action bar surfacing the blocking issue, and recent batches moved to an on-demand History drawer. Interactive — click 'Choose file' to walk the flow."
      >
        <DCArtboard id="hp-ob" label="Opening balances" width={SCREEN_W} height={TALL_H}>
          {window.OpeningBalancesA && <OpeningBalancesA />}
        </DCArtboard>
      </DCSection>

      <DCSection id="hp-invoices" title="Invoices" subtitle="Sales invoices with status pipeline">
        <DCArtboard id="hp-inv" label="Invoices" width={SCREEN_W} height={SCREEN_H}>
          {window.InvoicesA && <InvoicesA />}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="hp-recurring"
        title="Recurring invoices · schedules"
        subtitle="Invoice templates that auto-generate on a cadence. Split-pane: schedule list left, schedule detail right with an upcoming-runs timeline and generated history. Summary strip shows recurring revenue (MRR) and what's due in the next 30 days. Interactive — select a schedule, Pause/Resume it, and watch the summary recompute."
      >
        <DCArtboard id="hp-rec-ab" label="Recurring invoices" width={SCREEN_W} height={TALL_H}>
          {window.RecurringInvoicesA && <RecurringInvoicesA />}
        </DCArtboard>
      </DCSection>

      <DCSection id="hp-partners" title="Partners" subtitle="Customers, suppliers and employees, with detail pane on right">
        <DCArtboard id="hp-part" label="Partners" width={SCREEN_W} height={SCREEN_H}>
          {window.PartnersA && <PartnersA />}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="hp-bank"
        title="Bank reconciliation · the workbench"
        subtitle="Statement feed on the left, a per-line reconcile panel on the right. Full workflow: confirm a suggested match, categorize to an account (+ create a rule), split one line across accounts, or record a transfer. Interactive — click a line, switch tabs, hit Confirm to watch the progress bar move."
      >
        <DCArtboard id="hp-bank-ab" label="Bank reconciliation" width={SCREEN_W} height={TALL_H}>
          {window.BankReconcileA && <BankReconcileA />}
        </DCArtboard>
      </DCSection>

      {/* ── REFERENCE / ALTERNATIVES ──────────────────────────────────────── */}
      <DCSection
        id="alts-foundations"
        title="Alternatives · for reference"
        subtitle="Earlier directions kept for comparison. Halo Pro borrows their strongest moves (C's command bar + status line + detail pane) onto A's calmer surface."
      >
        <DCArtboard id="alt-b-fnd" label="B · Quire · editorial" width={960} height={780}>
          {window.FoundationsB && <FoundationsB />}
        </DCArtboard>
        <DCArtboard id="alt-c-fnd" label="C · Aktiv · dark pro-tool" width={960} height={780}>
          {window.FoundationsC && <FoundationsC />}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="alts-tx"
        title="Alternatives · transactions"
        subtitle="The hero screen across other directions"
      >
        <DCArtboard id="alt-a-tx" label="A · Halo · original" width={SCREEN_W} height={TALL_H}>
          {window.TransactionsA && <TransactionsA />}
        </DCArtboard>
        <DCArtboard id="alt-b-tx" label="B · Quire" width={SCREEN_W} height={TALL_H}>
          {window.TransactionsB && <TransactionsB />}
        </DCArtboard>
        <DCArtboard id="alt-c-tx" label="C · Aktiv" width={SCREEN_W} height={TALL_H}>
          {window.TransactionsC && <TransactionsC />}
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// Placeholder for screens still to be built — render an "in progress" panel.
function Stub({ title }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', color: '#999', fontFamily: 'Inter, sans-serif',
      flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 12 }}>building next…</div>
    </div>
  );
}

['TransactionEditA','TransactionEditB','TransactionEditC',
 'AccountsA','AccountsB','AccountsC',
 'InvoicesA','InvoicesB','InvoicesC',
 'PartnersA','PartnersB','PartnersC',
 'FoundationsA','FoundationsB','FoundationsC',
 'TransactionsA','TransactionsB','TransactionsC','TransactionsAP',
 'OpeningBalancesA','BankReconcileA','RecurringInvoicesA']
  .forEach((name) => {
    if (!window[name]) window[name] = () => <Stub title={name} />;
  });

// ─── Tweaks ───────────────────────────────────────────────────────────────

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "accentA": "#ff4e2c",
  "accentB": "#5a1e3a",
  "accentC": "#c5f02c",
  "monoC": "Geist Mono"
}/*EDITMODE-END*/;

const ACCENT_A_OPTIONS = [
  '#ff4e2c',   // electric coral (default)
  '#6b4eff',   // violet
  '#0a0a0a',   // pure ink (mono accent)
  '#c19a4d',   // muted gold
];
const ACCENT_B_OPTIONS = [
  '#5a1e3a',   // deep plum (default)
  '#2f5340',   // forest
  '#1f3d5c',   // deep navy
  '#7a3b1f',   // chestnut
];
const ACCENT_C_OPTIONS = [
  '#c5f02c',   // acid lime (default)
  '#ff2c7a',   // hot pink
  '#00d4ff',   // electric cyan
  '#ff5500',   // vermilion
];

function applyTweaks(t) {
  const r = document.documentElement.style;
  // A · Halo / Halo Pro
  r.setProperty('--a-accent',         t.accentA);
  r.setProperty('--a-accent-soft',    accentSoft(t.accentA, 0.92));
  r.setProperty('--a-accent-soft-2',  accentSoft(t.accentA, 0.97));
  r.setProperty('--a-accent-on',      contrastOn(t.accentA));
  // B · Quire
  r.setProperty('--b-accent',         t.accentB);
  r.setProperty('--b-accent-soft',    accentSoft(t.accentB, 0.92));
  r.setProperty('--b-accent-on',      contrastOn(t.accentB, '#f6f0e6'));
  // C · Aktiv
  r.setProperty('--c-accent',         t.accentC);
  r.setProperty('--c-accent-soft',    `rgba(${hexToRgb(t.accentC).join(',')},0.14)`);
  r.setProperty('--c-accent-on',      contrastOn(t.accentC));
  // Mono font — global, so Halo Pro picks it up too
  const mono = t.monoC || 'Geist Mono';
  r.setProperty('--mono-a', `"${mono}"`);
  r.setProperty('--mono-b', `"${mono}"`);
  r.setProperty('--mono-c', `"${mono}"`);

  if (t.density === 'compact') {
    document.body.classList.add('density-compact');
  } else {
    document.body.classList.remove('density-compact');
  }
}

function hexToRgb(hex) {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
function accentSoft(hex, mix = 0.92) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * mix)}, ${Math.round(g + (255 - g) * mix)}, ${Math.round(b + (255 - b) * mix)})`;
}
function contrastOn(hex, lightFallback = '#ffffff') {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0a0a0a' : lightFallback;
}

(() => {
  if (document.getElementById('density-css')) return;
  const s = document.createElement('style');
  s.id = 'density-css';
  s.textContent = `
    .density-compact .v-a [style*="padding: '11px 16px'"] { padding: 7px 14px !important; }
    .density-compact .v-b [style*="padding: '12px 0'"] { padding-top: 8px !important; padding-bottom: 8px !important; }
  `;
  document.head.appendChild(s);
})();

function AppShell() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(t); }, [t]);

  return (
    <>
      <App />
      <TweaksPanel title="Tweaks">
        <TweakSection label="Halo Pro accent">
          <TweakColor
            label="Accent"
            value={t.accentA}
            options={ACCENT_A_OPTIONS}
            onChange={(v) => setTweak('accentA', v)}
          />
        </TweakSection>
        <TweakSection label="Numerals">
          <TweakSelect
            label="Mono font"
            value={t.monoC}
            options={['Geist Mono', 'IBM Plex Mono', 'JetBrains Mono']}
            onChange={(v) => setTweak('monoC', v)}
          />
        </TweakSection>
        <TweakSection label="Density">
          <TweakRadio
            label="Row density"
            value={t.density}
            options={['comfortable', 'compact']}
            onChange={(v) => setTweak('density', v)}
          />
        </TweakSection>
        <TweakSection label="Alternative accents (reference)">
          <TweakColor
            label="B · Quire"
            value={t.accentB}
            options={ACCENT_B_OPTIONS}
            onChange={(v) => setTweak('accentB', v)}
          />
          <TweakColor
            label="C · Aktiv"
            value={t.accentC}
            options={ACCENT_C_OPTIONS}
            onChange={(v) => setTweak('accentC', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppShell />);
