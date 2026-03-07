'use client';

import { useState, useTransition } from 'react';
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

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      // Save preference to localStorage
      localStorage.setItem('preferred-locale', newLocale);

      // Replace the locale in the pathname
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        disabled={isPending}
      >
        <Globe className="h-4 w-4" />
        <span>{localeNames[currentLocale]}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
            <div className="py-1">
              {locales.map((locale) => (
                <button
                  key={locale}
                  onClick={() => handleLocaleChange(locale)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    locale === currentLocale
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                  disabled={isPending}
                >
                  {localeNames[locale]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
