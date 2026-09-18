import { getLocale } from 'next-intl/server';
import { SealCheck, Lightning, Mountains, Star, ThumbsUp, Medal } from '@phosphor-icons/react/dist/ssr';
import { Badge } from '@/components/ui/badge';

export interface BadgeData {
  code: string;
  labelEs: string;
  labelEn: string;
  icon: string;
}

const ICONS: Record<string, typeof SealCheck> = {
  'seal-check': SealCheck,
  lightning: Lightning,
  mountains: Mountains,
  star: Star,
  'thumbs-up': ThumbsUp,
};

export async function BadgeList({ badges }: { badges: BadgeData[] }) {
  const locale = await getLocale();

  if (badges.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => {
        const Icon = ICONS[badge.icon] ?? Medal;
        return (
          <Badge key={badge.code} variant="default" className="gap-1">
            <Icon size={12} weight="bold" />
            {locale === 'en' ? badge.labelEn : badge.labelEs}
          </Badge>
        );
      })}
    </div>
  );
}
