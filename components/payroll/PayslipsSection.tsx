'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Printer, Wallet } from 'lucide-react';
import { meApi } from '@/lib/api/me.api';
import type { Payslip } from '@/lib/api/payroll.api';
import { dateText, money, monthText } from './format';

/** Employee self-service: the person's own posted payslips (read-only). */
export function PayslipsSection() {
  const t = useTranslations('payroll');
  const [payslips, setPayslips] = useState<Payslip[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    meApi.payslips().then(setPayslips).catch(() => setPayslips([]));
  }, []);

  if (!payslips || payslips.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[17px] font-semibold text-[var(--a-text)]">{t('payslips')}</h2>
      <ul className="divide-y divide-[var(--a-border)] overflow-hidden rounded-[14px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        {payslips.map((slip) => {
          const open = openId === slip.run_id;
          return (
            <li key={slip.run_id} className={open ? 'payslip-print' : ''}>
              <button type="button" onClick={() => setOpenId(open ? null : slip.run_id)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left active:bg-[var(--a-surface-2)]">
                <Wallet className="h-4 w-4 flex-shrink-0 text-[var(--a-text-3)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-[var(--a-text)]">{monthText(slip.period_month)}</div>
                  <div className="text-[12.5px] text-[var(--a-text-3)]">{t('paidOn', { date: dateText(slip.payment_date) })}</div>
                </div>
                <span className="font-mono text-[14.5px] font-semibold tabular-nums">{money(slip.totals.net_pay)} €</span>
                {open ? <ChevronUp className="h-4 w-4 text-[var(--a-text-3)]" /> : <ChevronDown className="h-4 w-4 text-[var(--a-text-3)]" />}
              </button>
              {open && (
                <div className="space-y-1 px-4 pb-4 text-[13.5px]">
                  {slip.items.map((item, index) => (
                    <Row key={index} label={item.description || t(`kind.${item.kind}`)} value={item.amount} />
                  ))}
                  <Row label={t('gross')} value={slip.totals.gross_wage + slip.totals.gross_sick} strong />
                  {slip.totals.pension > 0 && <Row label={`${t('pensionLong')} ${slip.pension_rate}%`} value={-slip.totals.pension} />}
                  {slip.totals.unemployment_employee > 0 && <Row label={t('uiEmployeeLong')} value={-slip.totals.unemployment_employee} />}
                  <Row label={t('incomeTax')} value={-slip.totals.income_tax} />
                  {slip.totals.exemption_used > 0 && <div className="text-[12px] text-[var(--a-text-3)]">{t('exemptionApplied', { amount: money(slip.totals.exemption_used) })}</div>}
                  <Row label={t('net')} value={slip.totals.net_pay} strong />
                  <div className="pt-2 text-[12px] text-[var(--a-text-3)]">
                    {t('employerPaid', { social: money(slip.totals.social_tax), ui: money(slip.totals.unemployment_employer) })}
                  </div>
                  <button type="button" onClick={() => window.print()} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--a-border)] px-3 text-[13px] text-[var(--a-text-2)] print:hidden">
                    <Printer className="h-4 w-4" />
                    {t('print')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-[var(--a-border)] pt-1 font-semibold text-[var(--a-text)]' : 'text-[var(--a-text-2)]'}`}>
      <span>{label}</span>
      <span className="font-mono tabular-nums">{money(value)}</span>
    </div>
  );
}
