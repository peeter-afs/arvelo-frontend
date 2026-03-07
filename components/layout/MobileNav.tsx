'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import Sidebar from './Sidebar';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();

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

  const handleClose = () => {
    setIsOpen(false);
  };

  // Get user initial for avatar
  const userInitial = user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      {/* Top Bar - Only visible on mobile/tablet (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>

        {/* Logo */}
        <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Arvelo
        </h1>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
          {userInitial}
        </div>
      </div>

      {/* Slide-over Sidebar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
            onClick={handleClose}
            style={{
              animation: 'fadeIn 150ms ease-out'
            }}
          />

          {/* Sidebar Panel */}
          <div
            className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden animate-slide-in"
            style={{
              animation: 'slideIn 250ms ease-out',
              paddingBottom: 'env(safe-area-inset-bottom, 0)'
            }}
          >
            <Sidebar onClose={handleClose} isMobile={true} />
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

// Hook to manage mobile nav state (can be used in layout)
export function useMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

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

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}
