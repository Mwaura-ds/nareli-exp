# Nareli Experience — integration handoff (2026-11-16)

Audience: the owner (Mwaura) and technical staff connecting the Next.js site to the **event-backend** service.

> Everything in this file is checked against the code; where it wasn't, it says so. Verify by running the commands provided.

---

## 1. Status snapshot — what exists, what doesn't

**Built, tested locally (65/65 backend tests + fresh podman Postgres):**
- Public ticketing API (events, seat capacity in **parties**, waitlist with whole-party auto-promotion, consent-required RSVP)
- Door flow: QR redemption path and phone-number lookup path; one-time check-in; per-name arrivals for parties
- Staff (gate) role with DB-fresh sessions, instant revocation, first-names-only data surface
- Owner management surface: list registrations (with PII), CSV export, refund ledger + holder notification, event cancellation + attendee notification, capacity lower-bound guard
- Internal auth (HS256 JWT, scrypt passwords), rate limits, CORS allowlist, health/readiness probes, portable container (Dockerfile/compose)

**NOT built (deliberately — owner decisions pending):**
- **Payments.** M-PESA/Daraja explicitly not wired. Ticket prices show as "KSh TBD" on the site. No money moves anywhere yet.
- **Email/SMS delivery.** Notifications are stored and readable in-app only; the worker logs to console. Tickets reach the door as on-screen QR or printed PDF — that path is complete.
- **Rotating-QR anti-theft** (static QR: first scan wins; theft burns the booking — visible at the door).
- **CI execution** (never run on a real runner; repo pushes are still broken on this machine; you own the repo).
- **Public deploy** (no domain, no hosting decision, no M-PESA rails, no ODPC registration yet).

---

## 2. The two codebases

| | Location | Stack | State (2026-11-16) |
|---|---|---|---|
| **Backend** | `~/Projects/event-backend` → separate private repo | Node 20+ ESM, Express 4, Drizzle ORM, PostgreSQL 16, zod | 70 tests green; access by owner request |
| **Frontend** | this repo (`github.com/Mwaura-ds/nareli-exp`) | Next.js 16.4.5 (Cache Components), React 19, Tailwind 4, pnpm | builds green after local fixes; local working-tree changes UNcommitted — see §9 |

**How to get the backend code:** it lives in a **separate private repository**. Ask the owner for access. **Never a public repo** — it contains no secrets, but it's your business logic and there's no reason to expose it.

### 2.1 Frontend pages wired to the backend (as of 2026-11-20)

- `/events` — public listing with status tabs, location filter and pagination (`GET /api/events`).
- `/events/[id]` — booking with consent, party names, on-screen QR from the check-in token.
- `/notifications` — account inbox (`GET /api/notifications`); customer token is tab-scoped.
- `/gate` — staff door console (phone lookup + per-name arrivals); staff token stays in memory only. **Never linked publicly.**
- `/owner` — **owner-only, never linked publicly.** Creates/edits/cancels events, shows the summary dashboard, lists registrations with CSV export and refund ledger actions, and manages gate staff. Staff tokens are rejected by the DB-fresh role check.

Refund buttons in `/owner` record ledger state only; the actual money movement is out-of-band until payments are wired. The owner-console contract was smoke-tested with 15 live API calls against a disposable PostgreSQL 16 backend.

---

## 3. Quick start (local)

### 3.1 Backend, locally (10 min)
```bash
# on any machine with podman or docker + node 20
cp .env.example .env
# put YOUR values in .env: JWT_SECRET="$(openssl rand -hex 32)", DATABASE_URL=...
pnpm install
pnpm migrate           # twice — the second run must be a no-op
podman run -d --name eb_db -e POSTGRES_PASSWORD=dev_only -e POSTGRES_DB=event_backend -p 5432:5432 postgres:16-alpine
DATABASE_URL=postgres://postgres:dev_only@127.0.0.1:5432/event_backend pnpm migrate
DATABASE_URL=postgres://postgres:dev_only@127.0.0.1:5432/event_backend JWT_SECRET=<same> pnpm dev
curl localhost:3001/ready        # {"status":"ready"}
curl 'localhost:3001/api/events' # {"data":[],"pagination":{...}}
```

### 3.2 Frontend, locally (5 min)
```bash
cd work/nareli-exp
npm install            # this repo pins pnpm if you use pnpm; npm works
npm run dev            # :3000
```
Put `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env.local` **and rebuild** after changing it (Next inlines NEXT_PUBLIC_* at build time).

### 3.3 End-to-end smoke (the only test that matters)
1. On the site home page, an event appears (create one with the admin flows below).
2. Tap "Reserve" → create an account → book → QR prints.
3. Log into the door as staff → find booking by phone → tap names → they flip "in".
4. Sell-out path: fill the event with test bookings → one more → waitlist position; cancel one registration as owner → the waitlisted party is promoted.

---

## 4. API contract card (curl-copyable)

**List events** — `GET /api/events?status=upcoming&per_page=6`
```json
{ "data": [ { "id": "…", "title": "…", "capacity": 60, "current_registrations": 12, "start_time": "2026-12-05T18:00:00.000Z" } ], "pagination": { "page": 1, "per_page": 6, ... } }
```

**Event detail** — `GET /api/events/:id` — same object + `current_registrations`.

**Register (consent REQUIRED)** — `POST /api/events/:id/register` — `Authorization: Bearer <jwt>`
```json
{ "party_size": 2, "ticket_phone": "0712 345 678", "attendee_names": ["Grace","David"], "consent": true }
```
- 201/200 response: `{ "status": "registered", "registration": {…}, "checkin_token": "<jwt>" }`
- Event full: `{ "status": "waitlisted", "waitlist": { "position": 3 } }`
- Seat math is WHOLE PARTIES: one row = party_size seats; SUM(party_size) gate vs capacity.
- NOTE: no online money flows. Amount/payment_ref exist in the DB but the API never charges.

**Check-in (staff only)** — `POST /api/events/:id/checkin` — `Authorization: Bearer <staff-jwt>`
- QR path: `{ "token": "<checkin_token>" }` → `{ "status": "checked_in" }` (repeat → `already_checked_in`)
- Door path: `{ "reg_id": "<uuid>", "names": ["Grace"] }` → `{ "status": "partial", "arrived": 1, "party_size": 2, … }` then `checked_in` when full.

**Staff door lookup** — `GET /api/events/:id/door?phone=0712…` — first names + arrival state ONLY (`matches[]`).
**Self view** — `GET /api/events/:id/my-registration` — own booking + re-downloadable token.
**Staff lifecycle** — `POST /api/staff` / `GET /api/staff` / `DELETE /api/staff/:id` — owner-only.
**Owner list + CSV** — `GET /api/events/:id/registrations?format=csv` — PII; owner-only.
**Cancel event** — `POST /api/events/:id/cancel-event` — sets `cancelled_at`, storage-side refunds flip to `requested`, notifies all. Registration afterwards → 409.

**Error codes:** 400 (validation; body details flattened) · 401 (bad/expired token) · 403 (authenticated but not allowed) · 404 (not found / hidden private) · 409 (state conflict — capacity lower bound, past event, already cancelled, refund state) · 429 (rate limits) · 503 (DB down on /ready).

---

## 5. CORS — the #1 time-sink for this integration

The backend answers browsers cross-origin **only** for origins listed in `CORS_ORIGINS` (comma-separated exact matches, scheme+host+port, no trailing slash). Empty or missing = no browser origin may call the API (curl/other non-browser clients still work).

```
CORS_ORIGINS=https://www.nareli.co.ke,https://nareli.co.ke,http://localhost:3000
```
- Local dev = `http://localhost:3000` (include the port). Production = her final domain — not decided; set once known, keep the www + bare variants explicitly.
- **Every API call from the browser dies with a CORS error until this variable exists with her domain.** When the site shows data, try curl — if curl works but the browser doesn't, it's CORS; check devtools console, match the Origin exactly (http vs https, port, trailing slash).

---

## 6. Environment variables (both sides)

**Backend** (`.env`, never committed — `.env.example` shipped): `DATABASE_URL` (required), `JWT_SECRET` (required), `PORT` (3001), `TRUST_PROXY=true` **only behind LB/proxy** (else all /api = 500), `CORS_ORIGINS` (see §5), `ADMIN_EMAIL`/`ADMIN_PASSWORD` (first boot only — insert-only seed; change and/or unset later), `ADMIN_ROLE=owner`, `RATE_LIMIT_*`, `LOGIN_RATE_LIMIT_MAX`, `TOKEN_TTL` (7d), `NOTIFIER=console` (only sink; anything else = worker refuses to start), `NOTIFY_POLL_MS`.

**Frontend**: `NEXT_PUBLIC_API_URL` (public base URL of the backend — **inlined at build; rebuild after any change**), `RESEND_API_KEY` (server-side, contact form; runtime 503 when absent), `.env*` git-ignored.

**Rules:** secrets out-of-band to each other (never in repo/chat history); frontend never ships real secrets to the browser.

---

## 7. Deployment order

1. **Backend first.** VPS or Cloudflare Tunnel (owner call — not made). Container path: podman/docker `event-backend:latest` + Postgres 16. Set env → `node scripts/migrate.mjs` → probes `/health` (liveness) and `/ready` (readiness: 503 = degraded).
2. **First admin** = seed via env or register directly → verify with login → create a staff account via `POST /api/staff`.
3. **Frontend.** Next build/start with `NEXT_PUBLIC_API_URL=<backend-url>`. Set `CORS_ORIGINS` on the backend to the frontend's final origin.
4. **DNS/TLS** point at the backend host; single instance (in-memory limiter; multiple replicas need a shared limiter — not built).
5. **Launch drill**: 30–45 min, §3.3 path with real staff phone + one real M-PESA note; go/no-go gate for paid or private events.

Rollback = previous container image + pg_dump restore (test restores BEFORE relying — not done by me).

---

## 8. Decisions the organiser owns before launch

Payments and pricing, ticket delivery provider (or on-screen QR only), legal review, deployment host and DNS, backups, and the final go/no-go. The code does not make these decisions for the organiser.

---

## 9. Operational notes

- Tickets are on-screen QR / printable PDF; no email delivery is wired.
- Static QR tickets cannot stop screenshot reuse before the first scan — door staff verify first names verbally.
- `DELETE /api/staff/:id` takes effect on the next request.
- Seat counts are `SUM(party_size)` under a row lock; overselling through the API is not possible. A door that waves people in without scanning remains outside the system.
- `/gate` keeps the staff token in memory only; refresh requires signing in again.
- Items marked ⏳/TBD on the site are pending organiser decisions, not omissions.

---

## 10. Responsibilities

- **Organiser:** legal/data-protection sign-off, pricing, domain and messaging, hosting, launch decision, manual refunds, staff hiring and credential handoff.
- **Technical maintainer:** runbooks in §3–§5, CORS/env wiring on first deploy, and the launch drill once the organiser's decisions are in place.

*Ends. Technical facts reviewed against the repositories; status dates are shown where relevant.*
