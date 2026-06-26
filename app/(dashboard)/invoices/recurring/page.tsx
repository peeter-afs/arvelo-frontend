'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Play, Pause, Trash2, X, RefreshCw, FileText, Calendar,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  recurringInvoicesApi,
  type RecurringTemplate,
  type TemplateLine,
  type TemplateRun,
  type BillingMode,
} from '@/lib/api/recurringInvoices.api';
import { accountingApi, type PartnerOption, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Kbd } from '@/components/ui/Kbd';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';

// ─── Pure helpers (no Date.now() in render) ─────────────────────────────────

function fmtEUR(n: number): string {
  return '€' + n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function daysUntil(isoDate: string, today: string): number {
  const a = new Date(isoDate).getTime();
  const b = new Date(today).getTime();
  return Math.round((a - b) / 86400000);
}

function formatDateDisplay(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function formatDateLong(iso: string): string {
  if (!iso) return '—';
  return formatDateDisplay(iso);
}

function lineTotal(lines: TemplateLine[]): number {
  return (lines || []).reduce((s, l) => s + l.quantity * l.unit_price, 0);
}

/** MRR coefficient per frequency */
const MRR_COEFF: Record<string, number> = {
  weekly: 4.33,
  monthly: 1,
  quarterly: 0.33,
  yearly: 0.083,
};

function computeMRR(templates: RecurringTemplate[]): number {
  return templates
    .filter(t => t.is_active)
    .reduce((s, t) => {
      const total = lineTotal(t.lines ?? []);
      const coeff = MRR_COEFF[t.frequency] ?? 1;
      return s + total * coeff;
    }, 0);
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function freqLabel(tmpl: RecurringTemplate, t: (k: string) => string): string {
  switch (tmpl.frequency) {
    case 'weekly': return t('weekly');
    case 'monthly': return t('monthly');
    case 'quarterly': return t('quarterly');
    case 'yearly': return t('yearly');
    default: return tmpl.frequency;
  }
}

function freqPer(tmpl: RecurringTemplate): string {
  switch (tmpl.frequency) {
    case 'weekly': return '/wk';
    case 'monthly': return '/mo';
    case 'quarterly': return '/qtr';
    case 'yearly': return '/yr';
    default: return '';
  }
}

function computeUpcoming(tmpl: RecurringTemplate, count = 3): string[] {
  if (!tmpl.is_active || !tmpl.next_invoice_date) return [];
  const out: string[] = [];
  let cur = tmpl.next_invoice_date;
  for (let i = 0; i < count; i++) {
    out.push(cur);
    switch (tmpl.frequency) {
      case 'weekly':
        cur = addDays(cur, 7 * tmpl.interval_count);
        break;
      case 'monthly':
        cur = addMonths(cur, tmpl.interval_count);
        break;
      case 'quarterly':
        cur = addMonths(cur, 3 * tmpl.interval_count);
        break;
      case 'yearly':
        cur = addYears(cur, tmpl.interval_count);
        break;
    }
  }
  return out;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function RecAvatar({ name, size = 26 }: { name: string; size?: number }) {
  const hue = hueFromName(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        flexShrink: 0,
        background: `oklch(0.92 0.04 ${hue})`,
        color: `oklch(0.34 0.08 ${hue})`,
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Summary strip stat ───────────────────────────────────────────────────────

function RecStat({
  label,
  value,
  sub,
  tone,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'warning';
  accent?: boolean;
}) {
  const color = accent
    ? 'var(--a-accent)'
    : tone === 'warning'
    ? 'var(--a-warn)'
    : 'var(--a-text)';
  return (
    <div style={{ paddingRight: 24 }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--a-text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        className="font-mono tabular-nums"
        style={{
          marginTop: 7,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--a-text-3)' }}>{sub}</div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

type TabId = 'active' | 'paused' | 'all';

export default function RecurringInvoicesPage() {
  const t = useTranslations('recurring');
  const tc = useTranslations('common');

  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ generated: number; errors: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('active');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tpl, p, a] = await Promise.all([
        recurringInvoicesApi.list(),
        accountingApi.getPartners(),
        accountingApi.getAccounts(),
      ]);
      setTemplates(tpl);
      setPartners(p);
      setAccounts(a);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = useCallback(
    async (template: RecurringTemplate) => {
      try {
        await recurringInvoicesApi.update(template.id, { is_active: !template.is_active });
        fetchData();
      } catch { /* ignore */ }
    },
    [fetchData],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await recurringInvoicesApi.delete(id);
        if (selectedId === id) setSelectedId(null);
        fetchData();
      } catch { /* ignore */ }
    },
    [fetchData, selectedId],
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await recurringInvoicesApi.generateDue();
      setGenResult(result);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const getPartnerName = useCallback(
    (id: string | null): string => {
      if (!id) return '—';
      return partners.find(p => p.id === id)?.name || id.slice(0, 8);
    },
    [partners],
  );

  // Derived metrics (always from ALL templates regardless of tab)
  const activeTemplates = templates.filter(t => t.is_active);
  const pausedCount = templates.filter(t => !t.is_active).length;
  const mrr = computeMRR(templates);
  const todayStr = todayISO();
  const in30 = addDays(todayStr, 30);
  const dueSoon = activeTemplates.filter(
    t => t.next_invoice_date && t.next_invoice_date <= in30,
  );
  const autoSendCount = activeTemplates.filter(t => t.billing_mode !== 'per_quantity').length;

  // Tab filtering
  const tabCounts = {
    active: activeTemplates.length,
    paused: pausedCount,
    all: templates.length,
  };
  const visible =
    tab === 'all'
      ? templates
      : tab === 'active'
      ? activeTemplates
      : templates.filter(t => !t.is_active);

  // Keyboard navigation
  const visibleIds = visible.map(t => t.id);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const idx = selectedId ? visibleIds.indexOf(selectedId) : -1;
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const next = idx < visibleIds.length - 1 ? visibleIds[idx + 1] : visibleIds[0];
        if (next) setSelectedId(next);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const prev = idx > 0 ? visibleIds[idx - 1] : visibleIds[visibleIds.length - 1];
        if (prev) setSelectedId(prev);
      } else if ((e.key === 'p' || e.key === 'P') && selectedId) {
        e.preventDefault();
        const tmpl = templates.find(t => t.id === selectedId);
        if (tmpl) handleToggle(tmpl);
      } else if ((e.key === 'e' || e.key === 'E') && selectedId) {
        e.preventDefault();
        setShowCreate(true);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowCreate(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, visibleIds, templates]);

  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null;

  if (loading) return <PageSkeleton hasStats={false} tableRows={4} tableColumns={4} />;

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--a-text)' }}
          >
            {t('title')}
          </h1>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'active', label: t('active') },
    { id: 'paused', label: t('paused') },
    { id: 'all', label: 'All schedules' },
  ];

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: 0 }}>
      {/* ── Summary strip ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          borderBottom: '1px solid var(--a-border)',
          paddingBottom: 18,
          marginBottom: 0,
        }}
      >
        <RecStat
          label={t('mrr')}
          value={fmtEUR(mrr)}
          sub={`${activeTemplates.length} ${t('activeSchedules')}`}
          accent
        />
        <RecStat
          label={t('dueNext30')}
          value={String(dueSoon.length)}
          sub={t('invoicesToIssue')}
        />
        <RecStat
          label={t('autoSend')}
          value={`${autoSendCount}/${activeTemplates.length}`}
          sub={t('issueWithoutReview')}
        />
        <RecStat
          label={t('paused')}
          value={String(pausedCount)}
          sub={t('notGenerating')}
          tone={pausedCount > 0 ? 'warning' : undefined}
        />
      </div>

      {/* ── Tabs + actions bar ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '12px 0 0 0',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tabs.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                padding: '5px 11px',
                borderRadius: 6,
                cursor: 'pointer',
                background: tb.id === tab ? 'var(--a-text)' : 'transparent',
                color: tb.id === tab ? '#fff' : 'var(--a-text-2)',
                fontSize: 12.5,
                fontWeight: 500,
                border: 'none',
              }}
            >
              {tb.label}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: tb.id === tab ? 'rgba(255,255,255,0.55)' : 'var(--a-text-3)',
                }}
              >
                {tabCounts[tb.id]}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Keyboard hints */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              color: 'var(--a-text-3)',
            }}
          >
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
            {' navigate · '}
            <Kbd>P</Kbd>
            {' pause · '}
            <Kbd>E</Kbd>
            {' edit'}
          </span>

          {/* Generate due button */}
          <Button variant="default" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {t('generateNow')}
          </Button>

          {/* New template */}
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t('newTemplate')}
            <Kbd inverse>N</Kbd>
          </Button>
        </div>
      </div>

      {/* Generate result banner */}
      {genResult && (
        <div
          className="mb-3 rounded-lg p-3 text-sm"
          style={{ borderLeft: '3px solid var(--a-pos)', background: 'var(--a-pos-soft)', color: 'var(--a-text)' }}
        >
          {t('generatedResult', { generated: genResult.generated, errors: genResult.errors })}
          {genResult.generated > 1 && (
            <span className="ml-2" style={{ color: 'var(--a-text-2)' }}>
              {t('catchUpNote')}
            </span>
          )}
        </div>
      )}

      {/* ── Split pane ─────────────────────────────────────────────── */}
      <div
        ref={listRef}
        style={{
          display: 'flex',
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT — list */}
        <div
          style={{
            flex: '1.55',
            minWidth: 0,
            background: 'var(--a-surface)',
            border: '1px solid var(--a-border)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* List header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 120px 130px',
              gap: 10,
              padding: '9px 16px',
              borderBottom: '1px solid var(--a-border)',
              background: 'var(--a-surface-2)',
              fontSize: 10.5,
              color: 'var(--a-text-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            <div>{t('customerTemplate')}</div>
            <div>{t('cadence')}</div>
            <div>{t('nextIssue')}</div>
            <div style={{ textAlign: 'right' }}>{tc('amount')}</div>
          </div>

          {/* List rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: 'var(--a-text-3)',
                  fontSize: 13,
                }}
              >
                {t('noTemplates')}
              </div>
            ) : (
              visible.map(tmpl => (
                <RecRow
                  key={tmpl.id}
                  tmpl={tmpl}
                  selected={tmpl.id === selectedId}
                  today={todayStr}
                  getPartnerName={getPartnerName}
                  onSelect={() => setSelectedId(tmpl.id)}
                  t={t}
                />
              ))
            )}
          </div>

          {/* List footer */}
          <div
            className="font-mono tabular-nums"
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--a-border)',
              background: 'var(--a-surface-2)',
              display: 'flex',
              gap: 14,
              fontSize: 11,
              color: 'var(--a-text-3)',
            }}
          >
            <span>
              <span style={{ color: 'var(--a-text-2)' }}>{visible.length}</span> {t('shown')}
            </span>
            <span>
              MRR{' '}
              <span style={{ color: 'var(--a-accent)' }}>{fmtEUR(mrr)}</span>
            </span>
          </div>
        </div>

        {/* RIGHT — detail pane */}
        <RecDetailPane
          template={selectedTemplate}
          getPartnerName={getPartnerName}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={() => setShowCreate(true)}
          t={t}
          tc={tc}
          onRefresh={fetchData}
        />
      </div>

      {/* Create / Edit modal */}
      {showCreate && (
        <CreateTemplateModal
          partners={partners}
          accounts={accounts}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchData();
          }}
          t={t}
          tc={tc}
        />
      )}
    </div>
  );
}

// ─── List row ────────────────────────────────────────────────────────────────

function RecRow({
  tmpl,
  selected,
  today,
  getPartnerName,
  onSelect,
  t,
}: {
  tmpl: RecurringTemplate;
  selected: boolean;
  today: string;
  getPartnerName: (id: string | null) => string;
  onSelect: () => void;
  t: (k: string) => string;
}) {
  const paused = !tmpl.is_active;
  const partnerName = getPartnerName(tmpl.partner_id);
  const displayName = tmpl.partner_id ? partnerName : tmpl.name;
  const subName = tmpl.partner_id ? tmpl.name : '';
  const avatarName = displayName || tmpl.name;

  const days =
    !paused && tmpl.next_invoice_date ? daysUntil(tmpl.next_invoice_date, today) : null;
  const soon = days !== null && days <= 7;
  const isAutoSend = tmpl.billing_mode !== 'per_quantity';
  const total = lineTotal(tmpl.lines ?? []);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 120px 130px',
        gap: 10,
        padding: '11px 16px',
        borderBottom: '1px solid var(--a-border)',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: 13,
        background: selected ? 'var(--a-accent-soft-2)' : 'transparent',
        boxShadow: selected ? 'inset 2px 0 0 var(--a-accent)' : 'none',
        opacity: paused ? 0.6 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--a-surface-2)';
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Col 1: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <RecAvatar name={avatarName} size={26} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: 'var(--a-text)',
              fontWeight: 500,
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </div>
          {subName && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--a-text-3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subName}
            </div>
          )}
        </div>
      </div>

      {/* Col 2: cadence chip */}
      <div>
        <div style={{ fontSize: 11.5, color: 'var(--a-text-2)' }}>
          {t(tmpl.frequency as 'weekly' | 'monthly' | 'quarterly' | 'yearly')}
        </div>
        {isAutoSend ? (
          <div style={{ fontSize: 10.5, color: 'var(--a-pos)', marginTop: 2 }}>
            {t('autoSends')}
          </div>
        ) : (
          <div style={{ fontSize: 10.5, color: 'var(--a-text-3)', marginTop: 2 }}>
            {t('manual')}
          </div>
        )}
      </div>

      {/* Col 3: next issue date */}
      <div>
        {paused ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--a-warn)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <Pause
              style={{ display: 'inline', width: 11, height: 11 }}
            />
            {t('paused')}
          </span>
        ) : (
          <>
            <div
              className="font-mono tabular-nums"
              style={{ fontSize: 12.5, color: 'var(--a-text)' }}
            >
              {tmpl.next_invoice_date ? formatDateDisplay(tmpl.next_invoice_date) : '—'}
            </div>
            {days !== null && (
              <div
                style={{
                  fontSize: 10.5,
                  color: soon ? 'var(--a-accent)' : 'var(--a-text-3)',
                  marginTop: 1,
                }}
              >
                {days === 0 ? t('today') : days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`}
              </div>
            )}
          </>
        )}
      </div>

      {/* Col 4: amount */}
      <div
        className="font-mono tabular-nums"
        style={{
          textAlign: 'right',
          fontWeight: 600,
          fontSize: 13.5,
          color: 'var(--a-text)',
        }}
      >
        €{fmt(total)}
        <span
          style={{ fontSize: 10.5, color: 'var(--a-text-3)', fontWeight: 400 }}
        >
          {freqPer(tmpl)}
        </span>
      </div>
    </div>
  );
}

// ─── Detail pane ─────────────────────────────────────────────────────────────

function RecDetailPane({
  template,
  getPartnerName,
  onToggle,
  onDelete,
  onEdit,
  t,
  tc,
  onRefresh,
}: {
  template: RecurringTemplate | null;
  getPartnerName: (id: string | null) => string;
  onToggle: (tmpl: RecurringTemplate) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  t: (k: string) => string;
  tc: (k: string) => string;
  onRefresh: () => void;
}) {
  if (!template) {
    return (
      <div
        style={{
          width: 400,
          flexShrink: 0,
          background: 'var(--a-surface)',
          borderRadius: 10,
          border: '1px solid var(--a-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: 'var(--a-text-3)',
          fontSize: 13,
        }}
      >
        <Calendar style={{ width: 28, height: 28, opacity: 0.4 }} />
        {t('noScheduleSelected')}
      </div>
    );
  }

  const paused = !template.is_active;
  const partnerName = getPartnerName(template.partner_id);
  const displayName = template.partner_id ? partnerName : template.name;
  const subName = template.partner_id ? template.name : '';
  const avatarName = displayName || template.name;
  const total = lineTotal(template.lines ?? []);
  const isAutoSend = template.billing_mode !== 'per_quantity';
  const isPerQty = template.billing_mode === 'per_quantity';

  // VAT breakdown: use last line's tax_rate, or 0
  const avgTaxRate = (template.lines ?? []).length > 0
    ? (template.lines ?? []).reduce((s, l) => s + l.tax_rate, 0) / (template.lines ?? []).length
    : 0;
  const net = avgTaxRate > 0 ? total / (1 + avgTaxRate / 100) : total;
  const vatAmt = total - net;

  const upcoming = computeUpcoming(template, 3);

  return (
    <div
      style={{
        width: 400,
        flexShrink: 0,
        background: 'var(--a-surface)',
        borderRadius: 10,
        border: '1px solid var(--a-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{ padding: '16px 18px 14px 18px', borderBottom: '1px solid var(--a-border)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
          >
            <RecAvatar name={avatarName} size={30} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: 'var(--a-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </div>
              {subName && (
                <div style={{ fontSize: 12, color: 'var(--a-text-2)' }}>{subName}</div>
              )}
            </div>
          </div>
          <StatusPill tone={paused ? 'warning' : 'success'}>
            {paused ? t('paused') : t('active')}
          </StatusPill>
        </div>

        {/* Amount block */}
        <div
          className="font-mono tabular-nums"
          style={{
            marginTop: 14,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: 'var(--a-text)',
          }}
        >
          €{fmt(total)}
          <span
            style={{ fontSize: 14, color: 'var(--a-text-3)', fontWeight: 400 }}
          >
            {freqPer(template)}
          </span>
        </div>
        <div
          className="font-mono tabular-nums"
          style={{ fontSize: 12, color: 'var(--a-text-3)', marginTop: 3 }}
        >
          {avgTaxRate > 0 ? (
            <>
              <span>€{fmt(net)}</span> net + <span>€{fmt(vatAmt)}</span> VAT {Math.round(avgTaxRate)}%
            </>
          ) : (
            'VAT 0% · reverse charge'
          )}
        </div>
      </div>

      {/* Body: scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {/* Meta grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}
        >
          <RecMeta label={t('cadence')} value={freqLabel(template, t)} />
          <RecMeta
            label={t('delivery')}
            value={isAutoSend ? t('autoSend') : t('manual')}
            tone={isAutoSend ? 'pos' : undefined}
          />
          <RecMeta
            label={t('started')}
            value={formatDateLong(template.created_at?.slice(0, 10) ?? '')}
            mono
          />
          <RecMeta
            label={t('ends')}
            value={template.end_date ? formatDateLong(template.end_date) : '—'}
            mono={!!template.end_date}
          />
        </div>

        {/* Per-quantity form OR upcoming runs */}
        {isPerQty ? (
          <PerQuantitySection
            template={template}
            t={t}
            tc={tc}
            onRefresh={onRefresh}
          />
        ) : (
          <>
            {/* Upcoming runs */}
            <div
              style={{
                color: 'var(--a-text-3)',
                margin: '18px 0 10px',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              {t('upcoming')}
            </div>
            {paused ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  background: 'var(--a-warn-soft)',
                  borderRadius: 8,
                  padding: '11px 13px',
                  fontSize: 12.5,
                  color: 'var(--a-text-2)',
                }}
              >
                <Pause style={{ width: 15, height: 15, color: 'var(--a-warn)', flexShrink: 0 }} />
                Paused — no invoices will be generated until resumed.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 6 }}>
                {upcoming.map((d, i) => (
                  <div
                    key={d}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '7px 0',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          i === 0
                            ? 'var(--a-accent)'
                            : 'var(--a-surface-2)',
                        border: i === 0 ? 'none' : '1.5px solid var(--a-border-hover)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="font-mono tabular-nums"
                      style={{
                        fontSize: 13,
                        color: i === 0 ? 'var(--a-text)' : 'var(--a-text-2)',
                        fontWeight: i === 0 ? 600 : 400,
                        width: 90,
                      }}
                    >
                      {formatDateDisplay(d)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--a-text-3)' }}>
                      {i === 0
                        ? `next · ${isAutoSend ? 'auto-sends' : 'creates draft'}`
                        : 'scheduled'}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span
                      className="font-mono tabular-nums"
                      style={{ fontSize: 12, color: 'var(--a-text-3)' }}
                    >
                      €{fmt(total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Generated history */}
        <RunsSection templateId={template.id} billingMode={template.billing_mode} t={t} />
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--a-border)',
          background: 'var(--a-surface-2)',
          display: 'flex',
          gap: 8,
        }}
      >
        <Button
          variant="default"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => onToggle(template)}
        >
          {paused ? (
            <Play style={{ width: 13, height: 13 }} />
          ) : (
            <Pause style={{ width: 13, height: 13 }} />
          )}
          {paused ? t('activate') : t('pause')}
          <Kbd>P</Kbd>
        </Button>
        <Button
          variant="default"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={onEdit}
        >
          <FileText style={{ width: 13, height: 13 }} />
          {tc('edit')}
          <Kbd>E</Kbd>
        </Button>
        <Button
          variant="danger"
          style={{ width: 32, justifyContent: 'center', padding: 0 }}
          onClick={() => {
            if (window.confirm('Delete this template?')) onDelete(template.id);
          }}
          title={tc('delete')}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </Button>
      </div>
    </div>
  );
}

// ─── Meta cell ───────────────────────────────────────────────────────────────

function RecMeta({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'pos';
}) {
  return (
    <div>
      <div
        style={{
          color: 'var(--a-text-3)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        className={mono ? 'font-mono tabular-nums' : ''}
        style={{
          marginTop: 4,
          fontSize: 13,
          color: tone === 'pos' ? 'var(--a-pos)' : 'var(--a-text)',
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Generated history (runs) ─────────────────────────────────────────────────

function RunsSection({
  templateId,
  billingMode,
  t,
}: {
  templateId: string;
  billingMode: BillingMode;
  t: (k: string) => string;
}) {
  const [runs, setRuns] = useState<TemplateRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const data = await recurringInvoicesApi.listRuns(templateId);
      setRuns(data);
    } catch { /* ignore */ }
    setLoadingRuns(false);
  }, [templateId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const runStatusColor = (status: string): string => {
    if (status === 'generated') return 'var(--a-pos)';
    if (status === 'failed') return 'var(--a-neg)';
    return 'var(--a-text-3)';
  };

  const shown = runs.slice(0, 4);

  return (
    <>
      <div
        style={{
          color: 'var(--a-text-3)',
          margin: '18px 0 10px',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        {t('generatedHistory')} · {runs.length}
      </div>
      {loadingRuns ? (
        <div style={{ fontSize: 12, color: 'var(--a-text-3)' }}>Loading…</div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--a-text-3)' }}>{t('noPastRuns')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shown.map(run => {
            const color = runStatusColor(run.status);
            return (
              <div
                key={run.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 11px',
                  border: '1px solid var(--a-border)',
                  borderRadius: 7,
                }}
              >
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 11.5, color: 'var(--a-text-2)', fontWeight: 500 }}
                >
                  {run.period_start} → {run.period_end || run.invoice_date}
                </span>
                {billingMode === 'per_quantity' && run.quantity != null && (
                  <span style={{ fontSize: 11, color: 'var(--a-text-3)' }}>
                    ×{run.quantity}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'currentColor',
                    }}
                  />
                  {run.status}
                </span>
                {run.invoice_id ? (
                  <a
                    href={`/invoices/${run.invoice_id}`}
                    className="font-mono tabular-nums"
                    style={{ fontSize: 11.5, color: 'var(--a-accent)', fontWeight: 500 }}
                  >
                    View
                  </a>
                ) : run.error ? (
                  <span title={run.error} style={{ fontSize: 11.5, color: 'var(--a-neg)' }}>
                    Error
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Per-quantity section (in detail pane) ────────────────────────────────────

function PerQuantitySection({
  template,
  t,
  tc,
  onRefresh,
}: {
  template: RecurringTemplate;
  t: (k: string) => string;
  tc: (k: string) => string;
  onRefresh: () => void;
}) {
  const [genForm, setGenForm] = useState({
    period_start: '',
    period_end: '',
    quantity: '1',
    invoice_date: '',
  });
  const [genErr, setGenErr] = useState('');
  const [genSaving, setGenSaving] = useState(false);

  const inputStyle = {
    border: '1px solid var(--a-border)',
    color: 'var(--a-text)',
    backgroundColor: 'var(--a-surface)',
  };

  const submitPeriod = async () => {
    setGenSaving(true);
    setGenErr('');
    try {
      await recurringInvoicesApi.generatePeriod(template.id, {
        period_start: genForm.period_start,
        period_end: genForm.period_end,
        quantity: parseFloat(genForm.quantity) || undefined,
        invoice_date: genForm.invoice_date || undefined,
      });
      onRefresh();
      setGenForm({ period_start: '', period_end: '', quantity: '1', invoice_date: '' });
    } catch (e) {
      setGenErr(getErrorMessage(e));
    } finally {
      setGenSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          color: 'var(--a-text-3)',
          marginBottom: 10,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        {t('generatePeriod')}
      </div>
      <div
        style={{
          padding: '12px',
          borderRadius: 8,
          background: 'var(--a-surface-2)',
          border: '1px solid var(--a-border)',
        }}
      >
        <p style={{ fontSize: 11.5, color: 'var(--a-text-3)', marginBottom: 10 }}>
          {t('perQuantityHint')}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--a-text-3)', marginBottom: 3 }}>
              {t('periodStart')}
            </label>
            <input
              type="date"
              value={genForm.period_start}
              onChange={e => setGenForm(f => ({ ...f, period_start: e.target.value }))}
              className="rounded px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--a-text-3)', marginBottom: 3 }}>
              {t('periodEnd')}
            </label>
            <input
              type="date"
              value={genForm.period_end}
              onChange={e => setGenForm(f => ({ ...f, period_end: e.target.value }))}
              className="rounded px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--a-text-3)', marginBottom: 3 }}>
              {t('quantity')}
            </label>
            <input
              type="number"
              step="0.01"
              value={genForm.quantity}
              onChange={e => setGenForm(f => ({ ...f, quantity: e.target.value }))}
              className="rounded px-2 py-1.5 text-sm w-20"
              style={inputStyle}
            />
          </div>
          <button
            onClick={submitPeriod}
            disabled={genSaving || !genForm.period_start || !genForm.period_end}
            className="rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--a-accent)' }}
          >
            {genSaving ? tc('saving') : tc('create')}
          </button>
        </div>
        {genErr && (
          <p style={{ fontSize: 11.5, color: 'var(--a-neg)', marginTop: 8 }}>{genErr}</p>
        )}
      </div>
    </div>
  );
}

// ─── Create template modal ────────────────────────────────────────────────────

function CreateTemplateModal({
  partners,
  accounts,
  onClose,
  onCreated,
  t,
  tc,
}: {
  partners: PartnerOption[];
  accounts: AccountOption[];
  onClose: () => void;
  onCreated: () => void;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'sales_invoice' as const,
    partner_id: '',
    billing_mode: 'monthly' as BillingMode,
    interval_count: '1',
    day_of_month: '1',
    next_invoice_date: todayISO(),
    end_date: '',
    payment_terms_days: '14',
    notes: '',
    period_note_template: '',
  });
  const [lines, setLines] = useState([
    { description: '', account_id: '', quantity: '1', unit_price: '', tax_rate: '22' },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const upd = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const updLine = (i: number, k: string, v: string) => {
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  };

  const billingModeToFrequency = (
    mode: BillingMode,
  ): 'weekly' | 'monthly' | 'quarterly' | 'yearly' => {
    switch (mode) {
      case 'quarterly':
        return 'quarterly';
      case 'yearly':
        return 'yearly';
      default:
        return 'monthly';
    }
  };

  const isCalendarMode = form.billing_mode !== 'per_quantity';

  // Live preview of period note tokens
  const previewPeriodNote = (() => {
    if (!form.period_note_template) return '';
    const now = new Date();
    const months = [
      'jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni',
      'juuli', 'august', 'september', 'oktoober', 'november', 'detsember',
    ];
    const m = months[now.getMonth()];
    const y = now.getFullYear();
    return form.period_note_template
      .replace(/\{period\}/gi, `${m} ${y}`)
      .replace(/\{month\}/gi, m)
      .replace(/\{year\}/gi, String(y))
      .replace(
        /\{period_start\}/gi,
        `${y}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      )
      .replace(
        /\{period_end\}/gi,
        `${y}-${String(now.getMonth() + 1).padStart(2, '0')}-28`,
      );
  })();

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await recurringInvoicesApi.create({
        name: form.name,
        type: form.type,
        partner_id: form.partner_id || undefined,
        frequency: billingModeToFrequency(form.billing_mode),
        interval_count: parseInt(form.interval_count) || 1,
        day_of_month: parseInt(form.day_of_month) || undefined,
        billing_mode: form.billing_mode,
        period_note_template: form.period_note_template || undefined,
        next_invoice_date: form.next_invoice_date,
        end_date: form.end_date || undefined,
        payment_terms_days: parseInt(form.payment_terms_days) || 14,
        notes: form.notes || undefined,
        lines: lines
          .filter(l => l.description && l.unit_price)
          .map(l => ({
            description: l.description,
            account_id: l.account_id || undefined,
            quantity: parseFloat(l.quantity) || 1,
            unit_price: parseFloat(l.unit_price),
            tax_rate: parseFloat(l.tax_rate) ?? 22,
          })),
      });
      onCreated();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: '1px solid var(--a-border)',
    color: 'var(--a-text)',
    backgroundColor: 'var(--a-surface)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          style={{ color: 'var(--a-text-3)' }}
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--a-text)' }}>
          {t('newTemplate')}
        </h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--a-text-2)' }}
              >
                {t('templateName')}
              </label>
              <input
                value={form.name}
                onChange={e => upd('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--a-text-2)' }}
              >
                {t('type')}
              </label>
              <select
                value={form.type}
                onChange={e => upd('type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="sales_invoice">{t('sales')}</option>
                <option value="purchase_invoice">{t('purchase')}</option>
              </select>
            </div>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--a-text-2)' }}
            >
              {tc('partner')}
            </label>
            <select
              value={form.partner_id}
              onChange={e => upd('partner_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            >
              <option value="">—</option>
              {partners
                .filter(p => p.is_active)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--a-text-2)' }}
              >
                {t('billingMode')}
              </label>
              <select
                value={form.billing_mode}
                onChange={e => upd('billing_mode', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="monthly">{t('monthly')}</option>
                <option value="quarterly">{t('quarterly')}</option>
                <option value="yearly">{t('yearly')}</option>
                <option value="per_quantity">{t('perQuantity')}</option>
              </select>
            </div>
            {isCalendarMode && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--a-text-2)' }}
                >
                  {t('interval')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.interval_count}
                  onChange={e => upd('interval_count', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--a-text-2)' }}
              >
                {t('paymentTerms')}
              </label>
              <input
                type="number"
                value={form.payment_terms_days}
                onChange={e => upd('payment_terms_days', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
          </div>
          {isCalendarMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--a-text-2)' }}
                >
                  {t('nextDate')}
                </label>
                <input
                  type="date"
                  value={form.next_invoice_date}
                  onChange={e => upd('next_invoice_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--a-text-2)' }}
                >
                  {t('endDate')}
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => upd('end_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
          {form.billing_mode === 'per_quantity' && (
            <p className="text-xs" style={{ color: 'var(--a-text-3)' }}>
              {t('perQuantityHint')}
            </p>
          )}

          {/* Period note template */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--a-text-2)' }}
            >
              {t('periodNoteTemplate')}
            </label>
            <textarea
              value={form.period_note_template}
              onChange={e => upd('period_note_template', e.target.value)}
              placeholder="{period} — e.g. Subscription — {period}"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
            <p className="text-xs mt-0.5" style={{ color: 'var(--a-text-3)' }}>
              {t('periodTokensHint')}
            </p>
            {previewPeriodNote && (
              <p className="text-xs mt-1" style={{ color: 'var(--a-text-2)' }}>
                Preview: <em>{previewPeriodNote}</em>
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--a-text-2)' }}
            >
              {tc('notes')}
            </label>
            <textarea
              value={form.notes}
              onChange={e => upd('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>

          {/* Lines */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--a-text-2)' }}
            >
              {t('lines')}
            </label>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-4">
                  <input
                    placeholder={tc('description')}
                    value={line.description}
                    onChange={e => updLine(i, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={line.account_id}
                    onChange={e => updLine(i, 'account_id', e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    {accounts
                      .filter(a => a.is_active)
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.code} – {a.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder={t('quantity')}
                    value={line.quantity}
                    onChange={e => updLine(i, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('price')}
                    value={line.unit_price}
                    onChange={e => updLine(i, 'unit_price', e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder={t('vatRate')}
                    value={line.tax_rate}
                    onChange={e => updLine(i, 'tax_rate', e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  {lines.length > 1 && (
                    <button
                      onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                      style={{ color: 'var(--a-neg)' }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                setLines(prev => [
                  ...prev,
                  { description: '', account_id: '', quantity: '1', unit_price: '', tax_rate: '22' },
                ])
              }
              className="text-sm mt-1"
              style={{ color: 'var(--a-accent)' }}
            >
              + {t('addLine')}
            </button>
          </div>

          {err && (
            <p className="text-sm" style={{ color: 'var(--a-neg)' }}>
              {err}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--a-border)', color: 'var(--a-text-2)' }}
            >
              {tc('cancel')}
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--a-accent)' }}
            >
              {saving ? tc('saving') : tc('create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
