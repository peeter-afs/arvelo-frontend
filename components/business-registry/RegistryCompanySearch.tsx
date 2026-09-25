'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, Plus, Search } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  businessRegistryApi,
  type BusinessRegistryCompany,
  type BusinessRegistrySearchItem,
} from '@/lib/api/businessRegistry.api';
import { Button } from '@/components/ui/Button';

const fieldInput =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';

type Props = {
  /** Picked result, with full registry details (address, VAT, legal form). */
  onSelect: (company: BusinessRegistryCompany) => void;
  onCreateManually: () => void;
  initialQuery?: string;
  /**
   * 'tenant' searches as the active company (partner autofill, logged to the
   * tenant's sync log); 'lookup' needs no company and is used while creating one.
   */
  mode?: 'tenant' | 'lookup';
  manualLabel?: string;
};

/**
 * Äriregister search (EE, falls back to FI) → pick a result → full company
 * details. Shared by partner creation and company (tenant) creation.
 */
export function RegistryCompanySearch({
  onSelect,
  onCreateManually,
  initialQuery = '',
  mode = 'tenant',
  manualLabel,
}: Props) {
  const t = useTranslations('accounting');
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<BusinessRegistrySearchItem[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = mode === 'lookup' ? businessRegistryApi.lookupCompanies : businessRegistryApi.searchCompanies;
  const getCompany = mode === 'lookup' ? businessRegistryApi.lookupCompany : businessRegistryApi.getCompany;

  const handleSearch = async () => {
    setLoading('search');
    setError(null);
    try {
      const result = await search(query);
      setResults(result.items);
      if (result.items.length === 0) {
        setError(t('noBusinessRegistryMatchesFound'));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const handleSelect = async (item: BusinessRegistrySearchItem) => {
    if (!item.registryCode) {
      setError(t('selectedResultHasNoRegistryCode'));
      return;
    }
    setLoading(`company-${item.registryCode}`);
    setError(null);
    try {
      const result = await getCompany(item.registryCode);
      onSelect(result.company);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-3 py-2.5 text-[12.5px] text-[var(--a-neg)]">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim().length >= 2) {
              e.preventDefault();
              void handleSearch();
            }
          }}
          placeholder={t('companyNameOrRegistryCode')}
          className={fieldInput}
          autoFocus
        />
        <Button type="button" variant="primary" onClick={handleSearch} disabled={query.trim().length < 2 || loading === 'search'}>
          {loading === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t('searchRegistry')}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((item) => (
            <button
              type="button"
              key={`${item.registryCode}-${item.name}`}
              onClick={() => handleSelect(item)}
              disabled={!item.registryCode || !!loading}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--a-border)] p-3 text-left transition hover:border-[var(--a-accent)] hover:bg-[var(--a-accent-soft-2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--a-text)]">{item.name || t('unnamedCompany')}</span>
                  {item.country && (
                    <span className="inline-flex items-center rounded-full bg-[var(--a-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">
                      {countryFlag(item.country)} {item.country}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11.5px] text-[var(--a-text-3)]">
                  {item.registryCode || t('noRegistryCode')} · {item.vatNumber || t('noVat')} · {item.registryStatus || t('noStatus')}
                </div>
              </div>
              {loading === `company-${item.registryCode}` ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[var(--a-text-3)]" />
              ) : (
                <Plus className="h-4 w-4 flex-shrink-0 text-[var(--a-text-3)]" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[12px] text-[var(--a-text-3)] before:h-px before:flex-1 before:bg-[var(--a-border)] after:h-px after:flex-1 after:bg-[var(--a-border)]">
        {t('or')}
      </div>

      <Button type="button" className="w-full justify-center" onClick={onCreateManually}>
        {manualLabel ?? t('createManually')}
      </Button>
    </div>
  );
}

function countryFlag(country: string): string {
  const flags: Record<string, string> = { EE: '🇪🇪', FI: '🇫🇮' };
  return flags[country.toUpperCase()] || '🏳️';
}

/** One-line address for core.tenants.address (a single text column). */
export function formatRegistryAddress(company: BusinessRegistryCompany): string {
  const cityLine = [company.postalCode, company.city].filter(Boolean).join(' ');
  return [company.legalAddress, cityLine].filter(Boolean).join(', ');
}
