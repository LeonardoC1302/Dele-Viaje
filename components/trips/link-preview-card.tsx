import { ArrowSquareOut, MapPin } from '@phosphor-icons/react/dist/ssr';

export interface TripLinkData {
  id: string;
  url: string;
  label: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
}

export function LinkPreviewCard({ link }: { link: TripLinkData }) {
  const title = link.label || link.ogTitle || link.url;
  let hostname = link.url;
  try {
    hostname = new URL(link.url).hostname.replace(/^www\./, '');
  } catch {
    // Keep the raw url as a fallback display if it somehow isn't parseable.
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 overflow-hidden rounded-md border border-sand-200 transition-colors hover:bg-sand-50 dark:border-sand-800 dark:hover:bg-sand-900"
    >
      {link.ogImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary external preview images can't be pre-registered in next.config.ts remotePatterns.
        <img
          src={link.ogImageUrl}
          alt=""
          className="w-20 shrink-0 self-stretch object-cover"
        />
      ) : (
        <div className="flex w-20 shrink-0 items-center justify-center self-stretch bg-forest-50 dark:bg-forest-600/20">
          <MapPin size={24} weight="regular" strokeWidth={1.5} className="text-forest-600 dark:text-forest-400" />
        </div>
      )}
      <div className="min-w-0 flex-1 py-2 pr-3">
        <p className="truncate text-sm font-medium text-sand-900 dark:text-sand-100">
          {title}
        </p>
        {link.ogDescription && (
          <p className="mt-0.5 line-clamp-2 text-xs text-sand-600 dark:text-sand-400">
            {link.ogDescription}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-forest-600 dark:text-forest-400">
          {hostname}
          <ArrowSquareOut size={12} weight="regular" strokeWidth={1.5} />
        </p>
      </div>
    </a>
  );
}
