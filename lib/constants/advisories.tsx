import {
  BugBeetle,
  Waves,
  WarningOctagon,
  Mountains,
  Drop,
  ArrowUp,
  PersonSimpleRun,
  PersonSimpleSwim,
  Ticket,
  Moon,
  CloudRain,
  Tree,
  WifiSlash,
  Money,
  Bug,
  Sun,
  Wheelchair,
  Warning,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { StampTone } from '@/components/cordillera/folder';

/**
 * Trip advisories — see supabase/migrations/0033_trip_advisories.sql.
 *
 * The labels are NOT here: they live in `trip_advisory_types.label_es` /
 * `label_en` as data columns, so an admin can add a type without a code
 * change and so both locales stay in sync. This module only maps the
 * stored `icon` name and `severity` onto the design system.
 *
 * Icons come from `/dist/ssr` because advisories render in Server
 * Components (the trip page, the feed). The `Icon` type is a type-only
 * import and is erased at compile time, so it never crosses the client
 * boundary.
 */
export type AdvisorySeverity = 'info' | 'caution' | 'danger';

export interface AdvisoryType {
  code: string;
  labelEs: string;
  labelEn: string;
  icon: string;
  severity: AdvisorySeverity;
}

export interface TripAdvisory {
  code: string;
  note: string | null;
  label: string;
  icon: string;
  severity: AdvisorySeverity;
}

const ICONS: Record<string, Icon> = {
  'bug-beetle': BugBeetle,
  waves: Waves,
  'warning-octagon': WarningOctagon,
  mountains: Mountains,
  drop: Drop,
  'arrow-up': ArrowUp,
  'person-simple-run': PersonSimpleRun,
  'person-simple-swim': PersonSimpleSwim,
  ticket: Ticket,
  moon: Moon,
  'cloud-rain': CloudRain,
  tree: Tree,
  'wifi-slash': WifiSlash,
  money: Money,
  bug: Bug,
  sun: Sun,
  wheelchair: Wheelchair,
};

/**
 * Falls back to a generic warning rather than rendering nothing, so a
 * type seeded by an admin with an icon name this build doesn't know still
 * shows up. An advisory silently disappearing is the one failure mode
 * this feature can't have.
 */
export function advisoryIcon(name: string): Icon {
  return ICONS[name] ?? Warning;
}

/** Severity maps onto the existing StatusStamp tones — no new vocabulary. */
export const SEVERITY_TONE: Record<AdvisorySeverity, StampTone> = {
  info: 'inert',
  caution: 'hold',
  danger: 'void',
};

/** Ordering for display: the things that can hurt you come first. */
const SEVERITY_RANK: Record<AdvisorySeverity, number> = {
  danger: 0,
  caution: 1,
  info: 2,
};

export function sortAdvisories<T extends { severity: AdvisorySeverity }>(list: T[]): T[] {
  return [...list].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/**
 * Text colors per severity. Deliberately not background fills: a page
 * with three filled advisory blocks reads as an error state, and the
 * dawn accent is reserved for the surface's one primary action.
 */
export const SEVERITY_TEXT: Record<AdvisorySeverity, string> = {
  info: 'text-sand-600 dark:text-sand-400',
  caution: 'text-dawn-700 dark:text-dawn-400',
  danger: 'text-red-700 dark:text-red-400',
};

export const SEVERITY_EDGE: Record<AdvisorySeverity, string> = {
  info: 'border-l-sand-300 dark:border-l-sand-600',
  caution: 'border-l-dawn-500',
  danger: 'border-l-red-600',
};

/** A row as stored: the trip's selection, with no labels attached. */
export interface AdvisoryRow {
  code: string;
  note: string | null;
}

/**
 * Joins stored advisory rows against the type table and picks the label
 * for the active locale.
 *
 * Done in application code rather than as a PostgREST embedded select
 * because the feed needs types for many trips at once — fetching the
 * (tiny, public) type table once and joining here is one round trip
 * instead of one per trip, and it keeps the label-picking logic in a
 * single place so the trip page and the card can't disagree.
 *
 * A row whose code has no matching type is dropped rather than rendered
 * blank. That only happens if a type was hard-deleted, which the schema's
 * `on delete restrict` is there to prevent.
 */
export function resolveAdvisories(
  rows: AdvisoryRow[],
  types: AdvisoryType[],
  locale: string
): TripAdvisory[] {
  const byCode = new Map(types.map((t) => [t.code, t]));

  return sortAdvisories(
    rows.flatMap((row) => {
      const type = byCode.get(row.code);
      if (!type) return [];
      return [
        {
          code: row.code,
          note: row.note,
          label: locale === 'en' ? type.labelEn : type.labelEs,
          icon: type.icon,
          severity: type.severity,
        },
      ];
    })
  );
}

/** Maps the raw `trip_advisory_types` select into the camelCase shape. */
export function mapAdvisoryTypes(
  rows: { code: string; label_es: string; label_en: string; icon: string; severity: string }[]
): AdvisoryType[] {
  return rows.map((r) => ({
    code: r.code,
    labelEs: r.label_es,
    labelEn: r.label_en,
    icon: r.icon,
    severity: r.severity as AdvisorySeverity,
  }));
}
