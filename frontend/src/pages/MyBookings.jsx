import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import { api } from '../api.js';
import { Chip, asList, range } from '../lib.jsx';

export default function MyBookings() {
  const [rows, setRows] = useState(null);
  const [places, setPlaces] = useState({});
  const [disputed, setDisputed] = useState(new Set());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const list = asList(await api('/bookings')).sort((a, b) => new Date(b.start) - new Date(a.start));
      setRows(list);
      const ids = [...new Set(list.map((b) => b.listingId?._id || b.listingId))];
      const found = {};
      await Promise.all(ids.map(async (id) => { try { found[id] = await api(`/listings/${id}`); } catch { /* paused listings are hidden */ } }));
      setPlaces(found);
      const d = await api('/disputes').catch(() => ({ disputes: [] }));
      setDisputed(new Set(d.disputes.filter((x) => x.status === 'open').map((x) => x.bookingId?._id || x.bookingId)));
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function cancel(b) {
    if (!window.confirm('Cancel this booking?')) return;
    setBusy(b._id);
    setError('');
    try {
      await api(`/bookings/${b._id}/cancel`, { method: 'PATCH', body: { reason: 'Cancelled by driver' } });
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  async function report(b) {
    const reason = window.prompt('What went wrong?');
    if (!reason || !reason.trim()) return;
    setError('');
    try {
      await api('/disputes', { method: 'POST', body: { bookingId: b._id, reason } });
      setNotice('Dispute sent. An admin will look into it.');
      await load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="min-h-screen">
      <TopBar links={[['/app', 'Search']]} />
      <main className="mx-auto max-w-3xl p-5">
        <h1 className="font-display text-3xl font-semibold">My bookings</h1>
        {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-900">{notice}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {rows && rows.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/25 p-8 text-center">
            <p className="font-medium">No bookings yet</p>
            <Link to="/app" className="btn-volt mt-4">Find parking</Link>
          </div>
        )}
        <ul className="mt-6 space-y-3">
          {(rows || []).map((b) => {
            const place = places[b.listingId?._id || b.listingId];
            const bay = place?.slots?.find((s) => s._id === b.slotId)?.label;
            const canCancel = ['pending', 'confirmed'].includes(b.status) && new Date(b.end) > new Date();
            const canReport = ['confirmed', 'active', 'completed'].includes(b.status) && !disputed.has(b._id);
            return (
              <li key={b._id} className="rounded-2xl border border-ink/15 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{place?.title || 'Parking bay'}{bay ? ` · Bay ${bay}` : ''}</h2>
                    <p className="text-sm text-ink/65">{place?.location?.address}</p>
                    <p className="mt-1 text-sm">{range(b)}</p>
                  </div>
                  <Chip s={b.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
                  <span className="font-display text-xl font-semibold text-sign">₹{b.priceTotal}</span>
                  <div className="flex items-center gap-3">
                    {disputed.has(b._id) && <span className="text-sm text-amber-800">Dispute open</span>}
                    {canReport && <button onClick={() => report(b)} className="text-sm text-ink/70 underline">Report a problem</button>}
                    {canCancel && (
                      <button onClick={() => cancel(b)} disabled={busy === b._id} className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                        {busy === b._id ? 'Cancelling' : 'Cancel booking'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}