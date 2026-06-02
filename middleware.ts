import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, localeCookieName, locales, type Locale } from './i18n/config';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = segments[0] as Locale | undefined;

  // Strip accidental locale prefixes like /et or /fi because this app uses
  // cookie/header based locale selection on the same route tree.
  if (maybeLocale && locales.includes(maybeLocale)) {
    const redirectUrl = request.nextUrl.clone();
    const nextPath = `/${segments.slice(1).join('/')}` || '/';
    redirectUrl.pathname = nextPath === '//' ? '/' : nextPath;

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(localeCookieName, maybeLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    response.headers.set('x-next-intl-locale', maybeLocale);
    return response;
  }

  // Temporarily disable public registration
  if (pathname === '/register') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  const cookieLocale = request.cookies.get(localeCookieName)?.value as Locale | undefined;
  const locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;

  const response = NextResponse.next();
  response.headers.set('x-next-intl-locale', locale);
  return response;
}

export const config = {
  // Match all pathnames except for
  // - ... if they start with `/api`, `/_next` or `/_vercel`
  // - ... the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
