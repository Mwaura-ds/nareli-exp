'use client';

// /tickets — customer self-service: re-download a QR, see booking status,
// and cancel a booking. Shares the tab-scoped session token with /notifications.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ApiError, apiConfigured, authenticate, cancelMyRegistration, clearSessionToken,
  getEvents, getMyRegistration, getSessionToken, saveSessionToken,
  type ApiEvent, type MyRegistration,
} from '../lib/api';

type Ticket = { event: ApiEvent; registration: MyRegistration; token: string | null };
const input = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500 placeholder:text-stone-400';
const btn = 'bg-nareli text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-nareli-dark disabled:opacity-50';
const ghost = 'border border-stone-300 px-4 py-2 rounded-full text-sm font-medium hover:border-stone-500 disabled:opacity-50';
const fmt = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });

export default function TicketsPage() {
  const [token, setToken] = useState<string | null>(() => getSessionToken());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(() => apiConfigured && getSessionToken() !== null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTickets = async (t: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [upcoming, ongoing, past] = await Promise.all([
        getEvents({ status: 'upcoming', per_page: 50 }),
        getEvents({ status: 'ongoing', per_page: 50 }),
        getEvents({ status: 'past', per_page: 50 }),
      ]);
      const all = [...(upcoming.data ?? []), ...(ongoing.data ?? []), ...(past.data ?? [])];
      const found: Ticket[] = [];
      for (const ev of all) {
        try {
          const r = await getMyRegistration(t, ev.id);
          if (r.status === 'registered' && r.registration) {
            found.push({ event: ev, registration: r.registration, token: r.checkin_token });
          }
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e; // 404 = no booking for this event
        }
      }
      setTickets(found);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? 'Session expired — sign in again.' : 'Could not load your tickets right now.');
      if (e instanceof ApiError && e.status === 401) { clearSessionToken(); setToken(null); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !apiConfigured) return;
    queueMicrotask(() => { void loadTickets(token, false); });
  }, [token]);

  const signIn = async () => {
    setAuthError(null);
    setBusy(true);
    try {
      const res = await authenticate(mode, email, password);
      saveSessionToken(res.token);
      setToken(res.token);
      setLoading(true);
    } catch (e) {
      setAuthError(e instanceof ApiError && e.status === 409
        ? 'That email already has an account — switch to Log in.'
        : e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!apiConfigured) {
    return <main className="min-h-screen flex items-center justify-center px-6 text-center text-stone-500">Tickets are not configured — set NEXT_PUBLIC_API_URL.</main>;
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-stone-100 shadow-sm p-6 space-y-4">
          <Link href="/" className="text-stone-500 text-sm">← Back home</Link>
          <h1 className="text-2xl font-bold text-stone-900">My tickets</h1>
          <p className="text-stone-600 text-sm">Sign in with the email you booked with to re-download your QR or cancel a booking.</p>
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => setMode('login')} className={`px-3 py-1.5 rounded-full border font-medium ${mode === 'login' ? 'bg-nareli text-white border-nareli' : 'border-stone-300 text-stone-600'}`}>Log in</button>
            <button type="button" onClick={() => setMode('register')} className={`px-3 py-1.5 rounded-full border font-medium ${mode === 'register' ? 'bg-nareli text-white border-nareli' : 'border-stone-300 text-stone-600'}`}>New account</button>
          </div>
          <input className={input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className={input} type="password" placeholder="At least 8 characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {authError && <p className="text-red-700 text-sm">{authError}</p>}
          <button onClick={signIn} disabled={busy || !email || password.length < 8} className={`${btn} w-full`}>{busy ? 'Signing in…' : 'Find my tickets'}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">My tickets</h1>
            <p className="text-stone-600 text-sm">Your QR works at the door — screenshot or print it.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadTickets(token)} className={ghost}>Refresh</button>
            <button onClick={() => { clearSessionToken(); setToken(null); setTickets([]); }} className={ghost}>Sign out</button>
          </div>
        </div>

        {notice && <div className="bg-nareli text-white rounded-2xl px-5 py-3 text-sm mb-6">{notice}</div>}
        {loading && <p className="text-stone-500 py-10 text-center">Looking up your bookings…</p>}
        {!loading && error && <p className="text-red-700 text-sm py-6 text-center">{error}</p>}
        {!loading && !error && tickets.length === 0 && (
          <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center text-stone-600">
            No bookings yet. <Link href="/events" className="underline">Browse events</Link> to reserve a spot.
          </div>
        )}

        <div className="space-y-5">
          {tickets.map(({ event, registration: reg, token: qr }) => (
            <article key={reg.id} className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 grid md:grid-cols-[1fr_auto] gap-6">
              <div>
                <span className="bg-nareli text-white text-xs font-bold px-3 py-1 rounded-full">{fmt.format(new Date(event.start_time))}</span>
                <h2 className="text-xl font-bold text-stone-900 mt-3">{event.title}</h2>
                <p className="text-stone-600 text-sm">{event.location ?? 'Venue revealed after RSVP'}</p>
                <p className="text-stone-700 text-sm mt-3">Booking: <strong>{reg.status}</strong> · {reg.party_size ?? 1} seat(s) · door phone {reg.ticket_phone ?? '—'}</p>
                {reg.attendee_names?.length ? <p className="text-stone-600 text-sm">Party: {reg.attendee_names.join(', ')}</p> : null}
                {reg.refund_status !== 'none' && <p className="text-sm text-amber-700 mt-2">Refund status: {reg.refund_status}</p>}
                {reg.checkin_at ? <p className="text-green-700 text-sm mt-2">Checked in at {fmt.format(new Date(reg.checkin_at))}</p> : null}
                <div className="flex flex-wrap gap-3 mt-5 print:hidden">
                  {qr && <button onClick={() => window.print()} className={btn}>Print / save ticket (PDF)</button>}
                  {reg.status !== 'cancelled' && (
                    <button onClick={() => {
                      if (!window.confirm(`Cancel your booking for “${event.title}”? A confirmed refund depends on the organiser's policy.`)) return;
                      setBusy(true);
                      void cancelMyRegistration(token, event.id)
                        .then(() => { setNotice('Booking cancelled.'); return loadTickets(token); })
                        .catch((e: unknown) => setNotice(e instanceof Error ? e.message : 'Cancellation failed.'))
                        .finally(() => setBusy(false));
                    }} disabled={busy} className="border border-red-300 text-red-700 px-4 py-2 rounded-full text-sm">Cancel booking</button>
                  )}
                  <Link href="/notifications" className="text-stone-600 underline text-sm py-2">Messages</Link>
                </div>
              </div>
              {qr && reg.status === 'confirmed' ? (
                <div className="justify-self-center text-center print:block">
                  <div className="inline-block bg-white border border-stone-100 rounded-2xl p-4">
                    <QRCodeSVG value={qr} size={170} includeMargin />
                  </div>
                  <p className="text-xs text-stone-500 mt-2">Show at the door — first scan checks in the party.</p>
                </div>
              ) : (
                <div className="justify-self-center text-center text-sm text-stone-500 max-w-[220px]">
                  {reg.status === 'waitlisted' ? 'You are on the waitlist — no QR until a seat opens.' : 'This booking has no active QR.'}
                </div>
              )}
            </article>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-8">Session lasts until you close this tab. Save or print your ticket before leaving.</p>
      </div>
    </main>
  );
}
