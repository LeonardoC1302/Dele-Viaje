import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { CalendarBlank, MapPin, UsersThree, ChatCircleText, PencilSimple } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { buttonVariants } from '@/components/ui/button';
import { JoinTripButton, type AttendeeStatus } from '@/components/trips/join-trip-button';
import { AttendeeList, type AttendeeData } from '@/components/trips/attendee-list';
import { ReportButton } from '@/components/reports/report-button';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { TripRouteMap } from '@/components/trips/trip-route-map';
import { InviteManager, type PlanInvite } from '@/components/plans/invite-manager';
import { PackingList, type PackingItemData } from '@/components/plans/packing-list';
import { ExpensesList, type ExpenseData } from '@/components/plans/expenses-list';
import { PollsList, type PollData, type PollOption } from '@/components/plans/polls-list';
import { ItineraryList, type ItineraryBlockData } from '@/components/plans/itinerary-list';
import { PlanMembers } from '@/components/plans/plan-members';
import { CustomFieldsDisplay } from '@/components/trips/custom-fields-display';
import { LinkPreviewCard, type TripLinkData } from '@/components/trips/link-preview-card';
import { TourQA, type TourQuestionData } from '@/components/agencies/tour-qa';
import { TourCheckin, type CheckinAttendeeData } from '@/components/agencies/tour-checkin';
import { TourReviews, type ReviewData } from '@/components/agencies/tour-reviews';
import { TourPayment } from '@/components/agencies/tour-payment';

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations('trips');
  const tCategories = await getTranslations('categories');
  const tFeed = await getTranslations('feed');
  const locale = await getLocale();

  const { data: trip } = await supabase
    .from('trips')
    .select(
      'id, title, description, category, location_name, lat, lng, start_at, end_at, capacity, confirmed_count, owner_id, visibility, type, agency_id, price_crc, min_participants'
    )
    .eq('id', id)
    .single();

  if (!trip) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerQuery = supabase.rpc('profiles_public').eq('id', trip.owner_id).single();
  const waypointsQuery = supabase
    .from('trip_waypoints')
    .select('label, lat, lng, kind')
    .eq('trip_id', trip.id)
    .order('sort', { ascending: true });
  const attendeeQuery = user
    ? supabase
        .from('attendees')
        .select('status')
        .eq('trip_id', trip.id)
        .eq('profile_id', user.id)
        .maybeSingle()
    : Promise.resolve({ data: null });
  const confirmedRowsQuery = supabase
    .from('attendees')
    .select('id, profile_id, attendance, payment_status, payment_evidence_path')
    .eq('trip_id', trip.id)
    .eq('status', 'confirmed')
    .order('joined_at', { ascending: true });

  const customFieldsQuery = supabase
    .from('trip_custom_fields')
    .select('label, value')
    .eq('trip_id', trip.id)
    .order('sort', { ascending: true });
  const linksQuery = supabase
    .from('trip_links')
    .select('id, url, label, og_title, og_description, og_image_url')
    .eq('trip_id', trip.id)
    .order('sort', { ascending: true });
  const itineraryQuery = supabase
    .from('itinerary_blocks')
    .select('id, day_index, start_time, label, description, photo_url, icon')
    .eq('trip_id', trip.id)
    .order('day_index', { ascending: true });

  const [
    ownerResult,
    attendeeResult,
    confirmedRowsResult,
    waypointsResult,
    customFieldsResult,
    linksResult,
    itineraryResult,
  ] = await Promise.all([
    ownerQuery,
    attendeeQuery,
    confirmedRowsQuery,
    waypointsQuery,
    customFieldsQuery,
    linksQuery,
    itineraryQuery,
  ]);
  const owner = ownerResult.data as { display_name: string | null } | null;
  const waypoints = waypointsResult.data ?? [];
  const customFields = customFieldsResult.data ?? [];
  const links: TripLinkData[] = (linksResult.data ?? []).map((l) => ({
    id: l.id,
    url: l.url,
    label: l.label,
    ogTitle: l.og_title,
    ogDescription: l.og_description,
    ogImageUrl: l.og_image_url,
  }));
  const itineraryBlocks: ItineraryBlockData[] = (itineraryResult.data ?? []).map((b) => ({
    id: b.id,
    dayIndex: b.day_index,
    startTime: b.start_time,
    label: b.label,
    description: b.description,
    photoUrl: b.photo_url,
    icon: b.icon,
  }));
  const myAttendance = attendeeResult.data as { status: string } | null;
  const confirmedIds = (confirmedRowsResult.data ?? []).map(
    (row) => row.profile_id as string
  );

  const { data: attendeeProfilesData } =
    confirmedIds.length > 0
      ? await supabase.rpc('profiles_public').in('id', confirmedIds)
      : { data: [] };
  const attendeeProfiles = (attendeeProfilesData ?? []) as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  const profileById = new Map(attendeeProfiles.map((p) => [p.id, p]));
  const attendees: AttendeeData[] = confirmedIds.map((profileId) => {
    const profile = profileById.get(profileId);
    return {
      id: profileId,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });

  const attendeeStatus: AttendeeStatus =
    myAttendance?.status === 'confirmed' || myAttendance?.status === 'waitlisted'
      ? myAttendance.status
      : null;

  const confirmedRows = (confirmedRowsResult.data ?? []) as {
    id: string;
    profile_id: string;
    attendance: string | null;
    payment_status: string;
    payment_evidence_path: string | null;
  }[];
  const checkinRows: CheckinAttendeeData[] = confirmedRows.map((row) => ({
    attendeeId: row.id,
    profileId: row.profile_id,
    displayName: profileById.get(row.profile_id)?.display_name ?? null,
    attendance: row.attendance,
    paymentStatus: row.payment_status,
    paymentEvidencePath: row.payment_evidence_path,
  }));
  const myConfirmedRow = user ? confirmedRows.find((row) => row.profile_id === user.id) : undefined;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });

  const spotsLeft =
    trip.capacity != null ? trip.capacity - trip.confirmed_count : null;
  const isFull = spotsLeft != null && spotsLeft <= 0;
  const hasStarted = new Date(trip.start_at) <= new Date();
  const isOwner = user?.id === trip.owner_id;
  const canOpenChat = isOwner || attendeeStatus !== null;

  let isHostTeam = isOwner;
  if (!isHostTeam && user && trip.agency_id) {
    const { data: staffRow } = await supabase
      .from('agency_members')
      .select('id')
      .eq('agency_id', trip.agency_id)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isHostTeam = !!staffRow;
  }

  let tourQuestions: TourQuestionData[] = [];
  if (trip.type === 'tour') {
    const { data: questionRows } = await supabase
      .from('tour_questions')
      .select('id, asked_by, question, answer, answered_at, created_at')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    const askerIds = [...new Set((questionRows ?? []).map((q) => q.asked_by))];
    const { data: askerProfiles } =
      askerIds.length > 0 ? await supabase.rpc('profiles_public').in('id', askerIds) : { data: [] };
    const askerNameById = new Map(
      ((askerProfiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
    );

    tourQuestions = (questionRows ?? []).map((q) => ({
      id: q.id,
      askedBy: q.asked_by,
      askedByName: askerNameById.get(q.asked_by) ?? null,
      question: q.question,
      answer: q.answer,
      answeredAt: q.answered_at,
      createdAt: q.created_at,
    }));
  }

  let reviews: ReviewData[] = [];
  let canReview = false;
  let sinpePhone: string | null = null;
  if (trip.type === 'tour') {
    if (trip.agency_id) {
      const { data: agencyRow } = await supabase
        .from('agencies')
        .select('sinpe_phone')
        .eq('id', trip.agency_id)
        .single();
      sinpePhone = agencyRow?.sinpe_phone ?? null;
    }

    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('id, reviewer_id, rating, body, response_text, responded_at, created_at')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    const reviewerIds = [...new Set((reviewRows ?? []).map((r) => r.reviewer_id))];
    const { data: reviewerProfiles } =
      reviewerIds.length > 0 ? await supabase.rpc('profiles_public').in('id', reviewerIds) : { data: [] };
    const reviewerNameById = new Map(
      ((reviewerProfiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
    );

    reviews = (reviewRows ?? []).map((r) => ({
      id: r.id,
      reviewerId: r.reviewer_id,
      reviewerName: reviewerNameById.get(r.reviewer_id) ?? null,
      rating: r.rating,
      body: r.body,
      responseText: r.response_text,
      respondedAt: r.responded_at,
      createdAt: r.created_at,
    }));

    if (user && new Date(trip.start_at) < new Date()) {
      const alreadyReviewed = reviews.some((r) => r.reviewerId === user.id);
      const { data: myAttendee } = await supabase
        .from('attendees')
        .select('attendance')
        .eq('trip_id', trip.id)
        .eq('profile_id', user.id)
        .maybeSingle();
      canReview = !alreadyReviewed && myAttendee?.attendance === 'attended';
    }
  }

  if (trip.visibility === 'private') {
    const [invitesResult, packingResult, expensesResult, pollsResult, votesResult] = await Promise.all([
      isOwner
        ? supabase
            .from('plan_invites')
            .select('id, token, expires_at, max_uses, uses, revoked_at, created_at')
            .eq('trip_id', trip.id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from('packing_items')
        .select('id, name, done, assigned_to, sort, created_at')
        .eq('trip_id', trip.id)
        .order('sort', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('expenses')
        .select('id, paid_by, amount_crc, description, created_at')
        .eq('trip_id', trip.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('polls')
        .select('id, question, options, created_by, closes_at, created_at')
        .eq('trip_id', trip.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('poll_votes').select('poll_id, profile_id, option_key'),
    ]);

    const invites: PlanInvite[] = (invitesResult.data ?? []).map((inv) => ({
      id: inv.id,
      token: inv.token,
      expiresAt: inv.expires_at,
      maxUses: inv.max_uses,
      uses: inv.uses,
      revokedAt: inv.revoked_at,
    }));

    const packingItems: PackingItemData[] = (packingResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      done: item.done,
      assignedTo: item.assigned_to,
    }));

    const expenses: ExpenseData[] = (expensesResult.data ?? []).map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      amountCrc: e.amount_crc,
      description: e.description,
      createdAt: e.created_at,
    }));

    const votes = votesResult.data ?? [];
    const polls: PollData[] = (pollsResult.data ?? []).map((poll) => {
      const pollVotes = votes.filter((v) => v.poll_id === poll.id);
      const votesByOption: Record<string, number> = {};
      for (const v of pollVotes) {
        votesByOption[v.option_key] = (votesByOption[v.option_key] ?? 0) + 1;
      }
      const mine = user ? pollVotes.find((v) => v.profile_id === user.id) : undefined;
      return {
        id: poll.id,
        question: poll.question,
        options: poll.options as PollOption[],
        createdBy: poll.created_by,
        closesAt: poll.closes_at,
        votesByOption,
        myVote: mine?.option_key ?? null,
      };
    });

    const members = attendees.map((a) => ({ id: a.id, displayName: a.displayName }));

    return (
      <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <Link
            href="/feed"
            className="text-sm font-medium text-forest-600 hover:underline dark:text-forest-400"
          >
            &larr; {t('detailBack')}
          </Link>

          <div className="relative mt-6 rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <Badge variant="secondary">{t('privatePlanBadge')}</Badge>

            <div className="mt-4 flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
                {trip.title}
              </h1>
              {isOwner && (
                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    href={`/trips/${trip.id}/edit`}
                    className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
                  >
                    <PencilSimple size={16} weight="regular" strokeWidth={1.5} />
                    {t('editTrip')}
                  </Link>
                  <DeleteTripButton tripId={trip.id} />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-y border-neutral-200 py-6 dark:border-neutral-800">
              <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <CalendarBlank size={18} weight="regular" strokeWidth={1.5} />
                {dateFormatter.format(new Date(trip.start_at))}
              </p>
              <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <MapPin size={18} weight="regular" strokeWidth={1.5} />
                {trip.location_name}
              </p>
            </div>

            <MarkdownContent content={trip.description} className="mt-6" />

            <CustomFieldsDisplay fields={customFields} />

            {trip.lat != null && trip.lng != null && (
              <div className="mt-6">
                <TripRouteMap
                  meetingPoint={{ label: trip.location_name, lat: trip.lat, lng: trip.lng }}
                  waypoints={waypoints}
                />
              </div>
            )}

            {links.length > 0 && (
              <div className="mt-6 flex flex-col gap-2">
                {links.map((link) => (
                  <LinkPreviewCard key={link.id} link={link} />
                ))}
              </div>
            )}

            <div className="mt-8">
              <Link
                href={`/trips/${trip.id}/chat`}
                className={buttonVariants({ size: 'md', variant: 'outline' })}
              >
                <ChatCircleText size={18} weight="regular" strokeWidth={1.5} />
                {t('openChat')}
              </Link>
            </div>

            <AttendeeList attendees={attendees} currentUserId={user?.id} />
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {isOwner && <InviteManager tripId={trip.id} initialInvites={invites} />}
            {user && (
              <>
                <PlanMembers
                  tripId={trip.id}
                  currentUserId={user.id}
                  ownerId={trip.owner_id}
                  isOwner={isOwner}
                  members={attendees}
                />
                <PackingList
                  tripId={trip.id}
                  currentUserId={user.id}
                  isHostTeam={isOwner}
                  initialItems={packingItems}
                  members={members}
                />
                <ExpensesList
                  tripId={trip.id}
                  currentUserId={user.id}
                  isHostTeam={isOwner}
                  initialExpenses={expenses}
                  members={members}
                />
                <PollsList
                  tripId={trip.id}
                  currentUserId={user.id}
                  isHostTeam={isOwner}
                  initialPolls={polls}
                />
                <ItineraryList
                  tripId={trip.id}
                  currentUserId={user.id}
                  canAdd
                  canDelete={isOwner}
                  initialBlocks={itineraryBlocks}
                />
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <Link
          href="/feed"
          className="text-sm font-medium text-forest-600 hover:underline dark:text-forest-400"
        >
          &larr; {t('detailBack')}
        </Link>

        <div className="relative mt-6 rounded-xl border border-neutral-200 bg-white p-8 pb-16 dark:border-neutral-800 dark:bg-neutral-900">
          <Badge variant="default">{tCategories(trip.category)}</Badge>

          <h1 className="mt-4 text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
            {trip.title}
          </h1>

          <div className="mt-2 flex items-center justify-between gap-4">
            {owner?.display_name && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.rich('detailBy', {
                  name: owner.display_name,
                  link: (chunks) => (
                    <Link
                      href={`/users/${trip.owner_id}`}
                      className="font-medium text-neutral-700 hover:underline dark:text-neutral-300"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
            {isHostTeam ? (
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={
                    trip.type === 'tour'
                      ? `/agencies/${trip.agency_id}/tours/${trip.id}/edit`
                      : `/trips/${trip.id}/edit`
                  }
                  className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
                >
                  <PencilSimple size={16} weight="regular" strokeWidth={1.5} />
                  {t('editTrip')}
                </Link>
                <DeleteTripButton
                  tripId={trip.id}
                  redirectTo={trip.type === 'tour' ? `/agencies/${trip.agency_id}/panel` : '/my-trips'}
                />
              </div>
            ) : (
              user && <ReportButton targetType="trip" targetId={trip.id} />
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-y border-neutral-200 py-6 dark:border-neutral-800">
            <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <CalendarBlank size={18} weight="regular" strokeWidth={1.5} />
              {dateFormatter.format(new Date(trip.start_at))}
            </p>
            <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <MapPin size={18} weight="regular" strokeWidth={1.5} />
              {trip.location_name}
            </p>
            <p className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <UsersThree size={18} weight="regular" strokeWidth={1.5} />
              {trip.capacity == null
                ? tFeed('openCapacity')
                : isFull
                  ? tFeed('full')
                  : tFeed('spotsLeft', { count: spotsLeft })}
            </p>
            {trip.type === 'tour' && trip.price_crc != null && (
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {new Intl.NumberFormat(locale, { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(
                  trip.price_crc
                )}
                <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">
                  {t('perPerson')}
                </span>
              </p>
            )}
          </div>

          <MarkdownContent content={trip.description} className="mt-6" />

          <CustomFieldsDisplay fields={customFields} />

          {trip.lat != null && trip.lng != null && (
            <div className="mt-6">
              <TripRouteMap
                meetingPoint={{ label: trip.location_name, lat: trip.lat, lng: trip.lng }}
                waypoints={waypoints}
              />
            </div>
          )}

          {links.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              {links.map((link) => (
                <LinkPreviewCard key={link.id} link={link} />
              ))}
            </div>
          )}

          {(itineraryBlocks.length > 0 || isHostTeam) && (
            <div className="mt-6">
              <ItineraryList
                tripId={trip.id}
                currentUserId={user?.id ?? ''}
                canAdd={isHostTeam}
                canDelete={isHostTeam}
                initialBlocks={itineraryBlocks}
              />
            </div>
          )}

          <div className="mt-8 flex flex-col items-start gap-3">
            <JoinTripButton
              tripId={trip.id}
              initialStatus={attendeeStatus}
              isAuthenticated={!!user}
              isOwner={isHostTeam}
              isFull={isFull}
              hasStarted={hasStarted}
            />
            {canOpenChat && (
              <Link
                href={`/trips/${trip.id}/chat`}
                className={buttonVariants({ size: 'md', variant: 'outline' })}
              >
                <ChatCircleText size={18} weight="regular" strokeWidth={1.5} />
                {t('openChat')}
              </Link>
            )}
          </div>

          <AttendeeList attendees={attendees} currentUserId={user?.id} />
        </div>

        {trip.type === 'tour' && (
          <div className="mt-6 flex flex-col gap-6">
            {isHostTeam && <TourCheckin tripId={trip.id} initialAttendees={checkinRows} />}
            {!isHostTeam && attendeeStatus === 'confirmed' && myConfirmedRow && (
              <TourPayment
                attendeeId={myConfirmedRow.id}
                sinpePhone={sinpePhone}
                paymentStatus={myConfirmedRow.payment_status}
              />
            )}
            <TourReviews
              tripId={trip.id}
              currentUserId={user?.id}
              isHostTeam={isHostTeam}
              canReview={canReview}
              initialReviews={reviews}
            />
            <TourQA
              tripId={trip.id}
              currentUserId={user?.id}
              isHostTeam={isHostTeam}
              initialQuestions={tourQuestions}
            />
          </div>
        )}
      </div>
    </main>
  );
}
