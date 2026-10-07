/**
 * The ten reports of the report rail (handoff §2.1): names = the old sidebar
 * names, groups in this order, search keywords, period mode and default filters.
 */

import type { ReportFilters } from './periods';

export type ReportSlug =
  | 'profit-loss' | 'balance-sheet' | 'trial-balance' | 'turnover' | 'general-ledger'
  | 'vat' | 'aging' | 'partner-statement' | 'dimensions' | 'annual-report';

export type ReportDef = {
  slug: ReportSlug;
  name: string;
  group: string;
  keywords: string;
  /** asof = one date ("Seisuga"), range = a period, none = own selector (annual report). */
  mode: 'asof' | 'range' | 'none';
  compare?: 'bs' | 'pl';
  defaults: ReportFilters;
};

export const REPORTS: ReportDef[] = [
  { slug: 'profit-loss', name: 'Kasumiaruanne', group: 'Finants', keywords: 'kasum kahjum tulud kulud tulemiaruanne p&l', mode: 'range', compare: 'pl', defaults: { per: 'ytd', cmp: 'spy' } },
  { slug: 'balance-sheet', name: 'Bilanss', group: 'Finants', keywords: 'bilanss varad kohustised omakapital', mode: 'asof', compare: 'bs', defaults: { per: 'today', cmp: 'pye' } },
  { slug: 'trial-balance', name: 'Proovibilanss', group: 'Raamat', keywords: 'proovibilanss saldod', mode: 'asof', defaults: { per: 'today' } },
  { slug: 'turnover', name: 'Käibeandmik', group: 'Raamat', keywords: 'käibeandmik käive deebet kreedit', mode: 'range', defaults: { per: 'ytd' } },
  { slug: 'general-ledger', name: 'Pearaamat', group: 'Raamat', keywords: 'pearaamat konto kanded', mode: 'range', defaults: { per: 'ytd' } },
  { slug: 'vat', name: 'KMD aruanne', group: 'Maksud', keywords: 'kmd käibemaks km inf deklaratsioon emta', mode: 'range', defaults: { per: 'pm' } },
  { slug: 'aging', name: 'Aegumisaruanne', group: 'Partnerid', keywords: 'aegumine võlg võlgnevused laekumata ostjad tarnijad tähtaeg', mode: 'asof', defaults: { per: 'today', dir: 'receivable' } },
  { slug: 'partner-statement', name: 'Partneri kontokaart', group: 'Partnerid', keywords: 'partner kontokaart väljavõte saldokinnitus', mode: 'range', defaults: { per: 'ytd', doc: 'card' } },
  { slug: 'dimensions', name: 'Kulukohad ja projektid', group: 'Juhtimine', keywords: 'kulukoht projekt dimensioon tulem marginaal', mode: 'range', defaults: { per: 'ytd', kind: 'projects', status: 'all' } },
  { slug: 'annual-report', name: 'Majandusaasta aruanne', group: 'Juhtimine', keywords: 'majandusaasta aruanne aastaaruanne xbrl', mode: 'none', defaults: {} },
];

export const REPORT_GROUPS = ['Finants', 'Raamat', 'Maksud', 'Partnerid', 'Juhtimine'];

export const reportBySlug = (slug: string) => REPORTS.find((r) => r.slug === slug);
export const reportHref = (slug: ReportSlug) => `/reports/${slug}`;

export const LAST_REPORT_KEY = 'arvelo.reports.last';
