import { useState } from 'react';
import { api } from '../api.js';
import { fmt } from '../lib.jsx';

const iso = (v) => new Date(`${v}:00+05:30`).toISOString(); // typed times are India time
const input = 'field !mt-1 !py-1.5';

export default function ManageListing({ listing, onDone }) {
  const [open, setOpen] = useState(false);
  const [blk, setBlk] = useState({ start: '', end: '', reason: '' });
  const [rules, setRules] = useState({
    hourly: listing.prices?.hourly ?? '', daily: listing.prices?.daily ?? '', monthly: listing.prices?.monthly ?? '',
    approvalMode: listing.approvalMode, minDurationMinutes: listing.minDurationMinutes ?? 60, advanceNoticeMinutes: listing.advanceNoticeMinutes ?? 0,
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function run(fn, ok) {
    setError('');
    setMsg('');
    try { await fn(); setMsg(ok); await onDone(); } catch (e) { setError(e.message); }
  }

  const addBlock = (e) => {
    e.preventDefault();
    if (blk.start >= blk.end) return setError('The end must be after the start.');
    run(async () => {
      await api(`/owner/listings/${listing._id}/blocks`, { method: 'POST', body: { start: iso(blk.start), end: iso(blk.end), reason: blk.reason } });
      setBlk({ start: '', end: '', reason: '' });
    }, 'Dates blocked.');
  };
  const unblock = (id) => run(() => api(`/owner/listings/${listing._id}/blocks/${id}`, { method: 'DELETE' }), 'Block removed.');
  const save = (e) => {
    e.preventDefault();
    run(() => api(`/owner/listings/${listing._id}`, {
      method: 'PUT',
      body: {
        prices: { hourly: Number(rules.hourly), daily: rules.daily ? Number(rules.daily) : undefined, monthly: rules.monthly ? Number(rules.monthly) : undefined },
        approvalMode: rules.approvalMode,
        minDurationMinutes: Number(rules.minDurationMinutes),
        advanceNoticeMinutes: Number(rules.advanceNoticeMinutes),
      },
    }), 'Saved. An active listing goes back to admin review before drivers see it again.');
  };
  const set = (k) => (e) => setRules({ ...rules, [k]: e.target.value });

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="text-sm underline">{open ? 'Close' : 'Manage'}</button>
      {open && (
        <div className="mt-3 space-y-5 rounded-xl bg-ink/5 p-3 text-sm">
          <form onSubmit={addBlock} className="space-y-2">
            <p className="font-medium">Block dates (India time)</p>
            <div className="grid grid-cols-2 gap-2">
              <label>From<input type="datetime-local" required className={input} value={blk.start} onChange={(e) => setBlk({ ...blk, start: e.target.value })} /></label>
              <label>To<input type="datetime-local" required className={input} value={blk.end} onChange={(e) => setBlk({ ...blk, end: e.target.value })} /></label>
            </div>
            <input className={input} placeholder="Reason (optional)" value={blk.reason} onChange={(e) => setBlk({ ...blk, reason: e.target.value })} />
            <button className="rounded-lg bg-asphalt px-4 py-1.5 font-medium text-mist">Block</button>
            {(listing.blocks || []).map((b) => (
              <p key={b._id} className="flex items-center justify-between gap-2">
                <span>{fmt(b.start)} to {fmt(b.end)}{b.reason ? ` · ${b.reason}` : ''}</span>
                <button type="button" onClick={() => unblock(b._id)} className="text-red-700 underline">Remove</button>
              </p>
            ))}
          </form>

          <form onSubmit={save} className="space-y-2">
            <p className="font-medium">Prices and rules</p>
            <div className="grid grid-cols-3 gap-2">
              <label>₹ per hour<input type="number" min="1" required className={input} value={rules.hourly} onChange={set('hourly')} /></label>
              <label>₹ per day<input type="number" min="1" className={input} value={rules.daily} onChange={set('daily')} /></label>
              <label>₹ per month<input type="number" min="1" className={input} value={rules.monthly} onChange={set('monthly')} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>Minimum minutes<input type="number" min="15" className={input} value={rules.minDurationMinutes} onChange={set('minDurationMinutes')} /></label>
              <label>Advance notice (minutes)<input type="number" min="0" className={input} value={rules.advanceNoticeMinutes} onChange={set('advanceNoticeMinutes')} /></label>
            </div>
            <select className={input} value={rules.approvalMode} onChange={set('approvalMode')}>
              <option value="manual">I approve each booking</option>
              <option value="auto">Confirm automatically</option>
            </select>
            <button className="rounded-lg bg-asphalt px-4 py-1.5 font-medium text-mist">Save</button>
          </form>

          {msg && <p className="text-emerald-800">{msg}</p>}
          {error && <p role="alert" className="text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}