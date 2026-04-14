'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import Sidebar from './Sidebar';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap when sidebar is open
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    const focusableEls = sidebar.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableEls[0];
    const lastFocusable = focusableEls[focusableEls.length - 1];

    // Focus first element
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const userInitial = user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      {/* Top Bar - Only visible on mobile/tablet (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-30 flex items-center justify-between px-4">
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors"
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu className="h-5 w-5 text-[var(--text-primary)]" />
        </button>

        <h1 className="text-lg font-bold text-[var(--text-primary)] [font-family:var(--font-display)]">
          Arvelo
        </h1>

        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold"
          aria-label={`User: ${user?.name || user?.email || 'Unknown'}`}
          role="img"
        >
          {userInitial}
        </div>
      </div>

      {/* Slide-over Sidebar */}
      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={handleClose}
            aria-hidden="true"
            style={{ animation: 'fadeIn 150ms ease-out' }}
          />

          {/* Sidebar Panel */}
          <div
            ref={sidebarRef}
            id="mobile-sidebar"
            className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden"
            style={{
              animation: 'slideIn 250ms ease-out',
              paddingBottom: 'env(safe-area-inset-bottom, 0)'
            }}
          >
            <Sidebar onClose={handleClose} isMobile={true} />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
