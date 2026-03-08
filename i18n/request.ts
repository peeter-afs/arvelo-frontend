import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Use the locale from the middleware header, or fall back to default
  let locale = await requestLocale;

  if (!locale) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
