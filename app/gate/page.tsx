'use client';

// /gate — staff-only door lookup. No link from anywhere public; auth is the lock,
// this path is only not advertised. Staff see first names and counts — never
// emails, other guests' phone numbers, or money fields.
import { useState } from 'react';
import { apiConfigured, apiFetch } from '../lib/api';

type Match = {
  reg_id: string;
  status: string;
  party_size: number;
  names: string[] | null;
  arrived: number;
  arrived_names: string[];
  checkin_at: string | null;
};
type DoorResult = { event?: { id: string; title: string; start_time: string }; matches?: Match[] };

const input = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-stone-500 placeholder:text-stone-400';

export default function GatePage() {
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<DoorResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const staffLogin = async () => {
    setStaffError(null);
    try {
      const r = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: staffEmail.trim(), password: staffPassword }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? 'Sign-in failed');
      setStaffToken(j.token);
    } catch (e) {
      setStaffError(e instanceof Error ? e.message : 'Sign-in failed');
    }
  };

  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<{ id: string; title: string; start_time: string }[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  const loadEvents = async () => {
    if (!staffToken) return;
    const r = await apiFetch('/api/events?status=ongoing&per_page=10');
    if (r.ok) {
      const j = await r.json();
      setEvents([...(j.data ?? [])]);
    }
    const r2 = await apiFetch('/api/events?status=upcoming&per_page=10');
    if (r2.ok) {
      const j2 = await r2.json();
      setEvents((prev) => [...prev, ...(j2.data ?? [])]);
    }
    setEventsLoaded(true);
  };

  const doLookup = async () => {
    if (!staffToken) return;
    setBusy(true);
    setLookupError(null);
    setResult(null);
    try {
      const r = await apiFetch(`/api/events/${eventId}/door?phone=${encodeURIComponent(phone.trim())}`, {
        headers: { authorization: `Bearer ${staffToken}` },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? 'Lookup failed');
      setResult(j);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  };

  const mark = async (reg: Match, names?: string[], count?: number) => {
    if (!staffToken || !result?.event) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/api/events/${result.event.id}/checkin`, {
        method: 'POST',
        headers: { authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ reg_id: reg.reg_id, ...(names ? { names } : {}), ...(count ? { count } : {}) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? 'Check-in failed');
      setResult((prev) => prev && {
        ...prev,
        matches: prev.matches?.map((m) => (m.reg_id === reg.reg_id ? { ...m, arrived: j.arrived, arrived_names: j.arrived_names ?? m.arrived_names, checkin_at: j.checkin_at } : m)),
      });
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  if (!apiConfigured) {
    return <main className="min-h-screen flex items-center justify-center text-stone-500 px-6 text-center">Door console is not configured yet — set NEXT_PUBLIC_API_URL.</main>;
  }

  if (!staffToken) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-stone-100 shadow-sm p-6 space-y-4">
          <h1 className="text-xl font-bold text-stone-900">Door — staff sign in</h1>
          <input className={input} type="email" placeholder="Staff email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} autoComplete="username" />
          <input className={input} type="password" placeholder="Password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} autoComplete="current-password" />
          {staffError && <p className="text-red-700 text-sm">{staffError}</p>}
          <button onClick={staffLogin} className="w-full bg-nareli text-white py-3 rounded-2xl font-semibold hover:bg-nareli-dark">Sign in</button>
          <p className="text-[11px] text-stone-400">Staff sessions are seat-level: gate staff see first names and counts only.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">Door</h1>

        {!eventsLoaded && (
          <button onClick={loadEvents} className="w-full border border-stone-300 py-3 rounded-2xl font-medium hover:border-stone-500">Load today&apos;s events</button>
        )}
        {eventsLoaded && (
          <select className={input} value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Choose the event…</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} — {new Intl.DateTimeFormat('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(ev.start_time))}</option>)}
          </select>
        )}

        <input className={input} inputMode="tel" placeholder="Phone number (e.g. 0712 345 678)" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLookup()} />
        <button onClick={doLookup} disabled={busy || !eventId || !phone.trim()} className="w-full bg-nareli text-white py-3 rounded-2xl font-semibold disabled:opacity-50">{busy ? 'Checking…' : 'Find booking'}</button>
        {lookupError && <p className="text-red-700 text-sm">{lookupError}</p>}

        {result?.matches?.map((m) => {
          const party = m.names ?? Array.from({ length: m.party_size }, (_, i) => `Guest ${i + 1}`);
          return (
            <div key={m.reg_id} className="bg-white rounded-3xl border border-stone-100 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-stone-900">{m.arrived}/{m.party_size} arrived</p>
                {m.checkin_at ? <span className="text-green-700 text-sm font-semibold">IN ✓</span> : <span className="text-amber-700 text-sm font-semibold">pending</span>}
              </div>
              <div className="space-y-2">
                {party.map((n, i) => {
                  const entered = m.arrived_names.includes(n);
                  return (
                    <button key={i} disabled={entered || busy || !!m.checkin_at} onClick={() => mark(m, [n])}
                      className={`w-full text-left px-4 py-3 rounded-2xl border font-medium ${entered ? 'bg-green-50 border-green-200 text-green-800 line-through' : 'border-stone-200 hover:border-stone-400'}`}>
                      {n}{entered ? ' — in' : ''}
                    </button>
                  );
                })}
              </div>
              {!m.names && <button disabled={busy || !!m.checkin_at} onClick={() => mark(m, undefined, 1)} className="w-full border border-stone-300 py-2 rounded-2xl text-sm font-medium">+1 arrived</button>}
            </div>
          );
        })}
        {result?.matches?.length === 0 && <p className="text-stone-500 text-center py-6">No booking for that phone.</p>}
      </div>
    </main>
  );
}
