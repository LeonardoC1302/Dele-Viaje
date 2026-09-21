import {
  PersonSimpleHike,
  Umbrella,
  Drop,
  Fire,
  Butterfly,
  Waves,
  Tent,
  Palette,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { CategoryKey } from '@/lib/constants/categories';

/**
 * Category identity.
 *
 * NOTE ON IMPORTS: the icon components come from `/dist/ssr` because
 * this module is consumed by Server Components (the feed, agency
 * profiles). The plain `@phosphor-icons/react` entry relies on React
 * Context and throws "createContext only works in Client Components"
 * the moment a server-rendered page imports it. The `Icon` *type* is
 * safe to take from the main package — a type-only import is erased at
 * compile time and never crosses the client boundary.
 */
export const CATEGORY_ICONS: Record<CategoryKey, Icon> = {
  hiking: PersonSimpleHike,
  beach: Umbrella,
  waterfalls: Drop,
  volcanoes: Fire,
  wildlife: Butterfly,
  surfing: Waves,
  camping: Tent,
  culture: Palette,
};

/**
 * Each category gets a tab color, and every one of them is a step on
 * the forest or dawn ramp — never a new hue. A feed reads as varied
 * because the tabs differ in depth and warmth, not because it has
 * become a rainbow of unrelated colors.
 *
 * Text is white on all of them, so each step was chosen dark enough to
 * carry it at the small size a tab is set in.
 */
export const CATEGORY_TAB: Record<CategoryKey, string> = {
  hiking: 'bg-forest-700',
  beach: 'bg-dawn-500',
  waterfalls: 'bg-forest-500',
  volcanoes: 'bg-dawn-600',
  wildlife: 'bg-forest-600',
  surfing: 'bg-forest-400',
  camping: 'bg-forest-800',
  culture: 'bg-dawn-700',
};

export const DEFAULT_CATEGORY_TAB = 'bg-forest-600';
