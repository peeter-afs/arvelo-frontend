'use client';

import { useEffect, useState } from 'react';

export function useClientDateInput(resolveDate: () => string) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (value) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setValue((current) => current || resolveDate());
    });

    return () => cancelAnimationFrame(frame);
  }, [resolveDate, value]);

  return [value, setValue] as const;
}
