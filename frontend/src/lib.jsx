export const fmt = (iso) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const range = (b) =>
  `${fmt(b.start)} to ${new Date(b.end).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`;
export const asList = (d) => (Array.isArray(d) ? d : d.bookings || []);

const TONE = {
  pending: 'bg-amber-100 text-amber-900',
  pending_review: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-emerald-100 text-emerald-900',
  active: 'bg-emerald-100 text-emerald-900',
  completed: 'bg-stone-200 text-stone-700',
  paused: 'bg-stone-200 text-stone-700',
  cancelled: 'bg-red-100 text-red-900',
  rejected: 'bg-red-100 text-red-900',
  suspended: 'bg-red-100 text-red-900',
};
export function Chip({ s }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[s] || TONE.completed}`}>{s.replace('_', ' ')}</span>;
}