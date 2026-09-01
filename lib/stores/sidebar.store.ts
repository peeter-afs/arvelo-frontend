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
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        autoCollapseOnTask: state.autoCollapseOnTask,
        expandedSection: state.expandedSection,
      }),
    }
  )
);
