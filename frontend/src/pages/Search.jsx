import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CarFront, Check, Loader2, LocateFixed, LogOut, SearchX } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import MapView from '../components/MapView.jsx';
import Bell from '../components/Bell.jsx';

const PLACES = [
  { name: 'Indiranagar Metro', lat: 12.9784, lng: 77.6408 },
  { name: 'MG Road Metro', lat: 12.9756, lng: 77.607 },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
];
const IST_MS = 5.5 * 60 * 60 * 1000;
const tomorrow = () => new Date(Date.now() + IST_MS + 864e5).toISOString().slice(0, 10);
const toUtc = (date, time) => new Date(`${date}T${time}:00+05:30`).toISOString(); // times are India time
const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const stand = (type) => (type === '2-wheeler' ? '/bike/bike-wall-poster.jpg' : '/videos/hero-poster.jpg');

export default function Search() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ place: 0, radius: 5, date: tomorrow(), from: '10:00', to: '12:00', vehicle: '4-wheeler', sort: 'distance' });
  const [me, setMe] = useState(null);
  const [query, setQuery] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [finding, setFinding] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [slotPick, setSlotPick] = useState(null);
  const [booking, setBooking] = useState({ busy: false, error: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const spot = me || PLACES[form.place];

  const run = useCallback(async (f, where) => {
    if (f.from >= f.to) { setError('The end time must be after the start time.'); return; }
    setLoading(true);
    setError('');
    const q = { lat: where.lat, lng: where.lng, start: toUtc(f.date, f.from), end: toUtc(f.date, f.to), vehicle: f.vehicle };
    try {
      const data = await api('/search?' + new URLSearchParams({ lat: q.lat, lng: q.lng, radius: f.radius, vehicleType: f.vehicle, start: q.start, end: q.end, sort: f.sort }));
      setResults(data.results || []);
      setQuery(q);
      setSelectedId(null);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(form, PLACES[0]); }, []); // first search when the page opens

  const submit = (e) => { e.preventDefault(); setNotice(''); run(form, spot); };
    async function findPlace() {
    if (!q.trim()) return;
    setFinding(true);
    setError('');
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(q));
      const d = await r.json();
      if (!d.length) { setError('Could not find that place. Try a nearby landmark.'); return; }
      const where = { name: d[0].display_name.split(',')[0], lat: Number(d[0].lat), lng: Number(d[0].lon) };
      setMe(where);
      setNotice('');
      run(form, where);
    } catch {
      setError('Place search failed. Check your internet connection.');
    } finally {
      setFinding(false);
    }
  }
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setMe({ name: 'My location', lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError('Could not get your location. Pick a place instead.')
    );


  const center = useMemo(() => (query ? [query.lat, query.lng] : [PLACES[0].lat, PLACES[0].lng]), [query]);
  const selected = results.find((r) => r._id === selectedId);
  const slotId = selected && (selected.availableSlots.some((s) => s._id === slotPick) ? slotPick : selected.availableSlots[0]._id);

  async function reserve() {
    setBooking({ busy: true, error: '' });
    try {
      const res = await api('/bookings', { method: 'POST', body: { listingId: selected._id, slotId, start: query.start, end: query.end } });
      const b = res.booking || res;
      setNotice(b.status === 'confirmed' ? `Booked. Your bay at ${selected.title} is confirmed.` : `Request sent for ${selected.title}. The owner will confirm soon.`);
      setBooking({ busy: false, error: '' });
      run(form, spot);
    } catch (err) {
      setBooking({ busy: false, error: err.status === 409 ? 'Someone just took that slot. Pick another one.' : err.message });
      if (err.status === 409) run(form, spot);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="flex items-center justify-between bg-asphalt px-5 py-3 text-mist">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-volt font-display font-bold text-asphalt">P</span>
          <span className="font-display text-lg font-semibold">ParkSlot</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/bookings" className="rounded-md px-3 py-1.5 hover:bg-white/10">My bookings</Link>

          <Bell />
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-white/10"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      </header>

      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[440px_1fr]">
        <aside className="order-2 space-y-5 p-5 lg:order-1 lg:overflow-y-auto">
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-2">
              <input
                className="field !mt-0 flex-1"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findPlace(); } }}
                placeholder="Find a place, e.g. Kanaka Durga Temple, Vijayawada"
                aria-label="Find a place"
              />
              <button type="button" onClick={findPlace} disabled={finding} className="rounded-lg border border-ink/20 bg-white px-4 font-medium">
                {finding ? '...' : 'Find'}
              </button>
            </div>
            <div className="flex gap-2">
              <select className="field !mt-0 flex-1" value={me ? 'me' : form.place} onChange={(e) => { setMe(null); set('place')(e); }} aria-label="Destination">
                {me && <option value="me">{me.name}</option>}
                {PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </select>
              <button type="button" onClick={locate} className="rounded-lg border border-ink/20 bg-white px-3" aria-label="Use my location"><LocateFixed className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-3 text-sm font-medium sm:col-span-1">Date<input type="date" className="field" value={form.date} onChange={set('date')} required /></label>
              <label className="text-sm font-medium">From<input type="time" className="field" value={form.from} onChange={set('from')} required /></label>
              <label className="text-sm font-medium">To<input type="time" className="field" value={form.to} onChange={set('to')} required /></label>
            </div>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Vehicle">
              {[['4-wheeler', 'Car', CarFront], ['2-wheeler', 'Bike', Bike]].map(([v, label, Icon]) => (
                <button key={v} type="button" aria-pressed={form.vehicle === v} onClick={() => setForm({ ...form, vehicle: v })}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 font-medium transition-colors ${form.vehicle === v ? 'border-asphalt bg-asphalt text-mist' : 'border-ink/20 bg-white hover:border-ink/40'}`}>
                  <Icon className="h-5 w-5" /> {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="field !mt-0" value={form.radius} onChange={set('radius')} aria-label="Distance">
                {[1, 3, 5, 10].map((r) => <option key={r} value={r}>Within {r} km</option>)}
              </select>
              <select className="field !mt-0" value={form.sort} onChange={set('sort')} aria-label="Sort by">
                <option value="distance">Nearest first</option>
                <option value="price">Cheapest first</option>
              </select>
            </div>
            <button className="btn-volt w-full justify-center" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Search parking
            </button>
          </form>

          {query && <p className="text-sm text-ink/60">India time, {when(query.start)} to  {new Date(query.end).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</p>}
          {notice && <p role="status" className="flex gap-2 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-900"><Check className="h-5 w-5 shrink-0" /> {notice}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          {selected && (
            <section className="overflow-hidden rounded-2xl border border-ink/15 bg-white">
              <img src={selected.photos?.[0] || stand(form.vehicle)} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = stand(form.vehicle); }} alt="" className="h-36 w-full object-cover" />
              <div className="space-y-3 p-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">{selected.title}</h2>
                  <p className="text-sm text-ink/65">{selected.location.address}{selected.location.landmark ? `, ${selected.location.landmark}` : ''}</p>
                  {selected.description && <p className="mt-1 text-sm text-ink/80">{selected.description}</p>}
                </div>
                <p className="text-sm text-ink/70">₹{selected.prices.hourly}/hr{selected.prices.daily ? ` · ₹${selected.prices.daily}/day` : ''}{selected.prices.monthly ? ` · ₹${selected.prices.monthly}/month` : ''}</p>
                <div role="group" aria-label="Choose a slot" className="flex flex-wrap gap-2">
                  {selected.availableSlots.map((s) => (
                    <button key={s._id} type="button" aria-pressed={slotId === s._id} onClick={() => setSlotPick(s._id)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium ${slotId === s._id ? 'border-volt bg-volt text-asphalt' : 'border-ink/25 hover:border-ink/50'}`}>
                      Bay {s.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-ink/10 pt-3">
                  <div>
                    <p className="font-display text-2xl font-semibold">₹{selected.priceForRequestedDuration}</p>
                    <p className="text-xs text-ink/60">{selected.approvalMode === 'auto' ? 'Confirmed instantly' : 'Owner approves first'}</p>
                  </div>
                  <button onClick={reserve} disabled={booking.busy} className="btn-primary !w-auto px-6">
                    {booking.busy && <Loader2 className="h-4 w-4 animate-spin" />} Reserve
                  </button>
                </div>
                {booking.error && <p role="alert" className="text-sm text-red-700">{booking.error}</p>}
              </div>
            </section>
          )}

          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r._id}>
                <button onClick={() => { setSelectedId(r._id); setBooking({ busy: false, error: '' }); }} aria-pressed={r._id === selectedId}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${r._id === selectedId ? 'border-volt bg-white ring-2 ring-volt/40' : 'border-ink/15 bg-white hover:border-ink/35'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold leading-tight">{r.title}</h3>
                      <p className="mt-1 text-sm text-ink/65">{r.location.area} · {r.distanceKm} km · {r.availableSlots.length} free {r.availableSlots.length === 1 ? 'bay' : 'bays'}</p>
                    </div>
                    <p className="font-display text-xl font-semibold text-sign">₹{r.priceForRequestedDuration}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {!loading && !error && query && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/25 p-6 text-center text-ink/70">
              <SearchX className="mx-auto h-8 w-8" />
              <p className="mt-2 font-medium text-ink">No free bays for that time</p>
              <p className="text-sm">Try another time, a wider distance, or a weekday.</p>
            </div>
          )}
        </aside>

        <div className="relative order-1 h-72 lg:order-2 lg:h-auto">
          <MapView center={center} listings={results} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}