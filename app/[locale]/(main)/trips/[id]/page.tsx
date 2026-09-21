import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import {
  CalendarBlank,
  MapPin,
  UsersThree,
  ChatCircleText,
  PencilSimple,
  ArrowLeft,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
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
import { TripDocuments, type TripDocumentData } from '@/components/plans/trip-documents';
import { CustomFieldsDisplay } from '@/components/trips/custom-fields-display';
import { LinkPreviewCard, type TripLinkData } from '@/components/trips/link-preview-card';
import { TourQA, type TourQuestionData } from '@/components/agencies/tour-qa';
import { TourCheckin, type CheckinAttendeeData } from '@/components/agencies/tour-checkin';
import { TourReviews, type ReviewData } from '@/components/agencies/tour-reviews';
import { TourPayment } from '@/components/agencies/tour-payment';
import { TourExclusiveContent } from '@/components/agencies/tour-exclusive-content';
import { WaitlistPanel, type WaitlistRowData } from '@/components/trips/waitlist-panel';
import {
  Dossier,
  CaseHeader,
  StatusStamp,
  FolderTabs,
  FolderFace,
  PageBody,
  type FolderTab,
} from '@/components/cordillera/folder';

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: requestedTab } = await searchParams;
  const supabase = await createClient();
  const t = await getTranslations('trips');
  const tCategories = await getTranslations('categories');
  const tFeed = await getTranslations('feed');
  const locale = await getLocale();

  const { data: trip } = await supabase
    .from('trips')
    .select(
      'id, title, description, category, location_name, lat, lng, start_at, end_at, capacity, confirmed_count, owner_id, visibility, type, agency_id, price_crc, min_participants, tour_group_id'
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
  const confirmedIds = (confirmedRowsResult.data ?? []).map((row) => row.profile_id as string);

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
  const myConfirmedRow = user
    ? confirmedRows.find((row) => row.profile_id === user.id)
    : undefined;

  // RLS-filtered: a non-host-team user only ever gets back their own
  // waitlisted row here (see "attendees: read own or organizer or
  // admin", migration 0004), so this doubles as both the host team's
  // full roster and a regular attendee's "am I on it" check.
  let waitlistRows: WaitlistRowData[] = [];
  let myWaitlistPosition: number | null = null;
  if (trip.visibility !== 'private') {
    const { data: waitlistData } = await supabase
      .from('attendees')
      .select('id, profile_id')
      .eq('trip_id', trip.id)
      .eq('status', 'waitlisted')
      .order('joined_at', { ascending: true });

    const waitlistProfileIds = (waitlistData ?? []).map((row) => row.profile_id);
    const { data: waitlistProfilesData } =
      waitlistProfileIds.length > 0
        ? await supabase.rpc('profiles_public').in('id', waitlistProfileIds)
        : { data: [] };
    const waitlistProfileById = new Map(
      ((waitlistProfilesData ?? []) as { id: string; display_name: string | null }[]).map((p) => [
        p.id,
        p.display_name,
      ])
    );
    waitlistRows = (waitlistData ?? []).map((row) => ({
      id: row.id,
      displayName: waitlistProfileById.get(row.profile_id) ?? null,
    }));

    if (myAttendance?.status === 'waitlisted') {
      const { data: position } = await supabase.rpc('get_my_waitlist_position', {
        p_trip_id: trip.id,
      });
      myWaitlistPosition = position ?? null;
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });

  const spotsLeft = trip.capacity != null ? trip.capacity - trip.confirmed_count : null;
  const isFull = spotsLeft != null && spotsLeft <= 0;
  const hasStarted = new Date(trip.start_at) <= new Date();
  const isOwner = user?.id === trip.owner_id;
  const canOpenChat = isOwner || attendeeStatus !== null;
  const isPrivate = trip.visibility === 'private';
  const isTour = trip.type === 'tour';

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
  if (isTour) {
    const { data: questionRows } = await supabase
      .from('tour_questions')
      .select('id, asked_by, question, answer, answered_at, created_at')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    const askerIds = [...new Set((questionRows ?? []).map((q) => q.asked_by))];
    const { data: askerProfiles } =
      askerIds.length > 0 ? await supabase.rpc('profiles_public').in('id', askerIds) : { data: [] };
    const askerNameById = new Map(
      ((askerProfiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [
        p.id,
        p.display_name,
      ])
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

  let otherDates: { id: string; startAt: string; spotsLeft: number | null }[] = [];
  if (isTour && trip.tour_group_id) {
    const { data: siblingRows } = await supabase
      .from('trips')
      .select('id, start_at, capacity, confirmed_count')
      .eq('tour_group_id', trip.tour_group_id)
      .eq('status', 'published')
      .neq('id', trip.id)
      .order('start_at', { ascending: true });

    otherDates = (siblingRows ?? []).map((row) => ({
      id: row.id,
      startAt: row.start_at,
      spotsLeft: row.capacity != null ? row.capacity - row.confirmed_count : null,
    }));
  }

  let exclusiveContent: string | null = null;
  if (isTour && user) {
    const { data: exclusiveRow } = await supabase
      .from('tour_exclusive_content')
      .select('content')
      .eq('trip_id', trip.id)
      .maybeSingle();
    exclusiveContent = exclusiveRow?.content ?? null;
  }

  let reviews: ReviewData[] = [];
  let canReview = false;
  let sinpePhone: string | null = null;
  if (isTour) {
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
      reviewerIds.length > 0
        ? await supabase.rpc('profiles_public').in('id', reviewerIds)
        : { data: [] };
    const reviewerNameById = new Map(
      ((reviewerProfiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [
        p.id,
        p.display_name,
      ])
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

  /* ---------------------------------------------------------------
     Private-plan workspace data. Only fetched for a private plan, so
     a public trip never pays for six extra round trips.
     --------------------------------------------------------------- */
  let invites: PlanInvite[] = [];
  let packingItems: PackingItemData[] = [];
  let expenses: ExpenseData[] = [];
  let polls: PollData[] = [];
  let documents: TripDocumentData[] = [];

  if (isPrivate) {
    const [invitesResult, packingResult, expensesResult, pollsResult, votesResult, documentsResult] =
      await Promise.all([
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
        user
          ? supabase
              .from('trip_documents')
              .select('id, file_name, storage_path, file_size, created_at')
              .eq('trip_id', trip.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

    invites = (invitesResult.data ?? []).map((inv) => ({
      id: inv.id,
      token: inv.token,
      expiresAt: inv.expires_at,
      maxUses: inv.max_uses,
      uses: inv.uses,
      revokedAt: inv.revoked_at,
    }));

    packingItems = (packingResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      done: item.done,
      assignedTo: item.assigned_to,
    }));

    expenses = (expensesResult.data ?? []).map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      amountCrc: e.amount_crc,
      description: e.description,
      createdAt: e.created_at,
    }));

    const votes = votesResult.data ?? [];
    polls = (pollsResult.data ?? []).map((poll) => {
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

    documents = (documentsResult.data ?? []).map((d) => ({
      id: d.id,
      fileName: d.file_name,
      storagePath: d.storage_path,
      fileSize: d.file_size,
      createdAt: d.created_at,
    }));
  }

  const members = attendees.map((a) => ({ id: a.id, displayName: a.displayName }));

  /* ---------------------------------------------------------------
     Tabs. Which sections a folder has depends on what kind of trip it
     is and who is looking — a private plan carries the full workspace,
     a tour carries Q&A and reviews, and a plain social trip carries
     neither. The active tab is a URL parameter rather than client
     state so a section is linkable, survives a reload, and renders on
     the server.
     --------------------------------------------------------------- */
  const tabKeys: string[] = ['overview'];
  if (itineraryBlocks.length > 0 || isHostTeam || isPrivate) tabKeys.push('itinerary');
  if (isPrivate && user) tabKeys.push('packing', 'expenses', 'polls', 'documents');
  if (isTour) tabKeys.push('qa', 'reviews');
  tabKeys.push('people');

  const activeTab = requestedTab && tabKeys.includes(requestedTab) ? requestedTab : 'overview';

  const tabs: FolderTab[] = tabKeys.map((key) => ({
    href: key === 'overview' ? `/trips/${trip.id}` : `/trips/${trip.id}?tab=${key}`,
    label: t(`tab_${key}` as never),
    active: key === activeTab,
  }));

  const editHref = isTour
    ? `/agencies/${trip.agency_id}/tours/${trip.id}/edit`
    : `/trips/${trip.id}/edit`;

  const stamp = isPrivate ? (
    <StatusStamp tone="inert">{t('privatePlanBadge')}</StatusStamp>
  ) : isFull ? (
    <StatusStamp tone="hold">{tFeed('full')}</StatusStamp>
  ) : hasStarted ? (
    <StatusStamp tone="inert">{t('stampPast')}</StatusStamp>
  ) : (
    <StatusStamp tone="go">{t('stampOpen')}</StatusStamp>
  );

  return (
    <PageBody className="max-w-[1000px]">
      <Link
        href={isPrivate ? '/my-trips' : '/feed'}
        className="micro-label mb-6 inline-flex items-center gap-1.5 transition-colors hover:text-sand-800 dark:hover:text-sand-200"
      >
        <ArrowLeft size={13} weight="bold" />
        {t('detailBack')}
      </Link>

      <Dossier>
        <CaseHeader
          title={trip.title}
          stamp={stamp}
          /**
           * The surface's one primary action. For a visitor that's
           * joining — the entire reason they opened this page — so it
           * sits here in dawn, alone. The host team sees edit/delete
           * instead, because they cannot join their own trip.
           * `ReportButton` used to occupy this slot, which put a
           * moderation affordance where the call to action belongs.
           */
          action={
            isHostTeam ? (
              <div className="flex items-center gap-2">
                <Link
                  href={editHref}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <PencilSimple size={15} />
                  {t('editTrip')}
                </Link>
                <DeleteTripButton
                  tripId={trip.id}
                  redirectTo={isTour ? `/agencies/${trip.agency_id}/panel` : '/my-trips'}
                />
              </div>
            ) : (
              !isPrivate && (
                <JoinTripButton
                  tripId={trip.id}
                  initialStatus={attendeeStatus}
                  isAuthenticated={!!user}
                  isOwner={isHostTeam}
                  isFull={isFull}
                  hasStarted={hasStarted}
                  waitlistPosition={myWaitlistPosition}
                />
              )
            )
          }
          meta={
            <>
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={15} className="shrink-0 text-sand-400" />
                {dateFormatter.format(new Date(trip.start_at))}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={15} className="shrink-0 text-sand-400" />
                {trip.location_name}
              </span>
              <span className="flex items-center gap-1.5">
                <UsersThree size={15} className="shrink-0 text-sand-400" />
                {trip.capacity == null
                  ? tFeed('openCapacity')
                  : isFull
                    ? tFeed('full')
                    : tFeed('spotsLeft', { count: spotsLeft })}
              </span>
              {isTour && trip.price_crc != null && (
                <span className="tnum font-display font-bold text-sand-900 dark:text-sand-50">
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: 'CRC',
                    maximumFractionDigits: 0,
                  }).format(trip.price_crc)}
                  <span className="ml-1 font-sans font-normal text-sand-500">
                    {t('perPerson')}
                  </span>
                </span>
              )}
              {owner?.display_name && !isTour && (
                <Link href={`/users/${trip.owner_id}`} className="link">
                  {t('detailByPlain', { name: owner.display_name })}
                </Link>
              )}
            </>
          }
        />

        <FolderTabs tabs={tabs} />

        <FolderFace seam>
          {/* `key` restarts the entrance animation on every tab change,
              which is the "leafing" read: the face holds, the contents
              turn. */}
          <div key={activeTab} className="animate-leaf">
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-7">
                {otherDates.length > 0 && (
                  <section>
                    <h2 className="micro-label mb-3">{t('otherDatesTitle')}</h2>
                    <div className="flex flex-wrap gap-2">
                      {otherDates.map((date) => {
                        const dateIsFull = date.spotsLeft != null && date.spotsLeft <= 0;
                        return (
                          <Link
                            key={date.id}
                            href={`/trips/${date.id}`}
                            className="tnum rounded-full border border-sand-300 px-3.5 py-2 text-sm font-medium text-sand-700 transition-colors hover:border-forest-600 hover:text-forest-700 dark:border-sand-600 dark:text-sand-300 dark:hover:border-forest-400 dark:hover:text-forest-300"
                          >
                            {new Intl.DateTimeFormat(locale, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }).format(new Date(date.startAt))}
                            {dateIsFull && (
                              <span className="ml-1.5 text-xs text-sand-400">
                                ({t('otherDatesFull')})
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                <MarkdownContent content={trip.description} />

                <CustomFieldsDisplay fields={customFields} />

                {trip.lat != null && trip.lng != null && (
                  <TripRouteMap
                    meetingPoint={{
                      label: trip.location_name,
                      lat: trip.lat,
                      lng: trip.lng,
                    }}
                    waypoints={waypoints}
                  />
                )}

                {links.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {links.map((link) => (
                      <LinkPreviewCard key={link.id} link={link} />
                    ))}
                  </div>
                )}

                {isTour && !isHostTeam && attendeeStatus === 'confirmed' && myConfirmedRow && (
                  <TourPayment
                    attendeeId={myConfirmedRow.id}
                    sinpePhone={sinpePhone}
                    paymentStatus={myConfirmedRow.payment_status}
                  />
                )}

                {isTour && exclusiveContent && <TourExclusiveContent content={exclusiveContent} />}

                {/* Secondary actions only — the primary (join) lives in
                    the case header. Reporting sits here, next to the
                    content it would be reporting, rather than in the
                    header slot that belongs to the call to action. */}
                <div className="flex flex-wrap items-center gap-3 border-t border-sand-200 pt-6 dark:border-sand-800">
                  {(canOpenChat || isPrivate) && (
                    <Link
                      href={`/trips/${trip.id}/chat`}
                      className={buttonVariants({ variant: 'outline' })}
                    >
                      <ChatCircleText size={17} />
                      {t('openChat')}
                    </Link>
                  )}
                  {user && !isHostTeam && (
                    <div className="ml-auto">
                      <ReportButton targetType="trip" targetId={trip.id} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'itinerary' && (
              <ItineraryList
                tripId={trip.id}
                currentUserId={user?.id ?? ''}
                canAdd={isPrivate ? !!user : isHostTeam}
                canDelete={isPrivate ? isOwner : isHostTeam}
                initialBlocks={itineraryBlocks}
              />
            )}

            {activeTab === 'packing' && user && (
              <PackingList
                tripId={trip.id}
                currentUserId={user.id}
                isHostTeam={isOwner}
                initialItems={packingItems}
                members={members}
              />
            )}

            {activeTab === 'expenses' && user && (
              <ExpensesList
                tripId={trip.id}
                currentUserId={user.id}
                isHostTeam={isOwner}
                initialExpenses={expenses}
                members={members}
              />
            )}

            {activeTab === 'polls' && user && (
              <PollsList
                tripId={trip.id}
                currentUserId={user.id}
                isHostTeam={isOwner}
                initialPolls={polls}
              />
            )}

            {activeTab === 'documents' && user && (
              <TripDocuments
                tripId={trip.id}
                isHostTeam={isOwner}
                initialDocuments={documents}
              />
            )}

            {activeTab === 'qa' && (
              <TourQA
                tripId={trip.id}
                currentUserId={user?.id}
                isHostTeam={isHostTeam}
                initialQuestions={tourQuestions}
              />
            )}

            {activeTab === 'reviews' && (
              <TourReviews
                tripId={trip.id}
                currentUserId={user?.id}
                isHostTeam={isHostTeam}
                canReview={canReview}
                initialReviews={reviews}
              />
            )}

            {activeTab === 'people' && (
              <div className="flex flex-col gap-8">
                {isPrivate && user && (
                  <PlanMembers
                    tripId={trip.id}
                    currentUserId={user.id}
                    ownerId={trip.owner_id}
                    isOwner={isOwner}
                    members={attendees}
                  />
                )}
                {!isPrivate && <AttendeeList attendees={attendees} currentUserId={user?.id} />}
                {isHostTeam && !isPrivate && <WaitlistPanel rows={waitlistRows} />}
                {isTour && isHostTeam && (
                  <TourCheckin tripId={trip.id} initialAttendees={checkinRows} />
                )}
                {isPrivate && isOwner && (
                  <InviteManager tripId={trip.id} initialInvites={invites} />
                )}
              </div>
            )}
          </div>
        </FolderFace>
      </Dossier>
    </PageBody>
  );
}
