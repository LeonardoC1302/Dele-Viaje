import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ReportQueue, type ReportTicketData } from '@/components/admin/report-queue';
import { AdminNav } from '@/components/admin/admin-nav';
import { CaseHeader, PageBody } from '@/components/cordillera/folder';

export default async function AdminReportsPage() {
  const t = await getTranslations('admin');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <NotAllowed message={t('notAllowed')} />;
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'admin') {
    return <NotAllowed message={t('notAllowed')} />;
  }

  const { data: ticketRows } = await supabase
    .from('report_tickets')
    .select('id, reporter_id, target_type, target_id, reason, description, status, admin_note, created_at')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100);

  const tickets = ticketRows ?? [];

  const reporterIds = [...new Set(tickets.map((r) => r.reporter_id))];
  const userTargetIds = [
    ...new Set(tickets.filter((r) => r.target_type === 'user').map((r) => r.target_id)),
  ];
  const tripTargetIds = [
    ...new Set(tickets.filter((r) => r.target_type === 'trip').map((r) => r.target_id)),
  ];
  const messageTargetIds = [
    ...new Set(tickets.filter((r) => r.target_type === 'message').map((r) => r.target_id)),
  ];

  const [reporterResult, targetUserResult, tripResult, messageResult] = await Promise.all([
    reporterIds.length > 0
      ? supabase.rpc('profiles_public').in('id', reporterIds)
      : Promise.resolve({ data: [] }),
    userTargetIds.length > 0
      ? supabase.from('profiles').select('id, display_name, role, status').in('id', userTargetIds)
      : Promise.resolve({ data: [] }),
    tripTargetIds.length > 0
      ? supabase.from('trips').select('id, title, status').in('id', tripTargetIds)
      : Promise.resolve({ data: [] }),
    messageTargetIds.length > 0
      ? supabase.from('messages').select('id, trip_id, body, sender_id, deleted_at').in('id', messageTargetIds)
      : Promise.resolve({ data: [] }),
  ]);

  const reporters = new Map<string, string | null>(
    (reporterResult.data ?? []).map((p: { id: string; display_name: string | null }) => [
      p.id,
      p.display_name,
    ])
  );
  const targetUsers = new Map(
    (targetUserResult.data ?? []).map((p) => [
      p.id,
      { displayName: p.display_name as string | null, role: p.role as string, status: p.status as string },
    ])
  );
  const trips = new Map(
    (tripResult.data ?? []).map((t) => [t.id, { title: t.title as string, status: t.status as string }])
  );
  const messages = new Map(
    (messageResult.data ?? []).map((m) => [
      m.id,
      {
        tripId: m.trip_id as string,
        body: m.body as string,
        senderId: m.sender_id as string,
        deletedAt: m.deleted_at as string | null,
      },
    ])
  );

  const data: ReportTicketData[] = tickets.map((r) => ({
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: reporters.get(r.reporter_id) ?? null,
    targetType: r.target_type as ReportTicketData['targetType'],
    targetId: r.target_id,
    reason: r.reason,
    description: r.description,
    status: r.status as ReportTicketData['status'],
    adminNote: r.admin_note,
    createdAt: r.created_at,
    targetUser: targetUsers.get(r.target_id) ?? null,
    targetTrip:
      r.target_type === 'trip'
        ? (trips.get(r.target_id) ?? null)
        : r.target_type === 'message'
          ? (() => {
              const m = messages.get(r.target_id);
              return m ? (trips.get(m.tripId) ?? null) : null;
            })()
          : null,
    targetMessage: messages.get(r.target_id) ?? null,
  }));

  return (
    <main>
      <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-7 sm:py-10">
        <CaseHeader title={t('reportsTitle')} />
        <AdminNav active="reports" />
        <ReportQueue tickets={data} />
      </div>
    </main>
  );
}

function NotAllowed({ message }: { message: string }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-sand-500 dark:text-sand-400">{message}</p>
    </main>
  );
}
