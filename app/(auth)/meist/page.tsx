'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, MapPin, Building2 } from 'lucide-react';
import { COMPANY } from '@/lib/company';

export default function AboutPage() {
  const t = useTranslations('company');

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 [font-family:var(--font-display)]">{t('aboutTitle')}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-700">
        <p>{t('about1')}</p>
        <p>{t('about2')}</p>
        <p>{t('about3')}</p>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <div className="flex items-start gap-2.5">
          <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--primary)]" />
          <div>
            <div className="font-semibold text-slate-900">{COMPANY.name}</div>
            <div>{t('registryCode')} {COMPANY.registryCode}</div>
            <div>{t('vatNumber')} {COMPANY.vatNumber}</div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--primary)]" />
          <div>{COMPANY.address}</div>
        </div>
        {COMPANY.email && (
          <div className="mt-3 pl-6">
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-[var(--primary)] hover:underline">{COMPANY.email}</a>
          </div>
        )}
        {COMPANY.phone && (
          <div className="mt-1 pl-6">
            <a href={`tel:${COMPANY.phone.replace(/\s+/g, '')}`} className="font-medium text-[var(--primary)] hover:underline">{COMPANY.phone}</a>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 font-medium text-white hover:bg-[var(--primary-hover)]"
        >
          {t('tryDemo')}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/login" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-5 font-medium text-slate-800 hover:bg-slate-50">
          {t('signIn')}
        </Link>
      </div>
    </div>
  );
}
