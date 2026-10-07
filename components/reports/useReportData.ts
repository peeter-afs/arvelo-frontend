'use client';

import { useEffect, useRef, useState, type DependencyList } from 'react';

const message = (e: unknown) =>
  (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
  || (e instanceof Error ? e.message : 'Aruande laadimine ebaõnnestus');

/** Loads report data; keeps the previous result on screen while the next one loads. */
export function useReportData<T>(load: () => Promise<T>, deps: DependencyList, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    load()
      .then((result) => { if (id === seq.current) setData(result); })
      .catch((e) => { if (id === seq.current) { setError(message(e)); setData(null); } })
      .finally(() => { if (id === seq.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error };
}
