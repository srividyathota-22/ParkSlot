import { useState } from 'react';
export default function PlaceFinder({ onFound }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function find() {
    const text = q.trim();
    if (text.length < 3) { setError('Type at least 3 letters of a place name.'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(text));
      const d = await r.json();
      if (!Array.isArray(d) || d.length === 0) {
        setError(`No place found for "${text}". Check the spelling, or click the map yourself.`);
        return;
      }
      onFound([Number(d[0].lat), Number(d[0].lon)]);
    } catch {
      setError('Place search failed. Check your internet connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          className="field !mt-0 flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } }}
          placeholder="Find a place, e.g. Benz Circle, Vijayawada"
          aria-label="Find a place"
        />
        <button type="button" onClick={find} disabled={busy} className="rounded-lg border border-ink/20 bg-white px-4 font-medium">
          {busy ? '...' : 'Find'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}