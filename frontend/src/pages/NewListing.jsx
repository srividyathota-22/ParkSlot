import { useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import Field from '../components/Field.jsx';
import MapPicker from '../components/MapPicker.jsx';
import { api } from '../api.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const bays = (prefix, n, vehicleType, size) => Array.from({ length: n }, (_, i) => ({ label: `${prefix}${i + 1}`, vehicleType, size, isActive: true }));

export default function NewListing() {
  const [f, setF] = useState({ title: '', description: '', city: 'Bengaluru', area: '', address: '', pincode: '', landmark: '', photo: '', cars: 2, bikes: 0, from: '08:00', to: '20:00', hourly: '', daily: '', monthly: '', approvalMode: 'manual' });
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [point, setPoint] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const cars = Number(f.cars);
    const bikes = Number(f.bikes);
    if (!point) return setError('Click the map to mark where your parking is.');
    if (cars + bikes < 1) return setError('Add at least one bay.');
    if (!days.length) return setError('Choose at least one open day.');
    if (f.from >= f.to) return setError('Closing time must be after opening time.');
    setBusy(true);
    try {
      await api('/owner/listings', {
        method: 'POST',
        body: {
          title: f.title.trim(),
          description: f.description.trim(),
          location: { type: 'Point', coordinates: [point[1], point[0]], city: f.city, area: f.area, address: f.address, pincode: f.pincode, landmark: f.landmark },
          photos: f.photo ? [f.photo] : [],
          vehicleTypes: [...(cars ? ['4-wheeler'] : []), ...(bikes ? ['2-wheeler'] : [])],
          slots: [...bays('A', cars, '4-wheeler', 'medium'), ...bays('B', bikes, '2-wheeler', 'small')],
          availabilityRules: days.map((d) => ({ dayOfWeek: d, startTime: f.from, endTime: f.to })),
          approvalMode: f.approvalMode,
          prices: { hourly: Number(f.hourly), daily: f.daily ? Number(f.daily) : undefined, monthly: f.monthly ? Number(f.monthly) : undefined },
        },
      });
      setDone(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-xl p-8 text-center">
          <h1 className="font-display text-3xl font-semibold">Listing submitted</h1>
          <p className="mt-2 text-ink/70">An admin will review it. It goes live for drivers once approved.</p>
          <Link to="/app" className="btn-volt mt-6">Back to dashboard</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar links={[['/app', 'Dashboard']]} />
      <main className="mx-auto max-w-2xl p-5">
        <h1 className="font-display text-3xl font-semibold">Add a listing</h1>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <Field label="Title" required value={f.title} onChange={set('title')} placeholder="Covered parking near the metro" />
          <label className="block text-sm font-medium">Description<textarea className="field" rows={2} value={f.description} onChange={set('description')} /></label>

          <div>
            <p className="text-sm font-medium">Where is it? Click the map.</p>
            <div className="mt-1.5"><MapPicker value={point} onChange={setPoint} /></div>
            {point && <p className="mt-1 text-xs text-ink/60">Marked at {point[0].toFixed(5)}, {point[1].toFixed(5)}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City" required value={f.city} onChange={set('city')} />
            <Field label="Area" value={f.area} onChange={set('area')} placeholder="Indiranagar" />
            <Field label="Address" required value={f.address} onChange={set('address')} />
            <Field label="Pincode" value={f.pincode} onChange={set('pincode')} />
            <Field label="Landmark" value={f.landmark} onChange={set('landmark')} />
            <Field label="Photo link (optional)" type="url" value={f.photo} onChange={set('photo')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Car bays" type="number" min="0" max="20" value={f.cars} onChange={set('cars')} />
            <Field label="Bike bays" type="number" min="0" max="20" value={f.bikes} onChange={set('bikes')} />
          </div>

          <div>
            <p className="text-sm font-medium">Open days</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => toggle(i)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${days.includes(i) ? 'border-asphalt bg-asphalt text-mist' : 'border-ink/25 bg-white'}`}>{d}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Opens (India time)" type="time" required value={f.from} onChange={set('from')} />
              <Field label="Closes" type="time" required value={f.to} onChange={set('to')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="₹ per hour" type="number" min="1" required value={f.hourly} onChange={set('hourly')} />
            <Field label="₹ per day" type="number" min="1" value={f.daily} onChange={set('daily')} />
            <Field label="₹ per month" type="number" min="1" value={f.monthly} onChange={set('monthly')} />
          </div>

          <label className="block text-sm font-medium">New bookings
            <select className="field" value={f.approvalMode} onChange={set('approvalMode')}>
              <option value="manual">I approve each booking</option>
              <option value="auto">Confirm automatically</option>
            </select>
          </label>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? 'Submitting' : 'Submit for review'}</button>
        </form>
      </main>
    </div>
  );
}