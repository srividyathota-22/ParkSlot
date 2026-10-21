import { useCallback, useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { api } from '../api.js';
import { Chip, range } from '../lib.jsx';

function csv(name, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const text = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

const Err = ({ m }) => (m ? <p role="alert" className="text-sm text-red-700">{m}</p> : null);

function Verify() {
  const [data, setData] = useState({ owners: [], listings: [] });
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setData(await api('/admin/verifications')); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(url, action) {
    const reason = action === 'reject' ? window.prompt('Reason for rejecting (optional)') : undefined;
    if (action === 'reject' && reason === null) return;
    setError('');
    try { await api(url, { method: 'PATCH', body: { action, reason } }); await load(); } catch (e) { setError(e.message); }
  }
  const Buttons = ({ url }) => (
    <div className="flex gap-2">
      <button onClick={() => decide(url, 'approve')} className="btn-primary !w-auto px-5 !py-2">Approve</button>
      <button onClick={() => decide(url, 'reject')} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Reject</button>
    </div>
  );

  return (
    <div className="space-y-8">
      <Err m={error} />
      <section>
        <h2 className="font-display text-xl font-semibold">Owners waiting ({data.owners.length})</h2>
        {data.owners.length === 0 && <p className="mt-2 text-sm text-ink/65">No owners waiting.</p>}
        <ul className="mt-3 space-y-3">
          {data.owners.map((o) => (
            <li key={o._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-white p-4">
              <div>
                <p className="font-medium">{o.userId?.name} <span className="text-sm text-ink/60">{o.userId?.email}</span></p>
                <p className="text-sm">
                  {o.idDocUrl ? <a className="text-sign underline" href={o.idDocUrl} target="_blank" rel="noreferrer">ID proof</a> : 'No ID proof'}
                  {' · '}
                  {o.ownershipDocUrl ? <a className="text-sign underline" href={o.ownershipDocUrl} target="_blank" rel="noreferrer">Ownership proof</a> : 'No ownership proof'}
                </p>
              </div>
              <Buttons url={`/admin/owners/${o._id}/verify`} />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">Listings waiting ({data.listings.length})</h2>
        {data.listings.length === 0 && <p className="mt-2 text-sm text-ink/65">No listings waiting.</p>}
        <ul className="mt-3 space-y-3">
          {data.listings.map((l) => (
            <li key={l._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-white p-4">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-ink/65">{l.location?.area}, {l.location?.city} · {l.slots?.length} bays · ₹{l.prices?.hourly}/hr · by {l.ownerId?.name}</p>
              </div>
              <Buttons url={`/admin/listings/${l._id}/review`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AllBookings() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api('/admin/bookings' + (status ? `?status=${status}` : '')).then((d) => setRows(d.bookings)).catch((e) => setError(e.message));
  }, [status]);

  const exportRows = () => csv('bookings.csv', rows.map((b) => ({
    listing: b.listingId?.title, driver: b.userId?.name, email: b.userId?.email,
    start: b.start, end: b.end, status: b.status, price: b.priceTotal,
  })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select className="field !mt-0 !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={exportRows} className="rounded-lg border border-ink/25 px-4 py-2 text-sm hover:bg-ink/5">Download CSV</button>
      </div>
      <Err m={error} />
      <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/15 bg-white">
        {rows.map((b) => (
          <li key={b._id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <p className="font-medium">{b.listingId?.title || 'Removed listing'}</p>
              <p className="text-sm text-ink/65">{b.userId?.name} · {range(b)} · ₹{b.priceTotal}</p>
            </div>
            <Chip s={b.status} />
          </li>
        ))}
        {rows.length === 0 && <li className="p-4 text-sm text-ink/65">No bookings.</li>}
      </ul>
    </div>
  );
}

function Bars({ rows, label, value, money }) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={label(r)} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-sm">
          <span className="truncate">{label(r)}</span>
          <span className="h-3 rounded-full bg-ink/10"><span className="block h-3 rounded-full bg-volt" style={{ width: `${(value(r) / max) * 100}%` }} /></span>
          <span className="text-right font-medium">{money ? '₹' : ''}{value(r)}</span>
        </li>
      ))}
    </ul>
  );
}

function Reports() {
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/admin/reports').then(setR).catch((e) => setError(e.message)); }, []);
  if (error) return <Err m={error} />;
  if (!r) return null;

  const cards = [
    ['Drivers', r.counts.drivers], ['Owners', r.counts.owners], ['Active listings', r.counts.activeListings], ['Bays', r.counts.slots],
    ['Bookings', r.totals.bookings], ['Revenue', `₹${r.totals.revenue}`], ['Booked hours', r.totals.bookedHours],
  ];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-ink/15 bg-white p-4">
            <p className="text-sm text-ink/65">{label}</p>
            <p className="font-display text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Revenue by listing</h2>
          <button onClick={() => csv('revenue-by-listing.csv', r.perListing)} className="rounded-lg border border-ink/25 px-4 py-2 text-sm hover:bg-ink/5">Download CSV</button>
        </div>
        <Bars rows={r.perListing} label={(x) => x.title} value={(x) => x.revenue} money />
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">Revenue by day</h2>
        <Bars rows={r.byDay} label={(x) => x.day} value={(x) => x.amount} money />
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">Bookings by status</h2>
        <Bars rows={Object.entries(r.byStatus)} label={(x) => x[0]} value={(x) => x[1]} />
      </section>
    </div>
  );
}
function Disputes() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(() => api('/disputes').then((d) => setRows(d.disputes)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function resolve(id) {
    const resolution = window.prompt('Resolution note (the person who raised it will see this)');
    if (!resolution) return;
    setError('');
    try { await api(`/disputes/${id}/resolve`, { method: 'PATCH', body: { resolution } }); await load(); } catch (e) { setError(e.message); }
  }

  return (
    <div className="space-y-3">
      <Err m={error} />
      {rows.length === 0 && <p className="text-sm text-ink/65">No disputes.</p>}
      <ul className="space-y-3">
        {rows.map((d) => (
          <li key={d._id} className="rounded-2xl border border-ink/15 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{d.bookingId?.listingId?.title || 'Booking'} <span className="text-sm text-ink/60">raised by {d.raisedBy?.name} ({d.raisedBy?.role})</span></p>
                <p className="mt-1 text-sm">{d.reason}</p>
                {d.bookingId && <p className="mt-1 text-xs text-ink/60">{range(d.bookingId)} · ₹{d.bookingId.priceTotal} · booking {d.bookingId.status}</p>}
                {d.resolution && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900">Resolved: {d.resolution}</p>}
              </div>
              {d.status === 'open'
                ? <button onClick={() => resolve(d._id)} className="btn-primary !w-auto px-5 !py-2">Resolve</button>
                : <span className="text-sm text-ink/60">resolved</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
const TABS = [['verify', 'Verification'], ['bookings', 'Bookings'], ['reports', 'Reports'],['disputes', 'Disputes']];

export default function AdminDashboard() {
  const [tab, setTab] = useState('verify');
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl space-y-6 p-5">
        <h1 className="font-display text-3xl font-semibold">Admin dashboard</h1>
        <div role="tablist" className="flex gap-2 border-b border-ink/15">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-4 py-2 font-medium ${tab === id ? 'border-volt text-ink' : 'border-transparent text-ink/60 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'verify' && <Verify />}
        {tab === 'bookings' && <AllBookings />}
        {tab === 'disputes' && <Disputes />}
        {tab === 'reports' && <Reports />}
      </main>
    </div>
  );
}