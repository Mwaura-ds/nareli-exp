# Nareli Experience — integration handoff (2026-11-16)

Audience: the owner (Mwaura) and technical staff connecting the Next.js site to the **event-backend** service.

> **Provenance:** built by an AI pair-programmer with the owner. Everything in this file is checked against the code; where it wasn't, it says so. You are not required to trust anything — verify by running it (every claim below has a command).

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
| **Backend** | `~/Projects/event-backend` (this device) | Node 20+ ESM, Express 4, Drizzle ORM, PostgreSQL 16, zod | 65 tests green; NOT a public repo; needs private handover |
| **Frontend** | this repo (`github.com/Mwaura-ds/nareli-exp`) | Next.js 16.4.5 (Cache Components), React 19, Tailwind 4, pnpm | builds green after local fixes; local working-tree changes UNcommitted — see §9 |

**How to get the backend code:** zip it yourself from this device, or push it to a **private** repo you own, then pull wherever the backend will live. **Never a public repo** — it contains no secrets, but it's your business logic and there's no reason to expose it.

---

## 3. Quick start (assistant can do this)

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

## 8. Owner action items (before selling anything)

1. **ODPC registration** — Kenya DPA 2019 controller registration (personal data is collected: names/phones; no payments → still in scope).
2. **Legal/T&C review of `/terms`** — page ships with a visible "draft for owner + legal review" marker. Not legal advice — I am not counsel.
3. **KSh figures + VAT treatment** — packages, events, deposits; VAT to KRA (programs may differ — accountant).
4. **Sender domain** for the contact form's Resend path (`onboarding@resend.dev` delivers to ONE gmail only); otherwise say "on-screen QR is the ticket" and stop apologizing for no email.
5. **Commit + push the frontend** — local working tree has everything uncommitted; freeze nothing until you review the diff.
6. **Decide the public/payment model** — free RSVPs now vs manual M-PESA vs Daraja; funds policy (refund SOP lives in code, money rails don't).
7. **Deploy decision** (VPS vs Cloudflare Tunnel vs other) + backups drilled.

---

## 9. Known sharp edges from this session (owner should know, not fear)

- The frontend shipped with an XSS-in-email contact route and leaked PII to logs — now fixed (validated + 5/min + fail-closed 503). That is the **email inquiry path only**; the RSVP flow never emails anything — it's the QR/PDF on screen.
- Static QR tickets cannot stop a screenshot re-use pre-first-scan; the door shows **first names** for verification — lean on the verbal check, not the image.
- `DELETE /api/staff/:id` is instant-revoke (DB recheck per call).
- Seat counts are `SUM(party_size)` under a row lock; the "oversale" path is structurally impossible through the API. What it cannot protect: doors waving people in without scanning.
- Frontend `/gate` keeps the staff token in memory only; refresh = re-login (deliberate).
- Everything labeled ⏳/TBD on the site is owner-pending, not skipped.

---

## 10. Who owns what going forward

- **Owner**: ODPC, legal review, pricing, domain/Resend decision, deploy decision, launch go/no-go, refund execution (manual), staff hiring + password handoff.
- **Assistant**: runbooks §3–§5; CORS/env wiring on first deploy; deployment once §8 is complete; smoke drill; FFS: show this file before changing trigger points like "payments".
- **Me (the agent)**: no actions without explicit go; pushed nothing; committed nothing; reader of this file is responsible for same.

*Ends. Verified against the repositories as of 2026-11-16, EAT.*
