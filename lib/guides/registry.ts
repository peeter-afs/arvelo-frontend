import { defaultLocale, type Locale } from '@/i18n/config';
import type { Guide } from './types';
import { algsaldodeImport } from './content/et/algsaldode-import';
import { pangatehingud } from './content/et/pangatehingud';
import { burooKlientettevotted } from './content/et/buroo-klientettevotted';
import { muugiarved } from './content/et/muugiarved';
import { ostuarved } from './content/et/ostuarved';
import { korduvadArved } from './content/et/korduvad-arved';
import { arveMallid } from './content/et/arve-mallid';
import { maksedJaMaksepaketid } from './content/et/maksed-ja-maksepaketid';
import { kuuloppJaAruanded } from './content/et/kuulopp-ja-aruanded';
import { makseviisid } from './content/et/makseviisid';
import { kassaJaKuluaruanded } from './content/et/kassa-ja-kuluaruanded';
import { eArved } from './content/et/e-arved';
import { projektiKuluarvestus } from './content/et/projekti-kuluarvestus';
import { palgaarvestus } from './content/et/palgaarvestus';

/**
 * Guides are written per locale. Only Estonian exists today; a new language is a
 * new `content/<locale>/` folder plus one entry here — nothing else changes.
 */
const GUIDES_BY_LOCALE: Partial<Record<Locale, Guide[]>> = {
  et: [algsaldodeImport, pangatehingud, burooKlientettevotted, muugiarved, ostuarved, korduvadArved, arveMallid, maksedJaMaksepaketid, kuuloppJaAruanded, makseviisid, kassaJaKuluaruanded, eArved, projektiKuluarvestus, palgaarvestus],
};

export function listGuides(locale: Locale): { guides: Guide[]; isFallback: boolean } {
  const own = GUIDES_BY_LOCALE[locale];
  if (own && own.length > 0) return { guides: own, isFallback: false };
  return { guides: GUIDES_BY_LOCALE[defaultLocale] ?? [], isFallback: true };
}

export function getGuide(locale: Locale, slug: string): { guide: Guide | null; isFallback: boolean } {
  const own = GUIDES_BY_LOCALE[locale]?.find((guide) => guide.slug === slug);
  if (own) return { guide: own, isFallback: false };

  const fallback = GUIDES_BY_LOCALE[defaultLocale]?.find((guide) => guide.slug === slug) ?? null;
  return { guide: fallback, isFallback: fallback !== null };
}

/** Guides that document a given app route — drives the contextual "Juhend" link. */
export function getGuidesForRoute(locale: Locale, pathname: string): Guide[] {
  return listGuides(locale).guides.filter((guide) =>
    guide.relatedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  );
}
