'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { COMPANY } from '@/lib/company';

/** Who is behind Arvelo: name, codes, address and contact — for the public pages. */
export function CompanyInfo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const t = useTranslations('company');
  const muted = 'text-slate-500';
  const strong = variant === 'dark' ? 'text-slate-300' : 'text-slate-700';
  const link = variant === 'dark' ? 'text-slate-300 hover:text-white' : 'text-[var(--primary)] hover:text-[var(--primary-hover)]';

  return (
    <div className={`text-xs leading-relaxed ${muted}`}>
      <p>
        {t('productOf')} <span className={`font-medium ${strong}`}>{COMPANY.name}</span>
      </p>
      <p>
        {t('registryCode')} {COMPANY.registryCode} · {t('vatNumber')} {COMPANY.vatNumber}
      </p>
      <p>{COMPANY.address}</p>
      {(COMPANY.email || COMPANY.phone) && (
        <p>
          {COMPANY.email && <a href={`mailto:${COMPANY.email}`} className={link}>{COMPANY.email}</a>}
          {COMPANY.email && COMPANY.phone && ' · '}
          {COMPANY.phone && <a href={`tel:${COMPANY.phone.replace(/\s+/g, '')}`} className={link}>{COMPANY.phone}</a>}
        </p>
      )}
      <p className="mt-1">
        <Link href="/meist" className={`font-medium underline-offset-2 hover:underline ${link}`}>{t('aboutLink')}</Link>
      </p>
    </div>
  );
}
