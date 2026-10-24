import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import Field from '../components/Field.jsx';
import MapPicker from '../components/MapPicker.jsx';
import PlaceFinder from '../components/PlaceFinder.jsx';
import { api } from '../api.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const bays = (prefix, n, vehicleType, size) => Array.from({ length: n }, (_, i) => ({ label: `${prefix}${i + 1}`, vehicleType, size, isActive: true }));
const inIndia = (lat, lng) => lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5;

export default function NewListing() {
  const [f, setF] = useState({
    title: '', description: '', city: '', area: '', address: '', pincode: '', landmark: '', photo: '', cars: 2, bikes: 0,
    from: '08:00', to: '20:00', hourly: '', daily: '', monthly: '', approvalMode: 'manual', minDuration: 60, notice: 0,
  });
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [point, setPoint] = useState(null);
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [near, setNear] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const typed = useRef(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  useEffect(() => {
    if (typed.current) { typed.current = false; return; }
    if (point) setCoords({ lat: point[0].toFixed(6), lng: point[1].toFixed(6) });
  }, [point]);
  useEffect(() => {
    if (!point) { setNear(null); return undefined; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${point[0]}&lon=${point[1]}`);
        const d = await r.json();
        setNear(d && d.display_name ? d : null);
      } catch { setNear(null); }
    }, 700);
    return () => clearTimeout(t);
  }, [point]);

  function typeCoord(key, value) {
    const next = { ...coords, [key]: value };
    setCoords(next);
    const lat = Number(next.lat);
    const lng = Number(next.lng);
    if (next.lat !== '' && next.lng !== '' && inIndia(lat, lng)) {
      typed.current = true;
      setPoint([lat, lng]);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Your browser cannot share its location.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPoint([p.coords.latitude, p.coords.longitude]),
      () => setError('Could not get your location. Find the place or click the map instead.')
    );
  }

  function fillFromPin() {
    const a = near?.address || {};
    setF({
      ...f,
      city: f.city || a.city || a.town || a.village || a.state_district || '',
      area: f.area || a.suburb || a.neighbourhood || '',
      pincode: f.pincode || a.postcode || '',
    });
  }

  const mismatch = near && f.city.trim() && !near.display_name.toLowerCase().includes(f.city.trim().toLowerCase());
  const coordsBad = (coords.lat !== '' || coords.lng !== '') && !inIndia(Number(coords.lat), Number(coords.lng));

  async function submit(e) {
    e.preventDefault();
    setError('');
    const cars = Math.max(0, Math.floor(Number(f.cars) || 0));
    const bikes = Math.max(0, Math.floor(Number(f.bikes) || 0));
    if (!point) return setError('Mark where your parking is: find the place, click the map, or type the coordinates.');
    if (!inIndia(point[0], point[1])) return setError('The pin is outside India. Check the latitude and longitude.');
    if (cars + bikes < 1) return setError('Add at least one bay.');
    if (!days.length) return setError('Choose at least one open day.');
    if (f.from >= f.to) return setError('Closing time must be after opening time.');
    if (!(Number(f.hourly) > 0)) return setError('Enter the price per hour.');
    if (Number(f.minDuration) < 15) return setError('The minimum booking is at least 15 minutes.');
    if (mismatch && !window.confirm(`The pin is near "${near.display_name}", but the city says "${f.city}". Submit anyway?`)) return;
    setBusy(true);
    try {
      await api('/owner/listings', {
        method: 'POST',
        body: {
          title: f.title.trim(),
          description: f.description.trim(),
          location: { type: 'Point', coordinates: [point[1], point[0]], city: f.city.trim(), area: f.area, address: f.address, pincode: f.pincode, landmark: f.landmark },
          photos: f.photo ? [f.photo] : [],
          vehicleTypes: [...(cars ? ['4-wheeler'] : []), ...(bikes ? ['2-wheeler'] : [])],
          slots: [...bays('A', cars, '4-wheeler', 'medium'), ...bays('B', bikes, '2-wheeler', 'small')],
          availabilityRules: days.map((d) => ({ dayOfWeek: d, startTime: f.from, endTime: f.to })),
          approvalMode: f.approvalMode,
          prices: { hourly: Number(f.hourly), daily: f.daily ? Number(f.daily) : undefined, monthly: f.monthly ? Number(f.monthly) : undefined },
          minDurationMinutes: Number(f.minDuration),
          advanceNoticeMinutes: Number(f.notice),
        },
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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

          <div className="space-y-2">
            <p className="text-sm font-medium">Where is it? Find the place, click the map, drag the pin, or type the coordinates.</p>
            <PlaceFinder onFound={setPoint} />
            <MapPicker value={point} onChange={setPoint} />
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field label="Latitude" inputMode="decimal" value={coords.lat} onChange={(e) => typeCoord('lat', e.target.value)} placeholder="16.5062" />
              <Field label="Longitude" inputMode="decimal" value={coords.lng} onChange={(e) => typeCoord('lng', e.target.value)} placeholder="80.6480" />
              <button type="button" onClick={useMyLocation} className="mb-0.5 rounded-lg border border-ink/20 bg-white px-3 py-2.5 text-sm font-medium">My location</button>
            </div>
            {coordsBad && <p className="text-sm text-red-700">Latitude and longitude must be inside India (latitude 6 to 37, longitude 68 to 97).</p>}
            {point && (
              <div className="rounded-lg bg-ink/5 p-3 text-sm">
                <p className="text-ink/70">The pin is near: <b>{near ? near.display_name : 'looking up...'}</b></p>
                {near && <button type="button" onClick={fillFromPin} className="mt-1 underline">Fill empty city, area and pincode from this place</button>}
                {mismatch && <p role="alert" className="mt-1 text-amber-800">This place does not mention "{f.city}". Check that the pin is where your parking really is.</p>}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City" required value={f.city} onChange={set('city')} placeholder="Vijayawada" />
            <Field label="Area" value={f.area} onChange={set('area')} placeholder="Benz Circle" />
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
            <Field label="Minimum minutes" type="number" min="15" value={f.minDuration} onChange={set('minDuration')} />
            <Field label="Advance notice (minutes)" type="number" min="0" value={f.notice} onChange={set('notice')} />
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