# Dele Viaje — API Surface

**Convention:** Reads = Server Components + Supabase client (RLS-gated, no API needed). **Writes and business-rules = Route Handlers** (`app/api/**/route.ts`) using `POST`/`PATCH`/`DELETE`, JSON bodies, zod-validated. Responses: typed `ApiError { code, message }` or success payload.

Auth: session from cookies (Supabase SSR client). Auth guard inside each handler; RLS is the second layer.

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