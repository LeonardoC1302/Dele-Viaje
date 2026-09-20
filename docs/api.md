# Dele Viaje — API Surface

**Convention:** Reads = Server Components + Supabase client (RLS-gated, no API needed). **Writes and business-rules = Route Handlers** (`app/api/**/route.ts`) using `POST`/`PATCH`/`DELETE`, JSON bodies, zod-validated. Responses: typed `ApiError { code, message }` or success payload.

Auth: session from cookies (Supabase SSR client). Auth guard inside each handler; RLS is the second layer.

> **Status note (2026-09-20):** this document describes the *original
> target* API surface. A large amount of the app's actual write traffic
> ended up going through `SECURITY DEFINER` Postgres RPCs
> (`supabase.rpc(...)`) called directly from Server Components/Actions or
> thin Route Handler wrappers, rather than the fuller REST-shaped surface
> sketched below — many routes listed here (per-module plan endpoints,
> `/checkin`, `/waitlist`, `/push/*`, `/admin/metrics`, `/duplicate`,
> `/cancel`, `/cohosts`, chat message PATCH/DELETE as its own route, etc.)
> were **never built as separate endpoints**; the underlying action still
> exists, just via direct Supabase-client table writes (RLS-gated) or an
> RPC call. See `docs/frontend-migration-reference.md` §3.2 for the
> actual current `app/api/**` route list with methods/purpose/auth, and
> §2.8 for the RPC catalog. The sections below are kept for the
> *conceptual* shape (resource grouping, error convention) but should not
> be read as "this route exists" without cross-checking that doc.

---

## 1. Auth / Session
Handled by Supabase Auth + Next SSR cookie helpers, plus:

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/callback` | GET | OAuth + PKCE callback (per docs) |
| `/api/auth/signout` | POST | revoke session |

## 2. Profiles & Social
| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding` | PATCH | complete onboarding (name, locale, avatar, prefs) |
| `/api/u/{username}` | GET | public profile payload (server-only; also RSC) |
| `/api/follows/{profileId}` | POST / DELETE | follow / unfollow |
| `/api/follows` | GET | my following list |

## 3. Trips
| Route | Method | Purpose |
|---|---|---|
| `/api/trips` | POST | create (draft); handles recurrence + visibility + type |
| `/api/trips/{id}` | GET | detail (RSC mostly) |
| `/api/trips/{id}` | PATCH | edit (structure; owner/cohost/agency) |
| `/api/trips/{id}` | DELETE | delete (draft only) / archive |
| `/api/trips/{id}/publish` | POST | draft → published (locks visibility) |
| `/api/trips/{id}/cancel` | POST | host cancel + reason → notify all |
| `/api/trips/{id}/itinerary` | POST / PATCH | add/edit itinerary blocks (permission split §4.5) |
| `/api/trips/{id}/duplicate` | POST | reuse a past trip as template |
| `/api/trips/{id}/join` | POST | RSVP / reserve spot (transactional seat) |
| `/api/trips/{id}/leave` | POST | cancel own spot → triggers waitlist promotion |
| `/api/trips/{id}/waitlist` | POST | admin action: promote / clear / reject |
| `/api/trips/{id}/cohosts` | POST / DELETE | grant / revoke co-host |
| `/api/trips/{id}/members/{uid}` | DELETE | host removes a member (notify) |

## 4. Private Plans — Invites & Workspace
| Route | Method | Purpose |
|---|---|---|
| `/api/plans/{id}/invites` | POST | create direct invite (by username/email → notification) |
| `/api/plans/{id}/invites/link` | POST | generate link token (expiry, max_uses) |
| `/api/plans/{id}/invites/{token}/revoke` | PATCH | revoke |
| `/api/plans/join/{token}` | POST | validate + join via link (idempotent, rejects if full/expired/revoked) |
| `/api/plans/{id}/checklist` | POST / PATCH | packing items + prerequisites (toggle/assign) |
| `/api/plans/{id}/expenses` | POST / PATCH | add / edit / delete expenses |
| `/api/plans/{id}/polls` | POST | create poll |
| `/api/plans/{id}/polls/{pid}/vote` | POST / DELETE | toggle vote |
| `/api/plans/{id}/docs` | POST | upload doc → row (signed URL used client-side) |
| `/api/plans/{id}/docs/{docId}` | DELETE | remove |
| `/api/plans/{id}/transfer` | POST | hand ownership to a member |
| `/api/plans/{id}/lock` | PATCH | owner locks a module (checklist, budget, itinerary) |

## 5. Chat
| Route | Method | Purpose |
|---|---|---|
| `/api/trips/{id}/messages` | GET | recent history + pagination (RLS) |
| (realtime) | — | subscribe `trip:{id}`; rows authoritative |
| `/api/trips/{id}/messages/{mid}` | PATCH / DELETE | edit own / delete (own, host, or co-host) |
| `/api/trips/{id}/chat-settings` | PATCH | whatsapp link, announcements-only, mute |
| `/api/trips/{id}/members/{uid}/mute` | POST | cohost mute + expiry |

## 6. Check-in & Reviews
| Route | Method | Purpose |
|---|---|---|
| `/api/trips/{id}/checkin/qr` | GET | host: current QR (expiring signed payload) |
| `/api/trips/{id}/checkin` | POST | attendee submits scan → `checked_in` |
| `/api/trips/{id}/attendance/{uid}` | PATCH | host marks `attended` / `no_show` (manual fallback) |
| `/api/trips/{id}/review` | POST | create review (gated: attended + completed) |
| `/api/reviews/{id}` | PATCH / DELETE | edit own / soft-hide |
| `/api/reviews/{id}/response` | POST | agency reply |

## 7. Agencies & Panel
| Route | Method | Purpose |
|---|---|---|
| `/api/agencies/apply` | POST | submit application + docs |
| `/api/agencies/{id}` | PATCH | edit public profile |
| `/api/agencies/{id}/members` | POST / DELETE | invite / remove staff |
| `/api/agencies/{id}/tours` | POST | create tour draft (agency staff) |
| `/api/admin/agencies/{id}/approve` | POST | super-admin approve / reject / suspend |
| `/api/admin/trips/{id}/moderate` | PATCH | suspend / unsuspend trip |

## 8. Super-Admin
| Route | Method | Purpose |
|---|---|---|
| `/api/admin/metrics` | GET | dashboard aggregates |
| `/api/admin/reports` | GET / PATCH | report ticket queue + resolve/dismiss |
| `/api/admin/users/{id}` | PATCH | ban / unban / suspend |
| `/api/admin/config` | GET / PATCH | currency rate, feature flags, badges |
| `/api/admin/badges` | POST / DELETE | grant / revoke badge |

## 9. Notifications & Push
| Route | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | unread + history (paginated, mark-read batch) |
| `/api/notifications/read` | POST | mark one / all read |
| `/api/push/subscribe` | POST | store VAPID subscription |
| `/api/push/unsubscribe` | POST | remove |
| (dispatcher) | — | consumes new notifications → push + email |

## 10. Files & Media
| Route | Method | Purpose |
|---|---|---|
| `/api/uploads/signed` | POST | return signed upload URL (bucket + gated by trip/plan membership) |
| `/api/uploads/strip-metadata` | (server util) | EXIF/GPS removal before write |
| `/api/uploads/signed-read` | POST | short-TTL read URL for private docs |

---

## Error & Status Convention
- `401` session missing · `403` RLS/role denies · `404` not found (or hidden) · `409` conflict (seat taken, already joined, duplicate) · `410` gone (expired invite) · `422` validation · `429` rate-limited.
- Single error shape: `{ "error": { "code": "ERR_ALREADY_JOINED", "message": "…" } }`. Codes map in `lib/errors.ts` for logging + toasts.

## Rate Limits (MVP, in-process)
- invite create: 20/day/user · chat send: 1/s soft · review: 1 per trip · checkin: 5/min · join/leave churn: 20/day/user.

**Status note**: none of the rate limits above were actually implemented
in code — there's no in-process or DB-level rate limiting on any route.
This section describes the original target only.

---

## Addendum: routes and RPCs built beyond the original sketch (2026-09-20)

Not in the sections above because they didn't exist when this doc was
first written. Full detail (methods, purpose, auth) is in
`docs/frontend-migration-reference.md` §3.2 (routes) and §2.8/§2 (RPCs);
this is just a pointer so this file isn't silently missing them:

- **Plan membership**: `POST /api/trips/[id]/leave-plan`,
  `POST /api/trips/[id]/transfer-owner`,
  `POST /api/trips/[id]/invites/direct`, `POST /api/invites/accept` —
  wrappers around `leave_plan()`, `transfer_plan_ownership()`,
  `create_direct_plan_invite()`, `accept_plan_invite()`.
- **Tour templates**: `GET/POST /api/agencies/[id]/templates`,
  `GET/PATCH/DELETE /api/agencies/[id]/templates/[templateId]`,
  `POST /api/agencies/[id]/tours/[tripId]/save-as-template`.
- **Tour publish**: `POST /api/agencies/[id]/tours/[tripId]/publish`
  (draft → published, gated on agency approval).
- **Payments (SINPE)**: no dedicated Route Handler at all — the buyer/
  host-team payment flow (`submit_payment_evidence()`,
  `confirm_payment()`, `reject_payment()`) is called directly as
  Supabase RPCs from Client Components
  (`components/agencies/tour-payment.tsx`,
  `tour-checkin.tsx`), plus direct Storage upload/signed-URL calls for
  the evidence screenshot.
- **Check-in, waitlist position, tour Q&A/reviews, itinerary, packing/
  expenses/polls, trip documents**: same pattern — no dedicated Route
  Handler, direct Supabase-client table writes (RLS-gated) or RPC calls
  (`get_my_waitlist_position()`, etc.) from the relevant component.
- **Geocoding/routing proxies**: `GET /api/geocode` (Nominatim),
  `GET /api/directions` (OSRM) — both session-gated proxies, not in the
  original sketch's "Files & Media" or other sections at all.