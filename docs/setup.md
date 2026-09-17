# Dele Viaje — Tool Setup Guide

Step-by-step instructions to configure every free tool the app uses. Follow in order.
All values map 1:1 to variables in `.env.example`.

---

## 1. Supabase (auth + database + storage + realtime)

1. Create an account at <https://supabase.com> → **New project**.
   - Name: `dele-viaje`, region: pick one close to CR (e.g. `us-east-1`) — region is a paid migration later, choose now.
   - Password: **save it** (it encrypts your Postgres).
2. From the project dashboard, **Project Settings → API Keys**:
   - Use the **publishable** and **secret** keys (current default), not the legacy `anon` / `service_role` JWT keys — both still work, but publishable/secret can be rotated independently of the JWT secret and is what Supabase now issues by default on new projects.
   - Copy `Project URL`, `publishable key`, `secret key` → `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     - `SUPABASE_SECRET_KEY`
   - The secret key bypasses RLS — **server-only**, never expose to the browser.
3. Run the schema migrations (creates `profiles`, RLS, triggers):
   ```bash
   npx supabase login        # once
   npx supabase link --project-ref <project-ref-from-dashboard-url>
   npx supabase db push
   ```
   (Local-first: `npm i -D supabase` + `npx supabase start` to run Postgres locally, then push.)
4. **Auth → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` (+ production URL when you deploy).
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local`. In production set it to `https://your-domain.com`.

### Enable Google OAuth
1. <https://console.cloud.google.com/apis/credentials> → **Create credentials → OAuth client ID** → Web application.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (exact Supabase URL from dashboard).
2. Copy the client ID/secret into **Supabase → Authentication → Providers → Google → Enable**.
3. Put the same values in `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) for parity with the docs.

Email/password works out of the box. Optionally disable "Confirm email" for dev or configure email templates in Supabase.

---

## 2. Resend (transactional email)

1. <https://resend.com> → **API Keys** → create key → `.env.local` `RESEND_API_KEY`.
2. **Domains** → add and verify a domain you own (DNS TXT/records). Start with `onboarding@` / `no-reply@`.
3. In Supabase **Auth → Email Templates**, set the buttons/links to your base URL so "forgot password" etc. work.
4. `.env.local`:
   - `RESEND_FROM=no-reply@your-domain.com` (must match the verified domain),
   - `NEXT_PUBLIC_APP_NAME=Dele Viaje`.

Email sending is wired starting Phase 1 (notifications/reminders); setting up now avoids rework.

---

## 3. VAPID keys (Web Push)

Generate once:
```bash
npx web-push generate-vapid-keys
```
Put the three values in `.env.local`:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT=mailto:you@example.com`

Web Push requires HTTPS in production and, on iOS, the app must be installed to the home screen (see PRD §4.11 note).

---

## 4. Maps / Geo (MapLibre + OSM + Nominatim)

- **MapLibre** + **OpenStreetMap tiles**: no keys or account required.
- **Nominatim geocoding** (address/place → lat/lng): no key, but their policy requires a descriptive `User-Agent`.
  - `NEXT_PUBLIC_NOMINATIM_ENDPOINT=https://nominatim.openstreetmap.org`
  - `NOMINATIM_USER_AGENT=dele-viaje-dev (contact@your-domain.com)`
- Note: Nominatim is rate-limited (≈1 req/s) — fine for a picker, not for bulk geocoding. If you need more, later swap to a paid provider behind the same interface.

---

## 5. Vercel / hosting deployment

1. Push this repo to GitHub.
2. <https://vercel.com> → **Import repository** → framework auto-detected (Next.js).
3. Environment variables: add **every** entry from `.env.example` (switch the `NEXT_PUBLIC_*` values to the production Supabase project and your domain).
4. Production `NEXT_PUBLIC_SITE_URL=https://<your-vercel-domain>`; add that domain to Supabase Redirect URLs.
5. Optional but recommended: connect the Supabase project to the same Vercel team for env syncing.

## 6. GitHub (CI)

- `.github/workflows/ci.yml` runs `lint`, `typecheck`, unit tests on every PR/push.
- CI needs **no secrets** for lint/typecheck/unit tests. Playwright e2e against the live app is optional and separate.
- If you want Vercel-worthy `NEXT_PUBLIC_*` in CI, add them as repo secrets (not required for Phase 0).

---

## 7. Local development quick references

```bash
pnpm install
cp .env.example .env.local   # then fill values
pnpm dev                     # http://localhost:3000
pnpm lint                    # eslint
pnpm typecheck               # tsc --noEmit
pnpm test                    # vitest unit
pnpm e2e                     # playwright (needs app running)
```

### Troubleshooting
- **"supabase db push" auth/not linked** → run `npx supabase link --project-ref <ref>` and check you're logged in.
- **Google login fails** → ensure the Google redirect URI exactly matches `https://<ref>.supabase.co/auth/v1/callback` and the provider is toggled Enabled in Supabase.
- **`NEXT_PUBLIC_SITE_URL` mismatch** → the auth callback bounces; keep it identical to Supabase Site URL.
- **No email received** → Resend domain verification + Supabase email templates pointing to your base URL.