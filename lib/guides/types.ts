/**
 * In-app user guides. Content lives in the repo as typed blocks (not MDX, not the
 * i18n message files) so it is versioned with the UI it documents, renders through
 * one shared component set, and needs no extra npm dependency.
 */

export type GuideCallout = 'info' | 'warning' | 'success';

export type GuideStep = {
  title: string;
  text?: string;
};

export type GuideBlock =
  /** Section heading — becomes an anchor target and a table-of-contents entry. */
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'steps'; items: GuideStep[] }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; tone: GuideCallout; title?: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; src: string; alt: string; caption?: string };

export type GuideCategory = 'alustamine' | 'raamatupidamine' | 'arved' | 'pank';

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  category: GuideCategory;
  /** Rough reading time in minutes, shown on the index card. */
  minutes: number;
  /** ISO date of the last content review. */
  updatedAt: string;
  /** App routes this guide documents — drives the contextual "Juhend" link. */
  relatedRoutes: string[];
  blocks: GuideBlock[];
};

export const GUIDE_CATEGORY_ORDER: GuideCategory[] = [
  'alustamine',
  'raamatupidamine',
  'arved',
  'pank',
];

/**
 * Stable anchor id for a heading block. Keeps Estonian letters readable in the URL
 * by transliterating them rather than dropping them.
 */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[õö]/g, 'o')
    .replace(/[äå]/g, 'a')
    .replace(/ü/g, 'u')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
