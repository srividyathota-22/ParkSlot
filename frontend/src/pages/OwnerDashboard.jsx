import { useCallback, useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { api } from '../api.js';
import { Chip, asList, range } from '../lib.jsx';
import { Link } from 'react-router-dom';
import VerifyBox from '../components/VerifyBox.jsx';
import ManageListing from '../components/ManageListing.jsx';


export default function OwnerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, l, p] = await Promise.all([api('/bookings'), api('/owner/listings'), api('/owner/profile').catch(() => null)]);
      setBookings(asList(b).sort((x, y) => new Date(y.start) - new Date(x.start)));
      setListings(Array.isArray(l) ? l : l.listings || []);
      setProfile(p);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(url, key) {
    setBusy(key);
    setError('');
    try { await api(url, { method: 'PATCH', body: {} }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  const info = (b) => {
    const l = listings.find((x) => x._id === (b.listingId?._id || b.listingId));
    const bay = l?.slots?.find((s) => s._id === b.slotId)?.label;
    return `${l?.title || 'Your listing'}${bay ? ` · Bay ${bay}` : ''}`;
  };
  const pending = bookings.filter((b) => b.status === 'pending');
  const rest = bookings.filter((b) => b.status !== 'pending');
  const earned = bookings.filter((b) => ['confirmed', 'active', 'completed'].includes(b.status)).reduce((s, b) => s + b.priceTotal, 0);
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.end) > new Date()).length;
  const stats = [['Pending requests', pending.length], ['Upcoming bookings', upcoming], ['Earnings', `₹${earned}`], ['Active listings', listings.filter((l) => l.status === 'active').length]];

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl space-y-8 p-5">
        <h1 className="font-display text-3xl font-semibold">Owner dashboard</h1>
        <VerifyBox profile={profile} onDone={load} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-ink/15 bg-white p-4">
              <p className="text-sm text-ink/65">{label}</p>
              <p className="font-display text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className="font-display text-xl font-semibold">Booking requests</h2>
          {pending.length === 0 && <p className="mt-2 text-sm text-ink/65">Nothing waiting for you.</p>}
          <ul className="mt-3 space-y-3">
            {pending.map((b) => (
              <li key={b._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-white p-4">
                <div>
                  <p className="font-medium">{info(b)}</p>
                  <p className="text-sm text-ink/65">{range(b)} · ₹{b.priceTotal}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(`/bookings/${b._id}/approve`, b._id)} disabled={busy === b._id} className="btn-primary !w-auto px-5 !py-2">Approve</button>
                  <button onClick={() => act(`/bookings/${b._id}/reject`, b._id)} disabled={busy === b._id} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
            <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">Your listings</h2>
                <Link to="/listings/new" className="btn-volt !py-2 text-sm">Add listing</Link>
            </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {listings.map((l) => (
              <li key={l._id} className="rounded-2xl border border-ink/15 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold leading-tight">{l.title}</h3>
                  <Chip s={l.status} />
                </div>
                <p className="mt-1 text-sm text-ink/65">{l.location?.area} · {l.slots?.length} bays · ₹{l.prices?.hourly}/hr · {l.approvalMode === 'auto' ? 'instant' : 'you approve'}</p>
                {l.status === 'active' && <button onClick={() => act(`/owner/listings/${l._id}/pause`, l._id)} disabled={busy === l._id} className="mt-3 rounded-lg border border-ink/25 px-4 py-1.5 text-sm hover:bg-ink/5">Pause</button>}
                {l.status === 'paused' && <button onClick={() => act(`/owner/listings/${l._id}/reactivate`, l._id)} disabled={busy === l._id} className="mt-3 rounded-lg bg-volt px-4 py-1.5 text-sm font-semibold text-asphalt">Reactivate</button>}
                <ManageListing listing={l} onDone={load} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">All bookings</h2>
          <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/15 bg-white">
            {rest.map((b) => (
              <li key={b._id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{info(b)}</p>
                  <p className="text-sm text-ink/65">{range(b)} · ₹{b.priceTotal}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Chip s={b.status} />
                  {b.status === 'confirmed' && new Date(b.end) > new Date() && (
                    <button onClick={() => window.confirm('Cancel this booking?') && act(`/bookings/${b._id}/cancel`, b._id)} className="text-sm text-red-700 underline">Cancel</button>
                  )}
                </div>
              </li>
            ))}
            {rest.length === 0 && <li className="p-4 text-sm text-ink/65">No bookings yet.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}