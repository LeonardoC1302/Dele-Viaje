import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { IosInstallHint } from '@/components/pwa/ios-install-hint';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
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
    keywords: [
      'trips',
      'travel',
      'Costa Rica',
      'hiking',
      'social',
      'experiences',
      'tours',
    ],
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
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'light dark',
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Manifest, favicon, and apple-icon are auto-injected by Next.js
            from app/manifest.ts, app/icon.tsx, and app/apple-icon.tsx. */}
        <meta name="theme-color" content="#1B4332" />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider>
          {children}
          <ServiceWorkerRegister />
          <IosInstallHint />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
