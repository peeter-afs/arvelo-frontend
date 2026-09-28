import { NextResponse } from 'next/server';
import { defaultLocale } from '@/i18n/config';
import { listGuides } from '@/lib/guides/registry';
import { guideToText } from '@/lib/guides/plainText';

/**
 * The guide corpus for the backend assistant (see the backend's
 * services/assistant/guideCorpus.ts). Guides are public help content, so no auth.
 * Built at deploy time: the content only changes with a frontend deploy.
 */
export const dynamic = 'force-static';

export function GET() {
  const { guides } = listGuides(defaultLocale);

  return NextResponse.json({
    locale: defaultLocale,
    guides: guides.map((guide) => ({
      slug: guide.slug,
      title: guide.title,
      summary: guide.summary,
      category: guide.category,
      relatedRoutes: guide.relatedRoutes,
      updatedAt: guide.updatedAt,
      text: guideToText(guide),
    })),
  });
}
