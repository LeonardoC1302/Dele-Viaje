import { getTranslations } from 'next-intl/server';
import { UsersThree } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { Avatar } from '@/components/ui/avatar';
import { ReportButton } from '@/components/reports/report-button';
import { PanelHeading } from '@/components/ui/panel-heading';

export interface AttendeeData {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function AttendeeList({
  attendees,
  currentUserId,
}: {
  attendees: AttendeeData[];
  currentUserId?: string;
}) {
  const t = await getTranslations('trips');
  const tReports = await getTranslations('reports');

  return (
    // Layout-neutral: this used to carry `mt-6 border-t pt-6` from when
    // it sat at the foot of a card. Inside a folder tab it's the first
    // thing on the sheet, and that rule rendered as an empty strip above
    // the heading. Spacing is the container's job.
    <div>
      <PanelHeading icon={UsersThree}>
        {t('attendeesTitle', { count: attendees.length })}
      </PanelHeading>

      {attendees.length === 0 ? (
        <p className="text-sm text-sand-500 dark:text-sand-400">{t('noAttendeesYet')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {attendees.map((attendee) => (
            <li key={attendee.id} className="flex items-center gap-3">
              <Link href={`/users/${attendee.id}`} className="flex items-center gap-3">
                <Avatar
                  src={attendee.avatarUrl ?? undefined}
                  alt={attendee.displayName ?? ''}
                  fallback={attendee.displayName ?? undefined}
                />
                <span className="text-sm text-sand-800 hover:underline dark:text-sand-200">
                  {attendee.displayName ?? '—'}
                </span>
              </Link>
              {currentUserId && currentUserId !== attendee.id && (
                <ReportButton
                  targetType="user"
                  targetId={attendee.id}
                  className="ml-auto text-sand-300 hover:text-red-600 dark:text-sand-600 dark:hover:text-red-400"
                  label=""
                  ariaLabel={tReports('report')}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
