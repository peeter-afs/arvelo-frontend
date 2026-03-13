'use client';

import Link from 'next/link';
import { ArrowRight, FileCheck2, FileText, Upload } from 'lucide-react';

const sections = [
  {
    title: 'Sales invoices',
    description: 'Review customer invoices, payment status, open balances, and line details from the live backend.',
    href: '/invoices/sales',
    icon: FileText,
    accent: 'from-sky-500/15 to-cyan-500/10',
  },
  {
    title: 'Purchase invoices',
    description: 'Process supplier invoice approvals, rejection reasons, and posting into payable state.',
    href: '/invoices/purchase',
    icon: FileCheck2,
    accent: 'from-emerald-500/15 to-lime-500/10',
  },
  {
    title: 'Purchase imports',
    description: 'Upload supplier PDFs, review parsed fields, resolve suppliers, and create draft purchase invoices.',
    href: '/invoices/purchase-imports',
    icon: Upload,
    accent: 'from-amber-500/15 to-orange-500/10',
  },
];

export default function InvoicesHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Choose the invoice workflow you want to work in. Sales and purchase invoices are split into dedicated lists
          so operational and approval views stay clear.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
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
