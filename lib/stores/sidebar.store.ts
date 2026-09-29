'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  autoCollapseOnTask: boolean;
  setAutoCollapse: (value: boolean) => void;
  expandedSection: string | null;
  setExpandedSection: (id: string | null) => void;
  manualOverrides: string[];
  /** Compact density starts as the icon rail; this remembers the user opening it there. */
  expandedInCompact: boolean;
  setExpandedInCompact: (value: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      autoCollapseOnTask: true,
      setAutoCollapse: (value) => set({ autoCollapseOnTask: value }),
      expandedSection: null,
      setExpandedSection: (id) => set({ expandedSection: id }),
      manualOverrides: [],
      expandedInCompact: false,
      setExpandedInCompact: (value) => set({ expandedInCompact: value }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        autoCollapseOnTask: state.autoCollapseOnTask,
        expandedSection: state.expandedSection,
        expandedInCompact: state.expandedInCompact,
      }),
    }
  )
);
