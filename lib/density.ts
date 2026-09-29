'use client';

import { create } from 'zustand';

/**
 * Display density. `auto` picks compact on laptop-sized viewports: a 1080p 14"
 * screen at Windows' default 125% scaling is only ~1536×730 CSS px. Layouts
 * adapt through the `compact` / `comfy` class on <html> (Tailwind `compact:`
 * variant, `:global(.compact)` in CSS modules) — never by zooming or scaling,
 * which would fight the user's own system setting.
 */
export type DensityMode = 'auto' | 'compact' | 'comfy';
export type Density = 'compact' | 'comfy';

export const DENSITY_STORAGE_KEY = 'arvelo.density';
export const COMPACT_MAX_WIDTH = 1680;
export const COMPACT_MAX_HEIGHT = 860;

export function readDensityMode(): DensityMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return stored === 'compact' || stored === 'comfy' ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

export function resolveDensity(mode: DensityMode): Density {
  if (mode !== 'auto') return mode;
  if (typeof window === 'undefined') return 'comfy';
  return window.innerWidth < COMPACT_MAX_WIDTH || window.innerHeight < COMPACT_MAX_HEIGHT ? 'compact' : 'comfy';
}

export function applyDensityClass(density: Density) {
  const root = document.documentElement;
  root.classList.toggle('compact', density === 'compact');
  root.classList.toggle('comfy', density === 'comfy');
}

/**
 * Same logic as resolveDensity, inlined into <head> so the class is on <html>
 * before the first paint (no comfy → compact jump on laptops).
 */
export const DENSITY_BOOT_SCRIPT = `(function(){try{var m=localStorage.getItem('${DENSITY_STORAGE_KEY}');var c=m==='compact'||(m!=='comfy'&&(innerWidth<${COMPACT_MAX_WIDTH}||innerHeight<${COMPACT_MAX_HEIGHT}));var r=document.documentElement;r.classList.add(c?'compact':'comfy');}catch(e){}})();`;

type DensityState = {
  mode: DensityMode;
  density: Density;
  setMode: (mode: DensityMode) => void;
  /** Re-evaluate `auto` after a resize. */
  refresh: () => void;
};

export const useDensityStore = create<DensityState>((set, get) => ({
  mode: 'auto',
  density: 'comfy',
  setMode: (mode) => {
    try {
      if (mode === 'auto') window.localStorage.removeItem(DENSITY_STORAGE_KEY);
      else window.localStorage.setItem(DENSITY_STORAGE_KEY, mode);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    const density = resolveDensity(mode);
    applyDensityClass(density);
    set({ mode, density });
  },
  refresh: () => {
    const density = resolveDensity(get().mode);
    if (density !== get().density) {
      applyDensityClass(density);
      set({ density });
    }
  },
}));

/** True when the compact layout is active. */
export const useCompact = () => useDensityStore((state) => state.density === 'compact');
