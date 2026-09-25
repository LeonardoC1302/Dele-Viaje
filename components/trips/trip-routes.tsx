import { getTranslations } from 'next-intl/server';
import { getFormatter } from 'next-intl/server';
import { Path, ArrowUp, ArrowDown, Ruler, DownloadSimple, MapPin } from '@phosphor-icons/react/dist/ssr';
import { RouteProfile } from '@/components/trips/route-profile';

export interface TripRouteData {
  id: string;
  name: string;
  stopSort: number | null;
  profile: [number, number][] | null;
  distanceM: number;
  ascentM: number | null;
  descentM: number | null;
  minEleM: number | null;
  maxEleM: number | null;
}

/**
 * The readout for the hiking routes attached to a trip: how far, how
 * much climbing, the shape of the climb, and the file to put on a
 * watch. The line itself is drawn on the map directly above it.
 *
 * A route can name the stop it belongs to, resolved here from the
 * waypoint's position rather than an id (migration 0037 explains why).
 * A link pointing at a stop that no longer exists renders as an
 * unlabelled route, never as a broken reference.
 */
export async function TripRoutes({
  tripId,
  routes,
  stopLabels,
}: {
  tripId: string;
  routes: TripRouteData[];
  /** Stop labels by their `sort`, for resolving `stopSort`. */
  stopLabels: Map<number, string>;
}) {
  if (routes.length === 0) return null;

  const t = await getTranslations('routes');
  const format = await getFormatter();

  const km = (metres: number) =>
    `${format.number(metres / 1000, { maximumFractionDigits: 1 })} km`;
  const m = (metres: number) => `${format.number(metres)} m`;

  return (
    <section className="mt-6">
      <h2 className="micro-label mb-2">{t('title')}</h2>

      <ul className="flex flex-col gap-3">
        {routes.map((route) => {
          const stop = route.stopSort === null ? null : stopLabels.get(route.stopSort);
          return (
            <li
              key={route.id}
              className="rounded-md border border-sand-200 bg-sand-50 p-3 dark:border-sand-800 dark:bg-[color:var(--page)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-sand-900 dark:text-sand-100">
                  <Path
                    size={15}
                    weight="regular"
                    className="shrink-0 text-forest-600 dark:text-forest-400"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">{route.name}</span>
                </h3>

                <a
                  href={`/api/trips/${tripId}/routes/${route.id}/gpx`}
                  className="link inline-flex shrink-0 items-center gap-1 text-xs"
                >
                  <DownloadSimple size={13} weight="regular" aria-hidden="true" />
                  {t('download')}
                </a>
              </div>

              {stop && (
                <p className="mt-1 flex items-center gap-1 text-xs text-sand-500 dark:text-sand-400">
                  <MapPin size={12} weight="regular" aria-hidden="true" />
                  {t('atStop', { stop })}
                </p>
              )}

              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <Ruler
                    size={14}
                    weight="regular"
                    className="text-sand-400 dark:text-sand-500"
                    aria-hidden="true"
                  />
                  <dt className="sr-only">{t('distance')}</dt>
                  <dd className="tnum text-sm font-semibold text-sand-900 dark:text-sand-100">
                    {km(route.distanceM)}
                  </dd>
                </div>

                {route.ascentM !== null && (
                  <div className="flex items-center gap-1.5">
                    <ArrowUp
                      size={14}
                      weight="regular"
                      className="text-sand-400 dark:text-sand-500"
                      aria-hidden="true"
                    />
                    <dt className="sr-only">{t('ascent')}</dt>
                    <dd className="tnum text-sm font-semibold text-sand-900 dark:text-sand-100">
                      {m(route.ascentM)}
                    </dd>
                  </div>
                )}

                {route.descentM !== null && (
                  <div className="flex items-center gap-1.5">
                    <ArrowDown
                      size={14}
                      weight="regular"
                      className="text-sand-400 dark:text-sand-500"
                      aria-hidden="true"
                    />
                    <dt className="sr-only">{t('descent')}</dt>
                    <dd className="tnum text-sm font-semibold text-sand-900 dark:text-sand-100">
                      {m(route.descentM)}
                    </dd>
                  </div>
                )}
              </dl>

              {route.profile && route.profile.length > 1 && (
                <RouteProfile profile={route.profile} ascentLabel={t('profile')} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
