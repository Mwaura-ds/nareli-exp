
'use client';

// Client shell for /events/[id] — all interactive logic lives here.
// Called by the server wrapper page.tsx (which owns `instant = false`).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  apiConfigured, apiFetch, cancelMyRegistration, getMyRegistration, getSessionToken,
  saveSessionToken,
} from '../../lib/api';

type ApiEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  price_kes: number | null;
  current_registrations: number;
  price_kes?: number | null;
};

type RegistrationResult = {
  status: 'registered' | 'waitlisted' | 'already_registered' | 'cancelled';
  note?: string;
  checkin_token?: string | null;
  registration?: {
    id?: string;
    party_size?: number | null;
    attendee_names?: string[] | null;
    ticket_phone?: string | null;
    arrived_count?: number;
  } | null;
  waitlist?: { position?: number } | null;
};

const input = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-500 placeholder:text-stone-500';
const label = 'block text-sm font-medium text-stone-700 mb-1';

export default function EventExperience({ id }: { id: string }) {
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(() => (apiConfigured ? null : 'Events are being set up — check back soon.'));

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [names, setNames] = useState<string[]>(['']);
  const [consent, setConsent] = useState(false);

  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiConfigured) return;
    apiFetch(`/api/events/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Event not found (${r.status})`);
        return r.json();
      })
      .then(setEvent)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load event'));
  }, [id]);

  // Restore an existing booking or waitlist position after a reload / new tab.
  // A guest token is tab-scoped; staff/door tokens never enter sessionStorage.
  useEffect(() => {
    if (!apiConfigured) return;
    const token = getSessionToken();
    if (!token) return;
    let cancelled = false;
    getMyRegistration(token, id)
      .then((mine) => {
        if (cancelled || mine.status === 'none') return;
        if (mine.status === 'registered' || mine.status === 'cancelled') {
          setResult((prev) => prev ?? {
            status: mine.status === 'registered' ? 'registered' : 'cancelled',
            note: 'restored',
            checkin_token: mine.checkin_token,
            registration: mine.registration,
            waitlist: null,
          });
          const restoredPhone = mine.registration?.ticket_phone;
          if (restoredPhone) setPhone((prev) => prev || restoredPhone);
        } else if (mine.status === 'waitlisted') {
          setResult((prev) => prev ?? {
            status: 'waitlisted',
            note: 'restored',
            checkin_token: null,
            registration: null,
            waitlist: mine.waitlist,
          });
          const restoredPhone = mine.waitlist?.ticket_phone;
          if (restoredPhone) setPhone((prev) => prev || restoredPhone);
        }
      })
      .catch(() => { /* stale/expired session: leave the form visible */ });
    return () => { cancelled = true; };
  }, [id]);

  const syncNames = (size: number) => {
    setNames((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? ''));
  };

  const submit = async () => {
    if (!event || pending) return;
    setFormError(null);

    const trimmedNames = names.map((n) => n.trim()).filter(Boolean);
    const size = Number(partySize);
    if (size < 1 || size > 20) return setFormError('Party size must be between 1 and 20.');
    if (trimmedNames.length > size) return setFormError('Names exceed the party size.');
    if (!phone.trim() || phone.trim().length < 9) return setFormError('Enter the phone number we can reach at the door.');
    if (!consent) return setFormError('We need your consent to hold your details. See the privacy notice.');

    setPending(true);
    try {
      // 1) identify (create or login)
      const authPath = mode === 'create' ? '/api/auth/register' : '/api/auth/login';
      const authRes = await apiFetch(authPath, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const authJson = await authRes.json().catch(() => ({}));
      if (!authRes.ok) {
        if (authRes.status === 409) throw new Error('That email already has an account — switch to “Log in”.');
        if (authRes.status === 401) throw new Error('Invalid email or password.');
        throw new Error(authJson?.error ?? 'Could not sign you in.');
      }
      const token: string = authJson.token;
      saveSessionToken(token); // tab-scoped: needed for QR restore and self-cancel

      // 2) book
      const bookRes = await apiFetch(`/api/events/${event.id}/register`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({
          party_size: size,
          ticket_phone: phone.trim(),
          consent: true,
          ...(trimmedNames.length ? { attendee_names: trimmedNames } : {}),
        }),
      });
      const bookJson = await bookRes.json().catch(() => ({}));
      if (!bookRes.ok) throw new Error(bookJson?.error ?? 'Registration failed — try again.');
      setResult(bookJson);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong — try again.');
    } finally {
      setPending(false);
    }
  };

  const cancelBooking = async () => {
    const token = getSessionToken();
    if (!token || cancelling) return;
    if (!window.confirm('Cancel this booking? If someone is waiting, they may be promoted automatically.')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await cancelMyRegistration(token, id);
      setResult({ status: 'cancelled', note: res.status, registration: null, waitlist: null, checkin_token: null });
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel — try again.');
    } finally {
      setCancelling(false);
    }
  };

  const seatsLeft = event && event.capacity != null ? Math.max(0, event.capacity - event.current_registrations) : null;
  const soldOut = seatsLeft === 0;
  const partyTooLarge = seatsLeft !== null && Number(partySize) > seatsLeft;
  const hasTicket = (result?.status === 'registered' || result?.status === 'already_registered') && !!result.checkin_token;
  const canCancel = (result?.status === 'registered' || result?.status === 'already_registered') && !!getSessionToken();

  if (loadError) {
    return (
      <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold text-stone-900 mb-3">{loadError}</h1>
        <Link href="/" className="text-stone-600 underline">← Back home</Link>
      </main>
    );
  }

  if (!event) {
    return <main className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500">Loading…</main>;
  }

  const dateLabel = new Intl.DateTimeFormat('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
  }).format(new Date(event.start_time));

  return (
    <main className="min-h-screen bg-stone-50 py-14 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/#upcoming" className="text-stone-500 hover:text-stone-800 text-sm">← All events</Link>

        <div className="grid md:grid-cols-5 gap-8 mt-6">
          {/* Event panel */}
          <section className="md:col-span-2 bg-white rounded-3xl border border-stone-100 shadow-sm p-6 h-fit">
            <span className="inline-block bg-nareli text-white text-xs font-bold px-3 py-1 rounded-full mb-3">{dateLabel}</span>
            <h1 className="text-3xl font-bold text-stone-900 mb-3">{event.title}</h1>
            {event.description && <p className="text-stone-600 mb-4">{event.description}</p>}
            <p className="text-stone-600 text-sm mb-4">{event.location ?? 'Venue revealed after RSVP'}</p>
            {soldOut ? (
              <p className="text-red-700 font-semibold">Sold out — waitlist open</p>
            ) : seatsLeft !== null ? (
              <p className="text-stone-700">{seatsLeft} of {event.capacity} seats left</p>
            ) : (
              <p className="text-stone-700">Open seating</p>
            )}
            <p className="mt-4 text-xs text-stone-600">
              {event.price_kes != null
                ? `KSh ${event.price_kes.toLocaleString()} per seat. No payment is collected online yet.`
                : "Ticket prices will be announced before sale. No payment is collected online yet."}
            </p>
          </section>

          {/* Booking / confirmation panel */}
          <section className="md:col-span-3 bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
            {result ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-stone-900 mb-1">
                  {result.status === 'waitlisted' ? 'You are on the waitlist'
                    : result.status === 'cancelled' ? 'Booking cancelled'
                    : result.status === 'already_registered' ? 'You are already in' : 'You are in!'}
                </h2>
                <p className="text-stone-600 mb-4">
                  {result.status === 'waitlisted'
                    ? `Position #${result.waitlist?.position ?? '—'}. We will reach out on ${phone.trim()} if a seat opens. Your party of ${Number(partySize)} cannot be confirmed; ${seatsLeft ?? 'the remaining'} seat${seatsLeft === 1 ? '' : 's'} remain for smaller parties.`
                    : result.status === 'cancelled'
                    ? 'Your booking was cancelled. If someone was waiting, they may have been promoted automatically.'
                    : 'Show this QR (or your phone) at the door — your party enters together.'}
                </p>
                {hasTicket && (
                  <div className="print:block inline-block bg-white border border-stone-100 rounded-2xl p-4 mb-4">
                    <QRCodeSVG value={result.checkin_token!} size={200} includeMargin />
                    <p className="mt-2 font-semibold text-stone-900">{event.title}</p>
                    <p className="text-xs text-stone-500">{dateLabel}</p>
                    {result.registration?.ticket_phone && <p className="text-xs text-stone-500">Door key: {result.registration.ticket_phone}</p>}
                  </div>
                )}
                {result.registration?.attendee_names?.length ? (
                  <p className="text-sm text-stone-600 mb-2">Party: {result.registration.attendee_names.join(', ')}</p>
                ) : null}
                <div className="flex flex-wrap gap-3 justify-center print:hidden">
                  {hasTicket && (
                    <button onClick={() => window.print()} className="bg-nareli text-white px-5 py-3 rounded-full font-medium hover:bg-nareli-dark">Print / Save ticket (PDF)</button>
                  )}
                  {canCancel && (
                    <button onClick={() => void cancelBooking()} disabled={cancelling} className="border border-red-300 text-red-700 px-5 py-3 rounded-full font-medium hover:border-red-500 disabled:opacity-50">
                      {cancelling ? 'Cancelling…' : 'Cancel my booking'}
                    </button>
                  )}
                  <Link href="/" className="border border-stone-300 px-5 py-3 rounded-full font-medium hover:border-stone-500">Done</Link>
                </div>
                {cancelError && <p className="mt-2 text-xs text-red-700">{cancelError}</p>}
                {result.status === 'waitlisted' ? (
                  <p className="mt-4 text-[11px] text-stone-600 print:hidden">No ticket has been issued yet — you will get a QR only if a seat opens for your party.</p>
                ) : result.status === 'cancelled' ? (
                  <p className="mt-4 text-[11px] text-stone-600 print:hidden">This ticket is no longer valid at the door.</p>
                ) : (
                  <p className="mt-4 text-[11px] text-stone-600 print:hidden">Ticket is valid once scanned at the door; the seat count above updates live.</p>
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => setMode('create')} className={`px-3 py-1.5 rounded-full border font-medium ${mode === 'create' ? 'bg-nareli text-white border-stone-900' : 'border-stone-300 text-stone-600'}`}>New account</button>
                  <button type="button" onClick={() => setMode('login')} className={`px-3 py-1.5 rounded-full border font-medium ${mode === 'login' ? 'bg-nareli text-white border-stone-900' : 'border-stone-300 text-stone-600'}`}>Log in</button>
                </div>

                <div>
                  <label className={label} htmlFor="email">Email</label>
                  <input id="email" required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
                <div>
                  <label className={label} htmlFor="password">Password</label>
                  <input id="password" required type="password" minLength={8} className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={label} htmlFor="party">Party size</label>
                    <select id="party" className={input} value={partySize} onChange={(e) => { setPartySize(e.target.value); syncNames(Number(e.target.value)); }}>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="phone">Door phone</label>
                    <input id="phone" required className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0712 345 678" autoComplete="tel" />
                  </div>
                </div>

                {partyTooLarge && (
                  <p className="text-xs text-amber-700">
                    Only {seatsLeft} seat{seatsLeft === 1 ? '' : 's'} left — a party of {partySize} will be waitlisted, not confirmed.
                  </p>
                )}

                {Number(partySize) > 1 && (
                  <div className="space-y-2">
                    <p className={label}>First names (for the door — helps us check your party in faster)</p>
                    {names.map((n, i) => (
                      <input key={i} className={input} value={n} onChange={(e) => setNames((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))} placeholder={`Name ${i + 1}`} />
                    ))}
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-stone-700 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>I consent to Nareli Experience storing my contact details and party names to manage my booking, deliver the event, and process refunds (Kenya Data Protection Act 2019). <Link href="/terms" className="underline">Privacy notice</Link></span>
                </label>

                {formError && <p className="text-red-700 text-sm">{formError}</p>}

                <button type="submit" disabled={pending} className="w-full bg-nareli text-white py-4 rounded-2xl text-lg font-semibold hover:bg-nareli-dark disabled:opacity-60">
                  {pending ? 'Securing your seat…' : soldOut ? 'Join the waitlist' : 'Reserve my seat'}
                </button>
                <p className="text-[11px] text-stone-400">If the event fills, you will join the waitlist automatically. No payment is collected online yet.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
