'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarPlus,
  WhatsappLogo,
  NavigationArrow,
  Link as LinkIcon,
  Check,
} from '@phosphor-icons/react';

/**
 * The secondary action row on a trip: calendar, share, directions.
 *
 * None of these are the surface's primary action (that's join, in the
 * case header, in dawn), so they read as quiet text buttons rather than
 * competing for attention.
 *
 * WhatsApp is first-class rather than a generic share sheet because
 * PRODUCT.md names the WhatsApp group as this product's actual
 * competition — sharing a trip back into the group it replaces is the
 * distribution path that matters here.
 */
export function TripActions({
  tripId,
  title,
  description,
  locationName,
  startAt,
  endAt,
  lat,
  lng,
  isPrivate,
}: {
  tripId: string;
  title: string;
  description: string;
  locationName: string;
  startAt: string;
  endAt: string | null;
  lat: number | null;
  lng: number | null;
  isPrivate: boolean;
}) {
  const t = useTranslations('tripActions');
  const [copied, setCopied] = useState(false);

  /**
   * The canonical URL, not `window.location.origin`. Semantically a
   * shared link should point at the real site — sharing
   * `http://localhost:3000/trips/…` into a WhatsApp group is a broken
   * link for everyone who receives it. Mechanically, reading `window`
   * here left the href empty in the server-rendered markup until the
   * client bundle booted.
   */
  const tripUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/trips/${tripId}`;

  /* ------------------------------------------------------------------
     Calendar
     ------------------------------------------------------------------
     Google Calendar's TEMPLATE link: it opens a prefilled event in the
     calendar the user already has open, which is one click and no file
     to download. There is deliberately no .ics fallback — it was tried
     and removed as noise; Costa Rica is Android/Google-dominant, and an
     extra affordance beside the real one cost more attention than it
     bought.
     ------------------------------------------------------------------ */

  // Google expects compact UTC: 20260930T150000Z/20261001T150000Z
  const toGoogleUtc = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  // end_at is nullable; a two-hour block beats an all-day event for
  // something that has a meeting time.
  const calendarEnd = endAt ?? new Date(new Date(startAt).getTime() + 2 * 3600_000).toISOString();

  const googleCalendarHref =
    'https://calendar.google.com/calendar/render?' +
    new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${toGoogleUtc(startAt)}/${toGoogleUtc(calendarEnd)}`,
      // Truncated: Google silently drops an over-long details param, and
      // the link is the part that has to survive.
      details: `${description.slice(0, 900)}\n\n${tripUrl}`,
      location: locationName,
    }).toString();

  const shareText = t('shareMessage', {
    title,
    date: new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(startAt)),
    place: locationName,
  });

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${tripUrl}`)}`;

  // Waze deep-links by coordinate; Google Maps takes a coordinate too and
  // is the fallback when there are none (search by place name).
  const wazeHref =
    lat != null && lng != null ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null;
  const mapsHref =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(tripUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (insecure context, or the user said no). The
      // link is visible in the address bar anyway; failing silently beats
      // an error toast for something this incidental.
    }
  };

  const itemClass =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-display text-sm font-semibold text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-100';

  return (
    <div className="flex flex-wrap items-center gap-1">
      <a
        href={googleCalendarHref}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
      >
        <CalendarPlus size={16} />
        {t('addToCalendar')}
      </a>

      {/* A private plan's link is an invite-only URL. Offering a WhatsApp
          share on it would encourage broadcasting something the whole
          feature exists to keep closed — copy-link stays, since that is
          deliberate and one-to-one. */}
      {!isPrivate && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={itemClass}>
          <WhatsappLogo size={16} />
          {t('shareWhatsapp')}
        </a>
      )}

      <button type="button" onClick={copyLink} className={itemClass}>
        {copied ? <Check size={16} weight="bold" /> : <LinkIcon size={16} />}
        {copied ? t('copied') : t('copyLink')}
      </button>

      <a
        href={wazeHref ?? mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
      >
        <NavigationArrow size={16} />
        {t('directions')}
      </a>
    </div>
  );
}
