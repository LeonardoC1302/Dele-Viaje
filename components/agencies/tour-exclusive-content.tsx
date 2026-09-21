import { LockKey } from '@phosphor-icons/react/dist/ssr';
import { getTranslations } from 'next-intl/server';
import { MarkdownContent } from '@/components/ui/markdown-content';

// Server component — the content itself is already access-controlled by
// tour_exclusive_content's RLS policy (migration 0030), so there's no
// client-side gating logic needed here at all: if the query returned a
// row, the viewer is allowed to see it.
export async function TourExclusiveContent({ content }: { content: string }) {
  const t = await getTranslations('agencies');

  return (
    <div className="rounded-md border border-forest-200 bg-forest-50 p-6 dark:border-forest-900 dark:bg-forest-600/10">
      <div className="flex items-center gap-2">
        <LockKey size={18} weight="regular" strokeWidth={1.5} className="text-forest-700 dark:text-forest-400" />
        <h2 className="text-sm font-semibold text-forest-900 dark:text-forest-300">
          {t('tourExclusiveContentTitle')}
        </h2>
      </div>
      <MarkdownContent content={content} className="mt-3" />
    </div>
  );
}
