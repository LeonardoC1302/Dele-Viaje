import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/ui/avatar';

export interface AttendeeData {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function AttendeeList({
  attendees,
}: {
  attendees: AttendeeData[];
}) {
  const t = await getTranslations('trips');

  return (
    <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('attendeesTitle', { count: attendees.length })}
      </h2>

      {attendees.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          {t('noAttendeesYet')}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {attendees.map((attendee) => (
            <li key={attendee.id} className="flex items-center gap-3">
              <Avatar
                src={attendee.avatarUrl ?? undefined}
                alt={attendee.displayName ?? ''}
                fallback={attendee.displayName ?? undefined}
              />
              <span className="text-sm text-neutral-800 dark:text-neutral-200">
                {attendee.displayName ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
