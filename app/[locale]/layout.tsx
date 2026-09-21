import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Schibsted_Grotesk, Work_Sans } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { IosInstallHint } from '@/components/pwa/ios-install-hint';
import '../globals.css';

/**
 * Two faces, no more. Schibsted Grotesk is the product's voice
 * (headings, buttons, nav, the micro-label); Work Sans is the content's
 * (body copy, descriptions, form values). Both are loaded here so every
 * route gets them — there is no landing-only type in this system.
 */
const schibsted = Schibsted_Grotesk({
  variable: '--font-schibsted',
  subsets: ['latin'],
  display: 'swap',
});

const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: ['trips', 'travel', 'Costa Rica', 'hiking', 'social', 'experiences', 'tours'],
    authors: [{ name: 'Dele Viaje' }],
    creator: 'Dele Viaje',
    openGraph: {
      type: 'website',
      locale: locale === 'es' ? 'es_CR' : 'en_US',
      url: process.env.NEXT_PUBLIC_SITE_URL,
      title: t('title'),
      description: t('description'),
      siteName: 'Dele Viaje',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Dele Viaje',
    },
    formatDetection: { telephone: false },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  colorScheme: 'light dark' as const,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${schibsted.variable} ${workSans.variable}`}
    >
      <head>
        {/* Manifest, favicon and apple-icon are injected by Next from
            app/manifest.ts, app/icon.tsx and app/apple-icon.tsx. */}
        <meta name="theme-color" content="#1B4332" />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider>
          {children}
          <ServiceWorkerRegister />
          <IosInstallHint />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
