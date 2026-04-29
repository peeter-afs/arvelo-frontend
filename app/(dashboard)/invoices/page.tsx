'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, ClipboardCheck, FileCheck2, FileText, Upload } from 'lucide-react';

export default function InvoicesHubPage() {
  const t = useTranslations('invoices');
  const sections = [
    {
      title: t('salesList'),
      description: t('salesDescription'),
      href: '/invoices/sales',
      icon: FileText,
      accent: 'from-sky-500/15 to-cyan-500/10',
    },
    {
      title: t('purchaseList'),
      description: t('purchaseDescription'),
      href: '/invoices/purchase',
      icon: FileCheck2,
      accent: 'from-emerald-500/15 to-lime-500/10',
    },
    {
      title: t('purchaseApprovals'),
      description: t('purchaseApprovalsDescription'),
      href: '/invoices/purchase-approvals',
      icon: ClipboardCheck,
      accent: 'from-rose-500/15 to-fuchsia-500/10',
    },
    {
      title: t('purchaseImports'),
      description: t('purchaseImportsDescription'),
      href: '/invoices/purchase-imports',
      icon: Upload,
      accent: 'from-amber-500/15 to-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {t('hubDescription')}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`card group overflow-hidden border-slate-200 bg-gradient-to-br ${section.accent} p-6 transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                  <Icon className="h-6 w-6 text-slate-900" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="mt-6 text-lg font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
