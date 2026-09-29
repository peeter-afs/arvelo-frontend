'use client';

import { useEffect } from 'react';
import { applyDensityClass, DENSITY_STORAGE_KEY, readDensityMode, resolveDensity, useDensityStore } from '@/lib/density';

/** Keeps the <html> density class and the store in sync with the window size and the saved preference. */
export function DensitySync() {
  useEffect(() => {
    const mode = readDensityMode();
    const density = resolveDensity(mode);
    applyDensityClass(density);
    useDensityStore.setState({ mode, density });

    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => useDensityStore.getState().refresh());
    };
    // Another tab changed the preference.
    const onStorage = (event: StorageEvent) => {
      if (event.key === DENSITY_STORAGE_KEY) useDensityStore.getState().setMode(readDensityMode());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
