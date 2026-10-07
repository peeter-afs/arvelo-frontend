'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Download, FlaskConical, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { demoApi, type DemoSampleKind, type DemoStatus } from '@/lib/api/demo.api';
import { getErrorMessage } from '@/lib/api/client';

const DEMO_DOMAIN = '@demo.arvelo.ee';
const FILES: Array<{ kind: DemoSampleKind; step: string }> = [
  { kind: 'bilanss', step: 'stepYearEnd' },
  { kind: 'kaibeandmik', step: 'stepTurnover' },
  { kind: 'ostjad', step: 'stepOpenItems' },
  { kind: 'tarnijad', step: 'stepOpenItems' },
  { kind: 'kontroll', step: 'stepControl' },
];

const formatDate = (iso: string) => iso.split('-').reverse().join('.');

/** Demo only: sample exports "from the previous software" to try the opening balance import with. */
export function DemoSampleFiles() {
  const t = useTranslations('demo.samples');
  const email = useAuthStore((s) => s.user?.email);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const isDemo = Boolean(email?.toLowerCase().endsWith(DEMO_DOMAIN));
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [downloading, setDownloading] = useState<DemoSampleKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDemo) return;
    let cancelled = false;
    demoApi
      .status()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        // Informative only.
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const migration = status?.migration;
  if (!isDemo || !migration) return null;
  const inMigrationCompany = tenantName === migration.company;

  const download = async (kind: DemoSampleKind) => {
    setError(null);
    setDownloading(kind);
    try {
      await demoApi.downloadSample(kind);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section
      className="rounded-[12px] border px-5 py-4"
      style={{ borderColor: 'var(--a-info, #0369a1)', background: 'var(--a-info-soft, #e0f2fe)' }}
    >
      <h2 className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--a-info, #0369a1)' }}>
        <FlaskConical className="h-4 w-4" />
        {t('title')}
      </h2>
      <p className="mt-1.5 text-[12.5px] text-[var(--a-text-2)]">
        {inMigrationCompany
          ? t('body', { yearEnd: formatDate(migration.year_end_date), transition: formatDate(migration.transition_date) })
          : t('otherCompany', { company: migration.company })}
      </p>
      {inMigrationCompany ? (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {FILES.map(({ kind, step }) => (
            <li key={kind}>
              <button
                type="button"
                onClick={() => void download(kind)}
                disabled={downloading !== null}
                className="flex w-full items-center gap-2 rounded-[8px] border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-left text-[12.5px] hover:border-[var(--primary)] disabled:opacity-60"
              >
                {downloading === kind ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />}
                <span className="min-w-0">
                  <span className="block font-medium text-[var(--a-text)]">{t(`files.${kind}`, { yearEnd: formatDate(migration.year_end_date), transition: formatDate(migration.transition_date) })}</span>
                  <span className="block text-[11.5px] text-[var(--a-text-3)]">{t(step)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Link href="/clients" className="mt-2 inline-block text-[12.5px] font-semibold text-[var(--primary)] hover:underline">
          {t('openClients')}
        </Link>
      )}
      {error && <p className="mt-2 text-[12px] text-[var(--a-neg)]">{error}</p>}
    </section>
  );
}
