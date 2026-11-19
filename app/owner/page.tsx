'use client';

// /owner — owner/console surface. Deliberately NOT linked from public pages.
// Uses the same stone design language as the site; all data comes from the
// event-backend owner endpoints, which re-check the DB role on every call.
import Link from 'next/link';
import { useState } from 'react';
import {
  ApiError, apiConfigured, authenticate, cancelEvent, createEvent, createStaff,
  deleteStaff, downloadRegistrationsCsv, editCapacity, getMe, getOwnerEvents,
  getRegistrations, getStaff, getSummary, markRefund,
  type ApiEvent, type EventSummary, type RegistrationRow, type StaffMember,
} from '../lib/api';
import Todo from '../components/Todo';

type OwnerEvent = ApiEvent & { is_public: boolean; cancelled_at?: string | null };
type Tab = 'events' | 'registrations' | 'staff';

const input = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 placeholder:text-stone-400';
const btn = 'bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-stone-700 disabled:opacity-50';
const ghost = 'border border-stone-300 px-4 py-2 rounded-full text-sm font-medium hover:border-stone-500 disabled:opacity-50';
const fmtKes = (n: number | null | undefined) => `KSh ${Number(n ?? 0).toLocaleString('en-KE')}`;
const fmtDate = (s: string) => new Intl.DateTimeFormat('en-KE', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
}).format(new Date(s));

export default function OwnerPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<OwnerEvent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [regs, setRegs] = useState<RegistrationRow[]>([]);
  const [regPage, setRegPage] = useState(1);
  const [regPages, setRegPages] = useState(1);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>({});
  const [refundRefs, setRefundRefs] = useState<Record<string, string>>({});
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');

  const fail = (e: unknown) => setMessage(e instanceof ApiError ? `${e.status}: ${e.message}` : e instanceof Error ? e.message : 'Something went wrong.');

  const loadEvents = async (t: string) => {
    const data = await getOwnerEvents(t);
    setEvents(data.data ?? []);
    setSelectedId((prev) => prev || data.data?.[0]?.id || '');
  };
  const loadRegs = async (t: string, id: string, page = 1) => {
    const [s, r] = await Promise.all([getSummary(t, id), getRegistrations(t, id, page)]);
    setSummary(s);
    setRegs(r.data ?? []);
    setRegPages(r.pagination?.total_pages ?? 1);
    setRegPage(page);
  };
  const loadStaff = async (t: string) => setStaff((await getStaff(t)).data ?? []);

  const signIn = async () => {
    setAuthError(null);
    setBusy(true);
    try {
      const res = await authenticate('login', email, password);
      const me = await getMe(res.token); // DB-fresh role: a revoked admin dies here
      const role = me.user.role;
      if (role !== 'admin' && role !== 'owner') {
        setAuthError('This account is not an owner. Door staff sign in at /gate.');
        return;
      }
      setToken(res.token);
      await loadEvents(res.token);
      setMessage(`Signed in as ${me.user.username ?? role}.`);
    } catch (e) {
      setAuthError(e instanceof ApiError && e.status === 401 ? 'Invalid email or password.' : e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const switchTab = async (next: Tab) => {
    setTab(next);
    setMessage(null);
    if (!token) return;
    try {
      if (next === 'registrations' && selectedId) await loadRegs(token, selectedId);
      if (next === 'staff') await loadStaff(token);
    } catch (e) { fail(e); }
  };

  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage(null);
    try { await work(); setMessage(success); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  if (!apiConfigured) {
    return <main className="min-h-screen flex items-center justify-center px-6 text-center text-stone-500">Owner console is not configured — set NEXT_PUBLIC_API_URL.</main>;
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-stone-100 shadow-sm p-6 space-y-4">
          <Link href="/" className="text-stone-500 text-sm">← Back home</Link>
          <h1 className="text-2xl font-bold text-stone-900">Owner console</h1>
          <p className="text-stone-600 text-sm">Private. Owner credentials only — gate staff use the separate door console.</p>
          <input className={input} type="email" placeholder="Owner email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {authError && <p className="text-red-700 text-sm">{authError}</p>}
          <button onClick={signIn} disabled={busy || !email || !password} className={`${btn} w-full`}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-[11px] text-stone-400">Session is held in this tab only; closing it signs you out.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 py-10 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Owner console</h1>
            <p className="text-stone-600 text-sm">Live backend data — every action is permission-checked again on the server.</p>
          </div>
          <button onClick={() => { setToken(null); setEvents([]); setSummary(null); setRegs([]); setStaff([]); }} className={ghost}>Sign out</button>
        </div>

        <nav className="flex gap-2 mb-6">
          {([['events', 'Events'], ['registrations', 'Registrations + refunds'], ['staff', 'Gate staff']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => void switchTab(key)} className={`px-4 py-2 rounded-full border text-sm font-medium ${tab === key ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-300 text-stone-600 hover:border-stone-500'}`}>{label}</button>
          ))}
        </nav>

        {message && <div className="bg-stone-900 text-white rounded-2xl px-5 py-3 text-sm mb-5">{message}</div>}

        {tab === 'events' && (
          <div className="space-y-8">
            <section className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-1">Create an event</h2>
              <p className="text-stone-600 text-sm mb-4">Times are entered in Nairobi time and sent as ISO to the backend.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const body = {
                    title: title.trim(), description: description.trim(), location: location.trim(),
                    start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(),
                    capacity: capacity.trim() ? Number(capacity) : undefined, is_public: isPublic,
                  };
                  await createEvent(token, body);
                  await loadEvents(token);
                  setTitle(''); setDescription(''); setLocation(''); setStart(''); setEnd(''); setCapacity('');
                }, 'Event created.');
              }} className="grid sm:grid-cols-2 gap-4">
                <input className={input} placeholder="Event title" required value={title} onChange={(e) => setTitle(e.target.value)} />
                <input className={input} placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
                <input className={input} type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} aria-label="Starts at" />
                <input className={input} type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Ends at" />
                <input className={input} placeholder="Capacity (blank = unlimited)" type="number" min="0" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public listing (private events return 404 to guests)
                </label>
                <textarea className={`${input} sm:col-span-2`} rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <button type="submit" disabled={busy} className={`${btn} sm:col-span-2 justify-self-start`}>Create event</button>
              </form>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-stone-900">Events <span className="text-stone-500 text-sm font-normal">({events.length})</span></h2>
              {events.length === 0 && <p className="text-stone-500">No events yet.</p>}
              {events.map((ev) => (
                <article key={ev.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">{ev.title}</h3>
                      <p className="text-sm text-stone-600">{fmtDate(ev.start_time)} · {ev.location ?? 'Venue TBA'}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      {!ev.is_public && <span className="bg-stone-200 text-stone-700 px-2 py-1 rounded-full font-semibold">Private</span>}
                      {ev.cancelled_at && <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">Cancelled</span>}
                      <span className="bg-stone-900 text-white px-2 py-1 rounded-full font-semibold">{ev.current_registrations} bookings</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => { setSelectedId(ev.id); void run(async () => { await loadRegs(token, ev.id); setTab('registrations'); }, 'Loaded event data.'); }} className={ghost}>Registrations / summary</button>
                    <input
                      className={`${input} w-28`} type="number" min="0" placeholder="Capacity"
                      value={capacityDrafts[ev.id] ?? String(ev.capacity ?? '')}
                      onChange={(e) => setCapacityDrafts((d) => ({ ...d, [ev.id]: e.target.value }))}
                      aria-label={`New capacity for ${ev.title}`}
                    />
                    <button onClick={() => void run(async () => {
                      const raw = capacityDrafts[ev.id] ?? String(ev.capacity ?? '');
                      await editCapacity(token, ev.id, raw.trim() === '' ? null : Number(raw));
                      await loadEvents(token);
                    }, 'Capacity updated (cannot go below seats already sold).')} className={ghost} disabled={busy}>Save capacity</button>
                    {!ev.cancelled_at && (
                      <button onClick={() => {
                        if (!window.confirm(`Cancel “${ev.title}” for everyone? This notifies attendees and flags paid bookings for refund.`)) return;
                        const reason = window.prompt('Reason shown to attendees (optional):') ?? '';
                        void run(async () => {
                          const r = await cancelEvent(token, ev.id, reason);
                          await loadEvents(token);
                          setMessage(`Cancelled. ${r.notifications_queued} notified, ${r.refunds_requested} refunds requested.`);
                        }, '');
                      }} className="border border-red-300 text-red-700 px-4 py-2 rounded-full text-sm font-medium hover:border-red-500">Cancel event</button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}

        {tab === 'registrations' && (
          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-stone-100 shadow-sm p-5 flex flex-wrap gap-3 items-center">
              <select className={input} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setSummary(null); setRegs([]); }} aria-label="Choose event">
                <option value="">Choose an event…</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
              <button onClick={() => void run(async () => { if (!selectedId) throw new Error('Choose an event first.'); await loadRegs(token, selectedId); }, 'Loaded event data.')} className={btn} disabled={busy}>Load</button>
              <button onClick={() => void run(async () => { if (!selectedId) throw new Error('Choose an event first.'); await downloadRegistrationsCsv(token, selectedId); }, 'CSV downloaded — handle it as personal data.')} className={ghost} disabled={!selectedId}>Download CSV</button>
            </section>

            {summary && (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Confirmed', summary.confirmed_rows], ['Cancelled', summary.cancelled_rows],
                  ['Seats sold', summary.seats_sold], ['Arrived', summary.seats_arrived],
                  ['Waitlist', summary.waitlist_pending], ['Refunds requested', summary.refund_requested_count],
                  ['Refunded', summary.refund_refunded_count], ['Net recorded', summary.net_kes],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-white rounded-2xl border border-stone-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
                    <p className="text-2xl font-bold text-stone-900">{label === 'Net recorded' ? fmtKes(Number(value)) : String(value)}</p>
                  </div>
                ))}
              </section>
            )}
            <p className="text-xs text-stone-500">Money figures are ledger records only. No M-PESA reversal happens here. <Todo>owner: payment rails</Todo></p>

            {regs.length > 0 && (
              <section className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
                    <tr>{['Guest', 'Phone', 'Party', 'Status', 'Arrived', 'Amount', 'Refund', 'Action'].map((h) => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {regs.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-stone-900">{r.username ?? r.email ?? r.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-stone-600">{r.phone ?? '—'}</td>
                        <td className="px-4 py-3">{r.party_size}</td>
                        <td className="px-4 py-3">{r.status}</td>
                        <td className="px-4 py-3">{r.arrived_count}/{r.party_size}</td>
                        <td className="px-4 py-3">{r.amount_kes != null ? fmtKes(r.amount_kes) : '—'}</td>
                        <td className="px-4 py-3">{r.refund_status}</td>
                        <td className="px-4 py-3">
                          {r.refund_status === 'none' || r.refund_status === 'requested' ? (
                            <div className="flex gap-2 items-center flex-wrap">
                              <input className={`${input} w-24`} placeholder="M-PESA ref" value={refundRefs[r.id] ?? ''} onChange={(e) => setRefundRefs((d) => ({ ...d, [r.id]: e.target.value }))} aria-label={`Refund reference for ${r.username ?? r.id.slice(0, 8)}`} />
                              <button disabled={busy || !selectedId} onClick={() => void run(async () => {
                                await markRefund(token, selectedId, r.id, { action: 'mark_refunded', refund_ref: refundRefs[r.id]?.trim() || undefined });
                                await loadRegs(token, selectedId, regPage);
                              }, 'Refund marked — money must already have moved out-of-band.')} className={ghost}>Mark paid</button>
                              {r.refund_status === 'requested' && (
                                <button disabled={busy || !selectedId} onClick={() => void run(async () => {
                                  await markRefund(token, selectedId, r.id, { action: 'mark_declined' });
                                  await loadRegs(token, selectedId, regPage);
                                }, 'Refund request declined.')} className="text-red-700 text-xs underline">Decline</button>
                              )}
                            </div>
                          ) : <span className="text-stone-500">closed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {!regs.length && summary && <p className="text-stone-500">No registrations for this event.</p>}
            {regPages > 1 && (
              <div className="flex justify-center gap-4">
                <button disabled={regPage <= 1} onClick={() => void run(async () => { if (selectedId) await loadRegs(token, selectedId, regPage - 1); }, '')} className={ghost}>← Previous</button>
                <span className="text-sm text-stone-600 py-2">Page {regPage} of {regPages}</span>
                <button disabled={regPage >= regPages} onClick={() => void run(async () => { if (selectedId) await loadRegs(token, selectedId, regPage + 1); }, '')} className={ghost}>Next →</button>
              </div>
            )}
          </div>
        )}

        {tab === 'staff' && (
          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-3">Add gate staff</h2>
              <p className="text-sm text-stone-600 mb-4">Staff can only use the door console. Their token dies on the next request after removal.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await createStaff(token, { email: staffEmail.trim(), password: staffPassword, username: staffName.trim() || undefined });
                  await loadStaff(token);
                  setStaffEmail(''); setStaffPassword(''); setStaffName('');
                }, 'Staff account created — hand the password over out-of-band.');
              }} className="grid sm:grid-cols-2 gap-4">
                <input className={input} type="email" placeholder="Staff email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
                <input className={input} placeholder="Display name (optional)" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                <input className={input} type="password" placeholder="Temporary password (8+ chars)" minLength={8} required value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
                <button className={`${btn} justify-self-start`} disabled={busy}>Create staff</button>
              </form>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-stone-900">Current staff ({staff.length})</h2>
              {staff.length === 0 && <p className="text-stone-500">No staff accounts yet.</p>}
              {staff.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center justify-between gap-4">
                  <div><p className="font-semibold text-stone-900">{s.username ?? s.email}</p><p className="text-xs text-stone-500">Added {fmtDate(s.created_at)}</p></div>
                  <button onClick={() => {
                    if (!window.confirm(`Remove ${s.email}? Their access ends immediately.`)) return;
                    void run(async () => { await deleteStaff(token, s.id); await loadStaff(token); }, 'Staff access revoked.');
                  }} className="text-red-700 text-sm underline">Remove</button>
                </div>
              ))}
            </section>
          </div>
        )}

        <p className="text-xs text-stone-400 mt-10">Owner console is intentionally not linked from public navigation. <Todo>owner: per-account audit trail</Todo></p>
      </div>
    </main>
  );
}
