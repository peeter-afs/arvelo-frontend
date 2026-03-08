import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale } from './i18n/config';

export function middleware(request: NextRequest) {
  // Set the locale header for next-intl
  const response = NextResponse.next();
  response.headers.set('x-next-intl-locale', defaultLocale);
  return response;
}

export const config = {
  // Match all pathnames except for
  // - ... if they start with `/api`, `/_next` or `/_vercel`
  // - ... the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
