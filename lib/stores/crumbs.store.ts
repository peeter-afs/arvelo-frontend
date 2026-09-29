'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Lets a page replace the last breadcrumb the command bar derives from the URL,
 * e.g. /invoices/:id/edit reads "Vaata" when the invoice is locked.
 */
const useCrumbStore = create<{ last: string | null }>(() => ({ last: null }));

export const useCrumbOverride = () => useCrumbStore((state) => state.last);

export function applyCrumbOverride(crumbs: string[], last: string | null): string[] {
  return last && crumbs.length ? [...crumbs.slice(0, -1), last] : crumbs;
}

/** Replace the last breadcrumb while the calling page is mounted (null = keep the URL's). */
export function useLastCrumb(label: string | null) {
  useEffect(() => {
    useCrumbStore.setState({ last: label });
    return () => useCrumbStore.setState({ last: null });
  }, [label]);
}
