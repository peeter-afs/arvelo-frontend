'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      localStorage.setItem('preferred-locale', newLocale);

      const segments = pathname.split('/');
      const localeIndex = locales.includes(segments[1] as Locale) ? 1 : 0;

      if (localeIndex === 1) {
        segments[1] = newLocale;
      } else {
        segments.splice(1, 0, newLocale);
      }

      const newPath = segments.join('/') || '/';
      router.push(newPath);
      setIsOpen(false);
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-md transition-colors"
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Language: ${localeNames[currentLocale]}`}
      >
        <Globe className="h-4 w-4" />
        <span>{localeNames[currentLocale]}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-[var(--surface)] rounded-lg shadow-lg z-20 border border-[var(--border)] py-1"
          role="listbox"
          aria-label="Select language"
          aria-activedescendant={`locale-${currentLocale}`}
        >
          {locales.map((locale) => (
            <button
              key={locale}
              id={`locale-${locale}`}
              onClick={() => handleLocaleChange(locale)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] transition-colors ${
                locale === currentLocale
                  ? 'bg-blue-50 text-[var(--primary)] font-medium'
                  : 'text-[var(--text-primary)]'
              }`}
              role="option"
              aria-selected={locale === currentLocale}
              disabled={isPending}
            >
              {localeNames[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
